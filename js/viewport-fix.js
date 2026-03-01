(function () {
    'use strict';

    // ========== 平台检测 ==========
    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    var root = document.documentElement;

    if (isIOS) root.classList.add('is-ios');
    if (isAndroid) root.classList.add('is-android');
    if (window.innerWidth <= 768) root.classList.add('is-mobile');

    // ========== 视口高度实时计算 ==========
    var lastH = 0;

    function update() {
        if (window.innerWidth > 768 && !root.classList.contains('is-mobile')) return;

        var h = window.innerHeight;
        if (window.visualViewport) h = window.visualViewport.height;

        // Android 兜底
        if (isAndroid) {
            var ch = document.documentElement.clientHeight;
            if (ch > 0 && ch < h) h = ch;
        }

        if (Math.abs(h - lastH) < 1) return;
        lastH = h;

        root.style.setProperty('--vh', (h * 0.01) + 'px');
        root.style.setProperty('--app-height', h + 'px');

        var frame = document.getElementById('phoneFrame');
        if (frame && window.innerWidth <= 768) {
            frame.style.height = h + 'px';
        }
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', function () { setTimeout(update, 300); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', update);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) update(); });

    // ========== iOS 键盘修复 ==========
    window._chatInputFocus = function () {
        root.classList.add('chat-keyboard-open');
        if (isIOS) {
            var fix = function () {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                root.scrollTop = 0;
                var f = document.getElementById('phoneFrame');
                if (f) f.scrollTop = 0;
                var b = document.getElementById('chatConvBody');
                if (b) b.scrollTop = b.scrollHeight;
            };
            setTimeout(fix, 50);
            setTimeout(fix, 150);
            setTimeout(fix, 400);
        }
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', kbResize);
        }
    };

    window._chatInputBlur = function () {
        root.classList.remove('chat-keyboard-open');
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', kbResize);
        }
        var conv = document.getElementById('chatConversation');
        if (conv) conv.style.height = '';
        setTimeout(function () {
            window.scrollTo(0, 0);
            update();
        }, 100);
    };

    function kbResize() {
        if (!window.visualViewport) return;
        window.scrollTo(0, 0);
        var h = window.visualViewport.height;
        var conv = document.getElementById('chatConversation');
        if (conv && root.classList.contains('chat-keyboard-open')) {
            conv.style.height = h + 'px';
        }
        setTimeout(function () {
            var b = document.getElementById('chatConvBody');
            if (b) b.scrollTop = b.scrollHeight;
        }, 50);
    }
})();
