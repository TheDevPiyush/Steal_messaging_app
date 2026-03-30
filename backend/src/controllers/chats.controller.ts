import type { Request, Response, NextFunction } from "express";
import { desc, eq, or } from "drizzle-orm";
import { db } from "../db";
import { chats, messages, users } from "../db/schema";

export const getAllChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = (req as any).user;
    if (!me?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const myId = me.id;

    const myChats = await db
      .select()
      .from(chats)
      .where(or(eq(chats.userAId, myId), eq(chats.userBId, myId)))
      .orderBy(desc(chats.createdAt))
      .limit(50);

    const result = await Promise.all(
      myChats.map(async (c) => {
        const peerId = c.userAId === myId ? c.userBId : c.userAId;
        const [peer] = await db.select().from(users).where(eq(users.id, peerId)).limit(1);

        const [last] = await db
          .select()
          .from(messages)
          .where(eq(messages.chatId, c.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          id: c.id,
          partner: peer
            ? {
                id: peer.id,
                email: peer.email,
                username: peer.username,
                photoURL: peer.photoURL,
              }
            : null,
          lastMessage: last
            ? {
                id: last.id,
                text: last.text,
                createdAt: (last.createdAt as Date).toISOString(),
              }
            : undefined,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: { chats: result },
    });
  } catch (e: any) {
    next(e);
  }
};