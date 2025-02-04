import Assesment from "./assesment";
import AssesmentAttempt from "./assesment-attempt";
import AssesmentAttemptDetail from "./assesment-attempt-detail";
import Candidate from "./candidate";
import College from "./college";
import Department from "./department";
import Question from "./question";
import Session from "./session";

const models = {
	Candidate,
	Session,
	Department,
	Assesment,
	Question,
	AssesmentAttempt,
	AssesmentAttemptDetail,
	College
};
export type Models = typeof models;
export type InstanceOfModel<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer I ? I : never;
export type ModelInstances = {
	[K in keyof Models]: InstanceOfModel<Models[K]>;
};

export default models;
