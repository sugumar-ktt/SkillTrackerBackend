export const apps = [
	{
		name: "Skill_Tracker API",
		script: "./processes/server.ts",
		interpreter: "bun",
		env: {
			PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`
		}
	}
];
