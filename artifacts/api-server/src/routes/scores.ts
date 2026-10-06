import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, scoresTable, usersTable } from "@workspace/db";
import { SaveScoreBody, SaveScoreResponse, ListScoresResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users/:id/scores", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const parsed = SaveScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const [score] = await db
      .insert(scoresTable)
      .values({
        userId,
        testId: parsed.data.testId,
        composite: parsed.data.composite ?? null,
        fields: parsed.data.fields,
      })
      .returning();
    res.json(SaveScoreResponse.parse(score));
  } catch {
    req.log.error("Score save failed");
    res.status(503).json({ error: "Could not save the score just now. Please try again." });
  }
});

router.get("/users/:id/scores", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const scores = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.userId, userId))
    .orderBy(desc(scoresTable.createdAt));
  res.json(ListScoresResponse.parse(scores));
});

export default router;
