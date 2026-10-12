"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/authStore";

const sockets = new Map<string, Socket>();

function currentSocketAuth() {
  const token = useAuthStore.getState().accessToken;
  return token ? { token } : {};
}

// Keep the credentials used for the next Socket.IO handshake synchronized
// with access-token refreshes. This does not force a reconnect on token refresh.
useAuthStore.subscribe((state, previous) => {
  if (state.accessToken === previous.accessToken) return;
  const auth = currentSocketAuth();
  for (const socket of sockets.values()) socket.auth = auth;
});

// A socket authenticates once at handshake. Always tear down existing sockets
// when identity changes so a second account can never reuse the first account's
// already-authenticated realtime connection.
if (typeof window !== "undefined") {
  window.addEventListener("talentswap:auth-changed", () => disconnectAllSockets());
}

export function getSocket(namespace = "/"): Socket {
  const existing = sockets.get(namespace);
  if (existing) return existing;
  const socket = io(`${env.NEXT_PUBLIC_SOCKET_URL}${namespace === "/" ? "" : namespace}`, {
    autoConnect: false,
    auth: currentSocketAuth(),
    transports: ["websocket"],
  });
  sockets.set(namespace, socket);
  return socket;
}

export function connectSocket(namespace = "/"): void {
  const socket = getSocket(namespace);
  // Read the latest access token immediately before every (re)connection. A
  // socket created before login or before a token refresh must not reconnect
  // with the stale token captured when it was first created.
  socket.auth = currentSocketAuth();
  if (!socket.connected) socket.connect();
}
export function disconnectSocket(namespace = "/"): void { sockets.get(namespace)?.disconnect(); sockets.delete(namespace); }
export function disconnectAllSockets(): void { for (const socket of sockets.values()) socket.disconnect(); sockets.clear(); }
