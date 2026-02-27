/* ============================================
   appearance.js — 外观设置独立页面
   蛋薯机 danshu pro
   ============================================ */

// ==========================================
// localStorage keys
// ==========================================
var AP = {
    wallpaper: 'ds_ap_wallpaper',
    fontFamily: 'ds_ap_font_family',
    fontUrl: 'ds_ap_font_url',
    fontName: 'ds_ap_font_name',
    bubbleColor: 'ds_ap_bubble_color',
    cardTitleColor: 'ds_ap_card_title_color',
    cardTextColor: 'ds_ap_card_text_color',
    statusBar: 'ds_ap_status_bar'
};

// 8个应用图标的 key 前缀
var ICON_KEY_PREFIX = 'ds_ap_icon_';

// 8个应用ID及原始SVG缓存
var APP_ICON_IDS = [
    'appIconApi', 'appIconAppearance', 'appIconTieba', 'appIconMeituan',
    'appIconCalendar', 'appIconWeather', 'appIconAlbum', 'appIconMusic'
];
var _originalSvg = {};

// 暂存
var _pending = {};
var _pendingIcons = {};

// ==========================================
// 页面：打开 / 关闭
// ==========================================
function openAppearanceApp() {
    // 首次缓存原始SVG
    cacheOriginalSvg();
    document.getElementById('appearPageOverlay').classList.add('active');
    loadAppearForm();
}

function closeAppearPage() {
    document.getElementById('appearPageOverlay').classList.remove('active');
    _pending = {};
    _pendingIcons = {};
}

// ==========================================
// 缓存原始SVG（只存一次）
// ==========================================
function cacheOriginalSvg() {
    APP_ICON_IDS.forEach(function (id) {
        if (_originalSvg[id]) return;
        var el = document.getElementById(id);
        if (!el) return;
        // 只缓存SVG，不缓存img
        var svg = el.querySelector('svg');
        if (svg) {
            _originalSvg[id] = svg.outerHTML;
        }
    });
}

// ==========================================
// 读取已保存设置 → 填入面板
// ==========================================
function loadAppearForm() {
    _pending = {};
    _pendingIcons = {};

    // 壁纸
    var wp = localStorage.getItem(AP.wallpaper);
    var wpImg = document.getElementById('appearWpImg');
    var wpHint = document.getElementById('appearWpHint');
    if (wp) {
        wpImg.src = wp;
        wpImg.classList.add('visible');
        wpHint.style.display = 'none';
    } else {
        wpImg.src = '';
        wpImg.classList.remove('visible');
        wpHint.style.display = '';
    }

    // 图标预览
    document.querySelectorAll('.appear-icon-replace-preview').forEach(function (box) {
        var targetId = box.dataset.target;
        var saved = localStorage.getItem(ICON_KEY_PREFIX + targetId);
        var img = box.querySelector('img');
        if (saved) {
            img.src = saved;
            img.classList.add('visible');
            box.classList.add('has-image');
        } else {
            img.src = '';
            img.classList.remove('visible');
            box.classList.remove('has-image');
        }
    });

    // 字体
    var fontUrl = localStorage.getItem(AP.fontUrl) || '';
    var fontName = localStorage.getItem(AP.fontName) || '';
    var fontFamily = localStorage.getItem(AP.fontFamily) || '';
    var sel = document.getElementById('appearFontSelect');
    if (fontUrl) {
        sel.value = 'custom';
        document.getElementById('appearCustomFontWrap').style.display = '';
        document.getElementById('appearCustomFontNameWrap').style.display = '';
        document.getElementById('appearCustomFontUrl').value = fontUrl;
        document.getElementById('appearCustomFontName').value = fontName;
    } else {
        sel.value = fontFamily;
        document.getElementById('appearCustomFontWrap').style.display = 'none';
        document.getElementById('appearCustomFontNameWrap').style.display = 'none';
    }
    updateFontPreview();

    // 气泡颜色
    var bc = localStorage.getItem(AP.bubbleColor) || '#1a1a1a';
    document.getElementById('appearBubbleColorPicker').value = bc;
    document.getElementById('appearBubbleColorHex').value = bc;

    // 大卡片标题颜色
    var ctc = localStorage.getItem(AP.cardTitleColor) || '#ffffff';
    document.getElementById('appearCardTitleColorPicker').value = ctc;
    document.getElementById('appearCardTitleColorHex').value = ctc;

    // 大卡片正文颜色
    var cxc = localStorage.getItem(AP.cardTextColor) || '#cccccc';
    document.getElementById('appearCardTextColorPicker').value = cxc;
    document.getElementById('appearCardTextColorHex').value = cxc;

    // 顶栏
    var sb = localStorage.getItem(AP.statusBar);
    var toggle = document.getElementById('appearStatusToggle');
    if (sb === 'hidden') {
        toggle.classList.remove('on');
    } else {
        toggle.classList.add('on');
    }
}

// ==========================================
// 壁纸
// ==========================================
function pickWallpaper() {
    pickImage(function (dataUrl) {
        document.getElementById('appearWpImg').src = dataUrl;
        document.getElementById('appearWpImg').classList.add('visible');
        document.getElementById('appearWpHint').style.display = 'none';
        _pending.wallpaper = dataUrl;
    });
}

function removeWallpaper() {
    document.getElementById('appearWpImg').src = '';
    document.getElementById('appearWpImg').classList.remove('visible');
    document.getElementById('appearWpHint').style.display = '';
    _pending.wallpaper = '';
    localStorage.removeItem(AP.wallpaper);
    document.querySelector('.phone-frame').style.backgroundImage = '';
    showToast('壁纸已移除');
}

// ==========================================
// 应用图标更换
// ==========================================
function pickIconImg(box) {
    var targetId = box.dataset.target;
    pickImage(function (dataUrl) {
        var img = box.querySelector('img');
        img.src = dataUrl;
        img.classList.add('visible');
        box.classList.add('has-image');
        _pendingIcons[targetId] = dataUrl;
    });
}

function resetIconImg(targetId, e) {
    if (e) e.stopPropagation();

    // 面板预览还原
    var box = document.querySelector('.appear-icon-replace-preview[data-target="' + targetId + '"]');
    if (box) {
        var img = box.querySelector('img');
        img.src = '';
        img.classList.remove('visible');
        box.classList.remove('has-image');
    }

    // 标记删除
    _pendingIcons[targetId] = '';

    // 立即还原主屏图标
    localStorage.removeItem(ICON_KEY_PREFIX + targetId);
    restoreIconSvg(targetId);

    showToast('图标已还原');
}

function applyIconImage(targetId, dataUrl) {
    var el = document.getElementById(targetId);
    if (!el) return;

    // 清空内容，放入img
    el.innerHTML = '';
    var img = document.createElement('img');
    img.src = dataUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '14px';
    el.appendChild(img);
    el.style.overflow = 'hidden';
}

function restoreIconSvg(targetId) {
    var el = document.getElementById(targetId);
    if (!el) return;
    if (_originalSvg[targetId]) {
        el.innerHTML = _originalSvg[targetId];
        el.style.overflow = '';
    }
}

// ==========================================
// 字体
// ==========================================
function onFontSelectChange() {
    var sel = document.getElementById('appearFontSelect');
    var isCustom = sel.value === 'custom';
    document.getElementById('appearCustomFontWrap').style.display = isCustom ? '' : 'none';
    document.getElementById('appearCustomFontNameWrap').style.display = isCustom ? '' : 'none';
    updateFontPreview();
}

function updateFontPreview() {
    var sel = document.getElementById('appearFontSelect');
    var preview = document.getElementById('appearFontPreviewText');
    if (sel.value && sel.value !== 'custom') {
        preview.style.fontFamily = sel.value;
    } else {
        preview.style.fontFamily = '';
    }
}

async function loadCustomFont(url, name) {
    if (!url || !name) return false;
    try {
        var font = new FontFace(name, 'url(' + url + ')');
        var loaded = await font.load();
        document.fonts.add(loaded);
        return true;
    } catch (e) {
        console.error('Font load error:', e);
        return false;
    }
}

function applyGlobalFont(family) {
    var frame = document.querySelector('.phone-frame');
    if (family) {
        frame.style.fontFamily = family;
    } else {
        frame.style.fontFamily = '';
    }
}

// ==========================================
// 颜色联动
// ==========================================
function setupColorPair(pickerId, hexId, presetsId, onChange) {
    var picker = document.getElementById(pickerId);
    var hex = document.getElementById(hexId);
    var presets = document.getElementById(presetsId);

    if (picker && hex) {
        picker.addEventListener('input', function () {
            hex.value = this.value;
            if (onChange) onChange(this.value);
        });
        hex.addEventListener('input', function () {
            var v = this.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                picker.value = v;
                if (onChange) onChange(v);
            }
        });
    }

    if (presets) {
        presets.addEventListener('click', function (e) {
            var dot = e.target.closest('.appear-color-dot');
            if (!dot) return;
            var color = dot.dataset.color;
            if (picker) picker.value = color;
            if (hex) hex.value = color;
            if (onChange) onChange(color);
        });
    }
}

// ==========================================
// 顶栏
// ==========================================
function toggleAppearStatus() {
    document.getElementById('appearStatusToggle').classList.toggle('on');
}

function applyStatusBar(show) {
    var bar = document.querySelector('.status-bar');
    if (!bar) return;
    bar.style.visibility = show ? 'visible' : 'hidden';
    bar.style.opacity = show ? '1' : '0';
}

// ==========================================
// 保存
// ==========================================
async function saveAppearSettings() {
    // 1. 壁纸
    if (_pending.wallpaper !== undefined) {
        if (_pending.wallpaper) {
            localStorage.setItem(AP.wallpaper, _pending.wallpaper);
        } else {
            localStorage.removeItem(AP.wallpaper);
        }
    }
    var wp = localStorage.getItem(AP.wallpaper);
    var frame = document.querySelector('.phone-frame');
    if (wp) {
        frame.style.backgroundImage = 'url(' + wp + ')';
        frame.style.backgroundSize = 'cover';
        frame.style.backgroundPosition = 'center';
    } else {
        frame.style.backgroundImage = '';
    }

    // 2. 应用图标
    Object.keys(_pendingIcons).forEach(function (targetId) {
        var dataUrl = _pendingIcons[targetId];
        if (dataUrl) {
            localStorage.setItem(ICON_KEY_PREFIX + targetId, dataUrl);
            applyIconImage(targetId, dataUrl);
        } else {
            localStorage.removeItem(ICON_KEY_PREFIX + targetId);
            restoreIconSvg(targetId);
        }
    });

    // 3. 字体
    var fontSelect = document.getElementById('appearFontSelect');
    if (fontSelect.value === 'custom') {
        var url = document.getElementById('appearCustomFontUrl').value.trim();
        var name = document.getElementById('appearCustomFontName').value.trim();
        if (url && name) {
            var ok = await loadCustomFont(url, name);
            if (ok) {
                localStorage.setItem(AP.fontUrl, url);
                localStorage.setItem(AP.fontName, name);
                localStorage.setItem(AP.fontFamily, "'" + name + "'");
                applyGlobalFont("'" + name + "'");
            } else {
                showToast('字体加载失败，请检查URL');
                return;
            }
        }
    } else {
        localStorage.setItem(AP.fontFamily, fontSelect.value);
        localStorage.removeItem(AP.fontUrl);
        localStorage.removeItem(AP.fontName);
        applyGlobalFont(fontSelect.value);
    }

    // 4. 气泡颜色
    var bubbleColor = document.getElementById('appearBubbleColorHex').value.trim() || '#1a1a1a';
    localStorage.setItem(AP.bubbleColor, bubbleColor);
    document.querySelectorAll('.bubble-text').forEach(function (el) {
        el.style.color = bubbleColor;
    });

    // 5. 大卡片标题颜色
    var ctColor = document.getElementById('appearCardTitleColorHex').value.trim() || '#ffffff';
    localStorage.setItem(AP.cardTitleColor, ctColor);
    var ct = document.getElementById('cardTitle');
    if (ct) ct.style.color = ctColor;

    // 6. 大卡片正文颜色
    var cxColor = document.getElementById('appearCardTextColorHex').value.trim() || '#cccccc';
    localStorage.setItem(AP.cardTextColor, cxColor);
    var cx = document.getElementById('cardText');
    if (cx) cx.style.color = cxColor;

    // 7. 顶栏
    var isOn = document.getElementById('appearStatusToggle').classList.contains('on');
    localStorage.setItem(AP.statusBar, isOn ? 'visible' : 'hidden');
    applyStatusBar(isOn);

    _pending = {};
    _pendingIcons = {};
    showToast('外观设置已保存');
}

// ==========================================
// 清除所有
// ==========================================
function clearAllAppear() {
    if (!confirm('确认清除所有外观设置？将恢复默认外观。')) return;

    // 清除通用设置
    Object.values(AP).forEach(function (key) {
        localStorage.removeItem(key);
    });

    // 清除图标
    APP_ICON_IDS.forEach(function (id) {
        localStorage.removeItem(ICON_KEY_PREFIX + id);
        restoreIconSvg(id);
    });

    // 恢复默认
    var frame = document.querySelector('.phone-frame');
    frame.style.backgroundImage = '';
    frame.style.fontFamily = '';

    document.querySelectorAll('.bubble-text').forEach(function (el) {
        el.style.color = '';
    });

    var ct = document.getElementById('cardTitle');
    var cx = document.getElementById('cardText');
    if (ct) ct.style.color = '';
    if (cx) cx.style.color = '';

    applyStatusBar(true);

    loadAppearForm();
    showToast('已恢复默认外观');
}

// ==========================================
// 通用：选择图片
// ==========================================
function pickImage(callback) {
    var input = document.getElementById('appearFileInput');
    input.value = '';
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            callback(ev.target.result);
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// ==========================================
// 页面加载时恢复设置
// ==========================================
async function restoreAppearSettings() {
    // 缓存SVG
    cacheOriginalSvg();

    // 壁纸
    var wp = localStorage.getItem(AP.wallpaper);
    if (wp) {
        var frame = document.querySelector('.phone-frame');
        frame.style.backgroundImage = 'url(' + wp + ')';
        frame.style.backgroundSize = 'cover';
        frame.style.backgroundPosition = 'center';
    }

    // 图标
    APP_ICON_IDS.forEach(function (id) {
        var saved = localStorage.getItem(ICON_KEY_PREFIX + id);
        if (saved) {
            applyIconImage(id, saved);
        }
    });

    // 字体
    var fontUrl = localStorage.getItem(AP.fontUrl);
    var fontName = localStorage.getItem(AP.fontName);
    var fontFamily = localStorage.getItem(AP.fontFamily);
    if (fontUrl && fontName) {
        var ok = await loadCustomFont(fontUrl, fontName);
        if (ok) applyGlobalFont("'" + fontName + "'");
    } else if (fontFamily) {
        applyGlobalFont(fontFamily);
    }

    // 气泡颜色
    var bc = localStorage.getItem(AP.bubbleColor);
    if (bc) {
        document.querySelectorAll('.bubble-text').forEach(function (el) {
            el.style.color = bc;
        });
    }

    // 大卡片颜色
    var ctc = localStorage.getItem(AP.cardTitleColor);
    if (ctc) {
        var ct = document.getElementById('cardTitle');
        if (ct) ct.style.color = ctc;
    }
    var cxc = localStorage.getItem(AP.cardTextColor);
    if (cxc) {
        var cx = document.getElementById('cardText');
        if (cx) cx.style.color = cxc;
    }

    // 顶栏
    var sb = localStorage.getItem(AP.statusBar);
    if (sb === 'hidden') applyStatusBar(false);
}

// ==========================================
// DOMContentLoaded
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    restoreAppearSettings();

    // 气泡颜色联动
    setupColorPair('appearBubbleColorPicker', 'appearBubbleColorHex', 'appearBubblePresets', function (c) {
        document.querySelectorAll('.bubble-text').forEach(function (el) { el.style.color = c; });
    });

    // 大卡片标题颜色联动
    setupColorPair('appearCardTitleColorPicker', 'appearCardTitleColorHex', 'appearCardTitlePresets', function (c) {
        var ct = document.getElementById('cardTitle');
        if (ct) ct.style.color = c;
    });

    // 大卡片正文颜色联动
    setupColorPair('appearCardTextColorPicker', 'appearCardTextColorHex', 'appearCardTextPresets', function (c) {
        var cx = document.getElementById('cardText');
        if (cx) cx.style.color = c;
    });
});

