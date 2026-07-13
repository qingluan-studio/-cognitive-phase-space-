/* ═══════════════════════════════════════════════════════════════════
   空间 Mobile — JavaScript 模块 v4.1
   认知涌现 AI 对话界面
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 启动动画 & 背景粒子 ────────────────────────────────────────── */
  (function initStartupAndParticles() {
    const overlay = document.getElementById('startupOverlay');
    if (!overlay) return;

    /* ── 启动画布粒子 ── */
    const suCanvas = document.getElementById('startupCanvas');
    if (suCanvas) {
      const ctx = suCanvas.getContext('2d');
      let suParticles = [], suW, suH, suAnimId;

      function initSuParticles() {
        suW = suCanvas.width = window.innerWidth;
        suH = suCanvas.height = window.innerHeight;
        suParticles = [];
        const cx = suW / 2, cy = suH / 2;
        for (let i = 0; i < 80; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * Math.min(suW, suH) * 0.7;
          suParticles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            ox: cx + Math.cos(angle) * dist,
            oy: cy + Math.sin(angle) * dist,
            r: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.003 + 0.002,
            angle: Math.random() * Math.PI * 2,
            amp: Math.random() * 30 + 10,
            hue: Math.random() < 0.5 ? 200 : 270,
          });
        }
      }

      function drawSuParticles(t) {
        ctx.clearRect(0, 0, suW, suH);
        const cx = suW / 2, cy = suH / 2;
        suParticles.forEach(p => {
          p.angle += p.speed;
          const dx = Math.cos(p.angle) * p.amp;
          const dy = Math.sin(p.angle) * p.amp * 0.6;
          const targetX = p.ox + dx;
          const targetY = p.oy + dy;
          p.x += (targetX - p.x) * 0.02;
          p.y += (targetY - p.y) * 0.02;

          const distToCenter = Math.hypot(p.x - cx, p.y - cy);
          const alpha = Math.max(0.1, 1 - distToCenter / Math.min(suW, suH));

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},70%,65%,${alpha * 0.7})`;
          ctx.fill();
        });

        /* Draw connections between close particles */
        for (let i = 0; i < suParticles.length; i++) {
          for (let j = i + 1; j < suParticles.length; j++) {
            const dx = suParticles[i].x - suParticles[j].x;
            const dy = suParticles[i].y - suParticles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) {
              ctx.beginPath();
              ctx.moveTo(suParticles[i].x, suParticles[i].y);
              ctx.lineTo(suParticles[j].x, suParticles[j].y);
              ctx.strokeStyle = `rgba(91,138,247,${0.08 * (1 - dist / 60)})`;
              ctx.stroke();
            }
          }
        }
        suAnimId = requestAnimationFrame(drawSuParticles);
      }

      initSuParticles();
      suAnimId = requestAnimationFrame(drawSuParticles);
      window.addEventListener('resize', () => { cancelAnimationFrame(suAnimId); initSuParticles(); suAnimId = requestAnimationFrame(drawSuParticles); });

      /* Dismiss startup after 3.5s */
      setTimeout(() => {
        if (suAnimId) cancelAnimationFrame(suAnimId);
        overlay.classList.add('fade-out');
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 700);
      }, 3500);
    }

    /* ── 背景粒子画布 ── */
    const bgCanvas = document.getElementById('bgParticles');
    if (bgCanvas) {
      const bgCtx = bgCanvas.getContext('2d');
      let bgParticles = [], bgW, bgH, bgAnimId;

      function initBgParticles() {
        bgW = bgCanvas.width = window.innerWidth;
        bgH = bgCanvas.height = window.innerHeight;
        bgParticles = [];
        for (let i = 0; i < 45; i++) {
          bgParticles.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            r: Math.random() * 1.2 + 0.3,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            hue: Math.random() < 0.4 ? 215 : Math.random() < 0.6 ? 270 : 200,
            alpha: Math.random() * 0.25 + 0.05,
          });
        }
      }

      function drawBgParticles() {
        bgCtx.clearRect(0, 0, bgW, bgH);
        bgParticles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = bgW + 20;
          if (p.x > bgW + 20) p.x = -20;
          if (p.y < -20) p.y = bgH + 20;
          if (p.y > bgH + 20) p.y = -20;

          bgCtx.beginPath();
          bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          bgCtx.fillStyle = `hsla(${p.hue},60%,60%,${p.alpha})`;
          bgCtx.fill();
        });

        /* Occasional connections */
        for (let i = 0; i < bgParticles.length; i++) {
          for (let j = i + 1; j < bgParticles.length; j++) {
            const dx = bgParticles[i].x - bgParticles[j].x;
            const dy = bgParticles[i].y - bgParticles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80) {
              bgCtx.beginPath();
              bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
              bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
              bgCtx.strokeStyle = `rgba(91,138,247,${0.04 * (1 - dist / 80)})`;
              bgCtx.stroke();
            }
          }
        }
        bgAnimId = requestAnimationFrame(drawBgParticles);
      }

      initBgParticles();
      bgAnimId = requestAnimationFrame(drawBgParticles);
      window.addEventListener('resize', () => { cancelAnimationFrame(bgAnimId); initBgParticles(); bgAnimId = requestAnimationFrame(drawBgParticles); });
    }
  })();

  /* ── State ─────────────────────────────────────────────────────── */
  const STATE = {
    currentPage: 'chat',
    deepThink: false,
    messages: [],
    typing: false,
    streaming: false,
    sessionId: 'default',
    conversations: [],
    allConversations: [],
    drawerOpen: false,
    abortController: null,
    engineAnim: null,
    uploadedFiles: [],
    lastSendPayload: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ═══════════════════════════════════════════════════════════════════
     Module: SessionManager
     ═══════════════════════════════════════════════════════════════════ */
  const SessionManager = {
    async list() {
      try {
        const resp = await fetch('/api/sessions');
        const data = await resp.json();
        STATE.conversations = data.sessions || [];
        STATE.allConversations = [...STATE.conversations];
        this.render();
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    },

    filter(query) {
      if (!query || !query.trim()) {
        STATE.conversations = [...STATE.allConversations];
      } else {
        const q = query.toLowerCase().trim();
        STATE.conversations = STATE.allConversations.filter(c =>
          (c.title || '').toLowerCase().includes(q)
        );
      }
      this.render();
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
          if (STATE.messages.length > 0) {
            this.hideWelcome();
            STATE.messages.forEach((m) => {
              if (m.role === 'user') ChatEngine.addMessageElement('user', m.content);
              else if (m.role === 'assistant') ChatEngine.addMessageElement('ai', m.content);
            });
          } else {
            this.showWelcome();
          }
          ChatEngine.scrollToBottom();
        }
      } catch (e) {
        console.error('Failed to switch session:', e);
      }
      UIManager.closeDrawer();
      this.render();
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

    render() {
      const body = $('#drawerBody');
      if (!body) return;
      if (STATE.conversations.length === 0) {
        body.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128172;</div><div class="empty-state-desc">暂无历史对话</div></div>';
        return;
      }
      body.innerHTML = STATE.conversations.map((c) => {
        const isActive = c.id === STATE.sessionId;
        const title = escapeHtml(c.title || '新对话');
        const count = c.msg_count || 0;
        const escapedId = String(c.id).replace(/'/g, "\\'");
        return '<div class="drawer-conv' + (isActive ? ' active' : '') + '" onclick="CeeApp.SessionManager.switch(\'' + escapedId + '\')">' +
          '<div class="drawer-conv-icon">' + (isActive ? '&#9679;' : '&#9702;') + '</div>' +
          '<div class="drawer-conv-info">' +
          '<div class="drawer-conv-title">' + title + '</div>' +
          '<div class="drawer-conv-meta">' + count + ' 条消息</div>' +
          '</div>' +
          '<div class="drawer-conv-delete" onclick="CeeApp.SessionManager.remove(\'' + escapedId + '\', event)">&times;</div>' +
          '</div>';
      }).join('');
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: ChatEngine
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

      // Add file context if any
      let fullText = text;
      const files = FileHandler.getFiles();
      if (files.length > 0) {
        const fileList = files.map(f => '- ' + f.name + ' (' + formatFileSize(f.size) + ')').join('\n');
        fullText = text + '\n\n[已上传文件:]\n' + fileList;
        FileHandler.clearFiles();
      }

      this.addMessageElement('user', text);
      this.scrollToBottom();

      const typingEl = this.addTyping();
      this.scrollToBottom();
      STATE.typing = true;
      STATE.streaming = true;

      this.updateSendButton();

      const config = SettingsManager.defaults;
      const payload = {
        messages: [...STATE.messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: fullText }],
        session_id: STATE.sessionId,
        api_key: config.apiKey || '',
        base_url: config.baseUrl || 'https://api.openai.com/v1',
        model: config.model || 'gpt-4o-mini',
        temperature: config.temperature || 0.7,
        deep_think: STATE.deepThink,
      };
      STATE.lastSendPayload = payload;

      STATE.abortController = new AbortController();

      this._streamChat(payload, typingEl, text);
    },

    retry() {
      if (!STATE.lastSendPayload) return;
      if (STATE.streaming) this.stopStreaming();

      // Remove last AI message
      const lastAi = STATE.messages.length > 0 && STATE.messages[STATE.messages.length - 1].role === 'assistant';
      if (lastAi) STATE.messages.pop();

      // Also remove the corresponding user message (it will be re-pushed by _streamChat)
      const lastUser = STATE.messages.length > 0 && STATE.messages[STATE.messages.length - 1].role === 'user';
      if (lastUser) STATE.messages.pop();

      const typingEl = this.addTyping();
      this.scrollToBottom();
      STATE.typing = true;
      STATE.streaming = true;
      this.updateSendButton();

      STATE.abortController = new AbortController();
      this._streamChat(STATE.lastSendPayload, typingEl, STATE.messages.length > 0 ? STATE.messages[STATE.messages.length - 1].content : '');
    },

    async _streamChat(payload, typingEl, userText) {
      let aiContent = '';
      let ceeScores = null;
      let ceeTier = '';
      let ceeMode = '';
      let aiMsgEl = null;
      let genSteps = [];
      let stepTimers = {};
      let startTime = Date.now();

      try {
        const resp = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: STATE.abortController.signal,
        });

        if (typingEl) typingEl.remove();

        if (!resp.ok) {
          const errText = await resp.text().catch(() => 'HTTP ' + resp.status);
          throw new Error(errText);
        }
        if (!resp.body) throw new Error('无响应体');

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              switch (parsed.type) {
                case 'step': {
                  const key = parsed.step;
                  if (!stepTimers[key]) stepTimers[key] = Date.now();
                  const existing = genSteps.find(s => s.step === parsed.step);
                  if (existing) {
                    existing.status = parsed.status;
                    if (parsed.status === 'done') existing.duration = ((Date.now() - stepTimers[key]) / 1000).toFixed(1) + 's';
                  } else {
                    genSteps.push({ step: parsed.step, status: parsed.status });
                  }
                  if (!aiMsgEl) aiMsgEl = ChatEngine.addMessageElement('ai', '');
                  updateGenProcess(aiMsgEl, genSteps);
                  break;
                }
                case 'token':
                  aiContent += parsed.content;
                  if (!aiMsgEl) aiMsgEl = ChatEngine.addMessageElement('ai', '');
                  updateAiContent(aiMsgEl, aiContent);
                  ChatEngine.scrollToBottom();
                  break;
                case 'cee':
                  ceeScores = parsed.scores;
                  ceeTier = parsed.tier;
                  ceeMode = parsed.mode;
                  break;
                case 'thinking':
                  if (!aiMsgEl) aiMsgEl = ChatEngine.addMessageElement('ai', '');
                  break;
                case 'done':
                  break;
                case 'error':
                  const err = parsed.content || '处理消息时遇到问题。';
                  if (!aiMsgEl) aiMsgEl = ChatEngine.addMessageElement('ai', err);
                  else {
                    const bubble = aiMsgEl.querySelector('.msg-bubble');
                    if (bubble) bubble.innerHTML = '<div class="error-banner">' + escapeHtml(err) + '<button class="retry-btn" onclick="CeeApp.ChatEngine.retry()">重试</button></div>';
                  }
                  break;
              }
            } catch (e) { /* skip */ }
          }
        }

        if (aiMsgEl && ceeScores) {
          finalizeAiMessage(aiMsgEl, ceeScores, ceeTier, ceeMode, aiContent);
        }
        if (aiMsgEl && !aiContent && !ceeScores) {
          const bubble = aiMsgEl.querySelector('.msg-bubble');
          if (bubble && !bubble.textContent.trim()) {
            bubble.textContent = '(空响应)';
          }
        }

        STATE.messages.push({ role: 'user', content: userText });
        STATE.messages.push({ role: 'assistant', content: aiContent || '...' });

        if (ceeTier === 'S') UIManager.showRitual();

        setTimeout(() => SessionManager.list(), 500);

      } catch (e) {
        if (e.name !== 'AbortError') {
          if (typingEl) typingEl.remove();
          if (aiMsgEl) {
            const bubble = aiMsgEl.querySelector('.msg-bubble');
            if (bubble) bubble.innerHTML = '<div class="error-banner">连接失败，请稍后重试<button class="retry-btn" onclick="CeeApp.ChatEngine.retry()">重试</button></div>';
          } else {
            ChatEngine.addMessageElement('ai', '连接失败，请稍后重试。');
          }
          NotificationSystem.toast('网络错误', 'error');
        }
      }

      STATE.typing = false;
      STATE.streaming = false;
      STATE.abortController = null;
      this.updateSendButton();
      this.scrollToBottom();
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

      const bubbleContent = role === 'user' ? escapeHtml(content) : (content ? renderMarkdown(content) : '');
      div.innerHTML =
        '<div class="msg-avatar">' + (role === 'user' ? '<span>U</span>' : '<img src="/static/avatar.svg" alt="CEE" width="28" height="28">') + '</div>' +
        '<div class="msg-content">' +
        (role === 'ai' ? '<div class="gen-process" style="display:none"></div>' : '') +
        '<div class="msg-bubble">' + bubbleContent + '</div>' +
        '<div class="msg-actions">' +
        '<button class="msg-action-btn" onclick="CeeApp.ChatEngine.copyMessage(this)" title="复制">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>' +
        '</button>' +
        (role === 'ai' ? '<button class="msg-action-btn" onclick="CeeApp.ChatEngine.retry()" title="重新生成"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>' : '') +
        '</div>' +
        '</div>';
      msgs.appendChild(div);
      return div;
    },

    copyMessage(btn) {
      const bubble = btn.closest('.msg-content').querySelector('.msg-bubble');
      if (!bubble) return;
      const text = bubble.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        NotificationSystem.toast('已复制', 'success');
        setTimeout(() => btn.classList.remove('copied'), 1500);
      }).catch(() => {
        NotificationSystem.toast('复制失败', 'warning');
      });
    },

    addTyping() {
      const msgs = $('#messages');
      if (!msgs) return null;
      const div = document.createElement('div');
      div.className = 'msg ai';
      div.innerHTML = '<div class="msg-avatar"><img src="/static/avatar.svg" alt="CEE" width="28" height="28"></div><div class="msg-content"><div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>';
      msgs.appendChild(div);
      return div;
    },

    scrollToBottom() {
      const container = document.getElementById('chat-page') || document.querySelector('main');
      if (container) setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
    },

    updateSendButton() {
      const btn = $('#sendBtn');
      const attach = $('#btnAttach');
      if (!btn) return;
      if (STATE.streaming) {
        btn.className = 'btn-stop';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
        btn.disabled = false;
        btn.title = '停止生成';
        if (attach) attach.style.display = 'none';
      } else {
        btn.className = 'btn-send';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
        btn.disabled = !($('#chatInput')?.value?.trim());
        btn.title = '发送消息';
        if (attach) attach.style.display = '';
      }
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: SearchModule
     ═══════════════════════════════════════════════════════════════════ */
  const SearchModule = {
    toggle() {
      STATE.searchEnabled = !STATE.searchEnabled;
      const btn = $('#searchToggle');
      if (btn) {
        btn.classList.toggle('active', STATE.searchEnabled);
        btn.title = STATE.searchEnabled ? '联网搜索已开启' : '联网搜索已关闭';
      }
      localStorage.setItem('cee_search', String(STATE.searchEnabled));
      NotificationSystem.toast(
        STATE.searchEnabled ? '联网搜索已开启' : '联网搜索已关闭',
        'info'
      );
    },

    isEnabled() { return STATE.searchEnabled; },

    renderSources(sources, parentEl) {
      if (!sources || sources.length === 0) return;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;';
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
      el.innerHTML = '<span class="search-indicator-spinner"></span> 正在搜索相关资料...';
      parentEl.appendChild(el);
      return el;
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: FileHandler
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
        input.onchange = () => { this.addFiles(Array.from(input.files)); };
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
      if (STATE.uploadedFiles.length > 0 && STATE.currentPage === 'chat') {
        SessionManager.hideWelcome();
      }
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
        '<span style="font-size:10px;color:var(--text-muted);white-space:nowrap">' + formatFileSize(f.size) + '</span>' +
        '<span class="file-preview-card-remove" onclick="CeeApp.FileHandler.removeFile(' + i + ')">&times;</span>' +
        '</div>'
      ).join('');
    },

    getFiles() { return STATE.uploadedFiles; },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: ThinkPanel
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
      if (arrow) arrow.classList.toggle('open');
      if (body) body.classList.toggle('open');
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
     Module: KnowledgePanel
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
      { id: 'free_alt', title: '免费替代方案', desc: '开源软件替代付费服务的推荐清单，覆盖办公、设计、开发等场景。', category: 'practical' },
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

    search(query) { this.render(query); },

    render(query) {
      const body = $('#knowledgePanelBody');
      if (!body) return;
      let items = this.knowledgeData;
      if (query) {
        const q = query.toLowerCase();
        items = items.filter((i) =>
          i.title.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
        );
      }
      if (items.length === 0) {
        body.innerHTML = '<div class="empty-state"><div class="empty-state-desc">未找到匹配条目</div></div>';
        return;
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
      this.close();
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: SettingsManager
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
      try {
        const d = this.defaults;
        d.apiKey = localStorage.getItem('cee_api_key') || '';
        d.baseUrl = localStorage.getItem('cee_base_url') || 'https://api.openai.com/v1';
        d.model = localStorage.getItem('cee_model') || 'gpt-4o-mini';
        d.theme = localStorage.getItem('cee_theme') || 'dark';
        const tempVal = parseFloat(localStorage.getItem('cee_temperature'));
        d.temperature = isNaN(tempVal) ? 0.7 : tempVal;
        d.maxTokens = parseInt(localStorage.getItem('cee_max_tokens')) || 4096;
        d.deepThink = localStorage.getItem('cee_deep_think') === 'true';
        d.searchEnabled = localStorage.getItem('cee_search') === 'true';
        d.fontSize = parseInt(localStorage.getItem('cee_font_size')) || 14;
      } catch (e) { /* ignore */ }
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

      if (apiKeyEl) apiKeyEl.value = d.apiKey;
      if (baseUrlEl) baseUrlEl.value = d.baseUrl;
      if (modelEl) modelEl.value = d.model;
      if (tempSlider) { tempSlider.value = d.temperature; if (tempValue) tempValue.textContent = d.temperature; }
      if (maxTokensEl) maxTokensEl.value = d.maxTokens;
      const label = d.theme === 'dark' ? '暗色' : '亮色';
      if (themeLabel) themeLabel.textContent = label;

      document.documentElement.setAttribute('data-theme', d.theme);
      STATE.deepThink = d.deepThink;

      const deepBtn = $('#deepToggle');
      if (deepBtn) deepBtn.classList.toggle('active', d.deepThink);
    },

    save() {
      try {
        const apiKey = $('#apiKeyInput')?.value?.trim() || '';
        const baseUrl = $('#baseUrlInput')?.value?.trim() || 'https://api.openai.com/v1';
        const model = $('#modelInput')?.value?.trim() || 'gpt-4o-mini';
        const temp = parseFloat($('#tempSlider')?.value || '0.7');
        const maxTokens = parseInt($('#maxTokensInput')?.value || '4096');

        localStorage.setItem('cee_api_key', apiKey);
        localStorage.setItem('cee_base_url', baseUrl);
        localStorage.setItem('cee_model', model);
        localStorage.setItem('cee_temperature', String(temp));
        localStorage.setItem('cee_max_tokens', String(maxTokens));
        localStorage.setItem('cee_font_size', String(this.defaults.fontSize));
        localStorage.setItem('cee_deep_think', String(STATE.deepThink));

        Object.assign(this.defaults, { apiKey, baseUrl, model, temperature: temp, maxTokens });
        NotificationSystem.toast('设置已保存', 'success');
      } catch (e) {
        console.error('SettingsManager.save failed:', e);
      }
    },

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cee_theme', next);
      this.defaults.theme = next;
      const label = next === 'dark' ? '暗色' : '亮色';
      const el1 = $('#themeLabel');
      if (el1) el1.textContent = label;
    },

    updateTempDisplay() {
      const slider = $('#tempSlider');
      const display = $('#tempValue');
      if (slider && display) display.textContent = slider.value;
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: UIManager
     ═══════════════════════════════════════════════════════════════════ */
  const UIManager = {
    toggleDrawer() {
      STATE.drawerOpen = !STATE.drawerOpen;
      const drawer = $('#drawer');
      const overlay = $('#drawerOverlay');
      if (drawer) drawer.classList.toggle('open', STATE.drawerOpen);
      if (overlay) overlay.classList.toggle('open', STATE.drawerOpen);
      if (STATE.drawerOpen) SessionManager.list();
    },

    closeDrawer() {
      STATE.drawerOpen = false;
      $('#drawer')?.classList.remove('open');
      $('#drawerOverlay')?.classList.remove('open');
    },

    openSettings() {
      const overlay = $('#settingsOverlay');
      if (overlay) overlay.classList.add('active');
      this.syncSettingsForm();
    },

    closeSettings() {
      $('#settingsOverlay')?.classList.remove('active');
    },

    syncSettingsForm() {
      const d = SettingsManager.defaults;
      const apiKeyEl = $('#apiKeyInput');
      const baseUrlEl = $('#baseUrlInput');
      const modelEl = $('#modelInput');
      const tempEl = $('#tempSlider');
      const tempVEl = $('#tempValue');
      const maxTEl = $('#maxTokensInput');
      if (apiKeyEl && !apiKeyEl.value) apiKeyEl.value = d.apiKey || '';
      if (baseUrlEl && !baseUrlEl.value) baseUrlEl.value = d.baseUrl;
      if (modelEl && !modelEl.value) modelEl.value = d.model;
      if (tempEl && !tempEl.value) { tempEl.value = d.temperature || 0.7; if (tempVEl) tempVEl.textContent = d.temperature || 0.7; }
      if (maxTEl && !maxTEl.value) maxTEl.value = d.maxTokens || 4096;
    },

    toggleDeepThink() {
      STATE.deepThink = !STATE.deepThink;
      const btn = $('#deepToggle');
      if (btn) btn.classList.toggle('active', STATE.deepThink);
      localStorage.setItem('cee_deep_think', String(STATE.deepThink));
      SettingsManager.defaults.deepThink = STATE.deepThink;
      NotificationSystem.toast(
        STATE.deepThink ? '深度思考已开启：引擎全管线分析' : '深度思考已关闭',
        'info'
      );
    },

    showRitual() {
      const overlay = $('#ritual');
      if (!overlay) return;
      overlay.classList.add('active');
      setTimeout(() => overlay.classList.remove('active'), 1800);
    },

    switchPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const el = document.getElementById(page + '-page') || document.getElementById(page);
      if (el) el.classList.add('active');
      STATE.currentPage = page;
    },

    quickChat(text) {
      if (STATE.currentPage !== 'chat') this.switchPage('chat');
      const input = $('#chatInput');
      if (input) {
        input.value = text;
        $('#sendBtn').disabled = false;
        autoResize(input);
      }
      setTimeout(() => ChatEngine.sendMessage(), 100);
    },

    handleInputKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if ($('#chatInput')?.value?.trim()) ChatEngine.sendMessage();
      }
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: CodeBlockManager
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
      const encoded = code.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return '<div class="code-block-wrapper">' +
        '<div class="code-block-header">' +
        '<span class="code-block-lang">' + escapeHtml(language || 'text') + '</span>' +
        '<button class="code-block-copy" onclick="CeeApp.CodeBlockManager.copyCode(this)" data-code="' + encoded + '">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>' +
        '复制</button></div>' +
        '<div class="code-block-body">' +
        '<div class="code-block-lines">' + lineNumbers + '</div>' +
        '<div class="code-block-content"><pre><code>' + highlightCode(code, language) + '</code></pre></div>' +
        '</div></div>';
    },

    copyCode(button) {
      const code = button.dataset.code;
      if (!code) return;
      const decoded = code.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      navigator.clipboard.writeText(decoded).then(() => {
        button.classList.add('copied');
        button.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>已复制';
        setTimeout(() => {
          button.classList.remove('copied');
          button.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>复制';
        }, 2000);
      }).catch(() => {
        NotificationSystem.toast('复制失败，请手动复制', 'warning');
      });
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: NotificationSystem
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
        '<span class="toast-close" onclick="this.parentElement.classList.remove(\'show\')">&times;</span>';

      container.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));

      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
      }, 3000);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Module: KeyboardShortcuts
     ═══════════════════════════════════════════════════════════════════ */
  const KeyboardShortcuts = {
    init() {
      document.addEventListener('keydown', (e) => {
        const isInput = document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.isContentEditable;

        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'n': if (!isInput) { e.preventDefault(); CeeApp.newConversation(); } break;
            case ',': e.preventDefault(); UIManager.openSettings(); break;
            case 'b': if (!isInput) { e.preventDefault(); UIManager.toggleDrawer(); } break;
            case 'enter': if (isInput) { e.preventDefault(); ChatEngine.sendMessage(); } break;
          }
        }

        if (e.key === 'Escape') {
          UIManager.closeSettings();
          if (STATE.drawerOpen) UIManager.closeDrawer();
          if (STATE.streaming) ChatEngine.stopStreaming();
        }
      });

      this.renderBar();
    },

    renderBar() {
      const bar = $('#shortcutsBar');
      if (!bar) return;
      const shortcuts = [
        { key: 'Ctrl+N', label: '新对话' },
        { key: 'Ctrl+,', label: '设置' },
        { key: 'Ctrl+B', label: '历史' },
        { key: 'Esc', label: '关闭' },
      ];
      bar.innerHTML = shortcuts.map(s =>
        '<span class="shortcut-item"><span class="shortcut-key">' + s.key + '</span>' + s.label + '</span>'
      ).join('');
    },

    show() { $('#shortcutsBar')?.classList.add('visible'); },
    hide() { $('#shortcutsBar')?.classList.remove('visible'); },
  };

  /* ═══════════════════════════════════════════════════════════════════
     Engine Cards
     ═══════════════════════════════════════════════════════════════════ */
  function buildEngineCards() {
    const engines = [
      { id: 't1', name: 'T1 认知同构镜', desc: '建立认知对象的自反同构映射，保证形式等价转换', endpoint: '/api/t1/mirror' },
      { id: 't2', name: 'T2 超图坍缩棱镜', desc: '多维度坍缩高维语义超图，生成多视角折射结果', endpoint: '/api/t2/prism' },
      { id: 't3', name: 'T3 测地线导航', desc: '在语义空间中计算最短测地线路径，发现原子突破', endpoint: '/api/t3/geodesic' },
      { id: 't4', name: 'T4 知识结晶', desc: '从文本中析出晶体化知识单元，发现涌现性关联', endpoint: '/api/t4/crystallize' },
      { id: 't5', name: 'T5 反事实生长', desc: '分支演化+杂交育种，生成高适应度的反事实方案', endpoint: '/api/t5/genesis' },
      { id: 't6', name: 'T6 认知几何评估', desc: 'ITC/SCS/IEC/PFFT四不变量评测，输出综合等级', endpoint: '/api/t6/evaluate' },
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
    if (!input) { NotificationSystem.toast('请输入测试文本', 'warning'); return; }
    const resultEl = document.getElementById('result-' + id);
    if (resultEl) resultEl.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, options: {} }),
      });
      const data = await resp.json();
      if (resultEl) {
        resultEl.innerHTML = '<pre style="white-space:pre-wrap;font-size:11px;line-height:1.5">' +
          escapeHtml(JSON.stringify(data, null, 2).slice(0, 800)) + '</pre>';
      }
      updateTemp(data);
    } catch (e) {
      if (resultEl) resultEl.innerHTML = '<div class="error-banner">错误: ' + escapeHtml(e.message) + '</div>';
    }
  }

  function updateTemp(data) {
    const iec = data.iec || data.scores?.iec || 0.65;
    const pct = Math.round(iec * 100);
    const fill = $('#tempFill');
    const status = $('#tempStatus');
    const value = $('#tempValue');
    if (fill) fill.style.width = pct + '%';
    let statusText, bg;
    if (iec < 0.4) { statusText = '冗余态'; bg = 'var(--tier-d)'; }
    else if (iec < 0.6) { statusText = '临界带'; bg = 'var(--tier-c)'; }
    else if (iec < 0.85) { statusText = '最优态'; bg = 'var(--tier-a)'; }
    else { statusText = '混沌态'; bg = 'var(--tier-s)'; }
    if (fill) fill.style.background = bg;
    if (status) status.textContent = statusText;
    if (value) value.textContent = 'IEC ' + iec.toFixed(2);
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
        size: 3 + Math.random() * 5,
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
          const alpha = Math.max(0, 1 - dist / 140) * 0.25;
          ctx.strokeStyle = 'rgba(91,138,247,' + alpha + ')';
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
        ctx.fillStyle = 'rgba(91,138,247,0.8)';
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
        n.x = n.baseX + Math.sin(Date.now() * 0.001 + n.phase) * 2.5;
        n.y = n.baseY + Math.cos(Date.now() * 0.0015 + n.phase) * 2.5;
        const r = n.size + n.pulse * 2;
        ctx.fillStyle = 'rgba(91,138,247,0.9)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
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
    if (text == null) return '';
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
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function renderMarkdown(text) {
    // Pre-process: extract code blocks BEFORE escaping to avoid double-escaping
    const codeBlockMap = {};
    let workText = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const id = '@@CODEBLOCK_' + Object.keys(codeBlockMap).length + '@@';
      codeBlockMap[id] = CodeBlockManager.renderBlock(lang, code.trim());
      return id;
    });

    let html = escapeHtml(workText);

    // Tables
    html = html.replace(/^\|(.+)\|\n\|[-: |]+\|\n((?:\|.+\|\n?)*)/gm, (match, header, rows) => {
      const hCols = header.split('|').map(c => c.trim()).filter(c => c);
      const rLines = rows.trim().split('\n');
      let table = '<table><thead><tr>';
      hCols.forEach(c => table += '<th>' + c + '</th>');
      table += '</tr></thead><tbody>';
      rLines.forEach(line => {
        const cols = line.split('|').map(c => c.trim()).filter(c => c);
        table += '<tr>';
        cols.forEach(c => table += '<td>' + c + '</td>');
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    });

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      const safeUrl = /^(https?:|mailto:)/i.test(url) ? url : '#';
      return '<a href="' + safeUrl + '" target="_blank" rel="noopener">' + text + '</a>';
    });

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Unordered lists
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');

    // Wrap adjacent <li> in <ul> or <ol>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
      if (match.includes('<li>') && !match.includes('<ul>') && !match.includes('<ol>')) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p><\/p>/g, '');

    // Restore code blocks
    Object.keys(codeBlockMap).forEach(id => {
      html = html.replace(id, codeBlockMap[id]);
    });

    return html;
  }

  function highlightCode(code, lang) {
    let escaped = escapeHtml(code);

    // Comments
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/(#.*$)/gm, '<span class="hl-comment">$1</span>');

    // Strings
    escaped = escaped.replace(/"([^"]*)"/g, '<span class="hl-string">"$1"</span>');
    escaped = escaped.replace(/'([^']*)'/g, '<span class="hl-string">\'$1\'</span>');
    escaped = escaped.replace(/`([^`]*)`/g, '<span class="hl-string">`$1`</span>');

    // Keywords
    const keywords = [
      'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
      'class', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch',
      'throw', 'new', 'this', 'super', 'extends', 'switch', 'case', 'break', 'continue',
      'typeof', 'instanceof', 'void', 'delete', 'in', 'of', 'def', 'pass', 'yield',
      'with', 'finally', 'do', 'static', 'get', 'set', 'enum', 'type', 'interface',
      'implements', 'package', 'private', 'protected', 'public',
    ];
    keywords.forEach(kw => {
      const regex = new RegExp('\\b(' + kw + ')\\b', 'g');
      escaped = escaped.replace(regex, '<span class="hl-keyword">$1</span>');
    });

    // Numbers
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
        (s.duration ? '<span style="font-size:10px;color:var(--text-muted)">' + s.duration + '</span>' : '') +
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
    if (arrow) arrow.classList.toggle('open');
    if (body) body.classList.toggle('open');
  }

  function updateAiContent(el, content) {
    const bubble = el.querySelector('.msg-bubble');
    if (bubble) bubble.innerHTML = renderMarkdown(content);
  }

  function finalizeAiMessage(el, scores, tier, mode, content) {
    const contentDiv = el.querySelector('.msg-content');
    if (!contentDiv) return;

    // Remove existing CEE elements
    const existingBadge = contentDiv.querySelector('.cee-badge');
    if (existingBadge) existingBadge.remove();
    const existingMetrics = contentDiv.querySelector('.cee-metrics');
    if (existingMetrics) existingMetrics.remove();

    // Add CEE badge
    const badge = document.createElement('div');
    badge.className = 'cee-badge tier-' + (tier || 'C');
    const tierLabel = tier || 'C';
    const modeLabel = mode === 'llm' ? 'LLM' : '空间引擎';
    const tierIcons = { S: '&#9733;', A: '&#9733;', B: '&#9679;', C: '&#9679;', D: '&#9888;' };
    badge.innerHTML = (tierIcons[tierLabel] || '') + ' ' + tierLabel + ' 级 &middot; ' + modeLabel;
    if (contentDiv.firstChild) {
      contentDiv.insertBefore(badge, contentDiv.firstChild);
    } else {
      contentDiv.appendChild(badge);
    }

    // Add metrics
    if (scores) {
      const metrics = document.createElement('div');
      metrics.className = 'cee-metrics';
      const items = [
        { label: 'ITC', value: scores.itc || 0 },
        { label: 'SCS', value: scores.scs || 0 },
        { label: 'IEC', value: scores.iec || 0 },
        { label: 'PFFT', value: scores.pfft || 0 },
      ];
      metrics.innerHTML = items.map(item => {
        const cls = item.value >= 0.7 ? 'high' : item.value >= 0.5 ? 'mid' : 'low';
        return '<span class="cee-metric ' + cls + '">' + item.label + ':' + item.value.toFixed(2) + '</span>';
      }).join('');
      contentDiv.appendChild(metrics);
    }

    // Update message content
    const bubble = el.querySelector('.msg-bubble');
    if (bubble && content) {
      bubble.innerHTML = renderMarkdown(content);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     Global API
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
    runEngine,
    toggleGenProcess,

    /* Legacy aliases */
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
    KeyboardShortcuts.init();
    FileHandler.init();
    SessionManager.list();

    /* Chat input */
    const chatInput = $('#chatInput');
    if (chatInput) {
      chatInput.addEventListener('input', () => {
        $('#sendBtn').disabled = !chatInput.value.trim();
      });
    }

    /* Settings form event listeners */
    const tempSlider = $('#tempSlider');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => SettingsManager.updateTempDisplay());
    }

    /* Drawer overlay click */
    const overlay = $('#drawerOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        if (STATE.drawerOpen) UIManager.closeDrawer();
      });
    }

    /* Keyboard shortcuts bar */
    let shortcutsTimeout;
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        KeyboardShortcuts.show();
        clearTimeout(shortcutsTimeout);
        shortcutsTimeout = setTimeout(() => KeyboardShortcuts.hide(), 2000);
      }
    });

    NotificationSystem.toast('空间已就绪', 'success');
    StarfieldBackground.init();
  });

  /* ═══════════════════════════════════════════════════════════════════
     Module: StarfieldBackground
     ═══════════════════════════════════════════════════════════════════ */
  const StarfieldBackground = {
    canvas: null,
    ctx: null,
    stars: [],
    meteors: [],
    w: 0,
    h: 0,
    active: false,
    animId: null,

    init() {
      this.canvas = $('#starCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.createStars();
      this.loop();
    },

    resize() {
      this.w = this.canvas.width = window.innerWidth;
      this.h = this.canvas.height = window.innerHeight;
    },

    createStars() {
      this.stars = [];
      for (let i = 0; i < 120; i++) {
        this.stars.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          r: Math.random() * 1.8 + 0.3,
          opacity: Math.random() * 0.7 + 0.3,
          speed: Math.random() * 0.015 + 0.005,
          phase: Math.random() * Math.PI * 2,
        });
      }
    },

    spawnMeteor() {
      if (!this.active || this.meteors.length > 3) return;
      if (Math.random() > 0.008) return;
      const angle = (Math.random() - 0.3) * 0.6;
      this.meteors.push({
        x: Math.random() * this.w,
        y: -10,
        vx: angle * 3,
        vy: 2 + Math.random() * 3,
        life: 0,
        maxLife: 80 + Math.random() * 60,
        trail: [],
      });
    },

    drawStar(s) {
      const ctx = this.ctx;
      const flicker = Math.sin(s.phase + performance.now() * s.speed) * 0.3 + 0.7;
      const alpha = s.opacity * flicker;
      ctx.beginPath();
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
      grd.addColorStop(0, `rgba(200,220,255,${alpha})`);
      grd.addColorStop(0.4, `rgba(150,180,255,${alpha * 0.5})`);
      grd.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.fillStyle = grd;
      ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,235,255,${alpha})`;
      ctx.fill();
    },

    updateMeteor(m) {
      m.life++;
      m.x += m.vx;
      m.y += m.vy;
      m.trail.unshift({ x: m.x, y: m.y });
      if (m.trail.length > 20) m.trail.pop();

      const ctx = this.ctx;
      const lifeRatio = 1 - m.life / m.maxLife;
      const fadeIn = Math.min(m.life / 15, 1);

      if (m.trail.length > 1) {
        for (let i = 0; i < m.trail.length - 1; i++) {
          const t = 1 - i / m.trail.length;
          ctx.beginPath();
          ctx.moveTo(m.trail[i].x, m.trail[i].y);
          ctx.lineTo(m.trail[i + 1].x, m.trail[i + 1].y);
          ctx.strokeStyle = `rgba(180,210,255,${t * lifeRatio * fadeIn * 0.6})`;
          ctx.lineWidth = t * 2.5;
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${lifeRatio * fadeIn})`;
      ctx.fill();

      return m.life >= m.maxLife || m.y > this.h + 20;
    },

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      for (const s of this.stars) this.drawStar(s);

      for (let i = this.meteors.length - 1; i >= 0; i--) {
        if (this.updateMeteor(this.meteors[i])) {
          this.meteors.splice(i, 1);
        }
      }

      this.spawnMeteor();
    },

    loop() {
      if (this.active) this.draw();
      this.animId = requestAnimationFrame(() => this.loop());
    },

    activate() {
      if (this.active) return;
      this.active = true;
      this.createStars();
      if (this.canvas) this.canvas.classList.add('active');
    },

    deactivate() {
      if (!this.active) return;
      this.active = false;
      this.meteors = [];
      if (this.canvas) this.canvas.classList.remove('active');
    },

    syncVisibility() {
      const hasMessages = STATE.messages && STATE.messages.length > 0;
      if (hasMessages) this.activate();
      else this.deactivate();
    },
  };

  /* Hook visibility into ChatEngine.sendMessage */
  const _origSendMessage = ChatEngine.sendMessage;
  ChatEngine.sendMessage = function() {
    StarfieldBackground.activate();
    return _origSendMessage.call(this);
  };

  const _origNewConv = window.CeeApp.newConversation;
  window.CeeApp.newConversation = function() {
    StarfieldBackground.deactivate();
    return _origNewConv.call(this);
  };

})();
