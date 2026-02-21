/* ============================================
   蛋薯机 DanShu Pro — 社交后端
   最小化 Node.js 服务器
   
   运行: node server.js
   默认端口: 3456
   ============================================ */

const http = require('http');
const fs = require('fs');

const PORT = 3456;
const DATA_FILE = './social_data.json';

// 内存数据库
let db = { users: {}, friendRequests: [], messages: [] };

// 加载持久化数据
try {
    if (fs.existsSync(DATA_FILE)) {
        db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
} catch (e) { console.log('初始化新数据库'); }

function saveDB() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); } catch (e) { }
}

function genReqId() { return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); }

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
        });
    });
}

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Social-Id');
}

function json(res, data, status) {
    res.writeHead(status || 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    // ===== 注册/更新用户 =====
    if (path === '/api/register' && req.method === 'POST') {
        const data = await parseBody(req);
        if (!data.id) return json(res, { error: '缺少ID' }, 400);

        // 检查ID冲突
        if (db.users[data.id] && db.users[data.id].createdBy !== req.headers['x-social-id']) {
            // ID已被占用，生成新的
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let newId = 'DS_';
            for (let i = 0; i < 6; i++) newId += chars[Math.floor(Math.random() * chars.length)];
            data.id = newId;
        }

        db.users[data.id] = {
            id: data.id,
            nickname: data.nickname || '薯薯用户',
            avatar: data.avatar || '',
            bio: data.bio || '',
            updatedAt: Date.now(),
            createdBy: data.id
        };
        saveDB();
        return json(res, { success: true, id: data.id });
    }

    // ===== 查询用户 =====
    if (path.startsWith('/api/user/') && req.method === 'GET') {
        const targetId = decodeURIComponent(path.replace('/api/user/', ''));
        const user = db.users[targetId];
        if (user) return json(res, { user: { id: user.id, nickname: user.nickname, avatar: user.avatar, bio: user.bio } });
        return json(res, { user: null });
    }

    // ===== 发送好友请求 =====
    if (path === '/api/friend/request' && req.method === 'POST') {
        const data = await parseBody(req);
        if (!data.from || !data.to) return json(res, { error: '参数不完整' }, 400);
        if (!db.users[data.to]) return json(res, { error: '用户不存在' }, 404);

        // 检查重复请求
        const existing = db.friendRequests.find(r => r.from === data.from && r.to === data.to && r.status === 'pending');
        if (existing) return json(res, { error: '已发送过请求' }, 400);

        db.friendRequests.push({
            id: genReqId(),
            from: data.from,
            to: data.to,
            fromNickname: data.fromNickname || '',
            fromAvatar: data.fromAvatar || '',
            status: 'pending',
            createdAt: Date.now()
        });
        saveDB();
        return json(res, { success: true });
    }

    // ===== 查询好友请求 =====
    if (path === '/api/friend/requests' && req.method === 'GET') {
        const userId = url.searchParams.get('userId');
        const pending = db.friendRequests.filter(r => r.to === userId && r.status === 'pending');
        return json(res, { requests: pending });
    }

    // ===== 同意好友 =====
    if (path === '/api/friend/accept' && req.method === 'POST') {
        const data = await parseBody(req);
        const req_ = db.friendRequests.find(r => r.id === data.requestId);
        if (req_) {
            req_.status = 'accepted';
            saveDB();
        }
        return json(res, { success: true });
    }

    // ===== 拒绝好友 =====
    if (path === '/api/friend/reject' && req.method === 'POST') {
        const data = await parseBody(req);
        const req_ = db.friendRequests.find(r => r.id === data.requestId);
        if (req_) {
            req_.status = 'rejected';
            saveDB();
        }
        return json(res, { success: true });
    }

    // ===== 发送消息 =====
    if (path === '/api/message/send' && req.method === 'POST') {
        const data = await parseBody(req);
        db.messages.push({
            from: data.from,
            to: data.to,
            text: data.text,
            type: data.type || 'text',
            time: data.time || Date.now(),
            timeStr: data.timeStr || '',
            delivered: false
        });
        saveDB();
        return json(res, { success: true });
    }

    // ===== 拉取消息 =====
    if (path === '/api/message/pull' && req.method === 'GET') {
        const userId = url.searchParams.get('userId');
        // 找出发给该用户的未投递消息
        const undelivered = db.messages.filter(m => m.to === userId && !m.delivered);
        // 标记为已投递
        undelivered.forEach(m => m.delivered = true);
        if (undelivered.length) saveDB();
        return json(res, { messages: undelivered });
    }

    // 404
    json(res, { error: 'Not Found' }, 404);
});

server.listen(PORT, () => {
    console.log(`🥔 蛋薯社交服务器运行中: http://localhost:${PORT}`);
    console.log(`   前端配置: SOCIAL_API_URL = 'http://localhost:${PORT}/api'`);
});
