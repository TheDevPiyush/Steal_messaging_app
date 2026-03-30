import type { Server } from "socket.io";
import { getIO, userRoom } from "./io";
import { sendExpoPushToUser } from "./push";

export type ChatMessageDto = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export function isUserOnline(io: Server, userId: string) {
  const room = io.sockets.adapter.rooms.get(userRoom(userId));
  return Boolean(room && room.size > 0);
}

export function broadcastChatMessage(io: Server, message: ChatMessageDto, recipientId: string) {
  io.to(userRoom(message.senderId)).emit("chat:new_message", { message });
  io.to(userRoom(recipientId)).emit("chat:new_message", { message });

  if (!isUserOnline(io, recipientId)) {
    void sendExpoPushToUser(recipientId, {
      title: "New message",
      body: message.text.slice(0, 120),
      data: {
        type: "message",
        chatId: message.chatId,
        messageId: message.id,
        peerId: message.senderId,
      },
    });
  }
}

export function broadcastCallIncoming(
  io: Server,
  payload: {
    callSessionId: string;
    callType: "voice" | "video";
    fromUserId: string;
    peerId: string;
  }
) {
  const { peerId } = payload;
  io.to(userRoom(peerId)).emit("call:incoming", payload);

  if (!isUserOnline(io, peerId)) {
    void sendExpoPushToUser(peerId, {
      title: payload.callType === "video" ? "Incoming video call" : "Incoming voice call",
      body: "Tap to answer",
      data: {
        type: "call",
        callSessionId: payload.callSessionId,
        callType: payload.callType,
        fromUserId: payload.fromUserId,
      },
    });
  }
}
