/* ============================================
   theater.js — 线下剧场 Offline Theater
   Galgame 风格 · 视觉小说演出模式
   ============================================ */

/* ===== 状态 ===== */
var _theaterView = 'list';       // list | char-detail | stage
var _theaterRole = null;         // 当前选中的角色
var _theaterBg = '';             // 背景图URL
var _theaterHistory = [];        // 对话历史 [{from, text}]
var _theaterSegments = [];       // AI生成的段落列表
var _theaterSegIdx = 0;          // 当前段落索引
var _theaterPhase = 'input';     // input | generating | reading | waiting
var _theaterInputText = '';
var _theaterPersona = null;      // 用户人设

/* 持久化背景 */
try {
    _theaterBg = localStorage.getItem('_theaterBg') || '';
} catch (e) { }

/* ===== 打开 / 关闭 ===== */
function openTheaterApp() {
    var el = document.getElementById('theaterOverlay');
    if (!el) return;
    if (typeof loadChatRoles === 'function') loadChatRoles();
    _theaterView = 'list';
    _theaterRole = null;
    el.classList.add('show');
    _theaterRenderList();
}

function closeTheaterApp() {
    var el = document.getElementById('theaterOverlay');
    if (el) el.classList.remove('show');
    _theaterRole = null;
    _theaterSegments = [];
}

/* ===== 角色列表页 ===== */
function _theaterRenderList() {
    var el = document.getElementById('theaterOverlay');
    if (!el) return;

    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];

    var h = '';
    /* 头部 */
    h += '<div class="thtr-header">';
    h += '<div class="thtr-header-back" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-header-title">OFFLINE THEATER</div>';
    h += '<div class="thtr-header-actions">';
    h += '<div class="thtr-bg-btn" onclick="_theaterPickBg()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '</div></div>';

    /* 欢迎区 */
    h += '<div class="thtr-welcome">';
    h += '<div class="thtr-welcome-title">线下剧场</div>';
    h += '<div class="thtr-welcome-sub">选择角色，开启沉浸式线下演出</div>';
    h += '</div>';

    /* 人设选择 */
    if (personas.length > 0) {
        h += '<div class="thtr-persona-sec">';
        h += '<div class="thtr-sec-label">我的人设 Your Persona</div>';
        h += '<div class="thtr-persona-row">';
        for (var pi = 0; pi < personas.length; pi++) {
            var p = personas[pi];
            var isA = (_theaterPersona && _theaterPersona.id === p.id);
            h += '<div class="thtr-persona-chip' + (isA ? ' active' : '') + '" onclick="_theaterPickPersona(\'' + _thEsc(p.id || '') + '\')">';
            h += '<div class="thtr-persona-chip-av">';
            if (p.avatar) h += '<img src="' + _thEsc(p.avatar) + '">';
            else h += '👤';
            h += '</div>';
            h += '<span>' + _thEsc(p.name || '未命名') + '</span>';
            h += '</div>';
        }
        h += '</div></div>';
    }

    /* 角色网格 */
    h += '<div class="thtr-grid">';
    if (roles.length === 0) {
        h += '<div class="thtr-empty">暂无角色，请先在聊天App中创建</div>';
    }
    for (var i = 0; i < roles.length; i++) {
        var r = roles[i];
        h += '<div class="thtr-card" onclick="_theaterSelectRole(\'' + _thEsc(r.id || '') + '\')">';
        h += '<div class="thtr-card-av">';
        if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="thtr-card-name">' + _thEsc(r.name || '未命名') + '</div>';
        h += '</div>';
    }
    h += '</div>';

    el.innerHTML = h;
}

/* ===== 角色详情页 (P1风格) ===== */
function _theaterSelectRole(roleId) {
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    _theaterRole = null;
    for (var i = 0; i < roles.length; i++) {
        if (roles[i].id === roleId) { _theaterRole = roles[i]; break; }
    }
    if (!_theaterRole) return;

    _theaterView = 'char-detail';
    _theaterHistory = [];
    _theaterSegments = [];
    _theaterSegIdx = 0;
    _theaterPhase = 'input';
    _theaterRenderDetail();
}

function _theaterRenderDetail() {
    var el = document.getElementById('theaterOverlay');
    if (!el || !_theaterRole) return;
    var r = _theaterRole;

    var h = '';
    h += '<div class="thtr-detail">';

    /* 毛玻璃卡片 */
    h += '<div class="thtr-detail-card">';
    /* 左上角标签 + 右上角按钮 */
    h += '<div class="thtr-detail-top">';
    h += '<div class="thtr-detail-tag">OFFLINE</div>';
    h += '<div class="thtr-detail-btns">';
    h += '<div class="thtr-detail-btn" onclick="_theaterPickBg()">⬇</div>';
    h += '<div class="thtr-detail-btn" onclick="_theaterView=\'list\';_theaterRenderList()">↩</div>';
    h += '<div class="thtr-detail-btn" onclick="closeTheaterApp()">✕</div>';
    h += '</div></div>';

    /* WELCOME 文字 */
    h += '<div class="thtr-detail-welcome">';
    h += '<div class="thtr-detail-welcome-big">WELCOME，' + _thEsc(r.name || '').toUpperCase() + '</div>';
    if (r.detail) {
        var shortDetail = (r.detail || '').substring(0, 60);
        h += '<div class="thtr-detail-welcome-sub">' + _thEsc(shortDetail) + '</div>';
    }
    h += '</div>';

    /* 大头像 */
    h += '<div class="thtr-detail-avatar">';
    if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div>';
    h += '<div class="thtr-detail-name">' + _thEsc(r.name || '未命名') + '</div>';

    h += '</div>'; /* /card */

    /* 开始按钮 */
    h += '<div class="thtr-start-btn" onclick="_theaterEnterStage()">🎭 开始演出</div>';

    h += '</div>'; /* /detail */

    el.innerHTML = h;
}

/* ===== 进入舞台 ===== */
function _theaterEnterStage() {
    _theaterView = 'stage';
    _theaterPhase = 'input';
    _theaterHistory = [];
    _theaterSegments = [];
    _theaterSegIdx = 0;
    _theaterRenderStage();
}

/* ===== 舞台页 (Galgame风格) ===== */
function _theaterRenderStage() {
    var el = document.getElementById('theaterOverlay');
    if (!el || !_theaterRole) return;
    var r = _theaterRole;

    var bgStyle = '';
    if (_theaterBg) {
        bgStyle = 'background-image:url(' + _theaterBg + ');background-size:cover;background-position:center;';
    } else {
        bgStyle = 'background:linear-gradient(180deg,#f0ece8 0%,#ddd8d2 100%);';
    }

    var h = '';
    h += '<div class="thtr-stage" style="' + bgStyle + '">';

    /* 角色立绘区 */
    h += '<div class="thtr-stage-chara">';
    if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
    h += '</div>';

    /* 顶栏 */
    h += '<div class="thtr-stage-topbar">';
    h += '<div class="thtr-stage-topbar-name">' + _thEsc(r.name) + '</div>';
    h += '<div class="thtr-stage-topbar-btns">';
    h += '<div class="thtr-stage-tbtn" onclick="_theaterPickBg()">🖼</div>';
    h += '<div class="thtr-stage-tbtn" onclick="_theaterBackToDetail()">↩</div>';
    h += '<div class="thtr-stage-tbtn" onclick="closeTheaterApp()">✕</div>';
    h += '</div></div>';

    /* 对话框区 — Galgame 风格 */
    h += '<div class="thtr-stage-dialog-area">';

    if (_theaterPhase === 'generating') {
        /* 生成中 */
        h += '<div class="thtr-dialog-box">';
        h += '<div class="thtr-dialog-speaker">【' + _thEsc(r.name) + '】</div>';
        h += '<div class="thtr-dialog-text"><span class="thtr-typing">正在思考中</span></div>';
        h += '</div>';
    } else if (_theaterPhase === 'reading' && _theaterSegments.length > 0) {
        /* 正在阅读段落 */
        var seg = _theaterSegments[_theaterSegIdx] || '';
        h += '<div class="thtr-dialog-box">';
        h += '<div class="thtr-dialog-speaker">【' + _thEsc(r.name) + '】</div>';
        h += '<div class="thtr-dialog-text">' + _thFormatText(seg) + '</div>';

        /* 底部控制 */
        h += '<div class="thtr-dialog-nav">';
        if (_theaterSegIdx < _theaterSegments.length - 1) {
            h += '<div class="thtr-dialog-next" onclick="_theaterNextSeg()">▶ 点击继续</div>';
        } else {
            h += '<div class="thtr-dialog-next done" onclick="_theaterFinishRead()">✦ 这段结束了，请输入下一句</div>';
        }
        h += '</div>';
        h += '</div>';
    } else if (_theaterPhase === 'waiting') {
        /* 等待用户输入下一句 */
        h += '<div class="thtr-dialog-box">';
        h += '<div class="thtr-dialog-speaker">【系统】</div>';
        h += '<div class="thtr-dialog-text">这段演出已结束，请输入你的下一句台词或动作 ✍️</div>';
        h += '</div>';
    }

    h += '</div>'; /* /dialog-area */

    /* 底部控制栏 */
    h += '<div class="thtr-stage-bottom">';

    /* 历史回顾按钮 */
    if (_theaterHistory.length > 0) {
        h += '<div class="thtr-history-toggle" onclick="_theaterShowHistory()">SAVE | LOAD | LOG</div>';
    }

    /* 输入栏 */
    h += '<div class="thtr-stage-input-bar">';
    h += '<input type="text" class="thtr-stage-input" id="theaterInput" placeholder="输入你的台词或动作..." value="' + _thEsc(_theaterInputText) + '" ' + (_theaterPhase === 'generating' ? 'disabled' : '') + ' onkeydown="if(event.key===\'Enter\')_theaterSend()">';
    h += '<div class="thtr-stage-send" onclick="_theaterSend()">发送</div>';
    h += '<div class="thtr-stage-gen" onclick="_theaterGenerate()">续写</div>';
    h += '</div>';

    h += '</div>'; /* /bottom */

    h += '</div>'; /* /stage */

    el.innerHTML = h;

    // 自动聚焦
    if (_theaterPhase !== 'generating') {
        var inp = document.getElementById('theaterInput');
        if (inp) setTimeout(function () { inp.focus(); }, 100);
    }
}

/* ===== 操作 ===== */
function _theaterSend() {
    var inp = document.getElementById('theaterInput');
    var txt = inp ? inp.value.trim() : '';
    if (!txt) return;
    _theaterInputText = '';
    _theaterHistory.push({ from: 'user', text: txt });
    _theaterPhase = 'input';
    _theaterRenderStage();
    if (typeof showToast === 'function') showToast('已发送，点击"续写"让角色回应');
}

function _theaterGenerate() {
    if (_theaterPhase === 'generating') return;

    // 需要有至少一条用户消息
    var lastUserMsg = '';
    for (var i = _theaterHistory.length - 1; i >= 0; i--) {
        if (_theaterHistory[i].from === 'user') { lastUserMsg = _theaterHistory[i].text; break; }
    }
    if (!lastUserMsg) {
        if (typeof showToast === 'function') showToast('请先输入你的台词');
        return;
    }

    _theaterPhase = 'generating';
    _theaterSegments = [];
    _theaterSegIdx = 0;
    _theaterRenderStage();

    _theaterCallAI();
}

/* ===== AI 调用 ===== */
function _theaterCallAI() {
    var r = _theaterRole;
    if (!r) return;

    var api = _theaterGetApi();
    if (!api.url || !api.key) {
        if (typeof showToast === 'function') showToast('请先在API设置中配置接口');
        _theaterPhase = 'input';
        _theaterRenderStage();
        return;
    }

    /* 构建 system prompt */
    var sysPrompt = '你是一个线下剧场的角色扮演者。你正在进行一场沉浸式的线下面对面互动演出。\n\n';
    sysPrompt += '你扮演的角色：\n';
    sysPrompt += '名字：' + (r.name || '未知') + '\n';
    if (r.detail) sysPrompt += '角色设定：' + r.detail.substring(0, 1500) + '\n';
    sysPrompt += '\n';

    if (_theaterPersona) {
        sysPrompt += '对方（用户）的人设：\n';
        sysPrompt += '名字：' + (_theaterPersona.name || '对方') + '\n';
        if (_theaterPersona.detail) sysPrompt += '设定：' + _theaterPersona.detail.substring(0, 500) + '\n';
        sysPrompt += '\n';
    }

    sysPrompt += '要求：\n';
    sysPrompt += '1. 这是线下面对面的场景，请以第三人称视角详细描写角色的动作、表情、语气、心理活动和对话\n';
    sysPrompt += '2. 请写出丰富的动作描写（例如：微微侧过头、手指不自觉地搅动衣角、嘴角上扬了一个极细微的弧度）\n';
    sysPrompt += '3. 请写出详细的表情描写（例如：眉眼间流露出一丝不易察觉的温柔、瞳孔微微放大）\n';
    sysPrompt += '4. 对话用「」包裹，动作和心理用普通文字\n';
    sysPrompt += '5. 字数要求：不少于1000字，请写得尽量详细、细腻、富有画面感\n';
    sysPrompt += '6. 风格：文学性强，像一部视觉小说/galgame的剧本，充满氛围感\n';
    sysPrompt += '7. 不要写用户（对方）的动作和对话，只写你扮演的角色的内容\n';

    /* 构建消息历史 */
    var msgs = [{ role: 'system', content: sysPrompt }];
    for (var i = 0; i < _theaterHistory.length; i++) {
        var hm = _theaterHistory[i];
        if (hm.from === 'user') {
            msgs.push({ role: 'user', content: '（对方的动作/台词）' + hm.text });
        } else {
            msgs.push({ role: 'assistant', content: hm.text });
        }
    }

    var apiUrl = api.url.replace(/\/+$/, '');
    if (apiUrl.indexOf('/chat/completions') < 0) {
        if (apiUrl.indexOf('/v1') >= 0) apiUrl += '/chat/completions';
        else apiUrl += '/v1/chat/completions';
    }

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + api.key
        },
        body: JSON.stringify({
            model: api.model,
            messages: msgs,
            temperature: 0.85,
            max_tokens: 4000
        })
    }).then(function (resp) { return resp.json(); })
        .then(function (data) {
            if (!_theaterRole) return;
            var text = '';
            try { text = data.choices[0].message.content.trim(); } catch (e) { }
            if (!text) {
                if (typeof showToast === 'function') showToast('生成失败，请重试');
                _theaterPhase = 'input';
                _theaterRenderStage();
                return;
            }

            /* 保存到历史 */
            _theaterHistory.push({ from: 'char', text: text });

            /* 分段 — 按段落分割（双换行、或每个「」对话为一段） */
            _theaterSegments = _theaterSplitSegments(text);
            _theaterSegIdx = 0;
            _theaterPhase = 'reading';
            _theaterRenderStage();
        }).catch(function (err) {
            console.error('Theater AI error', err);
            if (typeof showToast === 'function') showToast('网络错误，请重试');
            _theaterPhase = 'input';
            _theaterRenderStage();
        });
}

/* 智能分段 */
function _theaterSplitSegments(text) {
    /* 先按双换行分 */
    var rawSegs = text.split(/\n\s*\n/);
    var segs = [];
    for (var i = 0; i < rawSegs.length; i++) {
        var s = rawSegs[i].trim();
        if (!s) continue;
        /* 如果单段太长（>200字），再按句号/感叹号/问号分割 */
        if (s.length > 200) {
            var subSegs = s.split(/(?<=[。！？…」])\s*/);
            var buf = '';
            for (var j = 0; j < subSegs.length; j++) {
                buf += subSegs[j];
                if (buf.length >= 80) {
                    segs.push(buf.trim());
                    buf = '';
                }
            }
            if (buf.trim()) segs.push(buf.trim());
        } else {
            segs.push(s);
        }
    }
    if (segs.length === 0 && text.trim()) segs.push(text.trim());
    return segs;
}

/* 下一段 */
function _theaterNextSeg() {
    if (_theaterSegIdx < _theaterSegments.length - 1) {
        _theaterSegIdx++;
        _theaterRenderStage();
    }
}

/* 本轮读完 */
function _theaterFinishRead() {
    _theaterPhase = 'waiting';
    _theaterRenderStage();
}

/* 返回详情页 */
function _theaterBackToDetail() {
    _theaterView = 'char-detail';
    _theaterRenderDetail();
}

/* 选择人设 */
function _theaterPickPersona(pid) {
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    _theaterPersona = null;
    for (var i = 0; i < personas.length; i++) {
        if (personas[i].id === pid) { _theaterPersona = personas[i]; break; }
    }
    _theaterRenderList();
}

/* 选择背景图 */
function _theaterPickBg() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            _theaterBg = e.target.result;
            try { localStorage.setItem('_theaterBg', _theaterBg); } catch (ex) { }
            if (_theaterView === 'stage') _theaterRenderStage();
            else if (_theaterView === 'list') _theaterRenderList();
            else _theaterRenderDetail();
            if (typeof showToast === 'function') showToast('背景已更新');
        };
        reader.readAsDataURL(inp.files[0]);
    };
    inp.click();
}

/* 查看历史 */
function _theaterShowHistory() {
    var el = document.getElementById('theaterOverlay');
    if (!el) return;

    var h = '<div class="thtr-history-overlay">';
    h += '<div class="thtr-history-header">';
    h += '<div class="thtr-history-title">📜 演出记录 LOG</div>';
    h += '<div class="thtr-history-close" onclick="_theaterCloseHistory()">✕</div>';
    h += '</div>';
    h += '<div class="thtr-history-list">';
    for (var i = 0; i < _theaterHistory.length; i++) {
        var hm = _theaterHistory[i];
        var isUser = hm.from === 'user';
        h += '<div class="thtr-history-item ' + (isUser ? 'user' : 'char') + '">';
        h += '<div class="thtr-history-speaker">' + (isUser ? '你' : _thEsc(_theaterRole ? _theaterRole.name : '角色')) + '</div>';
        h += '<div class="thtr-history-text">' + _thEsc(hm.text).substring(0, 300) + (hm.text.length > 300 ? '...' : '') + '</div>';
        h += '</div>';
    }
    if (_theaterHistory.length === 0) {
        h += '<div class="thtr-history-empty">暂无记录</div>';
    }
    h += '</div></div>';

    /* 在舞台上叠加历史面板 */
    var histDiv = document.createElement('div');
    histDiv.id = 'theaterHistoryPanel';
    histDiv.innerHTML = h;
    histDiv.style.cssText = 'position:absolute;inset:0;z-index:100;';
    el.appendChild(histDiv);
}

function _theaterCloseHistory() {
    var panel = document.getElementById('theaterHistoryPanel');
    if (panel) panel.remove();
}

/* ===== 工具函数 ===== */
function _thEsc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _thFormatText(text) {
    /* 「」对话高亮、*动作*斜体 */
    var s = _thEsc(text);
    s = s.replace(/「([^」]*)」/g, '<span class="thtr-dialog-quote">「$1」</span>');
    s = s.replace(/\*([^*]+)\*/g, '<em class="thtr-dialog-action">$1</em>');
    return s;
}

function _theaterGetApi() {
    var url = '', key = '', model = '';
    try {
        var elUrl = document.getElementById('apiUrl');
        var elKey = document.getElementById('apiKey');
        var elModel = document.getElementById('apiModel');
        if (elUrl) url = elUrl.value.trim();
        if (elKey) key = elKey.value.trim();
        if (elModel) model = elModel.value.trim();
    } catch (e) { }
    if (!url) try { url = localStorage.getItem('apiUrl') || ''; } catch (e) { }
    if (!key) try { key = localStorage.getItem('apiKey') || ''; } catch (e) { }
    if (!model) try { model = localStorage.getItem('apiModel') || 'gpt-3.5-turbo'; } catch (e) { }
    return { url: url, key: key, model: model };
}
