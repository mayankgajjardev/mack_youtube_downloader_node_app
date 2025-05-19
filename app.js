require("module-alias/register");
const express = require("express");
const cors = require("cors");
const youtubeRoutes = require("./routes/youtubeRoutes");
const env = require("dotenv");
const path = require("path");
const db = require("./db");
const { errorHandler, logHandler } = require("./middlewares/error");
var cookieParser = require("cookie-parser");
const { statusCode } = require("@const");

const app = express();
env.config();
app.use(cors());
app.use(express.json({ limit: "2gb" }));
app.use(express.urlencoded({ limit: "2gb", extended: true }));
app.use(cookieParser());
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

/// Log Handler
app.use(logHandler);

app.use("/api/youtube", youtubeRoutes);
app.use("/api/user", require("./routes/userRoutes"));

// Error handling
app.use(errorHandler);

/// Database Sync
db.sequelize
	.sync()
	.then(() => {
		app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
			console.log(
				`✅ Server running on http://localhost:${process.env.PORT || 3000}`
			);
		});
	})
	.catch((err) => {
		console.error("Database sync error:", err);
	});
