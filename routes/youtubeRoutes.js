const express = require("express");
const router = express.Router();
const {
	getDownloadVideoInfo,
	mergeAndDownload,
	getVideosByCategory,
	getMusicByCategory,
	searchVideos,
	searchMusic,
	getPlaylistVideos,
	getSuggestedVideos,
	getVideoDetails,
} = require("../controllers/youtubeController");

router.get("/getDownloadVideoInfo", getDownloadVideoInfo);
router.post("/download", mergeAndDownload);

router.get("/getVideosByCategory", getVideosByCategory);
router.get("/getMusicByCategory", getMusicByCategory);
router.get("/searchVideo", searchVideos);
router.get("/searchMusic", searchMusic);
router.get("/getPlaylistVideos", getPlaylistVideos);
router.get("/getSuggestedVideos", getSuggestedVideos);
router.get("/getVideoDetails", getVideoDetails);

module.exports = router;
