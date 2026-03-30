import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/messages.controller";
import { verifyToken } from "../middlewares/verifyToken";

export const messagesRouter = Router();

messagesRouter.get("/:chatId", verifyToken, getMessages);
messagesRouter.post("/:chatId", verifyToken, sendMessage);

