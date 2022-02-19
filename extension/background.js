chrome.runtime.onMessage.addListener(function(message) {
    switch (message.action) {
        case "openOptionsPage":
            chrome.runtime.openOptionsPage();
            break;
        default:
            break;
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['simpleToggle.js']
    });
});

// add listener for injecting content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status != "complete" || !tab.url || !tab.url.startsWith("https://app.smartsheet.com/dashboards/")) {
    return;
    };


    chrome.scripting.executeScript(
      { target: { tabId }, files: ["addGrid.js"] },
      () => {
        const { lastError } = chrome.runtime;
        if (lastError) {
          if (!tab.url.startsWith("chrome-extension://") && !tab.url.startsWith("chrome://newtab/")) {
            console.error(
              `Script injection failed: ${lastError.message} running on tab: ${tab.url} with tab ID: ${tabId}`,
            );
          }
        }
      },
    );
  });