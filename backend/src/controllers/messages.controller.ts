import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../db";
import { chats, messages } from "../db/schema";
import { throwError } from "../middlewares/errorMiddleware";
import { broadcastChatMessage } from "../realtime/chatEvents";
import { getIO } from "../realtime/io";

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = (req as any).user;
    if (!me?.id) return res.status(401).json({ message: "Unauthorized" });

    const { chatId } = req.params;
    const limitRaw = req.query.limit;
    const limit = Math.min(100, Math.max(1, Number(limitRaw ?? 20)));

    const beforeRaw = req.query.before;
    const before = typeof beforeRaw === "string" ? beforeRaw : null;

    let whereCond = eq(messages.chatId, chatId);
    if (before) {
      whereCond = and(whereCond, lt(messages.createdAt, new Date(before)));
    }

    const rows = await db
      .select()
      .from(messages)
      .where(whereCond)
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    const hasMore = rows.length === limit;
    const last = rows[rows.length - 1];

    return res.status(200).json({
      success: true,
      data: {
        messages: rows.map((r) => ({
          id: r.id,
          chatId: r.chatId,
          senderId: r.senderId,
          text: r.text,
          createdAt: (r.createdAt as Date).toISOString(),
        })),
        nextBefore: last ? (last.createdAt as Date).toISOString() : null,
        hasMore,
      },
    });
  } catch (e: any) {
    next(e);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = (req as any).user;
    if (!me?.id) return res.status(401).json({ message: "Unauthorized" });

    const { chatId } = req.params;
    const { text } = req.body || {};

    if (typeof text !== "string" || text.trim().length === 0) {
      throw throwError("Message text is required", 400);
    }

    const [row] = await db
      .insert(messages)
      .values({
        chatId,
        senderId: me.id,
        text: text.trim().slice(0, 5000),
      })
      .returning();

    const messageDto = {
      id: row.id,
      chatId: row.chatId,
      senderId: row.senderId,
      text: row.text,
      createdAt: (row.createdAt as Date).toISOString(),
    };

    try {
      const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
      if (chat) {
        const peerId = chat.userAId === me.id ? chat.userBId : chat.userAId;
        broadcastChatMessage(getIO(), messageDto, peerId as string);
      }
    } catch {
      // Socket server may be unavailable in some dev setups; REST still succeeds.
    }

    return res.status(201).json({
      success: true,
      data: {
        message: messageDto,
      },
    });
  } catch (e: any) {
    next(e);
  }
};

