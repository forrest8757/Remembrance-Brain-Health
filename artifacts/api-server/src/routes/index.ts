import { Router } from "express";
import healthRouter from "./health.js";
import waitlistRouter from "./waitlist.js";
import normsRouter from "./norms.js";
import usersRouter from "./users.js";
import scoresRouter from "./scores.js";

const router = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(normsRouter);
router.use(usersRouter);
router.use(scoresRouter);

export default router;
