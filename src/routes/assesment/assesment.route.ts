import { Router } from "express";
import { bearerAuth } from "$src/middleware/auth";
import * as controller from "./assesment.controller";

const assessmentRouter = Router();

assessmentRouter.get("/attempts/:attemptId/question/:questionId/attempt-detail", bearerAuth, controller.getAttemptDetailForQuestion);
assessmentRouter.get("/attempts/:attemptId/result", bearerAuth, controller.getAttemptResult);
assessmentRouter.get("/active", bearerAuth, controller.getActiveAssessment);
assessmentRouter.get("/:id/attempts/active", bearerAuth, controller.getActiveAttemptForAssessment);
assessmentRouter.get("/", bearerAuth, controller.getAssessments);

assessmentRouter.patch("/attempts/:attemptId/proctoring", controller.updateProctoringInformation);
assessmentRouter.patch("/:id/attempt-details/:attemptDetailId", controller.updateAttemptDetail);

assessmentRouter.post("/:id/complete", bearerAuth, controller.completeAssesment);
assessmentRouter.post("/:id/start", bearerAuth, controller.startAssessment);

export default assessmentRouter;
