function save_options() {
    var selection = document.querySelector('input[name="gridStyle"]:checked').value;
    // console.log(selection);
    chrome.storage.sync.set({
        gridStyle: selection
    }, function() {
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

function restore_options() {
    // Use default value "12Columns"
    chrome.storage.sync.get({
        gridStyle: '12Columns',
    }, function(items) {
        document.getElementById(items.gridStyle).checked = true;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);