import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type CacheEnvelope<T> = {
  value: T;
  storedAt: number;
  expiresAt: number;
};

function buildKey(key: string) {
  return `steal:${key}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(buildKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;

    return parsed.value;
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(
  key: string,
  value: T,
  opts?: { ttlMs?: number }
) {
  try {
    const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    const envelope: CacheEnvelope<T> = {
      value,
      storedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    await AsyncStorage.setItem(buildKey(key), JSON.stringify(envelope));
  } catch {
    // Cache is best-effort; ignore failures.
  }
}

export async function removeCached(key: string) {
  try {
    await AsyncStorage.removeItem(buildKey(key));
  } catch {
    // ignore
  }
}

