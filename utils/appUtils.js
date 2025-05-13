// convert to human readable format
function bytesToSize(bytes) {
	var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes == 0) return "0 Byte";
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
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
