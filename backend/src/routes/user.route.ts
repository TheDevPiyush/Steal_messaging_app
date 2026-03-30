import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { getMe, registerPushToken } from "../controllers/user.controller";

export const userRouer = Router()

userRouer.get('/@me', verifyToken, getMe);
userRouer.post('/push-token', verifyToken, registerPushToken);