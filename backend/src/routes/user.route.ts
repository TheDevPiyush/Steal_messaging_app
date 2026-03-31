import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { getMe, registerPushToken, searchUsers, checkUsernameAvailable, updateUsername } from "../controllers/user.controller";

export const userRouer = Router()

userRouer.get('/@me', verifyToken, getMe);
userRouer.post('/push-token', verifyToken, registerPushToken);
userRouer.get('/search', verifyToken, searchUsers);
userRouer.get('/username-available', verifyToken, checkUsernameAvailable);
userRouer.patch('/username', verifyToken, updateUsername);