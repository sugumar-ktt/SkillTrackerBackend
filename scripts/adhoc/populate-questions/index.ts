import sequelize from "$config/db";
import { CODING_QUESTION_CHOICES, QUESTION_SCORE_BY_TYPE } from "$src/lib/constants";
import logger from "$src/lib/logger";
import { models } from "$src/models";
import type { QuestionTypeEnum } from "$src/models/question";
import type { Question } from "$src/types";
import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

type QuestionRow = {
	Question: string;
	Type: QuestionTypeEnum;
	"Choice 1"?: string;
	"Choice 2"?: string;
	"Choice 3"?: string;
	"Choice 4"?: string;
	Code?: string;
	Language?: string;
	Answer?: string;
};

const filePath = "./questions.xlsx";

logger.info("Reading the excel file...");
const workbook = XLSX.read(readFileSync(path.resolve(__dirname, filePath)), { type: "buffer" });

const normalizeTrailingSpaces = (val: string | undefined) => {
	if (typeof val !== "string") return "";
	return val.trim();
};

const sheets = ["MCQ", "Programming"];

sequelize.sync({ alter: true }).then(async () => {
	let totalRows = 0;
	let insertedRows = 0;
	const skippedRows: { index: number; reason: string }[] = [];
	const questions: Question[] = [];

	for (const sheetName of sheets) {
		const sheet = workbook.Sheets[sheetName];
		const rows = XLSX.utils.sheet_to_json(sheet) as QuestionRow[];
		logger.info(`Sheet ${sheetName} loaded in memory`);

		for (const [index, row] of rows.entries()) {
			totalRows += 1;
			const question: Question = {
				description: normalizeTrailingSpaces(row.Question),
				type: normalizeTrailingSpaces(row.Type) as QuestionTypeEnum,
				choices: [],
				hint: null,
				score: 0
			};

			if (!question.type) {
				skippedRows.push({ index: index, reason: `Question type is empty` });
				continue;
			}

			const code = normalizeTrailingSpaces(row.Code);
			if (code != "") {
				const language = normalizeTrailingSpaces(row.Language);
				question.snippet = { code, language };
			}

			if (question.type == "coding") {
				question.choices = CODING_QUESTION_CHOICES;
				question.score = QUESTION_SCORE_BY_TYPE.coding;
				question.answer = CODING_QUESTION_CHOICES[0];
			} else if (question.type == "mcq") {
				const answer = parseInt(row["Answer"] ?? "") - 1;

				if (!isFinite(answer)) {
					skippedRows.push({ index: index, reason: `No answer provided for MCQ` });
					continue;
				}

				const choices = [row["Choice 1"], row["Choice 2"], row["Choice 3"], row["Choice 4"]].filter(
					(i) => i !== undefined && i !== null
				);

				if (choices.length < 4) {
					skippedRows.push({ index: index, reason: `MCQ has lesser than 4 choices` });
					continue;
				}

				question.choices = choices.map((c) => ({
					id: Bun.randomUUIDv7(),
					text: normalizeTrailingSpaces(String(c))
				}));
				question.score = QUESTION_SCORE_BY_TYPE.mcq;
				question.answer = question.choices[answer];
			}

			questions.push(question);
		}
	}

	await sequelize.transaction(async (t) => {
		try {
			const Questions = await models.Question.bulkCreate(questions, { validate: true, transaction: t });
			insertedRows += Questions.length;
		} catch (error) {
			logger.error(error), "Error while creating question records";
		}
	});

	logger.info(`Total Questions${"".padStart(1, "\t")}${totalRows}`);
	logger.info(`Inserted Questions${"".padStart(1, "\t")}${insertedRows}`);

	if (skippedRows.length > 0) {
		logger.info("Skipped Rows:");
		skippedRows.forEach((row) => {
			logger.info(`Row ${row.index}: ${row.reason}`);
		});
	}
});
