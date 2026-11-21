-- 1.1: Clerk user ID as owner key, real timestamps, indexes, and per-user
-- daily AI usage counters. Additive only: no existing data is changed.
CREATE TABLE IF NOT EXISTS "usage_counter" (
	"userId" varchar NOT NULL,
	"day" date NOT NULL,
	"action" varchar(32) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counter_userId_day_action_pk" PRIMARY KEY("userId","day","action")
);
--> statement-breakpoint
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "userId" varchar;--> statement-breakpoint
ALTER TABLE "mock_interview" ADD COLUMN IF NOT EXISTS "createdOn" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN IF NOT EXISTS "createdOn" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mock_interview_mock_id_idx" ON "mock_interview" USING btree ("mockId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mock_interview_user_id_idx" ON "mock_interview" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mock_interview_created_by_idx" ON "mock_interview" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_answer_mock_id_idx" ON "userAnswer" USING btree ("mockId");