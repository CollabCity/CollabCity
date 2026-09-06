ALTER TABLE "conversations" DROP CONSTRAINT "conversations_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "listing_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;