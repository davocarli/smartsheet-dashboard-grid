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
customGrids = null;
selectedStyles = null;
chrome.storage.sync.get({
    gridStyles: [],
    customGrids: {},
}, function(items) {
    customGrids = items.customGrids;
    selectedStyles = items.gridStyles;
})

function removeHighlights(group) {
    existing = document.querySelectorAll("[data-grid-overlay='" + group + "']");
    if (existing.length > 0) {
        for (let i = existing.length - 1; i >= 0; i--) {
            existing[i].remove();
        }
    }
}

function gridIsEnabled() {
    return document.querySelectorAll("[data-grid-overlay='parent']").length > 0;
}

function getCurrentDimensions() {
    parent = document.querySelectorAll("[data-client-id='dab-dui-2']")[0];
    gridDimensions = parent.style.backgroundSize.replaceAll('px', '').split(' ');
    x = parseInt(gridDimensions[0]);
    y = parseInt(gridDimensions[1]);
    return [x, y];
}

function buildRectangle(x, y, name, rectangle) {
    leftPosition = (x * rectangle.x) + 'px';
    topPosition = (y * rectangle.y) + 'px';
    height = null;
    width = null;
    if (rectangle.height == -1) {
        height = '100%';
    } else {
        height = (y * rectangle.height) + 'px';
    }
    if (rectangle.width == -1) {
        width = '100%';
    } else {
        width = (x * rectangle.width) + 'px';
    }
    gridHighlightElement = "<div data-grid-overlay=\"" + name + "\" style=\"height: " + height + "; width: " + width + ";  background-color: " + rectangle.color + "; opacity: " + rectangle.opacity + "; position: absolute; left: " + leftPosition + "; top: " + topPosition + "; overflow: hidden;\"></div>"
    return gridHighlightElement;
}

function createParent() {
    document.querySelectorAll("[data-client-id='dab-dui-2']")[0].innerHTML = '<div style="position: relative; overflow: hidden; height: 100%; width: 100;" data-grid-overlay="parent"></div>'
}

function addHighlights(name, specs) {
    if (!gridIsEnabled()) return;

    gridParent = document.querySelector("[data-grid-overlay='parent']");
    // parent = parent[0];
    [x, y] = getCurrentDimensions();
    newHTML = ''
    for (let j = 0; j < specs.length; j++) {
        newHTML += buildRectangle(x, y, name, specs[j]);
    }
    gridParent.innerHTML += newHTML;
}

function gridButtonClicked(e) {
    path = e.path;
    for (let i = 0; i < path.length; i++) {
        elem = path[i];
        if (elem.tagName == "BUTTON") {
            // Is one of the Right Rail Buttons
            if (elem.dataset.clientId == "grid-helper-button") {
                return true;
            }
            return false;
        }
    }
    return null;
}

function closeSmartsheetPanel() {
    activeButton = document.getElementsByClassName('dashboard-right-rail__button-hover-wrapper--active')[0].firstChild;
    activeButton.click();
}

function openSettings() {
    chrome.runtime.sendMessage({"action": "openOptionsPage"});
}

function removeSelectedStyle(style) {
    currentIndex = selectedStyles.indexOf(style);
    if (currentIndex !== -1) {
        selectedStyles.splice(currentIndex, 1);
    }
}

function handleToggle(enabled, clientId) {
    if (clientId == "Enable Grid Helper") {
        if (enabled) {
            createParent();
            for (let i = 0; i < selectedStyles.length; i++) {
                style = selectedStyles[i];
                if (style in defaultGrids) {
                    addHighlights(style, defaultGrids[style]);
                } else if (style in customGrids) {
                    addHighlights(style, customGrids[style]);
                } else {
                    removeSelectedStyle(style);
                    chrome.storage.sync.set({gridStyles: selectedStyles});
                }
            }
        } else {
            removeHighlights('parent');
        }
    } else {
        if (enabled) {
            // Show rectangles
            if (clientId in defaultGrids) {
                addHighlights(clientId, defaultGrids[clientId]);
            } else if (clientId in customGrids) {
                addHighlights(clientId, customGrids[clientId]);
            } 
            // Add to selectedStyles
            if (!selectedStyles.includes(clientId)) selectedStyles.push(clientId);
        } else {
            // Remove rectangles
            removeHighlights(clientId);
            // Remove from selectedStyles
            removeSelectedStyle(clientId);
        }
        // Save selectedStyles
        chrome.storage.sync.set({gridStyles: selectedStyles});
    }
}

function switchToggle(e) {
    label = null;
    // Locate the label tag
    for (i = 0; i < e.path.length; i++) {
        element = e.path[i];
        if (element.nodeName == "LABEL") {
            label = element;
            break;
        }
    }
    checkbox = label.getElementsByTagName('div')[1];
    
    if (checkbox.classList.contains('css-17sgdyk')) {
        // Is currently checked (and being unchecked)
        checkbox.classList.remove('css-17sgdyk');
        checkbox.classList.add('css-1dfg2qw');
        clientId = label.dataset.clientId.slice(12);
        handleToggle(false, clientId);
    } else if (checkbox.classList.contains('css-1dfg2qw')) {
        // Is currently unchecked (and being checked)
        checkbox.classList.remove('css-1dfg2qw');
        checkbox.classList.add('css-17sgdyk');
        clientId = label.dataset.clientId.slice(12);
        handleToggle(true, clientId);
    }
}

function setPanelListeners() {
    // Close Button
    document.querySelectorAll("[data-client-id='grid-helper-close']")[0]
        .addEventListener('click', closeRightPanel);
    
    // Settings (More) Button
    document.querySelectorAll("[data-client-id='grid-helper-settings']")[0]
        .addEventListener('click', openSettings);

    document.querySelectorAll("[data-client-id^='grid-toggle']").forEach((toggle) =>{
        toggle.addEventListener('click', switchToggle);
    });
}

function createToggle(name, checked) {
    className = 'css-1dfg2qw'; // Unchecked
    if (checked) {
        className = 'css-17sgdyk'; // Checked
    }
    return `
    <div class="widget-title-accordion__title-form-group form-group">
        <label data-client-id="grid-toggle-${name}" class="widget-title-accordion__show-title-toggle css-10lfpea">
            <div class="css-vrslyn">
                <div class="lodestar--focus-using-before ${className}">
                        <span height="24px" width="24px" aria-hidden="true" role="presentation" color="#ffffff" class="css-ri6vi7">
                            <svg viewBox="0 0 24 24">
                                <g fill="none" fill-rule="evenodd">
                                    <path d="M0 0h24v24H0z"></path>
                                    <path fill="currentColor" fill-rule="nonzero" d="M18.216 5.24l.027.017c.753.5.981 1.51.517 2.288l-6.516 10.923a1.084 1.084 0 01-1.736.175l-5.06-5.565a1.725 1.725 0 01.05-2.372 1.548 1.548 0 012.083-.11l.143.132 3.244 3.568 5.094-8.538a1.545 1.545 0 011.988-.61l.166.092z"></path>
                                </g>
                            </svg>
                        </span>
                        <span height="24px" width="24px" aria-hidden="true" role="presentation" color="#ffffff" class="css-r6ux1k">
                            <svg viewBox="0 0 24 24">
                                <g fill="none" fill-rule="evenodd">
                                    <path fill="currentColor" d="M17.657 6.343a1.6 1.6 0 010 2.263l-3.394 3.393 3.394 3.395a1.6 1.6 0 11-2.263 2.263L12 14.262l-3.393 3.395a1.6 1.6 0 11-2.263-2.263L9.737 12 6.343 8.606a1.6 1.6 0 112.263-2.263L12 9.736l3.394-3.393a1.6 1.6 0 012.263 0z"></path><path d="M0 0h24v24H0z"></path>
                                </g>
                            </svg>
                        </span>
                    <span class="css-xs35ns">
                    </span>
                </div>
                <span class="css-1cqtals">${name}</span>
            </div>
        </label>
    </div>
    `.trim();
}

function openRightPanel() {

     // Condense Canvas
    element = document.querySelectorAll("[data-client-id='dab-dui-12']")[0];
    element.classList.add('dashboard-canvas__viewport--condensed');

    // Dashboard Right Panel
    element = document.getElementsByClassName('dashboard-right-nav')[0].firstChild;
    element.classList.add('dashboard-right-panel__width-wrapper--open');
    element.style.minWidth = '360px';
    element.style.width = '360px';

    // dab-drn-4
    element = document.querySelectorAll("[data-client-id='dab-drn-4']")[0];
    element.classList.add('dashboard-right-panel--open');

    node = document.createElement('div');

    enableToggle = createToggle("Enable Grid Helper", gridIsEnabled());

    builtInToggles = '';
    for (key in defaultGrids) {
        builtInToggles += createToggle(key, selectedStyles.includes(key));
    }
    customToggles = '';
    for (key in customGrids) {
        customToggles += createToggle(key, selectedStyles.includes(key));
    }

    node.innerHTML =`
    <div class="dashboard-panel dashboard-right-panel__fade--enter-done" data-client-id="grid-helper-panel">
        <div class="dashboard-panel__header">
            <div class="dashboard-panel__title-row">
                <span class="dashboard-panel__title">Grid Helper</span>
                <div class="dashboard-panel__header-button-container">
                    <div class="dropdown">
                        <div role="button" class="dashboard-panel__button" data-client-id="grid-helper-settings">
                            <button aria-disabled="false" class="dashboard-panel__button lodestar--focus-using-before css-1umvfwx" type="button">
                                <div class="css-16jo8qw">
                                    <span height="24px" width="24px" aria-hidden="true" role="presentation" class="css-1qwla2t">
                                        <svg viewBox="0 0 24 24">
                                            <g fill="none" fill-rule="evenodd">
                                                <path d="M0 0h24v24H0z"></path><path fill="currentColor" d="M12 16a2 2 0 11.001 3.999A2 2 0 0112 16zm0-6a2 2 0 11.001 3.999A2 2 0 0112 10zm0-6a2 2 0 11.001 3.999A2 2 0 0112 4z"></path>
                                            </g>
                                        </svg>
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="dashboard-panel__divider"></div>
                    <button data-client-id="grid-helper-close" aria-disabled="false" class="dashboard-panel__button lodestar--focus-using-before css-1umvfwx" type="button">
                        <div class="css-14jo8qw">
                            <span height="24px" width="24px" aria-hidden="true" role="presentation" class="css-1qwla2t">
                                <svg viewBox="0 0 24 24">
                                    <g fill="none" fill-rule="evenodd">
                                        <path fill="currentColor" d="M17.657 6.343a1.6 1.6 0 010 2.263l-3.394 3.393 3.394 3.395a1.6 1.6 0 11-2.263 2.263L12 14.262l-3.393 3.395a1.6 1.6 0 11-2.263-2.263L9.737 12 6.343 8.606a1.6 1.6 0 112.263-2.263L12 9.736l3.394-3.393a1.6 1.6 0 012.263 0z"></path><path d="M0 0h24v24H0z"></path>
                                    </g>
                                </svg>
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
        <form class="widget-config">
            <div class="card-body">
                    ${enableToggle}
            </div>
            <div class="accordion">
                <div class="card">
                    <div class="card-header">Built-in Layouts</div>
                    <div data-client-id="dab-wct-1" class="collapse show">
                        <div class="card-body">
                                ${builtInToggles}
                        </div>
                    </div>
                </div>
            </div>
            <div class="accordion">
                <div class="card">
                    <div class="card-header">Custom Layouts</div>
                    <div class="collapse show">
                        <div class="card-body">
                            ${customToggles}
                            <span class="dashboard-panel-dashboard-settings__title">You can add new custom styles by clicking the More ( ⋮ ) icon at the top of the panel</span>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>`.trim();

    element.prepend(node.firstChild);

    setPanelListeners();
}

function closeRightPanel() {
    gridPanel = document.querySelectorAll("[data-client-id='grid-helper-panel']");
    if (gridPanel.length > 0) {
        gridPanel[0].remove();
        // dab-drn-4
        element = document.querySelectorAll("[data-client-id='dab-drn-4']")[0];
        element.classList.remove('dashboard-right-panel--open');

        // Dashboard Right Panel
        element = document.getElementsByClassName('dashboard-right-nav')[0].firstChild;
        element.classList.remove('dashboard-right-panel__width-wrapper--open');
        element.style.minWidth = '0px';
        element.style.width = '0px';

        // Expand Canvas
        element = document.querySelectorAll("[data-client-id='dab-dui-12']")[0];
        element.classList.remove('dashboard-canvas__viewport--condensed');
    }
}

function railClicked(e) {
    let isGridButton = gridButtonClicked(e);

    if (isGridButton) { // Clicked Helper Grid Icon
        // Check if panel is already open. If so, close it
        rightPanel = document.querySelectorAll("[data-client-id='dab-drn-4']")[0].firstChild;
        if (rightPanel === null) { // Panel is closed
            openRightPanel();
        } else if (rightPanel.dataset.clientId === "grid-helper-panel") {
            closeRightPanel();
        } else {
            closeSmartsheetPanel();
            openRightPanel();
        }
    } else if (isGridButton !== null) { // Clicked Another Right Rail Icon
        closeRightPanel();
    }
}

function addRailIcon(rightRail, railIcon) {
    document.querySelectorAll("[data-client-id='dab-drn-0']")[0].addEventListener('click', railClicked);

    // Add New Icon
    rightRail.prepend(railIcon);
    // railIcon.addEventListener('click', toggleRightPanel);
}

function createRailIcon() {
    const node = document.createElement('div');
    node.innerHTML = `
    <div id="grid-helper-icon" class="dashboard-right-rail__button-wrapper">
        <div class="dashboard-right-rail__button-hover-wrapper">
            <button aria-label="Grid Helper" data-client-id="grid-helper-button" aria-disabled="false" class="dashboard-right-rail__icon-button lodestar--focus-using-before css-1uc243b" type="button">
                <div class="css-14jo8qw">
                    <span height="24px" width="24px" aria-hidden="true" role="presentation" class="css-1qwla2t">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="24" viewBox="0 0 24 24">
                            <image x="1" y="1" width="22" height="22" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAP0lEQVQ4je2SMQoAIAzEcv7/z+fmYie1g3BZC+GgkW0qJBnAtk7uo7Q+IOJ+sYA6i0v6FqfjiDfS8eK/50W8mMaOIx16iM1OAAAAAElFTkSuQmCC"/>
                        </svg>
                    </span>
                </div>
            </button>
        </div>
    </div>`.trim();

    return node.firstChild;
}

const railIcon = createRailIcon();

var rightRailExists = setInterval(function() {
    rightRail = document.querySelectorAll("[data-client-id='dab-drn-0']");
    if (rightRail.length > 0) {
        rightRail = rightRail[0];
        clearInterval(rightRailExists);
        addRailIcon(rightRail, railIcon);
    }
}, 100);
