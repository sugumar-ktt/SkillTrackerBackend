import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { QuestionTypeEnum } from "./question";
import type { Models } from "./types";

export type QuestionDistribution = {
	[key in QuestionTypeEnum]: number;
};

class Assessment extends Model<InferAttributes<Assessment>, InferCreationAttributes<Assessment>> {
	declare id: number;
	declare name: string;
	declare startDate: string;
	declare endDate: string;
	declare maxAttempts?: number;
	declare questions?: number;
	declare CollegeId: number;
	declare questionDistribution: Partial<QuestionDistribution>;
	static associate(models: Models) {
		Assessment.belongsTo(models.College, { foreignKey: { field: "CollegeId" } });
		Assessment.hasMany(models.Candidate);
		Assessment.hasMany(models.AssessmentAttempt);
	}
}

Assessment.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: DataTypes.TEXT,
			unique: true
		},
		startDate: DataTypes.DATE,
		endDate: DataTypes.DATE,
		questions: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		questionDistribution: {
			type: DataTypes.JSONB,
			defaultValue: {} as QuestionDistribution
		},
		maxAttempts: {
			type: DataTypes.INTEGER,
			defaultValue: 1
		},
		CollegeId: DataTypes.INTEGER
	},
	{
		sequelize: sequelize
	}
);

export default Assessment;
