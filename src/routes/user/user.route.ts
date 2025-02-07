import { Router } from "express";
import * as controller from "./user.controller";

const userRouter = Router();

userRouter.post("/register", controller.register);
userRouter.post("/login", controller.loginUser);
userRouter.post("/logout", controller.logoutUser);

userRouter.get("/session", controller.checkSessionValidity);

export default userRouter;
