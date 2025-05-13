const youtubedl = require("youtube-dl-exec");
const path = require("path");
const { createWriteStream, unlink } = require("fs");
const fs = require("fs");
const { exec } = require("youtube-dl-exec");

const getVideoInfo = async (req, res) => {
	const { url } = req.body;
	if (!url) return res.status(400).json({ error: "URL is required" });

	try {
		const sourcePath = "/etc/secrets/cookies.txt"; // read-only
		const writablePath = path.join(__dirname, "cookies.txt"); // safe to write to
		if (!fs.existsSync(writablePath)) {
			fs.copyFileSync(sourcePath, writablePath);
			console.log("✅ cookies.txt copied to writable path.");
		}

		const info = await youtubedl(url, {
			dumpSingleJson: true,
			simulate: true, // Avoid downloading/processing
			flatPlaylist: true, // Skip recursive processing
			callHome: false,
			cookies: path.join(__dirname, "cookies.txt"),
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

// const downloadVideo = async (req, res) => {
// 	const { url, format_id } = req.body;
// 	if (!url || !format_id)
// 		return res.status(400).json({ error: "URL and format_id are required" });

// 	const outputPath = path.join(
// 		__dirname,
// 		"../downloads",
// 		`video-${Date.now()}.mp4`
// 	);

// 	try {
// 		await youtubedl(url, {
// 			format: format_id,
// 			output: outputPath,
// 		})
// 			.on("progress", (progress) => {
// 				console.log(`Download progress: ${progress.percent}%`);
// 			})
// 			.on("error", (err) => {
// 				console.error("Download error:", err);
// 				res
// 					.status(500)
// 					.json({ error: "Download failed", details: err.message });
// 			});

// 		/// or any other method to handle the download completion
// 		res.setHeader("Content-Disposition", `attachment; filename=video.mp4`);
// 		res.setHeader("Content-Type", "video/mp4");
// 		res.setHeader("Content-Length", fs.statSync(outputPath).size);

// 		res.download(outputPath, () => {
// 			// fs.unlink(outputPath, () => {});
// 		});
// 	} catch (err) {
// 		res.status(500).json({ error: "Download failed", details: err.message });
// 	}
// };

const downloadVideo = async (req, res) => {
	const { url, format_id } = req.body;
	if (!url || !format_id) {
		return res.status(400).json({ error: "URL and format_id are required" });
	}

	const outputPath = path.join(
		__dirname,
		"../downloads",
		`video-${Date.now()}.mp4`
	);
	const output = createWriteStream(outputPath);

	const subprocess = exec(
		url,
		{
			format: format_id,
			output: outputPath,
			cookies: path.join(__dirname, "../secrets/cookies.txt"),
		},
		{ stdio: ["ignore", "pipe", "pipe"] }
	);

	subprocess.stdout.pipe(output);

	subprocess.stderr.on("data", (data) => {
		const line = data.toString();
		const match = line.match(/(\d+\.\d)%/);
		if (match) {
			console.log(`Download progress: ${match[1]}%`);
		}
	});

	subprocess.on("close", (code) => {
		if (code === 0) {
			res.download(outputPath, () => {
				// unlink(outputPath, () => {});
			});
		} else {
			res.status(500).json({ error: "Download process failed" });
		}
	});

	subprocess.on("error", (err) => {
		console.error("Process error:", err);
		res.status(500).json({ error: "Process error", details: err.message });
	});
};

module.exports = {
	getVideoInfo,
	downloadVideo,
};
