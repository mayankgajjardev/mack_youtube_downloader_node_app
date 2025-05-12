const express = require("express");
const { mergeAndDownload } = require("../controllers/youtubeMergeController");

const router = express.Router();
const {
	getVideoInfo,
	downloadVideo,
} = require("../controllers/youtubeController");

router.post("/info", getVideoInfo);
router.post("/download", downloadVideo);
router.post("/merge", mergeAndDownload);

module.exports = router;
