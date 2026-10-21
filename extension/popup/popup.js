// Popup: the extension's controls, opened by clicking the toolbar icon.
//
// Settings live in chrome.storage.sync. The content script (addGrid.js)
// listens for storage changes and re-renders the overlay on its own, so the
// popup only needs to save; the explicit "refresh" message is used to learn
// whether the editor canvas was found so the user can be told if not.
"use strict"

const DEFAULT_GRIDS = globalThis.SSGH_DEFAULT_GRIDS
const STORAGE_DEFAULTS = globalThis.SSGH_STORAGE_DEFAULTS
const SMARTSHEET_ORIGIN = "https://app.smartsheet.com/"

const noticeEl = document.getElementById("notice")
const controlsEl = document.getElementById("controls")
const enableEl = document.getElementById("enable-grid")
const builtInEl = document.getElementById("built-in-layouts")
const customEl = document.getElementById("custom-layouts")

let settings = { ...STORAGE_DEFAULTS }
let activeTab = null

function showNotice(text) {
	noticeEl.textContent = text
	noticeEl.hidden = !text
}

function createToggle(name, checked) {
	const label = document.createElement("label")
	label.className = "toggle"

	const input = document.createElement("input")
	input.type = "checkbox"
	input.checked = checked
	input.dataset.style = name
	input.addEventListener("change", () => setStyleEnabled(name, input.checked))

	const switchEl = document.createElement("span")
	switchEl.className = "switch"
	switchEl.setAttribute("aria-hidden", "true")

	const text = document.createElement("span")
	text.className = "label"
	text.textContent = name

	label.append(input, switchEl, text)
	return label
}

function renderToggles() {
	enableEl.checked = settings.gridEnabled

	builtInEl.replaceChildren(
		...Object.keys(DEFAULT_GRIDS).map((name) =>
			createToggle(name, settings.gridStyles.includes(name))
		)
	)

	const customNames = Object.keys(settings.customGrids)
	if (customNames.length === 0) {
		const empty = document.createElement("p")
		empty.className = "empty"
		empty.textContent = "No custom layouts yet."
		customEl.replaceChildren(empty)
	} else {
		customEl.replaceChildren(
			...customNames.map((name) =>
				createToggle(name, settings.gridStyles.includes(name))
			)
		)
	}
}

async function setStyleEnabled(name, enabled) {
	const styles = settings.gridStyles.filter((style) => style !== name)
	if (enabled) styles.push(name)
	settings.gridStyles = styles
	await chrome.storage.sync.set({ gridStyles: styles })
	await refreshOverlay()
}

async function setGridEnabled(enabled) {
	settings.gridEnabled = enabled
	await chrome.storage.sync.set({ gridEnabled: enabled })
	await refreshOverlay()
}

// Ask the content script to re-read storage and redraw. If the page was
// open before the extension was installed or reloaded, the content script
// is not there yet, so inject it and try again.
async function sendToTab(message, { inject = true } = {}) {
	try {
		return await chrome.tabs.sendMessage(activeTab.id, message)
	} catch (error) {
		if (!inject) throw error
		await chrome.scripting.executeScript({
			target: { tabId: activeTab.id },
			files: ["shared/grids.js", "addGrid.js"],
		})
		return sendToTab(message, { inject: false })
	}
}

async function refreshOverlay() {
	let state
	try {
		state = await sendToTab({ type: "refresh" })
	} catch (error) {
		console.error("Could not reach the Smartsheet tab", error)
		showNotice("Could not reach the Smartsheet tab. Reload the page and try again.")
		return
	}
	describeState(state)
}

function describeState(state) {
	if (!state) {
		showNotice("")
	} else if (!state.onDashboard) {
		showNotice("Open a Smartsheet dashboard to use the grid overlay.")
	} else if (state.enabled && state.canvasFound === false) {
		showNotice(
			"The grid shows in the dashboard's editing view. Open the editor (pencil icon) and it will appear."
		)
	} else {
		showNotice("")
	}
}

async function init() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	activeTab = tab

	if (!tab || !tab.url || !tab.url.startsWith(SMARTSHEET_ORIGIN)) {
		showNotice("Open a dashboard in Smartsheet (app.smartsheet.com) to use this extension.")
		return
	}

	settings = await chrome.storage.sync.get(STORAGE_DEFAULTS)

	// Drop any saved style that no longer exists (e.g. a deleted custom grid).
	const known = new Set([...Object.keys(DEFAULT_GRIDS), ...Object.keys(settings.customGrids)])
	const pruned = settings.gridStyles.filter((style) => known.has(style))
	if (pruned.length !== settings.gridStyles.length) {
		settings.gridStyles = pruned
		await chrome.storage.sync.set({ gridStyles: pruned })
	}

	renderToggles()
	controlsEl.hidden = false

	enableEl.addEventListener("change", () => setGridEnabled(enableEl.checked))

	try {
		describeState(await sendToTab({ type: "getState" }))
	} catch (error) {
		console.error("Could not reach the Smartsheet tab", error)
		showNotice("Could not reach the Smartsheet tab. Reload the page and try again.")
	}
}

function openOptions(event) {
	event.preventDefault()
	chrome.runtime.openOptionsPage()
}

document.getElementById("settings").addEventListener("click", openOptions)
document.getElementById("open-options").addEventListener("click", openOptions)

init()
