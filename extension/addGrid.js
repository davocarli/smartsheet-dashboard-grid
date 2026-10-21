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

	let settings = { ...STORAGE_DEFAULTS }
	let observedCanvas = null
	let resizeObserver = null

	// --- Editor canvas -----------------------------------------------------

	function parseGridSize(element) {
		if (!element || !element.style) return null
		const match = element.style.backgroundSize.match(
			/^\s*(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s*$/
		)
		if (!match) return null
		const x = parseFloat(match[1])
		const y = parseFloat(match[2])
		if (!(x > 0) || !(y > 0)) return null
		return { x, y }
	}

	// Smartsheet's editor canvas is the element whose inline background-size
	// holds the grid square dimensions. The known client id is tried first,
	// with a fallback search in case Smartsheet renames it.
	function findCanvas() {
		const known = document.querySelector(CANVAS_SELECTOR)
		if (parseGridSize(known)) return known

		const candidates = document.querySelectorAll('[style*="background-size"]')
		for (const candidate of candidates) {
			if (parseGridSize(candidate)) return candidate
		}
		return null
	}

	function isDashboardPage() {
		return location.pathname.startsWith("/dashboards/")
	}

	// --- Rendering ---------------------------------------------------------

	function buildRectangle(size, group, rectangle) {
		const element = document.createElement("div")
		element.setAttribute(OVERLAY_ATTR, group)
		Object.assign(element.style, {
			position: "absolute",
			overflow: "hidden",
			pointerEvents: "none",
			left: size.x * rectangle.x + "px",
			top: size.y * rectangle.y + "px",
			height: rectangle.height === -1 ? "100%" : size.y * rectangle.height + "px",
			width: rectangle.width === -1 ? "100%" : size.x * rectangle.width + "px",
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

	function layoutFor(name) {
		if (name in DEFAULT_GRIDS) return DEFAULT_GRIDS[name]
		if (name in settings.customGrids) return settings.customGrids[name]
		return null
	}

	function render() {
		removeOverlay()

		if (!settings.gridEnabled) return { enabled: false }

		const canvas = findCanvas()
		if (!canvas) return { enabled: true, canvasFound: false }

		const size = parseGridSize(canvas)
		if (getComputedStyle(canvas).position === "static") {
			canvas.style.position = "relative"
		}

		const overlay = document.createElement("div")
		overlay.setAttribute(OVERLAY_ATTR, "parent")
		Object.assign(overlay.style, {
			position: "absolute",
			inset: "0",
			overflow: "hidden",
			pointerEvents: "none",
		})

		for (const name of settings.gridStyles) {
			const layout = layoutFor(name)
			if (!layout) continue
			for (const rectangle of layout) {
				overlay.appendChild(buildRectangle(size, name, rectangle))
			}
		}

		// First child, so anything Smartsheet positions inside the canvas paints above it.
		canvas.prepend(overlay)
		observeCanvas(canvas)
		return { enabled: true, canvasFound: true }
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
			const canvas = findCanvas()
			const overlayPresent = canvas && canvas.querySelector(`[${OVERLAY_ATTR}='parent']`)
			if (canvas && !overlayPresent) render()
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
					canvasFound: findCanvas() !== null,
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
