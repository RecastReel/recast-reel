CREATE TABLE "user_fs_entitlement" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fs_license_id" text NOT NULL,
	"fs_plan_id" text NOT NULL,
	"fs_pricing_id" text NOT NULL,
	"fs_user_id" text NOT NULL,
	"type" text NOT NULL,
	"expiration" timestamp,
	"renewal_date" timestamp,
	"is_canceled" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "user_fs_entitlement_fs_license_id_unique" UNIQUE("fs_license_id")
);
--> statement-breakpoint
ALTER TABLE "user_fs_entitlement" ADD CONSTRAINT "user_fs_entitlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_fs_entitlement_user_idx" ON "user_fs_entitlement" USING btree ("user_id");