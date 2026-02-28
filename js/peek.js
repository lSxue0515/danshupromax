/* ============================================
   蛋薯机 DanShu Pro v2 — peek.js
   偷偷看 — 查看角色的小手机
   ============================================ */

var _peekCurrentChar = null;
var _peekChatTarget = null;
var _peekForumTab = 'follow';
var _peekCalYear = 0;
var _peekCalMonth = 0;
var _peekCalSelectedDay = '';
var _peekEditingMemoIdx = -1;

var PEEK_KEY = 'ds_peek_';
function _pk(charId, s) { return PEEK_KEY + charId + '_' + s; }

/* ===== 工具 ===== */
function _peekEsc(s) {
    if (typeof esc === 'function') return esc(s);
    var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}
var _PEEK_SVG_USER = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';

/* =================================================================
   数据层
   ================================================================= */

/* -- 备忘录 -- */
function _peekLoadMemos(cid) {
    try { return JSON.parse(localStorage.getItem(_pk(cid, 'memos')) || '[]'); } catch (e) { return []; }
}
function _peekSaveMemos(cid, a) {
    try { localStorage.setItem(_pk(cid, 'memos'), JSON.stringify(a)); } catch (e) { }
}

/* -- 日历事件 -- */
function _peekLoadEvents(cid) {
    try { return JSON.parse(localStorage.getItem(_pk(cid, 'events')) || '{}'); } catch (e) { return {}; }
}
function _peekSaveEvents(cid, o) {
    try { localStorage.setItem(_pk(cid, 'events'), JSON.stringify(o)); } catch (e) { }
}

/* -- 图片小组件(两个) -- */
function _peekLoadWidget(cid, idx) {
    return localStorage.getItem(_pk(cid, 'widget' + idx)) || '';
}
function _peekSaveWidget(cid, idx, src) {
    try { localStorage.setItem(_pk(cid, 'widget' + idx), src); } catch (e) { }
}

/* -- 代发消息 -- */
function _peekLoadProxy(cid, tid) {
    try { return JSON.parse(localStorage.getItem(_pk(cid, 'proxy_' + tid)) || '[]'); } catch (e) { return []; }
}
function _peekSaveProxy(cid, tid, a) {
    try { localStorage.setItem(_pk(cid, 'proxy_' + tid), JSON.stringify(a)); } catch (e) { }
}

/* =================================================================
   ★ 从主系统同步真实数据
   ================================================================= */

/* char的聊天联系人 = user + 其他已存在的角色 */
function _peekGetContacts(charId) {
    var contacts = [];
    if (typeof _chatRoles === 'undefined') return contacts;
    // 1. user自己
    var pa = null;
    if (typeof getActivePersona === 'function') pa = getActivePersona(charId);
    contacts.push({
        id: '_user',
        name: pa ? (pa.name || '你') : '你',
        avatar: pa ? (pa.avatar || '') : '',
        isUser: true
    });
    // 2. 其他角色
    for (var i = 0; i < _chatRoles.length; i++) {
        var r = _chatRoles[i];
        if (r.id === charId) continue;
        contacts.push({
            id: r.id,
            name: r.nickname || r.name,
            avatar: r.avatar || ''
        });
    }
    return contacts;
}

/* 获取char与某个联系人的真实聊天记录
   - 如果联系人是 _user：读取主系统 role.msgs（视角翻转：role.msgs中 from=self 是user说的→在char视角应该是对方说的）
   - 如果联系人是其他角色：模拟生成一些聊天记录（基于角色信息） */
function _peekGetMessages(charId, targetId) {
    var role = null;
    if (typeof findRole === 'function') role = findRole(charId);
    if (!role) return [];

    if (targetId === '_user') {
        // 从主系统读取真实聊天记录，翻转视角
        var raw = role.msgs || [];
        var msgs = [];
        for (var i = 0; i < raw.length; i++) {
            var m = raw[i];
            // 跳过系统消息/特殊卡片
            if (m.transfer || m.familyCard || m.redPacket || m.locationShare) continue;
            var text = m.text || '';
            if (!text.trim()) continue;
            // 翻转视角：user发的(self)→在char手机里显示为对方；char发的(other)→在char手机里显示为自己
            msgs.push({
                from: m.from === 'self' ? 'other' : 'self',
                text: text,
                time: m.time || ''
            });
        }
        // 加上user代发的消息
        var proxy = _peekLoadProxy(charId, '_user');
        for (var p = 0; p < proxy.length; p++) {
            msgs.push(proxy[p]);
        }
        return msgs;
    } else {
        // 与其他角色的聊天→自动生成一些内容
        return _peekGenerateChatWith(charId, targetId);
    }
}

/* 自动生成char与其他角色的模拟聊天（基于角色信息，只生成一次，缓存） */
function _peekGenerateChatWith(charId, targetId) {
    var cacheKey = _pk(charId, 'genchat_' + targetId);
    try {
        var cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (e) { }

    var role = null, target = null;
    if (typeof findRole === 'function') {
        role = findRole(charId);
        target = findRole(targetId);
    }
    if (!role || !target) return [];

    var rn = role.nickname || role.name;
    var tn = target.nickname || target.name;
    var templates = [
        [
            { from: 'other', text: rn + '！最近怎么样呀' },
            { from: 'self', text: '还行吧，你呢' },
            { from: 'other', text: '我也还好~想找你聊聊天' },
            { from: 'self', text: '好呀，说吧' }
        ],
        [
            { from: 'other', text: '在吗在吗！' },
            { from: 'self', text: '嗯？怎么了' },
            { from: 'other', text: '没什么，就是想你了hh' },
            { from: 'self', text: '……' }
        ],
        [
            { from: 'self', text: tn + '，明天有空吗' },
            { from: 'other', text: '有呀！怎么了' },
            { from: 'self', text: '想约你出来一下' },
            { from: 'other', text: '好呀好呀！' }
        ],
        [
            { from: 'other', text: '你最近和那个人相处得怎么样呀~' },
            { from: 'self', text: '嗯…挺好的' },
            { from: 'other', text: '哎呦～脸红了吧' },
            { from: 'self', text: '才没有！' }
        ],
        [
            { from: 'self', text: '今天的天气不错' },
            { from: 'other', text: '是呀！适合出门~' },
            { from: 'self', text: '不想出门…' },
            { from: 'other', text: '宅家也挺好的hhh' }
        ]
    ];

    var pick = templates[Math.floor(Math.random() * templates.length)];
    var msgs = [];
    for (var i = 0; i < pick.length; i++) {
        msgs.push({ from: pick[i].from, text: pick[i].text, time: '' });
    }

    // 加上代发的
    var proxy = _peekLoadProxy(charId, targetId);
    for (var p = 0; p < proxy.length; p++) {
        msgs.push(proxy[p]);
    }

    try { localStorage.setItem(cacheKey, JSON.stringify(msgs)); } catch (e) { }
    return msgs;
}

/* 获取联系人的最后一条消息（列表预览） */
function _peekGetLastMsg(charId, targetId) {
    var msgs = _peekGetMessages(charId, targetId);
    if (msgs.length === 0) return '';
    return msgs[msgs.length - 1].text || '';
}

/* 判断联系人是否有聊天记录 */
function _peekHasMessages(charId, targetId) {
    if (targetId === '_user') {
        var role = (typeof findRole === 'function') ? findRole(charId) : null;
        if (role && role.msgs && role.msgs.length > 0) return true;
        var proxy = _peekLoadProxy(charId, '_user');
        return proxy.length > 0;
    }
    // 其他角色：检查缓存或代发
    var cacheKey = _pk(charId, 'genchat_' + targetId);
    try { if (localStorage.getItem(cacheKey)) return true; } catch (e) { }
    var proxy = _peekLoadProxy(charId, targetId);
    return proxy.length > 0;
}

/* 从主论坛同步char的帖子 */
function _peekGetForumPosts(charId) {
    var posts = [];
    var role = (typeof findRole === 'function') ? findRole(charId) : null;
    if (!role) return posts;
    var rn = role.nickname || role.name;

    // 从主论坛系统读取
    if (typeof _forumPosts !== 'undefined' && Array.isArray(_forumPosts)) {
        for (var i = 0; i < _forumPosts.length; i++) {
            var fp = _forumPosts[i];
            if (fp.authorId === charId || fp.author === rn || fp.author === role.name) {
                posts.push(fp);
            }
        }
    }
    // 也检查localStorage的论坛数据
    if (posts.length === 0) {
        try {
            var stored = JSON.parse(localStorage.getItem('ds_forum_posts') || '[]');
            for (var j = 0; j < stored.length; j++) {
                if (stored[j].authorId === charId || stored[j].author === rn || stored[j].author === role.name) {
                    posts.push(stored[j]);
                }
            }
        } catch (e) { }
    }
    return posts;
}

/* ★ 自动生成备忘录（首次打开时） */
function _peekAutoGenMemos(charId) {
    var existing = _peekLoadMemos(charId);
    if (existing.length > 0) return existing;

    var role = (typeof findRole === 'function') ? findRole(charId) : null;
    if (!role) return [];
    var rn = role.nickname || role.name;

    // 获取user的名字
    var userName = '你';
    if (typeof getActivePersona === 'function') {
        var pa = getActivePersona(charId);
        if (pa && pa.name) userName = pa.name;
    }

    var now = Date.now();
    var memos = [];

    // 关于user的备忘
    var aboutUser = [
        { title: '关于' + userName, text: userName + '喜欢的东西要记住！\n不能忘记' + userName + '的习惯和偏好\n' + userName + '不开心的时候要陪在身边', pin: true },
        { title: userName + '的小细节', text: '• ' + userName + '心情不好的时候喜欢安静\n• 记得主动关心' + userName + '\n• ' + userName + '说过想要一起去旅行', pin: true },
        { title: '想对' + userName + '说的话', text: '有时候不知道怎么表达…\n但是真的很珍惜和' + userName + '在一起的时间\n希望可以一直这样下去', pin: false }
    ];

    // 行程安排
    var schedules = [
        { title: '本周行程', text: '周一：整理房间\n周三：出门采购\n周五：和' + userName + '一起…', pin: false },
        { title: '待办事项', text: '□ 回复消息\n□ 准备礼物给' + userName + '\n□ 整理相册\n□ 学做新菜', pin: false },
        { title: '出门清单', text: '手机、钥匙、钱包\n记得带伞\n给' + userName + '带点好吃的回来', pin: false }
    ];

    // 注意事项
    var notes = [
        { title: '重要！', text: userName + '的生日一定不能忘！\n要提前准备好礼物\n想想' + userName + '最近在关注什么', pin: true },
        { title: '自我提醒', text: '不要太依赖别人\n但是遇到' + userName + '就忍不住…\n要变得更好才行', pin: false }
    ];

    // 随机选几条
    var pool = aboutUser.concat(schedules).concat(notes);
    pool.sort(function () { return Math.random() - 0.5; });
    var count = 3 + Math.floor(Math.random() * 3); // 3-5条
    for (var i = 0; i < Math.min(count, pool.length); i++) {
        memos.push({
            title: pool[i].title,
            text: pool[i].text,
            pin: pool[i].pin || false,
            ts: now - i * 86400000 * (1 + Math.floor(Math.random() * 3))
        });
    }
    // 置顶的排前面
    memos.sort(function (a, b) {
        if (a.pin && !b.pin) return -1;
        if (!a.pin && b.pin) return 1;
        return b.ts - a.ts;
    });

    _peekSaveMemos(charId, memos);
    return memos;
}

/* ★ 自动生成日历特殊日期 */
function _peekAutoGenEvents(charId) {
    var existing = _peekLoadEvents(charId);
    if (Object.keys(existing).length > 0) return existing;

    var role = (typeof findRole === 'function') ? findRole(charId) : null;
    if (!role) return {};

    var userName = '你';
    if (typeof getActivePersona === 'function') {
        var pa = getActivePersona(charId);
        if (pa && pa.name) userName = pa.name;
    }
    var rn = role.nickname || role.name;

    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var events = {};

    // 今天
    var todayKey = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    events[todayKey] = ['今天也要开心呀 ♡'];

    // 几天后 - 和user相关
    var d1 = new Date(now.getTime() + 3 * 86400000);
    var k1 = d1.getFullYear() + '-' + ('0' + (d1.getMonth() + 1)).slice(-2) + '-' + ('0' + d1.getDate()).slice(-2);
    events[k1] = ['和' + userName + '的约定 💕'];

    // 一周后
    var d2 = new Date(now.getTime() + 7 * 86400000);
    var k2 = d2.getFullYear() + '-' + ('0' + (d2.getMonth() + 1)).slice(-2) + '-' + ('0' + d2.getDate()).slice(-2);
    events[k2] = ['给' + userName + '准备惊喜'];

    // 本月中旬
    var k3 = y + '-' + ('0' + (m + 1)).slice(-2) + '-15';
    if (!events[k3]) events[k3] = [];
    events[k3].push(rn + '和' + userName + '的纪念日 ❤️');

    // 下个月1号
    var nm = m + 1 > 11 ? 0 : m + 1;
    var ny = m + 1 > 11 ? y + 1 : y;
    var k4 = ny + '-' + ('0' + (nm + 1)).slice(-2) + '-01';
    events[k4] = ['新的一个月！加油'];

    // 随机一天
    var rd = 1 + Math.floor(Math.random() * 28);
    var k5 = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + rd).slice(-2);
    if (!events[k5]) events[k5] = [];
    events[k5].push(userName + '的重要日子，不能忘！');

    _peekSaveEvents(charId, events);
    return events;
}

/* =================================================================
   打开/关闭
   ================================================================= */

function openPeekApp() {
    var el = document.getElementById('peekOverlay');
    if (!el) return;
    _peekCurrentChar = null;
    _renderPeekSelect(el);
    el.classList.add('show');
}
function closePeekApp() {
    var el = document.getElementById('peekOverlay');
    if (el) { el.classList.remove('show'); setTimeout(function () { el.innerHTML = ''; }, 300); }
}

/* =================================================================
   选择角色
   ================================================================= */

function _renderPeekSelect(el) {
    var h = '<div class="peek-select-header">';
    h += '<div class="peek-select-title">👀 偷偷看</div>';
    h += '<div class="peek-close-btn" onclick="closePeekApp()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';
    h += '<div style="padding:0 20px 12px;font-size:11px;color:rgba(255,255,255,0.35)">选择一个角色，偷偷看看TA的手机~</div>';
    h += '<div class="peek-select-grid">';

    if (typeof _chatRoles !== 'undefined') {
        for (var i = 0; i < _chatRoles.length; i++) {
            var r = _chatRoles[i];
            h += '<div class="peek-char-card" onclick="peekEnterPhone(\'' + r.id + '\')">';
            h += '<div class="peek-char-avatar">';
            if (r.avatar) h += '<img src="' + r.avatar + '">';
            else h += _PEEK_SVG_USER;
            h += '</div>';
            h += '<div class="peek-char-name">' + _peekEsc(r.nickname || r.name) + '</div>';
            h += '</div>';
        }
        if (_chatRoles.length === 0) {
            h += '<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.25);font-size:12px;padding:40px 0">还没有角色~</div>';
        }
    }
    h += '</div>';
    el.innerHTML = h;
}

/* =================================================================
   角色手机 — 主屏幕
   ================================================================= */

function peekEnterPhone(charId) {
    _peekCurrentChar = charId;
    var el = document.getElementById('peekOverlay');
    if (!el) return;
    _renderPeekHome(el);
}

function _renderPeekHome(el) {
    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return;
    var dn = _peekEsc(role.nickname || role.name);
    var now = new Date();
    var tStr = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);

    var h = '<div class="peek-phone-wrap show" id="peekPhoneWrap">';

    // 状态栏
    h += '<div class="peek-status-bar">';
    h += '<div class="peek-status-time">' + tStr + '</div>';
    h += '<div class="peek-status-name">' + dn + ' 的手机</div>';
    h += '<div class="peek-status-icons">';
    h += '<svg viewBox="0 0 24 24"><path d="M5 12.55a10.94 10.94 0 0 1 14 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
    h += '<svg viewBox="0 0 24 24"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>';
    h += '</div></div>';

    // 主屏幕内容
    h += '<div class="peek-home">';
    h += '<div class="peek-home-grid">';

    // ===== 左列：4个APP =====
    h += '<div class="peek-home-left">';

    // 消息
    var lastChat = _peekGetLastMsg(_peekCurrentChar, '_user');
    h += '<div class="peek-app-tile peek-tile-chat" onclick="peekOpenChat()">';
    h += '<div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>';
    h += '<div class="peek-app-tile-name">消息</div>';
    h += '<div class="peek-app-tile-sub">' + (lastChat ? _peekEsc(lastChat).substring(0, 20) : '查看TA的聊天') + '</div>';
    h += '</div>';

    // 论坛
    h += '<div class="peek-app-tile peek-tile-forum" onclick="peekOpenForum()">';
    h += '<div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>';
    h += '<div class="peek-app-tile-name">论坛</div>';
    h += '<div class="peek-app-tile-sub">看看TA发了什么</div>';
    h += '</div>';

    // 备忘录
    var memos = _peekAutoGenMemos(_peekCurrentChar);
    h += '<div class="peek-app-tile peek-tile-memo" onclick="peekOpenMemo()">';
    h += '<div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>';
    h += '<div class="peek-app-tile-name">备忘录</div>';
    h += '<div class="peek-app-tile-sub">' + (memos.length > 0 ? _peekEsc(memos[0].title) : '暂无') + '</div>';
    h += '</div>';

    // 日历
    h += '<div class="peek-app-tile peek-tile-calendar" onclick="peekOpenCalendar()">';
    h += '<div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>';
    h += '<div class="peek-app-tile-name">日历</div>';
    h += '<div class="peek-app-tile-sub">' + now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + '</div>';
    h += '</div>';

    h += '</div>'; // end left

    // ===== 右列：2个正方形小组件 =====
    h += '<div class="peek-home-right">';

    for (var wi = 0; wi < 2; wi++) {
        var wImg = _peekLoadWidget(_peekCurrentChar, wi);
        h += '<div class="peek-widget-square" onclick="peekPickWidget(' + wi + ')">';
        if (wImg) {
            h += '<img src="' + wImg + '">';
        } else {
            h += '<div class="peek-widget-square-hint">';
            h += '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            h += '点击换图</div>';
        }
        h += '</div>';
    }

    h += '</div>'; // end right
    h += '</div>'; // end grid
    h += '</div>'; // end home

    // 底部导航
    h += '<div class="peek-dock">';
    h += '<div class="peek-dock-btn" onclick="peekBackToSelect()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg><span>返回</span></div>';
    h += '<div class="peek-dock-btn active"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>主屏</span></div>';
    h += '</div>';

    h += '</div>';
    el.innerHTML = h;
}

function peekBackToSelect() {
    _peekCurrentChar = null;
    var el = document.getElementById('peekOverlay');
    if (el) _renderPeekSelect(el);
}

/* ===== 图片小组件换图 ===== */
function peekPickWidget(idx) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
        if (!inp.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            _peekSaveWidget(_peekCurrentChar, idx, e.target.result);
            var el = document.getElementById('peekOverlay');
            if (el) _renderPeekHome(el);
        };
        reader.readAsDataURL(inp.files[0]);
    };
    inp.click();
}

/* =================================================================
   Chat 子页 — 联系人列表
   ================================================================= */

function peekOpenChat() {
    _peekChatTarget = null;
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;

    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return;
    var dn = _peekEsc(role.nickname || role.name);
    var contacts = _peekGetContacts(_peekCurrentChar);

    // ★ 只显示有聊天记录的联系人
    var activeContacts = [];
    for (var i = 0; i < contacts.length; i++) {
        if (_peekHasMessages(_peekCurrentChar, contacts[i].id)) {
            activeContacts.push(contacts[i]);
        }
    }

    var h = '<div class="peek-subpage show" id="peekChatListPage">';
    h += '<div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="peekCloseSub()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的消息</div>';
    h += '</div>';
    h += '<div class="peek-sub-body">';

    if (activeContacts.length === 0) {
        h += '<div style="text-align:center;color:rgba(50,40,55,0.25);font-size:12px;padding:40px 0">暂无聊天记录</div>';
    }
    for (var c = 0; c < activeContacts.length; c++) {
        var ct = activeContacts[c];
        var lastMsg = _peekGetLastMsg(_peekCurrentChar, ct.id);
        h += '<div class="peek-chat-list-item" onclick="peekOpenConv(\'' + ct.id + '\')">';
        h += '<div class="peek-chat-list-av">';
        if (ct.avatar) h += '<img src="' + ct.avatar + '">';
        else h += _PEEK_SVG_USER;
        h += '</div>';
        h += '<div class="peek-chat-list-info">';
        h += '<div class="peek-chat-list-name">' + _peekEsc(ct.name) + '</div>';
        h += '<div class="peek-chat-list-msg">' + _peekEsc(lastMsg).substring(0, 25) + '</div>';
        h += '</div>';
        h += '</div>';
    }

    h += '</div></div>';
    var old = document.getElementById('peekChatListPage');
    if (old) old.remove();
    wrap.insertAdjacentHTML('beforeend', h);
}

/* =================================================================
   Chat 子页 — 对话页
   ================================================================= */

function peekOpenConv(targetId) {
    _peekChatTarget = targetId;
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;
    _renderPeekConv(wrap);
}

function _renderPeekConv(wrap) {
    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return;
    var roleAv = role.avatar || '';
    var roleName = _peekEsc(role.nickname || role.name);

    // 对话目标信息
    var target = { name: '未知', avatar: '' };
    if (_peekChatTarget === '_user') {
        var pa = (typeof getActivePersona === 'function') ? getActivePersona(_peekCurrentChar) : null;
        target = { name: pa ? (pa.name || '你') : '你', avatar: pa ? (pa.avatar || '') : '' };
    } else {
        var tr = (typeof findRole === 'function') ? findRole(_peekChatTarget) : null;
        if (tr) target = { name: tr.nickname || tr.name, avatar: tr.avatar || '' };
    }

    var msgs = _peekGetMessages(_peekCurrentChar, _peekChatTarget);

    var h = '<div class="peek-subpage show" id="peekConvPage">';
    h += '<div class="peek-conv-header">';
    h += '<div class="peek-sub-back" onclick="peekCloseConv()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + _peekEsc(target.name) + '</div>';
    h += '</div>';

    h += '<div class="peek-conv-body" id="peekConvBody">';
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var isSelf = m.from === 'self';
        h += '<div class="peek-msg-row ' + (isSelf ? 'self' : '') + '">';
        h += '<div class="peek-msg-av">';
        if (isSelf && roleAv) h += '<img src="' + roleAv + '">';
        else if (!isSelf && target.avatar) h += '<img src="' + target.avatar + '">';
        h += '</div>';
        h += '<div style="max-width:70%">';
        h += '<div class="peek-msg-bubble">' + _peekEsc(m.text) + '</div>';
        if (m.proxy) h += '<div class="peek-msg-proxy-tag">✦ 你帮TA说的</div>';
        h += '</div>';
        h += '</div>';
    }
    if (msgs.length === 0) {
        h += '<div class="peek-msg-time-divider">暂无消息</div>';
    }
    h += '</div>';

    // 输入栏
    h += '<div class="peek-conv-input-row">';
    h += '<input type="text" class="peek-conv-input" id="peekConvInput" placeholder="帮 ' + roleName + ' 回复…" onkeydown="if(event.key===\'Enter\')peekSendProxy()">';
    h += '<div class="peek-conv-send-btn" onclick="peekSendProxy()"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>';
    h += '</div>';
    h += '</div>';

    var old = document.getElementById('peekConvPage');
    if (old) old.remove();
    wrap.insertAdjacentHTML('beforeend', h);

    var body = document.getElementById('peekConvBody');
    if (body) body.scrollTop = body.scrollHeight;
}

/* ★ user代替char发送消息 */
function peekSendProxy() {
    var inp = document.getElementById('peekConvInput');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;

    // 保存代发消息
    var proxy = _peekLoadProxy(_peekCurrentChar, _peekChatTarget);
    var msg = {
        from: 'self',
        text: text,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        proxy: true,
        ts: Date.now()
    };
    proxy.push(msg);
    _peekSaveProxy(_peekCurrentChar, _peekChatTarget, proxy);

    // 如果是与其他角色的对话，清除缓存让消息加入
    if (_peekChatTarget !== '_user') {
        var cacheKey = _pk(_peekCurrentChar, 'genchat_' + _peekChatTarget);
        try {
            var cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            cached.push(msg);
            localStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch (e) { }
    }

    // 如果是user对话，也同步到主系统（char知道你帮TA回了）
    if (_peekChatTarget === '_user') {
        var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
        if (role) {
            if (!role.msgs) role.msgs = [];
            role.msgs.push({
                from: 'other', // 在主系统中 other=char说的
                text: text,
                time: msg.time,
                peekProxy: true // 标记是偷偷看代发的
            });
            role.lastMsg = text;
            role.lastTime = Date.now();
            role.lastTimeStr = msg.time;
            if (typeof saveChatRoles === 'function') saveChatRoles();
        }
    }

    inp.value = '';
    var wrap = document.getElementById('peekPhoneWrap');
    if (wrap) _renderPeekConv(wrap);
}

function peekCloseConv() {
    var p = document.getElementById('peekConvPage');
    if (p) p.remove();
    _peekChatTarget = null;
}

function peekCloseSub() {
    var ids = ['peekChatListPage', 'peekForumPage', 'peekMemoPage', 'peekMemoEditor', 'peekCalendarPage'];
    for (var i = 0; i < ids.length; i++) {
        var p = document.getElementById(ids[i]);
        if (p) p.remove();
    }
}

/* =================================================================
   论坛子页
   ================================================================= */

function peekOpenForum() {
    _peekForumTab = 'posts';
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;
    _renderPeekForum(wrap);
}

function _renderPeekForum(wrap) {
    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return;
    var dn = _peekEsc(role.nickname || role.name);

    var h = '<div class="peek-subpage show" id="peekForumPage">';
    h += '<div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="peekCloseSub()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的论坛</div>';
    h += '</div>';

    h += '<div class="peek-forum-tabs">';
    h += '<div class="peek-forum-tab ' + (_peekForumTab === 'posts' ? 'active' : '') + '" onclick="peekSwitchForum(\'posts\')">TA的帖子</div>';
    h += '<div class="peek-forum-tab ' + (_peekForumTab === 'recommend' ? 'active' : '') + '" onclick="peekSwitchForum(\'recommend\')">推荐</div>';
    h += '<div class="peek-forum-tab ' + (_peekForumTab === 'profile' ? 'active' : '') + '" onclick="peekSwitchForum(\'profile\')">个人主页</div>';
    h += '</div>';

    h += '<div class="peek-forum-body" id="peekForumBody">';
    h += _renderPeekForumTab();
    h += '</div></div>';

    var old = document.getElementById('peekForumPage');
    if (old) old.remove();
    wrap.insertAdjacentHTML('beforeend', h);
}

function peekSwitchForum(tab) {
    _peekForumTab = tab;
    var body = document.getElementById('peekForumBody');
    if (body) body.innerHTML = _renderPeekForumTab();
    var tabs = document.querySelectorAll('.peek-forum-tab');
    var names = { posts: 'TA的帖子', recommend: '推荐', profile: '个人主页' };
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].textContent === names[tab]);
    }
}

function _renderPeekForumTab() {
    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return '';
    var dn = _peekEsc(role.nickname || role.name);
    var h = '';

    if (_peekForumTab === 'posts') {
        // ★ 从主论坛同步char发过的帖子
        var posts = _peekGetForumPosts(_peekCurrentChar);
        if (posts.length === 0) {
            h += '<div style="text-align:center;color:rgba(50,40,55,0.25);font-size:12px;padding:40px 0">' + dn + ' 还没有在论坛发过帖子</div>';
        }
        for (var i = 0; i < posts.length; i++) {
            var p = posts[i];
            h += '<div class="peek-forum-post">';
            h += '<div class="peek-forum-post-head">';
            h += '<div class="peek-forum-post-av">';
            if (role.avatar) h += '<img src="' + role.avatar + '">';
            h += '</div>';
            h += '<div class="peek-forum-post-name">' + dn + '</div>';
            h += '<div class="peek-forum-post-time">' + (p.timeStr || new Date(p.ts || p.time || 0).toLocaleDateString('zh-CN')) + '</div>';
            h += '</div>';
            h += '<div class="peek-forum-post-text">' + _peekEsc(p.text || p.content || '') + '</div>';
            if (p.image || p.img) h += '<img class="peek-forum-post-img" src="' + (p.image || p.img) + '">';
            h += '</div>';
        }
    } else if (_peekForumTab === 'recommend') {
        var tips = [
            { u: '小薯条', t: '今天天气好好呀，想出去走走~' },
            { u: '奶茶控', t: '新发现一家神仙奶茶店！🧋' },
            { u: '追番人', t: '这部番太好看了根本停不下来！' },
            { u: '健身达人', t: '连续30天打卡成功！💪' },
            { u: '摸鱼王', t: '上班偷偷刷手机中…嘘🤫' },
            { u: '猫猫头', t: '今天我家猫又拆家了 🐱' },
            { u: '美食家', t: '自己做的蛋糕！虽然有点丑但好吃🎂' },
            { u: '旅行者', t: '分享一下昨天的日落🌅' },
        ];
        h += '<div style="text-align:right;margin-bottom:10px"><div style="display:inline-block;padding:4px 12px;border-radius:12px;background:rgba(90,127,212,0.1);color:#5b7fd4;font-size:10px;cursor:pointer" onclick="peekSwitchForum(\'recommend\')">🔄 换一批</div></div>';
        tips.sort(function () { return Math.random() - 0.5; });
        var cnt = 3 + Math.floor(Math.random() * 3);
        for (var j = 0; j < Math.min(cnt, tips.length); j++) {
            h += '<div class="peek-forum-post">';
            h += '<div class="peek-forum-post-head">';
            h += '<div class="peek-forum-post-av"></div>';
            h += '<div class="peek-forum-post-name">' + _peekEsc(tips[j].u) + '</div>';
            h += '<div class="peek-forum-post-time">刚刚</div>';
            h += '</div>';
            h += '<div class="peek-forum-post-text">' + _peekEsc(tips[j].t) + '</div>';
            h += '</div>';
        }
    } else if (_peekForumTab === 'profile') {
        // 个人主页
        var posts = _peekGetForumPosts(_peekCurrentChar);
        h += '<div style="text-align:center;padding:20px 0">';
        h += '<div style="width:56px;height:56px;border-radius:50%;overflow:hidden;margin:0 auto 8px;background:rgba(0,0,0,0.04)">';
        if (role.avatar) h += '<img src="' + role.avatar + '" style="width:100%;height:100%;object-fit:cover">';
        h += '</div>';
        h += '<div style="font-size:15px;font-weight:700;color:rgba(50,40,55,0.85)">' + dn + '</div>';
        h += '<div style="font-size:11px;color:rgba(50,40,55,0.35);margin-top:2px">' + _peekEsc(role.name) + '</div>';
        var bio = role.detail ? role.detail.substring(0, 60) : '暂无简介';
        h += '<div style="font-size:11px;color:rgba(50,40,55,0.4);margin-top:6px;padding:0 20px">' + _peekEsc(bio) + '</div>';
        h += '</div>';
        h += '<div style="display:flex;justify-content:center;gap:30px;padding:10px 0;border-top:1px solid rgba(0,0,0,0.04);border-bottom:1px solid rgba(0,0,0,0.04);margin-bottom:12px">';
        h += '<div style="text-align:center"><div style="font-size:16px;font-weight:700;color:rgba(50,40,55,0.8)">' + posts.length + '</div><div style="font-size:9px;color:rgba(50,40,55,0.3)">帖子</div></div>';
        h += '</div>';
        if (posts.length === 0) {
            h += '<div style="text-align:center;color:rgba(50,40,55,0.2);font-size:11px;padding:20px 0">暂无帖子</div>';
        }
        for (var k = 0; k < posts.length; k++) {
            h += '<div class="peek-forum-post">';
            h += '<div class="peek-forum-post-text">' + _peekEsc(posts[k].text || posts[k].content || '') + '</div>';
            h += '<div style="font-size:9px;color:rgba(50,40,55,0.2);margin-top:4px">' + new Date(posts[k].ts || posts[k].time || 0).toLocaleString('zh-CN') + '</div>';
            h += '</div>';
        }
    }
    return h;
}

/* =================================================================
   备忘录子页
   ================================================================= */

function peekOpenMemo() {
    _peekEditingMemoIdx = -1;
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;
    _renderPeekMemoList(wrap);
}

function _renderPeekMemoList(wrap) {
    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return;
    var dn = _peekEsc(role.nickname || role.name);
    var memos = _peekAutoGenMemos(_peekCurrentChar);

    var h = '<div class="peek-subpage show" id="peekMemoPage">';
    h += '<div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="peekCloseSub()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的备忘录</div>';
    h += '<div style="margin-left:auto;padding:4px 12px;border-radius:12px;background:rgba(255,200,100,0.2);color:#c49530;font-size:11px;font-weight:600;cursor:pointer" onclick="peekNewMemo()">+ 新建</div>';
    h += '</div>';
    h += '<div class="peek-sub-body">';

    if (memos.length === 0) {
        h += '<div style="text-align:center;color:rgba(50,40,55,0.25);font-size:12px;padding:40px 0">暂无备忘录</div>';
    }
    for (var i = 0; i < memos.length; i++) {
        var m = memos[i];
        h += '<div class="peek-memo-item" onclick="peekEditMemo(' + i + ')">';
        h += '<div class="peek-memo-title">' + _peekEsc(m.title || '无标题');
        if (m.pin) h += '<span class="peek-memo-pin">📌 置顶</span>';
        h += '</div>';
        h += '<div class="peek-memo-text">' + _peekEsc(m.text || '').replace(/\n/g, '<br>') + '</div>';
        h += '<div class="peek-memo-date">' + new Date(m.ts || 0).toLocaleDateString('zh-CN') + '</div>';
        h += '</div>';
    }

    h += '</div></div>';
    var old = document.getElementById('peekMemoPage');
    if (old) old.remove();
    wrap.insertAdjacentHTML('beforeend', h);
}

function peekNewMemo() {
    _peekEditingMemoIdx = -1;
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;
    _renderPeekMemoEditor(wrap, '', '');
}

function peekEditMemo(idx) {
    _peekEditingMemoIdx = idx;
    var memos = _peekLoadMemos(_peekCurrentChar);
    var m = memos[idx] || { title: '', text: '' };
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;
    _renderPeekMemoEditor(wrap, m.title || '', m.text || '');
}

function _renderPeekMemoEditor(wrap, title, text) {
    var h = '<div class="peek-memo-editor show" id="peekMemoEditor">';
    h += '<div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="peekCloseMemoEditor()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">编辑备忘</div>';
    h += '<div style="display:flex;gap:8px;margin-left:auto">';
    if (_peekEditingMemoIdx >= 0) {
        h += '<div style="padding:4px 10px;border-radius:12px;background:rgba(220,60,60,0.1);color:#e05050;font-size:11px;cursor:pointer" onclick="peekDeleteMemo()">删除</div>';
    }
    h += '<div style="padding:4px 12px;border-radius:12px;background:rgba(255,200,100,0.2);color:#c49530;font-size:11px;font-weight:600;cursor:pointer" onclick="peekSaveMemo()">保存</div>';
    h += '</div></div>';
    h += '<div style="flex:1;padding:0 16px 24px;display:flex;flex-direction:column">';
    h += '<input type="text" class="peek-memo-edit-title" id="peekMemoTitleInput" placeholder="标题" value="' + _peekEsc(title) + '">';
    h += '<textarea class="peek-memo-edit-body" id="peekMemoTextInput" placeholder="记录重要的事情…">' + _peekEsc(text) + '</textarea>';
    h += '</div></div>';

    var old = document.getElementById('peekMemoEditor');
    if (old) old.remove();
    wrap.insertAdjacentHTML('beforeend', h);
}

function peekSaveMemo() {
    var ti = document.getElementById('peekMemoTitleInput');
    var te = document.getElementById('peekMemoTextInput');
    var title = ti ? ti.value.trim() : '';
    var text = te ? te.value.trim() : '';
    if (!title && !text) { if (typeof showToast === 'function') showToast('请输入内容'); return; }

    var memos = _peekLoadMemos(_peekCurrentChar);
    if (_peekEditingMemoIdx >= 0 && _peekEditingMemoIdx < memos.length) {
        memos[_peekEditingMemoIdx].title = title;
        memos[_peekEditingMemoIdx].text = text;
        memos[_peekEditingMemoIdx].ts = Date.now();
    } else {
        memos.unshift({ title: title, text: text, pin: false, ts: Date.now() });
    }
    _peekSaveMemos(_peekCurrentChar, memos);
    peekCloseMemoEditor();
    var wrap = document.getElementById('peekPhoneWrap');
    if (wrap) _renderPeekMemoList(wrap);
}

function peekDeleteMemo() {
    if (!confirm('删除这条备忘？')) return;
    var memos = _peekLoadMemos(_peekCurrentChar);
    if (_peekEditingMemoIdx >= 0 && _peekEditingMemoIdx < memos.length) {
        memos.splice(_peekEditingMemoIdx, 1);
        _peekSaveMemos(_peekCurrentChar, memos);
    }
    peekCloseMemoEditor();
    var wrap = document.getElementById('peekPhoneWrap');
    if (wrap) _renderPeekMemoList(wrap);
}

function peekCloseMemoEditor() {
    var ed = document.getElementById('peekMemoEditor');
    if (ed) ed.remove();
}

/* =================================================================
   日历子页
   ================================================================= */

function peekOpenCalendar() {
    var now = new Date();
    _peekCalYear = now.getFullYear();
    _peekCalMonth = now.getMonth();
    _peekCalSelectedDay = '';
    var wrap = document.getElementById('peekPhoneWrap');
    if (!wrap) return;
    _renderPeekCalendar(wrap);
}

function _renderPeekCalendar(wrap) {
    var role = (typeof findRole === 'function') ? findRole(_peekCurrentChar) : null;
    if (!role) return;
    var dn = _peekEsc(role.nickname || role.name);
    var events = _peekAutoGenEvents(_peekCurrentChar);

    var h = '<div class="peek-subpage show" id="peekCalendarPage">';
    h += '<div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="peekCloseSub()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的日历</div>';
    h += '</div>';
    h += '<div class="peek-sub-body" id="peekCalBody">';
    h += _renderPeekCalInner(events);
    h += '</div></div>';

    var old = document.getElementById('peekCalendarPage');
    if (old) old.remove();
    wrap.insertAdjacentHTML('beforeend', h);
}

function _renderPeekCalInner(events) {
    var h = '';
    var months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    h += '<div class="peek-cal-nav">';
    h += '<div class="peek-cal-nav-btn" onclick="peekCalPrev()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-cal-month-title">' + _peekCalYear + '年 ' + months[_peekCalMonth] + '</div>';
    h += '<div class="peek-cal-nav-btn" onclick="peekCalNext()"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></div>';
    h += '</div>';

    h += '<div class="peek-cal-weekdays">';
    for (var w = 0; w < 7; w++) h += '<div>' + weekdays[w] + '</div>';
    h += '</div>';

    var firstDay = new Date(_peekCalYear, _peekCalMonth, 1).getDay();
    var daysInMonth = new Date(_peekCalYear, _peekCalMonth + 1, 0).getDate();
    var prevDays = new Date(_peekCalYear, _peekCalMonth, 0).getDate();
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

    h += '<div class="peek-cal-days">';
    for (var pd = firstDay - 1; pd >= 0; pd--) {
        h += '<div class="peek-cal-day other-month">' + (prevDays - pd) + '</div>';
    }
    for (var d = 1; d <= daysInMonth; d++) {
        var dk = _peekCalYear + '-' + ('0' + (_peekCalMonth + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
        var cls = 'peek-cal-day';
        if (dk === todayStr) cls += ' today';
        if (events[dk] && events[dk].length > 0) cls += ' has-event';
        if (dk === _peekCalSelectedDay) cls += ' selected';
        h += '<div class="' + cls + '" onclick="peekSelectDay(\'' + dk + '\')">' + d + '</div>';
    }
    var total = firstDay + daysInMonth;
    var rem = (7 - total % 7) % 7;
    for (var nd = 1; nd <= rem; nd++) {
        h += '<div class="peek-cal-day other-month">' + nd + '</div>';
    }
    h += '</div>';

    if (_peekCalSelectedDay) {
        var dayEv = events[_peekCalSelectedDay] || [];
        h += '<div class="peek-cal-events">';
        h += '<div style="font-size:12px;font-weight:600;color:rgba(50,40,55,0.7);margin-bottom:8px">📌 ' + _peekCalSelectedDay + '</div>';
        if (dayEv.length === 0) {
            h += '<div style="font-size:11px;color:rgba(50,40,55,0.25);padding:10px 0">这天没有事件</div>';
        }
        for (var e = 0; e < dayEv.length; e++) {
            h += '<div class="peek-cal-event-item">';
            h += '<div class="peek-cal-event-dot"></div>';
            h += '<div class="peek-cal-event-text">' + _peekEsc(dayEv[e]) + '</div>';
            h += '<div class="peek-cal-event-del" onclick="peekDelEvent(\'' + _peekCalSelectedDay + '\',' + e + ')">✕</div>';
            h += '</div>';
        }
        h += '<div class="peek-cal-add-wrap">';
        h += '<input type="text" class="peek-cal-add-input" id="peekCalEventInput" placeholder="添加事件…" onkeydown="if(event.key===\'Enter\')peekAddEvent()">';
        h += '<div class="peek-cal-add-btn" onclick="peekAddEvent()">添加</div>';
        h += '</div>';
        h += '</div>';
    }

    return h;
}

function peekSelectDay(dk) {
    _peekCalSelectedDay = dk;
    var events = _peekLoadEvents(_peekCurrentChar);
    var body = document.getElementById('peekCalBody');
    if (body) body.innerHTML = _renderPeekCalInner(events);
}
function peekCalPrev() {
    _peekCalMonth--;
    if (_peekCalMonth < 0) { _peekCalMonth = 11; _peekCalYear--; }
    var events = _peekLoadEvents(_peekCurrentChar);
    var body = document.getElementById('peekCalBody');
    if (body) body.innerHTML = _renderPeekCalInner(events);
}
function peekCalNext() {
    _peekCalMonth++;
    if (_peekCalMonth > 11) { _peekCalMonth = 0; _peekCalYear++; }
    var events = _peekLoadEvents(_peekCurrentChar);
    var body = document.getElementById('peekCalBody');
    if (body) body.innerHTML = _renderPeekCalInner(events);
}
function peekAddEvent() {
    var inp = document.getElementById('peekCalEventInput');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text || !_peekCalSelectedDay) return;
    var events = _peekLoadEvents(_peekCurrentChar);
    if (!events[_peekCalSelectedDay]) events[_peekCalSelectedDay] = [];
    events[_peekCalSelectedDay].push(text);
    _peekSaveEvents(_peekCurrentChar, events);
    inp.value = '';
    var body = document.getElementById('peekCalBody');
    if (body) body.innerHTML = _renderPeekCalInner(events);
}
function peekDelEvent(dk, idx) {
    var events = _peekLoadEvents(_peekCurrentChar);
    if (events[dk] && idx >= 0 && idx < events[dk].length) {
        events[dk].splice(idx, 1);
        if (events[dk].length === 0) delete events[dk];
        _peekSaveEvents(_peekCurrentChar, events);
    }
    var body = document.getElementById('peekCalBody');
    if (body) body.innerHTML = _renderPeekCalInner(events);
}
