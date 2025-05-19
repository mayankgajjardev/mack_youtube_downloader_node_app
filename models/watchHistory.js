const { UUIDV4 } = require("sequelize");
const user = require("./user");
const videos = require("./videos");

module.exports = (sequelize, DataTypes) => {
	return sequelize.define(
		"WatchHistory",
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: UUIDV4,
				primaryKey: true,
			},
			videoId: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			deviceId: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			tableName: "WatchHistory", // 🔥 Force Sequelize to use this table name
		}
	);
};
