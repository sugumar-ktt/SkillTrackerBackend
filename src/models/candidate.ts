import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

class Candidate extends Model<InferAttributes<Candidate>, InferCreationAttributes<Candidate>> {
	declare id?: number;
	declare firstName: string;
	declare lastName: string;
	declare email: string;
	declare rollNumber: string;
	declare CollegeId: number;
	declare DepartmentId: number;
	static associate(models: Models) {
		this.belongsTo(models.College, { foreignKey: { field: "CollegeId" } });
		this.belongsTo(models.Department, { foreignKey: { field: "DepartmentId" } });
	}
}

Candidate.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		firstName: DataTypes.STRING,
		lastName: DataTypes.STRING,
		email: {
			type: DataTypes.STRING,
			validate: { isEmail: true },
			unique: true
		},
		rollNumber: {
			type: DataTypes.STRING,
			unique: true
		},
		CollegeId: DataTypes.INTEGER,
		DepartmentId: DataTypes.INTEGER
	},
	{
		paranoid: true,
		sequelize: sequelize
	}
);

export default Candidate;
