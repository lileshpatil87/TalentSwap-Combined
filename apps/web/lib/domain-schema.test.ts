import { communityPostSchema, profileSchema, ratingSchema, settingsSchema, skillSchema } from "@talentswap/validation";

describe("domain validation", () => {
  it("rejects invalid profile data", () => expect(profileSchema.safeParse({}).success).toBe(false));
  it("accepts a valid skill", () => expect(skillSchema.safeParse({ title:"TypeScript", category:"Programming", description:"A sufficiently detailed skill description for validation.", level:"ADVANCED", pointsPerHour:20, tags:["TS"] }).success).toBe(true));
  it("rejects invalid rating", () => expect(ratingSchema.safeParse({ score:6, comment:"bad" }).success).toBe(false));
  it("accepts valid settings", () => expect(settingsSchema.safeParse({ emailNotifications:true, messageNotifications:true, marketingEmails:false, profileVisibility:"PUBLIC" }).success).toBe(true));
  it("validates community posts", () => expect(communityPostSchema.safeParse({ title:"Offer", body:"This is a sufficiently long community post body." }).success).toBe(true));
});
