import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

class College extends Model<InferAttributes<College>, InferCreationAttributes<College>> {
	declare id: number;
	declare name: string;
	associate(models: Models) {}
}

College.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		name: DataTypes.STRING
	},
	{
		paranoid: true,
		sequelize: sequelize
	}
);

export default College;
