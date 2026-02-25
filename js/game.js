/* ============================================
   game.js — 游戏大厅 + UNO
   ============================================ */
var _gameView = 'lobby';
var _gameType = '';
var _gameSelectedPersona = '';
var _gameSelectedChars = [];
var _unoState = null;

/* ★ 核心修复：打开游戏时先加载聊天数据 */
function openGameApp() {
    var el = document.getElementById('gameOverlay');
    if (!el) return;
    /* 从 localStorage 加载角色和人设（和 chat.js 共享） */
    if (typeof loadChatRoles === 'function') loadChatRoles();
    _gameView = 'lobby';
    el.innerHTML = gameBuildLobby();
    el.classList.add('show');
}
function closeGameApp() {
    var el = document.getElementById('gameOverlay');
    if (el) el.classList.remove('show');
    _unoState = null;
}

/* ===== 大厅 ===== */
function gameBuildLobby() {
    var h = '';
    h += '<div class="game-header">';
    h += '<div class="game-back" onclick="closeGameApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="game-header-title">GAME CENTER</div>';
    h += '<div class="game-header-spacer"></div>';
    h += '</div>';
    h += '<div class="game-lobby">';
    h += '<div class="game-lobby-title">Game Center 游戏大厅</div>';
    h += '<div class="game-lobby-sub">选择游戏，邀请角色一起玩</div>';
    h += '<div class="game-cards">';

    h += '<div class="game-card uno" onclick="gamePickType(\'uno\')">';
    h += '<div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M7 8v8M12 8v5a3 3 0 006 0V8"/></svg></div>';
    h += '<div class="game-card-name">UNO</div>';
    h += '<div class="game-card-desc">经典卡牌 Classic Cards</div>';
    h += '<div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>2-10人</div>';
    h += '</div>';

    h += '<div class="game-card mahjong" onclick="gamePickType(\'mahjong\')">';
    h += '<div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/></svg></div>';
    h += '<div class="game-card-name">Mahjong 麻将</div>';
    h += '<div class="game-card-desc">开发中 Coming Soon</div>';
    h += '<div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>4人</div>';
    h += '</div>';

    h += '<div class="game-card landlord" onclick="gamePickType(\'landlord\')">';
    h += '<div class="game-card-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>';
    h += '<div class="game-card-name">Landlord 斗地主</div>';
    h += '<div class="game-card-desc">开发中 Coming Soon</div>';
    h += '<div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>3人</div>';
    h += '</div>';

    h += '<div class="game-card guess" onclick="gamePickType(\'guess\')">';
    h += '<div class="game-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg></div>';
    h += '<div class="game-card-name">Charades 你说我猜</div>';
    h += '<div class="game-card-desc">开发中 Coming Soon</div>';
    h += '<div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>3-10人</div>';
    h += '</div>';

    h += '</div>'; // /game-cards
    h += '<div class="game-recent"><div class="game-recent-title">Recent 近期记录</div><div class="game-recent-empty">暂无游戏记录</div></div>';
    h += '</div>';
    return h;
}

function gamePickType(type) {
    if (type !== 'uno') {
        if (typeof showToast === 'function') showToast('开发中，敬请期待');
        return;
    }
    _gameType = type;
    _gameSelectedPersona = '';
    _gameSelectedChars = [];
    _gameView = 'setup';
    var el = document.getElementById('gameOverlay');
    if (el) el.innerHTML = _gameBuildSetup();
}

/* ===== Setup 选人选角 ===== */
function _gameBuildSetup() {
    var minP = 2, maxP = 10;
    if (_gameType === 'mahjong') { minP = 3; maxP = 3; }
    if (_gameType === 'landlord') { minP = 2; maxP = 2; }
    if (_gameType === 'guess') { minP = 2; maxP = 9; }
    var typeLabels = { uno: 'UNO', mahjong: 'Mahjong 麻将', landlord: 'Landlord 斗地主', guess: 'Charades 你说我猜' };
    var h = '';
    h += '<div class="game-header">';
    h += '<div class="game-back" onclick="gameBackToLobby()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="game-header-title">' + (typeLabels[_gameType] || '') + '</div>';
    h += '<div class="game-header-spacer"></div>';
    h += '</div>';
    h += '<div class="game-setup show">';
    h += '<div class="game-setup-title">Room Setup 组建房间</div>';
    h += '<div class="game-setup-sub">选择你的人设和对手角色</div>';

    // === 人设区 ===
    h += '<div class="game-setup-sec">';
    h += '<div class="game-setup-sec-title"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Your Persona 你的人设</div>';
    h += '<div class="game-persona-list" id="gamePersonaList">';

    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    if (!personas.length) {
        h += '<div style="font-size:10px;color:rgba(120,100,112,.3);padding:4px 0">暂无人设，请先在聊天App中创建</div>';
    }
    for (var i = 0; i < personas.length; i++) {
        var p = personas[i];
        var pid = p.id || '';
        var isAct = (_gameSelectedPersona === pid);
        /* 用data属性+事件委托替代inline onclick */
        h += '<div class="game-persona-item' + (isAct ? ' active' : '') + '" data-game-persona="' + _gEsc(pid) + '">';
        h += '<div class="game-persona-av">';
        if (p.avatar) h += '<img src="' + _gEsc(p.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="game-persona-name">' + _gEsc(p.name || '未命名') + '</div>';
        h += '</div>';
    }
    h += '</div></div>';

    // === 角色区 ===
    h += '<div class="game-setup-sec">';
    h += '<div class="game-setup-sec-title"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>Opponents 对手角色 <span style="color:rgba(120,100,112,.2);font-weight:400;font-size:8.5px">(' + minP + '-' + maxP + '人)</span></div>';
    h += '<div class="game-char-grid" id="gameCharGrid">';

    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    if (!roles.length) {
        h += '<div style="font-size:10px;color:rgba(120,100,112,.3);padding:4px 0">暂无角色，请先在聊天App中创建</div>';
    }
    for (var j = 0; j < roles.length; j++) {
        var r = roles[j];
        var rid = r.id || '';
        var isSel = (_gameSelectedChars.indexOf(rid) !== -1);
        h += '<div class="game-char-item' + (isSel ? ' selected' : '') + '" data-game-char="' + _gEsc(rid) + '">';
        h += '<div class="game-char-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
        h += '<div class="game-char-av">';
        if (r.avatar) h += '<img src="' + _gEsc(r.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="game-char-name">' + _gEsc(r.name || '未命名') + '</div>';
        h += '</div>';
    }
    h += '</div>';
    h += '<div class="game-char-count">已选 ' + _gameSelectedChars.length + ' / ' + maxP + '</div>';
    h += '</div>';

    var canStart = _gameSelectedPersona && _gameSelectedChars.length >= minP && _gameSelectedChars.length <= maxP;
    h += '<button class="game-start-btn ' + _gameType + '" id="gameStartBtn" ' + (canStart ? '' : 'disabled') + '>Start 开始游戏</button>';
    h += '</div>';
    return h;
}

/* ★ 事件委托：彻底解决 onclick 引号冲突 */
document.addEventListener('click', function (e) {
    /* 人设点击 */
    var pi = e.target.closest('[data-game-persona]');
    if (pi) {
        var pid = pi.getAttribute('data-game-persona');
        if (pid) { _gameSelectedPersona = pid; _gameRefreshSetup(); }
        return;
    }
    /* 角色点击 */
    var ci = e.target.closest('[data-game-char]');
    if (ci) {
        var rid = ci.getAttribute('data-game-char');
        if (rid) { _gameToggleChar(rid); }
        return;
    }
    /* 开始按钮 */
    if (e.target.id === 'gameStartBtn' && !e.target.disabled) {
        gameStart();
    }
});

function gameBackToLobby() {
    _gameView = 'lobby';
    var el = document.getElementById('gameOverlay');
    if (el) el.innerHTML = gameBuildLobby();
}

function _gameRefreshSetup() {
    var el = document.getElementById('gameOverlay');
    if (el) el.innerHTML = _gameBuildSetup();
}

function _gameToggleChar(id) {
    var maxP = 10;
    if (_gameType === 'mahjong') maxP = 3;
    if (_gameType === 'landlord') maxP = 2;
    if (_gameType === 'guess') maxP = 9;
    var idx = _gameSelectedChars.indexOf(id);
    if (idx !== -1) { _gameSelectedChars.splice(idx, 1); }
    else {
        if (_gameSelectedChars.length >= maxP) {
            if (typeof showToast === 'function') showToast('最多选择 ' + maxP + ' 个角色');
            return;
        }
        _gameSelectedChars.push(id);
    }
    _gameRefreshSetup();
}

function gameStart() {
    if (_gameType === 'uno') unoStart();
}

/* =================== UNO =================== */
var UNO_COLORS = ['red', 'yellow', 'blue', 'green'];
var UNO_SPECIALS = ['skip', 'reverse', 'draw2'];

function unoBuildDeck() {
    var d = [];
    for (var ci = 0; ci < 4; ci++) {
        var c = UNO_COLORS[ci];
        d.push({ color: c, value: '0', type: 'number', id: 'n' + c + '0' });
        for (var n = 1; n <= 9; n++) {
            d.push({ color: c, value: '' + n, type: 'number', id: 'n' + c + n + 'a' });
            d.push({ color: c, value: '' + n, type: 'number', id: 'n' + c + n + 'b' });
        }
        for (var si = 0; si < 3; si++) {
            d.push({ color: c, value: UNO_SPECIALS[si], type: 'special', id: 's' + c + UNO_SPECIALS[si] + 'a' });
            d.push({ color: c, value: UNO_SPECIALS[si], type: 'special', id: 's' + c + UNO_SPECIALS[si] + 'b' });
        }
    }
    for (var w = 0; w < 4; w++) {
        d.push({ color: 'wild', value: 'wild', type: 'wild', id: 'ww' + w });
        d.push({ color: 'wild', value: 'wild4', type: 'wild', id: 'w4' + w });
    }
    return d;
}

function unoShuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
}

function unoStart() {
    var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null;
    var pl = [];
    pl.push({ id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '', hand: [], isUser: true, score: 0, saidUno: false });
    for (var i = 0; i < _gameSelectedChars.length; i++) {
        var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null;
        if (r) pl.push({ id: r.id, name: r.name || '角色', avatar: r.avatar || '', hand: [], isUser: false, score: 0, saidUno: false });
    }
    var deck = unoShuffle(unoBuildDeck());
    for (var p = 0; p < pl.length; p++) pl[p].hand = deck.splice(0, 7);
    var fd = null;
    for (var d = 0; d < deck.length; d++) { if (deck[d].value !== 'wild4') { fd = deck.splice(d, 1)[0]; break; } }
    if (!fd) fd = deck.shift();
    var tc = fd.color; if (tc === 'wild') tc = UNO_COLORS[Math.floor(Math.random() * 4)];
    _unoState = { players: pl, deck: deck, discard: [fd], topColor: tc, currentPlayer: 1, direction: 1, drawStack: 0, phase: 'play', logs: [], pendingWildCard: null };
    _unoHandleStartCard(fd);
    _unoRender();
    _unoLog(pl[_unoState.currentPlayer].name + ' 先出牌');
    if (_unoState.currentPlayer !== 0) setTimeout(function () { _unoAiTurn(); }, 1100);
}

function _unoHandleStartCard(c) {
    if (c.value === 'skip') _unoState.currentPlayer = _unoNext();
    else if (c.value === 'reverse') _unoState.direction *= -1;
    else if (c.value === 'draw2') _unoState.drawStack = 2;
}
function _unoNext() { var s = _unoState; return (s.currentPlayer + s.direction + s.players.length) % s.players.length; }

function _unoAdvance() {
    _unoState.currentPlayer = _unoNext();
    for (var i = 0; i < _unoState.players.length; i++) { if (_unoState.players[i].hand.length > 1) _unoState.players[i].saidUno = false; }
    _unoRender();
    if (_unoState.currentPlayer !== 0 && _unoState.phase === 'play') {
        setTimeout(function () { if (_unoState && _unoState.phase === 'play') _unoAiTurn(); }, 800 + Math.random() * 500);
    }
}

function _unoCanPlay(card) {
    var s = _unoState, top = s.discard[s.discard.length - 1];
    if (card.color === 'wild') return true;
    if (s.drawStack > 0 && card.value === 'draw2') return true;
    if (s.drawStack > 0) return false;
    if (card.color === s.topColor) return true;
    if (card.value === top.value) return true;
    return false;
}

/* 用户操作通过事件委托 */
document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-uno-action]');
    if (!t) return;
    var act = t.getAttribute('data-uno-action');
    var s = _unoState; if (!s) return;
    if (act === 'draw') {
        if (s.currentPlayer !== 0 || s.phase !== 'play') return;
        if (s.drawStack > 0) { var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(0, cnt); _unoLog('你 抽了 ' + cnt + ' 张'); _unoAdvance(); return; }
        if (s.deck.length === 0) _unoReshuffle();
        if (s.deck.length > 0) { var dr = s.deck.shift(); s.players[0].hand.push(dr); _unoLog('你 抽了 1 张'); if (_unoCanPlay(dr)) { _unoRender(); return; } }
        _unoAdvance();
    } else if (act === 'pass') {
        if (s.currentPlayer !== 0 || s.phase !== 'play') return;
        _unoLog('你 跳过'); _unoAdvance();
    } else if (act === 'uno') {
        if (s.players[0].hand.length <= 2) { s.players[0].saidUno = true; _unoShowShout(); _unoLog('你喊了 UNO!'); }
    } else if (act === 'again') {
        unoStart();
    } else if (act === 'lobby') {
        _unoState = null; gameBackToLobby();
    } else if (act === 'quit') {
        if (s.phase === 'play') { if (!confirm('确定退出游戏？')) return; }
        _unoState = null; gameBackToLobby();
    } else if (act.indexOf('play-') === 0) {
        var ci = parseInt(act.substring(5));
        if (s.currentPlayer !== 0 || s.phase !== 'play') return;
        var card = s.players[0].hand[ci];
        if (!card || !_unoCanPlay(card)) { if (typeof showToast === 'function') showToast('这张牌不能出'); return; }
        _unoPlayCard(0, ci);
    } else if (act.indexOf('color-') === 0) {
        var color = act.substring(6);
        s.topColor = color; s.phase = 'play';
        _unoLog('你选择了 ' + _unoColorCN(color));
        var wc = s.pendingWildCard; s.pendingWildCard = null;
        _unoApplyEffect(wc, 0);
    }
});

function _unoPlayCard(pIdx, cIdx) {
    var s = _unoState, pl = s.players[pIdx];
    var card = pl.hand.splice(cIdx, 1)[0];
    s.discard.push(card);
    _unoLog(pl.name + ' 打出 ' + _unoCardCN(card));
    if (card.color === 'wild') {
        if (pl.isUser) { s.pendingWildCard = card; s.phase = 'colorPick'; _unoRender(); return; }
        else { s.topColor = _unoAiColor(pl); _unoLog(pl.name + ' 选了 ' + _unoColorCN(s.topColor)); }
    } else { s.topColor = card.color; }
    _unoApplyEffect(card, pIdx);
}

function _unoApplyEffect(card, pIdx) {
    var s = _unoState, pl = s.players[pIdx];
    if (pl.hand.length === 0) { _unoWin(pIdx); return; }
    if (pl.hand.length === 1 && !pl.isUser) { pl.saidUno = true; _unoShowShout(); _unoLog(pl.name + ' UNO!'); }
    if (card.value === 'skip') { var sk = _unoNext(); _unoLog(s.players[sk].name + ' 被跳过'); s.currentPlayer = sk; _unoAdvance(); return; }
    if (card.value === 'reverse') { s.direction *= -1; _unoLog('方向反转 Reversed'); if (s.players.length === 2) { _unoAdvance(); return; } }
    if (card.value === 'draw2') { s.drawStack += 2; _unoAdvance(); _unoCheckStack(); return; }
    if (card.value === 'wild4') { s.drawStack += 4; _unoAdvance(); _unoCheckStack(); return; }
    _unoAdvance();
}

function _unoCheckStack() {
    var s = _unoState; if (s.drawStack <= 0) return;
    var cur = s.players[s.currentPlayer], has = false;
    for (var i = 0; i < cur.hand.length; i++) { if (cur.hand[i].value === 'draw2') { has = true; break; } }
    if (has) return;
    var cnt = s.drawStack; s.drawStack = 0;
    _unoForceDraw(s.currentPlayer, cnt);
    _unoLog(cur.name + ' 抽了 ' + cnt + ' 张 Drew ' + cnt);
    _unoAdvance();
}

function _unoForceDraw(pIdx, n) {
    var s = _unoState;
    for (var i = 0; i < n; i++) { if (!s.deck.length) _unoReshuffle(); if (s.deck.length) s.players[pIdx].hand.push(s.deck.shift()); }
    _unoRender();
}
function _unoReshuffle() { var s = _unoState, top = s.discard.pop(); s.deck = unoShuffle(s.discard); s.discard = [top]; }

/* AI */
function _unoAiTurn() {
    var s = _unoState; if (!s || s.phase !== 'play') return;
    var pIdx = s.currentPlayer, pl = s.players[pIdx];
    if (pl.isUser) return;
    if (s.drawStack > 0) {
        for (var i = 0; i < pl.hand.length; i++) { if (pl.hand[i].value === 'draw2') { _unoPlayCard(pIdx, i); return; } }
        var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(pIdx, cnt); _unoLog(pl.name + ' 抽了 ' + cnt + ' 张'); _unoAdvance(); return;
    }
    var ok = [];
    for (var j = 0; j < pl.hand.length; j++) { if (_unoCanPlay(pl.hand[j])) ok.push(j); }
    if (!ok.length) {
        if (!s.deck.length) _unoReshuffle();
        if (s.deck.length) { var d = s.deck.shift(); pl.hand.push(d); _unoLog(pl.name + ' 抽了 1 张 Drew 1'); if (_unoCanPlay(d) && Math.random() < .5) { setTimeout(function () { if (_unoState) _unoPlayCard(pIdx, pl.hand.length - 1); }, 350); return; } }
        _unoAdvance(); return;
    }
    /* 陪伴策略：领先太多时放水 */
    var hold = (pl.hand.length <= 3 && pl.score > s.players[0].score + 80 && Math.random() < .4);
    var pick;
    if (hold) { pick = ok[0]; var mn = 999; for (var k = 0; k < ok.length; k++) { var v = _unoScore(pl.hand[ok[k]]); if (v < mn && pl.hand[ok[k]].type !== 'wild') { mn = v; pick = ok[k]; } } }
    else if (Math.random() < .3) { pick = ok[Math.floor(Math.random() * ok.length)]; }
    else { pick = ok[0]; var mx = -1; for (var m = 0; m < ok.length; m++) { var sv = _unoScore(pl.hand[ok[m]]); if (sv > mx) { mx = sv; pick = ok[m]; } } }
    _unoPlayCard(pIdx, pick);
}
function _unoAiColor(pl) {
    var ct = { red: 0, yellow: 0, blue: 0, green: 0 };
    for (var i = 0; i < pl.hand.length; i++) { var c = pl.hand[i].color; if (ct[c] !== undefined) ct[c]++; }
    var best = 'red', mx = 0; for (var k in ct) { if (ct[k] > mx) { mx = ct[k]; best = k; } } return best;
}
function _unoWin(wIdx) {
    var s = _unoState; s.phase = 'result';
    var total = 0;
    for (var i = 0; i < s.players.length; i++) { if (i === wIdx) continue; for (var j = 0; j < s.players[i].hand.length; j++) total += _unoScore(s.players[i].hand[j]); }
    s.players[wIdx].score += total;
    _unoLog(s.players[wIdx].name + ' 获胜 Wins! +' + total);
    _unoRender();
}
function _unoScore(c) {
    if (c.type === 'number') return parseInt(c.value) || 0;
    if (c.value === 'skip' || c.value === 'reverse' || c.value === 'draw2') return 20;
    return 50;
}

/* ===== 渲染 ===== */
function _unoRender() {
    var el = document.getElementById('gameOverlay');
    if (!el || !_unoState) return;
    var s = _unoState, h = '';

    h += '<div class="game-header" style="background:rgba(42,61,48,.92);backdrop-filter:blur(12px);border-bottom:none">';
    h += '<div class="game-back" data-uno-action="quit" style="background:rgba(255,255,255,.08)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" style="stroke:#ccc"/></svg></div>';
    h += '<div class="game-header-title" style="color:rgba(255,255,255,.75)">UNO</div>';
    h += '<div class="game-header-spacer"></div></div>';

    h += '<div class="uno-game show"><div class="uno-table">';
    /* 方向 */
    h += '<div class="uno-direction ' + (s.direction === 1 ? 'cw' : 'ccw') + '"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1.2" stroke-dasharray="5,4"/>';
    h += (s.direction === 1 ? '<polygon points="82,45 92,50 82,55" fill="rgba(255,255,255,.1)"/>' : '<polygon points="18,45 8,50 18,55" fill="rgba(255,255,255,.1)"/>') + '</svg></div>';

    /* 对手 */
    h += '<div class="uno-opponents">';
    for (var i = 1; i < s.players.length; i++) {
        var op = s.players[i], isA = (i === s.currentPlayer && s.phase === 'play'), cn = Math.min(op.hand.length, 5);
        h += '<div class="uno-opp' + (isA ? ' active' : '') + (op.saidUno && op.hand.length === 1 ? ' uno-call' : '') + '">';
        h += '<div class="uno-opp-badge">UNO</div><div class="uno-opp-av">';
        if (op.avatar) h += '<img src="' + _gEsc(op.avatar) + '">';
        h += '</div><div class="uno-opp-name">' + _gEsc(op.name) + '</div><div class="uno-opp-cards">';
        for (var cb = 0; cb < cn; cb++) h += '<div class="uno-opp-card-back"></div>';
        h += '</div><div class="uno-opp-count">' + op.hand.length + '</div></div>';
    }
    h += '</div>';

    /* 中央 */
    h += '<div class="uno-center">';
    h += '<div class="uno-draw-pile" data-uno-action="draw"><div class="uno-draw-pile-text">Draw 抽牌<br>' + s.deck.length + '</div></div>';
    h += '<div class="uno-discard">' + _unoCardHTML(s.discard[s.discard.length - 1], -1, true) + '</div>';
    h += '</div>';

    /* 日志 */
    h += '<div class="uno-log" id="unoLog">';
    var ls = Math.max(0, s.logs.length - 3);
    for (var li = ls; li < s.logs.length; li++) h += '<div class="uno-log-item">' + _gEsc(s.logs[li]) + '</div>';
    h += '</div></div>'; // /uno-table

    /* 手牌 */
    h += '<div class="uno-hand-area"><div class="uno-hand-info">';
    h += '<div class="uno-hand-name"><div class="dot" style="background:' + (s.currentPlayer === 0 ? '#7ab07e' : '#666') + '"></div>' + _gEsc(s.players[0].name) + ' / ' + s.players[0].hand.length + '张</div>';
    h += '<div class="uno-hand-actions">';
    if (s.currentPlayer === 0 && s.phase === 'play') {
        h += '<button class="uno-btn red" data-uno-action="uno" ' + (s.players[0].hand.length <= 2 ? '' : 'disabled') + '>UNO!</button>';
        h += '<button class="uno-btn gray" data-uno-action="pass">Pass 跳过</button>';
    }
    h += '</div></div><div class="uno-hand-scroll">';
    for (var hi = 0; hi < s.players[0].hand.length; hi++) {
        var hc = s.players[0].hand[hi], cp = (s.currentPlayer === 0 && s.phase === 'play' && _unoCanPlay(hc));
        h += _unoCardHTML(hc, hi, false, cp);
    }
    h += '</div></div></div>'; // /uno-game

    /* 选色 */
    if (s.phase === 'colorPick') {
        h += '<div class="uno-color-pick show"><div class="uno-color-pick-box">';
        h += '<div class="uno-color-pick-title">Pick Color 选择颜色</div>';
        h += '<div class="uno-color-btn r" data-uno-action="color-red">红 Red</div>';
        h += '<div class="uno-color-btn y" data-uno-action="color-yellow">黄 Yellow</div>';
        h += '<div class="uno-color-btn b" data-uno-action="color-blue">蓝 Blue</div>';
        h += '<div class="uno-color-btn g" data-uno-action="color-green">绿 Green</div>';
        h += '</div></div>';
    }

    /* 结算 */
    if (s.phase === 'result') {
        var wI = -1;
        for (var wi = 0; wi < s.players.length; wi++) { if (s.players[wi].hand.length === 0) { wI = wi; break; } }
        h += '<div class="uno-result show">';
        h += '<div class="uno-result-title">' + (wI === 0 ? '你赢了 You Win!' : _gEsc(s.players[wI >= 0 ? wI : 0].name) + ' 获胜 Wins') + '</div>';
        h += '<div class="uno-result-sub">Round Result 本局结算</div><div class="uno-result-scores">';
        for (var ri = 0; ri < s.players.length; ri++) {
            var rp = s.players[ri], isW = (ri === wI);
            h += '<div class="uno-result-row' + (isW ? ' winner' : '') + '"><div class="uno-result-av">';
            if (rp.avatar) h += '<img src="' + _gEsc(rp.avatar) + '">';
            h += '</div><div class="uno-result-name">' + _gEsc(rp.name) + '</div><div class="uno-result-score">' + rp.score + '</div></div>';
        }
        h += '</div><div class="uno-result-btns">';
        h += '<button class="uno-result-btn primary" data-uno-action="again">Again 再来</button>';
        h += '<button class="uno-result-btn secondary" data-uno-action="lobby">Lobby 大厅</button>';
        h += '</div></div>';
    }
    h += '<div class="uno-shout" id="unoShout">UNO!</div>';
    el.innerHTML = h;
}

function _unoCardHTML(card, idx, isDis, playable) {
    var cc = card.color === 'wild' ? 'wild' : card.color;
    var vd = card.value, sym = '';
    if (card.value === 'skip') { vd = '\u2298'; sym = 'Skip'; }
    else if (card.value === 'reverse') { vd = '\u27F2'; sym = 'Rev'; }
    else if (card.value === 'draw2') { vd = '+2'; sym = 'Draw'; }
    else if (card.value === 'wild') { vd = '\u2726'; sym = 'Wild'; }
    else if (card.value === 'wild4') { vd = '+4'; sym = 'W+4'; }
    var da = '';
    if (!isDis && idx >= 0 && playable) da = ' data-uno-action="play-' + idx + '"';
    return '<div class="uno-card ' + cc + (playable ? ' playable' : '') + '"' + da + '><div class="uno-card-corner tl">' + vd + '</div><div class="uno-card-val">' + vd + '</div>' + (sym ? '<div class="uno-card-sym">' + sym + '</div>' : '') + '<div class="uno-card-corner br">' + vd + '</div></div>';
}

function _unoCardCN(c) {
    var cn = { red: '红', yellow: '黄', blue: '蓝', green: '绿', wild: '' };
    var vn = c.value;
    if (vn === 'skip') vn = '跳过 Skip'; else if (vn === 'reverse') vn = '反转 Reverse'; else if (vn === 'draw2') vn = '+2'; else if (vn === 'wild') vn = '变色 Wild'; else if (vn === 'wild4') vn = '+4';
    return (cn[c.color] || '') + vn;
}
function _unoColorCN(c) { return { red: '红色 Red', yellow: '黄色 Yellow', blue: '蓝色 Blue', green: '绿色 Green' }[c] || c; }

function _unoLog(msg) {
    if (!_unoState) return;
    _unoState.logs.push(msg);
    var le = document.getElementById('unoLog');
    if (le) { le.innerHTML += '<div class="uno-log-item">' + _gEsc(msg) + '</div>'; while (le.children.length > 5) le.removeChild(le.firstChild); }
}
function _unoShowShout() {
    var el = document.getElementById('unoShout');
    if (el) { el.classList.add('show'); setTimeout(function () { if (el) el.classList.remove('show'); }, 1400); }
}

function _gEsc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
