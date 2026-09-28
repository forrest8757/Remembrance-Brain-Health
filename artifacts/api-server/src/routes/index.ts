import { Router } from "express";
import healthRouter from "./health.js";
import waitlistRouter from "./waitlist.js";

const router = Router();

router.use(healthRouter);
router.use(waitlistRouter);

export default router;
