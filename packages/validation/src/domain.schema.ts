import { z } from "zod";

export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(2).max(120),
  bio: z.string().trim().min(20).max(1000),
  location: z.string().trim().max(120),
  availability: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(2).max(80),
  languages: z.array(z.string().trim().min(1)).min(1).max(8),
});

export const skillSchema = z.object({
  title: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(1000),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  pointsPerHour: z.coerce.number().int().min(1).max(100),
  tags: z.array(z.string().trim().min(1)).min(1).max(10),
});

export const communityPostSchema = z.object({
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(20).max(2000),
});

export const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
});

export const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  messageNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  profileVisibility: z.enum(["PUBLIC", "MEMBERS"]),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
