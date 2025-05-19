const { User, WatchHistory, Videos } = require("../db");
const { statusCode } = require("@const");
const { sendResponse } = require("@response");
const asyncHandler = require("@asyncHandler");
const Pagination = require("@pagination");

/// Get User Information by ID
exports.getUserInfo = asyncHandler(async (req, res) => {
	const user = await User.findByPk(req.body.userId, {
		attributes: ["id", "username", "email", "role", "createdAt", "updatedAt"],
	});
	if (!user)
		return sendResponse(res, {
			message: "User not found",
			status: statusCode.COMMON_ERROR,
		});
	sendResponse(res, {
		data: user,
		message: "Get User Information Successfully",
		status: statusCode.SUCCESS,
	});
});

/// Update User Information
exports.updateUserInfo = asyncHandler(async (req, res) => {
	await User.update(req.body, { where: { id: req.userId } });
	sendResponse(res, {
		message: "User updated",
		status: statusCode.SUCCESS,
	});
});

/// Delete User
exports.deleteUser = asyncHandler(async (req, res) => {
	const user = await User.findByPk(req.userId);

	if (!user) {
		return sendResponse(res, {
			message: "User not found",
			status: statusCode.COMMON_ERROR,
		});
	}

	await user.destroy();

	sendResponse(res, {
		message: "User deleted",
		status: statusCode.SUCCESS,
	});
});

/// Get Watch History
exports.getWatchHistory = asyncHandler(async (req, res) => {
	var dId = req.query.deviceId;
	const page = req.query.page || 1;
	const limit = req.query.limit || 10;
	if (!dId) {
		return sendResponse(res, {
			message: "Device Id is required!",
			status: statusCode.COMMON_ERROR,
		});
	}
	const pagination = new Pagination(page, limit);
	const watchHistory = await WatchHistory.findAndCountAll({
		where: { deviceId: dId },
		include: [
			{
				model: Videos,
			},
		],
		order: [["createdAt", "DESC"]],
		...pagination.getQueryParams(),
	});

	const result = pagination.formatResult(watchHistory);
	sendResponse(res, {
		...result,
		message: "Watch history fetched successfully",
		status: statusCode.SUCCESS,
	});
});

/// Add Video to Watch History
exports.addToWatchHistory = asyncHandler(async (req, res) => {
	const {
		videoId,
		deviceId,
		title,
		description,
		author,
		thumbnail,
		publishedAt,
		duration,
		format_id,
		url,
	} = req.body;

	if (!videoId)
		return sendResponse(res, {
			message: "Video ID is required",
			status: statusCode.COMMON_ERROR,
		});

	if (!deviceId)
		return sendResponse(res, {
			message: "Device ID is required",
			status: statusCode.COMMON_ERROR,
		});

	// Check if already exists
	const isAlreadyAdded = await WatchHistory.findOne({
		where: {
			deviceId,
		},
		include: [
			{
				model: Videos,
				where: { videoId }, // match the Videos.videoId
				attributes: [], // optional: don't return Videos columns if not needed
			},
		],
	});

	if (isAlreadyAdded) {
		return sendResponse(res, {
			message: "Video already added to watch history",
			status: statusCode.SUCCESS,
		});
	}

	var video = await Videos.create({
		title: title,
		description: description,
		author: author,
		thumbnail: thumbnail,
		videoId,
		publishedAt: publishedAt,
		duration: duration,
		format_id: format_id,
		url: url,
	});

	await WatchHistory.create({
		deviceId: deviceId,
		videoId: video.videoId,
	});

	sendResponse(res, {
		message: "Video added to watch history",
		status: statusCode.SUCCESS,
	});
});

/// Create User
exports.createUser = asyncHandler(async (req, res) => {
	const { deviceId } = req.body;

	if (!deviceId)
		return sendResponse(res, {
			message: "Device Id is required",
			status: statusCode.COMMON_ERROR,
		});

	// Check if already exists
	const findUser = await User.findOne({
		where: {
			deviceId,
		},
	});

	if (findUser) {
		return sendResponse(res, {
			data: findUser,
			message: "User Already Created",
			status: statusCode.SUCCESS,
		});
	}
	const cleanDeviceId = deviceId.replace(/[^a-zA-Z0-9]/g, ""); // sanitize
	const username = `Guest_${cleanDeviceId}`;
	const email = `guest_${cleanDeviceId}@example.com`;
	const password = `Guest123_${cleanDeviceId}`;
	const user = await User.create({
		deviceId: deviceId,
		username: username,
		email: email,
		password: password,
		role: "user",
	});

	sendResponse(res, {
		data: user,
		message: "User created successfully",
		status: statusCode.SUCCESS,
	});
});
