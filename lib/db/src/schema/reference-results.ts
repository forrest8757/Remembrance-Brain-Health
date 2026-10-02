import { boolean, integer, jsonb, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// Remembrance-internal norms (build doc §3b): each participant's FIRST
// completed administration of a test, with age and sex for grouping.
// De-identified: a one-way hashed participant key, birth-year age, no name,
// email, city or audio. Later administrations are never stored here
// (practice effects, CLAUDE.md §8).
export const referenceResultsTable = pgTable(
  "reference_results",
  {
    id: serial("id").primaryKey(),
    /** SHA-256 of the participant id (with a server salt); only used to keep one row per person per test. */
    participantKey: varchar("participant_key", { length: 64 }).notNull(),
    testId: varchar("test_id", { length: 64 }).notNull(),
    formId: varchar("form_id", { length: 64 }).notNull(),
    specVersion: varchar("spec_version", { length: 32 }).notNull(),
    scorerVersion: varchar("scorer_version", { length: 32 }).notNull(),
    equated: boolean("equated").notNull(),
    channel: varchar("channel", { length: 8 }).notNull(),
    ageAtTest: integer("age_at_test").notNull(),
    /** 'female' | 'male' | 'undisclosed' */
    sex: varchar("sex", { length: 16 }).notNull(),
    educationYears: integer("education_years"),
    /** Official score fields (e.g. { forwardTotal: 8 }); reason codes already removed. */
    fields: jsonb("fields").$type<Record<string, number>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reference_results_participant_test").on(t.participantKey, t.testId)],
);

export type ReferenceResult = typeof referenceResultsTable.$inferSelect;
