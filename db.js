const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("./config/db_config");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
	host: dbConfig.HOST,
	dialect: dbConfig.dialect,
	logging: false,
	define: {
		timestamps: true,
		createdAt: "createdAt",
		updatedAt: "updatedAt",
	},
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.User = require("./models/user")(sequelize, DataTypes);
db.WatchHistory = require("./models/watchHistory")(sequelize, DataTypes);
db.Videos = require("./models/videos")(sequelize, DataTypes);

// 🔗 Define association
db.Videos.hasMany(db.WatchHistory, {
	foreignKey: "videoId",
	sourceKey: "videoId",
});
db.WatchHistory.belongsTo(db.Videos, {
	foreignKey: "videoId",
	targetKey: "videoId",
});

module.exports = db;
