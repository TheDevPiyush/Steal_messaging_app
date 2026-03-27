import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { getMe } from "../controllers/user.controller";

export const userRouer = Router()

userRouer.get('/@me', verifyToken, getMe);