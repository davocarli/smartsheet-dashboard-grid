chrome.action.onClicked.addListener((tab) => {
    imgUrl = chrome.runtime.getURL("images/dashboardGrid.png");
    chrome.storage.local.set({imgUrl: imgUrl});
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['addGrid.js']
    });
});