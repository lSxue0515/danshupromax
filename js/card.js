/* ============================================
   card.js — 大卡片小组件逻辑
   ============================================ */

function openCardSettings() {
    showToast('长按文字可直接编辑 ✏️');
}

function saveCardData() {
    var title = document.getElementById('cardTitle');
    var text  = document.getElementById('cardText');
    var img   = document.getElementById('cardImage');
    if (title) localStorage.setItem('card_title', title.innerHTML);
    if (text)  localStorage.setItem('card_text', text.innerHTML);
    if (img)   localStorage.setItem('card_img', img.src);
}

function loadCardData() {
    var title = localStorage.getItem('card_title');
    var text  = localStorage.getItem('card_text');
    var img   = localStorage.getItem('card_img');
    if (title) document.getElementById('cardTitle').innerHTML = title;
    if (text)  document.getElementById('cardText').innerHTML = text;
    if (img)   document.getElementById('cardImage').src = img;
}

document.addEventListener('DOMContentLoaded', function () {
    loadCardData();
    var ct = document.getElementById('cardTitle');
    var cx = document.getElementById('cardText');
    if (ct) ct.addEventListener('blur', saveCardData);
    if (cx) cx.addEventListener('blur', saveCardData);
});

