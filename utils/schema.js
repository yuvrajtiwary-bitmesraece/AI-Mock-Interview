import { date, index, integer, pgTable, primaryKey, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// Columns added after 1.0.0 are nullable, so rows written by older versions
// stay valid without rewriting any data. Change the schema here, then run
// `npm run db:generate` to create a migration in drizzle/.

/** One row per mock interview. */
export const MockInterview = pgTable(
  "mock_interview",
  {
    id: serial("id").primaryKey(),
    // Generated questions and model answers, as a JSON array of { ques, ans }.
    jsonMockResp: text("jsonMockResp").notNull(),
    jobPosition: varchar("jobPosition").notNull(),
    techStacks: varchar("techStacks").notNull(),
    jobDescription: varchar("jobDescription").notNull(),
    jobExperience: varchar("jobExperience").notNull(),
    // Owner's email. Interviews created before 1.1 are matched to their owner by it.
    createdBy: varchar("createdBy").notNull(),
    // Creation date as DD-MM-YYYY text (kept for older rows; see createdOn).
    createdAt: varchar("createdAt").notNull(),
    // Public ID used in URLs.
    mockId: varchar("mockId").notNull(),

    // Clerk user ID of the owner. Older rows get it the first time their owner opens the dashboard.
    userId: varchar("userId"),
    createdOn: timestamp("createdOn", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("mock_interview_mock_id_idx").on(table.mockId),
    index("mock_interview_user_id_idx").on(table.userId),
    index("mock_interview_created_by_idx").on(table.createdBy),
  ]
);

/** One row per answered question: transcript, model answer and AI feedback. */
export const UserAnswer = pgTable(
  "userAnswer",
  {
    id: serial("id").primaryKey(),
    mockIdRef: varchar("mockId").notNull(),
    question: varchar("question").notNull(),
    correctAns: text("correctAns"),
    userAnswer: text("userAnswer"),
    feedback: text("feedback"),
    rating: varchar("rating"),
    userEmail: varchar("userEmail"),
    createdAt: varchar("createdAt"),

    createdOn: timestamp("createdOn", { withTimezone: true }),
  },
  (table) => [index("user_answer_mock_id_idx").on(table.mockIdRef)]
);

/**
 * How many AI requests of each kind a user made per day (UTC). Used to enforce
 * the daily limits in utils/limits.js, so one account can't use up the app's
 * Gemini quota.
 */
export const UsageCounter = pgTable(
  "usage_counter",
  {
    userId: varchar("userId").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day, table.action] })]
);
