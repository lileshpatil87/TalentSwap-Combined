import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname);
const required = [
  ["auth", "authApi"], ["profile", "profileApi"], ["skills", "skillsApi"], ["discover", "discoverApi"],
  ["wallet", "walletApi"], ["transactions", "transactionsApi"], ["chat", "chatApi"], ["calling", "callingApi"],
  ["notifications", "notificationsApi"], ["documents", "documentsApi"], ["gamification", "gamificationApi"],
  ["community", "communityApi"], ["ratings", "ratingsApi"], ["admin", "adminApi"], ["settings", "settingsApi"],
] as const;

describe("FE-03 → FE-19 contract adoption", () => {
  it.each(required)("%s owns a typed API boundary", (feature, apiName) => {
    const files = fs.readdirSync(path.join(root, feature));
    expect(files.some(name => name.endsWith("Page.tsx") || name.endsWith(".tsx"))).toBe(true);
    const source = fs.readFileSync(path.join(root, feature, `${feature === "notifications" ? "NotificationsPage" : feature[0].toUpperCase()+feature.slice(1)+"Page"}.tsx`), "utf8");
    expect(source).toContain(apiName);
  });
  it("chat uses approved realtime events", () => {
    const source = fs.readFileSync(path.join(root, "chat", "ChatPage.tsx"), "utf8");
    expect(source).toContain('getSocket("/chat")'); expect(source).toContain('"message:send"'); expect(source).toContain('"message:received"');
  });
  it("calling uses approved WebRTC signalling events", () => {
    const source = fs.readFileSync(path.join(root, "calling", "CallingPage.tsx"), "utf8");
    for (const event of ["call:signal", "call:join", "call:peer-joined", "ice-candidate", "offer", "answer", "end"]) expect(source).toContain(event);
    expect(source).toContain("getUserMedia");
  });
});
