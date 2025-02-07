import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

export class Submission extends Model<InferAttributes<Submission>, InferCreationAttributes<Submission>> {
	declare id?: number;
	declare submittedAt: string;
	declare totalScore: number;
	declare attemptedQuestions: number;
	declare correctAnswers: number;
	declare duration: number;
	declare SessionId: number;
	declare CandidateId: number;
	declare AssessmentAttemptId: number;

	static associate(models: Models) {
		this.belongsTo(models.Session, { foreignKey: { field: "SessionId" } });
		this.belongsTo(models.Candidate, { foreignKey: { field: "CandidateId" } });
		this.belongsTo(models.AssessmentAttempt, { foreignKey: { field: "AssessmentAttemptId" } });
	}
}

Submission.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		submittedAt: DataTypes.DATE,
		totalScore: {
			type: DataTypes.DECIMAL,
			defaultValue: 0
		},
		attemptedQuestions: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		correctAnswers: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		duration: DataTypes.BIGINT,
		SessionId: DataTypes.INTEGER,
		CandidateId: DataTypes.INTEGER,
		AssessmentAttemptId: DataTypes.INTEGER
	},
	{
		sequelize
	}
);

export default Submission;
