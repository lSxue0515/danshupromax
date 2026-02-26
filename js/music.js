/* ============================================
   music.js — 音乐APP (v5 歌词+封面识别+列表日推)
   ============================================ */
var _muTab = 'home';
var _muPlayer = null;
var _muPlaying = false;
var _muCurrentSong = null;
var _muCurrentIdx = -1;
var _muShowFull = false;
var _muTimer = null;
var _muPlaylistDetail = null;
var _muEditType = '';
var _muSearchKw = '';
var _muBlobCache = {};
var _muImportModal = '';
var _muImportTab = 'text';
var _muImportTarget = '';
var _muParsedSongs = [];
var _muPickDaily = false;

/* ===== 一起听 状态 ===== */
var _muListenData = JSON.parse(localStorage.getItem('_muListenData') || 'null') || {
    charName: '',
    charAvatar: '',
    userListenAvatar: '',
    likes: {},
    comments: {}
};
var _muListenFeed = [];
var _muListenCommentTarget = '';
var _muListenCommentText = '';
var _muListenCharTyping = false;
var _muListenEditModal = '';

// Char昵称候选池（从人设风格随机）
var _muCharNamePool = [
    '小星星 ✦', '月见 つきみ', 'Lumi', '阿绵', 'Rin りん',
    '暮雨', 'Ciel', '柚子', 'Nora', '鹿鸣',
    '樱落', 'Aria', '浅川', 'Mika', '落雪',
    '千织', 'Yuki', '琥珀', 'Sora', '晴空'
];

var _muSongs = JSON.parse(localStorage.getItem('_muSongs') || '[]');
var _muPlaylists = JSON.parse(localStorage.getItem('_muPlaylists') || '[]');
var _muProfile = JSON.parse(localStorage.getItem('_muProfile') || 'null') || {
    avatar: '', name: '未设置昵称', age: '1年', ip: '未知',
    sig: 'ℳ𝓊𝓈𝒾𝓬𓂃✍︎𝄞 ❤︎ ▶︎·၊၊||၊|။|||| | ❤'
};
var _muDailyList = JSON.parse(localStorage.getItem('_muDailyList') || 'null') || [
    { id: 'dr_default', name: '每日推荐', artist: 'Daily Mix', url: '', cover: '', coverEmoji: '🎵', songRef: '' }
];

function _muSave() {
    try {
        // ★ 保存时完全剥离 blobData（由IndexedDB负责持久化音频）
        var songsClean = _muSongs.map(function (s) {
            var c = Object.assign({}, s);
            delete c.blobData; // 不再往localStorage存音频数据
            return c;
        });
        var plClean = _muPlaylists.map(function (pl) {
            var p = Object.assign({}, pl);
            if (p.songs) {
                p.songs = p.songs.map(function (s) {
                    var c = Object.assign({}, s);
                    delete c.blobData;
                    return c;
                });
            }
            return p;
        });
        localStorage.setItem('_muSongs', JSON.stringify(songsClean));
        localStorage.setItem('_muPlaylists', JSON.stringify(plClean));
        localStorage.setItem('_muProfile', JSON.stringify(_muProfile));
        localStorage.setItem('_muDailyList', JSON.stringify(_muDailyList));
        localStorage.setItem('_muListenData', JSON.stringify(_muListenData));
    } catch (e) { console.warn('Save error', e); }
}

function _muEsc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _muGenId() {
    return 'song_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

function openMusicApp() {
    var el = document.getElementById('musicOverlay');
    if (!el) return;
    _muTab = 'home'; _muShowFull = false; _muPlaylistDetail = null;
    _muSearchKw = ''; _muEditType = ''; _muImportModal = ''; _muPickDaily = false;
    _muRender(); el.classList.add('show');
}

function closeMusicApp() {
    var el = document.getElementById('musicOverlay');
    if (el) el.classList.remove('show');
}

/* ===== 主渲染 ===== */
function _muRender() {
    var el = document.getElementById('musicOverlay');
    if (!el) return;
    var h = '';
    if (_muShowFull && _muCurrentSong) {
        h += _muRenderFullPlayer(); el.innerHTML = h; _muStartTimer(); _muScrollToActiveLyric(); return;
    }
    if (_muPickDaily) { h += _muRenderPickDailyModal(); el.innerHTML = h; return; }
    h += '<div class="mu-header"><div class="mu-back" onclick="closeMusicApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="mu-header-title">MUSIC</div><div class="mu-header-spacer"></div></div>';
    h += '<div class="mu-body">';
    if (_muTab === 'home') h += _muRenderHome();
    else if (_muTab === 'listen') h += _muRenderListen();
    else if (_muTab === 'me') h += _muRenderMe();
    h += '</div>';
    if (_muCurrentSong) h += _muRenderPlayerBar();
    h += _muRenderDock();
    if (_muEditType) h += _muRenderEditModal();
    if (_muImportModal) h += _muRenderImportModal();
    el.innerHTML = h;
    _muStartTimer();
}

/* ===== 首页 ===== */
function _muRenderHome() {
    var h = '<div class="mu-home">';
    var hr = new Date().getHours();
    var greet = hr < 6 ? '夜深了 🌙' : hr < 12 ? '早上好 ☀️' : hr < 18 ? '下午好 🌤' : '晚上好 ✨';
    h += '<div class="mu-greeting">' + greet + '</div>';
    h += '<div class="mu-greeting-sub">发现你喜欢的音乐</div>';
    h += '<div class="mu-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    h += '<input type="text" placeholder="搜索歌曲..." value="' + _muEsc(_muSearchKw) + '" oninput="_muSearchKw=this.value;_muRenderSongArea()" id="muSearchInput"></div>';

    // ★ 每日推荐 — 竖向列表INS风
    h += '<div class="mu-section-title"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>每日推荐 Daily Pick <span style="font-weight:400;font-size:10px;color:#ccc;margin-left:auto">' + _muDailyList.length + '/5</span></div>';
    h += '<div class="mu-daily-list-v5">';
    for (var di = 0; di < _muDailyList.length; di++) {
        var d = _muDailyList[di];
        h += '<div class="mu-daily-item-v5">';
        h += '<div class="mu-daily-rank-v5">#' + (di + 1) + '</div>';
        h += '<div class="mu-daily-cover-v5" onclick="event.stopPropagation();_muEditDailyCover(' + di + ')">';
        if (d.cover) h += '<img src="' + _muEsc(d.cover) + '">';
        else h += (d.coverEmoji || '🎵');
        h += '</div>';
        h += '<div class="mu-daily-info-v5" onclick="_muPlayDailyItem(' + di + ')">';
        h += '<div class="mu-daily-name-v5">' + _muEsc(d.name) + '</div>';
        h += '<div class="mu-daily-artist-v5">' + _muEsc(d.artist || 'Unknown') + '</div>';
        h += '</div>';
        h += '<div class="mu-daily-btns-v5">';
        h += '<div class="mu-daily-btn-v5 play" onclick="_muPlayDailyItem(' + di + ')"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
        h += '<div class="mu-daily-btn-v5" onclick="_muEditDailyInfo(' + di + ')"><svg viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></div>';
        h += '<div class="mu-daily-btn-v5 del" onclick="_muRemoveDaily(' + di + ')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        h += '</div></div>';
    }
    if (_muDailyList.length < 5) {
        h += '<div class="mu-daily-add-v5" onclick="_muAddDailyPick()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>添加推荐</div>';
    }
    h += '</div>';
    h += '<div id="muSongArea">' + _muBuildSongList() + '</div>';
    h += '</div>';
    return h;
}

function _muBuildSongList() {
    var songs = _muGetFilteredSongs(), h = '';
    if (_muSearchKw) h += '<div class="mu-section-title" style="margin-top:8px">搜索结果</div>';
    else if (_muGetAllSongs().length > 0) h += '<div class="mu-section-title" style="margin-top:8px">我的音乐 My Songs</div>';
    if (!songs.length && _muSearchKw) h += '<div class="mu-empty">没有找到相关歌曲</div>';
    else if (!songs.length && !_muSearchKw) h += '<div class="mu-empty">还没有导入歌曲哦~<br>在「我」页面导入音乐</div>';
    else h += _muRenderSongListHTML(songs);
    return h;
}

function _muRenderSongListHTML(songs) {
    var h = '<div class="mu-song-list">';
    for (var i = 0; i < songs.length; i++) {
        var s = songs[i];
        var isPlaying = _muCurrentSong && _muCurrentSong.id === s.id;
        var isDaily = _muIsSongInDaily(s.id);
        h += '<div class="mu-song-item' + (isPlaying && _muPlaying ? ' playing' : '') + '" onclick="_muPlaySong(\'' + s.id + '\')">';
        h += '<div class="mu-song-idx">';
        if (isPlaying && _muPlaying) h += '<svg viewBox="0 0 24 24" width="14" height="14" style="stroke:#999;stroke-width:2;fill:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        else h += (i + 1);
        h += '</div>';
        h += '<div class="mu-song-cover">' + (s.cover ? '<img src="' + _muEsc(s.cover) + '">' : '🎵') + '</div>';
        h += '<div class="mu-song-info"><div class="mu-song-name">' + _muEsc(s.name);
        if (!s.url && !s.blobData) h += ' <span style="font-size:8px;color:#daa;font-weight:400">未绑定音源</span>';
        h += '</div><div class="mu-song-artist">' + _muEsc(s.artist || '未知') + '</div></div>';
        h += '<div class="mu-song-star' + (isDaily ? ' active' : '') + '" onclick="event.stopPropagation();_muToggleDailySong(\'' + s.id + '\')" title="' + (isDaily ? '取消推荐' : '设为推荐') + '">' + (isDaily ? '⭐' : '☆') + '</div>';
        if (!s.url && !s.blobData) h += '<div class="mu-song-del" style="opacity:1" onclick="event.stopPropagation();_muBindAudio(\'' + s.id + '\')"><svg viewBox="0 0 24 24" style="stroke:#aaa"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></div>';
        h += '<div class="mu-song-del" onclick="event.stopPropagation();_muDeleteSong(\'' + s.id + '\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        h += '</div>';
    }
    h += '</div>';
    return h;
}

function _muRenderSongArea() { var a = document.getElementById('muSongArea'); if (a) a.innerHTML = _muBuildSongList(); }

function _muGetAllSongs() {
    var all = _muSongs.slice(), ids = {};
    for (var i = 0; i < all.length; i++) ids[all[i].id] = true;
    for (var pi = 0; pi < _muPlaylists.length; pi++) {
        if (!_muPlaylists[pi].songs) continue;
        for (var si = 0; si < _muPlaylists[pi].songs.length; si++) {
            if (!ids[_muPlaylists[pi].songs[si].id]) { all.push(_muPlaylists[pi].songs[si]); ids[_muPlaylists[pi].songs[si].id] = true; }
        }
    }
    return all;
}

function _muGetFilteredSongs() {
    var all = _muGetAllSongs();
    if (!_muSearchKw) return all;
    var kw = _muSearchKw.toLowerCase(), r = [];
    for (var i = 0; i < all.length; i++) { var s = all[i]; if ((s.name || '').toLowerCase().indexOf(kw) >= 0 || (s.artist || '').toLowerCase().indexOf(kw) >= 0) r.push(s); }
    return r;
}

/* ============================================
   ★★★ 一起听 Listen Together — INS风
   ============================================ */
function _muRenderListen() {
    // 初始化char昵称
    if (!_muListenData.charName) {
        _muListenData.charName = _muCharNamePool[Math.floor(Math.random() * _muCharNamePool.length)];
        _muSave();
    }
    // 生成feed（如果为空则刷新）
    if (!_muListenFeed.length) _muRefreshListenFeed();

    var h = '<div class="mu-lt">';

    // ★ 悬浮式顶栏
    h += '<div class="mu-lt-topbar">';
    h += '<div class="mu-lt-topbar-title">♪ 一起听</div>';
    h += '<div class="mu-lt-topbar-sub">Listen Together</div>';
    h += '</div>';

    // ★ 双头像 + 耳机线
    h += '<div class="mu-lt-pair">';
    // 左边 user
    h += '<div class="mu-lt-person">';
    h += '<div class="mu-lt-avatar user" onclick="_muPickListenAvatar(\'user\')">';
    if (_muListenData.userListenAvatar) h += '<img src="' + _muEsc(_muListenData.userListenAvatar) + '">';
    else if (_muProfile.avatar) h += '<img src="' + _muEsc(_muProfile.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div>';
    h += '<div class="mu-lt-name">' + _muEsc(_muProfile.name || 'Me') + '</div>';
    h += '</div>';

    // 中间耳机线 SVG
    h += '<div class="mu-lt-cable">';
    h += '<svg viewBox="0 0 120 60" class="mu-lt-cable-svg">';
    // 左耳机
    h += '<circle cx="14" cy="22" r="8" fill="none" stroke="#d4a0b0" stroke-width="2"/>';
    h += '<rect x="8" y="12" width="12" height="6" rx="3" fill="#d4a0b0"/>';
    h += '<path d="M14 14 C14 4, 60 0, 60 10" stroke="#d4a0b0" stroke-width="2" fill="none" stroke-linecap="round"/>';
    // 右耳机
    h += '<circle cx="106" cy="22" r="8" fill="none" stroke="#b0c4d4" stroke-width="2"/>';
    h += '<rect x="100" y="12" width="12" height="6" rx="3" fill="#b0c4d4"/>';
    h += '<path d="M106 14 C106 4, 60 0, 60 10" stroke="#b0c4d4" stroke-width="2" fill="none" stroke-linecap="round"/>';
    // 中间节点
    h += '<circle cx="60" cy="10" r="3" fill="#e8d0d8"/>';
    h += '</svg>';
    if (_muCurrentSong && _muPlaying) {
        h += '<div class="mu-lt-now-playing">♫ ' + _muEsc(_muCurrentSong.name) + '</div>';
    } else {
        h += '<div class="mu-lt-now-playing idle">选首歌一起听吧~</div>';
    }
    h += '</div>';

    // 右边 char
    h += '<div class="mu-lt-person">';
    h += '<div class="mu-lt-avatar char" onclick="_muPickListenAvatar(\'char\')">';
    if (_muListenData.charAvatar) h += '<img src="' + _muEsc(_muListenData.charAvatar) + '">';
    else h += '<span class="mu-lt-avatar-emoji">🎧</span>';
    h += '</div>';
    h += '<div class="mu-lt-name" onclick="_muEditCharName()">' + _muEsc(_muListenData.charName) + ' <span style="font-size:8px;opacity:.4">✎</span></div>';
    h += '</div>';
    h += '</div>';

    // ★ 分割线 + 刷新
    h += '<div class="mu-lt-feed-header">';
    h += '<div class="mu-lt-feed-title">' + _muEsc(_muListenData.charName) + ' 的分享</div>';
    h += '<div class="mu-lt-refresh-btn" onclick="_muRefreshListenFeed();_muRender()">';
    h += '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>';
    h += '换一批</div>';
    h += '</div>';

    // ★ INS风 Feed 卡片
    h += '<div class="mu-lt-feed">';
    if (!_muListenFeed.length) {
        h += '<div class="mu-lt-feed-empty">还没有歌曲~<br>先去「发现」导入一些吧</div>';
    } else {
        for (var fi = 0; fi < _muListenFeed.length; fi++) {
            h += _muRenderFeedCard(fi);
        }
    }
    h += '</div>';
    h += '</div>';

    // 评论输入弹窗
    if (_muListenCommentTarget) {
        h += _muRenderCommentModal();
    }
    // 编辑弹窗
    if (_muListenEditModal) {
        h += _muRenderListenEditModal();
    }

    return h;
}

/* ===== Feed卡片渲染 ===== */
function _muRenderFeedCard(idx) {
    var song = _muListenFeed[idx];
    if (!song) return '';
    var likes = _muListenData.likes[song.id] || 0;
    var comments = _muListenData.comments[song.id] || [];
    var captions = [
        '最近单曲循环这首 🔁',
        '深夜emo必听 🌙',
        '这首歌让我想起了很多…',
        '超好听！强烈推荐 ♡',
        '今天的BGM 🎧',
        '第一次听就爱上了',
        '分享给你听 ♪',
        '这个旋律太治愈了~',
        '一个人的时候就听这首',
        '越听越上头 ✦',
        '宝藏歌曲！',
        '配上雨天刚好 🌧',
        '从前奏就爱了',
        '听到副歌直接起鸡皮疙瘩',
        '这首歌陪我度过了很多夜晚 🌃'
    ];
    // 用song.id做种子，保证同一首歌的caption固定
    var capIdx = 0;
    for (var ci = 0; ci < song.id.length; ci++) capIdx += song.id.charCodeAt(ci);
    var caption = captions[capIdx % captions.length];

    var timeLabels = ['刚刚', '3分钟前', '12分钟前', '半小时前', '1小时前', '2小时前', '昨天'];
    var timeLabel = timeLabels[idx % timeLabels.length];

    var h = '<div class="mu-lt-card">';
    // 卡片头部 — char头像 + 名字 + 时间
    h += '<div class="mu-lt-card-header">';
    h += '<div class="mu-lt-card-avatar">';
    if (_muListenData.charAvatar) h += '<img src="' + _muEsc(_muListenData.charAvatar) + '">';
    else h += '🎧';
    h += '</div>';
    h += '<div class="mu-lt-card-user">';
    h += '<div class="mu-lt-card-username">' + _muEsc(_muListenData.charName) + '</div>';
    h += '<div class="mu-lt-card-time">' + timeLabel + '</div>';
    h += '</div>';
    h += '<div class="mu-lt-card-more">···</div>';
    h += '</div>';

    // 卡片主体 — 歌曲封面
    h += '<div class="mu-lt-card-cover" onclick="_muPlaySong(\'' + song.id + '\')">';
    if (song.cover) {
        h += '<img src="' + _muEsc(song.cover) + '">';
    } else {
        h += '<div class="mu-lt-card-cover-placeholder">';
        h += '<div class="mu-lt-card-cover-note">♫</div>';
        h += '<div class="mu-lt-card-cover-name">' + _muEsc(song.name) + '</div>';
        h += '</div>';
    }
    h += '<div class="mu-lt-card-play-overlay"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
    h += '</div>';

    // 卡片底部 — 互动区
    h += '<div class="mu-lt-card-actions">';
    h += '<div class="mu-lt-card-action-left">';
    // 点赞
    h += '<div class="mu-lt-card-btn' + (likes > 0 ? ' liked' : '') + '" onclick="event.stopPropagation();_muToggleLike(\'' + song.id + '\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
    h += '</div>';
    // 评论
    h += '<div class="mu-lt-card-btn" onclick="event.stopPropagation();_muOpenComment(\'' + song.id + '\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
    h += '</div>';
    // 播放
    h += '<div class="mu-lt-card-btn" onclick="event.stopPropagation();_muPlaySong(\'' + song.id + '\')">';
    h += '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    h += '</div>';
    h += '</div>';
    h += '</div>';

    // 点赞数
    if (likes > 0) {
        h += '<div class="mu-lt-card-likes">' + likes + ' 个赞</div>';
    }

    // 标题
    h += '<div class="mu-lt-card-caption">';
    h += '<span class="mu-lt-card-caption-user">' + _muEsc(_muListenData.charName) + '</span> ';
    h += caption;
    h += '</div>';

    // 歌曲信息
    h += '<div class="mu-lt-card-song-info">';
    h += '<span class="mu-lt-card-song-icon">♪</span> ';
    h += _muEsc(song.name) + ' — ' + _muEsc(song.artist || '未知');
    h += '</div>';

    // 评论列表
    if (comments.length > 0) {
        h += '<div class="mu-lt-card-comments">';
        for (var ci2 = 0; ci2 < comments.length; ci2++) {
            var c = comments[ci2];
            h += '<div class="mu-lt-comment-item">';
            h += '<span class="mu-lt-comment-name' + (c.isChar ? ' char' : '') + '">' + _muEsc(c.name) + '</span> ';
            h += '<span class="mu-lt-comment-text">' + _muEsc(c.text) + '</span>';
            if (c.isChar && c.thinking) h += ' <span class="mu-lt-typing-dot">…</span>';
            h += '</div>';
        }
        h += '</div>';
    }

    // 评论入口
    h += '<div class="mu-lt-card-comment-btn" onclick="_muOpenComment(\'' + song.id + '\')">添加评论...</div>';

    h += '</div>';
    return h;
}

/* ===== Feed刷新 ===== */
function _muRefreshListenFeed() {
    var all = _muGetAllSongs();
    if (!all.length) { _muListenFeed = []; return; }
    // 随机选3~5首
    var shuffled = all.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    _muListenFeed = shuffled.slice(0, Math.min(shuffled.length, 3 + Math.floor(Math.random() * 3)));
}

/* ===== 头像编辑 ===== */
function _muPickListenAvatar(who) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        var r = new FileReader();
        r.onload = function (e) {
            if (who === 'char') _muListenData.charAvatar = e.target.result;
            else _muListenData.userListenAvatar = e.target.result;
            _muSave(); _muRender();
        };
        r.readAsDataURL(inp.files[0]);
    };
    inp.click();
}

/* ===== Char昵称编辑 ===== */
function _muEditCharName() {
    _muListenEditModal = 'charname';
    _muRender();
}

function _muRenderListenEditModal() {
    var h = '<div class="mu-edit-overlay" onclick="_muListenEditModal=\'\';_muRender()">';
    h += '<div class="mu-edit-modal" onclick="event.stopPropagation()">';
    if (_muListenEditModal === 'charname') {
        h += '<div class="mu-edit-title">修改昵称</div>';
        h += '<input class="mu-edit-input" id="muCharNameInput" value="' + _muEsc(_muListenData.charName) + '" placeholder="输入昵称">';
        h += '<div class="mu-lt-name-hints">';
        for (var ni = 0; ni < Math.min(6, _muCharNamePool.length); ni++) {
            var rIdx = (Date.now() + ni * 7) % _muCharNamePool.length;
            h += '<span class="mu-lt-name-hint" onclick="document.getElementById(\'muCharNameInput\').value=\'' + _muEsc(_muCharNamePool[rIdx]) + '\'">' + _muEsc(_muCharNamePool[rIdx]) + '</span>';
        }
        h += '</div>';
        h += '<div class="mu-edit-btns"><div class="mu-edit-btn cancel" onclick="_muListenEditModal=\'\';_muRender()">取消</div><div class="mu-edit-btn ok" onclick="_muSaveCharName()">保存</div></div>';
    }
    h += '</div></div>';
    return h;
}

function _muSaveCharName() {
    var inp = document.getElementById('muCharNameInput');
    if (inp && inp.value.trim()) {
        _muListenData.charName = inp.value.trim();
        _muSave();
    }
    _muListenEditModal = '';
    _muRender();
}

/* ===== 点赞 ===== */
function _muToggleLike(songId) {
    if (!_muListenData.likes) _muListenData.likes = {};
    if (_muListenData.likes[songId]) {
        _muListenData.likes[songId] = 0;
    } else {
        _muListenData.likes[songId] = 1;
    }
    _muSave(); _muRender();
}

/* ===== 评论 ===== */
function _muOpenComment(songId) {
    _muListenCommentTarget = songId;
    _muListenCommentText = '';
    _muRender();
    setTimeout(function () {
        var inp = document.getElementById('muCommentInput');
        if (inp) inp.focus();
    }, 100);
}

function _muRenderCommentModal() {
    var h = '<div class="mu-lt-comment-overlay" onclick="_muListenCommentTarget=\'\';_muRender()">';
    h += '<div class="mu-lt-comment-modal" onclick="event.stopPropagation()">';
    h += '<div class="mu-lt-comment-modal-title">评论</div>';

    // 已有评论
    var comments = _muListenData.comments[_muListenCommentTarget] || [];
    if (comments.length > 0) {
        h += '<div class="mu-lt-comment-list">';
        for (var i = 0; i < comments.length; i++) {
            var c = comments[i];
            h += '<div class="mu-lt-comment-row">';
            h += '<div class="mu-lt-comment-row-avatar">';
            if (c.isChar) {
                if (_muListenData.charAvatar) h += '<img src="' + _muEsc(_muListenData.charAvatar) + '">';
                else h += '🎧';
            } else {
                if (_muListenData.userListenAvatar || _muProfile.avatar) h += '<img src="' + _muEsc(_muListenData.userListenAvatar || _muProfile.avatar) + '">';
                else h += '👤';
            }
            h += '</div>';
            h += '<div class="mu-lt-comment-row-body">';
            h += '<span class="mu-lt-comment-row-name' + (c.isChar ? ' char' : '') + '">' + _muEsc(c.name) + '</span> ';
            h += '<span>' + _muEsc(c.text) + '</span>';
            h += '</div></div>';
        }
        h += '</div>';
    }

    // 输入区
    h += '<div class="mu-lt-comment-input-row">';
    h += '<input class="mu-lt-comment-input" id="muCommentInput" placeholder="说点什么..." value="' + _muEsc(_muListenCommentText) + '" oninput="_muListenCommentText=this.value" onkeydown="if(event.key===\'Enter\'){event.preventDefault();_muSendComment()}">';
    h += '<div class="mu-lt-comment-send" onclick="_muSendComment()">发送</div>';
    h += '</div>';
    h += '</div></div>';
    return h;
}

function _muSendComment() {
    if (!_muListenCommentText.trim()) return;
    var songId = _muListenCommentTarget;
    if (!_muListenData.comments) _muListenData.comments = {};
    if (!_muListenData.comments[songId]) _muListenData.comments[songId] = [];

    // 添加用户评论
    _muListenData.comments[songId].push({
        name: _muProfile.name || 'Me',
        text: _muListenCommentText.trim(),
        isChar: false,
        time: Date.now()
    });
    _muSave();

    var userMsg = _muListenCommentText.trim();
    _muListenCommentText = '';
    _muRender();

    // ★ 触发Char回复
    _muTriggerCharReply(songId, userMsg);
}

/* ===== Char AI 回复 ===== */
function _muTriggerCharReply(songId, userMsg) {
    var song = _muFindSongById(songId);
    var songName = song ? song.name : '未知';
    var songArtist = song ? (song.artist || '未知') : '未知';

    // 构造prompt注入到对话中
    var contextPrompt = '[系统提示：用户正在音乐APP「一起听」功能中，对你分享的歌曲「' + songName + '」(' + songArtist + ') 发表了评论："' + userMsg + '"。请你以角色身份简短回复这条评论(1-2句话)，要贴合你的人设性格，可以聊聊对这首歌的感受。不要使用括号描述动作，只需要纯对话文字回复。]';

    // 尝试使用SillyTavern API
    var replied = false;

    // 方法1: SillyTavern context API
    if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
        try {
            var ctx = SillyTavern.getContext();
            if (ctx && typeof ctx.generate === 'function') {
                _muShowCharTyping(songId);
                ctx.generate(contextPrompt).then(function (reply) {
                    _muAddCharComment(songId, reply);
                }).catch(function () {
                    _muAddCharComment(songId, _muGetFallbackReply(userMsg, songName));
                });
                replied = true;
            }
        } catch (e) { }
    }

    // 方法2: 全局generate函数
    if (!replied && typeof generateQuietPrompt === 'function') {
        try {
            _muShowCharTyping(songId);
            generateQuietPrompt(contextPrompt).then(function (reply) {
                _muAddCharComment(songId, reply);
            }).catch(function () {
                _muAddCharComment(songId, _muGetFallbackReply(userMsg, songName));
            });
            replied = true;
        } catch (e) { }
    }

    // 方法3: 降级到预设回复
    if (!replied) {
        _muShowCharTyping(songId);
        setTimeout(function () {
            _muAddCharComment(songId, _muGetFallbackReply(userMsg, songName));
        }, 1200 + Math.random() * 1800);
    }
}

function _muShowCharTyping(songId) {
    if (!_muListenData.comments[songId]) _muListenData.comments[songId] = [];
    _muListenData.comments[songId].push({
        name: _muListenData.charName,
        text: '正在输入',
        isChar: true,
        thinking: true,
        time: Date.now()
    });
    _muRender();
}

function _muAddCharComment(songId, text) {
    if (!_muListenData.comments[songId]) _muListenData.comments[songId] = [];
    // 移除typing占位
    _muListenData.comments[songId] = _muListenData.comments[songId].filter(function (c) { return !c.thinking; });
    // 清理回复文本
    var clean = (text || '').replace(/^\s*["「]|["」]\s*$/g, '').trim();
    if (!clean) clean = '嗯嗯~';
    // 限制长度
    if (clean.length > 100) clean = clean.substring(0, 100) + '…';

    _muListenData.comments[songId].push({
        name: _muListenData.charName,
        text: clean,
        isChar: true,
        time: Date.now()
    });
    _muSave(); _muRender();
}

function _muGetFallbackReply(userMsg, songName) {
    var pool = [
        '这首歌真的很好听呢~每次听都有不同的感觉 ♪',
        '嗯！我也超喜欢这首！旋律太治愈了~',
        '哈哈，被你发现了，我最近一直在循环这首',
        '能和你一起听这首歌好开心 ♡',
        songName + ' 这首歌对我来说很特别呢…',
        '谢谢你的评论！下次给你分享更多好听的~',
        '这首歌的歌词写得特别好，你有注意到吗？',
        '深夜听这首特别有感觉~',
        '嘿嘿，看来我们品味很像呢 ✦',
        '每次听到副歌部分都会起鸡皮疙瘩！',
        '你说得对！我也有同感~',
        '这首歌让我想起了很多回忆…',
        '下次一起听更多好歌吧 🎵'
    ];

    // 根据用户消息做简单匹配
    var lower = userMsg.toLowerCase();
    if (lower.indexOf('好听') >= 0 || lower.indexOf('喜欢') >= 0 || lower.indexOf('爱') >= 0) {
        return ['嘿嘿，我也超喜欢！品味一样呢~', '对吧对吧！越听越上头 ♪', '谢谢你也喜欢！好开心~'][Math.floor(Math.random() * 3)];
    }
    if (lower.indexOf('推荐') >= 0 || lower.indexOf('还有') >= 0) {
        return ['下次给你分享更多宝藏歌曲！', '我歌单里还有很多好听的，下次分享给你~'][Math.floor(Math.random() * 2)];
    }
    if (lower.indexOf('难过') >= 0 || lower.indexOf('emo') >= 0 || lower.indexOf('哭') >= 0) {
        return ['抱抱你…这首歌也陪我度过了很多低落的时刻', '别难过啦，让音乐治愈你 ♡'][Math.floor(Math.random() * 2)];
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

/* ===== 我 ===== */
function _muRenderMe() {
    var p = _muProfile, h = '<div class="mu-me">';
    h += '<div class="mu-profile-card"><div class="mu-profile-avatar" onclick="_muPickAvatar()">';
    if (p.avatar) h += '<img src="' + _muEsc(p.avatar) + '">'; else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '<div class="mu-av-hint">点击更换</div></div><div class="mu-profile-info">';
    h += '<div class="mu-profile-name" onclick="_muEditField(\'name\')">' + _muEsc(p.name) + '</div>';
    h += '<div class="mu-profile-meta"><div class="mu-profile-tag" onclick="_muEditField(\'age\')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>歌龄 ' + _muEsc(p.age) + '</div>';
    h += '<div class="mu-profile-tag" onclick="_muEditField(\'ip\')"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>IP ' + _muEsc(p.ip) + '</div></div>';
    h += '<div class="mu-profile-sig" onclick="_muEditField(\'sig\')">' + _muEsc(p.sig) + '</div></div></div>';

    h += '<div class="mu-import-sec"><div class="mu-import-title">导入歌曲 Import</div>';
    h += '<div class="mu-import-row" style="margin-bottom:6px"><input class="mu-import-input" placeholder="歌曲名称" id="muImportName"><input class="mu-import-input" placeholder="歌手" id="muImportArtist" style="max-width:80px"></div>';
    h += '<div class="mu-import-row" style="margin-bottom:8px"><input class="mu-import-input" placeholder="音频URL" id="muImportUrl"><div class="mu-import-btn" onclick="_muImportSong()">导入</div></div>';
    h += '<div class="mu-import-row"><div class="mu-import-btn file" onclick="_muImportFile()" style="flex:1"><svg viewBox="0 0 24 24" width="12" height="12" style="stroke:currentColor;stroke-width:2;fill:none;vertical-align:-2px;margin-right:3px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>本地文件</div>';
    h += '<div class="mu-import-btn file" onclick="_muShowBatchImport(\'\')" style="flex:1"><svg viewBox="0 0 24 24" width="12" height="12" style="stroke:currentColor;stroke-width:2;fill:none;vertical-align:-2px;margin-right:3px"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>批量导入</div></div></div>';

    h += '<div class="mu-playlist-sec"><div class="mu-playlist-header"><div class="mu-playlist-title">我的歌单 Playlists</div><div style="display:flex;gap:4px">';
    h += '<div class="mu-export-btn" onclick="_muExportAll()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>导出</div>';
    h += '<div class="mu-export-btn" onclick="_muShowJsonImport()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>导入</div>';
    h += '<div class="mu-playlist-add" onclick="_muCreatePlaylist()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新建</div></div></div>';

    if (_muPlaylistDetail) { h += _muRenderPlaylistDetail(); }
    else {
        h += '<div class="mu-playlist-list">';
        if (!_muPlaylists.length) h += '<div class="mu-playlist-empty">还没有歌单~点击右上角新建</div>';
        var icons = ['🎶', '💿', '🎸', '🎹', '🎧', '🌸', '🌙', '☕', '💎', '🎀'];
        for (var i = 0; i < _muPlaylists.length; i++) {
            var pl = _muPlaylists[i];
            h += '<div class="mu-playlist-item" onclick="_muOpenPlaylist(\'' + pl.id + '\')"><div class="mu-playlist-cover">' + icons[i % icons.length] + '</div><div class="mu-playlist-info"><div class="mu-playlist-name">' + _muEsc(pl.name) + '</div><div class="mu-playlist-count">' + (pl.songs || []).length + ' 首歌曲</div></div>';
            h += '<div class="mu-song-del" style="opacity:.4" onclick="event.stopPropagation();_muDeletePlaylist(\'' + pl.id + '\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
        }
        h += '</div>';
    }
    h += '</div>';
    var allSongs = _muGetAllSongs();
    h += '<div class="mu-allsongs-sec"><div class="mu-section-title">全部歌曲 All Songs <span style="font-weight:400;font-size:10px;color:rgba(140,140,140,.4)">(' + allSongs.length + ')</span></div>';
    if (!allSongs.length) h += '<div class="mu-empty">还没有任何歌曲~</div>';
    else h += _muRenderSongListHTML(allSongs);
    h += '</div></div>';
    return h;
}

function _muRenderPlaylistDetail() {
    var pl = null;
    for (var i = 0; i < _muPlaylists.length; i++) { if (_muPlaylists[i].id === _muPlaylistDetail) { pl = _muPlaylists[i]; break; } }
    if (!pl) { _muPlaylistDetail = null; return ''; }
    var icons = ['🎶', '💿', '🎸', '🎹', '🎧', '🌸', '🌙', '☕', '💎', '🎀'];
    var idx = _muPlaylists.indexOf(pl);
    var h = '<div class="mu-pl-detail"><div style="margin-bottom:10px"><span style="font-size:10px;color:#bbb;cursor:pointer" onclick="_muPlaylistDetail=null;_muRender()">← 返回歌单列表</span></div>';
    h += '<div class="mu-pl-detail-header"><div class="mu-pl-detail-cover">' + icons[idx % icons.length] + '</div><div class="mu-pl-detail-info"><div class="mu-pl-detail-name">' + _muEsc(pl.name) + '</div><div class="mu-pl-detail-count">' + (pl.songs || []).length + ' 首</div></div></div>';
    h += '<div class="mu-import-sec" style="margin-top:0;margin-bottom:12px"><div class="mu-import-title">添加歌曲到此歌单</div>';
    h += '<div class="mu-import-row" style="margin-bottom:6px"><input class="mu-import-input" placeholder="歌曲名称" id="muPlSongName"><input class="mu-import-input" placeholder="歌手" id="muPlSongArtist" style="max-width:80px"></div>';
    h += '<div class="mu-import-row" style="margin-bottom:8px"><input class="mu-import-input" placeholder="音频URL" id="muPlSongUrl"><div class="mu-import-btn" onclick="_muAddSongToPlaylist(\'' + pl.id + '\')">添加</div></div>';
    h += '<div class="mu-import-row"><div class="mu-import-btn file" onclick="_muImportFileToPlaylist(\'' + pl.id + '\')" style="flex:1"><svg viewBox="0 0 24 24" width="12" height="12" style="stroke:currentColor;stroke-width:2;fill:none;vertical-align:-2px;margin-right:3px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>本地文件</div>';
    h += '<div class="mu-import-btn file" onclick="_muShowBatchImport(\'' + pl.id + '\')" style="flex:1"><svg viewBox="0 0 24 24" width="12" height="12" style="stroke:currentColor;stroke-width:2;fill:none;vertical-align:-2px;margin-right:3px"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>批量导入</div></div></div>';
    if (!(pl.songs || []).length) h += '<div class="mu-empty">歌单还是空的~</div>';
    else {
        h += '<div class="mu-song-list">';
        for (var s = 0; s < pl.songs.length; s++) {
            var song = pl.songs[s], isP = _muCurrentSong && _muCurrentSong.id === song.id && _muPlaying;
            h += '<div class="mu-song-item' + (isP ? ' playing' : '') + '" onclick="_muPlaySong(\'' + song.id + '\')"><div class="mu-song-idx">' + (s + 1) + '</div><div class="mu-song-cover">' + (song.cover ? '<img src="' + _muEsc(song.cover) + '">' : '🎵') + '</div><div class="mu-song-info"><div class="mu-song-name">' + _muEsc(song.name);
            if (!song.url && !song.blobData) h += ' <span style="font-size:8px;color:#daa;font-weight:400">未绑定</span>';
            h += '</div><div class="mu-song-artist">' + _muEsc(song.artist || '未知') + '</div></div>';
            h += '<div class="mu-song-star' + (_muIsSongInDaily(song.id) ? ' active' : '') + '" onclick="event.stopPropagation();_muToggleDailySong(\'' + song.id + '\')">' + (_muIsSongInDaily(song.id) ? '⭐' : '☆') + '</div>';
            h += '<div class="mu-song-del" onclick="event.stopPropagation();_muRemoveSongFromPlaylist(\'' + pl.id + '\',\'' + song.id + '\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
        }
        h += '</div>';
    }
    h += '</div>';
    return h;
}

/* ===== 播放条 ===== */
function _muRenderPlayerBar() {
    var s = _muCurrentSong, pct = 0;
    if (_muPlayer && _muPlayer.duration) pct = (_muPlayer.currentTime / _muPlayer.duration) * 100;
    var h = '<div class="mu-player-bar" onclick="_muShowFull=true;_muRender()" style="position:relative">';
    h += '<div class="mu-player-bar-cover">' + (s.cover ? '<img src="' + _muEsc(s.cover) + '">' : '🎵') + '</div>';
    h += '<div class="mu-player-bar-info"><div class="mu-player-bar-name">' + _muEsc(s.name) + '</div><div class="mu-player-bar-artist">' + _muEsc(s.artist || '') + '</div></div>';
    h += '<div class="mu-player-bar-btn" onclick="event.stopPropagation();_muTogglePlay()"><svg viewBox="0 0 24 24">';
    if (_muPlaying) h += '<line x1="10" y1="5" x2="10" y2="19"/><line x1="14" y1="5" x2="14" y2="19"/>'; else h += '<polygon points="5 3 19 12 5 21 5 3"/>';
    h += '</svg></div>';
    h += '<div class="mu-player-bar-btn" onclick="event.stopPropagation();_muToggleFloat()" style="opacity:.5;width:24px;height:24px" title="桌面歌词"><svg viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>';
    h += '<div class="mu-player-bar-progress" style="width:' + pct + '%"></div></div>';
    return h;
}

/* ===== 全屏播放器（含歌词） ===== */
function _muRenderFullPlayer() {
    var s = _muCurrentSong, cur = 0, dur = 0, pct = 0;
    if (_muPlayer) { cur = _muPlayer.currentTime || 0; dur = _muPlayer.duration || 0; if (dur > 0) pct = (cur / dur) * 100; }

    var hasLyrics = s.lyrics && s.lyrics.length > 0;
    var parsedLrc = hasLyrics ? _muParseLRC(s.lyrics) : [];
    if (parsedLrc.length > 0) hasLyrics = true; else hasLyrics = false;

    var h = '<div class="mu-player-full">';
    h += '<div class="mu-pf-header"><div class="mu-pf-close" onclick="_muShowFull=false;_muRender()"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></div><div class="mu-pf-title">NOW PLAYING</div><div class="mu-pf-spacer"></div></div>';
    h += '<div class="mu-pf-body' + (hasLyrics ? ' has-lyrics' : '') + '">';
    h += '<div class="mu-pf-disc' + (_muPlaying ? ' spinning' : '') + '">';
    if (s.cover) h += '<img src="' + _muEsc(s.cover) + '">'; else h += '🎵';
    h += '</div>';
    h += '<div class="mu-pf-song">' + _muEsc(s.name) + '</div>';
    h += '<div class="mu-pf-artist">' + _muEsc(s.artist || '未知歌手') + '</div>';

    // ★ 歌词区域（初次渲染，后续只局部更新class）
    if (hasLyrics) {
        var activeIdx = _muFindActiveLyricIdx(parsedLrc, cur);
        h += '<div class="mu-pf-lyrics" id="muLyricsBox">';
        for (var li = 0; li < parsedLrc.length; li++) {
            var cls = '';
            if (li === activeIdx) cls = ' active';
            else if (activeIdx >= 0 && Math.abs(li - activeIdx) === 1) cls = ' near';
            h += '<div class="mu-pf-lyric-line' + cls + '">' + _muEsc(parsedLrc[li].text) + '</div>';
        }
        h += '</div>';
    } else {
        h += '<div class="mu-pf-no-lyrics">暂无歌词</div>';
    }

    h += '<div class="mu-pf-progress"><div class="mu-pf-time">' + _muFmtTime(cur) + '</div><div class="mu-pf-bar-wrap" onclick="_muSeek(event)"><div class="mu-pf-bar-bg"></div><div class="mu-pf-bar-fill" style="width:' + pct + '%"></div><div class="mu-pf-bar-dot" style="left:' + pct + '%"></div></div><div class="mu-pf-time">' + _muFmtTime(dur) + '</div></div>';
    h += '<div class="mu-pf-controls">';
    h += '<div class="mu-pf-ctrl" onclick="_muPrev()"><svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></div>';
    h += '<div class="mu-pf-ctrl big" onclick="_muTogglePlay()"><svg viewBox="0 0 24 24">';
    if (_muPlaying) h += '<line x1="10" y1="5" x2="10" y2="19"/><line x1="14" y1="5" x2="14" y2="19"/>';
    else h += '<polygon points="5 3 19 12 5 21 5 3"/>';
    h += '</svg></div>';
    h += '<div class="mu-pf-ctrl" onclick="_muNext()"><svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></div>';
    h += '</div></div></div>';
    return h;
}
/* ===== LRC歌词解析 ===== */
function _muParseLRC(lrcStr) {
    if (!lrcStr) return [];
    var lines = lrcStr.split('\n'), result = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var match = line.match(/^\[(\d{1,2}):(\d{2})(?:[.:]\d+)?\](.*)/);
        if (match) {
            var time = parseInt(match[1]) * 60 + parseInt(match[2]);
            var text = match[3].trim();
            if (text) result.push({ time: time, text: text });
        }
    }
    result.sort(function (a, b) { return a.time - b.time; });
    return result;
}

function _muFindActiveLyricIdx(parsed, currentTime) {
    var idx = -1;
    for (var i = 0; i < parsed.length; i++) {
        if (parsed[i].time <= currentTime) idx = i;
        else break;
    }
    return idx;
}

function _muScrollToActiveLyric() {
    setTimeout(function () {
        var box = document.getElementById('muLyricsBox');
        if (!box) return;
        var active = box.querySelector('.mu-pf-lyric-line.active');
        if (active) {
            var boxH = box.clientHeight;
            var top = active.offsetTop - box.offsetTop - boxH / 2 + active.clientHeight / 2;
            box.scrollTop = Math.max(0, top);
        }
    }, 50);
}

/* ===== Dock ===== */
function _muRenderDock() {
    var tabs = [
        { id: 'home', label: '首页', icon: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
        { id: 'listen', label: '一起听', icon: '<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>' },
        { id: 'me', label: '我', icon: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
    ];
    var h = '<div class="mu-dock">';
    for (var i = 0; i < tabs.length; i++) { var t = tabs[i]; h += '<div class="mu-dock-item' + (t.id === _muTab ? ' active' : '') + '" onclick="_muSwitchTab(\'' + t.id + '\')">' + t.icon + '<div class="mu-dock-label">' + t.label + '</div></div>'; }
    h += '</div>'; return h;
}
function _muSwitchTab(tab) { _muTab = tab; _muShowFull = false; _muPlaylistDetail = null; _muSearchKw = ''; _muEditType = ''; _muImportModal = ''; _muPickDaily = false; _muRender(); }

/* ========================================
   ★ 每日推荐逻辑
   ======================================== */
function _muIsSongInDaily(songId) { for (var i = 0; i < _muDailyList.length; i++) { if (_muDailyList[i].songRef === songId) return true; } return false; }

function _muToggleDailySong(songId) {
    for (var i = 0; i < _muDailyList.length; i++) { if (_muDailyList[i].songRef === songId) { _muDailyList.splice(i, 1); _muSave(); _muRender(); return; } }
    if (_muDailyList.length >= 5) { if (typeof showToast === 'function') showToast('最多5首'); return; }
    var song = _muFindSongById(songId); if (!song) return;
    _muDailyList.push({ id: 'dr_' + Date.now(), name: song.name, artist: song.artist || '', url: song.url || '', cover: song.cover || '', coverEmoji: '🎵', songRef: songId });
    _muSave(); _muRender(); if (typeof showToast === 'function') showToast('已添加到每日推荐');
}

function _muAddDailyPick() { if (_muGetAllSongs().length > 0) { _muPickDaily = true; _muRender(); } else { _muEditType = 'daily_new'; _muRender(); } }

function _muRenderPickDailyModal() {
    var all = _muGetAllSongs();
    var h = '<div class="mu-pick-overlay"><div class="mu-pick-header"><div class="mu-pick-close" onclick="_muPickDaily=false;_muRender()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><div class="mu-pick-title">选择每日推荐 (' + _muDailyList.length + '/5)</div><div class="mu-pick-spacer"></div></div><div class="mu-pick-body">';
    h += '<div class="mu-pick-song" onclick="_muPickDaily=false;_muEditType=\'daily_new\';_muRender()" style="border-bottom:1px solid rgba(0,0,0,.04);margin-bottom:6px;padding-bottom:12px"><div class="mu-pick-song-idx" style="font-size:14px">✚</div><div class="mu-pick-song-info"><div class="mu-pick-song-name" style="color:#a88">手动添加</div><div class="mu-pick-song-artist">自定义URL</div></div></div>';
    for (var i = 0; i < all.length; i++) { var s = all[i], isD = _muIsSongInDaily(s.id); h += '<div class="mu-pick-song' + (isD ? ' in-daily' : '') + '" onclick="_muPickDailySong(\'' + s.id + '\')"><div class="mu-pick-song-idx">' + (i + 1) + '</div><div class="mu-pick-song-info"><div class="mu-pick-song-name">' + _muEsc(s.name) + '</div><div class="mu-pick-song-artist">' + _muEsc(s.artist || '未知') + '</div></div><div class="mu-pick-song-star">' + (isD ? '⭐' : '☆') + '</div></div>'; }
    h += '</div></div>'; return h;
}
function _muPickDailySong(songId) { _muToggleDailySong(songId); _muPickDaily = true; _muRender(); }

function _muPlayDailyItem(idx) {
    if (idx < 0 || idx >= _muDailyList.length) return;
    var d = _muDailyList[idx];
    if (d.songRef) { var song = _muFindSongById(d.songRef); if (song) { _muPlaySong(d.songRef); return; } }
    _muCurrentSong = { id: d.id, name: d.name, artist: d.artist, url: d.url, cover: d.cover || '', lyrics: '' };
    _muCurrentIdx = -1; _muDoPlay(d.url);
}
function _muRemoveDaily(idx) { _muDailyList.splice(idx, 1); _muSave(); _muRender(); }
function _muEditDailyCover(idx) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () { if (!inp.files || !inp.files[0]) return; var r = new FileReader(); r.onload = function (e) { _muDailyList[idx].cover = e.target.result; _muDailyList[idx].coverEmoji = ''; _muSave(); _muRender(); }; r.readAsDataURL(inp.files[0]); }; inp.click();
}
function _muEditDailyInfo(idx) { _muEditType = 'daily_edit_' + idx; _muRender(); }
function _muFindSongById(songId) {
    for (var i = 0; i < _muSongs.length; i++) { if (_muSongs[i].id === songId) return _muSongs[i]; }
    for (var pi = 0; pi < _muPlaylists.length; pi++) { if (!_muPlaylists[pi].songs) continue; for (var si = 0; si < _muPlaylists[pi].songs.length; si++) { if (_muPlaylists[pi].songs[si].id === songId) return _muPlaylists[pi].songs[si]; } }
    return null;
}

/* ========================================
   ★ 播放核心
   ======================================== */
function _muPlaySong(songId) {
    var all = _muGetAllSongs(), song = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === songId) { song = all[i]; _muCurrentIdx = i; break; } }
    if (!song) return;
    _muCurrentSong = song;

    // 1. 内存中有blobData（刚导入还没刷新）
    if (song.blobData) {
        if (_muBlobCache[song.id]) { _muDoPlay(_muBlobCache[song.id]); return; }
        try {
            var bs = atob(song.blobData.split(',')[1]);
            var mm = song.blobData.match(/data:([^;]+);/);
            var mime = mm ? mm[1] : 'audio/mpeg';
            var ab = new ArrayBuffer(bs.length), ia = new Uint8Array(ab);
            for (var b = 0; b < bs.length; b++) ia[b] = bs.charCodeAt(b);
            var url = URL.createObjectURL(new Blob([ab], { type: mime }));
            _muBlobCache[song.id] = url;
            _muDoPlay(url); return;
        } catch (e) { /* fall through */ }
    }

    // 2. 有在线URL
    if (song.url) { _muDoPlay(song.url); return; }

    // 3. 内存缓存中有（从IndexedDB恢复过的）
    if (_muBlobCache[songId]) { _muDoPlay(_muBlobCache[songId]); return; }

    // 4. 尝试从IndexedDB加载
    _muLoadAudioFromDB(songId, function (blobUrl) {
        if (blobUrl) {
            _muBlobCache[songId] = blobUrl;
            _muDoPlay(blobUrl);
        } else {
            if (typeof showToast === 'function') showToast('音源已失效，请重新绑定');
            _muRender();
        }
    });
}

function _muDoPlay(url) {
    if (!url) { if (typeof showToast === 'function') showToast('无效音频地址'); return; }
    if (!_muPlayer) {
        _muPlayer = new Audio();
        _muPlayer.addEventListener('ended', function () { _muPlaying = false; _muNext(); });
        _muPlayer.addEventListener('error', function () { _muPlaying = false; _muRender(); if (typeof showToast === 'function') showToast('音频加载失败'); });
    }
    _muPlayer.removeAttribute('crossOrigin');
    _muPlayer.src = url; _muPlayer.load();
    var p = _muPlayer.play(); if (p && p.then) p.then(function () { _muPlaying = true; _muRender(); }).catch(function () { _muPlaying = false; _muRender(); });
    _muPlaying = true; _muRender();
}
function _muTogglePlay() {
    if (!_muPlayer || !_muCurrentSong) return;
    if (_muPlaying) {
        _muPlayer.pause(); _muPlaying = false;
    } else {
        _muPlayer.play().catch(function () { });
        _muPlaying = true;
    }
    // 如果在全屏，局部更新播放按钮而不是整体重渲染
    if (_muShowFull) {
        var btn = document.querySelector('.mu-pf-ctrl.big svg');
        if (btn) {
            if (_muPlaying) btn.innerHTML = '<line x1="10" y1="5" x2="10" y2="19"/><line x1="14" y1="5" x2="14" y2="19"/>';
            else btn.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
        }
        var disc = document.querySelector('.mu-pf-disc');
        if (disc) { if (_muPlaying) disc.classList.add('spinning'); else disc.classList.remove('spinning'); }
        _muStartTimer();
    } else {
        _muRender();
    }
}
function _muPrev() { var all = _muGetAllSongs(); if (!all.length) return; _muCurrentIdx = (_muCurrentIdx - 1 + all.length) % all.length; _muPlaySong(all[_muCurrentIdx].id); }
function _muNext() { var all = _muGetAllSongs(); if (!all.length) return; _muCurrentIdx = (_muCurrentIdx + 1) % all.length; _muPlaySong(all[_muCurrentIdx].id); }
function _muSeek(e) { if (!_muPlayer || !_muPlayer.duration) return; var r = e.currentTarget.getBoundingClientRect(); _muPlayer.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * _muPlayer.duration; _muRender(); }
function _muFmtTime(sec) { if (!sec || isNaN(sec)) return '0:00'; var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

function _muStartTimer() {
    clearInterval(_muTimer);
    if (_muPlaying) {
        _muTimer = setInterval(function () {
            if (!_muPlaying) { clearInterval(_muTimer); return; }
            if (_muShowFull) {
                // ★ 局部更新，不重建DOM
                _muUpdateFullPlayerUI();
            } else {
                var bar = document.querySelector('.mu-player-bar-progress');
                if (bar && _muPlayer && _muPlayer.duration)
                    bar.style.width = ((_muPlayer.currentTime / _muPlayer.duration) * 100) + '%';
            }
        }, 300);
    }
}

/* ★ 全屏播放器 — 局部更新（不重建DOM，不闪烁） */
function _muUpdateFullPlayerUI() {
    if (!_muPlayer || !_muCurrentSong) return;
    var cur = _muPlayer.currentTime || 0;
    var dur = _muPlayer.duration || 0;
    var pct = dur > 0 ? (cur / dur) * 100 : 0;

    // 更新时间文本
    var times = document.querySelectorAll('.mu-pf-time');
    if (times.length >= 2) {
        times[0].textContent = _muFmtTime(cur);
        times[1].textContent = _muFmtTime(dur);
    }

    // 更新进度条
    var fill = document.querySelector('.mu-pf-bar-fill');
    var dot = document.querySelector('.mu-pf-bar-dot');
    if (fill) fill.style.width = pct + '%';
    if (dot) dot.style.left = pct + '%';

    // 更新唱片旋转状态
    var disc = document.querySelector('.mu-pf-disc');
    if (disc) {
        if (_muPlaying && !disc.classList.contains('spinning')) disc.classList.add('spinning');
        if (!_muPlaying && disc.classList.contains('spinning')) disc.classList.remove('spinning');
    }

    // ★ 更新歌词高亮（核心：只改class，不重建）
    var lyricsBox = document.getElementById('muLyricsBox');
    if (lyricsBox && _muCurrentSong.lyrics) {
        var parsed = _muParseLRC(_muCurrentSong.lyrics);
        var activeIdx = _muFindActiveLyricIdx(parsed, cur);
        var lines = lyricsBox.querySelectorAll('.mu-pf-lyric-line');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            // 移除旧class
            line.classList.remove('active', 'near');
            // 加新class
            if (i === activeIdx) {
                line.classList.add('active');
            } else if (activeIdx >= 0 && Math.abs(i - activeIdx) === 1) {
                line.classList.add('near');
            }
        }
        // 自动滚动到当前歌词
        if (activeIdx >= 0 && lines[activeIdx]) {
            var boxH = lyricsBox.clientHeight;
            var lineEl = lines[activeIdx];
            var targetTop = lineEl.offsetTop - lyricsBox.offsetTop - boxH / 2 + lineEl.clientHeight / 2;
            // 平滑滚动
            lyricsBox.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }
    }
}

/* ========================================
   ★★★ 文件导入 — ID3解析封面+歌词 ★★★
   ======================================== */
function _muImportFile() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac'; inp.multiple = true;
    inp.onchange = function () { if (!inp.files || !inp.files.length) return; _muProcessFiles(inp.files, null); };
    inp.click();
}

function _muImportFileToPlaylist(plId) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac'; inp.multiple = true;
    inp.onchange = function () { if (!inp.files || !inp.files.length) return; _muProcessFiles(inp.files, plId); };
    inp.click();
}

function _muProcessFiles(files, plId) {
    var count = 0;
    for (var i = 0; i < files.length; i++) {
        (function (file) {
            if (!file.type.startsWith('audio/')) return;
            var songId = _muGenId();
            var blobUrl = URL.createObjectURL(file);
            var fname = file.name.replace(/\.[^.]+$/, '');
            var songObj = { id: songId, name: fname, artist: '', url: '', cover: '', lyrics: '' };

            // ★ 存入IndexedDB持久化
            var dbReader = new FileReader();
            dbReader.onload = function (ev) {
                _muSaveAudioToDB(songId, ev.target.result, file.type || 'audio/mpeg');
            };
            dbReader.readAsArrayBuffer(file);

            // 内存中临时保留blobData用于当次播放
            _muBlobCache[songId] = blobUrl;

            // 也存base64用于当次会话中播放(小文件)
            var reader = new FileReader();
            reader.onload = function (e) {
                if (file.size < 8 * 1024 * 1024) songObj.blobData = e.target.result;

                // ID3标签识别
                if (typeof jsmediatags !== 'undefined') {
                    try {
                        jsmediatags.read(file, {
                            onSuccess: function (tag) {
                                var tags = tag.tags || {};
                                if (tags.title) songObj.name = tags.title;
                                if (tags.artist) songObj.artist = tags.artist;
                                if (tags.picture) {
                                    try {
                                        var pic = tags.picture;
                                        var base64 = '';
                                        for (var j = 0; j < pic.data.length; j++) base64 += String.fromCharCode(pic.data[j]);
                                        songObj.cover = 'data:' + (pic.format || 'image/jpeg') + ';base64,' + btoa(base64);
                                    } catch (pe) { }
                                }
                                // ★ 提取内嵌歌词（USLT / lyrics）
                                if (tags.lyrics && tags.lyrics.lyrics) {
                                    songObj.lyrics = tags.lyrics.lyrics;
                                } else if (tags.USLT && tags.USLT.data && tags.USLT.data.lyrics) {
                                    songObj.lyrics = tags.USLT.data.lyrics;
                                } else if (tags.unsynchronisedLyrics && tags.unsynchronisedLyrics.data) {
                                    songObj.lyrics = tags.unsynchronisedLyrics.data;
                                }
                                _muFinishFileImport(songObj, plId);
                            },
                            onError: function () {
                                _muFinishFileImport(songObj, plId);
                            }
                        });
                    } catch (te) { _muFinishFileImport(songObj, plId); }
                } else {
                    _muFinishFileImport(songObj, plId);
                }
            };
            reader.readAsDataURL(file);
            count++;
        })(files[i]);
    }
    if (count === 0 && typeof showToast === 'function') showToast('没有有效的音频文件');
}

function _muFinishFileImport(songObj, plId) {
    if (plId) {
        for (var pi = 0; pi < _muPlaylists.length; pi++) {
            if (_muPlaylists[pi].id === plId) {
                if (!_muPlaylists[pi].songs) _muPlaylists[pi].songs = [];
                _muPlaylists[pi].songs.push(songObj);
                break;
            }
        }
    } else {
        _muSongs.push(songObj);
    }
    _muSave(); _muRender();
    if (typeof showToast === 'function') showToast('导入成功: ' + songObj.name);
}

function _muImportSong() {
    var nameEl = document.getElementById('muImportName'), artistEl = document.getElementById('muImportArtist'), urlEl = document.getElementById('muImportUrl');
    if (!nameEl || !urlEl) return;
    var name = nameEl.value.trim(), artist = artistEl ? artistEl.value.trim() : '', url = urlEl.value.trim();
    if (!name) { if (typeof showToast === 'function') showToast('请输入歌名'); return; }
    _muSongs.push({ id: _muGenId(), name: name, artist: artist, url: url, cover: '', lyrics: '' });
    _muSave(); _muRender(); if (typeof showToast === 'function') showToast('导入成功');
}

/* ========================================
   ★ 绑定音源 / 歌曲操作
   ======================================== */
function _muBindAudio(songId) {
    var choice = prompt('绑定方式：\n1 - 输入URL\n2 - 选择本地文件\n\n请输入 1 或 2：');
    if (choice === '1') {
        var url = prompt('音频URL：');
        if (!url || !url.trim()) return;
        _muUpdateSongField(songId, 'url', url.trim());
        _muSave(); _muRender();
        if (typeof showToast === 'function') showToast('已绑定');
    } else if (choice === '2') {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'audio/*';
        inp.onchange = function () {
            if (!inp.files || !inp.files[0]) return;
            var file = inp.files[0];
            _muBlobCache[songId] = URL.createObjectURL(file);

            // ★ 存入IndexedDB
            var dbReader = new FileReader();
            dbReader.onload = function (ev) {
                _muSaveAudioToDB(songId, ev.target.result, file.type || 'audio/mpeg');
            };
            dbReader.readAsArrayBuffer(file);

            // base64用于当次会话
            var reader = new FileReader();
            reader.onload = function (e) {
                if (file.size < 8 * 1024 * 1024) {
                    _muUpdateSongField(songId, 'blobData', e.target.result);
                }
                _muSave(); _muRender();
                if (typeof showToast === 'function') showToast('已绑定');
            };
            reader.readAsDataURL(file);
        };
        inp.click();
    }
}
function _muUpdateSongField(songId, field, value) {
    for (var i = 0; i < _muSongs.length; i++) { if (_muSongs[i].id === songId) { _muSongs[i][field] = value; return; } }
    for (var pi = 0; pi < _muPlaylists.length; pi++) { if (!_muPlaylists[pi].songs) continue; for (var si = 0; si < _muPlaylists[pi].songs.length; si++) { if (_muPlaylists[pi].songs[si].id === songId) { _muPlaylists[pi].songs[si][field] = value; return; } } }
}

function _muDeleteSong(songId) {
    for (var i = 0; i < _muSongs.length; i++) { if (_muSongs[i].id === songId) { _muSongs.splice(i, 1); break; } }
    for (var pi = 0; pi < _muPlaylists.length; pi++) { if (!_muPlaylists[pi].songs) continue; for (var si = _muPlaylists[pi].songs.length - 1; si >= 0; si--) { if (_muPlaylists[pi].songs[si].id === songId) _muPlaylists[pi].songs.splice(si, 1); } }
    for (var di = _muDailyList.length - 1; di >= 0; di--) { if (_muDailyList[di].songRef === songId) _muDailyList.splice(di, 1); }
    if (_muCurrentSong && _muCurrentSong.id === songId) { if (_muPlayer) { _muPlayer.pause(); _muPlayer.src = ''; } _muCurrentSong = null; _muPlaying = false; }
    _muSave(); _muRender();
}

function _muCreatePlaylist() { var n = prompt('歌单名称：'); if (!n || !n.trim()) return; _muPlaylists.push({ id: 'pl_' + Date.now(), name: n.trim(), songs: [] }); _muSave(); _muRender(); }
function _muDeletePlaylist(plId) { for (var i = 0; i < _muPlaylists.length; i++) { if (_muPlaylists[i].id === plId) { _muPlaylists.splice(i, 1); break; } } if (_muPlaylistDetail === plId) _muPlaylistDetail = null; _muSave(); _muRender(); }
function _muOpenPlaylist(plId) { _muPlaylistDetail = plId; _muRender(); }
function _muAddSongToPlaylist(plId) {
    var n = document.getElementById('muPlSongName'), a = document.getElementById('muPlSongArtist'), u = document.getElementById('muPlSongUrl');
    if (!n || !n.value.trim()) { if (typeof showToast === 'function') showToast('请输入歌名'); return; }
    for (var i = 0; i < _muPlaylists.length; i++) { if (_muPlaylists[i].id === plId) { if (!_muPlaylists[i].songs) _muPlaylists[i].songs = []; _muPlaylists[i].songs.push({ id: _muGenId(), name: n.value.trim(), artist: a ? a.value.trim() : '', url: u ? u.value.trim() : '', cover: '', lyrics: '' }); break; } }
    _muSave(); _muRender(); if (typeof showToast === 'function') showToast('添加成功');
}
function _muRemoveSongFromPlaylist(plId, songId) { for (var i = 0; i < _muPlaylists.length; i++) { if (_muPlaylists[i].id === plId && _muPlaylists[i].songs) { for (var j = 0; j < _muPlaylists[i].songs.length; j++) { if (_muPlaylists[i].songs[j].id === songId) { _muPlaylists[i].songs.splice(j, 1); break; } } break; } } _muSave(); _muRender(); }

/* ========================================
   ★ 编辑弹窗
   ======================================== */
function _muEditField(field) { _muEditType = field; _muRender(); }
function _muRenderEditModal() {
    var m = _muEditType.match(/^daily_edit_(\d+)$/);
    if (m) {
        var idx = parseInt(m[1]), d = _muDailyList[idx]; if (!d) { _muEditType = ''; return ''; }
        var h = '<div class="mu-edit-overlay"><div class="mu-edit-modal"><div class="mu-edit-title">编辑推荐 #' + (idx + 1) + '</div>';
        h += '<div class="mu-edit-field"><div class="mu-edit-label">歌曲名称</div><input class="mu-edit-input" id="muDailyEditName" value="' + _muEsc(d.name) + '"></div>';
        h += '<div class="mu-edit-field"><div class="mu-edit-label">歌手</div><input class="mu-edit-input" id="muDailyEditArtist" value="' + _muEsc(d.artist) + '"></div>';
        if (!d.songRef) h += '<div class="mu-edit-field"><div class="mu-edit-label">音频URL</div><input class="mu-edit-input" id="muDailyEditUrl" value="' + _muEsc(d.url) + '"></div>';
        h += '<div class="mu-edit-btns"><div class="mu-edit-btn cancel" onclick="_muEditType=\'\';_muRender()">取消</div><div class="mu-edit-btn save" onclick="_muSaveDailyEdit(' + idx + ')">保存</div></div></div></div>';
        return h;
    }
    if (_muEditType === 'daily_new') {
        var h = '<div class="mu-edit-overlay"><div class="mu-edit-modal"><div class="mu-edit-title">手动添加推荐</div>';
        h += '<div class="mu-edit-field"><div class="mu-edit-label">歌曲名称</div><input class="mu-edit-input" id="muDailyNewName"></div>';
        h += '<div class="mu-edit-field"><div class="mu-edit-label">歌手</div><input class="mu-edit-input" id="muDailyNewArtist"></div>';
        h += '<div class="mu-edit-field"><div class="mu-edit-label">音频URL</div><input class="mu-edit-input" id="muDailyNewUrl"></div>';
        h += '<div class="mu-edit-btns"><div class="mu-edit-btn cancel" onclick="_muEditType=\'\';_muRender()">取消</div><div class="mu-edit-btn save" onclick="_muSaveDailyNew()">添加</div></div></div></div>';
        return h;
    }
    var labels = { name: '昵称', age: '歌龄', ip: 'IP地址', sig: '个性签名' };
    if (!labels[_muEditType]) return '';
    var h = '<div class="mu-edit-overlay"><div class="mu-edit-modal"><div class="mu-edit-title">编辑' + labels[_muEditType] + '</div>';
    h += '<div class="mu-edit-field"><div class="mu-edit-label">' + labels[_muEditType] + '</div><input class="mu-edit-input" id="muEditInput" value="' + _muEsc(_muProfile[_muEditType] || '') + '"></div>';
    h += '<div class="mu-edit-btns"><div class="mu-edit-btn cancel" onclick="_muEditType=\'\';_muRender()">取消</div><div class="mu-edit-btn save" onclick="_muSaveField()">保存</div></div></div></div>';
    return h;
}
function _muSaveField() { var i = document.getElementById('muEditInput'); if (!i) return; _muProfile[_muEditType] = i.value; _muEditType = ''; _muSave(); _muRender(); }
function _muSaveDailyEdit(idx) { var n = document.getElementById('muDailyEditName'), a = document.getElementById('muDailyEditArtist'), u = document.getElementById('muDailyEditUrl'); if (n) _muDailyList[idx].name = n.value; if (a) _muDailyList[idx].artist = a.value; if (u) _muDailyList[idx].url = u.value; _muEditType = ''; _muSave(); _muRender(); }
function _muSaveDailyNew() { if (_muDailyList.length >= 5) { if (typeof showToast === 'function') showToast('最多5首'); _muEditType = ''; _muRender(); return; } var n = document.getElementById('muDailyNewName'), a = document.getElementById('muDailyNewArtist'), u = document.getElementById('muDailyNewUrl'); if (!n || !n.value.trim()) { if (typeof showToast === 'function') showToast('请输入歌名'); return; } _muDailyList.push({ id: 'dr_' + Date.now(), name: n.value.trim(), artist: a ? a.value.trim() : '', url: u ? u.value.trim() : '', cover: '', coverEmoji: '🎵', songRef: '' }); _muEditType = ''; _muSave(); _muRender(); }
function _muPickAvatar() { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = function () { if (!inp.files || !inp.files[0]) return; var r = new FileReader(); r.onload = function (e) { _muProfile.avatar = e.target.result; _muSave(); _muRender(); }; r.readAsDataURL(inp.files[0]); }; inp.click(); }

/* ========================================
   ★ 批量导入弹窗
   ======================================== */
function _muShowBatchImport(t) { _muImportTarget = t; _muParsedSongs = []; _muImportModal = 'batch'; _muRender(); }
function _muShowJsonImport() { _muImportModal = 'json_import'; _muRender(); }
function _muRenderImportModal() { if (_muImportModal === 'batch') return _muRenderBatchModal(); if (_muImportModal === 'json_import') return _muRenderJsonImportModal(); return ''; }

function _muRenderBatchModal() {
    var h = '<div class="mu-import-overlay"><div class="mu-import-modal"><div class="mu-import-modal-title">批量导入歌曲</div><div class="mu-import-modal-sub">从QQ音乐/网易云/酷狗复制歌曲列表粘贴</div>';
    h += '<div class="mu-platform-row"><div class="mu-platform-btn" onclick="_muShowPlatformHelp(\'qq\')"><div class="mu-platform-icon">🟢</div><div class="mu-platform-name">QQ音乐</div></div><div class="mu-platform-btn" onclick="_muShowPlatformHelp(\'netease\')"><div class="mu-platform-icon">🔴</div><div class="mu-platform-name">网易云</div></div><div class="mu-platform-btn" onclick="_muShowPlatformHelp(\'kugou\')"><div class="mu-platform-icon">🔵</div><div class="mu-platform-name">酷狗</div></div></div>';
    h += '<textarea class="mu-import-textarea" id="muBatchInput" placeholder="每行一首：歌名 - 歌手" oninput="_muParseBatch()"></textarea>';
    if (_muParsedSongs.length > 0) { h += '<div class="mu-import-preview">'; for (var i = 0; i < Math.min(_muParsedSongs.length, 50); i++) h += '<div class="mu-import-preview-item"><div class="mu-import-preview-idx">' + (i + 1) + '</div><div class="mu-import-preview-name">' + _muEsc(_muParsedSongs[i].name) + '</div><div class="mu-import-preview-artist">' + _muEsc(_muParsedSongs[i].artist) + '</div></div>'; h += '</div>'; }
    h += '<div class="mu-import-modal-btns"><div class="mu-import-modal-btn cancel" onclick="_muImportModal=\'\';_muRender()">取消</div><div class="mu-import-modal-btn ok" onclick="_muDoBatchImport()">导入 ' + (_muParsedSongs.length ? _muParsedSongs.length + ' 首' : '') + '</div></div></div></div>';
    return h;
}
function _muParseBatch() { var el = document.getElementById('muBatchInput'); if (!el) return; var lines = el.value.split('\n'); _muParsedSongs = []; for (var i = 0; i < lines.length; i++) { var l = lines[i].trim().replace(/^\d+[\.\、\)\]\s]+/, '').trim(); if (!l) continue; var n = '', a = '', sep = l.indexOf(' - '); if (sep > 0) { n = l.substr(0, sep).trim(); a = l.substr(sep + 3).trim(); } else { sep = l.indexOf(' / '); if (sep > 0) { n = l.substr(0, sep).trim(); a = l.substr(sep + 3).trim(); } else { n = l; } } if (n) _muParsedSongs.push({ name: n, artist: a }); } _muRender(); }
function _muDoBatchImport() { if (!_muParsedSongs.length) { if (typeof showToast === 'function') showToast('没有解析到歌曲'); return; } var t = _muImportTarget, c = 0; for (var i = 0; i < _muParsedSongs.length; i++) { var s = { id: _muGenId(), name: _muParsedSongs[i].name, artist: _muParsedSongs[i].artist, url: '', cover: '', lyrics: '' }; if (t) { for (var pi = 0; pi < _muPlaylists.length; pi++) { if (_muPlaylists[pi].id === t) { if (!_muPlaylists[pi].songs) _muPlaylists[pi].songs = []; _muPlaylists[pi].songs.push(s); break; } } } else { _muSongs.push(s); } c++; } _muParsedSongs = []; _muImportModal = ''; _muSave(); _muRender(); if (typeof showToast === 'function') showToast('导入 ' + c + ' 首（需绑定音源）'); }
function _muShowPlatformHelp(p) { var t = { qq: '📋 QQ音乐：\n1. 歌单→分享→复制链接\n2. 浏览器打开→复制歌曲列表\n3. 粘贴到输入框\n\n格式：晴天 - 周杰伦', netease: '📋 网易云：\n1. 电脑端选中歌曲列表复制\n2. 粘贴到输入框\n\n格式：起风了 - 买辣椒也用券', kugou: '📋 酷狗：\n1. 复制歌曲列表\n2. 粘贴到输入框\n\n格式：海阔天空 - Beyond' }; alert(t[p] || ''); }

/* ========================================
   ★ JSON导出/导入
   ======================================== */
function _muExportAll() {
    var data = { version: 1, songs: [], playlists: [], dailyList: [] };
    for (var i = 0; i < _muSongs.length; i++) data.songs.push({ name: _muSongs[i].name, artist: _muSongs[i].artist, url: _muSongs[i].url || '', lyrics: _muSongs[i].lyrics || '' });
    for (var pi = 0; pi < _muPlaylists.length; pi++) { var pl = { name: _muPlaylists[pi].name, songs: [] }; if (_muPlaylists[pi].songs) { for (var si = 0; si < _muPlaylists[pi].songs.length; si++) { var s = _muPlaylists[pi].songs[si]; pl.songs.push({ name: s.name, artist: s.artist, url: s.url || '', lyrics: s.lyrics || '' }); } } data.playlists.push(pl); }
    for (var di = 0; di < _muDailyList.length; di++)data.dailyList.push({ name: _muDailyList[di].name, artist: _muDailyList[di].artist, url: _muDailyList[di].url || '' });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'music_export_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    if (typeof showToast === 'function') showToast('已导出');
}

function _muRenderJsonImportModal() { return '<div class="mu-import-overlay"><div class="mu-import-modal"><div class="mu-import-modal-title">导入歌单数据</div><div class="mu-import-modal-sub">粘贴JSON数据或选择文件</div><textarea class="mu-import-textarea" id="muJsonInput" placeholder="粘贴JSON..."></textarea><div class="mu-import-modal-btns"><div class="mu-import-modal-btn cancel" onclick="_muImportModal=\'\';_muRender()">取消</div><div class="mu-import-modal-btn ok" style="flex:0.7" onclick="_muPickJsonFile()">选文件</div><div class="mu-import-modal-btn ok" onclick="_muDoJsonImport()">导入</div></div></div></div>'; }
function _muPickJsonFile() { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = function () { if (!inp.files || !inp.files[0]) return; var r = new FileReader(); r.onload = function (e) { var el = document.getElementById('muJsonInput'); if (el) el.value = e.target.result; }; r.readAsText(inp.files[0]); }; inp.click(); }
function _muDoJsonImport() {
    var el = document.getElementById('muJsonInput'); if (!el || !el.value.trim()) { if (typeof showToast === 'function') showToast('请粘贴JSON'); return; }
    var data; try { data = JSON.parse(el.value.trim()); } catch (e) { if (typeof showToast === 'function') showToast('JSON格式错误'); return; }
    var sc = 0, pc = 0;
    if (data.songs) for (var i = 0; i < data.songs.length; i++) { _muSongs.push({ id: _muGenId(), name: data.songs[i].name || '未知', artist: data.songs[i].artist || '', url: data.songs[i].url || '', cover: '', lyrics: data.songs[i].lyrics || '' }); sc++; }
    if (data.playlists) for (var pi = 0; pi < data.playlists.length; pi++) { var pl = data.playlists[pi], np = { id: 'pl_' + Date.now() + '_' + pi, name: pl.name || '导入歌单', songs: [] }; if (pl.songs) for (var si = 0; si < pl.songs.length; si++) { np.songs.push({ id: _muGenId(), name: pl.songs[si].name || '未知', artist: pl.songs[si].artist || '', url: pl.songs[si].url || '', cover: '', lyrics: pl.songs[si].lyrics || '' }); sc++; } _muPlaylists.push(np); pc++; }
    if (data.dailyList) for (var di = 0; di < data.dailyList.length && _muDailyList.length < 5; di++)_muDailyList.push({ id: 'dr_' + Date.now() + '_' + di, name: data.dailyList[di].name || '推荐', artist: data.dailyList[di].artist || '', url: data.dailyList[di].url || '', cover: '', coverEmoji: '🎵', songRef: '' });
    _muImportModal = ''; _muSave(); _muRender(); if (typeof showToast === 'function') showToast('导入 ' + sc + ' 首歌，' + pc + ' 个歌单');
}

/* ============================================
   ★ 桌面歌词悬浮窗 (Desktop Lyrics Widget)
   ============================================ */
var _muFloatVisible = false;
var _muFloatTimer = null;
var _muFloatDragging = false;
var _muFloatDragOfs = { x: 0, y: 0 };

/* 显示/隐藏悬浮窗 */
function _muToggleFloat() {
    _muFloatVisible = !_muFloatVisible;
    var el = document.getElementById('muFloatLyric');
    if (!el) return;
    if (_muFloatVisible) {
        el.classList.add('visible');
        _muFloatRender();
        _muStartFloatTimer();
    } else {
        el.classList.remove('visible');
        clearInterval(_muFloatTimer);
    }
}

function _muShowFloat() {
    _muFloatVisible = true;
    var el = document.getElementById('muFloatLyric');
    if (!el) return;
    el.classList.add('visible');
    _muFloatRender();
    _muStartFloatTimer();
}

function _muHideFloat() {
    _muFloatVisible = false;
    var el = document.getElementById('muFloatLyric');
    if (el) el.classList.remove('visible');
    clearInterval(_muFloatTimer);
}

/* 渲染悬浮窗内容 */
function _muFloatRender() {
    var el = document.getElementById('muFloatLyric');
    if (!el || !_muFloatVisible) return;

    var s = _muCurrentSong;
    if (!s) {
        el.classList.remove('visible');
        _muFloatVisible = false;
        return;
    }

    var pct = 0, cur = 0;
    if (_muPlayer && _muPlayer.duration) {
        cur = _muPlayer.currentTime || 0;
        pct = (cur / _muPlayer.duration) * 100;
    }

    var h = '';
    // 顶部：封面 + 歌曲信息 + 控制按钮
    h += '<div class="mu-fw-top" onmousedown="_muFloatStartDrag(event)" ontouchstart="_muFloatStartDrag(event)">';
    h += '<div class="mu-fw-cover">';
    if (s.cover) h += '<img src="' + _muEsc(s.cover) + '">';
    else h += '🎵';
    h += '</div>';
    h += '<div class="mu-fw-info">';
    h += '<div class="mu-fw-name">' + _muEsc(s.name) + '</div>';
    h += '<div class="mu-fw-artist">' + _muEsc(s.artist || 'Unknown') + '</div>';
    h += '</div>';
    h += '<div class="mu-fw-ctrls">';
    // 暂停/播放
    h += '<div class="mu-fw-btn" onclick="event.stopPropagation();_muTogglePlay();_muFloatRender()"><svg viewBox="0 0 24 24">';
    if (_muPlaying) h += '<line x1="10" y1="5" x2="10" y2="19"/><line x1="14" y1="5" x2="14" y2="19"/>';
    else h += '<polygon points="5 3 19 12 5 21 5 3"/>';
    h += '</svg></div>';
    // 下一首
    h += '<div class="mu-fw-btn" onclick="event.stopPropagation();_muNext()"><svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></div>';
    // 关闭
    h += '<div class="mu-fw-btn close-btn" onclick="event.stopPropagation();_muHideFloat()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div></div>';

    // 歌词区
    h += '<div class="mu-fw-lyrics" id="muFwLyrBox">';
    var parsed = (s.lyrics) ? _muParseLRC(s.lyrics) : [];
    if (parsed.length > 0) {
        var activeIdx = _muFindActiveLyricIdx(parsed, cur);
        for (var i = 0; i < parsed.length; i++) {
            var cls = '';
            if (i === activeIdx) cls = ' active';
            else if (activeIdx >= 0 && Math.abs(i - activeIdx) === 1) cls = ' near';
            h += '<div class="mu-fw-lrc-line' + cls + '" id="muFwLrc' + i + '">' + _muEsc(parsed[i].text) + '</div>';
        }
    } else {
        h += '<div class="mu-fw-no-lrc">♪ 暂无歌词</div>';
    }
    h += '</div>';

    // 进度条
    h += '<div class="mu-fw-progress"><div class="mu-fw-progress-fill" id="muFwFill" style="width:' + pct + '%"></div></div>';

    el.innerHTML = h;

    // 滚动到当前歌词
    _muFloatScrollLyric();
}

/* 局部更新悬浮窗（不闪烁） */
function _muFloatUpdate() {
    if (!_muFloatVisible || !_muCurrentSong) return;
    var s = _muCurrentSong;
    if (!_muPlayer) return;
    var cur = _muPlayer.currentTime || 0;
    var dur = _muPlayer.duration || 0;
    var pct = dur > 0 ? (cur / dur) * 100 : 0;

    // 更新进度条
    var fill = document.getElementById('muFwFill');
    if (fill) fill.style.width = pct + '%';

    // 更新歌词高亮
    var lyrBox = document.getElementById('muFwLyrBox');
    if (lyrBox && s.lyrics) {
        var parsed = _muParseLRC(s.lyrics);
        var activeIdx = _muFindActiveLyricIdx(parsed, cur);
        var lines = lyrBox.querySelectorAll('.mu-fw-lrc-line');
        for (var i = 0; i < lines.length; i++) {
            lines[i].classList.remove('active', 'near');
            if (i === activeIdx) lines[i].classList.add('active');
            else if (activeIdx >= 0 && Math.abs(i - activeIdx) === 1) lines[i].classList.add('near');
        }
        // 滚动到当前行
        if (activeIdx >= 0 && lines[activeIdx]) {
            var boxH = lyrBox.clientHeight;
            var lineEl = lines[activeIdx];
            var targetTop = lineEl.offsetTop - lyrBox.offsetTop - boxH / 2 + lineEl.clientHeight / 2;
            lyrBox.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }
    }
}

function _muFloatScrollLyric() {
    setTimeout(function () {
        var box = document.getElementById('muFwLyrBox');
        if (!box) return;
        var active = box.querySelector('.mu-fw-lrc-line.active');
        if (active) {
            var boxH = box.clientHeight;
            var top = active.offsetTop - box.offsetTop - boxH / 2 + active.clientHeight / 2;
            box.scrollTop = Math.max(0, top);
        }
    }, 30);
}

/* 悬浮窗定时器 */
function _muStartFloatTimer() {
    clearInterval(_muFloatTimer);
    _muFloatTimer = setInterval(function () {
        if (!_muFloatVisible) { clearInterval(_muFloatTimer); return; }
        if (!_muCurrentSong) { _muHideFloat(); return; }
        _muFloatUpdate();
    }, 400);
}

/* ===== 拖拽逻辑 ===== */
function _muFloatStartDrag(e) {
    var el = document.getElementById('muFloatLyric');
    if (!el) return;
    e.preventDefault();
    _muFloatDragging = true;

    var touch = e.touches ? e.touches[0] : e;
    var rect = el.getBoundingClientRect();
    var parentRect = el.parentElement.getBoundingClientRect();

    _muFloatDragOfs.x = touch.clientX - rect.left;
    _muFloatDragOfs.y = touch.clientY - rect.top;

    function onMove(ev) {
        if (!_muFloatDragging) return;
        ev.preventDefault();
        var t = ev.touches ? ev.touches[0] : ev;
        var newLeft = t.clientX - parentRect.left - _muFloatDragOfs.x;
        var newTop = t.clientY - parentRect.top - _muFloatDragOfs.y;

        // 限制边界
        var maxLeft = parentRect.width - el.offsetWidth;
        var maxTop = parentRect.height - el.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        el.style.right = 'auto';
    }

    function onEnd() {
        _muFloatDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    }

    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
}

/* ===== 钩子：播放歌曲时自动更新悬浮窗 ===== */
(function () {
    // 包装 _muDoPlay，播放时自动更新悬浮窗
    var origDoPlay = _muDoPlay;
    _muDoPlay = function (url) {
        origDoPlay(url);
        if (_muFloatVisible) {
            setTimeout(function () { _muFloatRender(); }, 100);
        }
    };

    // 包装 _muTogglePlay，暂停/播放时更新按钮
    var origToggle = _muTogglePlay;
    _muTogglePlay = function () {
        origToggle();
        if (_muFloatVisible) {
            setTimeout(function () { _muFloatRender(); }, 50);
        }
    };

    // 包装 _muNext / _muPrev，切歌时更新
    var origNext = _muNext;
    _muNext = function () {
        origNext();
        if (_muFloatVisible) {
            setTimeout(function () { _muFloatRender(); }, 200);
        }
    };

    var origPrev = _muPrev;
    _muPrev = function () {
        origPrev();
        if (_muFloatVisible) {
            setTimeout(function () { _muFloatRender(); }, 200);
        }
    };
})();

/* ============================================
   ★ IndexedDB 本地音频持久化
   ============================================ */
var _muAudioDB = null;

function _muOpenDB(callback) {
    if (_muAudioDB) { callback(_muAudioDB); return; }
    var req = indexedDB.open('MusicLocalAudioDB', 1);
    req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('audioFiles')) {
            db.createObjectStore('audioFiles', { keyPath: 'id' });
        }
    };
    req.onsuccess = function (e) {
        _muAudioDB = e.target.result;
        callback(_muAudioDB);
    };
    req.onerror = function () { console.warn('IndexedDB open failed'); };
}

function _muSaveAudioToDB(songId, arrayBuffer, mimeType) {
    _muOpenDB(function (db) {
        var tx = db.transaction('audioFiles', 'readwrite');
        tx.objectStore('audioFiles').put({
            id: songId,
            data: arrayBuffer,
            mime: mimeType || 'audio/mpeg'
        });
    });
}

function _muLoadAudioFromDB(songId, callback) {
    _muOpenDB(function (db) {
        var tx = db.transaction('audioFiles', 'readonly');
        var req = tx.objectStore('audioFiles').get(songId);
        req.onsuccess = function (e) {
            var result = e.target.result;
            if (result && result.data) {
                var blob = new Blob([result.data], { type: result.mime || 'audio/mpeg' });
                callback(URL.createObjectURL(blob));
            } else {
                callback(null);
            }
        };
        req.onerror = function () { callback(null); };
    });
}

function _muDeleteAudioFromDB(songId) {
    _muOpenDB(function (db) {
        var tx = db.transaction('audioFiles', 'readwrite');
        tx.objectStore('audioFiles').delete(songId);
    });
}

/* ===== 页面加载时预热：恢复本地歌曲的blob URL ===== */
(function () {
    setTimeout(function () {
        _muOpenDB(function (db) {
            var tx = db.transaction('audioFiles', 'readonly');
            var store = tx.objectStore('audioFiles');
            var allKeys = store.getAllKeys();
            allKeys.onsuccess = function (e) {
                var keys = e.target.result || [];
                // 把所有有IndexedDB记录的歌曲预加载到缓存
                for (var i = 0; i < keys.length; i++) {
                    (function (key) {
                        _muLoadAudioFromDB(key, function (url) {
                            if (url) _muBlobCache[key] = url;
                        });
                    })(keys[i]);
                }
            };
        });
    }, 300);
})();
