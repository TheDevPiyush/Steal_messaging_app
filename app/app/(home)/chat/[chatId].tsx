import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "@/components/Themed";
import { useAuthStore } from "@/stores/authStore";
import { getMessages, sendMessage } from "@/apis/messages";
import type { Message } from "@/types/message";
import { getCachedJson, setCachedJson } from "@/utils/cache";
import { formatTimeOfDay } from "@/utils/format";
import { emitChatSend, getRealtimeSocket } from "@/services/realtimeSocket";

type CachedChatMessages = {
  messages: Message[]; // newest -> oldest
  nextBefore: string | null;
  hasMore: boolean;
  cachedAt: number;
};

const PAGE_SIZE = 20;
const MAX_TOTAL_MESSAGES = 220;

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextTheirs]}>
          {msg.text}
        </Text>
        <Text style={styles.msgMeta}>{formatTimeOfDay(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { chatId, peerId } = useLocalSearchParams<{ chatId: string; peerId?: string }>();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const myId = user?.id ?? "me";
  const chatKey = String(chatId ?? "unknown");
  const peerKey = String(peerId ?? "");

  const cacheKey = useMemo(() => `messages:${chatKey}`, [chatKey]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatListRef = useRef<FlatList<Message> | null>(null);

  const schedulePersist = (next: CachedChatMessages) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      setCachedJson(cacheKey, next, { ttlMs: 1000 * 60 * 60 }); // 1 hour
    }, 500);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await getCachedJson<CachedChatMessages>(cacheKey);
      if (cached && mounted) {
        setMessages(cached.messages ?? []);
        setHasMore(Boolean(cached.hasMore));
        setNextBefore(cached.nextBefore ?? null);
      }
      try {
        setLoadingInitial(true);
        const first = await getMessages({
          token,
          chatId: chatKey,
          before: null,
          limit: PAGE_SIZE,
        });

        if (!mounted) return;
        setMessages(first.messages);
        setHasMore(first.hasMore && first.messages.length < MAX_TOTAL_MESSAGES);
        setNextBefore(first.nextBefore);
        schedulePersist({
          messages: first.messages,
          nextBefore: first.nextBefore,
          hasMore: first.hasMore && first.messages.length < MAX_TOTAL_MESSAGES,
          cachedAt: Date.now(),
        });
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    })();

    return () => {
      mounted = false;
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [cacheKey, chatKey, token]);

  useEffect(() => {
    const s = getRealtimeSocket();
    if (!s) return;

    const onNew = (payload: { message: Message }) => {
      const m = payload?.message;
      if (!m || m.chatId !== chatKey) return;
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        return [m, ...prev].slice(0, MAX_TOTAL_MESSAGES);
      });
    };

    s.on("chat:new_message", onNew);
    return () => {
      s.off("chat:new_message", onNew);
    };
  }, [chatKey]);

  const loadOlder = async () => {
    if (!hasMore || loadingOlder) return;
    if (!nextBefore && messages.length > 0) {
      const oldestLoaded = messages[messages.length - 1];
      setNextBefore(oldestLoaded.createdAt);
    }

    const cursor = nextBefore ?? (messages[messages.length - 1]?.createdAt ?? null);
    if (!cursor) return;

    setLoadingOlder(true);
    try {
      const page = await getMessages({
        token,
        chatId: chatKey,
        before: cursor,
        limit: PAGE_SIZE,
      });

      setMessages((prev) => {
        const merged = [...prev, ...page.messages];
        const trimmed = merged.slice(0, MAX_TOTAL_MESSAGES);
        return trimmed;
      });

      setHasMore(page.hasMore && messages.length + page.messages.length < MAX_TOTAL_MESSAGES);
      setNextBefore(page.nextBefore);
      // Persist after state updates settle (best-effort).
      schedulePersist({
        messages: [...messages, ...page.messages].slice(0, MAX_TOTAL_MESSAGES),
        nextBefore: page.nextBefore,
        hasMore: page.hasMore && messages.length + page.messages.length < MAX_TOTAL_MESSAGES,
        cachedAt: Date.now(),
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;

    if (!peerKey) {
      Alert.alert("Missing peer", "Open this chat from the chat list so the app knows who to message.");
      return;
    }

    setDraft("");

    const clientMessageId = `temp-${Date.now()}`;
    const optimisticCreatedAt = new Date().toISOString();
    const optimistic: Message = {
      id: clientMessageId,
      chatId: chatKey,
      senderId: myId,
      text,
      createdAt: optimisticCreatedAt,
    };

    // Newest -> oldest array; optimistic message is newest.
    setMessages((prev) => [optimistic, ...prev].slice(0, MAX_TOTAL_MESSAGES));
    if (chatListRef.current) {
      // Keep user anchored near bottom for an MVP experience.
      chatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    try {
      let created: Message;

      try {
        const res = await emitChatSend({
          chatId: chatKey,
          peerId: peerKey,
          text,
          clientMessageId,
        });
        created = res.message;
      } catch {
        created = await sendMessage({
          token,
          chatId: chatKey,
          text,
          clientMessageId,
        });
      }

      setMessages((prev) => {
        const byTempIdIdx = prev.findIndex((m) => m.id === clientMessageId);
        if (byTempIdIdx !== -1) {
          const next = [...prev];
          next[byTempIdIdx] = created;
          const trimmed = next.slice(0, MAX_TOTAL_MESSAGES);
          schedulePersist({
            messages: trimmed,
            nextBefore,
            hasMore,
            cachedAt: Date.now(),
          });
          return trimmed;
        }

        // Backend mode: server returns a different message id than our temp id.
        // Best-effort replacement: match the newest pending message with same text & near-createdAt.
        const targetTs = new Date(optimisticCreatedAt).getTime();
        const idx = prev.findIndex((m) => {
          if (m.senderId !== myId) return false;
          if (m.text !== text) return false;
          const ts = new Date(m.createdAt).getTime();
          return Math.abs(ts - targetTs) <= 10_000; // 10s window
        });

        if (idx !== -1) {
          const next = [...prev];
          next[idx] = created;
          const trimmed = next.slice(0, MAX_TOTAL_MESSAGES);
          schedulePersist({
            messages: trimmed,
            nextBefore,
            hasMore,
            cachedAt: Date.now(),
          });
          return trimmed;
        }

        // Fallback: if not found, prepend created message (prevents “missing” server msg).
        const trimmed = prev.some((m) => m.id === created.id)
          ? prev.slice(0, MAX_TOTAL_MESSAGES)
          : [created, ...prev].slice(0, MAX_TOTAL_MESSAGES);

        schedulePersist({
          messages: trimmed,
          nextBefore,
          hasMore,
          cachedAt: Date.now(),
        });
        return trimmed;
      });
    } catch {
      // Keep optimistic message if API fails (demo/offline behavior).
    }
  };

  if (loadingInitial) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, opacity: 0.7 }}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Chat</Text>
          <Text style={styles.topSubtitle}>Realtime + cache</Text>
        </View>
        <TouchableOpacity
          style={styles.callMiniBtn}
          disabled={!peerKey}
          onPress={() =>
            router.push({
              pathname: "/(home)/call/new" as any,
              params: { type: "voice", mode: "outgoing", peerId: peerKey },
            })
          }
        >
          <Text style={styles.callMiniBtnText}>Voice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callMiniBtn}
          disabled={!peerKey}
          onPress={() =>
            router.push({
              pathname: "/(home)/call/new" as any,
              params: { type: "video", mode: "outgoing", peerId: peerKey },
            })
          }
        >
          <Text style={styles.callMiniBtnText}>Video</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={(r) => {
          chatListRef.current = r;
        }}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={12}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isMine = item.senderId === myId || item.senderId === "me";
          return <MessageBubble msg={item} isMine={isMine} />;
        }}
        onEndReached={() => {
          // With inverted lists, "end" is the top of the chat (older messages).
          loadOlder();
        }}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingOlder ? (
            <View style={styles.loadingOlder}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, opacity: 0.7 }}>Loading older...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages</Text>
          </View>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={64}>
        <View style={styles.composer}>
          <TextInput
            placeholder="Type a message..."
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, draft.trim().length ? null : styles.sendBtnDisabled]}
            disabled={!draft.trim().length}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "transparent",
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  backBtnText: {
    fontWeight: "600",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  topSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },

  callMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  callMiniBtnText: {
    fontWeight: "800",
    fontSize: 12,
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    marginVertical: 6,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: "#DA3D20",
  },
  bubbleTheirs: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  msgText: {
    fontSize: 14,
  },
  msgTextMine: {
    color: "#fff",
  },
  msgTextTheirs: {
    color: "#000",
  },
  msgMeta: {
    marginTop: 8,
    fontSize: 11,
    opacity: 0.8,
  },
  composer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    fontSize: 14,
  },
  sendBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#DA3D20",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  loadingOlder: {
    paddingVertical: 18,
    alignItems: "center",
  },
  empty: {
    paddingVertical: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    opacity: 0.7,
    fontWeight: "700",
  },
});

