import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { createCallLog, getCalls } from "../controllers/calls.controller";

export const callsRouter = Router();

callsRouter.get("/", verifyToken, getCalls);
callsRouter.post("/", verifyToken, createCallLog);

