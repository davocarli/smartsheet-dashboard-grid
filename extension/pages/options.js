"use strict"

const DEFAULT_GRIDS = globalThis.SSGH_DEFAULT_GRIDS
const RESERVED_NAMES = globalThis.SSGH_RESERVED_NAMES
const STORAGE_DEFAULTS = globalThis.SSGH_STORAGE_DEFAULTS

const builtInList = document.getElementById("built-in-list")
const customList = document.getElementById("custom-list")
const statusEl = document.getElementById("status")
const editorEl = document.getElementById("add-grid")
const editorStatusEl = document.getElementById("editor-status")
const nameInput = document.getElementById("custom-grid-name")
const layoutInput = document.getElementById("custom-grid-layout")

let customGrids = {}
let gridStyles = []

function setStatus(element, text, timeoutMs) {
	element.textContent = text
	if (timeoutMs) {
		setTimeout(() => {
			if (element.textContent === text) element.textContent = ""
		}, timeoutMs)
	}
}

function createRow(name, { editable = false } = {}) {
	const row = document.createElement("div")
	row.className = "row"

	const checkbox = document.createElement("input")
	checkbox.type = "checkbox"
	checkbox.name = "gridStyle"
	checkbox.value = name
	checkbox.id = "style-" + name
	checkbox.checked = gridStyles.includes(name)

	const label = document.createElement("label")
	label.htmlFor = checkbox.id
	label.textContent = name

	row.append(checkbox, label)

	if (editable) {
		const edit = document.createElement("button")
		edit.type = "button"
		edit.textContent = "Edit"
		edit.addEventListener("click", () => editGrid(name))

		const remove = document.createElement("button")
		remove.type = "button"
		remove.className = "danger"
		remove.textContent = "Remove"
		remove.addEventListener("click", () => removeGrid(name))

		row.append(edit, remove)
	}

	return row
}

function renderLists() {
	builtInList.replaceChildren(
		...Object.keys(DEFAULT_GRIDS).map((name) => createRow(name))
	)

	const customNames = Object.keys(customGrids)
	if (customNames.length === 0) {
		const empty = document.createElement("p")
		empty.className = "empty"
		empty.textContent = "No custom layouts yet."
		customList.replaceChildren(empty)
	} else {
		customList.replaceChildren(
			...customNames.map((name) => createRow(name, { editable: true }))
		)
	}
}

async function restoreOptions() {
	const items = await chrome.storage.sync.get(STORAGE_DEFAULTS)
	customGrids = items.customGrids
	gridStyles = items.gridStyles
	renderLists()
}

function selectedStyles() {
	return [...document.querySelectorAll('input[name="gridStyle"]:checked')].map(
		(input) => input.value
	)
}

async function saveOptions() {
	gridStyles = selectedStyles()
	await chrome.storage.sync.set({ gridStyles })
	setStatus(statusEl, "Selection saved.", 1500)
}

function showEditor(name = "", layout = "") {
	nameInput.value = name
	layoutInput.value = layout
	setStatus(editorStatusEl, "")
	editorEl.hidden = false
	nameInput.focus()
}

function hideEditor() {
	editorEl.hidden = true
}

function parseLayout(text) {
	let source = text.trim()
	if (source.endsWith(",")) source = source.slice(0, -1)
	if (!source.startsWith("[")) source = "[" + source + "]"

	const layout = JSON.parse(source)
	if (!Array.isArray(layout) || layout.length === 0) {
		throw new Error("The layout must contain at least one rectangle.")
	}
	layout.forEach((rectangle, index) => {
		for (const key of ["height", "width", "x", "y"]) {
			if (typeof rectangle[key] !== "number") {
				throw new Error(`Rectangle ${index + 1} is missing a numeric "${key}".`)
			}
		}
		if (typeof rectangle.color !== "string") {
			throw new Error(`Rectangle ${index + 1} is missing a "color".`)
		}
		if (rectangle.opacity === undefined) rectangle.opacity = "100%"
	})
	return layout
}

async function saveCustomGrid() {
	const name = nameInput.value.trim()
	if (!name) {
		setStatus(editorStatusEl, "Give the layout a name.")
		return
	}
	if (RESERVED_NAMES.includes(name)) {
		setStatus(editorStatusEl, `"${name}" is reserved. Choose another name.`)
		return
	}

	let layout
	try {
		layout = parseLayout(layoutInput.value)
	} catch (error) {
		setStatus(editorStatusEl, "Could not read the layout: " + error.message)
		return
	}

	customGrids[name] = layout
	await chrome.storage.sync.set({ customGrids })
	hideEditor()
	renderLists()
	setStatus(statusEl, `Saved "${name}".`, 1500)
}

function editGrid(name) {
	showEditor(name, JSON.stringify(customGrids[name], null, 0).slice(1, -1).replaceAll("},{", "},\n{"))
}

async function removeGrid(name) {
	if (!confirm(`Remove the custom layout "${name}"?`)) return
	delete customGrids[name]
	gridStyles = gridStyles.filter((style) => style !== name)
	await chrome.storage.sync.set({ customGrids, gridStyles })
	renderLists()
	setStatus(statusEl, `Removed "${name}".`, 1500)
}

document.getElementById("save").addEventListener("click", saveOptions)
document.getElementById("add").addEventListener("click", () => showEditor())
document.getElementById("new-grid").addEventListener("click", saveCustomGrid)
document.getElementById("cancel-grid").addEventListener("click", hideEditor)

restoreOptions()
