import sequelize from "$config/db";
import { AppError } from "$src/lib/errors";
import logger from "$src/lib/logger";
import { getRandRange } from "$src/lib/utils";
import { models, type ModelInstances } from "$src/models";
import dayjs from "dayjs";
import { Op } from "sequelize";

export class AssesmentService {
	static async startAssestment(assesmentId: number, sessionId: number) {
		try {
			const Assesment = await models.Assesment.findOne({
				attributes: ["id", "name", "startDate", "endDate", "questions"],
				where: {
					id: assesmentId
				}
			});

			if (!Assesment) {
				return { error: AppError.notFound("Assesment not found") };
			}

			const endTime = dayjs(Assesment.endDate);
			const startTime = dayjs(Assesment.startDate);
			const currentTime = dayjs();

			if (!currentTime.isBefore(endTime)) {
				return { error: AppError.validation("Assesment has expired") };
			}

			// if (!currentTime.isAfter(startTime)) {
			// 	return { error: AppError.validation("Assesment has not started yet") };
			// }

			const Session = await models.Session.findByPk(sessionId, {
				attributes: ["id", "CandidateId", "expiresAt"]
			});

			if (!Session) {
				return { error: AppError.validation("Candidate not found") };
			}

			if (dayjs(Session.expiresAt).isBefore(dayjs())) {
				return { error: AppError.validation("Session expired") };
			}

			const ExistingAssesmentAttempt = await models.AssesmentAttempt.findOne({
				attributes: ["id", "startTime", "endTime", "status"],
				where: {
					startTime: { [Op.gte]: startTime.toISOString() },
					endTime: null as unknown as string,
					status: { [Op.in]: ["Draft", "InProgress"] },
					AssesmentId: Assesment.id,
					CandidateId: Session.CandidateId
				}
			});

			if (ExistingAssesmentAttempt) {
				return { error: AppError.badRequest("Existing attempt for the test is in progress. Resume the attempt to proceed") };
			}

			const { AssesmentAttempt, AssesmentAttemptDetails } = await sequelize.transaction(async (t) => {
				const AssesmentAttempt = await models.AssesmentAttempt.create(
					{
						startTime: dayjs().toISOString(),
						AssesmentId: Assesment.id,
						CandidateId: Session.CandidateId,
						SessionId: Session.id as number
					},
					{ transaction: t }
				);
				const Questions = await models.Question.findAll({
					attributes: ["id", "score"]
				});
				const { result: ShuffledQuestions, error } = AssesmentService.shuffleQuestions(Questions, 50);
				if (error) {
					throw AppError.internal("Error while shuffling questions");
				}
				const AssesmentAttemptDetails = await Promise.all(
					ShuffledQuestions.map(async (question) => {
						const AssesmentAttemptDetail = await models.AssesmentAttemptDetail.create(
							{
								AssesmentAttemptId: AssesmentAttempt.id as number,
								QuestionId: question.id as number
							},
							{ transaction: t }
						);
						return AssesmentAttemptDetail;
					})
				);
				return { AssesmentAttempt, AssesmentAttemptDetails };
			});
			return { result: { AssesmentAttempt, AssesmentAttemptDetails } };
		} catch (error) {
			logger.error("Error in starting assesment", error);
			return {
				error: AppError.internal("Error in starting assesment", {
					cause: error instanceof Error ? error : undefined,
					service: "Assesment",
					operation: "startAssesment"
				})
			};
		}
	}

	static shuffleQuestions(questions: ModelInstances["Question"][], count: number) {
		try {
			if (questions.length < count) {
				return { error: AppError.validation("Question set is less than the requested count") };
			}

			// Fisher-Yates shuffle
			for (let i = questions.length - 1; i > 0; i--) {
				const j = getRandRange(0, i);
				[questions[i], questions[j]] = [questions[j], questions[i]];
			}

			return { result: questions.slice(0, count) };
		} catch (error) {
			logger.error("Error in shuffling questions", error);
			return {
				error: AppError.internal("Error in shuffling questions", {
					cause: error instanceof Error ? error : undefined,
					service: "Assesment",
					operation: "shuffleQuestions"
				})
			};
		}
	}
}
