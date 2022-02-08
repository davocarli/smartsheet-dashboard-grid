// chrome.contextMenus.removeAll();
// chrome.contextMenus.create({
//     title: "Select Grid Style",
//     contexts: ["action"],
//     id: "gridOptions",
//     checked: true,
// });
// chrome.contextMenus.onClicked.addListener(function(option) {
//     if (option.menuItemId == 'gridOptions') {
//         console.log('Open Options');
//     }
// });

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['addGrid.js']
    });
});