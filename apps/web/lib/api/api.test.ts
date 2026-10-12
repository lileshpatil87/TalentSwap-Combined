import { apiRequest, ApiRequestError, NetworkError, configureApiAuth } from "@/lib/api";

const mockResponse = (data: unknown, status = 200): Response =>
  ({
    status,
    json: () => Promise.resolve(data),
  }) as unknown as Response;

describe("api boundary", () => {
  beforeEach(() => { configureApiAuth(() => "test-token"); });
  it("injects bearer auth and unwraps a successful envelope", async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ success: true, data: { ok: true }, meta: { requestId: "1", timestamp: "now" } }, 200));
    await expect(apiRequest<{ ok: boolean }>("/test")).resolves.toEqual({ ok: true });
    const firstCall = (global.fetch as jest.Mock).mock.calls[0] as unknown as [string, RequestInit];
    const calledUrl = firstCall[0];
    const calledInit = firstCall[1];
    expect(calledUrl).toContain("/test");
    expect((calledInit.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });
  it("maps API envelopes to ApiRequestError", async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ success: false, error: { code: "BAD_REQUEST", message: "Invalid" }, meta: { requestId: "1", timestamp: "now" } }, 400));
    await expect(apiRequest("/test")).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("refreshes an expired access token once and retries the original request", async () => {
    let token: string | null = "expired-token";
    const updateSession = jest.fn((session: { accessToken: string }) => { token = session.accessToken; });
    const onUnauthorized = jest.fn();
    configureApiAuth(() => token, updateSession as any, onUnauthorized);
    global.fetch = jest.fn()
      .mockResolvedValueOnce(mockResponse({ success: false, error: { code: "UNAUTHORIZED", message: "Expired" }, meta: { requestId: "1", timestamp: "now" } }, 401))
      .mockResolvedValueOnce(mockResponse({ success: true, data: { user: { id: "u1", email: "u@example.com", role: "USER" }, accessToken: "fresh-token", accessTokenExpiresIn: 900 }, meta: { requestId: "2", timestamp: "now" } }, 200))
      .mockResolvedValueOnce(mockResponse({ success: true, data: { ok: true }, meta: { requestId: "3", timestamp: "now" } }, 200));

    await expect(apiRequest<{ ok: boolean }>("/private")).resolves.toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(updateSession).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "fresh-token" }));
    const retryInit = (global.fetch as jest.Mock).mock.calls[2][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).Authorization).toBe("Bearer fresh-token");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("clears the session when refresh is rejected", async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth(() => "expired-token", jest.fn(), onUnauthorized);
    global.fetch = jest.fn()
      .mockResolvedValueOnce(mockResponse({ success: false, error: { code: "UNAUTHORIZED", message: "Expired" }, meta: { requestId: "1", timestamp: "now" } }, 401))
      .mockResolvedValueOnce(mockResponse({ success: false, error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token" }, meta: { requestId: "2", timestamp: "now" } }, 401));

    await expect(apiRequest("/private")).rejects.toBeInstanceOf(ApiRequestError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("maps network failures to NetworkError", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    await expect(apiRequest("/test")).rejects.toBeInstanceOf(NetworkError);
  });
});
