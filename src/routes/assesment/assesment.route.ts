import { Router } from "express";
import { bearerAuth } from "$src/middleware/auth";
import * as controller from "./assesment.controller";

const assesmentRouter = Router();

assesmentRouter.get("/:id/by-session", bearerAuth, controller.getAssesmentBySession);
assesmentRouter.get("/", bearerAuth, controller.getAssesments);

assesmentRouter.post("/:id/start", bearerAuth, controller.startAssesment);

export default assesmentRouter;
