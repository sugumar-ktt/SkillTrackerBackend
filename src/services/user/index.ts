import { AppError, type ErrorContext } from "$src/lib/errors";
import logger from "$src/lib/logger";
import argon2 from "argon2";

export class UserService {
	static async hashPassword(plainTextPassword: string) {
		try {
			const hash = await argon2.hash(plainTextPassword);
			return { result: hash };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "UserService",
				operation: "hashPassword"
			};
			const normalizedError =
				error instanceof AppError ? error.addContext(errorContext) : AppError.internal("Error in securing password", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static async verifyPassword(hash: string, plainTextPassword: string) {
		try {
			const isValid = await argon2.verify(hash, plainTextPassword);
			return { result: isValid };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "UserService",
				operation: "verifyPassword"
			};
			const normalizedError =
				error instanceof AppError ? error.addContext(errorContext) : AppError.internal("Error verifying password", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}
}
