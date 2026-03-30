import { Router } from "express";
import { getAllChats } from "../controllers/chats.controller";
import { verifyToken } from "../middlewares/verifyToken";

export const chatsRouter = Router()

chatsRouter.get('/get-all-chats', verifyToken, getAllChats);