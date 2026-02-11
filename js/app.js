/* ============================================
   app.js — App 入口 + 主控初始化
   ============================================ */

function openApiApp() {
    showToast('API 应用开发中… 🚧');
}

function openAppearanceApp() {
    showToast('外观设置开发中… 🎨');
}

function openTiebaApp() {
    showToast('贴吧应用开发中… 💬');
}

function openChatApp() {
    showToast('聊天应用开发中… 💭');
}

function openWorldBookApp() {
    showToast('世界之书开发中… 🌍');
}

/* ----- 文案自动保存 ----- */
document.addEventListener('DOMContentLoaded', function () {
    var insText = document.getElementById('insText');
    var saved = localStorage.getItem('ins_text');
    if (saved && insText) insText.innerHTML = saved;
    if (insText) {
        insText.addEventListener('blur', function () {
            localStorage.setItem('ins_text', insText.innerHTML);
        });
    }
});
/* ----- 聊天气泡自动保存 ----- */
document.addEventListener('DOMContentLoaded', function () {
    var bL = document.getElementById('bubbleTextLeft');
    var bR = document.getElementById('bubbleTextRight');

    var savedL = localStorage.getItem('bubble_left');
    var savedR = localStorage.getItem('bubble_right');
    if (savedL && bL) bL.innerHTML = savedL;
    if (savedR && bR) bR.innerHTML = savedR;

    if (bL) bL.addEventListener('blur', function () {
        localStorage.setItem('bubble_left', bL.innerHTML);
    });
    if (bR) bR.addEventListener('blur', function () {
        localStorage.setItem('bubble_right', bR.innerHTML);
    });
});


