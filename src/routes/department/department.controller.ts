import logger from "$src/lib/logger";
import { responses } from "$src/lib/utils/controller";
import { models } from "$src/models";
import { type NextFunction, type Request, type Response } from "express";

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const Departments = await models.Department.findAll({
			attributes: ["id", "name"]
		});
		responses.send(res, responses.success(Departments));
	} catch (error) {
		logger.error("Error while registering user", error);
		next(error);
	}
};
