import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, or, lt } from "drizzle-orm";
import { db } from "../db";
import { calls } from "../db/schema";
import { throwError } from "../middlewares/errorMiddleware";

export const getCalls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = (req as any).user;
    if (!me?.id) return res.status(401).json({ message: "Unauthorized" });

    const myId = me.id;

    const limitRaw = req.query.limit;
    const limit = Math.min(100, Math.max(1, Number(limitRaw ?? 20)));

    const beforeRaw = req.query.before;
    const before = typeof beforeRaw === "string" ? beforeRaw : null;

    let whereCond = or(eq(calls.callerId, myId), eq(calls.calleeId, myId));
    if (before) {
      whereCond = and(whereCond, lt(calls.startedAt, new Date(before)));
    }

    const rows = await db
      .select()
      .from(calls)
      .where(whereCond)
      .orderBy(desc(calls.startedAt))
      .limit(limit);

    const hasMore = rows.length === limit;
    const last = rows[rows.length - 1];

    const payload = rows.map((r) => {
      const peerId = r.callerId === myId ? r.calleeId : r.callerId;
      return {
        id: r.id,
        callType: r.callType as any,
        peerId,
        startedAt: (r.startedAt as Date).toISOString(),
        endedAt: r.endedAt ? (r.endedAt as Date).toISOString() : null,
        durationSeconds: r.durationSeconds,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        calls: payload,
        nextBefore: last ? (last.startedAt as Date).toISOString() : null,
        hasMore,
      },
    });
  } catch (e: any) {
    next(e);
  }
};

export const createCallLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = (req as any).user;
    if (!me?.id) return res.status(401).json({ message: "Unauthorized" });

    const { peerId, callType, startedAt, endedAt, durationSeconds, asCallee } = req.body || {};

    if (typeof peerId !== "string" || peerId.length < 3) {
      throw throwError("peerId is required", 400);
    }

    if (callType !== "voice" && callType !== "video") {
      throw throwError("callType must be 'voice' or 'video'", 400);
    }

    const started = startedAt ? new Date(startedAt) : new Date();
    const ended = endedAt ? new Date(endedAt) : null;
    const dur = typeof durationSeconds === "number" ? Math.max(0, Math.floor(durationSeconds)) : 0;

    const isCallee = Boolean(asCallee);

    const [row] = await db
      .insert(calls)
      .values(
        isCallee
          ? {
              callerId: peerId,
              calleeId: me.id,
              callType,
              startedAt: started,
              endedAt: ended,
              durationSeconds: dur,
            }
          : {
              callerId: me.id,
              calleeId: peerId,
              callType,
              startedAt: started,
              endedAt: ended,
              durationSeconds: dur,
            }
      )
      .returning();

    const r = row;
    return res.status(201).json({
      success: true,
      data: {
        call: {
          id: r.id,
          callType: r.callType as any,
          peerId: r.callerId === me.id ? r.calleeId : r.callerId,
          startedAt: (r.startedAt as Date).toISOString(),
          endedAt: r.endedAt ? (r.endedAt as Date).toISOString() : null,
          durationSeconds: r.durationSeconds,
        },
      },
    });
  } catch (e: any) {
    next(e);
  }
};

