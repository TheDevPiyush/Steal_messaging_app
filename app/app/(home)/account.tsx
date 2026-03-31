import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  buildPrivacyUsername,
  randomEightDigits,
  sanitizeUsernameBase,
} from '@/utils/usernamePrivacy';
import { checkUsernameAvailable, updateUsername } from '@/apis/user';

export default function TabAccountScreen() {
  const { user, token, logout, refreshUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const bg = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;

  const parseExisting = (u: string | null | undefined) => {
    if (!u) return { base: "", suffix: randomEightDigits() };
    const idx = u.lastIndexOf("_");
    if (idx <= 0) return { base: u, suffix: randomEightDigits() };
    const suf = u.slice(idx + 1);
    const ba = u.slice(0, idx);
    if (/^\d{8}$/.test(suf)) return { base: ba, suffix: suf };
    return { base: u, suffix: randomEightDigits() };
  };

  const [base, setBase] = useState(() => parseExisting(user?.username).base);
  const [suffix, setSuffix] = useState(() => parseExisting(user?.username).suffix);

  useEffect(() => {
    if (!user?.username) return;
    const p = parseExisting(user.username);
    setBase(p.base);
    setSuffix(p.suffix);
  }, [user?.username]);

  const debouncedBase = useDebouncedValue(base, 400);

  const proposed = useMemo(() => {
    const b = sanitizeUsernameBase(debouncedBase);
    return buildPrivacyUsername(b, suffix);
  }, [debouncedBase, suffix]);

  const [avail, setAvail] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || proposed.length < 4) {
      setAvail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const ok = await checkUsernameAvailable(token, proposed);
        if (!cancelled) setAvail(ok);
      } catch {
        if (!cancelled) setAvail(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposed, token]);

  const saveUsername = async () => {
    if (!token || !proposed || avail !== true) return;
    setSaving(true);
    try {
      await updateUsername(token, proposed);
      await refreshUser();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textColor }]}>Account</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? '-'}</Text>

        <Text style={[styles.privacyNote, { color: textColor }]}>
          For extra privacy, we add a unique 8-digit code after your chosen name (shown below).
        </Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          value={base}
          onChangeText={(t) => setBase(sanitizeUsernameBase(t))}
          placeholder="your_name"
          placeholderTextColor="rgba(0,0,0,0.35)"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: textColor }]}
        />

        <Text style={styles.previewLabel}>Your handle</Text>
        <Text style={styles.previewValue}>{proposed || '—'}</Text>

        <View style={styles.statusRow}>
          {checking ? (
            <ActivityIndicator size="small" />
          ) : proposed.length >= 4 ? (
            <Text
              style={[
                styles.status,
                { color: avail === true ? '#2e7d32' : avail === false ? '#c62828' : textColor },
              ]}
            >
              {avail === true ? 'Available' : avail === false ? 'Taken' : ''}
            </Text>
          ) : (
            <Text style={styles.statusMuted}>Type at least 2 characters in the name part.</Text>
          )}
        </View>

        <Pressable
          style={[styles.saveBtn, (avail !== true || saving) && styles.saveBtnDisabled]}
          onPress={saveUsername}
          disabled={avail !== true || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save username</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.logoutBtn} onPress={() => logout()}>
        <Text style={styles.logoutBtnText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },

  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },

  privacyNote: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 18,
  },

  label: {
    opacity: 0.7,
    fontWeight: '700',
    marginTop: 12,
  },

  value: {
    fontWeight: '800',
    marginTop: 6,
    fontSize: 15,
  },

  input: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  previewLabel: {
    marginTop: 14,
    fontSize: 12,
    opacity: 0.55,
    fontWeight: '600',
  },
  previewValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  statusRow: {
    minHeight: 28,
    marginTop: 10,
    justifyContent: 'center',
  },
  status: {
    fontWeight: '800',
    fontSize: 14,
  },
  statusMuted: {
    opacity: 0.5,
    fontSize: 13,
  },

  saveBtn: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#DA3D20',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },

  logoutBtn: {
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },

  logoutBtnText: {
    fontWeight: '900',
    fontSize: 15,
  },
});
