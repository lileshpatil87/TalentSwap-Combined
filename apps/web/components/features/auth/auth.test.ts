import { loginSchema, registerSchema } from "@talentswap/validation";

describe("FE-03 authentication validation", () => {
  it("accepts a valid login", () => expect(loginSchema.safeParse({ email: "user@example.com", password: "password" }).success).toBe(true));
  it("rejects an invalid login", () => expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false));
  it("requires registration password policy", () => expect(registerSchema.safeParse({ email: "user@example.com", password: "short" }).success).toBe(false));
  it("normalizes registration email", () => expect(registerSchema.parse({ email: " USER@EXAMPLE.COM ", password: "password123" }).email).toBe("user@example.com"));
});
