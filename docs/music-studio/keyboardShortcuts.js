/**
 * 青鸾 DAW — 键盘快捷键管理器
 * KeyboardShortcuts
 * 支持修饰键组合、单键、序列键、上下文隔离、冲突检测、50+ 默认绑定
 */

const ModifierOrder = ['ctrl', 'alt', 'shift', 'meta'];

function _normalizeKeyCombo(combo) {
  const parts = combo.toLowerCase().split(/[+\s]+/).filter(Boolean);
  const modifiers = [];
  const keys = [];
  parts.forEach(p => {
    const clean = p.trim();
    if (ModifierOrder.includes(clean) || clean === 'cmd' || clean === 'command') {
      let m = clean;
      if (m === 'cmd' || m === 'command') m = 'meta';
      if (!modifiers.includes(m)) modifiers.push(m);
    } else {
      keys.push(clean);
    }
  });
  modifiers.sort((a, b) => ModifierOrder.indexOf(a) - ModifierOrder.indexOf(b));
  return modifiers.concat(keys).join('+');
}

function _matchEvent(e, combo) {
  const parts = combo.split('+');
  const key = parts.pop();
  const needsCtrl = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');
  const needsMeta = parts.includes('meta');

  const eventKey = e.key.toLowerCase();
  const mappedKey = key === 'escape' ? 'esc' : key;
  const mappedEvent = eventKey === 'escape' ? 'esc' : eventKey;

  if (mappedEvent !== mappedKey && eventKey !== key) return false;
  if (e.ctrlKey !== needsCtrl) return false;
  if (e.shiftKey !== needsShift) return false;
  if (e.altKey !== needsAlt) return false;
  if (e.metaKey !== needsMeta) return false;
  return true;
}

function _isInputElement(el) {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

function _formatComboForDisplay(combo) {
  return combo
    .split('+')
    .map(p => {
      if (p === 'ctrl') return 'Ctrl';
      if (p === 'shift') return 'Shift';
      if (p === 'alt') return 'Alt';
      if (p === 'meta') return 'Meta';
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' + ');
}

/* ================= 默认快捷键配置 ================= */

const DefaultBindings = [
  // 播放控制
  { combo: 'space', action: 'playback.toggle', description: '播放/暂停', context: 'global' },
  { combo: 'home', action: 'playback.toStart', description: '跳到开头', context: 'global' },
  { combo: 'end', action: 'playback.toEnd', description: '跳到结尾', context: 'global' },
  { combo: 'ctrl+arrowleft', action: 'playback.backward', description: '后退', context: 'global' },
  { combo: 'ctrl+arrowright', action: 'playback.forward', description: '前进', context: 'global' },
  { combo: 'arrowleft', action: 'playback.stepBack', description: '步进后退', context: 'global' },
  { combo: 'arrowright', action: 'playback.stepForward', description: '步进前进', context: 'global' },

  // 编辑操作
  { combo: 'ctrl+z', action: 'edit.undo', description: '撤销', context: 'global' },
  { combo: 'ctrl+shift+z', action: 'edit.redo', description: '重做', context: 'global' },
  { combo: 'ctrl+y', action: 'edit.redo', description: '重做 (备用)', context: 'global' },
  { combo: 'ctrl+x', action: 'edit.cut', description: '剪切', context: 'global' },
  { combo: 'ctrl+c', action: 'edit.copy', description: '复制', context: 'global' },
  { combo: 'ctrl+v', action: 'edit.paste', description: '粘贴', context: 'global' },
  { combo: 'ctrl+a', action: 'edit.selectAll', description: '全选', context: 'global' },
  { combo: 'delete', action: 'edit.delete', description: '删除', context: 'global' },
  { combo: 'ctrl+d', action: 'edit.duplicate', description: '复制选中项', context: 'global' },

  // 工作室标签切换
  { combo: '1', action: 'studio.switch.0', description: '切换到标签 1', context: 'global' },
  { combo: '2', action: 'studio.switch.1', description: '切换到标签 2', context: 'global' },
  { combo: '3', action: 'studio.switch.2', description: '切换到标签 3', context: 'global' },
  { combo: '4', action: 'studio.switch.3', description: '切换到标签 4', context: 'global' },
  { combo: '5', action: 'studio.switch.4', description: '切换到标签 5', context: 'global' },
  { combo: '6', action: 'studio.switch.5', description: '切换到标签 6', context: 'global' },
  { combo: '7', action: 'studio.switch.6', description: '切换到标签 7', context: 'global' },
  { combo: '8', action: 'studio.switch.7', description: '切换到标签 8', context: 'global' },
  { combo: '9', action: 'studio.switch.8', description: '切换到标签 9', context: 'global' },

  // 工作室快捷入口
  { combo: 'ctrl+1', action: 'studio.open.compose', description: '作曲面板', context: 'global' },
  { combo: 'ctrl+2', action: 'studio.open.theory', description: '理论面板', context: 'global' },
  { combo: 'ctrl+3', action: 'studio.open.synth', description: '歌声面板', context: 'global' },
  { combo: 'ctrl+4', action: 'studio.open.effects', description: '效果器面板', context: 'global' },
  { combo: 'ctrl+5', action: 'studio.open.visual', description: '可视化面板', context: 'global' },
  { combo: 'ctrl+6', action: 'studio.open.realistic', description: '真人声面板', context: 'global' },
  { combo: 'ctrl+7', action: 'studio.open.arranger', description: '伴奏面板', context: 'global' },
  { combo: 'ctrl+8', action: 'studio.open.lyrics', description: '歌词面板', context: 'global' },
  { combo: 'ctrl+9', action: 'studio.open.cognitive', description: '认知面板', context: 'global' },

  // 文件操作
  { combo: 'ctrl+s', action: 'file.save', description: '保存项目', context: 'global' },
  { combo: 'ctrl+o', action: 'file.open', description: '打开项目', context: 'global' },
  { combo: 'ctrl+e', action: 'file.export', description: '导出项目', context: 'global' },
  { combo: 'ctrl+n', action: 'file.new', description: '新建项目', context: 'global' },
  { combo: 'ctrl+shift+s', action: 'file.saveAs', description: '另存为', context: 'global' },

  // 视图操作
  { combo: 'ctrl+b', action: 'view.toggleSidebar', description: '切换侧边栏', context: 'global' },
  { combo: 'ctrl+f', action: 'view.search', description: '搜索', context: 'global' },
  { combo: 'esc', action: 'view.closePanel', description: '关闭面板', context: 'global' },
  { combo: 'f11', action: 'view.fullscreen', description: '全屏', context: 'global' },
  { combo: 'ctrl+=', action: 'view.zoomIn', description: '放大', context: 'global' },
  { combo: 'ctrl+-', action: 'view.zoomOut', description: '缩小', context: 'global' },
  { combo: 'ctrl+0', action: 'view.zoomReset', description: '重置缩放', context: 'global' },

  // 工具
  { combo: 'ctrl+m', action: 'tool.metronome', description: '节拍器', context: 'global' },
  { combo: 'ctrl+t', action: 'tool.tuner', description: '调音器', context: 'global' },
  { combo: 'ctrl+r', action: 'tool.record', description: '录音', context: 'global' },
  { combo: 'ctrl+l', action: 'tool.loop', description: '循环', context: 'global' },
  { combo: 'ctrl+k', action: 'tool.keyboard', description: '虚拟键盘', context: 'global' },
  { combo: 'ctrl+shift+m', action: 'tool.midiImport', description: '导入 MIDI', context: 'global' },

  // 导航
  { combo: 'tab', action: 'nav.nextInput', description: '下一个输入框', context: 'global' },
  { combo: 'shift+tab', action: 'nav.prevInput', description: '上一个输入框', context: 'global' },
  { combo: 'enter', action: 'nav.confirm', description: '确认', context: 'global' },
  { combo: 'esc', action: 'nav.cancel', description: '取消', context: 'global' },
  { combo: 'ctrl+g', action: 'nav.goto', description: '跳转', context: 'global' },

  // 帮助
  { combo: '?', action: 'help.shortcuts', description: '快捷键帮助', context: 'global' },
  { combo: 'ctrl+/', action: 'help.shortcuts', description: '快捷键帮助 (备用)', context: 'global' },
  { combo: 'f1', action: 'help.docs', description: '打开文档', context: 'global' }
];

/* ================= 动作处理器注册表 ================= */

const DefaultActionHandlers = {
  'playback.toggle': () => {
    if (typeof togglePlayback === 'function') togglePlayback();
    else console.log('[Shortcuts] 播放/暂停');
  },
  'playback.toStart': () => { showToast('回到开头', 'info'); },
  'playback.toEnd': () => { showToast('跳到结尾', 'info'); },
  'playback.backward': () => { showToast('后退', 'info'); },
  'playback.forward': () => { showToast('前进', 'info'); },
  'playback.stepBack': () => { showToast('步进后退', 'info'); },
  'playback.stepForward': () => { showToast('步进前进', 'info'); },

  'edit.undo': () => {
    if (window.actionHistory) window.actionHistory.undo();
    else showToast('撤销', 'info');
  },
  'edit.redo': () => {
    if (window.actionHistory) window.actionHistory.redo();
    else showToast('重做', 'info');
  },
  'edit.cut': () => { showToast('剪切', 'info'); },
  'edit.copy': () => { showToast('复制', 'info'); },
  'edit.paste': () => { showToast('粘贴', 'info'); },
  'edit.selectAll': () => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      active.select();
    } else {
      document.execCommand('selectAll');
    }
  },
  'edit.delete': () => { showToast('删除', 'info'); },
  'edit.duplicate': () => { showToast('复制选中项', 'info'); },

  'studio.switch': (index) => {
    const tabs = document.querySelectorAll('.studio-tab');
    if (tabs[index]) tabs[index].click();
  },
  'studio.open.compose': () => { switchStudioTab('s-compose'); },
  'studio.open.theory': () => { switchStudioTab('s-theory'); },
  'studio.open.synth': () => { switchStudioTab('s-synth'); },
  'studio.open.effects': () => { switchStudioTab('s-effects'); },
  'studio.open.visual': () => { switchStudioTab('s-visual'); },
  'studio.open.realistic': () => { switchStudioTab('s-realistic'); },
  'studio.open.arranger': () => { switchStudioTab('s-arranger'); },
  'studio.open.lyrics': () => { switchStudioTab('s-lyrics'); },
  'studio.open.cognitive': () => { switchStudioTab('s-cognitive'); },

  'file.save': () => { if (typeof saveProject === 'function') saveProject(); else showToast('保存项目', 'info'); },
  'file.open': () => { showToast('请使用导入按钮打开文件', 'info'); },
  'file.export': () => { if (typeof exportProject === 'function') exportProject(); else showToast('导出项目', 'info'); },
  'file.new': () => { if (typeof newSession === 'function') newSession(); else showToast('新建项目', 'info'); },
  'file.saveAs': () => { showToast('另存为', 'info'); },

  'view.toggleSidebar': () => { if (typeof toggleDrawer === 'function') toggleDrawer(); },
  'view.search': () => { showToast('搜索功能开发中', 'info'); },
  'view.closePanel': () => { if (typeof closeAll === 'function') closeAll(); },
  'view.fullscreen': () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  },
  'view.zoomIn': () => { showToast('放大', 'info'); },
  'view.zoomOut': () => { showToast('缩小', 'info'); },
  'view.zoomReset': () => { showToast('重置缩放', 'info'); },

  'tool.metronome': () => { if (typeof startMetronome === 'function') startMetronome(); },
  'tool.tuner': () => { if (typeof startTuner === 'function') startTuner(); },
  'tool.record': () => { showToast('录音功能开发中', 'info'); },
  'tool.loop': () => { showToast('循环功能开发中', 'info'); },
  'tool.keyboard': () => { showToast('虚拟键盘', 'info'); },
  'tool.midiImport': () => { showToast('导入 MIDI', 'info'); },

  'nav.nextInput': () => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button'));
    const idx = inputs.indexOf(document.activeElement);
    if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
  },
  'nav.prevInput': () => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button'));
    const idx = inputs.indexOf(document.activeElement);
    if (idx > 0) inputs[idx - 1].focus();
  },
  'nav.confirm': () => {
    const active = document.activeElement;
    if (active && active.tagName === 'BUTTON') active.click();
  },
  'nav.cancel': () => { if (typeof closeAll === 'function') closeAll(); },
  'nav.goto': () => { showToast('跳转功能开发中', 'info'); },

  'help.shortcuts': () => {
    if (typeof showModal === 'function') {
      const items = DefaultBindings.map(b => `<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));display:flex;justify-content:space-between;"><span>${b.description}</span><span style="color:var(--accent);font-weight:600;">${_formatComboForDisplay(b.combo)}</span></div>`).join('');
      showModal('快捷键帮助', `<div style="max-height:60vh;overflow:auto;">${items}</div>`, [{ label: '关闭', primary: false }]);
    }
  },
  'help.docs': () => { showToast('文档功能开发中', 'info'); }
};

function switchStudioTab(tabId) {
  const studio = document.getElementById('studio');
  if (studio && !studio.classList.contains('open')) {
    if (typeof toggleStudio === 'function') toggleStudio();
  }
  document.querySelectorAll('.studio-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.studio-tab[data-sp="${tabId}"]`);
  const panel = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  if (panel) panel.classList.add('active');
}

/* ================= KeyboardShortcuts 类 ================= */

class KeyboardShortcuts {
  constructor(options = {}) {
    this.bindings = new Map();
    this.handlers = new Map();
    this.contexts = new Map();
    this.enabled = true;
    this.currentContext = options.defaultContext || 'global';
    this.allowInInputs = options.allowInInputs || ['ctrl+s', 'ctrl+z', 'ctrl+shift+z', 'ctrl+a', 'ctrl+c', 'ctrl+v', 'ctrl+x'];
    this.sequenceBuffer = [];
    this.sequenceTimer = null;
    this.sequenceTimeout = options.sequenceTimeout || 1000;
    this.listeners = [];
    this._keydownHandler = this._onKeyDown.bind(this);
    this._helpPanel = null;

    this._registerDefaultHandlers();
    this._installListener();
    this._loadFromStorage();
  }

  _registerDefaultHandlers() {
    Object.entries(DefaultActionHandlers).forEach(([action, handler]) => {
      this.handlers.set(action, handler);
    });
  }

  _installListener() {
    document.addEventListener('keydown', this._keydownHandler);
  }

  _onKeyDown(e) {
    if (!this.enabled) return;

    const combo = this._eventToCombo(e);
    const normalized = _normalizeKeyCombo(combo);

    // 输入框保护
    if (_isInputElement(e.target)) {
      const allow = this.allowInInputs.some(a => _normalizeKeyCombo(a) === normalized);
      if (!allow) return;
    }

    // 序列键处理
    if (this.sequenceBuffer.length > 0) {
      this.sequenceBuffer.push(normalized);
      const seq = this.sequenceBuffer.join(' ');
      const seqBinding = this._findBinding(seq);
      if (seqBinding) {
        e.preventDefault();
        this._executeBinding(seqBinding);
        this._clearSequence();
        return;
      }
      if (this.sequenceBuffer.length >= 3) {
        this._clearSequence();
      }
      return;
    }

    // 查找绑定
    const binding = this._findBinding(normalized);
    if (binding) {
      e.preventDefault();
      this._executeBinding(binding);
      return;
    }

    // 开始序列检测（如果有以当前键开头的序列）
    const hasSequence = Array.from(this.bindings.keys()).some(k => k.startsWith(normalized + ' '));
    if (hasSequence) {
      this.sequenceBuffer = [normalized];
      this._startSequenceTimer();
      e.preventDefault();
      return;
    }
  }

  _eventToCombo(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'esc';
    if (key === 'arrowleft') key = 'arrowleft';
    if (key === 'arrowright') key = 'arrowright';
    if (key === 'arrowup') key = 'arrowup';
    if (key === 'arrowdown') key = 'arrowdown';
    if (key === 'delete') key = 'delete';
    if (key === 'backspace') key = 'backspace';
    if (key === 'enter') key = 'enter';
    if (key === 'tab') key = 'tab';
    parts.push(key);
    return parts.join('+');
  }

  _findBinding(combo) {
    const contexts = [this.currentContext, 'global'];
    for (const ctx of contexts) {
      const ctxMap = this.bindings.get(ctx);
      if (!ctxMap) continue;
      const binding = ctxMap.get(combo);
      if (binding) return binding;
    }
    return null;
  }

  _executeBinding(binding) {
    const handler = this.handlers.get(binding.action);
    if (handler) {
      try {
        handler(binding.arg);
      } catch (err) {
        console.error('[KeyboardShortcuts] 执行动作出错:', err);
      }
    }
    this._notifyListeners('execute', binding);
  }

  _startSequenceTimer() {
    if (this.sequenceTimer) clearTimeout(this.sequenceTimer);
    this.sequenceTimer = setTimeout(() => this._clearSequence(), this.sequenceTimeout);
  }

  _clearSequence() {
    this.sequenceBuffer = [];
    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
  }

  register(keyCombo, callback, context = 'global') {
    const normalized = _normalizeKeyCombo(keyCombo);
    if (!this.bindings.has(context)) this.bindings.set(context, new Map());

    // 解析动作名称或直接使用回调
    let action, arg;
    if (typeof callback === 'string') {
      action = callback;
      const parts = action.split('.');
      if (parts.length >= 3 && parts[1] === 'switch') {
        arg = parseInt(parts[2], 10);
      }
    } else if (typeof callback === 'function') {
      action = '__custom_' + Math.random().toString(36).slice(2, 9);
      this.handlers.set(action, callback);
    } else {
      throw new Error('callback 必须是函数或动作名称字符串');
    }

    const binding = { combo: normalized, action, arg, context, originalCombo: keyCombo };
    this.bindings.get(context).set(normalized, binding);
    this._notifyListeners('register', binding);
    return this;
  }

  unregister(keyCombo, context = 'global') {
    const normalized = _normalizeKeyCombo(keyCombo);
    const ctxMap = this.bindings.get(context);
    if (ctxMap) {
      const binding = ctxMap.get(normalized);
      if (binding) {
        ctxMap.delete(normalized);
        if (binding.action && binding.action.startsWith('__custom_')) {
          this.handlers.delete(binding.action);
        }
        this._notifyListeners('unregister', binding);
      }
    }
    return this;
  }

  enable() {
    this.enabled = true;
    this._notifyListeners('enable', null);
    return this;
  }

  disable() {
    this.enabled = false;
    this._notifyListeners('disable', null);
    return this;
  }

  setContext(context) {
    this.currentContext = context;
    this._clearSequence();
    this._notifyListeners('contextChange', { context });
    return this;
  }

  getContext() {
    return this.currentContext;
  }

  registerAction(action, handler) {
    this.handlers.set(action, handler);
    return this;
  }

  removeAction(action) {
    return this.handlers.delete(action);
  }

  showHelp() {
    if (this._helpPanel) this._hideHelp();

    const panel = document.createElement('div');
    panel.className = 'qingluan-shortcuts-help';
    panel.style.cssText = 'position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);opacity:0;transition:opacity 0.25s;';

    const box = document.createElement('div');
    box.style.cssText = 'background:var(--card-bg,#fff);border-radius:18px;max-width:520px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.25);transform:scale(0.95);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);';

    const header = document.createElement('div');
    header.style.cssText = 'padding:18px 22px 10px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));';
    header.innerHTML = `<span style="font-size:16px;font-weight:700;color:var(--text,#1a1a1a);">⌨️ 快捷键帮助</span><button class="help-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text2);">✕</button>`;

    const body = document.createElement('div');
    body.style.cssText = 'padding:12px 22px;overflow:auto;flex:1;';

    const categories = {
      '播放控制': ['playback.toggle', 'playback.toStart', 'playback.toEnd', 'playback.backward', 'playback.forward', 'playback.stepBack', 'playback.stepForward'],
      '编辑': ['edit.undo', 'edit.redo', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.selectAll', 'edit.delete', 'edit.duplicate'],
      '文件': ['file.save', 'file.open', 'file.export', 'file.new', 'file.saveAs'],
      '视图': ['view.toggleSidebar', 'view.search', 'view.closePanel', 'view.fullscreen', 'view.zoomIn', 'view.zoomOut', 'view.zoomReset'],
      '工具': ['tool.metronome', 'tool.tuner', 'tool.record', 'tool.loop', 'tool.keyboard', 'tool.midiImport'],
      '导航': ['nav.nextInput', 'nav.prevInput', 'nav.confirm', 'nav.cancel', 'nav.goto'],
      '工作室': ['studio.open.compose', 'studio.open.theory', 'studio.open.synth', 'studio.open.effects', 'studio.open.visual', 'studio.open.realistic', 'studio.open.arranger', 'studio.open.lyrics', 'studio.open.cognitive'],
      '帮助': ['help.shortcuts', 'help.docs']
    };

    let html = '';
    Object.entries(categories).forEach(([cat, actions]) => {
      html += `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${cat}</div>`;
      const items = [];
      this.bindings.forEach(ctxMap => {
        ctxMap.forEach(binding => {
          if (actions.includes(binding.action)) {
            items.push(binding);
          }
        });
      });
      items.sort((a, b) => actions.indexOf(a.action) - actions.indexOf(b.action));
      items.forEach(b => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:var(--text2);border-bottom:1px solid var(--border,rgba(0,0,0,0.04));"><span>${this._getActionDescription(b.action)}</span><kbd style="background:var(--pink-bg);padding:2px 8px;border-radius:6px;font-family:monospace;font-size:12px;color:var(--text);">${_formatComboForDisplay(b.combo)}</kbd></div>`;
      });
      html += '</div>';
    });

    body.innerHTML = html;
    box.appendChild(header);
    box.appendChild(body);
    panel.appendChild(box);
    document.body.appendChild(panel);
    this._helpPanel = panel;

    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      box.style.transform = 'scale(1)';
    });

    panel.querySelector('.help-close').addEventListener('click', () => this._hideHelp());
    panel.addEventListener('click', (e) => { if (e.target === panel) this._hideHelp(); });

    // ESC 关闭帮助
    const escHandler = (e) => { if (e.key === 'Escape') { this._hideHelp(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  _hideHelp() {
    if (!this._helpPanel) return;
    this._helpPanel.style.opacity = '0';
    const box = this._helpPanel.querySelector('div');
    if (box) box.style.transform = 'scale(0.95)';
    setTimeout(() => {
      if (this._helpPanel) { this._helpPanel.remove(); this._helpPanel = null; }
    }, 250);
  }

  _getActionDescription(action) {
    const found = DefaultBindings.find(b => b.action === action);
    return found ? found.description : action;
  }

  exportBindings() {
    const data = [];
    this.bindings.forEach((ctxMap, context) => {
      ctxMap.forEach(binding => {
        data.push({
          combo: binding.originalCombo,
          action: binding.action,
          context: binding.context,
          arg: binding.arg
        });
      });
    });
    return JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), bindings: data }, null, 2);
  }

  importBindings(config) {
    try {
      const data = typeof config === 'string' ? JSON.parse(config) : config;
      if (!data.bindings || !Array.isArray(data.bindings)) {
        throw new Error('无效的配置格式');
      }
      this.bindings.clear();
      data.bindings.forEach(b => {
        this.register(b.combo, b.action, b.context || 'global');
      });
      this._saveToStorage();
      return { success: true, count: data.bindings.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  resetToDefaults() {
    this.bindings.clear();
    DefaultBindings.forEach(b => {
      this.register(b.combo, b.action, b.context);
    });
    this._saveToStorage();
    this._notifyListeners('reset', null);
    return this;
  }

  listBindings(context) {
    const result = [];
    const contexts = context ? [context] : Array.from(this.bindings.keys());
    contexts.forEach(ctx => {
      const ctxMap = this.bindings.get(ctx);
      if (!ctxMap) return;
      ctxMap.forEach(binding => {
        result.push({
          combo: binding.combo,
          action: binding.action,
          context: binding.context,
          description: this._getActionDescription(binding.action)
        });
      });
    });
    return result;
  }

  getBinding(combo, context = 'global') {
    const normalized = _normalizeKeyCombo(combo);
    const ctxMap = this.bindings.get(context);
    return ctxMap ? ctxMap.get(normalized) : null;
  }

  hasConflict(combo, context = 'global') {
    const normalized = _normalizeKeyCombo(combo);
    const ctxMap = this.bindings.get(context);
    if (ctxMap && ctxMap.has(normalized)) return true;
    const globalMap = this.bindings.get('global');
    if (globalMap && globalMap.has(normalized) && context !== 'global') return true;
    return false;
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
    return () => {
      const idx = this.listeners.findIndex(l => l.callback === callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  _notifyListeners(event, data) {
    this.listeners.filter(l => l.event === event || l.event === '*').forEach(l => {
      try { l.callback(event, data); } catch (e) {}
    });
  }

  _saveToStorage() {
    try {
      localStorage.setItem('qingluan_shortcuts', this.exportBindings());
    } catch (e) {}
  }

  _loadFromStorage() {
    try {
      const saved = localStorage.getItem('qingluan_shortcuts');
      if (saved) {
        const result = this.importBindings(saved);
        if (result.success) return;
      }
    } catch (e) {}
    // 如果没有保存的配置，加载默认配置
    this.resetToDefaults();
  }

  destroy() {
    document.removeEventListener('keydown', this._keydownHandler);
    this.bindings.clear();
    this.handlers.clear();
    this.listeners = [];
    if (this._helpPanel) this._hideHelp();
  }
}

// 全局单例
const keyboardShortcuts = new KeyboardShortcuts();

// 全局暴露
if (typeof window !== 'undefined') {
  window.KeyboardShortcuts = KeyboardShortcuts;
  window.keyboardShortcuts = keyboardShortcuts;
}

/* ================= 宏录制 ================= */

class MacroRecorder {
  constructor() {
    this.recording = false;
    this.steps = [];
    this.startTime = 0;
    this.listeners = [];
  }

  start() {
    this.recording = true;
    this.steps = [];
    this.startTime = performance.now();
    this._notify('start');
  }

  stop() {
    this.recording = false;
    this._notify('stop', this.steps);
    return [...this.steps];
  }

  recordAction(action, data) {
    if (!this.recording) return;
    this.steps.push({
      time: performance.now() - this.startTime,
      action,
      data
    });
  }

  playback(speed = 1) {
    if (!this.steps.length) return;
    this.steps.forEach(step => {
      setTimeout(() => {
        if (typeof step.action === 'function') step.action(step.data);
      }, step.time / speed);
    });
  }

  clear() { this.steps = []; }

  export() { return JSON.stringify(this.steps); }

  import(data) {
    try {
      this.steps = JSON.parse(data);
      return true;
    } catch (e) { return false; }
  }

  on(event, cb) {
    this.listeners.push({ event, cb });
    return () => { this.listeners = this.listeners.filter(l => l.cb !== cb); };
  }

  _notify(event, data) {
    this.listeners.filter(l => l.event === event).forEach(l => { try { l.cb(data); } catch (e) {} });
  }
}

/* ================= 和弦快捷键（组合键序列） ================= */

class ChordShortcuts {
  constructor() {
    this.pressed = new Set();
    this.bindings = new Map();
    this.handlers = new Map();
    this._keydown = this._keydown.bind(this);
    this._keyup = this._keyup.bind(this);
    document.addEventListener('keydown', this._keydown);
    document.addEventListener('keyup', this._keyup);
  }

  register(keys, handler) {
    const sorted = [...keys].sort().join('+');
    this.bindings.set(sorted, handler);
  }

  unregister(keys) {
    const sorted = [...keys].sort().join('+');
    this.bindings.delete(sorted);
  }

  _keydown(e) {
    this.pressed.add(e.key.toLowerCase());
    const combo = Array.from(this.pressed).sort().join('+');
    const handler = this.bindings.get(combo);
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  }

  _keyup(e) {
    this.pressed.delete(e.key.toLowerCase());
  }

  destroy() {
    document.removeEventListener('keydown', this._keydown);
    document.removeEventListener('keyup', this._keyup);
    this.bindings.clear();
    this.pressed.clear();
  }
}

/* ================= 游戏手柄支持 ================= */

class GamepadShortcuts {
  constructor() {
    this.polling = false;
    this.bindings = new Map();
    this.previousStates = new Map();
  }

  start() {
    this.polling = true;
    this._poll();
  }

  stop() { this.polling = false; }

  register(buttonIndex, callback) {
    this.bindings.set(buttonIndex, callback);
  }

  _poll() {
    if (!this.polling) return;
    const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    gamepads.forEach(gp => {
      gp.buttons.forEach((btn, idx) => {
        const prev = this.previousStates.get(`${gp.index}-${idx}`);
        if (btn.pressed && !prev) {
          const cb = this.bindings.get(idx);
          if (cb) cb({ gamepad: gp, button: idx });
        }
        this.previousStates.set(`${gp.index}-${idx}`, btn.pressed);
      });
    });
    requestAnimationFrame(() => this._poll());
  }
}

/* ================= 触摸手势 ================= */

class TouchGestureHandler {
  constructor(element) {
    this.el = typeof element === 'string' ? document.getElementById(element) : element;
    this.startX = 0;
    this.startY = 0;
    this.listeners = new Map();
    if (this.el) {
      this.el.addEventListener('touchstart', this._start.bind(this), { passive: true });
      this.el.addEventListener('touchend', this._end.bind(this), { passive: true });
    }
  }

  on(gesture, cb) {
    if (!this.listeners.has(gesture)) this.listeners.set(gesture, []);
    this.listeners.get(gesture).push(cb);
  }

  _start(e) {
    this.startX = e.changedTouches[0].clientX;
    this.startY = e.changedTouches[0].clientY;
  }

  _end(e) {
    const dx = e.changedTouches[0].clientX - this.startX;
    const dy = e.changedTouches[0].clientY - this.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 50) return;
    let gesture;
    if (absX > absY) gesture = dx > 0 ? 'swipeRight' : 'swipeLeft';
    else gesture = dy > 0 ? 'swipeDown' : 'swipeUp';
    (this.listeners.get(gesture) || []).forEach(cb => { try { cb({ dx, dy }); } catch (e) {} });
  }
}

/* ================= 语音命令 ================= */

class VoiceCommand {
  constructor() {
    this.recognition = null;
    this.commands = new Map();
    this.listening = false;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SR();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.onresult = (e) => {
        const text = e.results[0][0].transcript.toLowerCase().trim();
        this.commands.forEach((cb, phrase) => {
          if (text.includes(phrase)) cb(text);
        });
      };
    }
  }

  register(phrase, callback) {
    this.commands.set(phrase.toLowerCase(), callback);
  }

  start() {
    if (this.recognition && !this.listening) {
      this.recognition.start();
      this.listening = true;
    }
  }

  stop() {
    if (this.recognition && this.listening) {
      this.recognition.stop();
      this.listening = false;
    }
  }
}

/* ================= 全局暴露增强 ================= */

if (typeof window !== 'undefined') {
  window.MacroRecorder = MacroRecorder;
  window.ChordShortcuts = ChordShortcuts;
  window.GamepadShortcuts = GamepadShortcuts;
  window.TouchGestureHandler = TouchGestureHandler;
  window.VoiceCommand = VoiceCommand;
}

/* ================= 快捷键配置序列化 v2 ================= */

class ShortcutProfile {
  constructor(name) {
    this.name = name;
    this.bindings = new Map();
    this.createdAt = new Date().toISOString();
  }

  add(combo, action, context = 'global') {
    if (!this.bindings.has(context)) this.bindings.set(context, new Map());
    this.bindings.get(context).set(_normalizeKeyCombo(combo), { combo, action });
  }

  remove(combo, context = 'global') {
    const ctx = this.bindings.get(context);
    if (ctx) ctx.delete(_normalizeKeyCombo(combo));
  }

  export() {
    const data = { name: this.name, createdAt: this.createdAt, bindings: [] };
    this.bindings.forEach((ctxMap, context) => {
      ctxMap.forEach((b, combo) => data.bindings.push({ combo: b.combo, action: b.action, context }));
    });
    return JSON.stringify(data, null, 2);
  }

  static import(json) {
    const data = JSON.parse(json);
    const profile = new ShortcutProfile(data.name);
    profile.createdAt = data.createdAt;
    data.bindings.forEach(b => profile.add(b.combo, b.action, b.context));
    return profile;
  }
}

/* ================= 快捷键统计 ================= */

class ShortcutAnalytics {
  constructor() {
    this.stats = new Map();
    this.enabled = false;
  }

  start() { this.enabled = true; }
  stop() { this.enabled = false; }

  record(combo) {
    if (!this.enabled) return;
    const key = _normalizeKeyCombo(combo);
    this.stats.set(key, (this.stats.get(key) || 0) + 1);
  }

  top(n = 10) {
    return Array.from(this.stats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([combo, count]) => ({ combo, count }));
  }

  export() {
    return JSON.stringify(Object.fromEntries(this.stats));
  }
}

const shortcutAnalytics = new ShortcutAnalytics();

/* ================= 上下文感知路由 ================= */

class ContextRouter {
  constructor() {
    this.contexts = new Map();
    this.activeContext = 'global';
  }

  register(context, elementMatcher) {
    this.contexts.set(context, elementMatcher);
  }

  detect(element) {
    for (const [context, matcher] of this.contexts) {
      if (typeof matcher === 'function') {
        if (matcher(element)) return context;
      } else if (matcher instanceof HTMLElement) {
        if (matcher.contains(element)) return context;
      } else if (typeof matcher === 'string') {
        if (element.closest(matcher)) return context;
      }
    }
    return 'global';
  }

  setActive(context) {
    this.activeContext = context;
  }
}

/* ================= 全局暴露增强 ================= */

if (typeof window !== 'undefined') {
  window.ShortcutProfile = ShortcutProfile;
  window.ShortcutAnalytics = ShortcutAnalytics;
  window.ContextRouter = ContextRouter;
  window.shortcutAnalytics = shortcutAnalytics;
}

/* ================= MIDI 控制器支持 ================= */

class MIDIController {
  constructor() {
    this.access = null;
    this.inputs = new Map();
    this.outputs = new Map();
    this.listeners = new Map();
    this.ccMap = new Map();
    this.noteMap = new Map();
    this.pitchBendRange = 2;
    this.enabled = false;
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('[MIDI] Web MIDI API 不可用');
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this._setupInputs();
      this._setupOutputs();
      this.access.onstatechange = (e) => this._onStateChange(e);
      this.enabled = true;
      return true;
    } catch (e) {
      console.warn('[MIDI] 初始化失败:', e);
      return false;
    }
  }

  _setupInputs() {
    for (const [id, input] of this.access.inputs) {
      this.inputs.set(id, input);
      input.onmidimessage = (e) => this._onMIDIMessage(e);
    }
  }

  _setupOutputs() {
    for (const [id, output] of this.access.outputs) {
      this.outputs.set(id, output);
    }
  }

  _onStateChange(e) {
    const port = e.port;
    if (port.type === 'input') {
      if (port.state === 'connected') {
        this.inputs.set(port.id, port);
        port.onmidimessage = (e) => this._onMIDIMessage(e);
      } else {
        this.inputs.delete(port.id);
      }
    } else {
      if (port.state === 'connected') {
        this.outputs.set(port.id, port);
      } else {
        this.outputs.delete(port.id);
      }
    }
  }

  _onMIDIMessage(e) {
    const [status, data1, data2] = e.data;
    const channel = (status & 0x0F) + 1;
    const messageType = status & 0xF0;

    switch (messageType) {
      case 0x90:
        if (data2 > 0) this._fire('noteOn', { note: data1, velocity: data2, channel });
        else this._fire('noteOff', { note: data1, velocity: 0, channel });
        break;
      case 0x80:
        this._fire('noteOff', { note: data1, velocity: data2, channel });
        break;
      case 0xB0:
        this._fire('cc', { cc: data1, value: data2, channel });
        break;
      case 0xE0:
        const bend = (data2 << 7 | data1) - 8192;
        this._fire('pitchBend', { value: bend / 8192, channel });
        break;
      case 0xA0:
        this._fire('polyAftertouch', { note: data1, pressure: data2, channel });
        break;
      case 0xD0:
        this._fire('channelAftertouch', { pressure: data1, channel });
        break;
      case 0xC0:
        this._fire('programChange', { program: data1, channel });
        break;
    }
  }

  _fire(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach((cb) => cb(data));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  sendNoteOn(note, velocity, channel = 1) {
    const status = 0x90 | ((channel - 1) & 0x0F);
    this.outputs.forEach((out) => out.send([status, note & 0x7F, velocity & 0x7F]));
  }

  sendNoteOff(note, channel = 1) {
    const status = 0x80 | ((channel - 1) & 0x0F);
    this.outputs.forEach((out) => out.send([status, note & 0x7F, 0]));
  }

  sendCC(cc, value, channel = 1) {
    const status = 0xB0 | ((channel - 1) & 0x0F);
    this.outputs.forEach((out) => out.send([status, cc & 0x7F, value & 0x7F]));
  }

  mapCC(cc, callback) { this.ccMap.set(cc, callback); }
  mapNote(note, onCallback, offCallback) { this.noteMap.set(note, { on: onCallback, off: offCallback }); }

  getDevices() {
    return {
      inputs: Array.from(this.inputs.values()).map((d) => ({ id: d.id, name: d.name, manufacturer: d.manufacturer })),
      outputs: Array.from(this.outputs.values()).map((d) => ({ id: d.id, name: d.name, manufacturer: d.manufacturer })),
    };
  }
}

/* ================= 宏命令系统 ================= */

class MacroCommandSystem {
  constructor() {
    this.macros = new Map();
    this.recording = false;
    this.currentRecording = [];
    this.variables = new Map();
  }

  define(name, steps) {
    this.macros.set(name, { name, steps, created: Date.now() });
  }

  recordStart() {
    this.recording = true;
    this.currentRecording = [];
  }

  recordStep(action, params = {}) {
    if (!this.recording) return;
    this.currentRecording.push({ action, params, timestamp: Date.now() });
  }

  recordStop(name) {
    this.recording = false;
    if (this.currentRecording.length > 0) {
      this.macros.set(name, { name, steps: [...this.currentRecording], created: Date.now() });
    }
    this.currentRecording = [];
  }

  execute(name, context = {}) {
    const macro = this.macros.get(name);
    if (!macro) { console.warn(`[Macro] 未找到宏: ${name}`); return false; }
    for (const step of macro.steps) {
      this._executeStep(step, context);
    }
    return true;
  }

  _executeStep(step, context) {
    const { action, params } = step;
    const resolved = {};
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' && v.startsWith('$')) {
        const varName = v.slice(1);
        resolved[k] = context[varName] !== undefined ? context[varName] : this.variables.get(varName);
      } else {
        resolved[k] = v;
      }
    }

    switch (action) {
      case 'navigate':
        if (resolved.target) switchNav(null, resolved.target);
        break;
      case 'sendChat':
        if (resolved.text) sendQuick(resolved.text);
        break;
      case 'toggleStudio':
        toggleStudio();
        break;
      case 'setVar':
        this.variables.set(resolved.name, resolved.value);
        break;
      case 'delay':
        // 异步延迟由调用方处理
        break;
      case 'click':
        const el = document.querySelector(resolved.selector);
        if (el) el.click();
        break;
      case 'focus':
        const inp = document.querySelector(resolved.selector);
        if (inp) inp.focus();
        break;
      case 'scroll':
        const container = document.querySelector(resolved.selector);
        if (container) container.scrollTop = resolved.position || 0;
        break;
      case 'playNote':
        if (window.audioEngine && resolved.note) {
          window.audioEngine.playNote(resolved.note, resolved.velocity || 100, resolved.duration || 0.5);
        }
        break;
      default:
        console.warn(`[Macro] 未知动作: ${action}`);
    }
  }

  list() { return Array.from(this.macros.keys()); }
  delete(name) { return this.macros.delete(name); }
  export() { return JSON.stringify(Object.fromEntries(this.macros)); }
  import(json) {
    const data = JSON.parse(json);
    for (const [k, v] of Object.entries(data)) this.macros.set(k, v);
  }
}

/* ================= 手势识别扩展 ================= */

class AdvancedGestureRecognizer {
  constructor(element) {
    this.element = element;
    this.active = false;
    this.points = [];
    this.gestures = new Map();
    this.threshold = 30;
    this._bind();
  }

  _bind() {
    this.element.addEventListener('touchstart', (e) => this._onStart(e), { passive: true });
    this.element.addEventListener('touchmove', (e) => this._onMove(e), { passive: true });
    this.element.addEventListener('touchend', (e) => this._onEnd(e), { passive: true });
    this.element.addEventListener('mousedown', (e) => this._onMouseDown(e));
  }

  _onMouseDown(e) {
    this.active = true;
    this.points = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    const move = (ev) => { if (this.active) this.points.push({ x: ev.clientX, y: ev.clientY, t: Date.now() }); };
    const up = () => { this.active = false; this._recognize(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  _onStart(e) {
    this.active = true;
    const t = e.touches[0];
    this.points = [{ x: t.clientX, y: t.clientY, t: Date.now() }];
  }

  _onMove(e) {
    if (!this.active) return;
    const t = e.touches[0];
    this.points.push({ x: t.clientX, y: t.clientY, t: Date.now() });
  }

  _onEnd(e) {
    this.active = false;
    this._recognize();
  }

  _recognize() {
    if (this.points.length < 3) return;
    const gesture = this._classify();
    if (gesture && this.gestures.has(gesture)) {
      this.gestures.get(gesture)();
    }
  }

  _classify() {
    const pts = this.points;
    const dx = pts[pts.length - 1].x - pts[0].x;
    const dy = pts[pts.length - 1].y - pts[0].y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const duration = pts[pts.length - 1].t - pts[0].t;

    if (absDx < this.threshold && absDy < this.threshold) return 'tap';
    if (duration < 200 && absDx > 80 && absDy < 40) return dx > 0 ? 'swipeRight' : 'swipeLeft';
    if (duration < 200 && absDy > 80 && absDx < 40) return dy > 0 ? 'swipeDown' : 'swipeUp';
    if (absDx > 60 && absDy > 60) {
      const cross = pts.reduce((c, p, i) => {
        if (i === 0) return c;
        const prev = pts[i - 1];
        return c + (prev.x - p.x) * (prev.y + p.y);
      }, 0);
      return cross > 0 ? 'clockwise' : 'counterClockwise';
    }
    return null;
  }

  on(gesture, callback) { this.gestures.set(gesture, callback); }
}

/* ================= 语音命令扩展 ================= */

class VoiceCommandEngine {
  constructor() {
    this.recognition = null;
    this.commands = new Map();
    this.listening = false;
    this.transcript = '';
    this.confidence = 0;
    this.lang = 'zh-CN';
  }

  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { console.warn('[Voice] 浏览器不支持语音识别'); return false; }
    this.recognition = new SR();
    this.recognition.lang = this.lang;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.onresult = (e) => this._onResult(e);
    this.recognition.onerror = (e) => console.warn('[Voice] 错误:', e.error);
    this.recognition.onend = () => { if (this.listening) this.recognition.start(); };
    return true;
  }

  _onResult(e) {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    this.transcript = final || interim;
    this.confidence = e.results[e.results.length - 1][0].confidence;
    if (final) this._processCommand(final.trim());
  }

  _processCommand(text) {
    const t = text.toLowerCase().replace(/[。，！？\s]/g, '');
    for (const [pattern, callback] of this.commands) {
      if (typeof pattern === 'string') {
        if (t.includes(pattern)) { callback(text); return; }
      } else if (pattern instanceof RegExp) {
        const m = t.match(pattern);
        if (m) { callback(m, text); return; }
      }
    }
  }

  register(pattern, callback) { this.commands.set(pattern, callback); }
  start() { if (this.recognition) { this.listening = true; this.recognition.start(); } }
  stop() { if (this.recognition) { this.listening = false; this.recognition.stop(); } }

  setupDefaultCommands() {
    this.register('作曲', () => sendQuick('来一首完整的歌'));
    this.register('伴奏', () => sendQuick('生成一段伴奏'));
    this.register('歌词', () => sendQuick('写一段歌词'));
    this.register('停止', () => { if (window.audioEngine) window.audioEngine.stop(); });
    this.register('播放', () => { if (window.audioEngine) window.audioEngine.play(); });
    this.register(/bpm\s*(\d+)/, (m) => {
      const bpm = parseInt(m[1]);
      if (window.transport) window.transport.setBPM(bpm);
    });
  }
}

/* ================= 性能监控 ================= */

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxEntries = 500;
    this.enabled = false;
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsTime = 0;
  }

  start() {
    this.enabled = true;
    this._loop();
  }

  stop() { this.enabled = false; }

  _loop() {
    if (!this.enabled) return;
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    requestAnimationFrame(() => this._loop());
  }

  mark(name) {
    if (!this.enabled) return;
    const entry = { name, time: performance.now(), memory: performance.memory ? performance.memory.usedJSHeapSize : 0 };
    this.metrics.push(entry);
    if (this.metrics.length > this.maxEntries) this.metrics.shift();
  }

  measure(name, startMark, endMark) {
    const s = this.metrics.find((m) => m.name === startMark);
    const e = this.metrics.find((m) => m.name === endMark);
    if (s && e) return e.time - s.time;
    return null;
  }

  report() {
    const groups = {};
    for (const m of this.metrics) {
      if (!groups[m.name]) groups[m.name] = [];
      groups[m.name].push(m.time);
    }
    const report = {};
    for (const [name, times] of Object.entries(groups)) {
      if (times.length < 2) continue;
      const deltas = [];
      for (let i = 1; i < times.length; i++) deltas.push(times[i] - times[i - 1]);
      report[name] = {
        count: times.length,
        avg: deltas.reduce((a, b) => a + b, 0) / deltas.length,
        min: Math.min(...deltas),
        max: Math.max(...deltas),
      };
    }
    return { fps: this.fps, metrics: report };
  }

  clear() { this.metrics = []; }
}

/* ================= 全局暴露 ================= */

if (typeof window !== 'undefined') {
  window.MIDIController = MIDIController;
  window.MacroCommandSystem = MacroCommandSystem;
  window.AdvancedGestureRecognizer = AdvancedGestureRecognizer;
  window.VoiceCommandEngine = VoiceCommandEngine;
  window.PerformanceMonitor = PerformanceMonitor;
  window.midiController = new MIDIController();
  window.macroSystem = new MacroCommandSystem();
  window.performanceMonitor = new PerformanceMonitor();
}

export { KeyboardShortcuts, keyboardShortcuts, DefaultBindings, DefaultActionHandlers, MacroRecorder, ChordShortcuts, GamepadShortcuts, TouchGestureHandler, VoiceCommand, ShortcutProfile, ShortcutAnalytics, ContextRouter, MIDIController, MacroCommandSystem, AdvancedGestureRecognizer, VoiceCommandEngine, PerformanceMonitor };
export default KeyboardShortcuts;
