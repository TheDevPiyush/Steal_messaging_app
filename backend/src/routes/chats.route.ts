import { Router } from "express";
import { getAllChats, openChat } from "../controllers/chats.controller";
import { verifyToken } from "../middlewares/verifyToken";

export const chatsRouter = Router()

chatsRouter.get('/get-all-chats', verifyToken, getAllChats);
chatsRouter.post('/open', verifyToken, openChat);