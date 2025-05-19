const { UUIDV4 } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
	return sequelize.define(
		"User",
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: UUIDV4,
				primaryKey: true,
			},
			username: DataTypes.STRING,
			deviceId: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			email: { type: DataTypes.STRING, unique: true },
			password: DataTypes.STRING,
			role: {
				type: DataTypes.ENUM("user", "admin"),
				defaultValue: "user",
			},
			token: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
		},
		{
			tableName: "Users", // 🔥 Force Sequelize to use this table name
		}
	);
};
