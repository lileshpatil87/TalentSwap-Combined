import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

describe("socket architecture", () => {
  it("creates isolated approved namespaces", () => {
    const chat = getSocket("/chat"); const call = getSocket("/call");
    interface SocketWithNsp { nsp: string; }
    expect(chat).not.toBe(call); expect((chat as unknown as SocketWithNsp).nsp).toBe("/chat"); expect((call as unknown as SocketWithNsp).nsp).toBe("/call");
    connectSocket("/chat"); disconnectSocket("/chat"); disconnectSocket("/call");
  });
});
