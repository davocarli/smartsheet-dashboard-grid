// Content script: draws the overlay on Smartsheet's dashboard editor and
// adds a "Grid Helper" button next to "Widget Settings" in the editor
// toolbar, which opens a panel with the same controls as the toolbar popup.
//
// Settings live in chrome.storage.sync. Both the in-page panel and the
// extension popup (popup/popup.js) write there; this script re-renders when
// storage changes, when the editor canvas appears (Smartsheet is a
// single-page app) or when the canvas is resized.
(function () {
	"use strict"

	if (globalThis.__ssGridHelperLoaded) return
	globalThis.__ssGridHelperLoaded = true

	const DEFAULT_GRIDS = globalThis.SSGH_DEFAULT_GRIDS
	const STORAGE_DEFAULTS = globalThis.SSGH_STORAGE_DEFAULTS
	const OVERLAY_ATTR = "data-grid-overlay"
	const CANVAS_SELECTOR = "[data-client-id='dab-dui-2']"
	const SVG_NS = "http://www.w3.org/2000/svg"
	const PANEL_WIDTH = 300
	// Smartsheet's "Widget Settings" toolbar button; ours goes right after it.
	const WIDGET_SETTINGS_SELECTOR = "button[data-client-id='dab-drn-2']"

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
		if (!isDashboardPage()) return null
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

	// --- Toolbar button --------------------------------------------------------

	let toolbarButton = null

	function findWidgetSettingsButton() {
		const known = document.querySelector(WIDGET_SETTINGS_SELECTOR)
		if (known) return known
		// Smartsheet keeps hidden copies of the toolbar for measuring; skip those.
		for (const button of document.querySelectorAll('button[aria-label="Widget Settings"]')) {
			if (!button.closest("[data-sds-toolbar2-h], [data-sds-toolbar2-h-i]")) return button
		}
		return null
	}

	function gridIcon() {
		const svg = document.createElementNS(SVG_NS, "svg")
		svg.setAttribute("xmlns", SVG_NS)
		svg.setAttribute("width", "20")
		svg.setAttribute("height", "20")
		svg.setAttribute("viewBox", "0 0 20 20")
		svg.setAttribute("fill", "none")
		svg.setAttribute("aria-hidden", "true")
		const path = document.createElementNS(SVG_NS, "path")
		path.setAttribute("stroke", "currentColor")
		path.setAttribute("stroke-width", "1.4")
		path.setAttribute("stroke-linecap", "round")
		path.setAttribute(
			"d",
			"M7.3 3.5v13M12.7 3.5v13M3.5 7.3h13M3.5 12.7h13"
		)
		svg.appendChild(path)
		return svg
	}

	// Clone Smartsheet's own button so ours matches the current build's styling,
	// then swap in our icon, label and behaviour. The clone has no React
	// fiber, so Smartsheet's handlers ignore it.
	function buildToolbarButton(anchor) {
		const button = anchor.cloneNode(true)
		button.setAttribute("data-grid-helper", "button")
		button.removeAttribute("data-client-id")
		button.removeAttribute("data-focusable-item")
		button.removeAttribute("id")
		button.setAttribute("aria-label", "Grid Helper")
		button.setAttribute("aria-pressed", "false")
		button.setAttribute("aria-haspopup", "dialog")
		button.setAttribute("aria-disabled", "false")
		button.tabIndex = 0

		const existingIcon = button.querySelector("svg")
		if (existingIcon) existingIcon.replaceWith(gridIcon())
		else button.prepend(gridIcon())

		const label = button.querySelector(".sds-button-content")
		if (label) label.textContent = "Grid Helper"

		button.addEventListener("click", (event) => {
			event.preventDefault()
			event.stopPropagation()
			togglePanel()
		})
		return button
	}

	function ensureToolbarButton() {
		if (toolbarButton && toolbarButton.isConnected) return
		toolbarButton = null
		const anchor = findWidgetSettingsButton()
		if (!anchor) {
			if (panelOpen) closePanel()
			return
		}
		toolbarButton = buildToolbarButton(anchor)
		anchor.insertAdjacentElement("afterend", toolbarButton)
		if (panelOpen) positionPanel()
	}

	// --- In-page panel -----------------------------------------------------

	let panelHost = null
	let panelControls = null
	let panelOpen = false

	function smartsheetTheme() {
		const key = (document.body && document.body.dataset.smarThemeKey) || ""
		return /dark/i.test(key) ? "theme-dark" : "theme-light"
	}

	function createPanel() {
		panelHost = document.createElement("div")
		panelHost.setAttribute("data-grid-helper", "panel")
		panelHost.setAttribute("role", "dialog")
		panelHost.setAttribute("aria-label", "Grid Helper")
		Object.assign(panelHost.style, {
			position: "fixed",
			top: "0",
			left: "0",
			zIndex: "2147483646",
			overflowY: "auto",
			borderRadius: "8px",
			boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
		})

		const shadow = panelHost.attachShadow({ mode: "open" })
		const stylesheet = document.createElement("link")
		stylesheet.rel = "stylesheet"
		stylesheet.href = chrome.runtime.getURL("popup/popup.css")
		const extra = document.createElement("style")
		extra.textContent = ".ssgh-root { border: 1px solid var(--border); border-radius: 8px; }"

		panelControls = globalThis.SSGH_createControls({
			onEnabledChange: (enabled) => chrome.storage.sync.set({ gridEnabled: enabled }),
			onStyleChange: (name, enabled) => {
				const styles = settings.gridStyles.filter((style) => style !== name)
				if (enabled) styles.push(name)
				chrome.storage.sync.set({ gridStyles: styles })
			},
			onOpenOptions: () => chrome.runtime.sendMessage({ type: "openOptionsPage" }),
			onClose: closePanel,
		})
		panelControls.element.classList.add(smartsheetTheme())
		shadow.append(stylesheet, extra, panelControls.element)
	}

	function positionPanel() {
		if (!panelHost || !toolbarButton) return
		const rect = toolbarButton.getBoundingClientRect()
		const margin = 8
		const top = Math.round(rect.bottom + 6)
		const left = Math.round(
			Math.max(margin, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - margin))
		)
		panelHost.style.top = top + "px"
		panelHost.style.left = left + "px"
		panelHost.style.maxHeight = Math.max(120, window.innerHeight - top - margin) + "px"
	}

	function updatePanelNotice(state) {
		if (!panelControls) return
		if (state && state.enabled && state.canvasFound === false) {
			panelControls.setNotice(
				"The grid shows in the dashboard's editing view. Open the editor (pencil icon) and it will appear."
			)
		} else {
			panelControls.setNotice("")
		}
	}

	function onDocumentPointerDown(event) {
		const path = event.composedPath()
		if (path.includes(panelHost) || path.includes(toolbarButton)) return
		closePanel()
	}

	function onDocumentKeyDown(event) {
		if (event.key === "Escape") {
			closePanel()
			if (toolbarButton) toolbarButton.focus()
		}
	}

	function openPanel() {
		if (!panelHost) createPanel()
		panelControls.element.classList.remove("theme-light", "theme-dark")
		panelControls.element.classList.add(smartsheetTheme())
		panelControls.update(settings)
		updatePanelNotice({ enabled: settings.gridEnabled, canvasFound: findGrid() !== null })
		document.body.appendChild(panelHost)
		panelOpen = true
		positionPanel()
		if (toolbarButton) toolbarButton.setAttribute("aria-pressed", "true")
		document.addEventListener("pointerdown", onDocumentPointerDown, true)
		document.addEventListener("keydown", onDocumentKeyDown, true)
		window.addEventListener("resize", positionPanel)
		window.addEventListener("scroll", positionPanel, true)
	}

	function closePanel() {
		if (!panelOpen) return
		panelOpen = false
		if (panelHost) panelHost.remove()
		if (toolbarButton) toolbarButton.setAttribute("aria-pressed", "false")
		document.removeEventListener("pointerdown", onDocumentPointerDown, true)
		document.removeEventListener("keydown", onDocumentKeyDown, true)
		window.removeEventListener("resize", positionPanel)
		window.removeEventListener("scroll", positionPanel, true)
	}

	function togglePanel() {
		if (panelOpen) closePanel()
		else openPanel()
	}

	// --- Keeping everything in sync ------------------------------------------

	function observeCanvas(canvas) {
		if (observedCanvas === canvas) return
		if (resizeObserver) resizeObserver.disconnect()
		observedCanvas = canvas
		resizeObserver = new ResizeObserver(() => {
			if (settings.gridEnabled) render()
		})
		resizeObserver.observe(canvas)
	}

	// Smartsheet swaps the editor and its toolbar in and out without a page
	// load, so watch the DOM and re-add the button / overlay when they vanish.
	// (A timer is used rather than requestAnimationFrame, which never fires
	// while the tab is hidden.)
	let scheduled = null
	function sync() {
		scheduled = null
		ensureToolbarButton()
		// Cheap check first; the full grid search only runs when the overlay
		// is missing (editor just opened, or Smartsheet re-rendered).
		if (settings.gridEnabled && !overlayPresent() && findGrid()) {
			updatePanelNotice(render())
		}
	}
	const domObserver = new MutationObserver(() => {
		if (scheduled !== null) return
		scheduled = setTimeout(sync, 50)
	})
	domObserver.observe(document.documentElement, { childList: true, subtree: true })

	function loadSettings() {
		return chrome.storage.sync.get(STORAGE_DEFAULTS).then((items) => {
			settings = items
			return settings
		})
	}

	function applySettings() {
		const state = render()
		if (panelOpen) {
			panelControls.update(settings)
			updatePanelNotice(state)
		}
		return state
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
		if (changed) applySettings()
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
						...applySettings(),
					})
				})
				return true // async response
			default:
				return false
		}
	})

	loadSettings().then(() => {
		ensureToolbarButton()
		render()
	})
})()
