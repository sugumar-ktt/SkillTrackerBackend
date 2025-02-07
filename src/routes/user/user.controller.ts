import { AppError } from "$src/lib/errors";
import logger from "$src/lib/logger";
import * as sessions from "$src/lib/session";
import { getBearerToken } from "$src/lib/utils/auth";
import { responses, validators, type StatusCode } from "$src/lib/utils/controller";
import { models } from "$src/models";
import { UserService } from "$src/services/user";
import dayjs from "dayjs";
import utcPlugin from "dayjs/plugin/utc";
import { type NextFunction, type Request, type Response } from "express";
import { Op } from "sequelize";
import { isEmail } from "validator";

dayjs.extend(utcPlugin);

type RegiserBodyPayload = {
	firstName: string;
	lastName: string;
	rollNumber: string;
	departmentId: number;
	email: string;
	password: string;
};
export const register = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { firstName, lastName, rollNumber, departmentId, email, password } = req.body as RegiserBodyPayload;

		const fields = [
			{ name: "First name", value: firstName },
			{ name: "Last name", value: lastName },
			{ name: "Roll number", value: rollNumber },
			{ name: "Department", value: departmentId },
			{ name: "Email", value: email },
			{ name: "Password", value: email }
		];

		for (const field of fields) {
			const validationError = validators.required(field.name, field.value);
			if (validationError) {
				responses.send(res, responses.validationError(validationError));
				return;
			}
		}

		if (!isEmail(email)) {
			responses.send(res, responses.validationError("Invalid email address"));
			return;
		}

		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
		if (!passwordRegex.test(password)) {
			responses.send(
				res,
				responses.validationError(
					"Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
				)
			);
			return;
		}

		const College = await models.College.findOne({
			attributes: ["id"],
			where: {
				name: "Bannari Amman Institute of Technology"
			}
		});

		if (!College) {
			responses.send(res, responses.notFound("College not found"));
			return;
		}

		const Department = await models.Department.findOne({
			attributes: ["id"],
			where: {
				id: departmentId
			}
		});

		if (!Department) {
			responses.send(res, responses.notFound("Department not found"));
			return;
		}

		const { error: hashPasswordError, result: hashedPassword } = await UserService.hashPassword(password);
		if (hashPasswordError) {
			responses.send(res, responses.error(hashPasswordError.context.code as StatusCode, hashPasswordError.message));
			return;
		}

		const candidateRecord = {
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			rollNumber: rollNumber.trim(),
			email: email.trim(),
			CollegeId: College.id,
			DepartmentId: Department.id,
			password: hashedPassword
		};

		const ExistingCandidate = await models.Candidate.findOne({
			attributes: ["id", "firstName", "lastName", "email", "rollNumber"],
			where: {
				[Op.or]: [{ email: candidateRecord.email }, { rollNumber: rollNumber }]
			}
		});

		if (ExistingCandidate && ExistingCandidate.rollNumber == candidateRecord.rollNumber) {
			responses.send(res, responses.validationError("This roll number is already registered"));
			return;
		}

		if (ExistingCandidate && ExistingCandidate.email == candidateRecord.email) {
			responses.send(res, responses.validationError("Email is already registered"));
			return;
		}

		const Candidate = await models.Candidate.create(candidateRecord);
		const sessionToken = sessions.generateSessionToken({
			id: Candidate.id,
			firstName: Candidate.firstName,
			lastName: Candidate.lastName,
			rollNumber: Candidate.rollNumber,
			email: Candidate.email
		});

		const { error: createSessionErr, result: createSessionRes } = await sessions.createSession(sessionToken, Candidate.id as number);
		if (createSessionErr) {
			throw AppError.internal("Error in creating session");
		}

		sessions.setSessionTokenCookie(res, sessionToken, dayjs.utc(createSessionRes.expiresAt).toDate());
		responses.send(res, responses.created({ candidate: Candidate, sessionToken }));
	} catch (error) {
		logger.error(error, "Error while registering user");
		next(error);
	}
};

type LoginBodyPayload = {
	userName: string;
	password: string;
};
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { userName, password } = req.body as LoginBodyPayload;
		const fields = [
			{ name: "Username (Roll number)", value: userName },
			{ name: "Password", value: password }
		];
		for (const field of fields) {
			const validationError = validators.required(field.name, field.value);
			if (validationError) {
				responses.send(res, responses.validationError(validationError));
				return;
			}
		}

		const Candidate = await models.Candidate.findOne({
			where: { rollNumber: userName.trim() }
		});

		if (!Candidate) {
			responses.send(res, responses.validationError("Roll number not registered"));
			return;
		}

		const { error: verifyError, result: isValid } = await UserService.verifyPassword(Candidate.password as string, password);
		if (verifyError || !isValid) {
			responses.send(res, responses.validationError("Incorrect password"));
			return;
		}

		const sessionToken = sessions.generateSessionToken({
			id: Candidate.id,
			firstName: Candidate.firstName,
			lastName: Candidate.lastName,
			rollNumber: Candidate.rollNumber,
			email: Candidate.email
		});

		const { error: createSessionErr, result: createSessionRes } = await sessions.createSession(sessionToken, Candidate.id as number);
		if (createSessionErr) {
			throw AppError.internal("Error in creating session");
		}

		sessions.setSessionTokenCookie(res, sessionToken, dayjs.utc(createSessionRes.expiresAt).toDate());
		responses.send(res, responses.created({ candidate: Candidate, sessionToken }));
	} catch (error) {
		logger.error(error, "Error while logging in user");
		next(error);
	}
};

export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const token = getBearerToken(req);
		if (!token) {
			responses.send(res, responses.error(401, "Session token not found"));
			return;
		}

		const { result: session, error: sessionError } = await sessions.validateSessionToken(token);
		if (sessionError) {
			sessions.deleteSessionTokenCookie(res);
			responses.send(res, responses.error(401, "Invalid session token"));
			return;
		}

		const { error: invalidateError } = await sessions.invalidateSession(String(session.id));
		if (invalidateError) {
			responses.send(res, responses.error(500, "Error invalidating session"));
			return;
		}
		sessions.deleteSessionTokenCookie(res);
		responses.send(res, responses.success({ message: "Logged out successfully" }));
	} catch (error) {
		logger.error(error, "Error while logging out user");
		next(error);
	}
};

export const checkSessionValidity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const sessionToken: string | undefined = getBearerToken(req);
		if (!sessionToken) {
			responses.send(res, responses.unauthorized("Session token is missing"));
			return;
		}
		const { error, result } = await sessions.validateSessionToken(sessionToken);
		if (error || !result) {
			responses.send(res, responses.unauthorized("Invalid or expired session"));
			return;
		}
		responses.send(res, responses.success(true));
	} catch (error) {
		logger.error("Error validating session", error);
		next(error);
	}
};
