defaultGrids = {
    "12Columns":    [
        // Height of -1 will extend all the way down infinitely starting from y coordinate.
        // Width of -1 will extend all the way to the right infinitely starting from x coordinate.
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 2, "y":0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 9, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 16, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 23, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 30, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 37, "y": 0},
        
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 46, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 53, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 60, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 67, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 74, "y": 0},
        {"color": "Red", "opacity": "20%", "height": -1, "width": 6, "x": 81, "y": 0},
        ],
    "markCenter": [
        {"color": "Green", "opacity": "50%", "height": -1, "width": 1, "x": 44, "y": 0},
    ]
}

function toggleHighlight(gridStyle, customGrids) {

    existing = document.querySelectorAll("[data-grid-overlay='parent']");
    if (existing.length > 0) {
        for (i = existing.length - 1; i >= 0; i--) {
            existing[i].remove();
        }
    } else {
        chosenLayout = null;
        if (gridStyle in defaultGrids) {
            chosenLayout = defaultGrids[gridStyle];
        } else {
            chosenLayout = customGrids[gridStyle];
        }
        parent = document.querySelectorAll("[data-client-id='dab-dui-2']")[0];
        gridDimensions = parent.style.backgroundSize.replaceAll('px', '').split(' ');
        x = parseInt(gridDimensions[0]);
        y = parseInt(gridDimensions[1]);

        newHTML = '<div style="position: relative; overflow: hidden; height: 100%; width: 100;" data-grid-overlay="parent">'

        for (i = 0; i < chosenLayout.length; i++) {
            column = chosenLayout[i];
            leftPosition = (x * column.x) + 'px';
            topPosition = (y * column.y) + 'px';
            height = null;
            width = null;
            if (column.height == -1) {
                height = '100%';
            } else {
                height = (y * column.height) + 'px';
            }
            if (column.width == -1) {
                width = '100%';
            } else {
                width = (x * column.width) + 'px';
            }
            gridHighlightElement = "<div data-grid-overlay=\"" + i + "\" style=\"height: " + height + "; width: " + width + ";  background-color: " + column.color + "; opacity: " + column.opacity + "; position: absolute; left: " + leftPosition + "; top: " + topPosition + "; overflow: hidden;\"></div>"
            newHTML += gridHighlightElement;
        }

        parent.innerHTML = newHTML + "</div>";
    }
}

chrome.storage.sync.get({
    gridStyle: '12Columns',
    customGrids: {},
}, function(items) {
    toggleHighlight(items.gridStyle, items.customGrids);
});

// toggleHighlight();