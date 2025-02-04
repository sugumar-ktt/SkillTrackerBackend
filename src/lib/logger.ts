import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

const devFormat = printf(({ timestamp, level, message, ...meta }) => {
	const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
	return `${timestamp} ${level}: ${message} ${metaString}`;
});

const logger = createLogger({
	level: "debug",
	format: combine(colorize(), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), devFormat),
	transports: [new transports.Console()]
});

export default logger;
