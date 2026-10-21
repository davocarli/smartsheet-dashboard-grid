// Toolbar popup: the extension's controls, opened by clicking the toolbar
// icon. This is the fallback for the button the content script adds to
// Smartsheet's own editor toolbar, and works even if that toolbar changes.
//
// Settings live in chrome.storage.sync. The content script (addGrid.js)
// listens for storage changes and re-renders the overlay on its own, so the
// popup only needs to save; the explicit "refresh" message is used to learn
// whether the editor canvas was found so the user can be told if not.
"use strict"

const STORAGE_DEFAULTS = globalThis.SSGH_STORAGE_DEFAULTS
const SMARTSHEET_ORIGIN = "https://app.smartsheet.com/"

let settings = { ...STORAGE_DEFAULTS }
let activeTab = null

const controls = globalThis.SSGH_createControls({
	onEnabledChange: setGridEnabled,
	onStyleChange: setStyleEnabled,
	onOpenOptions: () => chrome.runtime.openOptionsPage(),
})
document.body.appendChild(controls.element)

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
			files: ["shared/grids.js", "shared/controls.js", "addGrid.js"],
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
		controls.setNotice("Could not reach the Smartsheet tab. Reload the page and try again.")
		return
	}
	describeState(state)
}

function describeState(state) {
	if (!state) {
		controls.setNotice("")
	} else if (!state.onDashboard) {
		controls.setNotice("Open a Smartsheet dashboard to use the grid overlay.")
	} else if (state.enabled && state.canvasFound === false) {
		controls.setNotice(
			"The grid shows in the dashboard's editing view. Open the editor (pencil icon) and it will appear."
		)
	} else {
		controls.setNotice("")
	}
}

async function init() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	activeTab = tab

	if (!tab || !tab.url || !tab.url.startsWith(SMARTSHEET_ORIGIN)) {
		controls.setControlsVisible(false)
		controls.setNotice(
			"Open a dashboard in Smartsheet (app.smartsheet.com) to use this extension."
		)
		return
	}

	settings = await chrome.storage.sync.get(STORAGE_DEFAULTS)

	// Drop any saved style that no longer exists (e.g. a deleted custom grid).
	const known = new Set([
		...Object.keys(globalThis.SSGH_DEFAULT_GRIDS),
		...Object.keys(settings.customGrids),
	])
	const pruned = settings.gridStyles.filter((style) => known.has(style))
	if (pruned.length !== settings.gridStyles.length) {
		settings.gridStyles = pruned
		await chrome.storage.sync.set({ gridStyles: pruned })
	}

	controls.update(settings)

	// Keep in step with changes made from the in-page panel or options page.
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== "sync") return
		for (const key of Object.keys(STORAGE_DEFAULTS)) {
			if (key in changes) settings[key] = changes[key].newValue ?? STORAGE_DEFAULTS[key]
		}
		controls.update(settings)
	})

	try {
		describeState(await sendToTab({ type: "getState" }))
	} catch (error) {
		console.error("Could not reach the Smartsheet tab", error)
		controls.setNotice("Could not reach the Smartsheet tab. Reload the page and try again.")
	}
}

init()
