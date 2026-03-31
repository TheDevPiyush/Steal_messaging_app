import { getDemoChats } from "@/utils/demo";
import { ChatSummary } from "@/types/chat";

const API = process.env.EXPO_PUBLIC_BACKEND_API_URL as string | undefined;

async function safeFetchJson(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.message || data?.error?.message)) || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function getChats(token: string | null, myUserId: string | null): Promise<ChatSummary[]> {
  // Demo fallback if backend not configured.
  if (!API) return getDemoChats(myUserId);

  try {
    const data = await safeFetchJson(`${API}/chats/get-all-chats`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    // Backend contract: { data: { chats: ChatSummary[] } } or { data: chats }.
    const chats: ChatSummary[] =
      data?.data?.chats ?? data?.data ?? data?.chats ?? [];

    if (!Array.isArray(chats) || chats.length === 0) return getDemoChats(myUserId);
    return chats;
  } catch {
    return getDemoChats(myUserId);
  }
}

export async function openChat(token: string, peerUserId: string): Promise<string> {
  if (!API) throw new Error("Backend not configured");
  const res = await fetch(`${API}/chats/open`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ peerUserId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Could not open chat");
  const id = data?.data?.chatId as string | undefined;
  if (!id) throw new Error("Invalid response");
  return id;
}

