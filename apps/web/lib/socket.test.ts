import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

describe("socket architecture", () => {
  it("creates isolated approved namespaces", () => {
    const chat = getSocket("/chat"); const call = getSocket("/call");
    interface SocketWithNsp { nsp: string; }
    expect(chat).not.toBe(call); expect((chat as unknown as SocketWithNsp).nsp).toBe("/chat"); expect((call as unknown as SocketWithNsp).nsp).toBe("/call");
    connectSocket("/chat"); disconnectSocket("/chat"); disconnectSocket("/call");
  });
});

describe("socket authentication lifecycle", () => {
  const user = (id: string) => ({ id, email: `${id}@example.com`, role: "USER" as const });

  afterEach(() => {
    disconnectSocket("/chat");
    disconnectSocket("/call");
    useAuthStore.getState().clearSession();
  });

  it("updates cached socket auth when the access token refreshes", () => {
    useAuthStore.getState().setSession(user("user-a") as any, "token-a");
    const socket = getSocket("/chat");
    expect((socket.auth as any).token).toBe("token-a");

    useAuthStore.getState().setSession(user("user-a") as any, "token-a-refreshed");
    expect((socket.auth as any).token).toBe("token-a-refreshed");
  });

  it("does not reuse a realtime connection after the authenticated user changes", () => {
    useAuthStore.getState().setSession(user("user-a") as any, "token-a");
    const firstUserSocket = getSocket("/chat");

    useAuthStore.getState().setSession(user("user-b") as any, "token-b");
    const secondUserSocket = getSocket("/chat");

    expect(secondUserSocket).not.toBe(firstUserSocket);
    expect((secondUserSocket.auth as any).token).toBe("token-b");
  });
});
