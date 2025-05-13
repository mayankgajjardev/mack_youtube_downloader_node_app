const express = require("express");
const router = express.Router();
const {
	getVideoInfo,
	mergeAndDownload,
	getVideosByCategory,
	getMusicByCategory,
	searchVideos,
	searchMusic,
} = require("../controllers/youtubeController");

router.post("/info", getVideoInfo);
router.post("/download", mergeAndDownload);

router.get("/getVideosByCategory", getVideosByCategory);
router.get("/getMusicByCategory", getMusicByCategory);
router.get("/searchVideo", searchVideos);
router.get("/searchMusic", searchMusic);

module.exports = router;
