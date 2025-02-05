import sequelize from "$config/db";
import { AppError } from "$src/lib/errors";
import logger from "$src/lib/logger";
import { getRandRange } from "$src/lib/utils";
import { models, type ModelInstances } from "$src/models";
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
				attributes: ["id", "name", "startDate", "endDate", "questions"],
				where: {
					id: assesmentId
				}
			});

			if (!Assessment) {
				return { error: AppError.notFound("Assessment not found") };
			}

			const endTime = dayjs(Assessment.endDate);
			const startTime = dayjs(Assessment.startDate);
			const currentTime = dayjs();

			if (!currentTime.isBefore(endTime)) {
				return { error: AppError.validation("Assessment has expired") };
			}

			// if (!currentTime.isAfter(startTime)) {
			// 	return { error: AppError.validation("Assessment has not started yet") };
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
				return { error: AppError.badRequest("Existing attempt for the test is in progress. Resume the attempt to proceed") };
			}

			const { AssessmentAttempt, AssessmentAttemptDetails } = await sequelize.transaction(async (t) => {
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
					attributes: ["id", "score"]
				});
				const { result: ShuffledQuestions, error } = AssessmentService.shuffleQuestions(Questions, Assessment.questions || 0);
				if (error) {
					throw AppError.internal("Error while shuffling questions");
				}
				const AssessmentAttemptDetails = await Promise.all(
					ShuffledQuestions.map(async (question) => {
						const AssessmentAttemptDetail = await models.AssessmentAttemptDetail.create(
							{
								AssessmentAttemptId: AssessmentAttempt.id as number,
								QuestionId: question.id as number
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
			logger.error("Error in starting assesment", error);
			return {
				error: AppError.internal("Error in starting assesment", {
					cause: error instanceof Error ? error : undefined,
					service: "Assessment",
					operation: "startAssessment"
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
					service: "Assessment",
					operation: "shuffleQuestions"
				})
			};
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
			logger.error("Error while fetching active assesment", error);
			return {
				error: AppError.internal("Error while fetching active assesment", {
					cause: error instanceof Error ? error : undefined,
					service: "Assessment",
					operation: "getActiveAssessmentForCandidate"
				})
			};
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
				return { error: AppError.notFound("No active attempts found for the assesment") };
			}

			return { result: ActiveAssessmentAttempt };
		} catch (error) {
			logger.error("Error while fetching active assesment attempt", error);
			return {
				error: AppError.internal("Error while fetching active assesment attempt", {
					cause: error instanceof Error ? error : undefined,
					service: "Assessment",
					operation: "getActiveAttempt"
				})
			};
		}
	}

	static async validateAssesmentTime(assesment: ModelInstances["Assessment"]) {
		try {
			if (!assesment.startDate) {
				throw AppError.internal("Assessment start time is missing");
			}

			if (!assesment.endDate) {
				throw AppError.internal("Assessment end time is missing");
			}

			const assesmentStartTime = dayjs(assesment.startDate);
			const assesmentEndTime = dayjs(assesment.endDate);
			const currentTime = dayjs();

			if (currentTime.isBefore(assesmentStartTime)) {
				throw AppError.validation("Assessment has not started yet");
			}

			if (currentTime.isAfter(assesmentEndTime)) {
				throw AppError.validation("Assessment has ended");
			}

			return { result: true };
		} catch (error) {
			logger.error("Error while validating assessment time", error);
			return {
				error: AppError.internal("Error while validating assessment time", {
					cause: error instanceof Error ? error : undefined,
					service: "Assessment",
					operation: "validateAssesmentTime"
				})
			};
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
					where: {
						AssessmentAttemptId: AssessmentAttempt.id
					},
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
			logger.error("Error while creating assesment submission", error);
			return {
				error: AppError.internal("Error while creating assesment submission", {
					cause: error instanceof Error ? error : undefined,
					service: "Assessment",
					operation: "createSubmission"
				})
			};
		}
	}
}
