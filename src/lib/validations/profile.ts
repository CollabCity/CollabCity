import { z } from "zod";
import { MAX_RADIUS_METERS, MIN_RADIUS_METERS } from "@/lib/geo";

export const profileInputSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  headline: z.string().trim().max(140).optional(),
  bio: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().length(2).default("BR"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  searchRadiusMeters: z.coerce.number().int().min(MIN_RADIUS_METERS).max(MAX_RADIUS_METERS),
  website: z.union([z.url(), z.literal("")]).optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
