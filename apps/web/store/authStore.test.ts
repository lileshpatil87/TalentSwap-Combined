import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "./authStore";

jest.mock("@/lib/api/auth", () => ({
  authApi: {
    refresh: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

const session = (id: string, email: string) => ({
  user: { id, email, role: "USER" as const },
  accessToken: `token-${id}`,
  accessTokenExpiresIn: 900,
});

describe("authenticated account identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, hydrated: false });
  });

  it("uses the identity returned by the backend rather than a demo identity", async () => {
    (authApi.login as jest.Mock).mockResolvedValue(session("user-a", "a@example.com"));

    await useAuthStore.getState().login({ email: "a@example.com", password: "password123" });

    expect(useAuthStore.getState().user).toEqual({ id: "user-a", email: "a@example.com", role: "USER" });
    expect(useAuthStore.getState().user?.email).not.toBe("alex@demo.talentswap");
    expect(useAuthStore.getState().accessToken).toBe("token-user-a");
  });

  it("replaces account identity when another user signs in", async () => {
    useAuthStore.getState().setSession(session("user-a", "a@example.com").user, "token-user-a");
    (authApi.login as jest.Mock).mockResolvedValue(session("user-b", "b@example.com"));

    await useAuthStore.getState().login({ email: "b@example.com", password: "password123" });

    expect(useAuthStore.getState().user).toEqual({ id: "user-b", email: "b@example.com", role: "USER" });
    expect(useAuthStore.getState().accessToken).toBe("token-user-b");
  });

  it("does not restore any identity when refresh fails", async () => {
    (authApi.refresh as jest.Mock).mockRejectedValue(new Error("No valid session"));

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it("clears local identity even if the server logout request fails", async () => {
    useAuthStore.getState().setSession(session("user-a", "a@example.com").user, "token-user-a");
    (authApi.logout as jest.Mock).mockRejectedValue(new Error("Network unavailable"));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});
