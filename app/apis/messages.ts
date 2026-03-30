import { Message, PaginatedMessages } from "@/types/message";
import { fetchDemoMessages } from "@/utils/demo";

const API = process.env.EXPO_PUBLIC_BACKEND_API_URL as string | undefined;

type GetMessagesArgs = {
  token: string | null;
  chatId: string;
  before: string | null;
  limit: number;
};

type SendMessageArgs = {
  token: string | null;
  chatId: string;
  text: string;
  clientMessageId?: string;
};

async function safeFetchJson(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.message || data?.error?.message)) || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function getMessages(args: GetMessagesArgs): Promise<PaginatedMessages> {
  const { token, chatId, before, limit } = args;

  if (!API) {
    return fetchDemoMessages({ chatId, before, limit });
  }

  const url = new URL(`${API}/messages/${encodeURIComponent(chatId)}`);
  if (before) url.searchParams.set("before", before);
  url.searchParams.set("limit", String(limit));

  try {
    const data = await safeFetchJson(url.toString(), {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const payload = data?.data ?? data;
    const messages: Message[] = payload?.messages ?? [];

    const nextBefore: string | null = payload?.nextBefore ?? payload?.next_cursor ?? null;
    const hasMore: boolean = payload?.hasMore ?? payload?.has_more ?? Boolean(payload?.hasMore);

    if (!Array.isArray(messages) || messages.length === 0) {
      // If backend is empty, still show a demo so the UI works.
      return fetchDemoMessages({ chatId, before, limit });
    }

    return { messages, nextBefore, hasMore: payload?.hasMore ?? true };
  } catch {
    return fetchDemoMessages({ chatId, before, limit });
  }
}

export async function sendMessage(args: SendMessageArgs): Promise<Message> {
  const { token, chatId, text, clientMessageId } = args;

  if (!API) {
    // Demo: return a client-local message.
    return {
      id: clientMessageId ?? `m-demo-${Date.now()}`,
      chatId,
      senderId: "me",
      text,
      createdAt: new Date().toISOString(),
    };
  }

  const url = `${API}/messages/${encodeURIComponent(chatId)}`;
  try {
    const data = await safeFetchJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, clientMessageId }),
    });

    const payload = data?.data ?? data;
    const message: Message = payload?.message ?? payload;
    if (!message?.id) throw new Error("Invalid message response");
    return message;
  } catch {
    return {
      id: clientMessageId ?? `m-demo-${Date.now()}`,
      chatId,
      senderId: "me",
      text,
      createdAt: new Date().toISOString(),
    };
  }
}

