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

