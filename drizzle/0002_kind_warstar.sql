CREATE TYPE "public"."report_reason" AS ENUM('scam', 'illegal', 'harassment', 'spam', 'misleading', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'upheld', 'dismissed');--> statement-breakpoint
CREATE TABLE "moderators" (
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"listing_id" uuid,
	"review_id" uuid,
	"conversation_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"resolution_note" text,
	CONSTRAINT "reports_reporter_listing_key" UNIQUE("reporter_id","listing_id"),
	CONSTRAINT "reports_reporter_review_key" UNIQUE("reporter_id","review_id"),
	CONSTRAINT "reports_reporter_conversation_key" UNIQUE("reporter_id","conversation_id"),
	CONSTRAINT "reports_single_target" CHECK ((
        (CASE WHEN "reports"."listing_id" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "reports"."review_id" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "reports"."conversation_id" IS NULL THEN 0 ELSE 1 END)
      ) = 1),
	CONSTRAINT "reports_details_length" CHECK (char_length("reports"."details") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "moderators" ADD CONSTRAINT "moderators_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");