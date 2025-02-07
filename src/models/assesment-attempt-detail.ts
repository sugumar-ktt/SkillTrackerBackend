import sequelize from "$config/db";
import type { CodingChoice } from "$src/types";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { MCQChoice } from "./question";
import type { ModelInstances, Models } from "./types";

export class AssessmentAttemptDetail extends Model<
	InferAttributes<AssessmentAttemptDetail>,
	InferCreationAttributes<AssessmentAttemptDetail>
> {
	declare id?: number;
	declare order?: number;
	declare isAttempted?: boolean;
	declare isCorrect?: boolean;
	declare changeCount?: number;
	declare submission?: Partial<MCQChoice | CodingChoice>;
	declare score?: number;
	declare reviewerFeedback?: string;
	declare gradedAt?: string;
	declare QuestionId: number;
	declare Question?: ModelInstances["Question"];
	declare AssessmentAttempt?: ModelInstances["AssessmentAttempt"];
	declare AssessmentAttemptId: number;

	static associate(models: Models) {
		this.belongsTo(models.Question, { foreignKey: { field: "QuestionId" } });
		this.belongsTo(models.AssessmentAttempt, { foreignKey: { field: "AssessmentAttemptId" } });
	}
}

AssessmentAttemptDetail.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		isAttempted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		isCorrect: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		changeCount: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		order: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		submission: {
			type: DataTypes.JSONB,
			defaultValue: {} as MCQChoice
		},
		score: {
			type: DataTypes.DECIMAL,
			defaultValue: 0
		},
		reviewerFeedback: DataTypes.TEXT,
		gradedAt: DataTypes.DATE,
		QuestionId: DataTypes.INTEGER,
		AssessmentAttemptId: DataTypes.INTEGER
	},
	{
		sequelize
	}
);

export default AssessmentAttemptDetail;
