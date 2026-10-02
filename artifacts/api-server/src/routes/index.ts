import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import normsRouter from "./norms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(normsRouter);

export default router;
