import sequelize from "$config/db";
import { AssessmentIntegrity } from "$src/lib/constants";
import { AppError, type ErrorContext } from "$src/lib/errors";
import logger from "$src/lib/logger";
import { getRandRange } from "$src/lib/utils";
import { models, type ModelInstances } from "$src/models";
import type { QuestionTypeEnum } from "$src/models/question";
import dayjs from "dayjs";
import { Op } from "sequelize";

type CreateSubmissionProps = {
	AssessmentAttempt: ModelInstances["AssessmentAttempt"];
	Candidate: ModelInstances["Candidate"];
	Session: ModelInstances["Session"];
	completionTime: string;
};

export class AssessmentService {
	static async startAssesstment(assesmentId: number, sessionId: number) {
		try {
			const Assessment = await models.Assessment.findOne({
				attributes: ["id", "name", "startDate", "endDate", "questions", "questionDistribution"],
				where: { id: assesmentId }
			});

			if (!Assessment) {
				throw AppError.notFound("Assessment not found");
			}

			const startTime = dayjs(Assessment.startDate);
			const { error, result } = await AssessmentService.validateAssesmentTime(Assessment);
			if (error) {
				throw AppError.validation(error.message);
			}

			const Session = await models.Session.findByPk(sessionId, {
				attributes: ["id", "CandidateId", "expiresAt"]
			});
			if (!Session) {
				throw AppError.validation("Candidate not found");
			}
			if (dayjs(Session.expiresAt).isBefore(dayjs())) {
				throw AppError.validation("Session expired");
			}

			const ExistingAssessmentAttempt = await models.AssessmentAttempt.findOne({
				attributes: ["id", "startTime", "endTime", "status"],
				where: {
					startTime: { [Op.gte]: startTime.toISOString() },
					endTime: null as unknown as string,
					status: { [Op.in]: ["Draft", "InProgress"] },
					AssessmentId: Assessment.id,
					CandidateId: Session.CandidateId
				}
			});
			if (ExistingAssessmentAttempt) {
				throw AppError.badRequest("Existing attempt for the test is in progress. Resume the session to proceed");
			}

			const { AssessmentAttempt, AssessmentAttemptDetails } = await sequelize.transaction(async (t) => {
				const questionsByType: Record<QuestionTypeEnum, ModelInstances["Question"][]> = { coding: [], mcq: [] };
				const questionDistribution = Assessment.questionDistribution;

				const AssessmentAttempt = await models.AssessmentAttempt.create(
					{
						startTime: dayjs().toISOString(),
						AssessmentId: Assessment.id,
						CandidateId: Session.CandidateId,
						SessionId: Session.id as number
					},
					{ transaction: t }
				);

				const Questions = await models.Question.findAll({
					attributes: ["id", "score", "type"]
				});
				for (const Question of Questions) {
					questionsByType[Question.type].push(Question);
				}

				const ShuffledQuestions: ModelInstances["Question"][] = [];
				for (const [type, count] of Object.entries(questionDistribution)) {
					if (!(type === "mcq" || type === "coding")) continue;
					const questions = questionsByType[type];
					const { result, error } = AssessmentService.shuffleQuestions(questions, count);
					if (error) {
						throw AppError.internal("Error while shuffling questions");
					}
					ShuffledQuestions.push(...result);
				}

				ShuffledQuestions.sort((a, b) => {
					if (a.type === "coding" && b.type !== "coding") return 1;
					if (b.type === "coding" && a.type !== "coding") return -1;
					return 0;
				});

				const AssessmentAttemptDetails = await Promise.all(
					ShuffledQuestions.map(async (question, index) => {
						const AssessmentAttemptDetail = await models.AssessmentAttemptDetail.create(
							{
								AssessmentAttemptId: AssessmentAttempt.id as number,
								QuestionId: question.id as number,
								order: index + 1
							},
							{ transaction: t }
						);
						return AssessmentAttemptDetail;
					})
				);
				return { AssessmentAttempt, AssessmentAttemptDetails };
			});
			return { result: { AssessmentAttempt, AssessmentAttemptDetails } };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "startAssessment"
			};
			const normalizedError =
				error instanceof AppError ? error.addContext(errorContext) : AppError.internal("Error starting assessment", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static shuffleQuestions(questions: ModelInstances["Question"][], count: number) {
		try {
			if (questions.length < count) {
				throw AppError.validation("Question set is less than the requested count");
			}
			// Fisher-Yates shuffle
			for (let i = questions.length - 1; i > 0; i--) {
				const j = getRandRange(0, i);
				[questions[i], questions[j]] = [questions[j], questions[i]];
			}
			return { result: questions.slice(0, count) };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "shuffleQuestions"
			};
			const normalizedError =
				error instanceof AppError
					? error.addContext(errorContext)
					: AppError.internal("Error in shuffling questions", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static async getActiveAssessmentForCandidate(candidate: ModelInstances["Candidate"]) {
		try {
			if (!candidate.id) {
				throw AppError.internal("Candidate ID is missing");
			}
			const ActiveAssessmentAttempt = await models.AssessmentAttempt.findOne({
				attributes: ["id"],
				include: [
					{
						model: models.Assessment,
						attributes: ["id", "name", "startDate", "endDate", "questions"]
					}
				],
				where: {
					startTime: { [Op.not]: null as unknown as string },
					endTime: null as unknown as string,
					status: { [Op.in]: ["Draft", "InProgress"] },
					CandidateId: candidate.id
				}
			});
			return { result: ActiveAssessmentAttempt?.Assessment };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "getActiveAssessmentForCandidate"
			};
			const normalizedError =
				error instanceof AppError
					? error.addContext(errorContext)
					: AppError.internal("Error fetching active assessment", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static async getActiveAttemptForAssessment(assesment: ModelInstances["Assessment"], candidate: ModelInstances["Candidate"]) {
		try {
			if (!candidate.id) {
				throw AppError.internal("Candidate ID is missing");
			}
			if (!assesment.id) {
				throw AppError.internal("Assessment ID is missing");
			}
			const ActiveAssessmentAttempt = await models.AssessmentAttempt.findOne({
				attributes: ["id", "startTime", "endTime", "status", "AssessmentId"],
				where: {
					startTime: { [Op.not]: null as unknown as string },
					endTime: null as unknown as string,
					status: { [Op.in]: ["Draft", "InProgress"] },
					AssessmentId: assesment.id,
					CandidateId: candidate.id
				}
			});
			if (!ActiveAssessmentAttempt) {
				throw AppError.notFound("No active attempts found for the assesment");
			}
			return { result: ActiveAssessmentAttempt };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "getActiveAttempt"
			};
			const normalizedError =
				error instanceof AppError
					? error.addContext(errorContext)
					: AppError.internal("Error fetching active assessment attempt", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static async validateAssesmentTime(assesment: ModelInstances["Assessment"], time = dayjs()) {
		try {
			if (!assesment.startDate) {
				throw AppError.internal("Assessment start time is missing");
			}
			if (!assesment.endDate) {
				throw AppError.internal("Assessment end time is missing");
			}

			const assesmentStartTime = dayjs(assesment.startDate);
			const assesmentEndTime = dayjs(assesment.endDate);

			if (time.isBefore(assesmentStartTime)) {
				throw AppError.validation("Assessment has not started yet");
			}
			if (time.isAfter(assesmentEndTime)) {
				throw AppError.validation("Assessment has ended");
			}
			return { result: true };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "validateAssesmentTime"
			};
			const normalizedError =
				error instanceof AppError
					? error.addContext(errorContext)
					: AppError.internal("Error while validating assesment time", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static async createSubmission({ AssessmentAttempt, Candidate, Session, completionTime }: CreateSubmissionProps) {
		try {
			if (!AssessmentAttempt) {
				throw AppError.internal("Attempt information missing");
			}
			if (!Candidate) {
				throw AppError.internal("Candidate information missing");
			}
			if (!Session) {
				throw AppError.internal("Session information missing");
			}
			if (!completionTime) {
				throw AppError.internal("Completion time of the assessment is required");
			}

			const Submission = await sequelize.transaction(async (t) => {
				await AssessmentAttempt.reload({ transaction: t });
				await AssessmentAttempt.update(
					{
						endTime: dayjs(completionTime),
						status: "Completed"
					},
					{ transaction: t }
				);

				const AssessmentAttemptDetails = await models.AssessmentAttemptDetail.findAll({
					attributes: ["id", "isAttempted", "isCorrect", "submission", "score"],
					where: { AssessmentAttemptId: AssessmentAttempt.id },
					transaction: t
				});

				const asssessmentDuration = dayjs(AssessmentAttempt.endTime).diff(AssessmentAttempt.startTime, "milliseconds");

				let totalScore = 0;
				let attemptedQuestions = 0;
				let correctAnswers = 0;
				for (const AttemptDetail of AssessmentAttemptDetails) {
					if (AttemptDetail.isCorrect) {
						totalScore += Number(AttemptDetail.score || 0);
						correctAnswers += 1;
					}
					if (AttemptDetail.isAttempted) {
						attemptedQuestions += 1;
					}
				}

				const Submission = await models.Submission.create({
					duration: asssessmentDuration,
					totalScore: Math.round(totalScore),
					attemptedQuestions: attemptedQuestions,
					correctAnswers: correctAnswers,
					AssessmentAttemptId: AssessmentAttempt.id as number,
					CandidateId: Candidate.id as number,
					SessionId: Session.id as number,
					submittedAt: dayjs().toISOString()
				});
				return Submission;
			});
			return { result: Submission };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "createSubmission"
			};
			const normalizedError =
				error instanceof AppError
					? error.addContext(errorContext)
					: AppError.internal("Error creating assessment submission", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}

	static async updateProctoringInformation(AssessmentAttempt: ModelInstances["AssessmentAttempt"]) {
		try {
			if (!AssessmentAttempt.id) {
				throw AppError.internal("Attempt identifier is missing");
			}

			let integrity = AssessmentAttempt.integrity;
			const proctoring = AssessmentAttempt.proctoring || {};

			const visibilityChanges = proctoring.visibilityChanges || 0;
			const fullScreenExits = proctoring.fullScreenExits || 0;
			if (!proctoring.isAssessmentConsentProvided) {
				integrity = AssessmentIntegrity.PermissionDeclined;
			} else if (proctoring.isFullScreenAccessProvided == false || visibilityChanges >= 10 || fullScreenExits >= 10) {
				integrity = AssessmentIntegrity.Bad;
			} else {
				integrity = AssessmentIntegrity.Good;
			}

			await AssessmentAttempt.update({ proctoring: { ...proctoring }, integrity });

			return { result: AssessmentAttempt };
		} catch (error) {
			const errorContext: ErrorContext = {
				cause: error instanceof Error ? error : undefined,
				service: "Assessment",
				operation: "updateProctoringInformation"
			};
			const normalizedError =
				error instanceof AppError
					? error.addContext(errorContext)
					: AppError.internal("Error updating proctoring details", errorContext);

			logger.error(normalizedError);
			return { error: normalizedError };
		}
	}
}
