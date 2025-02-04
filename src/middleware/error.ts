import { AppError } from "$src/lib/errors";
import type { Request, Response, NextFunction } from "express";
import logger from "$src/lib/logger";
import { responses, type StatusCode } from "$src/lib/utils/controller";

const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
	if (err instanceof AppError) {
		err.addRequestContext(req, res);
		logger.error(err.message, err.toJSON());
		responses.send(res, responses.error(err.context.code as StatusCode, err.message));
	}

	const unhandledError = new AppError(500, "Unhandled error");
	unhandledError.addRequestContext(req, res);
	logger.error(unhandledError.message, unhandledError.toJSON());
	return responses.send(res, responses.serverError());
};

export { errorHandler };
