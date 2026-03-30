import Expo from "expo-server-sdk";

const expo = new Expo();

/** In-memory token store (MVP). For production, persist in DB. */
const tokensByUser = new Map<string, string[]>();

export function registerExpoPushToken(userId: string, token: string) {
  const list = tokensByUser.get(userId) ?? [];
  if (!list.includes(token)) list.push(token);
  tokensByUser.set(userId, list);
}

function getTokens(userId: string) {
  return tokensByUser.get(userId) ?? [];
}

export async function sendExpoPushToUser(
  userId: string,
  body: { title: string; body: string; data?: Record<string, unknown> }
) {
  const tokens = getTokens(userId);
  if (tokens.length === 0) return;

  const messages = tokens
    .filter((t) => Expo.isExpoPushToken(t))
    .map((to) => ({
      to,
      sound: "default" as const,
      title: body.title,
      body: body.body,
      data: body.data ?? {},
    }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch {
      // ignore
    }
  }
}
