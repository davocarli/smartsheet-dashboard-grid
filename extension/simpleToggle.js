defaultGrids = {
    // Height of -1 will extend all the way down infinitely starting from y coordinate.
    // Width of -1 will extend all the way to the right infinitely starting from x coordinate.
    "Center Line": [
        // Center Column
        {"color": "Blue", "opacity": "30%", "height": -1, "width": 1, "x": 44, "y": 0},
    ],
    "11 Columns": [   
        // Left Side
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":2,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":10,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":18,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":26,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":34,"y":0},

        // Center
        {"color":"Red","height":-1,"opacity":"20%","width":5,"x":42,"y":0},

        // Right Side
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":49,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":57,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":65,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":73,"y":0},
        {"color":"Red","height":-1,"opacity":"20%","width":6,"x":81,"y":0}
        ],
    "4 Columns": [
        // 4 Quarters
        {"color":"Gray","height": -1,"opacity":"20%","width":21,"x":1,"y":0},
        {"color":"Gray","height": -1,"opacity":"20%","width":21,"x":23,"y":0},
        {"color":"Gray","height": -1,"opacity":"20%","width":21,"x":45,"y":0},
        {"color":"Gray","height": -1,"opacity":"20%","width":21,"x":67,"y":0},
    ],
}

function toggleHighlight(gridStyles, customGrids) {

    existing = document.querySelectorAll("[data-grid-overlay='parent']");
    if (existing.length > 0) {
        for (i = existing.length - 1; i >= 0; i--) {
            existing[i].remove();
        }
    } else {
        chosenLayout = [];
        for (i = 0; i < gridStyles.length; i++) {
            gridStyle = gridStyles[i];
            if (gridStyle in defaultGrids) {
                chosenLayout = chosenLayout.concat(defaultGrids[gridStyle]);
            } else {
                chosenLayout = chosenLayout.concat(customGrids[gridStyle]);
            }
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
    gridStyles: ['11 Columns'],
    customGrids: {},
}, function(items) {
    toggleHighlight(items.gridStyles, items.customGrids);
});