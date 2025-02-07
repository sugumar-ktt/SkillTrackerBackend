import { type Request, type Response } from "express";
import type { AppError } from "../errors";

export type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 422 | 500;

interface IApiResponse<T = any> {
	success: boolean;
	status: StatusCode;
	data?: T;
	error?: string;
	message?: string;
	metadata?: Record<string, any>;
}

class ApiResponse<T = any> implements IApiResponse<T> {
	success: boolean;
	status: StatusCode;
	data?: T;
	error?: string;
	message?: string;
	metadata?: Record<string, any>;

	constructor(params: IApiResponse<T>) {
		this.success = params.success;
		this.status = params.status;
		this.data = params.data;
		this.error = params.error;
		this.message = params.message;
		this.metadata = params.metadata;
	}
}

export const responses = {
	success: <T>(data?: T, message?: string, metadata?: Record<string, any>) => {
		return new ApiResponse({
			success: true,
			status: 200,
			data,
			message,
			metadata
		});
	},

	created: <T>(data?: T, message?: string, metadata?: Record<string, any>) => {
		return new ApiResponse({
			success: true,
			status: 201,
			data,
			message,
			metadata
		});
	},

	error: (status: StatusCode, error: string, metadata?: Record<string, any>) => {
		return new ApiResponse({
			success: false,
			status,
			error,
			metadata
		});
	},

	validationError: (error: string, metadata?: Record<string, any>) => {
		return responses.error(422, error, metadata);
	},

	badRequest: (error: string, metadata?: Record<string, any>) => {
		return responses.error(400, error, metadata);
	},

	notFound: (error: string, metadata?: Record<string, any>) => {
		return responses.error(404, error, metadata);
	},

	unauthorized: (error: string, metadata?: Record<string, any>) => {
		return responses.error(401, error, metadata);
	},

	forbidden: (error: string, metadata?: Record<string, any>) => {
		return responses.error(403, error, metadata);
	},

	serverError: (error: string = "Internal server error", metadata?: Record<string, any>) => {
		return responses.error(500, error, metadata);
	},
	send: (res: Response, response: ApiResponse) => {
		return res.status(response.status).json(response);
	}
};

export const validators = {
	required: (field: string, value: any, options: { message?: string } = {}) => {
		if (value === undefined || value === null || value === "") {
			return options.message ? options.message : `${field} is required`;
		}
		return null;
	}
};
