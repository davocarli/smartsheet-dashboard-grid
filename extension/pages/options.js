customGrids = null;
gridStyle = null;

function saveOptions() {
    var selections = document.querySelectorAll('input[name="gridStyle"]:checked');
    console.log(selections);
    checked = [];
    for (i = 0; i < selections.length; i++) {
        checked.push(selections[i].value);
    }
    console.log(checked);
    chrome.storage.sync.set({
        gridStyles: checked
    }, confirmSaved);
}

function restoreOptions() {
    // Use default value "12Columns"
    chrome.storage.sync.get({
        gridStyles: ['11 Columns'],
        customGrids: {},
        enabled: [],
    }, function(items) {
        customGrids = items.customGrids;
        header = document.getElementById("custom-heading");
        for (const [key, value] of Object.entries(customGrids)) {
            newCheck = '<input type="checkbox" id="' + key + '" name="gridStyle" value="' + key + '"> <label for="' + key + '">' + key + '</label> <button data-updateid="' + key + '">Edit</button><button data-removeid="' + key + '">Remove</button><br>';
            header.insertAdjacentHTML('afterend', newCheck);
        };
        gridStyles = items.gridStyles;
        for (i = 0; i < gridStyles.length; i++) {
            gridStyle = gridStyles[i];
            item = document.getElementById(gridStyle);
            if (item != null) {
                item.checked = true;
            }
        }
        removeButtons = document.querySelectorAll('[data-removeid]');
        removeButtons.forEach((button) => {
            button.addEventListener('click', (item) => {
                removeCustom(item.srcElement);
            })
        });
        editButtons = document.querySelectorAll('[data-updateid]');
        editButtons.forEach((button) => {
            button.addEventListener('click', (item) => {
                editGrid(item.srcElement);
            })
        })
    });
}

function revealForm() {
    document.getElementById('addGrid').style.display = 'block';
}

function addNewGrid() {
    gridName = document.getElementById('custom-grid-name').value;
    if (gridName == "11 Columns" || gridName == "Center Line" || gridName == "4 Columns") {
        alert('You cannot use the name of a default option.');
        return;
    } else if (gridName == "parent") {
        alert('The style can\'t be named "parent".');
        return;
    }
    gridLayout = document.getElementById('custom-grid-layout').value;
    if (gridLayout.endsWith(',')) {
        gridLayout = gridLayout.substring(0, gridLayout.length - 1);
    }
    if (!gridLayout.startsWith('[')) {
        gridLayout = '[' + gridLayout + ']';
    }
    gridLayout = JSON.parse(gridLayout);
    customGrids[gridName] = gridLayout;
    saveCustomGrids();
}

function confirmSaved() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
        status.textContent = '';
    }, 750);
}

function removeCustom(button) {
    gridName = button.dataset.removeid;
    delete customGrids[gridName];
    saveCustomGrids();
}

function saveCustomGrids() {
    chrome.storage.sync.set({
        customGrids: customGrids
    }, function(items) {
        window.location.reload();
    }
)};

function editGrid(button) {
    gridName = button.dataset.updateid;
    revealForm();
    document.getElementById('custom-grid-name').value = gridName;
    document.getElementById('custom-grid-layout').value = JSON.stringify(customGrids[gridName]).slice(1, -1);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('add').addEventListener('click', revealForm);
document.getElementById('newGrid').addEventListener('click', addNewGrid);
