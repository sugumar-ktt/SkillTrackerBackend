import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import compression from "compression";
import { securityHeaders } from "./middleware/security";
import { errorHandler } from "./middleware/error";
import loggingMiddleware from "./middleware/log";
import appConfig from "$config/app";
import userRouter from "./routes/user/user.route";
import departmentRouter from "./routes/department/department.route";
import cookieParser from "cookie-parser";
import assesmentRouter from "./routes/assesment/assesment.route";
import candidateRouter from "./routes/candidate/candidate.routes";

const app = express();

app.use(
	cors({
		origin: appConfig.corsOrigins,
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true
	})
);

app.use(securityHeaders);

app.use(loggingMiddleware);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(compression());

app.use("/api/users", userRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/assesments", assesmentRouter);
app.use("/api/candidates", candidateRouter);

const typedHandler = errorHandler as unknown as ErrorRequestHandler;
app.use(typedHandler);

export default app;
