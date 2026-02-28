/* ============================================
   蛋薯机 DanShu Pro — moments.js v3
   动态页（删除 + 分享卡片气泡 + 翻译 + AI）
   ============================================ */

var _momentsPosts = [];
var _momentsPublishImages = [];
var _momentsAutoTimer = null;
var _momentsCommentingPostId = null;
var MOMENTS_STORAGE_KEY = 'ds_chat_moments';

function loadMoments() {
    try { _momentsPosts = JSON.parse(localStorage.getItem(MOMENTS_STORAGE_KEY) || '[]'); } catch (e) { _momentsPosts = []; }
}
function saveMoments() {
    try { localStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(_momentsPosts)); } catch (e) { }
}
loadMoments();

function findMomentPost(id) {
    for (var i = 0; i < _momentsPosts.length; i++) {
        if (_momentsPosts[i].id === id) return _momentsPosts[i];
    }
    return null;
}

/* ---------- 动态图片压缩 ---------- */
function _mtCompressImage(dataUrl, callback) {
    var img = new Image();
    img.onload = function () {
        var maxW = 600, maxH = 600;
        var w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
            var ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var quality = 0.7;
        var result = canvas.toDataURL('image/jpeg', quality);
        // 确保不超过100KB
        while (result.length > 100 * 1024 && quality > 0.2) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
        }
        callback(result);
    };
    img.onerror = function () { callback(dataUrl); };
    img.src = dataUrl;
}

/* ==========================================================
   外语检测
   ========================================================== */
function mtNeedsTranslation(text) {
    if (!text || text.length < 3) return false;
    var cleaned = text.replace(/[\s\d.,!?;:'"()@#$%^&*\-+=~`{}\[\]|\\/<>，。！？；：""''（）、—…☆★♡♥✨🌸💕🎵🎶😊😂🤔😅😭❤️💗💖🥺🌙⭐️🍀🌷🌺🎀💫🎯🔥👍🙏💪✌️😘🥰😍🤗😤😠😢😩🤣😆😏😌💤🎂🍰🧁☕🍵🌈🌻🎈🎁🎄🎃🦋🐱🐶]/g, '');
    if (cleaned.length < 2) return false;
    var cnCount = 0;
    for (var i = 0; i < cleaned.length; i++) {
        var code = cleaned.charCodeAt(i);
        if (code >= 0x4E00 && code <= 0x9FFF) cnCount++;
    }
    return (cnCount / cleaned.length) < 0.5;
}

/* ==========================================================
   渲染动态页
   ========================================================== */
function renderMoments() {
    var h = '';
    h += renderMomentsIdCard();
    h += renderMomentsStats();
    h += '<div class="mt-divider"></div>';
    h += '<div class="mt-feed-area" id="mtFeedArea">';
    h += renderMomentsFeed();
    h += '</div>';
    return h;
}

/* ==========================================================
   身份卡片
   ========================================================== */
function renderMomentsIdCard() {
    var p = getActivePersona();
    var name = (p && p.name) ? p.name : '未设置';
    var nickname = (p && p.nickname) ? p.nickname : '';
    var gender = (p && p.gender) ? p.gender : '';
    var signature = (p && p.signature) ? p.signature : '这个人很懒，什么都没写~';
    var avatar = (p && p.avatar) ? p.avatar : '';

    var idNo = 'No.';
    if (p && p.id) {
        var digits = p.id.replace(/\D/g, '');
        idNo += (digits.slice(0, 8) || '00000001');
    } else { idNo += '00000001'; }

    var genderText = '';
    if (gender === 'male' || gender === '男') genderText = '♂ 男';
    else if (gender === 'female' || gender === '女') genderText = '♀ 女';
    else if (gender) genderText = gender;

    var h = '<div class="mt-id-card">';
    h += '<div class="mt-id-card-tag">IDENTIFICATION</div>';
    h += '<div class="mt-id-card-no">' + idNo + '</div>';
    h += '<div class="mt-id-deco-star" style="top:36px;left:88px;"><svg width="8" height="8" viewBox="0 0 12 12"><polygon points="6 0 7.5 4 12 4.5 8.5 7.5 9.5 12 6 9.5 2.5 12 3.5 7.5 0 4.5 4.5 4"/></svg></div>';
    h += '<div class="mt-id-deco-star" style="bottom:26px;right:48px;"><svg width="6" height="6" viewBox="0 0 12 12"><polygon points="6 0 7.5 4 12 4.5 8.5 7.5 9.5 12 6 9.5 2.5 12 3.5 7.5 0 4.5 4.5 4"/></svg></div>';
    h += '<div class="mt-id-deco-star" style="top:50px;right:28px;"><svg width="5" height="5" viewBox="0 0 12 12"><polygon points="6 0 7.5 4 12 4.5 8.5 7.5 9.5 12 6 9.5 2.5 12 3.5 7.5 0 4.5 4.5 4"/></svg></div>';
    h += '<div class="mt-id-deco-star" style="bottom:18px;left:44px;"><svg width="5" height="5" viewBox="0 0 12 12"><polygon points="6 0 7.5 4 12 4.5 8.5 7.5 9.5 12 6 9.5 2.5 12 3.5 7.5 0 4.5 4.5 4"/></svg></div>';
    h += '<div class="mt-id-card-inner">';
    h += '<div class="mt-id-avatar-zone"><div class="mt-id-avatar">';
    if (avatar) h += '<img src="' + avatar + '" alt="">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div><div class="mt-id-avatar-label">PHOTO</div></div>';
    h += '<div class="mt-id-info">';
    h += '<div class="mt-id-row"><div class="mt-id-label">Name</div><div class="mt-id-value name-main">' + esc(name) + '</div></div>';
    if (nickname) h += '<div class="mt-id-row"><div class="mt-id-label">Nick</div><div class="mt-id-value">' + esc(nickname) + '</div></div>';
    if (genderText) h += '<div class="mt-id-row"><div class="mt-id-label">Gender</div><div class="mt-id-value">' + esc(genderText) + '</div></div>';
    h += '<div class="mt-id-signature"><div class="mt-id-sig-label">Sign</div><div class="mt-id-sig-value">' + esc(signature) + '</div></div>';
    h += '</div></div>';
    h += '<div class="mt-id-card-footer"></div></div>';
    return h;
}

/* ==========================================================
   统计栏
   ========================================================== */
function renderMomentsStats() {
    var myPosts = 0, totalLikes = 0;
    for (var i = 0; i < _momentsPosts.length; i++) {
        if (_momentsPosts[i].authorType === 'self') {
            myPosts++;
            totalLikes += (_momentsPosts[i].likes || 0);
        }
    }
    var friendCount = _chatRoles ? _chatRoles.length : 0;
    return '<div class="mt-stats-bar">'
        + '<div class="mt-stat-item"><div class="mt-stat-num">' + myPosts + '</div><div class="mt-stat-label">动态</div></div>'
        + '<div class="mt-stat-item"><div class="mt-stat-num">' + friendCount + '</div><div class="mt-stat-label">好友</div></div>'
        + '<div class="mt-stat-item"><div class="mt-stat-num">' + totalLikes + '</div><div class="mt-stat-label">获赞</div></div></div>';
}

/* ==========================================================
   动态列表
   ========================================================== */
function renderMomentsFeed() {
    if (_momentsPosts.length === 0) {
        return '<div class="mt-empty-feed">'
            + '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="rgba(255,180,200,0.35)" stroke-width="1.2">'
            + '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
            + '<p>还没有动态<br>点击右上角 ＋ 发布第一条吧</p></div>';
    }
    var sorted = _momentsPosts.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var h = '';
    for (var i = 0; i < sorted.length; i++) h += renderMomentPost(sorted[i]);
    return h;
}

/* ==========================================================
   单条动态卡片（含翻译 + 删除 + 更多按钮）
   ========================================================== */
function renderMomentPost(post) {
    var avatar = post.avatar || '';
    var name = post.name || '未知';
    var text = post.text || '';
    var images = post.images || [];
    var likes = post.likes || 0;
    var comments = post.comments || [];
    var liked = post.liked || false;
    var postId = post.id || '';
    var timeStr = formatMomentTime(post.ts || Date.now());

    var h = '<div class="mt-post-card" data-post-id="' + postId + '">';

    // 头部：头像 + 名字 + 时间 + 更多按钮
    h += '<div class="mt-post-header">';
    h += '<div class="mt-post-avatar">';
    if (avatar) h += '<img src="' + avatar + '" alt="">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div>';
    h += '<div class="mt-post-meta">';
    h += '<div class="mt-post-name">' + esc(name) + '</div>';
    h += '<div class="mt-post-time">' + timeStr + '</div>';
    h += '</div>';
    // 右上角更多（删除）
    h += '<div class="mt-post-more-btn" onclick="momentShowDelete(\'' + postId + '\')">';
    h += '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    h += '</div>';
    h += '</div>';

    // 正文
    if (text) {
        h += '<div class="mt-post-body">';
        h += '<div class="mt-post-text">' + esc(text).replace(/\n/g, '<br>') + '</div>';
        // 翻译按钮
        if (mtNeedsTranslation(text)) {
            var trId = 'mtTr_' + postId;
            h += '<div id="' + trId + '">';
            if (post._translated) {
                h += '<div class="mt-translate-area"><div class="mt-translate-text">' + esc(post._translated).replace(/\n/g, '<br>') + '</div></div>';
            } else {
                h += '<div class="mt-translate-btn" onclick="event.stopPropagation();momentTranslate(\'' + postId + '\')">';
                h += '<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>';
                h += '<span>翻译</span></div>';
            }
            h += '</div>';
        }
        h += '</div>';
    }

    // 图片
    if (images.length > 0) {
        var colClass = images.length === 1 ? 'cols-1' : (images.length === 2 ? 'cols-2' : 'cols-3');
        h += '<div class="mt-post-body"><div class="mt-post-images ' + colClass + '">';
        for (var j = 0; j < Math.min(images.length, 9); j++) {
            h += '<img src="' + images[j] + '" alt="" onclick="momentViewImage(\'' + postId + '\',' + j + ')">';
        }
        h += '</div></div>';
    }

    // 底部操作
    h += '<div class="mt-post-actions">';
    h += '<div class="mt-post-action ' + (liked ? 'liked' : '') + '" onclick="momentToggleLike(\'' + postId + '\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    h += '<span>' + (likes > 0 ? likes : '') + '</span></div>';
    h += '<div class="mt-post-action" onclick="momentOpenCommentInput(\'' + postId + '\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    h += '<span>' + (comments.length > 0 ? comments.length : '') + '</span></div>';
    h += '<div class="mt-post-action" onclick="momentShare(\'' + postId + '\')">';
    h += '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    h += '</div></div>';

    // 评论区
    if (comments.length > 0) {
        h += '<div class="mt-comments-area">';
        for (var c = 0; c < comments.length; c++) {
            var cm = comments[c];
            h += '<div class="mt-comment-item">';
            h += '<div class="mt-comment-avatar">';
            if (cm.avatar) h += '<img src="' + cm.avatar + '" alt="">';
            else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            h += '</div><div class="mt-comment-body">';
            h += '<div class="mt-comment-name">' + esc(cm.name || '未知') + '</div>';
            h += '<div class="mt-comment-text">' + esc(cm.text || '').replace(/\n/g, '<br>') + '</div>';
            // 评论翻译
            if (mtNeedsTranslation(cm.text)) {
                var cmTrId = 'mtCmTr_' + postId + '_' + c;
                h += '<div id="' + cmTrId + '">';
                if (cm._translated) {
                    h += '<div class="mt-translate-area"><div class="mt-translate-text">' + esc(cm._translated).replace(/\n/g, '<br>') + '</div></div>';
                } else {
                    h += '<div class="mt-translate-btn" onclick="event.stopPropagation();momentTranslateComment(\'' + postId + '\',' + c + ')">';
                    h += '<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>';
                    h += '<span>翻译</span></div>';
                }
                h += '</div>';
            }
            h += '<div class="mt-comment-time">' + formatMomentTime(cm.ts || Date.now()) + '</div>';
            h += '</div></div>';
        }
        h += '</div>';
    }

    h += '</div>';
    return h;
}

/* ==========================================================
   时间格式化
   ========================================================== */
function formatMomentTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/* ==========================================================
   翻译
   ========================================================== */
function momentTranslate(postId) {
    var post = findMomentPost(postId);
    if (!post || !post.text) return;
    var trEl = document.getElementById('mtTr_' + postId);
    if (trEl) trEl.innerHTML = '<div class="mt-translate-loading">翻译中...</div>';
    mtCallTranslateAPI(post.text, function (result) {
        post._translated = result;
        saveMoments();
        mtRefreshFeed();
    });
}

function momentTranslateComment(postId, idx) {
    var post = findMomentPost(postId);
    if (!post || !post.comments || !post.comments[idx]) return;
    var trEl = document.getElementById('mtCmTr_' + postId + '_' + idx);
    if (trEl) trEl.innerHTML = '<div class="mt-translate-loading">翻译中...</div>';
    mtCallTranslateAPI(post.comments[idx].text, function (result) {
        post.comments[idx]._translated = result;
        saveMoments();
        mtRefreshFeed();
    });
}

function mtCallTranslateAPI(text, callback) {
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) {
        callback('（翻译失败：未配置API）'); return;
    }
    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({
            model: apiConfig.model,
            messages: [
                { role: 'system', content: '你是翻译器。将下面的文本翻译成简体中文。只输出翻译结果，不加任何解释、引号、前缀。如果已经是中文就原样输出。' },
                { role: 'user', content: text }
            ],
            temperature: 0.1, max_tokens: 500
        })
    }).then(function (r) { return r.json(); })
        .then(function (d) {
            var t = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
            t = t.trim().replace(/^["'""]+|["'""]+$/g, '');
            callback(t || '（翻译失败）');
        }).catch(function () { callback('（翻译失败）'); });
}

/* ==========================================================
   局部刷新 feed
   ========================================================== */
function mtRefreshFeed() {
    var area = document.getElementById('mtFeedArea');
    if (area) area.innerHTML = renderMomentsFeed();
}

/* ==========================================================
   删除动态（精美弹窗确认）
   ========================================================== */
function momentShowDelete(postId) {
    var old = document.getElementById('mtDeleteOverlay');
    if (old) old.remove();

    var ov = document.createElement('div');
    ov.id = 'mtDeleteOverlay';
    ov.className = 'mt-delete-overlay';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };

    var h = '<div class="mt-delete-dialog">';
    h += '<div class="mt-delete-dialog-body">';
    h += '<div class="mt-delete-dialog-title">删除动态</div>';
    h += '<div class="mt-delete-dialog-desc">确定删除这条动态吗？<br>删除后无法恢复</div>';
    h += '</div>';
    h += '<div class="mt-delete-dialog-actions">';
    h += '<div class="mt-delete-dialog-btn cancel" onclick="this.closest(\'.mt-delete-overlay\').remove()">取消</div>';
    h += '<div class="mt-delete-dialog-btn confirm" onclick="momentDoDelete(\'' + postId + '\')">删除</div>';
    h += '</div></div>';

    ov.innerHTML = h;
    document.querySelector('.chat-app-overlay').appendChild(ov);
}

function momentDoDelete(postId) {
    _momentsPosts = _momentsPosts.filter(function (p) { return p.id !== postId; });
    saveMoments();
    var ov = document.getElementById('mtDeleteOverlay');
    if (ov) ov.remove();
    mtRefreshFeed();
    showToast('已删除');
}

/* ==========================================================
   发布动态
   ========================================================== */
function openPublishMoment() {
    _momentsPublishImages = [];
    var ov = document.getElementById('mtPublishOverlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'mtPublishOverlay';
        ov.className = 'mt-publish-overlay';
        document.querySelector('.chat-app-overlay').appendChild(ov);
    }
    var h = '<div class="mt-publish-header">';
    h += '<div class="mt-publish-cancel" onclick="closePublishMoment()">取消</div>';
    h += '<div class="mt-publish-title">发布动态</div>';
    h += '<div class="mt-publish-send" onclick="submitMoment()">发布</div></div>';
    h += '<div class="mt-publish-body">';
    h += '<textarea class="mt-publish-textarea" id="mtPublishText" placeholder="分享你此刻的想法..."></textarea>';
    h += '<div class="mt-publish-img-preview" id="mtPublishImgPreview"></div></div>';
    h += '<div class="mt-publish-toolbar">';
    h += '<div class="mt-publish-tool-btn" onclick="mtAddPublishImage()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '<input type="file" id="mtPublishFileInput" style="display:none" accept="image/*" multiple onchange="mtHandlePublishFiles(event)">';
    h += '</div>';
    ov.innerHTML = h;
    setTimeout(function () { ov.classList.add('show'); }, 10);
    setTimeout(function () { var ta = document.getElementById('mtPublishText'); if (ta) ta.focus(); }, 200);
}

function closePublishMoment() {
    var ov = document.getElementById('mtPublishOverlay');
    if (ov) { ov.classList.remove('show'); setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 250); }
    _momentsPublishImages = [];
}
function mtAddPublishImage() { var i = document.getElementById('mtPublishFileInput'); if (i) i.click(); }
function mtHandlePublishFiles(e) {
    var files = e.target.files; if (!files) return;
    for (var i = 0; i < files.length && _momentsPublishImages.length < 9; i++) {
        (function (f) {
            var r = new FileReader();
            r.onload = function (ev) {
                // 压缩动态图片，避免撑爆存储
                _mtCompressImage(ev.target.result, function (compressed) {
                    _momentsPublishImages.push(compressed);
                    mtRenderPublishPreview();
                });
            };
            r.readAsDataURL(f);
        })(files[i]);
    }
    e.target.value = '';
}
function mtRenderPublishPreview() {
    var c = document.getElementById('mtPublishImgPreview'); if (!c) return;
    var h = '';
    for (var i = 0; i < _momentsPublishImages.length; i++) {
        h += '<div class="mt-publish-img-item"><img src="' + _momentsPublishImages[i] + '" alt="">';
        h += '<div class="mt-publish-img-remove" onclick="mtRemovePublishImage(' + i + ')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
    }
    c.innerHTML = h;
}
function mtRemovePublishImage(idx) { _momentsPublishImages.splice(idx, 1); mtRenderPublishPreview(); }

function submitMoment() {
    var ta = document.getElementById('mtPublishText');
    var text = ta ? ta.value.trim() : '';
    if (!text && _momentsPublishImages.length === 0) { showToast('请输入内容或添加图片'); return; }
    var p = getActivePersona();
    _momentsPosts.push({
        id: 'mp' + Date.now() + Math.random().toString(36).substr(2, 4),
        authorType: 'self', authorId: p ? p.id : '',
        name: (p && p.name) ? p.name : '我',
        avatar: (p && p.avatar) ? p.avatar : '',
        text: text, images: _momentsPublishImages.slice(),
        likes: 0, liked: false, comments: [], ts: Date.now()
    });
    saveMoments(); closePublishMoment();
    renderChatTab('moments'); showToast('动态已发布');

    // char主动来评论user的动态
    var newPostId = _momentsPosts[_momentsPosts.length - 1].id;
    mtTriggerCharComments(newPostId);
}

/* ==========================================================
   点赞
   ========================================================== */
function momentToggleLike(postId) {
    var post = findMomentPost(postId); if (!post) return;
    post.liked = !post.liked;
    post.likes = (post.likes || 0) + (post.liked ? 1 : -1);
    if (post.likes < 0) post.likes = 0;
    saveMoments(); mtRefreshFeed();
}

/* ==========================================================
   评论
   ========================================================== */
function momentOpenCommentInput(postId) {
    _momentsCommentingPostId = postId;
    var old = document.getElementById('mtCommentInputBar'); if (old) old.remove();
    var bar = document.createElement('div');
    bar.id = 'mtCommentInputBar';
    bar.className = 'mt-comment-input-bar';
    bar.innerHTML = '<input id="mtCommentInputText" type="text" placeholder="写评论..." onkeydown="if(event.key===\'Enter\'){momentSubmitComment();event.preventDefault();}">'
        + '<div class="mt-comment-send-btn" onclick="momentSubmitComment()"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>';
    document.querySelector('.chat-app-overlay').appendChild(bar);
    setTimeout(function () { var inp = document.getElementById('mtCommentInputText'); if (inp) inp.focus(); }, 100);
}

function momentCloseCommentInput() {
    _momentsCommentingPostId = null;
    var bar = document.getElementById('mtCommentInputBar'); if (bar) bar.remove();
}

function momentSubmitComment() {
    var inp = document.getElementById('mtCommentInputText'); if (!inp) return;
    var text = inp.value.trim(); if (!text) return;
    var post = findMomentPost(_momentsCommentingPostId);
    if (!post) { momentCloseCommentInput(); return; }
    var p = getActivePersona();
    if (!post.comments) post.comments = [];
    post.comments.push({ name: (p && p.name) ? p.name : '我', avatar: (p && p.avatar) ? p.avatar : '', text: text, ts: Date.now() });
    saveMoments(); momentCloseCommentInput(); mtRefreshFeed();
    if (post.authorType === 'char' && post.roleId) momentAIReplyComment(post, text);
}

/* ---------- AI 回复评论 ---------- */
function momentAIReplyComment(post, userComment) {
    var role = findRole(post.roleId); if (!role) return;
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) return;

    var sysPrompt = (role.prompt || '你是' + (role.name || '角色'));
    sysPrompt += '\n\n[当前场景]\n你在社交平台上发了一条动态，内容是：\n"' + (post.text || '') + '"\n\n';
    sysPrompt += '现在有人给你的动态写了评论，请你以符合自己人设和性格的方式回复这条评论。\n\n';
    sysPrompt += '回复规则：\n';
    sysPrompt += '1. 回复1-3句话，简短自然，像真人社交平台的评论回复\n';
    sysPrompt += '2. 必须输出完整的句子，不能中途截断\n';
    sysPrompt += '3. 不要加引号、书名号\n';
    sysPrompt += '4. 不要加任何前缀或解释\n';
    sysPrompt += '5. 使用符合你角色设定的语言（日本角色用日语、美国角色用英语等）\n';
    sysPrompt += '6. 直接输出回复内容\n';

    var messages = [{ role: 'system', content: sysPrompt }];
    var chatMsgs = role.msgs || [], recent = [];
    for (var i = chatMsgs.length - 1; i >= 0 && recent.length < 4; i--) {
        var m = chatMsgs[i];
        if (m.recalled || m.videoCall || m.hidden || !m.text) continue;
        recent.unshift({ role: m.from === 'self' ? 'user' : 'assistant', content: m.text });
    }
    for (var j = 0; j < recent.length; j++) messages.push(recent[j]);
    messages.push({ role: 'user', content: '我给你的动态评论了：' + userComment });

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.75, max_tokens: 300 })
    }).then(function (r) { return r.json(); })
        .then(function (data) {
            var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            reply = reply.trim().replace(/^["'""「」]+|["'""「」]+$/g, '');
            if (!reply) reply = '👍';
            var p2 = findMomentPost(post.id);
            if (p2) {
                if (!p2.comments) p2.comments = [];
                var commentObj = {
                    name: role.nickname || role.name || '未知',
                    avatar: role.avatar || '',
                    text: reply,
                    ts: Date.now()
                };
                // 外语评论自动翻译
                if (mtNeedsTranslation(reply)) {
                    p2.comments.push(commentObj);
                    saveMoments();
                    if (_chatCurrentTab === 'moments') mtRefreshFeed();
                    mtCallTranslateAPI(reply, function (translated) {
                        commentObj._translated = translated;
                        saveMoments();
                        if (_chatCurrentTab === 'moments') mtRefreshFeed();
                    });
                } else {
                    p2.comments.push(commentObj);
                    saveMoments();
                    if (_chatCurrentTab === 'moments') mtRefreshFeed();
                }
            }
        }).catch(function () { });
}

/* ==========================================================
   char主动评论user的动态
   ========================================================== */
function mtTriggerCharComments(postId) {
    if (!_chatRoles || _chatRoles.length === 0) return;
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) return;

    var post = findMomentPost(postId);
    if (!post || post.authorType !== 'self') return;

    // 随机抽1-3个char来评论，有概率不评论
    // 只从开启了"主动发动态"的角色中选
    var enabledForMoment = [];
    for (var ei = 0; ei < _chatRoles.length; ei++) {
        if (_chatRoles[ei].momentPostEnabled) enabledForMoment.push(_chatRoles[ei]);
    }
    if (enabledForMoment.length === 0) { renderChatTab('moments'); showToast('没有开启动态的角色'); return; }
    var shuffled = enabledForMoment.sort(function () { return Math.random() - 0.5; });
    var maxCommenters = Math.floor(Math.random() * 3) + 1; // 1~3
    var candidates = [];
    for (var i = 0; i < shuffled.length && candidates.length < maxCommenters; i++) {
        // 每个char有60%概率会评论
        if (Math.random() < 0.6) {
            candidates.push(shuffled[i]);
        }
    }
    if (candidates.length === 0 && shuffled.length > 0) {
        // 至少保底1个
        candidates.push(shuffled[0]);
    }

    // 依次延迟发送，模拟真实
    for (var j = 0; j < candidates.length; j++) {
        (function (role, delay) {
            setTimeout(function () {
                mtCharCommentOnPost(post, role);
            }, delay);
        })(candidates[j], 3000 + j * 4000 + Math.floor(Math.random() * 5000));
    }
}

/* ---------- 单个char对user动态发表AI评论 ---------- */
function mtCharCommentOnPost(post, role) {
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) return;

    // 收集已有评论作为上下文
    var existingComments = '';
    if (post.comments && post.comments.length > 0) {
        var cmList = [];
        for (var i = 0; i < post.comments.length; i++) {
            cmList.push((post.comments[i].name || '某人') + '：' + (post.comments[i].text || ''));
        }
        existingComments = '\n已有评论：\n' + cmList.join('\n');
    }

    var sysPrompt = (role.prompt || '你是' + (role.name || '角色'));
    sysPrompt += '\n\n[当前场景]\n你在社交平台上刷到了一条好友的动态。\n';
    sysPrompt += '动态发布者是你的好友/认识的人。\n';
    sysPrompt += '动态内容：\n"' + (post.text || '（图片动态）') + '"';
    if (existingComments) sysPrompt += '\n' + existingComments;
    sysPrompt += '\n\n请你根据自己的人设和性格，给这条动态写一条评论。\n\n';
    sysPrompt += '规则：\n';
    sysPrompt += '1. 写1-2句话，像真人在朋友圈/社交平台下面评论\n';
    sysPrompt += '2. 必须输出完整的句子，不要中途截断\n';
    sysPrompt += '3. 不要加引号、书名号、前缀\n';
    sysPrompt += '4. 使用你角色设定中对应的语言\n';
    sysPrompt += '5. 可以夸赞、吐槽、调侃、追问、共鸣、开玩笑等\n';
    sysPrompt += '6. 如果已有其他人评论，不要重复类似内容\n';
    sysPrompt += '7. 直接输出评论内容\n';

    var messages = [{ role: 'system', content: sysPrompt }];

    // 带入最近聊天记录（了解关系）
    var chatMsgs = role.msgs || [], recent = [];
    for (var i = chatMsgs.length - 1; i >= 0 && recent.length < 4; i--) {
        var m = chatMsgs[i];
        if (m.recalled || m.videoCall || m.hidden || m.shareCard || !m.text) continue;
        recent.unshift({ role: m.from === 'self' ? 'user' : 'assistant', content: m.text });
    }
    for (var k = 0; k < recent.length; k++) messages.push(recent[k]);
    messages.push({ role: 'user', content: '请给这条动态写一条评论。' });

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.85, max_tokens: 300 })
    }).then(function (r) { return r.json(); })
        .then(function (data) {
            var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            reply = reply.trim().replace(/^["'""「」]+|["'""「」]+$/g, '');
            if (!reply) return;

            // 找到动态并添加评论
            var p2 = findMomentPost(post.id);
            if (!p2) return;
            if (!p2.comments) p2.comments = [];

            var commentObj = {
                name: role.nickname || role.name || '未知',
                avatar: role.avatar || '',
                text: reply,
                ts: Date.now()
            };

            // 如果是外语，自动翻译
            if (mtNeedsTranslation(reply)) {
                p2.comments.push(commentObj);
                saveMoments();
                if (_chatCurrentTab === 'moments') mtRefreshFeed();

                mtCallTranslateAPI(reply, function (translated) {
                    commentObj._translated = translated;
                    saveMoments();
                    if (_chatCurrentTab === 'moments') mtRefreshFeed();
                });
            } else {
                p2.comments.push(commentObj);
                saveMoments();
                if (_chatCurrentTab === 'moments') mtRefreshFeed();
            }

            // 同时点赞（50%概率）
            if (Math.random() < 0.5) {
                p2.likes = (p2.likes || 0) + 1;
                saveMoments();
                if (_chatCurrentTab === 'moments') mtRefreshFeed();
            }
        }).catch(function () { });
}

/* ==========================================================
   分享动态 — 弹出联系人列表 → 发送 HTML 卡片气泡
   ========================================================== */
function momentShare(postId) {
    if (!_chatRoles || _chatRoles.length === 0) { showToast('暂无联系人'); return; }
    var post = findMomentPost(postId); if (!post) return;

    var old = document.getElementById('mtShareOverlay'); if (old) old.remove();

    var ov = document.createElement('div');
    ov.id = 'mtShareOverlay';
    ov.className = 'mt-share-overlay';
    ov.onclick = function (e) { if (e.target === ov) mtCloseSharePanel(); };

    var previewText = (post.text || '').substring(0, 40);
    if ((post.text || '').length > 40) previewText += '...';
    if (!previewText && post.images && post.images.length) previewText = '[图片 ×' + post.images.length + ']';

    var h = '<div class="mt-share-panel">';
    h += '<div class="mt-share-header">';
    h += '<div class="mt-share-title">分享给</div>';
    h += '<div class="mt-share-close" onclick="mtCloseSharePanel()">取消</div></div>';

    // 顶部预览卡片
    h += '<div class="mt-share-preview">';
    h += '<div class="mt-share-preview-avatar">';
    if (post.avatar) h += '<img src="' + post.avatar + '" alt="">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div><div class="mt-share-preview-info">';
    h += '<div class="mt-share-preview-name">' + esc(post.name || '未知') + ' 的动态</div>';
    h += '<div class="mt-share-preview-text">' + esc(previewText) + '</div>';
    h += '</div></div>';

    h += '<div class="mt-share-list">';
    for (var i = 0; i < _chatRoles.length; i++) {
        var r = _chatRoles[i];
        h += '<div class="mt-share-item">';
        h += '<div class="mt-share-item-avatar">';
        if (r.avatar) h += '<img src="' + r.avatar + '" alt="">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="mt-share-item-name">' + esc(r.nickname || r.name || '未知') + '</div>';
        h += '<div class="mt-share-item-btn" id="mtShareBtn_' + r.id + '" onclick="event.stopPropagation();mtShareToRole(\'' + postId + '\',\'' + r.id + '\')">发送</div>';
        h += '</div>';
    }
    h += '</div></div>';

    ov.innerHTML = h;
    document.querySelector('.chat-app-overlay').appendChild(ov);
}

function mtCloseSharePanel() {
    var ov = document.getElementById('mtShareOverlay'); if (ov) ov.remove();
}

/* ---------- 构建分享卡片 HTML ---------- */
function mtBuildShareCardHTML(post) {
    var posterAvatar = post.avatar || '';
    var posterName = post.name || '未知';
    var preview = (post.text || '').substring(0, 60);
    if ((post.text || '').length > 60) preview += '...';
    if (!preview && post.images && post.images.length) preview = '[图片 ×' + post.images.length + ']';

    var card = '<div class="chat-share-card">';
    card += '<div class="chat-share-card-left">';
    card += '<div class="chat-share-card-avatar">';
    if (posterAvatar) card += '<img src="' + posterAvatar + '" alt="">';
    else card += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    card += '</div></div>';
    card += '<div class="chat-share-card-right">';
    card += '<div class="chat-share-card-tag"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>分享动态</div>';
    card += '<div class="chat-share-card-name">' + esc(posterName) + '</div>';
    card += '<div class="chat-share-card-text">' + esc(preview) + '</div>';
    card += '<div class="chat-share-card-footer"></div>';
    card += '</div></div>';
    return card;
}

/* ---------- 发送分享到指定聊天（卡片 + AI回应 + 自动翻译）---------- */
function mtShareToRole(postId, roleId) {
    var post = findMomentPost(postId);
    var role = findRole(roleId);
    if (!post || !role) return;

    var btn = document.getElementById('mtShareBtn_' + roleId);
    if (btn) { btn.textContent = '已发送'; btn.className = 'mt-share-item-btn sent'; }

    // 存入消息 — 用 shareCard 字段，renderBubbleRow 会识别并渲染为卡片
    if (!role.msgs) role.msgs = [];
    role.msgs.push({
        from: 'self',
        text: '',
        shareCard: {
            posterName: post.name || '未知',
            posterAvatar: post.avatar || '',
            postText: post.text || '',
            postId: postId
        },
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        ts: Date.now()
    });
    role.lastMsg = '[动态分享]';
    role.lastTime = Date.now();
    saveChatRoles();

    // AI 理解并回应
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) {
        showToast('已分享给 ' + (role.nickname || role.name));
        return;
    }

    var sysPrompt = (role.prompt || '你是' + (role.name || '角色'));
    sysPrompt += '\n\n[场景]\n对方给你分享了一条社交平台的动态。\n';
    sysPrompt += '动态发布者：' + (post.name || '某人') + '\n';
    sysPrompt += '动态内容：' + (post.text || '（图片动态）') + '\n\n';
    sysPrompt += '请结合你的人设和性格来回应这条分享的动态。\n\n';
    sysPrompt += '规则：\n';
    sysPrompt += '1. 回复2-4句话，自然真实\n';
    sysPrompt += '2. 表达你看到这条动态后的真实想法、感想或情绪反应\n';
    sysPrompt += '3. 可以评价、追问、吐槽、共鸣等\n';
    sysPrompt += '4. 必须输出完整的句子，不要中途截断\n';
    sysPrompt += '5. 不要加引号，不要重复动态内容\n';
    sysPrompt += '6. 使用你角色设定中对应的语言\n';
    sysPrompt += '7. 直接输出回复内容\n';

    var messages = [{ role: 'system', content: sysPrompt }];
    // 只取最近非 shareCard 的聊天上下文
    var chatMsgs = role.msgs || [], recent = [];
    for (var i = chatMsgs.length - 1; i >= 0 && recent.length < 4; i--) {
        var m = chatMsgs[i];
        if (m.recalled || m.videoCall || m.hidden || m.shareCard || !m.text) continue;
        recent.unshift({ role: m.from === 'self' ? 'user' : 'assistant', content: m.text });
    }
    for (var j = 0; j < recent.length; j++) messages.push(recent[j]);
    messages.push({ role: 'user', content: '我给你分享了一条动态，发布者是' + (post.name || '某人') + '，内容是：' + (post.text || '（图片）') });

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.8, max_tokens: 400 })
    }).then(function (r) { return r.json(); })
        .then(function (data) {
            var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            reply = reply.trim().replace(/^["'""「」]+|["'""「」]+$/g, '');
            if (!reply) reply = '收到~';

            var msgObj = {
                from: 'other',
                text: reply,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                ts: Date.now()
            };

            // 如果是外语回复，自动翻译
            if (mtNeedsTranslation(reply)) {
                msgObj._translating = true;
                role.msgs.push(msgObj);
                role.lastMsg = reply;
                role.lastTime = Date.now();
                saveChatRoles();

                mtCallTranslateAPI(reply, function (translated) {
                    // 找到这条消息并更新
                    var msgs = role.msgs;
                    for (var k = msgs.length - 1; k >= 0; k--) {
                        if (msgs[k] === msgObj || (msgs[k].ts === msgObj.ts && msgs[k].text === msgObj.text)) {
                            delete msgs[k]._translating;
                            msgs[k].translation = translated;
                            break;
                        }
                    }
                    saveChatRoles();
                    showToast('已分享给 ' + (role.nickname || role.name));
                });
            } else {
                role.msgs.push(msgObj);
                role.lastMsg = reply;
                role.lastTime = Date.now();
                saveChatRoles();
                showToast('已分享给 ' + (role.nickname || role.name));
            }
        }).catch(function () {
            showToast('分享失败');
        });
}

/* ==========================================================
   查看大图
   ========================================================== */
function momentViewImage(postId, imgIdx) {
    var post = findMomentPost(postId);
    if (!post || !post.images || !post.images[imgIdx]) return;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;cursor:pointer;';
    ov.onclick = function () { document.body.removeChild(ov); };
    var img = document.createElement('img');
    img.src = post.images[imgIdx];
    img.style.cssText = 'max-width:92%;max-height:88%;object-fit:contain;border-radius:8px;';
    ov.appendChild(img);
    document.body.appendChild(ov);
}

/* ==========================================================
   刷新动态 — AI 生成
   ========================================================== */
function refreshMoments() {
    loadMoments();
    if (!_chatRoles || _chatRoles.length === 0) { renderChatTab('moments'); showToast('暂无联系人'); return; }
    var shuffled = _chatRoles.slice().sort(function () { return Math.random() - 0.5; });
    var count = Math.min(shuffled.length, Math.random() < 0.4 ? 1 : 2);
    showToast('正在刷新...');
    var done = 0;
    for (var i = 0; i < count; i++) {
        (function (role) {
            generateCharMoment(role, function () {
                done++;
                if (done >= count) { if (_chatCurrentTab === 'moments') renderChatTab('moments'); showToast('动态已刷新'); }
            });
        })(shuffled[i]);
    }
}

function generateCharMoment(role, callback) {
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) { if (callback) callback(); return; }

    var sysPrompt = (role.prompt || '你是' + (role.name || '未知'));
    sysPrompt += '\n\n[任务]\n你正在社交平台上发一条动态/朋友圈。\n';
    sysPrompt += '请结合你的人设、性格、此刻的心情来写一条动态。\n\n';
    sysPrompt += '要求：\n';
    sysPrompt += '1. 像真人发朋友圈一样自然真实\n';
    sysPrompt += '2. 写2-5句话，内容要完整，不要中途截断\n';
    sysPrompt += '3. 不要加引号、书名号\n';
    sysPrompt += '4. 不要加"动态："等前缀\n';
    sysPrompt += '5. 不要输出任何解释说明\n';
    sysPrompt += '6. 可以包含此刻的心情、日常分享、感慨、见闻\n';
    sysPrompt += '7. 体现你独特的性格和说话方式\n';
    sysPrompt += '8. 使用你角色设定中对应的语言（如果你是日本人就用日语，美国人就用英语等）\n';
    sysPrompt += '9. 可以偶尔用1-2个emoji但不要过多\n';
    sysPrompt += '10. 直接输出动态文本\n';

    var messages = [{ role: 'system', content: sysPrompt }];
    var chatMsgs = role.msgs || [], recent = [];
    for (var i = chatMsgs.length - 1; i >= 0 && recent.length < 5; i--) {
        var m = chatMsgs[i];
        if (m.recalled || m.videoCall || m.hidden || !m.text) continue;
        recent.unshift({ role: m.from === 'self' ? 'user' : 'assistant', content: m.text });
    }
    for (var j = 0; j < recent.length; j++) messages.push(recent[j]);
    messages.push({ role: 'user', content: '请发一条动态。' });

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.88, max_tokens: 500 })
    }).then(function (r) { return r.json(); })
        .then(function (data) {
            var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            text = text.trim().replace(/^["'""「」]+|["'""「」]+$/g, '').replace(/^(动态[：:]|朋友圈[：:]|发布[：:])\s*/i, '');
            if (!text) text = '...';
            _momentsPosts.push({
                id: 'mp' + Date.now() + Math.random().toString(36).substr(2, 4),
                authorType: 'char', roleId: role.id,
                name: role.nickname || role.name || '未知', avatar: role.avatar || '',
                text: text, images: [],
                likes: Math.floor(Math.random() * 8), liked: false, comments: [],
                ts: Date.now() - Math.floor(Math.random() * 600000)
            });
            saveMoments(); if (callback) callback();
        }).catch(function () { if (callback) callback(); });
}

/* ==========================================================
   char 主动发动态
   ========================================================== */
var _momentsAutoPostEnabled = true;

function initMomentsAutoPost() {
    if (_momentsAutoTimer) return;
    scheduleNextAutoPost();
}

function scheduleNextAutoPost() {
    if (_momentsAutoTimer) clearTimeout(_momentsAutoTimer);
    var delay = (180 + Math.floor(Math.random() * 300)) * 1000;
    _momentsAutoTimer = setTimeout(function () { autoCharPost(); scheduleNextAutoPost(); }, delay);
}

function autoCharPost() {
    if (!_momentsAutoPostEnabled || !_chatRoles || !_chatRoles.length) return;
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) return;
    if (Math.random() > 0.4) return;
    // 只从开启了"主动发动态"的角色中选
    var enabledRoles = [];
    for (var ei = 0; ei < _chatRoles.length; ei++) {
        if (_chatRoles[ei].momentPostEnabled) enabledRoles.push(_chatRoles[ei]);
    }
    if (enabledRoles.length === 0) return;
    var role = enabledRoles[Math.floor(Math.random() * enabledRoles.length)];
    var now = Date.now();
    for (var i = 0; i < _momentsPosts.length; i++) {
        if (_momentsPosts[i].roleId === role.id && now - (_momentsPosts[i].ts || 0) < 600000) return;
    }
    generateCharMoment(role, function () {
        saveMoments();
        if (_chatCurrentTab === 'moments') showNewPostToast();
    });
}

function showNewPostToast() {
    var old = document.getElementById('mtNewPostToast'); if (old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'mtNewPostToast';
    toast.className = 'mt-new-post-toast';
    toast.textContent = '✨ 有新动态，点击查看';
    toast.onclick = function () { toast.remove(); renderChatTab('moments'); };
    document.querySelector('.chat-app-overlay').appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 6000);
}
