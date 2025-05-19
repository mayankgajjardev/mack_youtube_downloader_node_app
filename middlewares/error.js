const { sendResponse } = require("@response");
const { statusCode } = require("@const");

// 200 :- Success
// 400 :- Any Validation Error
// 401 :- UnAuthorization
// 402 :- Any Catch Error
// 500 :- Internal Server Error

// Custom Error Handler
function errorHandler(err, req, res, next) {
	let code, message;
	console.log(`❌ Error Handler ❌ 👉 ${err}`);
	// Handle Mongoose validation errors
	if (err.message && err.message.includes("Validation error")) {
		code = statusCode.COMMON_ERROR;
		message =
			Object.values(err.errors)
				.map((e) => e.message)
				.join(",", "") || "Validation error";
	}
	// Handle custom errors
	else if (err instanceof CustomError) {
		code = err.statusCode;
		message = err.message;
	}
	// Other server errors
	else {
		code = statusCode.INTERNAL_ERROR;
		message = err.message || "Internal Server Error";
	}

	sendResponse(res, {
		message: message,
		status: code,
	});
}

/// Custom Error
class CustomError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
	}
}

// Custom Log Handler
function logHandler(req, res, next) {
	const now = new Date().toISOString();
	console.log(`[${now}] ${req.method} ${req.originalUrl}`);
	if (req.body && Object.keys(req.body).length > 0) {
		console.log("Body:", req.body);
	}
	if (req.query && Object.keys(req.query).length > 0) {
		console.log("Query:", req.query);
	}
	next();
}
module.exports = { errorHandler, logHandler, CustomError };
