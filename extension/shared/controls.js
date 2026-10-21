// The Grid Helper controls: an "Enable" switch plus a switch per layout.
//
// Used by both the toolbar popup (popup/popup.js) and the panel the content
// script opens from the button it adds to Smartsheet's editor toolbar, so
// the two look and behave the same. Styling comes from popup/popup.css.
(function () {
	if (globalThis.SSGH_createControls) return

	const DEFAULT_GRIDS = globalThis.SSGH_DEFAULT_GRIDS
	const SVG_NS = "http://www.w3.org/2000/svg"

	function el(tag, props = {}, children = []) {
		const node = document.createElement(tag)
		for (const [key, value] of Object.entries(props)) {
			if (key === "className") node.className = value
			else if (key === "text") node.textContent = value
			else if (key === "dataset") Object.assign(node.dataset, value)
			else if (key === "hidden") node.hidden = value
			else node.setAttribute(key, value)
		}
		node.append(...children)
		return node
	}

	function icon(pathData) {
		const svg = document.createElementNS(SVG_NS, "svg")
		svg.setAttribute("viewBox", "0 0 24 24")
		svg.setAttribute("aria-hidden", "true")
		const path = document.createElementNS(SVG_NS, "path")
		path.setAttribute("fill", "currentColor")
		path.setAttribute("d", pathData)
		svg.appendChild(path)
		return svg
	}

	const ICONS = {
		more: "M12 16a2 2 0 11.001 3.999A2 2 0 0112 16zm0-6a2 2 0 11.001 3.999A2 2 0 0112 10zm0-6a2 2 0 11.001 3.999A2 2 0 0112 4z",
		close:
			"M17.657 6.343a1.6 1.6 0 010 2.263l-3.394 3.393 3.394 3.395a1.6 1.6 0 11-2.263 2.263L12 14.262l-3.393 3.395a1.6 1.6 0 11-2.263-2.263L9.737 12 6.343 8.606a1.6 1.6 0 112.263-2.263L12 9.736l3.394-3.393a1.6 1.6 0 012.263 0z",
	}

	function iconButton(title, pathData, onClick) {
		const button = el("button", {
			className: "icon-button",
			type: "button",
			title,
			"aria-label": title,
		})
		button.appendChild(icon(pathData))
		button.addEventListener("click", onClick)
		return button
	}

	function toggle(name, checked, onChange) {
		const input = el("input", { type: "checkbox" })
		input.checked = checked
		input.dataset.style = name
		input.addEventListener("change", () => onChange(input.checked))
		return el("label", { className: "toggle" }, [
			input,
			el("span", { className: "switch", "aria-hidden": "true" }),
			el("span", { className: "label", text: name }),
		])
	}

	/**
	 * Build the controls into a new element and return handles to update them.
	 *
	 * handlers:
	 *   onEnabledChange(enabled)      "Enable Grid Helper" switched
	 *   onStyleChange(name, enabled)  a layout switched
	 *   onOpenOptions()               options button / link clicked
	 *   onClose()                     optional; adds a close button when given
	 */
	globalThis.SSGH_createControls = function (handlers) {
		const enableInput = el("input", { type: "checkbox", id: "enable-grid" })
		enableInput.addEventListener("change", () =>
			handlers.onEnabledChange(enableInput.checked)
		)

		const notice = el("p", { className: "notice", hidden: true })
		const builtInList = el("div", { className: "toggle-list" })
		const customList = el("div", { className: "toggle-list" })

		const optionsLink = el("a", { href: "#", text: "options page" })
		optionsLink.addEventListener("click", (event) => {
			event.preventDefault()
			handlers.onOpenOptions()
		})

		const headerButtons = [iconButton("Options", ICONS.more, handlers.onOpenOptions)]
		if (handlers.onClose) {
			headerButtons.push(iconButton("Close", ICONS.close, handlers.onClose))
		}

		const main = el("main", {}, [
			el("section", { className: "section" }, [
				el("label", { className: "toggle" }, [
					enableInput,
					el("span", { className: "switch", "aria-hidden": "true" }),
					el("span", { className: "label", text: "Enable Grid Helper" }),
				]),
			]),
			el("section", { className: "section" }, [
				el("h2", { text: "Built-in Layouts" }),
				builtInList,
			]),
			el("section", { className: "section" }, [
				el("h2", { text: "Custom Layouts" }),
				customList,
				el("p", { className: "hint" }, [
					"Add or edit custom layouts in the ",
					optionsLink,
					".",
				]),
			]),
		])

		const root = el("div", { className: "ssgh-root" }, [
			el("header", { className: "header" }, [
				el("h1", { text: "Grid Helper" }),
				el("div", { className: "header-buttons" }, headerButtons),
			]),
			notice,
			main,
		])

		let current = null

		function update(settings) {
			current = settings
			enableInput.checked = settings.gridEnabled

			builtInList.replaceChildren(
				...Object.keys(DEFAULT_GRIDS).map((name) =>
					toggle(name, settings.gridStyles.includes(name), (on) =>
						handlers.onStyleChange(name, on)
					)
				)
			)

			const customNames = Object.keys(settings.customGrids)
			if (customNames.length === 0) {
				customList.replaceChildren(
					el("p", { className: "empty", text: "No custom layouts yet." })
				)
			} else {
				customList.replaceChildren(
					...customNames.map((name) =>
						toggle(name, settings.gridStyles.includes(name), (on) =>
							handlers.onStyleChange(name, on)
						)
					)
				)
			}
		}

		function setNotice(text) {
			notice.textContent = text || ""
			notice.hidden = !text
		}

		function setControlsVisible(visible) {
			main.hidden = !visible
		}

		return {
			element: root,
			update,
			setNotice,
			setControlsVisible,
			get settings() {
				return current
			},
		}
	}
})()
