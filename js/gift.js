/* ============================================
   蛋薯机 DanShu Pro v2 — gift.js
   礼物商城 · 实时编辑 · 动态分组 · 纯白色块
   ============================================ */

/* ===== 数据 ===== */
let giftCategories = ['全部'];
const GIFT_COUNT = 12;

let giftItems = [];
let giftWallItems = [];
let giftCurrentCat = '全部';
let giftDetailIdx = -1;

function initGiftData() {
    const saved = localStorage.getItem('ds_gift_items');
    if (saved) {
        try {
            giftItems = JSON.parse(saved);
            while (giftItems.length < GIFT_COUNT) {
                giftItems.push(createDefaultGift(giftItems.length));
            }
        } catch (e) {
            giftItems = [];
        }
    }
    if (!giftItems.length) {
        for (let i = 0; i < GIFT_COUNT; i++) {
            giftItems.push(createDefaultGift(i));
        }
    }
    const savedWall = localStorage.getItem('ds_gift_wall');
    if (savedWall) {
        try { giftWallItems = JSON.parse(savedWall); } catch (e) { giftWallItems = []; }
    }
    const savedCats = localStorage.getItem('ds_gift_cats');
    if (savedCats) {
        try {
            const c = JSON.parse(savedCats);
            if (c.length) giftCategories = c;
        } catch (e) { }
    }
    if (giftCategories[0] !== '全部') giftCategories.unshift('全部');
}

function createDefaultGift(idx) {
    return {
        id: idx,
        name: '未设置',
        price: '0.00',
        desc: '未设置',
        img: '',
        category: '全部'
    };
}

function saveGifts() {
    localStorage.setItem('ds_gift_items', JSON.stringify(giftItems));
}
function saveWall() {
    localStorage.setItem('ds_gift_wall', JSON.stringify(giftWallItems));
}
function saveCats() {
    localStorage.setItem('ds_gift_cats', JSON.stringify(giftCategories));
}

/* ===== 占位渲染 ===== */
function giftPlaceholderHTML(size) {
    const fs = size === 'big' ? '16px' : '12px';
    return `<span class="gift-placeholder" style="font-size:${fs};color:rgba(180,180,180,0.6);font-weight:500;user-select:none;">未设置</span>`;
}

/* ===== 打开 / 关闭商城 ===== */
function openGiftShop() {
    initGiftData();
    const ov = document.getElementById('giftShopOverlay');
    ov.classList.add('show');
    renderGiftShop();
}

function closeGiftShop() {
    const ov = document.getElementById('giftShopOverlay');
    ov.classList.remove('show');
}

/* ===== 渲染商城主体 ===== */
function renderGiftShop() {
    const body = document.getElementById('giftShopBody');
    if (!body) return;

    const recommend = giftItems.slice(0, 4);
    let recHTML = `
    <div class="gift-recommend-section">
        <div class="gift-recommend-header">
            <div class="gift-recommend-title">推荐</div>
            <div class="gift-recommend-more">查看全部
                <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
        </div>
        <div class="gift-recommend-scroll">`;
    recommend.forEach((g) => {
        recHTML += `
        <div class="gift-recommend-card" onclick="openGiftDetail(${g.id})">
            <div class="gift-recommend-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('small')}
            </div>
            <div class="gift-recommend-name">${escGift(g.name)}</div>
            <div class="gift-recommend-price">${g.price}</div>
        </div>`;
    });
    recHTML += `</div></div>`;

    let catHTML = `<div class="gift-category-bar">`;
    giftCategories.forEach((c, i) => {
        const isActive = giftCurrentCat === c ? ' active' : '';
        if (i === 0) {
            catHTML += `<div class="gift-category-chip${isActive}" onclick="switchGiftCat('${escAttr(c)}')">${escGift(c)}</div>`;
        } else {
            catHTML += `<div class="gift-category-chip${isActive}"
                onclick="switchGiftCat('${escAttr(c)}')"
                oncontextmenu="event.preventDefault();confirmDeleteCat(${i},'${escAttr(c)}')"
                ontouchstart="giftCatTouchStart(${i},'${escAttr(c)}')"
                ontouchend="giftCatTouchEnd()"
                ontouchmove="giftCatTouchEnd()">
                ${escGift(c)}
                <span class="gift-cat-del-x" onclick="event.stopPropagation();confirmDeleteCat(${i},'${escAttr(c)}')">×</span>
            </div>`;
        }
    });
    catHTML += `<div class="gift-category-add" onclick="addGiftCategory()">
        <svg viewBox="0 0 24 24" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>`;
    catHTML += `</div>`;

    const filtered = giftCurrentCat === '全部' ? giftItems : giftItems.filter(g => g.category === giftCurrentCat);
    let gridHTML = `<div class="gift-grid">`;
    if (filtered.length === 0) {
        gridHTML += `<div style="grid-column:1/-1;text-align:center;padding:40px 0;font-size:13px;color:rgba(50,40,55,0.3);">该分类下暂无礼物</div>`;
    }
    filtered.forEach(g => {
        gridHTML += `
        <div class="gift-card" onclick="openGiftDetail(${g.id})">
            <div class="gift-card-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('big')}
            </div>
            <div class="gift-card-info">
                <div class="gift-card-name">${escGift(g.name)}</div>
                <div class="gift-card-price">${g.price}</div>
                <div class="gift-card-desc">${escGift(g.desc)}</div>
            </div>
        </div>`;
    });
    gridHTML += `</div>`;

    body.innerHTML = recHTML + catHTML + gridHTML;
}

function switchGiftCat(cat) {
    giftCurrentCat = cat;
    renderGiftShop();
}

/* ===== 分类管理 ===== */
let _catTouchTimer = null;

function giftCatTouchStart(idx, name) {
    _catTouchTimer = setTimeout(() => {
        confirmDeleteCat(idx, name);
    }, 600);
}

function giftCatTouchEnd() {
    if (_catTouchTimer) { clearTimeout(_catTouchTimer); _catTouchTimer = null; }
}

function addGiftCategory() {
    const name = prompt('输入新分组名称:');
    if (!name || !name.trim()) return;
    const n = name.trim();
    if (giftCategories.includes(n)) {
        alert('该分组已存在');
        return;
    }
    giftCategories.push(n);
    saveCats();
    renderGiftShop();
}

function confirmDeleteCat(idx, name) {
    giftCatTouchEnd();
    if (idx <= 0) return;
    if (confirm('确定删除分组「' + name + '」吗？\n该分组下的礼物会变为"全部"分类。')) {
        giftItems.forEach(g => {
            if (g.category === name) g.category = '全部';
        });
        saveGifts();
        giftCategories.splice(idx, 1);
        saveCats();
        if (giftCurrentCat === name) giftCurrentCat = '全部';
        renderGiftShop();
    }
}

/* ===== 礼物详情弹窗 ===== */
function openGiftDetail(id) {
    giftDetailIdx = id;
    const g = giftItems.find(x => x.id === id);
    if (!g) return;

    let catOptions = '';
    giftCategories.forEach(c => {
        catOptions += `<option value="${escAttr(c)}"${g.category === c ? ' selected' : ''}>${escGift(c)}</option>`;
    });

    const ov = document.getElementById('giftDetailOverlay');
    ov.innerHTML = `
    <div class="gift-detail-panel" onclick="event.stopPropagation()">
        <div class="gift-detail-close" onclick="closeGiftDetail()">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>

        <div class="gift-detail-img-wrap" id="giftDetailImgWrap" style="background:#fff;" onclick="uploadGiftImg(${id})">
            ${g.img ? `<img src="${g.img}" alt="" id="giftDetailPreviewImg">` : `<span class="gift-placeholder" id="giftDetailPlaceholder" style="font-size:16px;color:rgba(180,180,180,0.6);font-weight:500;user-select:none;">未设置</span>`}
            <div class="gift-detail-upload-btn">
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                上传图片
            </div>
        </div>

        <div class="gift-detail-body">
            <div class="gift-detail-field">
                <label class="gift-detail-label">名称</label>
                <input class="gift-detail-name-input" id="giftDetailNameInput" type="text"
                    value="${escAttr(g.name)}" placeholder="输入礼物名称"
                    oninput="liveUpdateName(${id}, this.value)"
                    onclick="event.stopPropagation(); this.select()"
                    onfocus="event.stopPropagation()">
            </div>
            <div class="gift-detail-field">
                <label class="gift-detail-label">价格</label>
                <input class="gift-detail-price-input" id="giftDetailPriceInput" type="text"
                    value="${escAttr(g.price)}" placeholder="0.00"
                    oninput="liveUpdatePrice(${id}, this.value)"
                    onclick="event.stopPropagation(); this.select()"
                    onfocus="event.stopPropagation()">
            </div>
            <div class="gift-detail-field">
                <label class="gift-detail-label">分类</label>
                <select class="gift-detail-cat-select" onchange="liveUpdateCategory(${id}, this.value)" onclick="event.stopPropagation()">
                    ${catOptions}
                </select>
            </div>
            <div class="gift-detail-field">
                <label class="gift-detail-label">描述</label>
                <textarea class="gift-detail-desc-input" id="giftDetailDescInput"
                    placeholder="输入礼物描述" rows="2"
                    oninput="liveUpdateDesc(${id}, this.value)"
                    onclick="event.stopPropagation()"
                    onfocus="event.stopPropagation()">${escGift(g.desc)}</textarea>
            </div>

            <div class="gift-detail-btns">
                <div class="gift-detail-save-btn" onclick="saveAndClose(${id})">保存设置</div>
                <div class="gift-detail-buy-btn" onclick="buyGift(${id})">送出</div>
            </div>
            <div class="gift-detail-balance">点击"保存设置"保存并返回 · 点击"送出"添加到礼物墙</div>
        </div>
    </div>`;

    ov.onclick = function (e) {
        if (e.target === ov) closeGiftDetail();
    };

    requestAnimationFrame(() => {
        ov.classList.add('show');
    });
}

function closeGiftDetail() {
    const ov = document.getElementById('giftDetailOverlay');
    ov.classList.remove('show');
    setTimeout(() => {
        if (!ov.classList.contains('show')) {
            ov.innerHTML = '';
            ov.onclick = null;
        }
    }, 350);
    giftDetailIdx = -1;
    // 关闭时刷新列表，确保列表是最新的
    renderGiftShop();
}

/* ========================================================
   实时编辑 — 关键：同时更新数据 + 详情面板内的预览 + 背后列表
   ======================================================== */

function liveUpdateName(id, val) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    g.name = val || '未设置';
    saveGifts();
    // 不调 renderGiftShop()，避免抢焦点；关闭时会刷新
    // 详情面板里的 input 本身已经显示了用户输入，无需额外更新
}

function liveUpdatePrice(id, val) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    g.price = val || '0.00';
    saveGifts();
}

function liveUpdateDesc(id, val) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    g.desc = val || '未设置';
    saveGifts();
}

function liveUpdateCategory(id, val) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    g.category = val || '全部';
    saveGifts();
}

/* ===== 保存并关闭 → 回到列表页，列表立即显示最新数据 ===== */
function saveAndClose(id) {
    const g = giftItems.find(x => x.id === id);
    if (g) {
        const n = parseFloat(g.price);
        g.price = isNaN(n) ? '0.00' : n.toFixed(2);
        if (!g.name || !g.name.trim()) g.name = '未设置';
        if (!g.desc || !g.desc.trim()) g.desc = '未设置';
        saveGifts();
    }
    closeGiftDetail();  // 内部已会调 renderGiftShop()
    if (typeof showToast === 'function') {
        showToast('已保存');
    }
}

/* ===== 上传图片 — 立即在详情面板内显示新图片 ===== */
function uploadGiftImg(id) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function () {
        const file = inp.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const g = giftItems.find(x => x.id === id);
            if (!g) return;
            g.img = e.target.result;
            saveGifts();

            // ★ 关键：直接更新详情面板里的图片DOM，不重建面板 ★
            const wrap = document.getElementById('giftDetailImgWrap');
            if (wrap) {
                // 移除"未设置"占位文字
                const ph = document.getElementById('giftDetailPlaceholder');
                if (ph) ph.remove();

                // 找或创建 img
                let img = document.getElementById('giftDetailPreviewImg');
                if (!img) {
                    img = document.createElement('img');
                    img.id = 'giftDetailPreviewImg';
                    img.alt = '';
                    // 插到上传按钮之前
                    const uploadBtn = wrap.querySelector('.gift-detail-upload-btn');
                    wrap.insertBefore(img, uploadBtn);
                }
                img.src = e.target.result;
            }

            // 不调 renderGiftShop()，关闭时会刷新
        };
        reader.readAsDataURL(file);
    };
    inp.click();
}

/* ===== 送出（加入礼物墙） ===== */
function buyGift(id) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    giftWallItems.push({
        ...g,
        sentAt: Date.now()
    });
    saveWall();
    closeGiftDetail();
    if (typeof showToast === 'function') {
        showToast('已送出，已添加到礼物墙');
    } else {
        alert('已送出，已添加到礼物墙');
    }
}

/* ===== 搜索 ===== */
function openGiftSearch() {
    const ov = document.getElementById('giftSearchOverlay');
    ov.innerHTML = `
    <div class="gift-search-header">
        <input class="gift-search-input" id="giftSearchInput" type="text"
            placeholder="搜索礼物名称..." oninput="doGiftSearch(this.value)" autofocus>
        <div class="gift-search-cancel" onclick="closeGiftSearch()">取消</div>
    </div>
    <div class="gift-search-body" id="giftSearchBody">
        <div style="text-align:center;padding:40px 0;font-size:12px;color:rgba(50,40,55,0.3);">输入关键词搜索</div>
    </div>`;
    ov.classList.add('show');
    setTimeout(() => {
        const inp = document.getElementById('giftSearchInput');
        if (inp) inp.focus();
    }, 300);
}

function closeGiftSearch() {
    const ov = document.getElementById('giftSearchOverlay');
    ov.classList.remove('show');
    setTimeout(() => { ov.innerHTML = ''; }, 250);
}

function doGiftSearch(kw) {
    const body = document.getElementById('giftSearchBody');
    if (!body) return;
    if (!kw.trim()) {
        body.innerHTML = `<div style="text-align:center;padding:40px 0;font-size:12px;color:rgba(50,40,55,0.3);">输入关键词搜索</div>`;
        return;
    }
    const results = giftItems.filter(g => g.name.includes(kw) || g.desc.includes(kw));
    if (!results.length) {
        body.innerHTML = `<div style="text-align:center;padding:40px 0;font-size:12px;color:rgba(50,40,55,0.3);">未找到相关礼物</div>`;
        return;
    }
    let html = `<div class="gift-grid">`;
    results.forEach(g => {
        html += `
        <div class="gift-card" onclick="closeGiftSearch();openGiftDetail(${g.id})">
            <div class="gift-card-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('big')}
            </div>
            <div class="gift-card-info">
                <div class="gift-card-name">${escGift(g.name)}</div>
                <div class="gift-card-price">${g.price}</div>
            </div>
        </div>`;
    });
    html += `</div>`;
    body.innerHTML = html;
}

/* ===== 礼物墙 ===== */
function openGiftWall() {
    const ov = document.getElementById('giftWallOverlay');
    if (!ov) return;
    ov.classList.add('show');
    renderGiftWall();
}

function closeGiftWall() {
    const ov = document.getElementById('giftWallOverlay');
    if (ov) ov.classList.remove('show');
}

function renderGiftWall() {
    const body = document.getElementById('giftWallBody');
    if (!body) return;
    if (!giftWallItems.length) {
        body.innerHTML = `<div style="text-align:center;padding:60px 20px;font-size:13px;color:rgba(50,40,55,0.3);line-height:2;">
            还没有收到礼物<br>快去商城送一个吧
        </div>`;
        return;
    }
    let html = `<div class="gift-grid" style="padding:14px;">`;
    giftWallItems.forEach((g) => {
        html += `
        <div class="gift-card">
            <div class="gift-card-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('big')}
            </div>
            <div class="gift-card-info">
                <div class="gift-card-name">${escGift(g.name)}</div>
                <div class="gift-card-price">${g.price}</div>
                <div class="gift-card-desc">${new Date(g.sentAt).toLocaleDateString()}</div>
            </div>
        </div>`;
    });
    html += `</div>`;
    body.innerHTML = html;
}

/* ===== 工具 ===== */
function escGift(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded', function () {
    initGiftData();
});
