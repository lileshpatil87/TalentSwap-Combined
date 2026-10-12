import { apiRequest } from "@/lib/api";
import { profileApi } from "@/lib/api/profile";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

describe("profile API identity boundary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads the profile for the authenticated identity, never by a caller-supplied user ID", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: "user-a", name: "Account A" });

    await profileApi.get();

    expect(apiRequest).toHaveBeenCalledWith("/profiles/me");
    expect(apiRequest).not.toHaveBeenCalledWith(expect.stringMatching(/^\/users\//));
  });

  it("updates only the authenticated user's editable profile fields", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: "user-a", name: "Updated Name" });

    await profileApi.update({
      name: "Updated Name",
      headline: "Developer",
      bio: "A profile bio",
      location: "Pune",
      availability: "Evenings",
      timezone: "Asia/Kolkata",
      languages: ["English"],
    } as any);

    expect(apiRequest).toHaveBeenCalledWith("/profiles/me", expect.objectContaining({
      method: "PATCH",
      body: expect.objectContaining({ displayName: "Updated Name", headline: "Developer" }),
    }));
  });
});
