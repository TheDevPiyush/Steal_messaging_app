import { CallLog, PaginatedCalls, CallType } from "@/types/call";
import { fetchDemoCalls } from "@/utils/demo";

const API = process.env.EXPO_PUBLIC_BACKEND_API_URL as string | undefined;

async function safeFetchJson(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.message || data?.error?.message)) || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function getCalls(args: {
  token: string | null;
  before: string | null;
  limit: number;
}): Promise<PaginatedCalls> {
  const { token, before, limit } = args;
  if (!API) return fetchDemoCalls({ before, limit });

  const url = new URL(`${API}/calls`);
  if (before) url.searchParams.set("before", before);
  url.searchParams.set("limit", String(limit));

  try {
    const data = await safeFetchJson(url.toString(), {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = data?.data ?? data;
    const calls: CallLog[] = payload?.calls ?? [];
    const nextBefore: string | null = payload?.nextBefore ?? payload?.next_cursor ?? null;
    const hasMore: boolean = payload?.hasMore ?? payload?.has_more ?? Boolean(payload?.hasMore);

    if (!Array.isArray(calls) || calls.length === 0) return fetchDemoCalls({ before, limit });
    return { calls, nextBefore, hasMore };
  } catch {
    return fetchDemoCalls({ before, limit });
  }
}

export async function createCallLog(args: {
  token: string | null;
  peerId: string;
  callType: CallType;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationSeconds: number;
  /** When true, current user was the callee (incoming call). */
  asCallee?: boolean;
}): Promise<CallLog> {
  const { token, peerId, callType, startedAt, endedAt, durationSeconds, asCallee } = args;

  if (!API) {
    return {
      id: `c-demo-${Date.now()}`,
      peerId,
      callType,
      startedAt,
      endedAt,
      durationSeconds,
    };
  }

  try {
    const url = `${API}/calls`;
    const data = await safeFetchJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        peerId,
        callType,
        startedAt,
        endedAt,
        durationSeconds,
        asCallee: Boolean(asCallee),
      }),
    });
    const payload = data?.data ?? data;
    const call: CallLog = payload?.call ?? payload;
    return call;
  } catch {
    return {
      id: `c-demo-${Date.now()}`,
      peerId,
      callType,
      startedAt,
      endedAt,
      durationSeconds,
    };
  }
}

