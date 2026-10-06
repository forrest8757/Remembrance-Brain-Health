import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateUserBody, CreateUserResponse, GetUserResponse } from "@workspace/api-zod";

// POC: no auth. A user is identified by email; the client holds onto the
// returned id. Needs real auth before real participants.

const router: IRouter = Router();

router.post("/users", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : req.body?.email;
  const parsed = CreateUserBody.safeParse({ ...req.body, email });
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  try {
    const [user] = await db
      .insert(usersTable)
      .values({ email: parsed.data.email, name: parsed.data.name ?? null })
      // No-op update on conflict: forces `.returning()` to give back the existing row.
      .onConflictDoUpdate({ target: usersTable.email, set: { email: parsed.data.email } })
      .returning();
    res.json(CreateUserResponse.parse(user));
  } catch {
    req.log.error("User creation failed");
    res.status(503).json({ error: "Could not create the user just now. Please try again." });
  }
});

router.get("/users/:id", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(GetUserResponse.parse(user));
});

export default router;
