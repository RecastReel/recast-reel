ALTER TABLE "swaps" ADD COLUMN "cost_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Price existing videos at MadeByCue's per-second rates (minimax-h3 768p $0.21, swap $0.18).
UPDATE "swaps" SET "cost_cents" = "seconds" * CASE WHEN "kind" = 'generate' THEN 21 ELSE 18 END;
