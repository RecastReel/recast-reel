CREATE TABLE "cue_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "swaps" ADD COLUMN "cue_key_id" text;--> statement-breakpoint
ALTER TABLE "cue_keys" ADD CONSTRAINT "cue_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cue_keys_active_user_idx" ON "cue_keys" USING btree ("user_id") WHERE "cue_keys"."active";--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_cue_key_id_cue_keys_id_fk" FOREIGN KEY ("cue_key_id") REFERENCES "public"."cue_keys"("id") ON DELETE no action ON UPDATE no action;