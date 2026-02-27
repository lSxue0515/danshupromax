/* ============================================
   boot.js — 蛋薯机 DanShu Pro 开机动画
   ============================================ */

(function () {
    'use strict';

    var BOOT_LOGO_URL = 'img/boot-logo.png';

    /* 开机总时长（毫秒） */
    var BOOT_DURATION = 3600;

    /* ===== 构建 DOM ===== */
    function buildBootScreen() {
        var el = document.createElement('div');
        el.className = 'boot-screen';
        el.id = 'bootScreen';

        var h = '';

        /* 四角装饰 */
        h += '<div class="boot-corner tl"></div>';
        h += '<div class="boot-corner tr"></div>';
        h += '<div class="boot-corner bl"></div>';
        h += '<div class="boot-corner br"></div>';

        /* 浮动粒子：8爱心 + 4圆点 */
        h += '<div class="boot-particles">';
        for (var i = 1; i <= 8; i++) {
            h += '<div class="boot-particle heart"></div>';
        }
        for (var j = 9; j <= 12; j++) {
            h += '<div class="boot-particle circle"></div>';
        }
        h += '</div>';

        /* 主体 */
        h += '<div class="boot-logo-wrap">';
        h += '<div class="boot-logo-halo"></div>';
        h += '<img class="boot-logo-img" src="' + BOOT_LOGO_URL + '" alt="蛋薯" draggable="false" crossorigin="anonymous">';
        h += '<div class="boot-brand">';
        h += '<div class="boot-title-cn">蛋 薯</div>';
        h += '<div class="boot-title-en">DanShu Pro</div>';
        h += '</div>';
        h += '<div class="boot-divider"></div>';
        h += '<div class="boot-slogan">用文字编织属于我们的故事</div>';
        h += '</div>';

        /* 底部 */
        h += '<div class="boot-loader">';
        h += '<div class="boot-dot"></div>';
        h += '<div class="boot-dot"></div>';
        h += '<div class="boot-dot"></div>';
        h += '</div>';
        h += '<div class="boot-progress"><div class="boot-progress-fill"></div></div>';
        h += '<div class="boot-watermark">DANSHU PRO</div>';

        el.innerHTML = h;
        return el;
    }

    /* ===== 注入手机框架 ===== */
    function injectBoot() {
        var phone = document.getElementById('phoneFrame');
        if (!phone) return;

        var screen = buildBootScreen();
        phone.appendChild(screen);

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

    /* ===== 启动 ===== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBoot);
    } else {
        injectBoot();
    }

})();
