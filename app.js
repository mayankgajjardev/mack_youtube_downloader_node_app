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
app.use("/api/youtube", youtubeRoutes);

app.use((err, req, res, next) => {
	console.error("Unhandled Error:", err.stack);
	res.status(500).json({ error: "Internal Server Error" });
});

app.listen(process.env.PORT || 3000, () => {
	console.log(`Server running on port ${process.env.PORT || 3000}`);
});
