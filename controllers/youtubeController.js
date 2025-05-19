const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const { statusCode } = require("@const");
const { sendResponse } = require("@response");
const asyncHandler = require("@asyncHandler");
const {
	bytesToSize,
	extractVideoId,
	isPlaylistUrl,
	formatBitrate,
} = require("@appUtils");

ffmpeg.setFfmpegPath(ffmpegPath);

/// Get Video/Playlist Info
const getDownloadVideoInfo = asyncHandler(async (req, res) => {
	const { url } = req.query;
	if (!url)
		return sendResponse(res, {
			message: "URL is required",
			status: statusCode.COMMON_ERROR,
		});
	flags = {
		dumpSingleJson: true,
		simulate: true,
		flatPlaylist: true,
		callHome: false,
		skipDownload: true,
		noPlaylist: true,
		noCheckCertificate: true,
		noWarnings: true,
		geoBypass: true,
		geoBypassCountry: "US",
	};
	const info = await youtubedl(url, flags);
	const uniqueFormatsMap = new Map();

	info.formats
		.filter(
			(e) =>
				e.url?.startsWith("https://rr") &&
				["mp4"].includes(e.ext) &&
				e.vcodec !== "none"
		)
		.forEach((f) => {
			const key = f.format_note;
			const existing = uniqueFormatsMap.get(key);

			const currentSize = f.filesize || 0;
			const existingSize = existing?.filesize || 0;

			if (!existing || currentSize > existingSize) {
				uniqueFormatsMap.set(key, f);
			}
		});

	const videoInfo = {
		id: info.id,
	 title: info.title,
		thumbnail: info.thumbnail,
		thumbnail_width: info.thumbnail_width,
		thumbnail_height: info.thumbnail_height,
		videoFormats: Array.from(uniqueFormatsMap.values()).map((f) => ({
			format_id: f.format_id,
			url: f.url,
			fileName: f.baseName,
			filesize: bytesToSize(f.filesize || null),
			type: f.type,
			quality: f.quality_label,
			ext: f.ext,
			format_note: f.format_note,
			aspect_ratio: f.width ? `${f.width}:${f.height}` : null,
			videoBitrate: f.tbr ? `${Math.round(f.tbr)} Kbps` : null,
		})),

		// 🔽 Filter Audio Formats
		audioFormats: info.formats
			.filter(
				(e) =>
					e.url?.startsWith("https://rr") &&
					["mp4", "m4a"].includes(e.ext) &&
					["mp4a.40.2", "mp4a.40.5", "opus"].includes(e.acodec)
			)
			.map((f) => ({
				format_id: f.format_id,
				url: f.url,
				filesize: bytesToSize(f.filesize || null),
				format_note: f.format_note,
				ext: f.ext,
				format_note: f.format_note,
				audioBitrate: f.abr ? formatBitrate(f.abr) : null,
			})),
	};

	sendResponse(res, {
		data: videoInfo,
		message: "Get Video Information Successfully",
		status: statusCode.SUCCESS,
	});
});

async function getChannelIcon(channelId) {
	// Fetch channel snippet to get icon
	const channelRes = await axios.get(
		`${process.env.YOUTUBE_API_URL}/channels`,
		{
			params: {
				part: "snippet,statistics",
				id: channelId,
				key: process.env.YOUTUBE_API_KEY,
			},
		}
	);
	const channel = channelRes.data.items[0];
	return {
		channelIcon: channel.snippet.thumbnails.default.url || null,
		subscriberCount: channel.statistics.subscriberCount || null,
		channelName: channel.snippet.title,
	};
}

async function getTopComments(videoId, maxResults = 10) {
	// Fetch top comments for the video
	try {
		const commentsRes = await axios.get(
			`${process.env.YOUTUBE_API_URL}/commentThreads`,
			{
				params: {
					part: "snippet",
					videoId: videoId,
					maxResults: maxResults,
					order: "relevance",
					key: process.env.YOUTUBE_API_KEY,
				},
			}
		);
		return commentsRes.data.items.map((item) => {
			const topComment = item.snippet.topLevelComment.snippet;
			return {
				author: topComment.authorDisplayName,
				text: topComment.textDisplay,
				likeCount: topComment.likeCount,
				publishedAt: topComment.publishedAt,
			};
		});
	} catch {
		// Return empty array if comments disabled or error
		return [];
	}
}

function parseDuration(duration) {
	let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
	let hours = parseInt(match[1]) || 0;
	let minutes = parseInt(match[2]) || 0;
	let seconds = parseInt(match[3]) || 0;
	return hours * 3600 + minutes * 60 + seconds;
}

/// Get Video Details
const getVideoDetails = asyncHandler(async (req, res) => {
	const { url } = req.query;
	var videoId = extractVideoId(url);
	if (!url)
		return sendResponse(res, {
			message: "URL is required",
			status: statusCode.COMMON_ERROR,
		});

	try {
		// 1. Get video details (snippet, statistics, contentDetails)
		const videoRes = await axios.get(`${process.env.YOUTUBE_API_URL}/videos`, {
			params: {
				part: "snippet,statistics,contentDetails",
				id: videoId,
				key: process.env.YOUTUBE_API_KEY,
			},
		});

		if (!videoRes.data.items.length) {
			return sendResponse(res, {
				message: "Video not found",
				status: statusCode.COMMON_ERROR,
			});
		}

		const video = videoRes.data.items[0];
		const snippet = video.snippet;
		const statistics = video.statistics;
		const contentDetails = video.contentDetails;

		// 2. Get channel icon & subscriber count
		const channelInfo = await getChannelIcon(snippet.channelId);

		// 3. Get top 10 comments
		const comments = await getTopComments(videoId);

		// 4. Format duration ISO8601 to human-readable seconds
		// Example PT1H2M10S -> 3730 seconds
		const durationSeconds = parseDuration(contentDetails.duration);

		// 6. Best thumbnail selection - prefer maxres > standard > high > medium > default
		const thumbnails = snippet.thumbnails;
		const bestThumbnail =
			thumbnails.maxres?.url ||
			thumbnails.standard?.url ||
			thumbnails.high?.url ||
			thumbnails.medium?.url ||
			thumbnails.default?.url ||
			null;

		// Response object
		const responseData = {
			videoId: video.id,
			title: snippet.title,
			description: snippet.description,
			comments: comments,
			thumbnail: bestThumbnail,
			viewCount: statistics.viewCount || 0,
			date: snippet.publishedAt,
			likeCount: statistics.likeCount || 0,
			duration: durationSeconds,
			channelInfo: {
				channelId: snippet.channelId,
				channelName: channelInfo.channelName,
				channelIcon: channelInfo.channelIcon,
				subscriberCount: channelInfo.subscriberCount,
			},
		};

		return sendResponse(res, {
			data: responseData,
			message: "Video details fetched successfully",
			status: statusCode.SUCCESS,
		});
	} catch (error) {
		console.error("Error fetching video details:", error.message);
		return sendResponse(res, {
			message: "Failed to fetch video details",
			status: statusCode.COMMON_ERROR,
		});
	}
});

/// Merge And Download Video
const mergeAndDownload = asyncHandler(async (req, res) => {
	const { url, quality } = req.body;
	if (!url)
		return sendResponse(res, {
			message: "URL is required",
			status: statusCode.COMMON_ERROR,
		});

	const baseName = `video_${quality}_${Date.now()}`;
	const audioPath = path.join(__dirname, `../downloads/${baseName}_audio.webm`);
	const videoPath = path.join(__dirname, `../downloads/${baseName}_video.webm`);
	const outputPath = path.join(
		__dirname,
		`../downloads/${baseName}_merged.mp4`
	);

	console.log("Downloading best audio...");
	await youtubedl(url, {
		format: "bestaudio/best",
		output: audioPath,
	});

	console.log(`Downloading best ${quality}p video...`);
	await youtubedl(url, {
		format: `bestvideo[height=${quality}]`,
		output: videoPath,
	});

	console.log("Merging with ffmpeg...");

	/// Merge video and audio
	ffmpeg()
		.input(videoPath)
		.input(audioPath)
		.outputOptions("-c:v copy") // Copy video codec (no re-encode)
		.outputOptions("-c:a aac") // Encode audio to AAC
		.save(outputPath)
		.on("end", () => {
			console.log("Merge complete!");
			// ✅ Move this block here, after file is ready
			const stat = fs.statSync(outputPath);
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=${baseName}.mp4`
			);
			res.setHeader("Content-Type", "video/mp4");
			res.setHeader("Content-Length", stat.size);

			res.download(outputPath, () => {
				// Clean up temp files
				fs.unlink(audioPath, () => {});
				fs.unlink(videoPath, () => {});
				fs.unlink(outputPath, () => {});
			});
		})
		.on("error", (err) => {
			console.error("FFmpeg error:", err);
			return sendResponse(res, {
				message: `Merge failed :- ${err.message}`,
				status: statusCode.COMMON_ERROR,
			});
		});
});

async function getChannelIcons(channelIds) {
	if (!Array.isArray(channelIds) || channelIds.length === 0) return {};
	const channelIdChunks = chunkArray(channelIds, 50); // API allows max 50 ids per request
	const result = {};
	for (const chunk of channelIdChunks) {
		const response = await axios.get(
			`${process.env.YOUTUBE_API_URL}/channels`,
			{
				params: {
					part: "snippet,statistics",
					id: chunk.join(","),
					key: process.env.YOUTUBE_API_KEY,
				},
			}
		);

		response.data.items.forEach((channel) => {
			result[channel.id] = {
				channelName: channel.snippet.title,
				channelIcon: channel.snippet.thumbnails.default.url,
				subscriberCount: channel.statistics.subscriberCount,
			};
		});
	}

	return result;
}

// Utility to chunk array into batches of n
function chunkArray(arr, size) {
	const chunks = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

/// Get Youtube Videos By Category
const getVideosByCategory = asyncHandler(async (req, res) => {
	const { categoryId, maxResults = 10, pageToken } = req.query;

	const response = await axios
		.get(`${process.env.YOUTUBE_API_URL}/videos`, {
			params: {
				part: "snippet",
				chart: "mostPopular",
				type: "video",
				videoCategoryId: categoryId,
				maxResults: maxResults,
				pageToken,
				key: process.env.YOUTUBE_API_KEY,
			},
		})
		.catch((err) => {
			console.error("Error fetching videos:", err);
			return sendResponse(res, {
				message: `Failed to fetch videos :- ${err.message}`,
				status: statusCode.COMMON_ERROR,
			});
		});
	console.log("response", response.data);
	var res1 = response.data;
	delete res1.etag;
	delete res1.kind;
	res1["prevPageToken"] = res1.prevPageToken || null;
	const uniqueChannelIds = [
		...new Set(res1.items.map((e) => e.snippet.channelId)),
	];
	const channelInfoMap = await getChannelIcons(uniqueChannelIds);

	res1.items = res1.items.map((e) => {
		const snippet = e.snippet;
		const channelInfo = channelInfoMap[snippet.channelId];
		return {
			id: e.id,
			publishedAt: snippet.publishedAt,
			title: snippet.title,
			description: snippet.description,
			categoryId: snippet.categoryId,
			thumbnail:
				snippet.thumbnails?.default ||
				snippet.thumbnails?.high ||
				snippet.thumbnails?.standard ||
				null,
			channelInfo: {
				channelId: snippet.channelId,
				channelName: channelInfo.channelName,
				channelIcon: channelInfo.channelIcon,
				subscriberCount: channelInfo.subscriberCount,
			},
		};
	});

	sendResponse(res, {
		data: res1,
		message: "Get Videos Successfully",
		status: statusCode.SUCCESS,
	});
});

/// Get Youtube Music Videos
const getMusic = asyncHandler(async (req, res) => {
	// YouTube music category ID = 10
	req.query.categoryId = "10";
	req.query.q = "music";
	return getVideosByCategory(req, res);
});

/// Search Youtube Videos
const searchVideos = asyncHandler(async (req, res) => {
	const { q, maxResults = 10, pageToken } = req.query;
	if (!q)
		return sendResponse(res, {
			message: "Query is required",
			status: statusCode.COMMON_ERROR,
		});

	const response = await axios
		.get(`${process.env.YOUTUBE_API_URL}/search`, {
			params: {
				part: "snippet",
				type: "video",
				q,
				maxResults,
				pageToken,
				key: process.env.YOUTUBE_API_KEY,
			},
		})
		.catch((err) => {
			console.error("Error fetching search results:", err);
			sendResponse(res, {
				message: err.message,
				status: statusCode.COMMON_ERROR,
			});
		});
	var res1 = response.data;
	delete res1.etag;
	delete res1.kind;
	delete res1.regionCode;
	res1["prevPageToken"] = res1.prevPageToken || null;
	res1.items = res1.items.map((e) => {
		const snippet = e.snippet;
		return {
			id: e.id.videoId,
			publishedAt: snippet.publishedAt,
			channelId: snippet.channelId,
			title: snippet.title,
			description: snippet.description,
			channelTitle: snippet.channelTitle,
			categoryId: snippet.categoryId,
			thumbnail:
				snippet.thumbnails?.default ||
				snippet.thumbnails?.high ||
				snippet.thumbnails?.standard ||
				null,
		};
	});
	sendResponse(res, {
		data: res1,
		message: "Search Videos Successfully",
		status: statusCode.SUCCESS,
	});
});

/// Search Youtube Music
const searchMusic = asyncHandler(async (req, res) => {
	req.query.q = req.query.q ? `${req.query.q} music` : "music";
	return searchVideos(req, res);
});

/// Get Playlist Videos By PlaylistId
const getPlaylistVideos = asyncHandler(async (req, res) => {
	const { playlistId, maxResults = 10, pageToken } = req.query;
	if (!playlistId)
		return sendResponse(res, {
			message: "Playlist ID is required",
			status: statusCode.COMMON_ERROR,
		});

	const response = await axios
		.get(`${process.env.YOUTUBE_API_URL}/playlistItems`, {
			params: {
				part: "snippet",
				playlistId,
				maxResults,
				pageToken,
				key: process.env.YOUTUBE_API_KEY,
			},
		})
		.catch((err) => {
			console.error("Error fetching playlist videos:", err);
			sendResponse(res, {
				message: "Failed to fetch playlist videos",
				status: statusCode.COMMON_ERROR,
			});
		});
	var res1 = response.data;
	delete res1.etag;
	delete res1.kind;
	delete res1.pageInfo;
	res1["prevPageToken"] = res1.prevPageToken || null;
	res1.items = res1.items.map((e) => {
		const snippet = e.snippet;
		return {
			id: snippet.resourceId.videoId,
			channelTitle: snippet.channelTitle,
			publishedAt: snippet.publishedAt,
			channelId: snippet.channelId,
			title: snippet.title,
			description: snippet.description,
			channelTitle: snippet.channelTitle,
			categoryId: snippet.categoryId,
			thumbnail:
				snippet.thumbnails?.standard || snippet.thumbnails?.default || null,
		};
	});
	sendResponse(res, {
		data: res1,
		message: "Get Playlist Videos Successfully",
		status: statusCode.SUCCESS,
	});
});

/// Get Suggested Videos By videoId
const getSuggestedVideos = asyncHandler(async (req, res) => {
	const { videoId, maxResults = 10, pageToken } = req.query;
	if (!videoId)
		return sendResponse(res, {
			message: "Video Id is required",
			status: statusCode.COMMON_ERROR,
		});

	try {
		const response = await axios.get(`${process.env.YOUTUBE_API_URL}/search`, {
			params: {
				part: "snippet",
				type: "video",
				videoId: videoId,
				maxResults,
				pageToken,
				key: process.env.YOUTUBE_API_KEY,
			},
		});
		var res1 = response.data;
		delete res1.etag;
		delete res1.kind;
		delete res1.pageInfo;
		res1["prevPageToken"] = res1.prevPageToken || null;
		res1.items = res1.items.map((e) => {
			const snippet = e.snippet;
			return {
				id: snippet.resourceId.videoId,
				channelTitle: snippet.channelTitle,
				publishedAt: snippet.publishedAt,
				channelId: snippet.channelId,
				title: snippet.title,
				description: snippet.description,
				channelTitle: snippet.channelTitle,
				categoryId: snippet.categoryId,
				thumbnail:
					snippet.thumbnails?.standard || snippet.thumbnails?.default || null,
			};
		});
		sendResponse(res, {
			data: res1,
			message: "Get Suggested Videos Successfully",
			status: statusCode.SUCCESS,
		});
	} catch (err) {
		console.error(
			"Error fetching suggested videos:",
			err?.response?.data || err.message
		);

		sendResponse(res, {
			message: "Failed to fetch suggested videos",
			status: statusCode.COMMON_ERROR,
		});
	}
});

module.exports = {
	getDownloadVideoInfo,
	mergeAndDownload,
	getVideosByCategory,
	getMusicByCategory: getMusic,
	searchVideos,
	searchMusic,
	getPlaylistVideos,
	getSuggestedVideos,
	getVideoDetails,
};
