import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

export class AssesmentAttempt extends Model<InferAttributes<AssesmentAttempt>, InferCreationAttributes<AssesmentAttempt>> {
	declare id?: number;
	declare startTime?: string;
	declare endTime?: string;
	declare status?: "Draft" | "InProgress" | "Completed";
	declare SessionId: number;
	declare CandidateId: number;
	declare AssesmentId: number;

	static associate(models: Models) {
		this.belongsTo(models.Session, { foreignKey: { field: "SessionId" } });
		this.belongsTo(models.Candidate, { foreignKey: { field: "CandidateId" } });
		this.belongsTo(models.Assesment, { foreignKey: { field: "AssesmentId" } });
		this.hasMany(models.AssesmentAttemptDetail);
	}
}

AssesmentAttempt.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		startTime: {
			type: DataTypes.DATE,
			allowNull: false
		},
		endTime: {
			type: DataTypes.DATE
		},
		status: {
			type: DataTypes.ENUM("Draft", "InProgress", "Completed"),
			allowNull: false,
			defaultValue: "Draft"
		},
		SessionId: DataTypes.INTEGER,
		AssesmentId: DataTypes.INTEGER,
		CandidateId: DataTypes.INTEGER
	},
	{
		sequelize
	}
);

export default AssesmentAttempt;
