import { AppError } from "$src/lib/errors";
import { validateSessionToken } from "$src/lib/session";
import { responses, type StatusCode } from "$src/lib/utils/controller";
import type { NextFunction, Request, Response } from "express";

export async function bearerAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers.authorization;
		if (!(authHeader && authHeader.startsWith("Bearer "))) {
			throw AppError.unauthorized("No auth token provided", { operation: "bearerAuth" });
		}
		const token = authHeader.split(" ").at(1);
		if (!token) {
			throw AppError.unauthorized("Auth header is empty", { operation: "bearerAuth" });
		}
		const { error, result } = await validateSessionToken(token);
		if (error) {
			throw AppError.unauthorized("Invalid or expired session token", { operation: "bearerAuth", meta: { error, result } });
		}
		res.locals.session = result;
		next();
	} catch (error) {
		if (error instanceof AppError) {
			responses.send(res, responses.error(error.context.code as StatusCode, error.message));
		} else {
			responses.send(res, responses.unauthorized("Authentication failure"));
		}
	}
}
