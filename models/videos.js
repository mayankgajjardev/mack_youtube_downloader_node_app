const { UUIDV4 } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
	return sequelize.define(
		"Videos",
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: UUIDV4,
				primaryKey: true,
			},
			title: DataTypes.STRING,
			description: DataTypes.STRING,
			author: DataTypes.STRING,
			thumbnail: DataTypes.STRING,
			videoId: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			publishedAt: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			duration: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			format_id: DataTypes.STRING,
			url: DataTypes.STRING,
		},
		{
			tableName: "Videos", // 🔥 Force Sequelize to use this table name
		}
	);
};
