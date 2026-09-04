// Thin REST wrapper. Every backend error carries a user-safe message (GameError),
// so we surface body.error directly.
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const createRoom = (name, hostName, maxLots) =>
  api("/rooms", { method: "POST", body: JSON.stringify({ name, hostName, maxLots }) });
