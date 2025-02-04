import sequelize from "$config/db";
import logger from "$src/lib/logger";
import { models } from "$src/models";
import type { Choice, QuestionTypeEnum } from "$src/models/question";
import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

type QuestionRow = {
	Question: string;
	Hint: string | null;
	"Choice 1": string;
	"Choice 2": string;
	"Choice 3": string;
	"Choice 4": string;
	Answer: string;
};

const filePath = "./question-bank.xlsx";

logger.info("Reading the excel file...");
const workbook = XLSX.read(readFileSync(path.resolve(__dirname, filePath)), { type: "buffer" });

const sheetName = "MCQs";
const sheet = workbook.Sheets[sheetName];

const rawData = XLSX.utils.sheet_to_json(sheet) as QuestionRow[];
logger.info("Sheet loaded in memory");

const questionsRaw = rawData.map((row) => ({
	question: row["Question"],
	hint: row["Hint"] || null,
	choices: [row["Choice 1"], row["Choice 2"], row["Choice 3"], row["Choice 4"]].filter(
		(choice) => choice !== undefined && choice !== null
	),
	answer: row["Answer"] || null
}));

const normalizeString = (val: string) => {
	if (typeof val !== "string") return "";
	const match = val.match(/^[a-z]\)\s*(.+)$/i);
	return match ? match[1] : val;
};

sequelize.sync({ alter: true }).then(async () => {
	let totalRows = 0;
	let inserted = 0;
	for (const question of questionsRaw) {
		totalRows++;
		const description = question.question.trim();
		if (!description) {
			continue;
		}
		const hint = question.hint?.trim() || null;

		const choices: Choice[] = [];
		for (const choice of question.choices) {
			if (choice == undefined) {
				break;
			}
			const text = normalizeString(choice).trim();
			const id = Bun.randomUUIDv7("hex");
			choices.push({ id, text });
		}

		if (!(choices.length == 4) || !question.answer) {
			continue;
		}

		const normalizedAnswer = normalizeString(question.answer || "").trim();
		const answer = choices.find((choice) => choice.text == normalizedAnswer);
		const type: QuestionTypeEnum = "mcq";
		await sequelize.transaction(async (t) => {
			try {
				await models.Question.create(
					{
						answer: answer,
						description: description,
						type: type,
						choices: choices,
						score: 1,
						hint: hint
					},
					{
						transaction: t
					}
				);
				inserted++;
			} catch (error) {
				logger.error("Error while creating question record", error);
			}
		});
	}
	logger.info(`Total Questions${"".padStart(1, "\t")}${totalRows}`);
	logger.info(`Inserted Questions${"".padStart(1, "\t")}${inserted}`);
});
