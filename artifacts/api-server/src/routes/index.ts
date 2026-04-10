import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zonesRouter from "./zones";
import spotsRouter from "./spots";
import reportsRouter from "./reports";
import predictionsRouter from "./predictions";
import usersRouter from "./users";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zonesRouter);
router.use(spotsRouter);
router.use(reportsRouter);
router.use(predictionsRouter);
router.use(usersRouter);
router.use(analyticsRouter);

export default router;
