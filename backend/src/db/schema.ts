import { integer, pgTable, timestamp, text, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username"),
  createdAt: timestamp("created_at").defaultNow(),
  photoURL: text("photo_url"),
  loginOTP: text("loginOTP"),
  loginOTPExpiresAt:timestamp("loginOTPExpiresAt"),
});

export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAId: uuid("user_a_id").notNull(),
  userBId: uuid("user_b_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id").notNull().references(() => chats.id),
  senderId: uuid("sender_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  callerId: uuid("caller_id").notNull(),
  calleeId: uuid("callee_id").notNull(),
  callType: text("call_type").notNull(), // 'voice' | 'video'
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
