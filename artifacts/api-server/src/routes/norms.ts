import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq, gte, lte, ne, type SQL } from "drizzle-orm";
import { db, referenceResultsTable } from "@workspace/db";
import { CompareWithNormsBody, CompareWithNormsResponse } from "@workspace/api-zod";
import { ageAt, cohortFor, compareWithCohort, MIN_COHORT, normFieldsFor, normValue } from "@workspace/scoring";

// Remembrance-internal norms (build doc §3b): store each person's first
// completed result per test, compare every result with the same age/sex group.
// Scores and ages are health data: never log request bodies here.
// Dev-only: unauthenticated, participantId comes from the client. Needs auth
// before real participants.

const router: IRouter = Router();
const SALT = process.env.NORMS_SALT ?? "remembrance-dev";
const participantKey = (id: string) => createHash("sha256").update(`${SALT}:${id}`).digest("hex");

router.post("/norms/compare", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "not_configured" });
    return;
  }
  const parsed = CompareWithNormsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  const body = parsed.data;
  const age = ageAt(body.birthYear);
  if (age === null) {
    res.status(400).json({ error: "invalid_age" });
    return;
  }
  const cohort = cohortFor(age, body.sex);
  const fields = normFieldsFor(body.testId);
  const values: Record<string, number> = {};
  for (const f of fields) {
    const v = normValue(body.fields[f.field], f.max);
    if (v !== null) values[f.field] = v;
  }
  const key = participantKey(body.participantId);

  try {
    let stored = false;
    // Only completed administrations; the unique index keeps the first one per person.
    if (body.completed && Object.keys(values).length > 0) {
      const inserted = await db
        .insert(referenceResultsTable)
        .values({
          participantKey: key,
          testId: body.testId,
          formId: body.formId,
          specVersion: body.specVersion,
          scorerVersion: body.scorerVersion,
          equated: body.equated,
          channel: body.channel,
          ageAtTest: age,
          sex: body.sex,
          educationYears: body.educationYears ?? null,
          fields: values,
        })
        .onConflictDoNothing()
        .returning({ id: referenceResultsTable.id });
      stored = inserted.length > 0;
    }

    // The group: same test and age band (and sex, when given), everyone but this person.
    const where: SQL[] = [
      eq(referenceResultsTable.testId, body.testId),
      ne(referenceResultsTable.participantKey, key),
      gte(referenceResultsTable.ageAtTest, cohort.minAge),
    ];
    if (cohort.maxAge !== null) where.push(lte(referenceResultsTable.ageAtTest, cohort.maxAge));
    if (cohort.sex) where.push(eq(referenceResultsTable.sex, cohort.sex));
    const rows = await db.select({ fields: referenceResultsTable.fields }).from(referenceResultsTable).where(and(...where));

    const results = fields
      .filter((f) => values[f.field] !== undefined)
      .map((f) => {
        const group = rows.map((r) => r.fields[f.field]).filter((v): v is number => typeof v === "number");
        const c = compareWithCohort(values[f.field]!, group, MIN_COHORT, f.lowerIsBetter);
        return { field: f.field, label: f.label, value: values[f.field]!, n: c.n, percentile: c.percentile, median: c.median };
      });

    res.json(CompareWithNormsResponse.parse({ stored, cohort: cohort.label, minCohort: MIN_COHORT, results }));
  } catch {
    req.log.error("Norms comparison failed");
    res.status(503).json({ error: "unavailable" });
  }
});

export default router;
