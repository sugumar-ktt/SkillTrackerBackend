import { Router } from "express";
import * as controller from "./candidate.controller";
import { bearerAuth } from "$src/middleware/auth";

const candidateRouter = Router();

candidateRouter.get("/by-session", bearerAuth, controller.getCandidateBySession);

export default candidateRouter;
