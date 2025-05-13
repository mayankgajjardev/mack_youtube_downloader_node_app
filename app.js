const express = require("express");
const cors = require("cors");
const youtubeRoutes = require("./routes/youtubeRoutes");
const env = require("dotenv");
const path = require("path");

const app = express();
env.config();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.use((req, res, next) => {
	const now = new Date().toISOString();
	console.log(`[${now}] ${req.method} ${req.originalUrl}`);
	if (req.body && Object.keys(req.body).length > 0) {
		console.log("Body:", req.body);
	}
	if (req.query && Object.keys(req.query).length > 0) {
		console.log("Query:", req.query);
	}
	next();
});

app.use("/api/youtube", youtubeRoutes);

app.use((err, req, res, next) => {
	console.error("Unhandled Error:", err.stack);
	res.status(500).json({ error: "Internal Server Error" });
});
app.listen(process.env.PORT || 3000, () => {
	console.log(
		`Server running on port http://localhost:${process.env.PORT || 3000}`
	);
});
