import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { ModelInstances, Models } from "./types";
import type { ProctoringInformation } from "$src/types";
import { AssessmentIntegrity } from "$src/lib/constants";

export class AssessmentAttempt extends Model<InferAttributes<AssessmentAttempt>, InferCreationAttributes<AssessmentAttempt>> {
	declare id?: number;
	declare startTime?: string;
	declare endTime?: string;
	declare status?: "Draft" | "InProgress" | "Completed";
	declare SessionId: number;
	declare CandidateId: number;
	declare AssessmentId: number;
	declare Assessment?: ModelInstances["Assessment"];
	declare proctoring?: Partial<ProctoringInformation>;
	declare integrity?: AssessmentIntegrity;
	declare AssessmentAttemptDetails?: () => ModelInstances["AssessmentAttemptDetail"][];

	static associate(models: Models) {
		this.belongsTo(models.Session, { foreignKey: { field: "SessionId" } });
		this.belongsTo(models.Candidate, { foreignKey: { field: "CandidateId" } });
		this.belongsTo(models.Assessment, { foreignKey: { field: "AssessmentId" } });
		this.hasMany(models.AssessmentAttemptDetail);
	}
}

AssessmentAttempt.init(
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
		proctoring: {
			type: DataTypes.JSONB,
			defaultValue: {} as ProctoringInformation
		},
		integrity: {
			type: DataTypes.STRING,
			defaultValue: AssessmentIntegrity.Good
		},
		SessionId: DataTypes.INTEGER,
		AssessmentId: DataTypes.INTEGER,
		CandidateId: DataTypes.INTEGER
	},
	{
		sequelize
	}
);

export default AssessmentAttempt;
