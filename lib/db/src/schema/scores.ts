import { index, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// POC score storage: one row per completed test/check-in. `fields` is a
// free-form key -> number|null map (NACC field codes, cognitive domains,
// whatever the caller scored), same convention as referenceResultsTable.
export const scoresTable = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    testId: varchar("test_id", { length: 64 }).notNull(),
    composite: integer("composite"),
    fields: jsonb("fields").$type<Record<string, number | null>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scores_user_id_idx").on(t.userId)],
);

export type Score = typeof scoresTable.$inferSelect;
