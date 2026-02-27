function updateStatusTime() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('statusTime').textContent = h + ':' + m;
}
setInterval(updateStatusTime, 1000);
updateStatusTime();

function triggerFile(targetId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                document.getElementById(targetId).src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}
