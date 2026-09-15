import { Router, type IRouter } from "express";
import { db, waitlistTable } from "@workspace/db";
import { JoinWaitlistBody, JoinWaitlistResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const attempts = new Map<string, { count: number; expires: number }>();
const WINDOW = 60_000;
const cleanup = setInterval(() => {
  for (const [key, value] of attempts) {
    if (value.expires <= Date.now()) attempts.delete(key);
  }
}, WINDOW);
cleanup.unref();

router.post("/waitlist", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const previous = attempts.get(key);
  const entry = previous && previous.expires > now
    ? previous
    : { count: 0, expires: now + WINDOW };
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > 20) {
    res.setHeader("Retry-After", String(Math.ceil((entry.expires - now) / 1000)));
    res.status(429).json({ error: "Please wait a moment before trying again." });
    return;
  }

  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : req.body?.email;
  const parsed = JoinWaitlistBody.safeParse({ email });
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  try {
    await db.insert(waitlistTable).values(parsed.data).onConflictDoNothing();
    res.json(JoinWaitlistResponse.parse({
      message: "You're on the list. We'll be in touch.",
    }));
  } catch {
    // Do not log database errors containing the submitted email or query parameters.
    req.log.error("Waitlist signup could not be stored");
    res.status(503).json({ error: "We couldn't save your place just now. Please try again." });
  }
});

export default router;