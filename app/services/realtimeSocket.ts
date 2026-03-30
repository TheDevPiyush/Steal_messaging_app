import { io, type Socket } from "socket.io-client";
import { router } from "expo-router";
import { getSocketUrlFromApiBase } from "@/lib/socketUrl";
import { useChatInboxStore } from "@/stores/chatInboxStore";
import { mergeMessageIntoCache } from "@/utils/messageCache";

let socket: Socket | null = null;

const API = process.env.EXPO_PUBLIC_BACKEND_API_URL as string | undefined;

export function getRealtimeSocket() {
  return socket;
}

export function disconnectRealtime() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

export function connectRealtime(authToken: string | null) {
  disconnectRealtime();
  if (!authToken) return;

  const url = getSocketUrlFromApiBase(API);
  if (!url) return;

  socket = io(url, {
    auth: { token: authToken },
    transports: ["websocket"],
    reconnection: true,
  });

  socket.on("connect", () => {
    // subscribed once per connection
  });

  socket.on("chat:new_message", (payload: { message: any }) => {
    const m = payload?.message;
    if (!m?.chatId || !m?.text || !m?.createdAt) return;
    useChatInboxStore.getState().bump({
      chatId: m.chatId,
      text: m.text,
      createdAt: m.createdAt,
    });
  });

  socket.on(
    "call:incoming",
    (payload: {
      callSessionId: string;
      callType: "voice" | "video";
      fromUserId: string;
      peerId: string;
    }) => {
      router.replace({
        pathname: "/(home)/call/new" as any,
        params: {
          type: payload.callType,
          mode: "incoming",
          peerId: payload.fromUserId,
          callSessionId: payload.callSessionId,
        },
      });
    }
  );
}

export function emitChatSend(args: {
  chatId: string;
  peerId: string;
  text: string;
  clientMessageId?: string;
}): Promise<{ message: any }> {
  return new Promise((resolve, reject) => {
    const s = getRealtimeSocket();
    if (!s?.connected) {
      reject(new Error("socket offline"));
      return;
    }
    s.emit(
      "chat:send",
      {
        chatId: args.chatId,
        peerId: args.peerId,
        text: args.text,
        clientMessageId: args.clientMessageId,
      },
      (res: { ok: boolean; message?: any; error?: string }) => {
        if (res?.ok && res.message) {
          void mergeMessageIntoCache(args.chatId, res.message);
          resolve({ message: res.message });
        } else reject(new Error(res?.error ?? "send failed"));
      }
    );
  });
}

export function emitCallRequest(args: {
  peerId: string;
  callType: "voice" | "video";
  callSessionId: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = getRealtimeSocket();
    if (!s?.connected) {
      reject(new Error("socket offline"));
      return;
    }
    s.emit(
      "call:request",
      args,
      (res: { ok: boolean; error?: string }) => {
        if (res?.ok) resolve();
        else reject(new Error(res?.error ?? "call failed"));
      }
    );
  });
}
