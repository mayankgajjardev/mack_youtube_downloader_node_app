// convert to human readable format
function bytesToSize(bytes, decimals = 1) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

	if (!bytes || typeof bytes !== "number" || isNaN(bytes) || bytes < 0) {
		return null;
	}

	if (bytes === 0) return "0 Bytes";

	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const size = bytes / Math.pow(1024, i);

	if (!isFinite(size)) return null;

	return `${parseFloat(size.toFixed(decimals))} ${sizes[i]}`;
}

const categories = {
	"Film & Animation": 1,
	"Autos & Vehicles": 2,
	Music: 10,
	"Pets & Animals": 15,
	Sports: 17,
	"Short Movies": 18,
	"Travel & Events": 19,
	Gaming: 20,
	"People & Blogs": 22,
	Comedy: 23,
	Entertainment: 24,
	"News & Politics": 25,
	"Howto & Style": 26,
	Education: 27,
	"Science & Tech": 28,
};

function extractVideoId(url) {
	const regex =
		/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
	const match = url.match(regex);
	return match ? match[1] : null;
}

function isPlaylistUrl(url) {
	const parsedUrl = new URL(url);
	const playlistId = parsedUrl.searchParams.get("list");
	return !!playlistId;
}

function formatBitrate(value) {
	if (value == null) return "";
	try {
		const bitrate = parseFloat(value);
		const rounded = Math.round(bitrate);
		return `${rounded} Kbps`;
	} catch (e) {
		return "";
	}
}

module.exports = {
	bytesToSize,
	categories,
	extractVideoId,
	isPlaylistUrl,
	formatBitrate,
};
