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
	Code: string;
	Language: string;
    Answer: string;
};

const filePath = "./question.xlsx";

logger.info("Reading the excel file...");
const workbook = XLSX.read(readFileSync(path.resolve(__dirname, filePath)), { type: "buffer" });

const sheetName = "MCQs";
const sheet = workbook.Sheets[sheetName];

const rawData = XLSX.utils.sheet_to_json(sheet) as QuestionRow[];
logger.info("Sheet loaded in memory");

const questionsRaw = rawData.map((row, index) => ({
    rowIndex: index + 2,
    question: row["Question"],
    hint: row["Hint"] || null,
    choices: [row["Choice 1"], row["Choice 2"], row["Choice 3"], row["Choice 4"]].filter(
        (choice) => choice !== undefined && choice !== null
    ),
	code: row["Code"] || null,
	language: row["Language"] || null,
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
    const skippedRows: { rowIndex: number; reason: string }[] = [];

    for (const question of questionsRaw) {
        totalRows++;
        const description = question.question.trim();
        if (!description) {
            skippedRows.push({ rowIndex: question.rowIndex, reason: "Question description is empty" });
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
            const number = choices.length + 1;
            choices.push({ id, text, number });
        }

        if (!(choices.length == 4) || !question.answer) {
            skippedRows.push({ rowIndex: question.rowIndex, reason: "Invalid number of choices or missing answer" });
            continue;
        }
        const questionNo = parseInt(question.answer);
        const answer = choices.find((choice) => choice.number === questionNo);		
        const type: QuestionTypeEnum = "mcq";
		const code = question.code;
		const language = question.language;
		const snippet = {
			code: code || '',
			language: language || ''
		};
        await sequelize.transaction(async (t) => {
            try {
                await models.Question.create(
                    {
                        answer: answer,
                        description: description,
                        type: type,
                        choices: choices,
						snippet: snippet,
                        score: 1,
                        hint: hint
                    },
                    {
                        transaction: t
                    }
                );
                inserted++;
            } catch (error) {
                logger.error(`Row ${question.rowIndex}: Error while creating question record`, error);
                skippedRows.push({ rowIndex: question.rowIndex, reason: "Error while creating question record" });
            }
        });
    }

    logger.info(`Total Questions${"".padStart(1, "\t")}${totalRows}`);
    logger.info(`Inserted Questions${"".padStart(1, "\t")}${inserted}`);

    if (skippedRows.length > 0) {
        logger.info("Skipped Rows:");
        skippedRows.forEach(row => {
            logger.info(`Row ${row.rowIndex}: ${row.reason}`);
        });
    }
});