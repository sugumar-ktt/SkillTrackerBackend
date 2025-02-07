import app from "$src/app";
import appConfig from "$config/app";
import sequelize from "$config/db";
import logger from "$src/lib/logger";

const server = app.listen(
	{
		host: appConfig.host,
		port: appConfig.port
	},
	() => {
		logger.info(`[Process API] Server running on address ${appConfig.host}:${appConfig.port}`);
	}
);

try {
	await sequelize.sync();
	logger.info("[Sequelize] Database connected");
} catch (error) {
	if (error instanceof Error) {
		logger.error("Error in database connection", error.message);
		logger.error(error);
	}
}

const shutdown = () => {
	logger.info("Shutting down server...");
	server.close(() => {
		logger.info("Server closed");
		process.exit(0);
	});
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
