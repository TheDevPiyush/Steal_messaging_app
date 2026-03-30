export type ChatPartner = {
  id: string;
  email: string;
  username: string | null;
  photoURL: string | null;
};

export type ChatLastMessage = {
  id: string;
  text: string;
  createdAt: string; // ISO string
};

export type ChatSummary = {
  id: string;
  partner: ChatPartner;
  lastMessage?: ChatLastMessage;
};

