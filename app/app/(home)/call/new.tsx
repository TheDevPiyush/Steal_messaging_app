import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "@/components/Themed";
import { useAuthStore } from "@/stores/authStore";
import { createCallLog } from "@/apis/calls";
import type { CallType } from "@/types/call";
import { formatDuration, toIsoStringSafe } from "@/utils/format";
import { emitCallRequest } from "@/services/realtimeSocket";

export default function NewCallScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { type, mode, peerId, callSessionId: sidParam } = useLocalSearchParams<{
    type?: string;
    mode?: string;
    peerId?: string;
    callSessionId?: string;
  }>();

  const callType = (type === "video" ? "video" : "voice") as CallType;
  const modeStr = String(mode ?? "outgoing");
  const peer = String(peerId ?? "");

  const [sessionId] = useState(() =>
    sidParam ? String(sidParam) : `call-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [startedAt] = useState<string>(() => toIsoStringSafe(new Date()));
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (modeStr === "incoming") return;
    if (!peer) return;
    void emitCallRequest({
      peerId: peer,
      callType,
      callSessionId: sessionId,
    }).catch(() => {
      // offline / socket not connected — user still sees local timer; call log may fail
    });
  }, [modeStr, peer, callType, sessionId]);

  const durationSeconds = useMemo(() => {
    const started = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((nowTs - started) / 1000));
  }, [nowTs, startedAt]);

  const endCall = async () => {
    if (ending) return;
    setEnding(true);
    try {
      const endedAt = toIsoStringSafe(new Date());
      if (!peer) {
        router.replace("/(home)/calls");
        return;
      }
      await createCallLog({
        token,
        peerId: peer,
        callType,
        startedAt,
        endedAt,
        durationSeconds,
        asCallee: modeStr === "incoming",
      });
    } finally {
      router.replace("/(home)/calls");
    }
  };

  const title =
    modeStr === "incoming"
      ? callType === "video"
        ? "Incoming video"
        : "Incoming voice"
      : callType === "video"
        ? "Video call"
        : "Voice call";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={ending}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 90 }} />
      </View>

      <View style={styles.center}>
        <Text style={styles.timer}>{formatDuration(durationSeconds)}</Text>
        <Text style={styles.subtitle}>
          {sessionId}
          {"\n"}
          {peer ? `Peer: ${peer.slice(0, 8)}…` : "No peer"}
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          onPress={endCall}
          style={[styles.endBtn, ending ? { opacity: 0.7 } : null]}
          disabled={ending}
        >
          {ending ? <ActivityIndicator color="#fff" /> : <Text style={styles.endBtnText}>End Call</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  backBtnText: { fontWeight: "700" },
  title: { flex: 1, fontSize: 16, fontWeight: "900", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  timer: { fontSize: 48, fontWeight: "900" },
  subtitle: { marginTop: 10, opacity: 0.7, textAlign: "center", fontSize: 12 },
  bottom: { paddingHorizontal: 16, paddingBottom: 22 },
  endBtn: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#DA3D20",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  endBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
