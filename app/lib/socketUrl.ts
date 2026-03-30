/** Derive Socket.IO URL from REST API base (https -> wss, http -> ws). */
export function getSocketUrlFromApiBase(apiBase: string | undefined) {
  if (!apiBase) return undefined;
  return apiBase.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}
