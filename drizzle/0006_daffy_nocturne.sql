CREATE TYPE "public"."appeal_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"suspension_id" uuid,
	"report_id" uuid,
	"body" text NOT NULL,
	"status" "appeal_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"resolution_note" text,
	CONSTRAINT "appeals_author_suspension_key" UNIQUE("author_id","suspension_id"),
	CONSTRAINT "appeals_author_report_key" UNIQUE("author_id","report_id"),
	CONSTRAINT "appeals_single_target" CHECK ((
        (CASE WHEN "appeals"."suspension_id" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "appeals"."report_id" IS NULL THEN 0 ELSE 1 END)
      ) = 1),
	CONSTRAINT "appeals_body_length" CHECK (char_length("appeals"."body") BETWEEN 20 AND 2000)
);
--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_suspension_id_suspensions_id_fk" FOREIGN KEY ("suspension_id") REFERENCES "public"."suspensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appeals_status_idx" ON "appeals" USING btree ("status","created_at");