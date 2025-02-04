import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

export class Submission extends Model<InferAttributes<Submission>, InferCreationAttributes<Submission>> {
	declare id: number;
	declare submittedAt: string;
	declare totalScore: number;
	declare duration: number;
	declare SessionId: number;
	declare CandidateId: number;
	declare AssesmentAttemptId: number;

	static associate(models: Models) {
		this.belongsTo(models.Session, { foreignKey: { field: "SessionId" } });
		this.belongsTo(models.Candidate, { foreignKey: { field: "CandidateId" } });
		this.belongsTo(models.AssesmentAttempt, { foreignKey: { field: "AssesmentAttemptId" } });
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
		totalScore: DataTypes.DECIMAL,
		duration: DataTypes.BIGINT,
		SessionId: DataTypes.INTEGER,
		CandidateId: DataTypes.INTEGER,
		AssesmentAttemptId: DataTypes.INTEGER
	},
	{
		sequelize
	}
);

export default Submission;
