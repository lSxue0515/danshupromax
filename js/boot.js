/* ============================================
   boot.js — 蛋薯机 DanShu Pro 开机动画 v3
   ============================================ */

(function () {
    'use strict';

    var BOOT_IMG = 'https://s3.bmp.ovh/2026/03/01/nn1m2Yea.png';
    var BOOT_DURATION = 3800;

    function buildBootScreen() {
        var el = document.createElement('div');
        el.className = 'boot-screen';
        el.id = 'bootScreen';

        var h = '';
        h += '<img class="boot-fullimg" src="' + BOOT_IMG + '" alt="" draggable="false">';
        h += '<div class="boot-particles">';
        for (var i = 1; i <= 5; i++) {
            h += '<div class="boot-spark s-' + i + '"></div>';
        }
        for (var j = 1; j <= 3; j++) {
            h += '<div class="boot-heart h-' + j + '"></div>';
        }
        h += '</div>';
        h += '<div class="boot-shimmer"></div>';

        el.innerHTML = h;
        return el;
    }

    function injectBoot() {
        var phone = document.querySelector('.phone-frame') || document.getElementById('phoneFrame');
        if (!phone) return;

        var placeholder = document.getElementById('bootPlaceholder');
        var screen = buildBootScreen();

        /* 插入为第一个子元素 */
        phone.insertBefore(screen, phone.firstChild);

        /* 等开机图片加载完成后再移除黑色占位 */
        var img = screen.querySelector('.boot-fullimg');
        function removePlaceholder() {
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            /* 移除head里的内联样式 */
            var bs = document.getElementById('bootBlockStyle');
            if (bs) bs.parentNode.removeChild(bs);
        }

        if (img.complete) {
            removePlaceholder();
        } else {
            img.addEventListener('load', removePlaceholder);
            img.addEventListener('error', removePlaceholder);
            /* 兜底：最多1.5秒后强制移除 */
            setTimeout(removePlaceholder, 1500);
        }

        /* 到时间后淡出 */
        setTimeout(function () {
            screen.classList.add('boot-fade-out');
            setTimeout(function () {
                if (screen.parentNode) {
                    screen.parentNode.removeChild(screen);
                }
            }, 900);
        }, BOOT_DURATION);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBoot);
    } else {
        injectBoot();
    }

})();
