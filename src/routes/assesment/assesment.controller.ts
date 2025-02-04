import logger from "$src/lib/logger";
import { responses, type StatusCode } from "$src/lib/utils/controller";
import { models } from "$src/models";
import type Session from "$src/models/session";
import { AssesmentService } from "$src/services/assesment";
import dayjs from "dayjs";
import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

export const getAssesments = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const Assesments = await models.Assesment.findAll({
			attributes: ["id", "name", "startDate", "endDate", "questions"],
			where: {
				startDate: {
					[Op.gte]: dayjs().toISOString()
				}
			}
		});
		responses.send(res, responses.success(Assesments));
	} catch (error) {
		logger.error("Error while fetching assesments", error);
		next(error);
	}
};

export const startAssesment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const assesmentId = parseInt(req.params.id);
		const session = res.locals.session as Session;

		if (!assesmentId) {
			responses.send(res, responses.validationError("Assesment ID is required in the URL path"));
			return;
		}

		const { error, result } = await AssesmentService.startAssestment(assesmentId, session.id as number);
		if (error) {
			responses.send(res, responses.error(error.context.code as StatusCode, error.message));
			return;
		}
		responses.send(res, responses.success(result.AssesmentAttempt, "Assesment started successfully"));
	} catch (error) {
		logger.error("Error while fetching starting assesment", error);
		next(error);
	}
};

export const getAssesmentAttemptById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const assesmentAttemptIdParam = req.params.assesmentAttemptId as string | undefined;
		if (!assesmentAttemptIdParam) {
			responses.send(res, responses.badRequest("Assesment identifier is required in the URL path"));
			return;
		}

		const assesmentAttemptId = parseInt(assesmentAttemptIdParam);
		const AssesmentAttempt = await models.AssesmentAttempt.findByPk(assesmentAttemptId, {
			attributes: ["id", "startTime", "endTime", "status"]
		});
		responses.send(res, responses.success(AssesmentAttempt));
	} catch (error) {
		logger.error("Error while fetching assesment attempt", error);
		next(error);
	}
};
