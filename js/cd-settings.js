/* ================================================
   cd-settings.js — 恋爱纪念日设置面板交互（v3修复版）
   ================================================ */

(function () {
    'use strict';

    var STORAGE_KEY = 'cd_settings';
    var STORAGE_KEY_IMG = 'cd_settings_bgimg';
    var customStyleEl = null;

    function el(id) {
        return document.getElementById(id);
    }

    var defaults = {
        title: '恋爱纪念日',
        date: '2026-02-03',
        sub: '在一起的每一天都是礼物 ✦',
        fontColor: '#dc78a0',
        fontUrl: '',
        fontName: '',
        bgColor: '',
        bgOpacity: 45,
        bgImage: '',
        bgPosX: 50,
        bgPosY: 50,
        bgScale: 120
    };

    /* ---- 兼容 assign ---- */
    function assign(target) {
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i];
            if (src) {
                for (var key in src) {
                    if (src.hasOwnProperty(key)) {
                        target[key] = src[key];
                    }
                }
            }
        }
        return target;
    }

    /* ---- 读取 ---- */
    function loadSettings() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var s = raw ? JSON.parse(raw) : {};
            var result = assign({}, defaults, s);
            /* 背景图单独存储，读回来 */
            var img = localStorage.getItem(STORAGE_KEY_IMG);
            if (img) result.bgImage = img;
            return result;
        } catch (e) {
            return assign({}, defaults);
        }
    }

    /* ---- ★ 保存（图片单独存、压缩） ---- */
    function saveToStorage(s) {
        try {
            /* 把bgImage拿出来单独存 */
            var bgImg = s.bgImage || '';
            var settingsClean = assign({}, s);
            settingsClean.bgImage = bgImg ? '__HAS_IMG__' : '';

            localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsClean));

            if (bgImg && bgImg !== '__HAS_IMG__') {
                try {
                    localStorage.setItem(STORAGE_KEY_IMG, bgImg);
                } catch (imgErr) {
                    /* 图片太大，尝试压缩后再存 */
                    console.warn('图片太大，尝试压缩...', imgErr);
                    compressAndSave(bgImg);
                }
            } else if (!bgImg) {
                localStorage.removeItem(STORAGE_KEY_IMG);
            }

            return true;
        } catch (e) {
            console.error('保存失败详情:', e.name, e.message);
            /* 如果还是失败，尝试不存图片 */
            try {
                var noImg = assign({}, s);
                noImg.bgImage = '';
                localStorage.setItem(STORAGE_KEY, JSON.stringify(noImg));
                localStorage.removeItem(STORAGE_KEY_IMG);
                showToast('设置已保存（图片太大已跳过）');
                return true;
            } catch (e2) {
                return false;
            }
        }
    }

    /* ---- 压缩图片 ---- */
    function compressAndSave(dataUrl) {
        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement('canvas');
            var maxW = 400;
            var scale = maxW / img.width;
            if (scale > 1) scale = 1;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var compressed = canvas.toDataURL('image/jpeg', 0.6);
            try {
                localStorage.setItem(STORAGE_KEY_IMG, compressed);
            } catch (e) {
                console.warn('压缩后仍无法存储，放弃图片存储');
                localStorage.removeItem(STORAGE_KEY_IMG);
            }
        };
        img.src = dataUrl;
    }

    /* ---- 天数 ---- */
    function calcDays(dateStr) {
        if (!dateStr) return 0;
        var start = new Date(dateStr + 'T00:00:00');
        var now = new Date();
        now.setHours(0, 0, 0, 0);
        var diff = Math.floor((now - start) / 86400000);
        return Math.max(0, diff);
    }

    /* ---- hex转rgba ---- */
    function hexToRgba(hex, alpha) {
        hex = (hex || '').replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length !== 6) return 'rgba(255,255,255,' + alpha + ')';
        var r = parseInt(hex.substring(0, 2), 16) || 0;
        var g = parseInt(hex.substring(2, 4), 16) || 0;
        var b = parseInt(hex.substring(4, 6), 16) || 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    /* ---- 辅助 ---- */
    function val(id) { var e = el(id); return e ? e.value : ''; }
    function setText(id, text) { var e = el(id); if (e) e.textContent = text; }
    function setColor(id, color) { var e = el(id); if (e) e.style.color = color; }
    function setVal(id, v) { var e = el(id); if (e) e.value = v; }

    /* ==================================
       应用到主屏幕小组件
       ================================== */
    function applyToWidget(s) {
        var w = el('countdownWidget');
        if (!w) return;

        var titleEl = el('displayTitle');
        var dateEl = el('displayDate');
        var daysEl = el('displayDays');
        var subEl = w.querySelector('.cd-sub');
        var iconEl = w.querySelector('.cd-icon');

        if (titleEl) titleEl.textContent = s.title;
        if (dateEl) dateEl.textContent = s.date;
        if (daysEl) daysEl.innerHTML = calcDays(s.date) + '<span>天</span>';
        if (subEl) subEl.textContent = s.sub;

        var fc = s.fontColor || defaults.fontColor;
        if (titleEl) titleEl.style.color = fc;
        if (dateEl) dateEl.style.color = fc;
        if (daysEl) {
            daysEl.style.color = fc;
            var sp = daysEl.querySelector('span');
            if (sp) sp.style.color = fc;
        }
        if (subEl) subEl.style.color = fc;
        if (iconEl) iconEl.style.color = fc;

        if (s.fontName && s.fontUrl) {
            injectFont(s.fontName, s.fontUrl);
            w.style.fontFamily = '"' + s.fontName + '", sans-serif';
        } else {
            w.style.fontFamily = '';
        }

        if (s.bgColor) {
            w.style.background = s.bgColor;
        } else {
            w.style.background = '';
        }

        if (s.bgImage && s.bgImage !== '__HAS_IMG__') {
            w.style.backgroundImage = 'url(' + s.bgImage + ')';
            w.style.backgroundSize = (s.bgScale || 120) + '%';
            w.style.backgroundPosition = (s.bgPosX || 50) + '% ' + (s.bgPosY || 50) + '%';
            w.style.backgroundRepeat = 'no-repeat';
        } else {
            w.style.backgroundImage = '';
            w.style.backgroundSize = '';
            w.style.backgroundPosition = '';
        }
    }

    /* ==================================
       实时预览
       ================================== */
    function updatePreview() {
        var pc = el('cdPreviewCard');
        if (!pc) return;

        var title = val('cdInputTitle') || defaults.title;
        var date = val('cdInputDate') || defaults.date;
        var sub = val('cdInputSub') || defaults.sub;
        var fontColor = val('cdFontColorHex') || defaults.fontColor;

        setText('cdPreviewTitle', title);
        setText('cdPreviewDate', date);
        setText('cdPreviewSub', sub);

        var pDays = el('cdPreviewDays');
        if (pDays) {
            pDays.innerHTML = calcDays(date) + '<span>天</span>';
            pDays.style.color = fontColor;
            var sp = pDays.querySelector('span');
            if (sp) sp.style.color = fontColor;
        }

        setColor('cdPreviewTitle', fontColor);
        setColor('cdPreviewDate', fontColor);
        setColor('cdPreviewSub', fontColor);
        var pIcon = pc.querySelector('.cd-preview-icon');
        if (pIcon) pIcon.style.color = fontColor;

        var bgHex = val('cdBgColorHex') || '#ffffff';
        var bgOpacity = parseInt(val('cdBgOpacity') || '45') / 100;

        if (bgHex.startsWith('rgba')) {
            pc.style.background = bgHex;
        } else if (bgHex && bgHex !== '#ffffff') {
            pc.style.background = hexToRgba(bgHex, bgOpacity);
        } else {
            pc.style.background = 'rgba(255,255,255,' + bgOpacity + ')';
        }

        var bgImg = pc.getAttribute('data-bg-image') || '';
        if (bgImg) {
            pc.style.backgroundImage = 'url(' + bgImg + ')';
            pc.style.backgroundSize = (val('cdBgScale') || '120') + '%';
            pc.style.backgroundPosition = (val('cdBgPosX') || '50') + '% ' + (val('cdBgPosY') || '50') + '%';
            pc.style.backgroundRepeat = 'no-repeat';
        } else {
            pc.style.backgroundImage = '';
        }

        var fn = val('cdFontName');
        pc.style.fontFamily = fn ? '"' + fn + '", sans-serif' : '';
    }

    /* ---- 注入字体 ---- */
    function injectFont(name, url) {
        if (!customStyleEl) {
            customStyleEl = document.createElement('style');
            customStyleEl.id = 'cd-custom-font-style';
            document.head.appendChild(customStyleEl);
        }
        customStyleEl.textContent =
            '@font-face { font-family: "' + name + '"; src: url("' + url + '"); font-display: swap; }';
    }

    /* ---- Toast ---- */
    function showToast(msg) {
        var t = document.createElement('div');
        t.style.cssText =
            'position:fixed;top:60px;left:50%;transform:translateX(-50%);' +
            'padding:10px 24px;border-radius:16px;' +
            'background:rgba(255,255,255,0.75);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' +
            'border:1px solid rgba(255,255,255,0.7);box-shadow:0 4px 18px rgba(200,140,160,0.12);' +
            'font-size:13px;font-weight:600;color:rgba(180,90,120,0.9);' +
            'z-index:99999;opacity:0;transition:opacity 0.3s;letter-spacing:0.3px;';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.style.opacity = '1'; });
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
        }, 1800);
    }

    /* ================================================
       全局函数
       ================================================ */

    window.openCdSettings = function () {
        var overlay = el('cdSettingsOverlay');
        if (!overlay) return;

        var s = loadSettings();

        setVal('cdInputTitle', s.title);
        setVal('cdInputDate', s.date);
        setVal('cdInputSub', s.sub);

        var safeHex = (s.fontColor && s.fontColor.charAt(0) === '#') ? s.fontColor : '#dc78a0';
        setVal('cdFontColorPicker', safeHex);
        setVal('cdFontColorHex', s.fontColor || '#dc78a0');
        setVal('cdFontUrl', s.fontUrl || '');
        setVal('cdFontName', s.fontName || '');
        setVal('cdBgColorPicker', '#ffffff');
        setVal('cdBgColorHex', '#ffffff');
        setVal('cdBgOpacity', s.bgOpacity);
        setText('cdBgOpacityVal', s.bgOpacity + '%');
        setVal('cdBgPosX', s.bgPosX);
        setText('cdBgPosXVal', s.bgPosX + '%');
        setVal('cdBgPosY', s.bgPosY);
        setText('cdBgPosYVal', s.bgPosY + '%');
        setVal('cdBgScale', s.bgScale);
        setText('cdBgScaleVal', s.bgScale + '%');

        var pc = el('cdPreviewCard');
        var bgImgData = s.bgImage || '';
        if (pc) pc.setAttribute('data-bg-image', bgImgData);

        var wrap = el('cdBgPreviewWrap');
        var prevImg = el('cdBgPreviewImg');
        if (bgImgData && bgImgData !== '__HAS_IMG__') {
            if (wrap) wrap.style.display = 'block';
            if (prevImg) prevImg.src = bgImgData;
        } else {
            if (wrap) wrap.style.display = 'none';
            if (prevImg) prevImg.src = '';
        }

        if (s.fontName && s.fontUrl) injectFont(s.fontName, s.fontUrl);

        updatePreview();
        setTimeout(function () { overlay.classList.add('active'); }, 20);
    };

    window.closeCdSettings = function () {
        var overlay = el('cdSettingsOverlay');
        if (overlay) overlay.classList.remove('active');
    };

    /* ★★★ 保存 ★★★ */
    window.saveCdSettings = function () {
        var pc = el('cdPreviewCard');

        var bgHex = val('cdBgColorHex') || '#ffffff';
        var bgOpacityNum = parseInt(val('cdBgOpacity') || '45');
        var bgOpacityDec = bgOpacityNum / 100;
        var bgColor = '';

        if (bgHex.startsWith('rgba')) {
            bgColor = bgHex;
        } else if (bgHex && bgHex !== '#ffffff') {
            bgColor = hexToRgba(bgHex, bgOpacityDec);
        }

        var bgImage = (pc && pc.getAttribute('data-bg-image')) || '';

        var settings = {
            title: val('cdInputTitle') || defaults.title,
            date: val('cdInputDate') || defaults.date,
            sub: val('cdInputSub') || defaults.sub,
            fontColor: val('cdFontColorHex') || defaults.fontColor,
            fontUrl: val('cdFontUrl') || '',
            fontName: val('cdFontName') || '',
            bgColor: bgColor,
            bgOpacity: bgOpacityNum,
            bgImage: bgImage,
            bgPosX: parseInt(val('cdBgPosX') || '50'),
            bgPosY: parseInt(val('cdBgPosY') || '50'),
            bgScale: parseInt(val('cdBgScale') || '120')
        };

        var ok = saveToStorage(settings);
        if (ok) {
            applyToWidget(settings);
            closeCdSettings();
            showToast('已保存 ♡');
        } else {
            showToast('存储空间不足，请清除一些数据后重试');
        }
    };

    window.clearAllCdSettings = function () {
        if (!confirm('确定要清除所有纪念日设置吗？')) return;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY_IMG);
        applyToWidget(defaults);
        closeCdSettings();
        showToast('已清除');
    };

    window.onCdBgImage = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;

        /* ★ 先压缩再用，避免存储爆掉 */
        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement('canvas');
            var maxW = 500;
            var s = Math.min(1, maxW / img.width);
            canvas.width = img.width * s;
            canvas.height = img.height * s;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var compressed = canvas.toDataURL('image/jpeg', 0.7);

            var pc = el('cdPreviewCard');
            if (pc) pc.setAttribute('data-bg-image', compressed);
            var wrap = el('cdBgPreviewWrap');
            var prevImg = el('cdBgPreviewImg');
            if (wrap) wrap.style.display = 'block';
            if (prevImg) prevImg.src = compressed;
            updatePreview();
        };

        var reader = new FileReader();
        reader.onload = function (ev) { img.src = ev.target.result; };
        reader.readAsDataURL(file);
    };

    window.removeCdBgImage = function () {
        var pc = el('cdPreviewCard');
        if (pc) pc.setAttribute('data-bg-image', '');
        var wrap = el('cdBgPreviewWrap');
        var imgEl = el('cdBgPreviewImg');
        if (wrap) wrap.style.display = 'none';
        if (imgEl) imgEl.src = '';
        localStorage.removeItem(STORAGE_KEY_IMG);
        updatePreview();
    };

    window.loadCdFont = function () {
        var url = (val('cdFontUrl') || '').trim();
        var name = (val('cdFontName') || '').trim();
        if (!url || !name) { showToast('请填写字体URL和名称'); return; }
        injectFont(name, url);
        var preview = el('cdFontPreview');
        if (preview) preview.style.fontFamily = '"' + name + '", sans-serif';
        updatePreview();
        showToast('字体已加载');
    };

    /* ================================================
       事件绑定
       ================================================ */
    document.addEventListener('DOMContentLoaded', function () {

        applyToWidget(loadSettings());

        ['cdInputTitle', 'cdInputDate', 'cdInputSub'].forEach(function (id) {
            var inp = el(id);
            if (inp) {
                inp.addEventListener('input', updatePreview);
                inp.addEventListener('change', updatePreview);
            }
        });

        var fcPicker = el('cdFontColorPicker');
        var fcHex = el('cdFontColorHex');
        if (fcPicker) fcPicker.addEventListener('input', function () {
            if (fcHex) fcHex.value = fcPicker.value;
            updatePreview();
        });
        if (fcHex) fcHex.addEventListener('input', function () {
            if (/^#[0-9a-fA-F]{6}$/.test(fcHex.value) && fcPicker) fcPicker.value = fcHex.value;
            updatePreview();
        });

        var fontPal = el('cdFontPalette');
        if (fontPal) fontPal.addEventListener('click', function (e) {
            var span = e.target;
            while (span && span !== fontPal && !span.hasAttribute('data-c')) span = span.parentElement;
            if (!span || !span.hasAttribute('data-c')) return;
            var c = span.getAttribute('data-c');
            if (fcHex) fcHex.value = c;
            if (/^#[0-9a-fA-F]{6}$/.test(c) && fcPicker) fcPicker.value = c;
            fontPal.querySelectorAll('span').forEach(function (s) { s.classList.remove('active'); });
            span.classList.add('active');
            updatePreview();
        });

        var bcPicker = el('cdBgColorPicker');
        var bcHex = el('cdBgColorHex');
        if (bcPicker) bcPicker.addEventListener('input', function () {
            if (bcHex) bcHex.value = bcPicker.value;
            updatePreview();
        });
        if (bcHex) bcHex.addEventListener('input', function () {
            if (/^#[0-9a-fA-F]{6}$/.test(bcHex.value) && bcPicker) bcPicker.value = bcHex.value;
            updatePreview();
        });

        var bgPal = el('cdBgPalette');
        if (bgPal) bgPal.addEventListener('click', function (e) {
            var span = e.target;
            while (span && span !== bgPal && !span.hasAttribute('data-c')) span = span.parentElement;
            if (!span || !span.hasAttribute('data-c')) return;
            var c = span.getAttribute('data-c');
            if (bcHex) bcHex.value = c;
            bgPal.querySelectorAll('span').forEach(function (s) { s.classList.remove('active'); });
            span.classList.add('active');
            updatePreview();
        });

        var opSlider = el('cdBgOpacity');
        if (opSlider) opSlider.addEventListener('input', function () {
            setText('cdBgOpacityVal', opSlider.value + '%');
            updatePreview();
        });

        ['cdBgPosX', 'cdBgPosY', 'cdBgScale'].forEach(function (id) {
            var slider = el(id);
            if (!slider) return;
            slider.addEventListener('input', function () {
                setText(id + 'Val', slider.value + '%');
                updatePreview();
                var imgEl = el('cdBgPreviewImg');
                if (imgEl && imgEl.src) {
                    imgEl.style.objectPosition = (val('cdBgPosX') || '50') + '% ' + (val('cdBgPosY') || '50') + '%';
                    imgEl.style.transform = 'scale(' + (parseInt(val('cdBgScale') || '120') / 100) + ')';
                }
            });
        });

        var ov = el('cdSettingsOverlay');
        if (ov) ov.addEventListener('click', function (e) {
            if (e.target === ov) closeCdSettings();
        });
    });

})();

