/* ============================================
   蛋薯机 DanShu Pro v2 — social.js
   真人社交模块（独立文件）
   ============================================ */

var SOCIAL_API_URL = 'https://danshu-social.39248729q8.workers.dev/api';
var SOCIAL_KEY = 'ds_social_profile';
var SOCIAL_FRIENDS_KEY = 'ds_social_friends';
var SOCIAL_MSGS_KEY = 'ds_social_msgs';

var _socialProfile = null;
var _socialFriends = [];
var _socialInbox = {};
var _socialRequests = [];
var _socialPollTimer = null;
var _socialCurrentChat = null;

/* ========== 初始化 ========== */
function socialInit() {
    try { _socialProfile = JSON.parse(localStorage.getItem(SOCIAL_KEY)); } catch (e) { _socialProfile = null; }
    try { _socialFriends = JSON.parse(localStorage.getItem(SOCIAL_FRIENDS_KEY) || '[]'); } catch (e) { _socialFriends = []; }
    try { _socialInbox = JSON.parse(localStorage.getItem(SOCIAL_MSGS_KEY) || '{}'); } catch (e) { _socialInbox = {}; }

    if (!_socialProfile || !_socialProfile.id) {
        _socialProfile = {
            id: generateSocialId(),
            nickname: '薯薯用户',
            avatar: '',
            bio: '',
            createdAt: Date.now()
        };
        saveSocialProfile();
    }

    if (SOCIAL_API_URL) {
        socialStartPolling();
    }
}

function saveSocialProfile() {
    try { localStorage.setItem(SOCIAL_KEY, JSON.stringify(_socialProfile)); } catch (e) { }
}
function saveSocialFriends() {
    try { localStorage.setItem(SOCIAL_FRIENDS_KEY, JSON.stringify(_socialFriends)); } catch (e) { }
}
function saveSocialInbox() {
    try { localStorage.setItem(SOCIAL_MSGS_KEY, JSON.stringify(_socialInbox)); } catch (e) { }
}

/* ========== ID 生成 ========== */
function generateSocialId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var id = 'DS_';
    for (var i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/* ========== 网络请求 ========== */
function socialFetch(endpoint, method, data, callback) {
    if (!SOCIAL_API_URL) {
        if (callback) callback({ error: '未配置服务器地址' });
        return;
    }
    var url = SOCIAL_API_URL.replace(/\/+$/, '') + endpoint;
    var opts = {
        method: method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Social-Id': _socialProfile ? _socialProfile.id : ''
        }
    };
    if (data && method !== 'GET') {
        opts.body = JSON.stringify(data);
    }
    fetch(url, opts)
        .then(function (res) { return res.json(); })
        .then(function (json) { if (callback) callback(json); })
        .catch(function (err) { if (callback) callback({ error: err.message }); });
}

function socialRegister(callback) {
    socialFetch('/register', 'POST', {
        id: _socialProfile.id,
        nickname: _socialProfile.nickname,
        avatar: _socialProfile.avatar,
        bio: _socialProfile.bio
    }, function (res) {
        if (res && res.success && res.id && res.id !== _socialProfile.id) {
            _socialProfile.id = res.id;
            saveSocialProfile();
        }
        if (callback) callback(res);
    });
}

function socialSearchUser(targetId, callback) {
    socialFetch('/user/' + encodeURIComponent(targetId), 'GET', null, callback);
}

function socialSendFriendRequest(targetId, callback) {
    socialFetch('/friend/request', 'POST', {
        from: _socialProfile.id,
        to: targetId,
        fromNickname: _socialProfile.nickname,
        fromAvatar: _socialProfile.avatar
    }, callback);
}

function socialAcceptFriend(requestId, callback) {
    socialFetch('/friend/accept', 'POST', {
        requestId: requestId,
        userId: _socialProfile.id
    }, callback);
}

function socialRejectFriend(requestId, callback) {
    socialFetch('/friend/reject', 'POST', {
        requestId: requestId,
        userId: _socialProfile.id
    }, callback);
}

function socialSendMessage(toId, text, type, extra) {
    var msg = {
        from: _socialProfile.id,
        to: toId,
        text: text,
        type: type || 'text',
        extra: extra || null,
        time: Date.now(),
        timeStr: formatSocialTime(new Date())
    };
    if (!_socialInbox[toId]) _socialInbox[toId] = [];
    _socialInbox[toId].push(msg);
    saveSocialInbox();
    socialFetch('/message/send', 'POST', msg, function (res) {
        if (res && res.error) {
            if (typeof showToast === 'function') showToast('发送失败: ' + res.error);
        }
    });
    return msg;
}

function socialPullMessages(callback) {
    socialFetch('/message/pull?userId=' + encodeURIComponent(_socialProfile.id), 'GET', null, function (res) {
        if (res && res.messages && res.messages.length) {
            for (var i = 0; i < res.messages.length; i++) {
                var msg = res.messages[i];
                var fromId = msg.from;
                if (!_socialInbox[fromId]) _socialInbox[fromId] = [];
                _socialInbox[fromId].push(msg);
            }
            saveSocialInbox();
            for (var fi = 0; fi < _socialFriends.length; fi++) {
                var fid = _socialFriends[fi].id;
                var fmsgs = _socialInbox[fid];
                if (fmsgs && fmsgs.length) {
                    _socialFriends[fi].lastMsg = fmsgs[fmsgs.length - 1].text;
                    _socialFriends[fi].lastTime = fmsgs[fmsgs.length - 1].time;
                    _socialFriends[fi].unread = (_socialFriends[fi].unread || 0) + 1;
                }
            }
            saveSocialFriends();
        }
        if (callback) callback(res);
    });
}

function socialPullRequests(callback) {
    socialFetch('/friend/requests?userId=' + encodeURIComponent(_socialProfile.id), 'GET', null, function (res) {
        if (res && res.requests) _socialRequests = res.requests;
        if (callback) callback(res);
    });
}

function socialStartPolling() {
    if (_socialPollTimer) clearInterval(_socialPollTimer);
    _socialPollTimer = setInterval(function () {
        socialPullMessages(function (res) {
            if (_socialCurrentChat && res && res.messages) {
                var hasNew = false;
                for (var i = 0; i < res.messages.length; i++) {
                    if (res.messages[i].from === _socialCurrentChat) { hasNew = true; break; }
                }
                if (hasNew) renderSocialChatMsgs(_socialCurrentChat);
            }
        });
        socialPullRequests();
    }, 5000);
}

function formatSocialTime(d) {
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' +
        (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

/* ================================================
   ========== UI: 「我」页社交ID卡片 ==========
   ================================================ */
function renderSocialIdCard() {
    if (!_socialProfile) socialInit();
    var h = '';
    h += '<div class="social-id-card" onclick="openSocialProfilePage()">';
    h += '<div class="social-id-card-icon">';
    h += '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    h += '</div>';
    h += '<div class="social-id-card-info">';
    h += '<div class="social-id-card-label">我的社交 ID</div>';
    h += '<div class="social-id-card-value">' + (_socialProfile.id || '未注册') + '</div>';
    h += '</div>';
    h += '<div class="social-id-card-arrow">';
    h += '<svg viewBox="0 0 24 24" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>';
    h += '</div>';
    h += '</div>';
    return h;
}

/* ========== 社交个人资料设置页 ========== */
function openSocialProfilePage() {
    if (!_socialProfile) socialInit();

    // 使用 chatProfilePage 容器
    var page = document.getElementById('chatProfilePage');
    var body = document.getElementById('chatProfileBody');
    if (!page || !body) return;

    var h = '';

    // 头像
    h += '<div class="social-profile-section">';
    h += '<div class="social-profile-avatar" onclick="socialPickAvatar()">';
    if (_socialProfile.avatar) {
        h += '<img src="' + _socialProfile.avatar + '">';
    } else {
        h += '<svg viewBox="0 0 24 24" width="32" height="32"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
    h += '<div class="social-avatar-edit-hint">点击更换</div>';
    h += '</div>';

    // ID 展示
    h += '<div class="social-profile-id-row">';
    h += '<span class="social-profile-id-label">ID</span>';
    h += '<span class="social-profile-id-value">' + _socialProfile.id + '</span>';
    h += '<div class="social-copy-btn" onclick="event.stopPropagation();socialCopyId()">复制</div>';
    h += '</div>';
    h += '</div>';

    // 表单
    h += '<div class="social-profile-form">';

    h += '<div class="social-form-group">';
    h += '<label>昵称（别人搜到你时显示）</label>';
    h += '<input type="text" id="socialNickname" class="social-input" value="' + esc(_socialProfile.nickname || '') + '" placeholder="输入昵称">';
    h += '</div>';

    h += '<div class="social-form-group">';
    h += '<label>头像链接</label>';
    h += '<input type="text" id="socialAvatarUrl" class="social-input" value="' + esc(_socialProfile.avatar || '') + '" placeholder="粘贴头像图片URL">';
    h += '</div>';

    h += '<div class="social-form-group">';
    h += '<label>个性签名</label>';
    h += '<input type="text" id="socialBio" class="social-input" value="' + esc(_socialProfile.bio || '') + '" placeholder="写点什么...">';
    h += '</div>';

    h += '<div class="social-save-btn" onclick="saveSocialProfileForm()">保存资料</div>';
    h += '</div>';

    // 好友请求
    if (_socialRequests && _socialRequests.length) {
        h += '<div class="social-section-card">';
        h += '<div class="social-section-title">好友请求 (' + _socialRequests.length + ')</div>';
        for (var i = 0; i < _socialRequests.length; i++) {
            var req = _socialRequests[i];
            h += '<div class="social-request-item">';
            h += '<div class="social-request-avatar">';
            if (req.fromAvatar) {
                h += '<img src="' + req.fromAvatar + '">';
            } else {
                h += '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            }
            h += '</div>';
            h += '<div class="social-request-info">';
            h += '<div class="social-request-name">' + esc(req.fromNickname || req.from) + '</div>';
            h += '<div class="social-request-id">' + req.from + '</div>';
            h += '</div>';
            h += '<div class="social-request-actions">';
            h += '<div class="social-accept-btn" onclick="event.stopPropagation();socialDoAccept(\'' + req.id + '\',\'' + req.from + '\',\'' + esc(req.fromNickname || '').replace(/'/g, "\\'") + '\',\'' + esc(req.fromAvatar || '').replace(/'/g, "\\'") + '\')">同意</div>';
            h += '<div class="social-reject-btn" onclick="event.stopPropagation();socialDoReject(\'' + req.id + '\')">拒绝</div>';
            h += '</div>';
            h += '</div>';
        }
        h += '</div>';
    }

    // 服务器状态
    h += '<div class="social-server-status">';
    if (SOCIAL_API_URL) {
        h += '<span class="social-status-dot online"></span> 服务器已连接';
    } else {
        h += '<span class="social-status-dot offline"></span> 未配置服务器';
        h += '<div class="social-server-hint">需要后端服务器才能和真人聊天<br>请在 social.js 中配置 SOCIAL_API_URL</div>';
    }
    h += '</div>';

    body.innerHTML = h;
    page.classList.add('show');
}

function socialPickAvatar() {
    // 利用已有的 fileInput
    var inp = document.getElementById('fileInput');
    if (!inp) return;
    inp.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            _socialProfile.avatar = ev.target.result;
            saveSocialProfile();
            // 同时更新输入框
            var urlInp = document.getElementById('socialAvatarUrl');
            if (urlInp) urlInp.value = ev.target.result;
            // 刷新页面
            openSocialProfilePage();
        };
        reader.readAsDataURL(file);
        inp.onchange = null;
    };
    inp.click();
}

function saveSocialProfileForm() {
    var nn = document.getElementById('socialNickname');
    var av = document.getElementById('socialAvatarUrl');
    var bio = document.getElementById('socialBio');
    if (nn) _socialProfile.nickname = nn.value.trim() || '薯薯用户';
    if (av) _socialProfile.avatar = av.value.trim();
    if (bio) _socialProfile.bio = bio.value.trim();
    saveSocialProfile();

    if (SOCIAL_API_URL) {
        socialRegister(function (res) {
            if (res && res.success) {
                if (typeof showToast === 'function') showToast('资料已同步到服务器');
            } else {
                if (typeof showToast === 'function') showToast('本地已保存');
            }
        });
    } else {
        if (typeof showToast === 'function') showToast('已保存');
    }
}

function socialCopyId() {
    if (!_socialProfile) return;
    try {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(_socialProfile.id);
        } else {
            var t = document.createElement('textarea');
            t.value = _socialProfile.id;
            document.body.appendChild(t);
            t.select();
            document.execCommand('copy');
            document.body.removeChild(t);
        }
        if (typeof showToast === 'function') showToast('已复制: ' + _socialProfile.id);
    } catch (e) {
        if (typeof showToast === 'function') showToast(_socialProfile.id);
    }
}

/* ================================================
   ========== UI: 联系人页「添加好友」弹窗 ==========
   用全屏覆盖层，不依赖 chatConversation
   ================================================ */
function openSocialSearch() {
    // 移除旧的（如果有）
    closeSocialSearch();

    var overlay = document.querySelector('.chat-app-overlay.show');
    if (!overlay) return;

    var div = document.createElement('div');
    div.className = 'social-search-overlay';
    div.id = 'socialSearchOverlay';

    var h = '';
    // 顶栏
    h += '<div class="social-search-header">';
    h += '<div class="social-search-back" onclick="closeSocialSearch()">';
    h += '<svg viewBox="0 0 24 24" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>';
    h += '</div>';
    h += '<div class="social-search-title">添加好友</div>';
    h += '<div style="width:36px"></div>';
    h += '</div>';

    // 我的 ID
    h += '<div class="social-my-id-banner">';
    h += '<div class="social-my-id-label">我的 ID</div>';
    h += '<div class="social-my-id-value">' + _socialProfile.id + '</div>';
    h += '<div class="social-copy-btn" onclick="socialCopyId()">复制</div>';
    h += '</div>';

    // 搜索框
    h += '<div class="social-search-box">';
    h += '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
    h += '<input type="text" id="socialSearchInput" class="social-input" placeholder="输入对方的 ID 号码..." maxlength="9" onkeydown="if(event.key===\'Enter\'){doSocialSearch();event.preventDefault();}">';
    h += '<div class="social-search-go" onclick="doSocialSearch()">搜索</div>';
    h += '</div>';

    // 结果区
    h += '<div class="social-search-result" id="socialSearchResult"></div>';

    div.innerHTML = h;
    overlay.appendChild(div);
}

function closeSocialSearch() {
    var el = document.getElementById('socialSearchOverlay');
    if (el) el.remove();
}

function doSocialSearch() {
    var inp = document.getElementById('socialSearchInput');
    if (!inp) return;
    var targetId = inp.value.trim().toUpperCase();
    if (!targetId) { if (typeof showToast === 'function') showToast('请输入 ID'); return; }

    if (targetId === _socialProfile.id) {
        if (typeof showToast === 'function') showToast('不能添加自己哦');
        return;
    }

    for (var i = 0; i < _socialFriends.length; i++) {
        if (_socialFriends[i].id === targetId) {
            if (typeof showToast === 'function') showToast('对方已经是你的好友了');
            return;
        }
    }

    var result = document.getElementById('socialSearchResult');
    if (result) result.innerHTML = '<div class="social-searching">搜索中...</div>';

    if (!SOCIAL_API_URL) {
        if (result) result.innerHTML = '<div class="social-not-found">未配置服务器<br><span>请先在 social.js 中设置 SOCIAL_API_URL</span></div>';
        return;
    }

    socialSearchUser(targetId, function (res) {
        var result = document.getElementById('socialSearchResult');
        if (!result) return;
        if (res && res.user) {
            var u = res.user;
            var rh = '';
            rh += '<div class="social-user-card">';
            rh += '<div class="social-user-avatar">';
            if (u.avatar) {
                rh += '<img src="' + u.avatar + '">';
            } else {
                rh += '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            }
            rh += '</div>';
            rh += '<div class="social-user-info">';
            rh += '<div class="social-user-name">' + esc(u.nickname || '未知用户') + '</div>';
            rh += '<div class="social-user-id">' + u.id + '</div>';
            if (u.bio) rh += '<div class="social-user-bio">' + esc(u.bio) + '</div>';
            rh += '</div>';
            rh += '<div class="social-add-btn" onclick="doSendFriendRequest(\'' + u.id + '\')">添加好友</div>';
            rh += '</div>';
            result.innerHTML = rh;
        } else {
            result.innerHTML = '<div class="social-not-found">未找到该用户<br><span>请检查 ID 是否正确</span></div>';
        }
    });
}

function doSendFriendRequest(targetId) {
    socialSendFriendRequest(targetId, function (res) {
        if (res && res.success) {
            if (typeof showToast === 'function') showToast('好友请求已发送！');
            closeSocialSearch();
        } else {
            if (typeof showToast === 'function') showToast(res && res.error ? res.error : '发送失败');
        }
    });
}

/* ========== 同意/拒绝好友 ========== */
function socialDoAccept(reqId, fromId, fromNickname, fromAvatar) {
    socialAcceptFriend(reqId, function (res) {
        if (res && res.success) {
            _socialFriends.push({
                id: fromId,
                nickname: fromNickname || fromId,
                avatar: fromAvatar || '',
                addedAt: Date.now(),
                lastMsg: '',
                lastTime: 0,
                unread: 0
            });
            saveSocialFriends();
            for (var i = _socialRequests.length - 1; i >= 0; i--) {
                if (_socialRequests[i].id === reqId) { _socialRequests.splice(i, 1); break; }
            }
            if (typeof showToast === 'function') showToast('已添加好友：' + (fromNickname || fromId));
            openSocialProfilePage();
        } else {
            if (typeof showToast === 'function') showToast('操作失败');
        }
    });
}

function socialDoReject(reqId) {
    socialRejectFriend(reqId, function (res) {
        for (var i = _socialRequests.length - 1; i >= 0; i--) {
            if (_socialRequests[i].id === reqId) { _socialRequests.splice(i, 1); break; }
        }
        if (typeof showToast === 'function') showToast('已拒绝');
        openSocialProfilePage();
    });
}

/* ================================================
   ========== UI: 联系人页好友列表 ==========
   ================================================ */
function renderSocialFriendsList() {
    if (!_socialFriends.length) return '';
    var h = '';
    h += '<div class="social-friends-section">';
    h += '<div class="social-section-title">真人好友 (' + _socialFriends.length + ')</div>';
    for (var i = 0; i < _socialFriends.length; i++) {
        var f = _socialFriends[i];
        h += '<div class="chat-contact-item social-friend-item" onclick="openSocialChat(\'' + f.id + '\')">';
        h += '<div class="chat-contact-avatar social-avatar">';
        if (f.avatar) {
            h += '<img src="' + f.avatar + '" alt="">';
        } else {
            h += '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        }
        h += '</div>';
        h += '<div class="chat-contact-info">';
        h += '<div class="chat-contact-name">' + esc(f.nickname || f.id) + '</div>';
        h += '<div class="social-friend-id">' + f.id + '</div>';
        h += '</div>';
        if (f.unread) h += '<div class="social-unread-badge">' + f.unread + '</div>';
        h += '</div>';
    }
    h += '</div>';
    return h;
}

/* ================================================
   ========== UI: 真人对话页 ==========
   利用现有的 chatConversation 容器
   ================================================ */
function openSocialChat(friendId) {
    var friend = null;
    for (var i = 0; i < _socialFriends.length; i++) {
        if (_socialFriends[i].id === friendId) { friend = _socialFriends[i]; break; }
    }
    if (!friend) return;

    _socialCurrentChat = friendId;
    friend.unread = 0;
    saveSocialFriends();

    var conv = document.getElementById('chatConversation');
    if (!conv) return;

    var h = '';
    // 顶栏
    h += '<div class="chat-conv-topbar">';
    h += '<div class="chat-conv-back" onclick="closeSocialChat()">';
    h += '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
    h += '</div>';
    h += '<div class="chat-conv-topbar-center">';
    h += '<div class="chat-conv-name">' + esc(friend.nickname) + '</div>';
    h += '<div class="social-online-hint">真人用户</div>';
    h += '</div>';
    h += '<div style="width:36px"></div>';
    h += '</div>';

    // 消息
    h += '<div class="chat-conv-body" id="socialChatBody">';
    h += renderSocialMessages(friendId);
    h += '</div>';

    // 输入栏
    h += '<div class="chat-conv-bottombar">';
    h += '<div class="chat-conv-input-row">';
    h += '<input type="text" class="chat-conv-input" id="socialChatInput" placeholder="发消息给 ' + esc(friend.nickname) + '..." onkeydown="if(event.key===\'Enter\'){sendSocialMsg();event.preventDefault();}">';
    h += '<div class="chat-conv-action-btn send-btn" onclick="sendSocialMsg()">';
    h += '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    h += '</div>';
    h += '</div></div>';

    conv.innerHTML = h;
    conv.classList.add('show');

    var chatBody = document.getElementById('socialChatBody');
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

function closeSocialChat() {
    _socialCurrentChat = null;
    var conv = document.getElementById('chatConversation');
    if (conv) { conv.innerHTML = ''; conv.classList.remove('show'); }
}

function renderSocialMessages(friendId) {
    var msgs = _socialInbox[friendId] || [];
    if (!msgs.length) {
        return '<div class="social-chat-empty">开始聊天吧 ✨</div>';
    }
    var h = '';
    var SVG_SM = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var isSelf = (m.from === _socialProfile.id);
        h += '<div class="chat-bubble-row' + (isSelf ? ' self' : '') + '">';
        if (!isSelf) {
            var fr = null;
            for (var fi = 0; fi < _socialFriends.length; fi++) {
                if (_socialFriends[fi].id === friendId) { fr = _socialFriends[fi]; break; }
            }
            h += '<div class="chat-bubble-avatar">' + (fr && fr.avatar ? '<img src="' + fr.avatar + '">' : SVG_SM) + '</div>';
        }
        h += '<div class="chat-bubble-content-wrap">';
        h += '<div class="chat-bubble">' + esc(m.text) + '</div>';
        h += '<div class="chat-bubble-time">' + (m.timeStr || '') + '</div>';
        h += '</div>';
        if (isSelf) {
            h += '<div class="chat-bubble-avatar">' + (_socialProfile.avatar ? '<img src="' + _socialProfile.avatar + '">' : SVG_SM) + '</div>';
        }
        h += '</div>';
    }
    return h;
}

function renderSocialChatMsgs(friendId) {
    var body = document.getElementById('socialChatBody');
    if (body) {
        body.innerHTML = renderSocialMessages(friendId);
        body.scrollTop = body.scrollHeight;
    }
}

function sendSocialMsg() {
    if (!_socialCurrentChat) return;
    var inp = document.getElementById('socialChatInput');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;

    socialSendMessage(_socialCurrentChat, text, 'text');
    inp.value = '';

    renderSocialChatMsgs(_socialCurrentChat);

    for (var i = 0; i < _socialFriends.length; i++) {
        if (_socialFriends[i].id === _socialCurrentChat) {
            _socialFriends[i].lastMsg = text;
            _socialFriends[i].lastTime = Date.now();
            break;
        }
    }
    saveSocialFriends();
}

/* ========== 自动初始化 ========== */
socialInit();
