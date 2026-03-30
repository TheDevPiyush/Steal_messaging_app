import express from "express";
import http from "http";
import type { Response } from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { errorHandler } from "./src/middlewares/errorMiddleware";
import { authRouter } from "./src/routes/auth.route";
import { userRouer } from "./src/routes/user.route";
import { chatsRouter } from "./src/routes/chats.route";
import { messagesRouter } from "./src/routes/messages.route";
import { callsRouter } from "./src/routes/calls.route";
import { setIO } from "./src/realtime/io";
import { attachSocketIO } from "./src/realtime/socketHandlers";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json());

app.get("/", (_, res: Response) => {
  res.send({ message: "OK" });
});

app.use("/auth", authRouter);
app.use("/user", userRouer);
app.use("/chats", chatsRouter);
app.use("/messages", messagesRouter);
app.use("/calls", callsRouter);

app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

setIO(io);
attachSocketIO(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server + Socket.IO listening on port ${PORT}`);
});
