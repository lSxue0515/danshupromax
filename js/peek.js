/* ============================================
   蛋薯机 DanShu Pro v2 — peek.js v8
   偷偷看 — 查看角色手机
   ★ 联系人：只提取"关系（名字）"+下行有"关系类型"
   ★ 每个NPC独立对话，根据关系动态生成
   ★ 论坛：根据人设生成角色视角帖子
   ★ 消息：外语+中文翻译
   ★ 备忘录/日历：外语+中文翻译
   ============================================ */

var _pkCur = null, _pkTgt = null, _pkFT = 'posts';
var _pkCY = 0, _pkCM = 0, _pkCS = '', _pkMI = -1;
var PK = 'ds_peek_';
function _pk(c, s) { return PK + c + '_' + s; }
function _e(s) { if (typeof esc === 'function') return esc(s); var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
var _SU = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
function _pL(c, k) { try { return JSON.parse(localStorage.getItem(_pk(c, k)) || 'null'); } catch (e) { return null; } }
function _pS(c, k, v) { try { localStorage.setItem(_pk(c, k), JSON.stringify(v)); } catch (e) { } }
var _rfSvg = '<svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

/* =================================================================
   语言检测
   ================================================================= */
function _lang(role) {
    var name = (role.name || '').trim();
    var nick = (role.nickname || '').trim();
    var det = (role.detail || '');
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(name) || /[\u3040-\u309F\u30A0-\u30FF]/.test(nick)) return 'ja';
    if (/日本|東京|东京|大阪|京都|日语|日文|Japanese|Japan/.test(det)) return 'ja';
    if (/[ぁ-ん]{3,}|[ァ-ヶ]{3,}/.test(det)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(name)) return 'ko';
    if (/韩国|韩语|首尔|Seoul|Korean|Korea/.test(det)) return 'ko';
    if (/^[A-Za-z\s\-'\.]+$/.test(name) && name.length > 1) return 'en';
    if (/美国|英国|America|British|English|英语/.test(det)) return 'en';
    return 'zh';
}

/* =================================================================
   联系人提取
   ================================================================= */
function _extractPeople(role) {
    var detail = role.detail || '';
    if (!detail.trim()) return [];
    var charName = role.nickname || role.name || '';
    var userName = '';
    if (typeof getActivePersona === 'function') { var pa = getActivePersona(role.id); if (pa && pa.name) userName = pa.name; }
    var found = [], foundKey = {};
    var lines = detail.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var m = line.match(/^(.+?)[（(]([^）)]{2,15})[）)]/);
        if (!m) continue;
        var relPart = m[1].trim(), namePart = m[2].trim();
        var hasRelType = false;
        for (var j = 1; j <= 3 && (i + j) < lines.length; j++) {
            var nl = lines[i + j].trim();
            if (!nl) continue;
            if (/^关系类型[：:]/.test(nl)) { hasRelType = true; break; }
            if (/^.+?[（(][^）)]+[）)]/.test(nl)) break;
        }
        if (!hasRelType) continue;
        if (namePart === charName || namePart === (role.name || '') || namePart === (role.nickname || '')) continue;
        if (userName && namePart === userName) continue;
        if (foundKey[namePart]) continue;
        foundKey[namePart] = true;
        var dynText = '';
        for (var k = i + 1; k < lines.length; k++) {
            var dl = lines[k].trim();
            if (!dl) { if (k + 1 < lines.length) { var peek = lines[k + 1].trim(); if (/^.+?[（(][^）)]+[）)]/.test(peek)) break; } continue; }
            if (/^.+?[（(][^）)]+[）)]/.test(dl)) { var isNP = false; for (var q = 1; q <= 3 && (k + q) < lines.length; q++) { var ql = lines[k + q].trim(); if (!ql) continue; if (/^关系类型[：:]/.test(ql)) { isNP = true; break; } break; } if (isNP) break; }
            dynText += dl + '\n';
        }
        found.push({ id: '_p' + found.length, name: namePart, rel: relPart, dynamic: dynText.trim() });
    }
    return found;
}

/* =================================================================
   性格 & 兴趣检测
   ================================================================= */
function _getTone(detail) {
    if (!detail) return 'neutral';
    var d = detail.toLowerCase();
    if (/傲娇|ツンデレ|tsundere/.test(d)) return 'tsundere';
    if (/病娇|ヤンデレ|yandere/.test(d)) return 'yandere';
    if (/毒舌|暴躁|强势|粗暴/.test(d)) return 'sharp';
    if (/高冷|冷漠|冷淡|クール|沉默|寡言|无口/.test(d)) return 'cold';
    if (/温柔|善良|優しい|gentle/.test(d)) return 'gentle';
    if (/害羞|内向|shy|自卑/.test(d)) return 'shy';
    if (/开朗|乐观|元気|cheerful/.test(d)) return 'cheerful';
    return 'neutral';
}
function _getTraits(detail) {
    if (!detail) return [];
    var d = detail.toLowerCase(), out = [];
    var map = [
        { k: /做饭|烹饪|料理|烘焙|cooking/, t: '料理' },
        { k: /游戏|ゲーム|game/, t: '游戏' },
        { k: /音乐|唱歌|弹琴|吉他|钢琴|音楽|music/, t: '音乐' },
        { k: /读书|看书|読書|reading/, t: '阅读' },
        { k: /动漫|漫画|アニメ|anime|manga/, t: '动漫' },
        { k: /运动|健身|スポーツ|sport/, t: '运动' },
        { k: /猫|ねこ|cat/, t: '猫' },
        { k: /烟|タバコ|smoke/, t: '烟' },
        { k: /酒|ビール|beer|drink/, t: '酒' },
        { k: /咖啡|コーヒー|coffee/, t: '咖啡' }
    ];
    for (var i = 0; i < map.length; i++) { if (map[i].k.test(d)) out.push(map[i].t); }
    return out;
}

/* =================================================================
   联系人缓存
   ================================================================= */
function _contacts(cid) {
    var c = _pL(cid, 'cts8');
    if (c) return c;
    var role = (typeof findRole === 'function') ? findRole(cid) : null;
    if (!role) return [];
    var contacts = _extractPeople(role);
    _pS(cid, 'cts8', contacts);
    return contacts;
}

/* =================================================================
   聊天记录
   ================================================================= */
function _msgs(cid, tid) {
    if (tid === '_user') {
        var role = (typeof findRole === 'function') ? findRole(cid) : null;
        var msgs = [];
        if (role && role.msgs) {
            for (var i = 0; i < role.msgs.length; i++) {
                var m = role.msgs[i];
                if (m.transfer || m.familyCard || m.redPacket || m.locationShare) continue;
                var t = m.text || ''; if (!t.trim()) continue;
                msgs.push({ from: m.from === 'self' ? 'other' : 'self', text: t, time: m.time || '' });
            }
        }
        return msgs.concat(_pL(cid, 'px__user') || []);
    }
    var ck = 'gc8_' + tid;
    var cached = _pL(cid, ck);
    if (cached) return cached.concat(_pL(cid, 'px_' + tid) || []);
    var role2 = (typeof findRole === 'function') ? findRole(cid) : null;
    if (!role2) return [];
    var lang = _lang(role2);
    var tone = _getTone(role2.detail);
    var cts = _contacts(cid);
    var contact = null;
    for (var c = 0; c < cts.length; c++) { if (cts[c].id === tid) { contact = cts[c]; break; } }
    if (!contact) return [];
    var un = '';
    if (typeof getActivePersona === 'function') { var pa = getActivePersona(cid); if (pa && pa.name) un = pa.name; }
    if (!un) un = 'user';
    var gen = _buildChat(tone, lang, contact, role2.nickname || role2.name, un);
    _pS(cid, ck, gen);
    return gen.concat(_pL(cid, 'px_' + tid) || []);
}

/* =================================================================
   ★ 对话生成 — 每个NPC独立，外语带翻译
   ================================================================= */
function _buildChat(tone, lang, contact, charName, userName) {
    var cn = contact.name;
    var rel = contact.rel;
    var dyn = contact.dynamic || '';
    var ja = (lang === 'ja'), ko = (lang === 'ko'), en = (lang === 'en');

    function T(zh, jaT, koT, enT) {
        if (ja) return jaT + '\n（' + zh + '）';
        if (ko) return koT + '\n（' + zh + '）';
        if (en) return enT + '\n（' + zh + '）';
        return zh;
    }

    var topics = [];
    if (/唠叨|嘱咐|注意身体|少抽|少喝|多吃|好好吃饭|早点睡/.test(dyn)) topics.push('nagging');
    if (/默默|陪|发呆|安静|沉默/.test(dyn)) topics.push('quiet');
    if (/调侃|打趣|开玩笑|揶揄|笑/.test(dyn)) topics.push('tease');
    if (/邀请|约|喝酒|吃饭|出去玩/.test(dyn)) topics.push('invite');
    if (/小组|作业|工作|项目|上课|课/.test(dyn)) topics.push('work');
    if (/搬家|失去联系|离开|再见|分别/.test(dyn)) topics.push('distant');
    if (/买|食材|药|带|东西/.test(dyn)) topics.push('errand');
    if (/记得|习惯|常去|每次|总是/.test(dyn)) topics.push('routine');

    var msgs = [];
    var isFamily = /奶奶|爷爷|妈|爸|母|父|姐|哥|弟|妹/.test(rel);
    var isFriend = /朋友|好友|同学|室友|搭档|邻居|发小|竹马/.test(rel);
    var isFormal = /同事|上司|老板|前辈|后辈|学长|学姐|老师|店/.test(rel);

    if (isFamily) {
        if (topics.indexOf('nagging') >= 0 || topics.indexOf('errand') >= 0) {
            msgs = [
                { f: 'other', t: T('好好吃饭了吗？', 'ちゃんとご飯食べてる？', '밥은 제대로 먹고 있어?', 'Have you been eating properly?') },
                { f: 'self', t: T(tone === 'sharp' ? '吃了，别啰嗦' : '嗯，吃了', tone === 'sharp' ? '食べてるよ、うるさいな' : 'うん、食べてる', tone === 'sharp' ? '먹었어, 잔소리 좀' : '응, 먹고 있어', tone === 'sharp' ? 'Yeah, stop nagging' : 'Yeah I have') },
                { f: 'other', t: T('这周末回来吗？', '今度いつ帰ってくるの？', '이번 주말에 올 거지?', 'When are you coming home?') },
                { f: 'self', t: T(tone === 'sharp' ? '说了会回去的' : '嗯，周末回', tone === 'sharp' ? '週末行くって言ってるだろ' : 'うん、週末行くよ', tone === 'sharp' ? '간다고 했잖아' : '응, 주말에 갈게', tone === 'sharp' ? 'I said I\'d come' : 'Yeah, this weekend') },
                { f: 'other', t: T('药快吃完了', '薬がもうすぐ切れるから', '약이 곧 떨어져', 'Medicine is running low') },
                { f: 'self', t: T('知道了，我带过去', 'わかった、買っていく', '알았어, 사갈게', 'Got it, I\'ll bring some') },
                { f: 'other', t: T(charName + '还是' + charName + '啊', charName + 'は' + charName + 'だねぇ', charName + '는 ' + charName + '답다', charName + ' is always ' + charName) }
            ];
        } else {
            msgs = [
                { f: 'other', t: T('最近怎么样？', '最近どう？元気にしてる？', '요즘 어때? 잘 지내?', 'How have you been?') },
                { f: 'self', t: T(tone === 'cold' ? '嗯' : '还行', tone === 'cold' ? 'うん' : 'まあまあ', tone === 'cold' ? '응' : '그럭저럭', tone === 'cold' ? 'Yeah' : 'So-so') },
                { f: 'other', t: T('别太勉强自己', '無理しちゃだめだよ', '무리하면 안 돼', 'Don\'t push yourself') },
                { f: 'self', t: T('知道了', 'わかってる', '알고 있어', 'I know') },
                { f: 'other', t: T('没关系的，' + charName, '大丈夫だからね、' + charName, '괜찮아, ' + charName, 'It\'s okay, ' + charName) }
            ];
        }
    } else if (isFriend) {
        if (topics.indexOf('tease') >= 0) {
            msgs = [
                { f: 'other', t: T('哟，最近怎样', 'よう、最近どう', '야, 요즘 어때', 'Hey, how\'s it going') },
                { f: 'self', t: T(tone === 'sharp' ? '没怎样' : '还行', tone === 'sharp' ? '別に' : 'まあまあ', tone === 'sharp' ? '별로' : '그냥 그래', tone === 'sharp' ? 'Whatever' : 'Not bad') },
                { f: 'other', t: T('感觉你最近心情不错啊', 'なんか最近楽しそうだな', '요즘 기분 좋아 보인다', 'You seem in a good mood lately') },
                { f: 'self', t: T(tone === 'sharp' ? '哈？哪有' : '…是吗', tone === 'sharp' ? 'は？どこが' : '…そう？', tone === 'sharp' ? '뭐가' : '…그래?', tone === 'sharp' ? 'Huh? No' : '...Really?') },
                { f: 'other', t: T('就是感觉嘛', 'いや、なんとなく', '그냥 느낌이', 'Just a feeling') },
                { f: 'self', t: T(tone === 'sharp' ? '闭嘴' : '哦', tone === 'sharp' ? 'うるさい' : 'ふーん', tone === 'sharp' ? '시끄러' : '흠', tone === 'sharp' ? 'Shut up' : 'Hmm') }
            ];
        } else if (topics.indexOf('invite') >= 0) {
            msgs = [
                { f: 'other', t: T('下次一起喝一杯？', '今度飲みに行かない？', '이번에 한잔 할래?', 'Wanna grab drinks?') },
                { f: 'self', t: T(tone === 'cold' ? '算了' : tone === 'sharp' ? '怎么突然' : '什么时候', tone === 'cold' ? '面倒' : tone === 'sharp' ? 'なんで急に' : 'いつ？', tone === 'cold' ? '귀찮아' : tone === 'sharp' ? '갑자기 왜' : '언제?', tone === 'cold' ? 'Pass' : tone === 'sharp' ? 'Why suddenly' : 'When?') },
                { f: 'other', t: T('下周五怎样', '来週の金曜とか', '다음주 금요일 어때', 'Next Friday maybe?') },
                { f: 'self', t: T(tone === 'cold' ? '……再说吧' : tone === 'sharp' ? '看心情' : '行', tone === 'cold' ? '……考えとく' : tone === 'sharp' ? '気が向いたらな' : 'いいよ', tone === 'cold' ? '……생각해볼게' : '좋아', tone === 'cold' ? '...I\'ll think about it' : 'Sure') }
            ];
        } else if (topics.indexOf('work') >= 0) {
            msgs = [
                { f: 'other', t: T('那个报告交了吗', 'あのレポートもう出した？', '그 리포트 제출했어?', 'Did you submit that report?') },
                { f: 'self', t: T(tone === 'sharp' ? '当然了' : '嗯，交了', tone === 'sharp' ? '当たり前だろ' : 'うん、出した', tone === 'sharp' ? '당연하지' : '응, 했어', tone === 'sharp' ? 'Obviously' : 'Yeah') },
                { f: 'other', t: T('真的？我才写一半…', 'マジで？俺まだ半分…', '진짜? 나 아직 반밖에…', 'For real? I\'m only halfway...') },
                { f: 'self', t: T(tone === 'sharp' ? '关我什么事' : '加油', tone === 'sharp' ? '知らねーよ' : '頑張れ', tone === 'sharp' ? '알 바 아니야' : '힘내', tone === 'sharp' ? 'Not my problem' : 'Good luck') },
                { f: 'other', t: T('能借我看看吗', 'ちょっと見せてくれない？', '좀 보여줘', 'Can I see yours?') },
                { f: 'self', t: T(tone === 'sharp' ? '自己写' : '……就看一眼', tone === 'sharp' ? '自分でやれ' : '……少しだけ', tone === 'sharp' ? '직접 해' : '……조금만', tone === 'sharp' ? 'Do it yourself' : '...Just a peek') }
            ];
        } else if (topics.indexOf('quiet') >= 0) {
            msgs = [
                { f: 'other', t: T('今天有空吗', '今日暇？', '오늘 시간 있어?', 'Free today?') },
                { f: 'self', t: T('没什么事', '別に', '별로', 'Not really') },
                { f: 'other', t: T('那老地方', 'じゃあいつもの場所で', '그럼 평소 그곳에서', 'The usual spot then') },
                { f: 'self', t: T('……嗯', '……うん', '……응', '...sure') }
            ];
        } else if (topics.indexOf('distant') >= 0) {
            msgs = [
                { f: 'other', t: T('好久不见', '久しぶり、元気？', '오랜만이다, 잘 지내?', 'Long time no see') },
                { f: 'self', t: T('……好久不见', '……久しぶり', '……오랜만', '...Been a while') },
                { f: 'other', t: T('那边怎么样', 'そっちはどう', '거기는 어때', 'How are things there') },
                { f: 'self', t: T('老样子。你呢', '変わんない。そっちは', '그대로야. 너는', 'Same as always. You?') },
                { f: 'other', t: T('还行吧', 'まあぼちぼち', '뭐, 그럭저럭', 'Getting by') }
            ];
        } else {
            msgs = [
                { f: 'other', t: T('哟', 'よう', '야', 'Yo') },
                { f: 'self', t: T(tone === 'cold' ? '嗯' : tone === 'sharp' ? '干嘛' : '哟', tone === 'cold' ? 'ん' : tone === 'sharp' ? '何' : 'よう', tone === 'cold' ? '응' : tone === 'sharp' ? '뭐' : '야', tone === 'cold' ? 'Hey' : tone === 'sharp' ? 'What' : 'Hey') },
                { f: 'other', t: T('今天的课好无聊', '今日の授業だるかったな', '오늘 수업 진짜 지루했다', 'Today\'s class was so boring') },
                { f: 'self', t: T(tone === 'sharp' ? '不知道，我睡着了' : '是啊', tone === 'sharp' ? '知らん、寝てた' : 'まあな', tone === 'sharp' ? '몰라, 잤어' : '그러게', tone === 'sharp' ? 'Dunno, I slept' : 'Yeah') },
                { f: 'other', t: T('中午吃的什么', '昼飯何食った？', '점심 뭐 먹었어?', 'What\'d you eat for lunch?') },
                { f: 'self', t: T(tone === 'cold' ? '便利店' : '泡面', tone === 'cold' ? 'コンビニ' : 'カップ麺', tone === 'cold' ? '편의점' : '컵라면', tone === 'cold' ? 'Convenience store' : 'Cup noodles') },
                { f: 'other', t: T('你好歹吃点好的…', 'ちゃんと食えよ…', '제대로 좀 먹어라…', 'At least eat something decent...') }
            ];
        }
    } else if (isFormal) {
        if (topics.indexOf('routine') >= 0 || /便利店|コンビニ|店|常去/.test(dyn)) {
            msgs = [
                { f: 'other', t: T('来了啊，老样子？', 'いらっしゃい。いつもの？', '어서와. 늘 그거?', 'Welcome. The usual?') },
                { f: 'self', t: T('嗯', 'うん', '응', 'Yeah') },
                { f: 'other', t: T('少抽点啊', 'タバコ少し減らしたら？', '담배 좀 줄여봐', 'Maybe cut back on the cigarettes?') },
                { f: 'self', t: T('……嗯', '……うん', '……응', '...yeah') },
                { f: 'other', t: T('注意身体', '気をつけてね', '몸 조심해', 'Take care') }
            ];
        } else {
            msgs = [
                { f: 'other', t: T('辛苦了', 'お疲れ様です', '수고하셨습니다', 'Good work today') },
                { f: 'self', t: T('嗯', 'お疲れ', '수고', 'Thanks') },
                { f: 'other', t: T('明天的事确认了吗', '明日の件、確認しました？', '내일 건 확인했어요?', 'Did you check tomorrow\'s schedule?') },
                { f: 'self', t: T('收到', '了解', '네', 'Noted') }
            ];
        }
    } else {
        msgs = [
            { f: 'other', t: T('你好', 'こんにちは', '안녕하세요', 'Hello') },
            { f: 'self', t: T(tone === 'cold' ? '嗯' : '你好', tone === 'cold' ? 'うん' : 'こんにちは', tone === 'cold' ? '응' : '안녕', tone === 'cold' ? 'Hey' : 'Hello') }
        ];
    }

    var result = [];
    for (var i = 0; i < msgs.length; i++)result.push({ from: msgs[i].f, text: msgs[i].t, time: '' });
    return result;
}

function _lastMsg(cid, tid) {
    var ms = _msgs(cid, tid); if (!ms.length) return '';
    return (ms[ms.length - 1].text || '').split('\n')[0];
}

/* =================================================================
   备忘录 — 外语+翻译
   ================================================================= */
function _autoMemos(cid) { var e = _pL(cid, 'memos'); if (e && e.length) return e; return _genMemos(cid); }
function _genMemos(cid) {
    var role = (typeof findRole === 'function') ? findRole(cid) : null; if (!role) return [];
    var lang = _lang(role);
    var ja = (lang === 'ja'), ko = (lang === 'ko'), en = (lang === 'en');
    var people = _extractPeople(role);
    var un = ''; if (typeof getActivePersona === 'function') { var pa = getActivePersona(cid); if (pa && pa.name) un = pa.name; }
    if (!un) un = 'user';
    var now = Date.now();
    var pool = [];

    function T(zh, jaT, koT, enT) {
        if (ja) return jaT + '\n（' + zh + '）';
        if (ko) return koT + '\n（' + zh + '）';
        if (en) return enT + '\n（' + zh + '）';
        return zh;
    }
    function TT(zh, jaT, koT, enT) {
        if (ja) return jaT; if (ko) return koT; if (en) return enT; return zh;
    }

    var i1 = [];
    i1.push(T('手机、钥匙、钱包', '携帯、鍵、財布', '핸드폰, 열쇠, 지갑', 'Phone, keys, wallet'));
    i1.push(T('记得带伞', '傘を忘れずに', '우산 챙기기', 'Remember umbrella'));
    for (var p = 0; p < people.length; p++) {
        if (/奶奶|爷爷|妈|爸/.test(people[p].rel)) {
            i1.push(T('给' + people[p].name + '带食材和药', people[p].name + 'に食材と薬を持っていく', people[p].name + '에게 식재료와 약 가져가기', 'Bring groceries & medicine to ' + people[p].name));
            break;
        }
    }
    pool.push({ title: TT('出门清单', '外出チェックリスト', '외출 체크리스트', 'Going Out Checklist'), text: i1.join('\n'), pin: true, ts: now - 86400000 });

    var i2 = [];
    i2.push(T('回复消息', '□ メッセージ返信', '□ 메시지 답장', '□ Reply messages'));
    i2.push(T('买猫粮', '□ 猫の餌を買う', '□ 고양이 사료 사기', '□ Buy cat food'));
    i2.push(T('打扫房间', '□ 部屋の掃除', '□ 방 청소', '□ Clean room'));
    pool.push({ title: TT('待办事项', 'やることリスト', '할 일', 'To-Do'), text: i2.join('\n'), pin: false, ts: now - 172800000 });

    var i3 = [];
    i3.push(T('周一：上课', '月曜：授業', '월요일: 수업', 'Mon: Class'));
    i3.push(T('周三：采购', '水曜：買い出し', '수요일: 장보기', 'Wed: Shopping'));
    for (var q = 0; q < people.length; q++) {
        if (/奶奶|爷爷/.test(people[q].rel)) {
            i3.push(T('周末：回' + people[q].name + '那里', '週末：' + people[q].name + 'の家へ', '주말: ' + people[q].name + ' 집에', 'Weekend: Visit ' + people[q].name));
            break;
        }
    }
    pool.push({ title: TT('本周行程', '今週の予定', '이번 주 일정', "This Week"), text: i3.join('\n'), pin: false, ts: now - 604800000 });

    _pS(cid, 'memos', pool);
    return pool;
}

/* =================================================================
   日历 — 外语+翻译
   ================================================================= */
function _autoEvents(cid) { var e = _pL(cid, 'evts'); if (e && Object.keys(e).length) return e; return _genEvents(cid); }
function _genEvents(cid) {
    var role = (typeof findRole === 'function') ? findRole(cid) : null; if (!role) return {};
    var lang = _lang(role);
    var ja = (lang === 'ja'), ko = (lang === 'ko'), en = (lang === 'en');
    var rn = role.nickname || role.name;
    var people = _extractPeople(role);
    var un = ''; if (typeof getActivePersona === 'function') { var pa = getActivePersona(cid); if (pa && pa.name) un = pa.name; }
    if (!un) un = 'user';
    var now = new Date(), events = {};

    function T(zh, jaT, koT, enT) {
        if (ja) return jaT + '\n（' + zh + '）';
        if (ko) return koT + '\n（' + zh + '）';
        if (en) return enT + '\n（' + zh + '）';
        return zh;
    }
    function addE(off, txt) {
        var d = new Date(now.getTime() + off * 86400000);
        var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        if (!events[k]) events[k] = []; events[k].push(txt);
    }

    addE(0, T('今天也加油', '今日も頑張る ♡', '오늘도 힘내자 ♡', 'Do my best today ♡'));
    addE(3, T('和' + un + '的约定', un + 'との約束 💕', un + '과의 약속 💕', 'Promise with ' + un + ' 💕'));
    for (var i = 0; i < people.length; i++) {
        if (/奶奶|爷爷|妈|爸/.test(people[i].rel)) {
            addE(7 + i * 5, T('回去看' + people[i].name, people[i].name + 'のところへ行く', people[i].name + '에게 가기', 'Visit ' + people[i].name));
        }
    }
    _pS(cid, 'evts', events); return events;
}

/* =================================================================
   ★ 论坛 — 根据人设生成角色视角帖子
   ================================================================= */
function _peekForumP(cid) {
    var synced = [];
    var role = (typeof findRole === 'function') ? findRole(cid) : null; if (!role) return [];
    var rn = role.nickname || role.name;
    try { var st = JSON.parse(localStorage.getItem('ds_forum_posts') || '[]'); for (var j = 0; j < st.length; j++) { if (st[j].authorId === cid || st[j].author === rn || st[j].author === role.name) synced.push(st[j]); } } catch (e) { }
    var gk = _pk(cid, 'gp8');
    var gen; try { gen = JSON.parse(localStorage.getItem(gk)); } catch (e) { gen = null; }
    if (!gen) { gen = _genPosts(cid); try { localStorage.setItem(gk, JSON.stringify(gen)); } catch (e) { } }
    return synced.concat(gen);
}

function _genPosts(cid) {
    var role = (typeof findRole === 'function') ? findRole(cid) : null; if (!role) return [];
    var lang = _lang(role);
    var ja = (lang === 'ja'), ko = (lang === 'ko'), en = (lang === 'en');
    var tone = _getTone(role.detail);
    var traits = _getTraits(role.detail);
    var rn = role.nickname || role.name;
    var detail = role.detail || '';
    var now = Date.now();
    var posts = [];
    var people = _extractPeople(role);

    function T(zh, jaT, koT, enT) {
        if (ja) return jaT + '\n（' + zh + '）';
        if (ko) return koT + '\n（' + zh + '）';
        if (en) return enT + '\n（' + zh + '）';
        return zh;
    }

    // 1. 兴趣帖子
    var traitPosts = {
        '料理': { zh: '试了个新菜谱，还行吧', ja: '新しいレシピに挑戦した。まあまあの出来', ko: '새 레시피 도전했다. 그럭저럭', en: 'Tried a new recipe. Turned out okay' },
        '游戏': { zh: '熬夜打游戏了，不后悔', ja: '夜更かししてゲームしてた。後悔はしてない', ko: '밤새 게임했다. 후회 없음', en: 'Stayed up gaming all night. No regrets' },
        '音乐': { zh: '这首歌单曲循环一整天', ja: 'この曲ずっとリピートしてる', ko: '이 노래 계속 반복 재생 중', en: 'This song on repeat all day' },
        '阅读': { zh: '深夜看书最安静', ja: '深夜の読書が一番落ち着く', ko: '밤늦게 읽는 책이 제일 편하다', en: 'Late night reading is the most peaceful' },
        '动漫': { zh: '看完最终话了，缓不过来', ja: '最終話見た。しばらく何も手につかない', ko: '마지막 화 봤다. 당분간 아무것도 못 하겠다', en: 'Watched the finale. Can\'t do anything for a while' },
        '运动': { zh: '今天跑步破了自己的记录', ja: '今日のランニング、自己ベスト更新', ko: '오늘 러닝 자기 최고 기록 갱신', en: 'Beat my personal best on today\'s run' },
        '猫': { zh: '回来的时候猫在门口等着。…才没有开心', ja: '帰ったら猫が玄関で待ってた。…別に嬉しくない', ko: '집에 오니까 고양이가 현관에서 기다리고 있었다', en: 'Cat was waiting at the door. ...Not that I\'m happy' },
        '烟': { zh: '天台抽了一根，天挺好看的', ja: '屋上で一本。空が綺麗だった', ko: '옥상에서 한 대. 하늘이 예뻤다', en: 'One on the rooftop. Sky was nice' },
        '咖啡': { zh: '只喝黑咖啡的人', ja: 'ブラックコーヒーしか飲めない人間です', ko: '블랙커피만 마실 수 있는 사람입니다', en: 'Black coffee only kind of person' },
        '酒': { zh: '一个人喝的酒最好喝', ja: '一人で飲む酒が一番うまい', ko: '혼자 마시는 술이 제일 맛있다', en: 'Drinking alone hits different' }
    };
    for (var t = 0; t < traits.length && posts.length < 3; t++) {
        var tp = traitPosts[traits[t]];
        if (tp) {
            posts.push({ author: rn, authorId: cid, text: T(tp.zh, tp.ja, tp.ko, tp.en), ts: now - (posts.length + 1) * 172800000, timeStr: new Date(now - (posts.length + 1) * 172800000).toLocaleDateString('zh-CN') });
        }
    }

    // 2. 性格帖子
    var tonePosts = {
        tsundere: [
            { zh: '才不是因为无聊才发的', ja: '別に暇だから投稿してるわけじゃない', ko: '딱히 심심해서 올리는 거 아님', en: 'Not posting because I\'m bored or anything' },
            { zh: '今天也很平静。…闭嘴，没问你', ja: '今日も平和だった。…うるさい、感想聞いてない', ko: '오늘도 평화로웠다. …시끄러워, 감상 안 물어봤어', en: 'Today was peaceful. ...Shut up, didn\'t ask' }
        ],
        cold: [
            { zh: '……', ja: '……', ko: '……', en: '...' },
            { zh: '今天也没什么事', ja: '今日も特に何もなかった', ko: '오늘도 딱히 아무것도 없었다', en: 'Nothing happened today either' }
        ],
        sharp: [
            { zh: '今天周围也很吵', ja: '今日も周りがうるさかった', ko: '오늘도 주변이 시끄러웠다', en: 'People were annoying again today' },
            { zh: '多管闲事的人太多了', ja: '余計なお世話が多すぎる', ko: '쓸데없는 참견이 너무 많다', en: 'Too many busybodies' }
        ],
        gentle: [
            { zh: '今天天气真好', ja: '今日はいい天気だった', ko: '오늘 날씨 좋았다', en: 'Nice weather today' },
            { zh: '回来的路上看到好看的花', ja: '帰り道に綺麗な花を見つけた', ko: '돌아오는 길에 예쁜 꽃을 발견했다', en: 'Found pretty flowers on the way home' }
        ],
        shy: [
            { zh: '…鼓起勇气发一条', ja: '…勇気を出して投稿してみる', ko: '…용기 내서 올려본다', en: '...Gathering courage to post' },
            { zh: '今天好像稍微努力了一下', ja: '今日はちょっとだけ頑張れた気がする', ko: '오늘은 조금은 잘한 것 같다', en: 'I think I did okay today' }
        ],
        yandere: [
            { zh: '今天也只想着那个人', ja: '今日もあの人のことだけ考えてた', ko: '오늘도 그 사람만 생각했다', en: 'Only thought about that person again today' }
        ],
        cheerful: [
            { zh: '今天也元气满满！大家加油！', ja: '今日も元気いっぱい！みんなもファイト！', ko: '오늘도 힘차게! 다들 화이팅!', en: 'Full of energy today! Everyone do your best!' }
        ],
        neutral: [
            { zh: '还行的一天', ja: 'まあまあの一日だった', ko: '그럭저럭인 하루였다', en: 'It was an okay day' }
        ]
    };
    var toneList = tonePosts[tone] || tonePosts.neutral;
    for (var tp2 = 0; tp2 < toneList.length && posts.length < 5; tp2++) {
        var item = toneList[tp2];
        posts.push({ author: rn, authorId: cid, text: T(item.zh, item.ja, item.ko, item.en), ts: now - (posts.length + 1) * 86400000, timeStr: new Date(now - (posts.length + 1) * 86400000).toLocaleDateString('zh-CN') });
    }

    // 3. 关系相关帖子
    for (var p = 0; p < people.length && posts.length < 6; p++) {
        var pe = people[p];
        if (/奶奶|爷爷/.test(pe.rel)) {
            posts.push({ author: rn, authorId: cid, text: T('周末回去，得列个采购清单', '週末は実家に帰る。買い物リスト作らないと', '주말에 본가에 간다. 장보기 목록 만들어야지', 'Going home this weekend. Need to make a shopping list'), ts: now - (posts.length + 1) * 86400000 * 2, timeStr: new Date(now - (posts.length + 1) * 86400000 * 2).toLocaleDateString('zh-CN') });
        }
    }

    // 4. 季节帖子
    var month = (new Date()).getMonth() + 1;
    var sp;
    if (month >= 3 && month <= 5) sp = { zh: '樱花已经开始落了', ja: '桜がもう散り始めてる', ko: '벚꽃이 벌써 지기 시작했다', en: 'Cherry blossoms are already falling' };
    else if (month >= 6 && month <= 8) sp = { zh: '太热了，不想出门', ja: '暑すぎる。外に出たくない', ko: '너무 덥다. 밖에 나가기 싫다', en: 'Too hot. Don\'t want to go outside' };
    else if (month >= 9 && month <= 11) sp = { zh: '喜欢秋天的空气', ja: '秋の空気が好きだ', ko: '가을 공기가 좋다', en: 'Love the autumn air' };
    else sp = { zh: '冷，不想出被窝', ja: '寒い。布団から出たくない', ko: '춥다. 이불에서 나오기 싫다', en: 'Cold. Don\'t want to leave my blanket' };
    if (posts.length < 7) {
        posts.push({ author: rn, authorId: cid, text: T(sp.zh, sp.ja, sp.ko, sp.en), ts: now - posts.length * 86400000 * 3, timeStr: new Date(now - posts.length * 86400000 * 3).toLocaleDateString('zh-CN') });
    }

    posts.sort(function (a, b) { return b.ts - a.ts; });
    return posts;
}

function _followF(cid) {
    var c = _pL(cid, 'ff8'); if (c) return c;
    var role = (typeof findRole === 'function') ? findRole(cid) : null; if (!role) return [];
    var lang = _lang(role);
    var ja = (lang === 'ja'), ko = (lang === 'ko'), en = (lang === 'en');
    var traits = _getTraits(role.detail);
    var forums = [];
    var fm = {
        '料理': '🍳 ' + (ja ? '料理' : ko ? '요리' : en ? 'Cooking' : '美食'),
        '游戏': '🎮 ' + (ja ? 'ゲーム' : ko ? '게임' : en ? 'Gaming' : '游戏'),
        '音乐': '🎵 ' + (ja ? '音楽' : ko ? '음악' : en ? 'Music' : '音乐'),
        '动漫': '📺 ' + (ja ? 'アニメ' : ko ? '애니' : en ? 'Anime' : '动漫'),
        '猫': '🐱 ' + (ja ? '猫' : ko ? '고양이' : en ? 'Cats' : '猫'),
        '阅读': '📚 ' + (ja ? '読書' : ko ? '독서' : en ? 'Reading' : '阅读')
    };
    for (var t = 0; t < traits.length; t++) { if (fm[traits[t]]) forums.push({ name: fm[traits[t]] }); }
    if (!forums.length) forums.push({ name: ja ? '💬 雑談' : ko ? '💬 잡담' : en ? '💬 Chat' : '💬 闲聊' });
    _pS(cid, 'ff8', forums); return forums;
}

/* =================================================================
   刷新
   ================================================================= */
function peekRefreshChat() { if (!_pkCur) return; localStorage.removeItem(_pk(_pkCur, 'cts8')); var keys = Object.keys(localStorage); for (var i = 0; i < keys.length; i++) { if (keys[i].indexOf(_pk(_pkCur, 'gc8_')) === 0) localStorage.removeItem(keys[i]); } peekChat(); }
function peekRefreshForum() { if (!_pkCur) return; localStorage.removeItem(_pk(_pkCur, 'gp8')); localStorage.removeItem(_pk(_pkCur, 'ff8')); peekForum(); }
function peekRefreshMemo() { if (!_pkCur) return; localStorage.removeItem(_pk(_pkCur, 'memos')); peekMemo(); }
function peekRefreshCal() { if (!_pkCur) return; localStorage.removeItem(_pk(_pkCur, 'evts')); peekCal(); }

/* =================================================================
   UI
   ================================================================= */
function openPeekApp() {
    var el = document.getElementById('peekOverlay'); if (!el) return;
    _pkCur = null;
    var h = '<div class="peek-select-header"><div class="peek-select-title">偷偷看</div>';
    h += '<div class="peek-close-btn" onclick="closePeekApp()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
    h += '<div style="padding:0 20px 12px;font-size:11px;color:rgba(50,40,55,0.3)">偷偷看TA的手机~</div><div class="peek-select-grid">';
    if (typeof _chatRoles !== 'undefined') { for (var i = 0; i < _chatRoles.length; i++) { var r = _chatRoles[i]; h += '<div class="peek-char-card" onclick="peekEnter(\'' + r.id + '\')"><div class="peek-char-avatar">'; h += r.avatar ? '<img src="' + r.avatar + '">' : _SU; h += '</div><div class="peek-char-name">' + _e(r.nickname || r.name) + '</div></div>'; } }
    h += '</div>'; el.innerHTML = h; el.classList.add('show');
}
function closePeekApp() { var el = document.getElementById('peekOverlay'); if (el) { el.classList.remove('show'); setTimeout(function () { el.innerHTML = ''; }, 300); } }

function peekEnter(cid) {
    _pkCur = cid; var el = document.getElementById('peekOverlay'); if (!el) return;
    var role = (typeof findRole === 'function') ? findRole(cid) : null; if (!role) return;
    var dn = _e(role.nickname || role.name); var now = new Date();
    var ts = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    var h = '<div class="peek-phone-wrap show" id="pkW">';
    h += '<div class="peek-status-bar"><div class="peek-status-time">' + ts + '</div><div class="peek-status-name">' + dn + ' 的手机</div><div class="peek-status-icons"><svg viewBox="0 0 24 24"><path d="M5 12.55a10.94 10.94 0 0 1 14 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg><svg viewBox="0 0 24 24"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg></div></div>';
    h += '<div class="peek-home"><div class="peek-home-grid"><div class="peek-home-left">';
    var lm = _lastMsg(cid, '_user');
    h += '<div class="peek-app-tile peek-tile-chat" onclick="peekChat()"><div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="peek-app-tile-name">消息</div><div class="peek-app-tile-sub">' + (lm ? _e(lm).substring(0, 18) : '查看聊天') + '</div></div>';
    h += '<div class="peek-app-tile peek-tile-forum" onclick="peekForum()"><div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div><div class="peek-app-tile-name">论坛</div><div class="peek-app-tile-sub">看看TA发了什么</div></div>';
    var mm = _autoMemos(cid);
    h += '<div class="peek-app-tile peek-tile-memo" onclick="peekMemo()"><div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div class="peek-app-tile-name">备忘录</div><div class="peek-app-tile-sub">' + (mm.length ? _e(mm[0].title).substring(0, 15) : '暂无') + '</div></div>';
    h += '<div class="peek-app-tile peek-tile-calendar" onclick="peekCal()"><div class="peek-app-tile-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="peek-app-tile-name">日历</div><div class="peek-app-tile-sub">' + now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + '</div></div>';
    h += '</div><div class="peek-home-right">';
    for (var w = 0; w < 2; w++) { var wi = localStorage.getItem(_pk(cid, 'w' + w)) || ''; h += '<div class="peek-widget-square" onclick="peekWid(' + w + ')">'; h += wi ? '<img src="' + wi + '">' : '<div class="peek-widget-square-hint"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>点击换图</div>'; h += '</div>'; }
    h += '</div></div></div>';
    h += '<div class="peek-dock"><div class="peek-dock-btn" onclick="peekBk()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg><span>返回</span></div><div class="peek-dock-btn active"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>主屏</span></div></div></div>';
    el.innerHTML = h;
}
function peekBk() { _pkCur = null; openPeekApp(); }
function peekWid(i) { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = function () { if (!inp.files[0]) return; var r = new FileReader(); r.onload = function (ev) { try { localStorage.setItem(_pk(_pkCur, 'w' + i), ev.target.result); } catch (e) { } peekEnter(_pkCur); }; r.readAsDataURL(inp.files[0]); }; inp.click(); }
function _cls() { ['pkCL', 'pkCV', 'pkFP', 'pkMP', 'pkME', 'pkCA'].forEach(function (id) { var p = document.getElementById(id); if (p) p.remove(); }); }

/* === Chat === */
function peekChat() {
    _pkTgt = null; var w = document.getElementById('pkW'); if (!w) return;
    var role = (typeof findRole === 'function') ? findRole(_pkCur) : null; if (!role) return;
    var dn = _e(role.nickname || role.name); var cts = _contacts(_pkCur);
    var un = ''; if (typeof getActivePersona === 'function') { var pa = getActivePersona(_pkCur); if (pa && pa.name) un = pa.name; } if (!un) un = '主人';
    var hasU = (role.msgs && role.msgs.length) || (_pL(_pkCur, 'px__user') || []).length;
    var h = '<div class="peek-subpage show" id="pkCL"><div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="_cls()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的消息</div>';
    h += '<div class="peek-refresh-btn" onclick="peekRefreshChat()">' + _rfSvg + '刷新</div>';
    h += '</div><div class="peek-sub-body">';
    if (hasU) { var ulm = _lastMsg(_pkCur, '_user'); h += '<div class="peek-chat-list-item" onclick="peekConv(\'_user\')"><div class="peek-chat-list-av">' + _SU + '</div><div class="peek-chat-list-info"><div class="peek-chat-list-name">' + _e(un) + ' <span style="font-size:9px;color:rgba(50,40,55,0.25)">💕</span></div><div class="peek-chat-list-msg">' + _e(ulm).substring(0, 25) + '</div></div></div>'; }
    for (var c = 0; c < cts.length; c++) { var ct = cts[c]; var lm = _lastMsg(_pkCur, ct.id); h += '<div class="peek-chat-list-item" onclick="peekConv(\'' + ct.id + '\')"><div class="peek-chat-list-av">' + _SU + '</div><div class="peek-chat-list-info"><div class="peek-chat-list-name">' + _e(ct.name) + ' <span style="font-size:9px;color:rgba(50,40,55,0.25)">' + _e(ct.rel) + '</span></div><div class="peek-chat-list-msg">' + _e(lm).substring(0, 25) + '</div></div></div>'; }
    if (!cts.length && !hasU) { h += '<div style="text-align:center;color:rgba(50,40,55,0.25);font-size:12px;padding:40px 0">暂无聊天<br><span style="font-size:10px">在角色详细信息中添加：<br>关系（名字）<br>关系类型：XXX</span></div>'; }
    h += '</div></div>';
    var old = document.getElementById('pkCL'); if (old) old.remove();
    w.insertAdjacentHTML('beforeend', h);
}

function peekConv(tid) {
    _pkTgt = tid; var w = document.getElementById('pkW'); if (!w) return;
    var role = (typeof findRole === 'function') ? findRole(_pkCur) : null; if (!role) return;
    var roleAv = role.avatar || ''; var rn = _e(role.nickname || role.name);
    var cts = _contacts(_pkCur); var tName = '';
    if (tid === '_user') { var un = '主人'; if (typeof getActivePersona === 'function') { var pa = getActivePersona(_pkCur); if (pa && pa.name) un = pa.name; } tName = un; }
    else { for (var c = 0; c < cts.length; c++) { if (cts[c].id === tid) { tName = cts[c].name; break; } } }
    var msgs = _msgs(_pkCur, tid);
    var h = '<div class="peek-subpage show" id="pkCV"><div class="peek-conv-header">';
    h += '<div class="peek-sub-back" onclick="peekClCV()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + _e(tName) + '</div></div>';
    h += '<div class="peek-conv-body" id="pkCVB">';
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i], self = m.from === 'self';
        h += '<div class="peek-msg-row ' + (self ? 'self' : '') + '">';
        h += '<div class="peek-msg-av">';
        if (self && roleAv) h += '<img src="' + roleAv + '">';
        h += '</div><div class="peek-msg-content"><div class="peek-msg-bubble">' + _e(m.text).replace(/\n/g, '<br>') + '</div>';
        if (m.proxy) h += '<div class="peek-msg-proxy-tag">✦ 你帮TA说的</div>';
        h += '</div></div>';
    }
    if (!msgs.length) h += '<div class="peek-msg-time-divider">暂无消息</div>';
    h += '</div>';
    h += '<div class="peek-conv-input-row"><input type="text" class="peek-conv-input" id="pkCI" placeholder="帮 ' + rn + ' 回复…" onkeydown="if(event.key===\'Enter\')peekSend()">';
    h += '<div class="peek-conv-send-btn" onclick="peekSend()"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div></div></div>';
    var old = document.getElementById('pkCV'); if (old) old.remove();
    w.insertAdjacentHTML('beforeend', h);
    var b = document.getElementById('pkCVB'); if (b) b.scrollTop = b.scrollHeight;
}

function peekSend() {
    var inp = document.getElementById('pkCI'); if (!inp) return;
    var t = inp.value.trim(); if (!t) return;
    var msg = { from: 'self', text: t, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), proxy: true, ts: Date.now() };
    var px = _pL(_pkCur, 'px_' + _pkTgt) || [];
    px.push(msg); _pS(_pkCur, 'px_' + _pkTgt, px);
    if (_pkTgt === '_user') {
        var role = (typeof findRole === 'function') ? findRole(_pkCur) : null;
        if (role) {
            if (!role.msgs) role.msgs = [];
            role.msgs.push({ from: 'other', text: t, time: msg.time, peekProxy: true });
            role.lastMsg = t; role.lastTime = Date.now(); role.lastTimeStr = msg.time;
            if (typeof saveChatRoles === 'function') saveChatRoles();
        }
    }
    inp.value = ''; peekConv(_pkTgt);
}
function peekClCV() { var p = document.getElementById('pkCV'); if (p) p.remove(); _pkTgt = null; }

/* === Forum === */
function peekForum() {
    _pkFT = 'posts'; var w = document.getElementById('pkW'); if (!w) return;
    var role = (typeof findRole === 'function') ? findRole(_pkCur) : null; if (!role) return;
    var dn = _e(role.nickname || role.name);
    var h = '<div class="peek-subpage show" id="pkFP"><div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="_cls()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的论坛</div>';
    h += '<div class="peek-refresh-btn" onclick="peekRefreshForum()">' + _rfSvg + '刷新</div>';
    h += '</div><div class="peek-forum-tabs">';
    h += '<div class="peek-forum-tab active" onclick="pkFT(\'posts\')">帖子</div>';
    h += '<div class="peek-forum-tab" onclick="pkFT(\'follow\')">关注</div>';
    h += '<div class="peek-forum-tab" onclick="pkFT(\'profile\')">个人</div>';
    h += '</div><div class="peek-forum-body" id="pkFB">' + _rFT() + '</div></div>';
    var old = document.getElementById('pkFP'); if (old) old.remove();
    w.insertAdjacentHTML('beforeend', h);
}
function pkFT(tab) { _pkFT = tab; var b = document.getElementById('pkFB'); if (b) b.innerHTML = _rFT(); var tabs = document.querySelectorAll('.peek-forum-tab'); var map = { posts: '帖子', follow: '关注', profile: '个人' }; for (var i = 0; i < tabs.length; i++)tabs[i].classList.toggle('active', tabs[i].textContent === map[tab]); }
function _rFT() {
    var role = (typeof findRole === 'function') ? findRole(_pkCur) : null; if (!role) return '';
    var dn = _e(role.nickname || role.name); var h = '';
    if (_pkFT === 'posts') {
        var posts = _peekForumP(_pkCur);
        if (!posts.length) h += '<div style="text-align:center;color:rgba(50,40,55,0.25);font-size:12px;padding:40px 0">暂无帖子</div>';
        for (var i = 0; i < posts.length; i++) { var p = posts[i]; h += '<div class="peek-forum-post"><div class="peek-forum-post-head"><div class="peek-forum-post-av">' + (role.avatar ? '<img src="' + role.avatar + '">' : '') + '</div><div class="peek-forum-post-name">' + dn + '</div><div class="peek-forum-post-time">' + (p.timeStr || '') + '</div></div><div class="peek-forum-post-text">' + _e(p.text || p.content || '').replace(/\n/g, '<br>') + '</div>'; if (p.image || p.img) h += '<img class="peek-forum-post-img" src="' + (p.image || p.img) + '">'; h += '</div>'; }
    } else if (_pkFT === 'follow') {
        var forums = _followF(_pkCur); for (var f = 0; f < forums.length; f++)h += '<div class="peek-forum-post"><div style="font-size:13px;font-weight:600;color:rgba(50,40,55,0.75)">' + _e(forums[f].name) + '</div></div>';
    } else if (_pkFT === 'profile') {
        var posts2 = _peekForumP(_pkCur), forums2 = _followF(_pkCur);
        h += '<div style="text-align:center;padding:20px 0"><div style="width:56px;height:56px;border-radius:50%;overflow:hidden;margin:0 auto 8px;background:rgba(0,0,0,0.04)">'; if (role.avatar) h += '<img src="' + role.avatar + '" style="width:100%;height:100%;object-fit:cover">'; h += '</div><div style="font-size:15px;font-weight:700;color:rgba(50,40,55,0.85)">' + dn + '</div></div>';
        h += '<div style="display:flex;justify-content:center;gap:30px;padding:10px 0;border-top:1px solid rgba(0,0,0,0.04);margin-bottom:12px"><div style="text-align:center"><div style="font-size:16px;font-weight:700">' + posts2.length + '</div><div style="font-size:9px;color:rgba(50,40,55,0.3)">帖子</div></div><div style="text-align:center"><div style="font-size:16px;font-weight:700">' + forums2.length + '</div><div style="font-size:9px;color:rgba(50,40,55,0.3)">关注</div></div></div>';
        for (var k = 0; k < Math.min(5, posts2.length); k++)h += '<div class="peek-forum-post"><div class="peek-forum-post-text">' + _e(posts2[k].text || '').replace(/\n/g, '<br>') + '</div><div style="font-size:9px;color:rgba(50,40,55,0.2);margin-top:4px">' + (posts2[k].timeStr || '') + '</div></div>';
    }
    return h;
}

/* === Memo === */
function peekMemo() {
    _pkMI = -1; var w = document.getElementById('pkW'); if (!w) return;
    var role = (typeof findRole === 'function') ? findRole(_pkCur) : null; if (!role) return;
    var dn = _e(role.nickname || role.name); var mm = _autoMemos(_pkCur);
    var h = '<div class="peek-subpage show" id="pkMP"><div class="peek-sub-header">';
    h += '<div class="peek-sub-back" onclick="_cls()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="peek-sub-title">' + dn + ' 的备忘录</div>';
    h += '<div class="peek-refresh-btn" onclick="peekRefreshMemo()">' + _rfSvg + '刷新</div>';
    h += '<div style="margin-left:4px;padding:3px 10px;border-radius:12px;background:rgba(255,200,100,0.2);color:#c49530;font-size:10px;font-weight:600;cursor:pointer" onclick="peekNM()">+新建</div>';
    h += '</div><div class="peek-sub-body">';
    for (var i = 0; i < mm.length; i++) { var m = mm[i]; h += '<div class="peek-memo-item" onclick="peekEM(' + i + ')"><div class="peek-memo-title">' + _e(m.title || ''); if (m.pin) h += '<span class="peek-memo-pin">📌</span>'; h += '</div><div class="peek-memo-text">' + _e(m.text || '').replace(/\n/g, '<br>') + '</div><div class="peek-memo-date">' + new Date(m.ts || 0).toLocaleDateString('zh-CN') + '</div></div>'; }
    if (!mm.length) h += '<div style="text-align:center;color:rgba(50,40,55,0.25);font-size:12px;padding:40px 0">暂无</div>';
    h += '</div></div>';
    var old = document.getElementById('pkMP'); if (old) old.remove(); w.insertAdjacentHTML('beforeend', h);
}
function peekNM() { _pkMI = -1; _rME('', ''); }
function peekEM(i) { _pkMI = i; var mm = _pL(_pkCur, 'memos') || []; var m = mm[i] || {}; _rME(m.title || '', m.text || ''); }
function _rME(title, text) { var w = document.getElementById('pkW'); if (!w) return; var h = '<div class="peek-memo-editor show" id="pkME"><div class="peek-sub-header"><div class="peek-sub-back" onclick="peekCME()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="peek-sub-title">编辑</div><div style="display:flex;gap:8px;margin-left:auto">'; if (_pkMI >= 0) h += '<div style="padding:3px 10px;border-radius:12px;background:rgba(220,60,60,0.1);color:#e05050;font-size:10px;cursor:pointer" onclick="peekDM()">删除</div>'; h += '<div style="padding:3px 10px;border-radius:12px;background:rgba(255,200,100,0.2);color:#c49530;font-size:10px;font-weight:600;cursor:pointer" onclick="peekSM()">保存</div></div></div><div style="flex:1;padding:0 16px 24px;display:flex;flex-direction:column"><input type="text" class="peek-memo-edit-title" id="pkMT" placeholder="标题" value="' + _e(title) + '"><textarea class="peek-memo-edit-body" id="pkMX" placeholder="…">' + _e(text) + '</textarea></div></div>'; var old = document.getElementById('pkME'); if (old) old.remove(); w.insertAdjacentHTML('beforeend', h); }
function peekSM() { var ti = document.getElementById('pkMT'), te = document.getElementById('pkMX'); var title = ti ? ti.value.trim() : '', text = te ? te.value.trim() : ''; if (!title && !text) return; var mm = _pL(_pkCur, 'memos') || []; if (_pkMI >= 0 && _pkMI < mm.length) { mm[_pkMI].title = title; mm[_pkMI].text = text; mm[_pkMI].ts = Date.now(); } else mm.unshift({ title: title, text: text, pin: false, ts: Date.now() }); _pS(_pkCur, 'memos', mm); peekCME(); peekMemo(); }
function peekDM() { if (!confirm('删除？')) return; var mm = _pL(_pkCur, 'memos') || []; if (_pkMI >= 0) { mm.splice(_pkMI, 1); _pS(_pkCur, 'memos', mm); } peekCME(); peekMemo(); }
function peekCME() { var p = document.getElementById('pkME'); if (p) p.remove(); }

/* === Calendar === */
function peekCal() {
    var now = new Date(); _pkCY = now.getFullYear(); _pkCM = now.getMonth(); _pkCS = '';
    var w = document.getElementById('pkW'); if (!w) return;
    var role = (typeof findRole === 'function') ? findRole(_pkCur) : null; if (!role) return;
    var dn = _e(role.nickname || role.name); var ev = _autoEvents(_pkCur);
    var h = '<div class="peek-subpage show" id="pkCA"><div class="peek-sub-header"><div class="peek-sub-back" onclick="_cls()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="peek-sub-title">' + dn + ' 的日历</div><div class="peek-refresh-btn" onclick="peekRefreshCal()">' + _rfSvg + '刷新</div></div><div class="peek-sub-body" id="pkCB">' + _rCI(ev) + '</div></div>';
    var old = document.getElementById('pkCA'); if (old) old.remove(); w.insertAdjacentHTML('beforeend', h);
}
function _rCI(ev) { var h = '', ms = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], ws = ['日', '一', '二', '三', '四', '五', '六']; h += '<div class="peek-cal-nav"><div class="peek-cal-nav-btn" onclick="pkCP()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="peek-cal-month-title">' + _pkCY + '年 ' + ms[_pkCM] + '</div><div class="peek-cal-nav-btn" onclick="pkCN()"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></div></div>'; h += '<div class="peek-cal-weekdays">'; for (var w = 0; w < 7; w++)h += '<div>' + ws[w] + '</div>'; h += '</div>'; var fd = new Date(_pkCY, _pkCM, 1).getDay(), dim = new Date(_pkCY, _pkCM + 1, 0).getDate(), pd = new Date(_pkCY, _pkCM, 0).getDate(); var today = new Date(), ts = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2); h += '<div class="peek-cal-days">'; for (var p = fd - 1; p >= 0; p--)h += '<div class="peek-cal-day other-month">' + (pd - p) + '</div>'; for (var d = 1; d <= dim; d++) { var dk = _pkCY + '-' + ('0' + (_pkCM + 1)).slice(-2) + '-' + ('0' + d).slice(-2); var cl = 'peek-cal-day'; if (dk === ts) cl += ' today'; if (ev[dk] && ev[dk].length) cl += ' has-event'; if (dk === _pkCS) cl += ' selected'; h += '<div class="' + cl + '" onclick="pkSD(\'' + dk + '\')">' + d + '</div>'; } var tot = fd + dim, rem = (7 - tot % 7) % 7; for (var n = 1; n <= rem; n++)h += '<div class="peek-cal-day other-month">' + n + '</div>'; h += '</div>'; if (_pkCS) { var de = ev[_pkCS] || []; h += '<div class="peek-cal-events"><div style="font-size:12px;font-weight:600;color:rgba(50,40,55,0.7);margin-bottom:8px">📌 ' + _pkCS + '</div>'; if (!de.length) h += '<div style="font-size:11px;color:rgba(50,40,55,0.25);padding:10px 0">暂无</div>'; for (var e = 0; e < de.length; e++)h += '<div class="peek-cal-event-item"><div class="peek-cal-event-dot"></div><div class="peek-cal-event-text">' + _e(de[e]).replace(/\n/g, '<br>') + '</div><div class="peek-cal-event-del" onclick="pkDE(\'' + _pkCS + '\',' + e + ')">✕</div></div>'; h += '<div class="peek-cal-add-wrap"><input type="text" class="peek-cal-add-input" id="pkCEI" placeholder="添加事件…" onkeydown="if(event.key===\'Enter\')pkAE()"><div class="peek-cal-add-btn" onclick="pkAE()">添加</div></div></div>'; } return h; }
function pkSD(dk) { _pkCS = dk; var ev = _pL(_pkCur, 'evts') || {}; var b = document.getElementById('pkCB'); if (b) b.innerHTML = _rCI(ev); }
function pkCP() { _pkCM--; if (_pkCM < 0) { _pkCM = 11; _pkCY--; } var ev = _pL(_pkCur, 'evts') || {}; var b = document.getElementById('pkCB'); if (b) b.innerHTML = _rCI(ev); }
function pkCN() { _pkCM++; if (_pkCM > 11) { _pkCM = 0; _pkCY++; } var ev = _pL(_pkCur, 'evts') || {}; var b = document.getElementById('pkCB'); if (b) b.innerHTML = _rCI(ev); }
function pkAE() { var inp = document.getElementById('pkCEI'); if (!inp || !inp.value.trim() || !_pkCS) return; var ev = _pL(_pkCur, 'evts') || {}; if (!ev[_pkCS]) ev[_pkCS] = []; ev[_pkCS].push(inp.value.trim()); _pS(_pkCur, 'evts', ev); inp.value = ''; var b = document.getElementById('pkCB'); if (b) b.innerHTML = _rCI(ev); }
function pkDE(dk, i) { var ev = _pL(_pkCur, 'evts') || {}; if (ev[dk] && i >= 0) { ev[dk].splice(i, 1); if (!ev[dk].length) delete ev[dk]; _pS(_pkCur, 'evts', ev); } var b = document.getElementById('pkCB'); if (b) b.innerHTML = _rCI(ev); }
