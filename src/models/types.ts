import Assessment from "./assesment";
import AssessmentAttempt from "./assesment-attempt";
import AssessmentAttemptDetail from "./assesment-attempt-detail";
import Candidate from "./candidate";
import College from "./college";
import Department from "./department";
import Question from "./question";
import Session from "./session";
import Submission from "./submission";

interface Associateable {
	associate?: (models: Models) => void;
}

type ExtendedModel<T> = T & Associateable;

export const extendModel = <T>(model: T): ExtendedModel<T> => model as ExtendedModel<T>;

const models = {
	Candidate: extendModel(Candidate),
	Session: extendModel(Session),
	Department: extendModel(Department),
	Assessment: extendModel(Assessment),
	Question: extendModel(Question),
	AssessmentAttempt: extendModel(AssessmentAttempt),
	AssessmentAttemptDetail: extendModel(AssessmentAttemptDetail),
	College: extendModel(College),
	Submission: extendModel(Submission)
};

export type Models = {
	[K in keyof typeof models]: ExtendedModel<(typeof models)[K]>;
};

export type InstanceOfModel<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer I ? I : never;

export type ModelInstances = {
	[K in keyof Models]: InstanceOfModel<Models[K]>;
};

export default models;
