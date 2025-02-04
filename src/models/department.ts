import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

class Department extends Model<InferAttributes<Department>, InferCreationAttributes<Department>> {
	declare id: number;
	declare name: string;
	static associate(models: Models) {}
}

Department.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		name: DataTypes.TEXT
	},
	{
		sequelize: sequelize
	}
);

export default Department;
