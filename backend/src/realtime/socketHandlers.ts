import type { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { chats, messages, users } from "../db/schema";
import { userRoom } from "./io";
import { broadcastCallIncoming, broadcastChatMessage } from "./chatEvents";

type SocketAuth = { userId: string };

export function attachSocketIO(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JSON_WEB_SECRET as string) as jwt.JwtPayload & {
        email?: string;
      };
      const email = decoded?.email;
      if (!email) return next(new Error("Unauthorized"));

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) return next(new Error("Unauthorized"));

      (socket.data as SocketAuth).userId = user.id as string;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as SocketAuth).userId;
    socket.join(userRoom(userId));

    socket.on(
      "chat:send",
      async (
        payload: {
          chatId: string;
          peerId: string;
          text: string;
          clientMessageId?: string;
        },
        ack?: (res: { ok: boolean; message?: any; error?: string }) => void
      ) => {
        try {
          const { chatId, peerId, text, clientMessageId } = payload || {};
          if (!chatId || !peerId || typeof text !== "string" || text.trim().length === 0) {
            ack?.({ ok: false, error: "Invalid payload" });
            return;
          }

          const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
          if (!chat) {
            ack?.({ ok: false, error: "Chat not found" });
            return;
          }

          // Validate membership
          const isMember = chat.userAId === userId || chat.userBId === userId;
          if (!isMember) {
            ack?.({ ok: false, error: "Forbidden" });
            return;
          }
          const expectedPeer = chat.userAId === userId ? chat.userBId : chat.userAId;
          if (expectedPeer !== peerId) {
            ack?.({ ok: false, error: "peer mismatch" });
            return;
          }

          const [row] = await db
            .insert(messages)
            .values({
              chatId,
              senderId: userId,
              text: text.trim().slice(0, 5000),
            })
            .returning();

          const message = {
            id: row.id,
            chatId: row.chatId,
            senderId: row.senderId,
            text: row.text,
            createdAt: (row.createdAt as Date).toISOString(),
          };

          broadcastChatMessage(io, message, peerId);
          ack?.({ ok: true, message: { ...message, clientMessageId } });
        } catch (e: any) {
          ack?.({ ok: false, error: e?.message ?? "send failed" });
        }
      }
    );

    socket.on(
      "call:request",
      async (
        payload: {
          peerId: string;
          callType: "voice" | "video";
          callSessionId: string;
        },
        ack?: (res: { ok: boolean; error?: string }) => void
      ) => {
        try {
          const { peerId, callType, callSessionId } = payload || {};
          if (!peerId || !callSessionId || (callType !== "voice" && callType !== "video")) {
            ack?.({ ok: false, error: "Invalid payload" });
            return;
          }

          broadcastCallIncoming(io, {
            callSessionId,
            callType,
            fromUserId: userId,
            peerId,
          });
          ack?.({ ok: true });
        } catch (e: any) {
          ack?.({ ok: false, error: e?.message ?? "call failed" });
        }
      }
    );
  });
}
