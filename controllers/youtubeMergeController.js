const fs = require("fs");
const path = require("path");
const youtubedl = require("youtube-dl-exec");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);

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
			cookies: "/etc/secrets/cookies.txt",
			noWrite: true,
		});

		console.log(`Downloading best ${quality}p video...`);
		await youtubedl(url, {
			format: `bestvideo[height=${quality}]`,
			output: videoPath,
			cookies: "/etc/secrets/cookies.txt",
			noWrite: true,
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

module.exports = { mergeAndDownload };
