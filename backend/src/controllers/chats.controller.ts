import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../db";
import { chats, messages, users } from "../db/schema";
import { throwError } from "../middlewares/errorMiddleware";

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

/** Find existing 1:1 chat or create between current user and peer. */
export const openChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = (req as any).user;
    if (!me?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { peerUserId } = req.body || {};
    if (typeof peerUserId !== "string" || peerUserId === me.id) {
      throw throwError("peerUserId is required", 400);
    }

    const [peer] = await db.select().from(users).where(eq(users.id, peerUserId)).limit(1);
    if (!peer) {
      throw throwError("User not found", 404);
    }

    const myId = me.id as string;

    const [existing] = await db
      .select()
      .from(chats)
      .where(
        or(
          and(eq(chats.userAId, myId), eq(chats.userBId, peerUserId)),
          and(eq(chats.userAId, peerUserId), eq(chats.userBId, myId))
        )
      )
      .limit(1);

    if (existing) {
      return res.status(200).json({ success: true, data: { chatId: existing.id } });
    }

    const [created] = await db
      .insert(chats)
      .values({ userAId: myId, userBId: peerUserId })
      .returning();

    return res.status(201).json({ success: true, data: { chatId: created.id } });
  } catch (e: any) {
    next(e);
  }
};