import type { Request, Response, NextFunction } from "express"
import { registerExpoPushToken } from "../realtime/push";

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