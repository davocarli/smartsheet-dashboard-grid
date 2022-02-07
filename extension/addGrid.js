gridLayouts = {
    "12Columns":    [
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 3, 'y':0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 10, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 17, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 24, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 31, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 38, 'y': 0},

        {'color': 'Blue', 'opacity': '20%', 'height': -1, 'width': 1, 'x': 44, 'y': 0},
        
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 45, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 52, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 59, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 66, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 73, 'y': 0},
        {'color': 'Red', 'opacity': '20%', 'height': -1, 'width': 6, 'x': 80, 'y': 0},
    ]
}

chrome.storage.local.get('imgUrl', function (imgUrl) {
    toggleHighlight(imgUrl.imgUrl);
    chrome.storage.local.remove('imgUrl');
});

function toggleHighlight(imgUrl) {

    // var gridElement = document.getElementById('grid-highlight');
    existing = document.querySelectorAll("[data-grid-overlay]");
    if (existing.length > 0) {
        for (i = existing.length - 1; i >= 0; i--) {
            existing[i].remove();
        }
    } else {
        chosenLayout = gridLayouts['12Columns'];
        parent = document.querySelectorAll("[data-client-id='dab-dui-2']")[0];
        // gridWidth = parent.offsetWidth / chosenLayout.length;
        gridDimensions = parent.style.backgroundSize.replaceAll('px', '').split(' ');
        x = parseInt(gridDimensions[0]);
        y = parseInt(gridDimensions[1]);

        newHTML = '<div style="position: relative; overflow: hidden; height: 100%; width: 100;" data-grid-overlay="parent">'

        for (i = 0; i < chosenLayout.length; i++) {
            column = chosenLayout[i];
            left = (x * column['x']) + 'px';
            top = (y * column['y']) + 'px';
            height = null;
            width = null;
            if (column['height'] == -1) {
                height = '100%';
            } else {
                height = (y * column['height']) + 'px';
            }
            if (column['width'] == -1) {
                width = '100%';
            } else {
                width = (x * column['width']) + 'px';
            }
            // if (column['filled']) {
            gridHighlightElement = "<div data-grid-overlay=\"" + i + "\" style=\"height: " + height + "; width: " + width + ";  background-color: " + column['color'] + "; opacity: " + column['opacity'] + "; position: absolute; left: " + left + "; top: " + top + "; overflow: hidden;\"></div>"
                // gridHighlightElement = "<div data-grid-overlay=\"" + column['columnNumber'] + "\" style=\"width: " + gridWidth + "%; background-color: " + column['color'] + "; opacity: " + column['opacity'] + "; margin-left: " + (gridWidth * column['columnNumber']) + "%; pointer-events: none; z-index: 5000;\" class=\"dashboard-helper-grid dashboard-helper-grid--active\"></div>"
            newHTML += gridHighlightElement;
                // parent.innerHTML += gridHighlightElement;
                // parent.insertAdjacentHTML('afterend', gridHighlightElement);
            // }
            // if (chosenLayout[i] == 1) {
            //     gridHighlightElement = "<div data-grid-overlay=\"" + i + "\" style=\"width: " + gridWidth + "%; background-color: Red; opacity: 10%; margin-left: " + (gridWidth * i) + "%; pointer-events: none; z-index: 5000;\" class=\"dashboard-helper-grid dashboard-helper-grid--active\"></div>"
            //     parent.insertAdjacentHTML('afterend', gridHighlightElement);
            // } else {
            //     console.log('no grid');
            // }
        }

        parent.innerHTML = newHTML + "</div>";
        
        // gridHighlightElement = "<div id=\"grid-highlight\" class=\"dashboard-helper-grid dashboard-helper-grid--active\" style=\"background-size: 100%; background-image:url('" + imgUrl + "'); opacity: 30%; pointer-events: none; z-index: 5000;\"></div>"

        // parent = document.querySelectorAll("[data-client-id='dab-dui-2']")[0];
        
        // parent.insertAdjacentHTML('afterend', gridHighlightElement);
        
    }
}
