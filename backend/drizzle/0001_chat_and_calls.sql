CREATE TABLE "chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_a_id" uuid NOT NULL,
  "user_b_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "messages_chat_id_created_at_idx" ON "messages" ("chat_id","created_at");

CREATE TABLE "calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caller_id" uuid NOT NULL,
  "callee_id" uuid NOT NULL,
  "call_type" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp,
  "duration_seconds" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "calls_caller_id_started_at_idx" ON "calls" ("caller_id","started_at");
CREATE INDEX "calls_callee_id_started_at_idx" ON "calls" ("callee_id","started_at");

