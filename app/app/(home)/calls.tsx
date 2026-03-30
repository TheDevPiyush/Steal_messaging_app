import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "@/components/Themed";
import { useAuthStore } from "@/stores/authStore";
import { getCalls } from "@/apis/calls";
import type { CallLog, PaginatedCalls } from "@/types/call";
import { formatDuration, formatTimeOfDay } from "@/utils/format";
import { getCachedJson, setCachedJson } from "@/utils/cache";

const PAGE_SIZE = 20;
const MAX_TOTAL_CALLS = 120;

function CallRow({ call }: { call: CallLog }) {
  return (
    <View style={styles.callRow}>
      <View style={[styles.callTypeBadge, call.callType === "video" ? styles.callTypeBadgeVideo : styles.callTypeBadgeVoice]}>
        <Text style={styles.callTypeText}>{call.callType === "video" ? "Video" : "Voice"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.callMetaTop}>
          {formatTimeOfDay(call.startedAt)}
          {"  "}
          <Text style={styles.callPeer}>{call.peerId === "peer-1" ? "Demo User" : call.peerId}</Text>
        </Text>
        <Text style={styles.callMetaBottom}>
          Duration: {formatDuration(call.durationSeconds)}
        </Text>
      </View>
    </View>
  );
}

export default function TabCallScreen() {
  const router = useRouter();
  const { token } = useAuthStore();

  const cacheKey = useMemo(() => `calls:list`, []);

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [before, setBefore] = useState<string | null>(null);

  const persist = async (next: PaginatedCalls) => {
    await setCachedJson(cacheKey, { calls: next.calls, before: next.nextBefore, hasMore: next.hasMore }, { ttlMs: 1000 * 60 * 20 });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await getCachedJson<any>(cacheKey);
      if (!mounted || !cached) return;
      if (Array.isArray(cached.calls)) setCalls(cached.calls);
      if (typeof cached.before !== "undefined") setBefore(cached.before);
      if (typeof cached.hasMore === "boolean") setHasMore(cached.hasMore);
      if (cached.calls?.length) setLoadingInitial(false);
    })();
    return () => {
      mounted = false;
    };
  }, [cacheKey]);

  const loadLatest = async () => {
    if (!token) return;
    setLoadingInitial(true);
    try {
      const page = await getCalls({ token, before: null, limit: PAGE_SIZE });
      setCalls(page.calls.slice(0, MAX_TOTAL_CALLS));
      setBefore(page.nextBefore);
      setHasMore(page.hasMore);
      await persist(page);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    if (token) loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadOlder = async () => {
    if (!hasMore || loadingOlder) return;
    if (!before && calls.length) setBefore(calls[calls.length - 1].startedAt);
    const cursor = before ?? (calls[calls.length - 1]?.startedAt ?? null);
    if (!cursor) return;

    setLoadingOlder(true);
    try {
      const page = await getCalls({ token, before: cursor, limit: PAGE_SIZE });
      setCalls((prev) => [...prev, ...page.calls].slice(0, MAX_TOTAL_CALLS));
      setBefore(page.nextBefore);
      setHasMore(page.hasMore);
      await persist(page);
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calls</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.startBtn, styles.startBtnVoice]}
            onPress={() =>
              Alert.alert(
                "Start from a chat",
                "Open a conversation and use the Voice / Video buttons in the chat header to call someone."
              )
            }
          >
            <Text style={styles.startBtnText}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.startBtn, styles.startBtnVideo]}
            onPress={() =>
              Alert.alert(
                "Start from a chat",
                "Open a conversation and use the Voice / Video buttons in the chat header to call someone."
              )
            }
          >
            <Text style={[styles.startBtnText, styles.startBtnVideoText]}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingInitial && calls.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, opacity: 0.7 }}>Loading call history...</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={10}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await loadLatest();
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No calls yet</Text>
            </View>
          }
          onEndReached={loadOlder}
          onEndReachedThreshold={0.25}
          ListFooterComponent={
            loadingOlder ? (
              <View style={styles.loadingOlder}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, opacity: 0.7 }}>Loading older...</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <CallRow call={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  startBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnVoice: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  startBtnVideo: {
    backgroundColor: "#DA3D20",
  },
  startBtnText: {
    fontWeight: "800",
    color: "#000",
  },
  startBtnVideoText: {
    color: "#fff",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 14,
  },
  empty: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyTitle: {
    opacity: 0.7,
    fontWeight: "700",
  },
  callRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  callTypeBadge: {
    width: 54,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  callTypeBadgeVoice: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  callTypeBadgeVideo: {
    backgroundColor: "rgba(218,61,32,0.14)",
  },
  callTypeText: {
    fontWeight: "800",
    fontSize: 12,
    color: "#000",
  },
  callMetaTop: {
    fontWeight: "700",
    fontSize: 14,
  },
  callPeer: {
    opacity: 0.7,
    fontWeight: "600",
  },
  callMetaBottom: {
    marginTop: 4,
    opacity: 0.7,
  },
  loadingOlder: {
    paddingVertical: 18,
    alignItems: "center",
  },
});

