const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");
const { exec } = require("youtube-dl-exec");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");

ffmpeg.setFfmpegPath(ffmpegPath);
const cookiesPath = path.join(__dirname, "../secrets/cookies.txt");

/// Get Video Info
const getVideoInfo = async (req, res) => {
	const { url } = req.body;
	if (!url) return res.status(400).json({ error: "URL is required" });

	try {
		const info = await youtubedl(url, {
			dumpSingleJson: true,
			simulate: true, // Avoid downloading/processing
			flatPlaylist: true, // Skip recursive processing
			callHome: false,
			addHeader: ["referer:youtube.com", "user-agent:googlebot"],
		});
		console.log("info", info.format);

		const videoInfo = {
			title: info.title,
			author: info.uploader,
			thumbnail: info.thumbnail,
			description: info.description,
			duration: info.duration,
			upload_date: info.upload_date,
			view_count: info.view_count,
			like_count: info.like_count,
			dislike_count: info.dislike_count,
			age_limit: info.age_limit,
			average_rating: info.average_rating,
			thumbnail_width: info.thumbnail_width,
			thumbnail_height: info.thumbnail_height,
			formats: info.formats.map((f) => ({
				format_id: f.format_id,
				resolution: `${f.height}p`,
				url: f.url,
				filesize: f.filesize || null,
				type: f.type,
				quality: f.quality_label,
				abr: f.abr || null,
				ext: f.ext,
				format_note: f.format_note,
				container: f.container,
				quality_label: f.quality_label,
				aspect_ratio: f.width ? `${f.width}:${f.height}` : null,
				fps: f.fps || null,
				vcodec: f.vcodec || null,
				acodec: f.acodec || null,
				isAudio: f.acodec === "none" ? false : true,
				format: f.format,
			})),
		};

		res.json(videoInfo);
	} catch (err) {
		res
			.status(500)
			.json({ error: "Failed to fetch video info", details: err.message });
	}
};

/// Merge And Download Video
const mergeAndDownload = async (req, res) => {
	const { url, quality } = req.body;
	if (!url) return res.status(400).json({ error: "URL is required" });

	const baseName = `video_${quality}_${Date.now()}`;
	const audioPath = path.join(__dirname, `../downloads/${baseName}_audio.webm`);
	const videoPath = path.join(__dirname, `../downloads/${baseName}_video.webm`);
	const outputPath = path.join(
		__dirname,
		`../downloads/${baseName}_merged.mp4`
	);

	try {
		console.log("Downloading best audio...");
		await youtubedl(url, {
			format: "bestaudio",
			output: audioPath,
			addHeader: ["referer:youtube.com", "user-agent:googlebot"],
		});

		console.log(`Downloading best ${quality}p video...`);
		await youtubedl(url, {
			format: `bestvideo[height=${quality}]`,
			output: videoPath,
			addHeader: ["referer:youtube.com", "user-agent:googlebot"],
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
				res.status(500).json({ error: "Merge failed", details: err.message });
			});
	} catch (err) {
		/// Reset Headers
		res.setHeader("Content-Disposition", "attachment");
		res.setHeader("Content-Type", "application/json");
		res.setHeader("Content-Length", 0);
		console.error("Download error:", err);
		res.status(500).json({ error: "Download failed", details: err.message });
	}
};

/// Get Youtube Videos By Category
const getVideosByCategory = async (req, res) => {
	const { categoryId, maxResults = 10, pageToken, q } = req.query;
	try {
		const response = await axios
			.get(`${process.env.YOUTUBE_API_URL}/videos`, {
				params: {
					part: "snippet",
					chart: "mostPopular",
					type: "video",
					q,
					videoCategoryId: categoryId,
					maxResults: maxResults,
					pageToken,
					key: process.env.YOUTUBE_API_KEY,
				},
			})
			.catch((err) => {
				console.error("Error fetching videos:", err);
				res
					.status(500)
					.json({ error: "Failed to fetch videos", details: err.message });
			});
		console.info("Full Url :: ", response.config.url);
		console.log("response", response.data);
		var res1 = response.data;
		delete res1.etag;
		delete res1.kind;
		res1["prevPageToken"] = res1.prevPageToken || null;
		res1.items = res1.items.map((e) => {
			const snippet = e.snippet;
			return {
				id: e.id,
				publishedAt: snippet.publishedAt,
				channelId: snippet.channelId,
				title: snippet.title,
				description: snippet.description,
				channelTitle: snippet.channelTitle,
				categoryId: snippet.categoryId,
				thumbnail: snippet.thumbnails?.standard || null,
			};
		});
		res.json(res1);
	} catch (err) {
		res
			.status(500)
			.json({ error: "Failed to fetch videos", details: err.message });
	}
};

/// Get Youtube Music Videos
const getMusic = async (req, res) => {
	// YouTube music category ID = 10
	req.query.categoryId = "10";
	req.query.q = "music";
	return getVideosByCategory(req, res);
};

/// Search Youtube Videos
const searchVideos = async (req, res) => {
	const { q, maxResults = 10, pageToken } = req.query;
	if (!q) return res.status(400).json({ error: "Query is required" });

	try {
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
				res.status(500).json({
					error: "Failed to fetch search results",
					details: err.message,
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
					snippet.thumbnails?.standard || snippet.thumbnails?.default || null,
			};
		});
		res.json(res1);
	} catch (err) {
		res.status(500).json({ error: "Search failed", details: err.message });
	}
};

/// Search Youtube Music
const searchMusic = async (req, res) => {
	req.query.q = req.query.q ? `${req.query.q} music` : "music";
	return searchVideos(req, res);
};

module.exports = {
	getVideoInfo,
	mergeAndDownload,
	getVideosByCategory,
	getMusicByCategory: getMusic,
	searchVideos,
	searchMusic,
};
