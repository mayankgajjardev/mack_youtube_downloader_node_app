exports.sendResponse = (
	res,
	{ data, pagination, message = "Success", status = 200 } = {}
) => {
	if (res.headersSent) return; // 💥 prevent double send
	const response = {};

	// Add data first if it is provided
	if (data !== undefined) {
		response.data = data;
	}
	if (pagination !== undefined) response.pagination = pagination;

	// Then add the meta
	response.meta = {
		message,
		status: status == 200 ? true : false,
	};
	return res.status(status).json(response);
};
