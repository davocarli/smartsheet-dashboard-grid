// Service worker. Content scripts cannot open the options page themselves,
// so the panel in Smartsheet's toolbar asks for it here.
chrome.runtime.onMessage.addListener((message) => {
	if (message && message.type === "openOptionsPage") {
		chrome.runtime.openOptionsPage()
	}
})
