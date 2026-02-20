/* ============================================
   蛋薯机 DanShu Pro v2 — api.js
   API 设置内置 App（完整功能）
   ============================================ */

/* ========== 打开 / 关闭 ========== */
function openApiApp() {
    var overlay = document.getElementById('apiAppOverlay');
    if (!overlay) return;

    // 读取当前激活的预设并填入表单
    var activeId = localStorage.getItem('ds_api_active');
    if (activeId) {
        var presets = getApiPresets();
        var active = null;
        for (var i = 0; i < presets.length; i++) {
            if (presets[i].id === activeId) { active = presets[i]; break; }
        }
        if (active) {
            fillFormFromPreset(active);
        }
    }

    renderPresetList();
    overlay.classList.add('show');
}

function closeApiApp() {
    var overlay = document.getElementById('apiAppOverlay');
    if (overlay) overlay.classList.remove('show');
    // 清除编辑状态
    window._apiEditingId = null;
}

/* ========== 预设数据存取 ========== */
function getApiPresets() {
    try {
        var raw = localStorage.getItem('ds_api_presets');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveApiPresets(list) {
    try {
        localStorage.setItem('ds_api_presets', JSON.stringify(list));
    } catch (e) {
        showToast('存储空间不足');
    }
}

/* ========== 填充表单 ========== */
function fillFormFromPreset(preset) {
    document.getElementById('apiName').value = preset.name || '';
    document.getElementById('apiUrl').value = preset.url || '';
    document.getElementById('apiKey').value = preset.key || '';

    var sel = document.getElementById('apiModelSelect');
    sel.innerHTML = '';

    if (preset.models && preset.models.length > 0) {
        for (var i = 0; i < preset.models.length; i++) {
            var opt = document.createElement('option');
            opt.value = preset.models[i];
            opt.textContent = preset.models[i];
            sel.appendChild(opt);
        }
        sel.value = preset.selectedModel || preset.models[0];
    } else {
        var defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = '-- 请先拉取模型 --';
        sel.appendChild(defOpt);
    }

    document.getElementById('apiModelStatus').textContent =
        preset.models && preset.models.length
            ? '已加载 ' + preset.models.length + ' 个模型'
            : '填写 URL 和 Key 后点击拉取';
}

/* ========== 拉取模型列表 ========== */
function fetchApiModels() {
    var url = document.getElementById('apiUrl').value.trim();
    var key = document.getElementById('apiKey').value.trim();
    var btn = document.getElementById('apiFetchBtn');
    var status = document.getElementById('apiModelStatus');

    if (!url) { showToast('请先填写 API URL'); return; }
    if (!key) { showToast('请先填写 API Key'); return; }

    // 构建 models 端点
    var modelsUrl = url.replace(/\/+$/, '') + '/models';

    btn.classList.add('loading');
    status.textContent = '正在拉取模型列表...';

    fetch(modelsUrl, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + key
        }
    })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function (json) {
            btn.classList.remove('loading');
            var models = [];

            // 兼容 OpenAI 格式
            if (json.data && Array.isArray(json.data)) {
                for (var i = 0; i < json.data.length; i++) {
                    var id = json.data[i].id || json.data[i].name;
                    if (id) models.push(id);
                }
            }
            // 兼容数组直接返回
            else if (Array.isArray(json)) {
                for (var j = 0; j < json.length; j++) {
                    var mid = typeof json[j] === 'string' ? json[j] : (json[j].id || json[j].name);
                    if (mid) models.push(mid);
                }
            }

            models.sort();

            if (models.length === 0) {
                status.textContent = '未找到可用模型';
                showToast('未找到模型数据');
                return;
            }

            // 填充 select
            var sel = document.getElementById('apiModelSelect');
            sel.innerHTML = '';
            for (var k = 0; k < models.length; k++) {
                var opt = document.createElement('option');
                opt.value = models[k];
                opt.textContent = models[k];
                sel.appendChild(opt);
            }

            // 缓存模型列表到临时变量
            window._apiFetchedModels = models;
            status.textContent = '成功拉取 ' + models.length + ' 个模型';
            showToast('拉取到 ' + models.length + ' 个模型');
        })
        .catch(function (err) {
            btn.classList.remove('loading');
            status.textContent = '拉取失败: ' + err.message;
            showToast('拉取失败');
        });
}

/* ========== 保存预设 ========== */
function saveApiPreset() {
    var name = document.getElementById('apiName').value.trim();
    var url = document.getElementById('apiUrl').value.trim();
    var key = document.getElementById('apiKey').value.trim();
    var sel = document.getElementById('apiModelSelect');
    var selectedModel = sel.value;

    if (!name) { showToast('请填写 API 名称'); return; }
    if (!url) { showToast('请填写 API URL'); return; }

    // 收集当前 select 里的所有模型
    var models = [];
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value) {
            models.push(sel.options[i].value);
        }
    }

    var presets = getApiPresets();
    var editingId = window._apiEditingId;

    if (editingId) {
        // 更新已有预设
        for (var j = 0; j < presets.length; j++) {
            if (presets[j].id === editingId) {
                presets[j].name = name;
                presets[j].url = url;
                presets[j].key = key;
                presets[j].models = models;
                presets[j].selectedModel = selectedModel;
                break;
            }
        }
        window._apiEditingId = null;
        showToast('预设已更新');
    } else {
        // 新建预设
        var preset = {
            id: 'api_' + Date.now(),
            name: name,
            url: url,
            key: key,
            models: models,
            selectedModel: selectedModel
        };
        presets.push(preset);
        showToast('预设已保存');
    }

    saveApiPresets(presets);

    // 如果没有激活项，自动激活新保存的
    var activeId = localStorage.getItem('ds_api_active');
    if (!activeId && presets.length > 0) {
        localStorage.setItem('ds_api_active', presets[presets.length - 1].id);
    }
    if (editingId) {
        localStorage.setItem('ds_api_active', editingId);
    }

    renderPresetList();
}

/* ========== 渲染预设列表 ========== */
function renderPresetList() {
    var container = document.getElementById('apiPresetList');
    var presets = getApiPresets();
    var activeId = localStorage.getItem('ds_api_active') || '';

    if (presets.length === 0) {
        container.innerHTML = '<div class="api-preset-empty">暂无预设，保存后将显示在这里</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < presets.length; i++) {
        var p = presets[i];
        var isActive = p.id === activeId;

        html += '<div class="api-preset-card' + (isActive ? ' active' : '') + '" onclick="switchApiPreset(\'' + p.id + '\')">';
        html += '  <div class="api-preset-info">';
        html += '    <div class="api-preset-name">' + escapeHtml(p.name) + '</div>';
        html += '    <div class="api-preset-model">' + escapeHtml(p.selectedModel || '未选择模型') + '</div>';
        html += '  </div>';

        if (isActive) {
            html += '  <div class="api-preset-badge">使用中</div>';
        }

        html += '  <div class="api-preset-actions">';
        html += '    <div class="api-preset-action-btn" onclick="event.stopPropagation(); editApiPreset(\'' + p.id + '\')" title="编辑">';
        html += '      <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
        html += '    </div>';
        html += '    <div class="api-preset-action-btn delete-btn" onclick="event.stopPropagation(); deleteApiPreset(\'' + p.id + '\')" title="删除">';
        html += '      <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }

    container.innerHTML = html;
}

/* ========== 切换预设 ========== */
function switchApiPreset(id) {
    var presets = getApiPresets();
    var target = null;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) { target = presets[i]; break; }
    }
    if (!target) return;

    localStorage.setItem('ds_api_active', id);
    fillFormFromPreset(target);
    window._apiEditingId = null;
    renderPresetList();
    showToast('已切换: ' + target.name);
}

/* ========== 编辑预设 ========== */
function editApiPreset(id) {
    var presets = getApiPresets();
    var target = null;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) { target = presets[i]; break; }
    }
    if (!target) return;

    fillFormFromPreset(target);
    window._apiEditingId = id;

    // 滚动到顶部
    var body = document.querySelector('.api-app-body');
    if (body) body.scrollTop = 0;

    showToast('正在编辑: ' + target.name);
}

/* ========== 删除预设 ========== */
function deleteApiPreset(id) {
    var presets = getApiPresets();
    var target = null;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) { target = presets[i]; break; }
    }
    if (!target) return;

    if (!confirm('确认删除预设「' + target.name + '」？')) return;

    var newList = [];
    for (var j = 0; j < presets.length; j++) {
        if (presets[j].id !== id) newList.push(presets[j]);
    }
    saveApiPresets(newList);

    // 如果删的是当前激活的，清除激活状态
    if (localStorage.getItem('ds_api_active') === id) {
        localStorage.removeItem('ds_api_active');
        // 如果还有其他预设，自动激活第一个
        if (newList.length > 0) {
            localStorage.setItem('ds_api_active', newList[0].id);
            fillFormFromPreset(newList[0]);
        } else {
            // 清空表单
            document.getElementById('apiName').value = '';
            document.getElementById('apiUrl').value = '';
            document.getElementById('apiKey').value = '';
            document.getElementById('apiModelSelect').innerHTML = '<option value="">-- 请先拉取模型 --</option>';
            document.getElementById('apiModelStatus').textContent = '填写 URL 和 Key 后点击拉取';
        }
    }

    if (window._apiEditingId === id) {
        window._apiEditingId = null;
    }

    renderPresetList();
    showToast('已删除: ' + target.name);
}

/* ========== 导出备份 ========== */
function exportApiData() {
    var presets = getApiPresets();
    var activeId = localStorage.getItem('ds_api_active') || '';

    if (presets.length === 0) {
        showToast('暂无预设可备份');
        return;
    }

    var data = {
        version: 1,
        activeId: activeId,
        presets: presets,
        exportTime: new Date().toISOString()
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'danshu_api_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('备份文件已下载');
}

/* ========== 导入数据 ========== */
function importApiData() {
    document.getElementById('apiImportFile').click();
}

function handleApiImport(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);

            if (!data.presets || !Array.isArray(data.presets)) {
                showToast('文件格式不正确');
                return;
            }

            // 合并还是覆盖
            var existing = getApiPresets();
            if (existing.length > 0) {
                if (!confirm('已有 ' + existing.length + ' 个预设，是否覆盖？\n点"确定"覆盖，点"取消"追加合并。')) {
                    // 追加合并：给导入的重新生成 ID 避免冲突
                    for (var i = 0; i < data.presets.length; i++) {
                        data.presets[i].id = 'api_' + Date.now() + '_' + i;
                        existing.push(data.presets[i]);
                    }
                    saveApiPresets(existing);
                    renderPresetList();
                    showToast('已合并 ' + data.presets.length + ' 个预设');
                    event.target.value = '';
                    return;
                }
            }

            // 覆盖导入
            saveApiPresets(data.presets);
            if (data.activeId) {
                localStorage.setItem('ds_api_active', data.activeId);
            }

            // 填充第一个或激活的
            var activePreset = null;
            for (var j = 0; j < data.presets.length; j++) {
                if (data.presets[j].id === data.activeId) {
                    activePreset = data.presets[j];
                    break;
                }
            }
            if (!activePreset && data.presets.length > 0) {
                activePreset = data.presets[0];
                localStorage.setItem('ds_api_active', activePreset.id);
            }
            if (activePreset) fillFormFromPreset(activePreset);

            renderPresetList();
            showToast('成功导入 ' + data.presets.length + ' 个预设');

        } catch (err) {
            showToast('导入失败: 文件解析错误');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/* ========== HTML 转义工具 ========== */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ========== 获取当前激活的 API 配置（供其他模块调用） ========== */
function getActiveApiConfig() {
    var activeId = localStorage.getItem('ds_api_active');
    if (!activeId) return null;

    var presets = getApiPresets();
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === activeId) {
            return {
                name: presets[i].name,
                url: presets[i].url,
                key: presets[i].key,
                model: presets[i].selectedModel
            };
        }
    }
    return null;
}
/* ========== 修复移动端 input 无法输入 / 粘贴 ========== */
(function () {
    // 阻止手机模拟器外壳拦截 input/select/textarea 的触摸事件
    document.addEventListener('touchstart', function (e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            e.stopPropagation();
        }
    }, true); // ← 捕获阶段，优先于外壳的事件处理

    document.addEventListener('touchmove', function (e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('touchend', function (e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            e.stopPropagation();
        }
    }, true);
})();
