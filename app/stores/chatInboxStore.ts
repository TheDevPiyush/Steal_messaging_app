import { create } from "zustand";

export type ChatPreviewBump = {
  chatId: string;
  text: string;
  createdAt: string;
};

type State = {
  lastByChat: Record<string, ChatPreviewBump>;
  bump: (m: ChatPreviewBump) => void;
};

export const useChatInboxStore = create<State>((set) => ({
  lastByChat: {},
  bump: (m) =>
    set((s) => ({
      lastByChat: { ...s.lastByChat, [m.chatId]: m },
    })),
}));
