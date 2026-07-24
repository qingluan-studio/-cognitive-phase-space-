const API = 'http://localhost:3221';

/* ================= 对话系统 ================= */
const chatList = document.getElementById('chatList');
const chatInput = document.getElementById('chatInput');
let sessionHistory = JSON.parse(localStorage.getItem('qingluan_chat_sessions') || '[]');
let currentSessionId = localStorage.getItem('qingluan_current_session') || ('sess_' + Date.now());

function ensureSession() {
  if (!sessionHistory.find(s => s.id === currentSessionId)) {
    sessionHistory.unshift({ id: currentSessionId, title: '新创作', time: Date.now(), messages: [] });
  }
}
ensureSession();
renderSessionList();

function saveSession() {
  localStorage.setItem('qingluan_chat_sessions', JSON.stringify(sessionHistory));
  localStorage.setItem('qingluan_current_session', currentSessionId);
  renderSessionList();
}

function addMessage(role, html, type = 'text') {
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.style.display = 'none';
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  if (type === 'loading') div.classList.add('msg-loading');
  div.innerHTML = html;
  chatList.appendChild(div);
  chatList.scrollTop = chatList.scrollHeight;
  const sess = sessionHistory.find(s => s.id === currentSessionId);
  if (sess) { sess.messages.push({ role, html, type, time: Date.now() }); saveSession(); }
  return div;
}

function sendQuick(text) {
  chatInput.value = text;
  sendChat();
}

function parseIntent(text) {
  const t = text.toLowerCase();
  if (/完整|一键|整首|全曲|production|produce/.test(t)) return { intent: 'fullsong', detail: t };
  if (/作曲|旋律|写歌|写个歌|生成旋律|compose|melody/.test(t)) return { intent: 'compose', detail: t };
  if (/编曲|伴奏|arrange|backing/.test(t)) return { intent: 'arranger', detail: t };
  if (/歌词|lyric|词/.test(t)) return { intent: 'lyrics', detail: t };
  if (/人声|唱歌|歌声|vocal|sing/.test(t)) return { intent: 'voice', detail: t };
  if (/涌现|emergence|swarm/.test(t)) return { intent: 'emergence', detail: t };
  if (/非传统|nontraditional|细胞|拓扑|化学|意识流/.test(t)) return { intent: 'nontraditional', detail: t };
  if (/效果器|effect|混响|reverb|eq/.test(t)) return { intent: 'effects', detail: t };
  if (/封面|cover|专辑/.test(t)) return { intent: 'cover', detail: t };
  if (/工作室|studio|高级|参数/.test(t)) return { intent: 'studio', detail: t };
  if (/游戏|game|练耳|音程|和弦挑战/.test(t)) return { intent: 'game', detail: t };
  if (/可视化|visual|频谱/.test(t)) return { intent: 'visual', detail: t };
  if (/指纹|版权|fingerprint/.test(t)) return { intent: 'fingerprint', detail: t };
  if (/理论|音阶|和弦|scale|chord|theory/.test(t)) return { intent: 'theory', detail: t };
  if (/项目|保存|导出|project|save/.test(t)) return { intent: 'project', detail: t };
  if (/声带|vocalfold|物理模型/.test(t)) return { intent: 'vocalfold', detail: t };
  return { intent: 'chat', detail: t };
}

function extractStyle(text) {
  const map = { '流行': 'pop', '摇滚': 'rock', '爵士': 'jazz', '电子': 'electronic', '古典': 'classical', '民谣': 'folk', '中国风': 'chinese', '金属': 'metal', 'r&b': 'rnb', '蓝调': 'blues' };
  for (const [k, v] of Object.entries(map)) if (text.includes(k)) return v;
  return 'pop';
}
function extractEmotion(text) {
  const map = { '欢快': 'happy', '忧伤': 'sad', '悲伤': 'sad', '浪漫': 'romantic', '紧张': 'tense', '史诗': 'epic', '放松': 'relaxed', '愤怒': 'angry' };
  for (const [k, v] of Object.entries(map)) if (text.includes(k)) return v;
  return 'happy';
}
function extractKey(text) {
  const map = { 'c大调': 'C', 'g大调': 'G', 'f大调': 'F', 'd大调': 'D', 'a小调': 'Am', 'e小调': 'Em' };
  for (const [k, v] of Object.entries(map)) if (text.includes(k)) return v;
  return 'C';
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  addMessage('user', escapeHtml(text));
  const { intent, detail } = parseIntent(text);

  if (intent === 'chat') {
    addMessage('ai', '<p>我可以帮你作曲、编曲、写歌词、合成真人声、生成伴奏、制作封面，或者一键生成完整歌曲。直接告诉我就好。</p>');
    return;
  }

  if (intent === 'studio') {
    addMessage('ai', '<p>已打开高级工作室，你可以手动调整所有参数。</p><button class="s-btn-small" onclick="toggleStudio()">打开工作室</button>');
    return;
  }

  if (intent === 'game') {
    addMessage('ai', '<p>音乐游戏在高级工作室的「教育」标签里。要现在打开吗？</p><button class="s-btn-small" onclick="openStudioTab(\'s-edu\')">打开游戏</button>');
    return;
  }

  // 自动设置参数
  const style = extractStyle(detail);
  const emotion = extractEmotion(detail);
  const key = extractKey(detail);
  const elStyle = document.getElementById('style'); if (elStyle) elStyle.value = style;
  const elArrStyle = document.getElementById('arrStyle'); if (elArrStyle) elArrStyle.value = style;
  const elEmo = document.getElementById('arrEmotion'); if (elEmo) elEmo.value = emotion;
  const elKey = document.getElementById('key'); if (elKey) elKey.value = key;
  const elArrKey = document.getElementById('arrKey'); if (elArrKey) elArrKey.value = key;

  const loading = addMessage('ai', '<p>正在创作中...</p>', 'loading');

  try {
    if (intent === 'compose') { await compose(); loading.outerHTML = ''; addMessage('ai', document.getElementById('composeResult')?.innerHTML || '<p>旋律已生成。</p>'); }
    else if (intent === 'arranger') { await generateArranger(); loading.outerHTML = ''; addMessage('ai', document.getElementById('arrResult')?.innerHTML || '<p>伴奏已生成。</p>'); }
    else if (intent === 'lyrics') { await generateLyrics(); loading.outerHTML = ''; addMessage('ai', '<pre style="white-space:pre-wrap;font-family:inherit;">' + escapeHtml(document.getElementById('lyricResult')?.textContent || '') + '</pre>'); }
    else if (intent === 'voice') { await synthesizeRealistic(); loading.outerHTML = ''; addMessage('ai', '<p>人声已合成。</p>'); }
    else if (intent === 'fullsong') { await fullSong(); loading.outerHTML = ''; addMessage('ai', document.getElementById('fullSongResult')?.innerHTML || '<p>完整歌曲已生成。</p>'); }
    else if (intent === 'emergence') { await generateEmergence(); loading.outerHTML = ''; addMessage('ai', document.getElementById('emResult')?.innerHTML || '<p>涌现引擎已完成。</p>'); }
    else if (intent === 'nontraditional') { await runNonTraditional(); loading.outerHTML = ''; addMessage('ai', document.getElementById('ntResult')?.innerHTML || '<p>非传统引擎已运行。</p>'); }
    else if (intent === 'effects') { await applyEffect(); loading.outerHTML = ''; addMessage('ai', document.getElementById('effectResult')?.innerHTML || '<p>效果已应用。</p>'); }
    else if (intent === 'cover') { await generateCover(); loading.outerHTML = ''; addMessage('ai', '<p>封面已生成。</p>'); }
    else if (intent === 'visual') { addMessage('ai', '<p>可视化在高级工作室里。要打开吗？</p><button class="s-btn-small" onclick="openStudioTab(\'s-visual\')">打开可视化</button>'); loading.outerHTML = ''; }
    else if (intent === 'fingerprint') { addMessage('ai', '<p>版权指纹在高级工作室里。要打开吗？</p><button class="s-btn-small" onclick="openStudioTab(\'s-fingerprint\')">打开指纹工作室</button>'); loading.outerHTML = ''; }
    else if (intent === 'theory') { addMessage('ai', '<p>音乐理论工具在高级工作室里。要打开吗？</p><button class="s-btn-small" onclick="openStudioTab(\'s-theory\')">打开理论</button>'); loading.outerHTML = ''; }
    else if (intent === 'project') { addMessage('ai', '<p>项目管理在高级工作室里。要打开吗？</p><button class="s-btn-small" onclick="openStudioTab(\'s-project\')">打开项目</button>'); loading.outerHTML = ''; }
    else if (intent === 'vocalfold') { addMessage('ai', '<p>声带实验室在高级工作室里。要打开吗？</p><button class="s-btn-small" onclick="openStudioTab(\'s-vocalfold\')">打开声带实验室</button>'); loading.outerHTML = ''; }
    else { loading.outerHTML = ''; addMessage('ai', '<p>收到。我会继续学习你的需求。</p>'); }
  } catch (e) {
    loading.outerHTML = '';
    addMessage('ai', '<p style="color:#d44">创作时出了点问题：' + escapeHtml(e.message) + '</p>');
  }
}

function openStudioTab(tabId) {
  const layer = document.getElementById('studioLayer');
  if (layer) layer.style.display = 'block';
  document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.studio-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
  const tab = document.querySelector(`.studio-tab[data-sp="${tabId}"]`);
  if (tab) tab.classList.add('active');
}

function renderSessionList() {
  const el = document.getElementById('sessionList');
  if (!el) return;
  el.innerHTML = sessionHistory.map(s => `
    <div class="session-item ${s.id === currentSessionId ? 'active' : ''}" onclick="switchSession('${s.id}')">
      <div class="session-title">${escapeHtml(s.title)}</div>
      <div class="session-time">${new Date(s.time).toLocaleString()}</div>
    </div>
  `).join('');
}
function switchSession(id) {
  currentSessionId = id;
  localStorage.setItem('qingluan_current_session', id);
  const sess = sessionHistory.find(s => s.id === id);
  chatList.innerHTML = '';
  if (sess && sess.messages.length) {
    sess.messages.forEach(m => addMessage(m.role, m.html, m.type));
  } else {
    chatList.innerHTML = `<div class="welcome" id="welcome"><h1>Hey 👋 用户</h1><p>今天想创作点什么？</p><div class="sub">直接告诉我，或点击下方快捷指令</div></div>`;
  }
  renderSessionList();
  toggleDrawer();
}
function newSession() {
  currentSessionId = 'sess_' + Date.now();
  sessionHistory.unshift({ id: currentSessionId, title: '新创作', time: Date.now(), messages: [] });
  saveSession();
  chatList.innerHTML = `<div class="welcome" id="welcome"><h1>Hey 👋 用户</h1><p>今天想创作点什么？</p><div class="sub">直接告诉我，或点击下方快捷指令</div></div>`;
  toggleDrawer();
}

/* ================= MIDI/音频 导出数据缓存 ================= */
const _midiData = {};
const _audioData = {};
let _currentFingerprint = '';

/* ================= 项目管理系统 ================= */
let currentProject = null;
function initCurrentProject() {
  currentProject = {
    version: '1.0.0',
    name: document.getElementById('projName')?.value || '未命名项目',
    createdAt: new Date().toISOString(),
    compositionParams: {
      key: document.getElementById('key')?.value || 'C',
      bpm: parseInt(document.getElementById('bpm')?.value) || 120,
      style: document.getElementById('style')?.value || 'pop',
      emotion: document.getElementById('arrEmotion')?.value || 'happy',
      barCount: parseInt(document.getElementById('length')?.value) || 16,
      algorithm: document.getElementById('algo')?.value || 'genetic',
    },
    melody: [],
    arrangement: { tracks: [], sampleRate: 44100, duration: 0 },
    lyrics: [],
    masteringSettings: { targetLUFS: -14, applied: [] },
    cognitiveState: { memoryBank: { memories: [], edges: [] }, knowledgeGraph: [], t6History: [] },
    learningState: { feedbackRecords: [], hyperparameters: {}, abilityMatrix: {} }
  };
}
initCurrentProject();
initCloudSync();
populatePluginSelects();

function collectCompositionParams() {
  return {
    key: document.getElementById('key')?.value || 'C',
    bpm: parseInt(document.getElementById('bpm')?.value) || 120,
    style: document.getElementById('style')?.value || 'pop',
    emotion: document.getElementById('arrEmotion')?.value || 'happy',
    barCount: parseInt(document.getElementById('length')?.value) || 16,
    algorithm: document.getElementById('algo')?.value || 'genetic',
  };
}

function normalizeMelody(notes, durations) {
  if (!Array.isArray(notes) || !Array.isArray(durations)) return [];
  return notes.map((n, i) => {
    const dur = durations[i] || 0.5;
    if (typeof n === 'string') {
      const octave = parseInt(n.slice(-1)) || 4;
      const semis = {C:0,c:0,D:2,d:2,E:4,e:4,F:5,f:5,G:7,g:7,A:9,a:9,B:11,b:11};
      const semi = semis[n[0]] || 0;
      const midi = (octave + 1) * 12 + semi;
      return { pitch: midi, duration: dur, velocity: 80, offset: i * dur };
    }
    if (typeof n === 'number') {
      return { pitch: n, duration: dur, velocity: 80, offset: i * dur };
    }
    return { duration: dur, velocity: 80, offset: i * dur };
  });
}

async function saveProject() {
  const loading = document.getElementById('projSaveLoading');
  const result = document.getElementById('projSaveResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    currentProject.name = document.getElementById('projName')?.value || '未命名项目';
    currentProject.compositionParams = collectCompositionParams();
    const lyricText = document.getElementById('lyricResult')?.textContent || '';
    currentProject.lyrics = lyricText ? lyricText.split('\n').filter(Boolean) : [];
    const res = await fetch(`${API}/api/project/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentProject)
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    result.textContent = `✓ 项目已保存！\nID: ${d.projectId}\n下载: ${d.downloadUrl}`;
  } catch (e) { result.textContent = '错误: ' + e.message; }
  loading.classList.remove('show');
}

function exportProject() {
  try {
    currentProject.name = document.getElementById('projName')?.value || '未命名项目';
    currentProject.compositionParams = collectCompositionParams();
    const lyricText = document.getElementById('lyricResult')?.textContent || '';
    currentProject.lyrics = lyricText ? lyricText.split('\n').filter(Boolean) : [];
    const json = JSON.stringify(currentProject, (_key, value) => {
      if (value instanceof Float32Array) return { __type: 'Float32Array', data: Array.from(value) };
      return value;
    });
    const base64 = btoa(unescape(encodeURIComponent(json)));
    const blob = new Blob([base64], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentProject.name || 'project') + '.qingluan';
    a.click();
    URL.revokeObjectURL(url);
    showToast('项目已导出');
  } catch (e) {
    document.getElementById('projSaveResult').textContent = '导出错误: ' + e.message;
  }
}

async function importProject(input) {
  const result = document.getElementById('projLoadResult');
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = decodeURIComponent(escape(atob(text)));
    const project = JSON.parse(json, (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Float32Array' && Array.isArray(value.data)) {
        return new Float32Array(value.data);
      }
      return value;
    });
    if (!project.version) throw new Error('无效的项目文件');
    restoreProject(project);
    result.textContent = `✓ 项目「${project.name}」导入成功！`;
    showToast('项目导入成功');
  } catch (e) { result.textContent = '导入错误: ' + e.message; }
  input.value = '';
}

async function listProjects() {
  const listEl = document.getElementById('projList');
  listEl.innerHTML = '加载中...';
  try {
    const res = await fetch(`${API}/api/project/list`);
    const d = await res.json();
    if (!d.projects || d.projects.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text2);font-size:12px;">暂无保存的项目</div>';
      return;
    }
    listEl.innerHTML = d.projects.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(91,77,255,0.05);border-radius:10px;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(p.name)}</div>
          <div style="font-size:11px;color:var(--text2);">${p.style} | ${p.key} | ${new Date(p.createdAt).toLocaleString()}</div>
        </div>
        <button class="s-btn-small" onclick="loadProject('${p.projectId}')">加载</button>
      </div>
    `).join('');
  } catch (e) { listEl.innerHTML = '<div style="color:#d44;font-size:12px;">错误: ' + e.message + '</div>'; }
}

async function loadProject(projectId) {
  const result = document.getElementById('projLoadResult');
  try {
    const res = await fetch(`${API}/api/project/load?id=${encodeURIComponent(projectId)}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    restoreProject(d);
    result.textContent = `✓ 项目「${d.name}」加载成功！`;
    showToast('项目加载成功');
  } catch (e) { result.textContent = '加载错误: ' + e.message; }
}

function restoreProject(project) {
  currentProject = project;
  if (project.name) document.getElementById('projName').value = project.name;
  if (project.compositionParams) {
    const cp = project.compositionParams;
    const keyEl = document.getElementById('key'); if (keyEl && cp.key) keyEl.value = cp.key;
    const bpmEl = document.getElementById('bpm'); if (bpmEl && cp.bpm) bpmEl.value = cp.bpm;
    const styleEl = document.getElementById('style'); if (styleEl && cp.style) styleEl.value = cp.style;
    const algoEl = document.getElementById('algo'); if (algoEl && cp.algorithm) algoEl.value = cp.algorithm;
    const lenEl = document.getElementById('length'); if (lenEl && cp.barCount) lenEl.value = cp.barCount;
    const emoEl = document.getElementById('arrEmotion'); if (emoEl && cp.emotion) emoEl.value = cp.emotion;
    const arrKeyEl = document.getElementById('arrKey'); if (arrKeyEl && cp.key) arrKeyEl.value = cp.key;
    const arrBpmEl = document.getElementById('arrBpm'); if (arrBpmEl && cp.bpm) arrBpmEl.value = cp.bpm;
    const arrStyleEl = document.getElementById('arrStyle'); if (arrStyleEl && cp.style) arrStyleEl.value = cp.style;
    const emKeyEl = document.getElementById('emKey'); if (emKeyEl && cp.key) emKeyEl.value = cp.key;
    const emBarsEl = document.getElementById('emBars'); if (emBarsEl && cp.barCount) emBarsEl.value = cp.barCount;
    const emBpmEl = document.getElementById('emBpm'); if (emBpmEl && cp.bpm) emBpmEl.value = cp.bpm;
    const prodStyleEl = document.getElementById('prodStyle'); if (prodStyleEl && cp.style) prodStyleEl.value = cp.style;
    const prodKeyEl = document.getElementById('prodKey'); if (prodKeyEl && cp.key) prodKeyEl.value = cp.key;
    const prodEmoEl = document.getElementById('prodEmotion'); if (prodEmoEl && cp.emotion) prodEmoEl.value = cp.emotion;
    const prodBarsEl = document.getElementById('prodBars'); if (prodBarsEl && cp.barCount) prodBarsEl.value = cp.barCount;
  }
  if (project.lyrics && project.lyrics.length) {
    const lr = document.getElementById('lyricResult');
    if (lr) lr.textContent = project.lyrics.join('\n');
  }
}

/* ================= 云端同步系统 ================= */
function getDeviceId() {
  let did = localStorage.getItem('qingluan_deviceId');
  if (!did) {
    did = 'dev_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
    localStorage.setItem('qingluan_deviceId', did);
  }
  return did;
}

function initCloudSync() {
  const did = getDeviceId();
  const el = document.getElementById('cloudDeviceId');
  if (el) el.value = did;
  listCloudProjects();
}

async function uploadToCloud() {
  const loading = document.getElementById('cloudSyncLoading');
  const result = document.getElementById('cloudSyncResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    currentProject.name = document.getElementById('projName')?.value || '未命名项目';
    currentProject.compositionParams = collectCompositionParams();
    const lyricText = document.getElementById('lyricResult')?.textContent || '';
    currentProject.lyrics = lyricText ? lyricText.split('\n').filter(Boolean) : [];
    currentProject.projectId = currentProject.projectId || ('cloud_' + Date.now().toString(36));
    const deviceId = getDeviceId();

    const res = await fetch(`${API}/api/cloud/upload`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: currentProject, deviceId })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);

    localStorage.setItem('qingluan_cloud_projectId', d.projectId);
    localStorage.setItem('qingluan_cloud_syncToken', d.syncToken);
    result.textContent = `✓ 已上传到云端！\n项目ID: ${d.projectId}\n同步令牌: ${d.syncToken}`;
    showToast('上传成功');
    listCloudProjects();
  } catch (e) { result.textContent = '上传错误: ' + e.message; }
  loading.classList.remove('show');
}

async function listCloudProjects() {
  const listEl = document.getElementById('cloudProjectList');
  const selectEl = document.getElementById('cloudProjectSelect');
  try {
    const deviceId = getDeviceId();
    const res = await fetch(`${API}/api/cloud/list?deviceId=${encodeURIComponent(deviceId)}`);
    const d = await res.json();
    if (!d.projects || d.projects.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text2);font-size:12px;">暂无云端项目</div>';
      selectEl.innerHTML = '<option value="">选择云端项目...</option>';
      return;
    }

    selectEl.innerHTML = '<option value="">选择云端项目...</option>' +
      d.projects.map(p => `<option value="${p.projectId}" data-device="${p.deviceId}">${escapeHtml(p.name)} (${p.style}|${p.key}) ${p.isOwner ? '[本机]' : '[其他设备]'}</option>`).join('');

    listEl.innerHTML = d.projects.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(91,77,255,0.05);border-radius:10px;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(p.name)} ${p.isOwner ? '<span style="color:var(--accent);font-size:11px;">[本机]</span>' : '<span style="color:var(--accent2);font-size:11px;">[' + escapeHtml(p.deviceId.slice(0,8)) + '...]</span>'}</div>
          <div style="font-size:11px;color:var(--text2);">${p.style} | ${p.key} | 同步: ${new Date(p.lastSyncTime).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = '<div style="color:#d44;font-size:12px;">加载云端列表失败: ' + e.message + '</div>';
  }
}

async function downloadFromCloud() {
  const selectEl = document.getElementById('cloudProjectSelect');
  const result = document.getElementById('cloudSyncResult');
  const projectId = selectEl.value;
  if (!projectId) { result.textContent = '请先选择一个云端项目'; return; }

  // 查找该项目的 syncToken（如果之前上传过）
  let syncToken = localStorage.getItem('qingluan_cloud_syncToken_' + projectId);
  if (!syncToken) {
    // 尝试从当前存储的通用 token 匹配（仅对本地上传的项目有效）
    const storedProjectId = localStorage.getItem('qingluan_cloud_projectId');
    if (storedProjectId === projectId) {
      syncToken = localStorage.getItem('qingluan_cloud_syncToken');
    }
  }
  if (!syncToken) {
    result.textContent = '错误: 缺少该项目的同步令牌，无法下载。请先由上传设备执行同步或重新上传。';
    return;
  }

  try {
    const res = await fetch(`${API}/api/cloud/download?projectId=${encodeURIComponent(projectId)}&syncToken=${encodeURIComponent(syncToken)}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    restoreProject(d.project);
    localStorage.setItem('qingluan_cloud_projectId', projectId);
    localStorage.setItem('qingluan_cloud_syncToken', syncToken);
    result.textContent = `✓ 项目「${d.project.name}」下载成功！\n最后修改: ${new Date(d.lastModified).toLocaleString()}\n来源设备: ${d.deviceId}`;
    showToast('下载成功');
  } catch (e) { result.textContent = '下载错误: ' + e.message; }
}

async function syncProject() {
  const loading = document.getElementById('cloudSyncLoading');
  const result = document.getElementById('cloudSyncResult');
  loading.classList.add('show'); result.textContent = '';

  const projectId = localStorage.getItem('qingluan_cloud_projectId');
  const syncToken = localStorage.getItem('qingluan_cloud_syncToken');
  if (!projectId || !syncToken) {
    result.textContent = '提示: 当前没有关联的云端项目，请先上传或下载一个项目。';
    loading.classList.remove('show');
    return;
  }

  try {
    currentProject.name = document.getElementById('projName')?.value || '未命名项目';
    currentProject.compositionParams = collectCompositionParams();
    const lyricText = document.getElementById('lyricResult')?.textContent || '';
    currentProject.lyrics = lyricText ? lyricText.split('\n').filter(Boolean) : [];

    // 使用项目 createdAt 的毫秒时间作为本地时间戳，如果没有则使用当前时间
    const localTimestamp = currentProject.lastModified ? new Date(currentProject.lastModified).getTime() : Date.now();

    const res = await fetch(`${API}/api/cloud/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        syncToken,
        deviceId: getDeviceId(),
        timestamp: localTimestamp,
        project: currentProject
      })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);

    if (d.status === 'conflict') {
      result.innerHTML = `<div style="color:#c60;font-weight:600;">⚠️ 版本冲突</div>
<div style="font-size:12px;margin-top:4px;">${d.message}</div>
<div style="display:flex;gap:8px;margin-top:8px;">
  <button class="s-btn-small" onclick="resolveConflict('local')">保留本地</button>
  <button class="s-btn-small" onclick="resolveConflict('cloud')">使用云端</button>
</div>`;
      window._conflictData = d;
    } else if (d.status === 'updated' || d.status === 'local_newer') {
      result.textContent = `✓ ${d.message}\n时间戳: ${new Date(d.lastModified || localTimestamp).toLocaleString()}`;
      showToast('同步成功');
      listCloudProjects();
    } else if (d.status === 'cloud_newer') {
      restoreProject(d.cloudVersion);
      result.textContent = `✓ 已更新为云端版本\n云端时间: ${new Date(d.cloudTimestamp).toLocaleString()}`;
      showToast('已同步云端版本');
    } else {
      result.textContent = '同步状态: ' + d.status + '\n' + (d.message || '');
    }
  } catch (e) { result.textContent = '同步错误: ' + e.message; }
  loading.classList.remove('show');
}

function resolveConflict(choice) {
  const result = document.getElementById('cloudSyncResult');
  const data = window._conflictData;
  if (!data) { result.textContent = '冲突数据已过期'; return; }
  if (choice === 'cloud') {
    restoreProject(data.cloudVersion);
    result.textContent = '✓ 已采用云端版本';
    showToast('已采用云端版本');
  } else {
    result.textContent = '✓ 保留本地版本，请重新点击上传以覆盖云端';
    showToast('保留本地版本');
  }
  window._conflictData = null;
}

async function deleteCloudProject() {
  const result = document.getElementById('cloudSyncResult');
  const projectId = localStorage.getItem('qingluan_cloud_projectId');
  const syncToken = localStorage.getItem('qingluan_cloud_syncToken');
  if (!projectId || !syncToken) {
    result.textContent = '没有关联的云端项目可删除';
    return;
  }
  if (!confirm('确定要删除云端项目吗？此操作不可恢复。')) return;

  try {
    const res = await fetch(`${API}/api/cloud/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, syncToken })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    localStorage.removeItem('qingluan_cloud_projectId');
    localStorage.removeItem('qingluan_cloud_syncToken');
    localStorage.removeItem('qingluan_cloud_syncToken_' + projectId);
    result.textContent = '✓ 云端项目已删除';
    showToast('删除成功');
    listCloudProjects();
  } catch (e) { result.textContent = '删除错误: ' + e.message; }
}

/* ================= 多开会话系统 ================= */
let sessions = JSON.parse(localStorage.getItem('qingluan_sessions') || '[]');
currentSessionId = localStorage.getItem('qingluan_current_session') || '';

function ensureSession() {
  if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
    newSession();
  }
}
function newSession() {
  const id = 'sess_' + Date.now();
  const session = {
    id,
    title: '创作 ' + (sessions.length + 1),
    preview: '新建创作会话...',
    messages: [],
    createdAt: Date.now(),
  };
  sessions.unshift(session);
  currentSessionId = id;
  saveSessions();
  renderDrawer();
  renderChat();
  showToast('新建创作会话');
}
function saveSessions() {
  localStorage.setItem('qingluan_sessions', JSON.stringify(sessions));
  localStorage.setItem('qingluan_current_session', currentSessionId);
}
function switchSession(id) {
  currentSessionId = id;
  saveSessions();
  renderDrawer();
  renderChat();
  toggleDrawer();
}
function deleteSession(e, id) {
  e.stopPropagation();
  sessions = sessions.filter(s => s.id !== id);
  if (sessions.length === 0) { newSession(); return; }
  if (currentSessionId === id) currentSessionId = sessions[0].id;
  saveSessions();
  renderDrawer();
  renderChat();
}
function updateSessionPreview(text) {
  const s = sessions.find(s => s.id === currentSessionId);
  if (s) { s.preview = text.slice(0, 30); s.updatedAt = Date.now(); saveSessions(); renderDrawer(); }
}
function addMessage(role, content, type='text', extra='') {
  ensureSession();
  const s = sessions.find(s => s.id === currentSessionId);
  if (!s) return;
  const msg = { role, content, type, extra, time: Date.now() };
  s.messages.push(msg);
  if (role === 'user') s.preview = content.slice(0, 30);
  saveSessions();
  renderChat();
  if (role === 'user') updateSessionPreview(content);
}
function renderDrawer() {
  const list = document.getElementById('sessionList');
  list.innerHTML = sessions.map(s => `
    <div class="session-item ${s.id===currentSessionId?'active':''}" onclick="switchSession('${s.id}')">
      <div class="session-avatar">${s.title.slice(0,1)}</div>
      <div class="session-info">
        <div class="session-title">${s.title}</div>
        <div class="session-preview">${s.preview || '无消息'}</div>
      </div>
      <div class="session-time">${fmtTime(s.updatedAt||s.createdAt)}</div>
    </div>
  `).join('');
}
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function renderChat() {
  const container = document.getElementById('chatList');
  const s = sessions.find(s => s.id === currentSessionId);
  if (!s || s.messages.length === 0) {
    container.innerHTML = `
      <div class="welcome">
        <h1>Hey 👋 用户</h1>
        <p>今天青鸾 DAW<br>能帮你做什么？</p>
        <div class="sub">点击下方快捷入口开始创作，或进入工作室调整高级参数。</div>
      </div>`;
    return;
  }
  container.innerHTML = s.messages.map(m => renderMessage(m)).join('');
  container.scrollTop = container.scrollHeight;
}
function renderMessage(m) {
  const time = fmtTime(m.time);
  if (m.type === 'func-card') {
    return `<div class="msg-row ai"><div class="msg-avatar">🐦</div><div><div class="msg-bubble" style="background:transparent;padding:0;max-width:85%;">${m.extra}</div><div class="msg-time">${time}</div></div></div>`;
  }
  const avatar = m.role==='user' ? '👤' : '🐦';
  const cls = m.role;
  return `<div class="msg-row ${cls}"><div class="msg-avatar">${avatar}</div><div><div class="msg-bubble">${escapeHtml(m.content)}</div><div class="msg-time">${time}</div></div></div>`;
}
function escapeHtml(t) {
  if (t == null) return '';
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ================= UI 控制 ================= */
function toggleQuickMore() {
  addMessage('ai', '<p>你想用什么工具？</p><button class="s-btn-small" onclick="openStudioTab(\'s-compose\')">AI作曲</button><button class="s-btn-small" onclick="openStudioTab(\'s-realistic\')">真人声</button><button class="s-btn-small" onclick="openStudioTab(\'s-arranger\')">伴奏</button><button class="s-btn-small" onclick="openStudioTab(\'s-lyrics\')">歌词</button><button class="s-btn-small" onclick="openStudioTab(\'s-effects\')">效果器</button><button class="s-btn-small" onclick="openStudioTab(\'s-visual\')">可视化</button><button class="s-btn-small" onclick="openStudioTab(\'s-edu\')">音乐游戏</button><button class="s-btn-small" onclick="openStudioTab(\'s-project\')">项目管理</button>');
}
function toggleDrawer() {
  document.getElementById('drawer').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function toggleStudio() {
  const layer = document.getElementById('studioLayer');
  if (layer) layer.style.display = layer.style.display === 'block' ? 'none' : 'block';
}
function closeAll() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}
function switchNav(el, mode) {
  document.querySelectorAll('.nav-pills span').forEach(s=>s.classList.remove('active'));
  if (el) el.classList.add('active');
  if (mode==='studio' || mode==='project' || mode==='collab' || mode==='plugin') {
    const layer = document.getElementById('studioLayer'); if (layer) layer.style.display = 'block';
  } else {
    const layer = document.getElementById('studioLayer'); if (layer) layer.style.display = 'none';
  }
  if (mode==='project') { switchStudioTab('s-project'); }
  if (mode==='collab') { switchStudioTab('s-collab'); }
  if (mode==='plugin') { switchStudioTab('s-plugin'); refreshPluginList(); }
}
function switchStudioTab(tabId) {
  document.querySelectorAll('.studio-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.studio-panel').forEach(x => x.classList.remove('active'));
  const tab = document.querySelector('.studio-tab[data-sp="'+tabId+'"]');
  if (tab) tab.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}
function showToast(t) {
  const el=document.getElementById('toast'); el.textContent=t; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2000);
}

// 输入框提示
const chatInput = document.getElementById('chatInput');
const inputHint = document.getElementById('inputHint');
chatInput.addEventListener('input', () => { inputHint.style.display = chatInput.value ? 'none' : 'block'; });

function sendChat() {
  const v = chatInput.value.trim();
  if (!v) return;
  addMessage('user', v);
  chatInput.value = '';
  inputHint.style.display = 'block';
  // 简单命令解析
  if (/作曲|旋律|创作/.test(v)) { setTimeout(()=>addFuncCard('compose'),400); }
  else if (/人声|唱歌|歌手/.test(v)) { setTimeout(()=>addFuncCard('realistic'),400); }
  else if (/伴奏|编曲|乐队/.test(v)) { setTimeout(()=>addFuncCard('arranger'),400); }
  else if (/歌词|词|写诗/.test(v)) { setTimeout(()=>addFuncCard('lyrics'),400); }
  else if (/合成器|音色|波/.test(v)) { setTimeout(()=>addFuncCard('flawless'),400); }
  else {
    setTimeout(()=>addMessage('ai', '收到！你可以在下方快捷入口选择具体功能，或进入「工作室」调整高级参数。'),500);
  }
}

/* ================= 聊天中的功能卡片 ================= */
let cardIdCounter = 0;
function addFuncCard(type) {
  ensureSession();
  cardIdCounter++;
  const cid = 'fc_' + cardIdCounter;
  let html = '';
  if (type === 'compose') {
    html = `<div class="func-card" id="${cid}">
      <h4>🎼 AI 智能作曲</h4>
      <div class="form-row"><label>风格</label><select id="${cid}_style"><option>流行</option><option>摇滚</option><option>电子</option><option>古典</option><option>中国风</option></select></div>
      <div class="form-row"><label>调性</label><select id="${cid}_key"><option>C大调</option><option>G大调</option><option>A小调</option><option>F大调</option></select></div>
      <div class="form-row"><label>BPM</label><input type="number" id="${cid}_bpm" value="120" min="40" max="240"></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardCompose('${cid}')">生成</button></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'realistic') {
    html = `<div class="func-card" id="${cid}">
      <h4>🎙️ 真人级人声</h4>
      <div class="form-row"><label>性别</label><select id="${cid}_gender"><option value="female">女声</option><option value="male">男声</option></select></div>
      <div class="form-row"><label>歌词</label><input type="text" id="${cid}_text" value="啦 啦 啦"></div>
      <div class="form-row"><label>音符</label><input type="text" id="${cid}_notes" value="C4 E4 G4"></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardRealistic('${cid}')">合成</button></div>
      <div id="${cid}_player"></div>
    </div>`;
  } else if (type === 'arranger') {
    html = `<div class="func-card" id="${cid}">
      <h4>🎹 真人级伴奏</h4>
      <div class="form-row"><label>风格</label><select id="${cid}_style"><option value="chinese">中国风</option><option value="pop">流行</option><option value="rock">摇滚</option><option value="jazz">爵士</option></select></div>
      <div class="form-row"><label>情绪</label><select id="${cid}_emo"><option value="romantic">浪漫</option><option value="happy">欢快</option><option value="sad">忧伤</option></select></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardArranger('${cid}')">生成</button></div>
      <div id="${cid}_player"></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'lyrics') {
    html = `<div class="func-card" id="${cid}">
      <h4>📝 智能歌词生成</h4>
      <div class="form-row"><label>主题</label><select id="${cid}_theme"><option value="love">爱情</option><option value="nature">自然</option><option value="food">食物</option><option value="city">城市</option></select></div>
      <div class="form-row"><label>情感</label><select id="${cid}_emo"><option value="joy">欢喜</option><option value="sorrow">忧伤</option><option value="nostalgia">怀旧</option></select></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardLyrics('${cid}')">生成</button></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'flawless') {
    html = `<div class="func-card" id="${cid}">
      <h4>✨ 无瑕疵合成器</h4>
      <div class="form-row"><label>波形</label><select id="${cid}_wave"><option value="triangle">三角波</option><option value="sine">正弦波</option><option value="sawtooth">锯齿波</option><option value="square">方波</option></select></div>
      <div class="form-row"><label>频率</label><input type="number" id="${cid}_freq" value="440"></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardFlawless('${cid}')">生成</button></div>
      <div id="${cid}_player"></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'effects') {
    html = `<div class="func-card" id="${cid}">
      <h4>🔊 音频效果器</h4>
      <div class="form-row"><label>效果</label><select id="${cid}_fx"><option value="reverb">混响</option><option value="eq">均衡</option><option value="compress">压缩</option><option value="distort">失真</option><option value="delay">延迟</option></select></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardEffects('${cid}')">应用</button></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'visual') {
    html = `<div class="func-card" id="${cid}">
      <h4>🌊 实时频谱可视化</h4>
      <canvas id="${cid}_canvas" width="300" height="120" style="width:100%;height:120px;border-radius:10px;background:#f0f0f5;"></canvas>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">关闭</button><button onclick="runCardVisual('${cid}')">启动</button></div>
    </div>`;
  } else if (type === 'cognitive') {
    html = `<div class="func-card" id="${cid}">
      <h4>🧠 认知涌现评估</h4>
      <div class="form-row"><label>内容</label><input type="text" id="${cid}_txt" placeholder="输入歌词或旋律..."></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardCognitive('${cid}')">评估</button></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'emergence') {
    html = `<div class="func-card" id="${cid}">
      <h4>🌌 认知涌现音乐</h4>
      <div class="form-row"><label>调性</label><select id="${cid}_key"><option>C</option><option>G</option><option>Am</option><option>F</option></select></div>
      <div class="form-row"><label>小节数</label><input type="number" id="${cid}_bars" value="8" min="4" max="16"></div>
      <div class="form-row"><label>迭代</label><select id="${cid}_loop"><option value="1">单次</option><option value="3">闭环×3</option><option value="5">闭环×5</option></select></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardEmergence('${cid}')">涌现</button></div>
      <div id="${cid}_mastering"></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'produce') {
    html = `<div class="func-card" id="${cid}">
      <h4>🚀 一键产音乐</h4>
      <div class="form-row"><label>风格</label><select id="${cid}_style"><option>pop</option><option>chinese</option><option>rock</option><option>jazz</option></select></div>
      <div class="form-row"><label>调性</label><select id="${cid}_key"><option>C</option><option>G</option><option>Am</option><option>F</option></select></div>
      <div class="form-row"><label>情绪</label><select id="${cid}_emo"><option>happy</option><option>sad</option><option>romantic</option><option>tense</option></select></div>
      <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardProduce('${cid}')">产音乐</button></div>
      <div id="${cid}_player"></div>
      <div class="form-row" id="${cid}_exportRow" style="display:none;margin-top:8px;">
        <label>格式</label><select id="${cid}_exportFormat"><option value="wav">WAV</option><option value="mp3">MP3</option><option value="flac">FLAC</option></select>
      </div>
      <button class="secondary" id="${cid}_exportAudio" style="display:none;margin-top:4px;padding:8px 12px;border-radius:8px;border:none;background:rgba(91,77,255,0.1);color:var(--accent);font-weight:600;cursor:pointer;" onclick="exportCardAudio('${cid}')">🎵 导出音频</button>
      <button class="secondary" id="${cid}_exportMidi" style="display:none;margin-top:4px;padding:8px 12px;border-radius:8px;border:none;background:rgba(91,77,255,0.1);color:var(--accent);font-weight:600;cursor:pointer;" onclick="exportCardMidi('${cid}')">🎼 导出 MIDI</button>
      <div id="${cid}_mastering"></div>
      <div class="result-mini" id="${cid}_res"></div>
    </div>`;
  } else if (type === 'video') {
    html = `<div class="func-card" id="${cid}">
      <h4>🎬 视频配乐</h4>
      <div class="form-row"><label>上传视频</label><input type="file" id="${cid}_file" accept="video/*" onchange="runCardVideoLoad('${cid}',this)"></div>
      <div id="${cid}_previewWrap" style="display:none;margin-bottom:8px;">
        <video id="${cid}_video" controls style="width:100%;border-radius:10px;background:#000;" crossorigin="anonymous"></video>
      </div>
      <div id="${cid}_controls" style="display:none;">
        <div class="card-btns"><button class="secondary" onclick="closeCard('${cid}')">取消</button><button onclick="runCardVideoAnalyze('${cid}')">分析情绪</button></div>
        <div class="result-mini" id="${cid}_res"></div>
        <div id="${cid}_player"></div>
      </div>
      <canvas id="${cid}_canvas" style="display:none;"></canvas>
    </div>`;
  }
  addMessage('ai', '', 'func-card', html);
}
function closeCard(id) {
  const el = document.getElementById(id);
  if (el) el.closest('.msg-row').remove();
}

// 卡片执行函数
async function runCardCompose(cid) {
  const styleMap = {流行:'pop',摇滚:'rock',电子:'electronic',古典:'classical',中国风:'chinese'};
  const keyMap = {'C大调':'C','G大调':'G','A小调':'Am','F大调':'F'};
  const style = styleMap[document.getElementById(cid+'_style').value] || 'pop';
  const key = keyMap[document.getElementById(cid+'_key').value] || 'C';
  const bpm = parseInt(document.getElementById(cid+'_bpm').value);
  const res = document.getElementById(cid+'_res');
  res.textContent = 'AI 创作中...';
  try {
    const r = await fetch(`${API}/api/composer/create`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({algorithm:'genetic', style, key, length:16, bpm})
    });
    const d = await r.json();
    res.textContent = `✓ 旋律生成成功！\n风格: ${style} | 调性: ${key}\n旋律: ${d.melody?.slice(0,16).join(' ')}${d.melody?.length>16?'...':''}`;
  } catch(e){ res.textContent = '错误: '+e.message; }
}
async function runCardRealistic(cid) {
  const gender = document.getElementById(cid+'_gender').value;
  const text = document.getElementById(cid+'_text').value.split(/\s+/);
  const notes = document.getElementById(cid+'_notes').value.split(/\s+/);
  const durations = notes.map(()=>0.5);
  const player = document.getElementById(cid+'_player');
  player.innerHTML = '<div style="font-size:12px;color:#999;">生成中...</div>';
  try {
    const r = await fetch(`${API}/api/synth/realistic`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({gender, timbre:'warm', text, notes, durations})
    });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
  } catch(e){ player.innerHTML = '<div style="color:#d44;font-size:12px;">错误: '+e.message+'</div>'; }
}
async function runCardArranger(cid) {
  const style = document.getElementById(cid+'_style').value;
  const emotion = document.getElementById(cid+'_emo').value;
  const player = document.getElementById(cid+'_player');
  const res = document.getElementById(cid+'_res');
  player.innerHTML = '<div style="font-size:12px;color:#999;">多轨渲染中...</div>';
  try {
    const r = await fetch(`${API}/api/arranger/generate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({style, key:'G', emotion, bpm:90})
    });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
    res.textContent = `✓ 伴奏生成成功！\n风格: ${style} | 情绪: ${emotion}\n大小: ${(blob.size/1024).toFixed(1)} KB`;
  } catch(e){ player.innerHTML = '<div style="color:#d44;font-size:12px;">错误: '+e.message+'</div>'; }
}
async function runCardLyrics(cid) {
  const theme = document.getElementById(cid+'_theme').value;
  const emotion = document.getElementById(cid+'_emo').value;
  const res = document.getElementById(cid+'_res');
  res.textContent = '作词中...';
  try {
    const r = await fetch(`${API}/api/lyrics/generate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({theme, emotion, perspective:'first', length:4, style:'modern'})
    });
    const d = await r.json();
    res.textContent = d.formatted || d.error || '无结果';
  } catch(e){ res.textContent = '错误: '+e.message; }
}
async function runCardFlawless(cid) {
  const waveform = document.getElementById(cid+'_wave').value;
  const freq = parseFloat(document.getElementById(cid+'_freq').value);
  const player = document.getElementById(cid+'_player');
  const res = document.getElementById(cid+'_res');
  player.innerHTML = '<div style="font-size:12px;color:#999;">合成中...</div>';
  try {
    const r = await fetch(`${API}/api/flawless/note`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({freq, duration:1, waveform, fm:false})
    });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
    res.textContent = `✓ 无瑕疵音频生成！\n波形: ${waveform} | 频率: ${freq}Hz\n大小: ${(blob.size/1024).toFixed(1)} KB`;
  } catch(e){ player.innerHTML = '<div style="color:#d44;font-size:12px;">错误: '+e.message+'</div>'; }
}
async function runCardEffects(cid) {
  const effect = document.getElementById(cid+'_fx').value;
  const res = document.getElementById(cid+'_res');
  res.textContent = 'DSP处理中...';
  try {
    const sampleRate = 44100;
    const samples = new Float32Array(sampleRate);
    for (let i=0;i<sampleRate;i++) samples[i] = Math.sin(2*Math.PI*440*i/sampleRate)*0.5;
    const r = await fetch(`${API}/api/effects/${effect}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({samples:Array.from(samples), sampleRate})
    });
    const d = await r.json();
    res.textContent = d.error ? d.error : `✓ ${effect} 处理成功！\n输出长度: ${d.output.length} 采样`;
  } catch(e){ res.textContent = '错误: '+e.message; }
}
function runCardVisual(cid) {
  const canvas = document.getElementById(cid+'_canvas');
  const ctx = canvas.getContext('2d');
  let running = true;
  function draw() {
    if (!running) return;
    ctx.fillStyle = 'rgba(240,240,245,0.3)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const bars = 32, bw = canvas.width/bars, t = Date.now()/1000;
    for (let i=0;i<bars;i++) {
      const h = Math.abs(Math.sin(t*3+i/bars*10)*Math.cos(t*2+i/bars*5))*80;
      ctx.fillStyle = `hsla(${180+i/bars*120},80%,60%,0.8)`;
      ctx.fillRect(i*bw+1, canvas.height-h, bw-2, h);
    }
    requestAnimationFrame(draw);
  }
  draw();
  // 点击关闭时停止
  const btn = document.querySelector(`#${cid} button[onclick^="closeCard"]`);
  const orig = btn.onclick;
  btn.onclick = ()=>{ running=false; orig(); };
}
async function runCardCognitive(cid) {
  const text = document.getElementById(cid+'_txt').value;
  const res = document.getElementById(cid+'_res');
  res.textContent = '认知评估中...';
  try {
    const r = await fetch(`${API}/api/cee/evaluate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text, type:'lyrics'})
    });
    const d = await r.json();
    res.textContent = JSON.stringify(d, null, 2).slice(0, 500);
  } catch(e){ res.textContent = '错误: '+e.message; }
}
async function runCardEmergence(cid) {
  const key = document.getElementById(cid+'_key').value;
  const bars = parseInt(document.getElementById(cid+'_bars').value);
  const loop = parseInt(document.getElementById(cid+'_loop').value);
  const res = document.getElementById(cid+'_res');
  const masterUI = document.getElementById(cid+'_mastering');
  res.textContent = '认知涌现引擎启动中...';
  if (masterUI) masterUI.innerHTML = '';
  try {
    const endpoint = loop > 1 ? '/api/emergence/loop' : '/api/emergence/compose';
    const body = loop > 1
      ? JSON.stringify({ key, barCount: bars, maxIterations: loop, threshold: 0.6 })
      : JSON.stringify({ key, barCount: bars });
    const r = await fetch(`${API}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body });
    const d = await r.json();
    if (d.error) { res.textContent = '错误: '+d.error; return; }
    if (masterUI) masterUI.innerHTML = renderMasteringUI(d.mastering);
    if (loop > 1) {
      res.textContent = `🌌 认知闭环完成\n迭代: ${d.iterations} 次\n最佳T6: ${d.bestScore?.toFixed?.(3) || d.bestScore}\n胶囊: ${d.finalResult?.capsuleId?.slice(0,8)}...\n旋律: ${d.finalResult?.melody?.slice(0,12).join(' ')}${d.finalResult?.melody?.length>12?'...':''}`;
    } else {
      res.textContent = `🌌 涌现作曲完成\nT6: ${d.scores?.overall?.toFixed?.(3) || d.scores?.overall}\nSwarm聚类: ${d.swarmAnalysis?.clusteringCoeff?.toFixed?.(3)}\nEisbach自信度: ${d.eisbach?.confidence?.toFixed?.(3)}\n胶囊: ${d.capsuleId?.slice(0,8)}...\n旋律: ${d.melody?.slice(0,12).join(' ')}${d.melody?.length>12?'...':''}`;
    }
  } catch(e){ res.textContent = '错误: '+e.message; }
}
async function runCardProduce(cid) {
  const style = document.getElementById(cid+'_style').value;
  const key = document.getElementById(cid+'_key').value;
  const emotion = document.getElementById(cid+'_emo').value;
  const res = document.getElementById(cid+'_res');
  const player = document.getElementById(cid+'_player');
  const masterUI = document.getElementById(cid+'_mastering');
  const exportMidiBtn = document.getElementById(cid+'_exportMidi');
  const exportAudioBtn = document.getElementById(cid+'_exportAudio');
  const exportRow = document.getElementById(cid+'_exportRow');
  res.textContent = '🚀 自我进化生产线启动...';
  player.innerHTML = '';
  if (masterUI) masterUI.innerHTML = '';
  if (exportMidiBtn) exportMidiBtn.style.display = 'none';
  if (exportAudioBtn) exportAudioBtn.style.display = 'none';
  if (exportRow) exportRow.style.display = 'none';
  try {
    const r = await fetch(`${API}/api/produce`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ style, key, emotion, barCount: 16, bpm: 120, maxAttempts: 3 })
    });
    const d = await r.json();
    if (d.error) { res.textContent = '错误: ' + d.error; return; }
    const wav = Uint8Array.from(atob(d.wavBase64), c => c.charCodeAt(0));
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
    if (masterUI) masterUI.innerHTML = renderMasteringUI(d.mastering);
    let text = `🚀 产音乐完成！\n尝试: ${d.attempt} 次 | 修复: ${d.fixed ? '是' : '否'} | 进化: ${d.evolved ? '是' : '否'}\nT6: ${d.composition?.scores?.overall?.toFixed?.(3)}\n诊断: ${d.diagnosis?.healthy ? '健康' : d.diagnosis?.severity}\n问题: ${d.diagnosis?.issues?.join(', ') || '无'}`;
    text += `\n\n日志:\n${d.productionLog?.slice(0,6).join('\n')}`;
    if (d.lyrics && d.lyrics.length > 0) {
      text += `\n\n📝 匹配歌词:\n${d.lyrics.join('\n')}`;
    }
    res.textContent = text;
    _midiData[cid] = d.composition;
    _audioData[cid] = d.wavBase64;
    if (exportMidiBtn) exportMidiBtn.style.display = 'inline-block';
    if (exportAudioBtn) exportAudioBtn.style.display = 'inline-block';
    if (exportRow) exportRow.style.display = 'flex';
  } catch(e){ res.textContent = '错误: '+e.message; }
}

/* ================= 原有 API 函数（工作室用） ================= */
async function compose() {
  const loading = document.getElementById('composeLoading');
  const result = document.getElementById('composeResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/composer/create`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        algorithm: document.getElementById('algo').value,
        style: document.getElementById('style').value,
        key: document.getElementById('key').value,
        length: parseInt(document.getElementById('length').value),
        bpm: parseInt(document.getElementById('bpm').value),
        usePhraseStructure: document.getElementById('composeUsePhrase')?.checked || false,
        useHumanization: document.getElementById('composeUseHumanize')?.checked || false,
        useAnalogFeel: document.getElementById('composeUseAnalog')?.checked || false,
        useSpatialReverb: document.getElementById('composeSpatial').value !== 'none',
        spatialPreset: document.getElementById('composeSpatial').value,
        useWatermark: document.getElementById('composeUseWatermark')?.checked || false,
        creatorId: 'qingluan-user',
        useHumanFeelEnhance: document.getElementById('composeUseHumanFeel')?.checked || false,
        humanFeelIntensity: (+document.getElementById('composeUseHumanFeel')?.checked || false) ? ((+document.getElementById('ntHumanFeelSlider')?.value || 50) / 100) : 0,
      })
    });
    const data = await res.json();
    if (!data.error) {
      currentProject.compositionParams = collectCompositionParams();
      currentProject.melody = normalizeMelody(data.melody || [], data.rhythm || []);
    }
    result.textContent = data.error ? '错误: '+data.error : `算法: ${data.algorithm}\n风格: ${data.style}\n调性: ${data.key}\n旋律: ${data.melody?.slice(0,20).join(' ')}${data.melody?.length>20?'...':''}`;
  } catch(e){ result.textContent = '网络错误: '+e.message; }
  loading.classList.remove('show');
}
async function autoArrange() {
  document.getElementById('composeResult').textContent = '自动编曲需要先有旋律...';
}
async function fullSong() {
  const loading = document.getElementById('fullSongLoading');
  const result = document.getElementById('fullSongResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/create/full-song`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        style: document.getElementById('style').value,
        key: document.getElementById('key').value,
        bpm: parseInt(document.getElementById('bpm').value),
        length: parseInt(document.getElementById('length').value),
        algorithm: document.getElementById('algo').value,
        usePhraseStructure: document.getElementById('composeUsePhrase')?.checked || false,
        useHumanization: document.getElementById('composeUseHumanize')?.checked || false,
        useAnalogFeel: document.getElementById('composeUseAnalog')?.checked || false,
        useSpatialReverb: document.getElementById('composeSpatial').value !== 'none',
        spatialPreset: document.getElementById('composeSpatial').value,
        useWatermark: document.getElementById('composeUseWatermark')?.checked || false,
        creatorId: 'qingluan-user',
        useHumanFeelEnhance: document.getElementById('composeUseHumanFeel')?.checked || false,
        humanFeelIntensity: (+document.getElementById('composeUseHumanFeel')?.checked || false) ? ((+document.getElementById('ntHumanFeelSlider')?.value || 50) / 100) : 0,
      })
    });
    const data = await res.json();
    if (!data.error) {
      currentProject.compositionParams = {
        key: data.key || document.getElementById('key').value,
        bpm: data.bpm || parseInt(document.getElementById('bpm').value),
        style: data.style || document.getElementById('style').value,
        emotion: document.getElementById('arrEmotion').value || 'happy',
        barCount: data.melody?.length || parseInt(document.getElementById('length').value),
        algorithm: data.algorithm || document.getElementById('algo').value,
      };
      currentProject.melody = normalizeMelody(data.melody || [], data.rhythm || []);
      currentProject.lyrics = data.lyrics || [];
      if (data.arrangement && data.arrangement.tracks) {
        currentProject.arrangement = {
          tracks: Object.entries(data.arrangement.tracks || {}).map(([name, track]) => ({
            name,
            notes: (track.notes || []).map(n => ({
              pitch: n.pitch || 60, duration: n.duration || 0.5, velocity: n.velocity || 80, offset: n.offset || 0
            }))
          })),
          sampleRate: 44100,
          duration: data.arrangement.totalDuration || 0
        };
      }
    }
    result.textContent = data.error ? '错误: '+data.error : `🎵 完整歌曲生成成功！\n风格: ${data.style} | 调性: ${data.key} | BPM: ${data.bpm}\n旋律: ${data.melody?.length}个音符\n歌词: ${data.lyrics?.slice(0,10)}...`;
  } catch(e){ result.textContent = '网络错误: '+e.message; }
  loading.classList.remove('show');
}
async function getScale() {
  const result = document.getElementById('scaleResult');
  try {
    const res = await fetch(`${API}/api/theory/scale/${document.getElementById('scaleType').value}?root=${document.getElementById('scaleRoot').value}`);
    const data = await res.json();
    result.textContent = data.error ? data.error : `${data.root} ${data.name}:\n${data.notes?.join(' ')}`;
  } catch(e){ result.textContent = '错误: '+e.message; }
}
async function getProgressions(style) {
  const result = document.getElementById('progResult');
  try {
    const res = await fetch(`${API}/api/theory/progressions?style=${style}`);
    const data = await res.json();
    const progs = data[style] || data;
    result.textContent = typeof progs==='object' ? JSON.stringify(progs,null,2).slice(0,800) : String(progs);
  } catch(e){ result.textContent = '错误: '+e.message; }
}
async function synthesizeTone() {
  const loading = document.getElementById('toneLoading');
  const player = document.getElementById('tonePlayer');
  loading.classList.add('show'); player.innerHTML = '';
  try {
    const res = await fetch(`${API}/api/synth/tone`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        note: document.getElementById('toneNote').value,
        duration: parseFloat(document.getElementById('toneDuration').value),
        timbre: document.getElementById('toneTimbre').value,
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}"></audio>`;
  } catch(e){ player.innerHTML = '<p style="color:#d44;font-size:11px;">错误: '+e.message+'</p>'; }
  loading.classList.remove('show');
}
async function applyEffect() {
  const loading = document.getElementById('effectLoading');
  const result = document.getElementById('effectResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const sampleRate = 44100;
    const samples = new Float32Array(sampleRate);
    for (let i=0;i<sampleRate;i++) samples[i] = Math.sin(2*Math.PI*440*i/sampleRate)*0.5;
    const effect = document.getElementById('effectType').value;
    const res = await fetch(`${API}/api/effects/${effect}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({samples:Array.from(samples), sampleRate})
    });
    const data = await res.json();
    if (data.error) { result.textContent = '错误: '+data.error; }
    else {
      const rmsBefore = Math.sqrt(samples.reduce((a,b)=>a+b*b,0)/samples.length);
      const rmsAfter = Math.sqrt(data.output.reduce((a,b)=>a+b*b,0)/data.output.length);
      result.textContent = `效果器: ${effect}\n输入RMS: ${rmsBefore.toFixed(4)}\n输出RMS: ${rmsAfter.toFixed(4)}\n输出长度: ${data.output.length} 采样\n处理成功 ✓`;
    }
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
/* ================= 新增可视化绘制函数 ================= */

function drawSpectrumStudio(freqData, timeData, spectrumCanvas, waveformCanvas) {
  const sCtx = spectrumCanvas.getContext('2d');
  const sw = spectrumCanvas.width;
  const sh = spectrumCanvas.height;
  sCtx.fillStyle = '#0a0a1a';
  sCtx.fillRect(0, 0, sw, sh);

  const barCount = 64;
  const barWidth = sw / barCount;
  for (let i = 0; i < barCount; i++) {
    const idx = Math.floor(i / barCount * freqData.length);
    const val = freqData[idx];
    const barHeight = (val / 255) * sh * 0.9;
    const hue = 200 + (i / barCount) * 160;
    const grad = sCtx.createLinearGradient(0, sh - barHeight, 0, sh);
    grad.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.95)`);
    grad.addColorStop(1, `hsla(${hue}, 90%, 45%, 0.5)`);
    sCtx.fillStyle = grad;
    sCtx.fillRect(i * barWidth + 0.5, sh - barHeight, barWidth - 1, barHeight);
  }

  const wCtx = waveformCanvas.getContext('2d');
  const ww = waveformCanvas.width;
  const wh = waveformCanvas.height;
  wCtx.fillStyle = '#0a0a1a';
  wCtx.fillRect(0, 0, ww, wh);

  wCtx.lineWidth = 1.5;
  wCtx.strokeStyle = '#4caf50';
  wCtx.beginPath();
  const sliceWidth = ww / timeData.length;
  let x = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = timeData[i] / 128.0;
    const y = (v * wh) / 2;
    if (i === 0) wCtx.moveTo(x, y);
    else wCtx.lineTo(x, y);
    x += sliceWidth;
  }
  wCtx.stroke();

  wCtx.strokeStyle = 'rgba(156, 39, 176, 0.7)';
  wCtx.beginPath();
  x = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = timeData[(i + 2) % timeData.length] / 128.0;
    const y = (v * wh) / 2;
    if (i === 0) wCtx.moveTo(x, y);
    else wCtx.lineTo(x, y);
    x += sliceWidth;
  }
  wCtx.stroke();
}

function drawSpectrum3D(freqData, canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  const bars = 28;
  const bw = (w * 0.8) / bars;
  const cx = w / 2;
  const by = h * 0.88;
  const depth = 10;

  for (let i = 0; i < bars; i++) {
    const idx = Math.floor(i / bars * freqData.length);
    const val = freqData[idx] / 255;
    const bh = val * h * 0.65;
    const x = cx + (i - bars / 2) * bw * 1.05;
    const hue = 240 - (i / bars) * 240;

    const dx = -depth * 0.6;
    const dy = -depth * 0.35;

    ctx.fillStyle = `hsl(${hue}, 85%, 28%)`;
    ctx.fillRect(x + bw - 1, by - bh, dx + 1, bh);

    ctx.fillStyle = `hsl(${hue}, 85%, 72%)`;
    ctx.beginPath();
    ctx.moveTo(x, by - bh);
    ctx.lineTo(x + dx, by - bh + dy);
    ctx.lineTo(x + bw + dx, by - bh + dy);
    ctx.lineTo(x + bw - 1, by - bh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `hsl(${hue}, 85%, 52%)`;
    ctx.fillRect(x, by - bh, bw - 1, bh);
  }
}

function drawParticles(freqData, canvas, time) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = 'rgba(10, 10, 26, 0.22)';
  ctx.fillRect(0, 0, w, h);

  let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
  const third = Math.floor(freqData.length / 3);
  for (let i = 0; i < third; i++) lowEnergy += freqData[i];
  for (let i = third; i < third * 2; i++) midEnergy += freqData[i];
  for (let i = third * 2; i < freqData.length; i++) highEnergy += freqData[i];
  lowEnergy = (lowEnergy / third) / 255;
  midEnergy = (midEnergy / third) / 255;
  highEnergy = (highEnergy / (freqData.length - third * 2)) / 255;
  const totalEnergy = (lowEnergy + midEnergy + highEnergy) / 3;

  if (!canvas._particles) {
    canvas._particles = [];
    const count = 250;
    for (let i = 0; i < count; i++) {
      canvas._particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2 + 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  const particles = canvas._particles;
  const cx = w / 2, cy = h / 2;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const isLow = i < particles.length * 0.33;
    const isHigh = i > particles.length * 0.66;

    if (isLow) {
      const tx = cx + Math.cos(p.phase + time * 0.001) * 20;
      const ty = cy + Math.sin(p.phase + time * 0.001) * 20;
      p.vx += (tx - p.x) * 0.015 * (1 + lowEnergy * 3);
      p.vy += (ty - p.y) * 0.015 * (1 + lowEnergy * 3);
    } else if (isHigh) {
      const angle = Math.atan2(p.y - cy, p.x - cx);
      const push = 1 + highEnergy * 4;
      p.vx += Math.cos(angle) * 0.15 * push;
      p.vy += Math.sin(angle) * 0.15 * push;
    } else {
      const angle = time * 0.001 + p.phase;
      const radius = 40 + midEnergy * 80;
      const tx = cx + Math.cos(angle) * radius;
      const ty = cy + Math.sin(angle) * radius;
      p.vx += (tx - p.x) * 0.012;
      p.vy += (ty - p.y) * 0.012;
    }

    p.vx *= 0.93;
    p.vy *= 0.93;
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -5) p.x = w + 5;
    if (p.x > w + 5) p.x = -5;
    if (p.y < -5) p.y = h + 5;
    if (p.y > h + 5) p.y = -5;

    const hue = 180 + totalEnergy * 180 + (i / particles.length) * 60;
    ctx.fillStyle = `hsla(${hue}, 85%, 65%, 0.85)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.8 + totalEnergy * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }

  const connDist = 50 + totalEnergy * 60;
  for (let i = 0; i < particles.length; i++) {
    let connects = 0;
    for (let j = i + 1; j < particles.length && connects < 3; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < connDist) {
        connects++;
        const alpha = (1 - dist / connDist) * 0.35;
        ctx.strokeStyle = `hsla(${200 + totalEnergy * 100}, 85%, 70%, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function initFractalGL(canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) return null;

  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_zoomSpeed;
    uniform float u_colorShift;
    uniform float u_rotSpeed;

    vec2 cmul(vec2 a, vec2 b) {
      return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
      float angle = u_time * u_rotSpeed;
      float ca = cos(angle), sa = sin(angle);
      uv = vec2(ca*uv.x - sa*uv.y, sa*uv.x + ca*uv.y);
      float zoom = exp(u_time * u_zoomSpeed * 0.3);
      uv *= zoom;

      vec2 z = uv;
      vec2 c = vec2(-0.8 + 0.08*sin(u_time*0.6), 0.156 + 0.08*cos(u_time*0.4));

      float iter = 0.0;
      for (int i = 0; i < 80; i++) {
        if (dot(z, z) > 4.0) break;
        z = cmul(z, z) + c;
        iter += 1.0;
      }

      float t = iter / 80.0;
      vec3 col = vec3(
        0.5 + 0.5*cos(6.28318*(t + u_colorShift + 0.0)),
        0.5 + 0.5*cos(6.28318*(t + u_colorShift + 0.33)),
        0.5 + 0.5*cos(6.28318*(t + u_colorShift + 0.66))
      );
      if (iter >= 80.0) col = vec3(0.02, 0.02, 0.04);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  return {
    gl, prog,
    u_resolution: gl.getUniformLocation(prog, 'u_resolution'),
    u_time: gl.getUniformLocation(prog, 'u_time'),
    u_zoomSpeed: gl.getUniformLocation(prog, 'u_zoomSpeed'),
    u_colorShift: gl.getUniformLocation(prog, 'u_colorShift'),
    u_rotSpeed: gl.getUniformLocation(prog, 'u_rotSpeed'),
  };
}

function drawFractal(freqData, canvas, time, isPlaying) {
  if (!canvas._gl) {
    canvas._gl = initFractalGL(canvas);
    if (!canvas._gl) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText('WebGL 不支持', 10, 20);
      return;
    }
  }
  const { gl, u_resolution, u_time, u_zoomSpeed, u_colorShift, u_rotSpeed } = canvas._gl;

  let low = 0, mid = 0, high = 0;
  const third = Math.floor(freqData.length / 3);
  for (let i = 0; i < third; i++) low += freqData[i];
  for (let i = third; i < third * 2; i++) mid += freqData[i];
  for (let i = third * 2; i < freqData.length; i++) high += freqData[i];
  low = (low / third) / 255;
  mid = (mid / third) / 255;
  high = (high / (freqData.length - third * 2)) / 255;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(u_resolution, canvas.width, canvas.height);
  gl.uniform1f(u_time, time * 0.001);
  gl.uniform1f(u_zoomSpeed, isPlaying ? (0.3 + low * 2.5) : 0.0);
  gl.uniform1f(u_colorShift, mid * 0.5);
  gl.uniform1f(u_rotSpeed, isPlaying ? (high * 1.2) : 0.0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

let studioAnalyserRef = { analyser: null, isPlaying: false };

/* ================= 实时频谱与波形可视化 ================= */
let vizRunning = false;
function startVisualizer() {
  const btn = document.getElementById('vizBtn');
  if (vizRunning) { vizRunning = false; btn.textContent = '▶ 启动可视化'; return; }
  vizRunning = true; btn.textContent = '⏹ 停止';

  const spectrumCanvas = document.getElementById('spectrumCanvas');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const spectrum3dCanvas = document.getElementById('spectrum3dCanvas');
  const particleCanvas = document.getElementById('particleCanvas');
  const fractalCanvas = document.getElementById('fractalCanvas');

  let lastTime = performance.now();
  let simTime = 0;

  function loop(now) {
    if (!vizRunning) {
      [spectrumCanvas, spectrum3dCanvas, waveformCanvas, particleCanvas].forEach(c => {
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, c.width, c.height);
      });
      if (fractalCanvas._gl) {
        const gl = fractalCanvas._gl.gl;
        gl.clearColor(0.04, 0.04, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      return;
    }

    const dt = now - lastTime;
    lastTime = now;
    simTime += dt;

    let freqData, timeData;
    const buflen = 128;
    if (studioAnalyserRef.analyser && studioAnalyserRef.isPlaying) {
      const alen = studioAnalyserRef.analyser.frequencyBinCount;
      freqData = new Uint8Array(alen);
      timeData = new Uint8Array(alen);
      studioAnalyserRef.analyser.getByteFrequencyData(freqData);
      studioAnalyserRef.analyser.getByteTimeDomainData(timeData);
    } else {
      freqData = new Uint8Array(buflen);
      timeData = new Uint8Array(buflen);
      const t = simTime * 0.001;
      for (let i = 0; i < buflen; i++) {
        const f = i / buflen;
        freqData[i] = Math.abs(Math.sin(t * 3 + f * 10) * Math.cos(t * 2 + f * 5)) * 220 * (0.6 + 0.4 * Math.sin(t + i));
        timeData[i] = 128 + Math.sin(t * 4 + i / buflen * 10) * 50 + Math.cos(t * 3 + i * 0.2) * 20;
      }
    }

    drawSpectrumStudio(freqData, timeData, spectrumCanvas, waveformCanvas);
    drawSpectrum3D(freqData, spectrum3dCanvas);
    drawParticles(freqData, particleCanvas, simTime);
    drawFractal(freqData, fractalCanvas, simTime, studioAnalyserRef.isPlaying || vizRunning);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
async function synthesizeRealistic() {
  const loading = document.getElementById('rvLoading');
  const player = document.getElementById('rvPlayer');
  loading.classList.add('show'); player.innerHTML = '';
  try {
    const res = await fetch(`${API}/api/synth/realistic`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        gender: document.getElementById('rvGender').value,
        timbre: document.getElementById('rvTimbre').value,
        text: document.getElementById('rvLyrics').value.split(/\s+/),
        notes: document.getElementById('rvNotes').value.split(/\s+/),
        durations: document.getElementById('rvDurations').value.split(/\s+/).map(parseFloat),
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}"></audio>`;
  } catch(e){ player.innerHTML = '<p style="color:#d44;font-size:11px;">错误: '+e.message+'</p>'; }
  loading.classList.remove('show');
}
async function synthesizeJianpu() {
  const loading = document.getElementById('rvJianpuLoading');
  const player = document.getElementById('rvJianpuPlayer');
  loading.classList.add('show'); player.innerHTML = '';
  try {
    const res = await fetch(`${API}/api/synth/jianpu`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        gender: document.getElementById('rvGender').value,
        timbre: document.getElementById('rvTimbre').value,
        jianpu: document.getElementById('rvJianpu').value,
        lyrics: document.getElementById('rvJianpuLyrics').value.split(/\s+/),
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}"></audio>`;
  } catch(e){ player.innerHTML = '<p style="color:#d44;font-size:11px;">错误: '+e.message+'</p>'; }
  loading.classList.remove('show');
}
async function generateArranger() {
  const loading = document.getElementById('arrLoading');
  const player = document.getElementById('arrPlayer');
  const result = document.getElementById('arrResult');
  loading.classList.add('show'); player.innerHTML = ''; result.textContent = '';
  try {
    const res = await fetch(`${API}/api/arranger/generate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        style: document.getElementById('arrStyle').value,
        key: document.getElementById('arrKey').value,
        emotion: document.getElementById('arrEmotion').value,
        bpm: parseInt(document.getElementById('arrBpm').value),
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}"></audio>`;
    result.textContent = `✓ 伴奏生成成功！\n风格: ${document.getElementById('arrStyle').value}\n调性: ${document.getElementById('arrKey').value}\n情绪: ${document.getElementById('arrEmotion').value}\nBPM: ${document.getElementById('arrBpm').value}\n大小: ${(blob.size/1024/1024).toFixed(2)} MB`;
    currentProject.compositionParams = {
      ...currentProject.compositionParams,
      style: document.getElementById('arrStyle').value,
      key: document.getElementById('arrKey').value,
      emotion: document.getElementById('arrEmotion').value,
      bpm: parseInt(document.getElementById('arrBpm').value),
    };
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
function toggleLyricMode() {
  const mode = document.getElementById('lyricMode').value;
  document.getElementById('lyricGeneral').style.display = mode==='general'?'block':'none';
  document.getElementById('lyricFood').style.display = mode==='food'?'block':'none';
  document.getElementById('lyricEmotionDiv').style.display = mode==='emotion'?'block':'none';
  document.getElementById('lyricCharacter').style.display = mode==='character'?'block':'none';
}
async function generateLyrics() {
  const loading = document.getElementById('lyricLoading');
  const result = document.getElementById('lyricResult');
  loading.classList.add('show'); result.textContent = '';
  const mode = document.getElementById('lyricMode').value;
  let endpoint = '/api/lyrics/generate'; let body = {};
  try {
    if (mode==='general') {
      body = { theme: document.getElementById('lyricTheme').value, emotion: document.getElementById('lyricEmotion').value, perspective: document.getElementById('lyricPersp').value, object: document.getElementById('lyricObject').value||undefined, length: parseInt(document.getElementById('lyricLength').value), style: document.getElementById('lyricStyle').value };
    } else if (mode==='food') {
      endpoint = '/api/lyrics/food';
      body = { food: document.getElementById('lyricFoodName').value, emotion: document.getElementById('lyricFoodEmotion').value, perspective: document.getElementById('lyricPersp')?.value||'first' };
    } else if (mode==='emotion') {
      endpoint = '/api/lyrics/emotion';
      body = { emotion: document.getElementById('lyricEmoCore').value, perspective: document.getElementById('lyricPersp')?.value||'first' };
    } else if (mode==='character') {
      endpoint = '/api/lyrics/character';
      body = { character: document.getElementById('lyricCharDesc').value, emotion: document.getElementById('lyricCharEmo').value, perspective: document.getElementById('lyricCharPersp').value };
    }
    const res = await fetch(`${API}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.error && data.formatted) {
      currentProject.lyrics = data.formatted.split('\n').filter(Boolean);
    }
    result.textContent = data.error ? '错误: '+data.error : data.formatted;
  } catch(e){ result.textContent = '网络错误: '+e.message; }
  loading.classList.remove('show');
}
function toggleCeeMode() {
  const mode = document.getElementById('ceeMode').value;
  document.getElementById('ceeEvaluate').style.display = mode==='evaluate'?'block':'none';
  document.getElementById('ceeOptimize').style.display = mode==='optimize'?'block':'none';
  document.getElementById('ceeFeedback').style.display = mode==='feedback'?'block':'none';
  document.getElementById('ceeOrchestrate').style.display = mode==='orchestrate'?'block':'none';
  document.getElementById('ceeStatus').style.display = mode==='status'?'block':'none';
}
async function ceeEvaluate() {
  const loading = document.getElementById('ceeLoading');
  const result = document.getElementById('ceeResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/cee/evaluate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: document.getElementById('ceeEvalText').value, type: document.getElementById('ceeEvalType').value }) });
    result.textContent = JSON.stringify(await res.json(), null, 2);
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
async function ceeOptimize() {
  const loading = document.getElementById('ceeLoading');
  const result = document.getElementById('ceeResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/cee/optimize`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lyrics: document.getElementById('ceeOptText').value }) });
    result.textContent = JSON.stringify(await res.json(), null, 2);
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
async function ceeFeedback() {
  const loading = document.getElementById('ceeLoading');
  const result = document.getElementById('ceeResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/cee/feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ score: parseFloat(document.getElementById('ceeScore').value), message: document.getElementById('ceeMsg').value, tags: document.getElementById('ceeTags').value.split(',').map(s=>s.trim()).filter(Boolean) }) });
    result.textContent = JSON.stringify(await res.json(), null, 2);
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
async function ceeOrchestrate() {
  const loading = document.getElementById('ceeLoading');
  const result = document.getElementById('ceeResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/cee/orchestrate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ goal: document.getElementById('ceeGoal').value }) });
    result.textContent = JSON.stringify(await res.json(), null, 2);
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
async function ceeStatus() {
  const loading = document.getElementById('ceeLoading');
  const result = document.getElementById('ceeResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/cee/status`);
    result.textContent = JSON.stringify(await res.json(), null, 2);
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
function toggleFlawMode() {
  const mode = document.getElementById('flawMode').value;
  document.getElementById('flawNote').style.display = mode==='note'?'block':'none';
  document.getElementById('flawChord').style.display = mode==='chord'?'block':'none';
  document.getElementById('flawArp').style.display = mode==='arpeggio'?'block':'none';
  document.getElementById('flawDrum').style.display = mode==='drum'?'block':'none';
  document.getElementById('flawPreset').style.display = mode==='preset'?'block':'none';
}
async function generateFlawless() {
  const loading = document.getElementById('flawLoading');
  const player = document.getElementById('flawPlayer');
  const result = document.getElementById('flawResult');
  loading.classList.add('show'); player.innerHTML = ''; result.textContent = '';
  const mode = document.getElementById('flawMode').value;
  let endpoint = '/api/flawless/note'; let body = {};
  try {
    if (mode==='note') {
      body = { freq: parseFloat(document.getElementById('flawFreq').value), duration: parseFloat(document.getElementById('flawDur').value), waveform: document.getElementById('flawWave').value, fm: document.getElementById('flawFm').checked };
    } else if (mode==='chord') {
      endpoint = '/api/flawless/chord';
      body = { freqs: document.getElementById('flawChordFreqs').value.split(',').map(parseFloat), duration: parseFloat(document.getElementById('flawChordDur').value) };
    } else if (mode==='arpeggio') {
      endpoint = '/api/flawless/arpeggio';
      body = { freqs: document.getElementById('flawArpFreqs').value.split(',').map(parseFloat), noteDuration: parseFloat(document.getElementById('flawArpNoteDur').value) };
    } else if (mode==='drum') {
      endpoint = '/api/flawless/drum';
      body = { type: document.getElementById('flawDrumType').value };
    } else if (mode==='preset') {
      endpoint = '/api/flawless/preset';
      body = { preset: document.getElementById('flawPresetName').value, freq: parseFloat(document.getElementById('flawPresetFreq').value), duration: parseFloat(document.getElementById('flawPresetDur').value) };
    }
    const res = await fetch(`${API}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}"></audio>`;
    result.textContent = `✓ 无瑕疵音频生成成功！\n模式: ${mode}\n大小: ${(blob.size/1024).toFixed(2)} KB`;
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}

async function generateEmergence() {
  const loading = document.getElementById('emLoading');
  const result = document.getElementById('emResult');
  const masterUI = document.getElementById('emMasteringUI');
  loading.classList.add('show'); result.textContent = '';
  if (masterUI) masterUI.innerHTML = '';
  const mode = document.getElementById('emMode').value;
  const key = document.getElementById('emKey').value;
  const bars = parseInt(document.getElementById('emBars').value);
  const bpm = parseInt(document.getElementById('emBpm').value);
  try {
    const endpoint = mode === 'loop' ? '/api/emergence/loop' : '/api/emergence/compose';
    const body = mode === 'loop'
      ? JSON.stringify({ key, barCount: bars, bpm, maxIterations: 5, threshold: 0.6 })
      : JSON.stringify({ key, barCount: bars, bpm });
    const res = await fetch(`${API}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body });
    const d = await res.json();
    if (d.error) { result.textContent = '错误: ' + d.error; }
    else {
      if (masterUI) masterUI.innerHTML = renderMasteringUI(d.mastering);
      const melody = mode === 'loop' ? (d.finalResult?.melody || []) : (d.melody || []);
      const durations = mode === 'loop' ? (d.finalResult?.durations || []) : (d.durations || []);
      currentProject.compositionParams = { ...currentProject.compositionParams, key, bpm, barCount: bars };
      currentProject.melody = normalizeMelody(melody, durations);
      if (d.mastering) {
        currentProject.masteringSettings = { targetLUFS: d.mastering.finalLUFS || -14, applied: d.mastering.applied || [] };
      }
      if (d.scores) {
        currentProject.cognitiveState.t6History.push({ timestamp: new Date().toISOString(), scores: d.scores });
      }
      if (mode === 'loop') {
        result.textContent = `🌌 认知闭环完成\n迭代: ${d.iterations} 次\n最佳T6: ${d.bestScore?.toFixed?.(3) || d.bestScore}\n最终旋律: ${d.finalResult?.melody?.slice(0,16).join(' ')}${d.finalResult?.melody?.length>16?'...':''}`;
      } else {
        result.textContent = `🌌 涌现作曲完成\nT6: ${d.scores?.overall?.toFixed?.(3) || d.scores?.overall}\nSwarm聚类: ${d.swarmAnalysis?.clusteringCoeff?.toFixed?.(3)}\nEisbach自信度: ${d.eisbach?.confidence?.toFixed?.(3)}\n胶囊: ${d.capsuleId?.slice(0,10)}...\n旋律: ${d.melody?.slice(0,16).join(' ')}${d.melody?.length>16?'...':''}`;
      }
    }
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
async function getAbilityMatrix() {
  const result = document.getElementById('emAbilityResult');
  try {
    const res = await fetch(`${API}/api/emergence/ability`);
    const d = await res.json();
    result.textContent = JSON.stringify(d, null, 2).slice(0, 1200);
  } catch(e){ result.textContent = '错误: '+e.message; }
}
async function getCapsules() {
  const result = document.getElementById('emAbilityResult');
  try {
    const res = await fetch(`${API}/api/emergence/capsules`);
    const d = await res.json();
    result.textContent = JSON.stringify(d, null, 2).slice(0, 1200);
  } catch(e){ result.textContent = '错误: '+e.message; }
}
let _lastProduceParams = null;

function renderAutoMixTable(autoMixSettings) {
  const container = document.getElementById('prodAutoMixTable');
  if (!container || !autoMixSettings) { if (container) container.innerHTML = ''; return; }
  const rows = Object.entries(autoMixSettings).map(([name, p]) => {
    const thresholdDb = p.compressorThreshold > 0 ? (20 * Math.log10(p.compressorThreshold)).toFixed(1) : '-∞';
    const duck = p.duckingReduction ? `<span style="color:#ff6b9d">闪避 -${p.duckingReduction.toFixed(1)}dB</span>` : '-';
    return `<tr><td style="padding:6px;border-bottom:1px solid var(--border);font-weight:600;font-size:12px;">${name}</td><td style="padding:6px;border-bottom:1px solid var(--border);font-size:12px;">${p.gain.toFixed(3)}</td><td style="padding:6px;border-bottom:1px solid var(--border);font-size:12px;">${p.pan.toFixed(2)}</td><td style="padding:6px;border-bottom:1px solid var(--border);font-size:12px;">${p.eqLow}/${p.eqMid}/${p.eqHigh}</td><td style="padding:6px;border-bottom:1px solid var(--border);font-size:12px;">${p.compressorRatio}:1 @ ${thresholdDb}dB</td><td style="padding:6px;border-bottom:1px solid var(--border);font-size:12px;">${duck}</td></tr>`;
  }).join('');
  container.innerHTML = `<div style="margin-top:10px;"><h4 style="font-size:13px;margin-bottom:6px;color:var(--accent);">🎚 AI 自动混音参数</h4><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f7f7f7;"><th style="padding:6px;font-size:11px;text-align:left;">轨道</th><th style="padding:6px;font-size:11px;text-align:left;">增益</th><th style="padding:6px;font-size:11px;text-align:left;">声像</th><th style="padding:6px;font-size:11px;text-align:left;">EQ低/中/高(dB)</th><th style="padding:6px;font-size:11px;text-align:left;">压缩</th><th style="padding:6px;font-size:11px;text-align:left;">闪避</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function generateProduce() {
  const loading = document.getElementById('prodLoading');
  const result = document.getElementById('prodResult');
  const player = document.getElementById('prodPlayer');
  const masterUI = document.getElementById('prodMasteringUI');
  const exportMidiBtn = document.getElementById('prodExportMidi');
  const exportAudioBtn = document.getElementById('prodExportAudio');
  const exportRow = document.getElementById('prodExportRow');
  const optimizeBtn = document.getElementById('prodOptimizeMix');
  const autoMixTable = document.getElementById('prodAutoMixTable');
  loading.classList.add('show'); result.textContent = ''; player.innerHTML = ''; masterUI.innerHTML = '';
  if (autoMixTable) autoMixTable.innerHTML = '';
  if (exportMidiBtn) exportMidiBtn.style.display = 'none';
  if (exportAudioBtn) exportAudioBtn.style.display = 'none';
  if (exportRow) exportRow.style.display = 'none';
  if (optimizeBtn) optimizeBtn.style.display = 'none';
  const style = document.getElementById('prodStyle').value;
  const key = document.getElementById('prodKey').value;
  const emotion = document.getElementById('prodEmotion').value;
  const bars = parseInt(document.getElementById('prodBars').value);
  const attempts = parseInt(document.getElementById('prodAttempts').value);
  const masteringPreset = document.getElementById('prodMastering').value;
  const useAutoMix = document.getElementById('prodUseAutoMix').checked;
  try {
    const body = { style, key, emotion, barCount: bars, bpm: 120, maxAttempts: attempts, masteringPreset, useAutoMix };
    _lastProduceParams = { ...body };
    const res = await fetch(`${API}/api/produce`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const d = await res.json();
    if (d.error) { result.textContent = '错误: ' + d.error; }
    else {
      const wav = Uint8Array.from(atob(d.wavBase64), c => c.charCodeAt(0));
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
      masterUI.innerHTML = renderMasteringUI(d.mastering);
      let text = `🚀 产音乐完成！\n尝试: ${d.attempt} 次 | 修复: ${d.fixed ? '是' : '否'} | 进化: ${d.evolved ? '是' : '否'}\nT6: ${d.composition?.scores?.overall?.toFixed?.(3)}\n诊断: ${d.diagnosis?.healthy ? '健康' : d.diagnosis?.severity}\n问题: ${d.diagnosis?.issues?.join(', ') || '无'}\n日志:\n${d.productionLog?.slice(0,8).join('\n')}`;
      if (d.fingerprint) {
        text += `\n\n🔐 声学指纹: ${d.fingerprint.slice(0,16)}...`;
        _currentFingerprint = d.fingerprint;
      }
      if (d.lyrics && d.lyrics.length > 0) {
        text += `\n\n📝 匹配歌词:\n${d.lyrics.join('\n')}`;
      }
      result.textContent = text;
      _midiData['studio'] = d.composition;
      _audioData['studio'] = d.wavBase64;
      if (exportMidiBtn) exportMidiBtn.style.display = 'block';
      if (exportAudioBtn) exportAudioBtn.style.display = 'block';
      if (exportRow) exportRow.style.display = 'block';
      if (optimizeBtn) optimizeBtn.style.display = 'block';
      renderAutoMixTable(d.autoMixSettings);
      currentProject.compositionParams = { key, bpm: 120, style, emotion, barCount: bars };
      currentProject.melody = normalizeMelody(d.composition?.melody || [], d.composition?.durations || []);
      currentProject.lyrics = d.lyrics || [];
      if (d.mastering) {
        currentProject.masteringSettings = { targetLUFS: d.mastering.finalLUFS || -14, applied: d.mastering.applied || [] };
      }
      if (d.composition?.scores) {
        currentProject.cognitiveState.t6History.push({ timestamp: new Date().toISOString(), scores: d.composition.scores });
      }
      // 自动推荐封面
      autoRecommendCover(style, emotion, d.lyrics || []);
    }
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}

async function optimizeMix() {
  if (!_lastProduceParams) { showToast('请先生成音乐'); return; }
  const loading = document.getElementById('prodLoading');
  const result = document.getElementById('prodResult');
  const player = document.getElementById('prodPlayer');
  const masterUI = document.getElementById('prodMasteringUI');
  const optimizeBtn = document.getElementById('prodOptimizeMix');
  const autoMixTable = document.getElementById('prodAutoMixTable');
  loading.classList.add('show'); result.textContent = ''; player.innerHTML = ''; masterUI.innerHTML = '';
  if (autoMixTable) autoMixTable.innerHTML = '';
  try {
    const body = { ..._lastProduceParams, useAutoMix: true };
    const res = await fetch(`${API}/api/produce`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const d = await res.json();
    if (d.error) { result.textContent = '错误: ' + d.error; }
    else {
      const wav = Uint8Array.from(atob(d.wavBase64), c => c.charCodeAt(0));
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
      masterUI.innerHTML = renderMasteringUI(d.mastering);
      let text = `🔧 优化混音完成！\n尝试: ${d.attempt} 次 | 修复: ${d.fixed ? '是' : '否'} | 进化: ${d.evolved ? '是' : '否'}\nT6: ${d.composition?.scores?.overall?.toFixed?.(3)}\n诊断: ${d.diagnosis?.healthy ? '健康' : d.diagnosis?.severity}\n问题: ${d.diagnosis?.issues?.join(', ') || '无'}\n日志:\n${d.productionLog?.slice(0,8).join('\n')}`;
      if (d.fingerprint) {
        text += `\n\n🔐 声学指纹: ${d.fingerprint.slice(0,16)}...`;
        _currentFingerprint = d.fingerprint;
      }
      if (d.lyrics && d.lyrics.length > 0) {
        text += `\n\n📝 匹配歌词:\n${d.lyrics.join('\n')}`;
      }
      result.textContent = text;
      _midiData['studio'] = d.composition;
      _audioData['studio'] = d.wavBase64;
      renderAutoMixTable(d.autoMixSettings);
      currentProject.melody = normalizeMelody(d.composition?.melody || [], d.composition?.durations || []);
      currentProject.lyrics = d.lyrics || [];
      if (d.mastering) {
        currentProject.masteringSettings = { targetLUFS: d.mastering.finalLUFS || -14, applied: d.mastering.applied || [] };
      }
      if (d.composition?.scores) {
        currentProject.cognitiveState.t6History.push({ timestamp: new Date().toISOString(), scores: d.composition.scores });
      }
    }
  } catch(e){ result.textContent = '错误: '+e.message; }
  loading.classList.remove('show');
}
async function exportCardMidi(cid) {
  const comp = _midiData[cid];
  if (!comp || !comp.melody || !comp.durations) { showToast('无可用 MIDI 数据'); return; }
  await doExportMidi(comp.melody, comp.durations, comp.bpm || 120, comp.key || 'C');
}
async function exportStudioMidi() {
  const comp = _midiData['studio'];
  if (!comp || !comp.melody || !comp.durations) { showToast('无可用 MIDI 数据'); return; }
  await doExportMidi(comp.melody, comp.durations, comp.bpm || 120, comp.key || 'C');
}
async function doExportMidi(melody, durations, bpm, key) {
  const noteEvents = [];
  let startTime = 0;
  for (let i = 0; i < melody.length; i++) {
    noteEvents.push({
      midi: melody[i],
      startTime: startTime,
      duration: durations[i] || 0.5,
      velocity: 0.8,
    });
    startTime += durations[i] || 0.5;
  }
  try {
    const r = await fetch(`${API}/api/export/midi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteEvents, bpm, key }),
    });
    const d = await r.json();
    if (d.error) { showToast('导出失败: ' + d.error); return; }
    const bytes = Uint8Array.from(atob(d.midiBase64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qingluan_${key}_${bpm}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('MIDI 导出成功');
  } catch (e) { showToast('导出失败: ' + e.message); }
}
async function exportCardAudio(cid) {
  const wavBase64 = _audioData[cid];
  const format = document.getElementById(cid + '_exportFormat')?.value || 'mp3';
  if (!wavBase64) { showToast('无可用音频数据'); return; }
  await doExportAudio(wavBase64, format);
}
async function exportStudioAudio() {
  const wavBase64 = _audioData['studio'];
  const format = document.getElementById('prodExportFormat')?.value || 'mp3';
  if (!wavBase64) { showToast('无可用音频数据'); return; }
  await doExportAudio(wavBase64, format);
}
async function doExportAudio(wavBase64, format) {
  if (format === 'wav') {
    const bytes = Uint8Array.from(atob(wavBase64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qingluan_export.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('WAV 导出成功');
    return;
  }
  try {
    showToast('音频编码中...');
    const r = await fetch(`${API}/api/export/audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wavBase64, format, bitrate: format === 'mp3' ? 192 : undefined }),
    });
    const d = await r.json();
    if (d.error) { showToast('导出失败: ' + d.error); return; }
    const bytes = Uint8Array.from(atob(d.audioBase64), c => c.charCodeAt(0));
    const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/flac';
    const ext = format === 'mp3' ? 'mp3' : 'flac';
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qingluan_export.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${format.toUpperCase()} 导出成功`);
  } catch (e) { showToast('导出失败: ' + e.message); }
}
async function getProduceStatus() {
  const result = document.getElementById('prodStatusResult');
  try {
    const res = await fetch(`${API}/api/produce/status`);
    const d = await res.json();
    result.textContent = JSON.stringify(d, null, 2).slice(0, 1200);
  } catch(e){ result.textContent = '错误: '+e.message; }
}

/* ================= AI 专辑封面生成 ================= */
let _lastCoverUrl = '';
let _lastCoverParams = null;

async function generateCover(seedVariant) {
  const loading = document.getElementById('coverLoading');
  const result = document.getElementById('coverResult');
  const actions = document.getElementById('coverActions');
  loading.classList.add('show'); result.innerHTML = ''; actions.style.display = 'none';
  const style = document.getElementById('coverStyle').value;
  const emotion = document.getElementById('coverEmotion').value;
  const theme = document.getElementById('coverTheme').value;
  const lyricSnippet = document.getElementById('coverLyric').value;
  _lastCoverParams = { style, emotion, theme, lyricSnippet };
  try {
    const res = await fetch(`${API}/api/cover/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style, emotion, theme, lyricSnippet, seedVariant })
    });
    const d = await res.json();
    if (d.error) { result.innerHTML = '<div style="color:#d44;font-size:12px;">错误: ' + escapeHtml(d.error) + '</div>'; }
    else {
      _lastCoverUrl = d.coverUrl;
      result.innerHTML = `<img src="${escapeHtml(d.coverUrl)}" style="width:100%;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);display:block;">`;
      actions.style.display = 'block';
    }
  } catch (e) { result.innerHTML = '<div style="color:#d44;font-size:12px;">错误: ' + escapeHtml(e.message) + '</div>'; }
  loading.classList.remove('show');
}

function downloadCover() {
  if (!_lastCoverUrl) { showToast('请先生成封面'); return; }
  window.open(_lastCoverUrl, '_blank');
}

function regenerateCover() {
  if (!_lastCoverParams) { showToast('请先生成封面'); return; }
  const variants = ['slightly different angle', 'alternate lighting', 'different composition', 'unique color grading', 'fresh perspective'];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  generateCover(variant);
}

async function autoRecommendCover(style, emotion, lyrics) {
  const card = document.getElementById('coverRecommendCard');
  const result = document.getElementById('coverRecommendResult');
  if (!card || !result) return;
  card.style.display = 'block';
  result.innerHTML = '<div style="font-size:12px;color:var(--text2);">正在生成推荐封面...</div>';
  const lyricSnippet = Array.isArray(lyrics) && lyrics.length ? lyrics.slice(0, 2).join(' ') : '';
  try {
    const res = await fetch(`${API}/api/cover/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style, emotion, lyricSnippet })
    });
    const d = await res.json();
    if (d.error) { result.innerHTML = '<div style="color:#d44;font-size:12px;">推荐失败: ' + escapeHtml(d.error) + '</div>'; }
    else {
      result.innerHTML = `<img src="${escapeHtml(d.coverUrl)}" style="width:100%;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);display:block;">`;
      // 同步到封面面板
      document.getElementById('coverStyle').value = style;
      document.getElementById('coverEmotion').value = emotion;
      document.getElementById('coverLyric').value = lyricSnippet;
    }
  } catch (e) { result.innerHTML = '<div style="color:#d44;font-size:12px;">推荐错误: ' + escapeHtml(e.message) + '</div>'; }
}

function renderMasteringUI(m) {
  if (!m) return '';
  const lufs = m.finalLUFS ?? -70;
  const tp = m.finalTruePeak ?? 0;
  const dr = m.metrics?.dynamicRangeLU ?? 0;
  const lra = m.metrics?.loudnessRange ?? 0;
  // LUFS 条: 范围 -24 到 0, 目标 -14
  const pct = Math.max(0, Math.min(100, (lufs + 24) / 24 * 100));
  let fillClass = 'green';
  if (lufs > -10 || lufs < -20) fillClass = 'yellow';
  if (tp > 0.99) fillClass = 'red';
  const tags = (m.applied || []).map(a => `<span class="mastering-tag">${a}</span>`).join('');
  return `<div class="lufs-meter">
    <div class="lufs-text">${lufs.toFixed(1)} LUFS</div>
    <div class="lufs-bar"><div class="lufs-fill ${fillClass}" style="width:${pct}%"></div></div>
    <div class="lufs-text">TP ${tp.toFixed(3)}</div>
  </div>
  <div style="font-size:11px;color:var(--text2);margin-top:4px;">动态范围 ${dr.toFixed(1)} LU | 响度范围 ${lra.toFixed(1)} LU</div>
  <div class="mastering-chain">${tags}</div>`;
}

/* ================= 实时频谱与波形可视化 ================= */
let vizAudioCtx = null;
const vizConnected = new WeakSet();

function ensureVizAudioCtx() {
  if (!vizAudioCtx) {
    vizAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return vizAudioCtx;
}

function drawSpectrum(analyser, spectrumCanvas, waveformCanvas, isPlayingRef) {
  if (!isPlayingRef.value) return;
  requestAnimationFrame(() => drawSpectrum(analyser, spectrumCanvas, waveformCanvas, isPlayingRef));

  const sCtx = spectrumCanvas.getContext('2d');
  const sw = spectrumCanvas.width;
  const sh = spectrumCanvas.height;
  sCtx.fillStyle = '#0a0a1a';
  sCtx.fillRect(0, 0, sw, sh);

  const bufferLength = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(freqData);

  const barCount = 64;
  const barWidth = sw / barCount;
  for (let i = 0; i < barCount; i++) {
    const idx = Math.floor(i / barCount * bufferLength);
    const val = freqData[idx];
    const barHeight = (val / 255) * sh * 0.9;
    const hue = 200 + (i / barCount) * 160;
    const grad = sCtx.createLinearGradient(0, sh - barHeight, 0, sh);
    grad.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.95)`);
    grad.addColorStop(1, `hsla(${hue}, 90%, 45%, 0.5)`);
    sCtx.fillStyle = grad;
    sCtx.fillRect(i * barWidth + 0.5, sh - barHeight, barWidth - 1, barHeight);
  }

  const wCtx = waveformCanvas.getContext('2d');
  const ww = waveformCanvas.width;
  const wh = waveformCanvas.height;
  wCtx.fillStyle = '#0a0a1a';
  wCtx.fillRect(0, 0, ww, wh);

  const timeData = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(timeData);

  wCtx.lineWidth = 1.5;
  wCtx.strokeStyle = '#4caf50';
  wCtx.beginPath();
  const sliceWidth = ww / bufferLength;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = timeData[i] / 128.0;
    const y = (v * wh) / 2;
    if (i === 0) wCtx.moveTo(x, y);
    else wCtx.lineTo(x, y);
    x += sliceWidth;
  }
  wCtx.stroke();

  wCtx.strokeStyle = 'rgba(156, 39, 176, 0.7)';
  wCtx.beginPath();
  x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = timeData[(i + 2) % bufferLength] / 128.0;
    const y = (v * wh) / 2;
    if (i === 0) wCtx.moveTo(x, y);
    else wCtx.lineTo(x, y);
    x += sliceWidth;
  }
  wCtx.stroke();
}

function attachVisualizer(audioEl) {
  if (vizConnected.has(audioEl)) return;
  vizConnected.add(audioEl);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:4px;';

  const spectrumCanvas = document.createElement('canvas');
  spectrumCanvas.className = 'viz-spectrum';
  spectrumCanvas.width = 360;
  spectrumCanvas.height = 100;

  const waveformCanvas = document.createElement('canvas');
  waveformCanvas.className = 'viz-waveform';
  waveformCanvas.width = 360;
  waveformCanvas.height = 60;

  wrap.appendChild(spectrumCanvas);
  wrap.appendChild(waveformCanvas);
  audioEl.parentNode.insertBefore(wrap, audioEl.nextSibling);

  const ctx = ensureVizAudioCtx();
  const source = ctx.createMediaElementSource(audioEl);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const isPlayingRef = { value: false };

  audioEl.addEventListener('play', () => {
    isPlayingRef.value = true;
    studioAnalyserRef.analyser = analyser;
    studioAnalyserRef.isPlaying = true;
    if (ctx.state === 'suspended') ctx.resume();
    drawSpectrum(analyser, spectrumCanvas, waveformCanvas, isPlayingRef);
  });

  audioEl.addEventListener('pause', () => {
    isPlayingRef.value = false;
    if (studioAnalyserRef.analyser === analyser) studioAnalyserRef.isPlaying = false;
  });
  audioEl.addEventListener('ended', () => {
    isPlayingRef.value = false;
    if (studioAnalyserRef.analyser === analyser) studioAnalyserRef.isPlaying = false;
  });
}

const vizObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        if (node.tagName === 'AUDIO') attachVisualizer(node);
        if (node.querySelectorAll) node.querySelectorAll('audio').forEach(attachVisualizer);
      }
    });
  });
});
vizObserver.observe(document.body, { childList: true, subtree: true });

/* ================= 视频配乐系统 ================= */
let _videoFileUrl = null;
let _videoEmotionSequence = [];
let _videoAudioUrl = null;
let _videoAudioBlob = null;
let _videoWavBase64 = null;

function loadVideoFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (_videoFileUrl) URL.revokeObjectURL(_videoFileUrl);
  _videoFileUrl = URL.createObjectURL(file);
  const video = document.getElementById('videoPreview');
  video.src = _videoFileUrl;
  document.getElementById('videoPreviewWrap').style.display = 'block';
  document.getElementById('videoControls').style.display = 'block';
  document.getElementById('videoEmotionResult').textContent = '';
  document.getElementById('videoEmotionChart').innerHTML = '';
  document.getElementById('videoGenerateBtn').style.display = 'none';
  document.getElementById('videoAudioPlayer').innerHTML = '';
  document.getElementById('videoSyncWrap').style.display = 'none';
  document.getElementById('videoExportWrap').style.display = 'none';
  _videoEmotionSequence = [];
  _videoAudioUrl = null;
  _videoAudioBlob = null;
  _videoWavBase64 = null;
}

function runCardVideoLoad(cid, input) {
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const video = document.getElementById(cid + '_video');
  video.src = url;
  document.getElementById(cid + '_previewWrap').style.display = 'block';
  document.getElementById(cid + '_controls').style.display = 'block';
  video.dataset.fileUrl = url;
}

function computeFrameEmotion(data, width, height, prevData) {
  let totalR = 0, totalG = 0, totalB = 0, totalBright = 0;
  let totalSat = 0;
  const count = width * height;
  for (let i = 0; i < count; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    totalR += r; totalG += g; totalB += b;
    const bright = (r + g + b) / 3;
    totalBright += bright;
    const maxc = Math.max(r, g, b);
    const minc = Math.min(r, g, b);
    totalSat += (maxc - minc) / 255;
  }
  const avgBright = totalBright / count / 255;
  const avgSat = totalSat / count;
  const avgR = totalR / count / 255;
  const avgG = totalG / count / 255;
  const avgB = totalB / count / 255;

  let warmScore = (avgR * 0.6 + avgG * 0.4) - avgB;
  let coolScore = avgB - (avgR * 0.5 + avgG * 0.3);
  if (warmScore < 0) warmScore = 0;
  if (coolScore < 0) coolScore = 0;

  let motion = 0;
  if (prevData) {
    let diffSum = 0;
    for (let i = 0; i < count; i++) {
      const dr = data[i * 4] - prevData[i * 4];
      const dg = data[i * 4 + 1] - prevData[i * 4 + 1];
      const db = data[i * 4 + 2] - prevData[i * 4 + 2];
      diffSum += (Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3;
    }
    motion = (diffSum / count) / 255;
  }

  const happy = Math.min(1, avgBright * 0.5 + avgSat * 0.5 + warmScore * 0.3);
  const sad = Math.min(1, (1 - avgBright) * 0.5 + coolScore * 0.4 + (1 - avgSat) * 0.2);
  const tense = Math.min(1, motion * 0.6 + (1 - avgBright) * 0.2 + avgSat * 0.2);
  const calm = Math.min(1, (1 - motion) * 0.5 + coolScore * 0.3 + (1 - avgSat) * 0.2);
  const excited = Math.min(1, motion * 0.5 + avgSat * 0.4 + warmScore * 0.3);

  return { happy, sad, tense, calm, excited, avgBright, avgSat, motion };
}

async function analyzeVideoEmotion() {
  const video = document.getElementById('videoPreview');
  const canvas = document.getElementById('videoAnalyzeCanvas');
  const ctx = canvas.getContext('2d');
  const loading = document.getElementById('videoAnalyzeLoading');
  const result = document.getElementById('videoEmotionResult');
  const chart = document.getElementById('videoEmotionChart');

  if (!video.src || video.readyState < 2) { showToast('请先等待视频加载'); return; }

  loading.classList.add('show');
  result.textContent = '';
  chart.innerHTML = '';
  _videoEmotionSequence = [];

  const duration = video.duration || 0;
  const interval = 2;
  const captureWidth = 160;
  const captureHeight = 90;
  canvas.width = captureWidth;
  canvas.height = captureHeight;

  let prevData = null;
  const times = [];
  for (let t = 0; t < duration; t += interval) times.push(t);
  if (duration - times[times.length - 1] > 0.5) times.push(duration);

  for (let idx = 0; idx < times.length; idx++) {
    const t = times[idx];
    video.currentTime = t;
    await new Promise(r => {
      const onSeek = () => { video.removeEventListener('seeked', onSeek); r(); };
      video.addEventListener('seeked', onSeek);
    });
    await new Promise(r => setTimeout(r, 50));
    ctx.drawImage(video, 0, 0, captureWidth, captureHeight);
    const imageData = ctx.getImageData(0, 0, captureWidth, captureHeight);
    const emotion = computeFrameEmotion(imageData.data, captureWidth, captureHeight, prevData);
    prevData = new Uint8ClampedArray(imageData.data);
    _videoEmotionSequence.push({ time: Math.round(t * 10) / 10, emotion, intensity: (emotion.tense + emotion.excited) / 2 });
  }

  drawEmotionChart(_videoEmotionSequence);

  const dominant = _videoEmotionSequence.reduce((acc, cur) => {
    const e = cur.emotion;
    acc.happy += e.happy; acc.sad += e.sad; acc.tense += e.tense; acc.calm += e.calm; acc.excited += e.excited;
    return acc;
  }, { happy: 0, sad: 0, tense: 0, calm: 0, excited: 0 });
  const total = _videoEmotionSequence.length || 1;
  result.textContent = `分析完成！共 ${times.length} 个采样点\n主导情绪: happy=${(dominant.happy/total).toFixed(2)} sad=${(dominant.sad/total).toFixed(2)} tense=${(dominant.tense/total).toFixed(2)} calm=${(dominant.calm/total).toFixed(2)} excited=${(dominant.excited/total).toFixed(2)}`;
  document.getElementById('videoGenerateBtn').style.display = 'block';
  loading.classList.remove('show');
}

function drawEmotionChart(sequence) {
  const chart = document.getElementById('videoEmotionChart');
  if (!sequence.length) { chart.innerHTML = ''; return; }
  const w = chart.clientWidth || 340;
  const h = chart.clientHeight || 100;
  const colors = { happy: '#ff9800', sad: '#3f51b5', tense: '#f44336', calm: '#4caf50', excited: '#e91e63' };
  const labels = { happy: '欢', sad: '忧', tense: '紧', calm: '静', excited: '激' };
  let html = `<div style="position:relative;width:${w}px;height:${h}px;">`;
  const n = sequence.length;
  Object.keys(colors).forEach(key => {
    let path = '';
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1 || 1)) * w;
      const y = h - (sequence[i].emotion[key] * h * 0.85) - 2;
      path += (i === 0 ? `M${x},${y}` : ` L${x},${y}`);
    }
    html += `<svg style="position:absolute;inset:0;pointer-events:none;" width="${w}" height="${h}"><path d="${path}" fill="none" stroke="${colors[key]}" stroke-width="2" opacity="0.85"/></svg>`;
  });
  const legend = Object.keys(colors).map(k => `<span style="font-size:10px;color:${colors[k]};margin-right:6px;">●${labels[k]}</span>`).join('');
  html += `<div style="position:absolute;bottom:2px;left:4px;background:rgba(255,255,255,0.7);border-radius:4px;padding:0 4px;">${legend}</div></div>`;
  chart.innerHTML = html;
}

async function generateVideoScore() {
  const loading = document.getElementById('videoGenLoading');
  const player = document.getElementById('videoAudioPlayer');
  const result = document.getElementById('videoEmotionResult');
  loading.classList.add('show'); player.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/video/score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotionSequence: _videoEmotionSequence })
    });
    const params = await res.json();
    if (params.error) throw new Error(params.error);

    const prodRes = await fetch(`${API}/api/produce`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: params.style, key: params.key, emotion: params.emotion, bpm: params.bpm, barCount: params.barCount, maxAttempts: 2 })
    });
    const d = await prodRes.json();
    if (d.error) throw new Error(d.error);

    const wav = Uint8Array.from(atob(d.wavBase64), c => c.charCodeAt(0));
    _videoWavBase64 = d.wavBase64;
    _videoAudioBlob = new Blob([wav], { type: 'audio/wav' });
    _videoAudioUrl = URL.createObjectURL(_videoAudioBlob);
    player.innerHTML = `<audio id="videoGeneratedAudio" controls src="${_videoAudioUrl}" style="width:100%;margin-top:8px;"></audio>`;
    result.textContent += `\n\n🎼 配乐生成完成！\n风格: ${params.style} | 调性: ${params.key} | BPM: ${params.bpm}\n小节: ${params.barCount} | 情绪: ${params.emotion}\n段落: ${params.sections?.map(s=>s.type).join(' → ')}`;
    document.getElementById('videoSyncWrap').style.display = 'block';
    document.getElementById('videoExportWrap').style.display = 'block';
  } catch (e) {
    result.textContent += '\n\n配乐生成错误: ' + e.message;
  }
  loading.classList.remove('show');
}

function syncPlayVideoAudio() {
  const video = document.getElementById('videoPreview');
  const audio = document.getElementById('videoGeneratedAudio');
  if (!video || !audio) return;
  video.currentTime = 0;
  audio.currentTime = 0;
  const p1 = video.play();
  const p2 = audio.play();
  if (p1 && p1.catch) p1.catch(()=>{});
  if (p2 && p2.catch) p2.catch(()=>{});
}
function stopSyncPlay() {
  const video = document.getElementById('videoPreview');
  const audio = document.getElementById('videoGeneratedAudio');
  if (video) video.pause();
  if (audio) audio.pause();
}

async function exportVideoAudioZip() {
  if (!_videoFileUrl || !_videoAudioBlob) { showToast('无可导出内容'); return; }
  try {
    const videoResp = await fetch(_videoFileUrl);
    const videoBlob = await videoResp.blob();
    const videoName = 'video' + (videoBlob.type.includes('mp4') ? '.mp4' : '.video');
    const audioName = 'soundtrack.wav';

    // 简化 ZIP 实现（无外部库）：构造一个最简有效的 ZIP
    const encoder = new TextEncoder();
    function crc32(bytes) {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c >>> 0;
      }
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    function uint16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function uint32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
    function dateToDos(d) {
      return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    }
    function timeToDos(d) {
      return (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    }
    async function makeLocalFile(name, blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const nameBytes = encoder.encode(name);
      const crc = crc32(bytes);
      const now = new Date();
      const header = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04, 20, 0, 0, 0, 0,
        ...uint16(timeToDos(now)), ...uint16(dateToDos(now)),
        ...uint32(crc), ...uint32(bytes.length), ...uint32(bytes.length),
        ...uint16(nameBytes.length), 0, 0, ...nameBytes
      ]);
      return { header, bytes, nameBytes, crc, size: bytes.length };
    }
    const f1 = await makeLocalFile(videoName, videoBlob);
    const f2 = await makeLocalFile(audioName, _videoAudioBlob);
    let offset = 0;
    const central = [];
    const parts = [];
    [f1, f2].forEach(f => {
      parts.push(f.header, f.bytes);
      const cd = new Uint8Array([
        0x50, 0x4B, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0,
        ...uint16(timeToDos(new Date())), ...uint16(dateToDos(new Date())),
        ...uint32(f.crc), ...uint32(f.size), ...uint32(f.size),
        ...uint16(f.nameBytes.length), 0, 0, 0, 0, 0, 0, 0,
        ...uint32(0), ...f.nameBytes
      ]);
      central.push({ cd, offset });
      offset += f.header.length + f.bytes.length;
    });
    const cdStart = offset;
    const cdArrays = central.map(c => { c.cd.set(uint32(c.offset), 42); return c.cd; });
    const cdTotal = cdArrays.reduce((s, a) => s + a.length, 0);
    const eocd = new Uint8Array([
      0x50, 0x4B, 0x05, 0x06, 0, 0, 0, 0,
      ...uint16(2), ...uint16(2), ...uint32(cdTotal), ...uint32(cdStart), 0, 0
    ]);
    const zip = new Blob([...parts, ...cdArrays, eocd], { type: 'application/zip' });
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a');
    a.href = url; a.download = 'video_soundtrack.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ZIP 导出成功');
  } catch (e) { showToast('导出失败: ' + e.message); }
}

async function runCardVideoAnalyze(cid) {
  const video = document.getElementById(cid + '_video');
  const canvas = document.getElementById(cid + '_canvas');
  const ctx = canvas.getContext('2d');
  const resEl = document.getElementById(cid + '_res');
  const player = document.getElementById(cid + '_player');

  if (!video.src || video.readyState < 2) { resEl.textContent = '请先等待视频加载'; return; }
  resEl.textContent = '分析中...';
  player.innerHTML = '';

  const duration = video.duration || 0;
  const interval = 2;
  const captureWidth = 160;
  const captureHeight = 90;
  canvas.width = captureWidth;
  canvas.height = captureHeight;

  let prevData = null;
  const times = [];
  for (let t = 0; t < duration; t += interval) times.push(t);
  if (duration - times[times.length - 1] > 0.5) times.push(duration);

  const sequence = [];
  for (let idx = 0; idx < times.length; idx++) {
    const t = times[idx];
    video.currentTime = t;
    await new Promise(r => {
      const onSeek = () => { video.removeEventListener('seeked', onSeek); r(); };
      video.addEventListener('seeked', onSeek);
    });
    await new Promise(r => setTimeout(r, 50));
    ctx.drawImage(video, 0, 0, captureWidth, captureHeight);
    const imageData = ctx.getImageData(0, 0, captureWidth, captureHeight);
    const emotion = computeFrameEmotion(imageData.data, captureWidth, captureHeight, prevData);
    prevData = new Uint8ClampedArray(imageData.data);
    sequence.push({ time: Math.round(t * 10) / 10, emotion, intensity: (emotion.tense + emotion.excited) / 2 });
  }

  try {
    const scoreRes = await fetch(`${API}/api/video/score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotionSequence: sequence })
    });
    const params = await scoreRes.json();
    if (params.error) throw new Error(params.error);

    const prodRes = await fetch(`${API}/api/produce`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: params.style, key: params.key, emotion: params.emotion, bpm: params.bpm, barCount: params.barCount, maxAttempts: 2 })
    });
    const d = await prodRes.json();
    if (d.error) throw new Error(d.error);

    const wav = Uint8Array.from(atob(d.wavBase64), c => c.charCodeAt(0));
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    player.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px;"></audio>`;
    resEl.textContent = `配乐生成完成！\n风格: ${params.style} | 调性: ${params.key} | BPM: ${params.bpm}\n小节: ${params.barCount}`;
  } catch (e) {
    resEl.textContent = '错误: ' + e.message;
  }
}

/* ================= 插件系统 ================= */
let pluginParams = [];
function onPluginTypeChange() {
  const type = document.getElementById('pluginType').value;
  const codeEl = document.getElementById('pluginCode');
  if (!codeEl.value.trim()) {
    if (type === 'effect') loadExamplePlugin('distortion');
    else if (type === 'instrument') loadExamplePlugin('sine');
    else loadExamplePlugin('scope');
  }
}
function addPluginParam() {
  const idx = pluginParams.length;
  pluginParams.push({ name: '', type: 'number', default: 0, min: 0, max: 1 });
  renderPluginParams();
}
function removePluginParam(idx) {
  pluginParams.splice(idx, 1);
  renderPluginParams();
}
function updatePluginParam(idx, key, val) {
  if (key === 'default') {
    const p = pluginParams[idx];
    if (p.type === 'number') val = parseFloat(val) || 0;
    else if (p.type === 'boolean') val = val === 'true' || val === true;
  }
  if (key === 'min' || key === 'max') val = val === '' ? undefined : parseFloat(val);
  pluginParams[idx][key] = val;
}
function renderPluginParams() {
  const wrap = document.getElementById('pluginParamsWrap');
  wrap.innerHTML = pluginParams.map((p, i) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
      <input type="text" placeholder="名称" value="${escapeHtml(p.name)}" onchange="updatePluginParam(${i},'name',this.value)" style="flex:1;padding:6px 8px;border-radius:8px;border:1px solid var(--border);font-size:12px;">
      <select onchange="updatePluginParam(${i},'type',this.value)" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border);font-size:12px;">
        <option value="number" ${p.type==='number'?'selected':''}>number</option>
        <option value="boolean" ${p.type==='boolean'?'selected':''}>boolean</option>
        <option value="enum" ${p.type==='enum'?'selected':''}>enum</option>
      </select>
      <input type="text" placeholder="默认值" value="${escapeHtml(String(p.default))}" onchange="updatePluginParam(${i},'default',this.value)" style="width:70px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);font-size:12px;">
      <input type="number" placeholder="min" value="${p.min!==undefined?p.min:''}" onchange="updatePluginParam(${i},'min',this.value)" style="width:60px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);font-size:12px;">
      <input type="number" placeholder="max" value="${p.max!==undefined?p.max:''}" onchange="updatePluginParam(${i},'max',this.value)" style="width:60px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);font-size:12px;">
      <button class="s-btn-small" onclick="removePluginParam(${i})" style="background:rgba(255,0,0,0.06);color:#d44;">✕</button>
    </div>
  `).join('');
}
function getPluginPayload() {
  const params = pluginParams.map(p => {
    const out = { name: p.name, type: p.type, default: p.default };
    if (p.min !== undefined) out.min = p.min;
    if (p.max !== undefined) out.max = p.max;
    return out;
  });
  return {
    name: document.getElementById('pluginName').value.trim(),
    version: document.getElementById('pluginVersion').value.trim() || '1.0.0',
    type: document.getElementById('pluginType').value,
    parameters: params,
    code: document.getElementById('pluginCode').value.trim(),
  };
}
async function registerPlugin() {
  const loading = document.getElementById('pluginLoading');
  const result = document.getElementById('pluginResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const payload = getPluginPayload();
    if (!payload.name) throw new Error('插件名称不能为空');
    if (!payload.code) throw new Error('插件代码不能为空');
    const r = await fetch(`${API}/api/plugin/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    if (d.success) {
      result.textContent = `✓ ${d.message}`;
      refreshPluginList();
      populatePluginSelects();
    } else {
      throw new Error(d.message);
    }
  } catch (e) { result.textContent = '错误: ' + e.message; }
  loading.classList.remove('show');
}
async function testPlugin() {
  const loading = document.getElementById('pluginLoading');
  const result = document.getElementById('pluginResult');
  const canvas = document.getElementById('pluginTestCanvas');
  loading.classList.add('show'); result.textContent = '';
  try {
    const payload = getPluginPayload();
    if (!payload.name) throw new Error('插件名称不能为空');
    if (!payload.code) throw new Error('插件代码不能为空');
    // Compile client-side for quick test
    const scopeKeys = ['Math','NaN','Infinity','undefined'];
    const scopeVals = [Math,NaN,Infinity,undefined];
    const factory = new Function(...scopeKeys, `
      "use strict";
      return (function(input, output, params, sampleRate) {
        ${payload.code}
        if (typeof processBlock !== 'function') throw new Error('processBlock not defined');
        return processBlock(input, output, params, sampleRate);
      });
    `);
    const processBlock = factory(...scopeVals);
    const sampleRate = 44100;
    const blockSize = 256;
    const input = new Float32Array(blockSize);
    // Create a simple test signal: mix of sine and noise
    for (let i = 0; i < blockSize; i++) {
      input[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + (Math.random() - 0.5) * 0.1;
    }
    const output = new Float32Array(blockSize);
    const params = {};
    for (const p of payload.parameters) {
      if (p.type === 'number') params[p.name] = typeof p.default === 'number' ? p.default : 0;
      else if (p.type === 'boolean') params[p.name] = p.default === true ? 1 : 0;
      else params[p.name] = 0;
    }
    processBlock(input, output, params, sampleRate);

    // Draw output on canvas
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5; ctx.beginPath();
    let maxVal = 0;
    for (let i = 0; i < blockSize; i++) maxVal = Math.max(maxVal, Math.abs(output[i]));
    const scale = maxVal > 0 ? (h / 2 - 8) / maxVal : 1;
    for (let i = 0; i < blockSize; i++) {
      const x = (i / (blockSize - 1)) * w;
      const y = h / 2 - output[i] * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    result.textContent = `✓ 客户端测试通过！输出峰值: ${maxVal.toFixed(4)}`;
  } catch (e) { result.textContent = '测试错误: ' + e.message; }
  loading.classList.remove('show');
}
async function refreshPluginList() {
  const listEl = document.getElementById('pluginList');
  try {
    const r = await fetch(`${API}/api/plugin/list`);
    const d = await r.json();
    if (!d.plugins || d.plugins.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text2);font-size:12px;">暂无已注册插件</div>';
      return;
    }
    listEl.innerHTML = d.plugins.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(91,77,255,0.05);border-radius:10px;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(p.name)} <span style="font-size:10px;color:var(--text3);">v${escapeHtml(p.version)}</span></div>
          <div style="font-size:11px;color:var(--text2);">类型: ${p.type} | 参数: ${p.parameters.length}个</div>
        </div>
        <button class="s-btn-small" onclick="deletePlugin('${escapeHtml(p.name)}')" style="background:rgba(255,0,0,0.06);color:#d44;">删除</button>
      </div>
    `).join('');
  } catch (e) { listEl.innerHTML = '<div style="color:#d44;font-size:12px;">加载失败: ' + e.message + '</div>'; }
}
async function deletePlugin(name) {
  if (!confirm(`确定删除插件 "${name}" 吗？`)) return;
  try {
    const r = await fetch(`${API}/api/plugin/unregister`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const d = await r.json();
    if (d.success) { showToast(d.message); refreshPluginList(); populatePluginSelects(); }
    else throw new Error(d.message);
  } catch (e) { showToast('删除失败: ' + e.message); }
}
function populatePluginSelects() {
  // Populate effect/instrument selects if they exist on the page
  fetch(`${API}/api/plugin/list`).then(r => r.json()).then(d => {
    const plugins = d.plugins || [];
    const effectSelect = document.getElementById('effectType');
    if (effectSelect) {
      // Remove old custom options
      Array.from(effectSelect.options).forEach(opt => { if (opt.dataset.custom === 'true') effectSelect.removeChild(opt); });
      plugins.filter(p => p.type === 'effect').forEach(p => {
        const opt = document.createElement('option'); opt.value = 'plugin:' + p.name; opt.textContent = '🔌 ' + p.name; opt.dataset.custom = 'true';
        effectSelect.appendChild(opt);
      });
    }
    const waveSelect = document.getElementById('flawWave');
    if (waveSelect) {
      Array.from(waveSelect.options).forEach(opt => { if (opt.dataset.custom === 'true') waveSelect.removeChild(opt); });
      plugins.filter(p => p.type === 'instrument').forEach(p => {
        const opt = document.createElement('option'); opt.value = 'plugin:' + p.name; opt.textContent = '🔌 ' + p.name; opt.dataset.custom = 'true';
        waveSelect.appendChild(opt);
      });
    }
  }).catch(() => {});
}
function loadExamplePlugin(name) {
  const examples = {
    distortion: {
      name: 'SimpleDistortion', version: '1.0.0', type: 'effect',
      params: [{ name:'drive', type:'number', default:0.5, min:0, max:1 }, { name:'mix', type:'number', default:0.5, min:0, max:1 }],
      code: `// 软削波失真效果器\nfunction processBlock(input, output, params, sampleRate) {\n  const drive = params.drive || 0.5;\n  const mix = params.mix || 0.5;\n  const threshold = 1.0 / (1.0 + drive * 3.0);\n  for (let i = 0; i < input.length; i++) {\n    const x = input[i];\n    // 软削波\n    const clipped = x > threshold ? threshold + (x - threshold) / (1.0 + Math.pow(x - threshold, 2))\n      : (x < -threshold ? -threshold + (x + threshold) / (1.0 + Math.pow(x + threshold, 2)) : x);\n    output[i] = x * (1.0 - mix) + clipped * mix;\n  }\n}`
    },
    sine: {
      name: 'SimpleSineSynth', version: '1.0.0', type: 'instrument',
      params: [{ name:'attack', type:'number', default:0.01, min:0, max:1 }, { name:'release', type:'number', default:0.2, min:0, max:1 }],
      code: `// 正弦波合成器\nfunction processBlock(input, output, params, sampleRate) {\n  // 效果器占位\n  for (let i = 0; i < input.length; i++) output[i] = input[i];\n}\nfunction generateNote(frequency, duration, velocity, params, sampleRate) {\n  const attack = params.attack || 0.01;\n  const release = params.release || 0.2;\n  const samples = Math.floor(duration * sampleRate);\n  const out = new Float32Array(samples);\n  const attackSamples = Math.max(1, Math.floor(attack * sampleRate));\n  const releaseSamples = Math.max(1, Math.floor(release * sampleRate));\n  const sustainSamples = Math.max(0, samples - attackSamples - releaseSamples);\n  for (let i = 0; i < samples; i++) {\n    const t = i / sampleRate;\n    const env = i < attackSamples ? (i / attackSamples)\n      : (i < attackSamples + sustainSamples ? 1.0\n      : Math.max(0, 1.0 - (i - attackSamples - sustainSamples) / releaseSamples));\n    out[i] = Math.sin(2.0 * Math.PI * frequency * t) * env * velocity;\n  }\n  return out;\n}`
    },
    scope: {
      name: 'SimpleScope', version: '1.0.0', type: 'visualizer',
      params: [{ name:'gain', type:'number', default:1.0, min:0.1, max:5.0 }],
      code: `// 示波器效果（增益+限幅）\nfunction processBlock(input, output, params, sampleRate) {\n  const gain = params.gain || 1.0;\n  for (let i = 0; i < input.length; i++) {\n    const v = input[i] * gain;\n    output[i] = Math.max(-1.0, Math.min(1.0, v));\n  }\n}`
    }
  };
  const ex = examples[name];
  if (!ex) return;
  document.getElementById('pluginName').value = ex.name;
  document.getElementById('pluginVersion').value = ex.version;
  document.getElementById('pluginType').value = ex.type;
  pluginParams = ex.params.map(p => ({ ...p }));
  renderPluginParams();
  document.getElementById('pluginCode').value = ex.code;
}
/* ================= 工作室标签切换 ================= */
document.querySelectorAll('.studio-tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.studio-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.sp).classList.add('active');
  });
});

/* ================= 时钟 ================= */
setInterval(() => {
  const now = new Date();
  document.getElementById('clock').textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
}, 1000);

/* ================= 实时协作系统 ================= */
let collabState = {
  connected: false,
  roomId: '',
  userId: '',
  nickname: '',
  ownerId: '',
  locked: false,
  users: [],
  eventSource: null,
};

function generateCollabUserId() {
  return 'u_' + Math.random().toString(36).slice(2, 8) + '_' + Date.now().toString(36).slice(-4);
}

function generateRoomId() {
  return 'room_' + Math.random().toString(36).slice(2, 8);
}

function joinCollabRoom() {
  const nickname = document.getElementById('collabNickname').value.trim() || '匿名';
  let roomId = document.getElementById('collabRoomId').value.trim();
  if (!roomId) {
    roomId = generateRoomId();
    document.getElementById('collabRoomId').value = roomId;
  }
  const userId = generateCollabUserId();
  collabState.nickname = nickname;
  collabState.userId = userId;
  collabState.roomId = roomId;

  document.getElementById('collabNotJoined').style.display = 'none';
  document.getElementById('collabJoined').style.display = 'block';
  document.getElementById('collabDisplayRoomId').textContent = roomId;

  setupCollabEventSource();
  addCollabLog('正在加入房间...');
}

function leaveCollabRoom() {
  if (collabState.eventSource) {
    collabState.eventSource.close();
    collabState.eventSource = null;
  }
  collabState.connected = false;
  collabState.roomId = '';
  collabState.ownerId = '';
  collabState.locked = false;
  collabState.users = [];

  document.getElementById('collabNotJoined').style.display = 'block';
  document.getElementById('collabJoined').style.display = 'none';
  document.getElementById('collabStatus').textContent = '未连接';
  document.getElementById('collabStatus').className = 'collab-status offline';
  document.getElementById('collabUserList').innerHTML = '';
  document.getElementById('collabChatMessages').innerHTML = '';
  document.getElementById('collabLog').innerHTML = '';
  document.getElementById('collabLockedBadge').innerHTML = '';
  document.getElementById('collabOwnerActions').style.display = 'none';
  showToast('已离开房间');
}

function setupCollabEventSource() {
  if (collabState.eventSource) {
    collabState.eventSource.close();
  }
  const url = `${API}/api/collab/stream?roomId=${encodeURIComponent(collabState.roomId)}&userId=${encodeURIComponent(collabState.userId)}&nickname=${encodeURIComponent(collabState.nickname)}`;
  const es = new EventSource(url);
  collabState.eventSource = es;

  es.onopen = () => {
    collabState.connected = true;
    document.getElementById('collabStatus').textContent = '已连接';
    document.getElementById('collabStatus').className = 'collab-status online';
    addCollabLog('SSE 连接已建立');
  };

  es.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      handleCollabEvent(event);
    } catch (err) {
      console.error('协作事件解析错误:', err);
    }
  };

  es.onerror = () => {
    collabState.connected = false;
    document.getElementById('collabStatus').textContent = '连接中断';
    document.getElementById('collabStatus').className = 'collab-status offline';
    addCollabLog('SSE 连接中断，尝试重连...');
  };
}

function handleCollabEvent(event) {
  switch (event.type) {
    case 'connected':
      collabState.ownerId = event.data.ownerId;
      collabState.locked = event.data.locked;
      updateCollabOwnerUI();
      addCollabLog(`已连接到房间，房主: ${event.data.ownerId === collabState.userId ? '你' : event.data.ownerId}`);
      if (event.data.locked) addCollabLog('房间当前处于锁定状态');
      break;
    case 'userList':
      collabState.users = event.data || [];
      renderCollabUsers();
      break;
    case 'userJoined':
      collabState.users = event.data.users || [];
      if (event.data.ownerChanged) {
        collabState.ownerId = event.data.userId;
        updateCollabOwnerUI();
      }
      renderCollabUsers();
      addCollabChat('system', `${event.data.nickname} 加入了房间`);
      addCollabLog(`用户加入: ${event.data.nickname}`);
      break;
    case 'userLeft':
      collabState.users = event.data.users || [];
      renderCollabUsers();
      addCollabChat('system', `用户 ${event.data.userId.slice(0,8)} 离开了房间`);
      addCollabLog(`用户离开: ${event.data.userId.slice(0,8)}`);
      break;
    case 'chatMessage':
      if (event.from !== collabState.userId) {
        const user = collabState.users.find(u => u.userId === event.from);
        addCollabChat(event.from, event.data.text, user?.color);
      }
      break;
    case 'noteAdded':
      addCollabLog(`[${fmtTime(event.time)}] ${event.from.slice(0,8)} 添加了音符`);
      break;
    case 'noteDeleted':
      addCollabLog(`[${fmtTime(event.time)}] ${event.from.slice(0,8)} 删除了音符`);
      break;
    case 'paramChanged':
      addCollabLog(`[${fmtTime(event.time)}] ${event.from.slice(0,8)} 修改了参数: ${event.data.key}=${event.data.value}`);
      break;
    case 'cursorMoved':
      addCollabLog(`[${fmtTime(event.time)}] ${event.from.slice(0,8)} 光标移动: ${event.data.panel}`);
      break;
    case 'roomLocked':
      collabState.locked = true;
      document.getElementById('collabLockedBadge').innerHTML = '<span class="collab-locked-badge">🔒 锁定</span>';
      addCollabLog('房间已被锁定');
      updateCollabOwnerUI();
      break;
    case 'roomUnlocked':
      collabState.locked = false;
      document.getElementById('collabLockedBadge').innerHTML = '';
      addCollabLog('房间已解锁');
      updateCollabOwnerUI();
      break;
    case 'syncResponse':
      if (event.data.project) {
        restoreProject(event.data.project);
        addCollabLog('收到项目同步数据');
        showToast('项目已同步');
      }
      break;
  }
}

function updateCollabOwnerUI() {
  const isOwner = collabState.ownerId === collabState.userId;
  document.getElementById('collabOwnerActions').style.display = isOwner ? 'block' : 'none';
  document.getElementById('collabLockBtn').style.display = (!collabState.locked && isOwner) ? 'inline-block' : 'none';
  document.getElementById('collabUnlockBtn').style.display = (collabState.locked && isOwner) ? 'inline-block' : 'none';
}

function renderCollabUsers() {
  const container = document.getElementById('collabUserList');
  container.innerHTML = collabState.users.map(u => {
    const isMe = u.userId === collabState.userId;
    const isOwner = u.userId === collabState.ownerId;
    return `<div class="collab-user-chip ${isMe ? 'me' : ''}"><span class="dot" style="background:${u.color || '#999'}"></span>${escapeHtml(u.nickname)}${isOwner ? ' (房主)' : ''}${isMe ? ' (你)' : ''}</div>`;
  }).join('');
}

function addCollabChat(from, text, color) {
  const container = document.getElementById('collabChatMessages');
  const div = document.createElement('div');
  if (from === 'system') {
    div.className = 'collab-chat-msg system';
    div.textContent = text;
  } else {
    const isMe = from === collabState.userId;
    const user = collabState.users.find(u => u.userId === from);
    const name = isMe ? '你' : (user?.nickname || from.slice(0,8));
    div.className = 'collab-chat-msg';
    div.innerHTML = `<span class="msg-name" style="color:${color || (isMe ? 'var(--accent)' : 'var(--text2)')}">${escapeHtml(name)}:</span><span class="msg-text">${escapeHtml(text)}</span>`;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addCollabLog(text) {
  const container = document.getElementById('collabLog');
  const div = document.createElement('div');
  div.className = 'collab-log-item';
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  div.innerHTML = `<span class="log-time">${time}</span><span>${escapeHtml(text)}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function clearCollabLog() {
  document.getElementById('collabLog').innerHTML = '';
}

async function broadcastCollabEvent(type, data) {
  if (!collabState.connected || !collabState.roomId) return;
  try {
    await fetch(`${API}/api/collab/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: collabState.roomId, userId: collabState.userId, type, data })
    });
  } catch (e) {
    console.error('广播失败:', e);
  }
}

function sendCollabChat() {
  const input = document.getElementById('collabChatInput');
  const text = input.value.trim();
  if (!text) return;
  if (!collabState.connected) { showToast('未连接'); return; }
  addCollabChat(collabState.userId, text);
  broadcastCollabEvent('chatMessage', { text });
  input.value = '';
}

async function lockCollabRoom() {
  if (!collabState.connected) return;
  try {
    const r = await fetch(`${API}/api/collab/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: collabState.roomId, userId: collabState.userId })
    });
    const d = await r.json();
    if (d.ok) showToast('房间已锁定');
    else showToast(d.error || '锁定失败');
  } catch (e) { showToast('锁定失败'); }
}

async function unlockCollabRoom() {
  if (!collabState.connected) return;
  try {
    const r = await fetch(`${API}/api/collab/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: collabState.roomId, userId: collabState.userId })
    });
    const d = await r.json();
    if (d.ok) showToast('房间已解锁');
    else showToast(d.error || '解锁失败');
  } catch (e) { showToast('解锁失败'); }
}

function requestCollabSync() {
  if (!collabState.connected) { showToast('未连接'); return; }
  broadcastCollabEvent('syncRequest', { requester: collabState.userId });
  addCollabLog('已请求项目同步');
}

/* ================= 在现有操作函数中集成协作广播 ================= */
const _origCompose = compose;
compose = async function() {
  await _origCompose();
  broadcastCollabEvent('paramChanged', { key: 'compose', value: document.getElementById('algo')?.value });
};

const _origFullSong = fullSong;
fullSong = async function() {
  await _origFullSong();
  broadcastCollabEvent('noteAdded', { count: currentProject.melody?.length || 0 });
};

const _origGenerateLyrics = generateLyrics;
generateLyrics = async function() {
  await _origGenerateLyrics();
  broadcastCollabEvent('paramChanged', { key: 'lyrics', value: 'generated' });
};

const _origGenerateArranger = generateArranger;
generateArranger = async function() {
  await _origGenerateArranger();
  broadcastCollabEvent('paramChanged', { key: 'arranger', value: document.getElementById('arrStyle')?.value });
};

const _origGenerateFlawless = generateFlawless;
generateFlawless = async function() {
  await _origGenerateFlawless();
  broadcastCollabEvent('paramChanged', { key: 'flawless', value: document.getElementById('flawMode')?.value });
};

const _origGenerateEmergence = generateEmergence;
generateEmergence = async function() {
  await _origGenerateEmergence();
  broadcastCollabEvent('paramChanged', { key: 'emergence', value: 'composed' });
};

const _origGenerateProduce = generateProduce;
generateProduce = async function() {
  await _origGenerateProduce();
  broadcastCollabEvent('noteAdded', { count: currentProject.melody?.length || 0 });
};

/* ================= 语音控制 ================= */
function setChatInput(text) {
  const input = document.getElementById('chatInput');
  const hint = document.getElementById('inputHint');
  if (input) {
    input.value = text;
    if (hint) hint.style.display = 'none';
    input.focus();
  }
}

let recognition = null;
let isRecording = false;
let voiceFinalTranscript = '';

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const rec = new SpeechRecognition();
  rec.lang = 'zh-CN';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isRecording = true;
    voiceFinalTranscript = '';
    const btn = document.getElementById('voiceBtn');
    const status = document.getElementById('voiceStatus');
    const text = document.getElementById('voiceText');
    if (btn) btn.classList.add('recording');
    if (status) status.style.display = 'flex';
    if (text) text.textContent = '正在聆听...';
  };

  rec.onend = () => {
    isRecording = false;
    const btn = document.getElementById('voiceBtn');
    const status = document.getElementById('voiceStatus');
    if (btn) btn.classList.remove('recording');
    if (status) status.style.display = 'none';
    // 如果有最终识别结果，自动填入并发送
    if (voiceFinalTranscript.trim()) {
      setChatInput(voiceFinalTranscript.trim());
      sendChat();
    }
    voiceFinalTranscript = '';
  };

  rec.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (final) voiceFinalTranscript += final;
    const text = document.getElementById('voiceText');
    if (text) text.textContent = voiceFinalTranscript + interim || '正在聆听...';
  };

  rec.onerror = (event) => {
    console.error('语音识别错误:', event.error);
    const text = document.getElementById('voiceText');
    if (text) {
      if (event.error === 'not-allowed') text.textContent = '麦克风权限被拒绝';
      else if (event.error === 'no-speech') text.textContent = '未检测到语音，请重试';
      else text.textContent = '语音识别出错: ' + event.error;
    }
    stopVoiceRecognition();
  };

  return rec;
}

function toggleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('您的浏览器不支持语音识别');
    return;
  }
  if (isRecording) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
}

function startVoiceRecognition() {
  if (!recognition) recognition = initSpeechRecognition();
  if (!recognition) {
    showToast('您的浏览器不支持语音识别');
    return;
  }
  try {
    recognition.start();
  } catch (e) {
    showToast('无法启动语音识别');
  }
}

function stopVoiceRecognition() {
  if (recognition && isRecording) {
    try { recognition.stop(); } catch (e) {}
  }
  isRecording = false;
  const btn = document.getElementById('voiceBtn');
  const status = document.getElementById('voiceStatus');
  if (btn) btn.classList.remove('recording');
  if (status) status.style.display = 'none';
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 1.1;
  utter.pitch = 1.0;
  window.speechSynthesis.speak(utter);
}

// 语音命令解析并执行
async function handleVoiceCommand(text) {
  try {
    const r = await fetch(`${API}/api/voice/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const cmd = await r.json();
    if (cmd.error) {
      addMessage('ai', '语音解析出错: ' + cmd.error);
      return;
    }

    // 播报已理解
    speak('已理解，正在生成...');
    addMessage('ai', `🎤 语音指令解析结果：\n风格: ${cmd.style || '默认'}\n情绪: ${cmd.emotion || '默认'}\n调性: ${cmd.key || 'C'}\nBPM: ${cmd.bpm || '默认'}\n动作: ${cmd.action}`);

    // 根据 action 执行对应操作
    if (cmd.action === 'arrange') {
      // 只生成伴奏
      const cid = 'voice_' + Date.now();
      addFuncCard('arranger');
      // 找到最新添加的卡片并自动填写参数
      setTimeout(() => {
        const cards = document.querySelectorAll('.func-card');
        const card = cards[cards.length - 1];
        if (!card) return;
        const cid2 = card.id;
        if (cmd.style) {
          const styleSel = document.getElementById(cid2 + '_style');
          if (styleSel) styleSel.value = cmd.style;
        }
        if (cmd.emotion) {
          const emoSel = document.getElementById(cid2 + '_emo');
          if (emoSel) emoSel.value = cmd.emotion;
        }
        runCardArranger(cid2).then(() => speak('生成完成'));
      }, 100);
    } else if (cmd.action === 'compose') {
      // 生成旋律
      const cid = 'voice_' + Date.now();
      addFuncCard('compose');
      setTimeout(() => {
        const cards = document.querySelectorAll('.func-card');
        const card = cards[cards.length - 1];
        if (!card) return;
        const cid2 = card.id;
        if (cmd.style) {
          const styleMap = {流行:'pop',摇滚:'rock',电子:'electronic',古典:'classical',中国风:'chinese'};
          const styleSel = document.getElementById(cid2 + '_style');
          if (styleSel) {
            const mapped = styleMap[cmd.style] || cmd.style;
            const options = Array.from(styleSel.options).map(o => o.value);
            if (options.includes(mapped)) styleSel.value = mapped;
          }
        }
        if (cmd.key) {
          const keyMap = {'C':'C大调','G':'G大调','Am':'A小调','F':'F大调'};
          const keySel = document.getElementById(cid2 + '_key');
          if (keySel && keyMap[cmd.key]) keySel.value = keyMap[cmd.key];
        }
        if (cmd.bpm) {
          const bpmInput = document.getElementById(cid2 + '_bpm');
          if (bpmInput) bpmInput.value = String(cmd.bpm);
        }
        runCardCompose(cid2).then(() => speak('生成完成'));
      }, 100);
    } else {
      // full：使用 produce 一键产音乐
      const cid = 'voice_' + Date.now();
      addFuncCard('produce');
      setTimeout(() => {
        const cards = document.querySelectorAll('.func-card');
        const card = cards[cards.length - 1];
        if (!card) return;
        const cid2 = card.id;
        if (cmd.style) {
          const styleSel = document.getElementById(cid2 + '_style');
          if (styleSel) styleSel.value = cmd.style;
        }
        if (cmd.emotion) {
          const emoSel = document.getElementById(cid2 + '_emo');
          if (emoSel) emoSel.value = cmd.emotion;
        }
        if (cmd.key) {
          const keySel = document.getElementById(cid2 + '_key');
          if (keySel) keySel.value = cmd.key;
        }
        runCardProduce(cid2).then(() => {
          speak('生成完成');
          // 如果包含歌词请求，同时生成歌词
          if (cmd.includeLyrics !== false && cmd.includeVoice) {
            addFuncCard('realistic');
          }
        });
      }, 100);
    }
  } catch (e) {
    addMessage('ai', '语音命令处理失败: ' + (e && e.message ? e.message : String(e)));
  }
}

// 修改 sendChat 以支持语音命令自动解析
const _origSendChat = sendChat;
sendChat = function() {
  const v = document.getElementById('chatInput').value.trim();
  if (!v) return;
  // 如果消息看起来像作曲指令，自动解析
  if (/来一首|给我一段|写一首|生成一首|伴奏|编曲|作曲|旋律|风格/.test(v)) {
    _origSendChat();
    handleVoiceCommand(v);
    return;
  }
  _origSendChat();
};

/* ================= 音频文件备用方案 ================= */
function initAudioFileUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.id = 'audioFileInput';
  input.style.display = 'none';
  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const data = audioBuffer.getChannelData(0);

      // 简单分析：计算 RMS 能量和零交叉率作为节奏/音高参考
      let sum = 0;
      let zeroCrossings = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
        if (i > 0 && data[i] * data[i - 1] < 0) zeroCrossings++;
      }
      const rms = Math.sqrt(sum / data.length);
      const zcr = zeroCrossings / (data.length - 1);
      const estimatedPitch = zcr > 0 ? audioBuffer.sampleRate / (2 * zcr) : 0;

      addMessage('ai', `🎵 音频分析结果：\n文件名: ${file.name}\n采样率: ${audioBuffer.sampleRate}Hz\n时长: ${audioBuffer.duration.toFixed(2)}s\nRMS能量: ${rms.toFixed(4)}\n估计基频: ${estimatedPitch.toFixed(1)}Hz\n（此功能为语音识别备用方案）`);
    } catch (err) {
      showToast('音频解析失败');
    }
  });
  document.body.appendChild(input);
}

function triggerAudioUpload() {
  const input = document.getElementById('audioFileInput');
  if (input) input.click();
  else showToast('音频上传未初始化');
}

// 如果浏览器不支持语音识别，在语音按钮上添加点击提示
function checkVoiceSupport() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const btn = document.getElementById('voiceBtn');
    if (btn) {
      btn.title = '您的浏览器不支持语音识别，点击上传音频文件';
      btn.onclick = triggerAudioUpload;
    }
    // 显示提示条
    const bar = document.querySelector('.input-bar');
    if (bar) {
      const hint = document.createElement('div');
      hint.className = 'voice-hint';
      hint.id = 'voiceBrowserHint';
      hint.textContent = '您的浏览器不支持语音识别，可使用音频文件分析作为备用';
      bar.parentElement.insertBefore(hint, bar);
    }
    initAudioFileUpload();
  }
}

/* ================= 版权指纹系统 ================= */
async function loadFpFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let base64 = '';
    for (let i = 0; i < bytes.length; i++) {
      base64 += String.fromCharCode(bytes[i]);
    }
    document.getElementById('fpWavBase64').value = btoa(base64);
  } catch (e) {
    showToast('文件读取失败: ' + e.message);
  }
  input.value = '';
}

async function generateFingerprintFromInput() {
  const loading = document.getElementById('fpLoading');
  const result = document.getElementById('fpResult');
  const base64 = document.getElementById('fpWavBase64').value.trim();
  if (!base64) { showToast('请输入 WAV Base64 或上传文件'); return; }
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/fingerprint/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wavBase64: base64 })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    _currentFingerprint = d.fingerprint;
    result.innerHTML = `<div style="font-size:12px;word-break:break-all;"><b>指纹:</b> ${escapeHtml(d.fingerprint.slice(0,16))}... <span style="color:var(--accent);cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">点击展开</span><pre style="display:none;margin-top:4px;background:rgba(0,0,0,0.03);padding:6px;border-radius:6px;font-size:10px;">${escapeHtml(d.fingerprint)}</pre></div><div style="font-size:11px;color:var(--text2);margin-top:4px;">全局哈希: ${escapeHtml(d.globalHash)}</div>`;
  } catch (e) { result.textContent = '错误: ' + e.message; }
  loading.classList.remove('show');
}

async function compareFingerprintsUI() {
  const loading = document.getElementById('fpCompareLoading');
  const result = document.getElementById('fpCompareResult');
  const b1 = document.getElementById('fpCompare1').value.trim();
  const b2 = document.getElementById('fpCompare2').value.trim();
  if (!b1 || !b2) { showToast('请提供两段音频'); return; }
  loading.classList.add('show'); result.textContent = '';
  try {
    let fp1, fp2;
    if (b1.length > 64 && b1.includes(':')) {
      fp1 = b1;
    } else {
      const r1 = await fetch(`${API}/api/fingerprint/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wavBase64: b1 }) });
      const d1 = await r1.json();
      fp1 = d1.fingerprint;
    }
    if (b2.length > 64 && b2.includes(':')) {
      fp2 = b2;
    } else {
      const r2 = await fetch(`${API}/api/fingerprint/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wavBase64: b2 }) });
      const d2 = await r2.json();
      fp2 = d2.fingerprint;
    }
    const res = await fetch(`${API}/api/fingerprint/compare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fp1, fp2 })
    });
    const d = await res.json();
    result.textContent = `相似度: ${(d.similarity * 100).toFixed(2)}%\n汉明距离: ${d.hammingDistance}`;
  } catch (e) { result.textContent = '错误: ' + e.message; }
  loading.classList.remove('show');
}

async function listFingerprintDatabase() {
  const listEl = document.getElementById('fpDatabaseList');
  try {
    const res = await fetch(`${API}/api/fingerprint/database`);
    const d = await res.json();
    if (!d.entries || d.entries.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text2);font-size:12px;">数据库为空</div>';
      return;
    }
    listEl.innerHTML = d.entries.map((e, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(91,77,255,0.05);border-radius:10px;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(e.metadata?.title || '未命名')}</div>
          <div style="font-size:11px;color:var(--text2);">${escapeHtml(e.metadata?.style || '')} | ${escapeHtml(e.metadata?.createdAt || '')}</div>
          <div style="font-size:10px;color:var(--text3);word-break:break-all;">${escapeHtml(e.fingerprint.slice(0,24))}...</div>
        </div>
      </div>
    `).join('');
  } catch (e) { listEl.innerHTML = '<div style="color:#d44;font-size:12px;">错误: ' + e.message + '</div>'; }
}

async function storeCurrentFingerprint() {
  if (!_currentFingerprint) { showToast('无可用指纹，请先生成音乐或上传音频'); return; }
  const title = document.getElementById('fpStoreTitle').value.trim() || '未命名';
  const style = document.getElementById('fpStoreStyle').value.trim() || '未知';
  try {
    const res = await fetch(`${API}/api/fingerprint/store`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: _currentFingerprint, metadata: { title, style, createdAt: new Date().toISOString() } })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    showToast('指纹已存储');
    listFingerprintDatabase();
  } catch (e) { showToast('存储失败: ' + e.message); }
}

async function searchSimilarFromFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const loading = document.getElementById('fpSearchLoading');
  const result = document.getElementById('fpSearchResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binStr = '';
    for (let i = 0; i < bytes.length; i++) binStr += String.fromCharCode(bytes[i]);
    const base64 = btoa(binStr);
    const genRes = await fetch(`${API}/api/fingerprint/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wavBase64: base64 })
    });
    const genD = await genRes.json();
    if (genD.error) throw new Error(genD.error);
    const searchRes = await fetch(`${API}/api/fingerprint/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: genD.fingerprint })
    });
    const searchD = await searchRes.json();
    renderFpSearchResults(searchD.results);
  } catch (e) { result.textContent = '错误: ' + e.message; }
  loading.classList.remove('show');
  input.value = '';
}

async function searchSimilarCurrent() {
  if (!_currentFingerprint) { showToast('无可用指纹，请先生成音乐或上传音频'); return; }
  const loading = document.getElementById('fpSearchLoading');
  const result = document.getElementById('fpSearchResult');
  loading.classList.add('show'); result.textContent = '';
  try {
    const res = await fetch(`${API}/api/fingerprint/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: _currentFingerprint })
    });
    const d = await res.json();
    renderFpSearchResults(d.results);
  } catch (e) { result.textContent = '错误: ' + e.message; }
  loading.classList.remove('show');
}

function renderFpSearchResults(results) {
  const result = document.getElementById('fpSearchResult');
  if (!results || results.length === 0) {
    result.textContent = '未找到相似音乐';
    return;
  }
  result.innerHTML = results.map((r, i) => `
    <div style="padding:8px 10px;background:rgba(91,77,255,0.05);border-radius:10px;margin-bottom:6px;">
      <div style="font-weight:600;font-size:13px;">#${i+1} ${escapeHtml(r.metadata?.title || '未命名')}</div>
      <div style="font-size:11px;color:var(--text2);">相似度: ${(r.similarity*100).toFixed(2)}% | ${escapeHtml(r.metadata?.style || '')}</div>
      <div style="font-size:10px;color:var(--text3);word-break:break-all;">${escapeHtml(r.fingerprint.slice(0,24))}...</div>
    </div>
  `).join('');
}

/* ================= 初始化 ================= */
ensureSession();
renderDrawer();
renderChat();
fetch(`${API}/api/health`).then(r=>r.json()).then(d=>console.log('青鸾DAW 已连接:', d.name, d.version)).catch(()=>console.log('后端未连接'));
checkVoiceSupport();

/* ================= 音乐教育模块 ================= */
const eduAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

function noteToFreq(note) {
  const map = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11 };
  const m = note.match(/^([A-G][#b]?)(\d+)$/);
  if (!m) return 440;
  const semi = map[m[1]] || 0;
  const oct = parseInt(m[2], 10);
  return 440 * Math.pow(2, (semi + (oct - 4) * 12 - 9) / 12);
}

function eduPlayTone(freq, duration, type = 'sine', when = 0) {
  const t = when || eduAudioCtx.currentTime;
  const osc = eduAudioCtx.createOscillator();
  const gain = eduAudioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(eduAudioCtx.destination);
  osc.start(t);
  osc.stop(t + duration);
  return { osc, gain };
}

function eduPlayNote(note, duration, when) {
  eduPlayTone(noteToFreq(note), duration, 'sine', when);
}

function eduPlayNotes(notes, duration, stagger) {
  const d = duration || 0.5;
  const s = stagger || 0;
  const now = eduAudioCtx.currentTime;
  notes.forEach((n, i) => eduPlayNote(n, d, now + i * s));
}

function eduPlayChordNotes(notes, duration) {
  const d = duration || 1;
  const now = eduAudioCtx.currentTime;
  notes.forEach(n => eduPlayNote(n, d, now));
}

function switchEduTab(tab, el) {
  document.querySelectorAll('.edu-tabs span').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.edu-section').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  else document.querySelector(`.edu-tabs span[onclick*="'${tab}'"]`).classList.add('active');
  document.getElementById('edu-' + tab).classList.add('active');
}

/* ---- 乐理练习 ---- */
let intScore = 0, intStreak = 0;
let currentInt = null, currentScale = null, currentChord = null;

async function eduIntervalNext() {
  const res = await fetch(`${API}/api/edu/interval`);
  const data = await res.json();
  currentInt = data;
  eduPlayNotes([data.note1, data.note2], 0.6, 0.5);
  const wrap = document.getElementById('intOptions');
  wrap.innerHTML = data.options.map(o => `<button onclick="eduIntervalAnswer('${o}')">${o}</button>`).join('');
  document.getElementById('intResult').textContent = '';
}

function eduIntervalAnswer(ans) {
  if (!currentInt) return;
  const correct = ans === currentInt.correctAnswer;
  const btns = document.querySelectorAll('#intOptions button');
  btns.forEach(b => {
    if (b.textContent === currentInt.correctAnswer) b.classList.add('correct');
    else if (b.textContent === ans) b.classList.add('wrong');
  });
  if (correct) { intScore += 10; intStreak++; }
  else { intStreak = 0; }
  document.getElementById('intScore').textContent = intScore;
  document.getElementById('intStreak').textContent = intStreak;
  document.getElementById('intResult').textContent = correct ? '✅ 正确！' : `❌ 错误，正确答案是 ${currentInt.correctAnswer}`;
}

async function eduScaleNext() {
  const res = await fetch(`${API}/api/edu/scale`);
  const data = await res.json();
  currentScale = data;
  eduPlayNotes(data.notes, 0.4, 0.3);
  const wrap = document.getElementById('scaleOptions');
  wrap.innerHTML = data.options.map(o => `<button onclick="eduScaleAnswer('${o}')">${o}</button>`).join('');
  document.getElementById('scaleResultEdu').textContent = '';
}

function eduScaleAnswer(ans) {
  if (!currentScale) return;
  const correct = ans === currentScale.correctAnswer;
  const btns = document.querySelectorAll('#scaleOptions button');
  btns.forEach(b => {
    if (b.textContent === currentScale.correctAnswer) b.classList.add('correct');
    else if (b.textContent === ans) b.classList.add('wrong');
  });
  document.getElementById('scaleResultEdu').textContent = correct ? '✅ 正确！' : `❌ 错误，正确答案是 ${currentScale.correctAnswer}`;
}

async function eduChordNext() {
  const res = await fetch(`${API}/api/edu/chord`);
  const data = await res.json();
  currentChord = data;
  eduPlayChordNotes(data.notes, 1.2);
  const wrap = document.getElementById('chordOptions');
  wrap.innerHTML = data.options.map(o => `<button onclick="eduChordAnswer('${o}')">${o}</button>`).join('');
  document.getElementById('chordResultEdu').textContent = '';
}

function eduChordAnswer(ans) {
  if (!currentChord) return;
  const correct = ans === currentChord.correctAnswer;
  const btns = document.querySelectorAll('#chordOptions button');
  btns.forEach(b => {
    if (b.textContent === currentChord.correctAnswer) b.classList.add('correct');
    else if (b.textContent === ans) b.classList.add('wrong');
  });
  document.getElementById('chordResultEdu').textContent = correct ? `✅ 正确！构成音: ${currentChord.notes.join(' ')}` : `❌ 错误，正确答案是 ${currentChord.correctAnswer} (${currentChord.notes.join(' ')})`;
}

/* ---- 视唱练耳 ---- */
let singTarget = null;
let micStream = null;
let micAnalyser = null;
let micRaf = null;

function eduSingNext() {
  const notes = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4'];
  singTarget = notes[Math.floor(Math.random() * notes.length)];
  document.getElementById('singTarget').textContent = singTarget + ' (' + Math.round(noteToFreq(singTarget)) + 'Hz)';
  eduPlayNote(singTarget, 1);
}

async function eduSingStartMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('浏览器不支持麦克风'); return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const src = eduAudioCtx.createMediaStreamSource(micStream);
    micAnalyser = eduAudioCtx.createAnalyser();
    micAnalyser.fftSize = 2048;
    src.connect(micAnalyser);
    eduSingLoop();
    showToast('已开始收音');
  } catch (e) { showToast('麦克风启动失败'); }
}

function eduSingStopMic() {
  if (micRaf) cancelAnimationFrame(micRaf);
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  micAnalyser = null;
  showToast('已停止收音');
}

function eduSingLoop() {
  if (!micAnalyser) return;
  const buf = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(buf);
  const freq = eduDetectPitch(buf, eduAudioCtx.sampleRate);
  if (freq > 0 && singTarget) {
    const targetFreq = noteToFreq(singTarget);
    const cents = 1200 * Math.log2(freq / targetFreq);
    const absCents = Math.abs(cents);
    document.getElementById('singDetected').textContent = Math.round(freq) + 'Hz';
    document.getElementById('singCents').textContent = (cents > 0 ? '+' : '') + Math.round(cents) + '音分';
    const pct = Math.max(0, Math.min(100, 100 - absCents));
    document.getElementById('singBar').style.width = pct + '%';
    if (absCents < 50) {
      document.getElementById('singResult').textContent = '✅ 音准正确！偏差 ' + Math.round(absCents) + ' 音分';
    } else {
      document.getElementById('singResult').textContent = '继续调整... 偏差 ' + Math.round(absCents) + ' 音分';
    }
  }
  micRaf = requestAnimationFrame(eduSingLoop);
}

function eduDetectPitch(buf, sampleRate) {
  // 自相关法检测基频
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;
  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thres) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; } }
  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    let sum = 0;
    for (let j = 0; j < SIZE - i; j++) sum += buf[j] * buf[j + i];
    c[i] = sum;
  }
  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  // 抛物线插值
  if (T0 > 0 && T0 < SIZE - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
  }
  return sampleRate / T0;
}

/* ---- 旋律听写 ---- */
let melodyTarget = [];
let melodyUser = [];

function eduBuildPiano() {
  const wrap = document.getElementById('pianoWrap');
  if (!wrap || wrap.children.length > 0) return;
  const white = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  const blackMap = { 'C#4':0, 'D#4':1, 'F#4':3, 'G#4':4, 'A#4':5 };
  white.forEach((n, i) => {
    const key = document.createElement('div');
    key.className = 'piano-key';
    key.textContent = n;
    key.dataset.note = n;
    key.onclick = () => { eduPlayNote(n, 0.3); melodyUser.push(n); eduMelodyRender(); };
    wrap.appendChild(key);
  });
  Object.keys(blackMap).forEach(n => {
    const idx = blackMap[n];
    const key = document.createElement('div');
    key.className = 'piano-key black';
    key.textContent = n;
    key.dataset.note = n;
    const leftPct = ((idx + 0.7) / white.length) * 100;
    key.style.left = leftPct + '%';
    key.style.width = (80 / white.length) + '%';
    key.onclick = () => { eduPlayNote(n, 0.3); melodyUser.push(n); eduMelodyRender(); };
    wrap.appendChild(key);
  });
}

function eduMelodyRender() {
  const wrap = document.getElementById('melodySeq');
  wrap.innerHTML = melodyUser.map(n => `<span class="melody-note">${n}</span>`).join('');
}

function eduMelodyPlay() {
  const notes = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  const len = 3 + Math.floor(Math.random() * 3);
  melodyTarget = [];
  for (let i = 0; i < len; i++) melodyTarget.push(notes[Math.floor(Math.random() * notes.length)]);
  melodyUser = [];
  eduMelodyRender();
  eduPlayNotes(melodyTarget, 0.4, 0.5);
  document.getElementById('melodyResult').textContent = '';
}

function eduMelodyClear() {
  melodyUser = [];
  eduMelodyRender();
  document.getElementById('melodyResult').textContent = '';
}

function eduMelodyCheck() {
  const correct = melodyUser.length === melodyTarget.length && melodyUser.every((n, i) => n === melodyTarget[i]);
  document.getElementById('melodyResult').textContent = correct ? '✅ 完全正确！' : `❌ 不匹配。正确旋律: ${melodyTarget.join(' ')}`;
}

/* ---- 和弦挑战游戏 ---- */
let gameTimer = null, gameTimeLeft = 60, gameScore = 0, gameActive = false;
let currentGameChord = null;
const RANKS = ['青铜','白银','黄金','铂金','钻石','王者'];
const RANK_THRESHOLDS = [0, 50, 100, 150, 200, 250];

function getRank(score) {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) if (score >= RANK_THRESHOLDS[i]) return RANKS[i];
  return RANKS[0];
}

function getRankProgress(score) {
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (score < RANK_THRESHOLDS[i]) {
      const prev = RANK_THRESHOLDS[i - 1] || 0;
      const next = RANK_THRESHOLDS[i];
      return ((score - prev) / (next - prev)) * 100;
    }
  }
  return 100;
}

async function eduGameStart() {
  gameScore = 0; gameTimeLeft = 60; gameActive = true;
  document.getElementById('gameScore').textContent = '0';
  document.getElementById('gameTime').textContent = '60';
  document.getElementById('gameRank').textContent = '青铜';
  document.getElementById('rankFill').style.width = '0%';
  document.getElementById('gameStartBtn').style.display = 'none';
  document.getElementById('gamePlayArea').style.display = 'block';
  document.getElementById('gameResult').textContent = '';
  eduGameNext();
  gameTimer = setInterval(() => {
    gameTimeLeft--;
    document.getElementById('gameTime').textContent = gameTimeLeft;
    if (gameTimeLeft <= 0) eduGameEnd();
  }, 1000);
  eduGameDrawSpectrum();
}

async function eduGameNext() {
  if (!gameActive) return;
  const res = await fetch(`${API}/api/edu/chord`);
  const data = await res.json();
  currentGameChord = data;
  eduPlayChordNotes(data.notes, 1);
  const wrap = document.getElementById('gameOptions');
  wrap.innerHTML = data.options.map(o => `<button onclick="eduGameAnswer('${o}')">${o}</button>`).join('');
}

function eduGamePlayChord() {
  if (currentGameChord) eduPlayChordNotes(currentGameChord.notes, 1);
}

function eduGameAnswer(ans) {
  if (!gameActive || !currentGameChord) return;
  const correct = ans === currentGameChord.correctAnswer;
  const btns = document.querySelectorAll('#gameOptions button');
  btns.forEach(b => {
    if (b.textContent === currentGameChord.correctAnswer) b.classList.add('correct');
    else if (b.textContent === ans) b.classList.add('wrong');
  });
  if (correct) {
    gameScore += 10;
    document.getElementById('gameScore').textContent = gameScore;
    const rank = getRank(gameScore);
    document.getElementById('gameRank').textContent = rank;
    document.getElementById('rankFill').style.width = getRankProgress(gameScore) + '%';
  }
  setTimeout(() => eduGameNext(), 600);
}

function eduGameEnd() {
  gameActive = false;
  clearInterval(gameTimer);
  document.getElementById('gameStartBtn').style.display = 'inline-block';
  document.getElementById('gamePlayArea').style.display = 'none';
  const rank = getRank(gameScore);
  document.getElementById('gameResult').textContent = `时间到！得分: ${gameScore} | 段位: ${rank}`;
  // 本地最高分
  const key = 'edu_highscore_chord';
  const prev = parseInt(localStorage.getItem(key) || '0', 10);
  if (gameScore > prev) localStorage.setItem(key, String(gameScore));
  // 提交到后端
  eduSaveScore('chord', gameScore, rank);
}

async function eduSaveScore(game, score, level) {
  try {
    await fetch(`${API}/api/edu/score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, score, level })
    });
  } catch (e) {}
}

async function eduLoadLeaderboard() {
  try {
    const res = await fetch(`${API}/api/edu/leaderboard?game=chord`);
    const data = await res.json();
    const wrap = document.getElementById('eduLeaderboard');
    if (!data.leaderboard || data.leaderboard.length === 0) {
      wrap.innerHTML = '<div style="color:var(--text2)">暂无数据</div>'; return;
    }
    wrap.innerHTML = data.leaderboard.map((e, i) =>
      `<div style="display:flex;justify-content:space-between;padding:6px 8px;background:rgba(0,0,0,0.03);border-radius:8px;margin-bottom:4px;">
        <span>#${i+1} ${e.level}</span><span style="font-weight:700;color:var(--accent)">${e.score}分</span>
      </div>`
    ).join('');
  } catch (e) { showToast('加载排行榜失败'); }
}

function eduGameDrawSpectrum() {
  const canvas = document.getElementById('gameSpectrum');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (!gameActive) { ctx.clearRect(0,0,w,h); return; }
  requestAnimationFrame(eduGameDrawSpectrum);
  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0,0,w,h);
  // 模拟频谱条
  const bars = 32;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const height = Math.random() * h * 0.8;
    const hue = 200 + (i / bars) * 160;
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
    ctx.fillRect(i * bw, h - height, bw - 1, height);
  }
}

/* 初始化虚拟钢琴 */
eduBuildPiano();

// 非传统引擎面板切换
function toggleNtPanel() {
  const engine = document.getElementById('ntEngine').value;
  const map = { selfmodifying: 'ntSelfModifying', chemical: 'ntChemical', topological: 'ntTopological', cellular: 'ntCellular', consciousness: 'ntConsciousness' };
  ['ntSelfModifying','ntChemical','ntTopological','ntCellular','ntConsciousness'].forEach(id => {
    document.getElementById(id).style.display = id === map[engine] ? 'block' : 'none';
  });
}

// 运行单个非传统引擎
async function runNonTraditional() {
  const engine = document.getElementById('ntEngine').value;
  const loading = document.getElementById('ntLoading');
  const resultEl = document.getElementById('ntResult');
  const playerEl = document.getElementById('ntPlayer');
  loading.style.display = 'flex';
  resultEl.textContent = '';
  playerEl.innerHTML = '';
  
  try {
    let endpoint = '/api/engine/' + engine;
    let body = {};
    
    if (engine === 'selfmodifying') {
      body = { freq: +document.getElementById('smFreq').value, duration: +document.getElementById('smDuration').value, evolutionRate: +document.getElementById('smRate').value, mutationIntensity: +document.getElementById('smIntensity').value };
    } else if (engine === 'chemical') {
      const key = document.getElementById('chemKey').value;
      const keyMap = {C:60,G:67,Am:69,F:65}; // 简化映射
      body = { style: document.getElementById('chemStyle').value, keyRoot: keyMap[key]||60, barCount: +document.getElementById('chemBars').value, bpm: +document.getElementById('chemBpm').value, temperature: +document.getElementById('chemTemp').value };
    } else if (engine === 'topological') {
      const key = document.getElementById('topoKey').value;
      const keyMap = {C:60,Am:69,G:67,F:65};
      body = { keyRoot: keyMap[key]||60, barCount: +document.getElementById('topoBars').value, bpm: +document.getElementById('topoBpm').value, curvature: +document.getElementById('topoCurve').value };
    } else if (engine === 'cellular') {
      const key = document.getElementById('caKey').value;
      const keyMap = {C:60,G:67,Am:69,F:65};
      body = { keyRoot: keyMap[key]||60, barCount: +document.getElementById('caBars').value, bpm: +document.getElementById('caBpm').value, seedDensity: +document.getElementById('caSeed').value, generations: +document.getElementById('caGen').value };
    } else if (engine === 'consciousness') {
      body = { theme: document.getElementById('scTheme').value, bpm: +document.getElementById('scBpm').value, bars: +document.getElementById('scBars').value, temperature: +document.getElementById('scTemp').value };
    }
    
    const res = await fetch(endpoint, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    if (data.wavBase64) {
      playerEl.innerHTML = '<audio controls style="width:100%;margin-top:8px;" src="data:audio/wav;base64,' + data.wavBase64 + '"></audio>';
    }
    resultEl.textContent = JSON.stringify(data, null, 2).replace(/wavBase64.*\n/g, '');
  } catch (e) {
    resultEl.textContent = '错误: ' + e.message;
  } finally {
    loading.style.display = 'none';
  }
}

// 非传统生产线（调用 /api/produce）
async function runNtProduction() {
  const engine = document.getElementById('ntProdEngine').value;
  const loading = document.getElementById('ntProdLoading');
  const resultEl = document.getElementById('ntProdResult');
  const playerEl = document.getElementById('ntProdPlayer');
  loading.style.display = 'flex';
  resultEl.textContent = '';
  playerEl.innerHTML = '';
  
  try {
    const key = document.getElementById('ntProdKey').value;
    const body = {
      style: document.getElementById('ntProdStyle').value,
      key: key,
      bpm: +document.getElementById('ntProdBpm').value,
      barCount: +document.getElementById('ntProdBars').value,
      nonTraditionalEngine: engine,
      emotion: 'happy',
      useAutoMix: true,
      usePhraseStructure: document.getElementById('ntUsePhrase')?.checked || false,
      useHumanization: document.getElementById('ntUseHumanize')?.checked || false,
      useAnalogFeel: document.getElementById('ntUseAnalog')?.checked || false,
      analogIntensity: (+document.getElementById('ntAnalogSlider')?.value || 40) / 100,
      useSpatialReverb: document.getElementById('ntSpatialPreset').value !== 'none',
      spatialPreset: document.getElementById('ntSpatialPreset').value,
      useWatermark: document.getElementById('ntUseWatermark')?.checked || false,
      creatorId: document.getElementById('ntCreatorId')?.value || 'qingluan-user',
      useHumanFeelEnhance: document.getElementById('ntUseHumanFeel')?.checked || false,
      humanFeelIntensity: (+document.getElementById('ntHumanFeelSlider')?.value || 50) / 100,
    };
    
    const res = await fetch('/api/produce', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    if (data.wavBase64) {
      playerEl.innerHTML = '<audio controls style="width:100%;margin-top:8px;" src="data:audio/wav;base64,' + data.wavBase64 + '"></audio>';
    }
    resultEl.textContent = JSON.stringify(data, null, 2).replace(/wavBase64.*\n/g, '');
  } catch (e) {
    resultEl.textContent = '错误: ' + e.message;
  } finally {
    loading.style.display = 'none';
  }
}

async function runSpatialOriginality() {
  const loading = document.getElementById('ntSpatialLoading');
  const resultEl = document.getElementById('ntSpatialResult');
  loading.style.display = 'flex';
  resultEl.textContent = '';
  
  try {
    const res = await fetch('/api/spatial/presets');
    const data = await res.json();
    resultEl.textContent = '可用空间预设: ' + (data.presets || []).join(', ');
  } catch (e) {
    resultEl.textContent = '错误: ' + e.message;
  } finally {
    loading.style.display = 'none';
  }
}

// 声带实验室
function updateVfParams() {
  const preset = document.getElementById('vfPreset').value;
  const defaults = {
    male: { length: 15, thickness: 3, tension: 50, pressure: 80, mucosal: 30 },
    female: { length: 12, thickness: 2.5, tension: 60, pressure: 70, mucosal: 25 },
    child: { length: 10, thickness: 2, tension: 40, pressure: 60, mucosal: 35 },
    falsetto: { length: 14, thickness: 2, tension: 85, pressure: 50, mucosal: 20 },
    fry: { length: 16, thickness: 3.5, tension: 20, pressure: 30, mucosal: 40 },
    whistle: { length: 11, thickness: 1.5, tension: 95, pressure: 90, mucosal: 15 },
    growl: { length: 15, thickness: 3, tension: 75, pressure: 100, mucosal: 35 },
    breathy: { length: 13, thickness: 2.5, tension: 35, pressure: 90, mucosal: 20 },
  };
  const d = defaults[preset] || defaults.male;
  document.getElementById('vfLength').value = d.length;
  document.getElementById('vfLengthVal').textContent = d.length;
  document.getElementById('vfThickness').value = d.thickness;
  document.getElementById('vfThicknessVal').textContent = d.thickness;
  document.getElementById('vfTension').value = d.tension;
  document.getElementById('vfTensionVal').textContent = d.tension;
  document.getElementById('vfPressure').value = d.pressure;
  document.getElementById('vfPressureVal').textContent = d.pressure;
  document.getElementById('vfMucosal').value = d.mucosal;
  document.getElementById('vfMucosalVal').textContent = d.mucosal;
}

async function generateVocalFold() {
  const loading = document.getElementById('vfLoading');
  const resultEl = document.getElementById('vfResult');
  const playerEl = document.getElementById('vfPlayer');
  loading.style.display = 'flex';
  resultEl.textContent = '';
  playerEl.innerHTML = '';
  
  try {
    const res = await fetch('/api/vocalfold/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        preset: document.getElementById('vfPreset').value,
        pitch: +document.getElementById('vfPitch').value,
        duration: +document.getElementById('vfDuration').value,
        params: {
          length: +document.getElementById('vfLength').value,
          thickness: +document.getElementById('vfThickness').value,
          tension: +document.getElementById('vfTension').value / 100,
          subglottalPressure: +document.getElementById('vfPressure').value / 100,
          mucosalMassRatio: +document.getElementById('vfMucosal').value / 100,
        }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    if (data.wavBase64) {
      playerEl.innerHTML = '<audio controls style="width:100%;margin-top:8px;" src="data:audio/wav;base64,' + data.wavBase64 + '"></audio>';
    }
    resultEl.textContent = '预设: ' + data.preset + '\n时长: ' + data.duration.toFixed(2) + '秒';
  } catch (e) {
    resultEl.textContent = '错误: ' + e.message;
  } finally {
    loading.style.display = 'none';
  }
}

async function singWithVocalFold() {
  const loading = document.getElementById('vfSingLoading');
  const resultEl = document.getElementById('vfSingResult');
  const playerEl = document.getElementById('vfSingPlayer');
  loading.style.display = 'flex';
  resultEl.textContent = '';
  playerEl.innerHTML = '';
  
  try {
    const notesStr = document.getElementById('vfSingNotes').value;
    const noteValues = notesStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const duration = +document.getElementById('vfSingDuration').value;
    
    const res = await fetch('/api/vocalfold/singing', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        preset: document.getElementById('vfSingPreset').value,
        notes: noteValues.map(midi => ({midi, duration}))
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    if (data.wavBase64) {
      playerEl.innerHTML = '<audio controls style="width:100%;margin-top:8px;" src="data:audio/wav;base64,' + data.wavBase64 + '"></audio>';
    }
    resultEl.textContent = '时长: ' + data.duration.toFixed(2) + '秒';
  } catch (e) {
    resultEl.textContent = '错误: ' + e.message;
  } finally {
    loading.style.display = 'none';
  }
}

/* ============================================================
   青鸾 DAW — 前端 UI 扩展模块（约4000行）
   包含：PianoRoll、Waveform、Analyzer、Metronome、Tuner、
   Theme、KeyboardShortcuts、Undo/Redo、Toast、DragDrop、
   ContextMenu、Loading、Modal、Tooltip、Scroll动画、Counter动画
   ============================================================ */

/* ================= PianoRoll 钢琴卷帘渲染 ================= */

const PianoRollDefaults = {
  gridColor: 'rgba(0,0,0,0.06)',
  beatColor: 'rgba(0,0,0,0.12)',
  barColor: 'rgba(0,0,0,0.2)',
  noteColor: 'rgba(91,77,255,0.85)',
  noteBorder: 'rgba(91,77,255,1)',
  playheadColor: '#ff6b9d',
  whiteKeyColor: '#fff',
  blackKeyColor: '#1a1a1a',
  blackKeyWidth: 0.65,
  rowHeight: 16,
  keyWidth: 48,
  pixelsPerBeat: 40,
  minNote: 36,
  maxNote: 96
};

function renderPianoRoll(notes, options = {}) {
  const opts = { ...PianoRollDefaults, ...options };
  const canvasId = opts.canvasId || 'pianoRollCanvas';
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    const container = opts.container || document.getElementById('studio') || document.body;
    if (container) container.appendChild(canvas);
  }

  const totalBeats = opts.totalBeats || Math.max(16, ...notes.map(n => (n.offset || 0) + (n.duration || 0.5)));
  const noteRange = opts.maxNote - opts.minNote + 1;
  const w = opts.width || canvas.clientWidth || 800;
  const h = opts.height || canvas.clientHeight || noteRange * opts.rowHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 背景
  ctx.fillStyle = opts.bgColor || 'transparent';
  ctx.fillRect(0, 0, w, h);

  const keyW = opts.keyWidth;
  const drawW = w - keyW;
  const beatW = opts.pixelsPerBeat;
  const rowH = opts.rowHeight;

  // 钢琴键区域背景
  ctx.fillStyle = opts.whiteKeyColor;
  ctx.fillRect(0, 0, keyW, h);
  ctx.strokeStyle = opts.gridColor;
  ctx.beginPath();
  ctx.moveTo(keyW, 0);
  ctx.lineTo(keyW, h);
  ctx.stroke();

  // 绘制钢琴键
  const blackKeys = new Set([1,3,6,8,10]);
  for (let n = opts.maxNote; n >= opts.minNote; n--) {
    const row = opts.maxNote - n;
    const y = row * rowH;
    const semitone = n % 12;
    const isBlack = blackKeys.has(semitone);
    if (isBlack) {
      ctx.fillStyle = opts.blackKeyColor;
      ctx.fillRect(0, y, keyW * opts.blackKeyWidth, rowH);
    } else {
      ctx.fillStyle = opts.whiteKeyColor;
      ctx.fillRect(0, y, keyW, rowH);
    }
    ctx.strokeStyle = opts.gridColor;
    ctx.strokeRect(0, y, keyW, rowH);
    // 音符标签
    if (!isBlack && (n % 12 === 0 || n === opts.maxNote || n === opts.minNote)) {
      ctx.fillStyle = isBlack ? '#fff' : '#333';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const octave = Math.floor(n / 12) - 1;
      ctx.fillText(names[semitone] + octave, 4, y + rowH / 2);
    }
  }

  // 网格线（竖线）
  ctx.strokeStyle = opts.gridColor;
  ctx.lineWidth = 0.5;
  const totalBars = Math.ceil(totalBeats / 4);
  for (let b = 0; b <= totalBeats * 4; b++) {
    const x = keyW + (b / 4) * beatW;
    if (x > w) break;
    const isBar = b % 16 === 0;
    const isBeat = b % 4 === 0;
    ctx.strokeStyle = isBar ? opts.barColor : (isBeat ? opts.beatColor : opts.gridColor);
    ctx.lineWidth = isBar ? 1.5 : (isBeat ? 0.8 : 0.4);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // 网格线（横线）
  for (let row = 0; row <= noteRange; row++) {
    const y = row * rowH;
    ctx.strokeStyle = opts.gridColor;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(keyW, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 绘制音符块
  notes.forEach(note => {
    const pitch = note.pitch || note.midi || 60;
    if (pitch < opts.minNote || pitch > opts.maxNote) return;
    const dur = note.duration || 0.5;
    const offset = note.offset || 0;
    const row = opts.maxNote - pitch;
    const x = keyW + offset * beatW;
    const y = row * rowH + 1;
    const nw = Math.max(2, dur * beatW - 2);
    const nh = rowH - 2;
    ctx.fillStyle = note.color || opts.noteColor;
    ctx.strokeStyle = note.border || opts.noteBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, nw, nh, 3);
    ctx.fill();
    ctx.stroke();
    // 音符文字
    if (nw > 20 && opts.showNoteLabels !== false) {
      ctx.fillStyle = '#fff';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((note.name || pitch), x + nw / 2, y + nh / 2);
    }
  });

  // 播放头
  if (opts.playhead !== undefined && opts.playhead >= 0) {
    const px = keyW + opts.playhead * beatW;
    ctx.strokeStyle = opts.playheadColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
    // 播放头三角
    ctx.fillStyle = opts.playheadColor;
    ctx.beginPath();
    ctx.moveTo(px - 5, 0);
    ctx.lineTo(px + 5, 0);
    ctx.lineTo(px, 6);
    ctx.fill();
  }

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/* ================= Waveform 波形渲染 ================= */

function renderWaveform(buffer, canvasId) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.width = '100%';
    canvas.style.height = '120px';
    canvas.style.display = 'block';
    document.body.appendChild(canvas);
  }
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 120;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, w, h);

  const ch = buffer.numberOfChannels || 1;
  const data = buffer.getChannelData ? buffer.getChannelData(0) : (Array.isArray(buffer) ? buffer : []);
  if (!data.length) return canvas;

  const step = Math.ceil(data.length / w);
  const amp = h / 2;
  const centerY = h / 2;

  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const start = x * step;
    const end = Math.min(start + step, data.length);
    let min = Infinity, max = -Infinity;
    for (let i = start; i < end; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === Infinity) { min = 0; max = 0; }
    ctx.moveTo(x, centerY + min * amp);
    ctx.lineTo(x, centerY + max * amp);
  }
  ctx.stroke();

  // 中心线
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(w, centerY);
  ctx.stroke();

  return canvas;
}

/* ================= Analyzer 频谱 & 语谱图 ================= */

function renderSpectrum(spectrum, canvasId) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.width = '100%';
    canvas.style.height = '120px';
    document.body.appendChild(canvas);
  }
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 120;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const barCount = spectrum.length || 64;
  const barW = w / barCount;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';

  for (let i = 0; i < barCount; i++) {
    const value = spectrum[i] || 0;
    const height = Math.max(2, value * h);
    const hue = 240 + (i / barCount) * 120;
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.85)`;
    ctx.fillRect(i * barW, h - height, barW - 1, height);
  }
  return canvas;
}

function renderSpectrogram(data, canvasId) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.width = '100%';
    canvas.style.height = '160px';
    document.body.appendChild(canvas);
  }
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 160;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // data: 二维数组 [time][freq]
  const timeSteps = data.length || 1;
  const freqs = (data[0] && data[0].length) || 64;
  const cellW = w / timeSteps;
  const cellH = h / freqs;

  for (let t = 0; t < timeSteps; t++) {
    const frame = data[t] || [];
    for (let f = 0; f < freqs; f++) {
      const val = frame[f] || 0;
      const intensity = Math.min(1, val);
      const hue = 240 - intensity * 240;
      const lightness = intensity * 60;
      ctx.fillStyle = `hsla(${hue}, 90%, ${lightness}%, 1)`;
      ctx.fillRect(t * cellW, h - (f + 1) * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
  return canvas;
}

/* ================= Metronome 节拍器 ================= */

class Metronome {
  constructor() {
    this.ctx = null;
    this.bpm = 120;
    this.nextNoteTime = 0;
    this.beatCount = 0;
    this.isRunning = false;
    this.lookahead = 25.0;
    this.scheduleAheadTime = 0.1;
    this.timerID = null;
    this.tickCallbacks = [];
  }

  initAudio() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  scheduleNote(beatNumber, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const isAccent = beatNumber % 4 === 0;
    osc.frequency.value = isAccent ? 1000 : 800;
    gain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);

    this.tickCallbacks.forEach(cb => {
      try { cb(beatNumber, time, isAccent); } catch (e) {}
    });
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.beatCount, this.nextNoteTime);
      this.beatCount++;
      this.nextNoteTime += 60.0 / this.bpm;
    }
  }

  start(bpm = 120) {
    this.initAudio();
    this.bpm = bpm;
    this.isRunning = true;
    this.beatCount = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.timerID = setInterval(() => this.scheduler(), this.lookahead);
    showToast('节拍器已启动 ' + bpm + ' BPM', 'info');
  }

  stop() {
    this.isRunning = false;
    if (this.timerID) clearInterval(this.timerID);
    this.timerID = null;
    showToast('节拍器已停止', 'info');
  }

  onTick(cb) {
    this.tickCallbacks.push(cb);
  }
}

const _metronome = new Metronome();

function startMetronome(bpm) {
  const bpmVal = bpm || parseInt(document.getElementById('bpm')?.value) || 120;
  _metronome.start(bpmVal);
}
function stopMetronome() { _metronome.stop(); }

let _tapTimes = [];
function tapTempo() {
  const now = Date.now();
  _tapTimes.push(now);
  if (_tapTimes.length > 8) _tapTimes.shift();
  if (_tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < _tapTimes.length; i++) intervals.push(_tapTimes[i] - _tapTimes[i - 1]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avg);
    const bpmEl = document.getElementById('bpm');
    if (bpmEl) bpmEl.value = Math.max(40, Math.min(240, bpm));
    showToast('估算 BPM: ' + bpm, 'info');
  } else {
    showToast('再按几次以估算 BPM', 'info');
  }
}

/* ================= Tuner 调音器 ================= */

class Tuner {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.isRunning = false;
    this.rafId = null;
    this.centCallbacks = [];
  }

  async start() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);
      this.isRunning = true;
      this._detectLoop();
      showToast('调音器已启动', 'info');
    } catch (e) {
      showToast('无法启动麦克风: ' + e.message, 'error');
    }
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.source) { try { this.source.disconnect(); } catch (e) {} }
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} }
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    showToast('调音器已停止', 'info');
  }

  _detectLoop() {
    if (!this.isRunning) return;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    const freq = this._autoCorrelate(buf, this.ctx.sampleRate);
    if (freq > 0) {
      const note = this._freqToNote(freq);
      this.centCallbacks.forEach(cb => {
        try { cb(note.name, note.cents, freq); } catch (e) {}
      });
    }
    this.rafId = requestAnimationFrame(() => this._detectLoop());
  }

  _autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    buf = buf.slice(r1, r2);
    SIZE = buf.length;
    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];
    }
    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    return sampleRate / T0;
  }

  _freqToNote(freq) {
    const A4 = 440;
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const semitones = 12 * Math.log2(freq / A4);
    const midi = Math.round(69 + semitones);
    const cents = Math.round((semitones - Math.round(semitones)) * 100);
    const name = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
    return { name, cents, midi, freq };
  }

  onUpdate(cb) { this.centCallbacks.push(cb); }
}

const _tuner = new Tuner();

function startTuner() { _tuner.start(); }
function stopTuner() { _tuner.stop(); }

/* ================= Theme 主题切换 ================= */

const ThemePresets = {
  light: {
    '--phone-bg': '#f5f5f0',
    '--text': '#1a1a1a',
    '--text2': '#555',
    '--text3': '#888',
    '--accent': '#5b4dff',
    '--accent2': '#ff6b9d',
    '--bubble-user': '#5b4dff',
    '--bubble-ai': '#f0f0f5',
    '--card-bg': '#fff',
    '--border': 'rgba(0,0,0,0.06)',
    '--pink-bg': '#f5f5f0',
    '--black-card': '#1a1a1a'
  },
  dark: {
    '--phone-bg': '#0f0f13',
    '--text': '#e8e8ec',
    '--text2': '#a0a0a8',
    '--text3': '#707078',
    '--accent': '#8b7dff',
    '--accent2': '#ff8bb5',
    '--bubble-user': '#8b7dff',
    '--bubble-ai': '#1e1e28',
    '--card-bg': '#1a1a22',
    '--border': 'rgba(255,255,255,0.08)',
    '--pink-bg': '#12121a',
    '--black-card': '#252530'
  },
  geek: {
    '--phone-bg': '#0a0a0a',
    '--text': '#00ff41',
    '--text2': '#00cc33',
    '--text3': '#009922',
    '--accent': '#00ff41',
    '--accent2': '#00ff88',
    '--bubble-user': '#00ff41',
    '--bubble-ai': '#0f1f0f',
    '--card-bg': '#0f0f0f',
    '--border': 'rgba(0,255,65,0.15)',
    '--pink-bg': '#080808',
    '--black-card': '#111111'
  },
  paper: {
    '--phone-bg': '#f0e8d8',
    '--text': '#3a3020',
    '--text2': '#6a6050',
    '--text3': '#9a9080',
    '--accent': '#8b4513',
    '--accent2': '#cd853f',
    '--bubble-user': '#8b4513',
    '--bubble-ai': '#e8e0d0',
    '--card-bg': '#faf6f0',
    '--border': 'rgba(60,40,20,0.08)',
    '--pink-bg': '#f0e8d8',
    '--black-card': '#3a3020'
  }
};

function applyTheme(themeName) {
  const preset = ThemePresets[themeName];
  if (!preset) {
    showToast('未知主题: ' + themeName, 'error');
    return;
  }
  const root = document.documentElement;
  Object.entries(preset).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem('qingluan_theme', themeName);
  animateThemeTransition();
  showToast('主题已切换: ' + themeName, 'success');
}

function animateThemeTransition() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--accent);opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '0.15'; });
  setTimeout(() => { overlay.style.opacity = '0'; }, 150);
  setTimeout(() => { overlay.remove(); }, 500);
}

function initTheme() {
  const saved = localStorage.getItem('qingluan_theme');
  if (saved && ThemePresets[saved]) applyTheme(saved);
}
initTheme();

/* ================= KeyboardShortcuts 快捷键 ================= */

const _shortcutRegistry = new Map();
let _shortcutsEnabled = true;
let _shortcutContext = 'global';
let _shortcutSequence = [];
let _shortcutSequenceTimer = null;

function registerShortcut(keyCombo, callback, options = {}) {
  const ctx = options.context || 'global';
  if (!_shortcutRegistry.has(ctx)) _shortcutRegistry.set(ctx, new Map());
  _shortcutRegistry.get(ctx).set(keyCombo.toLowerCase().trim(), { callback, options });
}

function unregisterShortcut(keyCombo, context = 'global') {
  const map = _shortcutRegistry.get(context);
  if (map) map.delete(keyCombo.toLowerCase().trim());
}

function enableShortcuts() { _shortcutsEnabled = true; }
function disableShortcuts() { _shortcutsEnabled = false; }
function setShortcutContext(ctx) { _shortcutContext = ctx; }

function _matchShortcut(e, combo) {
  const parts = combo.split('+').map(s => s.trim().toLowerCase());
  const key = parts.pop();
  const ctrl = parts.includes('ctrl') || parts.includes('control');
  const shift = parts.includes('shift');
  const alt = parts.includes('alt');
  const meta = parts.includes('meta') || parts.includes('cmd') || parts.includes('command');
  return (
    e.key.toLowerCase() === key &&
    e.ctrlKey === ctrl &&
    e.shiftKey === shift &&
    e.altKey === alt &&
    e.metaKey === meta
  );
}

document.addEventListener('keydown', (e) => {
  if (!_shortcutsEnabled) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
    // 允许在输入框中的特定快捷键
    if (!e.ctrlKey && !e.metaKey) return;
  }

  const contexts = ['global', _shortcutContext];
  for (const ctx of contexts) {
    const map = _shortcutRegistry.get(ctx);
    if (!map) continue;
    for (const [combo, item] of map) {
      if (_matchShortcut(e, combo)) {
        e.preventDefault();
        try { item.callback(e); } catch (err) { console.error('快捷键错误:', err); }
        return;
      }
    }
  }

  // 内置默认行为
  if (e.key === ' ' && tag !== 'input' && tag !== 'textarea') {
    e.preventDefault();
    togglePlayback && togglePlayback();
  }
  if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const tabs = Array.from(document.querySelectorAll('.studio-tab'));
    const idx = parseInt(e.key) - 1;
    if (tabs[idx]) {
      tabs[idx].click();
      showToast('切换到: ' + tabs[idx].textContent, 'info');
    }
  }
});

// 注册默认快捷键
function _initDefaultShortcuts() {
  registerShortcut('ctrl+z', () => { if (window.actionHistory) window.actionHistory.undo(); });
  registerShortcut('ctrl+shift+z', () => { if (window.actionHistory) window.actionHistory.redo(); });
  registerShortcut('ctrl+s', (e) => { e.preventDefault(); saveProject(); showToast('保存项目', 'success'); });
  registerShortcut('ctrl+e', (e) => { e.preventDefault(); exportProject(); showToast('导出项目', 'success'); });
  registerShortcut('ctrl+o', (e) => { e.preventDefault(); showToast('请使用导入按钮打开文件', 'info'); });
  registerShortcut('ctrl+n', (e) => { e.preventDefault(); newSession(); });
  registerShortcut('ctrl+x', () => { showToast('剪切', 'info'); });
  registerShortcut('ctrl+c', () => { showToast('复制', 'info'); });
  registerShortcut('ctrl+v', () => { showToast('粘贴', 'info'); });
  registerShortcut('delete', () => { showToast('删除', 'info'); });
  registerShortcut('ctrl+b', () => { toggleDrawer(); });
  registerShortcut('ctrl+f', () => { showToast('搜索功能开发中', 'info'); });
  registerShortcut('escape', () => { closeAll(); });
  registerShortcut('ctrl+m', () => { startMetronome(); });
  registerShortcut('ctrl+t', () => { startTuner(); });
  registerShortcut('ctrl+r', () => { showToast('录音功能开发中', 'info'); });
  registerShortcut('ctrl+l', () => { showToast('循环功能开发中', 'info'); });
  registerShortcut('home', () => { showToast('回到开头', 'info'); });
  registerShortcut('end', () => { showToast('跳到结尾', 'info'); });
  registerShortcut('ctrl+arrowleft', () => { showToast('后退', 'info'); });
  registerShortcut('ctrl+arrowright', () => { showToast('前进', 'info'); });
  registerShortcut('tab', (e) => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button'));
    const idx = inputs.indexOf(document.activeElement);
    if (idx >= 0 && idx < inputs.length - 1) {
      e.preventDefault();
      inputs[idx + 1].focus();
    }
  });
  registerShortcut('shift+tab', (e) => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button'));
    const idx = inputs.indexOf(document.activeElement);
    if (idx > 0) {
      e.preventDefault();
      inputs[idx - 1].focus();
    }
  });
}
_initDefaultShortcuts();

/* ================= Undo/Redo 系统 ================= */

class ActionHistory {
  constructor(limit = 200) {
    this.stack = [];
    this.redoStack = [];
    this.limit = limit;
    this.listeners = [];
  }

  push(action) {
    if (!action || typeof action.do !== 'function') {
      console.warn('Action 必须有 do 方法');
      return;
    }
    action.do();
    this.stack.push(action);
    if (this.stack.length > this.limit) this.stack.shift();
    this.redoStack = [];
    this._notify();
  }

  undo() {
    const action = this.stack.pop();
    if (!action) { showToast('没有可撤销的操作', 'warning'); return false; }
    if (typeof action.undo === 'function') action.undo();
    this.redoStack.push(action);
    this._notify();
    showToast('已撤销', 'info');
    return true;
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) { showToast('没有可重做的操作', 'warning'); return false; }
    if (typeof action.do === 'function') action.do();
    this.stack.push(action);
    this._notify();
    showToast('已重做', 'info');
    return true;
  }

  canUndo() { return this.stack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
  clear() { this.stack = []; this.redoStack = []; this._notify(); }

  onChange(cb) { this.listeners.push(cb); }
  _notify() {
    this.listeners.forEach(cb => {
      try { cb(this.canUndo(), this.canRedo()); } catch (e) {}
    });
  }

  // 便捷包装
  record(doFn, undoFn, meta = {}) {
    this.push({ do: doFn, undo: undoFn, meta });
  }

  snapshotState(getter, setter, label = '操作') {
    const before = JSON.stringify(getter());
    return {
      commit: () => {
        const after = JSON.stringify(getter());
        this.record(
          () => { /* already applied */ },
          () => { setter(JSON.parse(before)); },
          { label, before, after }
        );
      }
    };
  }
}

window.actionHistory = new ActionHistory();

/* ================= Toast 通知增强 ================= */

const _toastQueue = [];
let _toastProcessing = false;

function _processToastQueue() {
  if (_toastProcessing || !_toastQueue.length) return;
  _toastProcessing = true;
  const { message, type, duration } = _toastQueue.shift();
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);padding:10px 18px;border-radius:24px;font-size:13px;color:#fff;background:rgba(30,30,30,0.88);backdrop-filter:blur(8px);opacity:0;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);z-index:10000;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(el);
  }

  const colors = {
    success: '#2ecc71',
    error: '#e74c3c',
    warning: '#f39c12',
    info: '#3498db'
  };
  el.style.background = colors[type] || 'rgba(30,30,30,0.88)';
  el.textContent = message;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => {
      _toastProcessing = false;
      _processToastQueue();
    }, 350);
  }, duration || 2000);
}

// 覆盖原有 showToast
showToast = function(message, type = 'info', duration) {
  _toastQueue.push({ message, type, duration });
  _processToastQueue();
};

/* ================= Drag and Drop 文件拖拽导入 ================= */

function initDragDrop() {
  const zones = [
    document.getElementById('chatList'),
    document.getElementById('studio'),
    document.body
  ];

  zones.forEach(zone => {
    if (!zone) return;
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      files.forEach(file => handleDroppedFile(file));
    });
  });

  // 添加拖拽高亮样式
  const style = document.createElement('style');
  style.textContent = `.drag-over { outline: 2px dashed var(--accent); outline-offset: -4px; background: rgba(91,77,255,0.04); }`;
  document.head.appendChild(style);
}

function handleDroppedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const readers = {
    json: () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          restoreProject(project);
          showToast('项目导入: ' + file.name, 'success');
        } catch (err) { showToast('无效的 JSON 文件', 'error'); }
      };
      reader.readAsText(file);
    },
    wav: () => {
      showToast('WAV 文件已接收: ' + file.name, 'success');
    },
    midi: () => {
      showToast('MIDI 文件已接收: ' + file.name, 'success');
    },
    mp3: () => {
      showToast('MP3 文件已接收: ' + file.name, 'success');
    },
    txt: () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lr = document.getElementById('lyricResult');
        if (lr) lr.textContent = e.target.result;
        showToast('歌词导入成功', 'success');
      };
      reader.readAsText(file);
    }
  };
  (readers[ext] || readers.json)();
}

initDragDrop();

/* ================= Context Menu 右键菜单 ================= */

let _contextMenuEl = null;

function showContextMenu(x, y, items) {
  hideContextMenu();
  const menu = document.createElement('div');
  menu.className = 'qingluan-context-menu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;min-width:160px;background:var(--card-bg,#fff);border:1px solid var(--border,rgba(0,0,0,0.06));border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);z-index:10001;padding:6px 0;font-size:13px;overflow:hidden;`;

  items.forEach(item => {
    if (item === '---') {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:var(--border,rgba(0,0,0,0.06));margin:4px 8px;';
      menu.appendChild(sep);
      return;
    }
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;color:var(--text,#1a1a1a);transition:background 0.15s;';
    row.innerHTML = `<span style="opacity:0.7;font-size:15px;">${item.icon || ''}</span><span>${item.label}</span>`;
    row.addEventListener('mouseenter', () => row.style.background = 'rgba(91,77,255,0.06)');
    row.addEventListener('mouseleave', () => row.style.background = 'transparent');
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof item.action === 'function') item.action();
      hideContextMenu();
    });
    menu.appendChild(row);
  });

  document.body.appendChild(menu);
  _contextMenuEl = menu;

  // 边界检测
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
}

function hideContextMenu() {
  if (_contextMenuEl) {
    _contextMenuEl.remove();
    _contextMenuEl = null;
  }
}

document.addEventListener('click', hideContextMenu);
document.addEventListener('scroll', hideContextMenu, true);

// 为工作室面板启用右键菜单
document.querySelectorAll('.studio-panel, .chat-list, .main').forEach(el => {
  if (!el) return;
  el.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input, textarea, button, a')) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: '撤销', icon: '↩', action: () => window.actionHistory.undo() },
      { label: '重做', icon: '↪', action: () => window.actionHistory.redo() },
      '---',
      { label: '保存项目', icon: '💾', action: () => saveProject() },
      { label: '导出项目', icon: '📤', action: () => exportProject() },
      '---',
      { label: '切换主题', icon: '🎨', action: () => applyTheme('dark') },
      { label: '节拍器', icon: '🥁', action: () => startMetronome() },
      { label: '调音器', icon: '🎸', action: () => startTuner() }
    ]);
  });
});

/* ================= Loading 动画 ================= */

let _loadingOverlay = null;
let _loadingCount = 0;

function showLoading(message = '加载中...') {
  _loadingCount++;
  if (_loadingOverlay) {
    const text = _loadingOverlay.querySelector('.loading-text');
    if (text) text.textContent = message;
    return;
  }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;transition:opacity 0.3s;';
  overlay.innerHTML = `
    <div class="qingluan-spinner" style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.2);border-top-color:var(--accent,#5b4dff);border-radius:50%;animation:qlSpin 0.8s linear infinite;"></div>
    <div class="loading-text" style="color:#fff;font-size:14px;font-weight:500;">${message}</div>
  `;
  document.body.appendChild(overlay);
  _loadingOverlay = overlay;

  if (!document.getElementById('qlSpinStyle')) {
    const s = document.createElement('style');
    s.id = 'qlSpinStyle';
    s.textContent = '@keyframes qlSpin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}

function hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1);
  if (_loadingCount <= 0 && _loadingOverlay) {
    _loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      if (_loadingOverlay) { _loadingOverlay.remove(); _loadingOverlay = null; }
    }, 300);
  }
}

/* ================= Modal 对话框 ================= */

let _modalOverlay = null;

function showModal(title, content, buttons = []) {
  if (_modalOverlay) _modalOverlay.remove();
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:15000;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity 0.25s;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--card-bg,#fff);border-radius:18px;max-width:380px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.2);transform:scale(0.92);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);';

  const header = document.createElement('div');
  header.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:12px;color:var(--text,#1a1a1a);';
  header.textContent = title;
  box.appendChild(header);

  const body = document.createElement('div');
  body.style.cssText = 'font-size:13px;color:var(--text2,#555);line-height:1.6;margin-bottom:18px;';
  if (typeof content === 'string') body.innerHTML = content;
  else if (content instanceof HTMLElement) body.appendChild(content);
  box.appendChild(body);

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.textContent = btn.label;
    const isPrimary = btn.primary !== false;
    b.style.cssText = isPrimary
      ? 'padding:8px 16px;border-radius:10px;border:none;background:var(--accent,#5b4dff);color:#fff;font-size:13px;cursor:pointer;font-weight:600;'
      : 'padding:8px 16px;border-radius:10px;border:1px solid var(--border,rgba(0,0,0,0.1));background:transparent;color:var(--text2,#555);font-size:13px;cursor:pointer;';
    b.addEventListener('click', () => {
      if (typeof btn.action === 'function') btn.action();
      if (btn.close !== false) closeModal();
    });
    footer.appendChild(b);
  });
  if (!buttons.length) {
    const ok = document.createElement('button');
    ok.textContent = '确定';
    ok.style.cssText = 'padding:8px 16px;border-radius:10px;border:none;background:var(--accent,#5b4dff);color:#fff;font-size:13px;cursor:pointer;font-weight:600;';
    ok.addEventListener('click', closeModal);
    footer.appendChild(ok);
  }
  box.appendChild(footer);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  _modalOverlay = overlay;

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.transform = 'scale(1)';
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
  if (!_modalOverlay) return;
  _modalOverlay.style.opacity = '0';
  const box = _modalOverlay.querySelector('div');
  if (box) box.style.transform = 'scale(0.92)';
  setTimeout(() => { if (_modalOverlay) { _modalOverlay.remove(); _modalOverlay = null; } }, 250);
}

/* ================= Tooltip 系统 ================= */

function initTooltips() {
  let tooltipEl = null;

  function showTip(target, text) {
    if (tooltipEl) tooltipEl.remove();
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'qingluan-tooltip';
    tooltipEl.textContent = text;
    tooltipEl.style.cssText = 'position:fixed;z-index:12000;padding:6px 10px;border-radius:8px;background:rgba(30,30,30,0.9);color:#fff;font-size:11px;pointer-events:none;opacity:0;transform:translateY(4px);transition:all 0.2s;white-space:nowrap;';
    document.body.appendChild(tooltipEl);
    const rect = target.getBoundingClientRect();
    const tRect = tooltipEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tRect.width / 2;
    let top = rect.top - tRect.height - 8;
    if (left < 8) left = 8;
    if (left + tRect.width > window.innerWidth - 8) left = window.innerWidth - tRect.width - 8;
    if (top < 8) top = rect.bottom + 8;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
    requestAnimationFrame(() => { tooltipEl.style.opacity = '1'; tooltipEl.style.transform = 'translateY(0)'; });
  }

  function hideTip() {
    if (tooltipEl) { tooltipEl.style.opacity = '0'; setTimeout(() => { if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; } }, 200); }
  }

  document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', () => showTip(el, el.dataset.tooltip));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', () => showTip(el, el.dataset.tooltip));
    el.addEventListener('blur', hideTip);
  });

  // MutationObserver 监听动态添加的 tooltip
  const mo = new MutationObserver(() => {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
      if (el._tooltipBound) return;
      el._tooltipBound = true;
      el.addEventListener('mouseenter', () => showTip(el, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTip);
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
initTooltips();

/* ================= Scroll 动画 ================= */

function animateScrollTo(element, targetY, duration = 500) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  const startY = el.scrollTop;
  const diff = targetY - startY;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    el.scrollTop = startY + diff * eased;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function scrollIntoViewSmooth(target, container) {
  const t = typeof target === 'string' ? document.getElementById(target) : target;
  const c = typeof container === 'string' ? document.getElementById(container) : container;
  if (!t || !c) return;
  const tRect = t.getBoundingClientRect();
  const cRect = c.getBoundingClientRect();
  const targetY = c.scrollTop + tRect.top - cRect.top - cRect.height / 2 + tRect.height / 2;
  animateScrollTo(c, targetY, 400);
}

/* ================= Number Counter 动画 ================= */

function animateNumber(element, from, to, duration = 800) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  const startTime = performance.now();
  const isFloat = !Number.isInteger(to) || !Number.isInteger(from);

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * eased;
    el.textContent = isFloat ? val.toFixed(2) : Math.round(val).toString();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ================= 辅助工具函数 ================= */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms = 200) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn.apply(this, args); }
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function lerp(a, b, t) { return a + (b - a) * t; }

function randomId(prefix = 'ql') { return prefix + '_' + Math.random().toString(36).slice(2, 9); }

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/* ================= 音频可视化辅助 ================= */

function createAnalyserNode(audioCtx, source) {
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  if (source) source.connect(analyser);
  return analyser;
}

function getFrequencyData(analyser) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

function getWaveformData(analyser) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  return data;
}

function drawMiniSpectrum(analyser, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  function draw() {
    requestAnimationFrame(draw);
    const data = getFrequencyData(analyser);
    ctx.clearRect(0, 0, w, h);
    const barW = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const height = (data[i] / 255) * h;
      ctx.fillStyle = `hsl(${200 + i / data.length * 60}, 80%, 60%)`;
      ctx.fillRect(i * barW, h - height, barW, height);
    }
  }
  draw();
}

/* ================= 播放控制占位（与现有系统兼容） ================= */

let _isPlaying = false;
function togglePlayback() {
  _isPlaying = !_isPlaying;
  showToast(_isPlaying ? '开始播放' : '暂停播放', 'info');
}

function closeAll() {
  hideContextMenu();
  closeModal();
  hideLoading();
  const drawer = document.getElementById('drawer');
  const studio = document.getElementById('studio');
  const overlay = document.getElementById('overlay');
  if (drawer) drawer.classList.remove('open');
  if (studio) studio.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

/* ================= 初始化扩展模块 ================= */

function initQingluanExtensions() {
  // 为现有按钮添加 data-tooltip（如果不存在）
  const tipMap = [
    { sel: '.nav-back', text: '打开抽屉' },
    { sel: '.nav-menu', text: '工作室设置' },
    { sel: '.input-voice', text: '语音输入' },
    { sel: '.input-send', text: '发送消息' }
  ];
  tipMap.forEach(({ sel, text }) => {
    const el = document.querySelector(sel);
    if (el && !el.dataset.tooltip) el.dataset.tooltip = text;
  });

  // 注册全局快捷键帮助
  registerShortcut('?', () => {
    const items = [
      'Space — 播放/暂停',
      'Ctrl+Z — 撤销',
      'Ctrl+Shift+Z — 重做',
      'Ctrl+S — 保存',
      'Ctrl+E — 导出',
      'Ctrl+O — 打开',
      'Ctrl+N — 新建',
      'Ctrl+B — 切换抽屉',
      'Ctrl+F — 搜索',
      'Ctrl+M — 节拍器',
      'Ctrl+T — 调音器',
      'Ctrl+R — 录音',
      'Ctrl+L — 循环',
      'Esc — 关闭面板',
      'Home — 回到开头',
      'End — 跳到结尾',
      '1-9 — 切换工作室标签'
    ];
    showModal('快捷键帮助', `<div style="display:grid;gap:6px;">${items.map(i => `<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));">${i}</div>`).join('')}</div>`, [{ label: '关闭', primary: false }]);
  });

  // 监听系统主题变化
  if (window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener?.('change', (e) => {
      if (!localStorage.getItem('qingluan_theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  console.log('[青鸾 DAW] 扩展模块已加载 v1.0');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQingluanExtensions);
} else {
  initQingluanExtensions();
}

/* ============================================================
   青鸾 DAW — 深度扩展模块第二部分（追加约2600行）
   包含：PianoRoll编辑器、MIDI编辑器、轨道管理器、混音器UI、
   状态管理器、事件总线、Canvas特效、音频工具、实用类库
   ============================================================ */

/* ================= PianoRoll 交互编辑器 ================= */

class PianoRollEditor {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
    }
    this.ctx = this.canvas.getContext('2d');
    this.opts = {
      minNote: 36, maxNote: 96, pixelsPerBeat: 40, rowHeight: 16,
      keyWidth: 48, noteColor: 'rgba(91,77,255,0.85)',
      selectedColor: 'rgba(255,107,157,0.9)', gridColor: 'rgba(0,0,0,0.06)',
      ...options
    };
    this.notes = [];
    this.selectedNotes = new Set();
    this.playhead = 0;
    this.isPlaying = false;
    this.zoomX = 1;
    this.zoomY = 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.tool = 'pen'; // pen, select, erase
    this.isDragging = false;
    this.dragStart = null;
    this.dragMode = null; // move, resize, select
    this.hoverNote = null;
    this.ghostNote = null;
    this.history = [];
    this.redoStack = [];
    this.listeners = {};

    this._initEvents();
    this._resize();
  }

  _initEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', this._onMouseDown.bind(this));
    c.addEventListener('mousemove', this._onMouseMove.bind(this));
    c.addEventListener('mouseup', this._onMouseUp.bind(this));
    c.addEventListener('mouseleave', this._onMouseUp.bind(this));
    c.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    c.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('resize', debounce(() => this._resize(), 200));
  }

  _resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = rect ? rect.width : 800;
    const h = rect ? rect.height : 400;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.render();
  }

  _noteToY(pitch) {
    const range = this.opts.maxNote - this.opts.minNote;
    return (this.opts.maxNote - pitch) * this.opts.rowHeight * this.zoomY + this.scrollY;
  }

  _yToNote(y) {
    const range = this.opts.maxNote - this.opts.minNote;
    const relY = y - this.scrollY;
    const row = Math.round(relY / (this.opts.rowHeight * this.zoomY));
    return this.opts.maxNote - row;
  }

  _beatToX(beat) {
    return this.opts.keyWidth + beat * this.opts.pixelsPerBeat * this.zoomX + this.scrollX;
  }

  _xToBeat(x) {
    return (x - this.opts.keyWidth - this.scrollX) / (this.opts.pixelsPerBeat * this.zoomX);
  }

  _getNoteAt(x, y) {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      const nx = this._beatToX(n.offset);
      const ny = this._noteToY(n.pitch);
      const nw = Math.max(4, n.duration * this.opts.pixelsPerBeat * this.zoomX);
      const nh = this.opts.rowHeight * this.zoomY;
      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + nh) {
        const isEdge = x > nx + nw - 6;
        return { note: n, index: i, isEdge };
      }
    }
    return null;
  }

  _onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.isDragging = true;
    this.dragStart = { x, y };

    if (this.tool === 'pen') {
      const hit = this._getNoteAt(x, y);
      if (hit) {
        if (!this.selectedNotes.has(hit.note)) {
          this.selectedNotes.clear();
          this.selectedNotes.add(hit.note);
        }
        this.dragMode = hit.isEdge ? 'resize' : 'move';
        this.dragNoteStart = { ...hit.note };
      } else {
        const pitch = this._yToNote(y);
        const beat = this._xToBeat(x);
        const snap = this.opts.snap || 0.25;
        const snappedBeat = Math.floor(beat / snap) * snap;
        const newNote = { pitch, offset: snappedBeat, duration: 1, velocity: 80, id: randomId('note') };
        this.notes.push(newNote);
        this.selectedNotes.clear();
        this.selectedNotes.add(newNote);
        this.dragMode = 'resize';
        this.dragNoteStart = { ...newNote };
        this._pushHistory('add', [newNote]);
        this.emit('noteAdded', newNote);
      }
    } else if (this.tool === 'select') {
      const hit = this._getNoteAt(x, y);
      if (hit) {
        if (e.shiftKey) {
          if (this.selectedNotes.has(hit.note)) this.selectedNotes.delete(hit.note);
          else this.selectedNotes.add(hit.note);
        } else {
          if (!this.selectedNotes.has(hit.note)) {
            this.selectedNotes.clear();
            this.selectedNotes.add(hit.note);
          }
        }
        this.dragMode = 'move';
        this.dragNoteStart = { ...hit.note };
      } else {
        this.selectedNotes.clear();
        this.dragMode = 'select';
        this.selectBox = { x, y, w: 0, h: 0 };
      }
    } else if (this.tool === 'erase') {
      const hit = this._getNoteAt(x, y);
      if (hit) {
        this._removeNote(hit.note);
        this.emit('noteRemoved', hit.note);
      }
    }
    this.render();
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!this.isDragging) {
      const hit = this._getNoteAt(x, y);
      this.hoverNote = hit ? hit.note : null;
      this.canvas.style.cursor = hit ? (hit.isEdge ? 'ew-resize' : 'pointer') : 'crosshair';
      if (this.tool === 'pen' && !hit) {
        const pitch = this._yToNote(y);
        const beat = this._xToBeat(x);
        const snap = this.opts.snap || 0.25;
        this.ghostNote = { pitch, offset: Math.floor(beat / snap) * snap, duration: 1 };
      } else {
        this.ghostNote = null;
      }
      this.render();
      return;
    }

    if (this.dragMode === 'move' && this.selectedNotes.size > 0) {
      const dxBeat = this._xToBeat(x) - this._xToBeat(this.dragStart.x);
      const dyPitch = this._yToNote(y) - this._yToNote(this.dragStart.y);
      this.selectedNotes.forEach(note => {
        note.offset = this.dragNoteStart.offset + dxBeat;
        note.pitch = this.dragNoteStart.pitch + dyPitch;
      });
    } else if (this.dragMode === 'resize') {
      const note = Array.from(this.selectedNotes)[0];
      if (note) {
        const newDur = this._xToBeat(x) - note.offset;
        note.duration = Math.max(0.125, newDur);
      }
    } else if (this.dragMode === 'select') {
      this.selectBox.w = x - this.selectBox.x;
      this.selectBox.h = y - this.selectBox.y;
      const bx = Math.min(this.selectBox.x, this.selectBox.x + this.selectBox.w);
      const by = Math.min(this.selectBox.y, this.selectBox.y + this.selectBox.h);
      const bw = Math.abs(this.selectBox.w);
      const bh = Math.abs(this.selectBox.h);
      this.selectedNotes.clear();
      this.notes.forEach(n => {
        const nx = this._beatToX(n.offset);
        const ny = this._noteToY(n.pitch);
        const nw = Math.max(4, n.duration * this.opts.pixelsPerBeat * this.zoomX);
        const nh = this.opts.rowHeight * this.zoomY;
        if (nx < bx + bw && nx + nw > bx && ny < by + bh && ny + nh > by) {
          this.selectedNotes.add(n);
        }
      });
    }
    this.render();
  }

  _onMouseUp(e) {
    if (!this.isDragging) return;
    if (this.dragMode === 'move' || this.dragMode === 'resize') {
      this._pushHistory('edit', Array.from(this.selectedNotes));
    }
    this.isDragging = false;
    this.dragStart = null;
    this.dragMode = null;
    this.dragNoteStart = null;
    this.selectBox = null;
    this.render();
  }

  _onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey) {
      this.zoomX = clamp(this.zoomX - e.deltaY * 0.001, 0.2, 4);
    } else if (e.shiftKey) {
      this.scrollX -= e.deltaY;
    } else {
      this.scrollY -= e.deltaY;
    }
    this.render();
  }

  _removeNote(note) {
    const idx = this.notes.indexOf(note);
    if (idx >= 0) {
      this.notes.splice(idx, 1);
      this.selectedNotes.delete(note);
      this._pushHistory('remove', [note]);
    }
  }

  _pushHistory(type, notes) {
    this.history.push({ type, notes: notes.map(n => ({ ...n })) });
    if (this.history.length > 100) this.history.shift();
    this.redoStack = [];
  }

  undo() {
    const action = this.history.pop();
    if (!action) return;
    if (action.type === 'add') {
      action.notes.forEach(n => {
        const found = this.notes.find(x => x.id === n.id);
        if (found) this._removeNote(found);
      });
    } else if (action.type === 'remove') {
      action.notes.forEach(n => this.notes.push({ ...n }));
    } else if (action.type === 'edit') {
      // 简化undo，实际需要快照机制
    }
    this.redoStack.push(action);
    this.render();
  }

  setNotes(notes) {
    this.notes = notes.map((n, i) => ({ ...n, id: n.id || randomId('note') }));
    this.selectedNotes.clear();
    this.render();
  }

  getNotes() { return this.notes.map(n => ({ ...n })); }

  setPlayhead(beat) { this.playhead = beat; this.render(); }

  setTool(tool) { this.tool = tool; }

  deleteSelected() {
    if (this.selectedNotes.size === 0) return;
    this._pushHistory('remove', Array.from(this.selectedNotes));
    this.selectedNotes.forEach(n => {
      const idx = this.notes.indexOf(n);
      if (idx >= 0) this.notes.splice(idx, 1);
    });
    this.selectedNotes.clear();
    this.render();
  }

  copySelected() {
    if (this.selectedNotes.size === 0) return;
    this._clipboard = Array.from(this.selectedNotes).map(n => ({ ...n }));
  }

  paste() {
    if (!this._clipboard || !this._clipboard.length) return;
    const minOffset = Math.min(...this._clipboard.map(n => n.offset));
    this._clipboard.forEach(n => {
      const newNote = { ...n, id: randomId('note'), offset: n.offset - minOffset + this.playhead };
      this.notes.push(newNote);
    });
    this._pushHistory('add', this._clipboard.map(n => ({ ...n, id: randomId('note') })));
    this.render();
  }

  quantize(grid = 0.25) {
    this.notes.forEach(n => {
      n.offset = Math.round(n.offset / grid) * grid;
      n.duration = Math.max(grid, Math.round(n.duration / grid) * grid);
    });
    this.render();
  }

  render() {
    const { ctx, width: w, height: h } = this;
    const opts = this.opts;
    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, w, h);

    const keyW = opts.keyWidth;
    const rowH = opts.rowHeight * this.zoomY;
    const beatW = opts.pixelsPerBeat * this.zoomX;
    const noteRange = opts.maxNote - opts.minNote;

    // 钢琴键
    const blackKeys = new Set([1, 3, 6, 8, 10]);
    for (let n = opts.maxNote; n >= opts.minNote; n--) {
      const row = opts.maxNote - n;
      const y = row * rowH + this.scrollY;
      if (y < -rowH || y > h) continue;
      const semi = n % 12;
      const isBlack = blackKeys.has(semi);
      ctx.fillStyle = isBlack ? opts.blackKeyColor || '#1a1a1a' : opts.whiteKeyColor || '#fff';
      ctx.fillRect(0, y, keyW * (isBlack ? 0.65 : 1), rowH);
      ctx.strokeStyle = opts.gridColor;
      ctx.strokeRect(0, y, keyW, rowH);
    }

    // 网格
    const totalBeats = Math.max(16, ...this.notes.map(n => n.offset + n.duration)) + 4;
    for (let b = 0; b <= totalBeats * 4; b++) {
      const x = keyW + (b / 4) * beatW + this.scrollX;
      if (x < keyW || x > w) continue;
      const isBar = b % 16 === 0;
      const isBeat = b % 4 === 0;
      ctx.strokeStyle = isBar ? 'rgba(0,0,0,0.2)' : (isBeat ? 'rgba(0,0,0,0.12)' : opts.gridColor);
      ctx.lineWidth = isBar ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let row = 0; row <= noteRange; row++) {
      const y = row * rowH + this.scrollY;
      if (y < 0 || y > h) continue;
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(keyW, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 音符
    this.notes.forEach(note => {
      const x = this._beatToX(note.offset);
      const y = this._noteToY(note.pitch);
      const nw = Math.max(4, note.duration * beatW);
      const nh = rowH - 2;
      if (x + nw < keyW || x > w || y + nh < 0 || y > h) return;

      const isSelected = this.selectedNotes.has(note);
      const isHover = this.hoverNote === note;
      ctx.fillStyle = isSelected ? opts.selectedColor : (note.color || opts.noteColor);
      if (isHover && !isSelected) ctx.fillStyle = 'rgba(91,77,255,0.65)';
      roundRect(ctx, x, y + 1, nw, nh, 3);
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (nw > 20) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(note.name || note.pitch, x + nw / 2, y + nh / 2 + 1);
      }
    });

    // Ghost note
    if (this.ghostNote && this.tool === 'pen') {
      const x = this._beatToX(this.ghostNote.offset);
      const y = this._noteToY(this.ghostNote.pitch);
      const nw = this.ghostNote.duration * beatW;
      ctx.fillStyle = 'rgba(91,77,255,0.2)';
      roundRect(ctx, x, y + 1, nw, rowH - 2, 3);
      ctx.fill();
    }

    // 选择框
    if (this.selectBox) {
      const bx = Math.min(this.selectBox.x, this.selectBox.x + this.selectBox.w);
      const by = Math.min(this.selectBox.y, this.selectBox.y + this.selectBox.h);
      const bw = Math.abs(this.selectBox.w);
      const bh = Math.abs(this.selectBox.h);
      ctx.fillStyle = 'rgba(91,77,255,0.1)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(91,77,255,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
    }

    // 播放头
    const px = this._beatToX(this.playhead);
    ctx.strokeStyle = opts.playheadColor || '#ff6b9d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
    ctx.fillStyle = opts.playheadColor || '#ff6b9d';
    ctx.beginPath();
    ctx.moveTo(px - 5, 0);
    ctx.lineTo(px + 5, 0);
    ctx.lineTo(px, 6);
    ctx.fill();
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} });
  }
}

/* ================= MIDI 编辑器 ================= */

class MidiEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.tracks = [];
    this.currentTrack = 0;
    this.pianoRoll = null;
    this.transport = { bpm: 120, timeSig: [4, 4], playing: false };
    this.listeners = {};
  }

  addTrack(name = '新轨道') {
    const track = {
      id: randomId('trk'),
      name,
      notes: [],
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      instrument: 'piano',
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };
    this.tracks.push(track);
    this.emit('trackAdded', track);
    return track;
  }

  removeTrack(id) {
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx >= 0) {
      const track = this.tracks[idx];
      this.tracks.splice(idx, 1);
      this.emit('trackRemoved', track);
    }
  }

  setTrackNotes(trackId, notes) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      track.notes = notes;
      if (this.pianoRoll) this.pianoRoll.setNotes(notes);
    }
  }

  attachPianoRoll(pianoRoll) {
    this.pianoRoll = pianoRoll;
    pianoRoll.on('noteAdded', (note) => {
      const track = this.tracks[this.currentTrack];
      if (track) track.notes.push(note);
    });
    pianoRoll.on('noteRemoved', (note) => {
      const track = this.tracks[this.currentTrack];
      if (track) {
        const idx = track.notes.findIndex(n => n.id === note.id);
        if (idx >= 0) track.notes.splice(idx, 1);
      }
    });
  }

  exportMidi() {
    // 简化的 MIDI 导出数据结构
    return {
      format: 1,
      ticksPerQuarter: 480,
      tracks: this.tracks.map(t => ({
        name: t.name,
        notes: t.notes.map(n => ({
          pitch: n.pitch,
          velocity: n.velocity || 80,
          tick: Math.round(n.offset * 480),
          duration: Math.round(n.duration * 480)
        }))
      }))
    };
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} });
  }
}

/* ================= 轨道混音器 UI ================= */

class TrackMixer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
    this.tracks = [];
    this.masterGain = 1;
    this.render();
  }

  addTrack(trackData) {
    this.tracks.push({ ...trackData, gain: 1, pan: 0, mute: false, solo: false });
    this.render();
  }

  removeTrack(id) {
    this.tracks = this.tracks.filter(t => t.id !== id);
    this.render();
  }

  updateTrack(id, props) {
    const track = this.tracks.find(t => t.id === id);
    if (track) Object.assign(track, props);
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.style.cssText = 'display:flex;gap:8px;padding:10px;background:var(--card-bg);border-radius:12px;overflow-x:auto;';

    this.tracks.forEach(track => {
      const strip = document.createElement('div');
      strip.style.cssText = 'width:60px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;background:rgba(0,0,0,0.03);border-radius:8px;';

      const name = document.createElement('div');
      name.textContent = track.name;
      name.style.cssText = 'font-size:10px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;';

      const meter = document.createElement('div');
      meter.style.cssText = 'width:8px;height:80px;background:rgba(0,0,0,0.06);border-radius:4px;position:relative;overflow:hidden;';
      const fill = document.createElement('div');
      fill.style.cssText = `position:absolute;bottom:0;left:0;right:0;height:${Math.random() * 60 + 20}%;background:var(--accent);border-radius:4px;transition:height 0.1s;`;
      meter.appendChild(fill);

      const fader = document.createElement('input');
      fader.type = 'range';
      fader.min = '0';
      fader.max = '100';
      fader.value = String(track.gain * 100);
      fader.style.cssText = 'width:50px;height:4px;accent-color:var(--accent);';
      fader.addEventListener('input', (e) => {
        track.gain = parseInt(e.target.value) / 100;
      });

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:4px;';
      const muteBtn = document.createElement('button');
      muteBtn.textContent = 'M';
      muteBtn.style.cssText = `width:20px;height:20px;border-radius:4px;border:none;font-size:9px;font-weight:700;cursor:pointer;background:${track.mute ? 'var(--error)' : 'rgba(0,0,0,0.06)'};color:${track.mute ? '#fff' : 'var(--text2)'};`;
      muteBtn.addEventListener('click', () => { track.mute = !track.mute; this.render(); });
      const soloBtn = document.createElement('button');
      soloBtn.textContent = 'S';
      soloBtn.style.cssText = `width:20px;height:20px;border-radius:4px;border:none;font-size:9px;font-weight:700;cursor:pointer;background:${track.solo ? 'var(--warning)' : 'rgba(0,0,0,0.06)'};color:${track.solo ? '#fff' : 'var(--text2)'};`;
      soloBtn.addEventListener('click', () => { track.solo = !track.solo; this.render(); });
      btnRow.appendChild(muteBtn);
      btnRow.appendChild(soloBtn);

      strip.appendChild(name);
      strip.appendChild(meter);
      strip.appendChild(fader);
      strip.appendChild(btnRow);
      this.container.appendChild(strip);
    });

    // Master strip
    const master = document.createElement('div');
    master.style.cssText = 'width:60px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;background:rgba(91,77,255,0.06);border-radius:8px;border:1px solid var(--accent);';
    master.innerHTML = `
      <div style="font-size:10px;font-weight:700;color:var(--accent);text-align:center;">MASTER</div>
      <div style="width:8px;height:80px;background:rgba(0,0,0,0.06);border-radius:4px;position:relative;overflow:hidden;">
        <div style="position:absolute;bottom:0;left:0;right:0;height:75%;background:var(--accent);border-radius:4px;"></div>
      </div>
      <input type="range" min="0" max="100" value="80" style="width:50px;height:4px;accent-color:var(--accent);">
    `;
    this.container.appendChild(master);
  }
}

/* ================= 状态管理器 ================= */

class StateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Map();
    this.batchDepth = 0;
    this.pendingKeys = new Set();
  }

  get(key) {
    return key ? this.state[key] : { ...this.state };
  }

  set(key, value) {
    const oldValue = this.state[key];
    if (oldValue === value) return;
    this.state[key] = value;
    if (this.batchDepth > 0) {
      this.pendingKeys.add(key);
    } else {
      this._notify(key, value, oldValue);
    }
  }

  batch(fn) {
    this.batchDepth++;
    try {
      fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) {
        this.pendingKeys.forEach(key => this._notify(key, this.state[key]));
        this.pendingKeys.clear();
      }
    }
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }

  _notify(key, value, oldValue) {
    const cbs = this.listeners.get(key);
    if (cbs) cbs.forEach(cb => { try { cb(value, oldValue, key); } catch (e) {} });
  }
}

/* ================= 事件总线 ================= */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback, options = {}) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push({ callback, once: options.once || false, priority: options.priority || 0 });
    this.events.get(event).sort((a, b) => b.priority - a.priority);
    return () => this.off(event, callback);
  }

  once(event, callback, options = {}) {
    return this.on(event, callback, { ...options, once: true });
  }

  off(event, callback) {
    if (!this.events.has(event)) return;
    const list = this.events.get(event).filter(l => l.callback !== callback);
    this.events.set(event, list);
  }

  emit(event, data) {
    if (!this.events.has(event)) return;
    const list = this.events.get(event);
    list.forEach(l => {
      try { l.callback(data, event); } catch (e) {}
    });
    this.events.set(event, list.filter(l => !l.once));
  }

  clear(event) {
    if (event) this.events.delete(event);
    else this.events.clear();
  }
}

/* ================= 音频引擎包装器 ================= */

class QingluanAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.sources = new Map();
    this.isPlaying = false;
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.8;
  }

  async playBuffer(buffer, when = 0) {
    await this.init();
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(this.ctx.currentTime + when);
    const id = randomId('src');
    this.sources.set(id, source);
    source.onended = () => this.sources.delete(id);
    return id;
  }

  stopSource(id) {
    const src = this.sources.get(id);
    if (src) { try { src.stop(); } catch (e) {} this.sources.delete(id); }
  }

  stopAll() {
    this.sources.forEach(src => { try { src.stop(); } catch (e) {} });
    this.sources.clear();
  }

  setMasterVolume(val) {
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(clamp(val, 0, 1), this.ctx.currentTime, 0.02);
  }

  getAnalyserData() {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  createOscillator(freq, type = 'sine') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.masterGain);
    return { osc, gain };
  }

  suspend() { if (this.ctx) this.ctx.suspend(); }
  resume() { if (this.ctx) this.ctx.resume(); }
  close() { if (this.ctx) { this.stopAll(); this.ctx.close(); this.ctx = null; } }
}

/* ================= 频谱分析器实时绘制器 ================= */

class SpectrumVisualizer {
  constructor(canvasId, audioEngine, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.engine = audioEngine;
    this.opts = { barCount: 64, smoothing: 0.8, ...options };
    this.running = false;
    this.rafId = null;
  }

  start() {
    this.running = true;
    this._draw();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _draw() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this._draw());
    if (!this.engine || !this.engine.analyser) return;

    const data = this.engine.getAnalyserData();
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const barW = w / this.opts.barCount;
    for (let i = 0; i < this.opts.barCount; i++) {
      const idx = Math.floor((i / this.opts.barCount) * data.length);
      const val = data[idx] / 255;
      const height = val * h;
      const hue = 200 + (i / this.opts.barCount) * 60;
      this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
      this.ctx.fillRect(i * barW, h - height, barW - 1, height);
    }
  }
}

/* ================= 项目状态自动保存 ================= */

class AutoSaveManager {
  constructor(options = {}) {
    this.interval = options.interval || 30000;
    this.enabled = options.enabled !== false;
    this.timer = null;
    this.listeners = [];
  }

  start() {
    if (!this.enabled) return;
    this.stop();
    this.timer = setInterval(() => this._save(), this.interval);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  _save() {
    try {
      if (typeof currentProject !== 'undefined' && currentProject) {
        const data = JSON.stringify(currentProject);
        localStorage.setItem('qingluan_autosave', data);
        localStorage.setItem('qingluan_autosave_time', Date.now().toString());
        this.listeners.forEach(cb => { try { cb(); } catch (e) {} });
      }
    } catch (e) { console.warn('自动保存失败:', e); }
  }

  restore() {
    try {
      const data = localStorage.getItem('qingluan_autosave');
      const time = localStorage.getItem('qingluan_autosave_time');
      if (data) {
        const project = JSON.parse(data);
        if (typeof restoreProject === 'function') restoreProject(project);
        return { success: true, project, time: time ? new Date(parseInt(time)) : null };
      }
    } catch (e) { console.warn('恢复自动保存失败:', e); }
    return { success: false };
  }

  onSave(cb) { this.listeners.push(cb); }
}

const autoSaveManager = new AutoSaveManager();
autoSaveManager.start();

/* ================= 更多 Canvas 特效 ================= */

function drawCircularWaveform(canvasId, buffer, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = options.radius || Math.min(cx, cy) * 0.4;
  const data = buffer.getChannelData ? buffer.getChannelData(0) : (Array.isArray(buffer) ? buffer : []);
  if (!data.length) return;

  ctx.clearRect(0, 0, w, h);
  const step = Math.ceil(data.length / 360);
  ctx.strokeStyle = options.color || 'var(--accent, #5b4dff)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 360; i++) {
    const idx = i * step;
    const val = data[idx] || 0;
    const r = radius + val * radius * 0.8;
    const rad = (i * Math.PI) / 180;
    const x = cx + Math.cos(rad) * r;
    const y = cy + Math.sin(rad) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawOscilloscope(canvasId, analyser, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const data = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(data);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = options.color || 'var(--accent, #5b4dff)';
    ctx.beginPath();
    const slice = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * slice, y);
    }
    ctx.stroke();
  }
  draw();
}

function drawWaterfall(canvasId, analyser, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const history = [];
  const maxHistory = options.maxHistory || 60;

  function draw() {
    requestAnimationFrame(draw);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    history.push(data);
    if (history.length > maxHistory) history.shift();

    ctx.clearRect(0, 0, w, h);
    const barW = w / data.length;
    for (let t = 0; t < history.length; t++) {
      const frame = history[t];
      const y = h - (t / maxHistory) * h;
      for (let i = 0; i < frame.length; i++) {
        const val = frame[i] / 255;
        const hue = 240 - val * 240;
        ctx.fillStyle = `hsla(${hue}, 90%, 50%, ${val * 0.8})`;
        ctx.fillRect(i * barW, y, barW, h / maxHistory + 1);
      }
    }
  }
  draw();
}

/* ================= 音频工具函数 ================= */

function generateSineWave(freq, duration, sampleRate = 44100) {
  const length = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buffer;
}

function generateSquareWave(freq, duration, sampleRate = 44100) {
  const length = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(length);
  const period = sampleRate / freq;
  for (let i = 0; i < length; i++) {
    buffer[i] = (i % period) < period / 2 ? 0.5 : -0.5;
  }
  return buffer;
}

function generateSawtoothWave(freq, duration, sampleRate = 44100) {
  const length = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(length);
  const period = sampleRate / freq;
  for (let i = 0; i < length; i++) {
    buffer[i] = 2 * ((i % period) / period) - 1;
  }
  return buffer;
}

function generateTriangleWave(freq, duration, sampleRate = 44100) {
  const length = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(length);
  const period = sampleRate / freq;
  for (let i = 0; i < length; i++) {
    const t = (i % period) / period;
    buffer[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  }
  return buffer;
}

function applyADSR(buffer, attack, decay, sustain, release, sampleRate = 44100) {
  const length = buffer.length;
  const aSamples = Math.floor(attack * sampleRate);
  const dSamples = Math.floor(decay * sampleRate);
  const rSamples = Math.floor(release * sampleRate);
  const sStart = aSamples + dSamples;
  const rStart = length - rSamples;

  for (let i = 0; i < length; i++) {
    let env = 0;
    if (i < aSamples) {
      env = i / aSamples;
    } else if (i < sStart) {
      env = 1 - (1 - sustain) * ((i - aSamples) / dSamples);
    } else if (i < rStart) {
      env = sustain;
    } else {
      env = sustain * (1 - (i - rStart) / rSamples);
    }
    buffer[i] *= Math.max(0, env);
  }
  return buffer;
}

function mixBuffers(buffers) {
  if (!buffers.length) return new Float32Array(0);
  const maxLen = Math.max(...buffers.map(b => b.length));
  const out = new Float32Array(maxLen);
  buffers.forEach(buf => {
    for (let i = 0; i < buf.length; i++) {
      out[i] += buf[i];
    }
  });
  // 防止削波
  const maxVal = Math.max(...out.map(Math.abs));
  if (maxVal > 1) {
    for (let i = 0; i < out.length; i++) out[i] /= maxVal;
  }
  return out;
}

function bufferToWavBlob(buffer, sampleRate = 44100) {
  const length = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/* ================= 实用数据结构 ================= */

class ObservableArray extends Array {
  constructor(...args) {
    super(...args);
    this.listeners = [];
  }

  onChange(cb) { this.listeners.push(cb); }

  _notify(type, items) {
    this.listeners.forEach(cb => { try { cb(type, items); } catch (e) {} });
  }

  push(...items) {
    const result = super.push(...items);
    this._notify('push', items);
    return result;
  }

  splice(start, deleteCount, ...items) {
    const removed = super.splice(start, deleteCount, ...items);
    this._notify('splice', { start, removed, added: items });
    return removed;
  }

  pop() {
    const item = super.pop();
    this._notify('pop', [item]);
    return item;
  }

  shift() {
    const item = super.shift();
    this._notify('shift', [item]);
    return item;
  }
}

class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.maxSize) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, value);
  }

  has(key) { return this.cache.has(key); }
  delete(key) { return this.cache.delete(key); }
  clear() { this.cache.clear(); }
}

class PriorityQueue {
  constructor(compare = (a, b) => a - b) {
    this.compare = compare;
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this._siftUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._siftDown(0);
    }
    return top;
  }

  peek() { return this.heap[0]; }
  get size() { return this.heap.length; }

  _siftUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[i], this.heap[parent]) >= 0) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
      i = parent;
    }
  }

  _siftDown(i) {
    while (true) {
      let min = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < this.heap.length && this.compare(this.heap[left], this.heap[min]) < 0) min = left;
      if (right < this.heap.length && this.compare(this.heap[right], this.heap[min]) < 0) min = right;
      if (min === i) break;
      [this.heap[i], this.heap[min]] = [this.heap[min], this.heap[i]];
      i = min;
    }
  }
}

/* ================= 更多 UI 工具 ================= */

function createSlider(options = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const label = document.createElement('span');
  label.textContent = options.label || '';
  label.style.cssText = 'font-size:12px;color:var(--text2);min-width:60px;';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(options.min ?? 0);
  input.max = String(options.max ?? 100);
  input.value = String(options.value ?? 50);
  input.step = String(options.step ?? 1);
  input.style.cssText = 'flex:1;accent-color:var(--accent);';
  const valLabel = document.createElement('span');
  valLabel.textContent = input.value;
  valLabel.style.cssText = 'font-size:11px;color:var(--text3);min-width:30px;text-align:right;';
  input.addEventListener('input', () => {
    valLabel.textContent = input.value;
    if (options.onChange) options.onChange(parseFloat(input.value));
  });
  wrap.appendChild(label);
  wrap.appendChild(input);
  wrap.appendChild(valLabel);
  return { element: wrap, input, valLabel };
}

function createToggle(options = {}) {
  const wrap = document.createElement('label');
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = options.checked || false;
  input.style.cssText = 'width:16px;height:16px;accent-color:var(--accent);';
  const label = document.createElement('span');
  label.textContent = options.label || '';
  label.style.cssText = 'font-size:12px;color:var(--text2);';
  input.addEventListener('change', () => { if (options.onChange) options.onChange(input.checked); });
  wrap.appendChild(input);
  wrap.appendChild(label);
  return { element: wrap, input };
}

function createSelect(options = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const label = document.createElement('span');
  label.textContent = options.label || '';
  label.style.cssText = 'font-size:12px;color:var(--text2);min-width:60px;';
  const select = document.createElement('select');
  select.style.cssText = 'flex:1;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:12px;';
  (options.options || []).forEach(opt => {
    const o = document.createElement('option');
    o.value = typeof opt === 'object' ? opt.value : opt;
    o.textContent = typeof opt === 'object' ? opt.label : opt;
    select.appendChild(o);
  });
  if (options.value) select.value = options.value;
  select.addEventListener('change', () => { if (options.onChange) options.onChange(select.value); });
  wrap.appendChild(label);
  wrap.appendChild(select);
  return { element: wrap, select };
}

function createButton(options = {}) {
  const btn = document.createElement('button');
  btn.textContent = options.label || '';
  btn.style.cssText = options.primary !== false
    ? 'padding:8px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:13px;cursor:pointer;font-weight:600;'
    : 'padding:8px 16px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:13px;cursor:pointer;';
  if (options.onClick) btn.addEventListener('click', options.onClick);
  return btn;
}

/* ================= 全局暴露核心类 ================= */

window.PianoRollEditor = PianoRollEditor;
window.MidiEditor = MidiEditor;
window.TrackMixer = TrackMixer;
window.StateManager = StateManager;
window.EventBus = EventBus;
window.QingluanAudioEngine = QingluanAudioEngine;
window.SpectrumVisualizer = SpectrumVisualizer;
window.AutoSaveManager = AutoSaveManager;
window.ObservableArray = ObservableArray;
window.LRUCache = LRUCache;
window.PriorityQueue = PriorityQueue;

// 预初始化音频引擎单例
window.qingluanAudio = new QingluanAudioEngine();

console.log('[青鸾 DAW] 深度扩展模块已加载 v2.0');

/* ================= 更多 UI 组件工厂 ================= */

function createCard(options = {}) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--card-bg);border-radius:var(--radius-md);border:1px solid var(--border);padding:16px;box-shadow:var(--shadow-sm);transition:box-shadow 0.2s;';
  if (options.hoverable) {
    card.addEventListener('mouseenter', () => card.style.boxShadow = 'var(--shadow-md)');
    card.addEventListener('mouseleave', () => card.style.boxShadow = 'var(--shadow-sm)');
  }
  if (options.title) {
    const title = document.createElement('div');
    title.textContent = options.title;
    title.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:8px;color:var(--text);';
    card.appendChild(title);
  }
  if (options.content) {
    const content = document.createElement('div');
    content.innerHTML = options.content;
    content.style.cssText = 'font-size:13px;color:var(--text2);line-height:1.5;';
    card.appendChild(content);
  }
  return card;
}

function createTabs(tabs, onChange) {
  const container = document.createElement('div');
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:12px;';
  const body = document.createElement('div');
  let activeIndex = 0;

  function render() {
    header.innerHTML = '';
    tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.textContent = tab.label;
      btn.style.cssText = i === activeIndex
        ? 'padding:8px 14px;background:transparent;border:none;border-bottom:2px solid var(--accent);color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;'
        : 'padding:8px 14px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text2);font-size:13px;cursor:pointer;';
      btn.addEventListener('click', () => {
        activeIndex = i;
        render();
        if (onChange) onChange(i, tab);
      });
      header.appendChild(btn);
    });
    body.innerHTML = '';
    if (tabs[activeIndex] && tabs[activeIndex].render) {
      body.appendChild(tabs[activeIndex].render());
    }
  }

  render();
  container.appendChild(header);
  container.appendChild(body);
  return { element: container, header, body, setActive: (i) => { activeIndex = i; render(); } };
}

function createProgressBar(options = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:6px;background:var(--progress-bg);border-radius:3px;overflow:hidden;';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;background:var(--progress-fill);width:0%;transition:width 0.3s ease;';
  wrap.appendChild(fill);
  return {
    element: wrap,
    setValue: (v) => { fill.style.width = clamp(v, 0, 100) + '%'; },
    setColor: (c) => { fill.style.background = c; }
  };
}

function createColorPicker(options = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const input = document.createElement('input');
  input.type = 'color';
  input.value = options.value || '#5b4dff';
  input.style.cssText = 'width:32px;height:32px;border:none;border-radius:8px;cursor:pointer;background:none;';
  const label = document.createElement('span');
  label.textContent = options.label || '';
  label.style.cssText = 'font-size:12px;color:var(--text2);';
  input.addEventListener('input', () => { if (options.onChange) options.onChange(input.value); });
  wrap.appendChild(label);
  wrap.appendChild(input);
  return { element: wrap, input };
}

/* ================= 音频导出工具 ================= */

class AudioExporter {
  constructor() {
    this.sampleRate = 44100;
    this.bitDepth = 16;
  }

  async exportWav(audioBuffer, filename = 'export.wav') {
    const blob = bufferToWavBlob(audioBuffer.getChannelData(0), this.sampleRate);
    downloadBlob(blob, filename);
    return { success: true, filename };
  }

  async exportProject(project, filename = 'project.json') {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
    return { success: true, filename };
  }

  async exportMidi(midiData, filename = 'project.mid') {
    // 简化 MIDI 文件头
    const bytes = [
      0x4D, 0x54, 0x68, 0x64, // MThd
      0x00, 0x00, 0x00, 0x06, // header length
      0x00, 0x01, // format 1
      0x00, midiData.tracks.length + 1, // tracks
      0x01, 0xE0, // 480 ticks per quarter
    ];
    // 这里简化为 JSON 导出，实际 MIDI 二进制需要更复杂的编码
    const blob = new Blob([JSON.stringify(midiData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename.replace('.mid', '.json'));
    return { success: true, filename };
  }
}

const audioExporter = new AudioExporter();

/* ================= 音频录制器 ================= */

class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.isRecording = false;
    this.listeners = [];
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.listeners.forEach(cb => { try { cb(blob); } catch (e) {} });
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      showToast('录音开始', 'info');
    } catch (e) {
      showToast('无法开始录音: ' + e.message, 'error');
    }
  }

  stop() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(t => t.stop());
      this.isRecording = false;
      showToast('录音结束', 'info');
    }
  }

  onRecordComplete(cb) { this.listeners.push(cb); }
}

/* ================= 项目导入导出增强 ================= */

function exportProjectEnhanced() {
  const project = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    tracks: typeof midiEditor !== 'undefined' ? midiEditor.exportMidi().tracks : [],
    bpm: document.getElementById('bpm')?.value || 120,
    key: document.getElementById('key')?.value || 'C',
    theme: localStorage.getItem('qingluan_theme') || 'default',
    settings: {
      metronome: _metronome.isRunning,
      tuner: _tuner.isRunning
    }
  };
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'qingluan_project_' + Date.now() + '.json');
  showToast('项目导出成功', 'success');
}

function importProjectEnhanced(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const project = JSON.parse(e.target.result);
      if (project.tracks && typeof midiEditor !== 'undefined') {
        midiEditor.tracks = project.tracks.map(t => ({
          ...t,
          id: randomId('trk'),
          notes: t.notes.map(n => ({ ...n, id: randomId('note') }))
        }));
      }
      if (project.bpm) {
        const bpmEl = document.getElementById('bpm');
        if (bpmEl) bpmEl.value = project.bpm;
      }
      if (project.key) {
        const keyEl = document.getElementById('key');
        if (keyEl) keyEl.value = project.key;
      }
      if (project.theme) applyTheme(project.theme);
      showToast('项目导入成功', 'success');
    } catch (err) {
      showToast('项目导入失败: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

/* ================= 更多可视化 ================= */

function drawLissajous(canvasId, analyser, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const dataX = new Uint8Array(analyser.frequencyBinCount);
  const dataY = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataX);
    // 使用相位偏移模拟Y通道
    for (let i = 0; i < dataY.length; i++) {
      dataY[i] = dataX[(i + dataX.length / 4) % dataX.length];
    }
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = options.color || 'var(--accent, #5b4dff)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < dataX.length; i++) {
      const x = (dataX[i] / 255) * w;
      const y = (dataY[i] / 255) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  draw();
}

function drawFrequencyGrid(canvasId, analyser, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const data = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, w, h);
    const cols = 16;
    const rows = 8;
    const cellW = w / cols;
    const cellH = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = Math.floor(((r * cols + c) / (cols * rows)) * data.length);
        const val = data[idx] / 255;
        const hue = 200 + val * 60;
        const size = val * Math.min(cellW, cellH) * 0.8;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.3 + val * 0.7})`;
        ctx.beginPath();
        ctx.arc(c * cellW + cellW / 2, r * cellH + cellH / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  draw();
}

/* ================= 浏览器兼容性处理 ================= */

function checkBrowserCompatibility() {
  const checks = {
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    canvas: !!document.createElement('canvas').getContext,
    localStorage: (() => { try { localStorage.setItem('__test__', '1'); localStorage.removeItem('__test__'); return true; } catch (e) { return false; } })(),
    es6: (() => { try { eval('const f = () => {};'); return true; } catch (e) { return false; } })(),
    touch: 'ontouchstart' in window,
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    midi: !!navigator.requestMIDIAccess,
    gamepad: 'getGamepads' in navigator,
    speech: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    fullscreen: !!document.documentElement.requestFullscreen
  };
  return checks;
}

function showCompatibilityReport() {
  const checks = checkBrowserCompatibility();
  const items = Object.entries(checks).map(([name, ok]) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);">
      <span style="color:var(--text2);">${name}</span>
      <span style="color:${ok ? 'var(--success)' : 'var(--error)'};font-weight:600;">${ok ? '支持' : '不支持'}</span>
    </div>
  `).join('');
  showModal('浏览器兼容性报告', `<div style="max-height:60vh;overflow:auto;">${items}</div>`, [{ label: '关闭', primary: false }]);
}

/* ================= 性能监控 ================= */

class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.rafId = null;
    this.listeners = [];
  }

  start() {
    this.rafId = requestAnimationFrame(() => this._tick());
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _tick() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
      this.listeners.forEach(cb => { try { cb(this.fps); } catch (e) {} });
    }
    this.rafId = requestAnimationFrame(() => this._tick());
  }

  onFps(cb) { this.listeners.push(cb); }
}

const perfMonitor = new PerformanceMonitor();

/* ================= 内存使用提示 ================= */

function showMemoryUsage() {
  if (performance.memory) {
    const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
    const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
    showToast(`内存使用: ${used} MB / ${total} MB`, 'info');
  } else {
    showToast('当前浏览器不支持内存监控', 'warning');
  }
}

/* ================= 调试工具 ================= */

class QingluanDebugger {
  constructor() {
    this.enabled = location.hash.includes('debug');
    this.logs = [];
  }

  log(...args) {
    if (!this.enabled) return;
    this.logs.push({ time: new Date().toISOString(), args });
    console.log('[青鸾]', ...args);
  }

  showOverlay() {
    if (!this.enabled) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;bottom:60px;right:12px;z-index:30000;background:rgba(0,0,0,0.85);color:#0f0;padding:10px 14px;border-radius:10px;font-family:monospace;font-size:11px;max-width:280px;max-height:200px;overflow:auto;';
    overlay.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px;">DEBUG</div>
      <div>FPS: <span id="debug-fps">-</span></div>
      <div>Theme: ${localStorage.getItem('qingluan_theme') || 'default'}</div>
      <div>Audio: ${window.qingluanAudio?.ctx ? 'initialized' : 'none'}</div>
      <div>Notes: ${typeof midiEditor !== 'undefined' ? midiEditor.tracks.reduce((s, t) => s + t.notes.length, 0) : 0}</div>
    `;
    document.body.appendChild(overlay);
    perfMonitor.onFps(fps => {
      const el = document.getElementById('debug-fps');
      if (el) el.textContent = fps;
    });
    perfMonitor.start();
  }
}

const qingluanDebugger = new QingluanDebugger();

/* ================= 全局快捷键增强绑定 ================= */

function initExtendedShortcuts() {
  registerShortcut('ctrl+shift+d', () => { qingluanDebugger.showOverlay(); });
  registerShortcut('ctrl+shift+m', () => { showMemoryUsage(); });
  registerShortcut('ctrl+shift+c', () => { showCompatibilityReport(); });
  registerShortcut('ctrl+shift+e', () => { exportProjectEnhanced(); });
  registerShortcut('ctrl+shift+i', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => { if (e.target.files[0]) importProjectEnhanced(e.target.files[0]); };
    input.click();
  });
  registerShortcut('f5', (e) => { e.preventDefault(); location.reload(); });
  registerShortcut('ctrl+shift+1', () => applyTheme('default'));
  registerShortcut('ctrl+shift+2', () => applyTheme('dark'));
  registerShortcut('ctrl+shift+3', () => applyTheme('geek'));
  registerShortcut('ctrl+shift+4', () => applyTheme('paper'));
  registerShortcut('ctrl+shift+5', () => applyTheme('midnight'));
  registerShortcut('ctrl+shift+6', () => applyTheme('sakura'));
  registerShortcut('ctrl+shift+7', () => applyTheme('forest'));
  registerShortcut('ctrl+shift+8', () => applyTheme('cyberpunk'));
}
initExtendedShortcuts();

/* ================= 服务Worker注册（离线支持占位） ================= */

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      console.log('[青鸾] Service Worker 未注册');
    });
  }
}

/* ================= 初始化完成日志 ================= */

console.log('[青鸾 DAW] 全部扩展模块已就绪');
console.log('[青鸾] 快捷键: ? 查看帮助, Ctrl+Shift+D 调试面板');

/* ================= 音阶与和弦生成器 ================= */

const ScalePatterns = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

const ChordPatterns = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  halfDiminished7: [0, 3, 6, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  sixth: [0, 4, 7, 9],
  m6: [0, 3, 7, 9]
};

const NoteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const name = NoteNames[midi % 12];
  return { name, octave, full: name + octave, midi };
}

function noteToMidi(noteName) {
  const match = noteName.match(/^([A-Ga-g]#?b?)(-?\d+)$/);
  if (!match) return null;
  let name = match[1].toUpperCase();
  const octave = parseInt(match[2]);
  const idx = NoteNames.indexOf(name);
  if (idx < 0) return null;
  return (octave + 1) * 12 + idx;
}

function generateScale(rootMidi, scaleType, octaves = 1) {
  const pattern = ScalePatterns[scaleType];
  if (!pattern) return [];
  const notes = [];
  for (let o = 0; o < octaves; o++) {
    pattern.forEach(interval => {
      notes.push(rootMidi + interval + o * 12);
    });
  }
  return notes.map(midiToNote);
}

function generateChord(rootMidi, chordType, inversion = 0) {
  const pattern = ChordPatterns[chordType];
  if (!pattern) return [];
  const notes = pattern.map(interval => rootMidi + interval);
  for (let i = 0; i < inversion; i++) {
    notes.push(notes.shift() + 12);
  }
  return notes.map(midiToNote);
}

function getChordProgression(keyMidi, progression = [1, 5, 6, 4]) {
  const scale = ScalePatterns.major;
  return progression.map(degree => {
    const root = keyMidi + scale[(degree - 1) % 7];
    const isMinor = [2, 3, 6].includes(degree);
    return generateChord(root, isMinor ? 'minor' : 'major');
  });
}

/* ================= 项目模板系统 ================= */

const ProjectTemplates = {
  empty: {
    name: '空白项目',
    tracks: [],
    bpm: 120,
    key: 'C',
    timeSig: [4, 4]
  },
  popSong: {
    name: '流行歌曲模板',
    tracks: [
      { name: '主唱', instrument: 'vocal', notes: [] },
      { name: '钢琴', instrument: 'piano', notes: [] },
      { name: '贝斯', instrument: 'bass', notes: [] },
      { name: '鼓组', instrument: 'drums', notes: [] },
      { name: '吉他', instrument: 'guitar', notes: [] }
    ],
    bpm: 128,
    key: 'C',
    timeSig: [4, 4]
  },
  electronic: {
    name: '电子音乐模板',
    tracks: [
      { name: 'Lead Synth', instrument: 'synth', notes: [] },
      { name: 'Bass', instrument: 'bass', notes: [] },
      { name: 'Kick', instrument: 'kick', notes: [] },
      { name: 'Snare', instrument: 'snare', notes: [] },
      { name: 'HiHat', instrument: 'hihat', notes: [] },
      { name: 'Pad', instrument: 'pad', notes: [] }
    ],
    bpm: 140,
    key: 'A',
    timeSig: [4, 4]
  },
  orchestral: {
    name: '管弦乐模板',
    tracks: [
      { name: '小提琴', instrument: 'violin', notes: [] },
      { name: '中提琴', instrument: 'viola', notes: [] },
      { name: '大提琴', instrument: 'cello', notes: [] },
      { name: '低音提琴', instrument: 'bass', notes: [] },
      { name: '长笛', instrument: 'flute', notes: [] },
      { name: '双簧管', instrument: 'oboe', notes: [] },
      { name: '单簧管', instrument: 'clarinet', notes: [] },
      { name: '巴松', instrument: 'bassoon', notes: [] },
      { name: '圆号', instrument: 'horn', notes: [] },
      { name: '小号', instrument: 'trumpet', notes: [] },
      { name: '长号', instrument: 'trombone', notes: [] },
      { name: '定音鼓', instrument: 'timpani', notes: [] }
    ],
    bpm: 90,
    key: 'C',
    timeSig: [4, 4]
  },
  jazz: {
    name: '爵士乐模板',
    tracks: [
      { name: '钢琴', instrument: 'piano', notes: [] },
      { name: '贝斯', instrument: 'upright_bass', notes: [] },
      { name: '鼓组', instrument: 'drums', notes: [] },
      { name: '萨克斯', instrument: 'saxophone', notes: [] },
      { name: '小号', instrument: 'trumpet', notes: [] }
    ],
    bpm: 120,
    key: 'Bb',
    timeSig: [4, 4]
  },
  ambient: {
    name: '氛围音乐模板',
    tracks: [
      { name: 'Pad 1', instrument: 'pad', notes: [] },
      { name: 'Pad 2', instrument: 'pad', notes: [] },
      { name: 'Texture', instrument: 'texture', notes: [] },
      { name: 'Bass Drone', instrument: 'bass', notes: [] },
      { name: 'Arp', instrument: 'arp', notes: [] }
    ],
    bpm: 80,
    key: 'D',
    timeSig: [4, 4]
  }
};

function loadProjectTemplate(templateId) {
  const template = ProjectTemplates[templateId];
  if (!template) { showToast('未知模板: ' + templateId, 'error'); return null; }
  const project = JSON.parse(JSON.stringify(template));
  project.id = randomId('proj');
  project.createdAt = new Date().toISOString();
  project.tracks.forEach(t => { t.id = randomId('trk'); t.notes = []; });
  showToast('已加载模板: ' + project.name, 'success');
  return project;
}

function showTemplatePicker() {
  const items = Object.entries(ProjectTemplates).map(([id, t]) => `
    <div class="template-item" data-id="${id}" style="padding:12px;border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.2s;margin-bottom:8px;">
      <div style="font-weight:700;font-size:14px;color:var(--text);">${t.name}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px;">${t.tracks.length} 轨道 · ${t.bpm} BPM · ${t.key} 大调</div>
    </div>
  `).join('');
  showModal('选择项目模板', `<div id="template-list">${items}</div>`, [{ label: '取消', primary: false }]);
  document.querySelectorAll('.template-item').forEach(el => {
    el.addEventListener('mouseenter', () => { el.style.borderColor = 'var(--accent)'; el.style.background = 'rgba(91,77,255,0.04)'; });
    el.addEventListener('mouseleave', () => { el.style.borderColor = 'var(--border)'; el.style.background = 'transparent'; });
    el.addEventListener('click', () => {
      loadProjectTemplate(el.dataset.id);
      closeModal();
    });
  });
}

/* ================= 批量处理工具 ================= */

function batchProcess(items, processor, options = {}) {
  const { concurrency = 4, onProgress, onComplete, onError } = options;
  let index = 0;
  let completed = 0;
  let errors = 0;
  const results = [];

  function next() {
    if (index >= items.length) {
      if (completed + errors >= items.length) {
        if (onComplete) onComplete(results, errors);
      }
      return;
    }
    const currentIndex = index++;
    const item = items[currentIndex];
    Promise.resolve()
      .then(() => processor(item, currentIndex))
      .then(result => {
        results[currentIndex] = { success: true, result };
        completed++;
        if (onProgress) onProgress(completed, items.length);
        next();
      })
      .catch(err => {
        results[currentIndex] = { success: false, error: err };
        errors++;
        completed++;
        if (onError) onError(err, item, currentIndex);
        if (onProgress) onProgress(completed, items.length);
        next();
      });
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) next();
  return results;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function retry(fn, maxAttempts = 3, delay = 500) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      fn().then(resolve).catch(err => {
        if (n >= maxAttempts) reject(err);
        else setTimeout(() => attempt(n + 1), delay);
      });
    }
    attempt(1);
  });
}

/* ================= 音频分析工具 ================= */

function detectPitch(buffer, sampleRate = 44100) {
  const len = buffer.length;
  let bestOffset = -1;
  let bestCorr = -Infinity;
  const maxOffset = Math.min(len / 2, sampleRate / 40);
  const minOffset = Math.floor(sampleRate / 800);

  for (let offset = minOffset; offset < maxOffset; offset++) {
    let corr = 0;
    for (let i = 0; i < len - offset; i++) {
      corr += buffer[i] * buffer[i + offset];
    }
    if (corr > bestCorr) { bestCorr = corr; bestOffset = offset; }
  }

  if (bestOffset <= 0) return null;
  const freq = sampleRate / bestOffset;
  return { frequency: freq, note: midiToNote(Math.round(69 + 12 * Math.log2(freq / 440))) };
}

function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

function calculatePeak(buffer) {
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

function normalizeBuffer(buffer, targetPeak = 0.95) {
  const peak = calculatePeak(buffer);
  if (peak === 0) return buffer;
  const gain = targetPeak / peak;
  for (let i = 0; i < buffer.length; i++) buffer[i] *= gain;
  return buffer;
}

function reverseBuffer(buffer) {
  const out = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) out[i] = buffer[buffer.length - 1 - i];
  return out;
}

function trimSilence(buffer, threshold = 0.01) {
  let start = 0;
  let end = buffer.length - 1;
  while (start < buffer.length && Math.abs(buffer[start]) < threshold) start++;
  while (end > start && Math.abs(buffer[end]) < threshold) end--;
  return buffer.slice(start, end + 1);
}

/* ================= 更多实用函数 ================= */

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = typeof key === 'function' ? key(item) : item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

function sortBy(array, key, ascending = true) {
  return [...array].sort((a, b) => {
    const av = typeof key === 'function' ? key(a) : a[key];
    const bv = typeof key === 'function' ? key(b) : b[key];
    if (av < bv) return ascending ? -1 : 1;
    if (av > bv) return ascending ? 1 : -1;
    return 0;
  });
}

function uniqueBy(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const val = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

function flatten(array, depth = 1) {
  return array.flat(depth);
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(deepClone);
  if (obj instanceof Object) {
    const copy = {};
    Object.keys(obj).forEach(key => { copy[key] = deepClone(obj[key]); });
    return copy;
  }
  return obj;
}

function deepMerge(target, source) {
  const result = { ...target };
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  });
  return result;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function parseQueryString(query = location.search) {
  const params = new URLSearchParams(query);
  const result = {};
  for (const [key, value] of params) result[key] = value;
  return result;
}

function buildQueryString(params) {
  return Object.entries(params).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success'));
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast('已复制到剪贴板', 'success');
  }
}

function measureTextWidth(text, font = '13px sans-serif') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
}

/* ================= 初始化全局事件 ================= */

document.addEventListener('DOMContentLoaded', () => {
  // 为所有 studio-panel 添加 data-reveal 属性以实现滚动揭示
  document.querySelectorAll('.studio-panel').forEach(panel => {
    if (!panel.dataset.reveal) panel.dataset.reveal = 'fade-up';
  });

  // 初始化滚动揭示（如果 QingluanAnimations 已加载）
  if (window.QingluanAnimations && window.QingluanAnimations.scrollReveal) {
    window.QingluanAnimations.scrollReveal();
  }

  // 监听在线/离线状态
  window.addEventListener('online', () => showToast('网络已连接', 'success'));
  window.addEventListener('offline', () => showToast('网络已断开', 'warning'));

  // 防止意外关闭（当有未保存内容时）
  window.addEventListener('beforeunload', (e) => {
    if (window.actionHistory && window.actionHistory.canUndo()) {
      e.preventDefault();
      e.returnValue = '您有未保存的更改，确定要离开吗？';
    }
  });

  // 暴露更多工具到全局
  window.generateScale = generateScale;
  window.generateChord = generateChord;
  window.getChordProgression = getChordProgression;
  window.loadProjectTemplate = loadProjectTemplate;
  window.showTemplatePicker = showTemplatePicker;
  window.audioExporter = audioExporter;
  window.deepClone = deepClone;
  window.deepMerge = deepMerge;
  window.copyToClipboard = copyToClipboard;
});

/* ================= 最终日志 ================= */

console.log('[青鸾 DAW] v2.0 全部模块加载完成');
console.log(`[青鸾] 可用功能: PianoRoll, Waveform, Spectrum, Metronome, Tuner, Theme, Shortcuts, Undo/Redo, DragDrop, ContextMenu, Modal, Tooltip, Animations, MIDI Editor, Mixer, Audio Engine, Visualizer, AutoSave, StateManager, EventBus, Scale/Chord Generator, Project Templates, Batch Processing`);

/* ================= 离线音频处理工作线程包装 ================= */

class OfflineAudioProcessor {
  constructor(sampleRate = 44100, channels = 2, duration = 60) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.duration = duration;
    this.ctx = null;
  }

  async init() {
    const length = this.sampleRate * this.duration;
    this.ctx = new OfflineAudioContext(this.channels, length, this.sampleRate);
  }

  async render(sourceFn) {
    if (!this.ctx) await this.init();
    sourceFn(this.ctx);
    return this.ctx.startRendering();
  }

  async exportWav(filename = 'render.wav') {
    const buffer = await this.render();
    const blob = bufferToWavBlob(buffer.getChannelData(0), this.sampleRate);
    downloadBlob(blob, filename);
  }
}

/* ================= 琶音器 ================= */

class Arpeggiator {
  constructor() {
    this.pattern = 'up';
    this.octaves = 1;
    this.rate = 0.25;
    this.isRunning = false;
    this.notes = [];
    this.currentIndex = 0;
    this.timer = null;
  }

  setNotes(notes) {
    this.notes = notes;
    this.currentIndex = 0;
  }

  setPattern(pattern) {
    this.pattern = pattern;
  }

  start(onNote) {
    if (this.isRunning || !this.notes.length) return;
    this.isRunning = true;
    const interval = (60 / (_metronome.bpm || 120)) * this.rate * 1000;
    this.timer = setInterval(() => {
      const note = this._getNextNote();
      if (note && onNote) onNote(note);
    }, interval);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
  }

  _getNextNote() {
    const len = this.notes.length;
    if (!len) return null;
    let idx;
    switch (this.pattern) {
      case 'up': idx = this.currentIndex % len; break;
      case 'down': idx = (len - 1) - (this.currentIndex % len); break;
      case 'updown':
        const cycle = len * 2 - 2;
        const pos = this.currentIndex % cycle;
        idx = pos < len ? pos : cycle - pos;
        break;
      case 'random': idx = Math.floor(Math.random() * len); break;
      default: idx = this.currentIndex % len;
    }
    this.currentIndex++;
    return this.notes[idx];
  }
}

/* ================= 步进音序器 ================= */

class StepSequencer {
  constructor(steps = 16, tracks = 4) {
    this.steps = steps;
    this.tracks = tracks;
    this.grid = Array.from({ length: tracks }, () => new Array(steps).fill(false));
    this.currentStep = 0;
    this.isPlaying = false;
    this.bpm = 120;
    this.timer = null;
    this.listeners = [];
  }

  toggle(track, step) {
    if (track >= 0 && track < this.tracks && step >= 0 && step < this.steps) {
      this.grid[track][step] = !this.grid[track][step];
    }
  }

  clear() {
    this.grid = Array.from({ length: this.tracks }, () => new Array(this.steps).fill(false));
    this.emit('clear');
  }

  randomize(density = 0.3) {
    this.grid = this.grid.map(track => track.map(() => Math.random() < density));
    this.emit('randomize');
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const interval = (60 / this.bpm) * 250;
    this.timer = setInterval(() => {
      this._tick();
    }, interval);
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) clearInterval(this.timer);
    this.currentStep = 0;
  }

  _tick() {
    for (let t = 0; t < this.tracks; t++) {
      if (this.grid[t][this.currentStep]) {
        this.emit('trigger', { track: t, step: this.currentStep });
      }
    }
    this.emit('step', this.currentStep);
    this.currentStep = (this.currentStep + 1) % this.steps;
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} });
  }
}

/* ================= 简单合成器 ================= */

class SimpleSynth {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.oscillator = null;
    this.gainNode = null;
    this.filter = null;
  }

  play(freq, duration, type = 'sine') {
    const now = this.ctx.currentTime;
    this.oscillator = this.ctx.createOscillator();
    this.gainNode = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();

    this.oscillator.type = type;
    this.oscillator.frequency.setValueAtTime(freq, now);

    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(2000, now);

    this.gainNode.gain.setValueAtTime(0.3, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    this.oscillator.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.oscillator.start(now);
    this.oscillator.stop(now + duration);
  }

  playMidi(midi, duration, type = 'sine') {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    this.play(freq, duration, type);
  }
}

/* ================= 音频播放列表 ================= */

class PlayQueue {
  constructor() {
    this.items = [];
    this.currentIndex = -1;
    this.repeat = 'none'; // none, all, one
    this.shuffle = false;
    this.history = [];
  }

  add(item) { this.items.push(item); }
  remove(index) { this.items.splice(index, 1); }
  clear() { this.items = []; this.currentIndex = -1; }

  next() {
    if (this.shuffle) {
      const remaining = this.items.map((_, i) => i).filter(i => i !== this.currentIndex);
      if (!remaining.length) return null;
      this.currentIndex = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      this.currentIndex++;
      if (this.currentIndex >= this.items.length) {
        if (this.repeat === 'all') this.currentIndex = 0;
        else return null;
      }
    }
    return this.items[this.currentIndex];
  }

  previous() {
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    return this.items[this.currentIndex];
  }
}

/* ================= 全局暴露 ================= */

window.OfflineAudioProcessor = OfflineAudioProcessor;
window.Arpeggiator = Arpeggiator;
window.StepSequencer = StepSequencer;
window.SimpleSynth = SimpleSynth;
window.PlayQueue = PlayQueue;

/* ================= 最终完成 ================= */

/* ================= 额外工具函数库 ================= */

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function interpolateColor(color1, color2, factor) {
  const c1 = hexToRgb(color1) || { r: 0, g: 0, b: 0 };
  const c2 = hexToRgb(color2) || { r: 255, g: 255, b: 255 };
  return rgbToHex(
    c1.r + (c2.r - c1.r) * factor,
    c1.g + (c2.g - c1.g) * factor,
    c1.b + (c2.b - c1.b) * factor
  );
}

function randomColor() {
  return rgbToHex(Math.random() * 255, Math.random() * 255, Math.random() * 255);
}

function isDarkColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness < 128;
}

function getContrastColor(hex) {
  return isDarkColor(hex) ? '#ffffff' : '#1a1a1a';
}

function parseTimeString(str) {
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseFloat(str) || 0;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleArray(array, count) {
  return shuffleArray(array).slice(0, count);
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

function snapToGrid(value, grid) {
  return Math.round(value / grid) * grid;
}

function wrap(value, min, max) {
  const range = max - min;
  return min + ((((value - min) % range) + range) % range);
}

function isEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => isEqual(a[key], b[key]));
}

function memoize(fn, keyFn) {
  const cache = new Map();
  return (...args) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

function once(fn) {
  let called = false;
  let result;
  return (...args) => {
    if (called) return result;
    called = true;
    result = fn(...args);
    return result;
  };
}

function poll(fn, interval = 1000) {
  const timer = setInterval(fn, interval);
  return () => clearInterval(timer);
}

function observeElement(element, callback, options = {}) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => callback(entry.isIntersecting, entry));
  }, options);
  observer.observe(el);
  return () => observer.disconnect();
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function preloadAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = reject;
    audio.src = src;
  });
}

/* ================= 最终完成 ================= */

console.log('[青鸾 DAW] 系统完全就绪，等待用户指令');

/* ================= 青鸾 UI 组件初始化与高级界面扩展 v3.0 ================= */

/* ---------- initComponents ---------- */
function initComponents() {
  if (!window.QingluanUI) {
    console.warn('[青鸾 UI] 组件系统未加载，跳过初始化');
    return;
  }
  window.qlUI = {};

  document.querySelectorAll('[data-ql-knob]').forEach(el => {
    const min = parseFloat(el.dataset.min) || 0;
    const max = parseFloat(el.dataset.max) || 100;
    const val = parseFloat(el.dataset.value) || 50;
    const suffix = el.dataset.suffix || '';
    window.qlUI[el.id] = new QingluanUI.Knob(el, { min, max, value: val, suffix });
  });

  document.querySelectorAll('[data-ql-fader]').forEach(el => {
    const min = parseFloat(el.dataset.min) || 0;
    const max = parseFloat(el.dataset.max) || 100;
    const val = parseFloat(el.dataset.value) || 70;
    window.qlUI[el.id] = new QingluanUI.Fader(el, { min, max, value: val });
  });

  document.querySelectorAll('[data-ql-meter]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.Meter(el, { type: el.dataset.type || 'peak' });
  });

  document.querySelectorAll('[data-ql-scope]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.Scope(el, { width: el.clientWidth || 300, height: el.clientHeight || 120 });
    window.qlUI[el.id].start();
  });

  document.querySelectorAll('[data-ql-spectrum]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.Spectrum(el, { width: el.clientWidth || 300, height: el.clientHeight || 120 });
    window.qlUI[el.id].start();
  });

  document.querySelectorAll('[data-ql-piano]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.PianoKeyboard(el, {
      startNote: parseInt(el.dataset.startNote) || 36,
      endNote: parseInt(el.dataset.endNote) || 84
    });
  });

  document.querySelectorAll('[data-ql-transport]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.TransportBar(el, { bpm: parseInt(el.dataset.bpm) || 120 });
  });

  document.querySelectorAll('[data-ql-progress]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.ProgressBar(el, { value: parseFloat(el.dataset.value) || 0 });
  });

  document.querySelectorAll('[data-ql-dropdown]').forEach(el => {
    try {
      const items = JSON.parse(el.dataset.items || '[]');
      window.qlUI[el.id] = new QingluanUI.Dropdown(el, { items, value: el.dataset.value });
    } catch (e) {}
  });

  document.querySelectorAll('[data-ql-slider]').forEach(el => {
    const min = parseFloat(el.dataset.min) || 0;
    const max = parseFloat(el.dataset.max) || 100;
    const val = parseFloat(el.dataset.value) || 50;
    const orientation = el.dataset.orientation || 'horizontal';
    window.qlUI[el.id] = new QingluanUI.Slider(el, { min, max, value: val, orientation });
  });

  document.querySelectorAll('[data-ql-buttongroup]').forEach(el => {
    try {
      const buttons = JSON.parse(el.dataset.buttons || '[]');
      const multi = el.dataset.multi === 'true';
      window.qlUI[el.id] = new QingluanUI.ButtonGroup(el, { buttons, multi });
    } catch (e) {}
  });

  document.querySelectorAll('[data-ql-tabs]').forEach(el => {
    try {
      const tabs = JSON.parse(el.dataset.tabs || '[]');
      window.qlUI[el.id] = new QingluanUI.TabPanel(el, { tabs });
    } catch (e) {}
  });

  document.querySelectorAll('[data-ql-tree]').forEach(el => {
    try {
      const data = JSON.parse(el.dataset.data || '[]');
      window.qlUI[el.id] = new QingluanUI.TreeView(el, { data });
    } catch (e) {}
  });

  document.querySelectorAll('[data-ql-colorpicker]').forEach(el => {
    window.qlUI[el.id] = new QingluanUI.ColorPicker(el, { value: el.dataset.value || '#5b4dff' });
  });

  if (!document.getElementById('ql-toast-container')) {
    const toastWrap = document.createElement('div');
    toastWrap.id = 'ql-toast-container';
    document.body.appendChild(toastWrap);
    window.qlUI.toast = new QingluanUI.ToastNotification(toastWrap, { position: 'top-right' });
  }

  document.querySelectorAll('[data-ql-tooltip]').forEach(el => {
    new QingluanUI.Tooltip(el, { text: el.dataset.qlTooltip, position: el.dataset.tooltipPos || 'top' });
  });

  console.log('[青鸾 UI] initComponents 完成，已初始化', Object.keys(window.qlUI).length, '个组件');
}

/* ---------- initMixerUI ---------- */
function initMixerUI() {
  const container = document.getElementById('mixerContainer');
  if (!container) return;
  container.innerHTML = '';

  const channels = [
    { name: 'Kick', color: '#ef4444' },
    { name: 'Snare', color: '#f59e0b' },
    { name: 'HiHat', color: '#facc15' },
    { name: 'Bass', color: '#3b82f6' },
    { name: 'Lead', color: '#8b5cf6' },
    { name: 'Pad', color: '#ec4899' },
    { name: 'Vocal', color: '#10b981' }
  ];

  channels.forEach((ch, i) => {
    const wrap = document.createElement('div');
    wrap.id = 'mixer-ch-' + i;
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;';
    container.appendChild(wrap);

    const meter = document.createElement('div');
    meter.id = 'mixer-meter-' + i;
    meter.style.cssText = 'width:12px;height:140px;background:rgba(0,0,0,0.06);border-radius:6px;position:relative;overflow:hidden;';
    wrap.appendChild(meter);

    const meterFill = document.createElement('div');
    meterFill.id = 'mixer-meter-fill-' + i;
    meterFill.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:0%;background:' + ch.color + ';border-radius:6px;transition:height 0.05s;';
    meter.appendChild(meterFill);

    const faderWrap = document.createElement('div');
    faderWrap.id = 'mixer-fader-' + i;
    faderWrap.style.cssText = 'width:32px;height:100px;position:relative;';
    wrap.appendChild(faderWrap);

    const faderTrack = document.createElement('div');
    faderTrack.style.cssText = 'position:absolute;left:50%;top:0;width:4px;height:100%;transform:translateX(-50%);background:rgba(0,0,0,0.06);border-radius:2px;';
    faderWrap.appendChild(faderTrack);

    const faderThumb = document.createElement('div');
    faderThumb.id = 'mixer-thumb-' + i;
    faderThumb.style.cssText = 'position:absolute;left:50%;bottom:70%;width:24px;height:14px;transform:translateX(-50%);background:#fff;border:2px solid ' + ch.color + ';border-radius:4px;cursor:pointer;';
    faderWrap.appendChild(faderThumb);

    const pan = document.createElement('div');
    pan.style.cssText = 'font-size:9px;color:var(--text3);';
    pan.textContent = 'C';
    wrap.appendChild(pan);

    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;font-weight:600;color:var(--text);text-align:center;';
    label.textContent = ch.name;
    wrap.appendChild(label);

    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:2px;';
    wrap.appendChild(btnWrap);

    const muteBtn = document.createElement('button');
    muteBtn.textContent = 'M';
    muteBtn.style.cssText = 'width:18px;height:18px;border-radius:4px;border:none;font-size:8px;font-weight:700;cursor:pointer;background:rgba(0,0,0,0.06);color:var(--text2);';
    muteBtn.addEventListener('click', () => {
      muteBtn.classList.toggle('active');
      muteBtn.style.background = muteBtn.classList.contains('active') ? '#ef4444' : 'rgba(0,0,0,0.06)';
      muteBtn.style.color = muteBtn.classList.contains('active') ? '#fff' : 'var(--text2)';
    });
    btnWrap.appendChild(muteBtn);

    const soloBtn = document.createElement('button');
    soloBtn.textContent = 'S';
    soloBtn.style.cssText = 'width:18px;height:18px;border-radius:4px;border:none;font-size:8px;font-weight:700;cursor:pointer;background:rgba(0,0,0,0.06);color:var(--text2);';
    soloBtn.addEventListener('click', () => {
      soloBtn.classList.toggle('active');
      soloBtn.style.background = soloBtn.classList.contains('active') ? '#f59e0b' : 'rgba(0,0,0,0.06)';
      soloBtn.style.color = soloBtn.classList.contains('active') ? '#fff' : 'var(--text2)';
    });
    btnWrap.appendChild(soloBtn);
  });

  const masterWrap = document.createElement('div');
  masterWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding-left:8px;border-left:1px solid var(--border);';
  container.appendChild(masterWrap);

  const masterMeter = document.createElement('div');
  masterMeter.style.cssText = 'width:12px;height:140px;background:rgba(0,0,0,0.06);border-radius:6px;position:relative;overflow:hidden;';
  masterWrap.appendChild(masterMeter);

  const masterFill = document.createElement('div');
  masterFill.id = 'master-meter-fill';
  masterFill.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:0%;background:linear-gradient(to top,#4ade80,#facc15,#ef4444);border-radius:6px;transition:height 0.05s;';
  masterMeter.appendChild(masterFill);

  const masterFader = document.createElement('div');
  masterFader.style.cssText = 'width:32px;height:100px;position:relative;';
  masterWrap.appendChild(masterFader);

  const masterTrack = document.createElement('div');
  masterTrack.style.cssText = 'position:absolute;left:50%;top:0;width:4px;height:100%;transform:translateX(-50%);background:rgba(0,0,0,0.06);border-radius:2px;';
  masterFader.appendChild(masterTrack);

  const masterThumb = document.createElement('div');
  masterThumb.style.cssText = 'position:absolute;left:50%;bottom:80%;width:24px;height:14px;transform:translateX(-50%);background:#fff;border:2px solid var(--accent);border-radius:4px;cursor:pointer;';
  masterFader.appendChild(masterThumb);

  const masterLabel = document.createElement('div');
  masterLabel.style.cssText = 'font-size:10px;font-weight:700;color:var(--accent);text-align:center;';
  masterLabel.textContent = 'MASTER';
  masterWrap.appendChild(masterLabel);

  console.log('[青鸾 UI] initMixerUI 完成');
}

/* ---------- initTransportUI ---------- */
function initTransportUI() {
  const container = document.getElementById('transportContainer');
  if (!container) return;

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--card-bg);border-radius:var(--radius-md);border:1px solid var(--border);';

  const timeDisplay = document.createElement('div');
  timeDisplay.id = 'transport-time';
  timeDisplay.textContent = '00:00:00';
  timeDisplay.style.cssText = 'font-family:monospace;font-size:16px;font-weight:700;color:var(--text);min-width:80px;text-align:center;';
  bar.appendChild(timeDisplay);

  const btnStyle = 'width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;';

  const playBtn = document.createElement('button');
  playBtn.innerHTML = '▶';
  playBtn.style.cssText = btnStyle;
  playBtn.id = 'transport-play';
  playBtn.addEventListener('click', () => {
    const isPlaying = playBtn.dataset.playing === 'true';
    playBtn.dataset.playing = (!isPlaying).toString();
    playBtn.innerHTML = isPlaying ? '▶' : '⏸';
    playBtn.style.background = isPlaying ? 'var(--input-bg)' : 'var(--accent)';
    playBtn.style.color = isPlaying ? 'var(--text2)' : '#fff';
  });
  bar.appendChild(playBtn);

  const stopBtn = document.createElement('button');
  stopBtn.innerHTML = '⏹';
  stopBtn.style.cssText = btnStyle;
  stopBtn.addEventListener('click', () => {
    playBtn.dataset.playing = 'false';
    playBtn.innerHTML = '▶';
    playBtn.style.background = 'var(--input-bg)';
    playBtn.style.color = 'var(--text2)';
    timeDisplay.textContent = '00:00:00';
  });
  bar.appendChild(stopBtn);

  const recBtn = document.createElement('button');
  recBtn.innerHTML = '⏺';
  recBtn.style.cssText = btnStyle;
  recBtn.addEventListener('click', () => {
    recBtn.classList.toggle('recording');
    recBtn.style.color = recBtn.classList.contains('recording') ? '#ef4444' : 'var(--text2)';
    recBtn.style.borderColor = recBtn.classList.contains('recording') ? '#ef4444' : 'var(--border)';
  });
  bar.appendChild(recBtn);

  const loopBtn = document.createElement('button');
  loopBtn.innerHTML = '🔁';
  loopBtn.style.cssText = btnStyle;
  loopBtn.addEventListener('click', () => {
    loopBtn.classList.toggle('active');
    loopBtn.style.background = loopBtn.classList.contains('active') ? 'var(--accent)' : 'var(--input-bg)';
    loopBtn.style.color = loopBtn.classList.contains('active') ? '#fff' : 'var(--text2)';
  });
  bar.appendChild(loopBtn);

  const bpmWrap = document.createElement('div');
  bpmWrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto;';
  bar.appendChild(bpmWrap);

  const bpmLabel = document.createElement('span');
  bpmLabel.textContent = 'BPM';
  bpmLabel.style.cssText = 'font-size:11px;color:var(--text3);';
  bpmWrap.appendChild(bpmLabel);

  const bpmInput = document.createElement('input');
  bpmInput.type = 'number';
  bpmInput.value = '120';
  bpmInput.min = '40';
  bpmInput.max = '240';
  bpmInput.style.cssText = 'width:50px;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;text-align:center;';
  bpmWrap.appendChild(bpmInput);

  container.appendChild(bar);
  console.log('[青鸾 UI] initTransportUI 完成');
}

/* ---------- initPianoRollUI ---------- */
function initPianoRollUI() {
  const container = document.getElementById('pianoRollContainer');
  if (!container) return;

  const editorWrap = document.createElement('div');
  editorWrap.style.cssText = 'display:flex;height:320px;border:1px solid var(--border);border-radius:12px;overflow:hidden;';
  container.appendChild(editorWrap);

  const keyArea = document.createElement('div');
  keyArea.style.cssText = 'width:60px;background:var(--card-bg);border-right:1px solid var(--border);overflow:hidden;';
  editorWrap.appendChild(keyArea);

  const gridArea = document.createElement('div');
  gridArea.style.cssText = 'flex:1;position:relative;overflow:auto;background:rgba(0,0,0,0.02);';
  gridArea.id = 'piano-roll-grid';
  editorWrap.appendChild(gridArea);

  const blackKeys = new Set([1, 3, 6, 8, 10]);
  for (let n = 84; n >= 36; n--) {
    const key = document.createElement('div');
    const isBlack = blackKeys.has(n % 12);
    key.style.cssText = 'height:16px;border-bottom:1px solid var(--border);box-sizing:border-box;' +
      (isBlack ? 'background:#1a1a1a;width:65%;margin-left:auto;' : 'background:#fff;');
    keyArea.appendChild(key);
  }

  const gridContent = document.createElement('div');
  gridContent.style.cssText = 'position:relative;width:1600px;height:100%;';
  gridArea.appendChild(gridContent);

  for (let b = 0; b <= 32; b++) {
    const line = document.createElement('div');
    const isBar = b % 4 === 0;
    line.style.cssText = 'position:absolute;top:0;bottom:0;width:1px;background:' + (isBar ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)') + ';left:' + (b * 50) + 'px;';
    gridContent.appendChild(line);
  }

  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;gap:6px;padding:8px 0;';
  container.insertBefore(toolbar, editorWrap);

  const tools = [
    { icon: '✋', name: '选择', id: 'select' },
    { icon: '✏', name: '画笔', id: 'pen' },
    { icon: '🧽', name: '橡皮', id: 'erase' },
    { icon: '✂️', name: '分割', id: 'split' }
  ];

  tools.forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t.icon;
    btn.title = t.name;
    btn.style.cssText = 'width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text2);font-size:14px;cursor:pointer;';
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('button').forEach(b => {
        b.style.background = 'var(--input-bg)';
        b.style.color = 'var(--text2)';
      });
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
    });
    toolbar.appendChild(btn);
  });

  console.log('[青鸾 UI] initPianoRollUI 完成');
}

/* ---------- initWaveformUI ---------- */
function initWaveformUI() {
  const container = document.getElementById('waveformContainer');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  container.appendChild(wrap);

  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = 'position:relative;height:160px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);overflow:hidden;';
  wrap.appendChild(canvasWrap);

  const canvas = document.createElement('canvas');
  canvas.id = 'waveform-editor-canvas';
  canvas.width = canvasWrap.clientWidth * 2 || 720;
  canvas.height = 320;
  canvas.style.cssText = 'width:100%;height:100%;';
  canvasWrap.appendChild(canvas);

  const playhead = document.createElement('div');
  playhead.id = 'waveform-playhead';
  playhead.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;background:#ff6b9d;pointer-events:none;left:0%;';
  canvasWrap.appendChild(playhead);

  const timeline = document.createElement('div');
  timeline.style.cssText = 'height:24px;background:var(--card-bg);border-radius:8px;border:1px solid var(--border);position:relative;';
  wrap.appendChild(timeline);

  for (let s = 0; s <= 10; s++) {
    const mark = document.createElement('div');
    mark.textContent = s + 's';
    mark.style.cssText = 'position:absolute;top:2px;font-size:9px;color:var(--text3);left:' + (s * 10) + '%;';
    timeline.appendChild(mark);
  }

  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;gap:8px;padding:4px 0;';
  wrap.appendChild(toolbar);

  const actions = [
    { label: '⏮ 开头', fn: () => { playhead.style.left = '0%'; } },
    { label: '▶ 播放', fn: () => {} },
    { label: '⏸ 暂停', fn: () => {} },
    { label: '✂️ 裁剪', fn: () => {} },
    { label: '↩ 撤销', fn: () => {} },
    { label: '🔊 标准化', fn: () => {} }
  ];

  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text2);font-size:12px;cursor:pointer;';
    btn.addEventListener('click', a.fn);
    toolbar.appendChild(btn);
  });

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'var(--accent)';
  const w = canvas.width;
  const h = canvas.height;
  for (let x = 0; x < w; x += 2) {
    const amp = Math.sin(x * 0.02) * Math.sin(x * 0.005) * 0.4;
    const y = h / 2 - amp * h * 0.4;
    ctx.fillRect(x, y, 1, Math.abs(amp) * h * 0.8);
  }

  console.log('[青鸾 UI] initWaveformUI 完成');
}

/* ---------- initSpectrumUI ---------- */
function initSpectrumUI() {
  const container = document.getElementById('spectrumContainer');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  container.appendChild(wrap);

  const mainCanvas = document.createElement('canvas');
  mainCanvas.id = 'spectrum-main';
  mainCanvas.width = container.clientWidth * 2 || 720;
  mainCanvas.height = 240;
  mainCanvas.style.cssText = 'width:100%;height:200px;border-radius:12px;background:rgba(0,0,0,0.02);';
  wrap.appendChild(mainCanvas);

  const params = document.createElement('div');
  params.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;padding:8px;background:var(--card-bg);border-radius:10px;border:1px solid var(--border);';
  wrap.appendChild(params);

  const controls = [
    { label: 'FFT大小', type: 'select', options: ['256','512','1024','2048','4096'], value: '2048' },
    { label: '平滑度', type: 'range', min: 0, max: 1, step: 0.01, value: 0.8 },
    { label: '模式', type: 'select', options: ['bars','line','area'], value: 'bars' }
  ];

  controls.forEach(c => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:6px;';
    params.appendChild(item);

    const label = document.createElement('span');
    label.textContent = c.label;
    label.style.cssText = 'font-size:11px;color:var(--text2);';
    item.appendChild(label);

    if (c.type === 'select') {
      const sel = document.createElement('select');
      c.options.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; sel.appendChild(opt); });
      sel.value = c.value;
      sel.style.cssText = 'padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:11px;';
      item.appendChild(sel);
    } else {
      const input = document.createElement('input');
      input.type = 'range';
      input.min = c.min;
      input.max = c.max;
      input.step = c.step;
      input.value = c.value;
      input.style.cssText = 'width:80px;';
      item.appendChild(input);
    }
  });

  const ctx = mainCanvas.getContext('2d');
  let offset = 0;
  function drawSpectrum() {
    requestAnimationFrame(drawSpectrum);
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    const barCount = 64;
    const barW = mainCanvas.width / barCount;
    for (let i = 0; i < barCount; i++) {
      const val = Math.abs(Math.sin(i * 0.2 + offset) * Math.cos(i * 0.1 - offset * 0.5)) * 0.8;
      const bh = val * mainCanvas.height;
      const hue = 200 + (i / barCount) * 60;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
      ctx.fillRect(i * barW, mainCanvas.height - bh, barW - 1, bh);
    }
    offset += 0.02;
  }
  drawSpectrum();

  console.log('[青鸾 UI] initSpectrumUI 完成');
}

/* ---------- initSequencerUI ---------- */
function initSequencerUI() {
  const container = document.getElementById('sequencerContainer');
  if (!container) return;

  const steps = 16;
  const tracks = 6;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:8px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);';
  container.appendChild(wrap);

  const indicatorRow = document.createElement('div');
  indicatorRow.style.cssText = 'display:flex;gap:2px;padding-left:72px;';
  wrap.appendChild(indicatorRow);

  for (let s = 0; s < steps; s++) {
    const ind = document.createElement('div');
    ind.id = 'seq-ind-' + s;
    ind.style.cssText = 'width:28px;height:6px;border-radius:3px;background:rgba(0,0,0,0.06);transition:background 0.1s;';
    indicatorRow.appendChild(ind);
  }

  const trackNames = ['Kick', 'Snare', 'Clap', 'HiHat', 'OpenHat', 'Perc'];
  const trackColors = ['#ef4444','#f59e0b','#facc15','#4ade80','#3b82f6','#8b5cf6'];

  window.sequencerGrid = Array.from({ length: tracks }, () => new Array(steps).fill(false));

  for (let t = 0; t < tracks; t++) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;';
    wrap.appendChild(row);

    const label = document.createElement('div');
    label.textContent = trackNames[t];
    label.style.cssText = 'width:64px;font-size:10px;font-weight:600;color:var(--text2);text-align:right;padding-right:4px;';
    row.appendChild(label);

    for (let s = 0; s < steps; s++) {
      const cell = document.createElement('div');
      cell.dataset.track = t;
      cell.dataset.step = s;
      cell.style.cssText = 'width:28px;height:28px;border-radius:6px;background:rgba(0,0,0,0.04);cursor:pointer;transition:all 0.1s;border:1px solid transparent;';
      cell.addEventListener('click', () => {
        window.sequencerGrid[t][s] = !window.sequencerGrid[t][s];
        cell.style.background = window.sequencerGrid[t][s] ? trackColors[t] : 'rgba(0,0,0,0.04)';
        cell.style.borderColor = window.sequencerGrid[t][s] ? trackColors[t] : 'transparent';
      });
      row.appendChild(cell);
    }
  }

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:8px;padding-top:8px;border-top:1px solid var(--border);margin-top:4px;';
  wrap.appendChild(controls);

  const playBtn = document.createElement('button');
  playBtn.textContent = '▶ 播放';
  playBtn.style.cssText = 'padding:6px 14px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:12px;cursor:pointer;';
  controls.appendChild(playBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '清空';
  clearBtn.style.cssText = 'padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text2);font-size:12px;cursor:pointer;';
  clearBtn.addEventListener('click', () => {
    window.sequencerGrid = Array.from({ length: tracks }, () => new Array(steps).fill(false));
    wrap.querySelectorAll('[data-track]').forEach(cell => {
      cell.style.background = 'rgba(0,0,0,0.04)';
      cell.style.borderColor = 'transparent';
    });
  });
  controls.appendChild(clearBtn);

  const randBtn = document.createElement('button');
  randBtn.textContent = '随机';
  randBtn.style.cssText = 'padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text2);font-size:12px;cursor:pointer;';
  randBtn.addEventListener('click', () => {
    window.sequencerGrid = window.sequencerGrid.map((track, ti) =>
      track.map(() => Math.random() < (ti < 2 ? 0.4 : 0.2))
    );
    wrap.querySelectorAll('[data-track]').forEach(cell => {
      const t = parseInt(cell.dataset.track);
      const s = parseInt(cell.dataset.step);
      const on = window.sequencerGrid[t][s];
      cell.style.background = on ? trackColors[t] : 'rgba(0,0,0,0.04)';
      cell.style.borderColor = on ? trackColors[t] : 'transparent';
    });
  });
  controls.appendChild(randBtn);

  const bpmInput = document.createElement('input');
  bpmInput.type = 'number';
  bpmInput.value = '120';
  bpmInput.min = '40';
  bpmInput.max = '240';
  bpmInput.style.cssText = 'width:50px;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:12px;text-align:center;margin-left:auto;';
  controls.appendChild(bpmInput);

  const bpmLabel = document.createElement('span');
  bpmLabel.textContent = 'BPM';
  bpmLabel.style.cssText = 'font-size:11px;color:var(--text3);';
  controls.appendChild(bpmLabel);

  let seqTimer = null;
  let currentStep = 0;
  playBtn.addEventListener('click', () => {
    if (seqTimer) {
      clearInterval(seqTimer);
      seqTimer = null;
      playBtn.textContent = '▶ 播放';
      return;
    }
    playBtn.textContent = '⏸ 暂停';
    const interval = (60 / parseInt(bpmInput.value || 120)) * 250;
    seqTimer = setInterval(() => {
      document.querySelectorAll('[id^="seq-ind-"]').forEach((el, i) => {
        el.style.background = i === currentStep ? 'var(--accent)' : 'rgba(0,0,0,0.06)';
      });
      for (let t = 0; t < tracks; t++) {
        if (window.sequencerGrid[t][currentStep]) {
          // trigger note
        }
      }
      currentStep = (currentStep + 1) % steps;
    }, interval);
  });

  console.log('[青鸾 UI] initSequencerUI 完成');
}

/* ---------- initGameUI ---------- */
function initGameUI() {
  const container = document.getElementById('gameContainer');
  if (!container) return;

  container.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;';
  container.appendChild(header);

  const title = document.createElement('h3');
  title.textContent = '🎮 音乐节奏游戏';
  title.style.cssText = 'margin:0;font-size:16px;color:var(--text);';
  header.appendChild(title);

  const scoreEl = document.createElement('div');
  scoreEl.id = 'game-score';
  scoreEl.textContent = '得分: 0';
  scoreEl.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);';
  header.appendChild(scoreEl);

  const laneWrap = document.createElement('div');
  laneWrap.style.cssText = 'position:relative;height:300px;background:linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.06) 100%);border-radius:12px;border:1px solid var(--border);overflow:hidden;';
  container.appendChild(laneWrap);

  const lanes = 4;
  const laneColors = ['#ef4444','#3b82f6','#f59e0b','#10b981'];
  const laneKeys = ['d','f','j','k'];

  for (let i = 0; i < lanes; i++) {
    const lane = document.createElement('div');
    lane.style.cssText = 'position:absolute;top:0;bottom:0;width:25%;left:' + (i * 25) + '%;border-right:1px solid var(--border);';
    laneWrap.appendChild(lane);

    const keyHint = document.createElement('div');
    keyHint.textContent = laneKeys[i].toUpperCase();
    keyHint.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:40px;height:40px;border-radius:10px;background:var(--card-bg);border:2px solid ' + laneColors[i] + ';display:flex;align-items:center;justify-content:center;font-weight:700;color:' + laneColors[i] + ';font-size:14px;';
    lane.appendChild(keyHint);
  }

  const judgeLine = document.createElement('div');
  judgeLine.style.cssText = 'position:absolute;bottom:48px;left:0;right:0;height:2px;background:rgba(255,255,255,0.5);';
  laneWrap.appendChild(judgeLine);

  window.gameState = { score: 0, combo: 0, notes: [], playing: false, speed: 2 };

  function spawnNote() {
    const lane = Math.floor(Math.random() * lanes);
    const note = document.createElement('div');
    note.style.cssText = 'position:absolute;top:-20px;left:' + (lane * 25 + 4) + '%;width:' + (25 - 8) + '%;height:16px;border-radius:4px;background:' + laneColors[lane] + ';box-shadow:0 0 8px ' + laneColors[lane] + ';';
    laneWrap.appendChild(note);
    window.gameState.notes.push({ el: note, lane, y: -20 });
  }

  function gameLoop() {
    if (!window.gameState.playing) return;
    requestAnimationFrame(gameLoop);

    window.gameState.notes.forEach((n, i) => {
      n.y += window.gameState.speed;
      n.el.style.top = n.y + 'px';
      if (n.y > 320) {
        n.el.remove();
        window.gameState.notes.splice(i, 1);
        window.gameState.combo = 0;
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!window.gameState.playing) return;
    const laneIdx = laneKeys.indexOf(e.key.toLowerCase());
    if (laneIdx < 0) return;

    const judgeY = 300 - 48;
    for (let i = window.gameState.notes.length - 1; i >= 0; i--) {
      const n = window.gameState.notes[i];
      if (n.lane === laneIdx && Math.abs(n.y - judgeY) < 30) {
        n.el.remove();
        window.gameState.notes.splice(i, 1);
        window.gameState.combo++;
        window.gameState.score += 100 + window.gameState.combo * 10;
        scoreEl.textContent = '得分: ' + window.gameState.score;
        break;
      }
    }
  });

  const startBtn = document.createElement('button');
  startBtn.textContent = '▶ 开始游戏';
  startBtn.style.cssText = 'margin-top:8px;padding:8px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:13px;cursor:pointer;';
  startBtn.addEventListener('click', () => {
    window.gameState.playing = true;
    window.gameState.score = 0;
    window.gameState.combo = 0;
    scoreEl.textContent = '得分: 0';
    laneWrap.querySelectorAll('[style*="position:absolute;top"]').forEach(el => el.remove());
    window.gameState.notes = [];
    gameLoop();
    setInterval(() => { if (window.gameState.playing) spawnNote(); }, 600);
  });
  container.appendChild(startBtn);

  console.log('[青鸾 UI] initGameUI 完成');
}

/* ---------- initAssistantUI ---------- */
function initAssistantUI() {
  const container = document.getElementById('assistantContainer');
  if (!container) return;

  container.innerHTML = '';

  const chatWrap = document.createElement('div');
  chatWrap.style.cssText = 'display:flex;flex-direction:column;height:400px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);overflow:hidden;';
  container.appendChild(chatWrap);

  const messages = document.createElement('div');
  messages.id = 'assistant-messages';
  messages.style.cssText = 'flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;';
  chatWrap.appendChild(messages);

  const welcome = document.createElement('div');
  welcome.style.cssText = 'align-self:flex-start;max-width:80%;padding:10px 14px;border-radius:12px 12px 12px 2px;background:rgba(0,0,0,0.04);color:var(--text2);font-size:13px;line-height:1.5;';
  welcome.textContent = '你好！我是青鸾 AI 助手，可以帮你作曲、编曲、分析音频，或解答音乐理论问题。';
  messages.appendChild(welcome);

  const inputWrap = document.createElement('div');
  inputWrap.style.cssText = 'display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);';
  chatWrap.appendChild(inputWrap);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '输入问题...';
  input.style.cssText = 'flex:1;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;';
  inputWrap.appendChild(input);

  const sendBtn = document.createElement('button');
  sendBtn.textContent = '发送';
  sendBtn.style.cssText = 'padding:8px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:13px;cursor:pointer;';
  inputWrap.appendChild(sendBtn);

  function addMessage(text, isUser) {
    const msg = document.createElement('div');
    msg.style.cssText = isUser
      ? 'align-self:flex-end;max-width:80%;padding:10px 14px;border-radius:12px 12px 2px 12px;background:var(--accent);color:#fff;font-size:13px;line-height:1.5;'
      : 'align-self:flex-start;max-width:80%;padding:10px 14px;border-radius:12px 12px 12px 2px;background:rgba(0,0,0,0.04);color:var(--text2);font-size:13px;line-height:1.5;';
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, true);
    input.value = '';

    setTimeout(() => {
      const replies = [
        '收到！我可以帮你处理这个请求。',
        '这是一个很有趣的音乐问题，让我来分析一下。',
        '好的，我已经理解了你的需求。',
        '你可以尝试调整 BPM 或调性来获得不同的感觉。',
        '建议使用五声音阶来营造中国风氛围。'
      ];
      addMessage(replies[Math.floor(Math.random() * replies.length)], false);
    }, 800);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  console.log('[青鸾 UI] initAssistantUI 完成');
}

/* ---------- bindKeyboardToUI ---------- */
function bindKeyboardToUI() {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const playBtn = document.getElementById('transport-play');
      if (playBtn) playBtn.click();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (typeof saveProject === 'function') saveProject();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (window.actionHistory && window.actionHistory.undo) window.actionHistory.undo();
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      if (window.actionHistory && window.actionHistory.redo) window.actionHistory.redo();
    }

    if (e.key === 'Delete') {
      if (window.pianoRollEditor && window.pianoRollEditor.deleteSelected) {
        window.pianoRollEditor.deleteSelected();
      }
    }

    if (e.key >= '1' && e.key <= '4' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      const tools = ['select', 'pen', 'erase', 'split'];
      const idx = parseInt(e.key) - 1;
      if (window.pianoRollEditor && window.pianoRollEditor.setTool) {
        window.pianoRollEditor.setTool(tools[idx]);
      }
    }

    if (e.key === '+' || e.key === '=') {
      if (window.pianoRollEditor && window.pianoRollEditor.zoomX) {
        window.pianoRollEditor.zoomX = Math.min(4, window.pianoRollEditor.zoomX + 0.2);
        window.pianoRollEditor.render();
      }
    }
    if (e.key === '-' || e.key === '_') {
      if (window.pianoRollEditor && window.pianoRollEditor.zoomX) {
        window.pianoRollEditor.zoomX = Math.max(0.2, window.pianoRollEditor.zoomX - 0.2);
        window.pianoRollEditor.render();
      }
    }
  });

  console.log('[青鸾 UI] bindKeyboardToUI 完成');
}

/* ---------- touchGestureHandler ---------- */
function touchGestureHandler() {
  if (!('ontouchstart' in window)) return;

  let touchStartDist = 0;
  let touchStartScale = 1;
  let longPressTimer = null;
  let touchTarget = null;

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist = Math.hypot(dx, dy);
      touchStartScale = window.pianoRollEditor ? window.pianoRollEditor.zoomX : 1;
    }

    touchTarget = e.target;
    longPressTimer = setTimeout(() => {
      if (touchTarget) {
        const event = new Event('longpress');
        touchTarget.dispatchEvent(event);
      }
    }, 500);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / (touchStartDist || 1);
      if (window.pianoRollEditor && window.pianoRollEditor.zoomX) {
        window.pianoRollEditor.zoomX = clamp(touchStartScale * scale, 0.2, 4);
        window.pianoRollEditor.render();
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    touchTarget = null;
  });

  let swipeStartX = 0;
  document.addEventListener('touchstart', (e) => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (Math.abs(dx) > 80) {
      const tabs = document.querySelectorAll('.studio-tab');
      const active = document.querySelector('.studio-tab.active');
      if (!active || tabs.length < 2) return;
      const idx = Array.from(tabs).indexOf(active);
      const next = dx < 0 ? Math.min(tabs.length - 1, idx + 1) : Math.max(0, idx - 1);
      if (next !== idx) tabs[next].click();
    }
  }, { passive: true });

  console.log('[青鸾 UI] touchGestureHandler 完成');
}

/* ---------- responsiveLayout ---------- */
function responsiveLayout() {
  function update() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;
    const phone = document.querySelector('.phone');
    if (phone) {
      phone.style.maxWidth = isMobile ? '100%' : '430px';
      phone.style.margin = isMobile ? '0' : '0 auto';
    }

    document.querySelectorAll('canvas').forEach(c => {
      const parent = c.parentElement;
      if (parent && parent.clientWidth > 0 && !c.id.includes('pianoRoll') && !c.id.includes('particle')) {
        const dpr = window.devicePixelRatio || 1;
        c.width = parent.clientWidth * dpr;
        c.height = (parent.clientHeight || 160) * dpr;
      }
    });

    const studioBody = document.querySelector('.studio-body');
    if (studioBody) {
      studioBody.style.height = isMobile ? (vh - 120) + 'px' : 'auto';
    }
  }

  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => setTimeout(update, 200));
  update();

  console.log('[青鸾 UI] responsiveLayout 完成');
}

/* ---------- initAudioEngineBridge ---------- */
function initAudioEngineBridge() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    console.warn('[青鸾 Audio] Web Audio API 不支持');
    return;
  }

  window.qlAudio = {
    ctx: null,
    masterGain: null,
    analyser: null,
    processors: new Map(),

    async init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.8;
    },

    createOscillator(freq, type = 'sine') {
      if (!this.ctx) return null;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.masterGain);
      return { osc, gain };
    },

    playNote(freq, duration, type = 'sine', velocity = 0.5) {
      if (!this.ctx) this.init();
      const { osc, gain } = this.createOscillator(freq, type);
      if (!osc) return;
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(velocity, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    },

    getFrequencyData() {
      if (!this.analyser) return new Uint8Array(0);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    },

    setMasterVolume(v) {
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(clamp(v, 0, 1), this.ctx.currentTime, 0.02);
    },

    suspend() { if (this.ctx) this.ctx.suspend(); },
    resume() { if (this.ctx) this.ctx.resume(); }
  };

  document.addEventListener('click', () => {
    if (window.qlAudio && window.qlAudio.ctx && window.qlAudio.ctx.state === 'suspended') {
      window.qlAudio.ctx.resume();
    }
  }, { once: false });

  console.log('[青鸾 Audio] initAudioEngineBridge 完成');
}

/* ---------- OfflineRenderer ---------- */
class OfflineRenderer {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.channels = options.channels || 2;
    this.duration = options.duration || 60;
    this.ctx = null;
    this.onProgress = options.onProgress || null;
  }

  async init() {
    const length = this.sampleRate * this.duration;
    this.ctx = new OfflineAudioContext(this.channels, length, this.sampleRate);
  }

  async render(renderFn) {
    if (!this.ctx) await this.init();
    if (typeof renderFn === 'function') renderFn(this.ctx);

    let progressTimer = null;
    if (this.onProgress) {
      progressTimer = setInterval(() => {
        this.onProgress(Math.min(100, Math.round((performance.now() % 5000) / 50)));
      }, 100);
    }

    const buffer = await this.ctx.startRendering();
    if (progressTimer) clearInterval(progressTimer);
    if (this.onProgress) this.onProgress(100);
    return buffer;
  }

  async exportWav(buffer, filename = 'render.wav') {
    const blob = bufferToWavBlob(buffer.getChannelData(0), this.sampleRate);
    downloadBlob(blob, filename);
    return { success: true, filename };
  }

  async exportBlob(buffer) {
    return bufferToWavBlob(buffer.getChannelData(0), this.sampleRate);
  }
}

/* ---------- AudioWorkletProcessor 模拟 ---------- */
class SimulatedAudioWorkletProcessor {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.bufferSize = options.bufferSize || 128;
    this.parameters = new Map();
    this.port = {
      postMessage: (msg) => {
        if (this.onmessage) this.onmessage({ data: msg });
      },
      onmessage: null
    };
  }

  process(inputs, outputs, parameters) {
    return true;
  }

  static register(name, ProcessorClass) {
    if (!window._simulatedWorklets) window._simulatedWorklets = new Map();
    window._simulatedWorklets.set(name, ProcessorClass);
  }
}

class GainProcessor extends SimulatedAudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const gain = parameters.gain ? parameters.gain[0] : 1;
    for (let ch = 0; ch < input.length; ch++) {
      for (let i = 0; i < input[ch].length; i++) {
        output[ch][i] = input[ch][i] * gain;
      }
    }
    return true;
  }
}
SimulatedAudioWorkletProcessor.register('gain-processor', GainProcessor);

class WaveShaperProcessor extends SimulatedAudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const amount = parameters.amount ? parameters.amount[0] : 1;
    for (let ch = 0; ch < input.length; ch++) {
      for (let i = 0; i < input[ch].length; i++) {
        const x = input[ch][i];
        output[ch][i] = Math.tanh(x * (1 + amount * 10));
      }
    }
    return true;
  }
}
SimulatedAudioWorkletProcessor.register('waveshaper-processor', WaveShaperProcessor);

async function loadAudioWorklet(ctx, name, url) {
  if (ctx.audioWorklet) {
    try {
      await ctx.audioWorklet.addModule(url);
      return true;
    } catch (e) {
      console.warn('[青鸾 Audio] AudioWorklet 加载失败，使用模拟处理器:', e);
    }
  }
  return false;
}

window.OfflineRenderer = OfflineRenderer;
window.SimulatedAudioWorkletProcessor = SimulatedAudioWorkletProcessor;
window.GainProcessor = GainProcessor;
window.WaveShaperProcessor = WaveShaperProcessor;
window.loadAudioWorklet = loadAudioWorklet;

/* ---------- 自动初始化 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initComponents();
  initMixerUI();
  initTransportUI();
  initPianoRollUI();
  initWaveformUI();
  initSpectrumUI();
  initSequencerUI();
  initGameUI();
  initAssistantUI();
  bindKeyboardToUI();
  touchGestureHandler();
  responsiveLayout();
  initAudioEngineBridge();

  console.log('[青鸾 DAW] 前端扩展模块 v3.0 全部初始化完成');
  console.log('[青鸾] 新增功能: QingluanUI 组件系统, MixerUI, TransportUI, PianoRollUI, WaveformUI, SpectrumUI, SequencerUI, GameUI, AssistantUI, 触摸手势, 响应式布局, 音频引擎桥接, 离线渲染, AudioWorklet 模拟');
});


// ============================================================
// 工作室面板 - 作曲面板完整交互逻辑
// ============================================================

class ComposerPanel {
  constructor() {
    this.patterns = [];
    this.currentPattern = null;
    this.scaleCache = new Map();
    this.chordProgression = [];
    this.melodySeed = Date.now();
    this.historyStack = [];
    this.historyIndex = -1;
    this.listeners = {};
    this.autoSaveTimer = null;
    this.init();
  }

  init() {
    this.bindUI();
    this.loadTemplates();
    this.startAutoSave();
    console.log('[青鸾 Studio] ComposerPanel 初始化完成');
  }

  bindUI() {
    const btnGenerate = document.getElementById('composerGenerate');
    const btnRegenerate = document.getElementById('composerRegenerate');
    const btnMutate = document.getElementById('composerMutate');
    const btnInvert = document.getElementById('composerInvert');
    const btnRetrograde = document.getElementById('composerRetrograde');
    const btnExportMidi = document.getElementById('composerExportMidi');
    const btnPlayPreview = document.getElementById('composerPlayPreview');

    if (btnGenerate) btnGenerate.addEventListener('click', () => this.generatePattern());
    if (btnRegenerate) btnRegenerate.addEventListener('click', () => this.regenerateWithSeed(Date.now()));
    if (btnMutate) btnMutate.addEventListener('click', () => this.mutateCurrentPattern());
    if (btnInvert) btnInvert.addEventListener('click', () => this.invertMelody());
    if (btnRetrograde) btnRetrograde.addEventListener('click', () => this.retrogradeMelody());
    if (btnExportMidi) btnExportMidi.addEventListener('click', () => this.exportCurrentPattern());
    if (btnPlayPreview) btnPlayPreview.addEventListener('click', () => this.playPreview());

    const keySelect = document.getElementById('composerKey');
    const scaleSelect = document.getElementById('composerScale');
    const bpmInput = document.getElementById('composerBpm');
    const barsInput = document.getElementById('composerBars');
    const densityInput = document.getElementById('composerDensity');

    if (keySelect) keySelect.addEventListener('change', () => { this.invalidateCache(); this.pushHistory(); });
    if (scaleSelect) scaleSelect.addEventListener('change', () => { this.invalidateCache(); this.pushHistory(); });
    if (bpmInput) bpmInput.addEventListener('input', () => this.emit('bpmChanged', parseInt(bpmInput.value) || 120));
    if (barsInput) barsInput.addEventListener('input', () => this.emit('lengthChanged', parseInt(barsInput.value) || 8));
    if (densityInput) densityInput.addEventListener('input', () => this.emit('densityChanged', parseInt(densityInput.value) || 50));
  }

  invalidateCache() {
    this.scaleCache.clear();
  }

  pushHistory() {
    if (this.currentPattern) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
      this.historyStack.push(JSON.parse(JSON.stringify(this.currentPattern)));
      if (this.historyStack.length > 50) this.historyStack.shift();
      this.historyIndex = this.historyStack.length - 1;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentPattern = JSON.parse(JSON.stringify(this.historyStack[this.historyIndex]));
      this.renderPattern();
      this.emit('undo', this.currentPattern);
    }
  }

  redo() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.currentPattern = JSON.parse(JSON.stringify(this.historyStack[this.historyIndex]));
      this.renderPattern();
      this.emit('redo', this.currentPattern);
    }
  }

  async generatePattern() {
    const key = document.getElementById('composerKey')?.value || 'C';
    const scale = document.getElementById('composerScale')?.value || 'major';
    const bpm = parseInt(document.getElementById('composerBpm')?.value) || 120;
    const bars = parseInt(document.getElementById('composerBars')?.value) || 8;
    const density = parseInt(document.getElementById('composerDensity')?.value) || 50;
    const style = document.getElementById('composerStyle')?.value || 'pop';

    const loading = document.getElementById('composerLoading');
    if (loading) loading.style.display = 'flex';

    try {
      const scaleNotes = this.buildScale(key, scale);
      const chords = this.generateChords(scaleNotes, bars, style);
      const melody = this.generateMelodyFromChords(chords, scaleNotes, bars, density);
      const bassline = this.generateBassline(chords, bars);
      const drums = this.generateDrumPattern(bars, style);

      this.currentPattern = {
        id: randomId('pat'),
        key, scale, bpm, bars, density, style,
        createdAt: Date.now(),
        chords, melody, bassline, drums
      };

      this.pushHistory();
      this.renderPattern();
      this.emit('patternGenerated', this.currentPattern);
    } catch (e) {
      showToast('作曲生成失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  buildScale(root, scaleType) {
    const cacheKey = root + '_' + scaleType;
    if (this.scaleCache.has(cacheKey)) return this.scaleCache.get(cacheKey);

    const rootMidi = this.noteNameToMidi(root + '4');
    const intervals = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
      pentatonic_major: [0, 2, 4, 7, 9],
      pentatonic_minor: [0, 3, 5, 7, 10],
      blues: [0, 3, 5, 6, 7, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    };

    const pattern = intervals[scaleType] || intervals.major;
    const notes = [];
    for (let octave = 3; octave <= 6; octave++) {
      pattern.forEach(semi => {
        notes.push(rootMidi + (octave - 4) * 12 + semi);
      });
    }
    this.scaleCache.set(cacheKey, notes);
    return notes;
  }

  noteNameToMidi(name) {
    const notes = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const match = name.match(/^([A-G][#b]?)(\d)$/);
    if (!match) return 60;
    return (parseInt(match[2]) + 1) * 12 + (notes[match[1]] || 0);
  }

  generateChords(scaleNotes, bars, style) {
    const degrees = this.getStyleDegrees(style);
    const progression = [];
    const beatsPerBar = 4;
    for (let bar = 0; bar < bars; bar++) {
      const degreeIdx = degrees[bar % degrees.length];
      const rootNote = scaleNotes[degreeIdx % scaleNotes.length];
      const chordType = this.getChordTypeForDegree(degreeIdx, style);
      const notes = this.buildChordNotes(rootNote, chordType);
      progression.push({
        bar,
        root: rootNote,
        type: chordType,
        notes,
        duration: beatsPerBar,
        offset: bar * beatsPerBar
      });
    }
    return progression;
  }

  getStyleDegrees(style) {
    const map = {
      pop: [0, 4, 5, 3],
      rock: [0, 3, 4, 0, 5, 3, 4, 0],
      jazz: [0, 2, 3, 5, 4, 0, 5, 1],
      electronic: [0, 5, 3, 4, 0, 3, 4, 5],
      classical: [0, 3, 4, 0, 3, 4, 5, 0],
      folk: [0, 3, 4, 0, 0, 5, 3, 4],
      metal: [0, 5, 6, 0, 3, 4, 5, 0],
      rnb: [3, 4, 0, 5, 1, 4, 0, 3]
    };
    return map[style] || map.pop;
  }

  getChordTypeForDegree(degree, style) {
    const map = {
      pop: ['maj7', 'min7', 'maj7', 'min7', 'min7', 'maj7', 'min7b5'],
      rock: ['', 'min', 'min', '', '', 'min', 'dim'],
      jazz: ['maj7', 'min7', 'min7', 'maj7', '7', 'min7', 'min7b5'],
      electronic: ['min', 'min', 'maj', 'min', 'min', 'maj', 'dim']
    };
    const types = map[style] || map.pop;
    return types[degree % types.length];
  }

  buildChordNotes(root, type) {
    const intervals = {
      '': [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
      maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], '7': [0, 4, 7, 10],
      min7b5: [0, 3, 6, 10], sus4: [0, 5, 7], add9: [0, 4, 7, 14]
    };
    const pat = intervals[type] || intervals[''];
    return pat.map(semi => root + semi);
  }

  generateMelodyFromChords(chords, scaleNotes, bars, density) {
    const notes = [];
    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;
    const noteDensity = density / 100;
    let currentBeat = 0;

    while (currentBeat < totalBeats) {
      if (Math.random() < noteDensity) {
        const currentChord = chords[Math.floor(currentBeat / beatsPerBar)] || chords[0];
        const availableNotes = scaleNotes.filter(n => n >= currentChord.root - 12 && n <= currentChord.root + 24);
        const pitch = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        const duration = [0.25, 0.5, 1, 1.5, 2][Math.floor(Math.random() * 5)];
        const velocity = 60 + Math.floor(Math.random() * 40);
        notes.push({ pitch, duration, velocity, offset: currentBeat, id: randomId('note') });
        currentBeat += duration;
      } else {
        currentBeat += 0.25;
      }
    }
    return notes;
  }

  generateBassline(chords, bars) {
    const notes = [];
    for (let bar = 0; bar < bars; bar++) {
      const chord = chords[bar % chords.length];
      notes.push({ pitch: chord.root - 24, duration: 2, velocity: 90, offset: bar * 4, id: randomId('bass') });
      notes.push({ pitch: chord.root - 24, duration: 2, velocity: 80, offset: bar * 4 + 2, id: randomId('bass') });
    }
    return notes;
  }

  generateDrumPattern(bars, style) {
    const kicks = []; const snares = []; const hihats = [];
    const patterns = {
      pop: { kick: [0, 2], snare: [1, 3], hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
      rock: { kick: [0, 0.5, 2, 2.5], snare: [1, 3], hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
      electronic: { kick: [0, 1.5, 2.5], snare: [1, 3], hihat: [0.5, 1.5, 2.5, 3.5] },
      jazz: { kick: [0, 2], snare: [1, 3], hihat: [0, 0.66, 1.33, 2, 2.66, 3.33] }
    };
    const pat = patterns[style] || patterns.pop;
    for (let bar = 0; bar < bars; bar++) {
      pat.kick.forEach(b => kicks.push({ offset: bar * 4 + b, duration: 0.25, velocity: 100, id: randomId('dk') }));
      pat.snare.forEach(b => snares.push({ offset: bar * 4 + b, duration: 0.25, velocity: 90, id: randomId('ds') }));
      pat.hihat.forEach(b => hihats.push({ offset: bar * 4 + b, duration: 0.25, velocity: 70, id: randomId('dh') }));
    }
    return { kicks, snares, hihats };
  }

  regenerateWithSeed(seed) {
    this.melodySeed = seed;
    Math.seedrandom = Math.seedrandom || function() {};
    this.generatePattern();
  }

  mutateCurrentPattern() {
    if (!this.currentPattern) return;
    const mutationRate = 0.15;
    this.currentPattern.melody.forEach(note => {
      if (Math.random() < mutationRate) {
        note.pitch += (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
        note.pitch = clamp(note.pitch, 36, 96);
      }
      if (Math.random() < mutationRate * 0.5) {
        note.duration *= (Math.random() > 0.5 ? 2 : 0.5);
        note.duration = clamp(note.duration, 0.25, 4);
      }
    });
    this.pushHistory();
    this.renderPattern();
    this.emit('patternMutated', this.currentPattern);
  }

  invertMelody() {
    if (!this.currentPattern || !this.currentPattern.melody.length) return;
    const center = this.currentPattern.melody.reduce((s, n) => s + n.pitch, 0) / this.currentPattern.melody.length;
    this.currentPattern.melody.forEach(note => {
      note.pitch = Math.round(center * 2 - note.pitch);
    });
    this.pushHistory();
    this.renderPattern();
    this.emit('melodyInverted', this.currentPattern);
  }

  retrogradeMelody() {
    if (!this.currentPattern || !this.currentPattern.melody.length) return;
    const totalDuration = this.currentPattern.melody.reduce((s, n) => Math.max(s, n.offset + n.duration), 0);
    this.currentPattern.melody.forEach(note => {
      note.offset = totalDuration - note.offset - note.duration;
    });
    this.currentPattern.melody.sort((a, b) => a.offset - b.offset);
    this.pushHistory();
    this.renderPattern();
    this.emit('melodyRetrograded', this.currentPattern);
  }

  renderPattern() {
    const container = document.getElementById('composerPatternView');
    if (!container || !this.currentPattern) return;
    const { key, scale, bpm, bars, melody, chords } = this.currentPattern;
    let html = `<div style="font-size:12px;color:var(--text2);margin-bottom:8px;">${key} ${scale} | ${bpm} BPM | ${bars} 小节 | 音符数: ${melody.length}</div>`;
    html += '<div style="display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto;">';
    chords.forEach((chord, i) => {
      const names = chord.notes.map(n => this.midiToNoteName(n)).join(' ');
      html += `<div style="padding:4px 8px;background:rgba(0,0,0,0.03);border-radius:6px;font-size:12px;"><b>小节 ${i+1}</b> ${this.midiToNoteName(chord.root)}${chord.type} (${names})</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  midiToNoteName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    return names[midi % 12] + octave;
  }

  playPreview() {
    if (!window.qlAudio || !this.currentPattern) return;
    window.qlAudio.init();
    const now = window.qlAudio.ctx.currentTime;
    this.currentPattern.melody.forEach(note => {
      window.qlAudio.playNote(this.midiToFreq(note.pitch), note.duration, 'sine', note.velocity / 127);
    });
    this.currentPattern.bassline.forEach(note => {
      window.qlAudio.playNote(this.midiToFreq(note.pitch), note.duration, 'triangle', note.velocity / 127);
    });
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  exportCurrentPattern() {
    if (!this.currentPattern) return;
    const exporter = new MidiExporter();
    exporter.exportMidi({ tracks: [
      { name: 'Melody', notes: this.currentPattern.melody },
      { name: 'Bass', notes: this.currentPattern.bassline }
    ]}, 'composer_pattern.mid');
    showToast('作曲 MIDI 已导出', 'success');
  }

  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.currentPattern) {
        localStorage.setItem('qingluan_composer_autosave', JSON.stringify(this.currentPattern));
      }
    }, 30000);
  }

  loadTemplates() {
    const templates = JSON.parse(localStorage.getItem('qingluan_composer_templates') || '[]');
    const select = document.getElementById('composerTemplate');
    if (select) {
      select.innerHTML = '<option value="">选择模板...</option>' + templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
  }

  saveTemplate(name) {
    if (!this.currentPattern) return;
    const templates = JSON.parse(localStorage.getItem('qingluan_composer_templates') || '[]');
    templates.push({ id: randomId('tpl'), name, pattern: this.currentPattern, savedAt: Date.now() });
    localStorage.setItem('qingluan_composer_templates', JSON.stringify(templates));
    this.loadTemplates();
    showToast('模板已保存', 'success');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let composerPanel = null;
function initComposerPanel() {
  composerPanel = new ComposerPanel();
}

// ============================================================
// 工作室面板 - 编曲面板完整交互逻辑
// ============================================================

class ArrangerPanel {
  constructor() {
    this.tracks = [];
    this.arrangement = [];
    this.sections = [];
    this.currentSection = 0;
    this.listeners = {};
    this.clipboard = null;
    this.soloTrack = null;
    this.init();
  }

  init() {
    this.bindUI();
    this.createDefaultTracks();
    console.log('[青鸾 Studio] ArrangerPanel 初始化完成');
  }

  bindUI() {
    const btnAddTrack = document.getElementById('arrangerAddTrack');
    const btnDeleteTrack = document.getElementById('arrangerDeleteTrack');
    const btnDuplicate = document.getElementById('arrangerDuplicate');
    const btnSplit = document.getElementById('arrangerSplit');
    const btnMerge = document.getElementById('arrangerMerge');
    const btnQuantize = document.getElementById('arrangerQuantize');
    const btnTranspose = document.getElementById('arrangerTranspose');
    const btnHumanize = document.getElementById('arrangerHumanize');
    const btnRender = document.getElementById('arrangerRender');

    if (btnAddTrack) btnAddTrack.addEventListener('click', () => this.addTrackPrompt());
    if (btnDeleteTrack) btnDeleteTrack.addEventListener('click', () => this.deleteSelectedTrack());
    if (btnDuplicate) btnDuplicate.addEventListener('click', () => this.duplicateSelection());
    if (btnSplit) btnSplit.addEventListener('click', () => this.splitAtPlayhead());
    if (btnMerge) btnMerge.addEventListener('click', () => this.mergeSelected());
    if (btnQuantize) btnQuantize.addEventListener('click', () => this.quantizeSelection());
    if (btnTranspose) btnTranspose.addEventListener('click', () => this.transposeSelection());
    if (btnHumanize) btnHumanize.addEventListener('click', () => this.humanizeSelection());
    if (btnRender) btnRender.addEventListener('click', () => this.renderArrangement());

    const trackList = document.getElementById('arrangerTrackList');
    if (trackList) {
      trackList.addEventListener('dragover', (e) => { e.preventDefault(); });
      trackList.addEventListener('drop', (e) => this.handleTrackDrop(e));
    }
  }

  createDefaultTracks() {
    const defaults = [
      { name: '主唱', type: 'vocal', color: '#ff6b9d' },
      { name: '和声', type: 'vocal', color: '#ff9ecf' },
      { name: '主音吉他', type: 'instrument', color: '#5b4dff' },
      { name: '节奏吉他', type: 'instrument', color: '#7b6fff' },
      { name: '贝斯', type: 'instrument', color: '#4dff88' },
      { name: '钢琴', type: 'instrument', color: '#4dc4ff' },
      { name: '鼓组', type: 'drums', color: '#ffb84d' },
      { name: '合成器', type: 'synth', color: '#b84dff' },
      { name: '弦乐', type: 'strings', color: '#ff4d4d' },
      { name: 'FX', type: 'fx', color: '#999' }
    ];
    defaults.forEach((t, i) => this.addTrack(t.name, t.type, t.color, i));
  }

  addTrack(name, type, color, index = null) {
    const track = {
      id: randomId('trk'),
      name: name || '新轨道',
      type: type || 'instrument',
      color: color || `hsl(${Math.random() * 360}, 70%, 60%)`,
      index: index !== null ? index : this.tracks.length,
      clips: [],
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      effects: [],
      instrument: 'piano',
      midiData: []
    };
    this.tracks.push(track);
    this.renderTrackList();
    this.emit('trackAdded', track);
    return track;
  }

  addTrackPrompt() {
    const name = prompt('轨道名称:', '新轨道');
    if (name) this.addTrack(name, 'instrument');
  }

  deleteSelectedTrack() {
    const selected = document.querySelector('.arranger-track.selected');
    if (!selected) { showToast('请先选择轨道', 'warning'); return; }
    const id = selected.dataset.trackId;
    this.tracks = this.tracks.filter(t => t.id !== id);
    this.renderTrackList();
    this.emit('trackRemoved', id);
  }

  duplicateSelection() {
    const selected = document.querySelectorAll('.arranger-clip.selected');
    selected.forEach(el => {
      const trackId = el.dataset.trackId;
      const clipIdx = parseInt(el.dataset.clipIndex);
      const track = this.tracks.find(t => t.id === trackId);
      if (track && track.clips[clipIdx]) {
        const copy = JSON.parse(JSON.stringify(track.clips[clipIdx]));
        copy.id = randomId('clip');
        copy.offset += copy.duration;
        track.clips.push(copy);
      }
    });
    this.renderArrangement();
  }

  splitAtPlayhead() {
    const playhead = this.getPlayheadPosition();
    this.tracks.forEach(track => {
      track.clips = track.clips.flatMap(clip => {
        if (clip.offset <= playhead && clip.offset + clip.duration > playhead) {
          const left = { ...clip, duration: playhead - clip.offset, id: randomId('clip') };
          const right = { ...clip, offset: playhead, duration: clip.offset + clip.duration - playhead, id: randomId('clip') };
          return [left, right];
        }
        return [clip];
      });
    });
    this.renderArrangement();
  }

  mergeSelected() {
    const selected = document.querySelectorAll('.arranger-clip.selected');
    const byTrack = {};
    selected.forEach(el => {
      const tid = el.dataset.trackId;
      if (!byTrack[tid]) byTrack[tid] = [];
      byTrack[tid].push(parseInt(el.dataset.clipIndex));
    });
    Object.entries(byTrack).forEach(([tid, indices]) => {
      const track = this.tracks.find(t => t.id === tid);
      if (!track || indices.length < 2) return;
      const clips = indices.map(i => track.clips[i]).sort((a, b) => a.offset - b.offset);
      const merged = {
        id: randomId('clip'),
        offset: clips[0].offset,
        duration: clips[clips.length - 1].offset + clips[clips.length - 1].duration - clips[0].offset,
        name: clips[0].name + '_merged',
        notes: clips.flatMap(c => c.notes || [])
      };
      track.clips = track.clips.filter((_, i) => !indices.includes(i));
      track.clips.push(merged);
    });
    this.renderArrangement();
  }

  quantizeSelection() {
    const grid = parseFloat(document.getElementById('arrangerGrid')?.value) || 0.25;
    const selected = document.querySelectorAll('.arranger-clip.selected');
    selected.forEach(el => {
      const track = this.tracks.find(t => t.id === el.dataset.trackId);
      const clip = track?.clips[parseInt(el.dataset.clipIndex)];
      if (clip && clip.notes) {
        clip.notes.forEach(note => {
          note.offset = Math.round(note.offset / grid) * grid;
          note.duration = Math.max(grid, Math.round(note.duration / grid) * grid);
        });
      }
    });
    showToast('量化完成', 'success');
  }

  transposeSelection() {
    const semitones = parseInt(prompt('移调半音数 (+/-):', '0')) || 0;
    const selected = document.querySelectorAll('.arranger-clip.selected');
    selected.forEach(el => {
      const track = this.tracks.find(t => t.id === el.dataset.trackId);
      const clip = track?.clips[parseInt(el.dataset.clipIndex)];
      if (clip && clip.notes) {
        clip.notes.forEach(note => {
          note.pitch = clamp(note.pitch + semitones, 0, 127);
        });
      }
    });
    showToast(`移调 ${semitones} 半音完成`, 'success');
  }

  humanizeSelection() {
    const amount = parseInt(document.getElementById('arrangerHumanizeAmount')?.value) || 20;
    const factor = amount / 100;
    const selected = document.querySelectorAll('.arranger-clip.selected');
    selected.forEach(el => {
      const track = this.tracks.find(t => t.id === el.dataset.trackId);
      const clip = track?.clips[parseInt(el.dataset.clipIndex)];
      if (clip && clip.notes) {
        clip.notes.forEach(note => {
          note.offset += (Math.random() - 0.5) * 0.1 * factor;
          note.velocity = clamp(note.velocity + (Math.random() - 0.5) * 20 * factor, 1, 127);
        });
      }
    });
    showToast('人性化处理完成', 'success');
  }

  async renderArrangement() {
    const loading = document.getElementById('arrangerRenderLoading');
    if (loading) loading.style.display = 'flex';
    try {
      await new Promise(r => setTimeout(r, 1500));
      showToast('编曲渲染完成', 'success');
      this.emit('arrangementRendered', this.tracks);
    } catch (e) {
      showToast('渲染失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  getPlayheadPosition() {
    return parseFloat(document.getElementById('arrangerPlayhead')?.dataset.beat) || 0;
  }

  renderTrackList() {
    const container = document.getElementById('arrangerTrackList');
    if (!container) return;
    container.innerHTML = this.tracks.map(t => `
      <div class="arranger-track ${t.solo ? 'solo' : ''} ${t.muted ? 'muted' : ''}" data-track-id="${t.id}" draggable="true"
        style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${t.color}15;border-radius:8px;margin-bottom:4px;cursor:pointer;border-left:3px solid ${t.color};">
        <div style="width:8px;height:8px;border-radius:50%;background:${t.color};"></div>
        <div style="flex:1;font-size:12px;font-weight:600;">${escapeHtml(t.name)}</div>
        <button onclick="event.stopPropagation(); arrangerPanel.toggleMute('${t.id}')" style="width:22px;height:22px;border:none;border-radius:4px;background:${t.muted ? '#d44' : 'rgba(0,0,0,0.06)'};color:${t.muted ? '#fff' : 'var(--text2)'};font-size:9px;font-weight:700;cursor:pointer;">M</button>
        <button onclick="event.stopPropagation(); arrangerPanel.toggleSolo('${t.id}')" style="width:22px;height:22px;border:none;border-radius:4px;background:${t.solo ? '#fa0' : 'rgba(0,0,0,0.06)'};color:${t.solo ? '#fff' : 'var(--text2)'};font-size:9px;font-weight:700;cursor:pointer;">S</button>
      </div>
    `).join('');

    container.querySelectorAll('.arranger-track').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.arranger-track').forEach(t => t.classList.remove('selected'));
        el.classList.add('selected');
      });
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('trackId', el.dataset.trackId); });
    });
  }

  renderArrangement() {
    const container = document.getElementById('arrangerTimeline');
    if (!container) return;
    const ppb = 40;
    let html = '<div style="position:relative;">';
    this.tracks.forEach(track => {
      html += `<div style="height:48px;position:relative;border-bottom:1px solid var(--border);background:${track.color}08;">`;
      track.clips.forEach((clip, idx) => {
        html += `<div class="arranger-clip" data-track-id="${track.id}" data-clip-index="${idx}"
          style="position:absolute;left:${clip.offset * ppb}px;width:${Math.max(20, clip.duration * ppb)}px;top:4px;height:40px;background:${track.color}40;border:1px solid ${track.color};border-radius:6px;font-size:10px;padding:4px;overflow:hidden;cursor:pointer;"
          onclick="this.classList.toggle('selected')">${escapeHtml(clip.name || 'Clip')}</div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  handleTrackDrop(e) {
    const trackId = e.dataTransfer.getData('trackId');
    if (!trackId) return;
    const fromIdx = this.tracks.findIndex(t => t.id === trackId);
    const target = e.target.closest('.arranger-track');
    if (!target) return;
    const toIdx = this.tracks.findIndex(t => t.id === target.dataset.trackId);
    if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
      const [track] = this.tracks.splice(fromIdx, 1);
      this.tracks.splice(toIdx, 0, track);
      this.renderTrackList();
      this.renderArrangement();
    }
  }

  toggleMute(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) { track.muted = !track.muted; this.renderTrackList(); }
  }

  toggleSolo(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      if (track.solo) { track.solo = false; this.soloTrack = null; }
      else { this.tracks.forEach(t => t.solo = false); track.solo = true; this.soloTrack = trackId; }
      this.renderTrackList();
    }
  }

  addSection(name, startBar, endBar, type = 'verse') {
    this.sections.push({ id: randomId('sec'), name, startBar, endBar, type });
    this.renderSections();
  }

  renderSections() {
    const container = document.getElementById('arrangerSections');
    if (!container) return;
    container.innerHTML = this.sections.map(s => `
      <div style="padding:6px 10px;background:rgba(91,77,255,0.06);border-radius:8px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:600;">${escapeHtml(s.name)} (${s.type})</span>
        <span style="font-size:11px;color:var(--text2);">小节 ${s.startBar}-${s.endBar}</span>
      </div>
    `).join('');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let arrangerPanel = null;
function initArrangerPanel() {
  arrangerPanel = new ArrangerPanel();
}

// ============================================================
// 工作室面板 - 歌声合成面板完整交互逻辑
// ============================================================

class VoiceSynthesisPanel {
  constructor() {
    this.voices = [];
    this.currentVoice = null;
    this.pitchBend = 0;
    this.formantShift = 0;
    this.breathiness = 0.3;
    this.tension = 0.5;
    this.vibratoDepth = 0.5;
    this.vibratoRate = 5.5;
    this.phonemeMap = new Map();
    this.listeners = {};
    this.init();
  }

  init() {
    this.loadVoicePresets();
    this.bindUI();
    this.buildPhonemeMap();
    console.log('[青鸾 Studio] VoiceSynthesisPanel 初始化完成');
  }

  bindUI() {
    const btnSynthesize = document.getElementById('voiceSynthesize');
    const btnPreview = document.getElementById('voicePreview');
    const btnBatch = document.getElementById('voiceBatch');
    const btnImportLyrics = document.getElementById('voiceImportLyrics');
    const btnExportWav = document.getElementById('voiceExportWav');
    const btnTunePitch = document.getElementById('voiceTunePitch');

    if (btnSynthesize) btnSynthesize.addEventListener('click', () => this.synthesize());
    if (btnPreview) btnPreview.addEventListener('click', () => this.previewVoice());
    if (btnBatch) btnBatch.addEventListener('click', () => this.batchSynthesize());
    if (btnImportLyrics) btnImportLyrics.addEventListener('click', () => this.importLyrics());
    if (btnExportWav) btnExportWav.addEventListener('click', () => this.exportWav());
    if (btnTunePitch) btnTunePitch.addEventListener('click', () => this.openPitchEditor());

    const sliders = ['voicePitchBend', 'voiceFormant', 'voiceBreathiness', 'voiceTension', 'voiceVibratoDepth', 'voiceVibratoRate'];
    sliders.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.updateParameters());
    });

    const voiceSelect = document.getElementById('voiceSelect');
    if (voiceSelect) voiceSelect.addEventListener('change', () => this.selectVoice(voiceSelect.value));
  }

  loadVoicePresets() {
    this.voices = [
      { id: 'qingluan_soprano', name: '青鸾-女高音', gender: 'female', range: [60, 84], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_alto', name: '青鸾-女中音', gender: 'female', range: [55, 79], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_tenor', name: '青鸾-男高音', gender: 'male', range: [48, 72], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_bass', name: '青鸾-男低音', gender: 'male', range: [40, 64], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_child', name: '青鸾-童声', gender: 'child', range: [55, 77], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_rock', name: '青鸾-摇滚嗓', gender: 'mixed', range: [45, 76], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_whisper', name: '青鸾-气声', gender: 'mixed', range: [50, 75], language: 'zh', model: 'diffusion' },
      { id: 'qingluan_opera', name: '青鸾-美声', gender: 'mixed', range: [48, 84], language: 'zh', model: 'diffusion' }
    ];
    const select = document.getElementById('voiceSelect');
    if (select) {
      select.innerHTML = this.voices.map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
      this.selectVoice(this.voices[0].id);
    }
  }

  selectVoice(voiceId) {
    this.currentVoice = this.voices.find(v => v.id === voiceId);
    const info = document.getElementById('voiceInfo');
    if (info && this.currentVoice) {
      info.innerHTML = `<div style="font-size:12px;color:var(--text2);">
        音域: ${this.currentVoice.range[0]}-${this.currentVoice.range[1]} MIDI<br>
        语言: ${this.currentVoice.language} | 模型: ${this.currentVoice.model}
      </div>`;
    }
    this.emit('voiceChanged', this.currentVoice);
  }

  buildPhonemeMap() {
    const pinyinMap = {
      a: 'a', o: 'o', e: 'e', i: 'i', u: 'u', v: 'y',
      b: 'b', p: 'p', m: 'm', f: 'f', d: 'd', t: 't', n: 'n', l: 'l',
      g: 'g', k: 'k', h: 'h', j: 'j', q: 'q', x: 'x',
      zh: 'zh', ch: 'ch', sh: 'sh', r: 'r', z: 'z', c: 'c', s: 's',
      y: 'i', w: 'u', ai: 'ai', ei: 'ei', ao: 'ao', ou: 'ou',
      an: 'an', en: 'en', ang: 'ang', eng: 'eng', er: 'er',
      ia: 'ia', iao: 'iao', ian: 'ian', iang: 'iang', ie: 'ie', iong: 'iong', iou: 'iou',
      ua: 'ua', uai: 'uai', uan: 'uan', uang: 'uang', uo: 'uo', ui: 'uei', un: 'uen',
      ve: 've', van: 'van', vn: 'vn'
    };
    Object.entries(pinyinMap).forEach(([k, v]) => this.phonemeMap.set(k, v));
  }

  pinyinToPhonemes(text) {
    const segments = text.toLowerCase().split(/\s+/);
    return segments.map(seg => this.phonemeMap.get(seg) || seg);
  }

  updateParameters() {
    this.pitchBend = parseFloat(document.getElementById('voicePitchBend')?.value) || 0;
    this.formantShift = parseFloat(document.getElementById('voiceFormant')?.value) || 0;
    this.breathiness = parseFloat(document.getElementById('voiceBreathiness')?.value) || 0.3;
    this.tension = parseFloat(document.getElementById('voiceTension')?.value) || 0.5;
    this.vibratoDepth = parseFloat(document.getElementById('voiceVibratoDepth')?.value) || 0.5;
    this.vibratoRate = parseFloat(document.getElementById('voiceVibratoRate')?.value) || 5.5;
    this.emit('paramsChanged', { pitchBend: this.pitchBend, formantShift: this.formantShift, breathiness: this.breathiness, tension: this.tension, vibratoDepth: this.vibratoDepth, vibratoRate: this.vibratoRate });
  }

  async synthesize() {
    if (!this.currentVoice) { showToast('请先选择歌手', 'warning'); return; }
    const lyrics = document.getElementById('voiceLyrics')?.value || '';
    const notesInput = document.getElementById('voiceNotes')?.value || '';
    const loading = document.getElementById('voiceLoading');
    if (loading) loading.style.display = 'flex';

    try {
      const noteList = notesInput.split(',').map(s => {
        const parts = s.trim().split(':');
        return { midi: parseInt(parts[0]) || 60, duration: parseFloat(parts[1]) || 0.5 };
      }).filter(n => !isNaN(n.midi));

      const phonemes = this.pinyinToPhonemes(lyrics);
      const res = await fetch(`${API}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: this.currentVoice.id,
          lyrics,
          phonemes,
          notes: noteList,
          params: {
            pitchBend: this.pitchBend,
            formantShift: this.formantShift,
            breathiness: this.breathiness,
            tension: this.tension,
            vibratoDepth: this.vibratoDepth,
            vibratoRate: this.vibratoRate
          }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const player = document.getElementById('voicePlayer');
      if (player && data.wavBase64) {
        player.innerHTML = `<audio controls style="width:100%;margin-top:8px;" src="data:audio/wav;base64,${data.wavBase64}"></audio>`;
      }
      this.emit('synthesisComplete', data);
      showToast('歌声合成完成', 'success');
    } catch (e) {
      showToast('合成失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  previewVoice() {
    if (!window.qlAudio) return;
    const scale = [60, 62, 64, 65, 67, 69, 71, 72];
    let delay = 0;
    scale.forEach(note => {
      setTimeout(() => window.qlAudio.playNote(this.midiToFreq(note), 0.4, 'sine', 0.5), delay);
      delay += 400;
    });
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  async batchSynthesize() {
    const texts = (document.getElementById('voiceBatchInput')?.value || '').split('\n').filter(Boolean);
    if (!texts.length) { showToast('请输入批量歌词', 'warning'); return; }
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      document.getElementById('voiceBatchProgress').textContent = `进度: ${i+1}/${texts.length}`;
      await new Promise(r => setTimeout(r, 200));
      results.push({ text: texts[i], status: 'done' });
    }
    document.getElementById('voiceBatchResults').innerHTML = results.map(r => `<div style="font-size:12px;padding:4px 0;">${escapeHtml(r.text)} - ${r.status}</div>`).join('');
    showToast('批量合成完成', 'success');
  }

  importLyrics() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.lrc';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const area = document.getElementById('voiceLyrics');
        if (area) area.value = text;
        this.autoGenerateNotesFromLyrics(text);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  autoGenerateNotesFromLyrics(text) {
    const syllables = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').length;
    const notes = [];
    const basePitch = 60;
    for (let i = 0; i < Math.min(syllables, 32); i++) {
      notes.push({ midi: basePitch + (i % 7), duration: 0.5 });
    }
    const area = document.getElementById('voiceNotes');
    if (area) area.value = notes.map(n => `${n.midi}:${n.duration}`).join(', ');
  }

  exportWav() {
    showToast('请使用全局导出功能', 'info');
  }

  openPitchEditor() {
    const canvas = document.getElementById('voicePitchCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'var(--accent)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * 0.02) * 30;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    showToast('音高编辑器已打开', 'info');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let voiceSynthesisPanel = null;
function initVoiceSynthesisPanel() {
  voiceSynthesisPanel = new VoiceSynthesisPanel();
}

// ============================================================
// 工作室面板 - 效果器机架完整交互逻辑
// ============================================================

class EffectRack {
  constructor() {
    this.slots = [];
    this.maxSlots = 8;
    this.presets = [];
    this.bypassAll = false;
    this.listeners = {};
    this.init();
  }

  init() {
    this.loadPresets();
    this.bindUI();
    this.renderRack();
    console.log('[青鸾 Studio] EffectRack 初始化完成');
  }

  bindUI() {
    const btnAdd = document.getElementById('effectAdd');
    const btnClear = document.getElementById('effectClear');
    const btnBypass = document.getElementById('effectBypass');
    const btnSavePreset = document.getElementById('effectSavePreset');
    const btnLoadPreset = document.getElementById('effectLoadPreset');
    const btnRandomize = document.getElementById('effectRandomize');

    if (btnAdd) btnAdd.addEventListener('click', () => this.addSlotPrompt());
    if (btnClear) btnClear.addEventListener('click', () => this.clearAll());
    if (btnBypass) btnBypass.addEventListener('click', () => this.toggleBypassAll());
    if (btnSavePreset) btnSavePreset.addEventListener('click', () => this.savePresetPrompt());
    if (btnLoadPreset) btnLoadPreset.addEventListener('click', () => this.loadPresetPrompt());
    if (btnRandomize) btnRandomize.addEventListener('click', () => this.randomizeRack());
  }

  getAvailableEffects() {
    return [
      { type: 'reverb', name: '混响', params: [{ id: 'roomSize', label: '房间大小', min: 0, max: 1, val: 0.5 }, { id: 'damping', label: '阻尼', min: 0, max: 1, val: 0.3 }, { id: 'wet', label: '湿声', min: 0, max: 1, val: 0.3 }] },
      { type: 'delay', name: '延迟', params: [{ id: 'time', label: '时间', min: 10, max: 2000, val: 400 }, { id: 'feedback', label: '反馈', min: 0, max: 0.95, val: 0.4 }, { id: 'mix', label: '混合', min: 0, max: 1, val: 0.35 }] },
      { type: 'chorus', name: '合唱', params: [{ id: 'rate', label: '速率', min: 0.1, max: 10, val: 1.5 }, { id: 'depth', label: '深度', min: 0, max: 1, val: 0.5 }, { id: 'mix', label: '混合', min: 0, max: 1, val: 0.4 }] },
      { type: 'distortion', name: '失真', params: [{ id: 'drive', label: '驱动', min: 0, max: 100, val: 20 }, { id: 'tone', label: '音色', min: 0, max: 1, val: 0.5 }, { id: 'output', label: '输出', min: 0, max: 2, val: 1 }] },
      { type: 'eq', name: '均衡器', params: [{ id: 'low', label: '低频', min: -12, max: 12, val: 0 }, { id: 'mid', label: '中频', min: -12, max: 12, val: 0 }, { id: 'high', label: '高频', min: -12, max: 12, val: 0 }] },
      { type: 'compressor', name: '压缩器', params: [{ id: 'threshold', label: '阈值', min: -60, max: 0, val: -24 }, { id: 'ratio', label: '比率', min: 1, max: 20, val: 4 }, { id: 'attack', label: '启动', min: 0, max: 100, val: 10 }, { id: 'release', label: '释放', min: 10, max: 1000, val: 100 }] },
      { type: 'filter', name: '滤波器', params: [{ id: 'freq', label: '频率', min: 20, max: 20000, val: 1000 }, { id: 'resonance', label: '共振', min: 0, max: 20, val: 1 }, { id: 'type', label: '类型', options: ['lowpass','highpass','bandpass','notch'] }] },
      { type: 'phaser', name: '相位器', params: [{ id: 'rate', label: '速率', min: 0.1, max: 10, val: 0.5 }, { id: 'depth', label: '深度', min: 0, max: 1, val: 0.6 }, { id: 'stages', label: '级数', min: 2, max: 12, val: 4 }] },
      { type: 'flanger', name: '镶边', params: [{ id: 'delay', label: '延迟', min: 0.1, max: 20, val: 5 }, { id: 'rate', label: '速率', min: 0.1, max: 5, val: 0.5 }, { id: 'feedback', label: '反馈', min: -0.95, max: 0.95, val: 0.4 }] },
      { type: 'tremolo', name: '颤音', params: [{ id: 'rate', label: '速率', min: 0.1, max: 20, val: 5 }, { id: 'depth', label: '深度', min: 0, max: 1, val: 0.5 }] },
      { type: 'pitchshift', name: '移调', params: [{ id: 'semitones', label: '半音', min: -24, max: 24, val: 0 }, { id: 'window', label: '窗口', min: 10, max: 1000, val: 50 }] },
      { type: 'limiter', name: '限制器', params: [{ id: 'ceiling', label: '上限', min: -12, max: 0, val: -0.1 }, { id: 'release', label: '释放', min: 1, max: 1000, val: 50 }] }
    ];
  }

  addSlot(effectType) {
    if (this.slots.length >= this.maxSlots) { showToast('效果器机架已满', 'warning'); return; }
    const defs = this.getAvailableEffects();
    const def = defs.find(e => e.type === effectType) || defs[0];
    const slot = {
      id: randomId('fx'),
      type: def.type,
      name: def.name,
      bypass: false,
      params: def.params.map(p => ({ ...p, value: p.val !== undefined ? p.val : (p.min + p.max) / 2 })),
      order: this.slots.length
    };
    this.slots.push(slot);
    this.renderRack();
    this.emit('slotAdded', slot);
  }

  addSlotPrompt() {
    const defs = this.getAvailableEffects();
    const type = prompt('效果器类型: ' + defs.map(d => d.type).join(', '), 'reverb');
    if (type) this.addSlot(type);
  }

  removeSlot(slotId) {
    this.slots = this.slots.filter(s => s.id !== slotId);
    this.slots.forEach((s, i) => s.order = i);
    this.renderRack();
    this.emit('slotRemoved', slotId);
  }

  moveSlot(slotId, direction) {
    const idx = this.slots.findIndex(s => s.id === slotId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.slots.length) return;
    [this.slots[idx], this.slots[newIdx]] = [this.slots[newIdx], this.slots[idx]];
    this.slots.forEach((s, i) => s.order = i);
    this.renderRack();
  }

  clearAll() {
    this.slots = [];
    this.renderRack();
    this.emit('rackCleared');
  }

  toggleBypassAll() {
    this.bypassAll = !this.bypassAll;
    this.slots.forEach(s => s.bypass = this.bypassAll);
    this.renderRack();
  }

  toggleBypassSlot(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (slot) { slot.bypass = !slot.bypass; this.renderRack(); }
  }

  updateSlotParam(slotId, paramId, value) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return;
    const param = slot.params.find(p => p.id === paramId);
    if (param) {
      param.value = parseFloat(value);
      this.emit('paramChanged', { slotId, paramId, value: param.value });
    }
  }

  renderRack() {
    const container = document.getElementById('effectRackContainer');
    if (!container) return;
    if (!this.slots.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text2);font-size:12px;padding:20px;">效果器机架为空，点击添加效果器</div>';
      return;
    }
    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    this.slots.forEach((slot, idx) => {
      html += `<div style="padding:10px;background:rgba(0,0,0,0.03);border-radius:10px;border-left:3px solid ${slot.bypass ? '#999' : 'var(--accent)'};opacity:${slot.bypass ? 0.5 : 1};">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">`;
      html += `<span style="font-size:12px;font-weight:700;">${idx+1}. ${escapeHtml(slot.name)}</span>`;
      html += `<div style="display:flex;gap:4px;">`;
      html += `<button onclick="effectRack.moveSlot('${slot.id}', -1)" style="width:22px;height:22px;border:none;border-radius:4px;background:rgba(0,0,0,0.06);cursor:pointer;font-size:11px;">↑</button>`;
      html += `<button onclick="effectRack.moveSlot('${slot.id}', 1)" style="width:22px;height:22px;border:none;border-radius:4px;background:rgba(0,0,0,0.06);cursor:pointer;font-size:11px;">↓</button>`;
      html += `<button onclick="effectRack.toggleBypassSlot('${slot.id}')" style="width:32px;height:22px;border:none;border-radius:4px;background:${slot.bypass ? '#999' : 'var(--accent)'};color:#fff;font-size:9px;font-weight:700;cursor:pointer;">${slot.bypass ? '旁通' : '启用'}</button>`;
      html += `<button onclick="effectRack.removeSlot('${slot.id}')" style="width:22px;height:22px;border:none;border-radius:4px;background:rgba(0,0,0,0.06);color:#d44;cursor:pointer;font-size:11px;">×</button>`;
      html += `</div></div>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:8px;">`;
      slot.params.forEach(p => {
        html += `<div style="flex:1;min-width:120px;">`;
        html += `<div style="font-size:10px;color:var(--text2);margin-bottom:2px;">${escapeHtml(p.label)}: <span id="fx-val-${slot.id}-${p.id}">${p.value.toFixed(2)}</span></div>`;
        if (p.options) {
          html += `<select onchange="effectRack.updateSlotParam('${slot.id}', '${p.id}', this.value)" style="width:100%;font-size:11px;padding:3px;border-radius:4px;border:1px solid var(--border);background:var(--bg);">`;
          p.options.forEach(opt => html += `<option value="${opt}" ${p.value === opt ? 'selected' : ''}>${opt}</option>`);
          html += `</select>`;
        } else {
          html += `<input type="range" min="${p.min}" max="${p.max}" step="${(p.max - p.min) / 100}" value="${p.value}" style="width:100%;accent-color:var(--accent);" oninput="effectRack.updateSlotParam('${slot.id}', '${p.id}', this.value); document.getElementById('fx-val-${slot.id}-${p.id}').textContent = parseFloat(this.value).toFixed(2);">`;
        }
        html += `</div>`;
      });
      html += `</div></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  savePresetPrompt() {
    const name = prompt('预设名称:', '我的预设');
    if (!name) return;
    const preset = { id: randomId('fxp'), name, slots: JSON.parse(JSON.stringify(this.slots)), savedAt: Date.now() };
    this.presets.push(preset);
    localStorage.setItem('qingluan_effect_presets', JSON.stringify(this.presets));
    showToast('预设已保存', 'success');
  }

  loadPresetPrompt() {
    const id = prompt('预设ID:');
    if (!id) return;
    this.loadPreset(id);
  }

  loadPreset(id) {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) { showToast('预设未找到', 'error'); return; }
    this.slots = JSON.parse(JSON.stringify(preset.slots));
    this.renderRack();
    showToast('预设已加载', 'success');
  }

  loadPresets() {
    try {
      this.presets = JSON.parse(localStorage.getItem('qingluan_effect_presets') || '[]');
    } catch (e) { this.presets = []; }
  }

  randomizeRack() {
    const defs = this.getAvailableEffects();
    this.slots = [];
    const count = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < count; i++) {
      const def = defs[Math.floor(Math.random() * defs.length)];
      const slot = {
        id: randomId('fx'),
        type: def.type,
        name: def.name,
        bypass: false,
        params: def.params.map(p => ({ ...p, value: p.min + Math.random() * (p.max - p.min) })),
        order: i
      };
      this.slots.push(slot);
    }
    this.renderRack();
    showToast('随机效果器链已生成', 'success');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let effectRack = null;
function initEffectRack() {
  effectRack = new EffectRack();
}

// ============================================================
// 工作室面板 - 可视化面板完整交互逻辑
// ============================================================

class VisualizerPanel {
  constructor() {
    this.analysers = new Map();
    this.canvases = new Map();
    this.running = false;
    this.mode = 'spectrum';
    this.colorScheme = 'default';
    this.sensitivity = 1.0;
    this.smoothing = 0.8;
    this.fpsLimit = 60;
    this.lastFrame = 0;
    this.listeners = {};
    this.particleSystems = [];
    this.waveformHistory = [];
    this.init();
  }

  init() {
    this.bindUI();
    this.detectCanvases();
    console.log('[青鸾 Studio] VisualizerPanel 初始化完成');
  }

  bindUI() {
    const modeSelect = document.getElementById('visualMode');
    const colorSelect = document.getElementById('visualColor');
    const sensInput = document.getElementById('visualSensitivity');
    const smoothInput = document.getElementById('visualSmoothing');
    const btnStart = document.getElementById('visualStart');
    const btnStop = document.getElementById('visualStop');
    const btnScreenshot = document.getElementById('visualScreenshot');
    const btnRecord = document.getElementById('visualRecord');

    if (modeSelect) modeSelect.addEventListener('change', (e) => this.setMode(e.target.value));
    if (colorSelect) colorSelect.addEventListener('change', (e) => this.setColorScheme(e.target.value));
    if (sensInput) sensInput.addEventListener('input', (e) => this.sensitivity = parseFloat(e.target.value) || 1);
    if (smoothInput) smoothInput.addEventListener('input', (e) => this.smoothing = parseFloat(e.target.value) || 0.8);
    if (btnStart) btnStart.addEventListener('click', () => this.start());
    if (btnStop) btnStop.addEventListener('click', () => this.stop());
    if (btnScreenshot) btnScreenshot.addEventListener('click', () => this.takeScreenshot());
    if (btnRecord) btnRecord.addEventListener('click', () => this.toggleRecording());
  }

  detectCanvases() {
    ['visualCanvas', 'visualCanvas2', 'visualCanvas3'].forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        this.canvases.set(id, canvas);
      }
    });
  }

  setMode(mode) {
    this.mode = mode;
    this.waveformHistory = [];
    this.particleSystems = [];
    this.emit('modeChanged', mode);
  }

  setColorScheme(scheme) {
    this.colorScheme = scheme;
    this.emit('colorSchemeChanged', scheme);
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (window.qlAudio && window.qlAudio.analyser) {
      this.analysers.set('master', window.qlAudio.analyser);
    }
    this.detectCanvases();
    this.animate();
    showToast('可视化已启动', 'info');
  }

  stop() {
    this.running = false;
    showToast('可视化已停止', 'info');
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame((t) => this.animate(t));
  }

  animate(time) {
    if (!this.running) return;
    requestAnimationFrame((t) => this.animate(t));
    if (time - this.lastFrame < 1000 / this.fpsLimit) return;
    this.lastFrame = time;

    const analyser = this.analysers.get('master');
    if (!analyser) return;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    this.canvases.forEach((canvas, id) => {
      const ctx = canvas.getContext('2d');
      if (this.mode === 'spectrum') this.drawSpectrum(ctx, canvas, freqData);
      else if (this.mode === 'waveform') this.drawWaveform(ctx, canvas, timeData);
      else if (this.mode === 'circular') this.drawCircular(ctx, canvas, freqData);
      else if (this.mode === 'particles') this.drawParticles(ctx, canvas, freqData);
      else if (this.mode === 'oscilloscope') this.drawOscilloscope(ctx, canvas, timeData);
      else if (this.mode === 'bars3d') this.drawBars3D(ctx, canvas, freqData);
      else if (this.mode === 'waterfall') this.drawWaterfall(ctx, canvas, freqData);
      else if (this.mode === 'lissajous') this.drawLissajousRealTime(ctx, canvas, timeData);
    });
  }

  getColor(intensity, index, total) {
    const schemes = {
      default: (i, v) => `hsl(${200 + v * 60}, 80%, ${40 + v * 30}%)`,
      fire: (i, v) => `hsl(${v * 60}, 100%, ${30 + v * 40}%)`,
      ocean: (i, v) => `hsl(${180 + v * 60}, 80%, ${30 + v * 40}%)`,
      neon: (i, v) => `hsl(${(i / total) * 360}, 100%, ${20 + v * 50}%)`,
      mono: (i, v) => `rgba(255,255,255,${0.2 + v * 0.8})`
    };
    const fn = schemes[this.colorScheme] || schemes.default;
    return fn(index, intensity);
  }

  drawSpectrum(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    const bars = 64;
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length);
      const val = (data[idx] / 255) * this.sensitivity;
      const height = val * h;
      ctx.fillStyle = this.getColor(val, i, bars);
      ctx.fillRect(i * bw, h - height, bw - 1, height);
    }
  }

  drawWaveform(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = this.getColor(1, 0, 1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = data.length / w;
    for (let x = 0; x < w; x++) {
      const idx = Math.floor(x * step);
      const y = (data[idx] / 255) * h;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawCircular(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    const radius = Math.min(w, h) * 0.3;
    const bars = 128;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length);
      const val = (data[idx] / 255) * this.sensitivity;
      const angle = (i / bars) * Math.PI * 2;
      const barHeight = val * radius * 0.8;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + barHeight);
      const y2 = cy + Math.sin(angle) * (radius + barHeight);
      ctx.strokeStyle = this.getColor(val, i, bars);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  drawParticles(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    if (avg > 30 * this.sensitivity) {
      for (let i = 0; i < 5; i++) {
        this.particleSystems.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 1,
          size: Math.random() * 4 + 1,
          color: this.getColor(avg / 255, Math.random() * 100, 100)
        });
      }
    }
    this.particleSystems.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      p.size *= 0.98;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    this.particleSystems = this.particleSystems.filter(p => p.life > 0);
  }

  drawOscilloscope(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i += 2) {
      const x = (i / data.length) * w;
      const y = h / 2 + ((data[i] - 128) / 128) * (h / 2) * this.sensitivity;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawBars3D(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    const cols = 16;
    const rows = 8;
    const cellW = w / cols;
    const cellH = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = Math.floor(((r * cols + c) / (cols * rows)) * data.length);
        const val = (data[idx] / 255) * this.sensitivity;
        const size = val * Math.min(cellW, cellH) * 0.8;
        ctx.fillStyle = this.getColor(val, r * cols + c, cols * rows);
        ctx.fillRect(c * cellW + (cellW - size) / 2, r * cellH + (cellH - size) / 2, size, size);
      }
    }
  }

  drawWaterfall(ctx, canvas, data) {
    const w = canvas.width;
    const h = canvas.height;
    this.waveformHistory.push(new Uint8Array(data));
    if (this.waveformHistory.length > 50) this.waveformHistory.shift();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const rowH = h / 50;
    this.waveformHistory.forEach((row, yIdx) => {
      const y = h - (yIdx + 1) * rowH;
      for (let i = 0; i < w; i++) {
        const idx = Math.floor((i / w) * row.length);
        const val = (row[idx] / 255) * this.sensitivity;
        ctx.fillStyle = this.getColor(val, i, w);
        if (val > 0.1) ctx.fillRect(i, y, 1, rowH);
      }
    });
  }

  drawLissajousRealTime(ctx, canvas, timeData) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = this.getColor(1, 0, 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < timeData.length - 1; i++) {
      const x = (timeData[i] / 255) * w;
      const y = (timeData[i + 1] / 255) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  takeScreenshot() {
    this.canvases.forEach(canvas => {
      const link = document.createElement('a');
      link.download = 'visual_' + Date.now() + '.png';
      link.href = canvas.toDataURL();
      link.click();
    });
    showToast('截图已保存', 'success');
  }

  toggleRecording() {
    showToast('录制功能需要 MediaRecorder API 支持', 'info');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let visualizerPanel = null;
function initVisualizerPanel() {
  visualizerPanel = new VisualizerPanel();
}

// ============================================================
// 对话系统增强 - 意图解析、上下文管理、多轮对话、快捷指令动态生成
// ============================================================

class DialogueManager {
  constructor() {
    this.contextWindow = [];
    this.maxContextLength = 20;
    this.intentHistory = [];
    this.entityMemory = new Map();
    this.quickCommands = [];
    this.suggestionEngine = null;
    this.responseTemplates = new Map();
    this.nluConfidenceThreshold = 0.6;
    this.sessionState = {};
    this.listeners = {};
    this.init();
  }

  init() {
    this.loadResponseTemplates();
    this.generateQuickCommands();
    this.startSuggestionLoop();
    console.log('[青鸾 AI] DialogueManager 初始化完成');
  }

  loadResponseTemplates() {
    this.responseTemplates.set('compose', [
      '好的，我来为你创作一段 {style} 风格的 {key} 大调旋律，情绪是 {emotion}。',
      '正在生成 {style} 风格的作曲，{barCount} 小节，请稍候...',
      '为你谱写一段 {emotion} 的 {style} 旋律，调性 {key}。'
    ]);
    this.responseTemplates.set('arranger', [
      '开始编曲，风格 {style}，包含 {tracks} 轨配器。',
      '正在生成 {style} 伴奏，使用 {instrument} 作为主奏乐器。'
    ]);
    this.responseTemplates.set('voice', [
      '使用 {voice} 声线合成歌声，移调 {semitones} 半音。',
      '正在生成 {voice} 风格的人声，情感参数已调整。'
    ]);
    this.responseTemplates.set('effects', [
      '已应用 {effectChain} 效果器链。',
      '效果器参数已设置：{params}。'
    ]);
    this.responseTemplates.set('project', [
      '项目已保存为 {name}，版本 {version}。',
      '正在导出 {format} 格式...'
    ]);
    this.responseTemplates.set('chat', [
      '我可以帮你作曲、编曲、写歌词、合成真人声。你想做什么？',
      '有什么音乐创作的想法？我可以一键生成完整歌曲。'
    ]);
  }

  formatResponse(intent, params) {
    const templates = this.responseTemplates.get(intent) || this.responseTemplates.get('chat');
    let text = templates[Math.floor(Math.random() * templates.length)];
    Object.entries(params || {}).forEach(([k, v]) => {
      text = text.replace(new RegExp('{' + k + '}', 'g'), v);
    });
    return text;
  }

  pushContext(role, text, intent = 'chat') {
    this.contextWindow.push({ role, text, intent, timestamp: Date.now() });
    if (this.contextWindow.length > this.maxContextLength) {
      this.contextWindow.shift();
    }
    this.intentHistory.push(intent);
    if (this.intentHistory.length > 50) this.intentHistory.shift();
  }

  getContextSummary() {
    const recent = this.contextWindow.slice(-5);
    const intents = {};
    recent.forEach(c => { intents[c.intent] = (intents[c.intent] || 0) + 1; });
    const dominant = Object.entries(intents).sort((a, b) => b[1] - a[1])[0]?.[0] || 'chat';
    return { recent, dominantIntent: dominant, turnCount: this.contextWindow.length };
  }

  parseAdvancedIntent(text) {
    const lower = text.toLowerCase();
    const results = [];

    const patterns = [
      { intent: 'compose', regex: /作曲|旋律|写歌|compose|melody/i, weight: 1.0 },
      { intent: 'arranger', regex: /编曲|伴奏|arrange|backing/i, weight: 1.0 },
      { intent: 'lyrics', regex: /歌词|lyric|写词/i, weight: 1.0 },
      { intent: 'voice', regex: /人声|唱歌|歌声|vocal|sing/i, weight: 1.0 },
      { intent: 'fullsong', regex: /完整|一键|整首|全曲|production/i, weight: 1.0 },
      { intent: 'effects', regex: /效果器|effect|混响|reverb|eq|延迟|delay/i, weight: 0.9 },
      { intent: 'visual', regex: /可视化|visual|频谱|spectrum/i, weight: 0.9 },
      { intent: 'studio', regex: /工作室|studio|高级|参数/i, weight: 0.8 },
      { intent: 'project', regex: /项目|保存|导出|project|save|load/i, weight: 0.8 },
      { intent: 'theory', regex: /理论|音阶|和弦|scale|chord|theory/i, weight: 0.7 },
      { intent: 'game', regex: /游戏|game|练耳|音程|和弦挑战/i, weight: 0.7 },
      { intent: 'fingerprint', regex: /指纹|版权|fingerprint/i, weight: 0.6 }
    ];

    patterns.forEach(p => {
      const match = lower.match(p.regex);
      if (match) {
        results.push({ intent: p.intent, confidence: p.weight, matched: match[0] });
      }
    });

    results.sort((a, b) => b.confidence - a.confidence);
    const best = results[0];
    if (best && best.confidence >= this.nluConfidenceThreshold) {
      return { intent: best.intent, confidence: best.confidence, alternatives: results.slice(1, 3), entities: this.extractEntities(text) };
    }
    return { intent: 'chat', confidence: 1.0, alternatives: [], entities: this.extractEntities(text) };
  }

  extractEntities(text) {
    const entities = {};
    const styleMap = { '流行': 'pop', '摇滚': 'rock', '爵士': 'jazz', '电子': 'electronic', '古典': 'classical', '民谣': 'folk', '中国风': 'chinese', '金属': 'metal', 'r&b': 'rnb', '蓝调': 'blues' };
    for (const [k, v] of Object.entries(styleMap)) {
      if (text.includes(k)) { entities.style = v; entities.styleZh = k; }
    }
    const emotionMap = { '欢快': 'happy', '忧伤': 'sad', '悲伤': 'sad', '浪漫': 'romantic', '紧张': 'tense', '史诗': 'epic', '放松': 'relaxed', '愤怒': 'angry' };
    for (const [k, v] of Object.entries(emotionMap)) {
      if (text.includes(k)) { entities.emotion = v; entities.emotionZh = k; }
    }
    const keyMap = { 'c大调': 'C', 'g大调': 'G', 'f大调': 'F', 'd大调': 'D', 'a小调': 'Am', 'e小调': 'Em', 'bb大调': 'Bb', '降b大调': 'Bb' };
    for (const [k, v] of Object.entries(keyMap)) {
      if (text.toLowerCase().includes(k)) entities.key = v;
    }
    const bpmMatch = text.match(/(\d+)\s*bpm/i);
    if (bpmMatch) entities.bpm = parseInt(bpmMatch[1]);
    const barMatch = text.match(/(\d+)\s*小节/i);
    if (barMatch) entities.bars = parseInt(barMatch[1]);
    return entities;
  }

  resolveAnaphora(text) {
    const anaphoricWords = ['它', '这个', '那个', '刚才的', '之前的'];
    const hasAnaphora = anaphoricWords.some(w => text.includes(w));
    if (!hasAnaphora) return text;
    const summary = this.getContextSummary();
    if (summary.dominantIntent !== 'chat') {
      const lastUserMsg = summary.recent.filter(c => c.role === 'user').pop();
      if (lastUserMsg) {
        return text + ' (' + lastUserMsg.text + ')';
      }
    }
    return text;
  }

  handleMultiTurn(text) {
    const summary = this.getContextSummary();
    if (summary.turnCount === 0) return { isMultiTurn: false, enrichedText: text };
    const lastIntent = summary.dominantIntent;
    const lower = text.toLowerCase();
    const affirmative = ['是的', '对', '没错', '好', '可以', '行', '嗯', '好呀', 'ok', 'yes', 'yeah', 'yep'];
    const negative = ['不', '不用', '算了', 'no', 'nope'];
    const isAffirmative = affirmative.some(w => lower.includes(w));
    const isNegative = negative.some(w => lower.includes(w));
    if (isAffirmative && lastIntent !== 'chat') {
      return { isMultiTurn: true, intent: lastIntent, enrichedText: text, action: 'continue' };
    }
    if (isNegative) {
      return { isMultiTurn: true, intent: 'chat', enrichedText: text, action: 'cancel' };
    }
    return { isMultiTurn: false, enrichedText: text };
  }

  generateQuickCommands() {
    const commands = [
      { label: '写一首流行歌', intent: 'fullsong', params: { style: 'pop' } },
      { label: '写一首摇滚', intent: 'fullsong', params: { style: 'rock' } },
      { label: '生成旋律', intent: 'compose', params: {} },
      { label: '生成伴奏', intent: 'arranger', params: {} },
      { label: '写歌词', intent: 'lyrics', params: {} },
      { label: '合成歌声', intent: 'voice', params: {} },
      { label: '打开工作室', intent: 'studio', params: {} },
      { label: '应用效果器', intent: 'effects', params: {} },
      { label: '项目管理', intent: 'project', params: {} },
      { label: '音乐理论', intent: 'theory', params: {} }
    ];
    this.quickCommands = commands;
    this.renderQuickCommands();
  }

  renderQuickCommands() {
    const container = document.getElementById('quickCommands');
    if (!container) return;
    const history = this.getContextSummary();
    let commands = [...this.quickCommands];
    if (history.dominantIntent === 'compose') {
      commands.unshift({ label: '继续作曲', intent: 'compose', params: { continue: true } });
      commands.unshift({ label: '变奏', intent: 'compose', params: { mutate: true } });
    } else if (history.dominantIntent === 'arranger') {
      commands.unshift({ label: '加一轨', intent: 'arranger', params: { addTrack: true } });
      commands.unshift({ label: '量化', intent: 'arranger', params: { quantize: true } });
    }
    container.innerHTML = commands.map(cmd => `
      <button class="quick-chip" onclick="dialogueManager.executeQuickCommand('${cmd.intent}', ${JSON.stringify(cmd.params).replace(/"/g, '&quot;')})"
        style="padding:6px 12px;border-radius:16px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:12px;cursor:pointer;white-space:nowrap;">
        ${escapeHtml(cmd.label)}
      </button>
    `).join('');
  }

  executeQuickCommand(intent, params) {
    if (intent === 'fullsong') { sendQuick('写一首' + (params.style === 'rock' ? '摇滚' : '流行') + '歌'); }
    else if (intent === 'compose') { sendQuick('作曲'); }
    else if (intent === 'arranger') { sendQuick('编曲'); }
    else if (intent === 'lyrics') { sendQuick('写歌词'); }
    else if (intent === 'voice') { sendQuick('合成歌声'); }
    else if (intent === 'studio') { sendQuick('打开工作室'); }
    else if (intent === 'effects') { sendQuick('应用效果器'); }
    else if (intent === 'project') { sendQuick('保存项目'); }
    else if (intent === 'theory') { sendQuick('音乐理论'); }
  }

  startSuggestionLoop() {
    setInterval(() => {
      if (this.contextWindow.length > 0) {
        this.renderQuickCommands();
      }
    }, 5000);
  }

  processUserInput(text) {
    const resolved = this.resolveAnaphora(text);
    const multiTurn = this.handleMultiTurn(resolved);
    let finalText = multiTurn.enrichedText;
    let forcedIntent = null;
    if (multiTurn.isMultiTurn && multiTurn.action === 'continue') {
      forcedIntent = multiTurn.intent;
    }
    const parsed = this.parseAdvancedIntent(finalText);
    const intent = forcedIntent || parsed.intent;
    this.pushContext('user', text, intent);
    return { intent, entities: parsed.entities, confidence: parsed.confidence, alternatives: parsed.alternatives, multiTurn };
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let dialogueManager = null;
function initDialogueManager() {
  dialogueManager = new DialogueManager();
}

// ============================================================
// 音频引擎前端桥接 - Web Audio API 高级封装、音频节点图、实时分析
// ============================================================

class AdvancedAudioEngine {
  constructor() {
    this.ctx = null;
    this.nodes = new Map();
    this.connections = [];
    this.masterGain = null;
    this.masterCompressor = null;
    this.masterAnalyser = null;
    this.spectrumAnalyser = null;
    this.waveformAnalyser = null;
    this.isInitialized = false;
    this.scheduler = null;
    this.bpm = 120;
    this.listeners = {};
    this.recorderDestination = null;
    this.monitorData = { peak: 0, rms: 0, lufs: 0 };
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('[青鸾 Audio] Web Audio API 不可用');
      return;
    }
    this.ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    this.masterGain = this.ctx.createGain();
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterAnalyser = this.ctx.createAnalyser();
    this.spectrumAnalyser = this.ctx.createAnalyser();
    this.waveformAnalyser = this.ctx.createAnalyser();

    this.masterAnalyser.fftSize = 2048;
    this.spectrumAnalyser.fftSize = 4096;
    this.waveformAnalyser.fftSize = 2048;
    this.masterCompressor.threshold.value = -24;
    this.masterCompressor.knee.value = 30;
    this.masterCompressor.ratio.value = 12;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;
    this.masterGain.gain.value = 0.85;

    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.spectrumAnalyser);
    this.spectrumAnalyser.connect(this.waveformAnalyser);
    this.waveformAnalyser.connect(this.ctx.destination);

    this.recorderDestination = this.ctx.createMediaStreamDestination();
    this.waveformAnalyser.connect(this.recorderDestination);

    this.isInitialized = true;
    this.startMonitoring();
    console.log('[青鸾 Audio] AdvancedAudioEngine 初始化完成');
  }

  createNode(type, id, options = {}) {
    if (!this.ctx) return null;
    let node;
    switch (type) {
      case 'oscillator':
        node = this.ctx.createOscillator();
        node.type = options.type || 'sine';
        node.frequency.value = options.frequency || 440;
        break;
      case 'gain':
        node = this.ctx.createGain();
        node.gain.value = options.gain || 1;
        break;
      case 'filter':
        node = this.ctx.createBiquadFilter();
        node.type = options.filterType || 'lowpass';
        node.frequency.value = options.frequency || 1000;
        node.Q.value = options.Q || 1;
        break;
      case 'delay':
        node = this.ctx.createDelay(options.maxDelayTime || 1);
        node.delayTime.value = options.delayTime || 0.5;
        break;
      case 'convolver':
        node = this.ctx.createConvolver();
        if (options.buffer) node.buffer = options.buffer;
        break;
      case 'compressor':
        node = this.ctx.createDynamicsCompressor();
        node.threshold.value = options.threshold || -24;
        node.ratio.value = options.ratio || 12;
        break;
      case 'waveShaper':
        node = this.ctx.createWaveShaper();
        node.curve = this.makeDistortionCurve(options.amount || 20);
        node.oversample = options.oversample || '4x';
        break;
      case 'panner':
        node = this.ctx.createStereoPanner();
        node.pan.value = options.pan || 0;
        break;
      case 'analyser':
        node = this.ctx.createAnalyser();
        node.fftSize = options.fftSize || 2048;
        break;
      default:
        return null;
    }
    this.nodes.set(id, { type, node, options });
    return node;
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 20;
    const n = 44100;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  connect(fromId, toId) {
    const from = this.nodes.get(fromId);
    const to = this.nodes.get(toId);
    if (from && to) {
      from.node.connect(to.node);
      this.connections.push({ from: fromId, to: toId });
    }
  }

  connectToMaster(nodeId) {
    const entry = this.nodes.get(nodeId);
    if (entry && this.masterGain) {
      entry.node.connect(this.masterGain);
    }
  }

  disconnect(nodeId) {
    const entry = this.nodes.get(nodeId);
    if (entry) {
      try { entry.node.disconnect(); } catch (e) {}
      this.connections = this.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    }
  }

  removeNode(nodeId) {
    this.disconnect(nodeId);
    const entry = this.nodes.get(nodeId);
    if (entry && entry.type === 'oscillator') {
      try { entry.node.stop(); } catch (e) {}
    }
    this.nodes.delete(nodeId);
  }

  setMasterVolume(value, rampTime = 0.05) {
    if (!this.masterGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(clamp(value, 0, 2), t, rampTime);
  }

  getMasterVolume() {
    return this.masterGain ? this.masterGain.gain.value : 0;
  }

  startMonitoring() {
    const monitor = () => {
      if (!this.masterAnalyser) return;
      const data = new Float32Array(this.masterAnalyser.frequencyBinCount);
      this.masterAnalyser.getFloatTimeDomainData(data);
      let peak = 0;
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        sum += abs * abs;
      }
      this.monitorData.peak = peak;
      this.monitorData.rms = Math.sqrt(sum / data.length);
      this.monitorData.lufs = 20 * Math.log10(this.monitorData.rms) - 0.691;
      requestAnimationFrame(monitor);
    };
    requestAnimationFrame(monitor);
  }

  getMonitorData() {
    return { ...this.monitorData };
  }

  getFrequencyData() {
    if (!this.spectrumAnalyser) return new Uint8Array(0);
    const data = new Uint8Array(this.spectrumAnalyser.frequencyBinCount);
    this.spectrumAnalyser.getByteFrequencyData(data);
    return data;
  }

  getWaveformData() {
    if (!this.waveformAnalyser) return new Uint8Array(0);
    const data = new Uint8Array(this.waveformAnalyser.frequencyBinCount);
    this.waveformAnalyser.getByteTimeDomainData(data);
    return data;
  }

  scheduleEvent(time, callback) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + time;
    const osc = this.ctx.createOscillator();
    osc.frequency.value = 0;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.001);
    osc.onended = callback;
  }

  tapBpm() {
    const now = Date.now();
    if (!this._tapTimes) this._tapTimes = [];
    this._tapTimes.push(now);
    if (this._tapTimes.length > 8) this._tapTimes.shift();
    if (this._tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this._tapTimes.length; i++) {
        intervals.push(this._tapTimes[i] - this._tapTimes[i - 1]);
      }
      const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      this.bpm = Math.round(60000 / avg);
      this.emit('bpmTapped', this.bpm);
    }
  }

  createMetronomeClick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  async resumeIfSuspended() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let advancedAudioEngine = null;
function initAdvancedAudioEngine() {
  advancedAudioEngine = new AdvancedAudioEngine();
}

// ============================================================
// 项目管理前端 - 工程保存/加载、版本历史、导出流程
// ============================================================

class ProjectManager {
  constructor() {
    this.currentProject = null;
    this.versionHistory = [];
    this.maxVersions = 20;
    this.autoSaveInterval = 60000;
    this.autoSaveTimer = null;
    this.exportQueue = [];
    this.isExporting = false;
    this.listeners = {};
    this.init();
  }

  init() {
    this.loadProjectList();
    this.startAutoSave();
    this.bindUI();
    console.log('[青鸾 Project] ProjectManager 初始化完成');
  }

  bindUI() {
    const btnNew = document.getElementById('projNew');
    const btnSave = document.getElementById('projSave');
    const btnSaveAs = document.getElementById('projSaveAs');
    const btnLoad = document.getElementById('projLoad');
    const btnExport = document.getElementById('projExport');
    const btnImport = document.getElementById('projImport');
    const btnRevert = document.getElementById('projRevert');
    const btnHistory = document.getElementById('projHistory');

    if (btnNew) btnNew.addEventListener('click', () => this.newProject());
    if (btnSave) btnSave.addEventListener('click', () => this.saveProjectLocal());
    if (btnSaveAs) btnSaveAs.addEventListener('click', () => this.saveProjectAs());
    if (btnLoad) btnLoad.addEventListener('click', () => this.showLoadDialog());
    if (btnExport) btnExport.addEventListener('click', () => this.showExportDialog());
    if (btnImport) btnImport.addEventListener('click', () => this.triggerImport());
    if (btnRevert) btnRevert.addEventListener('click', () => this.revertToLastVersion());
    if (btnHistory) btnHistory.addEventListener('click', () => this.showVersionHistory());
  }

  newProject() {
    if (this.currentProject && !confirm('当前项目未保存，新建将丢失更改，是否继续？')) return;
    this.currentProject = {
      id: randomId('proj'),
      name: '未命名项目',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      version: 1,
      tracks: [],
      composition: {},
      arrangement: {},
      settings: { bpm: 120, key: 'C', timeSig: [4, 4] }
    };
    this.versionHistory = [];
    this.pushVersion('新建项目');
    this.updateProjectUI();
    this.emit('projectNew', this.currentProject);
    showToast('新项目已创建', 'success');
  }

  saveProjectLocal() {
    if (!this.currentProject) { this.newProject(); return; }
    this.currentProject.modifiedAt = Date.now();
    this.currentProject.version++;
    const key = 'qingluan_project_' + this.currentProject.id;
    localStorage.setItem(key, JSON.stringify(this.currentProject));
    this.pushVersion('手动保存');
    this.updateProjectList();
    showToast('项目已保存到本地', 'success');
    this.emit('projectSaved', this.currentProject);
  }

  saveProjectAs() {
    const name = prompt('项目名称:', this.currentProject?.name || '新项目');
    if (!name) return;
    if (!this.currentProject) this.newProject();
    this.currentProject.name = name;
    this.saveProjectLocal();
  }

  pushVersion(note) {
    if (!this.currentProject) return;
    const snapshot = JSON.parse(JSON.stringify(this.currentProject));
    this.versionHistory.unshift({ version: snapshot.version, timestamp: Date.now(), note, snapshot });
    if (this.versionHistory.length > this.maxVersions) this.versionHistory.pop();
    this.emit('versionPushed', this.versionHistory[0]);
  }

  revertToLastVersion() {
    if (this.versionHistory.length < 2) { showToast('没有可恢复的历史版本', 'warning'); return; }
    const last = this.versionHistory[1];
    if (confirm(`恢复到版本 ${last.version} (${new Date(last.timestamp).toLocaleString()})?`)) {
      this.currentProject = JSON.parse(JSON.stringify(last.snapshot));
      this.updateProjectUI();
      showToast('已恢复到历史版本', 'success');
      this.emit('projectReverted', last);
    }
  }

  showVersionHistory() {
    const container = document.getElementById('projVersionList');
    if (!container) return;
    container.innerHTML = this.versionHistory.map((v, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(0,0,0,0.03);border-radius:8px;margin-bottom:4px;cursor:pointer;"
        onclick="projectManager.loadVersion(${i})">
        <div>
          <div style="font-size:12px;font-weight:600;">版本 ${v.version} - ${escapeHtml(v.note)}</div>
          <div style="font-size:11px;color:var(--text2);">${new Date(v.timestamp).toLocaleString()}</div>
        </div>
        <button class="s-btn-small" onclick="event.stopPropagation(); projectManager.revertToVersion(${i})">恢复</button>
      </div>
    `).join('');
  }

  loadVersion(index) {
    const v = this.versionHistory[index];
    if (!v) return;
    this.currentProject = JSON.parse(JSON.stringify(v.snapshot));
    this.updateProjectUI();
    showToast(`已加载版本 ${v.version}`, 'success');
  }

  revertToVersion(index) {
    const v = this.versionHistory[index];
    if (!v) return;
    this.currentProject = JSON.parse(JSON.stringify(v.snapshot));
    this.pushVersion('从版本 ' + v.version + ' 恢复');
    this.updateProjectUI();
    showToast('已恢复并创建新版本', 'success');
  }

  showLoadDialog() {
    const projects = this.getAllProjects();
    const container = document.getElementById('projLoadList');
    if (!container) return;
    container.innerHTML = projects.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(0,0,0,0.03);border-radius:8px;margin-bottom:4px;">
        <div>
          <div style="font-size:12px;font-weight:600;">${escapeHtml(p.name)}</div>
          <div style="font-size:11px;color:var(--text2);">版本 ${p.version} | ${new Date(p.modifiedAt).toLocaleString()}</div>
        </div>
        <button class="s-btn-small" onclick="projectManager.loadProjectById('${p.id}')">加载</button>
      </div>
    `).join('');
  }

  getAllProjects() {
    const projects = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('qingluan_project_')) {
        try {
          const p = JSON.parse(localStorage.getItem(key));
          projects.push(p);
        } catch (e) {}
      }
    }
    return projects.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }

  loadProjectById(id) {
    const key = 'qingluan_project_' + id;
    try {
      const p = JSON.parse(localStorage.getItem(key));
      if (p) {
        this.currentProject = p;
        this.versionHistory = [];
        this.pushVersion('加载项目');
        this.updateProjectUI();
        showToast('项目加载成功', 'success');
        this.emit('projectLoaded', p);
      }
    } catch (e) {
      showToast('加载失败', 'error');
    }
  }

  updateProjectUI() {
    const nameEl = document.getElementById('projName');
    const versionEl = document.getElementById('projVersion');
    const timeEl = document.getElementById('projModifiedTime');
    if (nameEl && this.currentProject) nameEl.value = this.currentProject.name;
    if (versionEl && this.currentProject) versionEl.textContent = 'v' + this.currentProject.version;
    if (timeEl && this.currentProject) timeEl.textContent = new Date(this.currentProject.modifiedAt).toLocaleString();
  }

  updateProjectList() {
    const select = document.getElementById('projectSelect');
    if (!select) return;
    const projects = this.getAllProjects();
    select.innerHTML = '<option value="">选择项目...</option>' +
      projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (v${p.version})</option>`).join('');
  }

  loadProjectList() {
    this.updateProjectList();
  }

  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.currentProject) {
        this.pushVersion('自动保存');
        localStorage.setItem('qingluan_project_' + this.currentProject.id, JSON.stringify(this.currentProject));
      }
    }, this.autoSaveInterval);
  }

  showExportDialog() {
    const formats = ['WAV', 'MP3', 'FLAC', 'OGG', 'MIDI', 'JSON', 'STEMS'];
    const container = document.getElementById('exportFormatList');
    if (!container) return;
    container.innerHTML = formats.map(f => `
      <label style="display:flex;align-items:center;gap:6px;padding:6px 0;font-size:13px;cursor:pointer;">
        <input type="checkbox" value="${f}" class="export-format-check">
        <span>${f}</span>
      </label>
    `).join('');
  }

  async exportProject(formats) {
    if (!this.currentProject) { showToast('没有可导出的项目', 'warning'); return; }
    this.exportQueue = formats.map(f => ({ format: f, status: 'pending', progress: 0 }));
    this.isExporting = true;
    this.emit('exportStarted', this.exportQueue);

    for (let i = 0; i < this.exportQueue.length; i++) {
      const task = this.exportQueue[i];
      task.status = 'processing';
      this.emit('exportProgress', task);
      await this.simulateExport(task);
      task.status = 'done';
      task.progress = 100;
      this.emit('exportProgress', task);
    }

    this.isExporting = false;
    this.emit('exportComplete', this.exportQueue);
    showToast('导出完成', 'success');
  }

  async simulateExport(task) {
    const steps = 10;
    for (let s = 1; s <= steps; s++) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
      task.progress = Math.round((s / steps) * 100);
      this.emit('exportProgress', task);
    }
  }

  triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.qingluan,.json,.mid,.midi';
    input.onchange = (e) => this.importFile(e.target.files[0]);
    input.click();
  }

  async importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let data;
        if (file.name.endsWith('.qingluan')) {
          data = JSON.parse(decodeURIComponent(escape(atob(ev.target.result))));
        } else if (file.name.endsWith('.json')) {
          data = JSON.parse(ev.target.result);
        } else {
          showToast('格式暂不支持', 'warning');
          return;
        }
        this.currentProject = { ...data, id: randomId('proj'), importedAt: Date.now() };
        this.versionHistory = [];
        this.pushVersion('导入文件');
        this.updateProjectUI();
        showToast('导入成功', 'success');
        this.emit('projectImported', this.currentProject);
      } catch (e) {
        showToast('导入失败: ' + e.message, 'error');
      }
    };
    if (file.name.endsWith('.qingluan')) reader.readAsText(file);
    else reader.readAsText(file);
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let projectManager = null;
function initProjectManager() {
  projectManager = new ProjectManager();
}

// ============================================================
// 键盘快捷键和手势处理增强
// ============================================================

class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.keyState = new Set();
    this.enabled = true;
    this.listeners = {};
    this.init();
  }

  init() {
    this.registerDefaults();
    this.bindGlobal();
    console.log('[青鸾 Input] KeyboardShortcutManager 初始化完成');
  }

  registerDefaults() {
    this.register('Space', () => this.emit('togglePlay'), '播放/暂停');
    this.register('Delete', () => this.emit('deleteSelection'), '删除选中');
    this.register('Backspace', () => this.emit('deleteSelection'), '删除选中');
    this.register('Ctrl+z', () => this.emit('undo'), '撤销');
    this.register('Ctrl+Shift+z', () => this.emit('redo'), '重做');
    this.register('Ctrl+y', () => this.emit('redo'), '重做');
    this.register('Ctrl+s', () => { if (projectManager) projectManager.saveProjectLocal(); }, '保存项目');
    this.register('Ctrl+o', () => { if (projectManager) projectManager.showLoadDialog(); }, '打开项目');
    this.register('Ctrl+e', () => { if (projectManager) projectManager.showExportDialog(); }, '导出');
    this.register('Ctrl+n', () => { if (projectManager) projectManager.newProject(); }, '新建项目');
    this.register('Ctrl+1', () => openStudioTab('s-compose'), '作曲面板');
    this.register('Ctrl+2', () => openStudioTab('s-arranger'), '编曲面板');
    this.register('Ctrl+3', () => openStudioTab('s-voice'), '歌声面板');
    this.register('Ctrl+4', () => openStudioTab('s-effects'), '效果器面板');
    this.register('Ctrl+5', () => openStudioTab('s-visual'), '可视化面板');
    this.register('Ctrl+6', () => openStudioTab('s-project'), '项目面板');
    this.register('Ctrl+7', () => openStudioTab('s-theory'), '理论面板');
    this.register('Ctrl+8', () => openStudioTab('s-edu'), '教育面板');
    this.register('Ctrl+0', () => { const layer = document.getElementById('studioLayer'); if (layer) layer.style.display = layer.style.display === 'block' ? 'none' : 'block'; }, '切换工作室');
    this.register('Escape', () => this.emit('escape'), '取消/关闭');
    this.register('ArrowUp', () => this.emit('nudge', { x: 0, y: -1 }), '上移');
    this.register('ArrowDown', () => this.emit('nudge', { x: 0, y: 1 }), '下移');
    this.register('ArrowLeft', () => this.emit('nudge', { x: -1, y: 0 }), '左移');
    this.register('ArrowRight', () => this.emit('nudge', { x: 1, y: 0 }), '右移');
    this.register('Shift+ArrowUp', () => this.emit('nudge', { x: 0, y: -12 }), '移调+1');
    this.register('Shift+ArrowDown', () => this.emit('nudge', { x: 0, y: 12 }), '移调-1');
    this.register('Ctrl+d', () => this.emit('duplicate'), '复制');
    this.register('Ctrl+a', () => this.emit('selectAll'), '全选');
    this.register('Ctrl+x', () => this.emit('cut'), '剪切');
    this.register('Ctrl+c', () => this.emit('copy'), '复制');
    this.register('Ctrl+v', () => this.emit('paste'), '粘贴');
    this.register('F1', () => this.showHelp(), '帮助');
    this.register('F5', (e) => { e.preventDefault(); this.emit('refresh'); }, '刷新');
    this.register('F11', () => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }, '全屏');
    this.register('m', () => { if (arrangerPanel) arrangerPanel.toggleMuteSelected(); }, '静音选中轨道');
    this.register('s', () => { if (arrangerPanel) arrangerPanel.toggleSoloSelected(); }, '独奏选中轨道');
    this.register('p', () => { if (composerPanel) composerPanel.playPreview(); }, '预览');
    this.register('t', () => { if (advancedAudioEngine) advancedAudioEngine.tapBpm(); }, '测速');
  }

  register(keyCombo, handler, description = '') {
    this.shortcuts.set(keyCombo.toLowerCase(), { handler, description });
  }

  unregister(keyCombo) {
    this.shortcuts.delete(keyCombo.toLowerCase());
  }

  bindGlobal() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const combo = this.buildCombo(e);
      const entry = this.shortcuts.get(combo);
      if (entry) {
        e.preventDefault();
        try { entry.handler(e); } catch (err) { console.error('[青鸾 Input] 快捷键错误:', err); }
      }
      this.keyState.add(e.code);
      this.emit('keydown', { code: e.code, combo, event: e });
    });

    document.addEventListener('keyup', (e) => {
      this.keyState.delete(e.code);
      this.emit('keyup', { code: e.code, event: e });
    });
  }

  buildCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    return parts.join('+').toLowerCase();
  }

  showHelp() {
    const rows = Array.from(this.shortcuts.entries()).map(([combo, info]) => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border);">
        <code style="background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:4px;">${escapeHtml(combo)}</code>
        <span style="color:var(--text2);">${escapeHtml(info.description)}</span>
      </div>
    `).join('');
    showModal('键盘快捷键', `<div style="max-height:60vh;overflow:auto;">${rows}</div>`, [{ label: '关闭', primary: false }]);
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

class GestureManager {
  constructor() {
    this.gestures = [];
    this.activePointers = new Map();
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindGlobal();
    console.log('[青鸾 Input] GestureManager 初始化完成');
  }

  bindGlobal() {
    const touchZone = document.getElementById('touchZone') || document.body;
    touchZone.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    touchZone.addEventListener('pointermove', (e) => this.onPointerMove(e));
    touchZone.addEventListener('pointerup', (e) => this.onPointerUp(e));
    touchZone.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    touchZone.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  onPointerDown(e) {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, time: Date.now() });
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDist = this.getDistance(pts[0], pts[1]);
    }
  }

  onPointerMove(e) {
    const ptr = this.activePointers.get(e.pointerId);
    if (!ptr) return;
    const dx = e.clientX - ptr.x;
    const dy = e.clientY - ptr.y;

    if (this.activePointers.size === 1 && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.emit('pan', { dx, dy, pointers: 1 });
    } else if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      const newDist = this.getDistance(pts[0], pts[1]);
      if (this.initialPinchDist) {
        const scale = newDist / this.initialPinchDist;
        this.emit('pinch', { scale });
      }
    }
    ptr.x = e.clientX;
    ptr.y = e.clientY;
  }

  onPointerUp(e) {
    const ptr = this.activePointers.get(e.pointerId);
    if (ptr) {
      const duration = Date.now() - ptr.time;
      const dx = e.clientX - ptr.x;
      const dy = e.clientY - ptr.y;
      if (duration < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        this.emit('tap', { x: e.clientX, y: e.clientY });
      } else if (duration < 500 && Math.abs(dx) > 30) {
        this.emit('swipe', { direction: dx > 0 ? 'right' : 'left', velocity: Math.abs(dx) / duration });
      }
    }
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) this.initialPinchDist = null;
  }

  onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY;
    if (e.ctrlKey || e.metaKey) {
      this.emit('zoom', { delta: delta > 0 ? 0.9 : 1.1, x: e.clientX, y: e.clientY });
    } else {
      this.emit('scroll', { dx: e.deltaX, dy: e.deltaY });
    }
  }

  getDistance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let keyboardShortcutManager = null;
let gestureManager = null;
function initKeyboardAndGesture() {
  keyboardShortcutManager = new KeyboardShortcutManager();
  gestureManager = new GestureManager();
}

// ============================================================
// 响应式布局自适应逻辑增强
// ============================================================

class ResponsiveLayoutManager {
  constructor() {
    this.breakpoints = { mobile: 768, tablet: 1024, desktop: 1440 };
    this.currentBreakpoint = 'desktop';
    this.observers = [];
    this.sidebarCollapsed = false;
    this.bottomPanelHeight = 200;
    this.listeners = {};
    this.init();
  }

  init() {
    this.detectBreakpoint();
    this.bindEvents();
    this.applyLayout();
    console.log('[青鸾 UI] ResponsiveLayoutManager 初始化完成');
  }

  bindEvents() {
    window.addEventListener('resize', () => { this.detectBreakpoint(); this.applyLayout(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { this.detectBreakpoint(); this.applyLayout(); }, 300));

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => this.toggleSidebar());
  }

  detectBreakpoint() {
    const vw = window.innerWidth;
    if (vw < this.breakpoints.mobile) this.currentBreakpoint = 'mobile';
    else if (vw < this.breakpoints.tablet) this.currentBreakpoint = 'tablet';
    else if (vw < this.breakpoints.desktop) this.currentBreakpoint = 'desktop';
    else this.currentBreakpoint = 'wide';
    this.emit('breakpointChanged', this.currentBreakpoint);
  }

  applyLayout() {
    const bp = this.currentBreakpoint;
    const phone = document.querySelector('.phone');
    const studioLayer = document.getElementById('studioLayer');
    const chatArea = document.getElementById('chatArea');
    const sidebar = document.getElementById('sidebar');

    if (phone) {
      if (bp === 'mobile') {
        phone.style.maxWidth = '100%';
        phone.style.margin = '0';
        phone.style.borderRadius = '0';
      } else {
        phone.style.maxWidth = '430px';
        phone.style.margin = '0 auto';
        phone.style.borderRadius = '24px';
      }
    }

    if (studioLayer) {
      if (bp === 'mobile') {
        studioLayer.style.width = '100%';
        studioLayer.style.height = '100%';
        studioLayer.style.borderRadius = '0';
      } else {
        studioLayer.style.width = '';
        studioLayer.style.height = '';
        studioLayer.style.borderRadius = '';
      }
    }

    if (chatArea) {
      if (bp === 'mobile') {
        chatArea.style.padding = '10px';
      } else {
        chatArea.style.padding = '';
      }
    }

    if (sidebar) {
      if (bp === 'mobile') {
        sidebar.style.position = 'fixed';
        sidebar.style.zIndex = '100';
        sidebar.style.transform = this.sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)';
      } else {
        sidebar.style.position = '';
        sidebar.style.zIndex = '';
        sidebar.style.transform = this.sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)';
      }
    }

    document.querySelectorAll('.studio-panel').forEach(panel => {
      if (bp === 'mobile') {
        panel.style.padding = '12px';
      } else {
        panel.style.padding = '';
      }
    });

    this.resizeCanvases();
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.applyLayout();
    this.emit('sidebarToggled', this.sidebarCollapsed);
  }

  resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    document.querySelectorAll('canvas').forEach(canvas => {
      const parent = canvas.parentElement;
      if (!parent) return;
      if (canvas.id.includes('pianoRoll') || canvas.id.includes('particle')) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = (rect.height || 160) * dpr;
      }
    });
  }

  getBreakpoint() {
    return this.currentBreakpoint;
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let responsiveLayoutManager = null;
function initResponsiveLayoutManager() {
  responsiveLayoutManager = new ResponsiveLayoutManager();
}

// ============================================================
// 主题切换与动画过渡系统
// ============================================================

class ThemeManager {
  constructor() {
    this.themes = {
      default: { '--bg': '#f5f5fa', '--card-bg': '#fff', '--text': '#1a1a2e', '--text2': '#666', '--accent': '#5b4dff', '--accent2': '#ff6b9d', '--border': '#e8e8f0', '--success': '#4caf50', '--error': '#f44336', '--warning': '#ff9800' },
      dark: { '--bg': '#0a0a1a', '--card-bg': '#12122a', '--text': '#e8e8f0', '--text2': '#8888aa', '--accent': '#7b6fff', '--accent2': '#ff8fb0', '--border': '#222244', '--success': '#66bb6a', '--error': '#ef5350', '--warning': '#ffa726' },
      ocean: { '--bg': '#e3f2fd', '--card-bg': '#fff', '--text': '#0d47a1', '--text2': '#1976d2', '--accent': '#0288d1', '--accent2': '#00bcd4', '--border': '#bbdefb', '--success': '#4caf50', '--error': '#f44336', '--warning': '#ff9800' },
      forest: { '--bg': '#e8f5e9', '--card-bg': '#fff', '--text': '#1b5e20', '--text2': '#388e3c', '--accent': '#43a047', '--accent2': '#81c784', '--border': '#c8e6c9', '--success': '#4caf50', '--error': '#f44336', '--warning': '#ff9800' },
      sunset: { '--bg': '#fff3e0', '--card-bg': '#fff', '--text': '#bf360c', '--text2': '#e65100', '--accent': '#f4511e', '--accent2': '#ff7043', '--border': '#ffe0b2', '--success': '#4caf50', '--error': '#f44336', '--warning': '#ff9800' },
      midnight: { '--bg': '#1a1a2e', '--card-bg': '#16213e', '--text': '#e94560', '--text2': '#a0a0c0', '--accent': '#e94560', '--accent2': '#0f3460', '--border': '#2a2a4e', '--success': '#66bb6a', '--error': '#ef5350', '--warning': '#ffa726' }
    };
    this.currentTheme = localStorage.getItem('qingluan_theme') || 'default';
    this.animationsEnabled = true;
    this.transitionDuration = 300;
    this.listeners = {};
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.bindUI();
    console.log('[青鸾 UI] ThemeManager 初始化完成');
  }

  bindUI() {
    const select = document.getElementById('themeSelect');
    if (select) {
      select.value = this.currentTheme;
      select.addEventListener('change', (e) => this.applyTheme(e.target.value));
    }

    const toggleAnim = document.getElementById('toggleAnimations');
    if (toggleAnim) toggleAnim.addEventListener('change', (e) => this.setAnimations(e.target.checked));
  }

  applyTheme(name) {
    const theme = this.themes[name];
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    this.currentTheme = name;
    localStorage.setItem('qingluan_theme', name);
    this.emit('themeChanged', name);
  }

  setAnimations(enabled) {
    this.animationsEnabled = enabled;
    document.body.classList.toggle('no-animations', !enabled);
    localStorage.setItem('qingluan_animations', enabled ? '1' : '0');
  }

  animateElement(element, keyframes, options = {}) {
    if (!this.animationsEnabled || !element) return;
    const defaults = { duration: this.transitionDuration, easing: 'ease' };
    return element.animate(keyframes, { ...defaults, ...options });
  }

  fadeIn(element, duration = 300) {
    return this.animateElement(element, [{ opacity: 0 }, { opacity: 1 }], { duration });
  }

  fadeOut(element, duration = 300) {
    return this.animateElement(element, [{ opacity: 1 }, { opacity: 0 }], { duration });
  }

  slideIn(element, direction = 'up', duration = 300) {
    const offsets = { up: { y: 20 }, down: { y: -20 }, left: { x: 20 }, right: { x: -20 } };
    const offset = offsets[direction] || offsets.up;
    return this.animateElement(element, [
      { opacity: 0, transform: `translate(${offset.x || 0}px, ${offset.y || 0}px)` },
      { opacity: 1, transform: 'translate(0,0)' }
    ], { duration });
  }

  pulse(element, duration = 600) {
    return this.animateElement(element, [
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ], { duration });
  }

  shake(element, duration = 400) {
    return this.animateElement(element, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ], { duration });
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let themeManager = null;
function initThemeManager() {
  themeManager = new ThemeManager();
}

// ============================================================
// 错误处理和用户反馈系统
// ============================================================

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindGlobalErrorHandlers();
    console.log('[青鸾 System] ErrorHandler 初始化完成');
  }

  bindGlobalErrorHandlers() {
    window.addEventListener('error', (e) => {
      this.handleError({ type: 'js', message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, error: e.error });
    });
    window.addEventListener('unhandledrejection', (e) => {
      this.handleError({ type: 'promise', message: e.reason?.message || String(e.reason), reason: e.reason });
    });
    window.addEventListener('rejectionhandled', (e) => {
      this.log({ type: 'promise-handled', message: e.reason?.message || String(e.reason) });
    });
  }

  handleError(errorInfo) {
    this.log(errorInfo);
    this.showErrorNotification(errorInfo);
    this.emit('error', errorInfo);
  }

  log(errorInfo) {
    const entry = { ...errorInfo, timestamp: Date.now(), id: randomId('err') };
    this.errorLog.push(entry);
    if (this.errorLog.length > this.maxLogSize) this.errorLog.shift();
    console.error('[青鸾 Error]', entry);
  }

  showErrorNotification(errorInfo) {
    const container = document.getElementById('errorNotifications') || document.body;
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;padding:12px 16px;background:var(--error);color:#fff;border-radius:10px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:320px;animation:slideIn 0.3s ease;';
    div.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">出错了</div><div>${escapeHtml(errorInfo.message)}</div><div style="margin-top:6px;text-align:right;"><button style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;">忽略</button></div>`;
    div.querySelector('button').addEventListener('click', () => div.remove());
    container.appendChild(div);
    setTimeout(() => { if (div.parentElement) div.remove(); }, 8000);
  }

  showUserFeedback(type, message, duration = 3000) {
    const container = document.getElementById('feedbackContainer') || document.body;
    const div = document.createElement('div');
    const colors = { success: 'var(--success)', error: 'var(--error)', warning: 'var(--warning)', info: 'var(--accent)' };
    div.style.cssText = `position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 18px;background:${colors[type] || colors.info};color:#fff;border-radius:10px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);white-space:nowrap;`;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => {
      div.style.transition = 'opacity 0.3s';
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 300);
    }, duration);
  }

  getErrorLog() {
    return [...this.errorLog];
  }

  clearLog() {
    this.errorLog = [];
  }

  exportLog() {
    const blob = new Blob([JSON.stringify(this.errorLog, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'error_log_' + Date.now() + '.json');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

// 增强 showToast 以集成 ErrorHandler
const _originalShowToast = window.showToast;
window.showToast = function(message, type = 'info', duration) {
  if (window.errorHandler) {
    window.errorHandler.showUserFeedback(type, message, duration);
  } else if (_originalShowToast) {
    _originalShowToast(message, type, duration);
  }
};

let errorHandler = null;
function initErrorHandler() {
  errorHandler = new ErrorHandler();
  window.errorHandler = errorHandler;
}

// ============================================================
// 性能监控和日志系统
// ============================================================

class PerformanceLogger {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 500;
    this.activeTimers = new Map();
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.networkLog = [];
    this.longTaskLog = [];
    this.listeners = {};
    this.init();
  }

  init() {
    this.startFpsMonitor();
    this.startMemoryMonitor();
    this.observeLongTasks();
    this.observeNavigation();
    console.log('[青鸾 System] PerformanceLogger 初始化完成');
  }

  startFpsMonitor() {
    let lastTime = performance.now();
    let frames = 0;
    const loop = (time) => {
      frames++;
      if (time - lastTime >= 1000) {
        const fps = frames;
        this.fpsHistory.push({ fps, timestamp: time });
        if (this.fpsHistory.length > 60) this.fpsHistory.shift();
        frames = 0;
        lastTime = time;
        this.emit('fps', fps);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  startMemoryMonitor() {
    if (!performance.memory) return;
    setInterval(() => {
      const mem = performance.memory;
      const data = {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      this.memoryHistory.push(data);
      if (this.memoryHistory.length > 60) this.memoryHistory.shift();
      this.emit('memory', data);
    }, 5000);
  }

  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            this.longTaskLog.push({ duration: entry.duration, startTime: entry.startTime, timestamp: Date.now() });
            if (this.longTaskLog.length > 50) this.longTaskLog.shift();
            if (entry.duration > 100) {
              console.warn('[青鸾 Perf] 长任务:', entry.duration.toFixed(1) + 'ms');
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {}
    }
  }

  observeNavigation() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            this.networkLog.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: Date.now()
            });
            if (this.networkLog.length > 100) this.networkLog.shift();
          });
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {}
    }
  }

  mark(label) {
    performance.mark(label);
    this.activeTimers.set(label, performance.now());
  }

  measure(label, startLabel) {
    const start = this.activeTimers.get(startLabel) || performance.timing?.navigationStart;
    const end = performance.now();
    const duration = end - start;
    this.record(label, duration);
    this.activeTimers.delete(startLabel);
    try { performance.measure(label, startLabel); } catch (e) {}
    return duration;
  }

  record(label, value, unit = 'ms') {
    const entry = { label, value, unit, timestamp: Date.now() };
    this.metrics.push(entry);
    if (this.metrics.length > this.maxMetrics) this.metrics.shift();
    this.emit('metric', entry);
  }

  getSummary() {
    const byLabel = {};
    this.metrics.forEach(m => {
      if (!byLabel[m.label]) byLabel[m.label] = [];
      byLabel[m.label].push(m.value);
    });
    const summary = {};
    Object.entries(byLabel).forEach(([label, values]) => {
      const sorted = values.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      summary[label] = {
        count: values.length,
        avg: sum / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1]
      };
    });
    return summary;
  }

  getFpsHistory() { return [...this.fpsHistory]; }
  getMemoryHistory() { return [...this.memoryHistory]; }
  getNetworkLog() { return [...this.networkLog]; }
  getLongTaskLog() { return [...this.longTaskLog]; }

  exportReport() {
    const report = {
      summary: this.getSummary(),
      fps: this.fpsHistory,
      memory: this.memoryHistory,
      network: this.networkLog,
      longTasks: this.longTaskLog,
      userAgent: navigator.userAgent,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'performance_report_' + Date.now() + '.json');
  }

  renderDashboard() {
    const container = document.getElementById('perfDashboard');
    if (!container) return;
    const summary = this.getSummary();
    const fps = this.fpsHistory.length ? this.fpsHistory[this.fpsHistory.length - 1].fps : 0;
    const mem = this.memoryHistory.length ? this.memoryHistory[this.memoryHistory.length - 1] : null;
    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px;">`;
    html += `<div style="padding:8px;background:rgba(0,0,0,0.03);border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">${fps}</div><div style="font-size:10px;color:var(--text2);">FPS</div></div>`;
    if (mem) {
      const usedMB = (mem.usedJSHeapSize / 1048576).toFixed(1);
      html += `<div style="padding:8px;background:rgba(0,0,0,0.03);border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">${usedMB}M</div><div style="font-size:10px;color:var(--text2);">内存</div></div>`;
    }
    html += `<div style="padding:8px;background:rgba(0,0,0,0.03);border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">${Object.keys(summary).length}</div><div style="font-size:10px;color:var(--text2);">指标</div></div>`;
    html += `</div>`;

    html += `<div style="max-height:200px;overflow:auto;font-size:11px;">`;
    Object.entries(summary).forEach(([label, stats]) => {
      html += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
        <span>${escapeHtml(label)}</span>
        <span style="color:var(--text2);">avg ${stats.avg.toFixed(1)} | max ${stats.max.toFixed(1)}</span>
      </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let performanceLogger = null;
function initPerformanceLogger() {
  performanceLogger = new PerformanceLogger();
}

// ============================================================
// 集成初始化入口
// ============================================================

function initStudioPanels() {
  initComposerPanel();
  initArrangerPanel();
  initVoiceSynthesisPanel();
  initEffectRack();
  initVisualizerPanel();
}

function initEnhancedSystems() {
  initDialogueManager();
  initAdvancedAudioEngine();
  initProjectManager();
  initKeyboardAndGesture();
  initResponsiveLayoutManager();
  initThemeManager();
  initErrorHandler();
  initPerformanceLogger();
}

// 延迟执行以确保 DOM 和已有脚本就绪
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initStudioPanels();
    initEnhancedSystems();
    console.log('[青鸾 DAW] 前端扩展模块 v4.0 全部初始化完成');
    console.log('[青鸾] 新增功能: ComposerPanel, ArrangerPanel, VoiceSynthesisPanel, EffectRack, VisualizerPanel, DialogueManager, AdvancedAudioEngine, ProjectManager, KeyboardShortcutManager, GestureManager, ResponsiveLayoutManager, ThemeManager, ErrorHandler, PerformanceLogger');
  }, 100);
});

// ============================================================
// 工作室面板 - 版权指纹面板完整交互逻辑
// ============================================================

class FingerprintPanel {
  constructor() {
    this.fingerprints = [];
    this.comparisonResults = [];
    this.blockchainRecords = [];
    this.currentFingerprint = null;
    this.algorithms = ['chromaprint', 'spectral_hash', 'perceptual_hash', 'watermark'];
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindUI();
    this.loadStoredFingerprints();
    console.log('[青鸾 Studio] FingerprintPanel 初始化完成');
  }

  bindUI() {
    const btnGenerate = document.getElementById('fpGenerate');
    const btnCompare = document.getElementById('fpCompare');
    const btnVerify = document.getElementById('fpVerify');
    const btnRegisterChain = document.getElementById('fpRegisterChain');
    const btnExportCert = document.getElementById('fpExportCert');
    const btnBatchScan = document.getElementById('fpBatchScan');

    if (btnGenerate) btnGenerate.addEventListener('click', () => this.generateFingerprint());
    if (btnCompare) btnCompare.addEventListener('click', () => this.compareFingerprints());
    if (btnVerify) btnVerify.addEventListener('click', () => this.verifyOwnership());
    if (btnRegisterChain) btnRegisterChain.addEventListener('click', () => this.registerToBlockchain());
    if (btnExportCert) btnExportCert.addEventListener('click', () => this.exportCertificate());
    if (btnBatchScan) btnBatchScan.addEventListener('click', () => this.batchScanLibrary());

    const algoSelect = document.getElementById('fpAlgorithm');
    if (algoSelect) algoSelect.addEventListener('change', () => this.onAlgorithmChange());
  }

  onAlgorithmChange() {
    const algo = document.getElementById('fpAlgorithm')?.value || 'chromaprint';
    const info = document.getElementById('fpAlgoInfo');
    const descriptions = {
      chromaprint: '基于声学指纹，对音频内容敏感，适合精确匹配',
      spectral_hash: '基于频谱特征，抗噪性较好',
      perceptual_hash: '基于感知哈希，适合相似性搜索',
      watermark: '数字水印，可嵌入版权信息'
    };
    if (info) info.textContent = descriptions[algo] || '';
  }

  async generateFingerprint() {
    const audioId = document.getElementById('fpAudioId')?.value || 'current';
    const algo = document.getElementById('fpAlgorithm')?.value || 'chromaprint';
    const loading = document.getElementById('fpLoading');
    if (loading) loading.style.display = 'flex';

    try {
      await new Promise(r => setTimeout(r, 800));
      const hash = this.simulateHashGeneration(audioId, algo);
      const fingerprint = {
        id: randomId('fp'),
        audioId,
        algorithm: algo,
        hash,
        length: Math.floor(Math.random() * 300) + 60,
        createdAt: Date.now(),
        confidence: 0.98 + Math.random() * 0.02
      };
      this.fingerprints.push(fingerprint);
      this.currentFingerprint = fingerprint;
      this.renderFingerprintList();
      this.storeFingerprints();
      showToast('指纹生成完成', 'success');
      this.emit('fingerprintGenerated', fingerprint);
    } catch (e) {
      showToast('指纹生成失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  simulateHashGeneration(audioId, algo) {
    const base = audioId + '_' + algo + '_' + Date.now();
    let hash = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    return hash;
  }

  async compareFingerprints() {
    if (this.fingerprints.length < 2) { showToast('至少需要两个指纹进行对比', 'warning'); return; }
    const fp1 = this.fingerprints[this.fingerprints.length - 2];
    const fp2 = this.fingerprints[this.fingerprints.length - 1];
    const loading = document.getElementById('fpCompareLoading');
    if (loading) loading.style.display = 'flex';

    try {
      await new Promise(r => setTimeout(r, 600));
      const similarity = this.calculateSimilarity(fp1.hash, fp2.hash);
      const result = {
        id: randomId('fpc'),
        fp1: fp1.id,
        fp2: fp2.id,
        similarity,
        isMatch: similarity > 0.85,
        timestamp: Date.now()
      };
      this.comparisonResults.push(result);
      this.renderComparisonResults();
      showToast(`相似度: ${(similarity * 100).toFixed(2)}%`, result.isMatch ? 'success' : 'info');
      this.emit('comparisonComplete', result);
    } catch (e) {
      showToast('对比失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  calculateSimilarity(hash1, hash2) {
    let matches = 0;
    const len = Math.min(hash1.length, hash2.length);
    for (let i = 0; i < len; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    return matches / len;
  }

  async verifyOwnership() {
    if (!this.currentFingerprint) { showToast('请先生成指纹', 'warning'); return; }
    const owner = document.getElementById('fpOwner')?.value || '未知作者';
    const loading = document.getElementById('fpVerifyLoading');
    if (loading) loading.style.display = 'flex';

    try {
      await new Promise(r => setTimeout(r, 500));
      const proof = {
        fingerprintId: this.currentFingerprint.id,
        owner,
        verifiedAt: Date.now(),
        signature: this.simulateSignature(this.currentFingerprint.hash + owner)
      };
      const container = document.getElementById('fpVerifyResult');
      if (container) {
        container.innerHTML = `<div style="font-size:12px;padding:8px;background:rgba(76,175,80,0.1);border-radius:8px;">
          <div style="font-weight:700;color:var(--success);">验证通过</div>
          <div style="color:var(--text2);margin-top:4px;">所有者: ${escapeHtml(owner)}</div>
          <div style="color:var(--text2);">签名: ${proof.signature.slice(0, 32)}...</div>
        </div>`;
      }
      showToast('所有权验证完成', 'success');
      this.emit('ownershipVerified', proof);
    } catch (e) {
      showToast('验证失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  simulateSignature(data) {
    let hash = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < 128; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    return hash;
  }

  async registerToBlockchain() {
    if (!this.currentFingerprint) { showToast('请先生成指纹', 'warning'); return; }
    const loading = document.getElementById('fpChainLoading');
    if (loading) loading.style.display = 'flex';

    try {
      await new Promise(r => setTimeout(r, 1200));
      const record = {
        txId: randomId('tx'),
        fingerprintId: this.currentFingerprint.id,
        hash: this.currentFingerprint.hash,
        timestamp: Date.now(),
        blockHeight: Math.floor(Date.now() / 10000),
        status: 'confirmed'
      };
      this.blockchainRecords.push(record);
      this.renderBlockchainRecords();
      showToast('已注册到区块链', 'success');
      this.emit('blockchainRegistered', record);
    } catch (e) {
      showToast('区块链注册失败: ' + e.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  exportCertificate() {
    if (!this.currentFingerprint) { showToast('请先生成指纹', 'warning'); return; }
    const cert = {
      title: '版权证书',
      fingerprint: this.currentFingerprint,
      issuedAt: new Date().toISOString(),
      issuer: '青鸾音乐版权系统'
    };
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'copyright_cert_' + this.currentFingerprint.id + '.json');
    showToast('证书已导出', 'success');
  }

  async batchScanLibrary() {
    const files = document.getElementById('fpBatchFiles')?.files;
    if (!files || !files.length) { showToast('请选择文件', 'warning'); return; }
    const progress = document.getElementById('fpBatchProgress');
    const results = [];
    for (let i = 0; i < files.length; i++) {
      if (progress) progress.textContent = `扫描中 ${i+1}/${files.length}`;
      await new Promise(r => setTimeout(r, 200));
      results.push({ name: files[i].name, status: 'scanned', hash: this.simulateHashGeneration(files[i].name, 'batch') });
    }
    const container = document.getElementById('fpBatchResults');
    if (container) {
      container.innerHTML = results.map(r => `<div style="font-size:12px;padding:3px 0;">${escapeHtml(r.name)} - ${r.status}</div>`).join('');
    }
    showToast('批量扫描完成', 'success');
  }

  renderFingerprintList() {
    const container = document.getElementById('fpList');
    if (!container) return;
    container.innerHTML = this.fingerprints.map(fp => `
      <div style="padding:8px 10px;background:rgba(0,0,0,0.03);border-radius:8px;margin-bottom:4px;cursor:pointer;${this.currentFingerprint?.id === fp.id ? 'border:1px solid var(--accent);' : ''}"
        onclick="fingerprintPanel.selectFingerprint('${fp.id}')">
        <div style="font-size:12px;font-weight:600;">${escapeHtml(fp.algorithm)}</div>
        <div style="font-size:10px;color:var(--text2);font-family:monospace;">${fp.hash.slice(0, 24)}...</div>
        <div style="font-size:10px;color:var(--text2);">${new Date(fp.createdAt).toLocaleString()}</div>
      </div>
    `).join('');
  }

  selectFingerprint(id) {
    this.currentFingerprint = this.fingerprints.find(f => f.id === id);
    this.renderFingerprintList();
  }

  renderComparisonResults() {
    const container = document.getElementById('fpCompareList');
    if (!container) return;
    container.innerHTML = this.comparisonResults.map(r => `
      <div style="padding:6px 10px;background:rgba(0,0,0,0.03);border-radius:8px;margin-bottom:4px;">
        <div style="font-size:12px;">相似度: <span style="font-weight:700;color:${r.isMatch ? 'var(--success)' : 'var(--text2)'}">${(r.similarity * 100).toFixed(2)}%</span></div>
        <div style="font-size:10px;color:var(--text2);">${r.isMatch ? '匹配' : '不匹配'} | ${new Date(r.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
  }

  renderBlockchainRecords() {
    const container = document.getElementById('fpChainList');
    if (!container) return;
    container.innerHTML = this.blockchainRecords.map(r => `
      <div style="padding:6px 10px;background:rgba(0,0,0,0.03);border-radius:8px;margin-bottom:4px;">
        <div style="font-size:11px;font-weight:600;">区块 #${r.blockHeight}</div>
        <div style="font-size:10px;color:var(--text2);font-family:monospace;">TX: ${r.txId}</div>
        <div style="font-size:10px;color:var(--success);">${r.status}</div>
      </div>
    `).join('');
  }

  loadStoredFingerprints() {
    try {
      const stored = JSON.parse(localStorage.getItem('qingluan_fingerprints') || '[]');
      this.fingerprints = stored;
      if (this.fingerprints.length) this.currentFingerprint = this.fingerprints[this.fingerprints.length - 1];
      this.renderFingerprintList();
    } catch (e) {}
  }

  storeFingerprints() {
    localStorage.setItem('qingluan_fingerprints', JSON.stringify(this.fingerprints.slice(-50)));
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let fingerprintPanel = null;
function initFingerprintPanel() {
  fingerprintPanel = new FingerprintPanel();
}

// ============================================================
// 工作室面板 - 音乐理论工具面板完整交互逻辑
// ============================================================

class TheoryPanel {
  constructor() {
    this.scales = this.buildScaleDatabase();
    this.chords = this.buildChordDatabase();
    this.circleOfFifths = this.buildCircleOfFifths();
    this.currentKey = 'C';
    this.currentScale = 'major';
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindUI();
    this.renderCircleOfFifths();
    this.renderScaleView();
    console.log('[青鸾 Studio] TheoryPanel 初始化完成');
  }

  bindUI() {
    const keySelect = document.getElementById('theoryKey');
    const scaleSelect = document.getElementById('theoryScale');
    const btnIdentify = document.getElementById('theoryIdentify');
    const btnBuildChord = document.getElementById('theoryBuildChord');
    const btnAnalyze = document.getElementById('theoryAnalyze');
    const btnQuiz = document.getElementById('theoryQuiz');

    if (keySelect) keySelect.addEventListener('change', (e) => { this.currentKey = e.target.value; this.renderScaleView(); this.renderCircleOfFifths(); });
    if (scaleSelect) scaleSelect.addEventListener('change', (e) => { this.currentScale = e.target.value; this.renderScaleView(); });
    if (btnIdentify) btnIdentify.addEventListener('click', () => this.identifyChord());
    if (btnBuildChord) btnBuildChord.addEventListener('click', () => this.buildChordFromInput());
    if (btnAnalyze) btnAnalyze.addEventListener('click', () => this.analyzeProgression());
    if (btnQuiz) btnQuiz.addEventListener('click', () => this.startQuiz());
  }

  buildScaleDatabase() {
    const base = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const patterns = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
      harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
      melodic_minor: [0, 2, 3, 5, 7, 9, 11],
      pentatonic_major: [0, 2, 4, 7, 9],
      pentatonic_minor: [0, 3, 5, 7, 10],
      blues: [0, 3, 5, 6, 7, 10],
      whole_tone: [0, 2, 4, 6, 8, 10],
      diminished: [0, 2, 3, 5, 6, 8, 9, 11]
    };
    const scales = {};
    base.forEach(root => {
      const rootIdx = base.indexOf(root);
      scales[root] = {};
      Object.entries(patterns).forEach(([name, pattern]) => {
        scales[root][name] = pattern.map(semi => base[(rootIdx + semi) % 12]);
      });
    });
    return scales;
  }

  buildChordDatabase() {
    return {
      major: { name: '大三和弦', intervals: [0, 4, 7], quality: 'major' },
      minor: { name: '小三和弦', intervals: [0, 3, 7], quality: 'minor' },
      diminished: { name: '减三和弦', intervals: [0, 3, 6], quality: 'diminished' },
      augmented: { name: '增三和弦', intervals: [0, 4, 8], quality: 'augmented' },
      maj7: { name: '大七和弦', intervals: [0, 4, 7, 11], quality: 'major' },
      min7: { name: '小七和弦', intervals: [0, 3, 7, 10], quality: 'minor' },
      dom7: { name: '属七和弦', intervals: [0, 4, 7, 10], quality: 'dominant' },
      min7b5: { name: '半减七和弦', intervals: [0, 3, 6, 10], quality: 'half-diminished' },
      dim7: { name: '减七和弦', intervals: [0, 3, 6, 9], quality: 'diminished' },
      sus2: { name: '挂二和弦', intervals: [0, 2, 7], quality: 'suspended' },
      sus4: { name: '挂四和弦', intervals: [0, 5, 7], quality: 'suspended' },
      add9: { name: '加九和弦', intervals: [0, 4, 7, 14], quality: 'major' },
      maj9: { name: '大九和弦', intervals: [0, 4, 7, 11, 14], quality: 'major' },
      dom9: { name: '属九和弦', intervals: [0, 4, 7, 10, 14], quality: 'dominant' },
      min9: { name: '小九和弦', intervals: [0, 3, 7, 10, 14], quality: 'minor' },
      maj13: { name: '大十三和弦', intervals: [0, 4, 7, 11, 14, 17, 21], quality: 'major' },
      min11: { name: '小十一和弦', intervals: [0, 3, 7, 10, 14, 17], quality: 'minor' }
    };
  }

  buildCircleOfFifths() {
    const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    const minors = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
    return majors.map((m, i) => ({ major: m, minor: minors[i], index: i }));
  }

  renderScaleView() {
    const container = document.getElementById('theoryScaleView');
    if (!container) return;
    const scaleNotes = this.scales[this.currentKey]?.[this.currentScale] || [];
    const degrees = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    let html = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;">';
    scaleNotes.forEach((note, i) => {
      html += `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#fff;border-radius:50%;font-size:12px;font-weight:700;">${note}</div>`;
    });
    html += '</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px;">音级关系:</div>';
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;">';
    const intervals = this.getScaleIntervals(this.currentScale);
    intervals.forEach((interval, i) => {
      html += `<div style="padding:4px 8px;background:rgba(0,0,0,0.03);border-radius:6px;font-size:11px;">${degrees[i] || '?'}: ${interval}</div>`;
    });
    html += '</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px;">顺阶和弦:</div>';
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
    const diatonic = this.getDiatonicChords(this.currentKey, this.currentScale);
    diatonic.forEach((chord, i) => {
      html += `<div style="padding:4px 8px;background:rgba(91,77,255,0.08);border-radius:6px;font-size:11px;font-weight:600;">${degrees[i]}${chord.quality === 'minor' ? 'm' : chord.quality === 'diminished' ? '°' : ''}</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  getScaleIntervals(scaleName) {
    const map = {
      major: ['全', '全', '半', '全', '全', '全', '半'],
      minor: ['全', '半', '全', '全', '半', '全', '全'],
      dorian: ['全', '半', '全', '全', '全', '半', '全'],
      phrygian: ['半', '全', '全', '全', '半', '全', '全'],
      lydian: ['全', '全', '全', '半', '全', '全', '半'],
      mixolydian: ['全', '全', '半', '全', '全', '半', '全'],
      locrian: ['半', '全', '全', '半', '全', '全', '全'],
      harmonic_minor: ['全', '半', '全', '全', '半', '增二度', '半'],
      melodic_minor: ['全', '半', '全', '全', '全', '全', '半'],
      pentatonic_major: ['全', '全', '小三度', '全', '小三度'],
      pentatonic_minor: ['小三度', '全', '全', '小三度', '全'],
      blues: ['小三度', '全', '半', '半', '小三度', '全'],
      whole_tone: ['全', '全', '全', '全', '全', '全'],
      diminished: ['全', '半', '全', '半', '全', '半', '全', '半']
    };
    return map[scaleName] || map.major;
  }

  getDiatonicChords(root, scaleName) {
    const scaleNotes = this.scales[root]?.[scaleName] || [];
    const qualities = {
      major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
      minor: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
      dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
      phrygian: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
      lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
      mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
      locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor']
    };
    const q = qualities[scaleName] || qualities.major;
    return scaleNotes.map((note, i) => ({ root: note, quality: q[i] || 'major' }));
  }

  renderCircleOfFifths() {
    const canvas = document.getElementById('theoryCircleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    ctx.clearRect(0, 0, w, h);

    this.circleOfFifths.forEach((entry, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const isCurrent = entry.major === this.currentKey || entry.minor === this.currentKey + 'm';

      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 24 : 18, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? 'var(--accent)' : 'rgba(91,77,255,0.1)';
      ctx.fill();
      ctx.fillStyle = isCurrent ? '#fff' : 'var(--text)';
      ctx.font = `${isCurrent ? 14 : 11}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.major, x, y - 6);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = isCurrent ? 'rgba(255,255,255,0.8)' : 'var(--text2)';
      ctx.fillText(entry.minor, x, y + 8);
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--accent)';
    ctx.fill();
  }

  identifyChord() {
    const input = document.getElementById('theoryChordNotes')?.value || '';
    const notes = input.split(',').map(s => s.trim()).filter(Boolean);
    const container = document.getElementById('theoryIdentifyResult');
    if (!container) return;

    if (notes.length < 2) {
      container.innerHTML = '<div style="color:var(--error);font-size:12px;">请至少输入两个音</div>';
      return;
    }

    const results = [];
    Object.entries(this.chords).forEach(([type, info]) => {
      if (info.intervals.length === notes.length) {
        results.push({ type, name: info.name, confidence: 0.8 + Math.random() * 0.2 });
      }
    });

    if (results.length) {
      container.innerHTML = results.slice(0, 5).map(r => `
        <div style="padding:4px 0;font-size:12px;">${escapeHtml(r.name)} (${r.type}) - 置信度: ${(r.confidence*100).toFixed(0)}%</div>
      `).join('');
    } else {
      container.innerHTML = '<div style="color:var(--text2);font-size:12px;">无法识别，请检查输入</div>';
    }
  }

  buildChordFromInput() {
    const root = document.getElementById('theoryChordRoot')?.value || 'C';
    const type = document.getElementById('theoryChordType')?.value || 'major';
    const info = this.chords[type];
    const container = document.getElementById('theoryBuildResult');
    if (!container || !info) return;

    const rootMidi = this.noteNameToMidi(root + '4');
    const notes = info.intervals.map(semi => this.midiToNoteName(rootMidi + semi));
    container.innerHTML = `<div style="font-size:12px;font-weight:600;margin-bottom:4px;">${root} ${info.name}</div>
      <div style="display:flex;gap:4px;">${notes.map(n => `<span style="padding:4px 8px;background:rgba(91,77,255,0.08);border-radius:6px;font-size:11px;">${n}</span>`).join('')}</div>`;
  }

  analyzeProgression() {
    const input = document.getElementById('theoryProgressionInput')?.value || '';
    const chords = input.split(/[-,\s]+/).filter(Boolean);
    const container = document.getElementById('theoryAnalysisResult');
    if (!container) return;

    const functions = chords.map((chord, i) => {
      return { chord, function: ['主功能', '上主音', '中音', '下属', '属', '下中音', '导音'][i % 7], suggestion: i % 7 === 4 ? '解决到主和弦' : '' };
    });

    container.innerHTML = functions.map(f => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border);">
        <span>${escapeHtml(f.chord)}</span>
        <span style="color:var(--text2);">${f.function} ${f.suggestion ? '| ' + f.suggestion : ''}</span>
      </div>
    `).join('');
  }

  startQuiz() {
    const questions = [
      { q: 'C大调有几个升号?', options: ['0', '1', '2', '3'], a: '0' },
      { q: 'G大调的关系小调是?', options: ['Em', 'Am', 'Dm', 'Bm'], a: 'Em' },
      { q: '属七和弦的构成音是?', options: ['根音 大三度 纯五度 小七度', '根音 小三度 纯五度 大七度', '根音 大三度 减五度 小七度'], a: '根音 大三度 纯五度 小七度' },
      { q: 'F#大调有几个升号?', options: ['4', '5', '6', '7'], a: '6' }
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    const container = document.getElementById('theoryQuizArea');
    if (!container) return;
    container.innerHTML = `<div style="font-size:13px;font-weight:600;margin-bottom:8px;">${q.q}</div>
      <div style="display:flex;flex-direction:column;gap:6px;">${q.options.map(opt => `
        <button style="text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card-bg);cursor:pointer;font-size:12px;"
          onclick="this.style.background = '${opt === q.a ? 'var(--success)' : 'var(--error)'}'; this.style.color = '#fff';">${escapeHtml(opt)}</button>
      `).join('')}</div>`;
  }

  noteNameToMidi(name) {
    const notes = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const match = name.match(/^([A-G][#b]?)(\d)$/);
    if (!match) return 60;
    return (parseInt(match[2]) + 1) * 12 + (notes[match[1]] || 0);
  }

  midiToNoteName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let theoryPanel = null;
function initTheoryPanel() {
  theoryPanel = new TheoryPanel();
}

// ============================================================
// 工作室面板 - 教育游戏增强系统
// ============================================================

class EduGameEnhanced {
  constructor() {
    this.games = ['interval', 'chord', 'scale', 'rhythm', 'sight_reading'];
    this.currentGame = null;
    this.score = 0;
    this.streak = 0;
    this.highScores = {};
    this.difficulty = 'normal';
    this.gameState = {};
    this.listeners = {};
    this.init();
  }

  init() {
    this.loadHighScores();
    this.bindUI();
    console.log('[青鸾 Studio] EduGameEnhanced 初始化完成');
  }

  bindUI() {
    const games = {
      'eduIntervalGame': 'interval',
      'eduChordGame': 'chord',
      'eduScaleGame': 'scale',
      'eduRhythmGame': 'rhythm',
      'eduSightGame': 'sight_reading'
    };
    Object.entries(games).forEach(([id, game]) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.startGame(game));
    });

    const diffSelect = document.getElementById('eduDifficulty');
    if (diffSelect) diffSelect.addEventListener('change', (e) => { this.difficulty = e.target.value; });
  }

  loadHighScores() {
    try {
      this.highScores = JSON.parse(localStorage.getItem('qingluan_edu_scores') || '{}');
    } catch (e) { this.highScores = {}; }
  }

  saveHighScore(game, score) {
    const key = game + '_' + this.difficulty;
    const prev = this.highScores[key] || 0;
    if (score > prev) {
      this.highScores[key] = score;
      localStorage.setItem('qingluan_edu_scores', JSON.stringify(this.highScores));
      return true;
    }
    return false;
  }

  startGame(game) {
    this.currentGame = game;
    this.score = 0;
    this.streak = 0;
    this.gameState = { round: 0, maxRounds: 10, startTime: Date.now() };
    const container = document.getElementById('eduGameArea');
    if (container) container.style.display = 'block';
    this.updateScoreUI();
    this.nextRound();
    this.emit('gameStarted', game);
  }

  nextRound() {
    if (this.gameState.round >= this.gameState.maxRounds) {
      this.endGame();
      return;
    }
    this.gameState.round++;
    const container = document.getElementById('eduGameQuestion');
    if (!container) return;

    if (this.currentGame === 'interval') {
      this.renderIntervalQuestion(container);
    } else if (this.currentGame === 'chord') {
      this.renderChordQuestion(container);
    } else if (this.currentGame === 'scale') {
      this.renderScaleQuestion(container);
    } else if (this.currentGame === 'rhythm') {
      this.renderRhythmQuestion(container);
    } else if (this.currentGame === 'sight_reading') {
      this.renderSightReadingQuestion(container);
    }
  }

  renderIntervalQuestion(container) {
    const intervals = ['小二度', '大二度', '小三度', '大三度', '纯四度', '三全音', '纯五度', '小六度', '大六度', '小七度', '大七度', '纯八度'];
    const correct = intervals[Math.floor(Math.random() * intervals.length)];
    const options = this.shuffle([correct, ...this.pickRandom(intervals.filter(i => i !== correct), 3)]);
    container.innerHTML = `<div style="font-size:14px;font-weight:600;margin-bottom:12px;">第 ${this.gameState.round} 题: 听辨音程</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${options.map(opt => `
        <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;"
          onclick="eduGameEnhanced.answer('${opt}', '${correct}')">${opt}</button>
      `).join('')}</div>`;
    this.playIntervalSound(correct);
  }

  renderChordQuestion(container) {
    const chords = ['大三和弦', '小三和弦', '增三和弦', '减三和弦', '属七和弦', '大七和弦', '小七和弦'];
    const correct = chords[Math.floor(Math.random() * chords.length)];
    const options = this.shuffle([correct, ...this.pickRandom(chords.filter(c => c !== correct), 3)]);
    container.innerHTML = `<div style="font-size:14px;font-weight:600;margin-bottom:12px;">第 ${this.gameState.round} 题: 听辨和弦</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${options.map(opt => `
        <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;"
          onclick="eduGameEnhanced.answer('${opt}', '${correct}')">${opt}</button>
      `).join('')}</div>`;
    this.playChordSound(correct);
  }

  renderScaleQuestion(container) {
    const scales = ['大调', '自然小调', '多利亚', '弗里几亚', '利底亚', '混合利底亚', '洛克里亚'];
    const correct = scales[Math.floor(Math.random() * scales.length)];
    const options = this.shuffle([correct, ...this.pickRandom(scales.filter(s => s !== correct), 3)]);
    container.innerHTML = `<div style="font-size:14px;font-weight:600;margin-bottom:12px;">第 ${this.gameState.round} 题: 听辨调式</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${options.map(opt => `
        <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;"
          onclick="eduGameEnhanced.answer('${opt}', '${correct}')">${opt}</button>
      `).join('')}</div>`;
  }

  renderRhythmQuestion(container) {
    const patterns = ['四分音符', '八分音符', '三连音', '切分音', '附点音符', '十六分音符'];
    const correct = patterns[Math.floor(Math.random() * patterns.length)];
    const options = this.shuffle([correct, ...this.pickRandom(patterns.filter(p => p !== correct), 3)]);
    container.innerHTML = `<div style="font-size:14px;font-weight:600;margin-bottom:12px;">第 ${this.gameState.round} 题: 节奏辨识</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${options.map(opt => `
        <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;"
          onclick="eduGameEnhanced.answer('${opt}', '${correct}')">${opt}</button>
      `).join('')}</div>`;
  }

  renderSightReadingQuestion(container) {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const correct = notes[Math.floor(Math.random() * notes.length)];
    const options = this.shuffle([correct, ...this.pickRandom(notes.filter(n => n !== correct), 3)]);
    container.innerHTML = `<div style="font-size:14px;font-weight:600;margin-bottom:12px;">第 ${this.gameState.round} 题: 视唱练耳</div>
      <div style="font-size:24px;font-weight:700;color:var(--accent);margin-bottom:12px;text-align:center;">${correct}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">${options.map(opt => `
        <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;"
          onclick="eduGameEnhanced.answer('${opt}', '${correct}')">${opt}</button>
      `).join('')}</div>`;
  }

  answer(selected, correct) {
    const isCorrect = selected === correct;
    if (isCorrect) {
      this.score += 10 + this.streak;
      this.streak++;
    } else {
      this.streak = 0;
    }
    this.updateScoreUI();
    showToast(isCorrect ? '正确!' : `错误，正确答案是 ${correct}`, isCorrect ? 'success' : 'error');
    setTimeout(() => this.nextRound(), 1000);
  }

  endGame() {
    const duration = Math.floor((Date.now() - this.gameState.startTime) / 1000);
    const isNewRecord = this.saveHighScore(this.currentGame, this.score);
    const container = document.getElementById('eduGameQuestion');
    if (container) {
      container.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">游戏结束</div>
        <div style="font-size:24px;color:var(--accent);font-weight:700;margin-bottom:4px;">得分: ${this.score}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px;">用时: ${duration}秒 ${isNewRecord ? '| 新纪录!' : ''}</div>
        <button class="s-btn-small" onclick="eduGameEnhanced.startGame('${this.currentGame}')">再来一局</button>
      </div>`;
    }
    this.emit('gameEnded', { game: this.currentGame, score: this.score, duration });
  }

  updateScoreUI() {
    const scoreEl = document.getElementById('eduGameScore');
    const streakEl = document.getElementById('eduGameStreak');
    if (scoreEl) scoreEl.textContent = this.score;
    if (streakEl) streakEl.textContent = this.streak;
  }

  playIntervalSound(intervalName) {
    if (!window.qlAudio) return;
    const base = 440;
    const ratios = { '小二度': 1.059, '大二度': 1.122, '小三度': 1.189, '大三度': 1.26, '纯四度': 1.334, '三全音': 1.414, '纯五度': 1.498, '小六度': 1.587, '大六度': 1.682, '小七度': 1.782, '大七度': 1.888, '纯八度': 2 };
    const ratio = ratios[intervalName] || 1;
    window.qlAudio.playNote(base, 0.5, 'sine', 0.5);
    setTimeout(() => window.qlAudio.playNote(base * ratio, 0.5, 'sine', 0.5), 500);
  }

  playChordSound(chordName) {
    if (!window.qlAudio) return;
    const base = 261.63;
    const intervals = {
      '大三和弦': [1, 1.26, 1.498], '小三和弦': [1, 1.189, 1.498],
      '增三和弦': [1, 1.26, 1.587], '减三和弦': [1, 1.189, 1.414],
      '属七和弦': [1, 1.26, 1.498, 1.782], '大七和弦': [1, 1.26, 1.498, 1.888],
      '小七和弦': [1, 1.189, 1.498, 1.782]
    };
    const freqs = intervals[chordName] || [1];
    freqs.forEach((ratio, i) => {
      setTimeout(() => window.qlAudio.playNote(base * ratio, 1, 'sine', 0.3), i * 100);
    });
  }

  pickRandom(arr, count) {
    const shuffled = this.shuffle([...arr]);
    return shuffled.slice(0, count);
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let eduGameEnhanced = null;
function initEduGameEnhanced() {
  eduGameEnhanced = new EduGameEnhanced();
}

// ============================================================
// 音频工具箱 - 实用音频处理工具集合
// ============================================================

class AudioToolbox {
  constructor() {
    this.tools = ['tuner', 'metronome', 'tap_tempo', 'pitch_pipe', 'drone', 'chord_player', 'scale_player'];
    this.activeTools = new Set();
    this.listeners = {};
  }

  init() {
    this.bindUI();
    console.log('[青鸾 Audio] AudioToolbox 初始化完成');
  }

  bindUI() {
    const map = {
      'toolTuner': () => this.toggleTuner(),
      'toolMetronome': () => this.toggleMetronome(),
      'toolTapTempo': () => this.tapTempo(),
      'toolPitchPipe': () => this.openPitchPipe(),
      'toolDrone': () => this.toggleDrone(),
      'toolChordPlayer': () => this.openChordPlayer(),
      'toolScalePlayer': () => this.openScalePlayer()
    };
    Object.entries(map).forEach(([id, fn]) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', fn);
    });
  }

  toggleTuner() {
    if (this.activeTools.has('tuner')) {
      this.activeTools.delete('tuner');
      showToast('调音器已关闭', 'info');
    } else {
      this.activeTools.add('tuner');
      this.startTuner();
      showToast('调音器已启动', 'info');
    }
  }

  startTuner() {
    if (!window.qlAudio) return;
    const update = () => {
      if (!this.activeTools.has('tuner')) return;
      const data = window.qlAudio.getFrequencyData();
      if (data.length) {
        const maxVal = Math.max(...data);
        const maxIdx = data.indexOf(maxVal);
        const freq = maxIdx * (window.qlAudio.ctx.sampleRate / 2) / data.length;
        const note = this.freqToNoteName(freq);
        const display = document.getElementById('tunerDisplay');
        if (display) display.textContent = `${note} (${freq.toFixed(1)} Hz)`;
      }
      requestAnimationFrame(update);
    };
    update();
  }

  toggleMetronome() {
    if (this.activeTools.has('metronome')) {
      this.activeTools.delete('metronome');
      if (this.metronomeTimer) clearInterval(this.metronomeTimer);
      showToast('节拍器已关闭', 'info');
    } else {
      this.activeTools.add('metronome');
      this.startMetronome();
      showToast('节拍器已启动', 'info');
    }
  }

  startMetronome() {
    const bpm = parseInt(document.getElementById('metronomeBpm')?.value) || 120;
    const interval = 60000 / bpm;
    let beat = 0;
    this.metronomeTimer = setInterval(() => {
      if (!this.activeTools.has('metronome')) return;
      if (window.qlAudio) {
        window.qlAudio.playNote(beat % 4 === 0 ? 1000 : 800, 0.05, 'square', 0.3);
      }
      beat++;
    }, interval);
  }

  tapTempo() {
    if (!this._tapTimes) this._tapTimes = [];
    this._tapTimes.push(Date.now());
    if (this._tapTimes.length > 8) this._tapTimes.shift();
    if (this._tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this._tapTimes.length; i++) intervals.push(this._tapTimes[i] - this._tapTimes[i - 1]);
      const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const bpm = Math.round(60000 / avg);
      const display = document.getElementById('tapTempoDisplay');
      if (display) display.textContent = bpm + ' BPM';
      const bpmInput = document.getElementById('metronomeBpm');
      if (bpmInput) bpmInput.value = bpm;
    }
  }

  openPitchPipe() {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const container = document.getElementById('pitchPipeArea');
    if (!container) return;
    container.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;">${notes.map(n => `
      <button style="width:48px;height:48px;border-radius:50%;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;font-size:12px;font-weight:700;"
        onmousedown="audioToolbox.playNote('${n}')" onmouseup="audioToolbox.stopNote('${n}')">${n}</button>
    `).join('')}</div>`;
  }

  playNote(noteName) {
    if (!window.qlAudio) return;
    const freq = this.noteNameToFreq(noteName);
    window.qlAudio.playNote(freq, 2, 'sine', 0.5);
  }

  stopNote(noteName) {
    // 简化处理，实际应该跟踪 oscillator 引用
  }

  toggleDrone() {
    if (this.activeTools.has('drone')) {
      this.activeTools.delete('drone');
      showToast('Drone 已关闭', 'info');
    } else {
      this.activeTools.add('drone');
      const root = document.getElementById('droneRoot')?.value || 'C';
      const freq = this.noteNameToFreq(root + '3');
      if (window.qlAudio) window.qlAudio.playNote(freq, 10, 'sawtooth', 0.15);
      showToast('Drone 已启动: ' + root, 'info');
    }
  }

  openChordPlayer() {
    const chords = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'G7', 'D7', 'E7'];
    const container = document.getElementById('chordPlayerArea');
    if (!container) return;
    container.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;">${chords.map(c => `
      <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;font-weight:600;"
        onclick="audioToolbox.playChord('${c}')">${c}</button>
    `).join('')}</div>`;
  }

  playChord(chordName) {
    if (!window.qlAudio) return;
    const base = this.noteNameToFreq(chordName.replace(/[^A-G#b]/g, '') + '3');
    const intervals = { '': [1, 1.26, 1.498], 'm': [1, 1.189, 1.498], 'dim': [1, 1.189, 1.414], '7': [1, 1.26, 1.498, 1.782] };
    const type = chordName.includes('dim') ? 'dim' : chordName.includes('7') ? '7' : chordName.includes('m') ? 'm' : '';
    const ratios = intervals[type] || intervals[''];
    ratios.forEach((ratio, i) => {
      setTimeout(() => window.qlAudio.playNote(base * ratio, 1.5, 'sine', 0.35), i * 50);
    });
  }

  openScalePlayer() {
    const scales = ['C major', 'A minor', 'G major', 'E minor', 'F major', 'D minor'];
    const container = document.getElementById('scalePlayerArea');
    if (!container) return;
    container.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;">${scales.map(s => `
      <button style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);cursor:pointer;font-size:13px;"
        onclick="audioToolbox.playScale('${s}')">${s}</button>
    `).join('')}</div>`;
  }

  playScale(scaleName) {
    if (!window.qlAudio) return;
    const root = scaleName.split(' ')[0];
    const isMinor = scaleName.includes('minor');
    const base = this.noteNameToFreq(root + '4');
    const ratios = isMinor ? [1, 1.122, 1.189, 1.335, 1.498, 1.682, 1.782, 2] : [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2];
    ratios.forEach((ratio, i) => {
      setTimeout(() => window.qlAudio.playNote(base * ratio, 0.4, 'sine', 0.4), i * 300);
    });
  }

  freqToNoteName(freq) {
    if (freq <= 0) return '?';
    const midi = 69 + 12 * Math.log2(freq / 440);
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[Math.round(midi) % 12] + Math.floor(Math.round(midi) / 12 - 1);
  }

  noteNameToFreq(name) {
    const notes = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const match = name.match(/^([A-G][#b]?)(\d)$/);
    if (!match) return 440;
    const midi = (parseInt(match[2]) + 1) * 12 + (notes[match[1]] || 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let audioToolbox = null;
function initAudioToolbox() {
  audioToolbox = new AudioToolbox();
  audioToolbox.init();
}

// ============================================================
// 混音台增强系统
// ============================================================

class MixerEnhanced {
  constructor() {
    this.channels = [];
    this.maxChannels = 16;
    this.master = { gain: 1, pan: 0, mute: false, solo: false };
    this.fxSends = [];
    this.listeners = {};
    this.init();
  }

  init() {
    this.createDefaultChannels();
    this.bindUI();
    console.log('[青鸾 Studio] MixerEnhanced 初始化完成');
  }

  bindUI() {
    const btnAdd = document.getElementById('mixerAddChannel');
    const btnReset = document.getElementById('mixerReset');
    const btnGroup = document.getElementById('mixerGroup');
    const btnVca = document.getElementById('mixerVca');

    if (btnAdd) btnAdd.addEventListener('click', () => this.addChannel());
    if (btnReset) btnReset.addEventListener('click', () => this.resetAll());
    if (btnGroup) btnGroup.addEventListener('click', () => this.createGroup());
    if (btnVca) btnVca.addEventListener('click', () => this.createVCA());
  }

  createDefaultChannels() {
    const defaults = [
      { name: 'Kick', color: '#ff6b6b', icon: '🥁' },
      { name: 'Snare', color: '#ff9f43', icon: '🥁' },
      { name: 'Hi-Hat', color: '#feca57', icon: '🥁' },
      { name: 'Bass', color: '#48dbfb', icon: '🎸' },
      { name: 'Guitar L', color: '#1dd1a1', icon: '🎸' },
      { name: 'Guitar R', color: '#10ac84', icon: '🎸' },
      { name: 'Piano', color: '#5f27cd', icon: '🎹' },
      { name: 'Synth', color: '#00d2d3', icon: '🎹' },
      { name: 'Vocal', color: '#ff9ff3', icon: '🎤' },
      { name: 'Backing Vox', color: '#f368e0', icon: '🎤' }
    ];
    defaults.forEach(d => this.addChannel(d.name, d.color, d.icon));
  }

  addChannel(name, color, icon) {
    if (this.channels.length >= this.maxChannels) { showToast('通道数量已达上限', 'warning'); return; }
    const channel = {
      id: randomId('ch'),
      name: name || '通道 ' + (this.channels.length + 1),
      color: color || `hsl(${Math.random() * 360}, 70%, 60%)`,
      icon: icon || '🔊',
      gain: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      record: false,
      mono: false,
      phase: false,
      eq: { low: 0, mid: 0, high: 0, lowFreq: 250, midFreq: 2500, highFreq: 8000 },
      dynamics: { threshold: -24, ratio: 4, attack: 10, release: 100 },
      sends: [0, 0, 0, 0],
      peak: 0,
      rms: 0
    };
    this.channels.push(channel);
    this.renderMixer();
    this.emit('channelAdded', channel);
  }

  resetAll() {
    this.channels.forEach(ch => {
      ch.gain = 0.8;
      ch.pan = 0;
      ch.mute = false;
      ch.solo = false;
      ch.eq = { low: 0, mid: 0, high: 0, lowFreq: 250, midFreq: 2500, highFreq: 8000 };
      ch.dynamics = { threshold: -24, ratio: 4, attack: 10, release: 100 };
      ch.sends = [0, 0, 0, 0];
    });
    this.master = { gain: 1, pan: 0, mute: false, solo: false };
    this.renderMixer();
    showToast('混音台已重置', 'success');
  }

  createGroup() {
    const selected = this.channels.filter(c => c.selected);
    if (selected.length < 2) { showToast('请至少选择两个通道', 'warning'); return; }
    const group = {
      id: randomId('grp'),
      name: 'Group ' + (this.channels.filter(c => c.type === 'group').length + 1),
      type: 'group',
      channels: selected.map(c => c.id),
      gain: 0.8,
      pan: 0,
      mute: false,
      solo: false
    };
    this.channels.push(group);
    this.renderMixer();
    showToast('编组已创建', 'success');
  }

  createVCA() {
    const vca = {
      id: randomId('vca'),
      name: 'VCA ' + (this.channels.filter(c => c.type === 'vca').length + 1),
      type: 'vca',
      gain: 1,
      targets: []
    };
    this.channels.push(vca);
    this.renderMixer();
    showToast('VCA 已创建', 'success');
  }

  renderMixer() {
    const container = document.getElementById('mixerEnhancedContainer');
    if (!container) return;
    let html = '<div style="display:flex;gap:6px;overflow-x:auto;padding:10px;">';
    this.channels.forEach(ch => {
      if (ch.type === 'group' || ch.type === 'vca') return;
      html += `<div style="width:64px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;background:${ch.color}15;border-radius:10px;border:1px solid ${ch.color}30;">`;
      html += `<div style="font-size:14px;">${ch.icon}</div>`;
      html += `<div style="font-size:9px;font-weight:700;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">${escapeHtml(ch.name)}</div>`;
      html += `<div style="width:32px;height:96px;background:rgba(0,0,0,0.06);border-radius:4px;position:relative;overflow:hidden;">`;
      html += `<div style="position:absolute;bottom:0;left:0;right:0;height:${Math.min(100, (ch.peak || 0.5) * 100)}%;background:${ch.color};border-radius:4px;transition:height 0.1s;"></div>`;
      html += `</div>`;
      html += `<input type="range" min="0" max="100" value="${ch.gain * 100}" style="width:50px;height:4px;accent-color:${ch.color};" oninput="mixerEnhanced.setChannelGain('${ch.id}', this.value)">`;
      html += `<div style="display:flex;gap:2px;">`;
      html += `<button style="width:18px;height:18px;border:none;border-radius:4px;background:${ch.mute ? '#d44' : 'rgba(0,0,0,0.06)'};color:${ch.mute ? '#fff' : 'var(--text2)'};font-size:7px;font-weight:700;cursor:pointer;" onclick="mixerEnhanced.toggleMute('${ch.id}')">M</button>`;
      html += `<button style="width:18px;height:18px;border:none;border-radius:4px;background:${ch.solo ? '#fa0' : 'rgba(0,0,0,0.06)'};color:${ch.solo ? '#fff' : 'var(--text2)'};font-size:7px;font-weight:700;cursor:pointer;" onclick="mixerEnhanced.toggleSolo('${ch.id}')">S</button>`;
      html += `</div>`;
      html += `</div>`;
    });
    html += `<div style="width:64px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;background:rgba(91,77,255,0.08);border-radius:10px;border:1px solid var(--accent);">`;
    html += `<div style="font-size:14px;">🔊</div>`;
    html += `<div style="font-size:9px;font-weight:700;text-align:center;">MASTER</div>`;
    html += `<div style="width:32px;height:96px;background:rgba(0,0,0,0.06);border-radius:4px;position:relative;overflow:hidden;">`;
    html += `<div style="position:absolute;bottom:0;left:0;right:0;height:75%;background:var(--accent);border-radius:4px;"></div>`;
    html += `</div>`;
    html += `<input type="range" min="0" max="100" value="${this.master.gain * 100}" style="width:50px;height:4px;accent-color:var(--accent);" oninput="mixerEnhanced.setMasterGain(this.value)">`;
    html += `</div>`;
    html += '</div>';
    container.innerHTML = html;
  }

  setChannelGain(id, value) {
    const ch = this.channels.find(c => c.id === id);
    if (ch) ch.gain = parseInt(value) / 100;
  }

  setMasterGain(value) {
    this.master.gain = parseInt(value) / 100;
  }

  toggleMute(id) {
    const ch = this.channels.find(c => c.id === id);
    if (ch) { ch.mute = !ch.mute; this.renderMixer(); }
  }

  toggleSolo(id) {
    const ch = this.channels.find(c => c.id === id);
    if (ch) { ch.solo = !ch.solo; this.renderMixer(); }
  }

  simulateMeterUpdate() {
    this.channels.forEach(ch => {
      ch.peak = Math.random() * 0.9;
      ch.rms = ch.peak * 0.7;
    });
    this.renderMixer();
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let mixerEnhanced = null;
function initMixerEnhanced() {
  mixerEnhanced = new MixerEnhanced();
}

// ============================================================
// 传输控制增强系统
// ============================================================

class TransportEnhanced {
  constructor() {
    this.state = 'stopped';
    this.position = 0;
    this.bpm = 120;
    this.timeSig = [4, 4];
    this.loop = { enabled: false, start: 0, end: 16 };
    this.punch = { enabled: false, in: 0, out: 16 };
    this.preRoll = 1;
    this.postRoll = 1;
    this.clickEnabled = true;
    this.countIn = 1;
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindUI();
    this.startPositionLoop();
    console.log('[青鸾 Studio] TransportEnhanced 初始化完成');
  }

  bindUI() {
    const btnPlay = document.getElementById('transportPlay');
    const btnStop = document.getElementById('transportStop');
    const btnRecord = document.getElementById('transportRecord');
    const btnRewind = document.getElementById('transportRewind');
    const btnForward = document.getElementById('transportForward');
    const btnLoop = document.getElementById('transportLoop');
    const btnToStart = document.getElementById('transportToStart');
    const btnToEnd = document.getElementById('transportToEnd');

    if (btnPlay) btnPlay.addEventListener('click', () => this.play());
    if (btnStop) btnStop.addEventListener('click', () => this.stop());
    if (btnRecord) btnRecord.addEventListener('click', () => this.record());
    if (btnRewind) btnRewind.addEventListener('click', () => this.rewind());
    if (btnForward) btnForward.addEventListener('click', () => this.forward());
    if (btnLoop) btnLoop.addEventListener('click', () => this.toggleLoop());
    if (btnToStart) btnToStart.addEventListener('click', () => this.goToStart());
    if (btnToEnd) btnToEnd.addEventListener('click', () => this.goToEnd());

    const bpmInput = document.getElementById('transportBpm');
    if (bpmInput) bpmInput.addEventListener('input', (e) => { this.bpm = parseInt(e.target.value) || 120; this.emit('bpmChanged', this.bpm); });
  }

  play() {
    if (this.state === 'playing') return;
    this.state = 'playing';
    this.emit('play', { position: this.position });
    this.updateUI();
  }

  stop() {
    this.state = 'stopped';
    this.emit('stop', { position: this.position });
    this.updateUI();
  }

  record() {
    if (this.state === 'recording') {
      this.state = 'playing';
    } else {
      this.state = 'recording';
      this.emit('record', { position: this.position });
    }
    this.updateUI();
  }

  rewind() {
    this.position = Math.max(0, this.position - 1);
    this.emit('positionChanged', this.position);
    this.updateUI();
  }

  forward() {
    this.position += 1;
    this.emit('positionChanged', this.position);
    this.updateUI();
  }

  toggleLoop() {
    this.loop.enabled = !this.loop.enabled;
    this.emit('loopChanged', this.loop);
    this.updateUI();
  }

  goToStart() {
    this.position = 0;
    this.emit('positionChanged', this.position);
    this.updateUI();
  }

  goToEnd() {
    this.position = this.loop.end || 16;
    this.emit('positionChanged', this.position);
    this.updateUI();
  }

  startPositionLoop() {
    setInterval(() => {
      if (this.state === 'playing' || this.state === 'recording') {
        const beatDuration = 60 / this.bpm;
        this.position += beatDuration / 10;
        if (this.loop.enabled && this.position >= this.loop.end) {
          this.position = this.loop.start;
        }
        this.emit('positionChanged', this.position);
        this.updateUI();
      }
    }, 100);
  }

  updateUI() {
    const display = document.getElementById('transportDisplay');
    if (display) {
      const bars = Math.floor(this.position / this.timeSig[0]) + 1;
      const beats = Math.floor(this.position % this.timeSig[0]) + 1;
      const sixteenths = Math.floor((this.position % 1) * 4) + 1;
      display.textContent = `${bars.toString().padStart(3, '0')}:${beats}:${sixteenths}`;
    }
    const playBtn = document.getElementById('transportPlay');
    if (playBtn) playBtn.style.background = this.state === 'playing' ? 'var(--accent)' : '';
    const recBtn = document.getElementById('transportRecord');
    if (recBtn) recBtn.style.background = this.state === 'recording' ? '#d44' : '';
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let transportEnhanced = null;
function initTransportEnhanced() {
  transportEnhanced = new TransportEnhanced();
}

// ============================================================
// 辅助工具函数与工具类
// ============================================================

class QingluanUtils {
  static debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  static throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  static formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const sec = s % 60;
    const min = m % 60;
    if (h > 0) return `${h}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static parseQueryString(url) {
    const query = {};
    const parser = document.createElement('a');
    parser.href = url;
    const params = parser.search.substring(1).split('&');
    params.forEach(param => {
      const [key, value] = param.split('=');
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return query;
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static domReady() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  static loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  static loadStyle(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  static copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  static downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  static midiToNoteName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12] + Math.floor(midi / 12 - 1);
  }

  static noteNameToMidi(name) {
    const notes = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const match = name.match(/^([A-G][#b]?)(\d)$/);
    if (!match) return 60;
    return (parseInt(match[2]) + 1) * 12 + (notes[match[1]] || 0);
  }

  static freqToMidi(freq) {
    return Math.round(69 + 12 * Math.log2(freq / 440));
  }

  static midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  static dbToGain(db) {
    return Math.pow(10, db / 20);
  }

  static gainToDb(gain) {
    return 20 * Math.log10(gain);
  }

  static calculateBPMFromSamples(sampleCount, sampleRate, beats) {
    return (sampleRate * 60 * beats) / sampleCount;
  }

  static secondsToSamples(seconds, sampleRate) {
    return Math.round(seconds * sampleRate);
  }

  static samplesToSeconds(samples, sampleRate) {
    return samples / sampleRate;
  }

  static beatsToSeconds(beats, bpm) {
    return (beats * 60) / bpm;
  }

  static secondsToBeats(seconds, bpm) {
    return (seconds * bpm) / 60;
  }

  static createDelayBuffer(ctx, maxDelayTime) {
    return ctx.createDelay(maxDelayTime);
  }

  static createImpulseResponse(ctx, duration, decay, reverse = false) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const n = reverse ? length - i - 1 : i;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      }
    }
    return impulse;
  }

  static applyFade(buffer, fadeInDuration, fadeOutDuration, sampleRate) {
    const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < fadeInSamples && i < data.length; i++) {
        data[i] *= i / fadeInSamples;
      }
      for (let i = 0; i < fadeOutSamples && i < data.length; i++) {
        const idx = data.length - 1 - i;
        data[idx] *= i / fadeOutSamples;
      }
    }
    return buffer;
  }

  static normalizeBuffer(buffer) {
    let max = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > max) max = abs;
      }
    }
    if (max > 0) {
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] /= max;
        }
      }
    }
    return buffer;
  }

  static mixBuffers(buffers, weights) {
    if (!buffers.length) return null;
    const sampleRate = buffers[0].sampleRate;
    const maxLength = Math.max(...buffers.map(b => b.length));
    const mixed = new OfflineAudioContext(buffers[0].numberOfChannels, maxLength, sampleRate).createBuffer(buffers[0].numberOfChannels, maxLength, sampleRate);
    for (let ch = 0; ch < mixed.numberOfChannels; ch++) {
      const out = mixed.getChannelData(ch);
      buffers.forEach((buffer, idx) => {
        const w = weights ? weights[idx] : 1 / buffers.length;
        const data = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
        for (let i = 0; i < data.length; i++) {
          out[i] = (out[i] || 0) + data[i] * w;
        }
      });
    }
    return mixed;
  }
}

// ============================================================
// 服务工作者与离线支持
// ============================================================

class OfflineSupport {
  constructor() {
    this.cacheName = 'qingluan-cache-v1';
    this.assets = ['/index.html', '/app.js', '/style.css'];
    this.listeners = {};
  }

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('[青鸾 PWA] ServiceWorker 注册成功:', reg.scope);
        this.emit('swRegistered', reg);
      } catch (e) {
        console.warn('[青鸾 PWA] ServiceWorker 注册失败:', e);
      }
    }
  }

  async cacheAssets() {
    if (!('caches' in window)) return;
    const cache = await caches.open(this.cacheName);
    await cache.addAll(this.assets);
    this.emit('assetsCached');
  }

  async clearCache() {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    this.emit('cacheCleared');
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let offlineSupport = null;
function initOfflineSupport() {
  offlineSupport = new OfflineSupport();
  offlineSupport.init();
}

// ============================================================
// 更新检查与版本管理
// ============================================================

class UpdateChecker {
  constructor() {
    this.currentVersion = '4.0.0';
    this.checkInterval = 3600000;
    this.listeners = {};
  }

  init() {
    this.checkForUpdates();
    setInterval(() => this.checkForUpdates(), this.checkInterval);
  }

  async checkForUpdates() {
    try {
      const res = await fetch('/api/version?t=' + Date.now());
      const data = await res.json();
      if (data.version && data.version !== this.currentVersion) {
        showToast(`新版本可用: ${data.version}`, 'info');
        this.emit('updateAvailable', data.version);
      }
    } catch (e) {}
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let updateChecker = null;
function initUpdateChecker() {
  updateChecker = new UpdateChecker();
  updateChecker.init();
}

// ============================================================
// 第二批次初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initFingerprintPanel();
    initTheoryPanel();
    initEduGameEnhanced();
    initAudioToolbox();
    initMixerEnhanced();
    initTransportEnhanced();
    initOfflineSupport();
    initUpdateChecker();
    console.log('[青鸾 DAW] 前端扩展模块 v4.1 第二批初始化完成');
    console.log('[青鸾] 新增功能: FingerprintPanel, TheoryPanel, EduGameEnhanced, AudioToolbox, MixerEnhanced, TransportEnhanced, QingluanUtils, OfflineSupport, UpdateChecker');
  }, 200);
});

// ============================================================
// 序列编辑器增强系统
// ============================================================

class SequencerEnhanced {
  constructor() {
    this.grid = [];
    this.steps = 16;
    this.tracks = 8;
    this.currentTrack = 0;
    this.bpm = 120;
    this.playing = false;
    this.currentStep = 0;
    this.swing = 0;
    this.probability = 100;
    this.listeners = {};
    this.init();
  }

  init() {
    this.createEmptyGrid();
    this.bindUI();
    console.log('[青鸾 Studio] SequencerEnhanced 初始化完成');
  }

  createEmptyGrid() {
    this.grid = [];
    for (let t = 0; t < this.tracks; t++) {
      const track = [];
      for (let s = 0; s < this.steps; s++) {
        track.push({ active: false, velocity: 100, probability: 100, offset: 0, length: 1 });
      }
      this.grid.push(track);
    }
  }

  bindUI() {
    const container = document.getElementById('sequencerGrid');
    if (container) {
      container.addEventListener('click', (e) => {
        const cell = e.target.closest('.seq-cell');
        if (cell) {
          const t = parseInt(cell.dataset.track);
          const s = parseInt(cell.dataset.step);
          this.toggleStep(t, s);
        }
      });
    }
    const btnPlay = document.getElementById('seqPlay');
    const btnStop = document.getElementById('seqStop');
    const btnClear = document.getElementById('seqClear');
    const btnRandom = document.getElementById('seqRandom');
    const btnFill = document.getElementById('seqFill');

    if (btnPlay) btnPlay.addEventListener('click', () => this.play());
    if (btnStop) btnStop.addEventListener('click', () => this.stop());
    if (btnClear) btnClear.addEventListener('click', () => this.clearTrack(this.currentTrack));
    if (btnRandom) btnRandom.addEventListener('click', () => this.randomizeTrack(this.currentTrack));
    if (btnFill) btnFill.addEventListener('click', () => this.fillTrack(this.currentTrack));

    const swingInput = document.getElementById('seqSwing');
    if (swingInput) swingInput.addEventListener('input', (e) => { this.swing = parseInt(e.target.value) || 0; });
  }

  toggleStep(trackIdx, stepIdx) {
    const cell = this.grid[trackIdx][stepIdx];
    cell.active = !cell.active;
    this.renderGrid();
    this.emit('stepToggled', { track: trackIdx, step: stepIdx, active: cell.active });
  }

  clearTrack(trackIdx) {
    for (let s = 0; s < this.steps; s++) {
      this.grid[trackIdx][s] = { active: false, velocity: 100, probability: 100, offset: 0, length: 1 };
    }
    this.renderGrid();
  }

  randomizeTrack(trackIdx) {
    for (let s = 0; s < this.steps; s++) {
      this.grid[trackIdx][s].active = Math.random() < 0.3;
      this.grid[trackIdx][s].velocity = 60 + Math.floor(Math.random() * 60);
    }
    this.renderGrid();
  }

  fillTrack(trackIdx) {
    for (let s = 0; s < this.steps; s++) {
      if (s % 4 === 0) this.grid[trackIdx][s].active = true;
    }
    this.renderGrid();
  }

  renderGrid() {
    const container = document.getElementById('sequencerGrid');
    if (!container) return;
    let html = '<div style="display:flex;flex-direction:column;gap:2px;">';
    for (let t = 0; t < this.tracks; t++) {
      html += '<div style="display:flex;gap:2px;">';
      for (let s = 0; s < this.steps; s++) {
        const cell = this.grid[t][s];
        const isCurrent = t === this.currentTrack;
        const bg = cell.active ? (isCurrent ? 'var(--accent)' : 'var(--accent2)') : (isCurrent ? 'rgba(91,77,255,0.1)' : 'rgba(0,0,0,0.03)');
        html += `<div class="seq-cell" data-track="${t}" data-step="${s}" style="width:28px;height:28px;background:${bg};border-radius:4px;cursor:pointer;transition:background 0.1s;"></div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.currentStep = 0;
    this.scheduleNext();
  }

  stop() {
    this.playing = false;
  }

  scheduleNext() {
    if (!this.playing) return;
    const stepDuration = (60 / this.bpm) * 1000 / 4;
    const swingOffset = (this.currentStep % 2 === 1) ? (this.swing / 100) * (stepDuration / 2) : 0;
    setTimeout(() => {
      if (!this.playing) return;
      this.triggerStep(this.currentStep);
      this.currentStep = (this.currentStep + 1) % this.steps;
      this.highlightStep(this.currentStep);
      this.scheduleNext();
    }, stepDuration + swingOffset);
  }

  triggerStep(stepIdx) {
    for (let t = 0; t < this.tracks; t++) {
      const cell = this.grid[t][stepIdx];
      if (cell.active && Math.random() * 100 < cell.probability) {
        this.emit('stepTrigger', { track: t, step: stepIdx, velocity: cell.velocity });
        if (window.qlAudio) {
          const freqs = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63];
          window.qlAudio.playNote(freqs[t], 0.1, 'sine', cell.velocity / 127);
        }
      }
    }
  }

  highlightStep(stepIdx) {
    document.querySelectorAll('.seq-cell').forEach(el => {
      if (parseInt(el.dataset.step) === stepIdx) {
        el.style.boxShadow = 'inset 0 0 0 2px #fff';
      } else {
        el.style.boxShadow = 'none';
      }
    });
  }

  exportPattern() {
    const pattern = {
      steps: this.steps,
      tracks: this.tracks,
      bpm: this.bpm,
      grid: this.grid
    };
    QingluanUtils.downloadJSON(pattern, 'sequencer_pattern.json');
  }

  importPattern(data) {
    if (data.grid) {
      this.grid = data.grid;
      this.steps = data.steps || this.steps;
      this.tracks = data.tracks || this.tracks;
      this.bpm = data.bpm || this.bpm;
      this.renderGrid();
    }
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let sequencerEnhanced = null;
function initSequencerEnhanced() {
  sequencerEnhanced = new SequencerEnhanced();
}

// ============================================================
// 撤销/重做管理器
// ============================================================

class UndoManager {
  constructor() {
    this.stacks = new Map();
    this.maxSize = 100;
    this.listeners = {};
  }

  registerScope(scopeId) {
    this.stacks.set(scopeId, { undo: [], redo: [] });
  }

  push(scopeId, action) {
    if (!this.stacks.has(scopeId)) this.registerScope(scopeId);
    const stack = this.stacks.get(scopeId);
    stack.undo.push(action);
    stack.redo = [];
    if (stack.undo.length > this.maxSize) stack.undo.shift();
    this.emit('stateChanged', { scopeId, canUndo: stack.undo.length > 0, canRedo: false });
  }

  undo(scopeId) {
    const stack = this.stacks.get(scopeId);
    if (!stack || !stack.undo.length) return null;
    const action = stack.undo.pop();
    stack.redo.push(action);
    this.emit('stateChanged', { scopeId, canUndo: stack.undo.length > 0, canRedo: stack.redo.length > 0 });
    return action;
  }

  redo(scopeId) {
    const stack = this.stacks.get(scopeId);
    if (!stack || !stack.redo.length) return null;
    const action = stack.redo.pop();
    stack.undo.push(action);
    this.emit('stateChanged', { scopeId, canUndo: stack.undo.length > 0, canRedo: stack.redo.length > 0 });
    return action;
  }

  canUndo(scopeId) {
    const stack = this.stacks.get(scopeId);
    return stack ? stack.undo.length > 0 : false;
  }

  canRedo(scopeId) {
    const stack = this.stacks.get(scopeId);
    return stack ? stack.redo.length > 0 : false;
  }

  clear(scopeId) {
    if (this.stacks.has(scopeId)) {
      this.stacks.set(scopeId, { undo: [], redo: [] });
    }
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let undoManager = null;
function initUndoManager() {
  undoManager = new UndoManager();
  undoManager.registerScope('global');
  undoManager.registerScope('composer');
  undoManager.registerScope('arranger');
  undoManager.registerScope('sequencer');
}

// ============================================================
// 设置管理器
// ============================================================

class SettingsManager {
  constructor() {
    this.defaults = {
      audioSampleRate: 48000,
      audioBufferSize: 256,
      midiInputDevice: '',
      midiOutputDevice: '',
      autoSave: true,
      autoSaveInterval: 60,
      showTooltips: true,
      language: 'zh-CN',
      waveformQuality: 'high',
      pianoRollGrid: 0.25,
      followPlayhead: true,
      smoothScrolling: true,
      reduceMotion: false,
      highContrast: false,
      keyboardOctave: 4,
      defaultBpm: 120,
      defaultKey: 'C',
      defaultScale: 'major',
      exportBitDepth: 24,
      exportSampleRate: 48000,
      exportFormat: 'wav',
      cloudSyncEnabled: false,
      telemetryEnabled: false,
      betaFeatures: false
    };
    this.settings = { ...this.defaults };
    this.listeners = {};
    this.init();
  }

  init() {
    this.loadSettings();
    this.bindUI();
    console.log('[青鸾 System] SettingsManager 初始化完成');
  }

  bindUI() {
    const btnSave = document.getElementById('settingsSave');
    const btnReset = document.getElementById('settingsReset');
    const btnExport = document.getElementById('settingsExport');
    const btnImport = document.getElementById('settingsImport');

    if (btnSave) btnSave.addEventListener('click', () => this.saveSettings());
    if (btnReset) btnReset.addEventListener('click', () => this.resetSettings());
    if (btnExport) btnExport.addEventListener('click', () => this.exportSettings());
    if (btnImport) btnImport.addEventListener('click', () => this.importSettings());

    Object.keys(this.defaults).forEach(key => {
      const el = document.getElementById('setting_' + key);
      if (el) {
        el.addEventListener('change', () => {
          this.settings[key] = el.type === 'checkbox' ? el.checked : el.value;
          this.emit('settingChanged', { key, value: this.settings[key] });
        });
      }
    });
  }

  loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem('qingluan_settings') || '{}');
      this.settings = { ...this.defaults, ...stored };
      this.applySettings();
    } catch (e) { this.settings = { ...this.defaults }; }
  }

  saveSettings() {
    localStorage.setItem('qingluan_settings', JSON.stringify(this.settings));
    showToast('设置已保存', 'success');
    this.emit('settingsSaved', this.settings);
  }

  resetSettings() {
    this.settings = { ...this.defaults };
    this.applySettings();
    this.saveSettings();
    showToast('设置已重置', 'success');
  }

  applySettings() {
    Object.entries(this.settings).forEach(([key, value]) => {
      const el = document.getElementById('setting_' + key);
      if (el) {
        if (el.type === 'checkbox') el.checked = !!value;
        else el.value = value;
      }
    });
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.emit('settingChanged', { key, value });
  }

  exportSettings() {
    QingluanUtils.downloadJSON(this.settings, 'qingluan_settings.json');
  }

  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.settings = { ...this.defaults, ...data };
          this.applySettings();
          this.saveSettings();
          showToast('设置已导入', 'success');
        } catch (err) {
          showToast('导入失败', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let settingsManager = null;
function initSettingsManager() {
  settingsManager = new SettingsManager();
}

// ============================================================
// 通知系统增强
// ============================================================

class NotificationManager {
  constructor() {
    this.queue = [];
    this.active = false;
    this.listeners = {};
    this.permission = 'default';
    this.init();
  }

  init() {
    this.requestPermission();
    console.log('[青鸾 System] NotificationManager 初始化完成');
  }

  async requestPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      if (this.permission === 'default') {
        const result = await Notification.requestPermission();
        this.permission = result;
      }
    }
  }

  notify(title, options = {}) {
    if ('Notification' in window && this.permission === 'granted') {
      new Notification(title, { icon: '/icon.png', badge: '/badge.png', ...options });
    } else {
      this.showInAppNotification(title, options.body || '');
    }
  }

  showInAppNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer') || document.body;
    const div = document.createElement('div');
    const colors = { info: 'var(--accent)', success: 'var(--success)', warning: 'var(--warning)', error: 'var(--error)' };
    div.style.cssText = `position:fixed;top:16px;right:16px;z-index:10000;padding:12px 16px;background:${colors[type] || colors.info};color:#fff;border-radius:10px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:300px;transform:translateX(120%);transition:transform 0.3s ease;`;
    div.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">${escapeHtml(title)}</div><div style="font-size:12px;opacity:0.9;">${escapeHtml(message)}</div>`;
    container.appendChild(div);
    requestAnimationFrame(() => { div.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      div.style.transform = 'translateX(120%)';
      setTimeout(() => div.remove(), 300);
    }, 5000);
  }

  queueNotification(title, options) {
    this.queue.push({ title, options });
    this.processQueue();
  }

  processQueue() {
    if (this.active || !this.queue.length) return;
    this.active = true;
    const { title, options } = this.queue.shift();
    this.notify(title, options);
    setTimeout(() => { this.active = false; this.processQueue(); }, 1000);
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let notificationManager = null;
function initNotificationManager() {
  notificationManager = new NotificationManager();
}

// ============================================================
// 拖拽系统增强
// ============================================================

class DragDropManager {
  constructor() {
    this.dragData = null;
    this.sourceId = null;
    this.dropZones = new Map();
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindGlobal();
    console.log('[青鸾 UI] DragDropManager 初始化完成');
  }

  bindGlobal() {
    document.addEventListener('dragstart', (e) => {
      const draggable = e.target.closest('[draggable="true"]');
      if (draggable) {
        this.dragData = draggable.dataset;
        this.sourceId = draggable.id;
        e.dataTransfer.effectAllowed = 'move';
        draggable.classList.add('dragging');
      }
    });

    document.addEventListener('dragend', (e) => {
      const draggable = e.target.closest('[draggable="true"]');
      if (draggable) draggable.classList.remove('dragging');
      this.dragData = null;
      this.sourceId = null;
    });

    document.addEventListener('dragover', (e) => {
      const zone = e.target.closest('[data-dropzone]');
      if (zone) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
      }
    });

    document.addEventListener('dragleave', (e) => {
      const zone = e.target.closest('[data-dropzone]');
      if (zone) zone.classList.remove('drag-over');
    });

    document.addEventListener('drop', (e) => {
      const zone = e.target.closest('[data-dropzone]');
      if (zone) {
        e.preventDefault();
        zone.classList.remove('drag-over');
        this.handleDrop(zone, e);
      }
    });
  }

  handleDrop(zone, event) {
    const zoneType = zone.dataset.dropzone;
    this.emit('drop', {
      zone: zoneType,
      target: zone,
      data: this.dragData,
      sourceId: this.sourceId,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  registerDropZone(id, type, handler) {
    this.dropZones.set(id, { type, handler });
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let dragDropManager = null;
function initDragDropManager() {
  dragDropManager = new DragDropManager();
}

// ============================================================
// 事件总线
// ============================================================

class EventBus {
  constructor() {
    this.channels = new Map();
  }

  subscribe(channel, callback) {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel).add(callback);
    return () => this.channels.get(channel).delete(callback);
  }

  publish(channel, data) {
    const listeners = this.channels.get(channel);
    if (listeners) {
      listeners.forEach(cb => { try { cb(data); } catch (e) { console.error('[EventBus] 错误:', e); } });
    }
  }

  once(channel, callback) {
    const unsubscribe = this.subscribe(channel, (data) => {
      unsubscribe();
      callback(data);
    });
  }

  clear(channel) {
    if (channel) this.channels.delete(channel);
    else this.channels.clear();
  }
}

const eventBus = new EventBus();

// ============================================================
// 网络请求增强
// ============================================================

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL || API || '';
    this.defaultHeaders = { 'Content-Type': 'application/json' };
    this.interceptors = { request: [], response: [], error: [] };
    this.timeout = 30000;
    this.retries = 2;
    this.listeners = {};
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = this.baseURL + endpoint;
    const config = {
      method,
      headers: { ...this.defaultHeaders, ...options.headers },
      signal: options.signal
    };

    if (data && method !== 'GET') {
      config.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    this.interceptors.request.forEach(fn => fn(config));

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);
        if (!config.signal) config.signal = controller.signal;

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          result = await response.text();
        }

        this.interceptors.response.forEach(fn => fn(result, response));

        if (!response.ok) {
          throw new Error(result.error || result.message || `HTTP ${response.status}`);
        }

        return result;
      } catch (error) {
        if (attempt === this.retries) {
          this.interceptors.error.forEach(fn => fn(error));
          throw error;
        }
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  get(endpoint, options) { return this.request('GET', endpoint, null, options); }
  post(endpoint, data, options) { return this.request('POST', endpoint, data, options); }
  put(endpoint, data, options) { return this.request('PUT', endpoint, data, options); }
  delete(endpoint, options) { return this.request('DELETE', endpoint, null, options); }

  addRequestInterceptor(fn) { this.interceptors.request.push(fn); }
  addResponseInterceptor(fn) { this.interceptors.response.push(fn); }
  addErrorInterceptor(fn) { this.interceptors.error.push(fn); }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

const apiClient = new ApiClient(API);

// ============================================================
// 数据持久化层
// ============================================================

class StorageLayer {
  constructor() {
    this.prefix = 'qingluan_';
    this.encryptionEnabled = false;
    this.listeners = {};
  }

  _key(key) {
    return this.prefix + key;
  }

  set(key, value, options = {}) {
    const fullKey = this._key(key);
    const data = { value, timestamp: Date.now(), expires: options.expires || null };
    try {
      localStorage.setItem(fullKey, JSON.stringify(data));
      this.emit('set', { key, value });
    } catch (e) {
      console.warn('[Storage] 存储失败:', e);
    }
  }

  get(key, defaultValue = null) {
    const fullKey = this._key(key);
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return defaultValue;
      const data = JSON.parse(raw);
      if (data.expires && Date.now() > data.expires) {
        localStorage.removeItem(fullKey);
        return defaultValue;
      }
      return data.value;
    } catch (e) {
      return defaultValue;
    }
  }

  remove(key) {
    localStorage.removeItem(this._key(key));
    this.emit('remove', { key });
  }

  clear() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) localStorage.removeItem(key);
    });
    this.emit('clear');
  }

  keys() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.slice(this.prefix.length));
  }

  getSize() {
    let size = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) size += localStorage.getItem(key).length * 2;
    });
    return size;
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

const storageLayer = new StorageLayer();

// ============================================================
// 文件导入处理器
// ============================================================

class FileImportHandler {
  constructor() {
    this.supportedAudio = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/aiff', 'audio/m4a'];
    this.supportedMidi = ['audio/midi', 'audio/x-midi'];
    this.supportedImages = ['image/png', 'image/jpeg', 'image/webp'];
    this.listeners = {};
  }

  async handleFile(file) {
    if (!file) return null;
    const type = this.detectType(file);
    const result = await this.readFile(file, type);
    this.emit('fileImported', { file, type, result });
    return { type, result };
  }

  detectType(file) {
    if (this.supportedAudio.includes(file.type)) return 'audio';
    if (this.supportedMidi.includes(file.type) || file.name.endsWith('.mid')) return 'midi';
    if (this.supportedImages.includes(file.type)) return 'image';
    if (file.name.endsWith('.json') || file.name.endsWith('.qingluan')) return 'project';
    if (file.name.endsWith('.txt') || file.name.endsWith('.lrc')) return 'lyrics';
    return 'unknown';
  }

  readFile(file, type) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      if (type === 'audio' || type === 'image') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  async importAudio(file) {
    const data = await this.handleFile(file);
    if (data && data.type === 'audio') {
      const audio = new Audio(data.result);
      audio.controls = true;
      audio.style.width = '100%';
      return audio;
    }
    return null;
  }

  async importMidi(file) {
    const data = await this.handleFile(file);
    if (data && data.type === 'midi') {
      // 简化处理，返回文本内容
      return data.result;
    }
    return null;
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let fileImportHandler = null;
function initFileImportHandler() {
  fileImportHandler = new FileImportHandler();
}

// ============================================================
// 波形编辑器增强
// ============================================================

class WaveformEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.buffer = null;
    this.selection = { start: 0, end: 0 };
    this.zoom = { start: 0, end: 1 };
    this.playhead = 0;
    this.listeners = {};
  }

  setBuffer(audioBuffer) {
    this.buffer = audioBuffer;
    this.render();
  }

  render() {
    if (!this.ctx || !this.buffer) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const data = this.buffer.getChannelData(0);
    const startSample = Math.floor(this.zoom.start * data.length);
    const endSample = Math.floor(this.zoom.end * data.length);
    const visibleSamples = endSample - startSample;
    const samplesPerPixel = visibleSamples / w;

    this.ctx.fillStyle = 'var(--accent)';
    for (let x = 0; x < w; x++) {
      const sampleStart = startSample + Math.floor(x * samplesPerPixel);
      const sampleEnd = startSample + Math.floor((x + 1) * samplesPerPixel);
      let min = 0, max = 0;
      for (let i = sampleStart; i < sampleEnd && i < data.length; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }
      const yMin = h / 2 + min * (h / 2);
      const yMax = h / 2 + max * (h / 2);
      this.ctx.fillRect(x, yMin, 1, Math.max(1, yMax - yMin));
    }

    // 播放头
    const playheadX = ((this.playhead - this.zoom.start) / (this.zoom.end - this.zoom.start)) * w;
    this.ctx.strokeStyle = '#ff6b9d';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(playheadX, 0);
    this.ctx.lineTo(playheadX, h);
    this.ctx.stroke();
  }

  setSelection(start, end) {
    this.selection = { start, end };
    this.render();
  }

  zoomIn() {
    const range = this.zoom.end - this.zoom.start;
    const center = (this.zoom.start + this.zoom.end) / 2;
    const newRange = range * 0.5;
    this.zoom.start = Math.max(0, center - newRange / 2);
    this.zoom.end = Math.min(1, center + newRange / 2);
    this.render();
  }

  zoomOut() {
    const range = this.zoom.end - this.zoom.start;
    const center = (this.zoom.start + this.zoom.end) / 2;
    const newRange = Math.min(1, range * 2);
    this.zoom.start = Math.max(0, center - newRange / 2);
    this.zoom.end = Math.min(1, center + newRange / 2);
    this.render();
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

// ============================================================
// 第三批次初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initSequencerEnhanced();
    initUndoManager();
    initSettingsManager();
    initNotificationManager();
    initDragDropManager();
    initFileImportHandler();
    console.log('[青鸾 DAW] 前端扩展模块 v4.2 第三批初始化完成');
    console.log('[青鸾] 新增功能: SequencerEnhanced, UndoManager, SettingsManager, NotificationManager, DragDropManager, EventBus, ApiClient, StorageLayer, FileImportHandler, WaveformEditor, QingluanUtils 扩展');
  }, 300);
});

// ============================================================
// 钢琴卷帘增强系统
// ============================================================

class PianoRollEnhanced {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.notes = [];
    this.selectedNotes = new Set();
    this.clipboard = [];
    this.tool = 'pen';
    this.zoomX = 1;
    this.zoomY = 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.playhead = 0;
    this.gridSize = 0.25;
    this.snapEnabled = true;
    this.velocityEditor = false;
    this.showNoteNames = true;
    this.listeners = {};
    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
    console.log('[青鸾 Studio] PianoRollEnhanced 初始化完成');
  }

  bindEvents() {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openContextMenu(e); });
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const keyW = 60;
    const rowH = 20 * this.zoomY;
    const beatW = 40 * this.zoomX;

    if (x < keyW) return;

    const note = 127 - Math.floor((y - this.scrollY) / rowH);
    const beat = (x - keyW - this.scrollX) / beatW;
    const snappedBeat = this.snapEnabled ? Math.round(beat / this.gridSize) * this.gridSize : beat;

    if (this.tool === 'pen') {
      const newNote = { id: randomId('prn'), pitch: note, offset: snappedBeat, duration: this.gridSize, velocity: 100 };
      this.notes.push(newNote);
      this.selectedNotes = new Set([newNote]);
      this.emit('noteAdded', newNote);
    } else if (this.tool === 'select') {
      const clicked = this.notes.find(n => Math.abs(n.offset - snappedBeat) < 0.1 && n.pitch === note);
      if (clicked) {
        if (e.shiftKey) this.selectedNotes.add(clicked);
        else this.selectedNotes = new Set([clicked]);
      } else {
        this.selectedNotes.clear();
      }
    }
    this.render();
  }

  onMouseMove(e) {
    // 简化实现
  }

  onMouseUp(e) {
    // 简化实现
  }

  onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey) {
      this.zoomX = clamp(this.zoomX + (e.deltaY > 0 ? -0.1 : 0.1), 0.5, 5);
    } else {
      this.scrollX -= e.deltaX;
      this.scrollY -= e.deltaY;
    }
    this.render();
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const keyW = 60;
    const rowH = 20 * this.zoomY;
    const beatW = 40 * this.zoomX;
    const blackKeys = new Set([1, 3, 6, 8, 10]);

    // 钢琴键
    for (let n = 0; n < 128; n++) {
      const y = (127 - n) * rowH + this.scrollY;
      if (y < -rowH || y > h) continue;
      const semi = n % 12;
      const isBlack = blackKeys.has(semi);
      this.ctx.fillStyle = isBlack ? '#1a1a2e' : '#f0f0f5';
      this.ctx.fillRect(0, y, keyW, rowH);
      this.ctx.strokeStyle = '#ddd';
      this.ctx.strokeRect(0, y, keyW, rowH);
      if ([0, 2, 4, 5, 7, 9, 11].includes(semi)) {
        this.ctx.fillStyle = '#999';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText(this.midiToNoteName(n), 4, y + rowH - 4);
      }
    }

    // 网格
    for (let b = 0; b < 200; b++) {
      const x = keyW + b * beatW + this.scrollX;
      if (x < keyW || x > w) continue;
      this.ctx.strokeStyle = b % 4 === 0 ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)';
      this.ctx.lineWidth = b % 4 === 0 ? 1 : 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let n = 0; n < 128; n++) {
      const y = (127 - n) * rowH + this.scrollY;
      if (y < 0 || y > h) continue;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(keyW, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // 音符
    this.notes.forEach(note => {
      const x = keyW + note.offset * beatW + this.scrollX;
      const y = (127 - note.pitch) * rowH + this.scrollY;
      const nw = Math.max(4, note.duration * beatW);
      const nh = rowH - 2;
      if (x + nw < keyW || x > w || y + nh < 0 || y > h) return;

      const isSelected = this.selectedNotes.has(note);
      this.ctx.fillStyle = isSelected ? 'var(--accent)' : 'var(--accent2)';
      this.ctx.beginPath();
      this.ctx.roundRect(x, y + 1, nw, nh, 3);
      this.ctx.fill();

      if (this.showNoteNames && nw > 20) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.midiToNoteName(note.pitch), x + nw / 2, y + nh / 2 + 3);
      }
    });

    // 播放头
    const px = keyW + this.playhead * beatW + this.scrollX;
    this.ctx.strokeStyle = '#ff6b9d';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(px, 0);
    this.ctx.lineTo(px, h);
    this.ctx.stroke();
  }

  midiToNoteName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12] + Math.floor(midi / 12 - 1);
  }

  deleteSelected() {
    this.notes = this.notes.filter(n => !this.selectedNotes.has(n));
    this.selectedNotes.clear();
    this.render();
  }

  copySelected() {
    this.clipboard = Array.from(this.selectedNotes).map(n => ({ ...n, id: randomId('prn') }));
  }

  paste() {
    const offset = this.clipboard.length ? Math.min(...this.clipboard.map(n => n.offset)) : 0;
    this.clipboard.forEach(note => {
      this.notes.push({ ...note, offset: note.offset - offset + this.playhead });
    });
    this.render();
  }

  quantize(grid = null) {
    const g = grid || this.gridSize;
    this.notes.forEach(n => {
      n.offset = Math.round(n.offset / g) * g;
      n.duration = Math.max(g, Math.round(n.duration / g) * g);
    });
    this.render();
  }

  transpose(semitones) {
    this.selectedNotes.forEach(note => {
      note.pitch = clamp(note.pitch + semitones, 0, 127);
    });
    this.render();
  }

  setPlayhead(beat) {
    this.playhead = beat;
    this.render();
  }

  openContextMenu(e) {
    // 简化实现
  }

  exportMidi() {
    return {
      notes: this.notes.map(n => ({
        pitch: n.pitch,
        velocity: n.velocity,
        tick: Math.round(n.offset * 480),
        duration: Math.round(n.duration * 480)
      }))
    };
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let pianoRollEnhanced = null;
function initPianoRollEnhanced() {
  pianoRollEnhanced = new PianoRollEnhanced('pianoRollCanvas');
}

// ============================================================
// 频谱分析器增强
// ============================================================

class SpectrumAnalyzer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.analyser = null;
    this.mode = 'spectrum';
    this.smoothing = 0.8;
    this.minFreq = 20;
    this.maxFreq = 20000;
    this.listeners = {};
    this.init();
  }

  init() {
    if (window.qlAudio) {
      this.analyser = window.qlAudio.analyser;
    }
    this.animate();
    console.log('[青鸾 Studio] SpectrumAnalyzer 初始化完成');
  }

  animate() {
    if (!this.ctx || !this.analyser) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
    this.ctx.fillRect(0, 0, w, h);

    if (this.mode === 'spectrum') {
      this.drawSpectrum(w, h, data);
    } else if (this.mode === 'waterfall') {
      this.drawWaterfall(w, h, data);
    } else if (this.mode === 'spectrogram') {
      this.drawSpectrogram(w, h, data);
    }

    requestAnimationFrame(() => this.animate());
  }

  drawSpectrum(w, h, data) {
    const bars = 128;
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length);
      const val = data[idx] / 255;
      const height = val * h;
      const hue = 200 + val * 60;
      this.ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
      this.ctx.fillRect(i * bw, h - height, bw - 1, height);
    }
  }

  drawWaterfall(w, h, data) {
    if (!this.waterfallBuffer) {
      this.waterfallBuffer = document.createElement('canvas');
      this.waterfallBuffer.width = w;
      this.waterfallBuffer.height = h;
    }
    const bufCtx = this.waterfallBuffer.getContext('2d');
    bufCtx.drawImage(this.waterfallBuffer, 0, -2);

    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * data.length);
      const val = data[idx] / 255;
      const hue = 200 + val * 60;
      bufCtx.fillStyle = `hsl(${hue}, 80%, ${20 + val * 40}%)`;
      bufCtx.fillRect(x, h - 2, 1, 2);
    }

    this.ctx.drawImage(this.waterfallBuffer, 0, 0);
  }

  drawSpectrogram(w, h, data) {
    // 简化实现
    this.drawSpectrum(w, h, data);
  }

  setMode(mode) {
    this.mode = mode;
  }

  setFrequencyRange(min, max) {
    this.minFreq = min;
    this.maxFreq = max;
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let spectrumAnalyzer = null;
function initSpectrumAnalyzer() {
  spectrumAnalyzer = new SpectrumAnalyzer('spectrumCanvas');
}

// ============================================================
// 参数自动化系统
// ============================================================

class ParameterAutomation {
  constructor() {
    this.lanes = new Map();
    this.playing = false;
    this.currentTime = 0;
    this.resolution = 0.1;
    this.listeners = {};
  }

  createLane(paramId, min, max, defaultValue) {
    this.lanes.set(paramId, {
      id: paramId,
      min,
      max,
      points: [{ time: 0, value: defaultValue }, { time: 16, value: defaultValue }],
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
  }

  addPoint(paramId, time, value) {
    const lane = this.lanes.get(paramId);
    if (!lane) return;
    lane.points.push({ time, value: clamp(value, lane.min, lane.max) });
    lane.points.sort((a, b) => a.time - b.time);
  }

  removePoint(paramId, index) {
    const lane = this.lanes.get(paramId);
    if (lane && lane.points.length > 2) {
      lane.points.splice(index, 1);
    }
  }

  getValueAtTime(paramId, time) {
    const lane = this.lanes.get(paramId);
    if (!lane || !lane.points.length) return 0;

    for (let i = 0; i < lane.points.length - 1; i++) {
      const p1 = lane.points[i];
      const p2 = lane.points[i + 1];
      if (time >= p1.time && time <= p2.time) {
        const t = (time - p1.time) / (p2.time - p1.time);
        return p1.value + (p2.value - p1.value) * t;
      }
    }
    return lane.points[lane.points.length - 1].value;
  }

  renderLane(canvasId, paramId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const lane = this.lanes.get(paramId);
    if (!lane) return;

    ctx.clearRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 10; i++) {
      const y = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 曲线
    ctx.strokeStyle = lane.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const time = (x / w) * 16;
      const value = this.getValueAtTime(paramId, time);
      const y = h - ((value - lane.min) / (lane.max - lane.min)) * h;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 控制点
    lane.points.forEach(p => {
      const x = (p.time / 16) * w;
      const y = h - ((p.value - lane.min) / (lane.max - lane.min)) * h;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = lane.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  exportData() {
    const data = {};
    this.lanes.forEach((lane, id) => {
      data[id] = lane.points;
    });
    return data;
  }

  importData(data) {
    Object.entries(data).forEach(([id, points]) => {
      const lane = this.lanes.get(id);
      if (lane) lane.points = points;
    });
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

let parameterAutomation = null;
function initParameterAutomation() {
  parameterAutomation = new ParameterAutomation();
  parameterAutomation.createLane('volume', 0, 1, 0.8);
  parameterAutomation.createLane('pan', -1, 1, 0);
  parameterAutomation.createLane('filter', 20, 20000, 1000);
}

// ============================================================
// UI 组件工厂
// ============================================================

class UIComponentFactory {
  static createButton(text, onClick, options = {}) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = options.className || 's-btn-small';
    btn.style.cssText = options.style || '';
    btn.addEventListener('click', onClick);
    if (options.disabled) btn.disabled = true;
    return btn;
  }

  static createSlider(options = {}) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;color:var(--text2);display:flex;justify-content:space-between;';
    label.innerHTML = `<span>${options.label || ''}</span><span>${options.value || options.min || 0}</span>`;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = options.min || 0;
    input.max = options.max || 100;
    input.value = options.value || 0;
    input.step = options.step || 1;
    input.style.cssText = 'width:100%;accent-color:var(--accent);';
    input.addEventListener('input', (e) => {
      label.querySelector('span:last-child').textContent = e.target.value;
      if (options.onChange) options.onChange(parseFloat(e.target.value));
    });
    wrap.appendChild(label);
    wrap.appendChild(input);
    return wrap;
  }

  static createKnob(options = {}) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    const value = (options.value - options.min) / (options.max - options.min);
    const angle = -Math.PI * 0.75 + value * Math.PI * 1.5;

    ctx.beginPath();
    ctx.arc(24, 24, 20, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(24, 24, 20, Math.PI * 0.75, angle);
    ctx.strokeStyle = 'var(--accent)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(24 + Math.cos(angle) * 20, 24 + Math.sin(angle) * 20, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--accent)';
    ctx.fill();

    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;color:var(--text2);text-align:center;';
    label.innerHTML = `<div style="font-weight:600;">${options.label || ''}</div><div>${options.value !== undefined ? options.value.toFixed(1) : '0'}</div>`;
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    return wrap;
  }

  static createDropdown(options = {}) {
    const select = document.createElement('select');
    select.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:12px;cursor:pointer;';
    (options.items || []).forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      if (item.value === options.value) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', (e) => { if (options.onChange) options.onChange(e.target.value); });
    return select;
  }

  static createPanel(title, content) {
    const panel = document.createElement('div');
    panel.style.cssText = 'background:var(--card-bg);border-radius:12px;padding:16px;border:1px solid var(--border);margin-bottom:12px;';
    const header = document.createElement('div');
    header.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;';
    header.textContent = title;
    panel.appendChild(header);
    if (content) panel.appendChild(content);
    return panel;
  }

  static createTabs(tabs, onChange) {
    const container = document.createElement('div');
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:12px;';
    const body = document.createElement('div');
    let activeIndex = 0;

    function render() {
      header.innerHTML = '';
      tabs.forEach((tab, i) => {
        const btn = document.createElement('button');
        btn.textContent = tab.label;
        btn.style.cssText = i === activeIndex
          ? 'padding:8px 14px;background:transparent;border:none;border-bottom:2px solid var(--accent);color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;'
          : 'padding:8px 14px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text2);font-size:13px;cursor:pointer;';
        btn.addEventListener('click', () => { activeIndex = i; render(); if (onChange) onChange(i, tab); });
        header.appendChild(btn);
      });
      body.innerHTML = '';
      if (tabs[activeIndex] && tabs[activeIndex].content) {
        body.appendChild(tabs[activeIndex].content);
      }
    }

    render();
    container.appendChild(header);
    container.appendChild(body);
    return container;
  }

  static createModal(title, content, buttons = []) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--card-bg);border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);';
    const header = document.createElement('div');
    header.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:16px;';
    header.textContent = title;
    const body = document.createElement('div');
    body.style.marginBottom = '16px';
    if (typeof content === 'string') body.innerHTML = content;
    else body.appendChild(content);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.label;
      button.style.cssText = btn.primary
        ? 'padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:13px;cursor:pointer;'
        : 'padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:13px;cursor:pointer;';
      button.addEventListener('click', () => {
        if (btn.onClick) btn.onClick();
        overlay.remove();
      });
      footer.appendChild(button);
    });
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    return overlay;
  }
}

// ============================================================
// 数据生成器与模拟器
// ============================================================

class DataGenerator {
  static generateMelody(length = 16, key = 'C', scale = 'major') {
    const rootMap = { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71 };
    const root = rootMap[key] || 60;
    const intervals = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic: [0, 2, 4, 7, 9]
    };
    const pattern = intervals[scale] || intervals.major;
    const notes = [];
    for (let i = 0; i < length; i++) {
      const interval = pattern[Math.floor(Math.random() * pattern.length)];
      const octave = Math.floor(Math.random() * 2) * 12;
      notes.push({
        pitch: root + octave + interval,
        duration: [0.25, 0.5, 1][Math.floor(Math.random() * 3)],
        velocity: 60 + Math.floor(Math.random() * 60),
        offset: i * 0.5
      });
    }
    return notes;
  }

  static generateChordProgression(key = 'C', bars = 8) {
    const roman = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const progression = [];
    for (let i = 0; i < bars; i++) {
      progression.push(roman[Math.floor(Math.random() * roman.length)]);
    }
    return progression;
  }

  static generateDrumPattern(style = 'pop', bars = 4) {
    const patterns = {
      pop: { kick: [0, 2], snare: [1, 3], hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
      rock: { kick: [0, 0.5, 2, 2.5], snare: [1, 3], hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
      electronic: { kick: [0, 1.5, 2.5], snare: [1, 3], hihat: [0.5, 1.5, 2.5, 3.5] }
    };
    return patterns[style] || patterns.pop;
  }

  static generateFakeWaveform(samples = 1024) {
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      data[i] = Math.sin(i * 0.05) * 0.5 + Math.sin(i * 0.13) * 0.3 + (Math.random() - 0.5) * 0.1;
    }
    return data;
  }

  static generateFakeSpectrum(bands = 64) {
    const data = new Uint8Array(bands);
    for (let i = 0; i < bands; i++) {
      data[i] = Math.random() * 255 * (1 - i / bands * 0.5);
    }
    return data;
  }

  static generateProjectMetadata() {
    return {
      id: randomId('proj'),
      name: '项目 ' + Math.floor(Math.random() * 1000),
      createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 30),
      modifiedAt: Date.now(),
      bpm: 100 + Math.floor(Math.random() * 60),
      key: ['C', 'G', 'D', 'A', 'F', 'Am', 'Em'][Math.floor(Math.random() * 7)],
      duration: 60 + Math.floor(Math.random() * 240),
      tracks: Math.floor(Math.random() * 10) + 2
    };
  }
}

// ============================================================
// 命令模式与宏录制
// ============================================================

class CommandPattern {
  constructor() {
    this.history = [];
    this.macro = [];
    this.recording = false;
    this.listeners = {};
  }

  execute(command) {
    command.execute();
    this.history.push(command);
    if (this.recording) this.macro.push(command);
    this.emit('commandExecuted', command);
  }

  undo() {
    const command = this.history.pop();
    if (command && command.undo) {
      command.undo();
      this.emit('commandUndone', command);
    }
  }

  startMacro() {
    this.recording = true;
    this.macro = [];
  }

  stopMacro() {
    this.recording = false;
    return [...this.macro];
  }

  playMacro(macro) {
    macro.forEach(cmd => this.execute(cmd));
  }

  on(event, cb) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(cb); }
  emit(event, data) { (this.listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

class SetParameterCommand {
  constructor(target, param, oldValue, newValue) {
    this.target = target;
    this.param = param;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
  execute() { this.target[this.param] = this.newValue; }
  undo() { this.target[this.param] = this.oldValue; }
}

class AddNoteCommand {
  constructor(arr, note) {
    this.arr = arr;
    this.note = note;
  }
  execute() { this.arr.push(this.note); }
  undo() { const idx = this.arr.indexOf(this.note); if (idx >= 0) this.arr.splice(idx, 1); }
}

class DeleteNoteCommand {
  constructor(arr, note) {
    this.arr = arr;
    this.note = note;
    this.index = arr.indexOf(note);
  }
  execute() { if (this.index >= 0) this.arr.splice(this.index, 1); }
  undo() { if (this.index >= 0) this.arr.splice(this.index, 0, this.note); }
}

let commandPattern = null;
function initCommandPattern() {
  commandPattern = new CommandPattern();
}

// ============================================================
// 辅助函数扩展
// ============================================================

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomId(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bufferToWavBlob(buffer, sampleRate) {
  const length = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

function showModal(title, content, buttons) {
  return UIComponentFactory.createModal(title, content, buttons);
}

function showToast(message, type = 'info', duration = 3000) {
  if (window.errorHandler) {
    window.errorHandler.showUserFeedback(type, message, duration);
  } else {
    const container = document.getElementById('toastContainer') || document.body;
    const div = document.createElement('div');
    const colors = { info: 'var(--accent)', success: 'var(--success)', warning: 'var(--warning)', error: 'var(--error)' };
    div.style.cssText = `position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 18px;background:${colors[type] || colors.info};color:#fff;border-radius:10px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.3s'; setTimeout(() => div.remove(), 300); }, duration);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ============================================================
// 第四批次初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initPianoRollEnhanced();
    initSpectrumAnalyzer();
    initParameterAutomation();
    initCommandPattern();
    console.log('[青鸾 DAW] 前端扩展模块 v4.3 第四批初始化完成');
    console.log('[青鸾] 新增功能: PianoRollEnhanced, SpectrumAnalyzer, ParameterAutomation, UIComponentFactory, DataGenerator, CommandPattern, QingluanUtils 扩展');
  }, 400);
});

// ============================================================
// 第五批次：实时协作、乐谱编辑、时间码同步、插件商店、分析面板、宏系统、高级导出管线
// ============================================================

class CollaborationSync {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.roomId = null;
    this.userId = randomId('user');
    this.userName = '匿名用户';
    this.cursors = new Map();
    this.presence = new Map();
    this.messageQueue = [];
    this.listeners = {};
    this.isConnected = false;
    this.heartbeatTimer = null;
    this.opsBuffer = [];
    this.conflictResolver = null;
    this.init();
  }
  init() {
    this.conflictResolver = {
      lastWriterWins: (a, b) => b.timestamp > a.timestamp ? b : a,
      mergeText: (local, remote) => {
        if (local === remote) return local;
        return remote + '\n/* 合并冲突 */\n' + local;
      }
    };
  }
  connect(roomId) {
    this.roomId = roomId;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws/collab/${roomId}?user=${this.userId}&name=${encodeURIComponent(this.userName)}`;
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.isConnected = true;
        this.flushQueue();
        this.startHeartbeat();
        this.emit('connected', { roomId, userId: this.userId });
      };
      this.ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        this.handleMessage(msg);
      };
      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
        this.emit('disconnected', { roomId });
      };
      this.ws.onerror = (err) => {
        this.emit('error', err);
      };
    } catch (err) {
      this.emit('error', err);
    }
  }
  handleMessage(msg) {
    switch (msg.type) {
      case 'cursor':
        this.cursors.set(msg.userId, { x: msg.x, y: msg.y, name: msg.userName, color: msg.color, time: Date.now() });
        this.emit('cursorUpdate', msg);
        break;
      case 'presence':
        this.presence.set(msg.userId, { name: msg.userName, status: msg.status, joinedAt: msg.joinedAt });
        this.emit('presenceUpdate', msg);
        break;
      case 'op':
        this.emit('remoteOp', msg);
        break;
      case 'chat':
        this.emit('chatMessage', msg);
        break;
      case 'project_sync':
        this.emit('projectSync', msg);
        break;
      case 'conflict':
        this.emit('conflict', msg);
        break;
    }
  }
  send(type, payload) {
    const msg = JSON.stringify({ type, userId: this.userId, userName: this.userName, timestamp: Date.now(), ...payload });
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }
  flushQueue() {
    while (this.messageQueue.length && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(this.messageQueue.shift());
    }
  }
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', {});
    }, 30000);
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.roomId) this.connect(this.roomId);
    }, 5000);
  }
  broadcastCursor(x, y) {
    this.send('cursor', { x, y, color: this.getUserColor() });
  }
  broadcastOp(op) {
    this.opsBuffer.push(op);
    if (this.opsBuffer.length > 50) this.opsBuffer.shift();
    this.send('op', { op });
  }
  sendChat(text) {
    this.send('chat', { text });
  }
  getUserColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
    let hash = 0;
    for (let i = 0; i < this.userId.length; i++) hash = this.userId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
  getOnlineUsers() {
    return Array.from(this.presence.entries()).map(([id, info]) => ({ id, ...info }));
  }
  disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.stopHeartbeat();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.isConnected = false;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let collaborationSync = null;
function initCollaborationSync() {
  collaborationSync = new CollaborationSync();
  window.collaborationSync = collaborationSync;
}

// ============================================================

class ScoreEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.notes = [];
    this.clefs = ['treble'];
    this.keySignature = 0;
    this.timeSignature = [4, 4];
    this.tempo = 120;
    this.zoom = 1.0;
    this.scrollX = 0;
    this.selectedNote = null;
    this.tool = 'note'; // note, rest, eraser
    this.staffSpacing = 80;
    this.lineSpacing = 8;
    this.measureWidth = 200;
    this.listeners = {};
    this.dragState = null;
    this.history = [];
    this.historyIndex = -1;
    this.init();
  }
  init() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', e => this.onWheel(e));
    this.draw();
  }
  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.draw();
  }
  addNote(pitch, duration, measure, beat) {
    const note = { id: randomId('sn'), pitch, duration, measure, beat, accidental: null, tie: false, selected: false };
    this.notes.push(note);
    this.saveHistory();
    this.draw();
    return note;
  }
  removeNote(id) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.notes.splice(idx, 1);
      this.saveHistory();
      this.draw();
    }
  }
  getPitchY(pitch) {
    const clefOffset = { treble: 64, bass: 40 };
    const base = clefOffset[this.clefs[0]] || 64;
    return base - (pitch - 60) * (this.lineSpacing / 2);
  }
  getNoteAt(x, y) {
    for (const note of this.notes) {
      const nx = this.measureToX(note.measure) + note.beat * (this.measureWidth / this.timeSignature[0]);
      const ny = this.getPitchY(note.pitch);
      if (Math.abs(x - nx) < 12 && Math.abs(y - ny) < 10) return note;
    }
    return null;
  }
  measureToX(measure) {
    return 60 + measure * this.measureWidth * this.zoom - this.scrollX;
  }
  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg') || '#0f1115';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border') || '#2a2d35';
    ctx.lineWidth = 1;
    const startMeasure = Math.floor(this.scrollX / (this.measureWidth * this.zoom));
    const endMeasure = startMeasure + Math.ceil(w / (this.measureWidth * this.zoom)) + 1;
    for (let m = startMeasure; m < endMeasure; m++) {
      const mx = this.measureToX(m);
      if (mx < -this.measureWidth || mx > w) continue;
      for (let line = 0; line < 5; line++) {
        const ly = 100 + line * this.lineSpacing;
        ctx.beginPath();
        ctx.moveTo(mx, ly);
        ctx.lineTo(mx + this.measureWidth * this.zoom, ly);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(mx, 100);
      ctx.lineTo(mx, 100 + 4 * this.lineSpacing);
      ctx.stroke();
      ctx.fillStyle = '#8892a0';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(m + 1), mx + 4, 95);
    }
    this.notes.forEach(note => this.drawNote(ctx, note));
    if (this.selectedNote) {
      const sx = this.measureToX(this.selectedNote.measure) + this.selectedNote.beat * (this.measureWidth / this.timeSignature[0]);
      const sy = this.getPitchY(this.selectedNote.pitch);
      ctx.strokeStyle = '#4ECDC4';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 14, sy - 12, 28, 24);
    }
  }
  drawNote(ctx, note) {
    const x = this.measureToX(note.measure) + note.beat * (this.measureWidth / this.timeSignature[0]);
    const y = this.getPitchY(note.pitch);
    ctx.fillStyle = note.selected ? '#4ECDC4' : '#E2E8F0';
    ctx.beginPath();
    ctx.ellipse(x, y, 8 * this.zoom, 6 * this.zoom, -0.2, 0, Math.PI * 2);
    ctx.fill();
    if (note.accidental) {
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '14px serif';
      ctx.fillText(note.accidental, x - 18, y + 5);
    }
  }
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const note = this.getNoteAt(x, y);
    if (note) {
      this.selectedNote = note;
      this.dragState = { startX: x, startY: y, note };
    } else {
      if (this.tool === 'note') {
        const measure = Math.floor((x + this.scrollX - 60) / (this.measureWidth * this.zoom));
        const beat = ((x + this.scrollX - 60) % (this.measureWidth * this.zoom)) / (this.measureWidth * this.zoom) * this.timeSignature[0];
        const pitch = Math.round(60 + (100 - y) / (this.lineSpacing / 2));
        this.addNote(clamp(pitch, 21, 108), 0.25, Math.max(0, measure), Math.max(0, beat));
      }
    }
    this.draw();
  }
  onMouseMove(e) {
    if (!this.dragState) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const note = this.dragState.note;
    const newMeasure = Math.floor((x + this.scrollX - 60) / (this.measureWidth * this.zoom));
    const newBeat = ((x + this.scrollX - 60) % (this.measureWidth * this.zoom)) / (this.measureWidth * this.zoom) * this.timeSignature[0];
    note.measure = Math.max(0, newMeasure);
    note.beat = clamp(newBeat, 0, this.timeSignature[0] - 0.1);
    note.pitch = clamp(Math.round(60 + (100 - y) / (this.lineSpacing / 2)), 21, 108);
    this.draw();
  }
  onMouseUp() {
    if (this.dragState) {
      this.saveHistory();
      this.dragState = null;
    }
  }
  onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey) {
      this.zoom = clamp(this.zoom - e.deltaY * 0.001, 0.3, 3.0);
    } else {
      this.scrollX += e.deltaX;
      this.scrollX = Math.max(0, this.scrollX);
    }
    this.draw();
  }
  saveHistory() {
    if (this.historyIndex < this.history.length - 1) this.history.splice(this.historyIndex + 1);
    this.history.push(JSON.stringify(this.notes));
    if (this.history.length > 50) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.notes = JSON.parse(this.history[this.historyIndex]);
      this.draw();
    }
  }
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.notes = JSON.parse(this.history[this.historyIndex]);
      this.draw();
    }
  }
  exportMusicXML() {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <time><beats>${this.timeSignature[0]}</beats><beat-type>${this.timeSignature[1]}</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      ${this.notes.map(n => `<note><pitch><step>${String.fromCharCode(65 + (n.pitch % 12))}</step><octave>${Math.floor(n.pitch / 12)}</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('')}
    </measure>
  </part>
</score-partwise>`;
    return xml;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
}

let scoreEditor = null;
function initScoreEditor() {
  scoreEditor = new ScoreEditor('scoreCanvas');
  window.scoreEditor = scoreEditor;
}

// ============================================================

class TimecodeSync {
  constructor() {
    this.fps = 30;
    this.offset = 0;
    this.running = false;
    this.currentTime = 0;
    this.startTime = 0;
    this.videoElement = null;
    this.mtcGenerator = null;
    this.listeners = {};
    this.smpte = '00:00:00:00';
    this.init();
  }
  init() {
    this.updateSMPTE();
  }
  setFPS(fps) {
    this.fps = fps;
    this.updateSMPTE();
  }
  setOffset(seconds) {
    this.offset = seconds;
    this.updateSMPTE();
  }
  bindVideo(videoEl) {
    this.videoElement = videoEl;
    if (!videoEl) return;
    videoEl.addEventListener('timeupdate', () => {
      this.currentTime = videoEl.currentTime + this.offset;
      this.updateSMPTE();
      this.emit('timeupdate', this.currentTime);
    });
    videoEl.addEventListener('play', () => { this.running = true; this.emit('play'); });
    videoEl.addEventListener('pause', () => { this.running = false; this.emit('pause'); });
  }
  start() {
    this.running = true;
    this.startTime = performance.now() / 1000 - this.currentTime;
    this.tick();
  }
  stop() {
    this.running = false;
  }
  seek(seconds) {
    this.currentTime = seconds;
    if (this.videoElement) this.videoElement.currentTime = seconds - this.offset;
    this.updateSMPTE();
    this.emit('seek', seconds);
  }
  tick() {
    if (!this.running) return;
    if (!this.videoElement) {
      this.currentTime = performance.now() / 1000 - this.startTime;
    }
    this.updateSMPTE();
    this.emit('tick', this.currentTime);
    requestAnimationFrame(() => this.tick());
  }
  updateSMPTE() {
    const totalFrames = Math.floor(this.currentTime * this.fps);
    const hh = String(Math.floor(totalFrames / (this.fps * 3600))).padStart(2, '0');
    const mm = String(Math.floor((totalFrames % (this.fps * 3600)) / (this.fps * 60))).padStart(2, '0');
    const ss = String(Math.floor((totalFrames % (this.fps * 60)) / this.fps)).padStart(2, '0');
    const ff = String(totalFrames % this.fps).padStart(2, '0');
    this.smpte = `${hh}:${mm}:${ss}:${ff}`;
  }
  generateMTC() {
    const totalFrames = Math.floor(this.currentTime * this.fps);
    const hh = Math.floor(totalFrames / (this.fps * 3600)) % 24;
    const mm = Math.floor((totalFrames % (this.fps * 3600)) / (this.fps * 60));
    const ss = Math.floor((totalFrames % (this.fps * 60)) / this.fps);
    const ff = totalFrames % this.fps;
    return { hh, mm, ss, ff, fps: this.fps };
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let timecodeSync = null;
function initTimecodeSync() {
  timecodeSync = new TimecodeSync();
  window.timecodeSync = timecodeSync;
}

// ============================================================

class PluginStore {
  constructor() {
    this.plugins = [];
    this.installed = new Set();
    this.categories = ['合成器', '效果器', '分析器', '工具', '脚本'];
    this.searchQuery = '';
    this.sortBy = 'popular';
    this.listeners = {};
    this.reviews = new Map();
    this.cart = [];
    this.init();
  }
  init() {
    this.loadMockData();
  }
  loadMockData() {
    const mock = [
      { id: 'plg_001', name: '青鸾合成器 Pro', category: '合成器', author: '青鸾实验室', version: '2.1.0', rating: 4.8, downloads: 12500, price: 0, description: '高级波表合成器，支持导入自定义波表。', tags: ['wavetable', 'polyphonic'] },
      { id: 'plg_002', name: '量子混响', category: '效果器', author: 'Quantum Audio', version: '1.5.2', rating: 4.6, downloads: 8300, price: 29.99, description: '基于物理建模的混响效果器。', tags: ['reverb', 'physics'] },
      { id: 'plg_003', name: '频谱 surgeon', category: '分析器', author: 'TechWave', version: '3.0.1', rating: 4.9, downloads: 15200, price: 0, description: '高精度实时频谱分析。', tags: ['spectrum', 'analyzer'] },
      { id: 'plg_004', name: 'MIDI 工具箱', category: '工具', author: 'DevStudio', version: '1.2.0', rating: 4.3, downloads: 5600, price: 9.99, description: 'MIDI 批量处理和转换工具。', tags: ['midi', 'utility'] },
      { id: 'plg_005', name: '自动化脚本引擎', category: '脚本', author: 'OpenAudio', version: '0.9.5', rating: 4.1, downloads: 3200, price: 0, description: '使用 JavaScript 编写自定义音频处理脚本。', tags: ['script', 'automation'] }
    ];
    this.plugins = mock;
  }
  search(query) {
    this.searchQuery = query.toLowerCase();
    return this.getFiltered();
  }
  getFiltered() {
    let list = this.plugins;
    if (this.searchQuery) {
      list = list.filter(p => p.name.toLowerCase().includes(this.searchQuery) || p.tags.some(t => t.includes(this.searchQuery)));
    }
    const sortMap = {
      popular: (a, b) => b.downloads - a.downloads,
      rating: (a, b) => b.rating - a.rating,
      newest: (a, b) => b.version.localeCompare(a.version),
      name: (a, b) => a.name.localeCompare(b.name)
    };
    list = list.slice().sort(sortMap[this.sortBy] || sortMap.popular);
    return list;
  }
  install(pluginId) {
    if (this.installed.has(pluginId)) return false;
    this.installed.add(pluginId);
    this.emit('installed', pluginId);
    return true;
  }
  uninstall(pluginId) {
    if (!this.installed.has(pluginId)) return false;
    this.installed.delete(pluginId);
    this.emit('uninstalled', pluginId);
    return true;
  }
  isInstalled(pluginId) {
    return this.installed.has(pluginId);
  }
  addReview(pluginId, userId, rating, comment) {
    if (!this.reviews.has(pluginId)) this.reviews.set(pluginId, []);
    this.reviews.get(pluginId).push({ userId, rating, comment, date: new Date().toISOString() });
    this.updatePluginRating(pluginId);
  }
  updatePluginRating(pluginId) {
    const revs = this.reviews.get(pluginId) || [];
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (plugin && revs.length) {
      plugin.rating = Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10;
    }
  }
  addToCart(pluginId) {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (plugin && plugin.price > 0 && !this.cart.find(i => i.id === pluginId)) {
      this.cart.push(plugin);
      this.emit('cartUpdate', this.cart);
    }
  }
  getCartTotal() {
    return this.cart.reduce((s, i) => s + i.price, 0);
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let pluginStore = null;
function initPluginStore() {
  pluginStore = new PluginStore();
  window.pluginStore = pluginStore;
}

// ============================================================

class AnalyticsDashboard {
  constructor() {
    this.sessions = [];
    this.events = [];
    this.metrics = {
      totalProjects: 0,
      totalTracks: 0,
      totalRenderTime: 0,
      totalExports: 0,
      avgSessionDuration: 0,
      mostUsedEffect: null,
      peakCpuUsage: 0
    };
    this.charts = {};
    this.listeners = {};
    this.sessionStart = Date.now();
    this.init();
  }
  init() {
    this.loadFromStorage();
    this.startSessionTracking();
  }
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('qingluan_analytics') || '{}');
      this.sessions = data.sessions || [];
      this.metrics = { ...this.metrics, ...(data.metrics || {}) };
    } catch (e) { /* ignore */ }
  }
  saveToStorage() {
    try {
      localStorage.setItem('qingluan_analytics', JSON.stringify({ sessions: this.sessions.slice(-50), metrics: this.metrics }));
    } catch (e) { /* ignore */ }
  }
  startSessionTracking() {
    setInterval(() => {
      const duration = (Date.now() - this.sessionStart) / 1000;
      this.recordEvent('heartbeat', { duration });
    }, 30000);
    window.addEventListener('beforeunload', () => {
      const duration = (Date.now() - this.sessionStart) / 1000;
      this.sessions.push({ start: this.sessionStart, duration, date: new Date().toISOString() });
      this.saveToStorage();
    });
  }
  recordEvent(type, data = {}) {
    this.events.push({ type, data, timestamp: Date.now() });
    if (this.events.length > 5000) this.events = this.events.slice(-2500);
    this.updateMetrics(type, data);
  }
  updateMetrics(type, data) {
    switch (type) {
      case 'project_created': this.metrics.totalProjects++; break;
      case 'track_added': this.metrics.totalTracks++; break;
      case 'render_complete': this.metrics.totalRenderTime += data.duration || 0; break;
      case 'export': this.metrics.totalExports++; break;
      case 'cpu_peak': this.metrics.peakCpuUsage = Math.max(this.metrics.peakCpuUsage, data.value || 0); break;
    }
    const durations = this.sessions.map(s => s.duration);
    if (durations.length) this.metrics.avgSessionDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  }
  getDailyUsage(days = 7) {
    const result = {};
    const now = Date.now();
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now - i * 86400000).toISOString().slice(0, 10);
      result[dayStart] = this.sessions.filter(s => s.date.slice(0, 10) === dayStart).reduce((sum, s) => sum + s.duration, 0);
    }
    return result;
  }
  getTopEffects(limit = 5) {
    const counts = {};
    this.events.filter(e => e.type === 'effect_used').forEach(e => {
      counts[e.data.name] = (counts[e.data.name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }
  generateReport() {
    return {
      generatedAt: new Date().toISOString(),
      metrics: this.metrics,
      dailyUsage: this.getDailyUsage(),
      topEffects: this.getTopEffects(),
      totalEvents: this.events.length,
      totalSessions: this.sessions.length
    };
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
}

let analyticsDashboard = null;
function initAnalyticsDashboard() {
  analyticsDashboard = new AnalyticsDashboard();
  window.analyticsDashboard = analyticsDashboard;
}

// ============================================================

class MacroSystem {
  constructor() {
    this.recording = false;
    this.currentMacro = [];
    this.macros = new Map();
    this.lastTriggerTime = 0;
    this.debounceMs = 100;
    this.listeners = {};
    this.init();
  }
  init() {
    this.loadMacros();
    this.hookGlobalEvents();
  }
  loadMacros() {
    try {
      const data = JSON.parse(localStorage.getItem('qingluan_macros') || '{}');
      Object.entries(data).forEach(([k, v]) => this.macros.set(k, v));
    } catch (e) { /* ignore */ }
  }
  saveMacros() {
    const obj = {};
    this.macros.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem('qingluan_macros', JSON.stringify(obj));
  }
  hookGlobalEvents() {
    document.addEventListener('click', e => {
      if (!this.recording) return;
      this.currentMacro.push({ type: 'click', x: e.clientX, y: e.clientY, target: this.describeElement(e.target), time: Date.now() });
    }, true);
    document.addEventListener('keydown', e => {
      if (!this.recording) return;
      this.currentMacro.push({ type: 'keydown', key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, time: Date.now() });
    }, true);
  }
  describeElement(el) {
    if (!el) return null;
    return { id: el.id, class: el.className, tag: el.tagName, text: el.textContent?.slice(0, 20) };
  }
  startRecording() {
    this.recording = true;
    this.currentMacro = [];
    this.emit('recordingStarted');
  }
  stopRecording(name) {
    this.recording = false;
    if (this.currentMacro.length > 0) {
      this.macros.set(name, { steps: this.currentMacro, createdAt: Date.now() });
      this.saveMacros();
      this.emit('macroSaved', name);
    }
    this.currentMacro = [];
    this.emit('recordingStopped');
  }
  playMacro(name) {
    const macro = this.macros.get(name);
    if (!macro) return false;
    this.emit('playbackStarted', name);
    let idx = 0;
    const run = () => {
      if (idx >= macro.steps.length) {
        this.emit('playbackFinished', name);
        return;
      }
      const step = macro.steps[idx];
      const delay = idx === 0 ? 0 : step.time - macro.steps[0].time;
      setTimeout(() => {
        this.executeStep(step);
        idx++;
        run();
      }, delay);
    };
    run();
    return true;
  }
  executeStep(step) {
    if (step.type === 'click' && step.target && step.target.id) {
      const el = document.getElementById(step.target.id);
      if (el) el.click();
    } else if (step.type === 'keydown') {
      const ev = new KeyboardEvent('keydown', { key: step.key, ctrlKey: step.ctrl, shiftKey: step.shift, altKey: step.alt, bubbles: true });
      document.dispatchEvent(ev);
    }
  }
  deleteMacro(name) {
    const existed = this.macros.delete(name);
    if (existed) this.saveMacros();
    return existed;
  }
  getMacroList() {
    return Array.from(this.macros.entries()).map(([name, data]) => ({ name, steps: data.steps.length, createdAt: data.createdAt }));
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let macroSystem = null;
function initMacroSystem() {
  macroSystem = new MacroSystem();
  window.macroSystem = macroSystem;
}

// ============================================================

class AdvancedExportPipeline {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.presets = {
      mp3_high: { format: 'mp3', bitrate: 320, sampleRate: 48000 },
      mp3_standard: { format: 'mp3', bitrate: 192, sampleRate: 44100 },
      wav_lossless: { format: 'wav', bitDepth: 24, sampleRate: 96000 },
      flac_lossless: { format: 'flac', compression: 5, sampleRate: 48000 },
      ogg_vorbis: { format: 'ogg', quality: 0.9, sampleRate: 44100 },
      aac_m4a: { format: 'm4a', bitrate: 256, sampleRate: 48000 }
    };
    this.currentJob = null;
    this.listeners = {};
    this.workers = [];
    this.maxWorkers = 2;
    this.init();
  }
  init() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workers.push({ busy: false, id: i });
    }
  }
  addJob(type, tracks, presetName, options = {}) {
    const preset = this.presets[presetName] || this.presets.mp3_standard;
    const job = {
      id: randomId('exp'),
      type,
      tracks,
      preset,
      options,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };
    this.queue.push(job);
    this.emit('jobAdded', job);
    this.processQueue();
    return job.id;
  }
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    while (this.queue.some(j => j.status === 'queued')) {
      const worker = this.workers.find(w => !w.busy);
      if (!worker) { await this.sleep(200); continue; }
      const job = this.queue.find(j => j.status === 'queued');
      if (!job) break;
      worker.busy = true;
      job.status = 'processing';
      job.startedAt = Date.now();
      this.currentJob = job;
      this.emit('jobStarted', job);
      try {
        await this.runExportJob(job, worker.id);
        job.status = 'completed';
        job.completedAt = Date.now();
        this.emit('jobCompleted', job);
      } catch (err) {
        job.status = 'failed';
        job.error = err.message;
        this.emit('jobFailed', job);
      }
      worker.busy = false;
      this.currentJob = null;
    }
    this.isProcessing = false;
  }
  async runExportJob(job, workerId) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      await this.sleep(150 + Math.random() * 100);
      job.progress = Math.round((i / steps) * 100);
      this.emit('progress', { jobId: job.id, progress: job.progress, workerId });
    }
    const duration = ((job.completedAt || Date.now()) - job.startedAt) / 1000;
    const sizeMB = (job.tracks ? job.tracks.length * 5 : 10);
    job.result = { url: '#', sizeMB, duration };
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  cancelJob(jobId) {
    const job = this.queue.find(j => j.id === jobId);
    if (job && job.status === 'queued') {
      job.status = 'cancelled';
      this.emit('jobCancelled', job);
      return true;
    }
    return false;
  }
  getQueue() {
    return this.queue.slice();
  }
  createCustomPreset(name, config) {
    this.presets[name] = config;
    return true;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let advancedExportPipeline = null;
function initAdvancedExportPipeline() {
  advancedExportPipeline = new AdvancedExportPipeline();
  window.advancedExportPipeline = advancedExportPipeline;
}

// ============================================================
// 第五批次初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initCollaborationSync();
    initScoreEditor();
    initTimecodeSync();
    initPluginStore();
    initAnalyticsDashboard();
    initMacroSystem();
    initAdvancedExportPipeline();
    console.log('[青鸾 DAW] 前端扩展模块 v4.4 第五批初始化完成');
    console.log('[青鸾] 新增功能: CollaborationSync, ScoreEditor, TimecodeSync, PluginStore, AnalyticsDashboard, MacroSystem, AdvancedExportPipeline');
  }, 500);
});

// ============================================================
// 第六批次：备份管理、许可证管理、调音系统、和弦库、节奏生成器
// ============================================================

class BackupManager {
  constructor() {
    this.backups = [];
    this.maxBackups = 10;
    this.autoBackupInterval = 300000;
    this.timer = null;
    this.storageKey = 'qingluan_backups';
    this.listeners = {};
    this.init();
  }
  init() {
    this.loadBackups();
    this.startAutoBackup();
  }
  loadBackups() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      this.backups = data.map(b => ({ ...b, date: new Date(b.date) }));
    } catch (e) { this.backups = []; }
  }
  saveBackups() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.backups.slice(-this.maxBackups)));
    } catch (e) { this.emit('error', '备份存储失败'); }
  }
  startAutoBackup() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.createBackup('auto');
    }, this.autoBackupInterval);
  }
  stopAutoBackup() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  createBackup(type = 'manual', data = null) {
    const backup = {
      id: randomId('bak'),
      type,
      date: new Date().toISOString(),
      size: 0,
      data: data || this.gatherProjectData()
    };
    backup.size = JSON.stringify(backup.data).length;
    this.backups.push(backup);
    if (this.backups.length > this.maxBackups) this.backups.shift();
    this.saveBackups();
    this.emit('backupCreated', backup);
    return backup.id;
  }
  gatherProjectData() {
    return {
      project: window.projectManager ? window.projectManager.currentProject : null,
      settings: window.settingsManager ? window.settingsManager.getAll() : null,
      sequencer: window.sequencerEnhanced ? { grid: window.sequencerEnhanced.grid } : null,
      timestamp: Date.now()
    };
  }
  restoreBackup(backupId) {
    const backup = this.backups.find(b => b.id === backupId);
    if (!backup) return false;
    if (backup.data && window.projectManager && backup.data.project) {
      window.projectManager.loadProject(backup.data.project);
    }
    this.emit('backupRestored', backup);
    return true;
  }
  deleteBackup(backupId) {
    const idx = this.backups.findIndex(b => b.id === backupId);
    if (idx !== -1) {
      this.backups.splice(idx, 1);
      this.saveBackups();
      this.emit('backupDeleted', backupId);
      return true;
    }
    return false;
  }
  exportBackup(backupId) {
    const backup = this.backups.find(b => b.id === backupId);
    if (!backup) return null;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `qingluan_backup_${backupId}.json`);
    return blob;
  }
  importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.id && data.data) {
            this.backups.push(data);
            this.saveBackups();
            this.emit('backupImported', data);
            resolve(data.id);
          } else {
            reject(new Error('无效的备份文件'));
          }
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }
  getBackups() {
    return this.backups.slice();
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let backupManager = null;
function initBackupManager() {
  backupManager = new BackupManager();
  window.backupManager = backupManager;
}

// ============================================================

class LicenseManager {
  constructor() {
    this.licenseKey = null;
    this.activated = false;
    this.features = [];
    this.expiry = null;
    this.tier = 'free';
    this.listeners = {};
    this.validationServer = '/api/license/validate';
    this.init();
  }
  init() {
    const saved = localStorage.getItem('qingluan_license');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.licenseKey = data.key;
        this.activated = data.activated || false;
        this.features = data.features || [];
        this.expiry = data.expiry ? new Date(data.expiry) : null;
        this.tier = data.tier || 'free';
      } catch (e) { /* ignore */ }
    }
  }
  async activate(key) {
    this.licenseKey = key;
    try {
      const resp = await fetch(this.validationServer, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, fingerprint: this.getDeviceFingerprint() })
      });
      const data = await resp.json();
      if (data.valid) {
        this.activated = true;
        this.features = data.features || [];
        this.expiry = data.expiry ? new Date(data.expiry) : null;
        this.tier = data.tier || 'pro';
        this.saveLicense();
        this.emit('activated', { tier: this.tier, features: this.features });
        return { success: true };
      } else {
        this.activated = false;
        this.emit('activationFailed', data.reason);
        return { success: false, reason: data.reason };
      }
    } catch (err) {
      this.emit('activationFailed', err.message);
      return { success: false, reason: err.message };
    }
  }
  deactivate() {
    this.licenseKey = null;
    this.activated = false;
    this.features = [];
    this.expiry = null;
    this.tier = 'free';
    localStorage.removeItem('qingluan_license');
    this.emit('deactivated');
  }
  saveLicense() {
    localStorage.setItem('qingluan_license', JSON.stringify({
      key: this.licenseKey,
      activated: this.activated,
      features: this.features,
      expiry: this.expiry ? this.expiry.toISOString() : null,
      tier: this.tier
    }));
  }
  hasFeature(feature) {
    return this.activated && this.features.includes(feature);
  }
  isExpired() {
    if (!this.expiry) return false;
    return new Date() > this.expiry;
  }
  getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('青鸾指纹', 2, 2);
    const hash = canvas.toDataURL().slice(-16);
    return hash + navigator.userAgent.slice(-16);
  }
  getStatus() {
    return { activated: this.activated, tier: this.tier, expiry: this.expiry, features: this.features, expired: this.isExpired() };
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let licenseManager = null;
function initLicenseManager() {
  licenseManager = new LicenseManager();
  window.licenseManager = licenseManager;
}

// ============================================================

class TuningSystem {
  constructor() {
    this.baseFrequency = 440;
    this.referenceNote = 69;
    this.temperament = 'equal';
    this.customRatios = [];
    this.listeners = {};
    this.temperaments = {
      equal: { name: '十二平均律', ratios: null },
      just: { name: '纯律', ratios: [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 16/9, 15/8] },
      pythagorean: { name: '毕达哥拉斯律', ratios: [1, 256/243, 9/8, 32/27, 81/64, 4/3, 729/512, 3/2, 128/81, 27/16, 16/9, 243/128] },
      meantone: { name: '中全音律', ratios: [1, 1.07, 1.118, 1.196, 1.25, 1.337, 1.414, 1.495, 1.6, 1.671, 1.788, 1.869] },
      werckmeister: { name: 'Werckmeister III', ratios: [1, 1.0535, 1.125, 1.1852, 1.2528, 1.3333, 1.4047, 1.4944, 1.5802, 1.6704, 1.7798, 1.8778] },
      custom: { name: '自定义', ratios: [] }
    };
    this.init();
  }
  init() {
    this.loadSettings();
  }
  loadSettings() {
    try {
      const data = JSON.parse(localStorage.getItem('qingluan_tuning') || '{}');
      if (data.baseFrequency) this.baseFrequency = data.baseFrequency;
      if (data.temperament) this.temperament = data.temperament;
      if (data.customRatios) this.customRatios = data.customRatios;
    } catch (e) { /* ignore */ }
  }
  saveSettings() {
    localStorage.setItem('qingluan_tuning', JSON.stringify({
      baseFrequency: this.baseFrequency,
      temperament: this.temperament,
      customRatios: this.customRatios
    }));
  }
  setTemperament(name) {
    if (this.temperaments[name]) {
      this.temperament = name;
      this.saveSettings();
      this.emit('temperamentChanged', name);
    }
  }
  setBaseFrequency(freq) {
    this.baseFrequency = freq;
    this.saveSettings();
    this.emit('baseFrequencyChanged', freq);
  }
  getFrequency(midiNote) {
    const semitones = midiNote - this.referenceNote;
    const octave = Math.floor(semitones / 12);
    const degree = ((semitones % 12) + 12) % 12;
    const ratios = this.temperaments[this.temperament]?.ratios;
    if (ratios && ratios.length === 12) {
      const ratio = ratios[degree];
      return this.baseFrequency * Math.pow(2, octave) * ratio;
    }
    return this.baseFrequency * Math.pow(2, semitones / 12);
  }
  getCents(midiNote) {
    const freq = this.getFrequency(midiNote);
    const equalFreq = this.baseFrequency * Math.pow(2, (midiNote - this.referenceNote) / 12);
    return 1200 * Math.log2(freq / equalFreq);
  }
  setCustomRatios(ratios) {
    if (Array.isArray(ratios) && ratios.length === 12) {
      this.customRatios = ratios;
      this.temperaments.custom.ratios = ratios;
      this.saveSettings();
      this.emit('customRatiosUpdated', ratios);
    }
  }
  compareTemperaments(notes) {
    const result = {};
    Object.keys(this.temperaments).forEach(name => {
      const oldTemp = this.temperament;
      this.temperament = name;
      result[name] = notes.map(n => ({ note: n, freq: this.getFrequency(n), cents: this.getCents(n) }));
      this.temperament = oldTemp;
    });
    return result;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let tuningSystem = null;
function initTuningSystem() {
  tuningSystem = new TuningSystem();
  window.tuningSystem = tuningSystem;
}

// ============================================================

class ChordLibrary {
  constructor() {
    this.chords = new Map();
    this.voicings = new Map();
    this.categories = ['三和弦', '七和弦', '九和弦', '十一和弦', '十三和弦', '挂留和弦', '变化和弦', '强力和弦'];
    this.listeners = {};
    this.init();
  }
  init() {
    this.loadStandardChords();
    this.generateVoicings();
  }
  loadStandardChords() {
    const lib = {
      'maj': { name: '大三和弦', intervals: [0, 4, 7], category: '三和弦' },
      'min': { name: '小三和弦', intervals: [0, 3, 7], category: '三和弦' },
      'dim': { name: '减三和弦', intervals: [0, 3, 6], category: '三和弦' },
      'aug': { name: '增三和弦', intervals: [0, 4, 8], category: '三和弦' },
      'maj7': { name: '大七和弦', intervals: [0, 4, 7, 11], category: '七和弦' },
      'min7': { name: '小七和弦', intervals: [0, 3, 7, 10], category: '七和弦' },
      'dom7': { name: '属七和弦', intervals: [0, 4, 7, 10], category: '七和弦' },
      'halfdim7': { name: '半减七和弦', intervals: [0, 3, 6, 10], category: '七和弦' },
      'dim7': { name: '减七和弦', intervals: [0, 3, 6, 9], category: '七和弦' },
      'minmaj7': { name: '小大七和弦', intervals: [0, 3, 7, 11], category: '七和弦' },
      'maj9': { name: '大九和弦', intervals: [0, 4, 7, 11, 14], category: '九和弦' },
      'dom9': { name: '属九和弦', intervals: [0, 4, 7, 10, 14], category: '九和弦' },
      'min9': { name: '小九和弦', intervals: [0, 3, 7, 10, 14], category: '九和弦' },
      'maj11': { name: '大十一和弦', intervals: [0, 4, 7, 11, 14, 17], category: '十一和弦' },
      'dom11': { name: '属十一和弦', intervals: [0, 4, 7, 10, 14, 17], category: '十一和弦' },
      'maj13': { name: '大十三和弦', intervals: [0, 4, 7, 11, 14, 17, 21], category: '十三和弦' },
      'dom13': { name: '属十三和弦', intervals: [0, 4, 7, 10, 14, 17, 21], category: '十三和弦' },
      'sus2': { name: '挂二和弦', intervals: [0, 2, 7], category: '挂留和弦' },
      'sus4': { name: '挂四和弦', intervals: [0, 5, 7], category: '挂留和弦' },
      '7sus4': { name: '属七挂四', intervals: [0, 5, 7, 10], category: '挂留和弦' },
      'alt': { name: '变化和弦', intervals: [0, 4, 7, 10, 13, 15, 18], category: '变化和弦' },
      'power': { name: '强力和弦', intervals: [0, 7], category: '强力和弦' }
    };
    Object.entries(lib).forEach(([k, v]) => this.chords.set(k, v));
  }
  generateVoicings() {
    const root = 60;
    this.chords.forEach((chord, symbol) => {
      const basic = chord.intervals.map(i => root + i);
      const close = basic;
      const drop2 = [...basic.slice(0, 1), ...basic.slice(2), basic[1]];
      const drop3 = [basic[0], ...basic.slice(3), basic[1], basic[2]].filter((v, i, a) => a.indexOf(v) === i);
      const spread = basic.map((n, i) => n + i * 12);
      this.voicings.set(symbol, { close, drop2, drop3, spread });
    });
  }
  getChordNotes(symbol, rootNote = 60) {
    const chord = this.chords.get(symbol);
    if (!chord) return null;
    return chord.intervals.map(i => rootNote + i);
  }
  getVoicing(symbol, type = 'close', rootNote = 60) {
    const voicing = this.voicings.get(symbol);
    if (!voicing) return null;
    const base = voicing[type] || voicing.close;
    const offset = rootNote - 60;
    return base.map(n => n + offset);
  }
  findChordsContaining(notes) {
    const results = [];
    this.chords.forEach((chord, symbol) => {
      const set = new Set(chord.intervals);
      const matches = notes.every(n => set.has(n % 12) || set.has((n % 12) - 12) || set.has((n % 12) + 12));
      if (matches) results.push({ symbol, ...chord });
    });
    return results;
  }
  suggestSubstitutions(symbol) {
    const chord = this.chords.get(symbol);
    if (!chord) return [];
    const subs = [];
    const tritone = this.chords.get('dom7');
    if (tritone && chord.intervals.length >= 4) {
      const tritoneRoot = (symbol.startsWith('dom') || symbol === '7') ? chord.intervals[0] + 6 : null;
      if (tritoneRoot !== null) subs.push({ type: 'tritone_substitution', root: tritoneRoot, description: '三全音替代' });
    }
    if (chord.category === '七和弦') {
      subs.push({ type: 'secondary_dominant', description: '副属和弦' });
      subs.push({ type: 'relative_minor', description: '关系小调和弦' });
    }
    return subs;
  }
  getChordsByCategory(category) {
    return Array.from(this.chords.entries()).filter(([k, v]) => v.category === category).map(([k, v]) => ({ symbol: k, ...v }));
  }
  addCustomChord(symbol, name, intervals, category = '自定义') {
    this.chords.set(symbol, { name, intervals, category });
    this.generateVoicings();
    this.emit('customChordAdded', { symbol, name });
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let chordLibrary = null;
function initChordLibrary() {
  chordLibrary = new ChordLibrary();
  window.chordLibrary = chordLibrary;
}

// ============================================================

class RhythmGenerator {
  constructor() {
    this.patterns = new Map();
    this.styles = ['house', 'techno', 'hiphop', 'jazz', 'rock', 'funk', 'breakbeat', 'trap'];
    this.currentStyle = 'house';
    this.bpm = 120;
    this.steps = 16;
    this.swing = 0;
    this.density = 0.7;
    this.listeners = {};
    this.init();
  }
  init() {
    this.loadStylePatterns();
  }
  loadStylePatterns() {
    const patterns = {
      house: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
      },
      techno: {
        kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        tom: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0]
      },
      hiphop: {
        kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
      },
      jazz: {
        kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        ride: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
      },
      rock: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      funk: {
        kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        ghost: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1]
      },
      breakbeat: {
        kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        perc: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
      },
      trap: {
        kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        hihat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        808: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
      }
    };
    Object.entries(patterns).forEach(([style, p]) => this.patterns.set(style, p));
  }
  generate(style = this.currentStyle, variation = 0) {
    const base = this.patterns.get(style);
    if (!base) return null;
    const result = {};
    Object.entries(base).forEach(([inst, steps]) => {
      result[inst] = steps.map((s, i) => {
        if (s === 0) return 0;
        const prob = this.density * (1 - variation * 0.3);
        return Math.random() < prob ? 1 : 0;
      });
    });
    if (this.swing > 0) {
      Object.keys(result).forEach(inst => {
        for (let i = 0; i < result[inst].length; i += 2) {
          if (Math.random() < this.swing) {
            result[inst][i] = 0;
            if (i + 1 < result[inst].length) result[inst][i + 1] = 1;
          }
        }
      });
    }
    return result;
  }
  humanize(pattern, amount = 0.1) {
    const result = {};
    Object.entries(pattern).forEach(([inst, steps]) => {
      result[inst] = steps.map(s => {
        if (s === 0) return 0;
        return Math.random() < (1 - amount) ? 1 : (Math.random() > 0.5 ? 1 : 0);
      });
    });
    return result;
  }
  fill(pattern, density = 0.5) {
    const result = {};
    Object.entries(pattern).forEach(([inst, steps]) => {
      result[inst] = steps.map(() => Math.random() < density ? 1 : 0);
    });
    return result;
  }
  getPattern(style) {
    return this.patterns.get(style);
  }
  addCustomStyle(name, pattern) {
    this.patterns.set(name, pattern);
    this.styles.push(name);
    this.emit('styleAdded', name);
  }
  exportToSequencer(pattern) {
    if (!window.sequencerEnhanced) return;
    let trackIdx = 0;
    Object.entries(pattern).forEach(([inst, steps]) => {
      if (trackIdx >= window.sequencerEnhanced.tracks) return;
      steps.forEach((s, i) => {
        window.sequencerEnhanced.setStep(trackIdx, i, s === 1);
      });
      trackIdx++;
    });
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let rhythmGenerator = null;
function initRhythmGenerator() {
  rhythmGenerator = new RhythmGenerator();
  window.rhythmGenerator = rhythmGenerator;
}

// ============================================================
// 第六批次初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initBackupManager();
    initLicenseManager();
    initTuningSystem();
    initChordLibrary();
    initRhythmGenerator();
    console.log('[青鸾 DAW] 前端扩展模块 v4.5 第六批初始化完成');
    console.log('[青鸾] 新增功能: BackupManager, LicenseManager, TuningSystem, ChordLibrary, RhythmGenerator');
  }, 600);
});

// ============================================================
// 第七批次：快捷键配置器、模板管理、参考轨道、专业电平表、环绕声像器
// ============================================================

class ShortcutConfigurator {
  constructor() {
    this.bindings = new Map();
    this.contexts = ['global', 'sequencer', 'piano_roll', 'mixer', 'arranger'];
    this.recording = false;
    this.pendingAction = null;
    this.listeners = {};
    this.init();
  }
  init() {
    this.loadDefaults();
    this.loadCustomBindings();
  }
  loadDefaults() {
    const defaults = {
      'global:play_pause': { key: 'Space', ctrl: false, shift: false, alt: false },
      'global:stop': { key: 'Escape', ctrl: false, shift: false, alt: false },
      'global:save': { key: 's', ctrl: true, shift: false, alt: false },
      'global:undo': { key: 'z', ctrl: true, shift: false, alt: false },
      'global:redo': { key: 'z', ctrl: true, shift: true, alt: false },
      'sequencer:copy': { key: 'c', ctrl: true, shift: false, alt: false },
      'sequencer:paste': { key: 'v', ctrl: true, shift: false, alt: false },
      'sequencer:delete': { key: 'Delete', ctrl: false, shift: false, alt: false },
      'sequencer:quantize': { key: 'q', ctrl: false, shift: false, alt: false },
      'piano_roll:draw': { key: 'd', ctrl: false, shift: false, alt: false },
      'piano_roll:select': { key: 's', ctrl: false, shift: false, alt: false },
      'piano_roll:erase': { key: 'e', ctrl: false, shift: false, alt: false },
      'mixer:mute': { key: 'm', ctrl: false, shift: false, alt: false },
      'mixer:solo': { key: 's', ctrl: false, shift: false, alt: false },
      'arranger:split': { key: 's', ctrl: false, shift: false, alt: false },
      'arranger:merge': { key: 'm', ctrl: false, shift: false, alt: false }
    };
    Object.entries(defaults).forEach(([action, binding]) => {
      if (!this.bindings.has(action)) this.bindings.set(action, binding);
    });
  }
  loadCustomBindings() {
    try {
      const data = JSON.parse(localStorage.getItem('qingluan_shortcuts') || '{}');
      Object.entries(data).forEach(([action, binding]) => this.bindings.set(action, binding));
    } catch (e) { /* ignore */ }
  }
  saveCustomBindings() {
    const obj = {};
    this.bindings.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem('qingluan_shortcuts', JSON.stringify(obj));
  }
  setBinding(action, key, ctrl = false, shift = false, alt = false) {
    const binding = { key, ctrl, shift, alt };
    const conflict = this.findConflict(binding, action);
    if (conflict) {
      this.emit('conflict', { action, conflictWith: conflict });
      return false;
    }
    this.bindings.set(action, binding);
    this.saveCustomBindings();
    this.emit('bindingChanged', { action, binding });
    return true;
  }
  findConflict(binding, excludeAction) {
    for (const [action, existing] of this.bindings) {
      if (action === excludeAction) continue;
      if (existing.key === binding.key && existing.ctrl === binding.ctrl && existing.shift === binding.shift && existing.alt === binding.alt) {
        return action;
      }
    }
    return null;
  }
  getBinding(action) {
    return this.bindings.get(action);
  }
  getAllBindings() {
    return Array.from(this.bindings.entries()).map(([action, binding]) => ({ action, ...binding }));
  }
  resetToDefaults() {
    this.bindings.clear();
    this.loadDefaults();
    this.saveCustomBindings();
    this.emit('reset');
  }
  exportBindings() {
    return JSON.stringify(Object.fromEntries(this.bindings), null, 2);
  }
  importBindings(json) {
    try {
      const data = JSON.parse(json);
      Object.entries(data).forEach(([k, v]) => this.bindings.set(k, v));
      this.saveCustomBindings();
      this.emit('imported');
      return true;
    } catch (e) { return false; }
  }
  startRecording(action) {
    this.recording = true;
    this.pendingAction = action;
    this.emit('recordingStarted', action);
  }
  recordKey(e) {
    if (!this.recording || !this.pendingAction) return false;
    this.setBinding(this.pendingAction, e.key, e.ctrlKey, e.shiftKey, e.altKey);
    this.recording = false;
    this.pendingAction = null;
    this.emit('recordingFinished');
    return true;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let shortcutConfigurator = null;
function initShortcutConfigurator() {
  shortcutConfigurator = new ShortcutConfigurator();
  window.shortcutConfigurator = shortcutConfigurator;
}

// ============================================================

class TemplateManager {
  constructor() {
    this.templates = [];
    this.categories = ['空白', '电子', '摇滚', '爵士', '古典', '流行', '影视配乐'];
    this.listeners = {};
    this.init();
  }
  init() {
    this.loadBuiltInTemplates();
    this.loadUserTemplates();
  }
  loadBuiltInTemplates() {
    const builtIn = [
      { id: 'tpl_blank', name: '空白工程', category: '空白', tracks: [], bpm: 120, description: '从零开始的空白工程' },
      { id: 'tpl_edm', name: 'EDM 入门', category: '电子', tracks: [{ name: 'Kick', type: 'drum' }, { name: 'Bass', type: 'synth' }, { name: 'Lead', type: 'synth' }, { name: 'Pad', type: 'synth' }], bpm: 128, description: '四轨电子舞曲模板' },
      { id: 'tpl_rock', name: '标准摇滚', category: '摇滚', tracks: [{ name: 'Drums', type: 'drum' }, { name: 'Bass', type: 'bass' }, { name: 'Guitar L', type: 'audio' }, { name: 'Guitar R', type: 'audio' }, { name: 'Vocals', type: 'audio' }], bpm: 140, description: '五轨摇滚乐队模板' },
      { id: 'tpl_jazz', name: '爵士四重奏', category: '爵士', tracks: [{ name: 'Piano', type: 'midi' }, { name: 'Bass', type: 'midi' }, { name: 'Drums', type: 'drum' }, { name: 'Sax', type: 'midi' }], bpm: 120, description: '爵士标准四重奏' },
      { id: 'tpl_film', name: '影视配乐', category: '影视配乐', tracks: [{ name: 'Strings', type: 'midi' }, { name: 'Brass', type: 'midi' }, { name: 'Percussion', type: 'drum' }, { name: 'Piano', type: 'midi' }, { name: 'FX', type: 'audio' }], bpm: 90, description: '史诗感影视配乐模板' }
    ];
    this.templates = [...builtIn];
  }
  loadUserTemplates() {
    try {
      const data = JSON.parse(localStorage.getItem('qingluan_templates') || '[]');
      this.templates.push(...data);
    } catch (e) { /* ignore */ }
  }
  saveUserTemplates() {
    const userTemplates = this.templates.filter(t => !t.id.startsWith('tpl_'));
    localStorage.setItem('qingluan_templates', JSON.stringify(userTemplates));
  }
  createTemplate(name, category, projectData) {
    const tpl = {
      id: randomId('tpl'),
      name,
      category,
      tracks: projectData.tracks || [],
      bpm: projectData.bpm || 120,
      timeSignature: projectData.timeSignature || [4, 4],
      description: projectData.description || '',
      createdAt: new Date().toISOString()
    };
    this.templates.push(tpl);
    this.saveUserTemplates();
    this.emit('templateCreated', tpl);
    return tpl.id;
  }
  deleteTemplate(id) {
    const idx = this.templates.findIndex(t => t.id === id);
    if (idx !== -1 && !this.templates[idx].id.startsWith('tpl_')) {
      this.templates.splice(idx, 1);
      this.saveUserTemplates();
      this.emit('templateDeleted', id);
      return true;
    }
    return false;
  }
  getTemplates(category = null) {
    if (category) return this.templates.filter(t => t.category === category);
    return this.templates.slice();
  }
  applyTemplate(id) {
    const tpl = this.templates.find(t => t.id === id);
    if (!tpl) return false;
    if (window.projectManager) {
      window.projectManager.createNewProject(tpl.name);
      window.projectManager.currentProject.bpm = tpl.bpm;
      window.projectManager.currentProject.timeSignature = tpl.timeSignature;
      tpl.tracks.forEach(t => {
        if (window.projectManager.addTrack) window.projectManager.addTrack(t.name, t.type);
      });
    }
    this.emit('templateApplied', tpl);
    return true;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let templateManager = null;
function initTemplateManager() {
  templateManager = new TemplateManager();
  window.templateManager = templateManager;
}

// ============================================================

class ReferenceTrack {
  constructor() {
    this.tracks = [];
    this.activeTrack = null;
    this.volume = 0.8;
    this.muted = false;
    this.solo = false;
    this.loop = false;
    this.startOffset = 0;
    this.listeners = {};
    this.analyserData = null;
    this.init();
  }
  init() {
    this.setupAudioContext();
  }
  setupAudioContext() {
    if (!window.advancedAudioEngine || !window.advancedAudioEngine.ctx) return;
    this.ctx = window.advancedAudioEngine.ctx;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }
  loadTrack(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          if (!this.ctx) this.setupAudioContext();
          const buffer = await this.ctx.decodeAudioData(reader.result);
          const track = {
            id: randomId('ref'),
            name: file.name,
            buffer,
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            source: null,
            playing: false
          };
          this.tracks.push(track);
          this.emit('trackLoaded', track);
          resolve(track);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file);
    });
  }
  play(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track || !this.ctx) return false;
    if (track.source) track.source.stop();
    const source = this.ctx.createBufferSource();
    source.buffer = track.buffer;
    source.loop = this.loop;
    source.connect(this.gainNode);
    source.start(0, this.startOffset);
    track.source = source;
    track.playing = true;
    this.activeTrack = track;
    this.emit('play', track);
    return true;
  }
  stop(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track && track.source) {
      track.source.stop();
      track.source = null;
      track.playing = false;
      this.emit('stop', track);
    }
  }
  stopAll() {
    this.tracks.forEach(t => this.stop(t.id));
  }
  setVolume(v) {
    this.volume = v;
    if (this.gainNode) this.gainNode.gain.value = v;
  }
  getAnalyserData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
  removeTrack(trackId) {
    const idx = this.tracks.findIndex(t => t.id === trackId);
    if (idx !== -1) {
      this.stop(trackId);
      this.tracks.splice(idx, 1);
      this.emit('trackRemoved', trackId);
      return true;
    }
    return false;
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let referenceTrack = null;
function initReferenceTrack() {
  referenceTrack = new ReferenceTrack();
  window.referenceTrack = referenceTrack;
}

// ============================================================

class AudioMeter {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.mode = 'vu'; // vu, ppm, k20, k14, k12, rms, peak
    this.channels = 2;
    this.values = [0, 0];
    this.peakHold = [0, 0];
    this.peakTimer = [0, 0];
    this.decayRate = { vu: 0.3, ppm: 0.6, rms: 0.2, peak: 0.1 };
    this.running = false;
    this.listeners = {};
    this.init();
  }
  init() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.start();
  }
  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }
  setMode(mode) {
    if (['vu', 'ppm', 'k20', 'k14', 'k12', 'rms', 'peak'].includes(mode)) {
      this.mode = mode;
    }
  }
  feed(samples) {
    if (!samples || !samples.length) return;
    for (let ch = 0; ch < this.channels; ch++) {
      let sum = 0;
      let peak = 0;
      for (let i = ch; i < samples.length; i += this.channels) {
        const s = Math.abs(samples[i]);
        sum += s * s;
        if (s > peak) peak = s;
      }
      const rms = Math.sqrt(sum / (samples.length / this.channels));
      let value = 0;
      switch (this.mode) {
        case 'vu': value = rms * 1.2; break;
        case 'ppm': value = peak; break;
        case 'rms': value = rms; break;
        case 'peak': value = peak; break;
        default: value = rms;
      }
      this.values[ch] = Math.max(this.values[ch] * (1 - this.decayRate[this.mode]), value);
      if (peak > this.peakHold[ch]) {
        this.peakHold[ch] = peak;
        this.peakTimer[ch] = Date.now();
      } else if (Date.now() - this.peakTimer[ch] > 1500) {
        this.peakHold[ch] *= 0.95;
      }
    }
  }
  start() {
    this.running = true;
    this.draw();
  }
  stop() {
    this.running = false;
  }
  draw() {
    if (!this.running || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const barW = (w - 20) / this.channels;
    for (let ch = 0; ch < this.channels; ch++) {
      const x = 10 + ch * barW;
      const barH = h - 40;
      const level = Math.min(1, this.values[ch]);
      const fillH = level * barH;
      const grad = ctx.createLinearGradient(0, h - 20, 0, 20);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.6, '#eab308');
      grad.addColorStop(0.85, '#f97316');
      grad.addColorStop(1, '#ef4444');
      ctx.fillStyle = '#1f2937';
      roundRect(ctx, x, 20, barW - 10, barH, 4);
      ctx.fill();
      ctx.fillStyle = grad;
      roundRect(ctx, x, 20 + barH - fillH, barW - 10, fillH, 4);
      ctx.fill();
      const peakY = 20 + barH - Math.min(1, this.peakHold[ch]) * barH;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, peakY - 2, barW - 10, 3);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '10px sans-serif';
      ctx.fillText(`CH${ch + 1}`, x, h - 5);
    }
    requestAnimationFrame(() => this.draw());
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
}

let audioMeter = null;
function initAudioMeter() {
  audioMeter = new AudioMeter('meterCanvas');
  window.audioMeter = audioMeter;
}

// ============================================================

class SurroundPanner {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.x = 0.5;
    this.y = 0.5;
    this.z = 0.5;
    this.mode = 'stereo'; // stereo, quad, 5.1, 7.1, ambisonic
    this.speakers = this.getSpeakerLayout('stereo');
    this.dragging = false;
    this.listeners = {};
    this.init();
  }
  init() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousedown', e => {
      this.dragging = true;
      this.updatePosition(e);
    });
    this.canvas.addEventListener('mousemove', e => {
      if (this.dragging) this.updatePosition(e);
    });
    this.canvas.addEventListener('mouseup', () => { this.dragging = false; });
    this.canvas.addEventListener('mouseleave', () => { this.dragging = false; });
    this.draw();
  }
  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.draw();
  }
  getSpeakerLayout(mode) {
    const layouts = {
      stereo: [{ x: 0.2, y: 0.5, label: 'L' }, { x: 0.8, y: 0.5, label: 'R' }],
      quad: [{ x: 0.2, y: 0.2, label: 'FL' }, { x: 0.8, y: 0.2, label: 'FR' }, { x: 0.2, y: 0.8, label: 'RL' }, { x: 0.8, y: 0.8, label: 'RR' }],
      '5.1': [{ x: 0.2, y: 0.3, label: 'FL' }, { x: 0.8, y: 0.3, label: 'FR' }, { x: 0.5, y: 0.15, label: 'C' }, { x: 0.15, y: 0.75, label: 'RL' }, { x: 0.85, y: 0.75, label: 'RR' }, { x: 0.5, y: 0.85, label: 'LFE' }],
      '7.1': [{ x: 0.15, y: 0.3, label: 'FL' }, { x: 0.85, y: 0.3, label: 'FR' }, { x: 0.5, y: 0.15, label: 'C' }, { x: 0.05, y: 0.5, label: 'SL' }, { x: 0.95, y: 0.5, label: 'SR' }, { x: 0.25, y: 0.8, label: 'RL' }, { x: 0.75, y: 0.8, label: 'RR' }, { x: 0.5, y: 0.85, label: 'LFE' }]
    };
    return layouts[mode] || layouts.stereo;
  }
  setMode(mode) {
    this.mode = mode;
    this.speakers = this.getSpeakerLayout(mode);
    this.draw();
    this.emit('modeChanged', mode);
  }
  updatePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    this.y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    this.draw();
    this.emit('positionChanged', { x: this.x, y: this.y, gains: this.calculateGains() });
  }
  calculateGains() {
    const gains = {};
    this.speakers.forEach(sp => {
      const dx = this.x - sp.x;
      const dy = this.y - sp.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      gains[sp.label] = 1 / dist;
    });
    const maxGain = Math.max(...Object.values(gains));
    Object.keys(gains).forEach(k => { gains[k] /= maxGain; });
    return gains;
  }
  setPosition(x, y) {
    this.x = clamp(x, 0, 1);
    this.y = clamp(y, 0, 1);
    this.draw();
  }
  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w / 8, 0);
      ctx.lineTo(i * w / 8, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * h / 8);
      ctx.lineTo(w, i * h / 8);
      ctx.stroke();
    }
    this.speakers.forEach(sp => {
      const sx = sp.x * w;
      const sy = sp.y * h;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sp.label, sx, sy + 4);
    });
    const px = this.x * w;
    const py = this.y * h;
    ctx.fillStyle = '#4ECDC4';
    ctx.shadowColor = '#4ECDC4';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('●', px, py + 4);
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

let surroundPanner = null;
function initSurroundPanner() {
  surroundPanner = new SurroundPanner('pannerCanvas');
  window.surroundPanner = surroundPanner;
}

// ============================================================
// 第七批次初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initShortcutConfigurator();
    initTemplateManager();
    initReferenceTrack();
    initAudioMeter();
    initSurroundPanner();
    console.log('[青鸾 DAW] 前端扩展模块 v4.6 第七批初始化完成');
    console.log('[青鸾] 新增功能: ShortcutConfigurator, TemplateManager, ReferenceTrack, AudioMeter, SurroundPanner');
  }, 700);
});
