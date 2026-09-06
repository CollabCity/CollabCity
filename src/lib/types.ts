import type { appeals, listings, reports } from "@/db/schema";

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;

export type ListingIntent = Listing["intent"];
export type ResourceType = Listing["resourceType"];
export type ExchangeMode = Listing["exchange"];
export type ListingStatus = Listing["status"];

export type Report = typeof reports.$inferSelect;

export type ReportReason = Report["reason"];
export type ReportStatus = Report["status"];
/** Que tipo de conteúdo uma denúncia aponta. Derivado de qual coluna está preenchida. */
export type ReportTarget = "listing" | "review" | "conversation";

export type Appeal = typeof appeals.$inferSelect;
export type AppealStatus = Appeal["status"];
