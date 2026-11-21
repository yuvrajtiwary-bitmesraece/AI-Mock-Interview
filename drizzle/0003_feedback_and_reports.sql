-- 1.1: rubric analysis, delivery metrics and question index on answers, and a cached report. Additive only.
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "report" jsonb;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN IF NOT EXISTS "questionIndex" integer;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN IF NOT EXISTS "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN IF NOT EXISTS "metrics" jsonb;