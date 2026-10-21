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

	// Evenly spaced columns of equal width, centred on the canvas.
	function columns(count, totalColumns, { color, opacity, gutter, margin }) {
		const width = Math.max(
			1,
			Math.floor((totalColumns - 2 * margin - (count - 1) * gutter) / count)
		)
		const used = count * width + (count - 1) * gutter
		const start = Math.floor((totalColumns - used) / 2)
		const result = []
		for (let i = 0; i < count; i++) {
			result.push({
				color,
				opacity,
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
		"11 Columns": (totalColumns) =>
			columns(11, totalColumns, { color: "Red", opacity: "20%", gutter: 2, margin: 2 }),
		"4 Columns": (totalColumns) =>
			columns(4, totalColumns, { color: "Gray", opacity: "20%", gutter: 1, margin: 1 }),
	})

	// Names that custom layouts may not use.
	globalThis.SSGH_RESERVED_NAMES = Object.freeze([
		...Object.keys(globalThis.SSGH_DEFAULT_GRIDS),
		"parent",
	])

	// Default values for everything kept in chrome.storage.sync.
	globalThis.SSGH_STORAGE_DEFAULTS = Object.freeze({
		gridEnabled: false,
		gridStyles: ["11 Columns"],
		customGrids: {},
	})
})()
