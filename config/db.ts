import "dotenv/config";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
	database: process.env.POSTGRES_DB || "skill_tracker",
	dialect: "postgres",
	host: process.env.POSTGRES_HOST || "localhost",
	port: parseInt(process.env.POSTGRES_PORT || "5432"),
	username: process.env.POSTGRES_USER || "postgres",
	password: process.env.POSTGRES_PASSWORD || "postgres",
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000
	}
});

export default sequelize;
