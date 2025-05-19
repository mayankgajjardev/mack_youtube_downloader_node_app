const express = require("express");
const router = express.Router();
const {
	getWatchHistory,
	createUser,
	addToWatchHistory,
} = require("../controllers/userController");

router.get("/getWatchHistory", getWatchHistory);
router.post("/createUser", createUser);
router.post("/addToWatchHistory", addToWatchHistory);

module.exports = router;
