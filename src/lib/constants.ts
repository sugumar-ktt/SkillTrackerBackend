import type { MCQChoice, QuestionTypeEnum } from "$src/models/question";
import type { CodingChoice } from "$src/types";

export const QUESTION_SCORE_BY_TYPE: Record<QuestionTypeEnum, number> = {
	coding: 12,
	mcq: 2
};

export enum CodingChoiceTypes {
	FullySolved = "Fully Solved",
	MostlySolved = "Mostly Solved (minor issues)",
	NotSolved = "Not Solved"
}

export enum AssessmentIntegrity {
	Good = "good",
	Bad = "bad",
	PermissionDeclined = "permission-declined"
}

export enum ProctoringEvents {
	FullScreenEnter = "fullscreen-enter",
	FullScreenExit = "fullscreen-exit",
	VisibilityEnter = "visibility-enter",
	VisibilityExit = "visibility-exit"
}

export const CODING_QUESTION_CHOICES: CodingChoice[] = [
	{
		id: Bun.randomUUIDv7("hex"),
		text: CodingChoiceTypes.FullySolved,
		score: 12
	},
	{
		id: Bun.randomUUIDv7("hex"),
		text: CodingChoiceTypes.MostlySolved,
		score: 2
	},
	{
		id: Bun.randomUUIDv7("hex"),
		text: CodingChoiceTypes.NotSolved,
		score: 0
	}
];
