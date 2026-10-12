import type { Profile } from "@talentswap/types";
import type { ProfileInput } from "@talentswap/validation";
import { apiRequest } from "@/lib/api";

export const profileApi = {
  /** The server derives the user ID from the authenticated access token. */
  get: () => apiRequest<Profile>("/profiles/me"),
  update: (body: ProfileInput) => apiRequest<Profile>("/profiles/me", {
    method: "PATCH",
    body: {
      displayName: body.name,
      headline: body.headline,
      bio: body.bio,
      location: body.location,
      availability: body.availability,
      timezone: body.timezone,
      languages: body.languages,
    },
  }),
};
