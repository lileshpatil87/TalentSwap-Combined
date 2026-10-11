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
  it("maps network failures to NetworkError", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    await expect(apiRequest("/test")).rejects.toBeInstanceOf(NetworkError);
  });
});
