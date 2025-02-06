import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";
import type { CodingChoice } from "$src/types";

class Question extends Model<InferAttributes<Question>, InferCreationAttributes<Question>> {
	declare id?: number;
	declare description: string;
	declare hint: string | null;
	declare choices: MCQChoice[] | CodingChoice[];
	declare answer?: MCQChoice | CodingChoice;
	declare score: number;
	declare type: QuestionTypeEnum;
	declare snippet?: Snippet;
	declare AssessmentId?: number;

	associate(models: Models) {
		Question.belongsTo(models.Assessment, { foreignKey: { field: "AssessmentId" } });
	}
}

export type MCQChoice = {
	id: string;
	text: string;
};

export type Snippet = {
	code: string;
	language: string;
};

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
			defaultValue: [] satisfies Array<MCQChoice | CodingChoice>
		},
		answer: {
			type: DataTypes.JSONB,
			defaultValue: {} as MCQChoice | CodingChoice
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
		AssessmentId: DataTypes.INTEGER
	},
	{
		sequelize: sequelize
	}
);

export default Question;
