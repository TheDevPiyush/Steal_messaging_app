import type { Message } from "@/types/message";
import { getCachedJson, setCachedJson } from "@/utils/cache";

type CachedChatMessages = {
  messages: Message[];
  nextBefore: string | null;
  hasMore: boolean;
  cachedAt: number;
};

const TTL = 1000 * 60 * 60;

export async function mergeMessageIntoCache(chatId: string, message: Message) {
  const key = `messages:${chatId}`;
  const cached = await getCachedJson<CachedChatMessages>(key);
  if (!cached?.messages) return;
  if (cached.messages.some((m) => m.id === message.id)) return;
  const next: CachedChatMessages = {
    ...cached,
    messages: [message, ...cached.messages].slice(0, 220),
    cachedAt: Date.now(),
  };
  await setCachedJson(key, next, { ttlMs: TTL });
}
