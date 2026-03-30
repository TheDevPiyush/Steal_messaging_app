export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string; // ISO string
};

export type PaginatedMessages = {
  messages: Message[];
  nextBefore: string | null; // ISO string cursor for older messages
  hasMore: boolean;
};

