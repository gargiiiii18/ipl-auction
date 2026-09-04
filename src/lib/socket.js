import { io } from "socket.io-client";

// Same-origin by default — vite proxies /socket.io to the backend in development.
// Set VITE_API_URL when the backend lives elsewhere (e.g. production deployment).
const API_BASE = import.meta.env.VITE_API_URL || "";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE || undefined, { autoConnect: false });
  }
  return socket;
}
