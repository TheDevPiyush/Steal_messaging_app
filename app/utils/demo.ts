import { CallLog, CallType } from "@/types/call";
import { ChatSummary } from "@/types/chat";
import { Message } from "@/types/message";

function stableNow() {
  // Deterministic-ish for a single session.
  return Date.now();
}

export function getDemoChats(myUserId: string | null): ChatSummary[] {
  const partnerId = "peer-1";
  return [
    {
      id: "demo-chat-1",
      partner: {
        id: partnerId,
        email: "peer@example.com",
        username: "Demo User",
        photoURL: null,
      },
      lastMessage: {
        id: "m-demo-last",
        text: "Welcome to Steal (demo mode)! Scroll up for infinite history.",
        createdAt: new Date(stableNow()).toISOString(),
      },
    },
  ];
}

function generateDemoMessages(chatId: string, total: number): Message[] {
  const now = stableNow();
  const myId = "me";
  const peerId = "peer-1";

  // Newest -> oldest (descending createdAt).
  const items: Message[] = [];
  for (let i = 0; i < total; i++) {
    const createdAt = new Date(now - i * 60_000).toISOString(); // 1 minute intervals
    const isMine = i % 2 === 0;
    items.push({
      id: `m-demo-${chatId}-${i}`,
      chatId,
      senderId: isMine ? myId : peerId,
      text: isMine
        ? "Hey! This is a demo message. Infinite scroll works."
        : "Nice. Keep going — older messages load on scroll.",
      createdAt,
    });
  }
  return items;
}

export function fetchDemoMessages(args: {
  chatId: string;
  before: string | null;
  limit: number;
}): { messages: Message[]; nextBefore: string | null; hasMore: boolean } {
  const { chatId, before, limit } = args;
  const total = 120; // enough to show pagination
  const all = generateDemoMessages(chatId, total);

  // Cursor is the createdAt of the last (oldest) message currently loaded.
  // We return messages older than `before`.
  let startIndex = 0;
  if (before) {
    const idx = all.findIndex((m) => m.createdAt === before);
    startIndex = idx === -1 ? total : idx + 1;
  }

  const page = all.slice(startIndex, startIndex + limit);
  const last = page[page.length - 1];

  const nextBefore = last ? last.createdAt : null;
  const hasMore = startIndex + limit < all.length;

  return { messages: page, nextBefore, hasMore };
}

function generateDemoCalls(total: number): CallLog[] {
  const now = stableNow();
  const peerId = "peer-1";
  const calls: CallLog[] = [];
  const types: CallType[] = ["voice", "video"];
  for (let i = 0; i < total; i++) {
    const startedAt = new Date(now - i * 3 * 60 * 60_000).toISOString(); // every ~3h
    const durationSeconds = 20 * (i % 6) + 30;
    calls.push({
      id: `c-demo-${i}`,
      callType: types[i % types.length],
      peerId,
      startedAt,
      endedAt: new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString(),
      durationSeconds,
    });
  }
  return calls;
}

const DEMO_CALLS_TOTAL = 80;

export function fetchDemoCalls(args: {
  before: string | null;
  limit: number;
}): { calls: CallLog[]; nextBefore: string | null; hasMore: boolean } {
  const { before, limit } = args;
  const all = generateDemoCalls(DEMO_CALLS_TOTAL);
  let startIndex = 0;
  if (before) {
    const idx = all.findIndex((c) => c.startedAt === before);
    startIndex = idx === -1 ? DEMO_CALLS_TOTAL : idx + 1;
  }
  const page = all.slice(startIndex, startIndex + limit);
  const last = page[page.length - 1];
  const nextBefore = last ? last.startedAt : null;
  const hasMore = startIndex + limit < all.length;
  return { calls: page, nextBefore, hasMore };
}

