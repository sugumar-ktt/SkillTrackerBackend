import logger from "$src/lib/logger";
import { responses } from "$src/lib/utils/controller";
import { models, type ModelInstances } from "$src/models";
import { type NextFunction, type Request, type Response } from "express";

export const getCandidateBySession = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const session = res.locals.session as ModelInstances["Session"];
		const Candidate = await models.Candidate.findOne({
			attributes: ["id", "firstName", "lastName", "email"],
			where: {
				id: session.CandidateId
			}
		});
		responses.send(res, responses.success(Candidate));
	} catch (error) {
		logger.error("Error while fetching candidate by session", error);
		next(error);
	}
};
