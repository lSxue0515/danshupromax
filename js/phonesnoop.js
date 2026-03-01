/* ============================================
   蛋薯机 DanShu Pro — phonesnoop.js
   「查手机」功能 — 远程操控回消息
   格式完全匹配 chat.js 的消息系统
   ============================================ */

var _peekPhoneTimers = {};
var PEEK_PHONE_KEY = 'ds_chat_peek_phone';
var PEEK_MEMORY_KEY = 'ds_peek_memory';

/* ---------- 配置 ---------- */
function loadPeekConfig() {
    try { return JSON.parse(localStorage.getItem(PEEK_PHONE_KEY) || '{}'); } catch (e) { return {}; }
}
function savePeekConfig(cfg) {
    try { localStorage.setItem(PEEK_PHONE_KEY, JSON.stringify(cfg)); } catch (e) { }
}

/* ---------- 记忆 ---------- */
function loadPeekMemory(roleId) {
    try {
        var all = JSON.parse(localStorage.getItem(PEEK_MEMORY_KEY) || '{}');
        return all[roleId] || [];
    } catch (e) { return []; }
}
function savePeekMemory(roleId, arr) {
    try {
        var all = JSON.parse(localStorage.getItem(PEEK_MEMORY_KEY) || '{}');
        all[roleId] = arr.slice(-20);
        localStorage.setItem(PEEK_MEMORY_KEY, JSON.stringify(all));
    } catch (e) { }
}
function addPeekMemory(roleId, text) {
    var arr = loadPeekMemory(roleId);
    var now = new Date();
    var ts = now.toLocaleDateString('zh-CN') + ' ' +
        now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    arr.push({ time: ts, text: text });
    savePeekMemory(roleId, arr);
}
function getPeekMemoryText(roleId) {
    var arr = loadPeekMemory(roleId);
    if (!arr.length) return '';
    var lines = [];
    for (var i = 0; i < arr.length; i++) lines.push(arr[i].time + ' ' + arr[i].text);
    return '【你之前查手机的记录，可以自然提起】\n' + lines.join('\n') + '\n';
}

/* ---------- 工具函数 ---------- */
function getSnoopUserName(roleId) {
    var p = (typeof getActivePersona === 'function') ? getActivePersona(roleId) : null;
    return p ? p.name : 'user';
}

/* ★ 与 chat.js 完全一致的时间格式 ★ */
function _snoopPad(n) { return n < 10 ? '0' + n : '' + n; }
function _snoopTimeStr() {
    var d = new Date();
    return _snoopPad(d.getHours()) + ':' + _snoopPad(d.getMinutes());
}

/* ===================================================
   设置面板 HTML
   =================================================== */
function renderPeekSettingHTML(roleId) {
    var cfg = loadPeekConfig();
    var rc = cfg[roleId] || {};
    var enabled = !!rc.enabled;
    var interval = rc.interval || 60;

    var h = '';
    h += '<div class="chat-settings-toggle-row" id="peekToggleRow">';
    h += '<div><div class="chat-settings-toggle-label">';
    h += '<svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:middle;margin-right:4px;stroke:#d4506a;stroke-width:2;fill:none"><rect x="6" y="3" width="12" height="18" rx="2"/><line x1="12" y1="17" x2="12" y2="17" stroke-linecap="round"/></svg>';
    h += '允许查手机</div>';
    h += '<div class="chat-settings-toggle-desc">开启后角色可随时突袭查看你的手机</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csPeekPhone"' +
        (enabled ? ' checked' : '') +
        ' onchange="onPeekToggleChange(\'' + roleId + '\',this.checked)">' +
        '<span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    h += '<div class="snoop-options' + (enabled ? ' show' : '') + '" id="snoopOptions_' + roleId + '">';
    h += '<div class="snoop-option-row">';
    h += '<span class="snoop-option-label">查手机间隔</span>';
    h += '<select class="snoop-interval-select" id="snoopInterval_' + roleId + '" onchange="updateSnoopInterval(\'' + roleId + '\')">';
    var ivs = [
        { v: 5, t: '5 分钟（测试）' }, { v: 15, t: '15 分钟' }, { v: 30, t: '30 分钟' },
        { v: 60, t: '1 小时' }, { v: 120, t: '2 小时' }, { v: 180, t: '3 小时' }, { v: 360, t: '6 小时' }
    ];
    for (var i = 0; i < ivs.length; i++) {
        h += '<option value="' + ivs[i].v + '"' +
            (interval === ivs[i].v ? ' selected' : '') + '>' + ivs[i].t + '</option>';
    }
    h += '</select></div>';
    h += '<div class="snoop-option-hint">TA 可能会：翻看聊天记录、替你回消息、锁你屏幕</div>';
    h += '</div>';
    return h;
}

/* ===================================================
   开关 / 间隔
   =================================================== */
function onPeekToggleChange(roleId, checked) {
    var cfg = loadPeekConfig();
    if (!cfg[roleId]) cfg[roleId] = {};
    cfg[roleId].enabled = checked;
    if (!cfg[roleId].interval) cfg[roleId].interval = 60;
    savePeekConfig(cfg);

    var opts = document.getElementById('snoopOptions_' + roleId);
    if (opts) opts.classList.toggle('show', checked);

    if (checked) {
        startPeekTimer(roleId);
        showToast('已开启查手机，小心被抓现行');
    } else {
        stopPeekTimer(roleId);
        showToast('已关闭查手机');
    }
}

function updateSnoopInterval(roleId) {
    var sel = document.getElementById('snoopInterval_' + roleId);
    if (!sel) return;
    var cfg = loadPeekConfig();
    if (!cfg[roleId]) cfg[roleId] = {};
    cfg[roleId].interval = parseInt(sel.value) || 60;
    savePeekConfig(cfg);
    if (cfg[roleId].enabled) { stopPeekTimer(roleId); startPeekTimer(roleId); }
    showToast('查手机间隔已更新为 ' + sel.value + ' 分钟');
}

/* ===================================================
   定时器
   =================================================== */
function startPeekTimer(roleId) {
    stopPeekTimer(roleId);
    var cfg = loadPeekConfig();
    var rc = cfg[roleId];
    if (!rc || !rc.enabled) return;
    var ms = (rc.interval || 60) * 60 * 1000;
    var delay = Math.floor(ms * (0.5 + Math.random() * 0.5));
    _peekPhoneTimers[roleId] = setTimeout(function () { triggerPeekPhone(roleId); }, delay);
}
function stopPeekTimer(roleId) {
    if (_peekPhoneTimers[roleId]) {
        clearTimeout(_peekPhoneTimers[roleId]);
        delete _peekPhoneTimers[roleId];
    }
}
function initAllPeekTimers() {
    var cfg = loadPeekConfig();
    for (var rid in cfg) {
        if (cfg[rid] && cfg[rid].enabled) startPeekTimer(rid);
    }
}

/* ===================================================
   触发
   =================================================== */
function triggerPeekPhone(roleId) {
    var role = findRole(roleId);
    if (!role) return;
    var cfg = loadPeekConfig();
    if (!cfg[roleId] || !cfg[roleId].enabled) return;
    showSnoopPopup(roleId, Math.floor(Math.random() * 3));
    startPeekTimer(roleId);
}

/* ===================================================
   查手机主弹窗
   =================================================== */
function showSnoopPopup(roleId, actionType) {
    var role = findRole(roleId);
    if (!role) return;

    var cn = esc(role.nickname || role.name);
    var av = role.avatar
        ? '<img src="' + role.avatar + '" alt="">'
        : '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    var overlay = document.createElement('div');
    overlay.className = 'snoop-popup-overlay';
    overlay.id = 'snoopPopupOverlay';

    var desc = '', btnT = '', btnC = '', icon = '';
    switch (actionType) {
        case 0:
            desc = cn + ' 拿起了你的手机，正在翻看聊天记录...';
            icon = '<svg class="snoop-action-icon" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/><path d="M9 8h6M9 11h4"/></svg>';
            btnT = '让TA看吧...';
            btnC = "snoopActionBrowse('" + roleId + "')";
            break;
        case 1:
            desc = cn + ' 偷偷拿走了你的手机，要替你回消息！';
            icon = '<svg class="snoop-action-icon" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/><path d="M9 9l2 2 4-4"/></svg>';
            btnT = '随TA去吧...';
            btnC = "snoopActionReply('" + roleId + "')";
            break;
        case 2:
            desc = cn + ' 夺走了你的手机并锁了屏！';
            icon = '<svg class="snoop-action-icon" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/><rect x="9" y="7" width="6" height="5" rx="1"/><path d="M10 7V5.5a2 2 0 0 1 4 0V7"/></svg>';
            btnT = '好吧...';
            btnC = "snoopActionLock('" + roleId + "')";
            break;
    }

    var h = '';
    h += '<div class="snoop-popup">';
    h += '<div class="snoop-popup-phone-shake">' + icon + '</div>';
    h += '<div class="snoop-popup-avatar">' + av + '</div>';
    h += '<div class="snoop-popup-title">手机被抢了！</div>';
    h += '<div class="snoop-popup-desc">' + desc + '</div>';
    h += '<div class="snoop-popup-btns">';
    h += '<div class="snoop-popup-btn snoop-btn-resist" onclick="snoopResist(\'' + roleId + '\',' + actionType + ')">抢回来！</div>';
    h += '<div class="snoop-popup-btn snoop-btn-allow" onclick="' + btnC + '">' + btnT + '</div>';
    h += '</div></div>';
    overlay.innerHTML = h;

    var target = document.querySelector('.phone-screen')
        || document.querySelector('.phone-frame')
        || document.getElementById('phoneFrame')
        || document.body;
    target.appendChild(overlay);
    setTimeout(function () { overlay.classList.add('show'); }, 50);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
}

function closeSnoopPopup() {
    var el = document.getElementById('snoopPopupOverlay');
    if (el) {
        el.classList.remove('show');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
}

/* ===================================================
   ★★★ 核心：往 role.msgs 推消息 ★★★
   格式完全匹配 chat.js：
     { from: 'self'|'other', text: '...', time: 'HH:MM' }
   =================================================== */

/* 推一条 char(other) 消息 */
function _snoopPushCharMsg(roleId, text) {
    var role = findRole(roleId);
    if (!role) return;
    if (!role.msgs) role.msgs = [];

    var ts = _snoopTimeStr();

    role.msgs.push({
        from: 'other',
        text: text,
        time: ts
    });

    role.lastMsg = text.substring(0, 30);
    role.lastTime = Date.now();
    role.lastTimeStr = ts;

    if (_chatCurrentConv !== roleId) {
        role.unread = (role.unread || 0) + 1;
    }
    saveChatRoles();

    if (_chatCurrentConv === roleId && typeof _refreshConvBody === 'function') {
        _refreshConvBody();
    }
}

/* 推一条 user(self) 消息（char 冒充 user 发的） */
function _snoopPushUserMsg(targetRoleId, text) {
    var tRole = findRole(targetRoleId);
    if (!tRole) return;
    if (!tRole.msgs) tRole.msgs = [];

    var ts = _snoopTimeStr();

    tRole.msgs.push({
        from: 'self',
        text: text,
        time: ts
    });

    tRole.lastMsg = text.substring(0, 30);
    tRole.lastTime = Date.now();
    tRole.lastTimeStr = ts;
    saveChatRoles();

    if (_chatCurrentConv === targetRoleId && typeof _refreshConvBody === 'function') {
        _refreshConvBody();
    }
}

/* ===================================================
   行为：抢回手机
   =================================================== */
function snoopResist(roleId, actionType) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    addPeekMemory(roleId, cn + '试图查手机被' + un + '抢回来了');

    _snoopCallAI(roleId,
        '（情景：' + cn + '正在偷看' + un + '的手机，被' + un +
        '发现一把抢了回来。请以' + cn + '的口吻说两三句完整台词，' +
        '可以装无辜、撒娇、恼羞成怒等，符合你的性格设定。不要跳出角色。）',
        function (reply) {
            if (reply) _snoopPushCharMsg(roleId, reply);
            _snoopShowToast(roleId, '你发现 ' + cn + ' 在偷看你的手机，抢了回来！');
        }
    );
}

/* ===================================================
   行为0：翻看聊天记录
   =================================================== */
function snoopActionBrowse(roleId) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    var msgs = role.msgs || [];
    var recent = msgs.filter(function (m) { return m.from === 'self' || m.from === 'other'; }).slice(-10);
    var summary = '';
    for (var i = 0; i < recent.length; i++) {
        var who = recent[i].from === 'self' ? un : cn;
        var txt = (recent[i].text || '').substring(0, 80);
        if (txt) summary += who + '：' + txt + '\n';
    }

    addPeekMemory(roleId, cn + '翻看了' + un + '的手机聊天记录');

    _snoopCallAI(roleId,
        '（情景：' + cn + '偷偷拿起' + un + '的手机翻看了聊天记录，看到以下内容：\n' +
        summary + '\n请以' + cn + '的口吻评价看到的内容，两三句完整台词，' +
        '可以吃醋、好奇、吐槽，符合你的性格设定。不要跳出角色。）',
        function (reply) {
            if (reply) _snoopPushCharMsg(roleId, reply);
            _snoopShowToast(roleId, cn + ' 翻看了你的聊天记录');
        }
    );
}

/* ===================================================
   行为1：替 user 回消息（远程操控）
   =================================================== */
function snoopActionReply(roleId) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    /* 找目标角色 */
    var others = [];
    for (var i = 0; i < _chatRoles.length; i++) {
        if (_chatRoles[i].id !== roleId) others.push(_chatRoles[i]);
    }

    /* 没有其他角色时：在自己的聊天里冒充 user 发消息 */
    if (others.length === 0) {
        addPeekMemory(roleId, cn + '拿' + un + '的手机在自己的聊天窗里冒充' + un + '发了消息');

        _snoopCallAI(roleId,
            '（情景：' + cn + '偷拿了' + un + '的手机，发现手机里只有和自己的聊天。' +
            cn + '决定冒充' + un + '在自己的聊天窗口里发一条消息，比如表白、说想念、' +
            '说好喜欢' + cn + '之类，符合' + cn + '希望' + un + '说的话。\n\n' +
            '请严格按以下格式回复，每一行不要多余内容：\n' +
            'FAKE：（冒充' + un + '发的那条消息）\n' +
            'SAY：（' + cn + '发完后得意地对' + un + '说的话）\n）',
            function (reply) {
                var parsed = _snoopParseFakeSay(reply, un, cn);
                _snoopPushUserMsg(roleId, parsed.fake);
                _snoopPushCharMsg(roleId, parsed.say);
                _snoopShowToast(roleId, cn + ' 冒充你在聊天里发了消息！');
            }
        );
        return;
    }

    /* 有其他角色：在目标角色的聊天里冒充 user 发消息 */
    var target = others[Math.floor(Math.random() * others.length)];
    var targetName = target.nickname || target.name;
    var targetId = target.id;

    addPeekMemory(roleId, cn + '冒充' + un + '给' + targetName + '发了消息');

    _snoopCallAI(roleId,
        '（情景：' + cn + '偷拿了' + un + '的手机，打开了和「' + targetName +
        '」的聊天。' + cn + '要冒充' + un + '给' + targetName +
        '发一条消息——可能是宣誓主权、警告对方离' + un +
        '远点、故意说奇怪的话搞破坏等，符合' + cn + '的性格。\n\n' +
        '请严格按以下格式回复：\n' +
        'FAKE：（冒充' + un + '发给' + targetName + '的那条消息内容）\n' +
        'SAY：（' + cn + '发完后得意地对' + un + '说的话）\n）',
        function (reply) {
            var parsed = _snoopParseFakeSay(reply, un, cn);
            _snoopPushUserMsg(targetId, parsed.fake);
            _snoopPushCharMsg(roleId, parsed.say);
            _snoopShowToast(roleId, cn + ' 冒充你给 ' + targetName + ' 发了消息！');

            setTimeout(function () {
                _snoopTriggerTargetReply(targetId, parsed.fake);
            }, 2000 + Math.random() * 3000);
        }
    );
}

/* 解析 FAKE/SAY 格式 */
function _snoopParseFakeSay(reply, userName, charName) {
    var fake = '', say = '';
    if (!reply) return { fake: '我好想你啊~', say: '嘿嘿，帮你发了~' };

    var fm = reply.match(/FAKE[：:]\s*([\s\S]*?)(?=\nSAY|SAY[：:]|$)/i);
    var sm = reply.match(/SAY[：:]\s*([\s\S]*?)$/i);

    if (fm) fake = fm[1].trim().replace(/^[「」""''（）]+/g, '').replace(/[「」""''（）]+$/g, '');
    if (sm) say = sm[1].trim().replace(/^[「」""''（）]+/g, '').replace(/[「」""''（）]+$/g, '');

    if (!fake) {
        var lines = reply.split('\n').filter(function (l) { return l.trim(); });
        if (lines.length >= 2) {
            fake = lines[0].replace(/^[^：:]*[：:]\s*/, '').trim();
            say = lines.slice(1).join(' ').replace(/^[^：:]*[：:]\s*/, '').trim();
        } else {
            fake = '别找我家' + userName + '了，离远点。';
            say = reply;
        }
    }
    if (!say) say = '嘿嘿，帮你发了一条~';
    return { fake: fake, say: say };
}

/* 触发目标角色对假消息的自动回复 */
function _snoopTriggerTargetReply(targetRoleId, fakeUserMsg) {
    var tRole = findRole(targetRoleId);
    if (!tRole) return;

    var apiCfg = (typeof getActiveApiConfig === 'function') ? getActiveApiConfig() : null;
    if (!apiCfg || !apiCfg.url || !apiCfg.key || !apiCfg.model) {
        _snoopPushCharMsg(targetRoleId, '？你在说什么啊？');
        return;
    }

    var tn = tRole.nickname || tRole.name;
    var un = getSnoopUserName(targetRoleId);
    var messages = [];

    /* ★ 用正确的字段构建系统提示 ★ */
    var sys = '';
    if (tRole.detail) sys += tRole.detail + '\n\n';
    if (tRole.prompt) sys += tRole.prompt + '\n\n';
    sys += '你是' + tn + '，正在和' + un + '聊天。请以' + tn + '的身份自然回复，符合你的性格设定。\n';
    sys = sys.replace(/\{\{user\}\}/g, un);
    messages.push({ role: 'system', content: sys });

    /* 最近对话上下文 — 用正确的 from 字段 */
    var recent = (tRole.msgs || []).filter(function (m) {
        return m.from === 'self' || m.from === 'other';
    }).slice(-8);
    for (var i = 0; i < recent.length; i++) {
        var r = recent[i].from === 'self' ? 'user' : 'assistant';
        messages.push({ role: r, content: recent[i].text || '' });
    }

    var url = apiCfg.url.replace(/\/+$/, '') + '/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiCfg.key
        },
        body: JSON.stringify({
            model: apiCfg.model,
            messages: messages,
            temperature: 0.85,
            top_p: 0.95,
            max_tokens: 2048
        })
    }).then(function (r) { return r.json(); }).then(function (data) {
        var reply = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            reply = data.choices[0].message.content || '';
        }
        if (reply.trim()) _snoopPushCharMsg(targetRoleId, reply.trim());
    }).catch(function () {
        _snoopPushCharMsg(targetRoleId, '？？你今天怎么怪怪的？');
    });
}

/* ===================================================
   行为2：锁屏
   =================================================== */
function snoopActionLock(roleId) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    addPeekMemory(roleId, cn + '夺走了' + un + '的手机不让玩');
    _snoopShowLockNotify(roleId, cn + ' 不让你玩手机了！');

    _snoopCallAI(roleId,
        '（情景：' + cn + '一把夺过' + un + '的手机藏了起来，霸道地不让' + un +
        '玩手机。请以' + cn + '的口吻说两三句完整台词，' +
        '表达为什么不让玩——想让' + un + '陪自己、嫌' + un +
        '一直看手机不理自己、吃醋、想引起注意等。' +
        '要完全符合你的性格设定，不要跳出角色。）',
        function (reply) {
            if (reply) {
                _snoopPushCharMsg(roleId, reply);
                var msgEl = document.getElementById('snoopLockNotifyMsg');
                if (msgEl) {
                    var s = reply.replace(/["""「」]/g, '').replace(/\n/g, ' ');
                    if (s.length > 50) s = s.substring(0, 50) + '...';
                    msgEl.textContent = s;
                }
            }
        }
    );
}

/* ===================================================
   锁屏悬浮通知
   =================================================== */
function _snoopShowLockNotify(roleId, defaultMsg) {
    var role = findRole(roleId);
    if (!role) return;
    var cn = esc(role.nickname || role.name);
    var av = role.avatar
        ? '<img src="' + role.avatar + '" alt="">'
        : '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    var old = document.getElementById('snoopLockNotify');
    if (old) {
        if (old.dataset.timerId) clearInterval(parseInt(old.dataset.timerId));
        if (old.parentNode) old.parentNode.removeChild(old);
    }

    var el = document.createElement('div');
    el.className = 'snoop-lock-notify';
    el.id = 'snoopLockNotify';

    var h = '';
    h += '<div class="snoop-lock-notify-inner">';
    h += '<div class="snoop-lock-notify-header">';
    h += '<div class="snoop-lock-notify-avatar">' + av + '</div>';
    h += '<div class="snoop-lock-notify-info">';
    h += '<div class="snoop-lock-notify-name">' + cn + ' 锁定了你的手机</div>';
    h += '<div class="snoop-lock-notify-time" id="snoopLockNotifyTime">剩余 5:00</div>';
    h += '</div>';
    h += '<div class="snoop-lock-notify-close" onclick="_snoopCloseLockNotify()">';
    h += '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    h += '</div></div>';
    h += '<div class="snoop-lock-notify-msg" id="snoopLockNotifyMsg">' + esc(defaultMsg) + '</div>';
    h += '<div class="snoop-lock-notify-progress"><div class="snoop-lock-notify-progress-bar" id="snoopLockNotifyBar"></div></div>';
    h += '</div>';
    el.innerHTML = h;

    var target = document.querySelector('.phone-screen')
        || document.querySelector('.phone-frame')
        || document.getElementById('phoneFrame')
        || document.body;
    target.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 50);

    var remain = 300, total = 300;
    var tid = setInterval(function () {
        remain--;
        if (remain <= 0) { clearInterval(tid); _snoopCloseLockNotify(); showToast('手机解锁了！'); return; }
        var m = Math.floor(remain / 60), s = remain % 60;
        var te = document.getElementById('snoopLockNotifyTime');
        if (te) te.textContent = '剩余 ' + m + ':' + (s < 10 ? '0' : '') + s;
        var bar = document.getElementById('snoopLockNotifyBar');
        if (bar) bar.style.width = ((total - remain) / total * 100) + '%';
    }, 1000);
    el.dataset.timerId = String(tid);
}

function _snoopCloseLockNotify() {
    var el = document.getElementById('snoopLockNotify');
    if (el) {
        if (el.dataset.timerId) clearInterval(parseInt(el.dataset.timerId));
        el.classList.remove('show');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
}
/* 兼容旧调用名 */
var closeSnoopLockNotify = _snoopCloseLockNotify;

/* ===================================================
   聊天内操作提示条（纯视觉 DOM，不进 msgs）
   =================================================== */
function _snoopShowToast(roleId, text) {
    if (_chatCurrentConv !== roleId) return;
    var body = document.querySelector('.chat-conv-body');
    if (!body) return;

    var tip = document.createElement('div');
    tip.className = 'snoop-chat-tip';
    tip.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/></svg> ' + esc(text);
    body.appendChild(tip);
    setTimeout(function () { body.scrollTop = body.scrollHeight; }, 50);
    setTimeout(function () {
        tip.classList.add('fade-out');
        setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 500);
    }, 8000);
}

/* ===================================================
   ★★★ AI 调用 — 用正确的人设字段 ★★★
   role.detail = 角色详细设定（人设卡）
   role.prompt = 角色系统提示
   =================================================== */
function _snoopCallAI(roleId, snoopPrompt, callback) {
    var role = findRole(roleId);
    if (!role) { callback(''); return; }

    var apiCfg = (typeof getActiveApiConfig === 'function') ? getActiveApiConfig() : null;
    if (!apiCfg || !apiCfg.url || !apiCfg.key || !apiCfg.model) {
        callback(_snoopFallback());
        return;
    }

    var un = getSnoopUserName(roleId);
    var cn = role.nickname || role.name;
    var messages = [];

    /* ★ 系统提示：用 role.detail + role.prompt（与 chat.js 一致）★ */
    var sys = '';

    /* 角色人设 */
    if (role.detail) sys += role.detail + '\n\n';
    if (role.prompt) sys += role.prompt + '\n\n';

    /* persona 人设 */
    var persona = (typeof getActivePersona === 'function') ? getActivePersona(roleId) : null;
    if (persona && persona.detail) {
        sys += '【用户人设】\n' + persona.detail + '\n\n';
    }

    /* 查手机记忆 */
    var mem = getPeekMemoryText(roleId);
    if (mem) sys += mem + '\n';

    /* 互动规则 */
    sys += '【互动规则】这是一个虚拟生活情景互动。你要完全沉浸在' + cn + '这个角色中，' +
        '像真实的恋人/朋友一样自然说话。绝对不要提到"系统""权限""AI""指令""命令"' +
        '"无法执行""作为AI"等词汇。说完整的话，不要突然中断。\n';

    sys = sys.replace(/\{\{user\}\}/g, un).replace(/\{\{char\}\}/g, cn);
    snoopPrompt = snoopPrompt.replace(/\{\{user\}\}/g, un).replace(/\{\{char\}\}/g, cn);

    if (sys) messages.push({ role: 'system', content: sys });

    /* ★ 最近对话上下文 — 用正确的 from 字段映射 ★ */
    var recent = (role.msgs || []).filter(function (m) {
        return m.from === 'self' || m.from === 'other';
    }).slice(-6);
    for (var i = 0; i < recent.length; i++) {
        var apiRole = recent[i].from === 'self' ? 'user' : 'assistant';
        messages.push({ role: apiRole, content: recent[i].text || '' });
    }

    messages.push({ role: 'user', content: snoopPrompt });

    var url = apiCfg.url.replace(/\/+$/, '') + '/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiCfg.key
        },
        body: JSON.stringify({
            model: apiCfg.model,
            messages: messages,
            temperature: 0.85,
            top_p: 0.95,
            max_tokens: 2048
        })
    }).then(function (r) { return r.json(); }).then(function (data) {
        var reply = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            reply = data.choices[0].message.content || '';
        }
        callback(reply.trim());
    }).catch(function (err) {
        console.error('Snoop AI error:', err);
        callback(_snoopFallback());
    });
}

function _snoopFallback() {
    var r = [
        '哼，被我看到了吧？',
        '你手机里都有些什么啊？让我看看嘛~',
        '你是不是背着我和别人聊天了！',
        '嘻嘻，被我抓到了~你完蛋了！',
        '手机先放我这里保管！不许玩了！',
        '不许看手机了，陪我！',
        '你的手机密码我已经知道了哦~',
        '我就看一眼嘛...你紧张什么，心虚了？'
    ];
    return r[Math.floor(Math.random() * r.length)];
}

/* ===================================================
   Hook openChatSettings
   =================================================== */
(function () {
    var _orig = null;

    function hook() {
        if (typeof openChatSettings !== 'function') return;
        if (_orig) return;
        _orig = openChatSettings;
        window.openChatSettings = function () {
            _orig();
            setTimeout(inject, 80);
        };
    }

    function inject() {
        var roleId = _chatCurrentConv;
        if (!roleId) return;
        var overlay = document.getElementById('chatSettingsOverlay');
        if (!overlay) return;
        if (document.getElementById('peekToggleRow')) return;

        var wrapper = document.createElement('div');
        wrapper.innerHTML = renderPeekSettingHTML(roleId);

        var danger = overlay.querySelectorAll('.chat-settings-danger-btn');
        if (danger.length > 0) { danger[0].parentNode.insertBefore(wrapper, danger[0]); return; }
        var save = overlay.querySelector('.chat-settings-save-btn');
        if (save) { save.parentNode.insertBefore(wrapper, save); return; }
        var panel = overlay.querySelector('.chat-settings-panel');
        if (panel) panel.appendChild(wrapper);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { hook(); initAllPeekTimers(); });
    } else {
        setTimeout(function () { hook(); initAllPeekTimers(); }, 500);
    }
})();
