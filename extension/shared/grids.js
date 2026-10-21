// Built-in grid layouts, shared by the content script, popup and options page.
//
// Each layout is a list of rectangles measured in dashboard grid squares.
//   - The top-left grid square is x = 0, y = 0.
//   - A height of -1 extends the rectangle downwards indefinitely.
//   - A width of -1 extends the rectangle to the right indefinitely.
(function () {
	if (globalThis.SSGH_DEFAULT_GRIDS) return

	globalThis.SSGH_DEFAULT_GRIDS = Object.freeze({
		"Center Line": [
			{ color: "Blue", opacity: "30%", height: -1, width: 1, x: 44, y: 0 },
		],
		"11 Columns": [
			// Left side
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 2, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 10, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 18, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 26, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 34, y: 0 },
			// Center
			{ color: "Red", opacity: "20%", height: -1, width: 5, x: 42, y: 0 },
			// Right side
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 49, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 57, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 65, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 73, y: 0 },
			{ color: "Red", opacity: "20%", height: -1, width: 6, x: 81, y: 0 },
		],
		"4 Columns": [
			{ color: "Gray", opacity: "20%", height: -1, width: 21, x: 1, y: 0 },
			{ color: "Gray", opacity: "20%", height: -1, width: 21, x: 23, y: 0 },
			{ color: "Gray", opacity: "20%", height: -1, width: 21, x: 45, y: 0 },
			{ color: "Gray", opacity: "20%", height: -1, width: 21, x: 67, y: 0 },
		],
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
