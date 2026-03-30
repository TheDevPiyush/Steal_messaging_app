export type CallType = "voice" | "video";

export type CallLog = {
  id: string;
  callType: CallType;
  peerId: string;
  startedAt: string; // ISO string
  endedAt: string | null; // ISO string
  durationSeconds: number; // integer
};

export type PaginatedCalls = {
  calls: CallLog[];
  nextBefore: string | null; // ISO string cursor for older calls
  hasMore: boolean;
};

