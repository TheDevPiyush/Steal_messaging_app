import type { Request, Response, NextFunction } from "express"

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