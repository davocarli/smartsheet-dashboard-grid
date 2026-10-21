// Content script: draws the overlay on Smartsheet's dashboard editor.
//
// The script keeps no UI of its own. The extension popup (popup/popup.js)
// reads and writes chrome.storage.sync and asks this script to re-render,
// and the script also re-renders on its own when storage changes, when the
// editor canvas appears (Smartsheet is a single-page app) or when the
// canvas is resized.
(function () {
	"use strict"

	if (globalThis.__ssGridHelperLoaded) return
	globalThis.__ssGridHelperLoaded = true

	const DEFAULT_GRIDS = globalThis.SSGH_DEFAULT_GRIDS
	const STORAGE_DEFAULTS = globalThis.SSGH_STORAGE_DEFAULTS
	const OVERLAY_ATTR = "data-grid-overlay"
	const CANVAS_SELECTOR = "[data-client-id='dab-dui-2']"
	const SVG_NS = "http://www.w3.org/2000/svg"

	let settings = { ...STORAGE_DEFAULTS }
	let observedCanvas = null
	let resizeObserver = null

	// --- Editor canvas -----------------------------------------------------
	//
	// Smartsheet draws the editor's dotted grid as an <svg> full of <path>
	// lines, one per grid column and row. The grid cell size is recovered
	// from the spacing of those lines. Older builds used a <div> whose
	// background-size held the cell size; that is kept as a fallback.

	const LINE_RE = /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*$/

	function parseLine(d) {
		const match = LINE_RE.exec(d || "")
		if (!match) return null
		return {
			x1: parseFloat(match[1]),
			y1: parseFloat(match[2]),
			x2: parseFloat(match[3]),
			y2: parseFloat(match[4]),
		}
	}

	// Typical distance between neighbouring values (the median gap), which
	// ignores the half-pixel border lines Smartsheet adds at the edges.
	function spacing(values) {
		const sorted = [...new Set(values)].sort((a, b) => a - b)
		const gaps = []
		for (let i = 1; i < sorted.length; i++) {
			const gap = sorted[i] - sorted[i - 1]
			if (gap > 1) gaps.push(gap)
		}
		if (gaps.length < 3) return null
		gaps.sort((a, b) => a - b)
		return gaps[Math.floor(gaps.length / 2)]
	}

	function analyseGridSvg(svg) {
		const xs = []
		const ys = []
		for (const path of svg.querySelectorAll("path")) {
			const line = parseLine(path.getAttribute("d"))
			if (!line) continue
			if (Math.abs(line.x1 - line.x2) < 0.01) xs.push(line.x1)
			else if (Math.abs(line.y1 - line.y2) < 0.01) ys.push(line.y1)
		}
		if (xs.length < 5 || ys.length < 5) return null

		const cellX = spacing(xs)
		const cellY = spacing(ys)
		const width = svg.width.baseVal.value
		const height = svg.height.baseVal.value
		if (!cellX || !cellY || !(width > 0) || !(height > 0)) return null

		return {
			kind: "svg",
			host: svg,
			cell: { x: cellX, y: cellY },
			size: { width, height },
			columns: Math.round(width / cellX),
			rows: Math.round(height / cellY),
		}
	}

	function analyseLegacyCanvas(element) {
		if (!element || !element.style) return null
		const match = element.style.backgroundSize.match(
			/^\s*(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s*$/
		)
		if (!match) return null
		const cellX = parseFloat(match[1])
		const cellY = parseFloat(match[2])
		if (!(cellX > 0) || !(cellY > 0)) return null
		const width = element.clientWidth
		const height = element.clientHeight
		return {
			kind: "legacy",
			host: element,
			cell: { x: cellX, y: cellY },
			size: { width, height },
			columns: Math.round(width / cellX),
			rows: Math.round(height / cellY),
		}
	}

	function findGrid() {
		const known = document.querySelector(CANVAS_SELECTOR)
		if (known) {
			const grid =
				known instanceof SVGSVGElement
					? analyseGridSvg(known)
					: analyseLegacyCanvas(known)
			if (grid) return grid
		}

		// Fallbacks in case Smartsheet renames the client id.
		for (const svg of document.querySelectorAll("svg")) {
			if (svg.querySelectorAll("path").length < 20) continue
			const grid = analyseGridSvg(svg)
			if (grid) return grid
		}
		for (const candidate of document.querySelectorAll('[style*="background-size"]')) {
			const grid = analyseLegacyCanvas(candidate)
			if (grid) return grid
		}
		return null
	}

	function isDashboardPage() {
		return location.pathname.startsWith("/dashboards/")
	}

	// --- Rendering ---------------------------------------------------------

	function rectangleBox(grid, rectangle) {
		const left = grid.cell.x * rectangle.x
		const top = grid.cell.y * rectangle.y
		return {
			left,
			top,
			width:
				rectangle.width === -1
					? Math.max(grid.size.width - left, 0)
					: grid.cell.x * rectangle.width,
			height:
				rectangle.height === -1
					? Math.max(grid.size.height - top, 0)
					: grid.cell.y * rectangle.height,
		}
	}

	function buildSvgRectangle(grid, group, rectangle) {
		const box = rectangleBox(grid, rectangle)
		const rect = document.createElementNS(SVG_NS, "rect")
		rect.setAttribute(OVERLAY_ATTR, group)
		rect.setAttribute("x", box.left)
		rect.setAttribute("y", box.top)
		rect.setAttribute("width", box.width)
		rect.setAttribute("height", box.height)
		rect.setAttribute("fill", rectangle.color)
		rect.style.opacity = rectangle.opacity
		rect.style.pointerEvents = "none"
		return rect
	}

	function buildHtmlRectangle(grid, group, rectangle) {
		const box = rectangleBox(grid, rectangle)
		const element = document.createElement("div")
		element.setAttribute(OVERLAY_ATTR, group)
		Object.assign(element.style, {
			position: "absolute",
			overflow: "hidden",
			pointerEvents: "none",
			left: box.left + "px",
			top: box.top + "px",
			width: box.width + "px",
			height: box.height + "px",
			backgroundColor: rectangle.color,
			opacity: rectangle.opacity,
		})
		return element
	}

	function removeOverlay() {
		document
			.querySelectorAll(`[${OVERLAY_ATTR}='parent']`)
			.forEach((node) => node.remove())
	}

	function overlayPresent() {
		return document.querySelector(`[${OVERLAY_ATTR}='parent']`) !== null
	}

	function layoutFor(name, grid) {
		if (name in DEFAULT_GRIDS) return DEFAULT_GRIDS[name](grid.columns, grid.rows)
		if (name in settings.customGrids) return settings.customGrids[name]
		return null
	}

	function render() {
		removeOverlay()

		if (!settings.gridEnabled) return { enabled: false }

		const grid = findGrid()
		if (!grid) return { enabled: true, canvasFound: false }

		let overlay
		let build
		if (grid.kind === "svg") {
			overlay = document.createElementNS(SVG_NS, "g")
			overlay.style.pointerEvents = "none"
			build = buildSvgRectangle
		} else {
			if (getComputedStyle(grid.host).position === "static") {
				grid.host.style.position = "relative"
			}
			overlay = document.createElement("div")
			Object.assign(overlay.style, {
				position: "absolute",
				inset: "0",
				overflow: "hidden",
				pointerEvents: "none",
			})
			build = buildHtmlRectangle
		}
		overlay.setAttribute(OVERLAY_ATTR, "parent")

		for (const name of settings.gridStyles) {
			const layout = layoutFor(name, grid)
			if (!layout) continue
			for (const rectangle of layout) {
				overlay.appendChild(build(grid, name, rectangle))
			}
		}

		// First child, so Smartsheet's own grid lines and widgets paint above it.
		grid.host.prepend(overlay)
		observeCanvas(grid.host)
		return { enabled: true, canvasFound: true, columns: grid.columns, rows: grid.rows }
	}

	// --- Keeping the overlay in sync ---------------------------------------

	function observeCanvas(canvas) {
		if (observedCanvas === canvas) return
		if (resizeObserver) resizeObserver.disconnect()
		observedCanvas = canvas
		resizeObserver = new ResizeObserver(() => {
			if (settings.gridEnabled) render()
		})
		resizeObserver.observe(canvas)
	}

	// Smartsheet swaps the editor in and out without a page load, so watch
	// for the canvas to (re)appear and draw the overlay when it does.
	// (A timer is used rather than requestAnimationFrame, which never fires
	// while the tab is hidden.)
	let scheduled = null
	const domObserver = new MutationObserver(() => {
		if (!settings.gridEnabled || scheduled !== null) return
		scheduled = setTimeout(() => {
			scheduled = null
			// Cheap check first; the full grid search only runs when the
			// overlay is missing (editor just opened, or Smartsheet re-rendered).
			if (overlayPresent()) return
			if (findGrid()) render()
		}, 50)
	})
	domObserver.observe(document.documentElement, { childList: true, subtree: true })

	function loadSettings() {
		return chrome.storage.sync.get(STORAGE_DEFAULTS).then((items) => {
			settings = items
			return settings
		})
	}

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== "sync") return
		let changed = false
		for (const key of Object.keys(STORAGE_DEFAULTS)) {
			if (key in changes) {
				settings[key] = changes[key].newValue ?? STORAGE_DEFAULTS[key]
				changed = true
			}
		}
		if (changed) render()
	})

	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (!message || typeof message.type !== "string") return false

		switch (message.type) {
			case "getState":
				sendResponse({
					onDashboard: isDashboardPage(),
					canvasFound: findGrid() !== null,
					enabled: settings.gridEnabled,
				})
				return false
			case "refresh":
				loadSettings().then(() => {
					sendResponse({
						onDashboard: isDashboardPage(),
						...render(),
					})
				})
				return true // async response
			default:
				return false
		}
	})

	loadSettings().then(render)
})()
