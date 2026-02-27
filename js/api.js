/* ============================================
   api.js — API设置面板交互逻辑
   蛋薯机 danshu pro
   ============================================ */

// ==========================================
// 数据结构
// ==========================================
// 预设列表存储格式：
// ds_api_presets = [ { id, name, url, key, model }, ... ]
// ds_api_active  = 当前激活的预设id
// ds_api_editing = 正在编辑的预设id（null=新建）

let apiEditingId = null; // 当前编辑的预设ID（null表示新建）

function getApiPresets() {
    try {
        return JSON.parse(localStorage.getItem('ds_api_presets') || '[]');
    } catch (e) {
        return [];
    }
}

function saveApiPresets(list) {
    localStorage.setItem('ds_api_presets', JSON.stringify(list));
}

function getActivePresetId() {
    return localStorage.getItem('ds_api_active') || null;
}

function setActivePresetId(id) {
    if (id) {
        localStorage.setItem('ds_api_active', id);
    } else {
        localStorage.removeItem('ds_api_active');
    }
}

function genId() {
    return 'api_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ==========================================
// 面板：打开 / 关闭
// ==========================================
function openApiApp() {
    openApiPanel();
}

function openApiPanel() {
    document.getElementById('apiPanelOverlay').classList.add('active');
    apiEditingId = null;
    clearApiForm();
    renderPresetList();

    // 如果有激活的预设，自动填入
    const activeId = getActivePresetId();
    if (activeId) {
        const presets = getApiPresets();
        const active = presets.find(p => p.id === activeId);
        if (active) {
            fillApiForm(active);
            apiEditingId = active.id;
        }
    }
}

function closeApiPanel() {
    document.getElementById('apiPanelOverlay').classList.remove('active');
}

// ==========================================
// 表单操作
// ==========================================
function clearApiForm() {
    document.getElementById('apiName').value = '';
    document.getElementById('apiUrl').value = '';
    document.getElementById('apiKey').value = '';
    document.getElementById('apiModel').value = '';
    document.getElementById('modelSelect').innerHTML = '<option value="">-- 请先拉取模型 --</option>';
    document.getElementById('modelSelectWrap').style.display = 'none';
    document.getElementById('apiModelBadge').style.display = 'none';
    apiEditingId = null;
}

function fillApiForm(preset) {
    document.getElementById('apiName').value = preset.name || '';
    document.getElementById('apiUrl').value = preset.url || '';
    document.getElementById('apiKey').value = preset.key || '';
    document.getElementById('apiModel').value = preset.model || '';

    if (preset.model) {
        document.getElementById('apiModelBadge').style.display = 'flex';
        document.getElementById('apiModelBadgeText').textContent = preset.model;
    } else {
        document.getElementById('apiModelBadge').style.display = 'none';
    }

    // 重置模型下拉
    document.getElementById('modelSelect').innerHTML = '<option value="">-- 请先拉取模型 --</option>';
    document.getElementById('modelSelectWrap').style.display = 'none';
}

function getFormData() {
    return {
        name: document.getElementById('apiName').value.trim(),
        url: document.getElementById('apiUrl').value.trim(),
        key: document.getElementById('apiKey').value.trim(),
        model: document.getElementById('apiModel').value.trim()
    };
}

// ==========================================
// 保存预设
// ==========================================
function saveApiPreset() {
    const data = getFormData();

    if (!data.name) {
        showToast('请输入 API 名称');
        return;
    }
    if (!data.url) {
        showToast('请输入 API URL');
        return;
    }

    let presets = getApiPresets();

    if (apiEditingId) {
        // 编辑已有预设
        const idx = presets.findIndex(p => p.id === apiEditingId);
        if (idx !== -1) {
            presets[idx].name = data.name;
            presets[idx].url = data.url;
            presets[idx].key = data.key;
            presets[idx].model = data.model;
        }
    } else {
        // 新建预设
        const newPreset = {
            id: genId(),
            name: data.name,
            url: data.url,
            key: data.key,
            model: data.model
        };
        presets.push(newPreset);
        apiEditingId = newPreset.id;
    }

    saveApiPresets(presets);
    setActivePresetId(apiEditingId);
    renderPresetList();

    // 更新徽标
    if (data.model) {
        document.getElementById('apiModelBadge').style.display = 'flex';
        document.getElementById('apiModelBadgeText').textContent = data.model;
    }

    showToast('预设已保存');
}

// ==========================================
// 渲染预设列表
// ==========================================
function renderPresetList() {
    const list = document.getElementById('apiPresetList');
    const emptyEl = document.getElementById('apiPresetEmpty');
    const presets = getApiPresets();
    const activeId = getActivePresetId();

    // 清空旧内容（保留empty提示）
    list.querySelectorAll('.api-preset-item').forEach(el => el.remove());

    if (presets.length === 0) {
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';

    presets.forEach(function (preset) {
        const item = document.createElement('div');
        item.className = 'api-preset-item' + (preset.id === activeId ? ' active' : '');
        item.dataset.id = preset.id;

        item.innerHTML =
            '<div class="api-preset-icon">' +
            '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 17l6-6-6-6M12 19h8M12 5h8M12 12h8"/></svg>' +
            '</div>' +
            '<div class="api-preset-info">' +
            '<div class="api-preset-name">' + escHtml(preset.name) + '</div>' +
            '<div class="api-preset-model">' + (preset.model ? escHtml(preset.model) : '未设置模型') + '</div>' +
            '</div>' +
            '<div class="api-preset-actions">' +
            '<button class="api-preset-btn edit-btn" data-action="edit" title="编辑">' +
            '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button class="api-preset-btn delete-btn" data-action="delete" title="删除">' +
            '<svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            '</button>' +
            '</div>';

        // 点击卡片主体 → 切换激活
        item.addEventListener('click', function (e) {
            // 如果点的是按钮，不触发切换
            if (e.target.closest('.api-preset-btn')) return;
            switchToPreset(preset.id);
        });

        // 编辑按钮
        item.querySelector('.edit-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            editPreset(preset.id);
        });

        // 删除按钮
        item.querySelector('.delete-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            deletePreset(preset.id);
        });

        list.appendChild(item);
    });
}

// ==========================================
// 预设操作
// ==========================================
function switchToPreset(id) {
    const presets = getApiPresets();
    const preset = presets.find(p => p.id === id);
    if (!preset) return;

    setActivePresetId(id);
    apiEditingId = id;
    fillApiForm(preset);
    renderPresetList();
    showToast('已切换至：' + preset.name);
}

function editPreset(id) {
    const presets = getApiPresets();
    const preset = presets.find(p => p.id === id);
    if (!preset) return;

    apiEditingId = id;
    fillApiForm(preset);
    renderPresetList();

    // 滚动到顶部
    document.querySelector('.api-panel-body').scrollTo({ top: 0, behavior: 'smooth' });
}

function deletePreset(id) {
    if (!confirm('确认删除此预设？')) return;

    let presets = getApiPresets();
    presets = presets.filter(p => p.id !== id);
    saveApiPresets(presets);

    // 如果删的是当前激活的
    if (getActivePresetId() === id) {
        setActivePresetId(null);
        if (apiEditingId === id) {
            clearApiForm();
        }
    }

    renderPresetList();
    showToast('已删除');
}

// ==========================================
// Key 显示/隐藏
// ==========================================
function toggleKeyVisible() {
    const input = document.getElementById('apiKey');
    const icon = document.getElementById('apiKeyEyeIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

// ==========================================
// 拉取模型列表
// ==========================================
async function fetchModels() {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const btn = document.querySelector('.api-btn-action[onclick="fetchModels()"]');

    if (!url) {
        showToast('请先填写 API URL');
        return;
    }
    if (!key) {
        showToast('请先填写 API Key');
        return;
    }

    // 加载状态
    btn.classList.add('loading');

    // 构造模型列表URL
    let modelsUrl = url.replace(/\/+$/, '');
    if (!modelsUrl.endsWith('/models')) {
        modelsUrl += '/models';
    }

    try {
        const resp = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json'
            }
        });

        if (!resp.ok) {
            throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
        }

        const json = await resp.json();
        let models = [];

        // 兼容 OpenAI / 第三方格式
        if (json.data && Array.isArray(json.data)) {
            models = json.data.map(function (m) {
                return m.id || m.name || m;
            });
        } else if (Array.isArray(json)) {
            models = json.map(function (m) {
                return typeof m === 'string' ? m : (m.id || m.name || '');
            });
        }

        if (models.length === 0) {
            showToast('未找到模型');
            btn.classList.remove('loading');
            return;
        }

        // 排序
        models.sort();

        // 填充下拉
        const select = document.getElementById('modelSelect');
        select.innerHTML = '<option value="">-- 选择模型 (' + models.length + ') --</option>';
        models.forEach(function (m) {
            if (!m) return;
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            select.appendChild(opt);
        });

        document.getElementById('modelSelectWrap').style.display = 'flex';

        // 选择事件
        select.onchange = function () {
            if (this.value) {
                document.getElementById('apiModel').value = this.value;
                document.getElementById('apiModelBadge').style.display = 'flex';
                document.getElementById('apiModelBadgeText').textContent = this.value;
            }
        };

        showToast('已获取 ' + models.length + ' 个模型');

    } catch (err) {
        console.error('Fetch models error:', err);
        showToast('拉取失败: ' + err.message);
    }

    btn.classList.remove('loading');
}

// ==========================================
// 导入数据
// ==========================================
function importApiData() {
    const input = document.getElementById('apiFileInput');
    input.value = '';
    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const data = JSON.parse(ev.target.result);

                if (data.presets && Array.isArray(data.presets)) {
                    saveApiPresets(data.presets);
                }
                if (data.activeId) {
                    setActivePresetId(data.activeId);
                }

                // 刷新界面
                clearApiForm();
                const activeId = getActivePresetId();
                if (activeId) {
                    const p = getApiPresets().find(x => x.id === activeId);
                    if (p) {
                        fillApiForm(p);
                        apiEditingId = p.id;
                    }
                }
                renderPresetList();

                showToast('导入成功');

            } catch (err) {
                showToast('文件格式错误');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ==========================================
// 备份数据
// ==========================================
function exportApiData() {
    const presets = getApiPresets();
    const activeId = getActivePresetId();

    if (presets.length === 0) {
        showToast('暂无预设可备份');
        return;
    }

    const data = {
        version: 1,
        exportTime: new Date().toISOString(),
        activeId: activeId,
        presets: presets
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'danshu_api_backup_' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('备份已下载');
}

// ==========================================
// 工具
// ==========================================
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// showToast 在 countdown.js 已定义，这里做兼容
if (typeof showToast === 'undefined') {
    function showToast(msg) {
        let t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);backdrop-filter:blur(14px);color:#fff;padding:12px 28px;border-radius:14px;font-size:14px;font-weight:500;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.3s;';
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.style.opacity = '1'; });
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 300);
        }, 1200);
    }
}
// ==========================================
// 测试连接
// ==========================================
async function testApiConnection() {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const btn = document.querySelector('[onclick="testApiConnection()"]');

    if (!url) { showToast('请先填写 API URL'); return; }
    if (!key) { showToast('请先填写 API Key'); return; }

    btn.classList.add('loading');

    let modelsUrl = url.replace(/\/+$/, '');
    if (!modelsUrl.endsWith('/models')) {
        modelsUrl += '/models';
    }

    try {
        const resp = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json'
            }
        });

        if (resp.ok) {
            showToast('✅ 连接成功！');
        } else {
            showToast('❌ 连接失败：HTTP ' + resp.status);
        }
    } catch (err) {
        showToast('❌ 网络错误：' + err.message);
    }

    btn.classList.remove('loading');
}

// ==========================================
// 测试对话
// ==========================================
async function testApiChat() {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('apiModel').value.trim();
    const btn = document.querySelector('[onclick="testApiChat()"]');

    if (!url) { showToast('请先填写 API URL'); return; }
    if (!key) { showToast('请先填写 API Key'); return; }
    if (!model) { showToast('请先选择或输入模型'); return; }

    btn.classList.add('loading');

    let chatUrl = url.replace(/\/+$/, '');
    if (!chatUrl.endsWith('/chat/completions')) {
        chatUrl += '/chat/completions';
    }

    try {
        const resp = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: '你好，请回复"连接成功"' }],
                max_tokens: 20
            })
        });

        if (!resp.ok) {
            throw new Error('HTTP ' + resp.status);
        }

        const json = await resp.json();
        const reply = json.choices && json.choices[0] && json.choices[0].message
            ? json.choices[0].message.content
            : '(无回复内容)';

        showToast('✅ ' + reply.substring(0, 30));

    } catch (err) {
        showToast('❌ 对话失败：' + err.message);
    }

    btn.classList.remove('loading');
}

