/* ============================================
   蛋薯机 DanShu Pro v2 — appearance.js
   外观设置 — smartCompress + safeSetItem 全链路防爆
   ============================================ */

var ICON_LIST = [
    { id: 'icon_api',          name: 'API' },
    { id: 'icon_appear',       name: '外观' },
    { id: 'icon_tieba',        name: '贴吧' },
    { id: 'icon_meituan',      name: '美团' },
    { id: 'icon_mail',         name: '邮件' },
    { id: 'icon_weather',      name: '天气' },
    { id: 'icon_music',        name: '音乐' },
    { id: 'icon_album',        name: '相册' },
    { id: 'icon_dock_msg',     name: '消息' },
    { id: 'icon_dock_note',    name: '手帐' },
    { id: 'icon_dock_browser', name: '浏览器' }
];

var _editingIconId = null;

/* ========== 打开 / 关闭 ========== */
function openAppearanceApp() {
    var overlay = document.getElementById('appearAppOverlay');
    if (!overlay) return;
    loadAppearanceSettings();
    renderIconGrid();
    overlay.classList.add('show');
}

function closeAppearanceApp() {
    var overlay = document.getElementById('appearAppOverlay');
    if (overlay) overlay.classList.remove('show');
}

/* ========== 读取设置 ========== */
function loadAppearanceSettings() {
    var wpUrl = localStorage.getItem('ds_appear_wallpaper') || '';
    document.getElementById('appearWpUrl').value = wpUrl;
    refreshWallpaperPreview();

    var iconStyle = localStorage.getItem('ds_appear_iconStyle') || 'glass';
    highlightIconOption(iconStyle);

    var fontUrl = localStorage.getItem('ds_appear_fontUrl') || '';
    document.getElementById('appearFontUrl').value = fontUrl;

    var bubbleColor = localStorage.getItem('ds_appear_bubbleColor') || 'rgba(80,60,70,0.9)';
    document.getElementById('appearBubbleColorHex').value = bubbleColor;
    if (bubbleColor.startsWith('#')) {
        document.getElementById('appearBubbleColorPicker').value = bubbleColor;
    }
    highlightAppearColorDot(bubbleColor);

    var statusbar = localStorage.getItem('ds_appear_statusbar');
    document.getElementById('appearStatusbarToggle').checked = statusbar !== 'hidden';
}

/* ========== 壁纸 ========== */
function refreshWallpaperPreview() {
    var url = document.getElementById('appearWpUrl').value.trim();
    var img = document.getElementById('appearWpPreviewImg');
    if (url) {
        img.src = url;
        img.style.display = 'block';
    } else {
        var wallpaper = document.getElementById('wallpaper');
        var current = getComputedStyle(wallpaper).backgroundImage;
        var match = current.match(/url\(["']?(.+?)["']?\)/);
        if (match && match[1] && match[1] !== 'none') {
            img.src = match[1];
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }
}

function triggerAppearWpUpload() {
    document.getElementById('appearWpFile').click();
}

function handleAppearWpFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    showToast('正在压缩壁纸...');
    var reader = new FileReader();
    reader.onload = function (e) {
        smartCompress(e.target.result, 60, function (compressed) {
            var sizeKB = Math.round(compressed.length / 1024);
            document.getElementById('appearWpUrl').value = compressed;
            refreshWallpaperPreview();
            showToast('壁纸压缩完成 (' + sizeKB + 'KB)');
        });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

/* ========== 图标风格 ========== */
function selectIconStyle(style) {
    highlightIconOption(style);
}

function highlightIconOption(style) {
    document.querySelectorAll('.appear-icon-option').forEach(function (opt) {
        opt.classList.toggle('active', opt.getAttribute('data-style') === style);
    });
}

function getSelectedIconStyle() {
    var active = document.querySelector('.appear-icon-option.active');
    return active ? active.getAttribute('data-style') : 'glass';
}

function applyIconStyle(style) {
    var frame = document.getElementById('phoneFrame');
    frame.classList.remove('icon-style-glass', 'icon-style-gradient', 'icon-style-solid');
    if (style !== 'glass') {
        frame.classList.add('icon-style-' + style);
    }
}

/* ========== 自定义图标图片 ========== */
function getIconImage(iconId) {
    return localStorage.getItem('ds_icon_' + iconId) || '';
}

function renderIconGrid() {
    var container = document.getElementById('appearIconGrid');
    var html = '';
    for (var i = 0; i < ICON_LIST.length; i++) {
        var item = ICON_LIST[i];
        var imgSrc = getIconImage(item.id);
        var hasImg = !!imgSrc;

        html += '<div class="appear-icon-item" onclick="triggerIconUpload(\'' + item.id + '\')">';
        html += '  <div class="appear-icon-item-box' + (hasImg ? ' has-custom' : '') + '">';
        if (hasImg) {
            html += '    <img src="' + imgSrc + '" alt="">';
            html += '    <div class="appear-icon-clear" onclick="event.stopPropagation(); clearSingleIcon(\'' + item.id + '\')">';
            html += '      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            html += '    </div>';
        } else {
            html += '    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        }
        html += '  </div>';
        html += '  <div class="appear-icon-item-name">' + item.name + '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function triggerIconUpload(iconId) {
    _editingIconId = iconId;
    document.getElementById('iconCustomFile').click();
}

function handleIconCustomFile(event) {
    var file = event.target.files[0];
    if (!file || !_editingIconId) return;

    var iconId = _editingIconId;
    showToast('正在处理图标...');

    var reader = new FileReader();
    reader.onload = function (e) {
        // ★ 图标压缩到3KB以内（54x54显示绰绰有余）
        smartCompress(e.target.result, 3, function (compressed) {
            var sizeKB = Math.round(compressed.length / 1024);
            var key = 'ds_icon_' + iconId;

            // ★ 用safeSetItem（自动先删旧值 + 清理大数据 + 重试）
            if (safeSetItem(key, compressed)) {
                applyOneIconImage(iconId, compressed);
                renderIconGrid();
                showToast('图标已更换 (' + sizeKB + 'KB)');
            } else {
                // ★ safeSetItem已经自动清理还失败 → 最后手段：清掉其他图标和壁纸base64
                for (var i = 0; i < ICON_LIST.length; i++) {
                    if (ICON_LIST[i].id !== iconId) {
                        localStorage.removeItem('ds_icon_' + ICON_LIST[i].id);
                    }
                }
                var wp = localStorage.getItem('ds_appear_wallpaper');
                if (wp && wp.indexOf('data:image') !== -1) {
                    localStorage.removeItem('ds_appear_wallpaper');
                }

                try {
                    localStorage.setItem(key, compressed);
                    applyOneIconImage(iconId, compressed);
                    renderIconGrid();
                    showToast('图标已更换（已自动清理旧数据）');
                } catch (finalErr) {
                    showToast('存储空间严重不足，建议清除浏览器数据');
                }
            }
            _editingIconId = null;
        });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function clearSingleIcon(iconId) {
    localStorage.removeItem('ds_icon_' + iconId);
    removeOneIconImage(iconId);
    renderIconGrid();
    showToast('已恢复默认图标');
}

function applyOneIconImage(iconId, imgSrc) {
    var el = document.getElementById(iconId);
    if (!el) return;
    if (!el.getAttribute('data-original-svg')) {
        el.setAttribute('data-original-svg', el.innerHTML);
    }
    el.innerHTML = '<img src="' + imgSrc + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;position:absolute;top:0;left:0;z-index:2;">';
}

function removeOneIconImage(iconId) {
    var el = document.getElementById(iconId);
    if (!el) return;
    var original = el.getAttribute('data-original-svg');
    if (original) {
        el.innerHTML = original;
    }
}

function applyAllIconImages() {
    for (var i = 0; i < ICON_LIST.length; i++) {
        var el = document.getElementById(ICON_LIST[i].id);
        if (el && !el.getAttribute('data-original-svg')) {
            el.setAttribute('data-original-svg', el.innerHTML);
        }
    }
    for (var j = 0; j < ICON_LIST.length; j++) {
        var id = ICON_LIST[j].id;
        var src = getIconImage(id);
        if (src) applyOneIconImage(id, src);
    }
}

/* ========== 气泡字体颜色 ========== */
function pickAppearBubbleColor(el) {
    var color = el.getAttribute('data-color');
    document.getElementById('appearBubbleColorHex').value = color;
    if (color.startsWith('#')) {
        document.getElementById('appearBubbleColorPicker').value = color;
    }
    highlightAppearColorDot(color);
}

function setAppearBubbleFromPicker(val) {
    document.getElementById('appearBubbleColorHex').value = val;
    highlightAppearColorDot(val);
}

function setAppearBubbleFromHex(val) {
    if (val.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
        document.getElementById('appearBubbleColorPicker').value = val;
    }
    highlightAppearColorDot(val);
}

function highlightAppearColorDot(color) {
    document.querySelectorAll('.appear-color-dot').forEach(function (d) {
        d.classList.toggle('active', d.getAttribute('data-color') === color);
    });
}

function applyBubbleColor(color) {
    document.querySelectorAll('.bubble-text').forEach(function (el) {
        el.style.color = color;
    });
}

/* ========== 全局字体 ========== */
var _globalFontLoaded = '';
function applyGlobalFont(url) {
    if (!url) {
        document.getElementById('phoneFrame').style.fontFamily = '';
        return;
    }
    if (_globalFontLoaded === url) {
        document.getElementById('phoneFrame').style.fontFamily = '"GlobalCustomFont", sans-serif';
        return;
    }
    var fontFace = new FontFace('GlobalCustomFont', 'url(' + url + ')');
    fontFace.load().then(function (loaded) {
        document.fonts.add(loaded);
        _globalFontLoaded = url;
        document.getElementById('phoneFrame').style.fontFamily = '"GlobalCustomFont", sans-serif';
    }).catch(function () {
        showToast('字体加载失败');
    });
}

/* ========== 顶栏开关 ========== */
function applyStatusbarState(visible) {
    var frame = document.getElementById('phoneFrame');
    if (visible) {
        frame.classList.remove('statusbar-hidden');
    } else {
        frame.classList.add('statusbar-hidden');
    }
}

/* ========== 保存全部外观设置 ========== */
function saveAppearanceSettings() {
    var wpUrl = document.getElementById('appearWpUrl').value.trim();
    var iconStyle = getSelectedIconStyle();
    var fontUrl = document.getElementById('appearFontUrl').value.trim();
    var bubbleColor = document.getElementById('appearBubbleColorHex').value.trim() || 'rgba(80,60,70,0.9)';
    var statusbar = document.getElementById('appearStatusbarToggle').checked;

    if (wpUrl) {
        if (wpUrl.startsWith('data:')) {
            showToast('正在压缩保存壁纸...');
            // ★ 壁纸压缩到60KB
            smartCompress(wpUrl, 60, function (compressed) {
                var sizeKB = Math.round(compressed.length / 1024);
                // ★ 用safeSetItem自动清理重试
                if (safeSetItem('ds_appear_wallpaper', compressed)) {
                    doFinishAppearSave(compressed, iconStyle, fontUrl, bubbleColor, statusbar);
                } else {
                    showToast('壁纸太大无法保存，请使用图片URL链接');
                }
            });
            return;
        }
        // URL链接很小直接存
        safeSetItem('ds_appear_wallpaper', wpUrl);
    } else {
        localStorage.removeItem('ds_appear_wallpaper');
    }

    doFinishAppearSave(wpUrl, iconStyle, fontUrl, bubbleColor, statusbar);
}

function doFinishAppearSave(wpSrc, iconStyle, fontUrl, bubbleColor, statusbar) {
    safeSetItem('ds_appear_iconStyle', iconStyle);
    safeSetItem('ds_appear_fontUrl', fontUrl);
    safeSetItem('ds_appear_bubbleColor', bubbleColor);
    safeSetItem('ds_appear_statusbar', statusbar ? 'visible' : 'hidden');

    var wallpaper = document.getElementById('wallpaper');
    var savedWp = localStorage.getItem('ds_appear_wallpaper');
    if (savedWp) {
        wallpaper.style.backgroundImage = 'url(' + savedWp + ')';
    } else {
        wallpaper.style.backgroundImage = '';
    }

    applyIconStyle(iconStyle);
    if (fontUrl) { applyGlobalFont(fontUrl); }
    else { document.getElementById('phoneFrame').style.fontFamily = ''; }
    applyBubbleColor(bubbleColor);
    applyStatusbarState(statusbar);

    closeAppearanceApp();
    showToast('外观设置已保存');
}

/* ========== 清除全部外观设置 ========== */
function clearAllAppearSettings() {
    if (!confirm('确认清除所有外观设置？')) return;

    ['ds_appear_wallpaper', 'ds_appear_iconStyle', 'ds_appear_fontUrl',
     'ds_appear_bubbleColor', 'ds_appear_statusbar'].forEach(function (k) {
        localStorage.removeItem(k);
    });

    for (var i = 0; i < ICON_LIST.length; i++) {
        localStorage.removeItem('ds_icon_' + ICON_LIST[i].id);
        removeOneIconImage(ICON_LIST[i].id);
    }

    document.getElementById('wallpaper').style.backgroundImage = '';
    applyIconStyle('glass');
    document.getElementById('phoneFrame').style.fontFamily = '';
    _globalFontLoaded = '';
    document.querySelectorAll('.bubble-text').forEach(function (el) { el.style.color = ''; });
    applyStatusbarState(true);

    document.getElementById('appearWpUrl').value = '';
    document.getElementById('appearFontUrl').value = '';
    document.getElementById('appearBubbleColorHex').value = 'rgba(80,60,70,0.9)';
    document.getElementById('appearBubbleColorPicker').value = '#503c46';
    document.getElementById('appearStatusbarToggle').checked = true;
    highlightIconOption('glass');
    highlightAppearColorDot('');
    refreshWallpaperPreview();
    renderIconGrid();

    var usage = getStorageUsage();
    showToast('已清除，当前占用 ' + usage.usedKB + 'KB');
}

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', function () {
    var savedWp = localStorage.getItem('ds_appear_wallpaper');
    if (savedWp) {
        document.getElementById('wallpaper').style.backgroundImage = 'url(' + savedWp + ')';
    }

    var iconStyle = localStorage.getItem('ds_appear_iconStyle') || 'glass';
    applyIconStyle(iconStyle);

    var fontUrl = localStorage.getItem('ds_appear_fontUrl');
    if (fontUrl) applyGlobalFont(fontUrl);

    var bubbleColor = localStorage.getItem('ds_appear_bubbleColor');
    if (bubbleColor) applyBubbleColor(bubbleColor);

    var statusbar = localStorage.getItem('ds_appear_statusbar');
    if (statusbar === 'hidden') applyStatusbarState(false);

    setTimeout(function () { applyAllIconImages(); }, 100);
});


