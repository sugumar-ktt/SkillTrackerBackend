import logger from "$src/lib/logger";
import { responses, type StatusCode } from "$src/lib/utils/controller";
import { models, type ModelInstances } from "$src/models";
import type { Choice } from "$src/models/question";
import type Session from "$src/models/session";
import { AssessmentService } from "$src/services/assesment";
import dayjs from "dayjs";
import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

export const getAssessments = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const session = res.locals.session as Session;
		const Assessments = await models.Assessment.findAll({
			attributes: ["id", "name", "startDate", "endDate", "questions", "maxAttempts"],
			include: [
				{
					model: models.AssessmentAttempt,
					attributes: ["id"],
					where: {
						status: "Completed",
						CandidateId: session.CandidateId
					},
					required: false
				}
			],
			where: {
				startDate: {
					[Op.lte]: dayjs().toISOString()
				},
				endDate: {
					[Op.gte]: dayjs().toISOString()
				}
			}
		});
		const results: ModelInstances["Assessment"][] = [];
		for (const Assessment of Assessments) {
			const { AssessmentAttempts } = Assessment as unknown as { AssessmentAttempts: ModelInstances["AssessmentAttempt"][] };
			if (AssessmentAttempts.length >= (Assessment.maxAttempts || 0)) {
				continue;
			}
			results.push(Assessment);
		}
		responses.send(res, responses.success(results));
	} catch (error) {
		logger.error("Error while fetching assesments", error);
		next(error);
	}
};

export const startAssessment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const assesmentId = parseInt(req.params.id);
		const session = res.locals.session as Session;

		if (!assesmentId) {
			responses.send(res, responses.validationError("Assessment ID is required in the URL path"));
			return;
		}

		const { error, result } = await AssessmentService.startAssesstment(assesmentId, session.id as number);
		if (error) {
			responses.send(res, responses.error(error.context.code as StatusCode, error.message));
			return;
		}
		responses.send(res, responses.success(result.AssessmentAttempt, "Assessment started successfully"));
	} catch (error) {
		logger.error("Error while fetching starting assesment", error);
		next(error);
	}
};

type UpdateAttemptDetailPayload = {
	answerId?: string;
};
export const updateAttemptDetail = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const pathFields = [
			{
				field: "id",
				name: "Assessment ID"
			},
			{
				field: "attemptDetailId",
				name: "Attempt Detail ID"
			}
		];
		for (const item of pathFields) {
			if (!(item.field in req.params)) {
				responses.send(res, responses.badRequest(`Identifier ${item.name} is missing in the URL path`));
				return;
			}
		}
		const { attemptDetailId: attemptDetailIdParam } = req.params;
		const attemptDetailId = parseInt(attemptDetailIdParam);

		const { answerId } = req.body as UpdateAttemptDetailPayload;

		if (answerId === undefined) {
			responses.send(res, responses.validationError(`Field "answer" is required`));
			return;
		}

		const AttemptDetail = await models.AssessmentAttemptDetail.findByPk(attemptDetailId, {
			attributes: ["id", "isAttempted", "isCorrect", "changeCount", "submission", "score", "QuestionId"],
			include: [
				{
					model: models.Question,
					attributes: ["id", "choices", "answer", "score", "type"]
				},
				{
					model: models.AssessmentAttempt,
					attributes: ["id"],
					include: [
						{
							model: models.Assessment,
							attributes: ["id", "name", "startDate", "endDate"]
						}
					]
				}
			]
		});

		if (!AttemptDetail) {
			responses.send(res, responses.notFound("Attempt information not found"));
			return;
		}

		const Assessment = AttemptDetail.AssessmentAttempt?.Assessment as ModelInstances["Assessment"];
		// const { error: timeValidationError, result: isTimeValid } = await AssessmentService.validateAssesmentTime(Assessment);
		// if (timeValidationError) {
		// 	responses.send(res, responses.error(timeValidationError.context.code as StatusCode, timeValidationError.message));
		// 	return;
		// }

		const Question = AttemptDetail.Question;
		const choices = Question?.choices;
		let attemptDetailUpdateFields = {
			changeCount: (AttemptDetail.changeCount || 0) + 1,
			isCorrect: AttemptDetail.isCorrect,
			isAttempted: AttemptDetail.isAttempted,
			submission: AttemptDetail.submission,
			score: AttemptDetail.score
		};

		if (answerId) {
			let isValidAnswer = false;
			let submission: Choice | undefined;
			for (const choice of choices || []) {
				if (choice.id == answerId) {
					isValidAnswer = true;
					submission = choice;
					break;
				}
			}
			if (!isValidAnswer) {
				responses.send(res, responses.badRequest("Invalid option provided"));
				return;
			}
			const isCorrect = answerId == Question?.answer?.id;
			const score = isCorrect ? Question.score || 0 : 0;
			attemptDetailUpdateFields = {
				...attemptDetailUpdateFields,
				isAttempted: true,
				isCorrect,
				submission,
				score
			};
		} else {
			attemptDetailUpdateFields.isAttempted = false;
			attemptDetailUpdateFields.submission = {};
			attemptDetailUpdateFields.score = 0;
		}

		await AttemptDetail.update(attemptDetailUpdateFields);

		responses.send(res, responses.success({ id: AttemptDetail.id, isAttempted: AttemptDetail.isAttempted }));
	} catch (error) {
		logger.error("Error while attempting attempt detail", error);
		next(error);
	}
};

type CompleteAssessmentPayload = {
	completionTime: string;
	attemptId: number;
};
export const completeAssesment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const assesmentId = parseInt(req.params.id);
		const session = res.locals.session as Session;

		const { attemptId, completionTime } = req.body as Partial<CompleteAssessmentPayload>;

		if (attemptId == undefined) {
			responses.send(res, responses.badRequest("Attempt identifier is missing"));
			return;
		}

		if (completionTime == undefined) {
			responses.send(res, responses.badRequest("Time of completion is required"));
			return;
		}

		const [Candidate, Assessment] = await Promise.all([
			models.Candidate.findByPk(session.CandidateId, {
				attributes: ["id", "firstName", "lastName", "email", "rollNumber"]
			}),
			models.Assessment.findByPk(assesmentId, {
				attributes: ["id", "name", "startDate", "endDate", "questions"]
			})
		]);

		if (!Assessment) {
			responses.send(res, responses.notFound("Assessment not found"));
			return;
		}

		if (!Candidate) {
			responses.send(res, responses.notFound("Candidate not found"));
			return;
		}

		// const { error: timeValidationError, result: isTimeValid } = await AssessmentService.validateAssesmentTime(Assessment);
		// if (timeValidationError) {
		// 	responses.send(res, responses.error(timeValidationError.context.code as StatusCode, timeValidationError.message));
		// 	return;
		// }

		const { error: getActiveAttemptErr, result: ActiveAttempt } = await AssessmentService.getActiveAttemptForAssessment(
			Assessment,
			Candidate
		);

		if (getActiveAttemptErr) {
			responses.send(res, responses.error(getActiveAttemptErr.context.code as StatusCode, getActiveAttemptErr.message));
			return;
		}

		if (ActiveAttempt.id != attemptId) {
			responses.send(res, responses.validationError("Invalid attempt completion"));
			return;
		}

		const { error: createSubmissionErr } = await AssessmentService.createSubmission({
			AssessmentAttempt: ActiveAttempt,
			Candidate: Candidate,
			Session: session,
			completionTime: completionTime
		});

		if (createSubmissionErr) {
			responses.send(res, responses.error(createSubmissionErr.context.code as StatusCode, createSubmissionErr.message));
			return;
		}

		responses.send(res, responses.success(true, "Assessment completed successfully"));
	} catch (error) {
		logger.error("Error while completing assesment", error);
		next(error);
	}
};

export const getActiveAttemptForAssessment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const assesmentIdParam = req.params.id as string | undefined;

		if (!assesmentIdParam) {
			responses.send(res, responses.badRequest("Assessment identifier is required in the URL path"));
			return;
		}

		const assesmentId = parseInt(assesmentIdParam);
		const session = res.locals.session as ModelInstances["Session"];

		const [Candidate, Assessment] = await Promise.all([
			models.Candidate.findByPk(session.CandidateId, {
				attributes: ["id", "firstName", "lastName", "email", "rollNumber"]
			}),
			models.Assessment.findByPk(assesmentId, {
				attributes: ["id", "name", "startDate", "endDate", "questions"]
			})
		]);

		if (!Candidate) {
			responses.send(res, responses.notFound("Candidate not found"));
			return;
		}

		if (!Assessment) {
			responses.send(res, responses.notFound("Assessment not found"));
			return;
		}

		const { error, result } = await AssessmentService.getActiveAttemptForAssessment(Assessment, Candidate);
		if (error) {
			responses.send(res, responses.error(error.context.code as StatusCode, error.message));
			return;
		}

		const AssessmentAttemptDetails = await models.AssessmentAttemptDetail.findAll({
			attributes: ["id", "isAttempted", "submission", "QuestionId"],
			where: {
				AssessmentAttemptId: result.id
			},
			order: [["id", "ASC"]]
		});
		const payload = { ...result.dataValues } as Record<string, any>;
		payload.Assessment = Assessment;
		payload.AssessmentAttemptDetails = AssessmentAttemptDetails;

		responses.send(res, responses.success(payload));
	} catch (error) {
		logger.error("Error while fetching assesment attempt", error);
		next(error);
	}
};

export const getAttemptResult = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const attemptIdParam = req.params.attemptId as string | undefined;

		if (!attemptIdParam) {
			responses.send(res, responses.badRequest("Assessment identifier is required in the URL path"));
			return;
		}

		const attemptId = parseInt(attemptIdParam);

		const Submission = await models.Submission.findOne({
			attributes: ["id", "attemptedQuestions", "duration", "submittedAt"],
			where: {
				AssessmentAttemptId: attemptId
			}
		});

		if (!Submission) {
			responses.send(res, responses.notFound("Assessment result not found"));
			return;
		}

		responses.send(res, responses.success(Submission));
	} catch (error) {
		logger.error("Error while fetching attempt result", error);
		next(error);
	}
};

export const getActiveAssessment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const session = res.locals.session as ModelInstances["Session"];

		const Candidate = await models.Candidate.findByPk(session.CandidateId);

		if (!Candidate) {
			responses.send(res, responses.notFound("Candidate not found"));
			return;
		}

		const { error, result } = await AssessmentService.getActiveAssessmentForCandidate(Candidate);
		if (error) {
			responses.send(res, responses.error(error.context.code as StatusCode, error.message));
			return;
		}
		responses.send(res, responses.success(result));
	} catch (error) {
		logger.error("Error while fetching active assesment", error);
		next(error);
	}
};

export const getAttemptDetailForQuestion = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const pathFields = [
			{
				field: "attemptId",
				name: "Attempt ID"
			},
			{
				field: "questionId",
				name: "Question ID"
			}
		];
		for (const item of pathFields) {
			if (!(item.field in req.params)) {
				responses.send(res, responses.badRequest(`Identifier ${item.name} is missing in the URL path`));
				return;
			}
		}
		const { attemptId: attemptIdParam, questionId: questionIdParam } = req.params;
		const attemptId = parseInt(attemptIdParam);
		const questionId = parseInt(questionIdParam);

		const AssessmentAttemptDetail = await models.AssessmentAttemptDetail.findOne({
			attributes: ["id", "isAttempted", "submission", "QuestionId"],
			include: [
				{
					model: models.Question,
					attributes: ["id", "description", "hint", "choices", "type", "snippet"]
				}
			],
			where: {
				AssessmentAttemptId: attemptId,
				QuestionId: questionId
			}
		});

		responses.send(res, responses.success(AssessmentAttemptDetail));
	} catch (error) {
		logger.error("Error while fetching attempt detail for question", error);
		next(error);
	}
};
