/* ============================================
   蛋薯机 DanShu Pro v2 — page3widget.js
   第三页 · 联系卡片 + 票根组件 · 编辑 + 持久化
   ============================================ */

(function () {
    var STORE_KEY = 'ds_p3_contact';

    function loadData() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; }
    }
    function saveData(d) {
        localStorage.setItem(STORE_KEY, JSON.stringify(d));
    }

    /* ===== 初始化 ===== */
    function init() {
        var d = loadData();
        if (d.avatar) {
            var img = document.getElementById('p3ContactAvatar');
            if (img) img.src = d.avatar;
        }
        if (d.bubble) {
            var el = document.getElementById('p3ContactBubble');
            if (el) el.textContent = d.bubble;
        }
        if (d.name) {
            var el = document.getElementById('p3ContactName');
            if (el) el.textContent = d.name;
        }
        if (d.link) {
            var el = document.getElementById('p3ContactLink');
            if (el) el.textContent = d.link;
        }
        if (d.photo) {
            var img = document.getElementById('p3ContactPhoto');
            if (img) img.src = d.photo;
        }

        // 票根组件
        if (d.ticketImg) {
            var tImg = document.getElementById('p3TicketImg');
            if (tImg) tImg.src = d.ticketImg;
        }
        if (d.ticketText) {
            var tTxt = document.getElementById('p3TicketText');
            if (tTxt) tTxt.textContent = d.ticketText;
        }

        // 监听可编辑字段
        bindEditable('p3ContactBubble', 'bubble');
        bindEditable('p3ContactName', 'name');
        bindEditable('p3ContactLink', 'link');
        bindEditable('p3TicketText', 'ticketText');
    }

    function bindEditable(id, key) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', function () {
            var d = loadData();
            d[key] = el.textContent.trim();
            saveData(d);
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        });
    }

    /* ===== 上传头像 ===== */
    window.p3PickAvatar = function () {
        pickImage(function (dataUrl) {
            var img = document.getElementById('p3ContactAvatar');
            if (img) img.src = dataUrl;
            var d = loadData();
            d.avatar = dataUrl;
            saveData(d);
        });
    };

    /* ===== 上传右侧图片 ===== */
    window.p3PickPhoto = function () {
        pickImage(function (dataUrl) {
            var img = document.getElementById('p3ContactPhoto');
            if (img) img.src = dataUrl;
            var d = loadData();
            d.photo = dataUrl;
            saveData(d);
        });
    };

    /* ===== 上传票根图片 ===== */
    window.p3PickTicketImg = function () {
        pickImage(function (dataUrl) {
            var img = document.getElementById('p3TicketImg');
            if (img) img.src = dataUrl;
            var d = loadData();
            d.ticketImg = dataUrl;
            saveData(d);
        });
    };

    /* ===== 聚焦某个字段 ===== */
    window.p3FocusField = function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.focus();
            var range = document.createRange();
            range.selectNodeContents(el);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    /* ===== 通用图片选取 ===== */
    function pickImage(callback) {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            try { document.body.removeChild(inp); } catch (e) { }
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                if (callback) callback(ev.target.result);
            };
            reader.readAsDataURL(file);
        });
        requestAnimationFrame(function () { inp.click(); });
    }

    /* ===== 启动 ===== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
/* =============================================
   个人资料卡片 — 图片上传 + 持久化
   ============================================= */
(function () {
    var PK = 'ds_p3_profile';

    function loadP() {
        try { return JSON.parse(localStorage.getItem(PK) || '{}'); } catch (e) { return {}; }
    }
    function saveP(d) {
        localStorage.setItem(PK, JSON.stringify(d));
    }

    /* ===== 通用图片选取 ===== */
    function pickImg(cb) {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            try { document.body.removeChild(inp); } catch (e) { }
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) { cb(ev.target.result); };
            reader.readAsDataURL(file);
        });
        requestAnimationFrame(function () { inp.click(); });
    }

    /* ===== 上传封面 ===== */
    window.p3PickProfileBanner = function () {
        pickImg(function (url) {
            var img = document.getElementById('p3ProfileBanner');
            if (img) img.src = url;
            var d = loadP(); d.banner = url; saveP(d);
        });
    };

    /* ===== 上传头像 ===== */
    window.p3PickProfileAvatar = function () {
        pickImg(function (url) {
            var img = document.getElementById('p3ProfileAvatar');
            if (img) img.src = url;
            var d = loadP(); d.avatar = url; saveP(d);
        });
    };

    /* ===== 可编辑文字绑定 ===== */
    function bindEdit(id, key) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', function () {
            var d = loadP();
            d[key] = el.textContent.trim();
            saveP(d);
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        });
    }

    /* ===== 初始化：恢复数据 ===== */
    function initProfile() {
        var d = loadP();
        if (d.banner) {
            var img = document.getElementById('p3ProfileBanner');
            if (img) img.src = d.banner;
        }
        if (d.avatar) {
            var img = document.getElementById('p3ProfileAvatar');
            if (img) img.src = d.avatar;
        }
        if (d.name) {
            var el = document.getElementById('p3ProfileName');
            if (el) el.textContent = d.name;
        }
        if (d.handle) {
            var el = document.getElementById('p3ProfileHandle');
            if (el) el.textContent = d.handle;
        }
        if (d.bio) {
            var el = document.getElementById('p3ProfileBio');
            if (el) el.textContent = d.bio;
        }
        if (d.loc) {
            var el = document.getElementById('p3ProfileLoc');
            if (el) el.textContent = d.loc;
        }

        bindEdit('p3ProfileName', 'name');
        bindEdit('p3ProfileHandle', 'handle');
        bindEdit('p3ProfileBio', 'bio');
        bindEdit('p3ProfileLoc', 'loc');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfile);
    } else {
        initProfile();
    }
})();

/* ========== 小拍立得完整功能（专属独立版） ========== */
(function () {
    // 1. 专属图片上传功能
    window.p3PickTicketImgSm = function () {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(inp);

        inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            try { document.body.removeChild(inp); } catch (e) { }
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (ev) {
                var result = ev.target.result;
                var el = document.getElementById('p3TicketImgSm');
                var hint = document.getElementById('p3TicketImgSmHint');

                if (el) el.src = result; // 替换图片
                if (hint) hint.style.display = 'none'; // 隐藏加号

                // 存入本地缓存
                try {
                    var d = JSON.parse(localStorage.getItem('ds_p3_contact') || '{}');
                    d.ticketImgSm = result;
                    localStorage.setItem('ds_p3_contact', JSON.stringify(d));
                } catch (e) { }
            };
            reader.readAsDataURL(file);
        });

        requestAnimationFrame(function () { inp.click(); });
    };

    // 2. 页面加载时自动恢复图片和文字，并绑定文字编辑
    function initSm() {
        var el = document.getElementById('p3TicketImgSm');
        var hint = document.getElementById('p3TicketImgSmHint');
        var textEl = document.getElementById('p3TicketTextSm');

        // 恢复数据
        try {
            var d = JSON.parse(localStorage.getItem('ds_p3_contact') || '{}');
            if (d.ticketImgSm && el) {
                el.src = d.ticketImgSm;
                if (hint) hint.style.display = 'none';
            }
            if (d.ticketTextSm && textEl) {
                textEl.textContent = d.ticketTextSm;
            }
        } catch (e) { }

        // 让文字编辑后能自动保存
        if (textEl) {
            textEl.addEventListener('blur', function () {
                try {
                    var d = JSON.parse(localStorage.getItem('ds_p3_contact') || '{}');
                    d.ticketTextSm = textEl.textContent.trim();
                    localStorage.setItem('ds_p3_contact', JSON.stringify(d));
                } catch (e) { }
            });
            // 敲回车时取消焦点
            textEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
            });
        }
    }

    // 启动专属组件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSm);
    } else {
        initSm();
    }
})();