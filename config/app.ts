import "dotenv/config";

export type Environments = "production" | "development";

const appConfig = {
	host: process.env.API_HOST || "localhost",
	port: process.env.API_PORT || "8080",
	environment: (process.env.NODE_ENV || "development") as Environments,
	corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"],
	jwt: {
		secret: process.env.JWT_SECRET || "e0d35fb018ade796c69be215347c7cbe",
		expiresIn: parseInt(process.env.JWT_EXPIRES_IN || "86400")
	}
};
export default appConfig;
