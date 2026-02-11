
/* ============================================
   countdown.js — 倒数日小组件逻辑
   ============================================ */

function refreshCountdown() {
    var titleEl = document.getElementById('displayTitle');
    var dateEl  = document.getElementById('displayDate');
    var daysEl  = document.getElementById('displayDays');

    var savedTitle = localStorage.getItem('cd_title') || '恋爱纪念日';
    var savedDate  = localStorage.getItem('cd_date')  || '2026-02-03';

    if (titleEl) titleEl.textContent = savedTitle;
    if (dateEl)  dateEl.textContent  = savedDate;

    var target = new Date(savedDate + 'T00:00:00');
    var today  = new Date();
    today.setHours(0, 0, 0, 0);

    var diff = Math.floor((today - target) / (1000 * 60 * 60 * 24));
    var display = diff >= 0 ? diff : Math.abs(diff);

    if (daysEl) daysEl.innerHTML = display + '<span>天</span>';
}

function openCountdownApp() {
    var newTitle = prompt('纪念日名称：', localStorage.getItem('cd_title') || '恋爱纪念日');
    if (newTitle === null) return;

    var newDate = prompt('纪念日日期 (YYYY-MM-DD)：', localStorage.getItem('cd_date') || '2026-02-03');
    if (newDate === null) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        showToast('日期格式不正确 ❌');
        return;
    }

    localStorage.setItem('cd_title', newTitle);
    localStorage.setItem('cd_date', newDate);
    refreshCountdown();
    showToast('已更新 ✅');
}

document.addEventListener('DOMContentLoaded', refreshCountdown);
