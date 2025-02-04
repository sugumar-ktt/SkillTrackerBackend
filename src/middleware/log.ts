import logger from "$lib/logger";
import type { NextFunction, Request, Response } from "express";

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const startTime = process.hrtime();
	res.on("finish", () => {
		// Calculate the duration in milliseconds
		const diff = process.hrtime(startTime);
		const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

		logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration} ms`);
	});
	next();
};
export default loggingMiddleware;
