/* ============================================
   utils.js — 通用工具函数
   ============================================ */

/** 更新状态栏时间 */
function updateStatusTime() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var el = document.getElementById('statusTime');
    if (el) el.textContent = h + ':' + m;
}

/** 触发文件选择器 */
function triggerFile(targetId, accept) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'image/*';
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                var img = document.getElementById(targetId);
                if (img) img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

/** 简易 Toast 提示 */
function showToast(msg, duration) {
    duration = duration || 2000;
    var toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(219, 112, 147, 0.85)',
        color: '#fff',
        padding: '8px 20px',
        borderRadius: '20px',
        fontSize: '13px',
        zIndex: '9999',
        pointerEvents: 'none',
        transition: 'opacity 0.3s',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)'
    });
    document.body.appendChild(toast);
    setTimeout(function () {
        toast.style.opacity = '0';
        setTimeout(function () { toast.remove(); }, 300);
    }, duration);
}

/* 启动时钟 */
updateStatusTime();
setInterval(updateStatusTime, 10000);

