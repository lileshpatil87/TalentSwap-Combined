"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/authStore";

const sockets = new Map<string, Socket>();

export function getSocket(namespace = "/"): Socket {
  const existing = sockets.get(namespace);
  if (existing) return existing;
  const token = useAuthStore.getState().accessToken;
  const socket = io(`${env.NEXT_PUBLIC_SOCKET_URL}${namespace === "/" ? "" : namespace}`, {
    autoConnect: false,
    auth: token ? { token } : {},
    transports: ["websocket"],
  });
  sockets.set(namespace, socket);
  return socket;
}

export function connectSocket(namespace = "/"): void { const socket = getSocket(namespace); if (!socket.connected) socket.connect(); }
export function disconnectSocket(namespace = "/"): void { sockets.get(namespace)?.disconnect(); sockets.delete(namespace); }
export function disconnectAllSockets(): void { for (const socket of sockets.values()) socket.disconnect(); sockets.clear(); }
