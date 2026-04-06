import { Router, type IRouter } from "express";
import healthRouter from "./health";
import friendItineraryRouter from "./friend-itinerary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(friendItineraryRouter);

export default router;
