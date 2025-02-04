import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

class Question extends Model<InferAttributes<Question>, InferCreationAttributes<Question>> {
	declare id?: number;
	declare description: string;
	declare hint: string | null;
	declare choices: Choice[];
	declare answer?: Choice;
	declare score: number;
	declare type: QuestionTypeEnum;
	declare AssesmentId?: number;
	declare snippet: Snippet;

	associate(models: Models) {
		Question.belongsTo(models.Assesment, { foreignKey: { field: "AssesmentId" } });
	}
}

export type Choice = {
	id: string;
	text: string;
	number: number;
};

export type Snippet = {
	code: string;
	language: string;
}
export type QuestionTypeEnum = "mcq" | "coding";

Question.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		description: DataTypes.TEXT,
		hint: DataTypes.TEXT,
		choices: {
			type: DataTypes.JSONB,
			defaultValue: [] satisfies Array<Choice>
		},
		answer: {
			type: DataTypes.JSONB,
			defaultValue: {} as Choice
		},
		snippet: {
			type: DataTypes.JSONB,
			defaultValue: {} as Snippet
		},
		score: DataTypes.DECIMAL,
		type: {
			type: DataTypes.STRING,
			validate: {
				isIn: [["mcq", "coding"]] satisfies QuestionTypeEnum[][]
			}
		},
		AssesmentId: DataTypes.INTEGER
	},
	{
		sequelize: sequelize
	}
);

export default Question;
