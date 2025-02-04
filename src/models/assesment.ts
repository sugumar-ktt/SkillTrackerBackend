import sequelize from "$config/db";
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import type { Models } from "./types";

class Assesment extends Model<InferAttributes<Assesment>, InferCreationAttributes<Assesment>> {
	declare id: number;
	declare name: string;
	declare startDate: string;
	declare endDate: string;
	declare questions: number;
	declare CollegeId: number;
	static associate(models: Models) {
		Assesment.belongsTo(models.College, { foreignKey: { field: "CollegeId" } });
		Assesment.hasMany(models.Candidate);
	}
}

Assesment.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: DataTypes.TEXT,
			unique: true
		},
		startDate: DataTypes.DATE,
		endDate: DataTypes.DATE,
		questions: DataTypes.INTEGER,
		CollegeId: DataTypes.INTEGER
	},
	{
		sequelize: sequelize
	}
);

export default Assesment;
