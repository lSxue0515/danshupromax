(function () {
    'use strict';

    // ========== 平台检测（head里已做过一次，这里补充确认）==========
    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    var root = document.documentElement;

    // 确保 class 存在（防止 head 里的被其他代码覆盖）
    if (isIOS && !root.classList.contains('is-ios')) root.classList.add('is-ios');
    if (isAndroid && !root.classList.contains('is-android')) root.classList.add('is-android');

    // ========== 视口高度 ==========
    var lastH = 0;

    function update() {
        var w = window.innerWidth;
        if (w > 768) return;

        var h = window.innerHeight;

        // visualViewport 更准确（排除键盘）
        if (window.visualViewport) {
            h = window.visualViewport.height;
        }

        // Android 额外保险
        if (isAndroid) {
            var ch = document.documentElement.clientHeight;
            if (ch > 0 && ch < h) h = ch;
        }

        if (Math.abs(h - lastH) < 1) return;
        lastH = h;

        root.style.setProperty('--vh', (h * 0.01) + 'px');
        root.style.setProperty('--app-height', h + 'px');

        var frame = document.getElementById('phoneFrame');
        if (frame) frame.style.height = h + 'px';
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', function () { setTimeout(update, 300); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', update);

    // ========== iOS 键盘修复 ==========
    // 核心思路：键盘弹出时，用 visualViewport.height 动态设置聊天容器高度
    // 这样聊天界面始终占据"可见区域"，不会被推上去

    var _kbActive = false;
    var _origConvH = '';

    window._chatInputFocus = function () {
        _kbActive = true;

        if (isIOS) {
            // 延迟执行，等键盘弹出后 visualViewport 更新
            setTimeout(function () {
                _resizeConv();
                // 反复修正，iOS键盘弹出有多个阶段
                setTimeout(_resizeConv, 100);
                setTimeout(_resizeConv, 300);
                setTimeout(_resizeConv, 600);
            }, 50);

            // 持续监听 visualViewport
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', _onVVResize);
                window.visualViewport.addEventListener('scroll', _preventScroll);
            }
        }

        if (isAndroid) {
            // Android 键盘弹出后 resize 会自动触发 update()
            setTimeout(function () {
                var b = document.getElementById('chatConvBody');
                if (b) b.scrollTop = b.scrollHeight;
            }, 300);
        }
    };

    window._chatInputBlur = function () {
        _kbActive = false;

        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', _onVVResize);
            window.visualViewport.removeEventListener('scroll', _preventScroll);
        }

        // 恢复原始高度
        var conv = document.getElementById('chatConversation');
        if (conv) conv.style.height = '';

        var frame = document.getElementById('phoneFrame');
        if (frame) frame.style.height = '';

        setTimeout(function () {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            root.scrollTop = 0;
            update();
        }, 100);
    };

    function _onVVResize() {
        if (_kbActive) {
            _resizeConv();
        }
    }

    function _preventScroll() {
        // 阻止 iOS 把整个页面推上去
        if (window.visualViewport && window.visualViewport.offsetTop > 0) {
            window.scrollTo(0, 0);
        }
    }

    function _resizeConv() {
        if (!_kbActive) return;

        var vvh;
        if (window.visualViewport) {
            vvh = window.visualViewport.height;
        } else {
            vvh = window.innerHeight;
        }

        // 1. 让 phone-frame 也缩到可见高度
        var frame = document.getElementById('phoneFrame');
        if (frame) {
            frame.style.height = vvh + 'px';
        }

        // 2. 让聊天容器占满 phone-frame
        var conv = document.getElementById('chatConversation');
        if (conv) {
            conv.style.height = vvh + 'px';
        }

        // 3. 滚到底部
        var body = document.getElementById('chatConvBody');
        if (body) body.scrollTop = body.scrollHeight;

        // 4. 强制页面不能滚动
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        root.scrollTop = 0;
    }

})();
