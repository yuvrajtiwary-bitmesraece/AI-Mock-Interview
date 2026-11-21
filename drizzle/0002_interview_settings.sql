-- 1.1: interview type, difficulty, company and resume flag. Additive only.
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "interviewType" varchar(32);--> statement-breakpoint
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "difficulty" varchar(16);--> statement-breakpoint
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "company" varchar(120);--> statement-breakpoint
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "resumeUsed" boolean DEFAULT false NOT NULL;