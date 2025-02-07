import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
	declare id?: number;
	declare expiresAt: string;
	declare loggedInAt: string;
	declare token: string;
	declare CandidateId: number;
	static associate(models: Models) {
		this.belongsTo(models.Candidate, { foreignKey: { field: "CandidateId" } });
	}
}

Session.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		expiresAt: DataTypes.DATE,
		loggedInAt: DataTypes.DATE,
		token: {
			type: DataTypes.TEXT,
			unique: true
		},
		CandidateId: DataTypes.INTEGER
	},
	{
		sequelize: sequelize
	}
);

export default Session;
