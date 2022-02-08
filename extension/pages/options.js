customGrids = null;
gridStyle = null;

function saveOptions() {
    var selection = document.querySelector('input[name="gridStyle"]:checked').value;
    // console.log(selection);
    chrome.storage.sync.set({
        gridStyle: selection
    }, confirmSaved);
}

function restoreOptions() {
    // Use default value "12Columns"
    chrome.storage.sync.get({
        gridStyle: '12Columns',
        customGrids: {},
    }, function(items) {
        customGrids = items.customGrids;
        header = document.getElementById("custom-heading");
        for (const [key, value] of Object.entries(customGrids)) {
            newRadio = '<input type="radio" id="' + key + '" name="gridStyle" value="' + key + '"> <label for="' + key + '">' + key + '</label> <button data-updateid="' + key + '">Edit</button><button data-removeid="' + key + '">Remove</button><br>';
            header.insertAdjacentHTML('afterend', newRadio);
        };
        gridStyle = items.gridStyle;
        document.getElementById(gridStyle).checked = true;
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
    if (gridName == gridStyle) {
        document.getElementById('12Columns').click();
        saveOptions();
    }
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
