/* ============================================
   Forum 论坛 — Full Feature
   ============================================ */
(function () {

    /* ===== 数据 ===== */
    var _fm = {
        tab: 'home',        // home | follow | me
        view: 'main',       // main | forumDetail | postDetail | createForum | createPost | editProfile | myPosts | myLikes
        forums: [],
        posts: [],
        currentForum: null,
        currentPost: null,
        meTab: 'posts',     // posts | likes
        profile: {
            avatar: '',
            nameEn: 'username',
            nameCn: '用户名',
            bio: 'No bio yet 暂无简介'
        }
    };

    try {
        var saved = localStorage.getItem('_fmData');
        if (saved) {
            var d = JSON.parse(saved);
            if (d.forums) _fm.forums = d.forums;
            if (d.posts) _fm.posts = d.posts;
            if (d.profile) {
                _fm.profile = d.profile;
                if (!_fm.profile.nameEn) _fm.profile.nameEn = 'username';
                if (!_fm.profile.nameCn) _fm.profile.nameCn = '用户名';
            }
        }
    } catch (e) { }

    function _fmSave() {
        try {
            localStorage.setItem('_fmData', JSON.stringify({
                forums: _fm.forums,
                posts: _fm.posts,
                profile: _fm.profile
            }));
        } catch (e) { }
    }

    function _fmE(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _fmId() {
        return 'fm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    function _fmTimeAgo(ts) {
        if (!ts) return '';
        var d = Date.now() - ts;
        if (d < 60000) return 'just now';
        if (d < 3600000) return Math.floor(d / 60000) + 'min';
        if (d < 86400000) return Math.floor(d / 3600000) + 'h';
        return Math.floor(d / 86400000) + 'd';
    }

    function _fmGetRoles() {
        if (typeof loadChatRoles === 'function') loadChatRoles();
        return (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    }

    function _fmGetApi() {
        var url = '', key = '', model = '';
        try { url = localStorage.getItem('apiUrl') || ''; } catch (e) { }
        try { key = localStorage.getItem('apiKey') || ''; } catch (e) { }
        try { model = localStorage.getItem('selectedModel') || ''; } catch (e) { }
        if (!model) model = 'gpt-3.5-turbo';
        return { url: url, key: key, model: model };
    }

    function _fmBuildEndpoint(u) {
        u = u.replace(/\/+$/, '');
        if (u.indexOf('/chat/completions') >= 0) return u;
        if (u.indexOf('/v1') >= 0) return u + '/chat/completions';
        return u + '/v1/chat/completions';
    }

    /* 随机昵称 */
    function _fmCharNick(charName) {
        var prefixes = ['小小', '暗夜', '追风', '星辰', '月下', '浮云', '深海', '极光', '烟火', '薄荷'];
        var suffixes = ['少年', '旅人', '过客', '漫步者', '观察者', '梦想家', '收藏家', '爱好者', '路人甲', '无名氏'];
        var seed = 0;
        for (var i = 0; i < charName.length; i++) seed += charName.charCodeAt(i);
        return prefixes[seed % prefixes.length] + suffixes[(seed * 7) % suffixes.length];
    }

    function _fmUserNick() {
        return _fm.profile.nameEn || 'anonymous';
    }

    /* ===== 入口 ===== */
    window.openForumApp = function () {
        var el = document.getElementById('forumOverlay');
        if (!el) return;
        _fm.tab = 'home';
        _fm.view = 'main';
        el.classList.add('show');
        _fmRender();
    };

    function _fmClose() {
        var el = document.getElementById('forumOverlay');
        if (el) el.classList.remove('show');
    }

    /* ===== 渲染主框架 ===== */
    function _fmRender() {
        var el = document.getElementById('forumOverlay');
        if (!el) return;

        var h = '<div class="fm-app">';

        /* 顶栏 */
        h += _fmRenderTopbar();

        /* 内容 */
        h += '<div class="fm-body">';
        if (_fm.view === 'main') {
            if (_fm.tab === 'home') h += _fmRenderHome();
            else if (_fm.tab === 'follow') h += _fmRenderFollow();
            else h += _fmRenderMe();
        } else if (_fm.view === 'forumDetail') {
            h += _fmRenderForumDetail();
        } else if (_fm.view === 'postDetail') {
            h += _fmRenderPostDetail();
        } else if (_fm.view === 'myPosts') {
            h += _fmRenderMyPosts();
        } else if (_fm.view === 'myLikes') {
            h += _fmRenderMyLikes();
        }
        h += '</div>';

        /* 评论输入栏 */
        if (_fm.view === 'postDetail') {
            h += '<div class="fm-comment-bar" style="bottom:16px">';
            h += '<input class="fm-comment-input" id="fmCommentInput" placeholder="Write a comment 写评论...">';
            h += '<div class="fm-comment-send" onclick="_fmSendComment()">SEND</div>';
            h += '</div>';
        }

        /* Dock */
        if (_fm.view === 'main') {
            h += _fmRenderDock();
        }

        h += '</div>';
        el.innerHTML = h;
    }

    /* ===== 顶栏 ===== */
    function _fmRenderTopbar() {
        var h = '<div class="fm-topbar">';

        if (_fm.view !== 'main') {
            h += '<div class="fm-topbar-btn" onclick="_fmBack()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
        } else {
            h += '<div class="fm-topbar-btn" onclick="_fmClose()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
        }

        var title = 'FORUM 论坛';
        if (_fm.view === 'forumDetail' && _fm.currentForum) title = _fmE(_fm.currentForum.name);
        if (_fm.view === 'postDetail') title = 'POST 帖子';
        if (_fm.view === 'myPosts') title = 'MY POSTS 我的帖子';
        if (_fm.view === 'myLikes') title = 'INTERACTIONS 互动';
        h += '<div class="fm-topbar-title">' + title + '</div>';

        h += '<div class="fm-topbar-btns">';

        if (_fm.tab === 'home' && _fm.view === 'main') {
            h += '<div class="fm-topbar-btn" onclick="_fmRefreshHome()" title="Refresh"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></div>';
        }

        if (_fm.view === 'forumDetail') {
            h += '<div class="fm-topbar-btn" onclick="_fmRefreshForum()" title="Refresh"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></div>';
            h += '<div class="fm-topbar-btn" onclick="_fmOpenCreatePost()" title="New Post"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
        }

        if (_fm.tab === 'follow' && _fm.view === 'main') {
            h += '<div class="fm-topbar-btn" onclick="_fmOpenCreateForum()" title="Create Forum"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
        }

        h += '</div></div>';
        return h;
    }

    /* ===== Dock ===== */
    function _fmRenderDock() {
        var tabs = [
            { id: 'home', label: 'HOME', icon: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
            { id: 'follow', label: 'FOLLOW', icon: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' },
            { id: 'me', label: 'ME', icon: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
        ];
        var h = '<div class="fm-dock">';
        for (var i = 0; i < tabs.length; i++) {
            var t = tabs[i];
            h += '<div class="fm-dock-item' + (_fm.tab === t.id ? ' active' : '') + '" onclick="_fmSwitchTab(\'' + t.id + '\')">';
            h += t.icon;
            h += '<span class="fm-dock-label">' + t.label + '</span>';
            h += '</div>';
        }
        h += '</div>';
        return h;
    }

    /* ===== HOME 首页 ===== */
    function _fmRenderHome() {
        var allPosts = _fm.posts.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (allPosts.length === 0) {
            return _fmEmptyState('No posts yet 暂无帖子', 'Follow a forum and refresh to see posts 关注论坛后刷新查看帖子');
        }
        var h = '';
        for (var i = 0; i < allPosts.length; i++) {
            h += _fmRenderPostCard(allPosts[i]);
        }
        return h;
    }

    function _fmRenderPostCard(p) {
        var forum = null;
        for (var i = 0; i < _fm.forums.length; i++) {
            if (_fm.forums[i].id === p.forumId) { forum = _fm.forums[i]; break; }
        }
        var h = '<div class="fm-post-card" onclick="_fmOpenPost(\'' + _fmE(p.id) + '\')">';
        h += '<div class="fm-post-head">';
        h += '<span class="fm-post-nick">' + _fmE(p.nick || 'anonymous') + '</span>';
        if (forum) h += '<span class="fm-post-forum-tag">' + _fmE(forum.name) + '</span>';
        h += '<span class="fm-post-time">' + _fmTimeAgo(p.ts) + '</span>';
        h += '</div>';
        h += '<div class="fm-post-title">' + _fmE(p.title) + '</div>';
        h += '<div class="fm-post-preview">' + _fmE((p.body || '').substring(0, 80)) + '</div>';
        h += '<div class="fm-post-stats">';
        h += '<span class="fm-post-stat"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' + (p.likes || 0) + '</span>';
        h += '<span class="fm-post-stat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' + ((p.comments || []).length) + '</span>';
        h += '</div>';
        h += '</div>';
        return h;
    }

    /* ===== FOLLOW 关注 ===== */
    function _fmRenderFollow() {
        var h = '';
        h += '<div class="fm-section-label">MY FORUMS 我的论坛</div>';

        if (_fm.forums.length === 0) {
            h += _fmEmptyState('No forums yet 暂无论坛', 'Tap + to create one 点击右上角+创建论坛');
        } else {
            for (var i = 0; i < _fm.forums.length; i++) {
                var f = _fm.forums[i];
                h += '<div class="fm-forum-card" onclick="_fmOpenForum(\'' + _fmE(f.id) + '\')">';
                h += '<div class="fm-forum-av">';
                if (f.avatar) h += '<img src="' + _fmE(f.avatar) + '">';
                else h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
                h += '</div>';
                h += '<div class="fm-forum-info">';
                h += '<div class="fm-forum-name">' + _fmE(f.name) + '</div>';
                h += '<div class="fm-forum-motto">' + _fmE(f.motto || '') + '</div>';
                h += '</div>';
                h += '<span class="fm-forum-arrow">›</span>';
                h += '</div>';
            }
        }

        h += '<div class="fm-create-btn" onclick="_fmOpenCreateForum()">+ CREATE FORUM 创建论坛</div>';
        return h;
    }

    /* ===== ME 我 ===== */
    function _fmRenderMe() {
        var p = _fm.profile;
        var myPostCount = 0;
        var myInteractCount = 0;
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].isUser) myPostCount++;
            var cmts = _fm.posts[i].comments || [];
            for (var j = 0; j < cmts.length; j++) {
                if (cmts[j].isUser) myInteractCount++;
            }
            if (_fm.posts[i].likedByUser) myInteractCount++;
        }

        var h = '<div class="fm-profile">';
        h += '<div class="fm-profile-av" onclick="_fmEditProfileAvatar()">';
        if (p.avatar) h += '<img src="' + _fmE(p.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="fm-profile-name-en" onclick="_fmEditName(\'en\')">' + _fmE(p.nameEn) + '</div>';
        h += '<div class="fm-profile-name-cn" onclick="_fmEditName(\'cn\')">' + _fmE(p.nameCn) + '</div>';
        h += '<div class="fm-profile-bio" onclick="_fmEditBio()">' + _fmE(p.bio) + '</div>';

        h += '<div class="fm-profile-stats">';
        h += '<div><div class="fm-profile-stat-num">' + myPostCount + '</div><div class="fm-profile-stat-label">posts</div></div>';
        h += '<div><div class="fm-profile-stat-num">' + _fm.forums.length + '</div><div class="fm-profile-stat-label">forums</div></div>';
        h += '<div><div class="fm-profile-stat-num">' + myInteractCount + '</div><div class="fm-profile-stat-label">interactions</div></div>';
        h += '</div>';
        h += '</div>';

        h += '<div class="fm-me-tabs">';
        h += '<div class="fm-me-tab" onclick="_fmViewMyPosts()">';
        h += '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
        h += '<span>MY POSTS 我的帖子</span>';
        h += '</div>';
        h += '<div class="fm-me-tab" onclick="_fmViewMyLikes()">';
        h += '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
        h += '<span>INTERACTIONS 互动</span>';
        h += '</div>';
        h += '</div>';

        return h;
    }

    /* ===== 论坛详情 ===== */
    function _fmRenderForumDetail() {
        var f = _fm.currentForum;
        if (!f) return '';
        var h = '';

        h += '<div class="fm-detail-header">';
        h += '<div class="fm-detail-av">';
        if (f.avatar) h += '<img src="' + _fmE(f.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
        h += '</div>';
        h += '<div class="fm-detail-info">';
        h += '<div class="fm-detail-name">' + _fmE(f.name) + '</div>';
        h += '<div class="fm-detail-type">' + _fmE(f.type || '') + '</div>';
        h += '</div>';
        h += '</div>';

        if (f.detail) {
            h += '<div class="fm-detail-desc">' + _fmE(f.detail) + '</div>';
        }

        h += '<div class="fm-section-label">POSTS 帖子</div>';

        var forumPosts = [];
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].forumId === f.id) forumPosts.push(_fm.posts[i]);
        }
        forumPosts.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

        if (forumPosts.length === 0) {
            h += _fmEmptyState('No posts yet 暂无帖子', 'Tap refresh to generate or publish your own 点击刷新或自己发帖');
        } else {
            for (var j = 0; j < forumPosts.length; j++) {
                h += _fmRenderPostCard(forumPosts[j]);
            }
        }
        return h;
    }

    /* ===== 帖子详情 ===== */
    function _fmRenderPostDetail() {
        var p = _fm.currentPost;
        if (!p) return '';
        var h = '';

        h += '<div class="fm-pdetail-title">' + _fmE(p.title) + '</div>';
        h += '<div class="fm-pdetail-meta">';
        h += '<span>' + _fmE(p.nick) + '</span>';
        h += '<span>' + _fmTimeAgo(p.ts) + '</span>';
        h += '</div>';
        h += '<div class="fm-pdetail-body">' + _fmE(p.body) + '</div>';

        h += '<div class="fm-pdetail-actions">';
        h += '<div class="fm-pdetail-action' + (p.likedByUser ? ' liked' : '') + '" onclick="_fmToggleLike()">';
        h += '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
        h += (p.likes || 0);
        h += '</div>';
        h += '<div class="fm-pdetail-action">';
        h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
        h += (p.comments || []).length;
        h += '</div>';
        h += '</div>';

        h += '<div class="fm-comments-title">COMMENTS 评论 (' + (p.comments || []).length + ')</div>';

        var cmts = p.comments || [];
        for (var i = 0; i < cmts.length; i++) {
            var c = cmts[i];
            h += '<div class="fm-comment">';
            h += '<div class="fm-comment-head">';
            h += '<span class="fm-comment-nick">' + _fmE(c.nick) + '</span>';
            h += '<span class="fm-comment-time">' + _fmTimeAgo(c.ts) + '</span>';
            h += '</div>';
            h += '<div class="fm-comment-text">' + _fmE(c.text) + '</div>';
            h += '</div>';
        }

        if (cmts.length === 0) {
            h += '<div class="fm-empty"><div class="fm-empty-text">No comments yet 暂无评论</div></div>';
        }

        /* 底部留白给评论栏 */
        h += '<div style="height:50px"></div>';

        return h;
    }

    /* ===== 我的帖子 ===== */
    function _fmRenderMyPosts() {
        var list = [];
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].isUser) list.push(_fm.posts[i]);
        }
        list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (list.length === 0) return _fmEmptyState('No posts yet 暂无发帖', '');
        var h = '';
        for (var j = 0; j < list.length; j++) h += _fmRenderPostCard(list[j]);
        return h;
    }

    /* ===== 我的互动 ===== */
    function _fmRenderMyLikes() {
        var list = [];
        for (var i = 0; i < _fm.posts.length; i++) {
            var p = _fm.posts[i];
            if (p.likedByUser) list.push(p);
            var cmts = p.comments || [];
            for (var j = 0; j < cmts.length; j++) {
                if (cmts[j].isUser && list.indexOf(p) < 0) list.push(p);
            }
        }
        list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (list.length === 0) return _fmEmptyState('No interactions yet 暂无互动', '');
        var h = '';
        for (var k = 0; k < list.length; k++) h += _fmRenderPostCard(list[k]);
        return h;
    }

    function _fmEmptyState(t1, t2) {
        var h = '<div class="fm-empty">';
        h += '<div class="fm-empty-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>';
        h += '<div class="fm-empty-text">' + _fmE(t1) + '<br>' + _fmE(t2) + '</div>';
        h += '</div>';
        return h;
    }

    /* ===== 交互 ===== */
    window._fmSwitchTab = function (tab) {
        _fm.tab = tab;
        _fm.view = 'main';
        _fmRender();
    };

    window._fmBack = function () {
        if (_fm.view === 'postDetail') {
            if (_fm.currentPost && _fm.currentPost._fromForum) {
                _fm.view = 'forumDetail';
            } else {
                _fm.view = 'main';
            }
        } else if (_fm.view === 'forumDetail') {
            _fm.view = 'main';
            _fm.tab = 'follow';
        } else if (_fm.view === 'myPosts' || _fm.view === 'myLikes') {
            _fm.view = 'main';
            _fm.tab = 'me';
        } else {
            _fm.view = 'main';
        }
        _fmRender();
    };

    window._fmClose = _fmClose;

    window._fmOpenForum = function (fid) {
        for (var i = 0; i < _fm.forums.length; i++) {
            if (_fm.forums[i].id === fid) {
                _fm.currentForum = _fm.forums[i];
                _fm.view = 'forumDetail';
                _fmRender();
                return;
            }
        }
    };

    window._fmOpenPost = function (pid) {
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].id === pid) {
                _fm.currentPost = _fm.posts[i];
                _fm.currentPost._fromForum = (_fm.view === 'forumDetail');
                _fm.view = 'postDetail';
                _fmRender();
                /* 自动刷评论 */
                _fmAutoComments(pid);
                return;
            }
        }
    };

    window._fmViewMyPosts = function () { _fm.view = 'myPosts'; _fmRender(); };
    window._fmViewMyLikes = function () { _fm.view = 'myLikes'; _fmRender(); };

    /* 点赞 */
    window._fmToggleLike = function () {
        var p = _fm.currentPost; if (!p) return;
        if (p.likedByUser) {
            p.likedByUser = false;
            p.likes = Math.max(0, (p.likes || 1) - 1);
        } else {
            p.likedByUser = true;
            p.likes = (p.likes || 0) + 1;
        }
        _fmSave(); _fmRender();
    };

    /* 发评论 */
    window._fmSendComment = function () {
        var inp = document.getElementById('fmCommentInput');
        if (!inp) return;
        var txt = inp.value.trim();
        if (!txt) return;
        var p = _fm.currentPost; if (!p) return;
        if (!p.comments) p.comments = [];
        p.comments.push({
            id: _fmId(),
            nick: _fmUserNick(),
            text: txt,
            ts: Date.now(),
            isUser: true
        });
        inp.value = '';
        _fmSave(); _fmRender();

        /* 用户评论后，char一定回复 */
        setTimeout(function () {
            _fmGenCharReplyToUserComment(p);
        }, 800);
    };

    /* ===== 编辑个人资料 ===== */
    window._fmEditProfileAvatar = function () {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function () {
            if (!inp.files || !inp.files[0]) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                _fm.profile.avatar = e.target.result;
                _fmSave(); _fmRender();
            };
            reader.readAsDataURL(inp.files[0]);
        };
        inp.click();
    };

    window._fmEditName = function (type) {
        var current = type === 'en' ? _fm.profile.nameEn : _fm.profile.nameCn;
        var label = type === 'en' ? 'English Name' : '中文名';
        var val = prompt(label, current);
        if (val !== null && val.trim()) {
            if (type === 'en') _fm.profile.nameEn = val.trim();
            else _fm.profile.nameCn = val.trim();
            _fmSave(); _fmRender();
        }
    };

    window._fmEditBio = function () {
        var val = prompt('Bio 简介', _fm.profile.bio);
        if (val !== null) {
            _fm.profile.bio = val.trim() || 'No bio yet';
            _fmSave(); _fmRender();
        }
    };

    /* ===== 创建论坛 ===== */
    window._fmOpenCreateForum = function () {
        var el = document.getElementById('forumOverlay');
        if (!el || document.getElementById('fmCreateModal')) return;
        var roles = _fmGetRoles();

        var h = '<div class="fm-modal-overlay" id="fmCreateModal">';
        h += '<div class="fm-modal">';
        h += '<div class="fm-modal-header">';
        h += '<div class="fm-modal-title">CREATE FORUM 创建论坛</div>';
        h += '<div class="fm-modal-close" onclick="document.getElementById(\'fmCreateModal\').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        h += '</div>';
        h += '<div class="fm-modal-body">';

        h += '<div class="fm-field">';
        h += '<div class="fm-field-label">AVATAR 头像</div>';
        h += '<div class="fm-publish-av" id="fmForumAvPreview" onclick="_fmPickForumAv()"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#ccc;stroke-width:1.5;fill:none"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
        h += '</div>';

        h += '<div class="fm-field"><div class="fm-field-label">NAME 名称</div>';
        h += '<input class="fm-field-input" id="fmForumName" placeholder="论坛名称"></div>';

        h += '<div class="fm-field"><div class="fm-field-label">TYPE 类型</div>';
        h += '<input class="fm-field-input" id="fmForumType" placeholder="如：虐文 / 甜文 / 悬疑"></div>';

        h += '<div class="fm-field"><div class="fm-field-label">DETAIL 详细内容</div>';
        h += '<textarea class="fm-field-textarea" id="fmForumDetail" placeholder="论坛的详细描述、关键词等"></textarea></div>';

        h += '<div class="fm-field"><div class="fm-field-label">MOTTO 宗旨</div>';
        h += '<input class="fm-field-input" id="fmForumMotto" placeholder="一句话宗旨"></div>';

        h += '<div class="fm-field"><div class="fm-field-label">CHARACTERS 关联角色（点击选择）</div>';
        h += '<div class="fm-char-picker" id="fmCharPicker">';
        if (roles.length === 0) {
            h += '<span style="font-size:10px;color:#ccc">No characters 暂无角色</span>';
        }
        for (var i = 0; i < roles.length; i++) {
            var r = roles[i];
            h += '<div class="fm-char-chip" data-rid="' + _fmE(r.id) + '" onclick="_fmToggleChar(this)">';
            if (r.avatar) h += '<img src="' + _fmE(r.avatar) + '">';
            h += _fmE(r.name || 'unnamed');
            h += '</div>';
        }
        h += '</div></div>';

        h += '<div class="fm-modal-submit" onclick="_fmSubmitForum()">CREATE 创建</div>';
        h += '</div></div></div>';

        var panel = document.createElement('div');
        panel.innerHTML = h;
        el.appendChild(panel.firstChild);
    };

    var _fmTempForumAv = '';
    window._fmPickForumAv = function () {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function () {
            if (!inp.files || !inp.files[0]) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                _fmTempForumAv = e.target.result;
                var preview = document.getElementById('fmForumAvPreview');
                if (preview) preview.innerHTML = '<img src="' + _fmTempForumAv + '">';
            };
            reader.readAsDataURL(inp.files[0]);
        };
        inp.click();
    };

    window._fmToggleChar = function (el) {
        el.classList.toggle('selected');
    };

    window._fmSubmitForum = function () {
        var name = (document.getElementById('fmForumName') || {}).value || '';
        if (!name.trim()) {
            if (typeof showToast === 'function') showToast('Please enter forum name 请输入论坛名称');
            return;
        }
        var charIds = [];
        var chips = document.querySelectorAll('#fmCharPicker .fm-char-chip.selected');
        for (var i = 0; i < chips.length; i++) {
            var rid = chips[i].getAttribute('data-rid');
            if (rid) charIds.push(rid);
        }

        var forum = {
            id: _fmId(),
            name: name.trim(),
            type: ((document.getElementById('fmForumType') || {}).value || '').trim(),
            detail: ((document.getElementById('fmForumDetail') || {}).value || '').trim(),
            motto: ((document.getElementById('fmForumMotto') || {}).value || '').trim(),
            avatar: _fmTempForumAv || '',
            charIds: charIds,
            ts: Date.now()
        };

        _fm.forums.push(forum);
        _fmTempForumAv = '';
        _fmSave();
        var modal = document.getElementById('fmCreateModal');
        if (modal) modal.remove();
        _fm.tab = 'follow';
        _fm.view = 'main';
        _fmRender();
        if (typeof showToast === 'function') showToast('Forum created 论坛已创建');
    };

    /* ===== 发帖 ===== */
    window._fmOpenCreatePost = function () {
        var el = document.getElementById('forumOverlay');
        if (!el || !_fm.currentForum || document.getElementById('fmPostModal')) return;

        var h = '<div class="fm-modal-overlay" id="fmPostModal">';
        h += '<div class="fm-modal">';
        h += '<div class="fm-modal-header">';
        h += '<div class="fm-modal-title">NEW POST 发帖</div>';
        h += '<div class="fm-modal-close" onclick="document.getElementById(\'fmPostModal\').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        h += '</div>';
        h += '<div class="fm-modal-body">';
        h += '<div class="fm-field"><div class="fm-field-label">TITLE 标题</div>';
        h += '<input class="fm-field-input" id="fmPostTitle" placeholder="帖子标题"></div>';
        h += '<div class="fm-field"><div class="fm-field-label">CONTENT 内容</div>';
        h += '<textarea class="fm-field-textarea" id="fmPostBody" placeholder="帖子内容..." style="min-height:120px"></textarea></div>';
        h += '<div class="fm-modal-submit" onclick="_fmSubmitPost()">PUBLISH 发布</div>';
        h += '</div></div></div>';

        var panel = document.createElement('div');
        panel.innerHTML = h;
        el.appendChild(panel.firstChild);
    };

    window._fmSubmitPost = function () {
        var title = ((document.getElementById('fmPostTitle') || {}).value || '').trim();
        var body = ((document.getElementById('fmPostBody') || {}).value || '').trim();
        if (!title) {
            if (typeof showToast === 'function') showToast('Please enter title 请输入标题');
            return;
        }
        var post = {
            id: _fmId(),
            forumId: _fm.currentForum.id,
            title: title,
            body: body,
            nick: _fmUserNick(),
            ts: Date.now(),
            likes: 0,
            comments: [],
            isUser: true,
            likedByUser: false
        };
        _fm.posts.push(post);
        _fmSave();
        var modal = document.getElementById('fmPostModal');
        if (modal) modal.remove();
        _fmRender();
        if (typeof showToast === 'function') showToast('Published 已发布');

        /* 用户发帖 → char一定回复 */
        setTimeout(function () {
            _fmGenCharReplies(post.id);
        }, 1200);
    };

    /* ===== 刷新 — 生成AI帖子 ===== */
    window._fmRefreshHome = function () {
        if (_fm.forums.length === 0) {
            if (typeof showToast === 'function') showToast('Create a forum first 请先创建论坛');
            return;
        }
        var randomForum = _fm.forums[Math.floor(Math.random() * _fm.forums.length)];
        _fmGenAIPost(randomForum);
    };

    window._fmRefreshForum = function () {
        if (!_fm.currentForum) return;
        _fmGenAIPost(_fm.currentForum);
    };

    /* ===== AI 生成帖子 ===== */
    function _fmGenAIPost(forum) {
        var api = _fmGetApi();
        if (!api.url || !api.key) {
            if (typeof showToast === 'function') showToast('Please configure API 请先配置API');
            return;
        }

        if (typeof showToast === 'function') showToast('Generating post 正在生成帖子...');

        var roles = _fmGetRoles();
        var forumChars = [];
        for (var i = 0; i < (forum.charIds || []).length; i++) {
            for (var j = 0; j < roles.length; j++) {
                if (roles[j].id === forum.charIds[i]) {
                    forumChars.push(roles[j]);
                    break;
                }
            }
        }

        var poster = forumChars.length > 0
            ? forumChars[Math.floor(Math.random() * forumChars.length)]
            : null;

        var sys = '你是一个论坛帖子生成器。\n';
        sys += '论坛名称：' + forum.name + '\n';
        sys += '论坛类型：' + (forum.type || '综合') + '\n';
        sys += '论坛描述：' + (forum.detail || '无') + '\n';
        sys += '论坛宗旨：' + (forum.motto || '无') + '\n\n';

        if (poster) {
            sys += '发帖人设定：' + (poster.detail || poster.name || '') + '\n';
            sys += '发帖人是匿名上网，用网名发帖，不暴露真实身份。\n';
            sys += '请根据这个人的性格特点来写帖子内容。\n\n';
        }

        sys += '请生成一个该论坛下的帖子，格式如下：\n';
        sys += '第一行：帖子标题（不加任何前缀标记）\n';
        sys += '第二行开始：帖子正文内容\n';
        sys += '正文200-400字，要有论坛发帖的口吻，随性自然，可以有网络用语。\n';
        sys += '不要写"标题："等前缀。\n';

        var endpoint = _fmBuildEndpoint(api.url);

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + api.key
            },
            body: JSON.stringify({
                model: api.model,
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: '请生成一个帖子' }
                ],
                temperature: 0.9,
                max_tokens: 1024
            })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var text = '';
                try { text = data.choices[0].message.content.trim(); } catch (e) { }
                if (!text) {
                    if (typeof showToast === 'function') showToast('Empty response 生成为空');
                    return;
                }

                var lines = text.split('\n');
                var title = lines[0].replace(/^#+\s*/, '').replace(/^标题[：:]?\s*/i, '').trim();
                var body = lines.slice(1).join('\n').replace(/^正文[：:]?\s*/i, '').trim();

                var nick = poster ? _fmCharNick(poster.name) : '匿名用户' + Math.floor(Math.random() * 9000 + 1000);

                var post = {
                    id: _fmId(),
                    forumId: forum.id,
                    title: title,
                    body: body,
                    nick: nick,
                    ts: Date.now(),
                    likes: Math.floor(Math.random() * 20),
                    comments: [],
                    isUser: false,
                    likedByUser: false,
                    charId: poster ? poster.id : null
                };
                _fm.posts.push(post);
                _fmSave();
                _fmRender();
                if (typeof showToast === 'function') showToast('New post generated 新帖子已生成');
            })
            .catch(function (err) {
                console.error('Forum gen error:', err);
                if (typeof showToast === 'function') showToast('Error: ' + (err.message || '').substring(0, 50));
            });
    }

    /* ===== AI 生成评论（打开帖子时自动触发） ===== */
    function _fmAutoComments(postId) {
        var post = null;
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].id === postId) { post = _fm.posts[i]; break; }
        }
        if (!post) return;

        var forum = null;
        for (var k = 0; k < _fm.forums.length; k++) {
            if (_fm.forums[k].id === post.forumId) { forum = _fm.forums[k]; break; }
        }
        if (!forum) return;

        /* 概率 50% 刷新一条char评论 */
        if (Math.random() > 0.5) return;

        var roles = _fmGetRoles();
        var forumChars = [];
        for (var c = 0; c < (forum.charIds || []).length; c++) {
            for (var r = 0; r < roles.length; r++) {
                if (roles[r].id === forum.charIds[c]) {
                    forumChars.push(roles[r]);
                    break;
                }
            }
        }
        if (forumChars.length === 0) return;

        var commenter = forumChars[Math.floor(Math.random() * forumChars.length)];
        _fmGenOneComment(post, commenter, forum);
    }

    /* char 回复用户的帖子（一定触发） */
    function _fmGenCharReplies(postId) {
        var post = null;
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].id === postId) { post = _fm.posts[i]; break; }
        }
        if (!post) return;

        var forum = null;
        for (var k = 0; k < _fm.forums.length; k++) {
            if (_fm.forums[k].id === post.forumId) { forum = _fm.forums[k]; break; }
        }
        if (!forum) return;

        var roles = _fmGetRoles();
        var forumChars = [];
        for (var c = 0; c < (forum.charIds || []).length; c++) {
            for (var r = 0; r < roles.length; r++) {
                if (roles[r].id === forum.charIds[c]) {
                    forumChars.push(roles[r]);
                    break;
                }
            }
        }
        if (forumChars.length === 0) return;

        /* 随机1-2个char回复 */
        var count = Math.min(forumChars.length, Math.floor(Math.random() * 2) + 1);
        var shuffled = forumChars.sort(function () { return Math.random() - 0.5; });

        for (var n = 0; n < count; n++) {
            (function (idx) {
                setTimeout(function () {
                    _fmGenOneComment(post, shuffled[idx], forum);
                }, (idx + 1) * 2000);
            })(n);
        }
    }

    /* char 回复用户评论（一定触发） */
    function _fmGenCharReplyToUserComment(post) {
        var forum = null;
        for (var k = 0; k < _fm.forums.length; k++) {
            if (_fm.forums[k].id === post.forumId) { forum = _fm.forums[k]; break; }
        }
        if (!forum) return;

        var roles = _fmGetRoles();
        var forumChars = [];
        for (var c = 0; c < (forum.charIds || []).length; c++) {
            for (var r = 0; r < roles.length; r++) {
                if (roles[r].id === forum.charIds[c]) {
                    forumChars.push(roles[r]);
                    break;
                }
            }
        }
        if (forumChars.length === 0) return;

        var commenter = forumChars[Math.floor(Math.random() * forumChars.length)];
        _fmGenOneComment(post, commenter, forum);
    }

    /* 生成单条AI评论 */
    function _fmGenOneComment(post, charRole, forum) {
        var api = _fmGetApi();
        if (!api.url || !api.key) return;

        var sys = '你是一个论坛用户，你的真实身份设定如下（但你是匿名上网，绝对不暴露真实身份）：\n';
        sys += (charRole.detail || charRole.name || '') + '\n\n';
        sys += '论坛名称：' + forum.name + '，类型：' + (forum.type || '综合') + '\n';
        sys += '你在看一个帖子，标题是：' + post.title + '\n';
        sys += '帖子内容：' + (post.body || '').substring(0, 300) + '\n\n';

        var existingComments = '';
        var cmts = post.comments || [];
        if (cmts.length > 0) {
            existingComments = '已有评论：\n';
            for (var i = Math.max(0, cmts.length - 5); i < cmts.length; i++) {
                existingComments += cmts[i].nick + '：' + cmts[i].text + '\n';
            }
            sys += existingComments + '\n';
        }

        sys += '请写一条评论回复，要求：\n';
        sys += '- 符合你的性格特点，但不暴露真实身份\n';
        sys += '- 像真实网友评论，可以有网络用语、口语化表达\n';
        sys += '- 简短自然，10-60字\n';
        sys += '- 只输出评论内容，不加任何前缀\n';

        var endpoint = _fmBuildEndpoint(api.url);

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + api.key
            },
            body: JSON.stringify({
                model: api.model,
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: '请写一条评论' }
                ],
                temperature: 0.92,
                max_tokens: 256
            })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var text = '';
                try { text = data.choices[0].message.content.trim(); } catch (e) { }
                if (!text) return;

                /* 再次查找帖子（可能已更新） */
                for (var p = 0; p < _fm.posts.length; p++) {
                    if (_fm.posts[p].id === post.id) {
                        if (!_fm.posts[p].comments) _fm.posts[p].comments = [];
                        _fm.posts[p].comments.push({
                            id: _fmId(),
                            nick: _fmCharNick(charRole.name),
                            text: text.replace(/^["「]|["」]$/g, ''),
                            ts: Date.now(),
                            isUser: false,
                            charId: charRole.id
                        });
                        _fmSave();
                        /* 如果当前正在看这个帖子，刷新 */
                        if (_fm.view === 'postDetail' && _fm.currentPost && _fm.currentPost.id === post.id) {
                            _fm.currentPost = _fm.posts[p];
                            _fmRender();
                        }
                        break;
                    }
                }
            })
            .catch(function (err) {
                console.error('Forum comment gen error:', err);
            });
    }

})();
