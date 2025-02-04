import { Router } from "express";
import * as controller from "./user.controller";

const userRouter = Router();

userRouter.post("/register", controller.registerUser);

userRouter.get("/session", controller.checkSessionValidity);

export default userRouter;
