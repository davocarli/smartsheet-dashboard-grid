// Built-in grid layouts, shared by the content script, popup and options page.
//
// A layout is a list of rectangles measured in dashboard grid squares.
//   - The top-left grid square is x = 0, y = 0.
//   - A height of -1 extends the rectangle downwards indefinitely.
//   - A width of -1 extends the rectangle to the right indefinitely.
//
// Built-in layouts are functions of the editor's size in grid squares, so
// they stay centred whatever width Smartsheet gives the canvas. Custom
// layouts (see the options page) are plain lists of rectangles.
(function () {
	if (globalThis.SSGH_DEFAULT_GRIDS) return

	// Equal-width columns separated by one-cell gutters with no outer margin,
	// which is how Smartsheet's own widgets tend to be laid out. On the
	// current 119-cell canvas 3, 4, 6 and 12 columns all divide exactly; on
	// any other width the leftover cells are split evenly between the edges.
	function columns(count, totalColumns, color) {
		const gutter = 1
		const width = Math.max(1, Math.floor((totalColumns - (count - 1) * gutter) / count))
		const used = count * width + (count - 1) * gutter
		const start = Math.floor((totalColumns - used) / 2)
		const result = []
		for (let i = 0; i < count; i++) {
			result.push({
				color,
				opacity: "20%",
				height: -1,
				width,
				x: start + i * (width + gutter),
				y: 0,
			})
		}
		return result
	}

	globalThis.SSGH_DEFAULT_GRIDS = Object.freeze({
		"Center Line": (totalColumns) => [
			{
				color: "Blue",
				opacity: "30%",
				height: -1,
				width: 1,
				x: Math.floor(totalColumns / 2),
				y: 0,
			},
		],
		"3 Columns": (totalColumns) => columns(3, totalColumns, "Green"),
		"4 Columns": (totalColumns) => columns(4, totalColumns, "Gray"),
		"6 Columns": (totalColumns) => columns(6, totalColumns, "Orange"),
		"12 Columns": (totalColumns) => columns(12, totalColumns, "Red"),
	})

	// Names that custom layouts may not use.
	globalThis.SSGH_RESERVED_NAMES = Object.freeze([
		...Object.keys(globalThis.SSGH_DEFAULT_GRIDS),
		"parent",
	])

	// Default values for everything kept in chrome.storage.sync.
	globalThis.SSGH_STORAGE_DEFAULTS = Object.freeze({
		gridEnabled: false,
		gridStyles: ["12 Columns"],
		customGrids: {},
	})
})()
