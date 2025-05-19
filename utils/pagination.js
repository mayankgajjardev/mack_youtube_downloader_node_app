class Pagination {
	constructor(page = 1, limit = 10) {
		this.page = parseInt(page);
		this.limit = parseInt(limit);
		this.offset = (this.page - 1) * this.limit;
	}

	getQueryParams() {
		return {
			limit: this.limit,
			offset: this.offset,
		};
	}

	formatResult(data) {
		const { count: totalItems, rows: records } = data;
		const totalPages = Math.ceil(totalItems / this.limit);

		return {
			data: records,
			pagination: {
				totalItems,
				totalPages,
				currentPage: this.page,
				pageSize: this.limit,
			},
		};
	}
}

module.exports = Pagination;
