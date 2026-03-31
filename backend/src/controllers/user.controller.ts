import type { Request, Response, NextFunction } from "express"
import { registerExpoPushToken } from "../realtime/push";
import { db } from "../db";
import { users } from "../db/schema";
import { and, eq, ilike, ne, or } from "drizzle-orm";
import { throwError } from "../middlewares/errorMiddleware";

const PRIVACY_USERNAME = /^[a-zA-Z0-9._-]{2,24}_[0-9]{8}$/;

// get current user's data
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        return res.status(200).json({ data: user });
    }
    catch (e: any) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** Register Expo push token for this user (MVP: in-memory on server). */
export const registerPushToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { expoPushToken } = req.body || {};
        if (typeof expoPushToken !== "string" || expoPushToken.length < 10) {
            return res.status(400).json({ message: "expoPushToken is required" });
        }

        registerExpoPushToken(user.id as string, expoPushToken);

        return res.status(200).json({ success: true });
    } catch (e: any) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const me = (req as any).user;
        if (!me?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const qRaw = typeof req.query.q === "string" ? req.query.q : "";
        const q = qRaw.replace(/[^a-zA-Z0-9._@-]/g, "").slice(0, 64);
        if (q.length < 1) {
            return res.status(200).json({ success: true, data: { users: [] } });
        }

        const pattern = `%${q}%`;

        const rows = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                photoURL: users.photoURL,
            })
            .from(users)
            .where(
                and(
                    ne(users.id, me.id as string),
                    or(ilike(users.username, pattern), ilike(users.email, pattern))
                )
            )
            .limit(25);

        return res.status(200).json({ success: true, data: { users: rows } });
    } catch (e: any) {
        next(e);
    }
};

export const checkUsernameAvailable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const me = (req as any).user;
        if (!me?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const username = typeof req.query.username === "string" ? req.query.username : "";
        if (!PRIVACY_USERNAME.test(username)) {
            return res.status(200).json({ success: true, data: { available: false } });
        }

        const [hit] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        const available = !hit || hit.id === me.id;

        return res.status(200).json({ success: true, data: { available } });
    } catch (e: any) {
        next(e);
    }
};

export const updateUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const me = (req as any).user;
        if (!me?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { username } = req.body || {};
        if (typeof username !== "string" || !PRIVACY_USERNAME.test(username)) {
            throw throwError("Invalid username format", 400);
        }

        const [taken] = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (taken && taken.id !== me.id) {
            throw throwError("Username already taken", 409);
        }

        const [updated] = await db
            .update(users)
            .set({ username })
            .where(eq(users.id, me.id as string))
            .returning();

        return res.status(200).json({ success: true, data: { user: updated } });
    } catch (e: any) {
        next(e);
    }
};