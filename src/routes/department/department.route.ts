import { Router } from "express";
import * as controller from "./department.controller";
import { bearerAuth } from "$src/middleware/auth";

const departmentRouter = Router();

departmentRouter.get("/", controller.getDepartments);

export default departmentRouter;
