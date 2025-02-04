import Assesment from "./assesment";
import AssesmentAttempt from "./assesment-attempt";
import AssesmentAttemptDetail from "./assesment-attempt-detail";
import Candidate from "./candidate";
import College from "./college";
import Department from "./department";
import Question from "./question";
import Session from "./session";

interface Associateable {
	associate?: (models: Models) => void;
}

type ExtendedModel<T> = T & Associateable;

export const extendModel = <T>(model: T): ExtendedModel<T> => model as ExtendedModel<T>;

const models = {
	Candidate: extendModel(Candidate),
	Session: extendModel(Session),
	Department: extendModel(Department),
	Assesment: extendModel(Assesment),
	Question: extendModel(Question),
	AssesmentAttempt: extendModel(AssesmentAttempt),
	AssesmentAttemptDetail: extendModel(AssesmentAttemptDetail),
	College: extendModel(College)
};

export type Models = {
	[K in keyof typeof models]: ExtendedModel<(typeof models)[K]>;
};

export type InstanceOfModel<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer I ? I : never;

export type ModelInstances = {
	[K in keyof Models]: InstanceOfModel<Models[K]>;
};

export default models;
