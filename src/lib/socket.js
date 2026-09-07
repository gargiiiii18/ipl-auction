import { io } from "socket.io-client";

// REST calls go through the vercel.json proxy (same origin — see src/lib/api.js).
// The socket connects DIRECTLY to Render: websocket proxying through Vercel
// rewrites is unreliable, and point-to-point works flawlessly.
// Update this URL if the backend is redeployed to a new host.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://ipl-auction-4zdr.onrender.com";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}
