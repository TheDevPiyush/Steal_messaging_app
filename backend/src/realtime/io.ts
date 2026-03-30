import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized yet");
  }
  return ioInstance;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

