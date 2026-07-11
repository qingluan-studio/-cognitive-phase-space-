/* ═══════════════════════════════════════════════════════════════════
   空间 Mobile — JavaScript 模块 v4.0
   认知涌现 AI 对话界面
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────────── */
  const STATE = {
    currentPage: 'chat',
    deepThink: false,
    messages: [],
    typing: false,
    streaming: false,
    sessionId: 'default',
    conversations: [],
    drawerOpen: false,
    settingsOpen: false,
    knowledgeOpen: false,
    searchEnabled: false,
    loadedConvIds: new Set(),
    abortController: null,
    engineAnim: null,
    uploadedFiles: [],
  };

  /* ── DOM Refs ──────────────────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ═══════════════════════════════════════════════════════════════════
     Module: SessionManager — 会话CRUD、切换、懒加载
     ═══════════════════════════════════════════════════════════════════ */
  const SessionManager = {
    async list() {
      try {
        const resp = await fetch('/api/sessions');
        const data = await resp.json();
        STATE.conversations = data.sessions || [];
        this.render();
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    },

    async create() {
      try {
        const resp = await fetch('/api/sessions/new', { method: 'POST' });
        const data = await resp.json();
        STATE.sessionId = data.session_id;
        STATE.messages = [];
        this.clearMessages();
        this.showWelcome();
        await this.list();
        UIManager.closeDrawer();
        NotificationSystem.toast('新对话已创建', 'success');
        return data.session_id;
      } catch (e) {
        NotificationSystem.toast('创建对话失败', 'error');
      }
    },

    async switch(sessionId) {
      STATE.sessionId = sessionId;
      STATE.messages = [];
      try {
        const resp = await fetch('/api/sessions/' + sessionId);
        if (resp.ok) {
          const data = await resp.json();
          STATE.messages = data.history || [];
          this.clearMessages();
          this.renderHistory();
          this.hideWelcome();
        }
      } catch (e) {
        console.error('Failed to switch session:', e);
      }
      UIManager.closeDrawer();
      this.highlight(sessionId);
    },

    async remove(sessionId, event) {
      event.stopPropagation();
      if (!confirm('确定删除此对话？')) return;
      try {
        await fetch('/api/sessions/' + sessionId, { method: 'DELETE' });
        if (STATE.sessionId === sessionId) {
          STATE.sessionId = 'default';
          STATE.messages = [];
          this.clearMessages();
          this.showWelcome();
        }
        await this.list();
        NotificationSystem.toast('对话已删除', 'info');
      } catch (e) {
        NotificationSystem.toast('删除失败', 'error');
      }
    },

    clearMessages() {
      const el = $('#messages');
      if (el) el.innerHTML = '';
    },

    showWelcome() {
      const el = $('#welcome');
      if (el) el.style.display = '';
    },

    hideWelcome() {
      const el = $('#welcome');
      if (el) el.style.display = 'none';
    },

    renderHistory() {
      const msgs = $('#messages');
      if (!msgs) return;
      STATE.messages.forEach((m) => {
        if (m.role === 'user') {
          ChatEngine.addMessageElement('user', m.content);
        } else if (m.role === 'assistant') {
          ChatEngine.addMessageElement('ai', m.content);
        }
      });
      ChatEngine.scrollToBottom();
    },

    render() {
      const body = $('#drawerBody');
      if (!body) return;
      if (STATE.conversations.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">暂无历史对话</div>';
        return;
      }
      body.innerHTML = STATE.conversations.map((c) => {
        const isActive = c.id === STATE.sessionId;
        return `
          <div class="drawer-conv ${isActive ? 'active' : ''}" onclick="CeeApp.SessionManager.switch('${c.id}')">
            <div class="drawer-conv-icon">${isActive ? '&#9679;' : '&#9702;'}</div>
            <div class="drawer-conv-info">
              <div class="drawer-conv-title">${escapeHtml(c.title || '新对话')}</div>
              <div class="drawer-conv-meta">${c.msg_count || 0} 条消息</div>
            </div>
            <div class="drawer-conv-delete" onclick="CeeApp.SessionManager.remove('${c.id}', event)">&times;</div>
          </div>
        `;
      }).join('');
    },

    highlight(sessionId) {
      $$('.drawer-conv').forEach((el) => {
        el.classList.toggle('active', el.querySelector('.drawer-conv-title')?.textContent &&
          STATE.conversations.find(c => c.id === sessionId && c.title === el.querySelector('.drawer-conv-title').textContent));
      });
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: ChatEngine — 消息发送、SSE流解析、step事件处理、令牌流渲染
     ═══════════════════════════════════════════════════════════════════ */
  const ChatEngine = {
    sendMessage() {
      const input = $('#chatInput');
      const text = (input?.value || '').trim();
      if (!text || STATE.typing) return;

      if (STATE.streaming) {
        this.stopStreaming();
        return;
      }

      input.value = '';
      $('#sendBtn').disabled = true;
      autoResize(input);

      SessionManager.hideWelcome();

      this.addMessageElement('user', text);
      this.scrollToBottom();

      const typingEl = this.addTyping();
      this.scrollToBottom();
      STATE.typing = true;
      STATE.streaming = true;

      this.updateSendButton();

      const apiKey = $('#apiKeyInput')?.value?.trim() || '';
      const baseUrl = $('#baseUrlInput')?.value?.trim() || 'https://api.openai.com/v1';
      const model = $('#modelInput')?.value?.trim() || 'gpt-4o-mini';
      const temperature = parseFloat($('#tempSlider')?.value || '0.7');

      const payload = {
        messages: [...STATE.messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: text }],
        session_id: STATE.sessionId,
        api_key: apiKey,
        base_url: baseUrl,
        model: model,
        temperature: temperature,
        deep_think: STATE.deepThink,
      };

      STATE.abortController = new AbortController();

      this._streamChat(payload, typingEl, text);
    },

    async _streamChat(payload, typingEl, userText) {
      let aiContent = '';
      let ceeScores = null;
      let ceeTier = '';
      let ceeMode = '';
      let aiMsgEl = null;
      let genSteps = [];

      try {
        const resp = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: STATE.abortController.signal,
        });

        if (typingEl) typingEl.remove();

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              this._handleStreamEvent(parsed, {
                genSteps, aiMsgEl, aiContent, ceeScores, ceeTier, ceeMode,
              });
              if (parsed.type === 'token') { aiContent += parsed.content; }
              if (parsed.type === 'cee') {
                ceeScores = parsed.scores;
                ceeTier = parsed.tier;
                ceeMode = parsed.mode;
              }
            } catch (e) { /* skip malformed JSON */ }
          }
        }

        if (aiMsgEl && ceeScores) {
          finalizeAiMessage(aiMsgEl, ceeScores, ceeTier, ceeMode, aiContent);
        }

        STATE.messages.push({ role: 'user', content: userText });
        STATE.messages.push({ role: 'assistant', content: aiContent || '...' });

        if (ceeTier === 'S') UIManager.showRitual();

        setTimeout(() => SessionManager.list(), 500);

      } catch (e) {
        if (e.name !== 'AbortError') {
          if (typingEl) typingEl.remove();
          ChatEngine.addMessageElement('ai', '连接失败，请稍后重试。');
          NotificationSystem.toast('网络错误', 'error');
        }
      }

      STATE.typing = false;
      STATE.streaming = false;
      STATE.abortController = null;
      this.updateSendButton();
      this.scrollToBottom();
    },

    _handleStreamEvent(parsed, ctx) {
      switch (parsed.type) {
        case 'step': {
          const existing = ctx.genSteps.find(s => s.step === parsed.step);
          if (existing) {
            existing.status = parsed.status;
          } else {
            ctx.genSteps.push({ step: parsed.step, status: parsed.status });
          }
          if (!ctx.aiMsgEl) ctx.aiMsgEl = ChatEngine.addMessageElement('ai', '');
          updateGenProcess(ctx.aiMsgEl, ctx.genSteps);
          break;
        }
        case 'thinking':
          if (!ctx.aiMsgEl) ctx.aiMsgEl = ChatEngine.addMessageElement('ai', '');
          break;
        case 'token':
          ctx.aiContent += parsed.content;
          if (!ctx.aiMsgEl) ctx.aiMsgEl = ChatEngine.addMessageElement('ai', '');
          updateAiContent(ctx.aiMsgEl, ctx.aiContent);
          ChatEngine.scrollToBottom();
          break;
        case 'done':
          break;
        case 'error':
          const err = parsed.content || '处理消息时遇到问题。';
          if (!ctx.aiMsgEl) ctx.aiMsgEl = ChatEngine.addMessageElement('ai', err);
          else updateAiContent(ctx.aiMsgEl, err);
          break;
      }
    },

    stopStreaming() {
      if (STATE.abortController) {
        STATE.abortController.abort();
        STATE.abortController = null;
      }
      STATE.typing = false;
      STATE.streaming = false;
      this.updateSendButton();
    },

    addMessageElement(role, content) {
      const msgs = $('#messages');
      if (!msgs) return null;
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.innerHTML =
        '<div class="msg-avatar">' + (role === 'user' ? 'U' : '空') + '</div>' +
        '<div class="msg-content">' +
        (role === 'ai' ? '<div class="gen-process" style="display:none"></div>' : '') +
        '<div class="msg-bubble">' + (role === 'user' ? escapeHtml(content) : (content ? renderMarkdown(content) : '')) + '</div>' +
        '</div>';
      msgs.appendChild(div);
      return div;
    },

    addTyping() {
      const msgs = $('#messages');
      if (!msgs) return null;
      const div = document.createElement('div');
      div.className = 'msg ai';
      div.innerHTML = '<div class="msg-avatar">空</div><div class="msg-content"><div class="typing"><span></span><span></span><span></span></div></div>';
      msgs.appendChild(div);
      return div;
    },

    scrollToBottom() {
      const msgs = $('#messages');
      if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
    },

    updateSendButton() {
      const btn = $('#sendBtn');
      const attach = $('#btnAttach');
      if (!btn) return;
      if (STATE.streaming) {
        btn.className = 'btn-stop';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
        btn.disabled = false;
        if (attach) attach.style.display = 'none';
      } else {
        btn.className = 'btn-send';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
        btn.disabled = !($('#chatInput')?.value?.trim());
        if (attach) attach.style.display = '';
      }
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: SearchModule — 联网搜索触发、结果展示、来源引用
     ═══════════════════════════════════════════════════════════════════ */
  const SearchModule = {
    toggle() {
      STATE.searchEnabled = !STATE.searchEnabled;
      const btn = $('#searchToggle');
      if (btn) btn.classList.toggle('active', STATE.searchEnabled);
      NotificationSystem.toast(
        STATE.searchEnabled ? '联网搜索已开启' : '联网搜索已关闭',
        STATE.searchEnabled ? 'info' : 'info'
      );
    },

    isEnabled() {
      return STATE.searchEnabled;
    },

    renderSources(sources, parentEl) {
      if (!sources || sources.length === 0) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'search-sources';
      wrapper.style.cssText = 'margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;';
      sources.forEach((src) => {
        const el = document.createElement('span');
        el.className = 'search-source';
        el.textContent = src.title || src.url || '来源';
        el.title = src.url || '';
        el.onclick = () => { if (src.url) window.open(src.url, '_blank'); };
        wrapper.appendChild(el);
      });
      parentEl.appendChild(wrapper);
    },

    renderIndicator(parentEl) {
      const el = document.createElement('div');
      el.className = 'search-indicator';
      el.innerHTML = '<span class="search-indicator-spinner"></span> 正在搜索...';
      parentEl.appendChild(el);
      return el;
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: FileHandler — 文件拖拽上传、批量处理、进度显示
     ═══════════════════════════════════════════════════════════════════ */
  const FileHandler = {
    init() {
      const dropZone = $('#fileDropZone');
      if (!dropZone) return;

      ['dragenter', 'dragover'].forEach((evt) => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach((evt) => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropZone.classList.remove('drag-over');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
      });

      dropZone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = () => {
          this.addFiles(Array.from(input.files));
        };
        input.click();
      });
    },

    addFiles(files) {
      files.forEach((f) => {
        if (!STATE.uploadedFiles.find(x => x.name === f.name && x.size === f.size)) {
          STATE.uploadedFiles.push(f);
        }
      });
      this.render();
    },

    removeFile(index) {
      STATE.uploadedFiles.splice(index, 1);
      this.render();
    },

    clearFiles() {
      STATE.uploadedFiles = [];
      this.render();
    },

    render() {
      const list = $('#filePreviewList');
      const zone = $('#fileDropZone');
      if (!list || !zone) return;

      if (STATE.uploadedFiles.length === 0) {
        list.innerHTML = '';
        zone.classList.remove('visible');
        return;
      }

      zone.classList.add('visible');
      list.innerHTML = STATE.uploadedFiles.map((f, i) =>
        '<div class="file-preview-card">' +
        '<span class="file-preview-card-name">' + escapeHtml(f.name) + '</span>' +
        '<span style="font-size:10px;color:var(--text-muted)">' + formatFileSize(f.size) + '</span>' +
        '<span class="file-preview-card-remove" onclick="CeeApp.FileHandler.removeFile(' + i + ')">x</span>' +
        '</div>'
      ).join('');
    },

    getFiles() {
      return STATE.uploadedFiles;
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: ThinkPanel — 深度思考展示、CoT步骤动画
     ═══════════════════════════════════════════════════════════════════ */
  const ThinkPanel = {
    create(element) {
      const wrapper = document.createElement('div');
      wrapper.className = 'think-panel';
      const id = 'tp' + Date.now();
      wrapper.id = id;
      wrapper.innerHTML =
        '<div class="think-panel-header" onclick="CeeApp.ThinkPanel.toggle(\'' + id + '\')">' +
        '<svg class="think-panel-arrow" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5l8 7-8 7z"/></svg>' +
        '<span class="think-panel-title">思考过程</span>' +
        '<span class="think-panel-duration">0.0s</span>' +
        '</div>' +
        '<div class="think-panel-body"></div>';
      return wrapper;
    },

    toggle(id) {
      const panel = document.getElementById(id);
      if (!panel) return;
      const arrow = panel.querySelector('.think-panel-arrow');
      const body = panel.querySelector('.think-panel-body');
      arrow.classList.toggle('open');
      body.classList.toggle('open');
    },

    addStep(id, stepName, detail) {
      const panel = document.getElementById(id);
      if (!panel) return;
      const body = panel.querySelector('.think-panel-body');
      const step = document.createElement('div');
      step.className = 'think-step running';
      step.innerHTML =
        '<div class="think-step-icon">&#9679;</div>' +
        '<div class="think-step-content">' +
        '<div class="think-step-name">' + escapeHtml(stepName) + '</div>' +
        (detail ? '<div class="think-step-detail">' + escapeHtml(detail) + '</div>' : '') +
        '</div>';
      body.appendChild(step);
      body.classList.add('open');
      return step;
    },

    markDone(id, stepName) {
      const panel = document.getElementById(id);
      if (!panel) return;
      const steps = panel.querySelectorAll('.think-step');
      steps.forEach((s) => {
        const nameEl = s.querySelector('.think-step-name');
        if (nameEl && nameEl.textContent === stepName) {
          s.className = 'think-step done';
          s.querySelector('.think-step-icon').innerHTML = '&#10003;';
        }
      });
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: KnowledgePanel — 知识库浏览、搜索、收藏
     ═══════════════════════════════════════════════════════════════════ */
  const KnowledgePanel = {
    knowledgeData: [
      { id: 'cog_emergence', title: '认知涌现', desc: '复杂认知系统中，宏观有序的智能行为从微观简单规则的相互作用中自发产生。', category: 'core' },
      { id: 'cog_geometry', title: '认知几何', desc: '用微分几何刻画思维空间的四个不变量：ITC、SCS、IEC、PFFT。', category: 'core' },
      { id: 't1_mirror', title: 'T1 认知同构镜', desc: '建立认知对象的自反同构映射，保证形式等价转换。', category: 'engine' },
      { id: 't2_prism', title: 'T2 超图坍缩棱镜', desc: '多维度坍缩高维语义超图，生成多视角折射结果。', category: 'engine' },
      { id: 't3_geo', title: 'T3 测地线导航', desc: '在语义空间中计算最短测地线路径，发现原子突破。', category: 'engine' },
      { id: 't4_crystal', title: 'T4 知识结晶', desc: '从文本中析出晶体化知识单元，发现涌现性关联。', category: 'engine' },
      { id: 't5_genesis', title: 'T5 反事实生长', desc: '分支演化+杂交育种，生成高适应度的反事实方案。', category: 'engine' },
      { id: 't6_eval', title: 'T6 认知不变量', desc: '通过四个数学不变量严格评估任意文本的认知质量。', category: 'engine' },
      { id: 'emergence', title: '涌现', desc: '系统整体展现出其组成部分不具备的新属性。', category: 'concept' },
      { id: 'edge_of_chaos', title: '混沌边缘', desc: '复杂系统的最优运行区间，位于完全有序和完全随机之间的临界带。', category: 'concept' },
      { id: 'constitution', title: '项目宪章', desc: '空间五原则：数学严谨、客观优先、可验证、结构优先、长期存续。', category: 'rule' },
      { id: 'free_alt', title: '免费替代方案', desc: '开源软件替代付费服务的推荐清单。', category: 'practical' },
    ],

    open() {
      STATE.knowledgeOpen = true;
      const panel = $('#knowledgePanel');
      if (panel) {
        panel.classList.add('open');
        $('#drawerOverlay').classList.add('open');
        this.render('');
      }
    },

    close() {
      STATE.knowledgeOpen = false;
      $('#knowledgePanel')?.classList.remove('open');
      this.overlayCheck();
    },

    overlayCheck() {
      if (!STATE.drawerOpen && !STATE.settingsOpen && !STATE.knowledgeOpen) {
        $('#drawerOverlay').classList.remove('open');
      }
    },

    search(query) {
      this.render(query);
    },

    render(query) {
      const body = $('#knowledgePanelBody');
      if (!body) return;
      let items = this.knowledgeData;
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((i) =>
          i.title.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
        );
      }
      body.innerHTML = items.map((i) =>
        '<div class="knowledge-card" onclick="CeeApp.KnowledgePanel.select(\'' + i.id + '\')">' +
        '<div class="knowledge-card-title">' + escapeHtml(i.title) + '</div>' +
        '<div class="knowledge-card-desc">' + escapeHtml(i.desc) + '</div>' +
        '</div>'
      ).join('');
    },

    select(id) {
      const item = this.knowledgeData.find((i) => i.id === id);
      if (!item) return;
      ChatEngine.addMessageElement('ai', '【' + item.title + '】\n' + item.desc);
      ChatEngine.scrollToBottom();
      STATE.messages.push({ role: 'assistant', content: '【' + item.title + '】\n' + item.desc });
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: SettingsManager — 设置读写、localStorage持久化
     ═══════════════════════════════════════════════════════════════════ */
  const SettingsManager = {
    defaults: {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      theme: 'dark',
      temperature: 0.7,
      maxTokens: 4096,
      deepThink: false,
      searchEnabled: false,
      fontSize: 14,
    },

    load() {
      const keys = ['cee_api_key', 'cee_base_url', 'cee_model', 'cee_theme',
        'cee_temperature', 'cee_max_tokens', 'cee_deep_think', 'cee_search',
        'cee_font_size'];
      const values = {};
      keys.forEach((k) => {
        const v = localStorage.getItem(k);
        const key = k.replace('cee_', '');
        if (v !== null) values[key] = v;
      });

      this.defaults.apiKey = values.api_key || '';
      this.defaults.baseUrl = values.base_url || 'https://api.openai.com/v1';
      this.defaults.model = values.model || 'gpt-4o-mini';
      this.defaults.theme = values.theme || 'dark';
      this.defaults.temperature = parseFloat(values.temperature) || 0.7;
      this.defaults.maxTokens = parseInt(values.max_tokens) || 4096;
      this.defaults.deepThink = values.deep_think === 'true';
      this.defaults.searchEnabled = values.search === 'true';
      this.defaults.fontSize = parseInt(values.font_size) || 14;

      this.apply();
    },

    apply() {
      const d = this.defaults;
      const apiKeyEl = $('#apiKeyInput');
      const baseUrlEl = $('#baseUrlInput');
      const modelEl = $('#modelInput');
      const tempSlider = $('#tempSlider');
      const tempValue = $('#tempValue');
      const maxTokensEl = $('#maxTokensInput');
      const themeLabel = $('#themeLabel');
      const fontSizeEl = $('#fontSizeInput');

      if (apiKeyEl) apiKeyEl.value = d.apiKey;
      if (baseUrlEl) baseUrlEl.value = d.baseUrl;
      if (modelEl) modelEl.value = d.model;
      if (tempSlider) { tempSlider.value = d.temperature; if (tempValue) tempValue.textContent = d.temperature; }
      if (maxTokensEl) maxTokensEl.value = d.maxTokens;
      if (themeLabel) themeLabel.textContent = d.theme === 'dark' ? '暗色' : '亮色';
      if (fontSizeEl) fontSizeEl.value = d.fontSize;

      document.documentElement.setAttribute('data-theme', d.theme);
      document.body.style.fontSize = d.fontSize + 'px';
      STATE.deepThink = d.deepThink;
      STATE.searchEnabled = d.searchEnabled;

      const deepBtn = $('#deepToggle');
      if (deepBtn) deepBtn.classList.toggle('active', d.deepThink);
      const searchBtn = $('#searchToggle');
      if (searchBtn) searchBtn.classList.toggle('active', d.searchEnabled);
    },

    save() {
      const apiKey = $('#apiKeyInput')?.value?.trim() || '';
      const baseUrl = $('#baseUrlInput')?.value?.trim() || 'https://api.openai.com/v1';
      const model = $('#modelInput')?.value?.trim() || 'gpt-4o-mini';
      const temp = parseFloat($('#tempSlider')?.value || '0.7');
      const maxTokens = parseInt($('#maxTokensInput')?.value || '4096');
      const fontSize = parseInt($('#fontSizeInput')?.value || '14');

      localStorage.setItem('cee_api_key', apiKey);
      localStorage.setItem('cee_base_url', baseUrl);
      localStorage.setItem('cee_model', model);
      localStorage.setItem('cee_temperature', String(temp));
      localStorage.setItem('cee_max_tokens', String(maxTokens));
      localStorage.setItem('cee_font_size', String(fontSize));

      this.defaults.apiKey = apiKey;
      this.defaults.baseUrl = baseUrl;
      this.defaults.model = model;
      this.defaults.temperature = temp;
      this.defaults.maxTokens = maxTokens;
      this.defaults.fontSize = fontSize;

      document.body.style.fontSize = fontSize + 'px';
      NotificationSystem.toast('设置已保存', 'success');
    },

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cee_theme', next);
      this.defaults.theme = next;
      const label = $('#themeLabel');
      if (label) label.textContent = next === 'dark' ? '暗色' : '亮色';
      const label2 = $('#themeLabel2');
      if (label2) label2.textContent = next === 'dark' ? '暗色' : '亮色';
    },

    updateTempDisplay() {
      const slider = $('#tempSlider');
      const display = $('#tempValue');
      if (slider && display) {
        display.textContent = slider.value;
      }
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: UIManager — 抽屉控制、面板切换、主题切换、响应式适配
     ═══════════════════════════════════════════════════════════════════ */
  const UIManager = {
    toggleDrawer() {
      STATE.drawerOpen = !STATE.drawerOpen;
      const drawer = $('#drawer');
      const overlay = $('#drawerOverlay');
      if (drawer) drawer.classList.toggle('open', STATE.drawerOpen);
      if (overlay) overlay.classList.toggle('open', STATE.drawerOpen || STATE.settingsOpen || STATE.knowledgeOpen);
      if (STATE.drawerOpen) SessionManager.list();
    },

    closeDrawer() {
      STATE.drawerOpen = false;
      $('#drawer')?.classList.remove('open');
      if (!STATE.settingsOpen && !STATE.knowledgeOpen) {
        $('#drawerOverlay')?.classList.remove('open');
      }
    },

    toggleSettings() {
      STATE.settingsOpen = !STATE.settingsOpen;
      const panel = $('#settingsPanel');
      const overlay = $('#drawerOverlay');
      if (panel) panel.classList.toggle('open', STATE.settingsOpen);
      if (overlay) overlay.classList.toggle('open', STATE.settingsOpen || STATE.drawerOpen || STATE.knowledgeOpen);
    },

    closeSettings() {
      STATE.settingsOpen = false;
      $('#settingsPanel')?.classList.remove('open');
      if (!STATE.drawerOpen && !STATE.knowledgeOpen) {
        $('#drawerOverlay')?.classList.remove('open');
      }
    },

    toggleKnowledge() {
      if (STATE.knowledgeOpen) {
        KnowledgePanel.close();
      } else {
        KnowledgePanel.open();
      }
    },

    switchPage(page) {
      STATE.currentPage = page;
      $$('.page').forEach(p => p.classList.remove('active'));
      const target = $('#' + page + '-page');
      if (target) target.classList.add('active');
      $$('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.page === page);
      });
      this.updateInputBar();
      if (page === 'engine') startSpiderWeb();
      if (page === 'profile') {
        const apiKeyEl = $('#apiKeyInput');
        const baseUrlEl = $('#baseUrlInput');
        const modelEl = $('#modelInput');
        if (apiKeyEl) apiKeyEl.value = SettingsManager.defaults.apiKey;
        if (baseUrlEl) baseUrlEl.value = SettingsManager.defaults.baseUrl;
        if (modelEl) modelEl.value = SettingsManager.defaults.model;
      }
    },

    updateInputBar() {
      const bar = $('#inputBar');
      if (bar) bar.style.display = STATE.currentPage === 'chat' ? 'flex' : 'none';
    },

    toggleDeepThink() {
      STATE.deepThink = !STATE.deepThink;
      const btn = $('#deepToggle');
      if (btn) btn.classList.toggle('active', STATE.deepThink);
      localStorage.setItem('cee_deep_think', String(STATE.deepThink));
      SettingsManager.defaults.deepThink = STATE.deepThink;
      NotificationSystem.toast(
        STATE.deepThink ? '深度思考已开启：每次回复将展示空间引擎全管线' : '深度思考已关闭',
        'info'
      );
    },

    showRitual() {
      const overlay = $('#ritual');
      if (!overlay) return;
      overlay.classList.add('active');
      setTimeout(() => overlay.classList.remove('active'), 1800);
    },

    quickChat(text) {
      const input = $('#chatInput');
      if (input) {
        input.value = text;
        $('#sendBtn').disabled = false;
      }
      ChatEngine.sendMessage();
    },

    handleInputKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if ($('#chatInput')?.value?.trim()) ChatEngine.sendMessage();
      }
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: CodeBlockManager — 代码块复制、语言检测、行号
     ═══════════════════════════════════════════════════════════════════ */
  const CodeBlockManager = {
    extractFromText(text) {
      const codeBlocks = [];
      const regex = /```(\w*)\n([\s\S]*?)```/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        codeBlocks.push({ language: match[1] || 'text', code: match[2].trim() });
      }
      return codeBlocks;
    },

    renderBlock(language, code) {
      const lines = code.split('\n');
      const lineNumbers = lines.map((_, i) => '<span>' + (i + 1) + '</span>').join('');

      return (
        '<div class="code-block-wrapper">' +
        '<div class="code-block-header">' +
        '<span class="code-block-lang">' + escapeHtml(language || 'text') + '</span>' +
        '<button class="code-block-copy" onclick="CeeApp.CodeBlockManager.copyCode(this)" data-code="' + escapeHtml(code).replace(/"/g, '&quot;') + '">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>' +
        '复制' +
        '</button>' +
        '</div>' +
        '<div class="code-block-body">' +
        '<div class="code-block-lines">' + lineNumbers + '</div>' +
        '<div class="code-block-content"><pre><code>' + highlightCode(code, language) + '</code></pre></div>' +
        '</div>' +
        '</div>'
      );
    },

    copyCode(button) {
      const code = button.dataset.code;
      const decoded = code.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      navigator.clipboard.writeText(decoded).then(() => {
        button.classList.add('copied');
        button.innerHTML =
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>已复制';
        setTimeout(() => {
          button.classList.remove('copied');
          button.innerHTML =
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>复制';
        }, 2000);
      }).catch(() => {
        NotificationSystem.toast('复制失败，请手动复制', 'warning');
      });
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: NotificationSystem — toast通知
     ═══════════════════════════════════════════════════════════════════ */
  const NotificationSystem = {
    toast(msg, type) {
      type = type || 'info';
      const icons = { info: '&#8505;', success: '&#10003;', warning: '&#9888;', error: '&#10007;' };
      const container = $('#toastContainer');
      if (!container) return;

      const el = document.createElement('div');
      el.className = 'toast toast-' + type;
      el.innerHTML =
        '<span class="toast-icon">' + (icons[type] || '') + '</span>' +
        '<span class="toast-msg">' + escapeHtml(msg) + '</span>' +
        '<span class="toast-close" onclick="this.parentElement.classList.remove(\'show\')">x</span>';

      container.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));

      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
      }, 3000);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: KeyboardShortcuts — 快捷键绑定
     ═══════════════════════════════════════════════════════════════════ */
  const KeyboardShortcuts = {
    init() {
      document.addEventListener('keydown', (e) => {
        const isInput = document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.isContentEditable;

        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'k':
              if (!isInput) {
                e.preventDefault();
                SessionManager.create();
              }
              break;
            case '/':
              e.preventDefault();
              SearchModule.toggle();
              break;
            case ',':
              e.preventDefault();
              UIManager.toggleSettings();
              break;
            case 'b':
              if (!isInput) {
                e.preventDefault();
                UIManager.toggleDrawer();
              }
              break;
            case 'j':
              if (!isInput) {
                e.preventDefault();
                UIManager.toggleKnowledge();
              }
              break;
            case 'enter':
              if (isInput) {
                e.preventDefault();
                ChatEngine.sendMessage();
              }
              break;
            case 'd':
              if (!isInput) {
                e.preventDefault();
                UIManager.toggleDeepThink();
              }
              break;
          }
        }

        if (e.key === 'Escape') {
          if (STATE.settingsOpen) UIManager.closeSettings();
          if (STATE.knowledgeOpen) KnowledgePanel.close();
          if (STATE.drawerOpen) UIManager.closeDrawer();
          if (STATE.streaming) ChatEngine.stopStreaming();
        }
      });

      this.renderBar();
    },

    renderBar() {
      const bar = $('#shortcutsBar');
      const shortcuts = [
        { key: 'Ctrl+K', label: '新对话' },
        { key: 'Ctrl+/', label: '搜索' },
        { key: 'Ctrl+,', label: '设置' },
        { key: 'Ctrl+B', label: '历史' },
        { key: 'Ctrl+J', label: '知识库' },
        { key: 'Esc', label: '关闭面板' },
      ];
      if (bar) {
        bar.innerHTML = shortcuts.map((s) =>
          '<span class="shortcut-item"><span class="shortcut-key">' + s.key + '</span>' + s.label + '</span>'
        ).join('');
      }
    },

    show() {
      $('#shortcutsBar')?.classList.add('visible');
    },

    hide() {
      $('#shortcutsBar')?.classList.remove('visible');
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: Analytics — 使用统计收集（本地）
     ═══════════════════════════════════════════════════════════════════ */
  const Analytics = {
    stats: {
      messageCount: 0,
      engineQueries: 0,
      llmQueries: 0,
      sessionsCreated: 0,
      deepThinkUses: 0,
      searchUses: 0,
      startTime: Date.now(),
    },

    init() {
      const saved = localStorage.getItem('cee_analytics');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.assign(this.stats, parsed);
          this.stats.startTime = Date.now();
        } catch (e) { /* ignore */ }
      }
    },

    track(event, value) {
      value = value || 1;
      switch (event) {
        case 'message': this.stats.messageCount += value; break;
        case 'engine_query': this.stats.engineQueries += value; break;
        case 'llm_query': this.stats.llmQueries += value; break;
        case 'session_created': this.stats.sessionsCreated += value; break;
        case 'deep_think': this.stats.deepThinkUses += value; break;
        case 'search': this.stats.searchUses += value; break;
      }
      this.save();
    },

    save() {
      try {
        localStorage.setItem('cee_analytics', JSON.stringify(this.stats));
      } catch (e) { /* ignore */ }
    },

    getSummary() {
      const elapsed = Math.round((Date.now() - this.stats.startTime) / 1000);
      return {
        ...this.stats,
        uptime: elapsed,
        uptimeStr: elapsed > 3600
          ? Math.round(elapsed / 3600) + '小时'
          : elapsed > 60
            ? Math.round(elapsed / 60) + '分钟'
            : elapsed + '秒',
      };
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Engine Cards
     ═══════════════════════════════════════════════════════════════════ */
  function buildEngineCards() {
    const engines = [
      { id: 't1', name: '我的 T1 认知同构镜', desc: '建立认知对象的自反同构映射，保证形式等价转换', endpoint: '/api/t1/mirror' },
      { id: 't2', name: '我的 T2 超图坍缩棱镜', desc: '多维度坍缩高维语义超图，生成多视角折射结果', endpoint: '/api/t2/prism' },
      { id: 't3', name: '我的 T3 测地线导航', desc: '在语义空间中计算最短测地线路径，发现原子突破', endpoint: '/api/t3/geodesic' },
      { id: 't4', name: '我的 T4 知识结晶', desc: '从文本中析出晶体化知识单元，发现涌现性关联', endpoint: '/api/t4/crystallize' },
      { id: 't5', name: '我的 T5 反事实生长', desc: '分支演化+杂交育种，生成高适应度的反事实方案', endpoint: '/api/t5/genesis' },
      { id: 't6', name: '我的 T6 认知几何评估', desc: 'ITC/SCS/IEC/PFFT四不变量评测，输出综合等级', endpoint: '/api/t6/evaluate' },
    ];

    const container = $('#engine-page');
    if (!container) return;

    engines.forEach((eng) => {
      const card = document.createElement('div');
      card.className = 'engine-card';
      card.id = 'card-' + eng.id;
      card.innerHTML =
        '<div class="engine-card-header">' +
        '<span class="engine-card-badge">' + eng.id.toUpperCase() + '</span>' +
        '<span class="engine-card-title">' + escapeHtml(eng.name) + '</span>' +
        '</div>' +
        '<div class="engine-card-desc">' + escapeHtml(eng.desc) + '</div>' +
        '<input class="engine-input" placeholder="输入文本测试 ' + eng.id.toUpperCase() + '..." id="input-' + eng.id + '">' +
        '<button class="btn-engine-run" onclick="CeeApp.runEngine(\'' + eng.id + '\',\'' + eng.endpoint + '\')">运行</button>' +
        '<div class="engine-result" id="result-' + eng.id + '"></div>';
      card.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        this.classList.toggle('expanded');
      });
      container.appendChild(card);
    });
  }

  async function runEngine(id, endpoint) {
    const input = document.getElementById('input-' + id)?.value?.trim();
    if (!input) return;
    const resultEl = document.getElementById('result-' + id);
    if (resultEl) resultEl.textContent = '运行中...';
    Analytics.track('engine_query');
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, options: {} }),
      });
      const data = await resp.json();
      if (resultEl) {
        resultEl.innerHTML = '<pre style="white-space:pre-wrap;font-size:11px">' +
          escapeHtml(JSON.stringify(data, null, 2).slice(0, 500)) + '</pre>';
      }
      updateTemp(data);
    } catch (e) {
      if (resultEl) resultEl.textContent = '错误: ' + e.message;
    }
  }

  function updateTemp(data) {
    if (data.iec !== undefined || data.itc !== undefined) {
      const iec = data.iec || data.scores?.iec || 0.65;
      const pct = Math.round(iec * 100);
      const fill = $('#tempFill');
      const status = $('#tempStatus');
      const value = $('#tempValue');
      if (fill) fill.style.width = pct + '%';
      if (iec < 0.4) {
        if (fill) fill.style.background = 'var(--tier-d)';
        if (status) status.textContent = '冗余态';
      } else if (iec < 0.6) {
        if (fill) fill.style.background = 'var(--tier-c)';
        if (status) status.textContent = '临界带';
      } else if (iec < 0.85) {
        if (fill) fill.style.background = 'var(--tier-a)';
        if (status) status.textContent = '最优态';
      } else {
        if (fill) fill.style.background = 'var(--tier-s)';
        if (status) status.textContent = '混沌态';
      }
      if (value) value.textContent = 'IEC ' + iec.toFixed(2);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     Spider Web Animation
     ═══════════════════════════════════════════════════════════════════ */
  let spiderRunning = false;
  function startSpiderWeb() {
    if (spiderRunning) return;
    spiderRunning = true;
    const canvas = $('#spider-canvas');
    if (!canvas) { spiderRunning = false; return; }
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    const nodes = [];
    const nodeCount = 11;
    const radius = 100;
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      nodes.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        baseX: cx + Math.cos(angle) * radius,
        baseY: cy + Math.sin(angle) * radius,
        phase: Math.random() * Math.PI * 2,
        size: 3 + Math.random() * 4,
        pulse: 0,
        pulseDir: 1,
      });
    }

    const particles = [];
    for (let i = 0; i < 30; i++) {
      const a = Math.floor(Math.random() * nodeCount);
      let b = Math.floor(Math.random() * nodeCount);
      while (b === a) b = Math.floor(Math.random() * nodeCount);
      particles.push({ a, b, t: Math.random(), speed: 0.003 + Math.random() * 0.008 });
    }

    function draw() {
      if (STATE.currentPage !== 'engine') { spiderRunning = false; return; }
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          const alpha = Math.max(0, 1 - dist / 140) * 0.2;
          ctx.strokeStyle = 'rgba(74,222,128,' + alpha + ')';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      particles.forEach((p) => {
        const na = nodes[p.a], nb = nodes[p.b];
        const px = na.x + (nb.x - na.x) * p.t;
        const py = na.y + (nb.y - na.y) * p.t;
        ctx.fillStyle = 'rgba(74,222,128,0.7)';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
        p.t += p.speed;
        if (p.t >= 1) p.t = 0;
      });

      nodes.forEach((n) => {
        n.pulse += 0.02 * n.pulseDir;
        if (n.pulse > 1) { n.pulse = 1; n.pulseDir = -1; }
        if (n.pulse < 0) { n.pulse = 0; n.pulseDir = 1; }
        n.x = n.baseX + Math.sin(Date.now() * 0.001 + n.phase) * 2;
        n.y = n.baseY + Math.cos(Date.now() * 0.0015 + n.phase) * 2;
        const r = n.size + n.pulse * 2;
        ctx.fillStyle = 'rgba(74,222,128,0.9)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ═══════════════════════════════════════════════════════════════════
     Utility Functions
     ═══════════════════════════════════════════════════════════════════ */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  function renderMarkdown(text) {
    let html = escapeHtml(text);

    const codeBlocks = CodeBlockManager.extractFromText(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return CodeBlockManager.renderBlock(lang, code);
    });

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gm, '<hr>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }

  function highlightCode(code, lang) {
    let escaped = escapeHtml(code);

    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/(#.*$)/gm, '<span class="hl-comment">$1</span>');

    escaped = escaped.replace(/"([^"]*)"/g, '<span class="hl-string">"$1"</span>');
    escaped = escaped.replace(/'([^']*)'/g, '<span class="hl-string">\'$1\'</span>');
    escaped = escaped.replace(/`([^`]*)`/g, '<span class="hl-string">`$1`</span>');

    const keywords = ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
      'class', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch',
      'throw', 'new', 'this', 'super', 'extends', 'switch', 'case', 'break', 'continue',
      'typeof', 'instanceof', 'void', 'delete', 'in', 'of', 'def', 'pass', 'yield',
      'with', 'finally', 'do', 'static', 'get', 'set', 'enum', 'type', 'interface',
      'implements', 'package', 'private', 'protected', 'public'];
    keywords.forEach((kw) => {
      const regex = new RegExp('\\b(' + kw + ')\\b', 'g');
      escaped = escaped.replace(regex, '<span class="hl-keyword">$1</span>');
    });

    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');

    return escaped;
  }

  function updateGenProcess(el, steps) {
    const gpEl = el.querySelector('.gen-process');
    if (!gpEl || steps.length === 0) return;
    gpEl.style.display = 'block';
    const doneCount = steps.filter(s => s.status === 'done').length;
    const total = steps.length;
    const stepHtml = steps.map((s) => {
      const icon = s.status === 'done' ? '&#10003;' : s.status === 'running' ? '&#9679;' : '&#9675;';
      return '<div class="gen-step ' + s.status + '">' +
        '<div class="gen-step-icon">' + icon + '</div>' +
        '<div class="gen-step-name">' + escapeHtml(s.step) + '</div>' +
        '</div>';
    }).join('');
    gpEl.innerHTML =
      '<div class="gen-process-header" onclick="CeeApp.toggleGenProcess(this)">' +
      '<svg class="arrow" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5l8 7-8 7z"/></svg>' +
      '<span class="gen-process-title">生成过程</span>' +
      '<span class="gen-process-progress">' + doneCount + '/' + total + '</span>' +
      '</div>' +
      '<div class="gen-process-body">' + stepHtml + '</div>';
  }

  function toggleGenProcess(header) {
    const arrow = header.querySelector('.arrow');
    const body = header.nextElementSibling;
    arrow.classList.toggle('open');
    body.classList.toggle('open');
  }

  function updateAiContent(el, content) {
    const bubble = el.querySelector('.msg-bubble');
    if (bubble) bubble.innerHTML = renderMarkdown(content);
  }

  function finalizeAiMessage(el, scores, tier, mode, content) {
    const contentDiv = el.querySelector('.msg-content');
    if (!contentDiv) return;

    const existingBadge = contentDiv.querySelector('.cee-badge');
    if (existingBadge) existingBadge.remove();

    const existingMetrics = contentDiv.querySelector('.cee-metrics');
    if (existingMetrics) existingMetrics.remove();

    const badge = document.createElement('div');
    badge.className = 'cee-badge tier-' + (tier || 'C');
    badge.textContent = (tier || 'C') + ' 级 · ' + (mode === 'llm' ? 'LLM增强' : '空间引擎');
    contentDiv.insertBefore(badge, contentDiv.firstChild);

    if (scores) {
      const metrics = document.createElement('div');
      metrics.className = 'cee-metrics';
      metrics.innerHTML =
        '<span class="cee-metric ' + (scores.itc >= 0.7 ? 'high' : scores.itc >= 0.5 ? 'mid' : 'low') + '">ITC:' + (scores.itc || 0).toFixed(2) + '</span>' +
        '<span class="cee-metric ' + (scores.scs >= 0.7 ? 'high' : scores.scs >= 0.5 ? 'mid' : 'low') + '">SCS:' + (scores.scs || 0).toFixed(2) + '</span>' +
        '<span class="cee-metric ' + (scores.iec >= 0.4 && scores.iec <= 0.85 ? 'high' : scores.iec >= 0.3 ? 'mid' : 'low') + '">IEC:' + (scores.iec || 0).toFixed(2) + '</span>' +
        '<span class="cee-metric ' + (scores.pfft >= 0.7 ? 'high' : scores.pfft >= 0.5 ? 'mid' : 'low') + '">PFFT:' + (scores.pfft || 0).toFixed(2) + '</span>';
      contentDiv.appendChild(metrics);
    }

    const bubble = el.querySelector('.msg-bubble');
    if (bubble && content) {
      bubble.innerHTML = renderMarkdown(content);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     Global API (exposed for onclick handlers in HTML)
     ═══════════════════════════════════════════════════════════════════ */
  window.CeeApp = {
    SessionManager,
    ChatEngine,
    SearchModule,
    FileHandler,
    ThinkPanel,
    KnowledgePanel,
    SettingsManager,
    UIManager,
    CodeBlockManager,
    NotificationSystem,
    KeyboardShortcuts,
    Analytics,
    runEngine,
    toggleGenProcess,
    /* Legacy aliases for HTML onclick compatibility */
    toggleDrawer: () => UIManager.toggleDrawer(),
    toggleDeepThink: () => UIManager.toggleDeepThink(),
    toggleTheme: () => SettingsManager.toggleTheme(),
    switchPage: (page) => UIManager.switchPage(page),
    handleInputKey: (e) => UIManager.handleInputKey(e),
    quickChat: (text) => UIManager.quickChat(text),
    sendMessage: () => ChatEngine.sendMessage(),
    saveSettings: () => SettingsManager.save(),
    loadSettings: () => SettingsManager.load(),
    newConversation: () => SessionManager.create(),
  };

  /* ═══════════════════════════════════════════════════════════════════
     Initialization
     ═══════════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    SettingsManager.load();
    Analytics.init();
    KeyboardShortcuts.init();
    FileHandler.init();
    buildEngineCards();
    startSpiderWeb();
    UIManager.updateInputBar();
    SessionManager.list();

    /* Input event listeners */
    const chatInput = $('#chatInput');
    if (chatInput) {
      chatInput.addEventListener('input', () => {
        $('#sendBtn').disabled = !chatInput.value.trim();
        const count = $('#charCount');
        if (count) {
          count.textContent = chatInput.value.length;
          count.classList.toggle('near-limit', chatInput.value.length > 3500);
          count.classList.toggle('at-limit', chatInput.value.length >= 4000);
        }
      });
    }

    /* Settings panel event listeners */
    const tempSlider = $('#tempSlider');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => SettingsManager.updateTempDisplay());
    }

    /* Knowledge search */
    const knowledgeSearch = $('#knowledgeSearchInput');
    if (knowledgeSearch) {
      knowledgeSearch.addEventListener('input', (e) => {
        KnowledgePanel.search(e.target.value);
      });
    }

    /* Close panels when clicking overlay */
    const overlay = $('#drawerOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        if (STATE.drawerOpen) UIManager.closeDrawer();
        if (STATE.settingsOpen) UIManager.closeSettings();
        if (STATE.knowledgeOpen) KnowledgePanel.close();
      });
    }

    /* Keyboard shortcuts bar visibility */
    let shortcutsTimeout;
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        KeyboardShortcuts.show();
        clearTimeout(shortcutsTimeout);
        shortcutsTimeout = setTimeout(() => KeyboardShortcuts.hide(), 2000);
      }
    });

    NotificationSystem.toast('空间 v4.0 已就绪', 'success');
  });

})();
