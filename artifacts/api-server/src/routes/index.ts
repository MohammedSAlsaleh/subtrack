import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import premiumRouter from "./premium";
import agentRouter from "./agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(premiumRouter);
router.use(agentRouter);

export default router;
