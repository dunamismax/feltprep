-- Hand-edited: IF NOT EXISTS, because the host's provisioner creates schema app in
-- production and the migrator creates it for its bookkeeping table first.
CREATE SCHEMA IF NOT EXISTS "app";
--> statement-breakpoint
CREATE TABLE "app"."guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app"."practice_hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"client_key" text NOT NULL,
	"history_format" smallint NOT NULL,
	"history" jsonb NOT NULL,
	"stack" smallint NOT NULL,
	"player_seat" smallint NOT NULL,
	"net_chips" integer NOT NULL,
	"stored_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_hands_guest_key" UNIQUE("guest_id","client_key")
);
--> statement-breakpoint
ALTER TABLE "app"."practice_hands" ADD CONSTRAINT "practice_hands_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "app"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_hands_guest_stored_idx" ON "app"."practice_hands" USING btree ("guest_id","stored_at");