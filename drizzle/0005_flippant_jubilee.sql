CREATE TYPE "public"."staff_role" AS ENUM('moderator', 'admin');--> statement-breakpoint
CREATE TABLE "suspensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_by" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lifted_at" timestamp with time zone,
	"lifted_by" text,
	"lift_reason" text
);
--> statement-breakpoint
ALTER TABLE "moderators" ADD COLUMN "role" "staff_role" DEFAULT 'moderator' NOT NULL;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_lifted_by_user_id_fk" FOREIGN KEY ("lifted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suspensions_user_idx" ON "suspensions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "suspensions_active_key" ON "suspensions" USING btree ("user_id") WHERE lifted_at IS NULL;