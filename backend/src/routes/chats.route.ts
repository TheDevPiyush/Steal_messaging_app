import { Router } from "express";
import { getAllChats } from "../controllers/chats.controller";

export const chatsRouter = Router()

chatsRouter.get('/get-all-chats', getAllChats);