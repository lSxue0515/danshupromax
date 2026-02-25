/* ============================================
   game.js — 游戏大厅 + UNO + 麻将(四地区)
   ============================================ */
var _gameView = 'lobby', _gameType = '', _gameSelectedPersona = '', _gameSelectedChars = [];
var _unoState = null, _mjState = null;
var _mjRegion = 'northeast', _mjRounds = 4;

function openGameApp() {
    var el = document.getElementById('gameOverlay'); if (!el) return;
    if (typeof loadChatRoles === 'function') loadChatRoles();
    _gameView = 'lobby'; el.innerHTML = gameBuildLobby(); el.classList.add('show');
}
function closeGameApp() {
    var el = document.getElementById('gameOverlay'); if (el) el.classList.remove('show');
    _unoState = null; _mjState = null;
}

/* ===== 大厅 ===== */
function gameBuildLobby() {
    var h = '<div class="game-header"><div class="game-back" onclick="closeGameApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">GAME CENTER</div><div class="game-header-spacer"></div></div>';
    h += '<div class="game-lobby"><div class="game-lobby-title">Game Center 游戏大厅</div><div class="game-lobby-sub">选择游戏，邀请角色一起玩</div><div class="game-cards">';
    h += '<div class="game-card uno" onclick="gamePickType(\'uno\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M7 8v8M12 8v5a3 3 0 006 0V8"/></svg></div><div class="game-card-name">UNO</div><div class="game-card-desc">经典卡牌 Classic Cards</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>2-10人</div></div>';
    h += '<div class="game-card mahjong" onclick="gamePickType(\'mahjong\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/></svg></div><div class="game-card-name">Mahjong 麻将</div><div class="game-card-desc">四地区玩法 Regional Rules</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>4人</div></div>';
    h += '<div class="game-card landlord" onclick="gamePickType(\'landlord\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><div class="game-card-name">Landlord 斗地主</div><div class="game-card-desc">开发中 Coming Soon</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>3人</div></div>';
    h += '<div class="game-card guess" onclick="gamePickType(\'guess\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg></div><div class="game-card-name">Charades 你说我猜</div><div class="game-card-desc">开发中 Coming Soon</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>3-10人</div></div>';
    h += '</div><div class="game-recent"><div class="game-recent-title">Recent 近期记录</div><div class="game-recent-empty">暂无游戏记录</div></div></div>';
    return h;
}

function gamePickType(type) {
    if (type !== 'uno' && type !== 'mahjong') { if (typeof showToast === 'function') showToast('开发中，敬请期待'); return; }
    _gameType = type; _gameSelectedPersona = ''; _gameSelectedChars = []; _gameView = 'setup';
    var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = _gameBuildSetup();
}

/* ===== Setup ===== */
function _gameBuildSetup() {
    var minP = 2, maxP = 10;
    if (_gameType === 'mahjong') { minP = 3; maxP = 3; }
    if (_gameType === 'landlord') { minP = 2; maxP = 2; }
    if (_gameType === 'guess') { minP = 2; maxP = 9; }
    var tl = { uno: 'UNO', mahjong: 'Mahjong 麻将', landlord: 'Landlord 斗地主', guess: 'Charades 你说我猜' };
    var h = '<div class="game-header"><div class="game-back" onclick="gameBackToLobby()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">' + (tl[_gameType] || '') + '</div><div class="game-header-spacer"></div></div>';
    h += '<div class="game-setup show"><div class="game-setup-title">Room Setup 组建房间</div><div class="game-setup-sub">选择你的人设和对手角色</div>';

    // 麻将额外：地区+局数
    if (_gameType === 'mahjong') {
        var regions = [
            { id: 'northeast', name: '东北麻将 Northeast', desc: '136张 / 三色全 / 宝牌(混子) / 可吃碰杠' },
            { id: 'sichuan', name: '四川麻将 Sichuan', desc: '108张 / 定缺 / 血战到底 / 不可吃' },
            { id: 'yunnan', name: '云南麻将 Yunnan', desc: '112张 / 鸡牌 / 花牌 / 可吃碰杠' },
            { id: 'hubei', name: '湖北麻将 Hubei', desc: '108张 / 卡五星 / 开口胡 / 不可吃' }
        ];
        h += '<div class="mj-config-sec"><div class="mj-config-label"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Region 地区玩法</div>';
        h += '<div class="mj-region-list">';
        for (var ri = 0; ri < regions.length; ri++) {
            var rg = regions[ri];
            h += '<div class="mj-region-item' + (rg.id === _mjRegion ? ' active' : '') + '" data-mj-region="' + rg.id + '">' + rg.name + '</div>';
        }
        h += '</div>';
        var curDesc = ''; for (var rd = 0; rd < regions.length; rd++) { if (regions[rd].id === _mjRegion) curDesc = regions[rd].desc; }
        h += '<div class="mj-region-desc">' + curDesc + '</div></div>';

        h += '<div class="mj-config-sec"><div class="mj-config-label"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Rounds 局数设置</div>';
        h += '<div class="mj-round-row"><div class="mj-round-btn" data-mj-round="dec">-</div><div class="mj-round-val">' + _mjRounds + '</div><div class="mj-round-btn" data-mj-round="inc">+</div><div class="mj-round-unit">局/轮 per round</div></div></div>';
    }

    // 人设
    h += '<div class="game-setup-sec"><div class="game-setup-sec-title"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Your Persona 你的人设</div><div class="game-persona-list" id="gamePersonaList">';
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    if (!personas.length) h += '<div style="font-size:10px;color:rgba(120,100,112,.3);padding:4px 0">暂无人设，请先在聊天App中创建</div>';
    for (var i = 0; i < personas.length; i++) {
        var p = personas[i], pid = p.id || '', isA = (_gameSelectedPersona === pid);
        h += '<div class="game-persona-item' + (isA ? ' active' : '') + '" data-game-persona="' + _gEsc(pid) + '">';
        h += '<div class="game-persona-av">';
        if (p.avatar) h += '<img src="' + _gEsc(p.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div><div class="game-persona-name">' + _gEsc(p.name || '未命名') + '</div></div>';
    }
    h += '</div></div>';

    // 角色
    h += '<div class="game-setup-sec"><div class="game-setup-sec-title"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>Opponents 对手角色 <span style="color:rgba(120,100,112,.2);font-weight:400;font-size:8.5px">(' + minP + '-' + maxP + '人)</span></div><div class="game-char-grid" id="gameCharGrid">';
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    if (!roles.length) h += '<div style="font-size:10px;color:rgba(120,100,112,.3);padding:4px 0">暂无角色，请先在聊天App中创建</div>';
    for (var j = 0; j < roles.length; j++) {
        var r = roles[j], rid = r.id || '', isSel = (_gameSelectedChars.indexOf(rid) !== -1);
        h += '<div class="game-char-item' + (isSel ? ' selected' : '') + '" data-game-char="' + _gEsc(rid) + '">';
        h += '<div class="game-char-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><div class="game-char-av">';
        if (r.avatar) h += '<img src="' + _gEsc(r.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div><div class="game-char-name">' + _gEsc(r.name || '未命名') + '</div></div>';
    }
    h += '</div><div class="game-char-count">已选 ' + _gameSelectedChars.length + ' / ' + maxP + '</div></div>';

    var canStart = _gameSelectedPersona && _gameSelectedChars.length >= minP && _gameSelectedChars.length <= maxP;
    h += '<button class="game-start-btn ' + _gameType + '" id="gameStartBtn" ' + (canStart ? '' : 'disabled') + '>Start 开始游戏</button></div>';
    return h;
}

/* 事件委托 */
document.addEventListener('click', function (e) {
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var inp = document.getElementById('mjChatInput');
            if (inp && document.activeElement === inp) {
                e.preventDefault();
                _mjSendUserChat();
            }
        }
    });
    // 人设
    var pi = e.target.closest('[data-game-persona]');
    if (pi) { var pid = pi.getAttribute('data-game-persona'); if (pid) { _gameSelectedPersona = pid; _gameRefreshSetup(); } return; }
    // 角色
    var ci = e.target.closest('[data-game-char]');
    if (ci) { var rid = ci.getAttribute('data-game-char'); if (rid) _gameToggleChar(rid); return; }
    // 开始
    if (e.target.id === 'gameStartBtn' && !e.target.disabled) { gameStart(); return; }
    // 麻将地区
    var mr = e.target.closest('[data-mj-region]');
    if (mr) { _mjRegion = mr.getAttribute('data-mj-region'); _gameRefreshSetup(); return; }
    // 局数
    var rd = e.target.closest('[data-mj-round]');
    if (rd) { var a = rd.getAttribute('data-mj-round'); if (a === 'inc' && _mjRounds < 16) _mjRounds++; if (a === 'dec' && _mjRounds > 1) _mjRounds--; _gameRefreshSetup(); return; }
    // 麻将操作
    var ma = e.target.closest('[data-mj-action]');
    if (ma) { _mjHandleAction(ma.getAttribute('data-mj-action')); return; }
    // 麻将出牌
    var mt = e.target.closest('[data-mj-play]');
    if (mt) { var ti = parseInt(mt.getAttribute('data-mj-play')); _mjUserDiscard(ti); return; }
    // 刷新对话
    var cr = e.target.closest('[data-mj-chat]');
    if (cr) { var si = parseInt(cr.getAttribute('data-mj-chat')); _mjRefreshChat(si); return; }
    // UNO操作
    var t = e.target.closest('[data-uno-action]');
    if (t) { _handleUnoAction(t.getAttribute('data-uno-action')); return; }
});

function gameBackToLobby() { _gameView = 'lobby'; var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = gameBuildLobby(); }
function _gameRefreshSetup() { var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = _gameBuildSetup(); }
function _gameToggleChar(id) {
    var maxP = (_gameType === 'mahjong') ? 3 : (_gameType === 'landlord') ? 2 : (_gameType === 'guess') ? 9 : 10;
    var idx = _gameSelectedChars.indexOf(id);
    if (idx !== -1) _gameSelectedChars.splice(idx, 1);
    else { if (_gameSelectedChars.length >= maxP) { if (typeof showToast === 'function') showToast('最多选择' + maxP + '个角色'); return; } _gameSelectedChars.push(id); }
    _gameRefreshSetup();
}
function gameStart() { if (_gameType === 'uno') unoStart(); if (_gameType === 'mahjong') mjStart(); }

/* ==========================================
   麻将引擎 MAHJONG ENGINE
   ========================================== */
var MJ_WINDS = ['东', '南', '西', '北'];
var MJ_JIAN = ['中', '发', '白'];
var MJ_SUITS = ['wan', 'tiao', 'tong'];
var MJ_SUIT_CN = { wan: '万', tiao: '条', tong: '筒' };
var _mjChatLog = [];       // 局内聊天记录
var _mjChatPending = false; // API请求中

function _mjBuildTiles() {
    var tiles = [];
    for (var si = 0; si < 3; si++) {
        for (var n = 1; n <= 9; n++) {
            for (var c = 0; c < 4; c++) {
                tiles.push({ suit: MJ_SUITS[si], num: n, id: MJ_SUITS[si] + n + '_' + c });
            }
        }
    }
    if (_mjRegion === 'northeast') {
        for (var wi = 0; wi < 4; wi++) { for (var wc = 0; wc < 4; wc++)tiles.push({ suit: 'feng', num: wi, id: 'feng' + wi + '_' + wc }); }
        for (var ji = 0; ji < 3; ji++) { for (var jc = 0; jc < 4; jc++)tiles.push({ suit: 'jian', num: ji, id: 'jian' + ji + '_' + jc }); }
    }
    if (_mjRegion === 'yunnan') { for (var fi = 0; fi < 4; fi++)tiles.push({ suit: 'hua', num: fi, id: 'hua' + fi }); }
    return _mjShuffle(tiles);
}
function _mjShuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function _mjTileName(t) {
    if (t.suit === 'feng') return MJ_WINDS[t.num] + '风';
    if (t.suit === 'jian') return MJ_JIAN[t.num];
    if (t.suit === 'hua') return ['春', '夏', '秋', '冬'][t.num] || '花';
    return t.num + (MJ_SUIT_CN[t.suit] || '');
}
function _mjTileShort(t) {
    if (t.suit === 'feng') return MJ_WINDS[t.num];
    if (t.suit === 'jian') return MJ_JIAN[t.num];
    if (t.suit === 'hua') return ['春', '夏', '秋', '冬'][t.num] || '花';
    return t.num + '';
}
function _mjTileSuitClass(t) { return t.suit; }
function _mjSortHand(hand) {
    var order = { wan: 0, tiao: 1, tong: 2, feng: 3, jian: 4, hua: 5 };
    hand.sort(function (a, b) { return (order[a.suit] || 0) * 100 + a.num - (order[b.suit] || 0) * 100 - b.num; });
}

function mjStart() {
    var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null;
    var pl = [];
    pl.push({ id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '', hand: [], melds: [], discards: [], isUser: true, score: 0, wind: 0, dingque: -1 });
    for (var i = 0; i < _gameSelectedChars.length; i++) {
        var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null;
        if (r) pl.push({ id: r.id, name: r.name || '角色', avatar: r.avatar || '', detail: r.detail || '', hand: [], melds: [], discards: [], isUser: false, score: 0, wind: i + 1, dingque: -1 });
    }
    var tiles = _mjBuildTiles();
    for (var p = 0; p < 4; p++) { pl[p].hand = tiles.splice(0, p === 0 ? 14 : 13); _mjSortHand(pl[p].hand); }
    var bao = null;
    if (_mjRegion === 'northeast' && tiles.length > 0) bao = tiles[tiles.length - 1];
    _mjChatLog = []; _mjChatPending = false;
    _mjState = {
        players: pl, wall: tiles, phase: 'play', currentPlayer: 0,
        dealer: 0, roundNum: 1, totalRounds: _mjRounds,
        region: _mjRegion, bao: bao,
        logs: [], pendingAction: null, lastDiscard: null, lastDiscardPlayer: -1,
        canChi: (_mjRegion === 'northeast' || _mjRegion === 'yunnan'),
        needDingque: (_mjRegion === 'sichuan' || _mjRegion === 'hubei'),
        gameOver: false
    };
    if (_mjState.needDingque) {
        _mjState.phase = 'dingque';
        for (var ai = 1; ai < 4; ai++)_mjAiDingque(ai);
        _mjRender();
    } else {
        _mjState.phase = 'discard';
        _mjLog(pl[0].name + ' 是庄家 Dealer');
        _mjRender();
    }
}

function _mjAiDingque(pIdx) {
    var pl = _mjState.players[pIdx], count = { wan: 0, tiao: 0, tong: 0 };
    for (var i = 0; i < pl.hand.length; i++) { var s = pl.hand[i].suit; if (count[s] !== undefined) count[s]++; }
    var mn = 'wan', mv = 99; for (var k in count) { if (count[k] < mv) { mv = count[k]; mn = k; } }
    pl.dingque = MJ_SUITS.indexOf(mn);
}
function _mjUserDingque(suitIdx) {
    if (!_mjState || _mjState.phase !== 'dingque') return;
    _mjState.players[0].dingque = suitIdx;
    _mjLog('你选择定缺 ' + MJ_SUIT_CN[MJ_SUITS[suitIdx]]);
    _mjState.phase = 'discard'; _mjState.currentPlayer = 0; _mjRender();
}

function _mjUserDiscard(tileIdx) {
    var s = _mjState; if (!s || s.phase !== 'discard' || s.currentPlayer !== 0) return;
    var pl = s.players[0]; if (tileIdx < 0 || tileIdx >= pl.hand.length) return;
    var tile = pl.hand[tileIdx];
    if (s.needDingque && pl.dingque >= 0) {
        var dqSuit = MJ_SUITS[pl.dingque], hasDq = false;
        for (var i = 0; i < pl.hand.length; i++) { if (pl.hand[i].suit === dqSuit) { hasDq = true; break; } }
        if (hasDq && tile.suit !== dqSuit) { if (typeof showToast === 'function') showToast('请先出掉定缺花色的牌'); return; }
    }
    _mjDoDiscard(0, tileIdx);
}

function _mjDoDiscard(pIdx, tileIdx) {
    var s = _mjState, pl = s.players[pIdx];
    var tile = pl.hand.splice(tileIdx, 1)[0];
    pl.discards.push(tile);
    s.lastDiscard = tile; s.lastDiscardPlayer = pIdx;
    _mjLog(pl.name + ' 打出 ' + _mjTileName(tile));
    // ★ 先渲染，让用户看到出了什么牌
    _mjRender();

    var actions = _mjCheckOtherActions(pIdx, tile);
    if (actions.length > 0) {
        var acted = false;
        for (var ai = 0; ai < actions.length; ai++) {
            var a = actions[ai];
            if (a.pIdx === 0) continue;
            if (a.type === 'hu' && Math.random() < 0.9) {
                setTimeout(function () { if (_mjState) _mjDoHu(a.pIdx, tile, pIdx); }, 800);
                acted = true; break;
            }
            if (a.type === 'gang' && Math.random() < 0.7) {
                setTimeout(function () { if (_mjState) _mjDoPeng(a.pIdx, tile, pIdx, true); }, 800);
                acted = true; break;
            }
            if (a.type === 'peng' && Math.random() < 0.8) {
                setTimeout(function () { if (_mjState) _mjDoPeng(a.pIdx, tile, pIdx, false); }, 800);
                acted = true; break;
            }
        }
        if (acted) return;
    }
    // ★ 延迟后轮到下家摸牌
    s.currentPlayer = (pIdx + 1) % 4;
    s.phase = 'draw';
    var delay = pIdx === 0 ? 800 : 1200; // 给用户看对手出牌的时间
    setTimeout(function () { if (_mjState && _mjState.phase === 'draw') _mjDoDraw(_mjState.currentPlayer); }, delay);
}

function _mjDoDraw(pIdx) {
    var s = _mjState;
    if (s.wall.length === 0) { _mjDraw(); return; }
    var tile = s.wall.shift(), pl = s.players[pIdx];
    if (tile.suit === 'hua') {
        pl.melds.push({ type: 'hua', tiles: [tile] });
        _mjLog(pl.name + ' 摸到花牌 ' + _mjTileName(tile));
        _mjDoDraw(pIdx); return;
    }
    pl.hand.push(tile); _mjSortHand(pl.hand);
    if (_mjCheckHu(pl)) {
        if (pl.isUser) {
            s.phase = 'discard'; s.pendingAction = { type: 'canHu', pIdx: pIdx };
            _mjRender(); return;
        } else {
            if (Math.random() < 0.85) {
                setTimeout(function () { if (_mjState) _mjDoHu(pIdx, null, -1); }, 600);
                return;
            }
        }
    }
    s.phase = 'discard'; s.currentPlayer = pIdx;
    if (!pl.isUser) {
        // ★ AI出牌延迟1.5-2.5秒，让用户看清
        setTimeout(function () { if (_mjState) _mjAiDiscard(pIdx); }, 1500 + Math.random() * 1000);
    }
    _mjRender();
}

function _mjAiDiscard(pIdx) {
    var s = _mjState; if (!s || s.phase !== 'discard') return;
    var pl = s.players[pIdx]; if (pl.isUser) return;
    var bestIdx = 0, bestScore = -1;
    for (var i = 0; i < pl.hand.length; i++) {
        var t = pl.hand[i], sc = 0;
        if (s.needDingque && pl.dingque >= 0 && t.suit === MJ_SUITS[pl.dingque]) sc += 100;
        var same = 0; for (var j = 0; j < pl.hand.length; j++) { if (j !== i && pl.hand[j].suit === t.suit && Math.abs(pl.hand[j].num - t.num) <= 1) same++; }
        if (same === 0) sc += 50;
        if ((t.suit === 'feng' || t.suit === 'jian') && same === 0) sc += 30;
        sc += Math.random() * 10;
        if (sc > bestScore) { bestScore = sc; bestIdx = i; }
    }
    _mjDoDiscard(pIdx, bestIdx);
}

function _mjDoPeng(pIdx, tile, fromIdx, isGang) {
    var s = _mjState, pl = s.players[pIdx];
    var cnt = isGang ? 3 : 2, removed = [];
    for (var i = pl.hand.length - 1; i >= 0 && removed.length < cnt; i--) {
        if (pl.hand[i].suit === tile.suit && pl.hand[i].num === tile.num) removed.push(pl.hand.splice(i, 1)[0]);
    }
    var dp = s.players[fromIdx];
    for (var d = dp.discards.length - 1; d >= 0; d--) { if (dp.discards[d].id === tile.id) { dp.discards.splice(d, 1); break; } }
    removed.push(tile);
    pl.melds.push({ type: isGang ? 'minggang' : 'peng', tiles: removed });
    _mjLog(pl.name + (isGang ? ' 杠 ' : ' 碰 ') + _mjTileName(tile));
    if (isGang) { s.currentPlayer = pIdx; s.phase = 'draw'; setTimeout(function () { if (_mjState) _mjDoDraw(pIdx); }, 600); }
    else { s.currentPlayer = pIdx; s.phase = 'discard'; if (!pl.isUser) setTimeout(function () { if (_mjState) _mjAiDiscard(pIdx); }, 1200); _mjRender(); }
}

function _mjCheckOtherActions(fromIdx, tile) {
    var s = _mjState, actions = [];
    for (var i = 1; i <= 3; i++) {
        var pIdx = (fromIdx + i) % 4, pl = s.players[pIdx], same = 0;
        for (var j = 0; j < pl.hand.length; j++) { if (pl.hand[j].suit === tile.suit && pl.hand[j].num === tile.num) same++; }
        if (same >= 3) actions.push({ pIdx: pIdx, type: 'gang' });
        else if (same >= 2) actions.push({ pIdx: pIdx, type: 'peng' });
    }
    return actions;
}

function _mjCheckHu(pl) {
    var hand = pl.hand; if (hand.length % 3 !== 2) return false;
    if (hand.length === 14) { var pairs = true; for (var i = 0; i < hand.length; i += 2) { if (i + 1 >= hand.length || hand[i].suit !== hand[i + 1].suit || hand[i].num !== hand[i + 1].num) { pairs = false; break; } } if (pairs) return true; }
    return _mjCheckStdHu(hand);
}
function _mjCheckStdHu(tiles) {
    var counts = {}; for (var i = 0; i < tiles.length; i++) { var key = tiles[i].suit + '_' + tiles[i].num; counts[key] = (counts[key] || 0) + 1; }
    var keys = Object.keys(counts);
    for (var k = 0; k < keys.length; k++) { if (counts[keys[k]] >= 2) { var copy = {}; for (var c in counts) copy[c] = counts[c]; copy[keys[k]] -= 2; if (_mjCheckMelds(copy)) return true; } }
    return false;
}
function _mjCheckMelds(counts) {
    var first = null; for (var k in counts) { if (counts[k] > 0) { first = k; break; } }
    if (!first) return true;
    var parts = first.split('_'), suit = parts[0], num = parseInt(parts[1]);
    if (counts[first] >= 3) { var c1 = {}; for (var k in counts) c1[k] = counts[k]; c1[first] -= 3; if (_mjCheckMelds(c1)) return true; }
    if (suit === 'wan' || suit === 'tiao' || suit === 'tong') {
        var k2 = suit + '_' + (num + 1), k3 = suit + '_' + (num + 2);
        if (counts[k2] && counts[k2] > 0 && counts[k3] && counts[k3] > 0) { var c2 = {}; for (var k in counts) c2[k] = counts[k]; c2[first]--; c2[k2]--; c2[k3]--; if (_mjCheckMelds(c2)) return true; }
    }
    return false;
}

function _mjDoHu(winnerIdx, huTile, fromIdx) {
    var s = _mjState, pl = s.players[winnerIdx], pts = 10;
    if (fromIdx === -1) pts += 5;
    _mjLog(pl.name + ' 胡了! +' + pts + '分');
    pl.score += pts;
    for (var i = 0; i < 4; i++) { if (i !== winnerIdx) s.players[i].score -= Math.floor(pts / 3); }
    if (s.roundNum >= s.totalRounds) { s.phase = 'result'; s.gameOver = true; }
    else { s.roundNum++; setTimeout(function () { _mjNextRound(); }, 2000); }
    _mjRender();
}
function _mjDraw() {
    var s = _mjState; _mjLog('流局 海底');
    if (s.roundNum >= s.totalRounds) { s.phase = 'result'; s.gameOver = true; }
    else { s.roundNum++; setTimeout(function () { _mjNextRound(); }, 2000); }
    _mjRender();
}
function _mjNextRound() {
    if (!_mjState) return;
    var s = _mjState, scores = []; for (var i = 0; i < 4; i++)scores.push(s.players[i].score);
    var tiles = _mjBuildTiles();
    for (var p = 0; p < 4; p++) {
        s.players[p].hand = tiles.splice(0, p === s.dealer ? 14 : 13);
        _mjSortHand(s.players[p].hand);
        s.players[p].melds = []; s.players[p].discards = [];
        s.players[p].score = scores[p]; s.players[p].dingque = -1;
    }
    s.wall = tiles; s.lastDiscard = null; s.lastDiscardPlayer = -1;
    if (_mjRegion === 'northeast' && tiles.length > 0) s.bao = tiles[tiles.length - 1];
    s.currentPlayer = s.dealer;
    if (s.needDingque) { s.phase = 'dingque'; for (var ai = 1; ai < 4; ai++)_mjAiDingque(ai); }
    else { s.phase = 'discard'; }
    _mjLog('第' + s.roundNum + '局开始'); _mjRender();
}

function _mjHandleAction(act) {
    var s = _mjState; if (!s) return;
    if (act === 'hu' && s.pendingAction && s.pendingAction.type === 'canHu') { _mjDoHu(0, null, -1); return; }
    if (act === 'skip' && s.pendingAction) { s.pendingAction = null; s.phase = 'discard'; _mjRender(); return; }
    if (act === 'quit') { if (s.phase !== 'result') { if (!confirm('确定退出麻将？')) return; } _mjState = null; gameBackToLobby(); return; }
    if (act === 'again') { _mjState.roundNum = 1; _mjNextRound(); return; }
    if (act === 'lobby') { _mjState = null; gameBackToLobby(); return; }
    if (act.indexOf('dingque-') === 0) { _mjUserDingque(parseInt(act.substring(8))); return; }
    if (act === 'sendchat') { _mjSendUserChat(); return; }
}
function _mjLog(msg) { if (_mjState) _mjState.logs.push(msg); }

/* ===== 局内聊天系统 ===== */
function _mjSendUserChat() {
    var inp = document.getElementById('mjChatInput');
    if (!inp) return;
    var msg = inp.value.trim(); if (!msg) return;
    inp.value = '';
    var s = _mjState; if (!s) return;
    var me = s.players[0];
    _mjChatLog.push({ name: me.name, avatar: me.avatar, text: msg, isUser: true });
    _mjRenderChatOnly();
    // 3个char依次回复
    if (_mjChatPending) return;
    _mjChatPending = true;
    _mjAiChatReplyChain(msg, 1, function () { _mjChatPending = false; });
}

function _mjAiChatReplyChain(userMsg, charIdx, done) {
    var s = _mjState; if (!s || charIdx >= 4) { done(); return; }
    var pl = s.players[charIdx];
    var apiConfig = (typeof getActiveApiConfig === 'function') ? getActiveApiConfig() : null;
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) {
        // 无API时用预设回复
        var fallbacks = ['哈哈好的~', '嗯嗯', '有道理', '来来来继续打牌!', '你说的对', '别说了快出牌', '哎呀这牌太难了', '稳住稳住'];
        _mjChatLog.push({ name: pl.name, avatar: pl.avatar, text: fallbacks[Math.floor(Math.random() * fallbacks.length)], isUser: false });
        _mjRenderChatOnly();
        setTimeout(function () { _mjAiChatReplyChain(userMsg, charIdx + 1, done); }, 300);
        return;
    }

    var regionCN = { northeast: '东北', sichuan: '四川', yunnan: '云南', hubei: '湖北' };
    var sysMsg = '你正在扮演"' + pl.name + '"，和朋友们一起打' + (regionCN[s.region] || '') + '麻将。';
    if (pl.detail) sysMsg += '你的角色设定：' + pl.detail + '。';
    sysMsg += '请根据你的性格特点，用1-2句话自然地回复对方说的话。不要暴露手牌。简短自然有个性。';
    // 构建对话历史
    var msgs = [{ role: 'system', content: sysMsg }];
    var recent = _mjChatLog.slice(-8);
    for (var i = 0; i < recent.length; i++) {
        var r = recent[i];
        msgs.push({ role: r.isUser ? 'user' : 'assistant', content: (r.name || '') + ': ' + r.text });
    }
    msgs.push({ role: 'user', content: s.players[0].name + '说: ' + userMsg + ' (请以' + pl.name + '的身份回复)' });

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: msgs, temperature: 0.9, max_tokens: 60 })
    }).then(function (r) { return r.json(); }).then(function (d) {
        var reply = '...';
        if (d.choices && d.choices[0] && d.choices[0].message) {
            reply = d.choices[0].message.content || '...';
            // 去掉可能的角色名前缀
            reply = reply.replace(/^[^:：]*[:：]\s*/, '');
        }
        _mjChatLog.push({ name: pl.name, avatar: pl.avatar, text: reply, isUser: false });
        _mjRenderChatOnly();
        setTimeout(function () { _mjAiChatReplyChain(userMsg, charIdx + 1, done); }, 400);
    }).catch(function () {
        _mjChatLog.push({ name: pl.name, avatar: pl.avatar, text: '(网络错误)', isUser: false });
        _mjRenderChatOnly();
        setTimeout(function () { _mjAiChatReplyChain(userMsg, charIdx + 1, done); }, 200);
    });
}

/* 只刷新聊天区(不重绘整个界面，保留input焦点) */
function _mjRenderChatOnly() {
    var box = document.getElementById('mjChatBox');
    if (!box) return;
    var h = '';
    var show = _mjChatLog.slice(-12);
    for (var i = 0; i < show.length; i++) {
        var m = show[i];
        h += '<div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px;' + (m.isUser ? 'flex-direction:row-reverse' : '') + '">';
        h += '<div style="width:18px;height:18px;border-radius:50%;overflow:hidden;background:rgba(160,140,150,.08);flex-shrink:0">';
        if (m.avatar) h += '<img src="' + _gEsc(m.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
        h += '</div>';
        h += '<div style="max-width:65%;padding:3px 7px;border-radius:8px;font-size:8px;line-height:1.4;' + (m.isUser ? 'background:rgba(143,181,160,.15);color:#4a6a52' : 'background:rgba(255,255,255,.6);color:#5a4a52') + '">';
        h += '<div style="font-size:6.5px;color:rgba(120,100,112,.35);margin-bottom:1px">' + _gEsc(m.name) + '</div>';
        h += _gEsc(m.text);
        h += '</div></div>';
    }
    box.innerHTML = h;
    box.scrollTop = box.scrollHeight;
}

/* ===== 渲染麻将(完整重写) ===== */
function _mjRender() {
    var el = document.getElementById('gameOverlay'); if (!el || !_mjState) return;
    var s = _mjState, h = '';

    // 顶栏
    h += '<div class="game-header" style="background:rgba(234,230,226,.9);padding-top:54px"><div class="game-back" data-mj-action="quit"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title" style="color:#5a4a52">Mahjong 麻将</div><div class="game-header-spacer"></div></div>';

    // 主体
    h += '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:radial-gradient(ellipse at 50% 50%,#e8e4e0,#ddd8d4)">';

    // ── 上方：3个对手横排 ──
    h += '<div style="display:flex;justify-content:space-around;align-items:flex-start;padding:4px 4px 2px;flex-shrink:0">';
    for (var oi = 1; oi < 4; oi++) {
        var op = s.players[oi], isA = (oi === s.currentPlayer && (s.phase === 'discard' || s.phase === 'draw'));
        h += '<div style="display:flex;flex-direction:column;align-items:center;width:30%">';
        // 头像+名字
        h += '<div style="display:flex;align-items:center;gap:3px;padding:2px 6px;border-radius:7px;' + (isA ? 'background:rgba(143,181,160,.15);border:1px solid rgba(143,181,160,.15)' : 'background:rgba(255,255,255,.35);border:1px solid rgba(160,140,150,.06)') + '">';
        h += '<div style="width:20px;height:20px;border-radius:50%;overflow:hidden;background:rgba(160,140,150,.06);flex-shrink:0">';
        if (op.avatar) h += '<img src="' + _gEsc(op.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
        h += '</div>';
        h += '<div style="font-size:8px;color:#5a4a52;font-weight:600;max-width:40px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _gEsc(op.name) + '</div>';
        h += '<div style="font-size:6.5px;color:rgba(120,100,112,.3)">' + MJ_WINDS[oi] + '</div>';
        h += '<div style="font-size:7px;color:#8fb5a0;font-weight:700">' + op.score + '</div>';
        h += '</div>';
        // 手牌数
        h += '<div style="display:flex;gap:0;margin-top:2px">';
        var show = Math.min(op.hand.length, 13);
        for (var ob = 0; ob < show; ob++)h += '<div style="width:10px;height:15px;border-radius:2px;background:linear-gradient(180deg,#b8c8be,#9aaa9e);border:1px solid rgba(160,140,150,.1);margin-left:' + (ob > 0 ? '-2px' : '0') + '"></div>';
        h += '</div>';
        h += '<div style="font-size:6px;color:rgba(120,100,112,.25)">' + op.hand.length + '张</div>';
        h += '</div>';
    }
    h += '</div>';

    // ── 中部：牌桌+弃牌+聊天 ──
    h += '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;min-height:0">';

    // 中心信息
    h += '<div style="position:absolute;top:4px;left:50%;transform:translateX(-50%);padding:3px 10px;border-radius:6px;background:rgba(255,255,255,.4);font-size:8px;color:#6a5560;z-index:2;display:flex;gap:6px;align-items:center">';
    h += '<span style="font-weight:800">' + MJ_WINDS[s.currentPlayer] + '</span>';
    h += '<span>余' + s.wall.length + '</span>';
    h += '<span>' + s.roundNum + '/' + s.totalRounds + '局</span>';
    h += '</div>';

    // 弃牌区（可滚动）
    h += '<div style="flex:0 0 auto;max-height:60px;overflow-y:auto;padding:18px 8px 2px 8px;display:flex;flex-wrap:wrap;gap:1px;justify-content:center">';
    for (var di = 0; di < 4; di++) {
        var dp = s.players[di];
        for (var dd = 0; dd < dp.discards.length; dd++) {
            var dt = dp.discards[dd];
            h += '<div class="mj-discard-tile ' + _mjTileSuitClass(dt) + '" title="' + _gEsc(s.players[di].name) + '">' + _mjTileShort(dt) + '</div>';
        }
    }
    h += '</div>';

    // 日志
    h += '<div style="padding:2px 8px;flex-shrink:0">';
    var ls = Math.max(0, s.logs.length - 2);
    for (var li = ls; li < s.logs.length; li++)h += '<div style="font-size:7px;color:rgba(90,74,82,.4);background:rgba(255,255,255,.3);border-radius:4px;padding:1px 5px;margin-bottom:1px;width:fit-content;max-width:80%">' + _gEsc(s.logs[li]) + '</div>';
    h += '</div>';

    // 聊天区
    h += '<div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:0 6px">';
    h += '<div id="mjChatBox" style="flex:1;overflow-y:auto;padding:2px 0;-webkit-overflow-scrolling:touch">';
    // 聊天内容
    var show2 = _mjChatLog.slice(-12);
    for (var ci = 0; ci < show2.length; ci++) {
        var m = show2[ci];
        h += '<div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px;' + (m.isUser ? 'flex-direction:row-reverse' : '') + '">';
        h += '<div style="width:18px;height:18px;border-radius:50%;overflow:hidden;background:rgba(160,140,150,.08);flex-shrink:0">';
        if (m.avatar) h += '<img src="' + _gEsc(m.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
        h += '</div>';
        h += '<div style="max-width:65%;padding:3px 7px;border-radius:8px;font-size:8px;line-height:1.4;' + (m.isUser ? 'background:rgba(143,181,160,.15);color:#4a6a52' : 'background:rgba(255,255,255,.6);color:#5a4a52') + '">';
        h += '<div style="font-size:6.5px;color:rgba(120,100,112,.35);margin-bottom:1px">' + _gEsc(m.name) + '</div>';
        h += _gEsc(m.text);
        h += '</div></div>';
    }
    h += '</div>';
    // 输入框
    h += '<div style="display:flex;gap:4px;padding:3px 0 4px;flex-shrink:0">';
    h += '<input id="mjChatInput" type="text" placeholder="说点什么..." style="flex:1;height:26px;border:1px solid rgba(160,140,150,.12);border-radius:8px;padding:0 8px;font-size:9px;background:rgba(255,255,255,.5);outline:none;color:#5a4a52">';
    h += '<div data-mj-action="sendchat" style="width:26px;height:26px;border-radius:8px;background:rgba(143,181,160,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#4a6a52" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>';
    h += '</div>';
    h += '</div>'; // /聊天区
    h += '</div>'; // /中部

    // ── 操作按钮 ──
    if (s.pendingAction && s.pendingAction.type === 'canHu' && s.pendingAction.pIdx === 0) {
        h += '<div style="display:flex;gap:5px;justify-content:center;padding:3px;flex-shrink:0">';
        h += '<div class="mj-action-btn primary" data-mj-action="hu">胡 Hu!</div>';
        h += '<div class="mj-action-btn gray" data-mj-action="skip">跳过 Skip</div>';
        h += '</div>';
    }

    // ── 下方：我的信息+手牌 ──
    h += '<div style="flex-shrink:0;padding:2px 5px 8px;background:linear-gradient(to top,rgba(230,226,222,.9),rgba(230,226,222,.2))">';
    var myA = (s.currentPlayer === 0 && s.phase === 'discard'), me = s.players[0];
    h += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">';
    h += '<div style="display:flex;align-items:center;gap:3px;padding:2px 6px;border-radius:7px;' + (myA ? 'background:rgba(143,181,160,.15);border:1px solid rgba(143,181,160,.15)' : 'background:rgba(255,255,255,.35);border:1px solid rgba(160,140,150,.06)') + '">';
    h += '<div style="width:18px;height:18px;border-radius:50%;overflow:hidden;background:rgba(160,140,150,.06);flex-shrink:0">';
    if (me.avatar) h += '<img src="' + _gEsc(me.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
    h += '</div>';
    h += '<div style="font-size:8px;color:#5a4a52;font-weight:600">' + _gEsc(me.name) + '</div>';
    h += '<div style="font-size:6.5px;color:rgba(120,100,112,.3)">' + MJ_WINDS[0] + '</div>';
    h += '<div style="font-size:7px;color:#8fb5a0;font-weight:700">' + me.score + '</div>';
    h += '</div>';
    if (myA) h += '<div style="font-size:7px;color:#8fb5a0;font-weight:600;animation:pulse 1s infinite">← 轮到你出牌</div>';
    h += '</div>';

    // ★ 手牌横排
    h += '<div style="display:flex;gap:1px;overflow-x:auto;padding:2px 0;align-items:flex-end;-webkit-overflow-scrolling:touch">';
    for (var hi = 0; hi < me.hand.length; hi++) {
        var ht = me.hand[hi], canP = (s.currentPlayer === 0 && s.phase === 'discard');
        h += '<div class="mj-tile ' + _mjTileSuitClass(ht) + (canP ? ' playable' : '') + '" style="min-width:22px;width:22px;height:32px"' + (canP ? ' data-mj-play="' + hi + '"' : '') + '>';
        h += '<div class="mj-tile-val" style="font-size:12px">' + _mjTileShort(ht) + '</div>';
        h += '<div class="mj-tile-suit" style="font-size:5px">' + (MJ_SUIT_CN[ht.suit] || '') + '</div>';
        h += '</div>';
    }
    h += '</div>';

    // 副露
    if (me.melds.length > 0) {
        h += '<div style="display:flex;gap:2px;margin-top:1px;justify-content:center">';
        for (var mi = 0; mi < me.melds.length; mi++) {
            var meld = me.melds[mi];
            h += '<div style="display:flex;gap:0;padding:1px;border-radius:2px;background:rgba(255,255,255,.3)">';
            for (var mt = 0; mt < meld.tiles.length; mt++) {
                var mtt = meld.tiles[mt];
                h += '<div class="mj-meld-tile ' + _mjTileSuitClass(mtt) + '" style="width:14px;height:20px;font-size:5.5px">' + _mjTileShort(mtt) + '</div>';
            }
            h += '</div>';
        }
        h += '</div>';
    }
    h += '</div>'; // /下方
    h += '</div>'; // /主体

    // ====== 弹窗 ======
    if (s.phase === 'dingque') {
        h += '<div class="mj-dingque-overlay show"><div class="mj-dingque-box">';
        h += '<div class="mj-dingque-title">定缺 Choose Exclude</div>';
        h += '<div class="mj-dingque-sub">选择一个花色，整局不能出该花色的牌胡牌</div>';
        h += '<div class="mj-dingque-opts">';
        h += '<div class="mj-dingque-btn wan" data-mj-action="dingque-0"><div class="mj-dingque-btn-label">万</div><div class="mj-dingque-btn-sub">Wan</div></div>';
        h += '<div class="mj-dingque-btn tiao" data-mj-action="dingque-1"><div class="mj-dingque-btn-label">条</div><div class="mj-dingque-btn-sub">Tiao</div></div>';
        h += '<div class="mj-dingque-btn tong" data-mj-action="dingque-2"><div class="mj-dingque-btn-label">筒</div><div class="mj-dingque-btn-sub">Tong</div></div>';
        h += '</div></div></div>';
    }
    if (s.phase === 'result') {
        h += '<div class="mj-result show"><div class="mj-result-title">Game Over 对局结束</div>';
        h += '<div class="mj-result-sub">' + s.totalRounds + '局结算</div><div class="mj-result-scores">';
        var sorted = []; for (var si = 0; si < 4; si++)sorted.push({ idx: si, score: s.players[si].score });
        sorted.sort(function (a, b) { return b.score - a.score; });
        for (var sr = 0; sr < sorted.length; sr++) {
            var sp = s.players[sorted[sr].idx], isW = (sr === 0);
            h += '<div class="mj-result-row' + (isW ? ' winner' : '') + '"><div class="mj-result-av">';
            if (sp.avatar) h += '<img src="' + _gEsc(sp.avatar) + '">';
            h += '</div><div class="mj-result-name">' + _gEsc(sp.name) + '</div><div class="mj-result-pts' + (sp.score < 0 ? ' neg' : '') + '">' + sp.score + '</div></div>';
        }
        h += '</div><div class="mj-result-btns">';
        h += '<div class="mj-result-btn primary" data-mj-action="again">再来 Again</div>';
        h += '<div class="mj-result-btn secondary" data-mj-action="lobby">大厅 Lobby</div>';
        h += '</div></div>';
    }

    el.innerHTML = h;
    // 滚动聊天到底部
    var chatBox = document.getElementById('mjChatBox');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

/* ==========================================
   UNO 引擎 (保持原有完整代码)
   ========================================== */
var UNO_COLORS = ['red', 'yellow', 'blue', 'green'], UNO_SPECIALS = ['skip', 'reverse', 'draw2'];
function unoBuildDeck() { var d = []; for (var ci = 0; ci < 4; ci++) { var c = UNO_COLORS[ci]; d.push({ color: c, value: '0', type: 'number', id: 'n' + c + '0' }); for (var n = 1; n <= 9; n++) { d.push({ color: c, value: '' + n, type: 'number', id: 'n' + c + n + 'a' }); d.push({ color: c, value: '' + n, type: 'number', id: 'n' + c + n + 'b' }); } for (var si = 0; si < 3; si++) { d.push({ color: c, value: UNO_SPECIALS[si], type: 'special', id: 's' + c + UNO_SPECIALS[si] + 'a' }); d.push({ color: c, value: UNO_SPECIALS[si], type: 'special', id: 's' + c + UNO_SPECIALS[si] + 'b' }); } } for (var w = 0; w < 4; w++) { d.push({ color: 'wild', value: 'wild', type: 'wild', id: 'ww' + w }); d.push({ color: 'wild', value: 'wild4', type: 'wild', id: 'w4' + w }); } return d; }
function unoShuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function unoStart() { var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null; var pl = []; pl.push({ id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '', hand: [], isUser: true, score: 0, saidUno: false }); for (var i = 0; i < _gameSelectedChars.length; i++) { var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null; if (r) pl.push({ id: r.id, name: r.name || '角色', avatar: r.avatar || '', hand: [], isUser: false, score: 0, saidUno: false }); } var deck = unoShuffle(unoBuildDeck()); for (var p = 0; p < pl.length; p++)pl[p].hand = deck.splice(0, 7); var fd = null; for (var d = 0; d < deck.length; d++) { if (deck[d].value !== 'wild4') { fd = deck.splice(d, 1)[0]; break; } } if (!fd) fd = deck.shift(); var tc = fd.color; if (tc === 'wild') tc = UNO_COLORS[Math.floor(Math.random() * 4)]; _unoState = { players: pl, deck: deck, discard: [fd], topColor: tc, currentPlayer: 1, direction: 1, drawStack: 0, phase: 'play', logs: [], pendingWildCard: null }; _unoHandleStartCard(fd); _unoRender(); _unoLog(pl[_unoState.currentPlayer].name + ' 先出牌'); if (_unoState.currentPlayer !== 0) setTimeout(function () { _unoAiTurn(); }, 1100); }
function _unoHandleStartCard(c) { if (c.value === 'skip') _unoState.currentPlayer = _unoNext(); else if (c.value === 'reverse') _unoState.direction *= -1; else if (c.value === 'draw2') _unoState.drawStack = 2; }
function _unoNext() { var s = _unoState; return (s.currentPlayer + s.direction + s.players.length) % s.players.length; }
function _unoAdvance() { _unoState.currentPlayer = _unoNext(); for (var i = 0; i < _unoState.players.length; i++) { if (_unoState.players[i].hand.length > 1) _unoState.players[i].saidUno = false; } _unoRender(); if (_unoState.currentPlayer !== 0 && _unoState.phase === 'play') setTimeout(function () { if (_unoState && _unoState.phase === 'play') _unoAiTurn(); }, 800 + Math.random() * 500); }
function _unoCanPlay(card) { var s = _unoState, top = s.discard[s.discard.length - 1]; if (card.color === 'wild') return true; if (s.drawStack > 0 && card.value === 'draw2') return true; if (s.drawStack > 0) return false; if (card.color === s.topColor) return true; if (card.value === top.value) return true; return false; }
function _handleUnoAction(act) { var s = _unoState; if (!s) return; if (act === 'draw') { if (s.currentPlayer !== 0 || s.phase !== 'play') return; if (s.drawStack > 0) { var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(0, cnt); _unoLog('你 抽了' + cnt + '张'); _unoAdvance(); return; } if (s.deck.length === 0) _unoReshuffle(); if (s.deck.length > 0) { var dr = s.deck.shift(); s.players[0].hand.push(dr); _unoLog('你 抽了1张'); if (_unoCanPlay(dr)) { _unoRender(); return; } } _unoAdvance(); } else if (act === 'pass') { if (s.currentPlayer !== 0 || s.phase !== 'play') return; _unoLog('你 跳过'); _unoAdvance(); } else if (act === 'uno') { if (s.players[0].hand.length <= 2) { s.players[0].saidUno = true; _unoShowShout(); _unoLog('你喊了UNO!'); } } else if (act === 'again') { unoStart(); } else if (act === 'lobby') { _unoState = null; gameBackToLobby(); } else if (act === 'quit') { if (s.phase === 'play') { if (!confirm('确定退出?')) return; } _unoState = null; gameBackToLobby(); } else if (act.indexOf('play-') === 0) { var ci = parseInt(act.substring(5)); if (s.currentPlayer !== 0 || s.phase !== 'play') return; var card = s.players[0].hand[ci]; if (!card || !_unoCanPlay(card)) { if (typeof showToast === 'function') showToast('这张牌不能出'); return; } _unoPlayCard(0, ci); } else if (act.indexOf('color-') === 0) { var color = act.substring(6); s.topColor = color; s.phase = 'play'; _unoLog('你选择了' + _unoColorCN(color)); var wc = s.pendingWildCard; s.pendingWildCard = null; _unoApplyEffect(wc, 0); } }
function _unoPlayCard(pIdx, cIdx) { var s = _unoState, pl = s.players[pIdx]; var card = pl.hand.splice(cIdx, 1)[0]; s.discard.push(card); _unoLog(pl.name + ' 打出' + _unoCardCN(card)); if (card.color === 'wild') { if (pl.isUser) { s.pendingWildCard = card; s.phase = 'colorPick'; _unoRender(); return; } else { s.topColor = _unoAiColor(pl); _unoLog(pl.name + ' 选了' + _unoColorCN(s.topColor)); } } else { s.topColor = card.color; } _unoApplyEffect(card, pIdx); }
function _unoApplyEffect(card, pIdx) { var s = _unoState, pl = s.players[pIdx]; if (pl.hand.length === 0) { _unoWin(pIdx); return; } if (pl.hand.length === 1 && !pl.isUser) { pl.saidUno = true; _unoShowShout(); _unoLog(pl.name + ' UNO!'); } if (card.value === 'skip') { var sk = _unoNext(); _unoLog(s.players[sk].name + ' 被跳过'); s.currentPlayer = sk; _unoAdvance(); return; } if (card.value === 'reverse') { s.direction *= -1; _unoLog('方向反转'); if (s.players.length === 2) { _unoAdvance(); return; } } if (card.value === 'draw2') { s.drawStack += 2; _unoAdvance(); _unoCheckStack(); return; } if (card.value === 'wild4') { s.drawStack += 4; _unoAdvance(); _unoCheckStack(); return; } _unoAdvance(); }
function _unoCheckStack() { var s = _unoState; if (s.drawStack <= 0) return; var cur = s.players[s.currentPlayer], has = false; for (var i = 0; i < cur.hand.length; i++) { if (cur.hand[i].value === 'draw2') { has = true; break; } } if (has) return; var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(s.currentPlayer, cnt); _unoLog(cur.name + ' 抽了' + cnt + '张'); _unoAdvance(); }
function _unoForceDraw(pIdx, n) { var s = _unoState; for (var i = 0; i < n; i++) { if (!s.deck.length) _unoReshuffle(); if (s.deck.length) s.players[pIdx].hand.push(s.deck.shift()); } _unoRender(); }
function _unoReshuffle() { var s = _unoState, top = s.discard.pop(); s.deck = unoShuffle(s.discard); s.discard = [top]; }
function _unoAiTurn() { var s = _unoState; if (!s || s.phase !== 'play') return; var pIdx = s.currentPlayer, pl = s.players[pIdx]; if (pl.isUser) return; if (s.drawStack > 0) { for (var i = 0; i < pl.hand.length; i++) { if (pl.hand[i].value === 'draw2') { _unoPlayCard(pIdx, i); return; } } var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(pIdx, cnt); _unoLog(pl.name + ' 抽了' + cnt + '张'); _unoAdvance(); return; } var ok = []; for (var j = 0; j < pl.hand.length; j++) { if (_unoCanPlay(pl.hand[j])) ok.push(j); } if (!ok.length) { if (!s.deck.length) _unoReshuffle(); if (s.deck.length) { var d = s.deck.shift(); pl.hand.push(d); _unoLog(pl.name + ' 抽了1张'); if (_unoCanPlay(d) && Math.random() < .5) { setTimeout(function () { if (_unoState) _unoPlayCard(pIdx, pl.hand.length - 1); }, 350); return; } } _unoAdvance(); return; } var pick; if (Math.random() < .3) pick = ok[Math.floor(Math.random() * ok.length)]; else { pick = ok[0]; var mx = -1; for (var m = 0; m < ok.length; m++) { var sv = _unoScore(pl.hand[ok[m]]); if (sv > mx) { mx = sv; pick = ok[m]; } } } _unoPlayCard(pIdx, pick); }
function _unoAiColor(pl) { var ct = { red: 0, yellow: 0, blue: 0, green: 0 }; for (var i = 0; i < pl.hand.length; i++) { var c = pl.hand[i].color; if (ct[c] !== undefined) ct[c]++; } var best = 'red', mx = 0; for (var k in ct) { if (ct[k] > mx) { mx = ct[k]; best = k; } } return best; }
function _unoWin(wIdx) { var s = _unoState; s.phase = 'result'; var total = 0; for (var i = 0; i < s.players.length; i++) { if (i === wIdx) continue; for (var j = 0; j < s.players[i].hand.length; j++)total += _unoScore(s.players[i].hand[j]); } s.players[wIdx].score += total; _unoLog(s.players[wIdx].name + ' 获胜 +' + total); _unoRender(); }
function _unoScore(c) { if (c.type === 'number') return parseInt(c.value) || 0; if (c.value === 'skip' || c.value === 'reverse' || c.value === 'draw2') return 20; return 50; }
function _unoRender() { var el = document.getElementById('gameOverlay'); if (!el || !_unoState) return; var s = _unoState, h = ''; h += '<div class="game-header" style="background:rgba(42,61,48,.92);backdrop-filter:blur(12px);border-bottom:none"><div class="game-back" data-uno-action="quit" style="background:rgba(255,255,255,.08)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" style="stroke:#ccc"/></svg></div><div class="game-header-title" style="color:rgba(255,255,255,.75)">UNO</div><div class="game-header-spacer"></div></div>'; h += '<div class="uno-game show"><div class="uno-table">'; h += '<div class="uno-direction ' + (s.direction === 1 ? 'cw' : 'ccw') + '"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1.2" stroke-dasharray="5,4"/>' + (s.direction === 1 ? '<polygon points="82,45 92,50 82,55" fill="rgba(255,255,255,.1)"/>' : '<polygon points="18,45 8,50 18,55" fill="rgba(255,255,255,.1)"/>') + '</svg></div>'; h += '<div class="uno-opponents">'; for (var i = 1; i < s.players.length; i++) { var op = s.players[i], isA = (i === s.currentPlayer && s.phase === 'play'), cn = Math.min(op.hand.length, 5); h += '<div class="uno-opp' + (isA ? ' active' : '') + (op.saidUno && op.hand.length === 1 ? ' uno-call' : '') + '">'; h += '<div class="uno-opp-badge">UNO</div><div class="uno-opp-av">'; if (op.avatar) h += '<img src="' + _gEsc(op.avatar) + '">'; h += '</div><div class="uno-opp-name">' + _gEsc(op.name) + '</div><div class="uno-opp-cards">'; for (var cb = 0; cb < cn; cb++)h += '<div class="uno-opp-card-back"></div>'; h += '</div><div class="uno-opp-count">' + op.hand.length + '</div></div>'; } h += '</div>'; h += '<div class="uno-center"><div class="uno-draw-pile" data-uno-action="draw"><div class="uno-draw-pile-text">Draw 抽牌<br>' + s.deck.length + '</div></div><div class="uno-discard">' + _unoCardHTML(s.discard[s.discard.length - 1], -1, true) + '</div></div>'; h += '<div class="uno-log" id="unoLog">'; var ls = Math.max(0, s.logs.length - 3); for (var li = ls; li < s.logs.length; li++)h += '<div class="uno-log-item">' + _gEsc(s.logs[li]) + '</div>'; h += '</div></div>'; h += '<div class="uno-hand-area"><div class="uno-hand-info"><div class="uno-hand-name"><div class="dot" style="background:' + (s.currentPlayer === 0 ? '#7ab07e' : '#666') + '"></div>' + _gEsc(s.players[0].name) + ' / ' + s.players[0].hand.length + '张</div><div class="uno-hand-actions">'; if (s.currentPlayer === 0 && s.phase === 'play') { h += '<button class="uno-btn red" data-uno-action="uno" ' + (s.players[0].hand.length <= 2 ? '' : 'disabled') + '>UNO!</button>'; h += '<button class="uno-btn gray" data-uno-action="pass">Pass 跳过</button>'; } h += '</div></div><div class="uno-hand-scroll">'; for (var hi = 0; hi < s.players[0].hand.length; hi++) { var hc = s.players[0].hand[hi], cp = (s.currentPlayer === 0 && s.phase === 'play' && _unoCanPlay(hc)); h += _unoCardHTML(hc, hi, false, cp); } h += '</div></div></div>'; if (s.phase === 'colorPick') { h += '<div class="uno-color-pick show"><div class="uno-color-pick-box"><div class="uno-color-pick-title">Pick Color 选择颜色</div><div class="uno-color-btn r" data-uno-action="color-red">红 Red</div><div class="uno-color-btn y" data-uno-action="color-yellow">黄 Yellow</div><div class="uno-color-btn b" data-uno-action="color-blue">蓝 Blue</div><div class="uno-color-btn g" data-uno-action="color-green">绿 Green</div></div></div>'; } if (s.phase === 'result') { var wI = -1; for (var wi = 0; wi < s.players.length; wi++) { if (s.players[wi].hand.length === 0) { wI = wi; break; } } h += '<div class="uno-result show"><div class="uno-result-title">' + (wI === 0 ? '你赢了 You Win!' : _gEsc(s.players[wI >= 0 ? wI : 0].name) + ' 获胜 Wins') + '</div><div class="uno-result-sub">Round Result 本局结算</div><div class="uno-result-scores">'; for (var ri = 0; ri < s.players.length; ri++) { var rp = s.players[ri], isW = (ri === wI); h += '<div class="uno-result-row' + (isW ? ' winner' : '') + '"><div class="uno-result-av">'; if (rp.avatar) h += '<img src="' + _gEsc(rp.avatar) + '">'; h += '</div><div class="uno-result-name">' + _gEsc(rp.name) + '</div><div class="uno-result-score">' + rp.score + '</div></div>'; } h += '</div><div class="uno-result-btns"><button class="uno-result-btn primary" data-uno-action="again">Again 再来</button><button class="uno-result-btn secondary" data-uno-action="lobby">Lobby 大厅</button></div></div>'; } h += '<div class="uno-shout" id="unoShout">UNO!</div>'; el.innerHTML = h; }
function _unoCardHTML(card, idx, isDis, playable) { var cc = card.color === 'wild' ? 'wild' : card.color; var vd = card.value, sym = ''; if (card.value === 'skip') { vd = '\u2298'; sym = 'Skip'; } else if (card.value === 'reverse') { vd = '\u27F2'; sym = 'Rev'; } else if (card.value === 'draw2') { vd = '+2'; sym = 'Draw'; } else if (card.value === 'wild') { vd = '\u2726'; sym = 'Wild'; } else if (card.value === 'wild4') { vd = '+4'; sym = 'W+4'; } var da = ''; if (!isDis && idx >= 0 && playable) da = ' data-uno-action="play-' + idx + '"'; return '<div class="uno-card ' + cc + (playable ? ' playable' : '') + '"' + da + '><div class="uno-card-corner tl">' + vd + '</div><div class="uno-card-val">' + vd + '</div>' + (sym ? '<div class="uno-card-sym">' + sym + '</div>' : '') + '<div class="uno-card-corner br">' + vd + '</div></div>'; }
function _unoCardCN(c) { var cn = { red: '红', yellow: '黄', blue: '蓝', green: '绿', wild: '' }; var vn = c.value; if (vn === 'skip') vn = '跳过'; else if (vn === 'reverse') vn = '反转'; else if (vn === 'draw2') vn = '+2'; else if (vn === 'wild') vn = '变色'; else if (vn === 'wild4') vn = '+4'; return (cn[c.color] || '') + vn; }
function _unoColorCN(c) { return { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' }[c] || c; }
function _unoLog(msg) { if (!_unoState) return; _unoState.logs.push(msg); var le = document.getElementById('unoLog'); if (le) { le.innerHTML += '<div class="uno-log-item">' + _gEsc(msg) + '</div>'; while (le.children.length > 5) le.removeChild(le.firstChild); } }
function _unoShowShout() { var el = document.getElementById('unoShout'); if (el) { el.classList.add('show'); setTimeout(function () { if (el) el.classList.remove('show'); }, 1400); } }
function _gEsc(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
