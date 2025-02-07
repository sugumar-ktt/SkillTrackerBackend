import { type Request, type Response } from "express";

export interface ErrorUser {
	id: number;
	name: string;
}

export interface ErrorContext {
	code?: number;
	message?: string;
	timestamp?: Date;
	operation?: string;
	service?: string;
	user?: ErrorUser;
	trace?: string;
	path?: string;
	method?: string;
	meta?: Record<string, any>;
	stack?: string;
	cause?: Error;
}
export class AppError extends Error {
	public code: number;
	public context: ErrorContext;

	constructor(code: number, message: string, context?: Partial<ErrorContext>) {
		super(message);
		Object.setPrototypeOf(this, AppError.prototype);

		this.code = code;
		this.context = {
			code,
			message,
			timestamp: new Date(),
			...context
		};

		// Capture stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}

	public addContext(additionalContext: Partial<ErrorContext>): this {
		this.context = {
			...this.context,
			...additionalContext
		};
		return this;
	}

	public addRequestContext(req: Request, res: Response): this {
		this.context = {
			...this.context,
			path: req.path,
			method: req.method,
			meta: {
				body: req.body,
				params: req.params,
				query: req.query,
				locals: res.locals
			}
		};
		return this;
	}

	public toJSON(): ErrorContext {
		return {
			...this.context,
			stack: this.stack
		};
	}

	static validation(message: string, context?: Partial<ErrorContext>): AppError {
		return new AppError(422, message, context);
	}

	static badRequest(message: string, context?: Partial<ErrorContext>): AppError {
		return new AppError(400, message, context);
	}

	static unauthorized(message: string, context?: Partial<ErrorContext>): AppError {
		return new AppError(401, message, context);
	}

	static forbidden(message: string, context?: Partial<ErrorContext>): AppError {
		return new AppError(403, message, context);
	}

	static notFound(message: string, context?: Partial<ErrorContext>): AppError {
		return new AppError(404, message, context);
	}

	static internal(message: string, context?: Partial<ErrorContext>): AppError {
		return new AppError(500, message, context);
	}
}

/**
 * Adds additional meta information to an error without losing its Error instance type.
 *
 * @param error - The original error.
 * @param meta - An object containing additional meta information.
 * @returns The same error object with an added `meta` property.
 */
export function withMeta<T extends Error>(error: T, meta: Record<string, unknown>): T {
	// Assign the meta data to the error.
	Object.assign(error, { meta });
	return error;
}
