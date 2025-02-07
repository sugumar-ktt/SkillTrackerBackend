import type { CodingChoiceTypes } from "$src/lib/constants";
import type { MCQChoice, QuestionTypeEnum, Snippet } from "$src/models/question";

type SuccessResult<T> = {
	error?: null;
	result: T;
};
type ErrorResult = {
	error: Error;
	result?: null;
};

export type ResultType<T> = SuccessResult<T> | ErrorResult;

export type Question = {
	id?: number;
	description: string;
	hint: string | null;
	choices: MCQChoice[];
	answer?: MCQChoice;
	score: number;
	type: QuestionTypeEnum;
	snippet?: Snippet;
	AssessmentId?: number;
};

export type CodingChoice = { id: string; text: CodingChoiceTypes; score: number };

export type ProctoringInformation = {
	isFullScreenAccessProvided: boolean;
	isAssessmentConsentProvided: boolean;
	fullScreenExits: number;
	visibilityChanges: number;
};

export type AssessmentFlags = {
	isLive: boolean;
};
