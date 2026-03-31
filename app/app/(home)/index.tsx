import { FlatList, Pressable, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/stores/authStore';
import { getChats } from '@/apis/chats';
import type { ChatSummary } from '@/types/chat';
import { formatTimeOfDay } from '@/utils/format';
import { getCachedJson, setCachedJson } from '@/utils/cache';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabChatsScreen() {
  const { user, token, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inbox = useChatInboxStore((s) => s.lastByChat);
  const colorScheme = useColorScheme() ?? 'light';
  const bg = Colors[colorScheme].background;

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Small MVP-friendly cache: avoids blank screen on app restart.
  const cacheKey = useMemo(() => `chats:list:${user?.id ?? "anon"}`, [user?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await getCachedJson<ChatSummary[]>(cacheKey);
      if (cached && mounted) setChats(cached);
    })();

    return () => {
      mounted = false;
    };
  }, [cacheKey]);

  const loadChats = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getChats(token, user?.id ?? null);
      setChats(data);
      await setCachedJson(cacheKey, data, { ttlMs: 1000 * 60 * 15 }); // 15 min
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>{user?.username ?? user?.email ?? "User"}</Text>
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push({ pathname: "/(home)/search" as any })}
        >
          <Text style={styles.iconBtnText}>Search</Text>
        </Pressable>
        <Pressable style={styles.logoutBtn} onPress={() => logout()}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: bg }}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={8}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{loading ? "Loading..." : "No chats yet"}</Text>
            <Text style={styles.emptySubtitle}>
              Start messaging to see conversations here.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await loadChats();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        renderItem={({ item }) => {
          const bump = inbox[item.id];
          const last = bump
            ? { id: bump.chatId, text: bump.text, createdAt: bump.createdAt }
            : item.lastMessage;
          return (
            <TouchableOpacity
              style={styles.chatRow}
              onPress={() => {
                router.push({
                  pathname: "/(home)/chat/[chatId]" as any,
                  params: { chatId: item.id, peerId: item.partner.id },
                });
              }}
            >
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.chatName}>
                    {item.partner.username ?? item.partner.email}
                  </Text>
                  {last?.createdAt ? (
                    <Text style={styles.time}>{formatTimeOfDay(last.createdAt)}</Text>
                  ) : null}
                </View>
                <Text
                  style={styles.preview}
                  numberOfLines={1}
                >
                  {last?.text ?? "No messages yet"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },

  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginRight: 8,
  },
  iconBtnText: {
    fontWeight: "800",
    fontSize: 14,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#DA3D20",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  empty: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontWeight: "700",
    fontSize: 16,
  },

  emptySubtitle: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: "center",
  },

  chatRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  chatName: {
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
  },

  time: {
    fontSize: 12,
    opacity: 0.7,
  },

  preview: {
    marginTop: 4,
    opacity: 0.7,
  },
});
