/* ============================================
   蛋薯机 DanShu Pro v2 — worldbook.js
   世界书独立 App
   ============================================ */

var _wbCurrentTab = 'global';
var _wbCurrentGroup = '全部';
var _wbEditingId = null;
var _wbGroups = [];

var WB_GROUPS_KEY = 'ds_wb_groups';

/* ========== 分组管理 ========== */
function loadWbGroups() {
    try { _wbGroups = JSON.parse(localStorage.getItem(WB_GROUPS_KEY) || '["默认"]'); }
    catch (e) { _wbGroups = ['默认']; }
    if (_wbGroups.indexOf('默认') === -1) _wbGroups.unshift('默认');
}
function saveWbGroups() { safeSetItem(WB_GROUPS_KEY, JSON.stringify(_wbGroups)); }

/* ========== 打开 / 关闭 ========== */
function openWorldBookApp() {
    var o = document.getElementById('wbAppOverlay');
    if (!o) return;
    loadChatRoles(); // 加载世界书数据
    loadWbGroups();
    _wbCurrentTab = 'global';
    _wbCurrentGroup = '全部';
    renderWbGroupBar();
    updateWbTabBar();
    renderWbList();
    o.classList.add('show');
}
function closeWorldBookApp() {
    var o = document.getElementById('wbAppOverlay');
    if (o) o.classList.remove('show');
    closeWbEditor();
}

/* ========== Tab 切换 ========== */
function switchWbTab(tab) {
    _wbCurrentTab = tab;
    _wbCurrentGroup = '全部';
    updateWbTabBar();
    renderWbGroupBar();
    renderWbList();
}
function updateWbTabBar() {
    document.querySelectorAll('#wbTabBar .wb-tab').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-tab') === _wbCurrentTab);
    });
}

/* ========== 分组栏 ========== */
function renderWbGroupBar() {
    var bar = document.getElementById('wbGroupBar');
    if (!bar) return;
    loadWbGroups();

    // 收集当前 tab 下实际用到的分组
    var usedGroups = {};
    for (var i = 0; i < _chatWorldBookLib.length; i++) {
        var wb = _chatWorldBookLib[i];
        var wbType = wb.wbType || 'global';
        if (wbType === _wbCurrentTab) {
            var g = wb.group || '默认';
            usedGroups[g] = true;
        }
    }

    var h = '';
    // "全部"胶囊
    h += '<div class="wb-group-pill' + (_wbCurrentGroup === '全部' ? ' active' : '') + '" onclick="selectWbGroup(\'全部\')">全部</div>';

    for (var j = 0; j < _wbGroups.length; j++) {
        var gn = _wbGroups[j];
        h += '<div class="wb-group-pill' + (_wbCurrentGroup === gn ? ' active' : '') + '" onclick="selectWbGroup(\'' + esc(gn).replace(/'/g, "\\'") + '\')">' + esc(gn) + '</div>';
    }

    // 添加分组的小加号
    h += '<div class="wb-group-add" onclick="addWbGroup()">+</div>';
    bar.innerHTML = h;
}

function selectWbGroup(g) {
    _wbCurrentGroup = g;
    renderWbGroupBar();
    renderWbList();
}

function addWbGroup() {
    var name = prompt('请输入新分组名称：');
    if (!name || !name.trim()) return;
    name = name.trim();
    if (_wbGroups.indexOf(name) !== -1) { showToast('分组已存在'); return; }
    _wbGroups.push(name);
    saveWbGroups();
    _wbCurrentGroup = name;
    renderWbGroupBar();
    renderWbList();
    // 同步到编辑器分组下拉
    refreshEditorGroupSelect();
    showToast('分组已添加: ' + name);
}

/* ========== 列表渲染 ========== */
function renderWbList() {
    var body = document.getElementById('wbAppBody');
    if (!body) return;

    var filtered = [];
    for (var i = 0; i < _chatWorldBookLib.length; i++) {
        var wb = _chatWorldBookLib[i];
        var wbType = wb.wbType || 'global';
        if (wbType !== _wbCurrentTab) continue;
        if (_wbCurrentGroup !== '全部' && (wb.group || '默认') !== _wbCurrentGroup) continue;
        filtered.push(wb);
    }

    if (filtered.length === 0) {
        var tabName = _wbCurrentTab === 'global' ? '全局' : '角色';
        body.innerHTML = '<div class="wb-empty"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>暂无' + tabName + '世界书<br>点击右上角 + 创建</div>';
        return;
    }

    var h = '';
    for (var j = 0; j < filtered.length; j++) {
        var item = filtered[j];
        var preview = (item.content || '').substring(0, 80);
        var injectLabel = { before: '前置注入', middle: '中间注入', after: '后置注入' };
        var injectText = injectLabel[item.inject || 'before'] || '前置注入';

        h += '<div class="wb-card" onclick="openWbEditor(\'' + item.id + '\')">';
        h += '<div class="wb-card-header">';
        h += '<div class="wb-card-name">' + esc(item.name || '未命名') + '</div>';
        h += '<span class="wb-card-group-tag">' + esc(item.group || '默认') + '</span>';
        h += '<span class="wb-card-inject-tag">' + injectText + '</span>';
        h += '</div>';
        if (preview) {
            h += '<div class="wb-card-preview">' + esc(preview) + '</div>';
        }
        h += '<div class="wb-card-actions">';
        h += '<div class="wb-card-btn edit" onclick="event.stopPropagation();openWbEditor(\'' + item.id + '\')">编辑</div>';
        h += '<div class="wb-card-btn delete" onclick="event.stopPropagation();deleteWbEntry(\'' + item.id + '\')">删除</div>';
        h += '</div>';
        h += '</div>';
    }
    body.innerHTML = h;
}

/* ========== 编辑器 ========== */
function openWbEditor(editId) {
    _wbEditingId = editId || null;
    var overlay = document.getElementById('wbEditorOverlay');
    if (!overlay) return;

    // 刷新分组下拉
    refreshEditorGroupSelect();

    var titleEl = document.getElementById('wbEditorTitle');
    document.getElementById('wbEdName').value = '';
    document.getElementById('wbEdContent').value = '';
    document.getElementById('wbEdGroup').value = '默认';
    selectWbType('global');
    selectWbInject('before');

    if (editId) {
        var wb = findWorldBook(editId);
        if (wb) {
            titleEl.textContent = '编辑世界书';
            document.getElementById('wbEdName').value = wb.name || '';
            document.getElementById('wbEdContent').value = wb.content || '';
            document.getElementById('wbEdGroup').value = wb.group || '默认';
            selectWbType(wb.wbType || 'global');
            selectWbInject(wb.inject || 'before');
        }
    } else {
        titleEl.textContent = '新建世界书';
        // 默认当前 tab 的类型
        selectWbType(_wbCurrentTab);
        if (_wbCurrentGroup !== '全部') {
            document.getElementById('wbEdGroup').value = _wbCurrentGroup;
        }
    }

    overlay.classList.add('show');
}

function closeWbEditor() {
    var overlay = document.getElementById('wbEditorOverlay');
    if (overlay) overlay.classList.remove('show');
    _wbEditingId = null;
}

function refreshEditorGroupSelect() {
    loadWbGroups();
    var sel = document.getElementById('wbEdGroup');
    if (!sel) return;
    var curVal = sel.value;
    sel.innerHTML = '';
    for (var i = 0; i < _wbGroups.length; i++) {
        var opt = document.createElement('option');
        opt.value = _wbGroups[i];
        opt.textContent = _wbGroups[i];
        sel.appendChild(opt);
    }
    // 恢复选择
    var found = false;
    for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === curVal) { found = true; break; }
    }
    if (found) sel.value = curVal;
}

function selectWbType(type) {
    document.querySelectorAll('.wb-type-btn').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-type') === type);
    });
}
function getSelectedWbType() {
    var el = document.querySelector('.wb-type-btn.active');
    return el ? el.getAttribute('data-type') : 'global';
}

function selectWbInject(pos) {
    document.querySelectorAll('.wb-inject-btn').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-pos') === pos);
    });
}
function getSelectedWbInject() {
    var el = document.querySelector('.wb-inject-btn.active');
    return el ? el.getAttribute('data-pos') : 'before';
}

function saveWbEntry() {
    var name = document.getElementById('wbEdName').value.trim();
    if (!name) { showToast('请输入世界书名称'); return; }
    var group = document.getElementById('wbEdGroup').value;
    var content = document.getElementById('wbEdContent').value.trim();
    var wbType = getSelectedWbType();
    var inject = getSelectedWbInject();

    if (_wbEditingId) {
        var wb = findWorldBook(_wbEditingId);
        if (wb) {
            wb.name = name;
            wb.group = group;
            wb.content = content;
            wb.wbType = wbType;
            wb.inject = inject;
        }
        showToast('世界书已更新');
    } else {
        var id = genId();
        _chatWorldBookLib.push({
            id: id,
            name: name,
            group: group,
            content: content,
            wbType: wbType,
            inject: inject
        });
        showToast('世界书已创建');
    }

    saveWorldBookLib();
    closeWbEditor();
    renderWbList();
}

function deleteWbEntry(id) {
    if (!confirm('确认删除这个世界书？')) return;
    for (var i = 0; i < _chatWorldBookLib.length; i++) {
        if (_chatWorldBookLib[i].id === id) {
            _chatWorldBookLib.splice(i, 1);
            break;
        }
    }
    saveWorldBookLib();
    renderWbList();
    showToast('已删除');
}

/* ==========================================================
   挂载选择器 — 分组折叠版（替换 chat.js 中的平铺列表）
   在 chat.js 的 openMountSelector 中对 worldbook 类型特殊处理
   ========================================================== */

/**
 * 构建按分组折叠的世界书挂载列表 HTML
 * @param {string} selectedId - 当前已选中的世界书ID
 * @returns {string} HTML
 */
function buildWorldBookMountList(selectedIds) {
    loadWbGroups();
    var selArr = Array.isArray(selectedIds) ? selectedIds : (selectedIds ? [selectedIds] : []);

    // 按分组归类
    var grouped = {};
    for (var i = 0; i < _chatWorldBookLib.length; i++) {
        var wb = _chatWorldBookLib[i];
        var g = wb.group || '默认';
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(wb);
    }

    var h = '';

    // 按分组渲染
    var allGroups = Object.keys(grouped);
    for (var j = 0; j < allGroups.length; j++) {
        var gName = allGroups[j];
        var items = grouped[gName];
        var hasSelected = false;
        for (var k = 0; k < items.length; k++) {
            if (selArr.indexOf(items[k].id) !== -1) { hasSelected = true; break; }
        }

        h += '<div class="wb-mount-group">';
        h += '<div class="wb-mount-group-header' + (hasSelected ? ' open' : '') + '" onclick="toggleWbMountGroup(this)">';
        h += '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>';
        h += '<span>' + esc(gName) + '</span>';
        h += '<span class="wb-mount-group-count">' + items.length + '个</span>';
        h += '</div>';
        h += '<div class="wb-mount-group-items' + (hasSelected ? ' open' : '') + '">';

        for (var m = 0; m < items.length; m++) {
            var item = items[m];
            var isActive = selArr.indexOf(item.id) !== -1;
            h += '<div class="chat-mount-option' + (isActive ? ' selected' : '') + '" onclick="toggleWbMountOption(\'' + item.id + '\')">';
            h += '<div class="chat-mount-option-name">' + esc(item.name) + '</div>';
            h += '<div class="chat-mount-option-check">' + (isActive ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div>';
            h += '</div>';
        }

        h += '</div></div>';
    }

    return h;
}

function toggleWbMountGroup(headerEl) {
    headerEl.classList.toggle('open');
    var items = headerEl.nextElementSibling;
    if (items) items.classList.toggle('open');
}
