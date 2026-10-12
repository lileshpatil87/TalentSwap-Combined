import { isNavItemActive, primaryNavItems } from "@/lib/navigation";

describe("navigation", () => {
  it("highlights exact dashboard route", () => expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true));
  it("does not highlight dashboard on nested route", () => expect(isNavItemActive("/dashboard/settings", "/dashboard")).toBe(false));
  it("highlights nested feature routes", () => expect(isNavItemActive("/skills/react/edit", "/skills")).toBe(true));
  it("registers all delivered dashboard modules", () => expect(primaryNavItems.map(x=>x.id)).toEqual(expect.arrayContaining(["dashboard","discover","skills","exchanges","wallet","messages","community","gamification","ratings","profile","documents"])));
});


describe("removed navigation entries", () => {
  it("does not expose Governance or Developer API in member navigation", () => {
    const ids = primaryNavItems.map(item => item.id);
    expect(ids).not.toContain("governance");
    expect(ids).not.toContain("developer-api");
  });
});
