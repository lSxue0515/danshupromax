/* ============================================
   theater.js — 线下剧场 Offline Theater
   橙光/Galgame 式演出 + 自定义CSS设置
   ============================================ */

var _thView = 'list';
var _thRole = null;
var _thBg = '';
var _thHistory = [];
var _thSegments = [];
var _thSegIdx = 0;
var _thPhase = 'input';
var _thInputText = '';
var _thPersona = null;
var _thCustomCSS = '';
var _thStyleEl = null;

try { _thBg = localStorage.getItem('_thBg') || ''; } catch (e) { }
try { _thCustomCSS = localStorage.getItem('_thCustomCSS') || ''; } catch (e) { }

/* 初始化时注入自定义CSS */
function _thInitCustomCSS() {
    if (_thStyleEl) return;
    _thStyleEl = document.createElement('style');
    _thStyleEl.id = 'thtrCustomStyle';
    document.head.appendChild(_thStyleEl);
    _thApplyCSS();
}
function _thApplyCSS() {
    if (!_thStyleEl) _thInitCustomCSS();
    _thStyleEl.textContent = _thCustomCSS;
}

function openTheaterApp() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    if (typeof loadChatRoles === 'function') loadChatRoles();
    _thView = 'list'; _thRole = null;
    el.classList.add('show');
    _thInitCustomCSS();
    _thRenderList();
}
function closeTheaterApp() {
    var el = document.getElementById('theaterOverlay');
    if (el) el.classList.remove('show');
    _thRole = null; _thSegments = [];
}

function _thGetApi() {
    var url = '', key = '', model = '';
    try {
        url = localStorage.getItem('apiUrl') || '';
        key = localStorage.getItem('apiKey') || '';
        model = localStorage.getItem('selectedModel') || '';
    } catch (e) { }
    if (!url) try { var el = document.getElementById('apiUrl'); if (el) url = el.value.trim(); } catch (e) { }
    if (!key) try { var el = document.getElementById('apiKey'); if (el) key = el.value.trim(); } catch (e) { }
    if (!model) try { var el = document.getElementById('apiModelSelect'); if (el) model = el.value.trim(); } catch (e) { }
    if (!url) try { url = localStorage.getItem('api_url') || localStorage.getItem('apiBaseUrl') || ''; } catch (e) { }
    if (!key) try { key = localStorage.getItem('api_key') || localStorage.getItem('apiSecretKey') || ''; } catch (e) { }
    if (!model) try { model = localStorage.getItem('apiModel') || localStorage.getItem('model') || ''; } catch (e) { }
    if (!model) model = 'gpt-3.5-turbo';
    return { url: url.trim(), key: key.trim(), model: model.trim() };
}

function _thBuildEndpoint(baseUrl) {
    var u = baseUrl.replace(/\/+$/, '');
    if (u.indexOf('/chat/completions') >= 0) return u;
    if (u.indexOf('/v1') >= 0) return u + '/chat/completions';
    return u + '/v1/chat/completions';
}

function _thEsc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _thFmt(text) {
    var s = _thEsc(text);
    s = s.replace(/「([^」]*)」/g, '<span class="thtr-quote">「$1」</span>');
    s = s.replace(/\*([^*]+)\*/g, '<em class="thtr-action">$1</em>');
    return s;
}

/* ===== 角色列表 ===== */
function _thRenderList() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];

    var h = '';
    h += '<div class="thtr-header">';
    h += '<div class="thtr-hdr-btn" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-hdr-title">OFFLINE THEATER</div>';
    h += '<div class="thtr-hdr-btn" onclick="_thPickBg()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '</div>';

    h += '<div class="thtr-list-body">';
    h += '<div class="thtr-list-top">';
    h += '<div class="thtr-list-title">Offline Theater 线下剧场</div>';
    h += '<div class="thtr-list-sub">Choose a character 选择角色开始演出</div>';
    h += '</div>';

    h += '<div class="thtr-grid">';
    if (roles.length === 0) {
        h += '<div class="thtr-empty">No characters yet 暂无角色</div>';
    }
    for (var i = 0; i < roles.length; i++) {
        var r = roles[i];
        h += '<div class="thtr-card" onclick="_thSelectRole(\'' + _thEsc(r.id || '') + '\')">';
        h += '<div class="thtr-card-av">';
        if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="thtr-card-name">' + _thEsc(r.name || 'unnamed') + '</div>';
        h += '</div>';
    }
    h += '</div></div>';

    el.innerHTML = h;
}

/* ===== 角色详情 ===== */
function _thSelectRole(roleId) {
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    _thRole = null;
    for (var i = 0; i < roles.length; i++) {
        if (roles[i].id === roleId) { _thRole = roles[i]; break; }
    }
    if (!_thRole) return;
    _thView = 'detail';
    _thHistory = []; _thSegments = []; _thSegIdx = 0;
    _thPhase = 'input'; _thPersona = null;
    _thRenderDetail();
}

function _thRenderDetail() {
    var el = document.getElementById('theaterOverlay'); if (!el || !_thRole) return;
    var r = _thRole;
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];

    var h = '';
    h += '<div class="thtr-detail-page">';
    h += '<div class="thtr-detail-card">';
    h += '<div class="thtr-detail-top">';
    h += '<div class="thtr-dtag">OFFLINE</div>';
    h += '<div class="thtr-detail-actions">';
    h += '<div class="thtr-detail-act" onclick="_thPickBg()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '<div class="thtr-detail-act" onclick="_thView=\'list\';_thRenderList()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-detail-act" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div></div>';

    h += '<div class="thtr-detail-welcome">';
    h += '<div class="thtr-detail-big">WELCOME, ' + _thEsc(r.name || '').toUpperCase() + '</div>';
    if (r.detail) h += '<div class="thtr-detail-desc">' + _thEsc((r.detail || '').substring(0, 80)) + '</div>';
    h += '</div>';

    h += '<div class="thtr-detail-avatar">';
    if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div>';
    h += '<div class="thtr-detail-name">' + _thEsc(r.name || 'unnamed') + '</div>';
    h += '</div>';

    if (personas.length > 0) {
        h += '<div class="thtr-persona-sec">';
        h += '<div class="thtr-persona-label">YOUR PERSONA 选择人设</div>';
        h += '<div class="thtr-persona-list">';
        for (var pi = 0; pi < personas.length; pi++) {
            var p = personas[pi];
            var isA = (_thPersona && _thPersona.id === p.id);
            h += '<div class="thtr-persona-item' + (isA ? ' active' : '') + '" onclick="_thPickPersona(\'' + _thEsc(p.id || '') + '\')">';
            h += '<div class="thtr-persona-av">';
            if (p.avatar) h += '<img src="' + _thEsc(p.avatar) + '">';
            else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            h += '</div>';
            h += '<span>' + _thEsc(p.name || 'unnamed') + '</span>';
            h += '</div>';
        }
        h += '</div></div>';
    }

    h += '<div class="thtr-start-btn" onclick="_thEnterStage()">START 开始演出</div>';
    h += '</div>';
    el.innerHTML = h;
}

function _thPickPersona(pid) {
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    _thPersona = null;
    for (var i = 0; i < personas.length; i++) {
        if (personas[i].id === pid) { _thPersona = personas[i]; break; }
    }
    _thRenderDetail();
}

/* ===== 舞台 ===== */
function _thEnterStage() {
    _thView = 'stage'; _thPhase = 'input';
    _thHistory = []; _thSegments = []; _thSegIdx = 0;
    _thRenderStage();
}

function _thRenderStage() {
    var el = document.getElementById('theaterOverlay'); if (!el || !_thRole) return;
    var r = _thRole;

    var bgCss = _thBg
        ? 'background-image:url(' + _thBg + ');background-size:cover;background-position:center;'
        : 'background:linear-gradient(180deg,#d5d7d6 0%,#c5c7c6 100%);';

    var h = '';
    h += '<div class="thtr-stage" style="' + bgCss + '">';

    /* 顶栏 */
    h += '<div class="thtr-stage-top">';
    h += '<div class="thtr-stage-name">' + _thEsc(r.name) + '</div>';
    h += '<div class="thtr-stage-btns">';
    /* 齿轮设置 */
    h += '<div class="thtr-stage-btn" onclick="_thOpenStyle()" title="Style Settings 样式设置"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>';
    /* 换背景 */
    h += '<div class="thtr-stage-btn" onclick="_thPickBg()" title="Background 背景"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '<div class="thtr-stage-btn" onclick="_thBackDetail()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-stage-btn" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div></div>';

    /* 对话区 */
    h += '<div class="thtr-stage-dialog">';

    if (_thPhase === 'generating') {
        h += '<div class="thtr-dlg-box thtr-output-box">';
        h += '<div class="thtr-dlg-speaker">' + _thEsc(r.name) + '</div>';
        h += '<div class="thtr-dlg-text"><span class="thtr-typing-anim">Thinking 思考中</span></div>';
        h += '</div>';

    } else if (_thPhase === 'reading' && _thSegments.length > 0) {
        var seg = _thSegments[_thSegIdx] || '';
        var isLast = (_thSegIdx >= _thSegments.length - 1);

        h += '<div class="thtr-dlg-box thtr-output-box clickable" onclick="_thTapDialog()">';
        h += '<div class="thtr-dlg-speaker">' + _thEsc(r.name) + '</div>';
        h += '<div class="thtr-dlg-text">' + _thFmt(seg) + '</div>';
        h += '<div class="thtr-dlg-hint">';
        if (!isLast) {
            h += '<span class="thtr-hint-arrow"></span>';
        } else {
            h += '<span class="thtr-hint-end">- Scene End 本段结束 -</span>';
        }
        h += '</div>';
        h += '</div>';

    } else if (_thPhase === 'waiting') {
        h += '<div class="thtr-dlg-box thtr-output-box">';
        h += '<div class="thtr-dlg-speaker">SYSTEM 系统</div>';
        h += '<div class="thtr-dlg-text">Scene complete. Enter your next line below.<br>本段演出结束，请在下方输入你的下一句台词。</div>';
        h += '</div>';

    } else {
        h += '<div class="thtr-dlg-box thtr-output-box idle">';
        h += '<div class="thtr-dlg-text idle-text">Enter your line below and tap WRITE to continue.<br>在下方输入台词，点击续写开始演出。</div>';
        h += '</div>';
    }

    h += '</div>';

    /* 底部输入 */
    h += '<div class="thtr-stage-bottom">';
    if (_thHistory.length > 0) {
        h += '<div class="thtr-log-toggle" onclick="_thShowLog()">LOG 记录</div>';
    }
    h += '<div class="thtr-stage-bar thtr-input-bar">';
    h += '<input type="text" class="thtr-stage-inp thtr-input-field" id="thtrInput" placeholder="Your line 你的台词..." value="' + _thEsc(_thInputText) + '" ' + (_thPhase === 'generating' ? 'disabled' : '') + ' onkeydown="if(event.key===\'Enter\')_thSend()">';
    h += '<div class="thtr-bar-btn" onclick="_thSend()">SEND 发送</div>';
    h += '<div class="thtr-bar-btn alt" onclick="_thGenerate()">WRITE 续写</div>';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    el.innerHTML = h;

    if (_thPhase !== 'generating') {
        var inp = document.getElementById('thtrInput');
        if (inp) setTimeout(function () { inp.focus(); }, 100);
    }
}

/* ===== 点击对话框翻页 ===== */
function _thTapDialog() {
    if (_thPhase !== 'reading') return;
    if (_thSegIdx < _thSegments.length - 1) {
        _thSegIdx++;
        _thRenderStage();
    } else {
        _thPhase = 'waiting';
        _thRenderStage();
    }
}

/* ===== 样式设置面板 ===== */
function _thOpenStyle() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;

    /* 防止重复打开 */
    if (document.getElementById('thtrStylePanel')) return;

    var cssVal = _thCustomCSS.replace(/"/g, '&quot;');

    var h = '<div class="thtr-style-overlay">';
    h += '<div class="thtr-style-card">';
    h += '<div class="thtr-style-header">';
    h += '<div class="thtr-style-title">STYLE SETTINGS 样式设置</div>';
    h += '<div class="thtr-style-close" onclick="_thCloseStyle()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';

    h += '<div class="thtr-style-body">';
    h += '<div class="thtr-style-label">Custom CSS 自定义样式</div>';
    h += '<div class="thtr-style-hint">Use these classes to customize 使用以下class自定义样式：</div>';
    h += '<div class="thtr-style-classes">';
    h += '<code>.thtr-output-box</code> — Output box 输出框<br>';
    h += '<code>.thtr-dlg-speaker</code> — Speaker name 说话人名<br>';
    h += '<code>.thtr-dlg-text</code> — Text content 文字内容<br>';
    h += '<code>.thtr-quote</code> — Dialog「」对话引用<br>';
    h += '<code>.thtr-action</code> — *Action* 动作描写<br>';
    h += '<code>.thtr-input-bar</code> — Input bar 输入栏<br>';
    h += '<code>.thtr-input-field</code> — Input field 输入框<br>';
    h += '<code>.thtr-bar-btn</code> — Buttons 按钮<br>';
    h += '</div>';

    h += '<textarea class="thtr-style-textarea" id="thtrCSSInput" placeholder="/* Example 示例 */\n.thtr-output-box {\n  background: rgba(0,0,0,.6);\n  border: 1px solid rgba(255,255,255,.1);\n}\n.thtr-dlg-text {\n  color: #eee;\n  font-size: 13px;\n}\n.thtr-input-bar {\n  background: rgba(0,0,0,.4);\n}\n.thtr-input-field {\n  color: #fff;\n}">' + _thEsc(_thCustomCSS) + '</textarea>';

    h += '<div class="thtr-style-btns">';
    h += '<div class="thtr-style-btn" onclick="_thPreviewCSS()">PREVIEW 预览</div>';
    h += '<div class="thtr-style-btn primary" onclick="_thSaveCSS()">SAVE 保存</div>';
    h += '<div class="thtr-style-btn danger" onclick="_thResetCSS()">RESET 重置</div>';
    h += '</div>';

    h += '</div></div></div>';

    var panel = document.createElement('div');
    panel.id = 'thtrStylePanel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:110;';
    panel.innerHTML = h;
    el.appendChild(panel);
}

function _thCloseStyle() {
    var p = document.getElementById('thtrStylePanel');
    if (p) p.remove();
}

function _thPreviewCSS() {
    var ta = document.getElementById('thtrCSSInput');
    if (!ta) return;
    _thCustomCSS = ta.value;
    _thApplyCSS();
    if (typeof showToast === 'function') showToast('Preview applied 预览已生效');
}

function _thSaveCSS() {
    var ta = document.getElementById('thtrCSSInput');
    if (!ta) return;
    _thCustomCSS = ta.value;
    _thApplyCSS();
    try { localStorage.setItem('_thCustomCSS', _thCustomCSS); } catch (e) { }
    if (typeof showToast === 'function') showToast('Saved 已保存');
    _thCloseStyle();
}

function _thResetCSS() {
    _thCustomCSS = '';
    _thApplyCSS();
    try { localStorage.setItem('_thCustomCSS', ''); } catch (e) { }
    var ta = document.getElementById('thtrCSSInput');
    if (ta) ta.value = '';
    if (typeof showToast === 'function') showToast('Reset 已重置');
}

/* ===== 操作 ===== */
function _thSend() {
    var inp = document.getElementById('thtrInput');
    var txt = inp ? inp.value.trim() : '';
    if (!txt) return;
    _thInputText = '';
    _thHistory.push({ from: 'user', text: txt });
    _thPhase = 'input';
    _thRenderStage();
    if (typeof showToast === 'function') showToast('Sent 已发送，点击 WRITE 续写 继续');
}

function _thGenerate() {
    if (_thPhase === 'generating') return;
    var lastUser = '';
    for (var i = _thHistory.length - 1; i >= 0; i--) {
        if (_thHistory[i].from === 'user') { lastUser = _thHistory[i].text; break; }
    }
    if (!lastUser) {
        if (typeof showToast === 'function') showToast('Enter your line first 请先输入台词');
        return;
    }
    _thPhase = 'generating'; _thSegments = []; _thSegIdx = 0;
    _thRenderStage();
    _thCallAI();
}

/* ===== AI ===== */
function _thCallAI() {
    var r = _thRole; if (!r) return;
    var api = _thGetApi();

    if (!api.url || !api.key) {
        if (typeof showToast === 'function') showToast('Please configure API first 请先配置API');
        _thPhase = 'input'; _thRenderStage();
        return;
    }

    var sys = '';
    sys += '你是「' + (r.name || '未知') + '」，正在和对方进行一场线下面对面的互动。\n';
    if (r.detail) sys += '你的设定：' + r.detail.substring(0, 2000) + '\n\n';

    if (_thPersona) {
        sys += '对方：' + (_thPersona.name || '对方') + '\n';
        if (_thPersona.detail) sys += '对方设定：' + _thPersona.detail.substring(0, 500) + '\n\n';
    }

    sys += '【输出要求】\n';
    sys += '以白描手法写作，像小说正文一样自然叙事。\n';
    sys += '不要堆砌形容词，不要过度描写外貌和穿着，不要反复描写五官和瞳孔。\n';
    sys += '动作一笔带过，重点放在对话内容、语气、态度、互动节奏上。\n';
    sys += '对话用「」，叙述用白描，干净利落，像余华、东野圭吾、村上春树的笔法。\n';
    sys += '角色说话要有性格，不要客套废话，要有真实感和生活气息。\n';
    sys += '心理活动可以写但要克制，一两句点到为止，不要大段独白。\n';
    sys += '只写你扮演的角色，不写对方的动作和对话。\n';
    sys += '每段之间空一行，每段50-120字左右。\n';
    sys += '总字数不少于800字。\n';

    var msgs = [{ role: 'system', content: sys }];
    for (var i = 0; i < _thHistory.length; i++) {
        var hm = _thHistory[i];
        msgs.push({
            role: hm.from === 'user' ? 'user' : 'assistant',
            content: hm.from === 'user' ? '（对方）' + hm.text : hm.text
        });
    }

    var endpoint = _thBuildEndpoint(api.url);

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + api.key
        },
        body: JSON.stringify({
            model: api.model,
            messages: msgs,
            temperature: 0.78,
            max_tokens: 4096
        })
    })
        .then(function (resp) {
            if (!resp.ok) {
                return resp.text().then(function (t) { throw new Error('HTTP ' + resp.status + ': ' + t.substring(0, 200)); });
            }
            return resp.json();
        })
        .then(function (data) {
            if (!_thRole) return;
            var text = '';
            try { text = data.choices[0].message.content.trim(); } catch (e) { }
            if (!text) {
                if (typeof showToast === 'function') showToast('Empty response 生成为空，请重试');
                _thPhase = 'input'; _thRenderStage();
                return;
            }
            _thHistory.push({ from: 'char', text: text });
            _thSegments = _thSplitSegs(text);
            _thSegIdx = 0;
            _thPhase = 'reading';
            _thRenderStage();
        })
        .catch(function (err) {
            console.error('Theater AI error:', err);
            if (typeof showToast === 'function') showToast('Error 错误: ' + (err.message || 'network fail').substring(0, 80));
            _thPhase = 'input'; _thRenderStage();
        });
}

/* 智能分段 */
function _thSplitSegs(text) {
    var rawSegs = text.split(/\n\s*\n/);
    var segs = [];
    for (var i = 0; i < rawSegs.length; i++) {
        var s = rawSegs[i].trim();
        if (!s) continue;
        if (s.length <= 120) {
            segs.push(s);
        } else {
            var parts = s.split(/(?<=[。！？…」\n])/);
            var buf = '';
            for (var j = 0; j < parts.length; j++) {
                buf += parts[j];
                if (buf.length >= 60) {
                    segs.push(buf.trim());
                    buf = '';
                }
            }
            if (buf.trim()) segs.push(buf.trim());
        }
    }
    if (segs.length === 0 && text.trim()) segs.push(text.trim());
    return segs;
}

function _thBackDetail() { _thView = 'detail'; _thRenderDetail(); }

/* 背景图 */
function _thPickBg() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            _thBg = e.target.result;
            try { localStorage.setItem('_thBg', _thBg); } catch (ex) { }
            if (_thView === 'stage') _thRenderStage();
            if (typeof showToast === 'function') showToast('Background updated 背景已更新');
        };
        reader.readAsDataURL(inp.files[0]);
    };
    inp.click();
}

/* LOG */
function _thShowLog() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    var h = '<div class="thtr-log-overlay">';
    h += '<div class="thtr-log-header">';
    h += '<div class="thtr-log-title">LOG 演出记录</div>';
    h += '<div class="thtr-log-close" onclick="_thCloseLog()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';
    h += '<div class="thtr-log-list">';
    for (var i = 0; i < _thHistory.length; i++) {
        var hm = _thHistory[i];
        var isU = hm.from === 'user';
        h += '<div class="thtr-log-item ' + (isU ? 'user' : 'char') + '">';
        h += '<div class="thtr-log-who">' + (isU ? 'YOU 你' : _thEsc(_thRole ? _thRole.name : '?').toUpperCase()) + '</div>';
        h += '<div class="thtr-log-txt">' + _thEsc(hm.text).substring(0, 500) + (hm.text.length > 500 ? '...' : '') + '</div>';
        h += '</div>';
    }
    if (_thHistory.length === 0) h += '<div class="thtr-log-empty">No history 暂无记录</div>';
    h += '</div></div>';
    var panel = document.createElement('div');
    panel.id = 'thtrLogPanel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:100;';
    panel.innerHTML = h;
    el.appendChild(panel);
}
function _thCloseLog() {
    var p = document.getElementById('thtrLogPanel');
    if (p) p.remove();
}
