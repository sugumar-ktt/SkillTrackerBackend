import { AppError } from "$src/lib/errors";
import logger from "$src/lib/logger";
import * as sessions from "$src/lib/session";
import { getBearerToken } from "$src/lib/utils/auth";
import { responses, validators } from "$src/lib/utils/controller";
import { models } from "$src/models";
import dayjs, { utc } from "dayjs";
import utcPlugin from "dayjs/plugin/utc";
import { type NextFunction, type Request, type Response } from "express";
import { Op } from "sequelize";
import { isEmail } from "validator";

dayjs.extend(utcPlugin);

type RegiserUserBodyPayload = {
	firstName: string;
	lastName: string;
	rollNumber: string;
	departmentId: number;
	email: string;
};
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { firstName, lastName, rollNumber, departmentId, email } = req.body as RegiserUserBodyPayload;

		const fields = [
			{ name: "First name", value: firstName },
			{ name: "Last name", value: lastName },
			{ name: "Roll number", value: rollNumber },
			{ name: "Department", value: departmentId },
			{ name: "Email", value: email }
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

		const candidateRecord = {
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			rollNumber: rollNumber.trim(),
			email: email.trim(),
			CollegeId: College.id,
			DepartmentId: Department.id
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
		logger.error("Error while registering user", error);
		next(error);
	}
};

export const checkSessionValidity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		let sessionToken: string | undefined;
		if (req.cookies.Session) {
			sessionToken = req.cookies.Session;
		} else {
			sessionToken = getBearerToken(req);
		}
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
