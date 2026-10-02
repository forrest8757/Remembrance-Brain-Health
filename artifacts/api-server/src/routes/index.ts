import { Router } from "express";
import healthRouter from "./health.js";
import waitlistRouter from "./waitlist.js";
import normsRouter from "./norms.js";

const router = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(normsRouter);

export default router;
