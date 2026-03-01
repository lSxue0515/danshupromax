/* ============================================
   蛋薯机 DanShu Pro — viewport-fix.js
   手机端全屏视口 · 安全区 · 键盘适配
   PC 端完全不影响
   ============================================ */

(function () {
    'use strict';

    /* ===== 1. 是否手机端 ===== */
    function isMobile() {
        return window.innerWidth <= 768 ||
            /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }

    /* ===== 2. 动态视口高度（解决 iOS Safari 100vh 包含地址栏的问题）===== */
    var _lastVh = 0;

    function updateViewportHeight() {
        if (!isMobile()) return;

        var vh;
        if (window.visualViewport) {
            vh = window.visualViewport.height;
        } else {
            vh = window.innerHeight;
        }

        /* ★ Android 某些浏览器 (iQOO/vivo) visualViewport.height 
           可能仍然包含系统导航栏，用 screen.availHeight 兜底 ★ */
        if (/Android/i.test(navigator.userAgent)) {
            var docH = document.documentElement.clientHeight;
            if (docH > 0 && docH < vh) {
                vh = docH;
            }
        }

        if (Math.abs(vh - _lastVh) < 1) return;
        _lastVh = vh;

        var root = document.documentElement;
        root.style.setProperty('--vh', (vh * 0.01) + 'px');
        root.style.setProperty('--app-height', vh + 'px');

        /* ★ 同步给 phone-frame 以防 CSS var 不生效 ★ */
        var frame = document.getElementById('phoneFrame');
        if (frame && window.innerWidth <= 768) {
            frame.style.height = vh + 'px';
        }
    }

    /* ===== 3. 绑定事件 ===== */
    function bindEvents() {
        // visualViewport resize（iOS Safari 最可靠的方式）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateViewportHeight);
            window.visualViewport.addEventListener('scroll', updateViewportHeight);
        }

        // 传统 resize 兜底
        window.addEventListener('resize', updateViewportHeight);

        // 屏幕旋转
        window.addEventListener('orientationchange', function () {
            setTimeout(updateViewportHeight, 100);
            setTimeout(updateViewportHeight, 300);
            setTimeout(updateViewportHeight, 500);
        });

        // 页面从后台恢复
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                setTimeout(updateViewportHeight, 100);
            }
        });
    }

    /* ===== 4. iOS 弹性滚动锁死 ===== */
    function preventBounce() {
        if (!isMobile()) return;

        // 阻止 body 层的弹性滚动
        document.body.addEventListener('touchmove', function (e) {
            // 如果触摸的元素在一个可滚动容器内，不阻止
            var el = e.target;
            while (el && el !== document.body) {
                var style = window.getComputedStyle(el);
                var overflow = style.overflowY || style.overflow;
                if (overflow === 'auto' || overflow === 'scroll') {
                    // 已经滚到边界时也阻止
                    if (el.scrollHeight > el.clientHeight) {
                        return; // 允许滚动
                    }
                }
                el = el.parentElement;
            }
            // body 自身不允许弹性滚动
            if (e.cancelable) e.preventDefault();
        }, { passive: false });
    }

    /* ===== 5. iOS standalone 检测 ===== */
    function isStandalone() {
        return window.navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches;
    }

    /* ===== 6. 添加 class 标记供 CSS 使用 ===== */
    function addPlatformClasses() {
        var html = document.documentElement;

        if (isMobile()) {
            html.classList.add('is-mobile');
        }

        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            html.classList.add('is-ios');
        }

        if (/Android/i.test(navigator.userAgent)) {
            html.classList.add('is-android');
        }

        if (isStandalone()) {
            html.classList.add('is-standalone');
        }

        // 有刘海的 iPhone（safe-area-inset-top > 0）
        if (CSS.supports && CSS.supports('padding-top: env(safe-area-inset-top)')) {
            html.classList.add('has-safe-area');
        }
    }

    /* ===== 7. 键盘弹起适配 ===== */
    function handleKeyboard() {
        if (!isMobile()) return;

        var originalHeight = window.innerHeight;

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', function () {
                var currentHeight = window.visualViewport.height;
                var diff = originalHeight - currentHeight;

                if (diff > 100) {
                    // 键盘弹起
                    document.documentElement.classList.add('keyboard-open');
                } else {
                    // 键盘收起
                    document.documentElement.classList.remove('keyboard-open');
                    // 重新同步原始高度
                    originalHeight = window.innerHeight;
                }
            });
        }
    }

    /* ===== 初始化 ===== */
    function init() {
        addPlatformClasses();
        updateViewportHeight();
        bindEvents();
        preventBounce();
        handleKeyboard();

        // 延迟再算一次（等浏览器 UI 稳定）
        setTimeout(updateViewportHeight, 50);
        setTimeout(updateViewportHeight, 200);
        setTimeout(updateViewportHeight, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
