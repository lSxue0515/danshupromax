/* ============================================
   蛋薯机 DanShu Pro v2 — chat.js
   聊一聊 App — 浅粉色交互 + 对话页重构
   ============================================ */

var _chatRoles = [];
var _chatCurrentTab = 'messages';
var _chatCurrentConv = null;
var _chatEditingRoleId = null;
var _crAvatarData = '';

var _chatPersonas = [];
var _chatActivePersonaId = '';
var _peEditingId = null;
var _peAvatarData = '';

var _chatWorldBookLib = [];
var _chatStickerLib = [];
var _crMountPersona = '';
var _crMountWorldBook = '';
var _crMountSticker = '';

// 对话页双头像
var _convLeftAvatar = '';
var _convRightAvatar = '';
var _pendingImageData = null; // 待发送的图片base64

function loadChatRoles() {
    try { _chatRoles = JSON.parse(localStorage.getItem('ds_chat_roles') || '[]'); } catch (e) { _chatRoles = []; }
    try { _chatPersonas = JSON.parse(localStorage.getItem('ds_chat_personas') || '[]'); } catch (e) { _chatPersonas = []; }
    function getActivePersona(roleId) {
        var rid = roleId || _chatCurrentConv;
        if (rid) {
            var r = findRole(rid);
            if (r && r.boundPersonaId) {
                var p = findPersona(r.boundPersonaId);
                if (p) return p;
            }
        }
        return findPersona(_chatActivePersonaId);
    }
    try { _chatWorldBookLib = JSON.parse(localStorage.getItem('ds_chat_worldbooks') || '[]'); } catch (e) { _chatWorldBookLib = []; }
    try { _chatStickerLib = JSON.parse(localStorage.getItem('ds_chat_stickers') || '[]'); } catch (e) { _chatStickerLib = []; }
    loadWallet();
}
function saveChatRoles() { safeSetItem('ds_chat_roles', JSON.stringify(_chatRoles)); }
function savePersonas() { safeSetItem('ds_chat_personas', JSON.stringify(_chatPersonas)); }
function saveActivePersona() { safeSetItem('ds_chat_active_persona', _chatActivePersonaId); }
function saveWorldBookLib() { safeSetItem('ds_chat_worldbooks', JSON.stringify(_chatWorldBookLib)); }
function saveStickerLib() { safeSetItem('ds_chat_stickers', JSON.stringify(_chatStickerLib)); }

function genId() { return 'r' + Date.now() + Math.random().toString(36).substr(2, 5); }
function findRole(id) { for (var i = 0; i < _chatRoles.length; i++) if (_chatRoles[i].id === id) return _chatRoles[i]; return null; }
function findPersona(id) { for (var i = 0; i < _chatPersonas.length; i++) if (_chatPersonas[i].id === id) return _chatPersonas[i]; return null; }
function getActivePersona(roleId) {
    var rid = roleId || _chatCurrentConv;
    if (rid) {
        var role = findRole(rid);
        if (role && role.boundPersonaId) {
            var p = findPersona(role.boundPersonaId);
            if (p) return p;
        }
    }
    return findPersona(_chatActivePersonaId);
}
function findWorldBook(id) { for (var i = 0; i < _chatWorldBookLib.length; i++) if (_chatWorldBookLib[i].id === id) return _chatWorldBookLib[i]; return null; }
function findStickerPack(id) { for (var i = 0; i < _chatStickerLib.length; i++) if (_chatStickerLib[i].id === id) return _chatStickerLib[i]; return null; }

var SVG_USER = '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
var SVG_USER_SM = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

function openChatApp() {
    var o = document.getElementById('chatAppOverlay');
    if (!o) return;
    loadChatRoles();
    _chatCurrentTab = 'messages';
    renderChatTab('messages');
    updateChatTabBar();
    o.classList.add('show');
}
function closeChatApp() {
    var o = document.getElementById('chatAppOverlay');
    if (o) o.classList.remove('show');
    closeChatConversation(); closeCreateRole(); closeChatMenu();
    closeProfilePage(); closePersonaEditor();
}

function switchChatTab(t) {
    _chatCurrentTab = t;
    renderChatTab(t);
    updateChatTabBar();
    closeChatMenu();
}
function updateChatTabBar() {
    document.querySelectorAll('.chat-tab-item').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-tab') === _chatCurrentTab);
    });
    var m = { messages: '消息', contacts: '联系人', moments: '动态', me: '我' };
    var t = document.getElementById('chatHeaderTitle');
    if (t) t.textContent = m[_chatCurrentTab] || '消息';
}
function renderChatTab(tab) {
    var b = document.getElementById('chatBody');
    if (!b) return;
    switch (tab) {
        case 'messages': b.innerHTML = renderMessages(); break;
        case 'contacts': b.innerHTML = renderContacts(); break;
        case 'moments': b.innerHTML = renderMoments(); break;
        case 'me': b.innerHTML = renderMe(); break;
    }
}

function toggleChatMenu() {
    var m = document.getElementById('chatPlusMenu');
    if (m) m.classList.toggle('show');
}
function closeChatMenu() {
    var m = document.getElementById('chatPlusMenu');
    if (m) m.classList.remove('show');
}

/* ========== 消息页 ========== */
function renderMessages() {
    var h = '';
    h += '<div class="chat-search-bar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="text" placeholder="搜索角色..." oninput="filterMessages(this.value)"></div>';
    if (!_chatRoles.length) {
        h += '<div class="chat-empty-state"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>暂无消息<br>点击右上角 + 创建角色开始聊天</p></div>';
        return h;
    }
    h += '<div class="chat-msg-list" id="chatMsgList">';
    var sorted = _chatRoles.slice().sort(function (a, b) {
        if ((a.unread || 0) > 0 && !(b.unread || 0)) return -1;
        if (!(a.unread || 0) && (b.unread || 0) > 0) return 1;
        return (b.lastTime || 0) - (a.lastTime || 0);
    });
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        h += '<div class="chat-msg-item" onclick="openConversation(\'' + r.id + '\')" oncontextmenu="event.preventDefault();showRoleContextMenu(event,\'' + r.id + '\')">';
        h += '<div class="chat-msg-avatar">' + (r.avatar ? '<img src="' + r.avatar + '" alt="">' : SVG_USER) + '</div>';
        h += '<div class="chat-msg-info"><div class="chat-msg-name">' + esc(r.nickname || r.name) + '</div><div class="chat-msg-preview">' + esc(r.lastMsg || '暂无消息') + '</div></div>';
        h += '<div class="chat-msg-meta"><div class="chat-msg-time">' + (r.lastTimeStr || '') + '</div>';
        if (r.unread > 0) h += '<div class="chat-msg-badge">' + r.unread + '</div>';
        h += '</div></div>';
    }
    h += '</div>';
    return h;
}
function filterMessages(kw) {
    kw = kw.toLowerCase();
    document.querySelectorAll('.chat-msg-item').forEach(function (el) {
        var n = el.querySelector('.chat-msg-name').textContent.toLowerCase();
        var p = el.querySelector('.chat-msg-preview').textContent.toLowerCase();
        el.style.display = (n.indexOf(kw) !== -1 || p.indexOf(kw) !== -1) ? '' : 'none';
    });
}

/* ========== 联系人页 ========== */
function renderContacts() {
    var h = '<div class="chat-search-bar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="text" placeholder="搜索联系人..."></div>';
    if (!_chatRoles.length) {
        h += '<div class="chat-empty-state"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>暂无联系人</p></div>';
        return h;
    }
    var groups = {};
    for (var i = 0; i < _chatRoles.length; i++) {
        var g = _chatRoles[i].group || '默认';
        if (!groups[g]) groups[g] = [];
        groups[g].push(_chatRoles[i]);
    }
    var fix = ['置顶', '好友', '家人', '工作', '默认'], all = Object.keys(groups), ordered = [];
    for (var fi = 0; fi < fix.length; fi++) if (groups[fix[fi]]) ordered.push(fix[fi]);
    for (var ai = 0; ai < all.length; ai++) if (ordered.indexOf(all[ai]) === -1) ordered.push(all[ai]);
    for (var gi = 0; gi < ordered.length; gi++) {
        var gn = ordered[gi], list = groups[gn];
        h += '<div class="chat-contact-group"><div class="chat-contact-group-title">' + gn + ' (' + list.length + ')</div><div class="chat-contact-list">';
        for (var j = 0; j < list.length; j++) {
            var c = list[j];
            h += '<div class="chat-contact-item" onclick="openConversation(\'' + c.id + '\')">';
            h += '<div class="chat-contact-avatar">' + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : SVG_USER) + '</div>';
            h += '<div class="chat-contact-name">' + esc(c.nickname || c.name) + '</div>';
            if (c.gender) h += '<div class="chat-contact-gender ' + c.gender + '">' + (c.gender === 'male' ? '男' : '女') + '</div>';
            h += '</div>';
        }
        h += '</div></div>';
    }
    return h;
}

function renderMoments() {
    return '<div class="chat-empty-state"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg><p>暂无动态</p></div>';
}

/* ========== "我"页面 ========== */
function renderMe() {
    var p = getActivePersona();
    var name = p ? p.name : '未设置';
    var sig = p ? (p.signature || '暂无签名') : '点击进入个人主页设置';
    var avatar = p ? p.avatar : '';

    var h = '';
    h += '<div class="chat-me-profile" onclick="openProfilePage()">';
    h += '<div class="chat-me-avatar-lg">' + (avatar ? '<img src="' + avatar + '" alt="">' : SVG_USER) + '</div>';
    h += '<div class="chat-me-name-lg">' + esc(name) + '</div>';
    h += '<div class="chat-me-sig-lg">' + esc(sig) + '</div>';
    h += '<div class="chat-me-enter-hint"><span>进入个人主页</span><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '</div>';

    h += '<div class="chat-me-menu">';
    h += '<div class="chat-me-menu-group">';
    h += '<div class="chat-me-menu-item" onclick="openWalletPage()"><div class="chat-me-menu-text">钱包</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += menuItem('收藏');
    h += '</div>';
    h += '<div class="chat-me-menu-group">';
    h += menuItem('聊天美化'); h += menuItem('表情包管理');
    h += '</div>';
    h += '<div class="chat-me-menu-group">';
    h += menuItem('设置');
    h += '</div></div>';
    return h;
}
function menuItem(text) {
    return '<div class="chat-me-menu-item" onclick="showToast(\'' + text + '\')"><div class="chat-me-menu-text">' + text + '</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
}

/* ================================================================
   个人主页
   ================================================================ */
function openProfilePage() {
    var page = document.getElementById('chatProfilePage');
    if (!page) return;
    renderProfilePage();
    page.classList.add('show');
}
function closeProfilePage() {
    var page = document.getElementById('chatProfilePage');
    if (page) page.classList.remove('show');
}
function renderProfilePage() {
    var body = document.getElementById('chatProfileBody');
    if (!body) return;
    var ap = getActivePersona();
    var h = '';
    h += '<div class="chat-profile-current">';
    h += '<div class="chat-profile-cur-avatar">' + (ap && ap.avatar ? '<img src="' + ap.avatar + '" alt="">' : SVG_USER) + '</div>';
    h += '<div class="chat-profile-cur-name">' + esc(ap ? ap.name : '未设置') + '</div>';
    h += '<div class="chat-profile-cur-sig">' + esc(ap ? (ap.signature || '暂无签名') : '请新建角色设置你的人设') + '</div>';
    h += '</div>';
    h += '<div class="chat-profile-new-btn" onclick="openPersonaEditor()">';
    h += '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    h += '<span>新建角色</span></div>';
    h += '<div class="chat-profile-list-title">人设预设列表</div>';
    h += '<div class="chat-persona-list">';
    if (!_chatPersonas.length) {
        h += '<div class="chat-persona-empty">暂无人设，点击上方新建</div>';
    } else {
        for (var i = 0; i < _chatPersonas.length; i++) {
            var p = _chatPersonas[i];
            var isActive = p.id === _chatActivePersonaId;
            h += '<div class="chat-persona-card' + (isActive ? ' active' : '') + '" onclick="switchPersona(\'' + p.id + '\')">';
            h += '<div class="chat-persona-card-avatar">' + (p.avatar ? '<img src="' + p.avatar + '" alt="">' : SVG_USER) + '</div>';
            h += '<div class="chat-persona-card-info">';
            h += '<div class="chat-persona-card-name">' + esc(p.name) + (isActive ? ' ✓' : '') + '</div>';
            h += '<div class="chat-persona-card-sig">' + esc(p.signature || p.nickname || '暂无签名') + '</div>';
            h += '</div>';
            h += '<div class="chat-persona-card-actions">';
            h += '<div class="chat-persona-action-btn" onclick="event.stopPropagation();openPersonaEditor(\'' + p.id + '\')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>';
            h += '<div class="chat-persona-action-btn danger" onclick="event.stopPropagation();deletePersona(\'' + p.id + '\')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>';
            h += '</div></div>';
        }
    }
    h += '</div>';
    body.innerHTML = h;
}
function switchPersona(id) {
    _chatActivePersonaId = id; saveActivePersona();
    renderProfilePage(); renderChatTab('me'); showToast('已切换人设');
}
function deletePersona(id) {
    _chatPersonas = _chatPersonas.filter(function (p) { return p.id !== id; });
    if (_chatActivePersonaId === id) {
        _chatActivePersonaId = _chatPersonas.length ? _chatPersonas[0].id : '';
        saveActivePersona();
    }
    savePersonas(); renderProfilePage(); renderChatTab('me'); showToast('人设已删除');
}

/* ================================================================
   人设编辑器
   ================================================================ */
function openPersonaEditor(editId) {
    _peEditingId = editId || null; _peAvatarData = '';
    var panel = document.getElementById('chatPersonaEditor'); if (!panel) return;
    panel.querySelector('.chat-pe-title').textContent = editId ? '编辑角色' : '新建角色';
    document.getElementById('peName').value = '';
    document.getElementById('peNickname').value = '';
    document.getElementById('peSignature').value = '';
    document.getElementById('peDetail').value = '';
    selectPeGender('male');
    var av = document.getElementById('peAvatarPreview');
    av.innerHTML = SVG_USER + '<div class="chat-pe-avatar-hint">上传头像</div>';
    if (editId) {
        var p = findPersona(editId);
        if (p) {
            document.getElementById('peName').value = p.name || '';
            document.getElementById('peNickname').value = p.nickname || '';
            document.getElementById('peSignature').value = p.signature || '';
            document.getElementById('peDetail').value = p.detail || '';
            selectPeGender(p.gender || 'male');
            if (p.avatar) { _peAvatarData = p.avatar; av.innerHTML = '<img src="' + p.avatar + '" alt=""><div class="chat-pe-avatar-hint">更换头像</div>'; }
        }
    }
    panel.classList.add('show');
}
function closePersonaEditor() {
    var p = document.getElementById('chatPersonaEditor'); if (p) p.classList.remove('show');
    _peEditingId = null; _peAvatarData = '';
}
function selectPeGender(g) {
    document.querySelectorAll('.chat-pe-gender-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-gender') === g); });
}
function getSelectedPeGender() {
    var a = document.querySelector('.chat-pe-gender-btn.active');
    return a ? a.getAttribute('data-gender') : 'male';
}
function triggerPeAvatarUpload() { document.getElementById('peAvatarFile').click(); }
function handlePeAvatarFile(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 5, function (c) {
            _peAvatarData = c;
            document.getElementById('peAvatarPreview').innerHTML = '<img src="' + c + '" alt=""><div class="chat-pe-avatar-hint">更换头像</div>';
            showToast('头像已设置');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}
function savePersona() {
    var name = document.getElementById('peName').value.trim();
    if (!name) { showToast('请输入角色名字'); return; }
    var nickname = document.getElementById('peNickname').value.trim();
    var signature = document.getElementById('peSignature').value.trim();
    var gender = getSelectedPeGender();
    var detail = document.getElementById('peDetail').value.trim();
    if (_peEditingId) {
        var p = findPersona(_peEditingId);
        if (p) { p.name = name; p.nickname = nickname; p.signature = signature; p.gender = gender; p.detail = detail; if (_peAvatarData) p.avatar = _peAvatarData; }
        showToast('角色已更新');
    } else {
        var newId = genId();
        _chatPersonas.push({ id: newId, name: name, nickname: nickname, signature: signature, gender: gender, detail: detail, avatar: _peAvatarData });
        if (_chatPersonas.length === 1) { _chatActivePersonaId = newId; saveActivePersona(); }
        showToast('角色创建成功');
    }
    savePersonas(); closePersonaEditor(); renderProfilePage(); renderChatTab('me');
}
/* ================================================================
   创建AI聊天角色
   ================================================================ */
function openCreateRole(editId) {
    _chatEditingRoleId = editId || null; _crAvatarData = '';
    _crMountPersona = ''; _crMountWorldBook = ''; _crMountSticker = '';
    var p = document.getElementById('chatCreateRole'); if (!p) return;
    document.getElementById('crName').value = '';
    document.getElementById('crNickname').value = '';
    document.getElementById('crDetail').value = '';
    document.getElementById('crGroup').value = '默认';
    document.getElementById('crCustomGroup').value = '';
    document.getElementById('crNotify').checked = true;
    document.getElementById('crBgMsg').checked = false;
    document.getElementById('crMemory').value = 20;
    updateMemoryDisplay();
    selectRoleGender('male');
    updateMountDisplay('persona', ''); updateMountDisplay('worldbook', ''); updateMountDisplay('sticker', '');
    var av = document.getElementById('crAvatarPreview');
    av.innerHTML = SVG_USER + '<div class="chat-cr-avatar-hint">上传头像</div>';
    if (editId) {
        var r = findRole(editId);
        if (r) {
            document.getElementById('crName').value = r.name || '';
            document.getElementById('crNickname').value = r.nickname || '';
            document.getElementById('crDetail').value = r.detail || '';
            document.getElementById('crGroup').value = r.group || '默认';
            document.getElementById('crNotify').checked = r.notify !== false;
            document.getElementById('crBgMsg').checked = !!r.bgMsg;
            document.getElementById('crMemory').value = r.memory || 20;
            updateMemoryDisplay(); selectRoleGender(r.gender || 'male');
            _crMountPersona = r.personaId || ''; _crMountWorldBook = r.worldBookId || ''; _crMountSticker = r.stickerId || '';
            var pn = findPersona(_crMountPersona), wn = findWorldBook(_crMountWorldBook), sn = findStickerPack(_crMountSticker);
            updateMountDisplay('persona', pn ? pn.name : ''); updateMountDisplay('worldbook', wn ? wn.name : ''); updateMountDisplay('sticker', sn ? sn.name : '');
            if (r.avatar) { _crAvatarData = r.avatar; av.innerHTML = '<img src="' + r.avatar + '" alt=""><div class="chat-cr-avatar-hint">更换头像</div>'; }
            var gs = document.getElementById('crGroup'); var ex = false;
            for (var oi = 0; oi < gs.options.length; oi++)if (gs.options[oi].value === r.group) { ex = true; break; }
            if (!ex && r.group) { var op = document.createElement('option'); op.value = r.group; op.textContent = r.group; gs.appendChild(op); gs.value = r.group; }
        }
    }
    p.classList.add('show');
}
function closeCreateRole() {
    var p = document.getElementById('chatCreateRole'); if (p) p.classList.remove('show');
    _chatEditingRoleId = null; _crAvatarData = ''; closeMountModal();
}
function selectRoleGender(g) {
    document.querySelectorAll('#chatCreateRole .chat-cr-gender-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-gender') === g); });
}
function getSelectedGender() {
    var a = document.querySelector('#chatCreateRole .chat-cr-gender-btn.active');
    return a ? a.getAttribute('data-gender') : 'male';
}
function updateMemoryDisplay() {
    document.getElementById('crMemoryVal').textContent = document.getElementById('crMemory').value + '轮';
}
function addCustomGroup() {
    var inp = document.getElementById('crCustomGroup'); var nm = inp.value.trim();
    if (!nm) { showToast('请输入分组名'); return; }
    var sel = document.getElementById('crGroup');
    for (var i = 0; i < sel.options.length; i++)if (sel.options[i].value === nm) { sel.value = nm; inp.value = ''; showToast('已选择: ' + nm); return; }
    var op = document.createElement('option'); op.value = nm; op.textContent = nm; sel.appendChild(op); sel.value = nm; inp.value = ''; showToast('已添加分组: ' + nm);
}
function triggerRoleAvatarUpload() { document.getElementById('crAvatarFile').click(); }
function handleRoleAvatarFile(e) {
    var f = e.target.files[0]; if (!f) return; showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) { smartCompress(ev.target.result, 5, function (c) { _crAvatarData = c; document.getElementById('crAvatarPreview').innerHTML = '<img src="' + c + '" alt=""><div class="chat-cr-avatar-hint">更换头像</div>'; showToast('头像已设置'); }); };
    rd.readAsDataURL(f); e.target.value = '';
}

/* ========== 挂载 ========== */
function updateMountDisplay(type, name) {
    var el = document.getElementById('crMount_' + type + '_val'); if (!el) return;
    if (name) { el.textContent = name; el.classList.add('active'); }
    else { el.textContent = '未选择'; el.classList.remove('active'); }
}
function openMountSelector(type) {
    var overlay = document.getElementById('chatAppOverlay'); if (!overlay) return;
    closeMountModal();
    var title, items, selectedId;
    if (type === 'persona') { title = '选择人设'; items = _chatPersonas; selectedId = _crMountPersona; }
    else if (type === 'worldbook') { title = '选择世界书'; items = _chatWorldBookLib; selectedId = _crMountWorldBook; }
    else if (type === 'sticker') { title = '选择表情包'; items = _chatStickerLib; selectedId = _crMountSticker; }
    var h = '<div class="chat-mount-modal show" id="chatMountModal" onclick="if(event.target===this)closeMountModal()">';
    h += '<div class="chat-mount-panel"><div class="chat-mount-panel-header"><div class="chat-mount-panel-title">' + title + '</div>';
    h += '<div class="chat-mount-panel-close" onclick="closeMountModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
    h += '<div class="chat-mount-panel-body">';
    h += '<div class="chat-mount-option' + (selectedId === '' ? ' selected' : '') + '" onclick="selectMountOption(\'' + type + '\',\'\')"><div class="chat-mount-option-name" style="color:var(--chat-text-hint)">不挂载</div><div class="chat-mount-option-check">' + (selectedId === '' ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>';
    if (!items.length) { h += '<div class="chat-mount-empty">暂无可选项</div>'; }
    else { for (var i = 0; i < items.length; i++) { var it = items[i], sel = it.id === selectedId; h += '<div class="chat-mount-option' + (sel ? ' selected' : '') + '" onclick="selectMountOption(\'' + type + '\',\'' + it.id + '\')"><div class="chat-mount-option-name">' + esc(it.name) + '</div><div class="chat-mount-option-check">' + (sel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>'; } }
    h += '</div>';
    if (type !== 'persona') { h += '<div class="chat-mount-panel-footer"><div class="chat-mount-confirm-btn" onclick="openMountCreator(\'' + type + '\')">+ 新建</div></div>'; }
    h += '</div></div>';
    overlay.insertAdjacentHTML('beforeend', h);
}
function closeMountModal() { var m = document.getElementById('chatMountModal'); if (m) m.remove(); }
function selectMountOption(type, id) {
    if (type === 'persona') _crMountPersona = id; else if (type === 'worldbook') _crMountWorldBook = id; else if (type === 'sticker') _crMountSticker = id;
    var name = '', item;
    if (id) { if (type === 'persona') item = findPersona(id); else if (type === 'worldbook') item = findWorldBook(id); else if (type === 'sticker') item = findStickerPack(id); if (item) name = item.name; }
    updateMountDisplay(type, name); closeMountModal();
}
function openMountCreator(type) {
    closeMountModal(); var title, p1, p2;
    if (type === 'worldbook') { title = '新建世界书'; p1 = '世界书名称'; p2 = '世界观设定、背景故事...'; }
    else if (type === 'sticker') { title = '新建表情包'; p1 = '表情包名称'; p2 = '每行一个表情包图片URL'; }
    var overlay = document.getElementById('chatAppOverlay');
    var h = '<div class="chat-mount-modal show" id="chatMountModal" onclick="if(event.target===this)closeMountModal()"><div class="chat-mount-panel"><div class="chat-mount-panel-header"><div class="chat-mount-panel-title">' + title + '</div><div class="chat-mount-panel-close" onclick="closeMountModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div><div class="chat-mount-panel-body" style="padding:14px"><div class="chat-cr-field"><label>名称</label><input type="text" id="mountNewName" class="chat-cr-input" placeholder="' + p1 + '"></div><div class="chat-cr-field"><label>内容</label><textarea id="mountNewContent" class="chat-cr-textarea" rows="5" placeholder="' + p2 + '"></textarea></div></div><div class="chat-mount-panel-footer"><div class="chat-mount-confirm-btn" onclick="saveMountNew(\'' + type + '\')">保存</div></div></div></div>';
    overlay.insertAdjacentHTML('beforeend', h);
}
function saveMountNew(type) {
    var name = document.getElementById('mountNewName').value.trim();
    var content = document.getElementById('mountNewContent').value.trim();
    if (!name) { showToast('请输入名称'); return; }
    var id = genId();
    if (type === 'worldbook') { _chatWorldBookLib.push({ id: id, name: name, content: content }); saveWorldBookLib(); _crMountWorldBook = id; }
    else if (type === 'sticker') { var urls = content ? content.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : []; _chatStickerLib.push({ id: id, name: name, urls: urls }); saveStickerLib(); _crMountSticker = id; }
    updateMountDisplay(type, name); closeMountModal(); showToast('已创建: ' + name);
}

/* ========== 保存AI角色 ========== */
function saveRole() {
    var name = document.getElementById('crName').value.trim(); if (!name) { showToast('请输入角色名字'); return; }
    var nickname = document.getElementById('crNickname').value.trim(), gender = getSelectedGender(), detail = document.getElementById('crDetail').value.trim(), group = document.getElementById('crGroup').value, notify = document.getElementById('crNotify').checked, bgMsg = document.getElementById('crBgMsg').checked, memory = parseInt(document.getElementById('crMemory').value) || 20;
    if (_chatEditingRoleId) { var r = findRole(_chatEditingRoleId); if (r) { r.name = name; r.nickname = nickname; r.gender = gender; r.detail = detail; r.group = group; r.personaId = _crMountPersona; r.worldBookId = _crMountWorldBook; r.stickerId = _crMountSticker; r.notify = notify; r.bgMsg = bgMsg; r.memory = memory; if (_crAvatarData) r.avatar = _crAvatarData; } showToast('角色已更新'); }
    else { _chatRoles.push({ id: genId(), name: name, nickname: nickname, gender: gender, detail: detail, group: group, personaId: _crMountPersona, worldBookId: _crMountWorldBook, stickerId: _crMountSticker, notify: notify, bgMsg: bgMsg, memory: memory, avatar: _crAvatarData, msgs: [], lastMsg: '', lastTime: 0, lastTimeStr: '', unread: 0 }); showToast('角色创建成功'); }
    saveChatRoles(); closeCreateRole(); renderChatTab(_chatCurrentTab);
}

/* ========== 右键菜单 ========== */
function showRoleContextMenu(ev, rid) {
    removeContextMenu(); var overlay = document.getElementById('chatAppOverlay'); var rect = overlay.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top; if (x + 140 > rect.width) x = rect.width - 150; if (y + 120 > rect.height) y = rect.height - 130;
    var m = document.createElement('div'); m.className = 'chat-ctx-menu'; m.id = 'chatCtxMenu'; m.style.position = 'absolute'; m.style.left = x + 'px'; m.style.top = y + 'px';
    m.innerHTML = '<div class="chat-ctx-menu-item" onclick="editRole(\'' + rid + '\');removeContextMenu()">编辑角色</div><div class="chat-ctx-menu-item" onclick="clearRoleMsgs(\'' + rid + '\');removeContextMenu()">清空聊天</div><div class="chat-ctx-menu-item danger" onclick="deleteRole(\'' + rid + '\');removeContextMenu()">删除角色</div>';
    overlay.appendChild(m); setTimeout(function () { document.addEventListener('click', removeContextMenu, { once: true }); }, 10);
}
function removeContextMenu() { var m = document.getElementById('chatCtxMenu'); if (m) m.remove(); }
function editRole(id) { openCreateRole(id); }
function clearRoleMsgs(id) { var r = findRole(id); if (!r) return; r.msgs = []; r.lastMsg = ''; r.lastTime = 0; r.lastTimeStr = ''; r.unread = 0; saveChatRoles(); renderChatTab(_chatCurrentTab); showToast('聊天已清空'); }
function deleteRole(id) { _chatRoles = _chatRoles.filter(function (r) { return r.id !== id; }); saveChatRoles(); renderChatTab(_chatCurrentTab); showToast('角色已删除'); }

/* ================================================================
   对话页 — 完全重构
   ================================================================ */
function openConversation(rid) {
    var role = findRole(rid); if (!role) return;
    _chatCurrentConv = rid; role.unread = 0; saveChatRoles();
    _chatMultiSelectMode = false; _chatMultiSelected = []; _chatQuoteData = null;

    var conv = document.getElementById('chatConversation'); if (!conv) return;
    var dn = esc(role.nickname || role.name);
    var customLabel = role.customLabel || '';
    var ap = getActivePersona();
    var myAv = ap && ap.avatar ? ap.avatar : '';
    var roleAv = role.avatar || '';

    _convLeftAvatar = roleAv;
    _convRightAvatar = myAv;

    var h = '';
    // 顶栏
    h += '<div class="chat-conv-topbar">';
    h += '<div class="chat-conv-topbar-row">';
    h += '<div class="chat-conv-back" onclick="closeChatConversation()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="chat-conv-topbar-spacer"></div>';
    h += '<div class="chat-conv-more" onclick="openChatSettings()"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></div>';
    h += '</div>';

    // 双头像 + 爱心
    h += '<div class="chat-conv-avatars">';
    h += '<div class="chat-conv-av-box" onclick="triggerConvAvatar(\'left\')">';
    h += roleAv ? '<img src="' + roleAv + '" id="convAvLeft" alt="">' : SVG_USER;
    h += '</div>';
    h += '<div class="chat-conv-heart"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>';
    h += '<div class="chat-conv-av-box" onclick="triggerConvAvatar(\'right\')">';
    h += myAv ? '<img src="' + myAv + '" id="convAvRight" alt="">' : SVG_USER;
    h += '</div></div>';

    // 名称 + 自定义标签
    h += '<div class="chat-conv-name-wrap">';
    h += '<div class="chat-conv-name">' + dn + '</div>';
    h += '<div class="chat-conv-subtitle">' + esc(customLabel || '正在聊天中') + '</div>';
    h += '</div></div>';

    // 消息体
    h += '<div class="chat-conv-body" id="chatConvBody"' + (role.chatWallpaper ? ' style="background-image:url(' + role.chatWallpaper + ');background-size:cover;background-position:center;"' : '') + '>';
    var msgs = role.msgs || [];
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (i === 0 || (i > 0 && msgs[i].time !== msgs[i - 1].time))
            h += '<div class="chat-bubble-time-center">' + m.time + '</div>';
        if (m.recalled) {
            h += '<div class="chat-bubble-recalled">' + (m.from === 'self' ? '你' : esc(role.nickname || role.name)) + ' 撤回了一条消息</div>';
            continue;
        }
        // ★ 人设变更提示条（居中小字提示）
        if (m.personaChange) {
            h += '<div class="chat-bubble-persona-change">';
            h += '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ';
            h += '身份切换为「' + esc(m.newPersonaName || '默认') + '」';
            h += '</div>';
            continue;
        }
        h += renderBubbleRow(m, i, myAv, roleAv);
    }
    h += '</div>';

    // 底栏
    h += '<div class="chat-conv-bottombar">';
    // 工具栏
    h += '<div class="chat-conv-toolbar">';
    // 语音（真实录音）
    h += '<div class="chat-conv-tool" onclick="openVoiceRecorder()">';
    h += '<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    h += '<span>语音</span></div>';
    // 相机 — 真实拍照
    h += '<div class="chat-conv-tool" onclick="chatPickCamera()"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>相机</span></div>';
    // 相册 — 真实选图
    h += '<div class="chat-conv-tool" onclick="chatPickAlbum()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>相册</span></div>';
    h += '<div class="chat-conv-tool" onclick="openTransferPanel()"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>转账</span></div>';
    h += '<div class="chat-conv-tool" onclick="showToast(\'礼物\')"><svg viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg><span>礼物</span></div>';
    h += '<div class="chat-conv-tool" onclick="showToast(\'定位\')"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>定位</span></div>';
    h += '</div>';

    // 引用预览条
    h += '<div class="chat-conv-quote-bar" id="chatQuoteBar" style="display:none"><div class="chat-conv-quote-bar-text" id="chatQuoteBarText"></div><div class="chat-conv-quote-bar-close" onclick="clearQuote()">✕</div></div>';

    // 图片预览条
    h += '<div class="chat-conv-image-preview-bar" id="chatImagePreviewBar" style="display:none"><img id="chatImagePreviewThumb" src="" alt=""><div class="chat-conv-image-preview-text">图片已选择，点击发送</div><div class="chat-conv-image-preview-close" onclick="clearPendingImage()">✕</div></div>';

    // 多选工具栏
    h += '<div class="chat-conv-multiselect-bar" id="chatMultiBar" style="display:none"><div class="chat-conv-multi-info" id="chatMultiInfo">已选 0 条</div><div class="chat-conv-multi-actions"><div class="chat-conv-multi-btn danger" onclick="multiDeleteMsgs()">删除选中</div><div class="chat-conv-multi-btn" onclick="exitMultiSelect()">取消</div></div></div>';

    // 输入行 — 续写在左，发送在右
    h += '<div class="chat-conv-input-row" id="chatInputRow">';
    h += '<div class="chat-conv-action-btn" onclick="showToast(\'表情包\')" title="表情包"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>';
    h += '<input class="chat-conv-input" id="chatConvInput" type="text" placeholder="说点什么..." onkeydown="if(event.key===\'Enter\'){sendChatMessage();event.preventDefault();}">';
    // 续写键
    h += '<div class="chat-conv-action-btn send-btn" onclick="continueChat()" title="续写"><svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg></div>';
    // 发送键
    h += '<div class="chat-conv-action-btn send-btn" onclick="sendChatMessage()" title="发送"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>';
    h += '</div>';

    // 头像上传
    h += '<input type="file" id="convAvFileLeft" class="chat-conv-av-file" accept="image/*" onchange="handleConvAvFile(event,\'left\')">';
    h += '<input type="file" id="convAvFileRight" class="chat-conv-av-file" accept="image/*" onchange="handleConvAvFile(event,\'right\')">';
    // 隐藏的图片选择input
    h += '<input type="file" id="chatImagePickFile" style="display:none" accept="image/*" onchange="handleChatImagePick(event)">';
    h += '<input type="file" id="chatCameraPickFile" style="display:none" accept="image/*" capture="environment" onchange="handleChatImagePick(event)">';

    conv.innerHTML = h;
    conv.classList.add('show');
    setTimeout(function () { var b = document.getElementById('chatConvBody'); if (b) b.scrollTop = b.scrollHeight; }, 50);
}

/* 渲染单条气泡（统一入口，区分语音/文字/图片） */

function renderBubbleRow(m, idx, myAv, roleAv) {
    if (m.voice) return renderVoiceBubbleRow(m, idx, myAv, roleAv);
    if (m.image) return renderImageBubbleRow(m, idx, myAv, roleAv);
    if (m.transfer) return renderTransferBubbleRow(m, idx, myAv, roleAv);

    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }
    h += '<div class="chat-bubble">' + esc(m.text) + '</div>';
    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* 渲染图片气泡 */
function renderImageBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }
    h += '<div class="chat-bubble chat-bubble-image" onclick="event.stopPropagation();previewChatImage(\'' + idx + '\')">';
    h += '<img src="' + m.imageData + '" alt="图片" style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer;display:block;">';
    h += '</div>';
    if (m.text && m.text !== '[图片]') {
        h += '<div class="chat-bubble" style="margin-top:4px;">' + esc(m.text) + '</div>';
    }
    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* 图片预览大图 */
function previewChatImage(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[parseInt(idx)];
    if (!m || !m.imageData) return;
    var conv = document.getElementById('chatConversation'); if (!conv) return;
    var h = '<div class="chat-image-fullscreen" id="chatImageFullscreen" onclick="closeChatImagePreview()">';
    h += '<img src="' + m.imageData + '" alt="">';
    h += '</div>';
    conv.insertAdjacentHTML('beforeend', h);
}
function closeChatImagePreview() {
    var el = document.getElementById('chatImageFullscreen'); if (el) el.remove();
}

function closeChatConversation() {
    var c = document.getElementById('chatConversation');
    if (c) { c.classList.remove('show'); setTimeout(function () { c.innerHTML = ''; }, 300); }
    _chatCurrentConv = null;
    _chatMultiSelectMode = false; _chatMultiSelected = []; _chatQuoteData = null;
    _pendingImageData = null;
    closeChatSettingsPanel();
    if (_chatCurrentTab === 'messages') renderChatTab('messages');
}

/* 顶栏头像更换 */
function triggerConvAvatar(side) {
    var f = document.getElementById(side === 'left' ? 'convAvFileLeft' : 'convAvFileRight');
    if (f) f.click();
}
function handleConvAvFile(e, side) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 5, function (c) {
            if (side === 'left') {
                _convLeftAvatar = c;
                var el = document.getElementById('convAvLeft');
                if (el) { el.src = c; }
                else { var box = document.querySelectorAll('.chat-conv-av-box')[0]; if (box) box.innerHTML = '<img src="' + c + '" id="convAvLeft" alt="">'; }
                var role = findRole(_chatCurrentConv);
                if (role) { role.avatar = c; saveChatRoles(); }
            } else {
                _convRightAvatar = c;
                var el2 = document.getElementById('convAvRight');
                if (el2) { el2.src = c; }
                else { var boxes = document.querySelectorAll('.chat-conv-av-box'); if (boxes[1]) boxes[1].innerHTML = '<img src="' + c + '" id="convAvRight" alt="">'; }
            }
            showToast('头像已更换');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}
/* ================================================================
   每角色独立人设切换系统
   ================================================================ */

function openConvPersonaSwitcher() {
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var conv = document.getElementById('chatConversation');
    if (!conv) return;
    closeConvPersonaSwitcher();

    var currentBound = role.boundPersonaId || '';

    var h = '<div class="conv-persona-switcher-overlay" id="convPersonaSwitcherOverlay" onclick="if(event.target===this)closeConvPersonaSwitcher()">';
    h += '<div class="conv-persona-switcher-panel">';

    h += '<div class="conv-persona-switcher-header">';
    h += '<div class="conv-persona-switcher-title">为「' + esc(role.nickname || role.name) + '」选择人设</div>';
    h += '<div class="conv-persona-switcher-close" onclick="closeConvPersonaSwitcher()">';
    h += '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    h += '</div></div>';
    h += '<div class="conv-persona-switcher-hint">每个角色独立绑定，互不影响</div>';

    h += '<div class="conv-persona-switcher-list">';

    // 使用全局默认
    var isDefault = !currentBound;
    var globalP = findPersona(_chatActivePersonaId);
    h += '<div class="conv-persona-switcher-item' + (isDefault ? ' active' : '') + '" onclick="bindPersonaToRole(\'\')">';
    h += '<div class="conv-persona-switcher-item-av-wrap">';
    if (globalP && globalP.avatar) {
        h += '<img src="' + globalP.avatar + '" class="conv-persona-switcher-item-av">';
    } else {
        h += '<div class="conv-persona-switcher-item-av-none">●</div>';
    }
    h += '</div>';
    h += '<div class="conv-persona-switcher-item-info"><div class="conv-persona-switcher-item-name">跟随全局' + (globalP ? '（' + esc(globalP.name) + '）' : '') + '</div>';
    h += '<div class="conv-persona-switcher-item-desc">使用个人主页选中的人设</div></div>';
    if (isDefault) h += '<div class="conv-persona-switcher-item-check">✓</div>';
    h += '</div>';

    // 遍历所有人设
    for (var i = 0; i < _chatPersonas.length; i++) {
        var p = _chatPersonas[i];
        var isActive = (p.id === currentBound);
        h += '<div class="conv-persona-switcher-item' + (isActive ? ' active' : '') + '" onclick="bindPersonaToRole(\'' + p.id + '\')">';
        h += '<div class="conv-persona-switcher-item-av-wrap">';
        if (p.avatar) {
            h += '<img src="' + p.avatar + '" class="conv-persona-switcher-item-av">';
        } else {
            h += '<div class="conv-persona-switcher-item-av-letter">' + (p.name || '?').charAt(0) + '</div>';
        }
        h += '</div>';
        h += '<div class="conv-persona-switcher-item-info">';
        h += '<div class="conv-persona-switcher-item-name">' + esc(p.name || '未命名') + '</div>';
        var desc = p.description || p.content || p.bio || '';
        h += '<div class="conv-persona-switcher-item-desc">' + esc(desc.substring(0, 40) || '无简介') + '</div>';
        h += '</div>';
        if (isActive) h += '<div class="conv-persona-switcher-item-check">✓</div>';
        h += '</div>';
    }

    if (_chatPersonas.length === 0) {
        h += '<div class="conv-persona-switcher-empty">还没有创建人设<br>请在「我的」→「人设」中创建</div>';
    }

    h += '</div></div></div>';

    conv.insertAdjacentHTML('beforeend', h);
    setTimeout(function () {
        var ov = document.getElementById('convPersonaSwitcherOverlay');
        if (ov) ov.classList.add('show');
    }, 10);
}

function closeConvPersonaSwitcher() {
    var el = document.getElementById('convPersonaSwitcherOverlay');
    if (el) el.remove();
}

function bindPersonaToRole(personaId) {
    var role = findRole(_chatCurrentConv);
    if (!role) return;

    var oldPersonaId = role.boundPersonaId || role.personaId || '';

    role.boundPersonaId = personaId || '';
    role.personaId = personaId || '';
    saveChatRoles();
    closeConvPersonaSwitcher();

    // 记录人设变更
    if (oldPersonaId !== (personaId || '')) {
        recordPersonaChange(role, oldPersonaId, personaId || '');
        // 追加变更提示到聊天区
        if (role.msgs && role.msgs.length > 0) {
            var lastMsg = role.msgs[role.msgs.length - 1];
            if (lastMsg.personaChange) {
                var body = document.getElementById('chatConvBody');
                if (body) {
                    var changeHtml = '<div class="chat-bubble-persona-change">';
                    changeHtml += '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ';
                    changeHtml += '身份切换为「' + esc(lastMsg.newPersonaName || '默认') + '」';
                    changeHtml += '</div>';
                    body.insertAdjacentHTML('beforeend', changeHtml);
                    body.scrollTop = body.scrollHeight;
                }
            }
        }
    }

    // ★ 局部刷新头像，不重建页面
    refreshUserAvatarInConv();

    var ap = getActivePersona();
    if (ap) {
        showToast('当前窗口切换为「' + ap.name + '」');
    } else {
        showToast('当前窗口已恢复全局人设');
    }
}

/* ================================================================
   相机 & 相册 — 真实图片发送系统
   ================================================================ */
function chatPickCamera() {
    var f = document.getElementById('chatCameraPickFile');
    if (f) f.click();
}
function chatPickAlbum() {
    var f = document.getElementById('chatImagePickFile');
    if (f) f.click();
}
function handleChatImagePick(e) {
    var f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('请选择图片文件'); return; }
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 30, function (compressed) {
            _pendingImageData = compressed;
            // 显示预览条
            var bar = document.getElementById('chatImagePreviewBar');
            var thumb = document.getElementById('chatImagePreviewThumb');
            if (bar) bar.style.display = 'flex';
            if (thumb) thumb.src = compressed;
            showToast('图片已选择，点击发送按钮发送');
        });
    };
    rd.readAsDataURL(f);
    e.target.value = '';
}
function clearPendingImage() {
    _pendingImageData = null;
    var bar = document.getElementById('chatImagePreviewBar');
    if (bar) bar.style.display = 'none';
}
/* ================================================================
   聊天设置面板（独立毛玻璃悬浮板块）
   ================================================================ */
function openChatSettings() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    closeChatSettingsPanel();

    var conv = document.getElementById('chatConversation'); if (!conv) return;

    var dn = esc(role.nickname || role.name);
    var roleAv = role.avatar || '';
    var customLabel = role.customLabel || '';
    var curGroup = role.group || '默认';

    // 挂载名
    var pn = role.personaId ? findPersona(role.personaId) : null;
    var wn = role.worldBookId ? findWorldBook(role.worldBookId) : null;
    var sn = role.stickerId ? findStickerPack(role.stickerId) : null;

    var h = '<div class="chat-settings-overlay show" id="chatSettingsOverlay" onclick="if(event.target===this)closeChatSettingsPanel()">';
    h += '<div class="chat-settings-panel">';

    // 标题栏
    h += '<div class="chat-settings-header">';
    h += '<div class="chat-settings-title">聊天设置</div>';
    h += '<div class="chat-settings-close" onclick="closeChatSettingsPanel()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';

    h += '<div class="chat-settings-body">';

    // 头像
    h += '<div class="chat-settings-avatar-wrap" onclick="triggerSettingsAvatar()">';
    h += '<div class="chat-settings-avatar">' + (roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER) + '</div>';
    h += '<div class="chat-settings-avatar-hint">点击更换头像</div>';
    h += '</div>';
    h += '<input type="file" id="csAvatarFile" style="display:none" accept="image/*" onchange="handleSettingsAvatar(event)">';

    // 备注
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">备注名称</div>';
    h += '<input type="text" class="chat-settings-input" id="csNickname" value="' + esc(role.nickname || '') + '" placeholder="设置备注名">';
    h += '</div>';

    // 自定义标签
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">自定义标签</div>';
    h += '<input type="text" class="chat-settings-input" id="csCustomLabel" value="' + esc(customLabel) + '" placeholder="顶栏名称下方的小字描述">';
    h += '</div>';

    // 修改分组
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">修改分组</div>';
    h += '<select class="chat-settings-select" id="csGroup">';
    var groups = ['默认', '置顶', '好友', '家人', '工作'];
    for (var gi = 0; gi < groups.length; gi++) {
        h += '<option value="' + groups[gi] + '"' + (curGroup === groups[gi] ? ' selected' : '') + '>' + groups[gi] + '</option>';
    }
    if (groups.indexOf(curGroup) === -1) {
        h += '<option value="' + esc(curGroup) + '" selected>' + esc(curGroup) + '</option>';
    }
    h += '</select>';
    h += '<div class="chat-settings-custom-group">';
    h += '<input type="text" class="chat-settings-input" id="csCustomGroup" placeholder="自定义分组名">';
    h += '<div class="chat-settings-small-btn" onclick="addSettingsGroup()">添加</div>';
    h += '</div>';
    h += '</div>';

    // 修改角色信息（跳转创建角色编辑器）
    h += '<div class="chat-settings-item" onclick="closeChatSettingsPanel();openCreateRole(\'' + role.id + '\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    h += '<span>修改角色信息</span>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 挂载世界书
    h += '<div class="chat-settings-item" onclick="openSettingsMount(\'worldbook\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    h += '<span>挂载世界书</span>';
    h += '<div class="chat-settings-item-value">' + esc(wn ? wn.name : '未选择') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 挂载人设
    h += '<div class="chat-settings-item" onclick="openSettingsMount(\'persona\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '<span>挂载人设</span>';
    h += '<div class="chat-settings-item-value">' + esc(pn ? pn.name : '未选择') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 挂载表情包
    h += '<div class="chat-settings-item" onclick="openSettingsMount(\'sticker\')">';
    h += '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
    h += '<span>挂载表情包</span>';
    h += '<div class="chat-settings-item-value">' + esc(sn ? sn.name : '未选择') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 聊天壁纸
    h += '<div class="chat-settings-item" onclick="triggerWallpaperUpload()">';
    h += '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    h += '<span>当前窗口聊天壁纸</span>';
    h += '<div class="chat-settings-item-value">' + (role.chatWallpaper ? '已设置' : '未设置') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '<input type="file" id="csWallpaperFile" style="display:none" accept="image/*" onchange="handleWallpaperFile(event)">';

    // 开关：线下模式
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">线下模式</div>';
    h += '<div class="chat-settings-toggle-desc">开启后允许出现括号包含的动作/心理描写</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csOfflineMode"' + (role.offlineMode ? ' checked' : '') + '><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 开关：翻译
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">启用翻译</div>';
    h += '<div class="chat-settings-toggle-desc">启用后气泡虚线下方自动翻译</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csTranslate"' + (role.translateOn ? ' checked' : '') + '><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 开关：后台模式
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">后台模式</div>';
    h += '<div class="chat-settings-toggle-desc">切到后台也可收到推送和消息提醒</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csBgMode"' + (role.bgMsg ? ' checked' : '') + '><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 记忆轮数
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">记忆轮数</div>';
    h += '<div class="chat-cr-memory-row">';
    h += '<input type="range" class="chat-cr-range" id="csMemory" min="5" max="100" value="' + (role.memory || 20) + '" oninput="document.getElementById(\'csMemoryVal\').textContent=this.value+\'轮\'">';
    h += '<div class="chat-cr-memory-val" id="csMemoryVal">' + (role.memory || 20) + '轮</div>';
    h += '</div></div>';

    // 危险操作
    h += '<div class="chat-settings-danger-zone">';
    h += '<div class="chat-settings-danger-btn" onclick="settingsClearChat()"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>清理聊天记录</span></div>';
    h += '<div class="chat-settings-danger-btn delete" onclick="settingsDeleteFriend()"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg><span>删除好友</span></div>';
    h += '</div>';

    h += '</div>'; // .chat-settings-body

    // 保存按钮
    h += '<div class="chat-settings-footer">';
    h += '<div class="chat-settings-save-btn" onclick="saveChatSettings()">保存设置</div>';
    h += '</div>';

    h += '</div></div>'; // .chat-settings-panel .chat-settings-overlay

    conv.insertAdjacentHTML('beforeend', h);
}

function closeChatSettingsPanel() {
    var el = document.getElementById('chatSettingsOverlay');
    if (el) el.remove();
}

function triggerSettingsAvatar() {
    var f = document.getElementById('csAvatarFile'); if (f) f.click();
}

function handleSettingsAvatar(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 5, function (c) {
            var role = findRole(_chatCurrentConv); if (!role) return;
            role.avatar = c; _convLeftAvatar = c; saveChatRoles();
            var avEl = document.querySelector('.chat-settings-avatar');
            if (avEl) avEl.innerHTML = '<img src="' + c + '" alt="">';
            var topAvEl = document.getElementById('convAvLeft');
            if (topAvEl) topAvEl.src = c;
            showToast('头像已更换');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}

function addSettingsGroup() {
    var inp = document.getElementById('csCustomGroup');
    var nm = inp.value.trim(); if (!nm) { showToast('请输入分组名'); return; }
    var sel = document.getElementById('csGroup');
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === nm) { sel.value = nm; inp.value = ''; showToast('已选择: ' + nm); return; }
    var op = document.createElement('option'); op.value = nm; op.textContent = nm; sel.appendChild(op); sel.value = nm; inp.value = ''; showToast('已添加: ' + nm);
}

function triggerWallpaperUpload() {
    var f = document.getElementById('csWallpaperFile'); if (f) f.click();
}

function handleWallpaperFile(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 30, function (c) {
            var role = findRole(_chatCurrentConv); if (!role) return;
            role.chatWallpaper = c; saveChatRoles();
            var body = document.getElementById('chatConvBody');
            if (body) {
                body.style.backgroundImage = 'url(' + c + ')';
                body.style.backgroundSize = 'cover';
                body.style.backgroundPosition = 'center';
            }
            showToast('壁纸已设置');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}

/* 设置里挂载选择器 — 复用已有的 mount 系统 */
function openSettingsMount(type) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    _crMountPersona = role.personaId || '';
    _crMountWorldBook = role.worldBookId || '';
    _crMountSticker = role.stickerId || '';
    window._mountFromSettings = true;
    openMountSelector(type);
}

/* 局部刷新对话页的user头像（顶栏+所有气泡），不重建整个页面 */
function refreshUserAvatarInConv() {
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var ap = getActivePersona();
    var newAv = (ap && ap.avatar) ? ap.avatar : '';

    // 1. 更新全局变量
    _convRightAvatar = newAv;

    // 2. 刷新顶栏右侧头像（user头像）
    var boxes = document.querySelectorAll('.chat-conv-av-box');
    if (boxes[1]) {
        if (newAv) {
            boxes[1].innerHTML = '<img src="' + newAv + '" id="convAvRight" alt="">';
        } else {
            boxes[1].innerHTML = SVG_USER;
        }
    }

    // 3. 刷新所有self消息气泡的头像
    var selfRows = document.querySelectorAll('.chat-bubble-row.self .chat-bubble-avatar');
    for (var i = 0; i < selfRows.length; i++) {
        if (newAv) {
            selfRows[i].innerHTML = '<img src="' + newAv + '" alt="">';
        } else {
            selfRows[i].innerHTML = SVG_USER_SM;
        }
    }
}

// 覆写 selectMountOption，支持从设置页同步
var _origSelectMountOption = (typeof selectMountOption === 'function') ? selectMountOption : null;

function selectMountOption(type, id) {
    if (type === 'persona') _crMountPersona = id;
    else if (type === 'worldbook') _crMountWorldBook = id;
    else if (type === 'sticker') _crMountSticker = id;

    var name = '', item;
    if (id) {
        if (type === 'persona') item = findPersona(id);
        else if (type === 'worldbook') item = findWorldBook(id);
        else if (type === 'sticker') item = findStickerPack(id);
        if (item) name = item.name;
    }
    updateMountDisplay(type, name);
    closeMountModal();

    if (window._mountFromSettings) {
        var role = findRole(_chatCurrentConv);
        if (role) {
            if (type === 'persona') {
                var oldPersonaId = role.personaId || role.boundPersonaId || '';
                role.personaId = id;
                role.boundPersonaId = id;
                // 记录人设变更
                if (oldPersonaId !== (id || '')) {
                    recordPersonaChange(role, oldPersonaId, id);
                }
            }
            else if (type === 'worldbook') role.worldBookId = id;
            else if (type === 'sticker') role.stickerId = id;
            saveChatRoles();
            showToast(name ? '已挂载: ' + name : '已取消挂载');
        }
        window._mountFromSettings = false;

        closeChatSettingsPanel();
        // ★ 重建对话页（让头像、气泡等全部刷新），再重新打开设置面板
        openConversation(role.id);
        openChatSettings();
    }
}
function settingsClearChat() {
    if (!confirm('确认清理所有聊天记录？此操作不可恢复。')) return;
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.msgs = []; role.lastMsg = ''; role.lastTime = 0; role.lastTimeStr = ''; role.unread = 0;
    saveChatRoles();
    closeChatSettingsPanel();
    openConversation(role.id);
    showToast('聊天记录已清理');
}

function settingsDeleteFriend() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    if (!confirm('确认删除好友「' + (role.nickname || role.name) + '」？所有消息将被清除，此操作不可恢复。')) return;
    _chatRoles = _chatRoles.filter(function (r) { return r.id !== role.id; });
    saveChatRoles();
    closeChatSettingsPanel();
    closeChatConversation();
    showToast('已删除好友');
}

function saveChatSettings() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var nickname = document.getElementById('csNickname').value.trim();
    role.nickname = nickname;
    role.customLabel = document.getElementById('csCustomLabel').value.trim();
    role.group = document.getElementById('csGroup').value;
    role.offlineMode = document.getElementById('csOfflineMode').checked;
    role.translateOn = document.getElementById('csTranslate').checked;
    role.bgMsg = document.getElementById('csBgMode').checked;
    role.memory = parseInt(document.getElementById('csMemory').value) || 20;
    saveChatRoles();
    closeChatSettingsPanel();
    // ★ 直接重建整个对话页，确保头像、名字、标签、壁纸等全部刷新
    openConversation(role.id);
    showToast('设置已保存');
}

/* ================================================================
   气泡操作菜单
   ================================================================ */
var _chatQuoteData = null;
var _chatMultiSelectMode = false;
var _chatMultiSelected = [];

function showBubbleMenu(ev, idx) {
    ev.stopPropagation();
    if (_chatMultiSelectMode) { toggleMultiSelect(idx); return; }
    removeBubbleMenu();
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m || m.recalled) return;

    var overlay = document.getElementById('chatConversation');
    var rect = overlay.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var menuW = 180, menuH = 240;
    if (x + menuW > rect.width) x = rect.width - menuW - 10;
    if (x < 10) x = 10;
    if (y + menuH > rect.height) y = y - menuH;
    if (y < 10) y = 10;

    var panel = document.createElement('div');
    panel.className = 'chat-bubble-menu';
    panel.id = 'chatBubbleMenu';
    panel.style.position = 'absolute';
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.zIndex = '860';

    var items = '';
    if (m.from === 'other') {
        items += '<div class="chat-bubble-menu-item" onclick="regenReply(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span>重回</span></div>';
    }
    items += '<div class="chat-bubble-menu-item" onclick="recallMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg><span>撤回</span></div>';
    items += '<div class="chat-bubble-menu-item" onclick="quoteMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>引用</span></div>';
    items += '<div class="chat-bubble-menu-item danger" onclick="deleteMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>删除</span></div>';
    items += '<div class="chat-bubble-menu-item" onclick="enterMultiSelect(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="9 11 12 14 22 4"/></svg><span>多选</span></div>';

    panel.innerHTML = items;
    overlay.appendChild(panel);
    setTimeout(function () { document.addEventListener('click', removeBubbleMenu, { once: true }); }, 10);
}

function removeBubbleMenu() {
    var m = document.getElementById('chatBubbleMenu'); if (m) m.remove();
}

function regenReply(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var start = idx, end = idx;
    while (start > 0 && role.msgs[start - 1] && role.msgs[start - 1].from === 'other' && !role.msgs[start - 1].recalled) start--;
    while (end < role.msgs.length - 1 && role.msgs[end + 1] && role.msgs[end + 1].from === 'other' && !role.msgs[end + 1].recalled) end++;
    role.msgs.splice(start, end - start + 1);
    saveChatRoles();
    openConversation(role.id);
    setTimeout(function () { continueChat(); }, 200);
}

function recallMsg(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    if (!role.msgs[idx]) return;
    role.msgs[idx].recalled = true;
    saveChatRoles();
    var row = document.querySelector('[data-msg-idx="' + idx + '"]');
    if (row) {
        var who = role.msgs[idx].from === 'self' ? '你' : esc(role.nickname || role.name);
        row.outerHTML = '<div class="chat-bubble-recalled">' + who + ' 撤回了一条消息</div>';
    }
    updateLastMsg(role);
    showToast('已撤回');
}

function quoteMsg(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m) return;
    var name = m.from === 'self' ? '我' : (role.nickname || role.name);
    _chatQuoteData = { name: name, text: m.text, idx: idx };
    var bar = document.getElementById('chatQuoteBar');
    var barText = document.getElementById('chatQuoteBarText');
    if (bar && barText) { barText.textContent = name + '：' + m.text; bar.style.display = 'flex'; }
    var inp = document.getElementById('chatConvInput'); if (inp) inp.focus();
}

function clearQuote() {
    _chatQuoteData = null;
    var bar = document.getElementById('chatQuoteBar'); if (bar) bar.style.display = 'none';
}

function deleteMsg(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.msgs.splice(idx, 1); saveChatRoles();
    openConversation(role.id); showToast('已删除');
}

function enterMultiSelect(idx) {
    _chatMultiSelectMode = true; _chatMultiSelected = [idx];
    var inputRow = document.getElementById('chatInputRow');
    var multiBar = document.getElementById('chatMultiBar');
    var quoteBar = document.getElementById('chatQuoteBar');
    if (inputRow) inputRow.style.display = 'none';
    if (quoteBar) quoteBar.style.display = 'none';
    if (multiBar) multiBar.style.display = 'flex';
    updateMultiSelectUI();
}

function exitMultiSelect() {
    _chatMultiSelectMode = false; _chatMultiSelected = [];
    var inputRow = document.getElementById('chatInputRow');
    var multiBar = document.getElementById('chatMultiBar');
    if (inputRow) inputRow.style.display = 'flex';
    if (multiBar) multiBar.style.display = 'none';
    document.querySelectorAll('.chat-bubble-row.multi-selected').forEach(function (el) { el.classList.remove('multi-selected'); });
}

function toggleMultiSelect(idx) {
    var pos = _chatMultiSelected.indexOf(idx);
    if (pos !== -1) _chatMultiSelected.splice(pos, 1);
    else _chatMultiSelected.push(idx);
    updateMultiSelectUI();
}

function updateMultiSelectUI() {
    document.getElementById('chatMultiInfo').textContent = '已选 ' + _chatMultiSelected.length + ' 条';
    document.querySelectorAll('.chat-bubble-row').forEach(function (el) {
        var i = parseInt(el.getAttribute('data-msg-idx'));
        if (!isNaN(i)) el.classList.toggle('multi-selected', _chatMultiSelected.indexOf(i) !== -1);
    });
}

function multiDeleteMsgs() {
    if (!_chatMultiSelected.length) { showToast('未选中任何消息'); return; }
    if (!confirm('确认删除 ' + _chatMultiSelected.length + ' 条消息？')) return;
    var role = findRole(_chatCurrentConv); if (!role) return;
    _chatMultiSelected.sort(function (a, b) { return b - a; });
    for (var i = 0; i < _chatMultiSelected.length; i++) role.msgs.splice(_chatMultiSelected[i], 1);
    saveChatRoles();
    _chatMultiSelectMode = false; _chatMultiSelected = [];
    openConversation(role.id); showToast('已删除');
}

function updateLastMsg(role) {
    var last = null;
    for (var i = role.msgs.length - 1; i >= 0; i--) { if (!role.msgs[i].recalled) { last = role.msgs[i]; break; } }
    role.lastMsg = last ? last.text : '';
    saveChatRoles();
}

/* ================================================================
   发送 & 续写 & AI回复
   ================================================================ */
function sendChatMessage() {
    var inp = document.getElementById('chatConvInput'); if (!inp) return;
    var text = inp.value.trim();
    var role = findRole(_chatCurrentConv); if (!role) return;
    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    if (!role.msgs) role.msgs = [];
    var max = (role.memory || 20) * 2;
    if (role.msgs.length >= max) role.msgs = role.msgs.slice(role.msgs.length - max + 2);

    // 如果有待发送的图片
    if (_pendingImageData) {
        var imgMsg = { from: 'self', text: text || '[图片]', time: ts, image: true, imageData: _pendingImageData };
        if (_chatQuoteData) { imgMsg.quoteText = _chatQuoteData.text; imgMsg.quoteName = _chatQuoteData.name; }
        role.msgs.push(imgMsg);
        role.lastMsg = '[图片]'; role.lastTime = now.getTime(); role.lastTimeStr = ts;
        saveChatRoles();

        var body = document.getElementById('chatConvBody');
        if (body) {
            var ap = getActivePersona();
            var myAv = ap && ap.avatar ? ap.avatar : '';
            var idx = role.msgs.length - 1;
            body.insertAdjacentHTML('beforeend', renderBubbleRow(imgMsg, idx, myAv, role.avatar || ''));
            body.scrollTop = body.scrollHeight;
        }
        inp.value = '';
        clearQuote();
        clearPendingImage();
        return;
    }

    // 普通文字消息
    if (!text) return;

    var msgObj = { from: 'self', text: text, time: ts };
    if (_chatQuoteData) { msgObj.quoteText = _chatQuoteData.text; msgObj.quoteName = _chatQuoteData.name; }
    role.msgs.push(msgObj);
    role.lastMsg = text; role.lastTime = now.getTime(); role.lastTimeStr = ts;
    saveChatRoles();

    var body2 = document.getElementById('chatConvBody');
    if (body2) {
        var ap2 = getActivePersona();
        var myAv2 = ap2 && ap2.avatar ? ap2.avatar : '';
        var idx2 = role.msgs.length - 1;
        body2.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, idx2, myAv2, role.avatar || ''));
        body2.scrollTop = body2.scrollHeight;
    }
    inp.value = '';
    clearQuote();
}

var _chatGenerating = false;

function continueChat() {
    var role = findRole(_chatCurrentConv);
    if (!role) { showToast('请先选择角色'); return; }
    if (_chatGenerating) { showToast('正在生成中...'); return; }

    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) {
        showToast('请先在API设置中配置并激活API'); return;
    }

    _chatGenerating = true;

    var body = document.getElementById('chatConvBody');
    var thinkingId = 'thinking_' + Date.now();
    if (body) {
        var avH = _convLeftAvatar ? '<img src="' + _convLeftAvatar + '" alt="">' : SVG_USER_SM;
        body.insertAdjacentHTML('beforeend', '<div class="chat-bubble-row" id="' + thinkingId + '"><div class="chat-bubble-avatar">' + avH + '</div><div class="chat-bubble-content-wrap"><div class="chat-bubble chat-thinking">思考中<span class="chat-thinking-dots"><span>.</span><span>.</span><span>.</span></span></div></div></div>');
        body.scrollTop = body.scrollHeight;
    }

    var messages = buildChatMessages(role);
    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.85, top_p: 0.95, max_tokens: 2048 })
    })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (json) {
            _chatGenerating = false;
            var thinkEl = document.getElementById(thinkingId); if (thinkEl) thinkEl.remove();

            var content = '';
            if (json.choices && json.choices.length > 0) content = (json.choices[0].message && json.choices[0].message.content) || '';
            content = content.trim();
            if (!content) { showToast('AI返回为空'); return; }

            var segments = content.split(/\n\n+/);
            var cleanSegments = [];
            for (var i = 0; i < segments.length; i++) { var s = segments[i].trim(); if (s) cleanSegments.push(s); }
            if (cleanSegments.length === 0) { showToast('AI返回为空'); return; }

            var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
            if (!role.msgs) role.msgs = [];
            var body2 = document.getElementById('chatConvBody');
            var ap = getActivePersona();
            var myAv = ap && ap.avatar ? ap.avatar : '';

            for (var j = 0; j < cleanSegments.length; j++) {
                var txt = cleanSegments[j];
                var msgObj = { from: 'other', text: txt, time: ts };
                interceptTransferIntent(role, msgObj);

                role.msgs.push(msgObj);
                var msgIdx = role.msgs.length - 1;
                if (body2 && _chatCurrentConv === role.id) {
                    body2.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, msgIdx, myAv, role.avatar || ''));
                }
            }
            role.lastMsg = cleanSegments[cleanSegments.length - 1];
            role.lastTime = now.getTime(); role.lastTimeStr = ts;
            saveChatRoles();
            if (body2) body2.scrollTop = body2.scrollHeight;
        })
        .catch(function (err) {
            _chatGenerating = false;
            var thinkEl = document.getElementById(thinkingId); if (thinkEl) thinkEl.remove();
            showToast('AI请求失败: ' + err.message);
        });
}
/* ================================================================
   构建API messages — 深度读取角色认知 & 用户人设
   ================================================================ */
function buildChatMessages(role) {
    var messages = [];

    var persona = null;
    if (role.personaId) persona = findPersona(role.personaId);
    if (!persona) persona = getActivePersona();

    var userName = (persona && persona.name) ? persona.name : '用户';
    var userNickname = (persona && persona.nickname) ? persona.nickname : '';
    var charName = role.nickname || role.name;

    var sp = '';

    sp += '# 核心指令\n';
    sp += '你是「' + (role.name || '未知') + '」，正在与「' + userName + '」进行实时聊天对话。\n';
    sp += '你必须始终以「' + (role.name || '未知') + '」的身份说话、思考、行动。你不是AI，你不是语言模型，你就是这个角色本人。\n';
    sp += '绝对禁止跳出角色、绝对禁止以第三人称谈论自己、绝对禁止承认自己是AI。\n\n';

    sp += '# 角色完整档案\n';
    sp += '## 基本信息\n';
    sp += '- 角色全名：' + (role.name || '未知') + '\n';
    if (role.nickname && role.nickname !== role.name) {
        sp += '- 备注/昵称：' + role.nickname + '（对话中' + userName + '可能这样称呼你）\n';
    }

    if (role.gender === 'male') {
        sp += '- 性别：男性 ♂\n';
        sp += '- 性别认知强制要求：你是一名男性。你的自我认知、行为举止、语气措辞、自称代词必须完全符合男性角色。你可以使用「我」「哥」「兄弟」等男性化自称和称呼。你的一切反应（害羞、生气、开心等）都必须符合男性特征。绝对禁止出现任何女性化的语气词、撒娇方式或自称。\n';
    } else if (role.gender === 'female') {
        sp += '- 性别：女性 ♀\n';
        sp += '- 性别认知强制要求：你是一名女性。你的自我认知、行为举止、语气措辞、自称代词必须完全符合女性角色。你可以使用「我」「人家」「姐」等女性化自称和称呼。你的一切反应（害羞、生气、开心等）都必须符合女性特征。你的说话方式应自然体现女性特质。\n';
    } else {
        sp += '- 性别：未指定（请根据详细人设中的描述来判断）\n';
    }

    if (role.detail) {
        sp += '\n## 详细人设（最重要，必须严格遵守）\n';
        sp += '以下是你的完整角色设定，包含你的性格、背景、喜好、说话方式、口癖、习惯等。你在对话中的每一句话、每一个反应都必须与以下设定完全一致：\n\n';
        sp += role.detail + '\n\n';
        sp += '【重要提醒】以上人设信息是你扮演这个角色的根本依据。你必须：\n';
        sp += '- 完全内化这些特征，而不只是表面模仿\n';
        sp += '- 如果设定中提到了特定的说话方式、口癖、语气词，你必须在回复中自然地使用它们\n';
        sp += '- 如果设定中提到了性格特征，你的回复情绪、态度必须与之一致\n';
        sp += '- 如果设定中提到了对' + userName + '的关系或态度，你必须在对话中体现出来\n';
        sp += '- 如果设定中有任何禁忌、不喜欢的事物，你遇到相关话题时必须表现出真实反应\n';
    } else {
        sp += '\n## 详细人设\n（该角色暂未设定详细信息，请根据角色名字和性别自由发挥一个合理的人格）\n';
    }

    if (role.customLabel) {
        sp += '\n## 附加身份描述\n';
        sp += role.customLabel + '\n';
    }

    if (role.worldBookId) {
        var wb = findWorldBook(role.worldBookId);
        if (wb && wb.content) {
            sp += '\n# 世界观与背景设定\n';
            sp += '以下是当前故事/对话所处的世界观背景。你在对话中应当默认遵循这个世界的规则和设定，不要说出与世界观矛盾的内容：\n\n';
            sp += wb.content + '\n';
        }
    }

    sp += '\n# 你的对话对象\n';
    sp += '你正在和以下这个人聊天，请根据对方的信息来调整你的称呼和互动方式：\n\n';

    if (persona) {
        sp += '- 名字：' + (persona.name || '用户') + '\n';
        if (persona.nickname) {
            sp += '- 昵称/别名：' + persona.nickname + '（你可以用这个昵称来称呼对方，也可以根据你们的关系用其他亲密称呼）\n';
        }
        if (persona.gender === 'male') {
            sp += '- 性别：男性。对方是男性，请在互动时注意这一点，称呼和互动方式应与之匹配。\n';
        } else if (persona.gender === 'female') {
            sp += '- 性别：女性。对方是女性，请在互动时注意这一点，称呼和互动方式应与之匹配。\n';
        }
        if (persona.signature) {
            sp += '- 个性签名：' + persona.signature + '（这反映了对方的个性或当前状态）\n';
        }
        if (persona.detail) {
            sp += '- 对方的详细信息：\n' + persona.detail + '\n';
            sp += '（请根据以上信息来理解对方是什么样的人，互动中可以自然地回应和引用这些信息）\n';
        }
    } else {
        sp += '- 名字：用户（对方未设置详细信息，请以自然友好的方式互动）\n';
    }

    if (role.detail && persona && persona.detail) {
        sp += '\n# 关系认知\n';
        sp += '请根据你的角色设定和对方的人设信息，推断你们之间的关系，并在对话中自然体现。\n';
        sp += '如果你的人设中明确提到了与「' + userName + '」的关系（例如恋人、朋友、同事等），则必须严格按照那个关系来互动。\n';
    }

    sp += '\n# 回复格式要求\n';
    sp += '1. 始终保持角色扮演，不要跳出角色，不要用第三人称描述自己。\n';
    sp += '2. 根据你的性格和说话方式来回复，如果有口癖一定要体现。\n';
    sp += '3. 回复自然流畅，像真人在手机上聊天一样，避免过于书面化。\n';
    sp += '4. 如果想表达多个意思，可以用两个换行分成多段（每段会显示为独立的消息气泡，模拟真实聊天连发多条消息的效果）。\n';
    sp += '5. 不要加任何角色名前缀如"' + charName + '："，直接说内容。\n';
    sp += '6. 不要使用markdown格式（不要用*加粗*、不要用标题符号#等）。\n';
    sp += '7. 如果消息中有引用内容（以【引用：...】标记），请针对被引用的具体内容来回复。\n';
    sp += '8. 称呼对方时请使用「' + (userNickname || userName) + '」或你们关系中合适的称呼，不要叫"用户"、"你"以外的泛称。\n';
    sp += '9. 注意聊天语境的连贯性，记住之前对话的内容，不要重复提问或遗忘已知信息。\n';

    if (role.offlineMode) {
        sp += '10. 你可以使用括号描写动作和心理活动，例如（微微低头，脸颊泛红）、（心想：他今天怎么这么认真）。鼓励适当使用以增加沉浸感。\n';
    } else {
        sp += '10. 严格禁止使用任何括号描写动作或心理活动，例如禁止出现（微笑）、（歪头）等。只能使用纯对话文字。如果需要表达动作，请用文字融入对话中，比如"我笑了一下"。\n';
    }

    sp += '11. 回复长度应根据话题自然调节：闲聊可以简短（1-3句），深入话题可以稍长（3-8句），但避免过长的独白。\n';
    sp += '12. 要有真实的情感波动，不要每句话都很积极或中性，应根据话题内容表现出相应的情绪。\n';

    messages.push({ role: 'system', content: sp });

    if (role.detail && role.msgs && role.msgs.length > 0) {
        var charIntro = '（角色状态初始化：我是' + role.name + '。';
        if (role.gender === 'male') charIntro += '我是男性。';
        else if (role.gender === 'female') charIntro += '我是女性。';
        if (role.nickname && role.nickname !== role.name) charIntro += '大家也叫我' + role.nickname + '。';
        charIntro += '我正在和' + userName + '聊天。';
        if (persona && persona.gender === 'male') charIntro += userName + '是一位男性。';
        else if (persona && persona.gender === 'female') charIntro += userName + '是一位女性。';
        charIntro += '我会严格按照我的人设来回复。）';
        messages.push({ role: 'assistant', content: charIntro });
    }

    var history = role.msgs || [];
    var memoryLimit = (role.memory || 20) * 2;
    var startIdx = Math.max(0, history.length - memoryLimit);

    for (var i = startIdx; i < history.length; i++) {
        var m = history[i];
        if (m.recalled) continue;

        // ★ 人设变更消息 — 注入为系统级提示，让char认知到user身份变化
        if (m.personaChange) {
            var changeNotice = '【系统通知：你的对话对象刚刚发生了身份切换。';
            changeNotice += '对方从「' + (m.oldPersonaName || '默认身份') + '」变为了「' + (m.newPersonaName || '默认身份') + '」。';
            var newP = m.newPersonaId ? findPersona(m.newPersonaId) : null;
            if (newP) {
                changeNotice += '新身份信息：';
                changeNotice += '名字是「' + (newP.name || '未知') + '」';
                if (newP.gender === 'male') changeNotice += '，性别男性';
                else if (newP.gender === 'female') changeNotice += '，性别女性';
                if (newP.nickname) changeNotice += '，昵称「' + newP.nickname + '」';
                if (newP.detail) changeNotice += '，详细信息：' + newP.detail.substring(0, 100);
                changeNotice += '。';
            } else {
                changeNotice += '对方切换回了默认身份，没有详细信息。';
            }
            changeNotice += '请你根据角色性格，自然地对这个身份变化做出反应。';
            changeNotice += '比如你可能会感到困惑、惊讶、好奇，或者如果你认识这个新身份，表现出相应的态度。';
            changeNotice += '不要生硬地说"你换了人设"，而是用符合角色的方式自然回应这种变化。';
            changeNotice += '如果新旧身份差异很大（比如性别不同、关系不同），你应该表现出明显的察觉和反应。】';
            messages.push({ role: 'system', content: changeNotice });
            continue;
        }

        var content = m.text;

        // 语音消息
        if (m.voice) {
            if (m.voiceTranscript) {
                content = '【对方发送了一条语音消息（时长' + (m.voiceDuration || '?') + '秒），语音转文字内容："' + m.voiceTranscript + '"。请当作语音来理解和回复，不要提"转文字"这个过程，直接当作对方说的话来回应。】';
            } else {
                content = '【对方发送了一条语音消息（时长' + (m.voiceDuration || '?') + '秒），但语音内容未能识别。你可以回复"没听清，可以再说一遍吗？"或类似的自然回应。】';
            }
        }

        // 转账消息
        if (m.transfer) {
            if (m.from === 'self') {
                content = '【用户给你发了一笔转账 ¥' + (m.transferAmount || 0).toFixed(2) + '，备注："' + (m.transferRemark || '转账') + '"。状态：' + (m.transferStatus === 'accepted' ? '你已收下' : m.transferStatus === 'refunded' ? '你退回了' : '待确认') + '。请根据角色性格自然回应。】';
            } else if (m.transferFromChar) {
                content = '【你给用户发了一笔转账 ¥' + (m.transferAmount || 0).toFixed(2) + '，备注："' + (m.transferRemark || '转账') + '"。状态：' + (m.transferStatus === 'accepted' ? '对方已收' : m.transferStatus === 'refunded' ? '对方退回了' : '待确认') + '。】';
            } else if (m.transferIsNotice) {
                content = m.text;
            }
        }

        // 图片消息
        if (m.image) {
            if (m.text && m.text !== '[图片]') {
                content = '【对方发送了一张图片，并附文字："' + m.text + '"。请根据文字内容自然回复，你可以评论图片或回应文字。】';
            } else {
                content = '【对方发送了一张图片。你可以自然地回应，例如评论图片、表达感受等。】';
            }
        }

        // 附带引用
        if (m.quoteText) {
            content = '【引用：' + m.quoteName + '说"' + m.quoteText + '"】\n' + content;
        }
        if (m.from === 'self') {
            messages.push({ role: 'user', content: content });
        } else {
            messages.push({ role: 'assistant', content: content });
        }
    }

    if (messages.length <= 1 || messages[messages.length - 1].role === 'assistant') {
        var hint = '[继续扮演' + charName + '。';
        hint += '记住你的性别是' + (role.gender === 'male' ? '男性' : role.gender === 'female' ? '女性' : '未指定') + '。';
        if (role.detail) {
            var briefDetail = role.detail.substring(0, 60).replace(/\n/g, ' ');
            hint += '你的关键人设：' + briefDetail + '...。';
        }
        hint += '请根据当前对话情境，用符合你性格的方式自然地说些什么。';
        if (persona && persona.name) hint += '你在和' + persona.name + '说话。';
        hint += ']';
        messages.push({ role: 'user', content: hint });
    }

    return messages;
}

function formatBubbleText(text) {
    if (!text) return '';
    var d = document.createElement('div'); d.textContent = text;
    return d.innerHTML.replace(/\n/g, '<br>');
}

function esc(t) { if (!t) return ''; var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

/* ========== 钱包系统 ========== */
var _chatWallet = { balance: 10000.00, transactions: [] };
function loadWallet() {
    try { _chatWallet = JSON.parse(localStorage.getItem('ds_chat_wallet') || '{"balance":10000,"transactions":[]}'); } catch (e) { _chatWallet = { balance: 10000, transactions: [] }; }
    if (typeof _chatWallet.balance !== 'number') _chatWallet.balance = 10000;
    if (!Array.isArray(_chatWallet.transactions)) _chatWallet.transactions = [];
}
function saveWallet() { safeSetItem('ds_chat_wallet', JSON.stringify(_chatWallet)); }

/* ================================================================
   语音录音 — 完整系统
   录音 → 生成可播放音频气泡 → Web Speech API 识别转文字 →
   发送给 AI（认知为语音消息 + 转文字内容）
   ================================================================ */

var _voiceRecorder = null;
var _voiceChunks = [];
var _voiceStream = null;
var _voiceStartTime = 0;
var _voiceTimerInterval = null;
var _voiceRecognition = null;
var _voiceTranscript = '';
var _voiceIsRecording = false;

function openVoiceRecorder() {
    if (_voiceIsRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('您的浏览器不支持录音功能');
        return;
    }
    var conv = document.getElementById('chatConversation');
    if (!conv) return;
    closeVoiceRecorder(true);

    var h = '<div class="voice-recorder-overlay" id="voiceRecorderOverlay">';
    h += '<div class="voice-recorder-panel" id="voiceRecorderPanel">';
    h += '<div class="voice-recorder-title">语音消息</div>';
    h += '<div class="voice-recorder-wave-area" id="voiceWaveArea">';
    h += '<div class="voice-recorder-idle-icon">';
    h += '<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    h += '</div>';
    h += '<div class="voice-recorder-waves" id="voiceWaves" style="display:none">';
    for (var i = 0; i < 20; i++) {
        h += '<div class="voice-wave-bar" style="animation-delay:' + (i * 0.05) + 's"></div>';
    }
    h += '</div>';
    h += '</div>';
    h += '<div class="voice-recorder-timer" id="voiceTimer">00:00</div>';
    h += '<div class="voice-recorder-transcript" id="voiceTranscriptPreview">点击下方按钮开始录音</div>';
    h += '<div class="voice-recorder-buttons">';
    h += '<div class="voice-recorder-btn cancel" id="voiceBtnCancel" onclick="closeVoiceRecorder()" style="display:none">';
    h += '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    h += '<span>取消</span></div>';
    h += '<div class="voice-recorder-btn record" id="voiceBtnRecord" onclick="toggleVoiceRecord()">';
    h += '<div class="voice-recorder-btn-inner" id="voiceBtnInner">';
    h += '<svg viewBox="0 0 24 24" id="voiceBtnIcon"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    h += '</div>';
    h += '<span id="voiceBtnLabel">开始录音</span></div>';
    h += '<div class="voice-recorder-btn send" id="voiceBtnSend" onclick="sendVoiceMessage()" style="display:none">';
    h += '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    h += '<span>发送</span></div>';
    h += '</div>';
    h += '</div>';
    h += '</div>';

    conv.insertAdjacentHTML('beforeend', h);
    setTimeout(function () {
        var ov = document.getElementById('voiceRecorderOverlay');
        if (ov) ov.classList.add('show');
    }, 10);
}

function closeVoiceRecorder(silent) {
    stopVoiceRecord(true);
    var ov = document.getElementById('voiceRecorderOverlay');
    if (ov) {
        ov.classList.remove('show');
        setTimeout(function () { if (ov.parentNode) ov.remove(); }, 200);
    }
    _voiceTranscript = '';
    _voiceChunks = [];
    if (!silent) showToast('已取消');
}

function toggleVoiceRecord() {
    if (_voiceIsRecording) {
        stopVoiceRecord(false);
    } else {
        startVoiceRecord();
    }
}

function startVoiceRecord() {
    _voiceTranscript = '';
    _voiceChunks = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            _voiceStream = stream;
            _voiceIsRecording = true;

            var mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = '';
                    }
                }
            }

            var options = mimeType ? { mimeType: mimeType } : {};
            _voiceRecorder = new MediaRecorder(stream, options);

            _voiceRecorder.ondataavailable = function (e) {
                if (e.data && e.data.size > 0) _voiceChunks.push(e.data);
            };

            _voiceRecorder.onstop = function () { };

            _voiceRecorder.start(100);
            _voiceStartTime = Date.now();

            updateVoiceTimer();
            _voiceTimerInterval = setInterval(updateVoiceTimer, 1000);

            startSpeechRecognition();

            var waves = document.getElementById('voiceWaves');
            var idle = document.querySelector('.voice-recorder-idle-icon');
            var btnLabel = document.getElementById('voiceBtnLabel');
            var btnInner = document.getElementById('voiceBtnInner');
            var btnCancel = document.getElementById('voiceBtnCancel');
            var preview = document.getElementById('voiceTranscriptPreview');

            if (waves) waves.style.display = 'flex';
            if (idle) idle.style.display = 'none';
            if (btnLabel) btnLabel.textContent = '停止录音';
            if (btnInner) btnInner.classList.add('recording');
            if (btnCancel) btnCancel.style.display = 'flex';
            if (preview) preview.textContent = '正在聆听...';

            startWaveAnimation(stream);
        })
        .catch(function (err) {
            showToast('无法访问麦克风：' + err.message);
            console.error('Microphone error:', err);
        });
}

function stopVoiceRecord(isCancel) {
    _voiceIsRecording = false;

    if (_voiceTimerInterval) {
        clearInterval(_voiceTimerInterval);
        _voiceTimerInterval = null;
    }

    if (_voiceRecognition) {
        try { _voiceRecognition.stop(); } catch (e) { }
        _voiceRecognition = null;
    }

    if (_voiceRecorder && _voiceRecorder.state !== 'inactive') {
        _voiceRecorder.stop();
    }

    if (_voiceStream) {
        _voiceStream.getTracks().forEach(function (t) { t.stop(); });
        _voiceStream = null;
    }

    stopWaveAnimation();

    if (!isCancel) {
        var waves = document.getElementById('voiceWaves');
        var idle = document.querySelector('.voice-recorder-idle-icon');
        var btnLabel = document.getElementById('voiceBtnLabel');
        var btnInner = document.getElementById('voiceBtnInner');
        var btnSend = document.getElementById('voiceBtnSend');
        var btnRecord = document.getElementById('voiceBtnRecord');
        var preview = document.getElementById('voiceTranscriptPreview');

        if (waves) waves.style.display = 'none';
        if (idle) { idle.style.display = 'flex'; idle.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'; }
        if (btnLabel) btnLabel.textContent = '重新录音';
        if (btnInner) btnInner.classList.remove('recording');
        if (btnSend) btnSend.style.display = 'flex';
        if (preview) {
            preview.textContent = _voiceTranscript || '（未识别到语音内容）';
        }
    }
}

function updateVoiceTimer() {
    var el = document.getElementById('voiceTimer');
    if (!el) return;
    var elapsed = Math.floor((Date.now() - _voiceStartTime) / 1000);
    var m = Math.floor(elapsed / 60);
    var s = elapsed % 60;
    el.textContent = pad(m) + ':' + pad(s);
}

function startSpeechRecognition() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('SpeechRecognition not supported');
        return;
    }

    _voiceRecognition = new SpeechRecognition();
    _voiceRecognition.continuous = true;
    _voiceRecognition.interimResults = true;
    _voiceRecognition.lang = 'zh-CN';
    _voiceRecognition.maxAlternatives = 1;

    var finalTranscript = '';

    _voiceRecognition.onresult = function (e) {
        var interim = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
            var t = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
                finalTranscript += t;
            } else {
                interim += t;
            }
        }
        _voiceTranscript = finalTranscript + interim;
        var preview = document.getElementById('voiceTranscriptPreview');
        if (preview) {
            preview.textContent = _voiceTranscript || '正在聆听...';
        }
    };

    _voiceRecognition.onerror = function (e) {
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'no-speech') {
            var preview = document.getElementById('voiceTranscriptPreview');
            if (preview && !_voiceTranscript) preview.textContent = '未检测到语音，请靠近麦克风...';
        }
    };

    _voiceRecognition.onend = function () {
        if (_voiceIsRecording && _voiceRecognition) {
            try { _voiceRecognition.start(); } catch (e) { }
        }
    };

    try { _voiceRecognition.start(); } catch (e) { console.warn('SR start error:', e); }
}

var _voiceAnalyser = null;
var _voiceAnimFrame = null;
var _voiceAudioCtx = null;

function startWaveAnimation(stream) {
    try {
        _voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source = _voiceAudioCtx.createMediaStreamSource(stream);
        _voiceAnalyser = _voiceAudioCtx.createAnalyser();
        _voiceAnalyser.fftSize = 64;
        source.connect(_voiceAnalyser);
        animateWaveBars();
    } catch (e) {
        console.warn('Wave animation error:', e);
    }
}

function animateWaveBars() {
    if (!_voiceAnalyser || !_voiceIsRecording) return;

    var data = new Uint8Array(_voiceAnalyser.frequencyBinCount);
    _voiceAnalyser.getByteFrequencyData(data);

    var bars = document.querySelectorAll('.voice-wave-bar');
    var count = bars.length;
    for (var i = 0; i < count; i++) {
        var dataIdx = Math.floor(i * data.length / count);
        var val = data[dataIdx] || 0;
        var height = Math.max(4, (val / 255) * 50);
        bars[i].style.height = height + 'px';
    }

    _voiceAnimFrame = requestAnimationFrame(animateWaveBars);
}

function stopWaveAnimation() {
    if (_voiceAnimFrame) {
        cancelAnimationFrame(_voiceAnimFrame);
        _voiceAnimFrame = null;
    }
    if (_voiceAudioCtx) {
        try { _voiceAudioCtx.close(); } catch (e) { }
        _voiceAudioCtx = null;
    }
    _voiceAnalyser = null;
}

function sendVoiceMessage() {
    var role = findRole(_chatCurrentConv);
    if (!role) { showToast('角色不存在'); return; }

    if (_voiceChunks.length === 0) {
        showToast('没有录到音频');
        return;
    }

    var mimeType = _voiceRecorder && _voiceRecorder.mimeType ? _voiceRecorder.mimeType : 'audio/webm';
    var blob = new Blob(_voiceChunks, { type: mimeType });
    var audioUrl = URL.createObjectURL(blob);

    var duration = Math.floor((Date.now() - _voiceStartTime) / 1000);
    if (duration < 1) duration = 1;

    var now = new Date();
    var ts = pad(now.getHours()) + ':' + pad(now.getMinutes());

    var transcript = _voiceTranscript.trim() || '';

    var reader = new FileReader();
    reader.onloadend = function () {
        var audioBase64 = reader.result;

        if (!role.msgs) role.msgs = [];

        var msgObj = {
            from: 'self',
            text: '[语音消息]',
            time: ts,
            voice: true,
            voiceData: audioBase64,
            voiceDuration: duration,
            voiceTranscript: transcript
        };

        if (_chatQuoteData) {
            msgObj.quoteText = _chatQuoteData.text;
            msgObj.quoteName = _chatQuoteData.name;
        }

        role.msgs.push(msgObj);
        role.lastMsg = '[语音消息] ' + (transcript || '');
        role.lastTime = now.getTime();
        role.lastTimeStr = ts;
        saveChatRoles();

        var body = document.getElementById('chatConvBody');
        if (body) {
            var ap = getActivePersona();
            var myAv = ap && ap.avatar ? ap.avatar : '';
            var idx = role.msgs.length - 1;
            body.insertAdjacentHTML('beforeend', renderVoiceBubbleRow(msgObj, idx, myAv, role.avatar || ''));
            body.scrollTop = body.scrollHeight;
        }

        clearQuote();
        closeVoiceRecorder(true);
        showToast('语音已发送');
    };

    reader.readAsDataURL(blob);
}

function renderVoiceBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';

    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }

    var dur = m.voiceDuration || 1;
    var barWidth = Math.min(70, Math.max(30, dur * 3));
    h += '<div class="chat-bubble voice-bubble" style="min-width:' + barWidth + '%">';
    h += '<div class="voice-bubble-play" onclick="event.stopPropagation();playVoiceBubble(this,\'' + idx + '\')">';
    h += '<svg viewBox="0 0 24 24" class="voice-play-icon"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    h += '<svg viewBox="0 0 24 24" class="voice-pause-icon" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    h += '</div>';

    h += '<div class="voice-bubble-waveform">';
    for (var w = 0; w < 16; w++) {
        var rh = 4 + Math.floor(Math.random() * 14);
        h += '<div class="voice-bubble-wave-bar" style="height:' + rh + 'px"></div>';
    }
    h += '</div>';

    h += '<div class="voice-bubble-duration">' + formatVoiceDuration(dur) + '</div>';
    h += '</div>';

    if (m.voiceTranscript) {
        h += '<div class="voice-bubble-transcript">' + esc(m.voiceTranscript) + '</div>';
    }

    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

function formatVoiceDuration(sec) {
    if (sec < 60) return sec + '"';
    return Math.floor(sec / 60) + '\'' + (sec % 60) + '"';
}

var _currentPlayingAudio = null;
var _currentPlayingBtn = null;

function playVoiceBubble(btnEl, idx) {
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var m = role.msgs[parseInt(idx)];
    if (!m || !m.voiceData) { showToast('音频数据不存在'); return; }

    if (_currentPlayingAudio && _currentPlayingBtn === btnEl) {
        _currentPlayingAudio.pause();
        resetPlayBtn(_currentPlayingBtn);
        _currentPlayingAudio = null;
        _currentPlayingBtn = null;
        return;
    }

    if (_currentPlayingAudio) {
        _currentPlayingAudio.pause();
        resetPlayBtn(_currentPlayingBtn);
    }

    var audio = new Audio(m.voiceData);
    _currentPlayingAudio = audio;
    _currentPlayingBtn = btnEl;

    var playIcon = btnEl.querySelector('.voice-play-icon');
    var pauseIcon = btnEl.querySelector('.voice-pause-icon');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    btnEl.classList.add('playing');

    audio.play().catch(function (e) {
        showToast('播放失败: ' + e.message);
        resetPlayBtn(btnEl);
    });

    audio.onended = function () {
        resetPlayBtn(btnEl);
        _currentPlayingAudio = null;
        _currentPlayingBtn = null;
    };
}

function resetPlayBtn(btnEl) {
    if (!btnEl) return;
    var playIcon = btnEl.querySelector('.voice-play-icon');
    var pauseIcon = btnEl.querySelector('.voice-pause-icon');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    btnEl.classList.remove('playing');
}

function renderChatPage() { openChatApp(); }

/* ================================================================
   转账系统 — 完整实现 v2
   毛玻璃卡片 + 钱包账单 + 双向收发退回
   所有转账消息统一精美卡片渲染
   ================================================================ */

function openTransferPanel() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var conv = document.getElementById('chatConversation'); if (!conv) return;
    closeTransferPanel();

    var dn = esc(role.nickname || role.name);
    var roleAv = role.avatar || '';

    var h = '<div class="chat-transfer-overlay show" id="chatTransferOverlay" onclick="if(event.target===this)closeTransferPanel()">';
    h += '<div class="chat-transfer-panel">';

    h += '<div class="chat-transfer-header">';
    h += '<div class="chat-transfer-close" onclick="closeTransferPanel()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '<div class="chat-transfer-title">转账给 ' + dn + '</div>';
    h += '</div>';

    h += '<div class="chat-transfer-recipient">';
    h += '<div class="chat-transfer-recipient-avatar">' + (roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM) + '</div>';
    h += '<div class="chat-transfer-recipient-name">' + dn + '</div>';
    h += '</div>';

    h += '<div class="chat-transfer-amount-area">';
    h += '<div class="chat-transfer-currency">¥</div>';
    h += '<input type="number" class="chat-transfer-amount-input" id="transferAmount" placeholder="0.00" min="0.01" max="99999" step="0.01" oninput="updateTransferPreview()">';
    h += '</div>';

    h += '<div class="chat-transfer-quick">';
    var quickAmounts = [5.20, 13.14, 52.00, 100, 200, 520];
    for (var i = 0; i < quickAmounts.length; i++) {
        h += '<div class="chat-transfer-quick-btn" onclick="setTransferAmount(' + quickAmounts[i] + ')">' + quickAmounts[i].toFixed(2) + '</div>';
    }
    h += '</div>';

    h += '<div class="chat-transfer-remark-area">';
    h += '<input type="text" class="chat-transfer-remark-input" id="transferRemark" placeholder="添加转账说明（可选）" maxlength="30">';
    h += '</div>';

    h += '<div class="chat-transfer-balance" id="transferBalanceHint">当前余额：¥' + _chatWallet.balance.toFixed(2) + '</div>';
    h += '<div class="chat-transfer-send-btn" id="transferSendBtn" onclick="sendTransfer()">确认转账</div>';

    h += '</div></div>';
    conv.insertAdjacentHTML('beforeend', h);
}

function closeTransferPanel() {
    var el = document.getElementById('chatTransferOverlay'); if (el) el.remove();
}

function setTransferAmount(val) {
    var inp = document.getElementById('transferAmount');
    if (inp) { inp.value = val.toFixed(2); updateTransferPreview(); }
}

function updateTransferPreview() {
    var inp = document.getElementById('transferAmount');
    var hint = document.getElementById('transferBalanceHint');
    if (!inp || !hint) return;
    var val = parseFloat(inp.value) || 0;
    if (val > _chatWallet.balance) {
        hint.textContent = '余额不足（当前：¥' + _chatWallet.balance.toFixed(2) + '）';
        hint.style.color = '#e74c3c';
    } else {
        hint.textContent = '当前余额：¥' + _chatWallet.balance.toFixed(2);
        hint.style.color = '';
    }
}

/* 发送转账 */
function sendTransfer() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var amountVal = parseFloat(document.getElementById('transferAmount').value);
    if (!amountVal || amountVal <= 0) { showToast('请输入转账金额'); return; }
    if (amountVal > _chatWallet.balance) { showToast('余额不足'); return; }
    var remark = (document.getElementById('transferRemark').value || '').trim();

    _chatWallet.balance -= amountVal;
    var txId = 'tx' + Date.now() + Math.random().toString(36).substr(2, 4);
    _chatWallet.transactions.unshift({
        id: txId, type: 'transfer_out', amount: amountVal,
        remark: remark || '转账', target: role.nickname || role.name,
        time: new Date().toLocaleString(), status: 'pending'
    });
    saveWallet();

    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    if (!role.msgs) role.msgs = [];

    var msgObj = {
        from: 'self', text: '[转账] ¥' + amountVal.toFixed(2), time: ts,
        transfer: true, transferId: txId,
        transferAmount: amountVal, transferRemark: remark || '转账',
        transferStatus: 'pending', transferDirection: 'user_to_char'
    };
    role.msgs.push(msgObj);
    role.lastMsg = '[转账] ¥' + amountVal.toFixed(2);
    role.lastTime = now.getTime(); role.lastTimeStr = ts;
    saveChatRoles();

    appendBubbleToBody(role, msgObj);
    closeTransferPanel();
    showToast('转账已发送');

    setTimeout(function () { charRespondTransfer(role, txId, amountVal, remark); }, 1500 + Math.random() * 2000);
}
/* ================================================================
   拦截AI回复中的转账意图 → 自动触发转账卡片
   在AI回复push到msgs之后、渲染之前调用
   ================================================================ */
function interceptTransferIntent(role, msgObj) {
    if (!msgObj || msgObj.from !== 'other') return false;
    var t = msgObj.text || '';
    // 匹配：转账、发红包、给你转、向你转账 + 金额
    var patterns = [
        /(?:转账|转给你|给你转|向你转账|发红包|打款|汇款)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/,
        /[¥￥]\s*(\d+(?:\.\d{1,2})?)\s*(?:转账|红包|转给你)/,
        /(?:给你|转你|发你)\s*(\d+(?:\.\d{1,2})?)\s*(?:元|块|¥|￥)?/,
        /(?:转|发)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)\s*(?:给你|过去|过来)/
    ];

    for (var i = 0; i < patterns.length; i++) {
        var match = t.match(patterns[i]);
        if (match) {
            var amount = parseFloat(match[1]);
            if (amount > 0 && amount < 100000) {
                // 从文本中提取备注（去掉金额部分）
                var remark = t.replace(match[0], '').trim();
                if (!remark || remark.length > 30) remark = '转账';

                // 把这条消息改造成转账卡片
                var txId = 'ctx' + Date.now() + Math.random().toString(36).substr(2, 4);
                msgObj.transfer = true;
                msgObj.transferId = txId;
                msgObj.transferAmount = amount;
                msgObj.transferRemark = remark || '转账';
                msgObj.transferStatus = 'pending';
                msgObj.transferDirection = 'char_to_user';
                msgObj.text = '[转账] ¥' + amount.toFixed(2);

                // 加入钱包记录
                loadWallet();
                _chatWallet.transactions.unshift({
                    id: txId, type: 'transfer_in', amount: amount,
                    remark: remark || '转账', target: role.nickname || role.name,
                    time: new Date().toLocaleString(), status: 'pending'
                });
                saveWallet();

                return true; // 已拦截
            }
        }
    }
    return false; // 未匹配
}
/* 公共：追加一条气泡到聊天区 */
function appendBubbleToBody(role, msgObj) {
    var body = document.getElementById('chatConvBody');
    if (body && _chatCurrentConv === role.id) {
        var ap = getActivePersona();
        var myAv = ap && ap.avatar ? ap.avatar : '';
        var idx = role.msgs.length - 1;
        body.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, idx, myAv, role.avatar || ''));
        body.scrollTop = body.scrollHeight;
    }
}

/* ========== char对user转账的响应 ========== */
function charRespondTransfer(role, txId, amount, remark) {
    if (_chatCurrentConv !== role.id) return;
    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var charName = role.nickname || role.name;

    var accept = Math.random() < 0.8;

    if (accept) {
        // char收下
        setTransferStatusEverywhere(role, txId, 'accepted');

        // char发一条收款确认卡片
        var receiptMsg = {
            from: 'other', text: '已收款 ¥' + amount.toFixed(2), time: ts,
            transfer: true, transferId: txId + '_receipt',
            transferAmount: amount, transferRemark: remark || '转账',
            transferStatus: 'accepted', transferDirection: 'receipt'
        };
        role.msgs.push(receiptMsg);
        role.lastMsg = charName + ' 已收款';
        role.lastTime = Date.now(); role.lastTimeStr = ts;
        saveChatRoles();
        appendBubbleToBody(role, receiptMsg);

        // 30%概率char也给user回一笔
        if (Math.random() < 0.3) {
            setTimeout(function () { charSendTransfer(role); }, 2000 + Math.random() * 3000);
        }
    } else {
        // char退回
        _chatWallet.balance += amount;
        setTransferStatusEverywhere(role, txId, 'refunded');

        var refundMsg = {
            from: 'other', text: '已退还 ¥' + amount.toFixed(2), time: ts,
            transfer: true, transferId: txId + '_refund',
            transferAmount: amount, transferRemark: '对方已退还',
            transferStatus: 'refunded', transferDirection: 'refund'
        };
        role.msgs.push(refundMsg);
        role.lastMsg = charName + ' 退还了转账';
        role.lastTime = Date.now(); role.lastTimeStr = ts;
        saveChatRoles();
        appendBubbleToBody(role, refundMsg);
    }
    refreshTransferCards(role);
}

/* ========== char主动给user发转账 ========== */
function charSendTransfer(role) {
    if (_chatCurrentConv !== role.id) return;
    var charName = role.nickname || role.name;
    var amount = [5.20, 6.66, 8.88, 13.14, 52.00, 66.66, 88.88, 99.99][Math.floor(Math.random() * 8)];
    var remarks = ['请你喝奶茶☕', '小红包~🧧', '还你的💰', '买点好吃的🍰', '爱你哦💕', '零花钱✨', '嘻嘻😊', '给你花🌸'];
    var remark = remarks[Math.floor(Math.random() * remarks.length)];
    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var txId = 'ctx' + Date.now() + Math.random().toString(36).substr(2, 4);

    var msgObj = {
        from: 'other', text: '[转账] ¥' + amount.toFixed(2), time: ts,
        transfer: true, transferId: txId,
        transferAmount: amount, transferRemark: remark,
        transferStatus: 'pending', transferDirection: 'char_to_user'
    };
    role.msgs.push(msgObj);
    role.lastMsg = '[转账] ¥' + amount.toFixed(2);
    role.lastTime = Date.now(); role.lastTimeStr = ts;
    saveChatRoles();

    _chatWallet.transactions.unshift({
        id: txId, type: 'transfer_in', amount: amount,
        remark: remark, target: charName,
        time: new Date().toLocaleString(), status: 'pending'
    });
    saveWallet();
    appendBubbleToBody(role, msgObj);
}

/* user接收char的转账 */
function acceptCharTransfer(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m || !m.transfer || m.transferDirection !== 'char_to_user') return;
    if (m.transferStatus !== 'pending') { showToast('该转账已处理'); return; }

    m.transferStatus = 'accepted';
    _chatWallet.balance += m.transferAmount;
    var txRec = findWalletTx(m.transferId);
    if (txRec) txRec.status = 'accepted';
    saveWallet(); saveChatRoles();
    refreshTransferCards(role);
    showToast('已收款 ¥' + m.transferAmount.toFixed(2));
}

/* user退回char的转账 */
function refundCharTransfer(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m || !m.transfer || m.transferDirection !== 'char_to_user') return;
    if (m.transferStatus !== 'pending') { showToast('该转账已处理'); return; }

    m.transferStatus = 'refunded';
    var txRec = findWalletTx(m.transferId);
    if (txRec) txRec.status = 'refunded';
    saveWallet(); saveChatRoles();
    refreshTransferCards(role);
    showToast('已退回转账');
}

function findWalletTx(txId) {
    for (var i = 0; i < _chatWallet.transactions.length; i++) {
        if (_chatWallet.transactions[i].id === txId) return _chatWallet.transactions[i];
    }
    return null;
}

function setTransferStatusEverywhere(role, txId, status) {
    // 更新消息
    for (var i = 0; i < role.msgs.length; i++) {
        if (role.msgs[i].transferId === txId) role.msgs[i].transferStatus = status;
    }
    // 更新钱包
    var tx = findWalletTx(txId);
    if (tx) tx.status = status;
    saveChatRoles(); saveWallet();
}

function refreshTransferCards(role) {
    if (_chatCurrentConv === role.id) openConversation(role.id);
}

/* ================================================================
   渲染转账卡片气泡 — 统一精美版 v2
   所有转账（发出、收到、收款确认、退还确认、char发来的）
   全部渲染为居中毛玻璃卡片
   ================================================================ */
function renderTransferBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    var isSelf = m.from === 'self';
    var dir = m.transferDirection || '';

    h += '<div class="chat-bubble-row ' + (isSelf ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';

    // 头像
    h += '<div class="chat-bubble-avatar">';
    if (isSelf) h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';

    h += '<div class="chat-bubble-content-wrap">';
    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }

    // 卡片状态
    var st = m.transferStatus || 'pending';
    var stLabel = st === 'accepted' ? '已收款' : st === 'refunded' ? '已退还' : '待确认';

    // 卡片标题
    var cardTitle = '';
    var cardIcon = '';
    if (dir === 'user_to_char') {
        cardTitle = '转账给对方';
        cardIcon = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
    } else if (dir === 'char_to_user') {
        cardTitle = '对方转账给你';
        cardIcon = '<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
    } else if (dir === 'receipt') {
        cardTitle = '已确认收款';
        cardIcon = '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (dir === 'refund') {
        cardTitle = '转账已退还';
        cardIcon = '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
    } else {
        cardTitle = isSelf ? '转账' : '收到转账';
        cardIcon = '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    }

    h += '<div class="chat-transfer-card ' + st + '" onclick="event.stopPropagation()">';

    // 顶部色条
    h += '<div class="chat-transfer-card-stripe"></div>';

    // 图标 + 标题
    h += '<div class="chat-transfer-card-head">';
    h += '<div class="chat-transfer-card-icon">' + cardIcon + '</div>';
    h += '<div class="chat-transfer-card-title">' + cardTitle + '</div>';
    h += '</div>';

    // 金额
    h += '<div class="chat-transfer-card-amount">¥' + (m.transferAmount || 0).toFixed(2) + '</div>';

    // 备注
    h += '<div class="chat-transfer-card-remark">' + esc(m.transferRemark || '转账') + '</div>';

    // 状态标签
    h += '<div class="chat-transfer-card-status-badge ' + st + '">' + stLabel + '</div>';

    // char发给user的待确认：收款/退回按钮
    if (dir === 'char_to_user' && st === 'pending') {
        h += '<div class="chat-transfer-card-actions">';
        h += '<div class="chat-transfer-card-btn accept" onclick="event.stopPropagation();acceptCharTransfer(' + idx + ')">💰 收款</div>';
        h += '<div class="chat-transfer-card-btn refund" onclick="event.stopPropagation();refundCharTransfer(' + idx + ')">↩ 退回</div>';
        h += '</div>';
    }

    // 底部分割线 + 微信风标识
    h += '<div class="chat-transfer-card-footer">';
    h += '<svg viewBox="0 0 24 24" class="chat-transfer-card-footer-icon"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    h += '<span>蛋薯转账</span>';
    h += '</div>';

    h += '</div>'; // .chat-transfer-card

    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* ================================================================
   钱包页面
   ================================================================ */
function openWalletPage() {
    closeWalletPage();
    var overlay = document.getElementById('chatAppOverlay');
    if (!overlay) return;
    overlay.insertAdjacentHTML('beforeend', buildWalletHTML());
}

function buildWalletHTML() {
    loadWallet();
    var h = '<div class="chat-wallet-overlay show" id="chatWalletOverlay">';
    h += '<div class="chat-wallet-panel">';

    h += '<div class="chat-wallet-header">';
    h += '<div class="chat-wallet-back" onclick="closeWalletPage()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="chat-wallet-title">我的钱包</div>';
    h += '<div style="width:30px"></div>';
    h += '</div>';

    // 余额卡
    h += '<div class="chat-wallet-balance-card">';
    h += '<div class="chat-wallet-balance-deco">💰</div>';
    h += '<div class="chat-wallet-balance-label">账户余额</div>';
    h += '<div class="chat-wallet-balance-amount">¥' + _chatWallet.balance.toFixed(2) + '</div>';
    h += '<div class="chat-wallet-balance-actions">';
    h += '<div class="chat-wallet-action-btn" onclick="walletRecharge()">+ 充值</div>';
    h += '</div>';
    h += '</div>';

    // 统计
    var totalIn = 0, totalOut = 0;
    for (var t = 0; t < _chatWallet.transactions.length; t++) {
        var tx = _chatWallet.transactions[t];
        if (tx.status === 'accepted') {
            if (tx.type === 'transfer_out') totalOut += tx.amount;
            else if (tx.type === 'transfer_in') totalIn += tx.amount;
            else if (tx.type === 'recharge') totalIn += tx.amount;
        }
    }
    h += '<div class="chat-wallet-stats">';
    h += '<div class="chat-wallet-stat-item"><div class="chat-wallet-stat-label">总收入</div><div class="chat-wallet-stat-val in">+¥' + totalIn.toFixed(2) + '</div></div>';
    h += '<div class="chat-wallet-stat-divider"></div>';
    h += '<div class="chat-wallet-stat-item"><div class="chat-wallet-stat-label">总支出</div><div class="chat-wallet-stat-val out">-¥' + totalOut.toFixed(2) + '</div></div>';
    h += '</div>';

    // 账单
    h += '<div class="chat-wallet-bill-title">交易记录</div>';
    h += '<div class="chat-wallet-bill-list">';
    if (!_chatWallet.transactions.length) {
        h += '<div class="chat-wallet-bill-empty">暂无交易记录</div>';
    } else {
        for (var i = 0; i < _chatWallet.transactions.length; i++) {
            var txn = _chatWallet.transactions[i];
            var isOut = txn.type === 'transfer_out';
            var isRecharge = txn.type === 'recharge';
            var statusText = txn.status === 'pending' ? '待确认' : txn.status === 'accepted' ? '已完成' : '已退还';

            var amountClass = 'in';
            var amountPrefix = '+';
            if (isOut && txn.status !== 'refunded') { amountClass = 'out'; amountPrefix = '-'; }
            else if (isOut && txn.status === 'refunded') { amountClass = 'in'; amountPrefix = '+'; }
            else if (txn.type === 'transfer_in' && txn.status === 'refunded') { amountClass = 'muted'; amountPrefix = ''; }

            var iconSvg = '';
            if (isRecharge) {
                iconSvg = '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
            } else if (isOut) {
                iconSvg = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
            } else {
                iconSvg = '<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
            }

            var desc = isRecharge ? '账户充值' : (isOut ? '转账给 ' : '来自 ') + esc(txn.target);

            h += '<div class="chat-wallet-bill-item">';
            h += '<div class="chat-wallet-bill-icon ' + (isOut && txn.status !== 'refunded' ? 'out' : 'in') + '">' + iconSvg + '</div>';
            h += '<div class="chat-wallet-bill-info">';
            h += '<div class="chat-wallet-bill-desc">' + desc + '</div>';
            h += '<div class="chat-wallet-bill-meta">' + esc(txn.remark || '') + ' · ' + (txn.time || '') + '</div>';
            h += '</div>';
            h += '<div class="chat-wallet-bill-amount ' + amountClass + '">';
            h += amountPrefix + '¥' + txn.amount.toFixed(2);
            h += '<div class="chat-wallet-bill-status ' + txn.status + '">' + statusText + '</div>';
            h += '</div>';
            h += '</div>';
        }
    }
    h += '</div>';
    h += '</div></div>';
    return h;
}

function closeWalletPage() {
    var el = document.getElementById('chatWalletOverlay'); if (el) el.remove();
}

function walletRecharge() {
    var amount = prompt('请输入充值金额：', '1000');
    if (!amount) return;
    var val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { showToast('无效金额'); return; }
    _chatWallet.balance += val;
    _chatWallet.transactions.unshift({
        id: 'rc' + Date.now(), type: 'recharge', amount: val,
        remark: '账户充值', target: '系统',
        time: new Date().toLocaleString(), status: 'accepted'
    });
    saveWallet();
    closeWalletPage(); openWalletPage();
    showToast('充值成功 ¥' + val.toFixed(2));
}

/* ================================================================
   注入相机 & 相册按钮到工具栏
   ================================================================ */
function injectImageButtons() {
    var bar = document.querySelector('.conv-input-bar');
    if (!bar) return;
    if (bar.getAttribute('data-img-injected')) return;
    bar.setAttribute('data-img-injected', '1');

    var toolbar = bar.querySelector('.conv-toolbar');
    if (!toolbar) {
        toolbar = bar;
    }

    var sendBtn = bar.querySelector('.conv-send-btn') || bar.querySelector('[onclick*="sendChat"]');

    var btnCam = document.createElement('div');
    btnCam.className = 'conv-tool-btn';
    btnCam.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#d4a0b0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    btnCam.title = '拍照';
    btnCam.style.cssText = 'cursor:pointer;padding:6px;display:flex;align-items:center;';
    btnCam.onclick = function () { chatPickCamera(); };

    var btnAlbum = document.createElement('div');
    btnAlbum.className = 'conv-tool-btn';
    btnAlbum.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#d4a0b0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    btnAlbum.title = '相册';
    btnAlbum.style.cssText = 'cursor:pointer;padding:6px;display:flex;align-items:center;';
    btnAlbum.onclick = function () { chatPickAlbum(); };

    var inputEl = bar.querySelector('input') || bar.querySelector('textarea');
    if (inputEl) {
        inputEl.parentNode.insertBefore(btnCam, inputEl);
        inputEl.parentNode.insertBefore(btnAlbum, inputEl);
    } else {
        bar.insertBefore(btnCam, bar.firstChild);
        bar.insertBefore(btnAlbum, btnCam.nextSibling);
    }
}


