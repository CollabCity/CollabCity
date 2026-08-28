import type { listings } from "@/db/schema";

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;

export type ListingIntent = Listing["intent"];
export type ResourceType = Listing["resourceType"];
export type ExchangeMode = Listing["exchange"];
export type ListingStatus = Listing["status"];
