function changeBubbleAvatar(avatarId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                var img = document.getElementById(avatarId);
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}
