ALTER TABLE "user_fs_entitlement" ADD COLUMN "credit_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_fs_entitlement" ADD COLUMN "refunded_credit_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_fs_entitlement" ADD COLUMN "revoked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_fs_entitlement" ADD COLUMN "credit_cutoff_at" timestamp DEFAULT now() NOT NULL;
