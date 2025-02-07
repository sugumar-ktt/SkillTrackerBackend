import appConfig from "$config/app";
import { models, type ModelInstances } from "$src/models";
import { type ResultType } from "$src/types";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";
import logger from "./logger";
import type { Response } from "express";

const JWT_SECRET = appConfig.jwt.secret;

export function generateSessionToken(payload: Record<string, any>) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: appConfig.jwt.expiresIn });
}

export async function createSession(token: string, userId: number): Promise<ResultType<ModelInstances["Session"]>> {
	try {
		const decoded = jwt.decode(token) as { exp?: number } | null;
		let expiresAt: Date;
		if (decoded && decoded.exp) {
			expiresAt = new Date(decoded.exp * 1000);
		} else {
			expiresAt = new Date(Date.now() + appConfig.jwt.expiresIn * 1000);
		}
		const loggedInAt = new Date();

		const Session = await models.Session.create({
			token: token,
			CandidateId: userId,
			expiresAt: expiresAt.toISOString(),
			loggedInAt: loggedInAt.toISOString()
		});
		return { result: Session };
	} catch (error) {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		logger.error("Error creating session", error);
		return { error: new Error("Error creating session", { cause: normalizedError }) };
	}
}

export async function validateSessionToken(token: string) {
	try {
		jwt.verify(token, JWT_SECRET);
		const Session = await models.Session.findOne({ attributes: ["id", "expiresAt", "token", "CandidateId"], where: { token } });
		if (!Session) {
			return { error: new Error("Session not found") };
		}
		if (dayjs(Session.expiresAt).isBefore(dayjs())) {
			return { error: new Error("Session expired") };
		}
		return { result: Session.toJSON() };
	} catch (error) {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		logger.error("Error validating session", error);
		return { error: new Error("Error validating session", { cause: normalizedError }) };
	}
}

export async function invalidateSession(sessionId: string): Promise<ResultType<boolean>> {
	try {
		const id = parseInt(sessionId, 10);
		const Session = await models.Session.findOne({ attributes: ["id"], where: { id: id } });
		if (!Session) {
			return { error: new Error("Session not found") };
		}
		await Session.destroy();
		return { result: true };
	} catch (error) {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		logger.error("Error invalidating session", error);
		return { error: new Error("Error invalidating session", { cause: normalizedError }) };
	}
}

export function setSessionTokenCookie(response: Response, token: string, expiredAtUTC: Date) {
	response.cookie("Session", token, {
		httpOnly: true,
		sameSite: "lax",
		expires: expiredAtUTC,
		secure: appConfig.environment == "development" ? false : true
	});
}

export function deleteSessionTokenCookie(response: Response) {
	response.clearCookie("Session", {
		httpOnly: true,
		sameSite: "lax",
		maxAge: 0,
		secure: appConfig.environment == "development" ? false : true
	});
}
