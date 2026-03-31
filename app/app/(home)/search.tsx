import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuthStore } from "@/stores/authStore";
import { openChat } from "@/apis/chats";
import { searchUsers, type SearchUserRow } from "@/apis/user";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const bg = Colors[colorScheme].background;
  const { token } = useAuthStore();

  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 400);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchUserRow[]>([]);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!token || debounced.trim().length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await searchUsers(token, debounced.trim());
        if (!cancelled) setResults(rows);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, token]);

  const startChat = async (peer: SearchUserRow) => {
    if (!token) return;
    setOpening(peer.id);
    try {
      const chatId = await openChat(token, peer.id);
      router.replace({
        pathname: "/(home)/chat/[chatId]" as any,
        params: { chatId, peerId: peer.id },
      });
    } catch (e: any) {
      Alert.alert("Could not start chat", e?.message ?? "");
    } finally {
      setOpening(null);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <View style={{ width: 56 }} />
      </View>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Username or email"
        placeholderTextColor="rgba(0,0,0,0.35)"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: Colors[colorScheme].text }]}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            debounced.trim().length < 1 ? (
              <Text style={styles.hint}>Type to find people on Steal.</Text>
            ) : (
              <Text style={styles.hint}>No matches.</Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              disabled={opening !== null}
              onPress={() => startChat(item)}
            >
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.username ?? item.email}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
              {opening === item.id ? <ActivityIndicator /> : <Text style={styles.chat}>Chat</Text>}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  back: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { fontWeight: "700", fontSize: 16 },
  title: { fontSize: 18, fontWeight: "900" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  list: { paddingTop: 16, paddingBottom: 32 },
  hint: { opacity: 0.55, textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  name: { fontWeight: "800", fontSize: 15 },
  sub: { opacity: 0.55, fontSize: 12, marginTop: 2 },
  chat: { fontWeight: "800", color: "#DA3D20" },
});
