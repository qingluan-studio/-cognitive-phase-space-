/* ================= 青鸾 UI 组件系统 v3.0 ================= */

const QingluanUI = (function() {
  'use strict';

  // 内部工具
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function formatValue(v, decimals = 1) { return v.toFixed(decimals); }
  function createEl(tag, cls, parent) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }
  function addEvent(el, type, fn, opts) { el.addEventListener(type, fn, opts); }
  function removeEvent(el, type, fn) { el.removeEventListener(type, fn); }
  function setStyles(el, styles) { Object.assign(el.style, styles); }
  function px(n) { return n + 'px'; }
  function deg(n) { return n + 'deg'; }
  function isTouch() { return 'ontouchstart' in window; }

  const themes = {
    default: { accent: '#5b4dff', bg: '#fff', text: '#1a1a1a', border: 'rgba(0,0,0,0.06)' },
    dark: { accent: '#7b6dff', bg: '#1a1a1a', text: '#f0f0f0', border: 'rgba(255,255,255,0.08)' },
    cyberpunk: { accent: '#ff2a6d', bg: '#050014', text: '#d1f7ff', border: 'rgba(255,42,109,0.2)' }
  };

  let currentTheme = 'default';

  function applyThemeTo(el, themeName) {
    const t = themes[themeName] || themes.default;
    if (el.dataset.accentTarget) el.style.color = t.accent;
    if (el.dataset.bgTarget) el.style.background = t.bg;
  }

  /* ========== 事件发射器基类 ========== */
  class EventEmitter {
    constructor() { this._events = {}; }
    on(e, fn) { (this._events[e] = this._events[e] || []).push(fn); return () => this.off(e, fn); }
    off(e, fn) { if (!this._events[e]) return; this._events[e] = this._events[e].filter(f => f !== fn); }
    emit(e, data) { (this._events[e] || []).forEach(fn => { try { fn(data); } catch (err) {} }); }
    once(e, fn) { const wrap = (d) => { this.off(e, wrap); fn(d); }; this.on(e, wrap); }
  }

  /* ========== 旋钮 Knob ========== */
  class Knob extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Knob: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, value: 50, step: 1,
        size: 48, startAngle: -135, endAngle: 135,
        showValue: true, decimals: 1, suffix: '',
        color: null, bgColor: null
      }, options);
      this._value = clamp(this.opts.value, this.opts.min, this.opts.max);
      this._isDragging = false;
      this._startY = 0;
      this._startValue = 0;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-knob');
      setStyles(this.el, {
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px', cursor: 'ns-resize', userSelect: 'none', touchAction: 'none'
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.size;
      this._canvas.height = this.opts.size;
      setStyles(this._canvas, { width: px(this.opts.size), height: px(this.opts.size) });

      if (this.opts.showValue) {
        this._label = createEl('span', 'ql-knob-label', this.el);
        setStyles(this._label, { fontSize: '11px', color: 'var(--text2)', fontWeight: '600' });
      }

      this._bindEvents();
      this._draw();
      this._updateLabel();
    }

    _bindEvents() {
      const start = (e) => {
        this._isDragging = true;
        this._startY = e.clientY || e.touches[0].clientY;
        this._startValue = this._value;
        document.body.style.cursor = 'ns-resize';
      };
      const move = (e) => {
        if (!this._isDragging) return;
        const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        const range = this.opts.max - this.opts.min;
        const delta = (this._startY - y) / 200 * range;
        this.setValue(Math.round((this._startValue + delta) / this.opts.step) * this.opts.step);
      };
      const end = () => {
        this._isDragging = false;
        document.body.style.cursor = '';
      };

      addEvent(this._canvas, 'mousedown', start);
      addEvent(this._canvas, 'touchstart', start, { passive: false });
      addEvent(document, 'mousemove', move);
      addEvent(document, 'touchmove', move, { passive: false });
      addEvent(document, 'mouseup', end);
      addEvent(document, 'touchend', end);
    }

    _draw() {
      const ctx = this._canvas.getContext('2d');
      const s = this.opts.size;
      const cx = s / 2, cy = s / 2;
      const r = (s - 8) / 2;
      const range = this.opts.endAngle - this.opts.startAngle;
      const pct = (this._value - this.opts.min) / (this.opts.max - this.opts.min);
      const angle = this.opts.startAngle + pct * range;
      const accent = this.opts.color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';
      const bg = this.opts.bgColor || 'rgba(0,0,0,0.06)';

      ctx.clearRect(0, 0, s, s);

      // 背景弧
      ctx.beginPath();
      ctx.arc(cx, cy, r, (this.opts.startAngle - 90) * Math.PI / 180, (this.opts.endAngle - 90) * Math.PI / 180);
      ctx.strokeStyle = bg;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 值弧
      ctx.beginPath();
      ctx.arc(cx, cy, r, (this.opts.startAngle - 90) * Math.PI / 180, (angle - 90) * Math.PI / 180);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 指示点
      const px2 = cx + Math.cos((angle - 90) * Math.PI / 180) * (r - 2);
      const py2 = cy + Math.sin((angle - 90) * Math.PI / 180) * (r - 2);
      ctx.beginPath();
      ctx.arc(px2, py2, 4, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    _updateLabel() {
      if (this._label) {
        this._label.textContent = this._value.toFixed(this.opts.decimals) + this.opts.suffix;
      }
    }

    setValue(v) {
      const nv = clamp(v, this.opts.min, this.opts.max);
      if (nv === this._value) return;
      this._value = nv;
      this._draw();
      this._updateLabel();
      this.emit('change', this._value);
    }

    getValue() { return this._value; }
    getElement() { return this.el; }

    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-knob');
    }
  }

  /* ========== 推子 Fader ========== */
  class Fader extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Fader: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, value: 70, step: 1,
        width: 40, height: 160, orientation: 'vertical',
        showScale: true, scaleSteps: 5,
        color: null, trackColor: null
      }, options);
      this._value = clamp(this.opts.value, this.opts.min, this.opts.max);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-fader');
      setStyles(this.el, {
        width: px(this.opts.width), height: px(this.opts.height),
        position: 'relative', userSelect: 'none', touchAction: 'none'
      });

      // 轨道
      this._track = createEl('div', 'ql-fader-track', this.el);
      setStyles(this._track, {
        position: 'absolute',
        left: px(this.opts.orientation === 'vertical' ? this.opts.width / 2 - 2 : 0),
        top: px(this.opts.orientation === 'vertical' ? 0 : this.opts.height / 2 - 2),
        width: px(this.opts.orientation === 'vertical' ? 4 : this.opts.width),
        height: px(this.opts.orientation === 'vertical' ? this.opts.height : 4),
        background: this.opts.trackColor || 'rgba(0,0,0,0.06)',
        borderRadius: '2px'
      });

      // 填充
      this._fill = createEl('div', 'ql-fader-fill', this._track);
      setStyles(this._fill, {
        position: 'absolute', bottom: '0', left: '0',
        width: '100%', background: this.opts.color || 'var(--accent, #5b4dff)',
        borderRadius: '2px', pointerEvents: 'none'
      });

      // 滑块
      this._thumb = createEl('div', 'ql-fader-thumb', this.el);
      setStyles(this._thumb, {
        position: 'absolute', width: px(this.opts.width), height: '16px',
        background: '#fff', border: '2px solid var(--accent, #5b4dff)',
        borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        cursor: 'pointer', zIndex: '2'
      });

      // 刻度
      if (this.opts.showScale) {
        this._scale = createEl('div', 'ql-fader-scale', this.el);
        setStyles(this._scale, {
          position: 'absolute', right: '0', top: '0', height: '100%',
          display: 'flex', flexDirection: 'column-reverse',
          justifyContent: 'space-between', fontSize: '9px', color: 'var(--text3)',
          paddingRight: '2px', pointerEvents: 'none'
        });
        for (let i = 0; i <= this.opts.scaleSteps; i++) {
          const v = this.opts.min + (this.opts.max - this.opts.min) * (i / this.opts.scaleSteps);
          const mark = createEl('span', null, this._scale);
          mark.textContent = Math.round(v);
        }
      }

      this._bindEvents();
      this._updateUI();
    }

    _bindEvents() {
      let dragging = false;
      const onStart = (e) => {
        dragging = true;
        this._onMove(e);
      };
      const onMove = (e) => { if (dragging) this._onMove(e); };
      const onEnd = () => { dragging = false; };

      addEvent(this.el, 'mousedown', onStart);
      addEvent(this.el, 'touchstart', onStart, { passive: false });
      addEvent(document, 'mousemove', onMove);
      addEvent(document, 'touchmove', onMove, { passive: false });
      addEvent(document, 'mouseup', onEnd);
      addEvent(document, 'touchend', onEnd);
    }

    _onMove(e) {
      const rect = this.el.getBoundingClientRect();
      const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
      const pct = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      const range = this.opts.max - this.opts.min;
      const raw = this.opts.min + pct * range;
      this.setValue(Math.round(raw / this.opts.step) * this.opts.step);
    }

    _updateUI() {
      const pct = (this._value - this.opts.min) / (this.opts.max - this.opts.min);
      this._fill.style.height = (pct * 100) + '%';
      this._thumb.style.bottom = `calc(${pct * 100}% - 8px)`;
    }

    setValue(v) {
      const nv = clamp(v, this.opts.min, this.opts.max);
      if (nv === this._value) return;
      this._value = nv;
      this._updateUI();
      this.emit('change', this._value);
    }

    getValue() { return this._value; }
    getElement() { return this.el; }

    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-fader');
    }
  }

  /* ========== 电平表 Meter ========== */
  class Meter extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Meter: element not found');
      this.opts = Object.assign({
        width: 16, height: 120, orientation: 'vertical',
        type: 'peak', // peak / rms / vu
        holdTime: 1000,
        segments: 20,
        colorLow: '#4ade80', colorMid: '#facc15', colorHigh: '#ef4444',
        showPeak: true
      }, options);
      this._value = 0;
      this._peak = 0;
      this._peakTimer = null;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-meter');
      setStyles(this.el, {
        width: px(this.opts.width), height: px(this.opts.height),
        position: 'relative', background: 'rgba(0,0,0,0.06)',
        borderRadius: '4px', overflow: 'hidden'
      });

      this._fill = createEl('div', 'ql-meter-fill', this.el);
      setStyles(this._fill, {
        position: 'absolute', bottom: '0', left: '0', width: '100%',
        height: '0%', background: this.opts.colorLow,
        borderRadius: '0 0 4px 4px', transition: 'height 0.05s linear'
      });

      if (this.opts.showPeak) {
        this._peakLine = createEl('div', 'ql-meter-peak', this.el);
        setStyles(this._peakLine, {
          position: 'absolute', left: '0', width: '100%', height: '2px',
          background: '#fff', opacity: '0', transition: 'opacity 0.2s'
        });
      }

      // 分段LED风格
      if (this.opts.segments > 0) {
        this._segments = createEl('div', 'ql-meter-segments', this.el);
        setStyles(this._segments, {
          position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column-reverse', gap: '1px', pointerEvents: 'none'
        });
        for (let i = 0; i < this.opts.segments; i++) {
          const seg = createEl('div', null, this._segments);
          setStyles(seg, {
            flex: '1', background: 'rgba(0,0,0,0.08)', borderRadius: '1px'
          });
        }
      }
    }

    setValue(v) {
      this._value = clamp(v, 0, 1);
      if (this._value > this._peak) {
        this._peak = this._value;
        if (this._peakLine) {
          this._peakLine.style.bottom = (this._peak * 100) + '%';
          this._peakLine.style.opacity = '1';
        }
        if (this._peakTimer) clearTimeout(this._peakTimer);
        this._peakTimer = setTimeout(() => {
          this._peak = 0;
          if (this._peakLine) this._peakLine.style.opacity = '0';
        }, this.opts.holdTime);
      }
      this._updateUI();
      this.emit('change', this._value);
    }

    _updateUI() {
      const pct = this._value * 100;
      this._fill.style.height = pct + '%';
      let color = this.opts.colorLow;
      if (this._value > 0.7) color = this.opts.colorMid;
      if (this._value > 0.9) color = this.opts.colorHigh;
      this._fill.style.background = color;

      // 更新LED段
      if (this._segments) {
        const segs = this._segments.children;
        const active = Math.floor(this._value * this.opts.segments);
        for (let i = 0; i < segs.length; i++) {
          const lit = i < active;
          let segColor = this.opts.colorLow;
          const pctSeg = i / this.opts.segments;
          if (pctSeg > 0.7) segColor = this.opts.colorMid;
          if (pctSeg > 0.9) segColor = this.opts.colorHigh;
          segs[i].style.background = lit ? segColor : 'rgba(0,0,0,0.08)';
          segs[i].style.boxShadow = lit ? `0 0 4px ${segColor}` : 'none';
        }
      }
    }

    getValue() { return this._value; }
    getElement() { return this.el; }

    destroy() {
      if (this._peakTimer) clearTimeout(this._peakTimer);
      this.el.innerHTML = '';
      this.el.classList.remove('ql-meter');
    }
  }

  /* ========== 示波器 Scope ========== */
  class Scope extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Scope: element not found');
      this.opts = Object.assign({
        width: 300, height: 120, color: null, lineWidth: 2,
        trigger: true, fade: false
      }, options);
      this._data = new Float32Array(0);
      this._running = false;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-scope');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width;
      this._canvas.height = this.opts.height;
      setStyles(this._canvas, { width: '100%', height: '100%', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
    }

    setData(data) {
      this._data = data instanceof Float32Array ? data : new Float32Array(data);
      if (!this._running) this._draw();
    }

    start() { this._running = true; this._drawLoop(); }
    stop() { this._running = false; }

    _drawLoop() {
      if (!this._running) return;
      this._draw();
      requestAnimationFrame(() => this._drawLoop());
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      const accent = this.opts.color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';

      if (this.opts.fade) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      if (!this._data.length) return;

      ctx.strokeStyle = accent;
      ctx.lineWidth = this.opts.lineWidth;
      ctx.beginPath();
      const step = this._data.length / w;
      for (let x = 0; x < w; x++) {
        const idx = Math.floor(x * step);
        const v = this._data[idx] || 0;
        const y = (0.5 - v * 0.45) * h;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    getElement() { return this.el; }
    destroy() {
      this.stop();
      this.el.innerHTML = '';
      this.el.classList.remove('ql-scope');
    }
  }

  /* ========== 频谱仪 Spectrum ========== */
  class Spectrum extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Spectrum: element not found');
      this.opts = Object.assign({
        width: 300, height: 120, barCount: 64, smoothing: 0.8,
        colorStart: null, colorEnd: null, barGap: 1
      }, options);
      this._data = new Uint8Array(0);
      this._running = false;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-spectrum');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width;
      this._canvas.height = this.opts.height;
      setStyles(this._canvas, { width: '100%', height: '100%', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
    }

    setData(data) {
      this._data = data instanceof Uint8Array ? data : new Uint8Array(data);
      if (!this._running) this._draw();
    }

    start() { this._running = true; this._drawLoop(); }
    stop() { this._running = false; }

    _drawLoop() {
      if (!this._running) return;
      this._draw();
      requestAnimationFrame(() => this._drawLoop());
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!this._data.length) return;

      const barW = (w - (this.opts.barCount - 1) * this.opts.barGap) / this.opts.barCount;
      for (let i = 0; i < this.opts.barCount; i++) {
        const idx = Math.floor((i / this.opts.barCount) * this._data.length);
        const val = (this._data[idx] || 0) / 255;
        const bh = val * h;
        const hue = 200 + (i / this.opts.barCount) * 60;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
        ctx.fillRect(i * (barW + this.opts.barGap), h - bh, barW, bh);
      }
    }

    getElement() { return this.el; }
    destroy() {
      this.stop();
      this.el.innerHTML = '';
      this.el.classList.remove('ql-spectrum');
    }
  }

  /* ========== 虚拟钢琴键盘 PianoKeyboard ========== */
  class PianoKeyboard extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PianoKeyboard: element not found');
      this.opts = Object.assign({
        startNote: 36, endNote: 84, height: 120,
        whiteKeyColor: '#fff', blackKeyColor: '#1a1a1a',
        activeColor: 'var(--accent, #5b4dff)',
        showLabels: false
      }, options);
      this._activeNotes = new Set();
      this._init();
    }

    _init() {
      this.el.classList.add('ql-piano-keyboard');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: '100%', height: px(this.opts.height),
        overflow: 'hidden', userSelect: 'none'
      });
      this._buildKeys();
      this._bindEvents();
    }

    _buildKeys() {
      const blackKeys = new Set([1, 3, 6, 8, 10]);
      const whiteCount = [];
      for (let n = this.opts.startNote; n <= this.opts.endNote; n++) {
        if (!blackKeys.has(n % 12)) whiteCount.push(n);
      }
      const keyW = this.el.clientWidth / whiteCount.length || 20;

      // 白键
      whiteCount.forEach((note, i) => {
        const key = createEl('div', 'ql-piano-white-key', this.el);
        key.dataset.note = note;
        setStyles(key, {
          position: 'absolute', left: px(i * keyW), top: '0',
          width: px(keyW), height: '100%', background: this.opts.whiteKeyColor,
          border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0 0 4px 4px',
          cursor: 'pointer', zIndex: '1'
        });
        if (this.opts.showLabels) {
          const label = createEl('span', null, key);
          label.textContent = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][note % 12];
          setStyles(label, { position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#999' });
        }
      });

      // 黑键
      let whiteIdx = 0;
      for (let n = this.opts.startNote; n <= this.opts.endNote; n++) {
        if (!blackKeys.has(n % 12)) { whiteIdx++; continue; }
        const key = createEl('div', 'ql-piano-black-key', this.el);
        key.dataset.note = n;
        setStyles(key, {
          position: 'absolute', left: px((whiteIdx - 1) * keyW + keyW * 0.7), top: '0',
          width: px(keyW * 0.6), height: '60%', background: this.opts.blackKeyColor,
          borderRadius: '0 0 4px 4px', cursor: 'pointer', zIndex: '2'
        });
      }
    }

    _bindEvents() {
      const onDown = (e) => {
        const key = e.target.closest('[data-note]');
        if (!key) return;
        const note = parseInt(key.dataset.note);
        this.noteOn(note);
      };
      const onUp = (e) => {
        const key = e.target.closest('[data-note]');
        if (!key) return;
        const note = parseInt(key.dataset.note);
        this.noteOff(note);
      };
      const onOver = (e) => {
        if (e.buttons !== 1) return;
        const key = e.target.closest('[data-note]');
        if (!key) return;
        const note = parseInt(key.dataset.note);
        this.noteOn(note);
      };
      const onOut = (e) => {
        if (e.buttons !== 1) return;
        const key = e.target.closest('[data-note]');
        if (!key) return;
        const note = parseInt(key.dataset.note);
        this.noteOff(note);
      };

      addEvent(this.el, 'mousedown', onDown);
      addEvent(this.el, 'mouseup', onUp);
      addEvent(this.el, 'mouseover', onOver);
      addEvent(this.el, 'mouseout', onOut);
      addEvent(this.el, 'touchstart', (e) => { onDown(e); e.preventDefault(); }, { passive: false });
      addEvent(this.el, 'touchend', onUp);
    }

    noteOn(note) {
      if (this._activeNotes.has(note)) return;
      this._activeNotes.add(note);
      const key = this.el.querySelector(`[data-note="${note}"]`);
      if (key) key.style.background = this.opts.activeColor;
      this.emit('noteOn', note);
    }

    noteOff(note) {
      if (!this._activeNotes.has(note)) return;
      this._activeNotes.delete(note);
      const key = this.el.querySelector(`[data-note="${note}"]`);
      if (key) {
        const isBlack = [1,3,6,8,10].includes(note % 12);
        key.style.background = isBlack ? this.opts.blackKeyColor : this.opts.whiteKeyColor;
      }
      this.emit('noteOff', note);
    }

    allNotesOff() {
      this._activeNotes.forEach(n => this.noteOff(n));
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-piano-keyboard');
    }
  }

  /* ========== 播放控制条 TransportBar ========== */
  class TransportBar extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TransportBar: element not found');
      this.opts = Object.assign({
        showPlay: true, showStop: true, showRecord: true, showLoop: true,
        showMetronome: true, bpm: 120, timeSig: [4, 4]
      }, options);
      this._state = { playing: false, recording: false, looping: false, metronome: false };
      this._init();
    }

    _init() {
      this.el.classList.add('ql-transport-bar');
      setStyles(this.el, {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
        background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      });

      // 播放
      if (this.opts.showPlay) {
        this._playBtn = this._createBtn('▶', '播放', () => {
          this._state.playing = !this._state.playing;
          this._playBtn.textContent = this._state.playing ? '⏸' : '▶';
          this._playBtn.classList.toggle('active', this._state.playing);
          this.emit(this._state.playing ? 'play' : 'pause');
        });
      }

      // 停止
      if (this.opts.showStop) {
        this._stopBtn = this._createBtn('⏹', '停止', () => {
          this._state.playing = false;
          if (this._playBtn) { this._playBtn.textContent = '▶'; this._playBtn.classList.remove('active'); }
          this.emit('stop');
        });
      }

      // 录音
      if (this.opts.showRecord) {
        this._recBtn = this._createBtn('⏺', '录音', () => {
          this._state.recording = !this._state.recording;
          this._recBtn.classList.toggle('active', this._state.recording);
          this._recBtn.style.color = this._state.recording ? '#ef4444' : '';
          this.emit(this._state.recording ? 'recordStart' : 'recordStop');
        });
      }

      // 循环
      if (this.opts.showLoop) {
        this._loopBtn = this._createBtn('🔁', '循环', () => {
          this._state.looping = !this._state.looping;
          this._loopBtn.classList.toggle('active', this._state.looping);
          this.emit('loop', this._state.looping);
        });
      }

      // 节拍器
      if (this.opts.showMetronome) {
        this._metroBtn = this._createBtn('🔔', '节拍器', () => {
          this._state.metronome = !this._state.metronome;
          this._metroBtn.classList.toggle('active', this._state.metronome);
          this.emit('metronome', this._state.metronome);
        });
      }

      // BPM 显示
      this._bpmDisplay = createEl('div', 'ql-transport-bpm', this.el);
      setStyles(this._bpmDisplay, {
        marginLeft: 'auto', fontSize: '14px', fontWeight: '700', color: 'var(--text)',
        fontFamily: 'monospace', minWidth: '60px', textAlign: 'right'
      });
      this._bpmDisplay.textContent = this.opts.bpm + ' BPM';
    }

    _createBtn(icon, title, onClick) {
      const btn = createEl('button', 'ql-transport-btn', this.el);
      btn.textContent = icon;
      btn.title = title;
      setStyles(btn, {
        width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)',
        background: 'var(--input-bg)', color: 'var(--text2)', fontSize: '14px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      addEvent(btn, 'click', onClick);
      return btn;
    }

    setBPM(bpm) {
      this.opts.bpm = bpm;
      if (this._bpmDisplay) this._bpmDisplay.textContent = bpm + ' BPM';
    }

    setState(state) {
      Object.assign(this._state, state);
      if (this._playBtn) {
        this._playBtn.textContent = this._state.playing ? '⏸' : '▶';
        this._playBtn.classList.toggle('active', this._state.playing);
      }
      if (this._recBtn) {
        this._recBtn.classList.toggle('active', this._state.recording);
        this._recBtn.style.color = this._state.recording ? '#ef4444' : '';
      }
      if (this._loopBtn) this._loopBtn.classList.toggle('active', this._state.looping);
      if (this._metroBtn) this._metroBtn.classList.toggle('active', this._state.metronome);
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-transport-bar');
    }
  }

  /* ========== 时间轴 Timeline ========== */
  class Timeline extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Timeline: element not found');
      this.opts = Object.assign({
        width: 600, height: 28, pixelsPerBeat: 40, beatsPerBar: 4,
        zoomX: 1, scrollX: 0, playhead: 0
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-timeline');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width;
      this._canvas.height = this.opts.height;
      setStyles(this._canvas, { width: '100%', height: '100%' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }

    setPlayhead(beat) {
      this.opts.playhead = beat;
      this._draw();
      this.emit('change', beat);
    }

    setZoom(zoom) {
      this.opts.zoomX = zoom;
      this._draw();
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      const beatW = this.opts.pixelsPerBeat * this.opts.zoomX;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'var(--card-bg, #fff)';
      ctx.fillRect(0, 0, w, h);

      const startBeat = Math.floor(-this.opts.scrollX / beatW);
      const endBeat = startBeat + Math.ceil(w / beatW) + 1;

      for (let b = startBeat; b <= endBeat; b++) {
        const x = b * beatW + this.opts.scrollX;
        if (x < 0 || x > w) continue;
        const isBar = b % this.opts.beatsPerBar === 0;
        ctx.strokeStyle = isBar ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = isBar ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, isBar ? 0 : h / 2);
        ctx.lineTo(x, h);
        ctx.stroke();

        if (isBar) {
          ctx.fillStyle = 'var(--text2)';
          ctx.font = '10px sans-serif';
          ctx.fillText(String(Math.floor(b / this.opts.beatsPerBar) + 1), x + 2, h / 2 - 2);
        }
      }

      // 播放头
      const px2 = this.opts.playhead * beatW + this.opts.scrollX;
      ctx.strokeStyle = '#ff6b9d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px2, 0);
      ctx.lineTo(px2, h);
      ctx.stroke();
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-timeline');
    }
  }

  /* ========== 音频片段 Clip ========== */
  class Clip extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Clip: element not found');
      this.opts = Object.assign({
        name: 'Clip', color: 'var(--accent, #5b4dff)',
        start: 0, duration: 4, selected: false,
        editable: true
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-clip');
      setStyles(this.el, {
        display: 'inline-block', position: 'relative',
        background: this.opts.color, borderRadius: '6px',
        padding: '4px 8px', fontSize: '11px', color: '#fff',
        fontWeight: '600', cursor: 'pointer', userSelect: 'none',
        whiteSpace: 'nowrap', overflow: 'hidden', minWidth: '40px'
      });
      this.el.textContent = this.opts.name;
      if (this.opts.selected) this.el.classList.add('selected');

      this._bindEvents();
    }

    _bindEvents() {
      let startX = 0, startW = 0;
      const onDown = (e) => {
        if (!this.opts.editable) return;
        startX = e.clientX;
        startW = this.el.offsetWidth;
        this.emit('select', this);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };
      const onMove = (e) => {
        const dx = e.clientX - startX;
        this.opts.duration = Math.max(0.5, (startW + dx) / 40);
        this.el.style.width = (this.opts.duration * 40) + 'px';
        this.emit('resize', this.opts.duration);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.emit('resizeEnd', this.opts.duration);
      };

      addEvent(this.el, 'mousedown', onDown);
      addEvent(this.el, 'dblclick', () => this.emit('split', this));
    }

    setSelected(v) {
      this.opts.selected = v;
      this.el.classList.toggle('selected', v);
      this.el.style.boxShadow = v ? '0 0 0 2px #fff, 0 0 0 4px ' + this.opts.color : 'none';
    }

    setName(name) {
      this.opts.name = name;
      this.el.textContent = name;
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-clip');
    }
  }

  /* ========== 轨道头 TrackHeader ========== */
  class TrackHeader extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TrackHeader: element not found');
      this.opts = Object.assign({
        name: 'Track', color: '#5b4dff',
        muted: false, solo: false, armed: false,
        width: 160, height: 60
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-track-header');
      setStyles(this.el, {
        display: 'flex', alignItems: 'center', gap: '6px',
        width: px(this.opts.width), height: px(this.opts.height),
        padding: '0 10px', background: 'var(--card-bg)',
        borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)'
      });

      // 颜色指示
      const colorInd = createEl('div', 'ql-track-color', this.el);
      setStyles(colorInd, {
        width: '4px', height: '100%', background: this.opts.color, borderRadius: '2px'
      });

      // 名称
      this._nameEl = createEl('div', 'ql-track-name', this.el);
      this._nameEl.textContent = this.opts.name;
      setStyles(this._nameEl, { flex: '1', fontSize: '12px', fontWeight: '600', color: 'var(--text)' });

      // 按钮组
      const btns = createEl('div', 'ql-track-btns', this.el);
      setStyles(btns, { display: 'flex', gap: '4px' });

      this._muteBtn = this._createToggleBtn(btns, 'M', this.opts.muted, (v) => {
        this.opts.muted = v;
        this.emit('mute', v);
      });
      this._soloBtn = this._createToggleBtn(btns, 'S', this.opts.solo, (v) => {
        this.opts.solo = v;
        this.emit('solo', v);
      });
      this._armBtn = this._createToggleBtn(btns, 'R', this.opts.armed, (v) => {
        this.opts.armed = v;
        this.emit('arm', v);
      });
    }

    _createToggleBtn(parent, label, active, onChange) {
      const btn = createEl('button', 'ql-track-btn', parent);
      btn.textContent = label;
      setStyles(btn, {
        width: '22px', height: '22px', borderRadius: '4px', border: 'none',
        fontSize: '9px', fontWeight: '700', cursor: 'pointer'
      });
      const update = () => {
        btn.style.background = active ? (label === 'M' ? '#ef4444' : label === 'S' ? '#f59e0b' : '#ef4444') : 'rgba(0,0,0,0.06)';
        btn.style.color = active ? '#fff' : 'var(--text2)';
      };
      update();
      addEvent(btn, 'click', () => { active = !active; update(); onChange(active); });
      return btn;
    }

    setName(name) { this.opts.name = name; this._nameEl.textContent = name; }
    setColor(color) { this.opts.color = color; this.el.querySelector('.ql-track-color').style.background = color; }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-track-header');
    }
  }

  /* ========== 混音台通道条 MixerChannel ========== */
  class MixerChannel extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MixerChannel: element not found');
      this.opts = Object.assign({
        name: 'Channel', color: '#5b4dff',
        width: 60, height: 280
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-mixer-channel');
      setStyles(this.el, {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '6px', width: px(this.opts.width), height: px(this.opts.height),
        padding: '8px 4px', background: 'var(--card-bg)',
        borderRadius: '10px', border: '1px solid var(--border)'
      });

      // 名称
      const nameEl = createEl('div', 'ql-mixer-name', this.el);
      nameEl.textContent = this.opts.name;
      setStyles(nameEl, { fontSize: '10px', fontWeight: '600', color: 'var(--text)', textAlign: 'center', width: '100%' });

      // 声像旋钮占位
      const panWrap = createEl('div', 'ql-mixer-pan', this.el);
      setStyles(panWrap, { width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.04)' });
      panWrap.title = '声像';

      // 电平表
      const meterWrap = createEl('div', 'ql-mixer-meter-wrap', this.el);
      setStyles(meterWrap, { flex: '1', display: 'flex', justifyContent: 'center', width: '100%' });
      this._meterEl = createEl('div', 'ql-mixer-meter', meterWrap);
      this._meterEl.style.cssText = 'width:8px;height:100%;background:rgba(0,0,0,0.06);border-radius:4px;position:relative;overflow:hidden;';
      this._meterFill = createEl('div', 'ql-mixer-meter-fill', this._meterEl);
      setStyles(this._meterFill, {
        position: 'absolute', bottom: '0', left: '0', width: '100%', height: '0%',
        background: this.opts.color, borderRadius: '4px', transition: 'height 0.05s'
      });

      // 推子
      this._faderEl = createEl('div', 'ql-mixer-fader', this.el);
      setStyles(this._faderEl, { width: '40px', height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', position: 'relative' });
      this._faderThumb = createEl('div', 'ql-mixer-fader-thumb', this._faderEl);
      setStyles(this._faderThumb, {
        position: 'absolute', top: '-6px', left: '50%',
        width: '12px', height: '16px', background: '#fff',
        border: '2px solid var(--accent)', borderRadius: '4px',
        transform: 'translateX(-50%)', cursor: 'pointer'
      });
    }

    setMeter(value) {
      const pct = clamp(value, 0, 1) * 100;
      this._meterFill.style.height = pct + '%';
      let color = '#4ade80';
      if (value > 0.7) color = '#facc15';
      if (value > 0.9) color = '#ef4444';
      this._meterFill.style.background = color;
    }

    setFader(value) {
      const pct = clamp(value, 0, 1) * 100;
      this._faderThumb.style.left = pct + '%';
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-mixer-channel');
    }
  }

  /* ========== EQ 曲线显示 EQDisplay ========== */
  class EQDisplay extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('EQDisplay: element not found');
      this.opts = Object.assign({
        width: 300, height: 150, bands: [
          { freq: 100, gain: 0, q: 1.0, type: 'lowshelf' },
          { freq: 1000, gain: 0, q: 1.0, type: 'peaking' },
          { freq: 10000, gain: 0, q: 1.0, type: 'highshelf' }
        ]
      }, options);
      this._dragBand = null;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-eq-display');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width * 2;
      this._canvas.height = this.opts.height * 2;
      setStyles(this._canvas, { width: px(this.opts.width), height: px(this.opts.height), borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
      this._bindEvents();
      this._draw();
    }

    _bindEvents() {
      let dragging = null;
      const getPos = (e) => {
        const rect = this._canvas.getBoundingClientRect();
        return { x: (e.clientX - rect.left) * 2, y: (e.clientY - rect.top) * 2 };
      };
      const onDown = (e) => {
        const p = getPos(e);
        // 找最近的节点
        let minDist = Infinity;
        this.opts.bands.forEach((band, i) => {
          const bx = this._freqToX(band.freq);
          const by = this._gainToY(band.gain);
          const d = Math.hypot(p.x - bx, p.y - by);
          if (d < 20 && d < minDist) { minDist = d; dragging = i; }
        });
      };
      const onMove = (e) => {
        if (dragging === null) return;
        const p = getPos(e);
        const band = this.opts.bands[dragging];
        band.freq = clamp(this._xToFreq(p.x), 20, 20000);
        band.gain = clamp(this._yToGain(p.y), -18, 18);
        this._draw();
        this.emit('change', { index: dragging, band });
      };
      const onUp = () => { dragging = null; };

      addEvent(this._canvas, 'mousedown', onDown);
      addEvent(document, 'mousemove', onMove);
      addEvent(document, 'mouseup', onUp);
      addEvent(this._canvas, 'touchstart', (e) => { onDown(e.touches[0]); e.preventDefault(); }, { passive: false });
      addEvent(document, 'touchmove', (e) => { if (dragging !== null) { onMove(e.touches[0]); e.preventDefault(); } }, { passive: false });
      addEvent(document, 'touchend', onUp);
    }

    _freqToX(f) { return (Math.log10(f / 20) / Math.log10(1000)) * this._canvas.width; }
    _xToFreq(x) { return 20 * Math.pow(10, (x / this._canvas.width) * Math.log10(1000)); }
    _gainToY(g) { return this._canvas.height / 2 - (g / 18) * (this._canvas.height / 2); }
    _yToGain(y) { return (this._canvas.height / 2 - y) / (this._canvas.height / 2) * 18; }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 网格
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      [100, 1000, 10000].forEach(f => {
        const x = this._freqToX(f);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      });
      [-12, -6, 0, 6, 12].forEach(g => {
        const y = this._gainToY(g);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      });

      // 曲线
      ctx.strokeStyle = 'var(--accent, #5b4dff)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const f = this._xToFreq(x);
        let gain = 0;
        this.opts.bands.forEach(band => {
          const bw = band.freq / band.q;
          const db = 10 * Math.log10(1 + Math.pow((f - band.freq) / (bw / 2), 2));
          gain += band.gain / (1 + Math.pow((f - band.freq) / (bw / 2), 2));
        });
        const y = this._gainToY(gain);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 节点
      this.opts.bands.forEach((band, i) => {
        const x = this._freqToX(band.freq);
        const y = this._gainToY(band.gain);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'var(--accent, #5b4dff)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'var(--accent, #5b4dff)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((i + 1).toString(), x, y + 5);
      });
    }

    setBands(bands) {
      this.opts.bands = bands;
      this._draw();
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-eq-display');
    }
  }

  /* ========== 压缩器特性曲线 CompressorGraph ========== */
  class CompressorGraph extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CompressorGraph: element not found');
      this.opts = Object.assign({
        width: 200, height: 200,
        threshold: -24, ratio: 4, knee: 6, makeup: 0
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-compressor-graph');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width * 2;
      this._canvas.height = this.opts.height * 2;
      setStyles(this._canvas, { width: px(this.opts.width), height: px(this.opts.height), borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }

    setParams(params) {
      Object.assign(this.opts, params);
      this._draw();
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 网格
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const pos = (i / 10) * w;
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(w, pos); ctx.stroke();
      }

      // 曲线
      ctx.strokeStyle = 'var(--accent, #5b4dff)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const dbToY = (db) => h - ((db + 60) / 60) * h;
      const dbToX = (db) => ((db + 60) / 60) * w;

      for (let dbIn = -60; dbIn <= 0; dbIn += 0.5) {
        let dbOut;
        if (dbIn < this.opts.threshold - this.opts.knee / 2) {
          dbOut = dbIn;
        } else if (dbIn > this.opts.threshold + this.opts.knee / 2) {
          dbOut = this.opts.threshold + (dbIn - this.opts.threshold) / this.opts.ratio;
        } else {
          const t = (dbIn - (this.opts.threshold - this.opts.knee / 2)) / this.opts.knee;
          dbOut = dbIn + (this.opts.threshold + (dbIn - this.opts.threshold) / this.opts.ratio - dbIn) * t * t * (3 - 2 * t);
        }
        dbOut += this.opts.makeup;
        const x = dbToX(dbIn);
        const y = dbToY(dbOut);
        if (dbIn === -60) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 阈值线
      const ty = dbToY(this.opts.threshold);
      ctx.strokeStyle = 'rgba(239,68,68,0.5)';
      ctx.setLineDash([8, 4]);
      ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(w, ty); ctx.stroke();
      ctx.setLineDash([]);
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-compressor-graph');
    }
  }

  /* ========== 波形显示 WaveformDisplay ========== */
  class WaveformDisplay extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('WaveformDisplay: element not found');
      this.opts = Object.assign({
        width: 600, height: 120, color: null, bgColor: null
      }, options);
      this._buffer = null;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-waveform-display');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width * 2;
      this._canvas.height = this.opts.height * 2;
      setStyles(this._canvas, { width: px(this.opts.width), height: px(this.opts.height), borderRadius: '8px', background: this.opts.bgColor || 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
    }

    setBuffer(buffer) {
      this._buffer = buffer;
      this._draw();
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!this._buffer || !this._buffer.length) return;

      const accent = this.opts.color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';
      const step = Math.ceil(this._buffer.length / w);

      ctx.fillStyle = accent;
      for (let x = 0; x < w; x++) {
        let min = 1, max = -1;
        for (let i = 0; i < step; i++) {
          const idx = x * step + i;
          if (idx >= this._buffer.length) break;
          const v = this._buffer[idx];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const y1 = (0.5 - max * 0.45) * h;
        const y2 = (0.5 - min * 0.45) * h;
        ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
      }
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-waveform-display');
    }
  }

  /* ========== 实时频谱分析 SpectrumAnalyzer ========== */
  class SpectrumAnalyzer extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SpectrumAnalyzer: element not found');
      this.opts = Object.assign({
        width: 600, height: 200, fftSize: 2048,
        smoothing: 0.8, barCount: 128, mode: 'bars' // bars / line / area
      }, options);
      this._analyser = null;
      this._running = false;
      this._data = new Uint8Array(0);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-spectrum-analyzer');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width * 2;
      this._canvas.height = this.opts.height * 2;
      setStyles(this._canvas, { width: px(this.opts.width), height: px(this.opts.height), borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
    }

    connect(analyser) {
      this._analyser = analyser;
      if (analyser) {
        this._data = new Uint8Array(analyser.frequencyBinCount);
        this.start();
      }
    }

    start() { this._running = true; this._drawLoop(); }
    stop() { this._running = false; }

    _drawLoop() {
      if (!this._running) return;
      if (this._analyser) this._analyser.getByteFrequencyData(this._data);
      this._draw();
      requestAnimationFrame(() => this._drawLoop());
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!this._data.length) return;

      const barW = w / this.opts.barCount;
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';

      if (this.opts.mode === 'bars') {
        for (let i = 0; i < this.opts.barCount; i++) {
          const idx = Math.floor((i / this.opts.barCount) * this._data.length);
          const val = (this._data[idx] || 0) / 255;
          const bh = val * h;
          const hue = 200 + (i / this.opts.barCount) * 60;
          ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
          ctx.fillRect(i * barW, h - bh, barW - 1, bh);
        }
      } else if (this.opts.mode === 'line') {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < this.opts.barCount; i++) {
          const idx = Math.floor((i / this.opts.barCount) * this._data.length);
          const val = (this._data[idx] || 0) / 255;
          const x = i * barW;
          const y = h - val * h;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (this.opts.mode === 'area') {
        ctx.fillStyle = accent + '40';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < this.opts.barCount; i++) {
          const idx = Math.floor((i / this.opts.barCount) * this._data.length);
          const val = (this._data[idx] || 0) / 255;
          ctx.lineTo(i * barW, h - val * h);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.opts.barCount; i++) {
          const idx = Math.floor((i / this.opts.barCount) * this._data.length);
          const val = (this._data[idx] || 0) / 255;
          const x = i * barW;
          const y = h - val * h;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    getElement() { return this.el; }
    destroy() {
      this.stop();
      this.el.innerHTML = '';
      this.el.classList.remove('ql-spectrum-analyzer');
    }
  }

  /* ========== LFO 波形预览 LFOVisualizer ========== */
  class LFOVisualizer extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('LFOVisualizer: element not found');
      this.opts = Object.assign({
        width: 200, height: 80, wave: 'sine', // sine / square / saw / triangle / random
        rate: 1, depth: 1, phase: 0
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-lfo-visualizer');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width * 2;
      this._canvas.height = this.opts.height * 2;
      setStyles(this._canvas, { width: px(this.opts.width), height: px(this.opts.height), borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }

    setParams(params) {
      Object.assign(this.opts, params);
      this._draw();
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let x = 0; x <= w; x++) {
        const t = (x / w) * Math.PI * 2 * this.opts.rate + this.opts.phase;
        let y;
        switch (this.opts.wave) {
          case 'sine': y = Math.sin(t); break;
          case 'square': y = Math.sin(t) > 0 ? 1 : -1; break;
          case 'saw': y = ((t % (Math.PI * 2)) / (Math.PI * 2)) * 2 - 1; break;
          case 'triangle': y = Math.abs(((t % (Math.PI * 2)) / (Math.PI * 2)) * 2 - 1) * 2 - 1; break;
          default: y = Math.sin(t);
        }
        y = (0.5 - y * 0.4 * this.opts.depth) * h;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-lfo-visualizer');
    }
  }

  /* ========== ADSR 包络可视化 ADSRVisualizer ========== */
  class ADSRVisualizer extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ADSRVisualizer: element not found');
      this.opts = Object.assign({
        width: 200, height: 100,
        attack: 0.2, decay: 0.3, sustain: 0.6, release: 0.5
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-adsr-visualizer');
      setStyles(this.el, {
        display: 'block', position: 'relative',
        width: px(this.opts.width), height: px(this.opts.height)
      });
      this._canvas = createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width * 2;
      this._canvas.height = this.opts.height * 2;
      setStyles(this._canvas, { width: px(this.opts.width), height: px(this.opts.height), borderRadius: '8px', background: 'rgba(0,0,0,0.02)' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }

    setParams(params) {
      Object.assign(this.opts, params);
      this._draw();
    }

    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);

      const total = this.opts.attack + this.opts.decay + 1 + this.opts.release;
      const xA = (this.opts.attack / total) * w;
      const xD = xA + (this.opts.decay / total) * w;
      const xS = xD + (1 / total) * w;
      const yS = h - this.opts.sustain * h * 0.8;

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b4dff';
      ctx.fillStyle = accent + '20';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.1);
      ctx.lineTo(xA, h * 0.1);
      ctx.lineTo(xD, yS);
      ctx.lineTo(xS, yS);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 节点
      const nodes = [[0, h * 0.1], [xA, h * 0.1], [xD, yS], [xS, yS]];
      nodes.forEach(([nx, ny]) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(nx, ny, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-adsr-visualizer');
    }
  }

  /* ========== 模态对话框 ModalDialog ========== */
  class ModalDialog extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      this.opts = Object.assign({
        title: '提示', content: '', closable: true, overlay: true,
        buttons: [{ label: '确定', primary: true }]
      }, options);
      this._visible = false;
      if (this.el) this._init();
    }

    _init() {
      this.el.classList.add('ql-modal');
      setStyles(this.el, {
        position: 'fixed', inset: '0', zIndex: '20000',
        display: 'none', alignItems: 'center', justifyContent: 'center'
      });
      if (this.opts.overlay) {
        this._overlay = createEl('div', 'ql-modal-overlay', this.el);
        setStyles(this._overlay, { position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.4)' });
        addEvent(this._overlay, 'click', () => { if (this.opts.closable) this.close(); });
      }
      this._content = createEl('div', 'ql-modal-content', this.el);
      setStyles(this._content, {
        position: 'relative', background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        minWidth: '300px', maxWidth: '90vw', maxHeight: '80vh',
        overflow: 'auto', boxShadow: 'var(--shadow-lg)'
      });
      this._render();
    }

    _render() {
      this._content.innerHTML = '';
      const header = createEl('div', 'ql-modal-header', this._content);
      setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' });
      const title = createEl('h3', null, header);
      title.textContent = this.opts.title;
      setStyles(title, { margin: '0', fontSize: '16px', color: 'var(--text)' });

      if (this.opts.closable) {
        const closeBtn = createEl('button', null, header);
        closeBtn.textContent = '×';
        setStyles(closeBtn, { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text2)' });
        addEvent(closeBtn, 'click', () => this.close());
      }

      const body = createEl('div', 'ql-modal-body', this._content);
      setStyles(body, { fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '16px' });
      if (typeof this.opts.content === 'string') body.innerHTML = this.opts.content;
      else if (this.opts.content) body.appendChild(this.opts.content);

      const footer = createEl('div', 'ql-modal-footer', this._content);
      setStyles(footer, { display: 'flex', justifyContent: 'flex-end', gap: '8px' });
      (this.opts.buttons || []).forEach(btn => {
        const b = createEl('button', null, footer);
        b.textContent = btn.label;
        setStyles(b, {
          padding: '8px 16px', borderRadius: '8px', border: 'none',
          fontSize: '13px', cursor: 'pointer',
          background: btn.primary ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
          color: btn.primary ? '#fff' : 'var(--text2)'
        });
        addEvent(b, 'click', () => {
          this.emit('button', btn);
          if (btn.onClick) btn.onClick();
          if (btn.primary || btn.close !== false) this.close();
        });
      });
    }

    show() {
      if (!this.el) {
        this.el = document.createElement('div');
        document.body.appendChild(this.el);
        this._init();
      }
      this.el.style.display = 'flex';
      this._visible = true;
      this.emit('show');
    }

    close() {
      if (this.el) this.el.style.display = 'none';
      this._visible = false;
      this.emit('close');
    }

    setContent(content) { this.opts.content = content; this._render(); }
    setTitle(title) { this.opts.title = title; this._render(); }

    getElement() { return this.el; }
    destroy() {
      if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
  }

  /* ========== Toast 通知 ToastNotification ========== */
  class ToastNotification extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) {
        this.el = document.createElement('div');
        document.body.appendChild(this.el);
      }
      this.opts = Object.assign({
        position: 'top-right', duration: 3000, maxCount: 5
      }, options);
      this._toasts = [];
      this._init();
    }

    _init() {
      this.el.classList.add('ql-toast-container');
      setStyles(this.el, {
        position: 'fixed', zIndex: '25000',
        top: this.opts.position.includes('top') ? '16px' : 'auto',
        bottom: this.opts.position.includes('bottom') ? '16px' : 'auto',
        left: this.opts.position.includes('left') ? '16px' : 'auto',
        right: this.opts.position.includes('right') ? '16px' : 'auto',
        display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none'
      });
    }

    show(message, type = 'info') {
      const toast = createEl('div', 'ql-toast', this.el);
      const colors = {
        success: '#4ade80', error: '#ef4444', warning: '#f59e0b', info: 'var(--accent, #5b4dff)'
      };
      setStyles(toast, {
        background: 'var(--card-bg)', color: 'var(--text)',
        padding: '10px 16px', borderRadius: '10px',
        boxShadow: 'var(--shadow-md)', fontSize: '13px',
        borderLeft: `3px solid ${colors[type] || colors.info}`,
        display: 'flex', alignItems: 'center', gap: '8px',
        pointerEvents: 'auto', minWidth: '200px', maxWidth: '360px',
        animation: 'ql-toast-in 0.3s ease'
      });

      const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '!' : 'ℹ';
      toast.innerHTML = `<span style="font-weight:700;color:${colors[type] || colors.info}">${icon}</span><span>${message}</span>`;

      this._toasts.push(toast);
      if (this._toasts.length > this.opts.maxCount) {
        const old = this._toasts.shift();
        if (old && old.parentNode) old.parentNode.removeChild(old);
      }

      setTimeout(() => {
        toast.style.animation = 'ql-toast-out 0.3s ease forwards';
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
          this._toasts = this._toasts.filter(t => t !== toast);
        }, 300);
      }, this.opts.duration);

      this.emit('show', { message, type });
    }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-toast-container');
    }
  }

  /* ========== 右键菜单 ContextMenu ========== */
  class ContextMenu extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      this.opts = Object.assign({ items: [] }, options);
      this._visible = false;
      this._target = null;
      this._init();
    }

    _init() {
      if (this.el) {
        addEvent(this.el, 'contextmenu', (e) => {
          e.preventDefault();
          this.show(e.clientX, e.clientY, e.target);
        });
      }
      addEvent(document, 'click', () => this.hide());
      addEvent(document, 'scroll', () => this.hide(), true);
    }

    show(x, y, target) {
      this._target = target;
      if (!this._menu) {
        this._menu = createEl('div', 'ql-context-menu', document.body);
        setStyles(this._menu, {
          position: 'fixed', zIndex: '30000',
          background: 'var(--card-bg)', borderRadius: '10px',
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
          padding: '6px 0', minWidth: '160px', display: 'none',
          fontSize: '13px'
        });
      }
      this._menu.innerHTML = '';
      this._menu.style.display = 'block';
      this._menu.style.left = px(x);
      this._menu.style.top = px(y);

      (this.opts.items || []).forEach(item => {
        if (item === '-') {
          const sep = createEl('div', null, this._menu);
          setStyles(sep, { height: '1px', background: 'var(--border)', margin: '4px 0' });
          return;
        }
        const row = createEl('div', 'ql-context-item', this._menu);
        row.textContent = item.label;
        setStyles(row, {
          padding: '8px 16px', cursor: 'pointer', color: 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        });
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(0,0,0,0.04)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
        addEvent(row, 'click', (e) => {
          e.stopPropagation();
          this.hide();
          if (item.action) item.action(this._target);
          this.emit('select', item);
        });
        if (item.shortcut) {
          const sc = createEl('span', null, row);
          sc.textContent = item.shortcut;
          setStyles(sc, { fontSize: '11px', color: 'var(--text3)', marginLeft: '16px' });
        }
      });

      // 边界检测
      const rect = this._menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) this._menu.style.left = px(window.innerWidth - rect.width - 8);
      if (rect.bottom > window.innerHeight) this._menu.style.top = px(window.innerHeight - rect.height - 8);

      this._visible = true;
      this.emit('show');
    }

    hide() {
      if (this._menu) this._menu.style.display = 'none';
      this._visible = false;
      this.emit('hide');
    }

    getElement() { return this.el; }
    destroy() {
      if (this._menu && this._menu.parentNode) this._menu.parentNode.removeChild(this._menu);
    }
  }

  /* ========== 工具提示 Tooltip ========== */
  class Tooltip extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      this.opts = Object.assign({
        text: '', position: 'top', delay: 300, offset: 8
      }, options);
      this._timer = null;
      this._tip = null;
      this._init();
    }

    _init() {
      if (!this.el) return;
      addEvent(this.el, 'mouseenter', () => {
        this._timer = setTimeout(() => this._show(), this.opts.delay);
      });
      addEvent(this.el, 'mouseleave', () => this._hide());
      addEvent(this.el, 'focus', () => this._show());
      addEvent(this.el, 'blur', () => this._hide());
    }

    _show() {
      if (!this._tip) {
        this._tip = createEl('div', 'ql-tooltip', document.body);
        setStyles(this._tip, {
          position: 'fixed', zIndex: '35000',
          background: 'rgba(0,0,0,0.85)', color: '#fff',
          padding: '6px 10px', borderRadius: '6px',
          fontSize: '12px', pointerEvents: 'none',
          whiteSpace: 'nowrap', opacity: '0', transition: 'opacity 0.15s'
        });
      }
      this._tip.textContent = this.opts.text;
      this._tip.style.opacity = '1';

      const rect = this.el.getBoundingClientRect();
      const tipRect = this._tip.getBoundingClientRect();
      let x, y;
      switch (this.opts.position) {
        case 'top': x = rect.left + rect.width / 2 - tipRect.width / 2; y = rect.top - tipRect.height - this.opts.offset; break;
        case 'bottom': x = rect.left + rect.width / 2 - tipRect.width / 2; y = rect.bottom + this.opts.offset; break;
        case 'left': x = rect.left - tipRect.width - this.opts.offset; y = rect.top + rect.height / 2 - tipRect.height / 2; break;
        case 'right': x = rect.right + this.opts.offset; y = rect.top + rect.height / 2 - tipRect.height / 2; break;
      }
      this._tip.style.left = px(x);
      this._tip.style.top = px(y);
    }

    _hide() {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      if (this._tip) this._tip.style.opacity = '0';
    }

    setText(text) { this.opts.text = text; }
    getElement() { return this.el; }
    destroy() {
      if (this._tip && this._tip.parentNode) this._tip.parentNode.removeChild(this._tip);
    }
  }

  /* ========== 下拉菜单 Dropdown ========== */
  class Dropdown extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Dropdown: element not found');
      this.opts = Object.assign({
        items: [], placeholder: '请选择', value: null
      }, options);
      this._open = false;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-dropdown');
      setStyles(this.el, { position: 'relative', display: 'inline-block' });

      this._trigger = createEl('button', 'ql-dropdown-trigger', this.el);
      setStyles(this._trigger, {
        padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
        background: 'var(--input-bg)', color: 'var(--text)', fontSize: '13px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
      });
      this._updateTrigger();

      this._list = createEl('div', 'ql-dropdown-list', this.el);
      setStyles(this._list, {
        position: 'absolute', top: 'calc(100% + 4px)', left: '0',
        background: 'var(--card-bg)', borderRadius: '10px',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
        minWidth: '100%', display: 'none', zIndex: '20000', overflow: 'hidden'
      });

      this._renderItems();
      this._bindEvents();
    }

    _renderItems() {
      this._list.innerHTML = '';
      this.opts.items.forEach(item => {
        const row = createEl('div', 'ql-dropdown-item', this._list);
        row.textContent = typeof item === 'object' ? item.label : item;
        row.dataset.value = typeof item === 'object' ? item.value : item;
        setStyles(row, {
          padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)'
        });
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(0,0,0,0.04)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
        addEvent(row, 'click', () => {
          this.setValue(row.dataset.value);
          this.close();
          this.emit('select', row.dataset.value);
        });
      });
    }

    _bindEvents() {
      addEvent(this._trigger, 'click', (e) => {
        e.stopPropagation();
        this._open ? this.close() : this.open();
      });
      addEvent(document, 'click', () => this.close());
    }

    _updateTrigger() {
      const item = this.opts.items.find(i => (typeof i === 'object' ? i.value : i) === this.opts.value);
      this._trigger.textContent = item ? (typeof item === 'object' ? item.label : item) : this.opts.placeholder;
      this._trigger.innerHTML += '<span style="margin-left:auto;font-size:10px;">▼</span>';
    }

    open() { this._open = true; this._list.style.display = 'block'; this.emit('open'); }
    close() { this._open = false; this._list.style.display = 'none'; this.emit('close'); }
    setValue(v) { this.opts.value = v; this._updateTrigger(); this.emit('change', v); }
    getValue() { return this.opts.value; }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-dropdown');
    }
  }

  /* ========== 滑块 Slider ========== */
  class Slider extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Slider: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, value: 50, step: 1,
        orientation: 'horizontal', showValue: true
      }, options);
      this._value = clamp(this.opts.value, this.opts.min, this.opts.max);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-slider');
      const isH = this.opts.orientation === 'horizontal';
      setStyles(this.el, {
        display: 'flex', alignItems: 'center', gap: '8px',
        flexDirection: isH ? 'row' : 'column'
      });

      this._track = createEl('div', 'ql-slider-track', this.el);
      setStyles(this._track, {
        position: 'relative',
        width: isH ? '100%' : '4px', height: isH ? '4px' : '120px',
        background: 'rgba(0,0,0,0.06)', borderRadius: '2px',
        cursor: 'pointer', flex: isH ? '1' : 'none'
      });

      this._fill = createEl('div', 'ql-slider-fill', this._track);
      setStyles(this._fill, {
        position: 'absolute', background: 'var(--accent, #5b4dff)', borderRadius: '2px',
        [isH ? 'left' : 'bottom']: '0',
        [isH ? 'top' : 'left']: '0',
        [isH ? 'height' : 'width']: '100%',
        [isH ? 'width' : 'height']: '0%'
      });

      this._thumb = createEl('div', 'ql-slider-thumb', this._track);
      setStyles(this._thumb, {
        position: 'absolute', width: '14px', height: '14px',
        background: '#fff', border: '2px solid var(--accent, #5b4dff)',
        borderRadius: '50%', cursor: 'grab'
      });

      if (this.opts.showValue) {
        this._label = createEl('span', 'ql-slider-value', this.el);
        setStyles(this._label, { fontSize: '12px', color: 'var(--text2)', minWidth: '30px', textAlign: 'center' });
      }

      this._updateUI();
      this._bindEvents();
    }

    _bindEvents() {
      let dragging = false;
      const isH = this.opts.orientation === 'horizontal';
      const onMove = (e) => {
        if (!dragging) return;
        const rect = this._track.getBoundingClientRect();
        const client = isH ? e.clientX : e.clientY;
        const pos = isH
          ? (client - rect.left) / rect.width
          : 1 - (client - rect.top) / rect.height;
        const raw = this.opts.min + clamp(pos, 0, 1) * (this.opts.max - this.opts.min);
        this.setValue(Math.round(raw / this.opts.step) * this.opts.step);
      };
      addEvent(this._track, 'mousedown', () => { dragging = true; });
      addEvent(document, 'mousemove', onMove);
      addEvent(document, 'mouseup', () => { dragging = false; });
    }

    _updateUI() {
      const pct = (this._value - this.opts.min) / (this.opts.max - this.opts.min) * 100;
      const isH = this.opts.orientation === 'horizontal';
      this._fill.style[isH ? 'width' : 'height'] = pct + '%';
      this._thumb.style[isH ? 'left' : 'bottom'] = `calc(${pct}% - 7px)`;
      if (this._label) this._label.textContent = this._value;
    }

    setValue(v) {
      const nv = clamp(v, this.opts.min, this.opts.max);
      if (nv === this._value) return;
      this._value = nv;
      this._updateUI();
      this.emit('change', this._value);
    }

    getValue() { return this._value; }
    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-slider');
    }
  }

  /* ========== 按钮组 ButtonGroup ========== */
  class ButtonGroup extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ButtonGroup: element not found');
      this.opts = Object.assign({
        buttons: [], multi: false, value: null
      }, options);
      this._value = this.opts.value;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-button-group');
      setStyles(this.el, {
        display: 'inline-flex', gap: '0', borderRadius: '8px',
        overflow: 'hidden', border: '1px solid var(--border)'
      });
      this._render();
    }

    _render() {
      this.el.innerHTML = '';
      this.opts.buttons.forEach((btn, i) => {
        const b = createEl('button', 'ql-group-btn', this.el);
        b.textContent = typeof btn === 'object' ? btn.label : btn;
        const val = typeof btn === 'object' ? btn.value : btn;
        b.dataset.value = val;
        const active = this.opts.multi
          ? (Array.isArray(this._value) && this._value.includes(val))
          : this._value === val;
        setStyles(b, {
          padding: '6px 12px', border: 'none', background: active ? 'var(--accent)' : 'var(--input-bg)',
          color: active ? '#fff' : 'var(--text2)', fontSize: '12px', cursor: 'pointer',
          borderRight: i < this.opts.buttons.length - 1 ? '1px solid var(--border)' : 'none'
        });
        addEvent(b, 'click', () => {
          if (this.opts.multi) {
            const arr = Array.isArray(this._value) ? [...this._value] : [];
            const idx = arr.indexOf(val);
            if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
            this.setValue(arr);
          } else {
            this.setValue(val);
          }
          this.emit('change', this._value);
        });
      });
    }

    setValue(v) {
      this._value = v;
      this._render();
    }

    getValue() { return this._value; }
    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-button-group');
    }
  }

  /* ========== 标签面板 TabPanel ========== */
  class TabPanel extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TabPanel: element not found');
      this.opts = Object.assign({ tabs: [], active: 0 }, options);
      this._active = this.opts.active;
      this._init();
    }

    _init() {
      this.el.classList.add('ql-tab-panel');
      setStyles(this.el, { display: 'flex', flexDirection: 'column' });
      this._header = createEl('div', 'ql-tab-header', this.el);
      setStyles(this._header, {
        display: 'flex', gap: '0', borderBottom: '1px solid var(--border)'
      });
      this._body = createEl('div', 'ql-tab-body', this.el);
      setStyles(this._body, { padding: '12px', flex: '1' });
      this._render();
    }

    _render() {
      this._header.innerHTML = '';
      this.opts.tabs.forEach((tab, i) => {
        const btn = createEl('button', 'ql-tab-btn', this._header);
        btn.textContent = typeof tab === 'object' ? tab.label : tab;
        const active = i === this._active;
        setStyles(btn, {
          padding: '10px 16px', border: 'none', background: 'transparent',
          color: active ? 'var(--accent)' : 'var(--text2)',
          borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
          fontSize: '13px', fontWeight: active ? '600' : '400', cursor: 'pointer'
        });
        addEvent(btn, 'click', () => { this.setActive(i); });
      });
      this._body.innerHTML = '';
      const tab = this.opts.tabs[this._active];
      if (tab && tab.content) {
        if (typeof tab.content === 'string') this._body.innerHTML = tab.content;
        else this._body.appendChild(tab.content);
      }
    }

    setActive(i) {
      this._active = i;
      this._render();
      this.emit('change', i);
    }

    getActive() { return this._active; }
    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-tab-panel');
    }
  }

  /* ========== 树形视图 TreeView ========== */
  class TreeView extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TreeView: element not found');
      this.opts = Object.assign({
        data: [], selectable: true, multiSelect: false
      }, options);
      this._selected = new Set();
      this._init();
    }

    _init() {
      this.el.classList.add('ql-tree-view');
      setStyles(this.el, {
        fontSize: '13px', color: 'var(--text)', overflow: 'auto'
      });
      this._render();
    }

    _render() {
      this.el.innerHTML = '';
      this.opts.data.forEach(node => this._renderNode(node, this.el, 0));
    }

    _renderNode(node, parent, depth) {
      const row = createEl('div', 'ql-tree-node', parent);
      setStyles(row, {
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px', paddingLeft: px(8 + depth * 16),
        cursor: 'pointer', borderRadius: '6px'
      });
      const hasChildren = node.children && node.children.length;
      const expander = createEl('span', 'ql-tree-expander', row);
      expander.textContent = hasChildren ? (node.expanded ? '▼' : '▶') : ' ';
      setStyles(expander, { width: '14px', fontSize: '10px', color: 'var(--text3)', textAlign: 'center' });

      const icon = createEl('span', 'ql-tree-icon', row);
      icon.textContent = node.icon || (hasChildren ? '📁' : '📄');
      setStyles(icon, { fontSize: '14px' });

      const label = createEl('span', 'ql-tree-label', row);
      label.textContent = node.label;
      setStyles(label, { flex: '1' });

      if (this._selected.has(node.id)) {
        row.style.background = 'rgba(91,77,255,0.08)';
        row.style.color = 'var(--accent)';
      }

      addEvent(row, 'click', (e) => {
        e.stopPropagation();
        if (hasChildren && e.target === expander) {
          node.expanded = !node.expanded;
          this._render();
        } else {
          this._select(node.id);
          this.emit('select', node);
        }
      });

      if (hasChildren && node.expanded) {
        node.children.forEach(child => this._renderNode(child, parent, depth + 1));
      }
    }

    _select(id) {
      if (!this.opts.selectable) return;
      if (!this.opts.multiSelect) this._selected.clear();
      if (this._selected.has(id)) this._selected.delete(id);
      else this._selected.add(id);
      this._render();
    }

    setData(data) { this.opts.data = data; this._render(); }
    getSelected() { return Array.from(this._selected); }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-tree-view');
    }
  }

  /* ========== 颜色选择器 ColorPicker ========== */
  class ColorPicker extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ColorPicker: element not found');
      this.opts = Object.assign({
        value: '#5b4dff', showInput: true, showPalette: true
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-color-picker');
      setStyles(this.el, { display: 'flex', alignItems: 'center', gap: '8px' });

      this._preview = createEl('div', 'ql-color-preview', this.el);
      setStyles(this._preview, {
        width: '28px', height: '28px', borderRadius: '6px',
        background: this.opts.value, cursor: 'pointer',
        border: '1px solid var(--border)'
      });

      if (this.opts.showInput) {
        this._input = createEl('input', 'ql-color-input', this.el);
        this._input.type = 'text';
        this._input.value = this.opts.value;
        setStyles(this._input, {
          width: '80px', padding: '4px 8px', borderRadius: '6px',
          border: '1px solid var(--border)', background: 'var(--input-bg)',
          color: 'var(--text)', fontSize: '12px'
        });
        addEvent(this._input, 'change', () => this.setValue(this._input.value));
      }

      if (this.opts.showPalette) {
        this._palette = createEl('div', 'ql-color-palette', this.el);
        setStyles(this._palette, { display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '120px' });
        ['#ef4444','#f59e0b','#4ade80','#3b82f6','#8b5cf6','#ec4899','#1a1a1a','#fff'].forEach(c => {
          const swatch = createEl('div', null, this._palette);
          setStyles(swatch, {
            width: '16px', height: '16px', borderRadius: '4px',
            background: c, cursor: 'pointer', border: '1px solid var(--border)'
          });
          addEvent(swatch, 'click', () => this.setValue(c));
        });
      }

      addEvent(this._preview, 'click', () => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.opts.value;
        input.addEventListener('input', (e) => this.setValue(e.target.value));
        input.click();
      });
    }

    setValue(v) {
      this.opts.value = v;
      this._preview.style.background = v;
      if (this._input) this._input.value = v;
      this.emit('change', v);
    }

    getValue() { return this.opts.value; }
    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-color-picker');
    }
  }

  /* ========== 进度条 ProgressBar ========== */
  class ProgressBar extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ProgressBar: element not found');
      this.opts = Object.assign({
        value: 0, max: 100, height: 6, color: null, animated: false
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-progress-bar');
      setStyles(this.el, {
        width: '100%', height: px(this.opts.height),
        background: 'rgba(0,0,0,0.06)', borderRadius: px(this.opts.height / 2),
        overflow: 'hidden'
      });
      this._fill = createEl('div', 'ql-progress-fill', this.el);
      setStyles(this._fill, {
        height: '100%', width: '0%',
        background: this.opts.color || 'var(--accent, #5b4dff)',
        borderRadius: px(this.opts.height / 2),
        transition: this.opts.animated ? 'width 0.3s ease' : 'none'
      });
      this.setValue(this.opts.value);
    }

    setValue(v) {
      const pct = clamp(v / this.opts.max * 100, 0, 100);
      this._fill.style.width = pct + '%';
      this.emit('change', v);
    }

    setColor(c) { this._fill.style.background = c; }
    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-progress-bar');
    }
  }

  /* ========== 加载动画 LoadingSpinner ========== */
  class LoadingSpinner extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) {
        this.el = document.createElement('div');
        document.body.appendChild(this.el);
      }
      this.opts = Object.assign({
        size: 40, color: null, thickness: 3, text: ''
      }, options);
      this._init();
    }

    _init() {
      this.el.classList.add('ql-loading-spinner');
      setStyles(this.el, {
        display: 'none', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '8px'
      });
      this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this._svg.setAttribute('width', this.opts.size);
      this._svg.setAttribute('height', this.opts.size);
      this._svg.setAttribute('viewBox', '0 0 50 50');
      this._circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this._circle.setAttribute('cx', '25');
      this._circle.setAttribute('cy', '25');
      this._circle.setAttribute('r', '20');
      this._circle.setAttribute('fill', 'none');
      this._circle.setAttribute('stroke', this.opts.color || 'var(--accent, #5b4dff)');
      this._circle.setAttribute('stroke-width', this.opts.thickness);
      this._circle.setAttribute('stroke-linecap', 'round');
      this._circle.setAttribute('stroke-dasharray', '80');
      this._circle.setAttribute('stroke-dashoffset', '0');
      this._circle.style.animation = 'ql-spin 1s linear infinite';
      this._svg.appendChild(this._circle);
      this.el.appendChild(this._svg);

      if (this.opts.text) {
        this._text = createEl('span', null, this.el);
        this._text.textContent = this.opts.text;
        setStyles(this._text, { fontSize: '12px', color: 'var(--text2)' });
      }
    }

    show() { this.el.style.display = 'flex'; this.emit('show'); }
    hide() { this.el.style.display = 'none'; this.emit('hide'); }

    getElement() { return this.el; }
    destroy() {
      this.el.innerHTML = '';
      this.el.classList.remove('ql-loading-spinner');
    }
  }

  // 导出所有组件
  return {
    EventEmitter,
    Knob, Fader, Meter, Scope, Spectrum,
    PianoKeyboard, TransportBar, Timeline, Clip, TrackHeader,
    MixerChannel, EQDisplay, CompressorGraph,
    WaveformDisplay, SpectrumAnalyzer, LFOVisualizer, ADSRVisualizer,
    ModalDialog, ToastNotification, ContextMenu, Tooltip,
    Dropdown, Slider, ButtonGroup, TabPanel, TreeView,
    ColorPicker, ProgressBar, LoadingSpinner,
    themes, setTheme(name) { currentTheme = name; document.documentElement.dataset.qlTheme = name; }
  };
})();

/* ================= CSS 动画关键帧 ================= */
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ql-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes ql-toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ql-toast-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-8px); } }
    .ql-knob:active .ql-knob-label { color: var(--accent); }
    .ql-fader-thumb:active { transform: scale(1.1); }
    .ql-meter-segments > div { transition: background 0.05s; }
    .ql-piano-white-key:active, .ql-piano-black-key:active { transform: translateY(2px); }
    .ql-transport-btn.active { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
    .ql-clip.selected { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--accent); }
    .ql-modal-content { animation: ql-toast-in 0.2s ease; }
    .ql-dropdown-list { animation: ql-toast-in 0.15s ease; }
    .ql-context-menu { animation: ql-toast-in 0.1s ease; }
    .ql-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }
    .ql-group-btn:hover { background: rgba(0,0,0,0.04); }
    .ql-tree-node:hover { background: rgba(0,0,0,0.03); }
    .ql-tab-btn:hover { color: var(--accent); }
  `;
  document.head.appendChild(style);
})();

console.log('[青鸾 UI] 组件系统已加载 v3.0');

/* ================= 追加组件 v3.1 ================= */
(function(QI) {
  'use strict';

  // 局部工具
  function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function _px(n) { return n + 'px'; }
  function _createEl(tag, cls, parent) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }
  function _setStyles(el, styles) { Object.assign(el.style, styles); }

  /* ========== 1. 滑块控件系列 ========== */

  class VerticalSlider {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('VerticalSlider: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, value: 50, step: 1,
        width: 32, height: 160, showTicks: true, tickCount: 10,
        color: 'var(--accent, #5b4dff)', bg: 'rgba(0,0,0,0.08)'
      }, options);
      this._value = _clamp(this.opts.value, this.opts.min, this.opts.max);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-vslider');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), userSelect: 'none', touchAction: 'none' });
      this._track = _createEl('div', 'ql-vslider-track', this.el);
      _setStyles(this._track, { position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '0', width: '4px', height: '100%', background: this.opts.bg, borderRadius: '2px' });
      this._fill = _createEl('div', 'ql-vslider-fill', this.el);
      _setStyles(this._fill, { position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '0', width: '4px', background: this.opts.color, borderRadius: '2px' });
      this._thumb = _createEl('div', 'ql-vslider-thumb', this.el);
      _setStyles(this._thumb, { position: 'absolute', left: '50%', transform: 'translate(-50%, 50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', border: `2px solid ${this.opts.color}`, cursor: 'ns-resize', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' });
      if (this.opts.showTicks) this._drawTicks();
      this._updateUI();
      this._bindEvents();
    }
    _drawTicks() {
      const cnt = this.opts.tickCount;
      for (let i = 0; i <= cnt; i++) {
        const tick = _createEl('div', null, this.el);
        const y = (i / cnt) * this.opts.height;
        _setStyles(tick, { position: 'absolute', right: '0', bottom: _px(y), width: '6px', height: '1px', background: 'rgba(0,0,0,0.15)' });
      }
    }
    _updateUI() {
      const t = (this._value - this.opts.min) / (this.opts.max - this.opts.min);
      const h = t * this.opts.height;
      this._fill.style.height = _px(h);
      this._thumb.style.bottom = _px(h);
    }
    _bindEvents() {
      const start = (e) => { this._dragging = true; this._move(e); document.body.style.cursor = 'ns-resize'; };
      const move = (e) => { if (!this._dragging) return; this._move(e); };
      const end = () => { this._dragging = false; document.body.style.cursor = ''; };
      this._thumb.addEventListener('mousedown', start);
      this._track.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      this._thumb.addEventListener('touchstart', (e) => { start(e.touches[0]); }, { passive: false });
      window.addEventListener('touchmove', (e) => { if (this._dragging) { e.preventDefault(); move(e.touches[0]); } }, { passive: false });
      window.addEventListener('touchend', end);
    }
    _move(e) {
      const rect = this.el.getBoundingClientRect();
      const y = rect.bottom - e.clientY;
      const t = _clamp(y / this.opts.height, 0, 1);
      const v = this.opts.min + t * (this.opts.max - this.opts.min);
      this.setValue(Math.round(v / this.opts.step) * this.opts.step);
    }
    setValue(v) {
      v = _clamp(v, this.opts.min, this.opts.max);
      if (v === this._value) return;
      this._value = v;
      this._updateUI();
      this._callbacks.forEach(fn => fn(v));
    }
    getValue() { return this._value; }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class HorizontalSlider {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('HorizontalSlider: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, value: 50, step: 1,
        width: 200, height: 24, showTicks: true, tickCount: 10,
        color: 'var(--accent, #5b4dff)', bg: 'rgba(0,0,0,0.08)'
      }, options);
      this._value = _clamp(this.opts.value, this.opts.min, this.opts.max);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-hslider');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), userSelect: 'none', touchAction: 'none' });
      this._track = _createEl('div', 'ql-hslider-track', this.el);
      _setStyles(this._track, { position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0', width: '100%', height: '4px', background: this.opts.bg, borderRadius: '2px' });
      this._fill = _createEl('div', 'ql-hslider-fill', this.el);
      _setStyles(this._fill, { position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0', height: '4px', background: this.opts.color, borderRadius: '2px' });
      this._thumb = _createEl('div', 'ql-hslider-thumb', this.el);
      _setStyles(this._thumb, { position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', border: `2px solid ${this.opts.color}`, cursor: 'ew-resize', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' });
      if (this.opts.showTicks) this._drawTicks();
      this._updateUI();
      this._bindEvents();
    }
    _drawTicks() {
      const cnt = this.opts.tickCount;
      for (let i = 0; i <= cnt; i++) {
        const tick = _createEl('div', null, this.el);
        const x = (i / cnt) * this.opts.width;
        _setStyles(tick, { position: 'absolute', left: _px(x), top: '0', width: '1px', height: '6px', background: 'rgba(0,0,0,0.15)' });
      }
    }
    _updateUI() {
      const t = (this._value - this.opts.min) / (this.opts.max - this.opts.min);
      const w = t * this.opts.width;
      this._fill.style.width = _px(w);
      this._thumb.style.left = _px(w);
    }
    _bindEvents() {
      const start = (e) => { this._dragging = true; this._move(e); document.body.style.cursor = 'ew-resize'; };
      const move = (e) => { if (!this._dragging) return; this._move(e); };
      const end = () => { this._dragging = false; document.body.style.cursor = ''; };
      this._thumb.addEventListener('mousedown', start);
      this._track.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      this._thumb.addEventListener('touchstart', (e) => { start(e.touches[0]); }, { passive: false });
      window.addEventListener('touchmove', (e) => { if (this._dragging) { e.preventDefault(); move(e.touches[0]); } }, { passive: false });
      window.addEventListener('touchend', end);
    }
    _move(e) {
      const rect = this.el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = _clamp(x / this.opts.width, 0, 1);
      const v = this.opts.min + t * (this.opts.max - this.opts.min);
      this.setValue(Math.round(v / this.opts.step) * this.opts.step);
    }
    setValue(v) {
      v = _clamp(v, this.opts.min, this.opts.max);
      if (v === this._value) return;
      this._value = v;
      this._updateUI();
      this._callbacks.forEach(fn => fn(v));
    }
    getValue() { return this._value; }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class RangeSlider {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('RangeSlider: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, low: 20, high: 70, step: 1,
        width: 240, height: 24, color: 'var(--accent, #5b4dff)', bg: 'rgba(0,0,0,0.08)'
      }, options);
      this._low = _clamp(this.opts.low, this.opts.min, this.opts.max);
      this._high = _clamp(this.opts.high, this.opts.min, this.opts.max);
      this._callbacks = [];
      this._activeThumb = null;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-range-slider');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), userSelect: 'none', touchAction: 'none' });
      this._track = _createEl('div', 'ql-range-track', this.el);
      _setStyles(this._track, { position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0', width: '100%', height: '4px', background: this.opts.bg, borderRadius: '2px' });
      this._fill = _createEl('div', 'ql-range-fill', this.el);
      _setStyles(this._fill, { position: 'absolute', top: '50%', transform: 'translateY(-50%)', height: '4px', background: this.opts.color, borderRadius: '2px', opacity: '0.5' });
      this._thumbLow = _createEl('div', 'ql-range-thumb-low', this.el);
      _setStyles(this._thumbLow, { position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', border: `2px solid ${this.opts.color}`, cursor: 'ew-resize', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: '2' });
      this._thumbHigh = _createEl('div', 'ql-range-thumb-high', this.el);
      _setStyles(this._thumbHigh, { position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', border: `2px solid ${this.opts.color}`, cursor: 'ew-resize', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: '2' });
      this._updateUI();
      this._bindEvents();
    }
    _updateUI() {
      const t1 = (this._low - this.opts.min) / (this.opts.max - this.opts.min);
      const t2 = (this._high - this.opts.min) / (this.opts.max - this.opts.min);
      const x1 = t1 * this.opts.width;
      const x2 = t2 * this.opts.width;
      this._thumbLow.style.left = _px(x1);
      this._thumbHigh.style.left = _px(x2);
      this._fill.style.left = _px(x1);
      this._fill.style.width = _px(x2 - x1);
    }
    _bindEvents() {
      const startLow = (e) => { this._dragging = true; this._activeThumb = 'low'; this._move(e); document.body.style.cursor = 'ew-resize'; };
      const startHigh = (e) => { this._dragging = true; this._activeThumb = 'high'; this._move(e); document.body.style.cursor = 'ew-resize'; };
      const move = (e) => { if (!this._dragging) return; this._move(e); };
      const end = () => { this._dragging = false; this._activeThumb = null; document.body.style.cursor = ''; };
      this._thumbLow.addEventListener('mousedown', startLow);
      this._thumbHigh.addEventListener('mousedown', startHigh);
      this._track.addEventListener('mousedown', (e) => {
        const rect = this.el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const t = _clamp(x / this.opts.width, 0, 1);
        const v = this.opts.min + t * (this.opts.max - this.opts.min);
        const distLow = Math.abs(v - this._low);
        const distHigh = Math.abs(v - this._high);
        if (distLow < distHigh) startLow(e); else startHigh(e);
      });
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      this._thumbLow.addEventListener('touchstart', (e) => { startLow(e.touches[0]); }, { passive: false });
      this._thumbHigh.addEventListener('touchstart', (e) => { startHigh(e.touches[0]); }, { passive: false });
      window.addEventListener('touchmove', (e) => { if (this._dragging) { e.preventDefault(); move(e.touches[0]); } }, { passive: false });
      window.addEventListener('touchend', end);
    }
    _move(e) {
      const rect = this.el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = _clamp(x / this.opts.width, 0, 1);
      const v = Math.round((this.opts.min + t * (this.opts.max - this.opts.min)) / this.opts.step) * this.opts.step;
      if (this._activeThumb === 'low') {
        this._low = _clamp(v, this.opts.min, this._high);
      } else {
        this._high = _clamp(v, this._low, this.opts.max);
      }
      this._updateUI();
      this._callbacks.forEach(fn => fn({ low: this._low, high: this._high }));
    }
    setValues(low, high) {
      this._low = _clamp(low, this.opts.min, this.opts.max);
      this._high = _clamp(high, this.opts.min, this.opts.max);
      if (this._low > this._high) { const tmp = this._low; this._low = this._high; this._high = tmp; }
      this._updateUI();
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 2. 频谱可视化组件 ========== */
  class SpectrumVisualizer {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SpectrumVisualizer: element not found');
      this.opts = Object.assign({
        fftSize: 256, barCount: 64, barGap: 2,
        colorStart: '#5b4dff', colorEnd: '#ff2a6d',
        smoothing: 0.8, height: 120
      }, options);
      this._data = new Uint8Array(this.opts.barCount);
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-spectrum-viz');
      _setStyles(this.el, { position: 'relative', width: '100%', height: _px(this.opts.height), overflow: 'hidden' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.el.clientWidth || 400;
      this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { width: '100%', height: '100%', display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._grad = this._ctx.createLinearGradient(0, this.opts.height, 0, 0);
      this._grad.addColorStop(0, this.opts.colorStart);
      this._grad.addColorStop(1, this.opts.colorEnd);
      this._resizeObserver = new ResizeObserver(() => {
        this._canvas.width = this.el.clientWidth;
        this._canvas.height = this.opts.height;
        this._grad = this._ctx.createLinearGradient(0, this.opts.height, 0, 0);
        this._grad.addColorStop(0, this.opts.colorStart);
        this._grad.addColorStop(1, this.opts.colorEnd);
      });
      this._resizeObserver.observe(this.el);
    }
    setData(uint8Array) {
      if (!uint8Array || uint8Array.length === 0) return;
      const step = uint8Array.length / this.opts.barCount;
      for (let i = 0; i < this.opts.barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += uint8Array[Math.floor(i * step + j)];
        this._data[i] = this._data[i] * this.opts.smoothing + (sum / step) * (1 - this.opts.smoothing);
      }
      if (!this._running) { this._running = true; this._draw(); }
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barW = (w - (this.opts.barCount - 1) * this.opts.barGap) / this.opts.barCount;
      for (let i = 0; i < this.opts.barCount; i++) {
        const val = this._data[i] / 255;
        const bh = val * h;
        const x = i * (barW + this.opts.barGap);
        const y = h - bh;
        ctx.fillStyle = this._grad;
        ctx.fillRect(x, y, barW, bh);
      }
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; if (this._resizeObserver) this._resizeObserver.disconnect(); this.el.innerHTML = ''; }
  }

  /* ========== 3. 波形显示组件 ========== */
  class WaveformCanvas {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('WaveformCanvas: element not found');
      this.opts = Object.assign({
        color: 'var(--accent, #5b4dff)', lineWidth: 2,
        fillAlpha: 0.15, height: 120, grid: true
      }, options);
      this._samples = new Float32Array(0);
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-waveform-canvas');
      _setStyles(this.el, { position: 'relative', width: '100%', height: _px(this.opts.height), overflow: 'hidden' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.el.clientWidth || 400;
      this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { width: '100%', height: '100%', display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._resizeObserver = new ResizeObserver(() => {
        this._canvas.width = this.el.clientWidth;
        this._canvas.height = this.opts.height;
      });
      this._resizeObserver.observe(this.el);
    }
    setSamples(floatArray) {
      if (!floatArray) return;
      this._samples = floatArray.slice(0);
      if (!this._running) { this._running = true; this._draw(); }
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (this.opts.grid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.stroke();
      }
      const len = this._samples.length;
      if (len === 0) { requestAnimationFrame(() => this._draw()); return; }
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = this.opts.lineWidth;
      ctx.beginPath();
      const step = len / w;
      for (let x = 0; x < w; x++) {
        const idx = Math.floor(x * step);
        const y = (1 - this._samples[idx]) * (h / 2);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = this.opts.color;
      ctx.globalAlpha = this.opts.fillAlpha;
      ctx.lineTo(w, h / 2);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; if (this._resizeObserver) this._resizeObserver.disconnect(); this.el.innerHTML = ''; }
  }

  /* ========== 4. SVG 旋钮控件 ========== */
  class RotaryKnobSVG {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('RotaryKnobSVG: element not found');
      this.opts = Object.assign({
        min: 0, max: 100, value: 50, step: 1, size: 60,
        startAngle: -135, endAngle: 135, color: 'var(--accent, #5b4dff)'
      }, options);
      this._value = _clamp(this.opts.value, this.opts.min, this.opts.max);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-rotary-knob');
      _setStyles(this.el, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize', userSelect: 'none', touchAction: 'none', width: _px(this.opts.size), height: _px(this.opts.size) });
      const ns = 'http://www.w3.org/2000/svg';
      this._svg = document.createElementNS(ns, 'svg');
      this._svg.setAttribute('width', this.opts.size);
      this._svg.setAttribute('height', this.opts.size);
      this._svg.setAttribute('viewBox', '0 0 100 100');
      const bgArc = document.createElementNS(ns, 'circle');
      bgArc.setAttribute('cx', '50'); bgArc.setAttribute('cy', '50'); bgArc.setAttribute('r', '40');
      bgArc.setAttribute('fill', 'none'); bgArc.setAttribute('stroke', 'rgba(0,0,0,0.08)'); bgArc.setAttribute('stroke-width', '8');
      this._svg.appendChild(bgArc);
      this._arc = document.createElementNS(ns, 'path');
      this._arc.setAttribute('fill', 'none');
      this._arc.setAttribute('stroke', this.opts.color);
      this._arc.setAttribute('stroke-width', '8');
      this._arc.setAttribute('stroke-linecap', 'round');
      this._svg.appendChild(this._arc);
      this._needle = document.createElementNS(ns, 'line');
      this._needle.setAttribute('x1', '50'); this._needle.setAttribute('y1', '50');
      this._needle.setAttribute('x2', '50'); this._needle.setAttribute('y2', '18');
      this._needle.setAttribute('stroke', this.opts.color);
      this._needle.setAttribute('stroke-width', '3');
      this._needle.setAttribute('stroke-linecap', 'round');
      this._svg.appendChild(this._needle);
      this.el.appendChild(this._svg);
      this._updateUI();
      this._bindEvents();
    }
    _valueToAngle(v) {
      const t = (v - this.opts.min) / (this.opts.max - this.opts.min);
      return this.opts.startAngle + t * (this.opts.endAngle - this.opts.startAngle);
    }
    _updateUI() {
      const angle = this._valueToAngle(this._value);
      const rad = (angle - 90) * Math.PI / 180;
      const x2 = 50 + 40 * Math.cos(rad);
      const y2 = 50 + 40 * Math.sin(rad);
      this._needle.setAttribute('x2', x2);
      this._needle.setAttribute('y2', y2);
      const startRad = (this.opts.startAngle - 90) * Math.PI / 180;
      const endRad = (angle - 90) * Math.PI / 180;
      const largeArc = angle - this.opts.startAngle > 180 ? 1 : 0;
      const sx = 50 + 40 * Math.cos(startRad);
      const sy = 50 + 40 * Math.sin(startRad);
      const ex = 50 + 40 * Math.cos(endRad);
      const ey = 50 + 40 * Math.sin(endRad);
      this._arc.setAttribute('d', `M ${sx} ${sy} A 40 40 0 ${largeArc} 1 ${ex} ${ey}`);
    }
    _bindEvents() {
      let startY = 0, startVal = 0;
      const start = (e) => {
        this._dragging = true;
        startY = e.clientY || e.touches[0].clientY;
        startVal = this._value;
        document.body.style.cursor = 'ns-resize';
      };
      const move = (e) => {
        if (!this._dragging) return;
        const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        const range = this.opts.max - this.opts.min;
        const delta = (startY - y) / 150 * range;
        this.setValue(Math.round((startVal + delta) / this.opts.step) * this.opts.step);
      };
      const end = () => { this._dragging = false; document.body.style.cursor = ''; };
      this.el.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      this.el.addEventListener('touchstart', (e) => start(e.touches[0]), { passive: false });
      window.addEventListener('touchmove', (e) => { if (this._dragging) move(e.touches[0]); }, { passive: false });
      window.addEventListener('touchend', end);
    }
    setValue(v) {
      v = _clamp(v, this.opts.min, this.opts.max);
      if (v === this._value) return;
      this._value = v;
      this._updateUI();
      this._callbacks.forEach(fn => fn(v));
    }
    getValue() { return this._value; }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 5. 步进音序器网格 ========== */
  class StepSequencer {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('StepSequencer: element not found');
      this.opts = Object.assign({
        steps: 16, rows: 8, cellSize: 24, gap: 4,
        on: 'var(--accent, #5b4dff)', off: 'rgba(0,0,0,0.06)',
        activeStepColor: '#ff2a6d'
      }, options);
      this._grid = Array.from({ length: this.opts.rows }, () => Array(this.opts.steps).fill(false));
      this._callbacks = [];
      this._currentStep = 0;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-step-sequencer');
      const totalW = this.opts.steps * (this.opts.cellSize + this.opts.gap) - this.opts.gap;
      const totalH = this.opts.rows * (this.opts.cellSize + this.opts.gap) - this.opts.gap;
      _setStyles(this.el, { display: 'inline-grid', gridTemplateColumns: `repeat(${this.opts.steps}, ${_px(this.opts.cellSize)})`, gap: _px(this.opts.gap), userSelect: 'none' });
      for (let r = 0; r < this.opts.rows; r++) {
        for (let c = 0; c < this.opts.steps; c++) {
          const cell = _createEl('div', 'ql-seq-cell', this.el);
          _setStyles(cell, { width: _px(this.opts.cellSize), height: _px(this.opts.cellSize), background: this.opts.off, borderRadius: '4px', cursor: 'pointer', transition: 'background 0.1s' });
          cell.dataset.row = r;
          cell.dataset.col = c;
          cell.addEventListener('click', () => {
            this._grid[r][c] = !this._grid[r][c];
            cell.style.background = this._grid[r][c] ? this.opts.on : this.opts.off;
            this._callbacks.forEach(fn => fn({ row: r, col: c, on: this._grid[r][c], grid: this._grid.map(row => row.slice()) }));
          });
        }
      }
    }
    setStep(stepIndex) {
      this._currentStep = stepIndex % this.opts.steps;
      const cells = this.el.querySelectorAll('.ql-seq-cell');
      cells.forEach((cell, idx) => {
        const col = idx % this.opts.steps;
        const row = Math.floor(idx / this.opts.steps);
        const isActiveStep = col === this._currentStep;
        if (isActiveStep) {
          cell.style.boxShadow = `inset 0 0 0 2px ${this.opts.activeStepColor}`;
        } else {
          cell.style.boxShadow = '';
        }
        cell.style.background = this._grid[row][col] ? this.opts.on : this.opts.off;
      });
      const activeNotes = [];
      for (let r = 0; r < this.opts.rows; r++) if (this._grid[r][this._currentStep]) activeNotes.push(r);
      return activeNotes;
    }
    clear() {
      this._grid = Array.from({ length: this.opts.rows }, () => Array(this.opts.steps).fill(false));
      this.setStep(this._currentStep);
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 6. 钢琴卷帘迷你视图 ========== */
  class PianoRollMini {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PianoRollMini: element not found');
      this.opts = Object.assign({
        width: 600, height: 200, keys: 24, steps: 32,
        noteColor: 'var(--accent, #5b4dff)', gridColor: 'rgba(0,0,0,0.06)'
      }, options);
      this._notes = [];
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-piano-roll-mini');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), overflow: 'auto', userSelect: 'none' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width;
      this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._drawGrid();
      this._canvas.addEventListener('mousedown', (e) => this._onMouse(e, 'down'));
      this._canvas.addEventListener('mousemove', (e) => this._onMouse(e, 'move'));
      this._canvas.addEventListener('mouseup', () => this._dragging = false);
    }
    _drawGrid() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const keyH = h / this.opts.keys;
      const stepW = w / this.opts.steps;
      ctx.strokeStyle = this.opts.gridColor;
      ctx.lineWidth = 1;
      for (let i = 0; i <= this.opts.keys; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * keyH); ctx.lineTo(w, i * keyH); ctx.stroke();
      }
      for (let i = 0; i <= this.opts.steps; i++) {
        ctx.beginPath(); ctx.moveTo(i * stepW, 0); ctx.lineTo(i * stepW, h); ctx.stroke();
      }
      for (const note of this._notes) {
        ctx.fillStyle = this.opts.noteColor;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(note.start * stepW, (this.opts.keys - 1 - note.key) * keyH, note.length * stepW - 1, keyH - 1);
        ctx.globalAlpha = 1;
      }
    }
    _onMouse(e, type) {
      const rect = this._canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const key = this.opts.keys - 1 - Math.floor(y / (this._canvas.height / this.opts.keys));
      const step = Math.floor(x / (this._canvas.width / this.opts.steps));
      if (type === 'down') {
        this._dragging = true;
        const idx = this._notes.findIndex(n => n.key === key && step >= n.start && step < n.start + n.length);
        if (idx >= 0) this._notes.splice(idx, 1); else this._notes.push({ key, start: step, length: 1 });
        this._drawGrid();
        this._callbacks.forEach(fn => fn({ notes: this._notes.slice() }));
      }
    }
    setNotes(notes) { this._notes = notes.slice(); this._drawGrid(); }
    getNotes() { return this._notes.slice(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 7. 混音器推子组 ========== */
  class MixerFaderGroup {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MixerFaderGroup: element not found');
      this.opts = Object.assign({ channels: 8, faderHeight: 160, color: 'var(--accent, #5b4dff)' }, options);
      this._faders = [];
      this._meters = [];
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-mixer-group');
      _setStyles(this.el, { display: 'flex', gap: '12px', padding: '8px', overflowX: 'auto' });
      for (let i = 0; i < this.opts.channels; i++) {
        const col = _createEl('div', 'ql-mixer-channel', this.el);
        _setStyles(col, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '40px' });
        const label = _createEl('span', null, col);
        label.textContent = 'CH' + (i + 1);
        _setStyles(label, { fontSize: '10px', color: '#888' });
        const meterWrap = _createEl('div', null, col);
        _setStyles(meterWrap, { width: '6px', height: _px(this.opts.faderHeight), background: 'rgba(0,0,0,0.08)', borderRadius: '3px', position: 'relative', overflow: 'hidden' });
        const meterFill = _createEl('div', null, meterWrap);
        _setStyles(meterFill, { position: 'absolute', bottom: '0', left: '0', width: '100%', height: '0%', background: '#4caf50', borderRadius: '3px', transition: 'height 0.05s' });
        this._meters.push(meterFill);
        const fader = new VerticalSlider(_createEl('div', null, col), {
          min: -60, max: 12, value: 0, step: 0.5, height: this.opts.faderHeight, width: 28, showTicks: false, color: this.opts.color
        });
        this._faders.push(fader);
        fader.onChange((v) => {
          this._callbacks.forEach(fn => fn({ channel: i, value: v, type: 'fader' }));
        });
        const muteBtn = _createEl('button', null, col);
        muteBtn.textContent = 'M';
        _setStyles(muteBtn, { width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: '10px' });
        muteBtn.addEventListener('click', () => {
          const active = muteBtn.dataset.muted === '1';
          muteBtn.dataset.muted = active ? '0' : '1';
          muteBtn.style.background = active ? 'rgba(0,0,0,0.06)' : '#ff5252';
          muteBtn.style.color = active ? '' : '#fff';
          this._callbacks.forEach(fn => fn({ channel: i, muted: !active, type: 'mute' }));
        });
      }
    }
    setMeter(channel, db) {
      if (channel < 0 || channel >= this.opts.channels) return;
      const pct = Math.min(100, Math.max(0, (db + 60) / 72 * 100));
      const fill = this._meters[channel];
      fill.style.height = pct + '%';
      fill.style.background = pct > 85 ? '#ff5252' : pct > 70 ? '#ffc107' : '#4caf50';
    }
    setFaderValue(channel, value) {
      if (this._faders[channel]) this._faders[channel].setValue(value);
    }
    onEvent(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 8. 表情包/贴纸选择器 ========== */
  class EmojiStickerPicker {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('EmojiStickerPicker: element not found');
      this.opts = Object.assign({
        emojis: ['🎹','🎸','🎷','🎺','🥁','🎻','🎤','🎧','🎼','🎵','🎶','🎬','🎮','🎲','🎯','🎪','🎨','🎭','🔥','✨','💫','⭐','🌟','💥','💢','💦','💨','🕊️','🌈','☀️','🌙','⚡','❤️','💔','💖','💙','💚','💜','🖤','🤍'], columns: 8
      }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-emoji-picker');
      _setStyles(this.el, { display: 'grid', gridTemplateColumns: `repeat(${this.opts.columns}, 1fr)`, gap: '4px', padding: '8px', maxWidth: '280px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' });
      this.opts.emojis.forEach(emoji => {
        const btn = _createEl('button', 'ql-emoji-btn', this.el);
        btn.textContent = emoji;
        _setStyles(btn, { fontSize: '22px', padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', transition: 'transform 0.1s, background 0.1s' });
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(0,0,0,0.05)'; btn.style.transform = 'scale(1.15)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.transform = 'scale(1)'; });
        btn.addEventListener('click', () => {
          this._callbacks.forEach(fn => fn(emoji));
        });
      });
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 9. Canvas 颜色拾取器 ========== */
  class ColorPickerCanvas {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ColorPickerCanvas: element not found');
      this.opts = Object.assign({ width: 220, height: 160, wheelSize: 120 }, options);
      this._callbacks = [];
      this._hue = 0; this._sat = 1; this._light = 0.5;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-color-picker-canvas');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', userSelect: 'none' });
      const wrap = _createEl('div', null, this.el);
      _setStyles(wrap, { position: 'relative', width: _px(this.opts.wheelSize), height: _px(this.opts.wheelSize) });
      this._wheel = _createEl('canvas', null, wrap);
      this._wheel.width = this.opts.wheelSize; this._wheel.height = this.opts.wheelSize;
      _setStyles(this._wheel, { borderRadius: '50%', cursor: 'crosshair' });
      this._drawWheel();
      this._thumb = _createEl('div', null, wrap);
      _setStyles(this._thumb, { position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 2px rgba(0,0,0,0.5)', pointerEvents: 'none', transform: 'translate(-50%, -50%)' });
      this._updateThumb();
      this._lightSlider = _createEl('input', null, this.el);
      this._lightSlider.type = 'range'; this._lightSlider.min = '0'; this._lightSlider.max = '100';
      this._lightSlider.value = '50';
      _setStyles(this._lightSlider, { width: _px(this.opts.wheelSize) });
      this._preview = _createEl('div', null, this.el);
      _setStyles(this._preview, { width: _px(this.opts.wheelSize), height: '24px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)' });
      this._updatePreview();
      this._wheel.addEventListener('mousedown', (e) => { this._dragging = true; this._pick(e); });
      window.addEventListener('mousemove', (e) => { if (this._dragging) this._pick(e); });
      window.addEventListener('mouseup', () => this._dragging = false);
      this._lightSlider.addEventListener('input', () => {
        this._light = parseInt(this._lightSlider.value) / 100;
        this._updatePreview();
        this._callbacks.forEach(fn => fn(this.getColor()));
      });
    }
    _drawWheel() {
      const ctx = this._wheel.getContext('2d');
      const r = this._wheel.width / 2;
      const img = ctx.createImageData(this._wheel.width, this._wheel.height);
      for (let y = 0; y < this._wheel.height; y++) {
        for (let x = 0; x < this._wheel.width; x++) {
          const dx = x - r; const dy = y - r;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const idx = (y * this._wheel.width + x) * 4;
          if (dist > r) { img.data[idx + 3] = 0; continue; }
          const hue = (angle + Math.PI) / (2 * Math.PI);
          const sat = Math.min(1, dist / r);
          const [R, G, B] = this._hslToRgb(hue, sat, 0.5);
          img.data[idx] = R; img.data[idx + 1] = G; img.data[idx + 2] = B; img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    _hslToRgb(h, s, l) {
      let r, g, b;
      if (s === 0) { r = g = b = l; } else {
        const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    _pick(e) {
      const rect = this._wheel.getBoundingClientRect();
      const x = e.clientX - rect.left - this._wheel.width / 2;
      const y = e.clientY - rect.top - this._wheel.height / 2;
      const dist = Math.sqrt(x * x + y * y);
      const r = this._wheel.width / 2;
      if (dist > r) return;
      const angle = Math.atan2(y, x);
      this._hue = (angle + Math.PI) / (2 * Math.PI);
      this._sat = Math.min(1, dist / r);
      this._updateThumb();
      this._updatePreview();
      this._callbacks.forEach(fn => fn(this.getColor()));
    }
    _updateThumb() {
      const r = (this._wheel.width / 2) * this._sat;
      const angle = this._hue * Math.PI * 2 - Math.PI;
      const x = this._wheel.width / 2 + r * Math.cos(angle);
      const y = this._wheel.height / 2 + r * Math.sin(angle);
      this._thumb.style.left = _px(x); this._thumb.style.top = _px(y);
    }
    _updatePreview() { this._preview.style.background = this.getColor(); }
    getColor() {
      const [R, G, B] = this._hslToRgb(this._hue, this._sat, this._light);
      return `rgb(${R}, ${G}, ${B})`;
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 10. 可折叠面板 ========== */
  class Accordion {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Accordion: element not found');
      this.opts = Object.assign({ multiple: false, duration: 250 }, options);
      this._items = [];
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-accordion');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' });
    }
    addItem(title, contentElement) {
      const header = _createEl('div', 'ql-acc-header', this.el);
      _setStyles(header, { padding: '10px 14px', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600' });
      header.textContent = title;
      const arrow = _createEl('span', null, header);
      arrow.textContent = '▶';
      _setStyles(arrow, { fontSize: '10px', transition: 'transform 0.2s' });
      const body = _createEl('div', 'ql-acc-body', this.el);
      _setStyles(body, { maxHeight: '0px', overflow: 'hidden', transition: `max-height ${this.opts.duration}ms ease` });
      if (contentElement) body.appendChild(contentElement);
      const item = { header, body, arrow, open: false };
      this._items.push(item);
      header.addEventListener('click', () => {
        const willOpen = !item.open;
        if (!this.opts.multiple) this._items.forEach(it => { if (it !== item) this._setOpen(it, false); });
        this._setOpen(item, willOpen);
        this._callbacks.forEach(fn => fn({ index: this._items.indexOf(item), open: willOpen, title }));
      });
    }
    _setOpen(item, open) {
      item.open = open;
      item.arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
      item.body.style.maxHeight = open ? (item.body.scrollHeight + 'px') : '0px';
    }
    onToggle(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 11. 标签页组件 ========== */
  class Tabs {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Tabs: element not found');
      this.opts = Object.assign({ placement: 'top', activeIndex: 0 }, options);
      this._tabs = [];
      this._callbacks = [];
      this._active = this.opts.activeIndex;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-tabs');
      _setStyles(this.el, { display: 'flex', flexDirection: this.opts.placement === 'left' ? 'row' : 'column' });
      this._header = _createEl('div', 'ql-tabs-header', this.el);
      _setStyles(this._header, { display: 'flex', gap: '2px', borderBottom: this.opts.placement === 'top' ? '2px solid rgba(0,0,0,0.06)' : 'none', flexDirection: this.opts.placement === 'left' ? 'column' : 'row', borderRight: this.opts.placement === 'left' ? '2px solid rgba(0,0,0,0.06)' : 'none', minWidth: this.opts.placement === 'left' ? '100px' : 'auto' });
      this._body = _createEl('div', 'ql-tabs-body', this.el);
      _setStyles(this._body, { flex: '1', position: 'relative' });
    }
    addTab(label, contentElement) {
      const idx = this._tabs.length;
      const btn = _createEl('button', 'ql-tab-btn', this._header);
      btn.textContent = label;
      _setStyles(btn, { padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '500', color: '#666', borderBottom: '2px solid transparent', marginBottom: '-2px' });
      const pane = _createEl('div', 'ql-tab-pane', this._body);
      _setStyles(pane, { position: 'absolute', inset: '0', display: idx === this._active ? 'block' : 'none', padding: '10px' });
      if (contentElement) pane.appendChild(contentElement);
      this._tabs.push({ btn, pane });
      btn.addEventListener('click', () => this._setActive(idx));
      if (idx === this._active) btn.style.borderBottomColor = 'var(--accent, #5b4dff)';
    }
    _setActive(idx) {
      this._active = idx;
      this._tabs.forEach((t, i) => {
        const active = i === idx;
        t.pane.style.display = active ? 'block' : 'none';
        t.btn.style.color = active ? 'var(--accent, #5b4dff)' : '#666';
        t.btn.style.borderBottomColor = active ? 'var(--accent, #5b4dff)' : 'transparent';
      });
      this._callbacks.forEach(fn => fn({ index: idx }));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 12. 级联选择器 ========== */
  class Cascader {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Cascader: element not found');
      this.opts = Object.assign({ placeholder: '请选择', data: [] }, options);
      this._callbacks = [];
      this._selectedPath = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-cascader');
      _setStyles(this.el, { position: 'relative', display: 'inline-block' });
      this._input = _createEl('div', 'ql-cascader-input', this.el);
      _setStyles(this._input, { padding: '6px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '6px', cursor: 'pointer', minWidth: '160px', background: '#fff' });
      this._input.textContent = this.opts.placeholder;
      this._panel = _createEl('div', 'ql-cascader-panel', this.el);
      _setStyles(this._panel, { position: 'absolute', top: '100%', left: '0', marginTop: '4px', display: 'none', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderRadius: '6px', zIndex: '1000', maxHeight: '240px', overflow: 'auto' });
      this._input.addEventListener('click', () => {
        const open = this._panel.style.display === 'block';
        this._panel.style.display = open ? 'none' : 'block';
        if (!open) this._renderColumn(this.opts.data, 0);
      });
      document.addEventListener('click', (e) => { if (!this.el.contains(e.target)) this._panel.style.display = 'none'; });
    }
    _renderColumn(data, level) {
      while (this._panel.children.length > level) this._panel.lastChild.remove();
      const col = _createEl('div', 'ql-cascader-col', this._panel);
      _setStyles(col, { display: 'inline-block', minWidth: '140px', borderRight: '1px solid rgba(0,0,0,0.06)', verticalAlign: 'top', padding: '4px 0' });
      data.forEach(item => {
        const row = _createEl('div', 'ql-cascader-row', col);
        _setStyles(row, { padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' });
        row.textContent = item.label;
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(0,0,0,0.04)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.addEventListener('click', () => {
          this._selectedPath[level] = item.value;
          this._selectedPath = this._selectedPath.slice(0, level + 1);
          if (item.children && item.children.length) {
            this._renderColumn(item.children, level + 1);
          } else {
            this._input.textContent = this._selectedPath.join(' / ');
            this._panel.style.display = 'none';
            this._callbacks.forEach(fn => fn({ path: this._selectedPath.slice(), value: item.value, label: item.label }));
          }
        });
      });
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 13. 虚拟滚动列表 ========== */
  class VirtualScrollList {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('VirtualScrollList: element not found');
      this.opts = Object.assign({
        itemHeight: 36, overscan: 5, data: []
      }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-virtual-list');
      _setStyles(this.el, { position: 'relative', overflow: 'auto', height: '300px' });
      this._content = _createEl('div', 'ql-virtual-content', this.el);
      this._content.style.position = 'relative';
      this._render();
      this.el.addEventListener('scroll', () => this._render());
    }
    setData(data) { this.opts.data = data; this._render(); }
    _render() {
      const totalH = this.opts.data.length * this.opts.itemHeight;
      this._content.style.height = _px(totalH);
      const scrollTop = this.el.scrollTop;
      const startIdx = Math.max(0, Math.floor(scrollTop / this.opts.itemHeight) - this.opts.overscan);
      const endIdx = Math.min(this.opts.data.length, Math.ceil((scrollTop + this.el.clientHeight) / this.opts.itemHeight) + this.opts.overscan);
      this._content.innerHTML = '';
      for (let i = startIdx; i < endIdx; i++) {
        const row = _createEl('div', 'ql-virtual-row', this._content);
        _setStyles(row, { position: 'absolute', top: _px(i * this.opts.itemHeight), left: '0', right: '0', height: _px(this.opts.itemHeight), display: 'flex', alignItems: 'center', padding: '0 10px', boxSizing: 'border-box', borderBottom: '1px solid rgba(0,0,0,0.04)' });
        row.textContent = this.opts.data[i];
        row.addEventListener('click', () => this._callbacks.forEach(fn => fn({ index: i, item: this.opts.data[i] })));
      }
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 14. 拖拽排序列表 ========== */
  class DragSortList {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('DragSortList: element not found');
      this.opts = Object.assign({ items: [], itemHeight: 40, handleClass: 'ql-drag-handle' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-drag-sort');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' });
      this._renderItems();
    }
    _renderItems() {
      this.el.innerHTML = '';
      this.opts.items.forEach((text, idx) => {
        const item = _createEl('div', 'ql-drag-item', this.el);
        _setStyles(item, { display: 'flex', alignItems: 'center', padding: '0 10px', height: _px(this.opts.itemHeight), background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', cursor: 'default', userSelect: 'none' });
        const handle = _createEl('span', this.opts.handleClass, item);
        handle.textContent = '⋮⋮';
        _setStyles(handle, { marginRight: '8px', cursor: 'grab', color: '#aaa', fontSize: '12px' });
        const label = _createEl('span', null, item);
        label.textContent = text;
        this._bindDrag(item, handle, idx);
      });
    }
    _bindDrag(item, handle, idx) {
      let startY = 0, startTop = 0, ghost = null;
      const onStart = (e) => {
        e.preventDefault();
        this._dragging = true;
        startY = e.clientY;
        const rect = item.getBoundingClientRect();
        const parentRect = this.el.getBoundingClientRect();
        startTop = rect.top - parentRect.top;
        ghost = item.cloneNode(true);
        _setStyles(ghost, { position: 'absolute', left: '0', right: '0', top: _px(startTop), opacity: '0.9', zIndex: '100', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' });
        this.el.appendChild(ghost);
        item.style.opacity = '0.3';
        const onMove = (ev) => {
          if (!this._dragging) return;
          const dy = ev.clientY - startY;
          ghost.style.top = _px(startTop + dy);
          const newIdx = _clamp(Math.round((startTop + dy + this.opts.itemHeight / 2) / (this.opts.itemHeight + 4)), 0, this.opts.items.length - 1);
          if (newIdx !== idx) {
            const it = this.opts.items.splice(idx, 1)[0];
            this.opts.items.splice(newIdx, 0, it);
            this._renderItems();
          }
        };
        const onEnd = () => {
          this._dragging = false;
          if (ghost) ghost.remove();
          item.style.opacity = '';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onEnd);
          this._callbacks.forEach(fn => fn({ items: this.opts.items.slice() }));
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
      };
      handle.addEventListener('mousedown', onStart);
    }
    setItems(items) { this.opts.items = items.slice(); this._renderItems(); }
    onSort(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 15. 进度环 / 仪表盘 ========== */
  class ProgressRing {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ProgressRing: element not found');
      this.opts = Object.assign({ size: 100, thickness: 8, value: 0, max: 100, color: 'var(--accent, #5b4dff)', trackColor: 'rgba(0,0,0,0.08)' }, options);
      this._value = _clamp(this.opts.value, 0, this.opts.max);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-progress-ring');
      _setStyles(this.el, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: _px(this.opts.size), height: _px(this.opts.size) });
      const ns = 'http://www.w3.org/2000/svg';
      this._svg = document.createElementNS(ns, 'svg');
      this._svg.setAttribute('width', this.opts.size);
      this._svg.setAttribute('height', this.opts.size);
      this._svg.setAttribute('viewBox', '0 0 100 100');
      const r = 42;
      const c = 2 * Math.PI * r;
      this._track = document.createElementNS(ns, 'circle');
      this._track.setAttribute('cx', '50'); this._track.setAttribute('cy', '50'); this._track.setAttribute('r', r);
      this._track.setAttribute('fill', 'none'); this._track.setAttribute('stroke', this.opts.trackColor); this._track.setAttribute('stroke-width', this.opts.thickness);
      this._svg.appendChild(this._track);
      this._ring = document.createElementNS(ns, 'circle');
      this._ring.setAttribute('cx', '50'); this._ring.setAttribute('cy', '50'); this._ring.setAttribute('r', r);
      this._ring.setAttribute('fill', 'none'); this._ring.setAttribute('stroke', this.opts.color); this._ring.setAttribute('stroke-width', this.opts.thickness);
      this._ring.setAttribute('stroke-linecap', 'round');
      this._ring.setAttribute('stroke-dasharray', c);
      this._ring.setAttribute('stroke-dashoffset', c);
      this._ring.style.transform = 'rotate(-90deg)';
      this._ring.style.transformOrigin = '50% 50%';
      this._ring.style.transition = 'stroke-dashoffset 0.4s ease';
      this._svg.appendChild(this._ring);
      this.el.appendChild(this._svg);
      this._label = _createEl('span', null, this.el);
      _setStyles(this._label, { position: 'absolute', fontSize: '16px', fontWeight: '700', color: '#333' });
      this._update();
    }
    _update() {
      const r = 42;
      const c = 2 * Math.PI * r;
      const pct = this._value / this.opts.max;
      this._ring.setAttribute('stroke-dashoffset', c * (1 - pct));
      this._label.textContent = Math.round(pct * 100) + '%';
    }
    setValue(v) {
      this._value = _clamp(v, 0, this.opts.max);
      this._update();
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class Gauge {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Gauge: element not found');
      this.opts = Object.assign({ width: 180, height: 100, min: 0, max: 100, value: 0, segments: 5, color: 'var(--accent, #5b4dff)' }, options);
      this._value = _clamp(this.opts.value, this.opts.min, this.opts.max);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-gauge');
      _setStyles(this.el, { display: 'inline-block', position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height) });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2; const cy = h - 10; const r = Math.min(w, h * 2) / 2 - 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 12;
      ctx.stroke();
      const t = (this._value - this.opts.min) / (this.opts.max - this.opts.min);
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * t);
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();
      const angle = Math.PI + Math.PI * t;
      const nx = cx + (r - 4) * Math.cos(angle);
      const ny = cy + (r - 4) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.round(this._value)), cx, cy + 6);
    }
    setValue(v) {
      this._value = _clamp(v, this.opts.min, this.opts.max);
      this._draw();
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 16. 粒子背景组件 ========== */
  class ParticleBackground {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ParticleBackground: element not found');
      this.opts = Object.assign({
        count: 60, color: 'var(--accent, #5b4dff)', speed: 0.5, radius: 2, connectDist: 100
      }, options);
      this._running = false;
      this._particles = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-particle-bg');
      _setStyles(this.el, { position: 'relative', overflow: 'hidden' });
      this._canvas = _createEl('canvas', null, this.el);
      _setStyles(this._canvas, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
      this._resize();
      for (let i = 0; i < this.opts.count; i++) {
        this._particles.push({
          x: Math.random() * this._canvas.width,
          y: Math.random() * this._canvas.height,
          vx: (Math.random() - 0.5) * this.opts.speed,
          vy: (Math.random() - 0.5) * this.opts.speed,
          r: this.opts.radius + Math.random()
        });
      }
      this._running = true;
      this._draw();
      window.addEventListener('resize', () => this._resize());
    }
    _resize() {
      this._canvas.width = this.el.clientWidth;
      this._canvas.height = this.el.clientHeight;
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._canvas.getContext('2d');
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const ps = this._particles;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = this.opts.color;
        ctx.fill();
        for (let j = i + 1; j < ps.length; j++) {
          const q = ps[j];
          const dx = p.x - q.x; const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.opts.connectDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = this.opts.color;
            ctx.globalAlpha = 1 - dist / this.opts.connectDist;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== 17. 代码/乐谱高亮显示 ========== */
  class CodeScoreHighlight {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CodeScoreHighlight: element not found');
      this.opts = Object.assign({
        mode: 'code', theme: 'dark', tabSize: 2
      }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-code-highlight');
      _setStyles(this.el, { fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', padding: '12px', borderRadius: '6px', overflow: 'auto', whiteSpace: 'pre', tabSize: this.opts.tabSize });
      if (this.opts.theme === 'dark') {
        _setStyles(this.el, { background: '#1e1e2e', color: '#cdd6f4' });
      } else {
        _setStyles(this.el, { background: '#f8f9fa', color: '#212529' });
      }
    }
    setCode(text) {
      if (this.opts.mode === 'score') {
        this._renderScore(text);
      } else {
        this._renderCode(text);
      }
    }
    _renderCode(text) {
      const rules = [
        { regex: /\/\/.*$/gm, color: '#6c7086' },
        { regex: /\/\*[\s\S]*?\*\//g, color: '#6c7086' },
        { regex: /\b(function|return|var|let|const|if|else|for|while|class|new|this|typeof|instanceof|import|export|from|default|async|await)\b/g, color: '#cba6f7' },
        { regex: /\b(true|false|null|undefined|NaN|Infinity)\b/g, color: '#fab387' },
        { regex: /\b\d+(\.\d+)?\b/g, color: '#fab387' },
        { regex: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g, color: '#a6e3a1' },
        { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, color: '#f9e2af' }
      ];
      let html = this._escapeHtml(text);
      rules.forEach(rule => {
        html = html.replace(rule.regex, match => `<span style="color:${rule.color}">${this._escapeHtml(match)}</span>`);
      });
      this.el.innerHTML = html;
    }
    _renderScore(text) {
      const lines = text.split('\n');
      const html = lines.map(line => {
        let colored = this._escapeHtml(line);
        colored = colored.replace(/([CDEFGAB])(#|b)?(\d?)/g, (m, note, acc, oct) => {
          let c = '#89b4fa'; if (acc) c = '#f38ba8'; if (oct) c = '#a6e3a1';
          return `<span style="color:${c}">${m}</span>`;
        });
        colored = colored.replace(/(\||\:|\{|\}|\[|\])/g, '<span style="color:#f9e2af">$1</span>');
        return colored;
      }).join('\n');
      this.el.innerHTML = html;
    }
    _escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 18. 通知/弹窗系统 ========== */
  class NotificationSystem {
    constructor(options = {}) {
      this.opts = Object.assign({ position: 'top-right', duration: 3000, max: 5 }, options);
      this._container = document.createElement('div');
      this._container.className = 'ql-notify-container';
      const map = { 'top-right': 'top:16px;right:16px;', 'top-left': 'top:16px;left:16px;', 'bottom-right': 'bottom:16px;right:16px;', 'bottom-left': 'bottom:16px;left:16px;' };
      _setStyles(this._container, { position: 'fixed', zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px', pointerEvents: 'none' });
      this._container.style.cssText += (map[this.opts.position] || map['top-right']);
      document.body.appendChild(this._container);
      this._items = [];
    }
    show(message, type = 'info') {
      const colors = { info: '#5b4dff', success: '#4caf50', warning: '#ff9800', error: '#f44336' };
      const color = colors[type] || colors.info;
      const el = document.createElement('div');
      _setStyles(el, { padding: '10px 14px', borderRadius: '6px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderLeft: `4px solid ${color}`, fontSize: '13px', color: '#333', pointerEvents: 'auto', transform: 'translateX(20px)', opacity: '0', transition: 'all 0.3s ease' });
      el.textContent = message;
      this._container.appendChild(el);
      requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; el.style.opacity = '1'; });
      this._items.push(el);
      if (this._items.length > this.opts.max) {
        const old = this._items.shift();
        this._remove(old);
      }
      setTimeout(() => this._remove(el), this.opts.duration);
      return el;
    }
    _remove(el) {
      if (!el.parentNode) return;
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => { if (el.parentNode) el.remove(); }, 300);
    }
    destroy() { if (this._container) this._container.remove(); }
  }

  class DialogSystem {
    constructor(options = {}) {
      this.opts = Object.assign({ overlayColor: 'rgba(0,0,0,0.4)', zIndex: 9000 }, options);
      this._callbacks = [];
    }
    confirm(title, message, onOk, onCancel) {
      this._open(title, message, true, onOk, onCancel);
    }
    alert(title, message, onOk) {
      this._open(title, message, false, onOk, null);
    }
    _open(title, message, showCancel, onOk, onCancel) {
      const overlay = document.createElement('div');
      _setStyles(overlay, { position: 'fixed', inset: '0', background: this.opts.overlayColor, zIndex: this.opts.zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center' });
      const box = document.createElement('div');
      _setStyles(box, { background: '#fff', borderRadius: '10px', padding: '20px', maxWidth: '360px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'ql-scale-in 0.2s ease' });
      const h = document.createElement('h3');
      h.textContent = title; h.style.margin = '0 0 8px 0';
      const p = document.createElement('p');
      p.textContent = message; p.style.margin = '0 0 16px 0'; p.style.color = '#555';
      const actions = document.createElement('div');
      _setStyles(actions, { display: 'flex', gap: '8px', justifyContent: 'flex-end' });
      const okBtn = document.createElement('button');
      okBtn.textContent = '确定';
      _setStyles(okBtn, { padding: '6px 14px', border: 'none', borderRadius: '6px', background: 'var(--accent, #5b4dff)', color: '#fff', cursor: 'pointer' });
      actions.appendChild(okBtn);
      if (showCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        _setStyles(cancelBtn, { padding: '6px 14px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '6px', background: '#fff', cursor: 'pointer' });
        actions.appendChild(cancelBtn);
        cancelBtn.addEventListener('click', () => { overlay.remove(); if (onCancel) onCancel(); });
      }
      okBtn.addEventListener('click', () => { overlay.remove(); if (onOk) onOk(); });
      box.appendChild(h); box.appendChild(p); box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); if (onCancel) onCancel(); } });
    }
    destroy() {}
  }

  /* ========== 19. 右键菜单 ========== */
  class ContextMenuCanvas {
    constructor(options = {}) {
      this.opts = Object.assign({ items: [] }, options);
      this._callbacks = [];
      this._menu = null;
    }
    attach(element) {
      const el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!el) return;
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._show(e.clientX, e.clientY);
      });
    }
    _show(x, y) {
      if (this._menu) this._menu.remove();
      this._menu = document.createElement('div');
      _setStyles(this._menu, { position: 'fixed', left: _px(x), top: _px(y), background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', borderRadius: '8px', padding: '4px 0', zIndex: '9999', minWidth: '160px' });
      this.opts.items.forEach(item => {
        const row = document.createElement('div');
        _setStyles(row, { padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#333' });
        row.textContent = item.label;
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(0,0,0,0.04)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.addEventListener('click', () => {
          this._menu.remove(); this._menu = null;
          if (item.action) item.action();
          this._callbacks.forEach(fn => fn(item));
        });
        this._menu.appendChild(row);
      });
      document.body.appendChild(this._menu);
      const close = (e) => { if (this._menu && !this._menu.contains(e.target)) { this._menu.remove(); this._menu = null; document.removeEventListener('click', close); } };
      requestAnimationFrame(() => document.addEventListener('click', close));
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { if (this._menu) this._menu.remove(); }
  }

  /* ========== 20. 画布标尺 ========== */
  class CanvasRuler {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CanvasRuler: element not found');
      this.opts = Object.assign({
        width: 800, height: 24, direction: 'horizontal', unit: 10, majorUnit: 100, color: '#888', bg: '#f4f4f5'
      }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-canvas-ruler');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), overflow: 'hidden', background: this.opts.bg });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.opts.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = this.opts.color;
      ctx.fillStyle = this.opts.color;
      ctx.font = '10px sans-serif';
      ctx.lineWidth = 1;
      if (this.opts.direction === 'horizontal') {
        for (let x = 0; x < w; x += this.opts.unit) {
          const major = x % this.opts.majorUnit === 0;
          ctx.beginPath();
          ctx.moveTo(x + 0.5, major ? 0 : h / 2);
          ctx.lineTo(x + 0.5, h);
          ctx.stroke();
          if (major) ctx.fillText(String(x), x + 2, 10);
        }
      } else {
        for (let y = 0; y < h; y += this.opts.unit) {
          const major = y % this.opts.majorUnit === 0;
          ctx.beginPath();
          ctx.moveTo(major ? 0 : w / 2, y + 0.5);
          ctx.lineTo(w, y + 0.5);
          ctx.stroke();
          if (major) ctx.fillText(String(y), 2, y + 10);
        }
      }
    }
    destroy() { this.el.innerHTML = ''; }
  }

  // 注册到 QingluanUI
  QI.VerticalSlider = VerticalSlider;
  QI.HorizontalSlider = HorizontalSlider;
  QI.RangeSlider = RangeSlider;
  QI.SpectrumVisualizer = SpectrumVisualizer;
  QI.WaveformCanvas = WaveformCanvas;
  QI.RotaryKnobSVG = RotaryKnobSVG;
  QI.StepSequencer = StepSequencer;
  QI.PianoRollMini = PianoRollMini;
  QI.MixerFaderGroup = MixerFaderGroup;
  QI.EmojiStickerPicker = EmojiStickerPicker;
  QI.ColorPickerCanvas = ColorPickerCanvas;
  QI.Accordion = Accordion;
  QI.Tabs = Tabs;
  QI.Cascader = Cascader;
  QI.VirtualScrollList = VirtualScrollList;
  QI.DragSortList = DragSortList;
  QI.ProgressRing = ProgressRing;
  QI.Gauge = Gauge;
  QI.ParticleBackground = ParticleBackground;
  QI.CodeScoreHighlight = CodeScoreHighlight;
  QI.NotificationSystem = NotificationSystem;
  QI.DialogSystem = DialogSystem;
  QI.ContextMenuCanvas = ContextMenuCanvas;
  QI.CanvasRuler = CanvasRuler;
})(QingluanUI);

/* ================= 追加组件 v3.2 (音频专业组件) ================= */
(function(QI) {
  'use strict';
  function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function _px(n) { return n + 'px'; }
  function _createEl(tag, cls, parent) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }
  function _setStyles(el, styles) { Object.assign(el.style, styles); }

  /* ========== ADSR 包络编辑器 ========== */
  class EnvelopeCanvas {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('EnvelopeCanvas: element not found');
      this.opts = Object.assign({
        width: 300, height: 120, attack: 0.2, decay: 0.3, sustain: 0.6, release: 0.5,
        color: 'var(--accent, #5b4dff)', grid: true
      }, options);
      this._points = {
        attack: { x: this.opts.attack, y: 1 },
        decay: { x: this.opts.attack + this.opts.decay, y: this.opts.sustain },
        sustain: { x: 0.8, y: this.opts.sustain },
        release: { x: 0.8 + this.opts.release, y: 0 }
      };
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-envelope-canvas');
      _setStyles(this.el, { display: 'inline-block', position: 'relative', userSelect: 'none' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', cursor: 'crosshair' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
      window.addEventListener('mousemove', (e) => this._onMouseMove(e));
      window.addEventListener('mouseup', () => this._dragPoint = null);
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (this.opts.grid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = (i / 4) * h;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        for (let i = 0; i <= 8; i++) {
          const x = (i / 8) * w;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
      }
      const p = this._points;
      const ax = p.attack.x * w; const ay = (1 - p.attack.y) * h;
      const dx = p.decay.x * w; const dy = (1 - p.decay.y) * h;
      const sx = p.sustain.x * w; const sy = (1 - p.sustain.y) * h;
      const rx = p.release.x * w; const ry = (1 - p.release.y) * h;
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(ax, ay);
      ctx.lineTo(dx, dy);
      ctx.lineTo(sx, sy);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.fillStyle = this.opts.color;
      ctx.globalAlpha = 0.15;
      ctx.lineTo(rx, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      [{ x: ax, y: ay }, { x: dx, y: dy }, { x: sx, y: sy }, { x: rx, y: ry }].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = this.opts.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
    _onMouseDown(e) {
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const w = this._canvas.width; const h = this._canvas.height;
      const names = ['attack', 'decay', 'sustain', 'release'];
      let best = null, bestDist = 20;
      names.forEach(name => {
        const px = this._points[name].x * w;
        const py = (1 - this._points[name].y) * h;
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        if (dist < bestDist) { bestDist = dist; best = name; }
      });
      this._dragPoint = best;
    }
    _onMouseMove(e) {
      if (!this._dragPoint) return;
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const w = this._canvas.width; const h = this._canvas.height;
      const pt = this._points[this._dragPoint];
      pt.x = _clamp(mx / w, 0, 1);
      pt.y = _clamp(1 - my / h, 0, 1);
      if (this._dragPoint === 'attack') pt.x = Math.min(pt.x, this._points.decay.x);
      if (this._dragPoint === 'decay') pt.x = Math.max(pt.x, this._points.attack.x);
      if (this._dragPoint === 'sustain') { pt.x = Math.max(pt.x, this._points.decay.x); pt.y = this._points.decay.y; }
      if (this._dragPoint === 'release') pt.x = Math.max(pt.x, this._points.sustain.x);
      this._draw();
      this._callbacks.forEach(fn => fn({
        attack: this._points.attack.x,
        decay: this._points.decay.x - this._points.attack.x,
        sustain: this._points.sustain.y,
        release: this._points.release.x - this._points.sustain.x
      }));
    }
    setEnvelope(a, d, s, r) {
      this._points.attack.x = a;
      this._points.decay.x = a + d;
      this._points.sustain.y = s;
      this._points.sustain.x = 0.8;
      this._points.release.x = 0.8 + r;
      this._draw();
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 瀑布频谱 ========== */
  class SpectrumWaterfall {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SpectrumWaterfall: element not found');
      this.opts = Object.assign({
        width: 400, height: 200, fftSize: 256, history: 100, colorStart: '#5b4dff', colorEnd: '#ff2a6d'
      }, options);
      this._history = [];
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-spectrum-waterfall');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
    }
    setData(uint8Array) {
      if (!uint8Array) return;
      const step = uint8Array.length / this.opts.history;
      const row = new Uint8Array(this.opts.history);
      for (let i = 0; i < this.opts.history; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += uint8Array[Math.floor(i * step + j)];
        row[i] = sum / step;
      }
      this._history.unshift(row);
      if (this._history.length > this.opts.history) this._history.pop();
      if (!this._running) { this._running = true; this._draw(); }
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const rowH = h / this._history.length;
      const colW = w / this.opts.history;
      for (let y = 0; y < this._history.length; y++) {
        const row = this._history[y];
        for (let x = 0; x < row.length; x++) {
          const val = row[x] / 255;
          const hue = 240 + val * 120;
          ctx.fillStyle = `hsl(${hue}, 80%, ${20 + val * 60}%)`;
          ctx.fillRect(x * colW, y * rowH, colW + 1, rowH + 1);
        }
      }
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== XY 示波器 (李萨如) ========== */
  class XYScope {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('XYScope: element not found');
      this.opts = Object.assign({ size: 200, color: 'var(--accent, #5b4dff)', lineWidth: 1.5, persistence: 0.2 }, options);
      this._left = new Float32Array(0);
      this._right = new Float32Array(0);
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-xy-scope');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.size; this._canvas.height = this.opts.size;
      _setStyles(this._canvas, { display: 'block', background: '#000' });
      this._ctx = this._canvas.getContext('2d');
    }
    setData(left, right) {
      if (!left || !right) return;
      this._left = left.slice(0, Math.min(left.length, right.length));
      this._right = right.slice(0, this._left.length);
      if (!this._running) { this._running = true; this._draw(); }
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.fillStyle = `rgba(0,0,0,${this.opts.persistence})`;
      ctx.fillRect(0, 0, w, h);
      const len = this._left.length;
      if (len === 0) { requestAnimationFrame(() => this._draw()); return; }
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = this.opts.lineWidth;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = (this._left[i] + 1) * 0.5 * w;
        const y = (1 - (this._right[i] + 1) * 0.5) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== 相位表 ========== */
  class PhaseMeter {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PhaseMeter: element not found');
      this.opts = Object.assign({ size: 80, color: '#4caf50', warnColor: '#ff9800', dangerColor: '#f44336' }, options);
      this._value = 0;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-phase-meter');
      _setStyles(this.el, { display: 'inline-block', position: 'relative', width: _px(this.opts.size), height: _px(this.opts.size / 2) });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.size; this._canvas.height = this.opts.size / 2;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.arc(w / 2, h, h - 4, Math.PI, 0);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 6;
      ctx.stroke();
      const t = (this._value + 1) / 2;
      const angle = Math.PI + t * Math.PI;
      ctx.beginPath();
      ctx.moveTo(w / 2, h);
      ctx.lineTo(w / 2 + (h - 10) * Math.cos(angle), h + (h - 10) * Math.sin(angle));
      ctx.strokeStyle = Math.abs(this._value) > 0.8 ? this.opts.dangerColor : Math.abs(this._value) > 0.5 ? this.opts.warnColor : this.opts.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
    }
    setValue(v) {
      this._value = _clamp(v, -1, 1);
      this._draw();
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 相关表 ========== */
  class CorrelationMeter {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CorrelationMeter: element not found');
      this.opts = Object.assign({ width: 160, height: 24, color: '#4caf50' }, options);
      this._value = 0;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-correlation-meter');
      _setStyles(this.el, { display: 'inline-block', position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height) });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', borderRadius: '4px' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, w, h);
      const t = (this._value + 1) / 2;
      const barW = t * w;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#f44336');
      grad.addColorStop(0.5, '#ffeb3b');
      grad.addColorStop(1, '#4caf50');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, barW, h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(w / 2 - 1, 0, 2, h);
    }
    setValue(v) {
      this._value = _clamp(v, -1, 1);
      this._draw();
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 多段电平表 ========== */
  class MultiBandMeter {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MultiBandMeter: element not found');
      this.opts = Object.assign({ bands: 4, width: 24, height: 160, colors: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336'] }, options);
      this._values = new Array(this.opts.bands).fill(-60);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-multi-band-meter');
      _setStyles(this.el, { display: 'flex', gap: '4px', alignItems: 'flex-end', height: _px(this.opts.height) });
      this._bars = [];
      for (let i = 0; i < this.opts.bands; i++) {
        const bar = _createEl('div', null, this.el);
        _setStyles(bar, { width: _px(this.opts.width), height: '100%', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', position: 'relative', overflow: 'hidden' });
        const fill = _createEl('div', null, bar);
        _setStyles(fill, { position: 'absolute', bottom: '0', left: '0', width: '100%', height: '0%', background: this.opts.colors[i % this.opts.colors.length], borderRadius: '3px', transition: 'height 0.05s' });
        this._bars.push(fill);
      }
    }
    setValues(dbs) {
      dbs.forEach((db, i) => {
        if (i >= this.opts.bands) return;
        const pct = Math.min(100, Math.max(0, (db + 60) / 72 * 100));
        this._bars[i].style.height = pct + '%';
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 参量均衡器画布 ========== */
  class ParametricEQCanvas {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ParametricEQCanvas: element not found');
      this.opts = Object.assign({ width: 400, height: 160, bands: [] }, options);
      this._bands = this.opts.bands.slice();
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-param-eq');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', cursor: 'crosshair' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => this._onDown(e));
      window.addEventListener('mousemove', (e) => this._onMove(e));
      window.addEventListener('mouseup', () => this._dragBand = null);
    }
    _freqToX(freq) {
      const minL = Math.log10(20); const maxL = Math.log10(20000);
      return ((Math.log10(freq) - minL) / (maxL - minL)) * this._canvas.width;
    }
    _xToFreq(x) {
      const minL = Math.log10(20); const maxL = Math.log10(20000);
      return Math.pow(10, minL + (x / this._canvas.width) * (maxL - minL));
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      [0, 0.25, 0.5, 0.75, 1].forEach(t => {
        const y = t * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      });
      [20, 100, 1000, 10000].forEach(f => {
        const x = this._freqToX(f);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      });
      ctx.strokeStyle = 'var(--accent, #5b4dff)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const f = this._xToFreq(x);
        let gain = 0;
        this._bands.forEach(b => {
          const bw = b.q ? b.q : 1;
          const g = b.gain || 0;
          const f0 = b.freq || 1000;
          gain += g * Math.exp(-Math.pow(Math.log2(f / f0) * 2 * bw, 2));
        });
        const y = (1 - (gain + 18) / 36) * h;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      this._bands.forEach((b, i) => {
        const x = this._freqToX(b.freq || 1000);
        const y = (1 - ((b.gain || 0) + 18) / 36) * h;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = this.opts.colors ? this.opts.colors[i] : '#5b4dff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
    _onDown(e) {
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      let best = null, bestDist = 20;
      this._bands.forEach((b, i) => {
        const x = this._freqToX(b.freq || 1000);
        const y = (1 - ((b.gain || 0) + 18) / 36) * this._canvas.height;
        const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      this._dragBand = best;
    }
    _onMove(e) {
      if (this._dragBand === null) return;
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const w = this._canvas.width; const h = this._canvas.height;
      this._bands[this._dragBand].freq = this._xToFreq(_clamp(mx, 0, w));
      this._bands[this._dragBand].gain = _clamp((1 - my / h) * 36 - 18, -18, 18);
      this._draw();
      this._callbacks.forEach(fn => fn({ bands: this._bands.map(b => Object.assign({}, b)), index: this._dragBand }));
    }
    setBands(bands) { this._bands = bands.slice(); this._draw(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 压缩器曲线 ========== */
  class CompressorCurve {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CompressorCurve: element not found');
      this.opts = Object.assign({ width: 200, height: 200, threshold: -24, ratio: 4, knee: 6, color: 'var(--accent, #5b4dff)' }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-compressor-curve');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        ctx.beginPath(); ctx.moveTo(t * w, 0); ctx.lineTo(t * w, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, t * h); ctx.lineTo(w, t * h); ctx.stroke();
      }
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const dbToY = (db) => (1 - (db + 60) / 60) * h;
      const dbToX = (db) => (db + 60) / 60 * w;
      ctx.moveTo(0, dbToY(-60));
      for (let db = -60; db <= 0; db += 1) {
        const out = db <= this.opts.threshold ? db : this.opts.threshold + (db - this.opts.threshold) / this.opts.ratio;
        ctx.lineTo(dbToX(db), dbToY(out));
      }
      ctx.stroke();
      const tx = dbToX(this.opts.threshold);
      const ty = dbToY(this.opts.threshold);
      ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = this.opts.color; ctx.lineWidth = 2; ctx.stroke();
    }
    setParams(threshold, ratio, knee) {
      this.opts.threshold = threshold; this.opts.ratio = ratio; this.opts.knee = knee;
      this._draw();
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 2D 声像器 ========== */
  class StereoPanner2D {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('StereoPanner2D: element not found');
      this.opts = Object.assign({ size: 120, color: 'var(--accent, #5b4dff)' }, options);
      this._x = 0; this._y = 0;
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-stereo-panner');
      _setStyles(this.el, { display: 'inline-block', position: 'relative', width: _px(this.opts.size), height: _px(this.opts.size) });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.size; this._canvas.height = this.opts.size;
      _setStyles(this._canvas, { display: 'block', cursor: 'crosshair' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => { this._dragging = true; this._move(e); });
      window.addEventListener('mousemove', (e) => { if (this._dragging) this._move(e); });
      window.addEventListener('mouseup', () => this._dragging = false);
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2, h - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, h / 2); ctx.lineTo(w - 4, h / 2); ctx.stroke();
      const px = (this._x + 1) * 0.5 * w;
      const py = (1 - (this._y + 1) * 0.5) * h;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = this.opts.color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    _move(e) {
      const rect = this._canvas.getBoundingClientRect();
      this._x = _clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      this._y = _clamp(1 - (e.clientY - rect.top) / rect.height * 2, -1, 1);
      this._draw();
      this._callbacks.forEach(fn => fn({ x: this._x, y: this._y }));
    }
    setPosition(x, y) { this._x = _clamp(x, -1, 1); this._y = _clamp(y, -1, 1); this._draw(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 时间轴标尺 ========== */
  class TimeRuler {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TimeRuler: element not found');
      this.opts = Object.assign({ width: 800, height: 24, bpm: 120, pixelsPerBeat: 40, color: '#888', bg: '#f4f4f5' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-time-ruler');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), overflow: 'hidden', background: this.opts.bg });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const beat = x / this.opts.pixelsPerBeat;
        this._callbacks.forEach(fn => fn({ beat, time: beat * 60 / this.opts.bpm }));
      });
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.opts.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this.opts.color;
      ctx.font = '10px sans-serif';
      const beats = Math.ceil(w / this.opts.pixelsPerBeat);
      for (let i = 0; i < beats; i++) {
        const x = i * this.opts.pixelsPerBeat;
        const bar = Math.floor(i / 4) + 1;
        const beatInBar = (i % 4) + 1;
        const isBar = i % 4 === 0;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, isBar ? 0 : h / 2);
        ctx.lineTo(x + 0.5, h);
        ctx.strokeStyle = this.opts.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (isBar) ctx.fillText(`${bar}`, x + 2, 10);
        else ctx.fillText(`${beatInBar}`, x + 2, h - 2);
      }
    }
    setBPM(bpm) { this.opts.bpm = bpm; this._draw(); }
    onSeek(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== BPM 点击器 ========== */
  class BPMTap {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('BPMTap: element not found');
      this.opts = Object.assign({ taps: 8 }, options);
      this._times = [];
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-bpm-tap');
      _setStyles(this.el, { display: 'inline-flex', alignItems: 'center', gap: '8px' });
      this._display = _createEl('span', null, this.el);
      _setStyles(this._display, { fontSize: '20px', fontWeight: '700', minWidth: '60px' });
      this._display.textContent = '--';
      const btn = _createEl('button', null, this.el);
      btn.textContent = 'TAP';
      _setStyles(btn, { padding: '8px 16px', border: 'none', borderRadius: '6px', background: 'var(--accent, #5b4dff)', color: '#fff', cursor: 'pointer', fontWeight: '600' });
      btn.addEventListener('click', () => this._tap());
      const reset = _createEl('button', null, this.el);
      reset.textContent = 'Reset';
      _setStyles(reset, { padding: '6px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '6px', background: '#fff', cursor: 'pointer' });
      reset.addEventListener('click', () => { this._times = []; this._display.textContent = '--'; });
    }
    _tap() {
      const now = performance.now();
      this._times.push(now);
      if (this._times.length > this.opts.taps) this._times.shift();
      if (this._times.length > 1) {
        const intervals = [];
        for (let i = 1; i < this._times.length; i++) intervals.push(this._times[i] - this._times[i - 1]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avg);
        this._display.textContent = String(bpm);
        this._callbacks.forEach(fn => fn(bpm));
      }
    }
    onBPM(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 调音器画布 ========== */
  class TunerCanvas {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TunerCanvas: element not found');
      this.opts = Object.assign({ width: 240, height: 60, color: 'var(--accent, #5b4dff)' }, options);
      this._cents = 0;
      this._note = 'A4';
      this._init();
    }
    _init() {
      this.el.classList.add('ql-tuner');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, h / 2 - 4, w, 8);
      const cx = w / 2 + (this._cents / 50) * (w / 2);
      ctx.beginPath();
      ctx.arc(cx, h / 2, 8, 0, Math.PI * 2);
      ctx.fillStyle = Math.abs(this._cents) < 5 ? '#4caf50' : Math.abs(this._cents) < 15 ? '#ff9800' : '#f44336';
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this._note, w / 2, h - 6);
      ctx.fillStyle = '#888';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${this._cents > 0 ? '+' : ''}${this._cents.toFixed(1)} cents`, w / 2, 14);
    }
    setPitch(note, cents) {
      this._note = note; this._cents = cents;
      this._draw();
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 3D 示波器 ========== */
  class Oscilloscope3D {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Oscilloscope3D: element not found');
      this.opts = Object.assign({ width: 300, height: 200, color: '#00ffcc', lineWidth: 1.2 }, options);
      this._samples = new Float32Array(0);
      this._running = false;
      this._angle = 0;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-osc-3d');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', background: '#050014' });
      this._ctx = this._canvas.getContext('2d');
    }
    setSamples(arr) {
      if (!arr) return;
      this._samples = arr.slice();
      if (!this._running) { this._running = true; this._draw(); }
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.fillStyle = 'rgba(5,0,20,0.25)';
      ctx.fillRect(0, 0, w, h);
      const len = this._samples.length;
      if (len === 0) { requestAnimationFrame(() => this._draw()); return; }
      const perspective = 0.6;
      const offsetY = h * 0.3;
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = this.opts.lineWidth;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1);
        const x = t * w;
        const y = (1 - (this._samples[i] + 1) * 0.5) * h * perspective + offsetY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      this._angle += 0.02;
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== 语谱图 ========== */
  class Spectrogram {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Spectrogram: element not found');
      this.opts = Object.assign({ width: 400, height: 200, fftSize: 512, history: 200 }, options);
      this._history = [];
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-spectrogram');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
    }
    setData(uint8Array) {
      if (!uint8Array) return;
      const bins = uint8Array.length;
      const row = new Uint8Array(bins);
      for (let i = 0; i < bins; i++) row[i] = uint8Array[i];
      this._history.unshift(row);
      if (this._history.length > this.opts.history) this._history.pop();
      if (!this._running) { this._running = true; this._draw(); }
    }
    _draw() {
      if (!this._running) return;
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const rows = this._history.length;
      const rowH = h / rows;
      const bins = this._history[0] ? this._history[0].length : 0;
      const colW = w / bins;
      for (let y = 0; y < rows; y++) {
        const row = this._history[y];
        for (let x = 0; x < bins; x++) {
          const val = row[x] / 255;
          const hue = 240 - val * 240;
          const light = val * 60;
          ctx.fillStyle = `hsl(${hue}, 90%, ${light}%)`;
          ctx.fillRect(x * colW, y * rowH, colW + 1, rowH + 1);
        }
      }
      requestAnimationFrame(() => this._draw());
    }
    start() { this._running = true; this._draw(); }
    stop() { this._running = false; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== 循环区域选择 ========== */
  class LoopRegion {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('LoopRegion: element not found');
      this.opts = Object.assign({ width: 600, height: 40, start: 0, end: 1, color: 'var(--accent, #5b4dff)' }, options);
      this._start = this.opts.start; this._end = this.opts.end;
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-loop-region');
      _setStyles(this.el, { display: 'inline-block', position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height) });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', cursor: 'pointer' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.opts.width;
        this._start = x; this._end = Math.min(1, x + 0.1);
        this._dragging = 'end';
        this._draw();
        this._callbacks.forEach(fn => fn({ start: this._start, end: this._end }));
        const onMove = (ev) => {
          const nx = _clamp((ev.clientX - rect.left) / this.opts.width, 0, 1);
          if (this._dragging === 'end') this._end = nx;
          if (this._end < this._start) { const t = this._start; this._start = this._end; this._end = t; this._dragging = 'end'; }
          this._draw();
          this._callbacks.forEach(fn => fn({ start: this._start, end: this._end }));
        };
        const onUp = () => { this._dragging = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, w, h);
      const sx = this._start * w; const ex = this._end * w;
      ctx.fillStyle = this.opts.color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(sx, 0, ex - sx, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, 0, 4, h);
      ctx.fillRect(ex - 4, 0, 4, h);
    }
    setRegion(s, e) { this._start = s; this._end = e; this._draw(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 交叉推子 ========== */
  class Crossfader {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Crossfader: element not found');
      this.opts = Object.assign({ width: 200, height: 32, color: 'var(--accent, #5b4dff)' }, options);
      this._value = 0.5;
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-crossfader');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), userSelect: 'none' });
      this._track = _createEl('div', null, this.el);
      _setStyles(this._track, { position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0', width: '100%', height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px' });
      this._thumb = _createEl('div', null, this.el);
      _setStyles(this._thumb, { position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '24px', borderRadius: '4px', background: '#fff', border: `2px solid ${this.opts.color}`, cursor: 'ew-resize', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' });
      this._updateUI();
      const start = (e) => { this._dragging = true; this._move(e); document.body.style.cursor = 'ew-resize'; };
      const move = (e) => { if (!this._dragging) return; this._move(e); };
      const end = () => { this._dragging = false; document.body.style.cursor = ''; };
      this._thumb.addEventListener('mousedown', start);
      this._track.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
    }
    _move(e) {
      const rect = this.el.getBoundingClientRect();
      const x = _clamp((e.clientX - rect.left) / this.opts.width, 0, 1);
      this._value = x;
      this._updateUI();
      this._callbacks.forEach(fn => fn(x));
    }
    _updateUI() { this._thumb.style.left = _px(this._value * this.opts.width); }
    setValue(v) { this._value = _clamp(v, 0, 1); this._updateUI(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== MIDI 键盘 ========== */
  class MIDIKeyboard {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MIDIKeyboard: element not found');
      this.opts = Object.assign({ octaves: 2, startOctave: 3, whiteWidth: 32, whiteHeight: 120 }, options);
      this._callbacks = [];
      this._active = new Set();
      this._init();
    }
    _init() {
      this.el.classList.add('ql-midi-keyboard');
      _setStyles(this.el, { display: 'flex', position: 'relative', userSelect: 'none' });
      const totalWhite = this.opts.octaves * 7;
      const totalW = totalWhite * this.opts.whiteWidth;
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = totalW; this._canvas.height = this.opts.whiteHeight;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => this._onMouse(e, true));
      this._canvas.addEventListener('mouseup', (e) => this._onMouse(e, false));
      this._canvas.addEventListener('mouseleave', () => this._active.clear());
    }
    _noteToX(midiNote) {
      const octave = Math.floor(midiNote / 12) - this.opts.startOctave;
      const n = midiNote % 12;
      const whiteIndices = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
      const isBlack = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
      if (isBlack[n]) {
        const leftWhite = whiteIndices[n];
        return (octave * 7 + leftWhite) * this.opts.whiteWidth + this.opts.whiteWidth * 0.7;
      }
      return (octave * 7 + whiteIndices[n]) * this.opts.whiteWidth;
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const totalWhite = this.opts.octaves * 7;
      for (let i = 0; i < totalWhite; i++) {
        const x = i * this.opts.whiteWidth;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, 0, this.opts.whiteWidth - 1, h);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(x, 0, this.opts.whiteWidth - 1, h);
      }
      const blackW = this.opts.whiteWidth * 0.6;
      const blackH = h * 0.6;
      for (let oct = 0; oct < this.opts.octaves; oct++) {
        const offsets = [0.7, 1.7, 3.7, 4.7, 5.7];
        offsets.forEach(off => {
          const x = (oct * 7 + off) * this.opts.whiteWidth;
          ctx.fillStyle = '#222';
          ctx.fillRect(x - blackW / 2, 0, blackW, blackH);
        });
      }
      this._active.forEach(note => {
        const isBlack = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1][note % 12];
        const x = this._noteToX(note);
        ctx.fillStyle = 'var(--accent, #5b4dff)';
        if (isBlack) ctx.fillRect(x - blackW / 2, 0, blackW, blackH);
        else ctx.fillRect(x, h - 20, this.opts.whiteWidth - 1, 20);
      });
    }
    _onMouse(e, down) {
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const totalWhite = this.opts.octaves * 7;
      const whiteW = this.opts.whiteWidth;
      const whiteIndex = Math.floor(mx / whiteW);
      const octave = Math.floor(whiteIndex / 7);
      const whiteInOctave = whiteIndex % 7;
      const whiteToNote = [0, 2, 4, 5, 7, 9, 11];
      let note = (this.opts.startOctave + octave) * 12 + whiteToNote[whiteInOctave];
      const blackOffsets = [0.7, 1.7, 3.7, 4.7, 5.7];
      const blackNotes = [1, 3, 6, 8, 10];
      for (let i = 0; i < blackOffsets.length; i++) {
        const bx = (octave * 7 + blackOffsets[i]) * whiteW;
        if (Math.abs(mx - bx) < whiteW * 0.3 && my < this._canvas.height * 0.6) {
          note = (this.opts.startOctave + octave) * 12 + blackNotes[i];
        }
      }
      if (down) { this._active.add(note); this._callbacks.forEach(fn => fn({ note, velocity: 100, on: true })); }
      else { this._active.delete(note); this._callbacks.forEach(fn => fn({ note, velocity: 0, on: false })); }
      this._draw();
    }
    onNote(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 走带计数器 ========== */
  class TransportCounter {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TransportCounter: element not found');
      this.opts = Object.assign({ bpm: 120, timeSig: [4, 4], fontSize: 28, color: '#333' }, options);
      this._seconds = 0;
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-transport-counter');
      _setStyles(this.el, { fontFamily: 'monospace', fontSize: _px(this.opts.fontSize), fontWeight: '700', color: this.opts.color, letterSpacing: '2px' });
      this._display = _createEl('span', null, this.el);
      this._updateDisplay();
    }
    _updateDisplay() {
      const totalBeats = this._seconds * (this.opts.bpm / 60);
      const bars = Math.floor(totalBeats / this.opts.timeSig[0]) + 1;
      const beats = Math.floor(totalBeats % this.opts.timeSig[0]) + 1;
      const sixteenths = Math.floor((totalBeats % 1) * 4) + 1;
      this._display.textContent = `${String(bars).padStart(3, '0')}:${String(beats).padStart(2, '0')}:${String(sixteenths).padStart(2, '0')}`;
    }
    setTime(seconds) {
      this._seconds = seconds;
      this._updateDisplay();
    }
    start() {
      if (this._running) return;
      this._running = true;
      let last = performance.now();
      const tick = (now) => {
        if (!this._running) return;
        const dt = (now - last) / 1000;
        last = now;
        this._seconds += dt;
        this._updateDisplay();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    stop() { this._running = false; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== dB 刻度尺 ========== */
  class DBScale {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('DBScale: element not found');
      this.opts = Object.assign({ width: 40, height: 200, minDB: -60, maxDB: 6, color: '#888' }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-db-scale');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.opts.color;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const dbs = [0, -6, -12, -18, -24, -36, -48, -60];
      dbs.forEach(db => {
        if (db < this.opts.minDB || db > this.opts.maxDB) return;
        const t = (db - this.opts.minDB) / (this.opts.maxDB - this.opts.minDB);
        const y = (1 - t) * h;
        ctx.beginPath(); ctx.moveTo(w - 10, y); ctx.lineTo(w, y); ctx.strokeStyle = this.opts.color; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillText(String(db), w - 12, y + 3);
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 弯音轮 ========== */
  class PitchBendWheel {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PitchBendWheel: element not found');
      this.opts = Object.assign({ width: 40, height: 120, color: 'var(--accent, #5b4dff)' }, options);
      this._value = 0;
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-pitch-bend');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), userSelect: 'none', touchAction: 'none' });
      this._track = _createEl('div', null, this.el);
      _setStyles(this._track, { position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '10%', width: '4px', height: '80%', background: 'rgba(0,0,0,0.08)', borderRadius: '2px' });
      this._thumb = _createEl('div', null, this.el);
      _setStyles(this._thumb, { position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)', width: '24px', height: '14px', borderRadius: '7px', background: '#fff', border: `2px solid ${this.opts.color}`, cursor: 'ns-resize', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' });
      this._updateUI();
      const start = (e) => { this._dragging = true; this._move(e); document.body.style.cursor = 'ns-resize'; };
      const move = (e) => { if (!this._dragging) return; this._move(e); };
      const end = () => { this._dragging = false; document.body.style.cursor = ''; this.setValue(0); };
      this._thumb.addEventListener('mousedown', start);
      this._track.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
    }
    _move(e) {
      const rect = this.el.getBoundingClientRect();
      const y = _clamp(1 - (e.clientY - rect.top - rect.height * 0.1) / (rect.height * 0.8), -1, 1);
      this.setValue(y);
    }
    _updateUI() {
      const t = (1 - this._value) * 0.5;
      this._thumb.style.top = _px(0.1 * this.opts.height + t * 0.8 * this.opts.height);
    }
    setValue(v) {
      this._value = _clamp(v, -1, 1);
      this._updateUI();
      this._callbacks.forEach(fn => fn(this._value));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 迷你条形图 ========== */
  class MiniBarChart {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MiniBarChart: element not found');
      this.opts = Object.assign({ width: 200, height: 60, barColor: 'var(--accent, #5b4dff)', barGap: 2 }, options);
      this._data = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-mini-bar-chart');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
    }
    setData(arr) {
      this._data = arr.slice();
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const max = Math.max(1, ...this._data.map(Math.abs));
      const barW = (w - (this._data.length - 1) * this.opts.barGap) / this._data.length;
      this._data.forEach((v, i) => {
        const bh = (Math.abs(v) / max) * h;
        const x = i * (barW + this.opts.barGap);
        const y = v >= 0 ? h - bh : h / 2;
        ctx.fillStyle = this.opts.barColor;
        ctx.fillRect(x, y, barW, bh);
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 迷你折线图 ========== */
  class MiniLineChart {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MiniLineChart: element not found');
      this.opts = Object.assign({ width: 200, height: 60, color: 'var(--accent, #5b4dff)', fillAlpha: 0.15 }, options);
      this._data = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-mini-line-chart');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
    }
    setData(arr) {
      this._data = arr.slice();
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (this._data.length < 2) return;
      const min = Math.min(...this._data);
      const max = Math.max(...this._data);
      const range = max - min || 1;
      ctx.strokeStyle = this.opts.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      this._data.forEach((v, i) => {
        const x = (i / (this._data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = this.opts.color;
      ctx.globalAlpha = this.opts.fillAlpha;
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 可调整面板 ========== */
  class ResizablePanel {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ResizablePanel: element not found');
      this.opts = Object.assign({ direction: 'horizontal', minSize: 100, defaultSize: 200 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-resizable-panel');
      _setStyles(this.el, { display: 'flex', flexDirection: this.opts.direction === 'horizontal' ? 'row' : 'column', overflow: 'hidden' });
      this._paneA = _createEl('div', 'ql-resize-pane-a', this.el);
      _setStyles(this._paneA, { [this.opts.direction === 'horizontal' ? 'width' : 'height']: _px(this.opts.defaultSize), overflow: 'auto' });
      this._resizer = _createEl('div', 'ql-resizer', this.el);
      _setStyles(this._resizer, {
        [this.opts.direction === 'horizontal' ? 'width' : 'height']: '6px',
        [this.opts.direction === 'horizontal' ? 'height' : 'width']: '100%',
        cursor: this.opts.direction === 'horizontal' ? 'col-resize' : 'row-resize',
        background: 'rgba(0,0,0,0.04)',
        flexShrink: '0'
      });
      this._paneB = _createEl('div', 'ql-resize-pane-b', this.el);
      _setStyles(this._paneB, { flex: '1', overflow: 'auto' });
      let startPos = 0, startSize = 0;
      const onStart = (e) => {
        startPos = this.opts.direction === 'horizontal' ? e.clientX : e.clientY;
        startSize = this.opts.direction === 'horizontal' ? this._paneA.offsetWidth : this._paneA.offsetHeight;
        document.body.style.cursor = this.opts.direction === 'horizontal' ? 'col-resize' : 'row-resize';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
      };
      const onMove = (e) => {
        const pos = this.opts.direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = pos - startPos;
        const newSize = Math.max(this.opts.minSize, startSize + delta);
        this._paneA.style[this.opts.direction === 'horizontal' ? 'width' : 'height'] = _px(newSize);
        this._callbacks.forEach(fn => fn({ size: newSize }));
      };
      const onEnd = () => {
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
      };
      this._resizer.addEventListener('mousedown', onStart);
    }
    setPaneAContent(el) { this._paneA.appendChild(el); }
    setPaneBContent(el) { this._paneB.appendChild(el); }
    onResize(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  // 注册
  QI.EnvelopeCanvas = EnvelopeCanvas;
  QI.SpectrumWaterfall = SpectrumWaterfall;
  QI.XYScope = XYScope;
  QI.PhaseMeter = PhaseMeter;
  QI.CorrelationMeter = CorrelationMeter;
  QI.MultiBandMeter = MultiBandMeter;
  QI.ParametricEQCanvas = ParametricEQCanvas;
  QI.CompressorCurve = CompressorCurve;
  QI.StereoPanner2D = StereoPanner2D;
  QI.TimeRuler = TimeRuler;
  QI.BPMTap = BPMTap;
  QI.TunerCanvas = TunerCanvas;
  QI.Oscilloscope3D = Oscilloscope3D;
  QI.Spectrogram = Spectrogram;
  QI.LoopRegion = LoopRegion;
  QI.Crossfader = Crossfader;
  QI.MIDIKeyboard = MIDIKeyboard;
  QI.TransportCounter = TransportCounter;
  QI.DBScale = DBScale;
  QI.PitchBendWheel = PitchBendWheel;
  QI.MiniBarChart = MiniBarChart;
  QI.MiniLineChart = MiniLineChart;
  QI.ResizablePanel = ResizablePanel;
})(QingluanUI);

/* ================= 追加组件 v3.3 (工具与布局组件) ================= */
(function(QI) {
  'use strict';
  function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function _px(n) { return n + 'px'; }
  function _createEl(tag, cls, parent) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }
  function _setStyles(el, styles) { Object.assign(el.style, styles); }

  /* ========== 工具栏 ========== */
  class Toolbar {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Toolbar: element not found');
      this.opts = Object.assign({ height: 40, bg: 'rgba(0,0,0,0.03)' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-toolbar');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', gap: '4px', height: _px(this.opts.height), padding: '0 8px', background: this.opts.bg, borderBottom: '1px solid rgba(0,0,0,0.06)' });
    }
    addButton(label, icon, onClick) {
      const btn = _createEl('button', 'ql-toolbar-btn', this.el);
      _setStyles(btn, { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', border: 'none', borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#555' });
      if (icon) { const s = _createEl('span', null, btn); s.textContent = icon; }
      const t = _createEl('span', null, btn); t.textContent = label;
      btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(0,0,0,0.05)');
      btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
      btn.addEventListener('click', () => { if (onClick) onClick(); this._callbacks.forEach(fn => fn({ type: 'click', label })); });
      return btn;
    }
    addSeparator() {
      const sep = _createEl('div', null, this.el);
      _setStyles(sep, { width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' });
    }
    onAction(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 搜索框 ========== */
  class SearchBox {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SearchBox: element not found');
      this.opts = Object.assign({ placeholder: '搜索...', width: 220 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-search-box');
      _setStyles(this.el, { position: 'relative', display: 'inline-block', width: _px(this.opts.width) });
      this._input = _createEl('input', null, this.el);
      this._input.type = 'text';
      this._input.placeholder = this.opts.placeholder;
      _setStyles(this._input, { width: '100%', padding: '6px 10px 6px 28px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '6px', outline: 'none', fontSize: '13px' });
      const icon = _createEl('span', null, this.el);
      icon.textContent = '🔍';
      _setStyles(icon, { position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', opacity: '0.5' });
      this._input.addEventListener('input', () => this._callbacks.forEach(fn => fn({ value: this._input.value })));
      this._input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._callbacks.forEach(fn => fn({ value: this._input.value, submit: true })); });
    }
    getValue() { return this._input.value; }
    setValue(v) { this._input.value = v; }
    onSearch(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 开关 ========== */
  class ToggleSwitch {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ToggleSwitch: element not found');
      this.opts = Object.assign({ width: 40, height: 22, on: false, color: 'var(--accent, #5b4dff)' }, options);
      this._on = this.opts.on;
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-toggle');
      _setStyles(this.el, { position: 'relative', display: 'inline-block', width: _px(this.opts.width), height: _px(this.opts.height), cursor: 'pointer' });
      this._track = _createEl('div', null, this.el);
      _setStyles(this._track, { width: '100%', height: '100%', borderRadius: _px(this.opts.height / 2), background: this._on ? this.opts.color : 'rgba(0,0,0,0.15)', transition: 'background 0.2s' });
      this._thumb = _createEl('div', null, this.el);
      _setStyles(this._thumb, { position: 'absolute', top: '2px', left: this._on ? _px(this.opts.width - this.opts.height + 2) : '2px', width: _px(this.opts.height - 4), height: _px(this.opts.height - 4), borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' });
      this.el.addEventListener('click', () => { this.setOn(!this._on); });
    }
    setOn(v) {
      if (v === this._on) return;
      this._on = v;
      this._track.style.background = this._on ? this.opts.color : 'rgba(0,0,0,0.15)';
      this._thumb.style.left = this._on ? _px(this.opts.width - this.opts.height + 2) : '2px';
      this._callbacks.forEach(fn => fn(this._on));
    }
    getOn() { return this._on; }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 单选组 ========== */
  class RadioGroup {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('RadioGroup: element not found');
      this.opts = Object.assign({ options: [], selected: 0 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-radio-group');
      _setStyles(this.el, { display: 'inline-flex', gap: '8px', flexWrap: 'wrap' });
      this._buttons = [];
      this.opts.options.forEach((opt, i) => {
        const btn = _createEl('button', 'ql-radio-btn', this.el);
        btn.textContent = opt;
        _setStyles(btn, { padding: '5px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '6px', background: i === this.opts.selected ? 'var(--accent, #5b4dff)' : '#fff', color: i === this.opts.selected ? '#fff' : '#555', cursor: 'pointer', fontSize: '12px' });
        btn.addEventListener('click', () => this._select(i));
        this._buttons.push(btn);
      });
    }
    _select(i) {
      this.opts.selected = i;
      this._buttons.forEach((btn, idx) => {
        btn.style.background = idx === i ? 'var(--accent, #5b4dff)' : '#fff';
        btn.style.color = idx === i ? '#fff' : '#555';
      });
      this._callbacks.forEach(fn => fn({ index: i, value: this.opts.options[i] }));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 复选组 ========== */
  class CheckboxGroup {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CheckboxGroup: element not found');
      this.opts = Object.assign({ options: [], checked: [] }, options);
      this._state = this.opts.checked.slice();
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-checkbox-group');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', gap: '6px' });
      this.opts.options.forEach((opt, i) => {
        const row = _createEl('label', 'ql-checkbox-row', this.el);
        _setStyles(row, { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#444' });
        const box = _createEl('input', null, row);
        box.type = 'checkbox';
        box.checked = this._state[i] || false;
        box.addEventListener('change', () => {
          this._state[i] = box.checked;
          this._callbacks.forEach(fn => fn({ index: i, checked: box.checked, values: this.getChecked() }));
        });
        const label = _createEl('span', null, row);
        label.textContent = opt;
      });
    }
    getChecked() {
      return this.opts.options.filter((_, i) => this._state[i]);
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 数字步进器 ========== */
  class NumberStepper {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('NumberStepper: element not found');
      this.opts = Object.assign({ min: 0, max: 100, value: 0, step: 1, width: 100 }, options);
      this._value = _clamp(this.opts.value, this.opts.min, this.opts.max);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-number-stepper');
      _setStyles(this.el, { display: 'inline-flex', alignItems: 'center', gap: '2px' });
      this._input = _createEl('input', null, this.el);
      this._input.type = 'number';
      this._input.min = this.opts.min;
      this._input.max = this.opts.max;
      this._input.step = this.opts.step;
      this._input.value = this._value;
      _setStyles(this._input, { width: _px(this.opts.width), padding: '4px 6px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', textAlign: 'center', fontSize: '13px' });
      const up = _createEl('button', null, this.el);
      up.textContent = '▲';
      _setStyles(up, { width: '24px', height: '16px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '3px', background: '#fff', cursor: 'pointer', fontSize: '8px' });
      up.addEventListener('click', () => this.setValue(this._value + this.opts.step));
      const down = _createEl('button', null, this.el);
      down.textContent = '▼';
      _setStyles(down, { width: '24px', height: '16px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '3px', background: '#fff', cursor: 'pointer', fontSize: '8px' });
      down.addEventListener('click', () => this.setValue(this._value - this.opts.step));
      this._input.addEventListener('change', () => this.setValue(parseFloat(this._input.value) || 0));
    }
    setValue(v) {
      v = _clamp(Math.round(v / this.opts.step) * this.opts.step, this.opts.min, this.opts.max);
      if (v === this._value) return;
      this._value = v;
      this._input.value = v;
      this._callbacks.forEach(fn => fn(v));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 文件拖放区 ========== */
  class FileDropZone {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('FileDropZone: element not found');
      this.opts = Object.assign({ accept: 'audio/*', height: 120 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-file-drop');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', justifyContent: 'center', height: _px(this.opts.height), border: '2px dashed rgba(0,0,0,0.15)', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' });
      this.el.textContent = '拖放文件到此处或点击上传';
      this.el.addEventListener('dragover', (e) => { e.preventDefault(); this.el.style.borderColor = 'var(--accent, #5b4dff)'; this.el.style.background = 'rgba(91,77,255,0.04)'; });
      this.el.addEventListener('dragleave', () => { this.el.style.borderColor = 'rgba(0,0,0,0.15)'; this.el.style.background = ''; });
      this.el.addEventListener('drop', (e) => {
        e.preventDefault();
        this.el.style.borderColor = 'rgba(0,0,0,0.15)'; this.el.style.background = '';
        const files = Array.from(e.dataTransfer.files).filter(f => !this.opts.accept || f.type.match(this.opts.accept.replace('*', '.*')));
        if (files.length) this._callbacks.forEach(fn => fn(files));
      });
      this.el.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = this.opts.accept; inp.multiple = true;
        inp.addEventListener('change', () => { if (inp.files.length) this._callbacks.forEach(fn => fn(Array.from(inp.files))); });
        inp.click();
      });
    }
    onFiles(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 波形概览 ========== */
  class WaveformOverview {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('WaveformOverview: element not found');
      this.opts = Object.assign({ width: 600, height: 60, color: 'var(--accent, #5b4dff)', bg: 'rgba(0,0,0,0.04)' }, options);
      this._peaks = [];
      this._selection = [0, 1];
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-waveform-overview');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', cursor: 'pointer' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      let dragging = null;
      this._canvas.addEventListener('mousedown', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.opts.width;
        const s = this._selection;
        const dStart = Math.abs(x - s[0]); const dEnd = Math.abs(x - s[1]);
        dragging = dStart < dEnd ? 'start' : 'end';
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const rect = this._canvas.getBoundingClientRect();
        const x = _clamp((e.clientX - rect.left) / this.opts.width, 0, 1);
        if (dragging === 'start') this._selection[0] = x; else this._selection[1] = x;
        if (this._selection[0] > this._selection[1]) this._selection.reverse();
        this._draw();
        this._callbacks.forEach(fn => fn({ start: this._selection[0], end: this._selection[1] }));
      });
      window.addEventListener('mouseup', () => dragging = null);
    }
    setPeaks(peaks) { this._peaks = peaks.slice(); this._draw(); }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.opts.bg;
      ctx.fillRect(0, 0, w, h);
      const len = this._peaks.length;
      if (len) {
        ctx.fillStyle = this.opts.color;
        const step = len / w;
        for (let x = 0; x < w; x++) {
          const idx = Math.floor(x * step);
          const peak = this._peaks[idx] || 0;
          const ph = peak * (h / 2);
          ctx.fillRect(x, h / 2 - ph, 1, ph * 2);
        }
      }
      const sx = this._selection[0] * w; const ex = this._selection[1] * w;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, sx, h);
      ctx.fillRect(ex, 0, w - ex, h);
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 时间线标尺 ========== */
  class TimelineRuler {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TimelineRuler: element not found');
      this.opts = Object.assign({ width: 800, height: 24, scale: 1, offset: 0, color: '#888', bg: '#f4f4f5' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-timeline-ruler');
      _setStyles(this.el, { position: 'relative', width: _px(this.opts.width), height: _px(this.opts.height), overflow: 'hidden', background: this.opts.bg });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = (x / this.opts.scale) + this.opts.offset;
        this._callbacks.forEach(fn => fn({ time, x }));
      });
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.opts.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this.opts.color;
      ctx.font = '10px sans-serif';
      const step = 50 / this.opts.scale;
      for (let t = this.opts.offset; t < this.opts.offset + w / this.opts.scale; t += step) {
        const x = (t - this.opts.offset) * this.opts.scale;
        const major = Math.abs(t % (step * 4)) < 0.1;
        ctx.beginPath(); ctx.moveTo(x + 0.5, major ? 0 : h / 2); ctx.lineTo(x + 0.5, h); ctx.strokeStyle = this.opts.color; ctx.lineWidth = 1; ctx.stroke();
        if (major) ctx.fillText(t.toFixed(1), x + 2, 10);
      }
    }
    setScale(scale, offset) { this.opts.scale = scale; this.opts.offset = offset; this._draw(); }
    onSeek(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 和弦检测显示 ========== */
  class ChordDetectorDisplay {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ChordDetectorDisplay: element not found');
      this.opts = Object.assign({ fontSize: 32, color: 'var(--accent, #5b4dff)' }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-chord-display');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px' });
      this._main = _createEl('div', null, this.el);
      _setStyles(this._main, { fontSize: _px(this.opts.fontSize), fontWeight: '700', color: this.opts.color });
      this._main.textContent = '--';
      this._sub = _createEl('div', null, this.el);
      _setStyles(this._sub, { fontSize: '12px', color: '#888', marginTop: '4px' });
      this._sub.textContent = '等待输入...';
    }
    setChord(chord, confidence) {
      this._main.textContent = chord || '--';
      this._sub.textContent = confidence ? `置信度 ${(confidence * 100).toFixed(0)}%` : '等待输入...';
    }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 频率拨盘 ========== */
  class FrequencyDial {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('FrequencyDial: element not found');
      this.opts = Object.assign({ size: 80, min: 20, max: 20000, value: 1000, color: 'var(--accent, #5b4dff)' }, options);
      this._value = this.opts.value;
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-freq-dial');
      _setStyles(this.el, { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.size; this._canvas.height = this.opts.size;
      _setStyles(this._canvas, { display: 'block', cursor: 'ns-resize' });
      this._ctx = this._canvas.getContext('2d');
      this._label = _createEl('span', null, this.el);
      _setStyles(this._label, { fontSize: '11px', color: '#555', fontWeight: '600' });
      this._update();
      let startY = 0, startVal = 0;
      this._canvas.addEventListener('mousedown', (e) => { this._dragging = true; startY = e.clientY; startVal = this._value; document.body.style.cursor = 'ns-resize'; });
      window.addEventListener('mousemove', (e) => {
        if (!this._dragging) return;
        const dy = startY - e.clientY;
        const r = this.opts.max / this.opts.min;
        this.setValue(startVal * Math.pow(r, dy / 200));
      });
      window.addEventListener('mouseup', () => { this._dragging = false; document.body.style.cursor = ''; });
    }
    _update() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2; const cy = h / 2; const r = w / 2 - 6;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 4; ctx.stroke();
      const t = (Math.log10(this._value) - Math.log10(this.opts.min)) / (Math.log10(this.opts.max) - Math.log10(this.opts.min));
      const angle = -Math.PI * 0.75 + t * Math.PI * 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (r - 4) * Math.cos(angle), cy + (r - 4) * Math.sin(angle)); ctx.strokeStyle = this.opts.color; ctx.lineWidth = 3; ctx.stroke();
      this._label.textContent = this._value >= 1000 ? (this._value / 1000).toFixed(1) + 'kHz' : this._value.toFixed(0) + 'Hz';
    }
    setValue(v) {
      this._value = _clamp(v, this.opts.min, this.opts.max);
      this._update();
      this._callbacks.forEach(fn => fn(this._value));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 节拍器闪烁 ========== */
  class MetronomeBlink {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MetronomeBlink: element not found');
      this.opts = Object.assign({ size: 24, bpm: 120, color: 'var(--accent, #5b4dff)' }, options);
      this._running = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-metronome-blink');
      _setStyles(this.el, { display: 'inline-block', width: _px(this.opts.size), height: _px(this.opts.size), borderRadius: '50%', background: 'rgba(0,0,0,0.08)', transition: 'background 0.05s' });
    }
    start() {
      if (this._running) return;
      this._running = true;
      const interval = 60000 / this.opts.bpm;
      let last = performance.now();
      const tick = (now) => {
        if (!this._running) return;
        if (now - last >= interval) {
          last = now;
          this.el.style.background = this.opts.color;
          setTimeout(() => { if (this._running) this.el.style.background = 'rgba(0,0,0,0.08)'; }, 80);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    stop() { this._running = false; this.el.style.background = 'rgba(0,0,0,0.08)'; }
    setBPM(bpm) { this.opts.bpm = bpm; }
    destroy() { this._running = false; this.el.innerHTML = ''; }
  }

  /* ========== 声像法则可视化 ========== */
  class PanLawVisualizer {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PanLawVisualizer: element not found');
      this.opts = Object.assign({ width: 200, height: 80, law: -3 }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-pan-law');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const law = this.opts.law;
      ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x < w; x++) { const pan = (x / w) * 2 - 1; const L = Math.sqrt((1 - pan) * 0.5) * Math.pow(10, law / 20); const y = h - L * h; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = '#2196f3'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x < w; x++) { const pan = (x / w) * 2 - 1; const R = Math.sqrt((1 + pan) * 0.5) * Math.pow(10, law / 20); const y = h - R * h; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    setLaw(law) { this.opts.law = law; this._draw(); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 延迟时间计算器 ========== */
  class DelayTimeCalculator {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('DelayTimeCalculator: element not found');
      this.opts = Object.assign({ bpm: 120 }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-delay-calc');
      _setStyles(this.el, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#555' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      const div = 60000 / this.opts.bpm;
      const notes = [
        { label: '1/1', ms: div * 4 }, { label: '1/2', ms: div * 2 },
        { label: '1/4', ms: div }, { label: '1/8', ms: div / 2 },
        { label: '1/16', ms: div / 4 }, { label: '1/32', ms: div / 8 },
        { label: '1/4T', ms: div * 2 / 3 }, { label: '1/8T', ms: div / 3 },
        { label: '1/16T', ms: div / 6 }, { label: '1/4D', ms: div * 1.5 },
        { label: '1/8D', ms: div * 0.75 }, { label: '1/16D', ms: div * 0.375 }
      ];
      notes.forEach(n => {
        const row = _createEl('div', null, this.el);
        _setStyles(row, { padding: '4px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' });
        const l = _createEl('span', null, row); l.textContent = n.label;
        const v = _createEl('span', null, row); v.textContent = n.ms.toFixed(1) + 'ms';
      });
    }
    setBPM(bpm) { this.opts.bpm = bpm; this._render(); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 音量自动化 Lane ========== */
  class VolumeAutomationLane {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('VolumeAutomationLane: element not found');
      this.opts = Object.assign({ width: 600, height: 60, points: [], color: 'var(--accent, #5b4dff)' }, options);
      this._points = this.opts.points.slice();
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-vol-auto-lane');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block', cursor: 'crosshair' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => this._addOrRemove(e));
    }
    _addOrRemove(e) {
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const idx = this._points.findIndex(p => Math.abs(p.x * this.opts.width - mx) < 8 && Math.abs(p.y * this.opts.height - my) < 8);
      if (idx >= 0) this._points.splice(idx, 1); else this._points.push({ x: mx / this.opts.width, y: my / this.opts.height });
      this._points.sort((a, b) => a.x - b.x);
      this._draw();
      this._callbacks.forEach(fn => fn(this._points.slice()));
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      ctx.fillRect(0, 0, w, h);
      if (this._points.length > 1) {
        ctx.strokeStyle = this.opts.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        this._points.forEach((p, i) => { const x = p.x * w; const y = p.y * h; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.stroke();
      }
      this._points.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = this.opts.color; ctx.lineWidth = 2; ctx.stroke();
      });
    }
    setPoints(pts) { this._points = pts.slice(); this._draw(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== Mute/Solo 按钮组 ========== */
  class MuteSoloGroup {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MuteSoloGroup: element not found');
      this.opts = Object.assign({ tracks: 8 }, options);
      this._state = Array.from({ length: this.opts.tracks }, () => ({ mute: false, solo: false }));
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-mute-solo-group');
      _setStyles(this.el, { display: 'flex', gap: '2px' });
      this._state.forEach((s, i) => {
        const col = _createEl('div', null, this.el);
        _setStyles(col, { display: 'flex', flexDirection: 'column', gap: '2px' });
        const m = _createEl('button', null, col); m.textContent = 'M';
        _setStyles(m, { width: '22px', height: '18px', fontSize: '9px', border: 'none', borderRadius: '3px', cursor: 'pointer', background: s.mute ? '#ff5252' : 'rgba(0,0,0,0.06)', color: s.mute ? '#fff' : '#555' });
        m.addEventListener('click', () => { s.mute = !s.mute; this._update(i); });
        const so = _createEl('button', null, col); so.textContent = 'S';
        _setStyles(so, { width: '22px', height: '18px', fontSize: '9px', border: 'none', borderRadius: '3px', cursor: 'pointer', background: s.solo ? '#ffc107' : 'rgba(0,0,0,0.06)', color: s.solo ? '#333' : '#555' });
        so.addEventListener('click', () => { s.solo = !s.solo; this._update(i); });
      });
    }
    _update(i) {
      const col = this.el.children[i];
      const m = col.children[0]; const so = col.children[1];
      const s = this._state[i];
      m.style.background = s.mute ? '#ff5252' : 'rgba(0,0,0,0.06)'; m.style.color = s.mute ? '#fff' : '#555';
      so.style.background = s.solo ? '#ffc107' : 'rgba(0,0,0,0.06)'; so.style.color = s.solo ? '#333' : '#555';
      this._callbacks.forEach(fn => fn({ index: i, state: Object.assign({}, s) }));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  /* ========== 轨道 Lane ========== */
  class TrackLane {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TrackLane: element not found');
      this.opts = Object.assign({ width: 600, height: 40, clips: [], color: 'var(--accent, #5b4dff)' }, options);
      this._clips = this.opts.clips.slice();
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-track-lane');
      _setStyles(this.el, { display: 'inline-block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx;
      const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(0, 0, w, h);
      this._clips.forEach(c => {
        const x = c.start * w; const cw = (c.end - c.start) * w;
        ctx.fillStyle = this.opts.color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, 2, cw, h - 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText(c.name || 'Clip', x + 4, h - 6);
      });
    }
    setClips(clips) { this._clips = clips.slice(); this._draw(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  // 注册
  QI.Toolbar = Toolbar;
  QI.SearchBox = SearchBox;
  QI.ToggleSwitch = ToggleSwitch;
  QI.RadioGroup = RadioGroup;
  QI.CheckboxGroup = CheckboxGroup;
  QI.NumberStepper = NumberStepper;
  QI.FileDropZone = FileDropZone;
  QI.WaveformOverview = WaveformOverview;
  QI.TimelineRuler = TimelineRuler;
  QI.ChordDetectorDisplay = ChordDetectorDisplay;
  QI.FrequencyDial = FrequencyDial;
  QI.MetronomeBlink = MetronomeBlink;
  QI.PanLawVisualizer = PanLawVisualizer;
  QI.DelayTimeCalculator = DelayTimeCalculator;
  QI.VolumeAutomationLane = VolumeAutomationLane;
  QI.MuteSoloGroup = MuteSoloGroup;
  QI.TrackLane = TrackLane;

  /* ================= v3.4 布局与导航组件 ================= */

  class SplitPanel {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SplitPanel: element not found');
      this.opts = Object.assign({ direction: 'horizontal', split: 0.5, minSize: 80 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-split-panel');
      _setStyles(this.el, { display: 'flex', flexDirection: this.opts.direction === 'horizontal' ? 'row' : 'column', overflow: 'hidden' });
      this._pane1 = _createEl('div', null, this.el);
      _setStyles(this._pane1, { flex: 'none', overflow: 'auto' });
      this._resizer = _createEl('div', null, this.el);
      _setStyles(this._resizer, { flex: 'none', background: 'rgba(0,0,0,0.08)', cursor: this.opts.direction === 'horizontal' ? 'col-resize' : 'row-resize', [this.opts.direction === 'horizontal' ? 'width' : 'height']: '6px' });
      this._pane2 = _createEl('div', null, this.el);
      _setStyles(this._pane2, { flex: '1 1 auto', overflow: 'auto' });
      this._updateSizes();
      this._bindEvents();
    }
    _updateSizes() {
      const total = this.opts.direction === 'horizontal' ? this.el.clientWidth : this.el.clientHeight;
      const size = Math.max(this.opts.minSize, Math.min(total - this.opts.minSize, total * this.opts.split));
      if (this.opts.direction === 'horizontal') { this._pane1.style.width = size + 'px'; this._pane1.style.height = '100%'; } else { this._pane1.style.height = size + 'px'; this._pane1.style.width = '100%'; }
    }
    _bindEvents() {
      let dragging = false;
      const onMove = (e) => {
        if (!dragging) return;
        const rect = this.el.getBoundingClientRect();
        const pos = this.opts.direction === 'horizontal' ? e.clientX - rect.left : e.clientY - rect.top;
        this.opts.split = Math.max(this.opts.minSize, Math.min(rect.width - this.opts.minSize, pos)) / (this.opts.direction === 'horizontal' ? rect.width : rect.height);
        this._updateSizes();
      };
      const onUp = () => { dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      this._resizer.addEventListener('mousedown', (e) => { dragging = true; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); });
    }
    setSplit(v) { this.opts.split = v; this._updateSizes(); }
    onResize(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class DockPanel {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('DockPanel: element not found');
      this.opts = Object.assign({ tabs: [], activeIndex: 0 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-dock-panel');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', overflow: 'hidden' });
      this._header = _createEl('div', null, this.el);
      _setStyles(this._header, { display: 'flex', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' });
      this._body = _createEl('div', null, this.el);
      _setStyles(this._body, { flex: '1', position: 'relative' });
      this._tabs = [];
      this.opts.tabs.forEach((t, i) => this._addTab(t, i));
      this.setActive(this.opts.activeIndex);
    }
    _addTab(tab, index) {
      const btn = _createEl('button', null, this._header);
      btn.textContent = tab.label || 'Tab';
      _setStyles(btn, { padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', borderBottom: '2px solid transparent' });
      btn.addEventListener('click', () => this.setActive(index));
      const pane = _createEl('div', null, this._body);
      _setStyles(pane, { position: 'absolute', inset: '0', display: 'none', padding: '8px', overflow: 'auto' });
      if (tab.content) pane.appendChild(tab.content);
      this._tabs.push({ btn, pane });
    }
    setActive(index) {
      this._tabs.forEach((t, i) => {
        const active = i === index;
        t.pane.style.display = active ? 'block' : 'none';
        t.btn.style.borderBottomColor = active ? 'var(--accent, #5b4dff)' : 'transparent';
        t.btn.style.color = active ? 'var(--accent, #5b4dff)' : '#333';
      });
      this._callbacks.forEach(fn => fn({ index }));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class Breadcrumb {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Breadcrumb: element not found');
      this.opts = Object.assign({ items: [], separator: '/' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-breadcrumb');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.items.forEach((item, i) => {
        const span = _createEl('span', null, this.el);
        span.textContent = item.label;
        _setStyles(span, { cursor: 'pointer', color: i === this.opts.items.length - 1 ? '#333' : 'var(--accent, #5b4dff)' });
        span.addEventListener('click', () => this._callbacks.forEach(fn => fn({ index: i, item })));
        if (i < this.opts.items.length - 1) {
          const sep = _createEl('span', null, this.el);
          sep.textContent = this.opts.separator;
          _setStyles(sep, { color: '#999', margin: '0 2px' });
        }
      });
    }
    setItems(items) { this.opts.items = items; this._render(); }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class Pagination {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Pagination: element not found');
      this.opts = Object.assign({ total: 100, pageSize: 10, current: 1 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-pagination');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', gap: '4px' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      const pages = Math.ceil(this.opts.total / this.opts.pageSize);
      const mkBtn = (label, page, disabled) => {
        const b = _createEl('button', null, this.el);
        b.textContent = label;
        _setStyles(b, { minWidth: '28px', height: '28px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', background: page === this.opts.current ? 'var(--accent, #5b4dff)' : '#fff', color: page === this.opts.current ? '#fff' : '#333', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 });
        if (!disabled) b.addEventListener('click', () => this.setPage(page));
      };
      mkBtn('Prev', this.opts.current - 1, this.opts.current <= 1);
      for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - this.opts.current) <= 1) mkBtn(String(i), i, false); else if (Math.abs(i - this.opts.current) === 2) { const s = _createEl('span', null, this.el); s.textContent = '...'; _setStyles(s, { padding: '0 4px' }); } }
      mkBtn('Next', this.opts.current + 1, this.opts.current >= pages);
    }
    setPage(p) {
      const pages = Math.ceil(this.opts.total / this.opts.pageSize);
      if (p < 1 || p > pages) return;
      this.opts.current = p; this._render();
      this._callbacks.forEach(fn => fn({ current: p }));
    }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class Badge {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Badge: element not found');
      this.opts = Object.assign({ text: '', color: '#ff5252', dot: false }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-badge');
      _setStyles(this.el, { position: 'relative', display: 'inline-block' });
      this._badge = _createEl('span', null, this.el);
      _setStyles(this._badge, { position: 'absolute', top: '-4px', right: '-4px', background: this.opts.color, color: '#fff', fontSize: '10px', lineHeight: '1', padding: this.opts.dot ? '4px' : '2px 6px', borderRadius: '999px', minWidth: '14px', textAlign: 'center' });
      if (!this.opts.dot) this._badge.textContent = this.opts.text;
    }
    setText(v) { this.opts.text = v; this.opts.dot = false; this._badge.textContent = v; this._badge.style.padding = '2px 6px'; }
    setDot(v) { this.opts.dot = v; this._badge.textContent = ''; this._badge.style.padding = v ? '4px' : '2px 6px'; }
    destroy() { if (this._badge && this._badge.parentNode) this._badge.parentNode.removeChild(this._badge); }
  }

  class Avatar {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Avatar: element not found');
      this.opts = Object.assign({ src: '', name: '', size: 40, round: true }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-avatar');
      _setStyles(this.el, { width: _px(this.opts.size), height: _px(this.opts.size), borderRadius: this.opts.round ? '50%' : '4px', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', color: '#555', fontSize: _px(this.opts.size * 0.4), fontWeight: '600' });
      if (this.opts.src) {
        const img = _createEl('img', null, this.el);
        img.src = this.opts.src;
        _setStyles(img, { width: '100%', height: '100%', objectFit: 'cover' });
      } else {
        this.el.textContent = (this.opts.name || 'U').charAt(0).toUpperCase();
      }
    }
    setSrc(v) { this.opts.src = v; this.el.innerHTML = ''; this._init(); }
    destroy() { this.el.innerHTML = ''; }
  }

  class Card {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Card: element not found');
      this.opts = Object.assign({ title: '', content: null, padding: 12, shadow: true }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-card');
      _setStyles(this.el, { background: '#fff', borderRadius: '8px', padding: _px(this.opts.padding), boxShadow: this.opts.shadow ? '0 2px 8px rgba(0,0,0,0.06)' : 'none', border: '1px solid rgba(0,0,0,0.06)' });
      if (this.opts.title) {
        const t = _createEl('div', null, this.el);
        t.textContent = this.opts.title;
        _setStyles(t, { fontWeight: '600', marginBottom: '8px', fontSize: '14px' });
      }
      this._body = _createEl('div', null, this.el);
      if (this.opts.content) this._body.appendChild(this.opts.content);
    }
    setContent(node) { this._body.innerHTML = ''; this._body.appendChild(node); }
    destroy() { this.el.innerHTML = ''; }
  }

  class ListView {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ListView: element not found');
      this.opts = Object.assign({ items: [], selectable: true, multi: false }, options);
      this._callbacks = [];
      this._selected = new Set();
      this._init();
    }
    _init() {
      this.el.classList.add('ql-list-view');
      _setStyles(this.el, { listStyle: 'none', margin: '0', padding: '0', overflow: 'auto' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.items.forEach((item, i) => {
        const li = _createEl('li', null, this.el);
        li.textContent = typeof item === 'string' ? item : item.label;
        _setStyles(li, { padding: '8px 10px', cursor: 'pointer', borderRadius: '4px', userSelect: 'none', background: this._selected.has(i) ? 'rgba(91,77,255,0.1)' : 'transparent', color: this._selected.has(i) ? 'var(--accent, #5b4dff)' : '#333' });
        li.addEventListener('click', (e) => {
          if (this.opts.multi && e.ctrlKey) { this._selected.has(i) ? this._selected.delete(i) : this._selected.add(i); }
          else { this._selected.clear(); this._selected.add(i); }
          this._render();
          this._callbacks.forEach(fn => fn({ indices: Array.from(this._selected), item }));
        });
      });
    }
    setItems(items) { this.opts.items = items; this._selected.clear(); this._render(); }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class GridView {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('GridView: element not found');
      this.opts = Object.assign({ items: [], cols: 4, gap: 8 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-grid-view');
      _setStyles(this.el, { display: 'grid', gridTemplateColumns: `repeat(${this.opts.cols}, 1fr)`, gap: _px(this.opts.gap), overflow: 'auto' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.items.forEach((item, i) => {
        const cell = _createEl('div', null, this.el);
        _setStyles(cell, { background: 'rgba(0,0,0,0.03)', borderRadius: '6px', padding: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '12px' });
        cell.textContent = typeof item === 'string' ? item : item.label;
        cell.addEventListener('click', () => this._callbacks.forEach(fn => fn({ index: i, item })));
      });
    }
    setItems(items) { this.opts.items = items; this._render(); }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class PropertyGrid {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PropertyGrid: element not found');
      this.opts = Object.assign({ properties: [] }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-property-grid');
      _setStyles(this.el, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.properties.forEach(p => {
        const nameCell = _createEl('div', null, this.el);
        nameCell.textContent = p.name;
        _setStyles(nameCell, { padding: '6px 8px', background: '#fafafa', fontSize: '12px', color: '#666' });
        const valCell = _createEl('div', null, this.el);
        valCell.textContent = p.value;
        _setStyles(valCell, { padding: '6px 8px', background: '#fff', fontSize: '12px', color: '#333' });
      });
    }
    setProperties(props) { this.opts.properties = props; this._render(); }
    destroy() { this.el.innerHTML = ''; }
  }

  class StatusBar {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('StatusBar: element not found');
      this.opts = Object.assign({ height: 24, sections: [] }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-status-bar');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', height: _px(this.opts.height), padding: '0 10px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '11px', color: '#666', gap: '12px' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.sections.forEach(s => {
        const span = _createEl('span', null, this.el);
        span.textContent = s;
        _setStyles(span, { whiteSpace: 'nowrap' });
      });
    }
    setSections(arr) { this.opts.sections = arr; this._render(); }
    destroy() { this.el.innerHTML = ''; }
  }

  class MenuBar {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MenuBar: element not found');
      this.opts = Object.assign({ menus: [] }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-menu-bar');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', gap: '2px', padding: '0 6px', height: '32px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.menus.forEach((m, i) => {
        const btn = _createEl('button', null, this.el);
        btn.textContent = m.label;
        _setStyles(btn, { border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', borderRadius: '4px' });
        btn.addEventListener('click', () => this._callbacks.forEach(fn => fn({ index: i, menu: m })));
      });
    }
    setMenus(menus) { this.opts.menus = menus; this._render(); }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class CommandPalette {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CommandPalette: element not found');
      this.opts = Object.assign({ commands: [], placeholder: 'Type a command...' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-command-palette');
      _setStyles(this.el, { display: 'none', position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', width: '420px', maxHeight: '320px', background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 9999, flexDirection: 'column' });
      this._input = _createEl('input', null, this.el);
      _setStyles(this._input, { width: '100%', padding: '10px 12px', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', outline: 'none', fontSize: '13px' });
      this._input.placeholder = this.opts.placeholder;
      this._list = _createEl('div', null, this.el);
      _setStyles(this._list, { overflow: 'auto', flex: '1' });
      this._input.addEventListener('input', () => this._filter());
      this._input.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
      this._filter();
    }
    _filter() {
      const q = this._input.value.toLowerCase();
      this._list.innerHTML = '';
      this.opts.commands.filter(c => c.label.toLowerCase().includes(q)).forEach((c, i) => {
        const row = _createEl('div', null, this._list);
        row.textContent = c.label;
        _setStyles(row, { padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.03)' });
        row.addEventListener('click', () => { this._callbacks.forEach(fn => fn({ command: c })); this.hide(); });
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(0,0,0,0.03)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
      });
    }
    show() { this.el.style.display = 'flex'; this._input.focus(); }
    hide() { this.el.style.display = 'none'; this._input.value = ''; this._filter(); }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class ShortcutHint {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('ShortcutHint: element not found');
      this.opts = Object.assign({ keys: [], label: '' }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-shortcut-hint');
      _setStyles(this.el, { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#888' });
      if (this.opts.label) {
        const span = _createEl('span', null, this.el);
        span.textContent = this.opts.label;
      }
      this.opts.keys.forEach((k, i) => {
        const key = _createEl('kbd', null, this.el);
        key.textContent = k;
        _setStyles(key, { display: 'inline-block', padding: '2px 6px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', boxShadow: '0 1px 0 rgba(0,0,0,0.1)' });
        if (i < this.opts.keys.length - 1) {
          const plus = _createEl('span', null, this.el);
          plus.textContent = '+';
          _setStyles(plus, { margin: '0 2px' });
        }
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class FloatingPanel {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('FloatingPanel: element not found');
      this.opts = Object.assign({ x: 100, y: 100, width: 280, title: 'Panel' }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-floating-panel');
      _setStyles(this.el, { position: 'absolute', left: _px(this.opts.x), top: _px(this.opts.y), width: _px(this.opts.width), background: '#fff', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 1000 });
      this._header = _createEl('div', null, this.el);
      _setStyles(this._header, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'move', userSelect: 'none' });
      this._header.textContent = this.opts.title;
      const close = _createEl('button', null, this._header);
      close.textContent = '×';
      _setStyles(close, { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#999' });
      close.addEventListener('click', () => { this.el.style.display = 'none'; });
      this._body = _createEl('div', null, this.el);
      _setStyles(this._body, { padding: '10px', minHeight: '60px' });
      this._bindDrag();
    }
    _bindDrag() {
      let dragging = false, ox, oy;
      this._header.addEventListener('mousedown', (e) => { dragging = true; ox = e.clientX - this.el.offsetLeft; oy = e.clientY - this.el.offsetTop; });
      window.addEventListener('mousemove', (e) => { if (!dragging) return; this.el.style.left = (e.clientX - ox) + 'px'; this.el.style.top = (e.clientY - oy) + 'px'; });
      window.addEventListener('mouseup', () => { dragging = false; });
    }
    setContent(node) { this._body.innerHTML = ''; this._body.appendChild(node); }
    show() { this.el.style.display = 'block'; }
    hide() { this.el.style.display = 'none'; }
    destroy() { this.el.innerHTML = ''; }
  }

  class Popover {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Popover: element not found');
      this.opts = Object.assign({ placement: 'top', content: null, trigger: 'click' }, options);
      this._visible = false;
      this._init();
    }
    _init() {
      this._pop = _createEl('div', null, document.body);
      _setStyles(this._pop, { position: 'absolute', display: 'none', background: '#fff', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '8px', zIndex: 9999, fontSize: '12px' });
      if (this.opts.content) this._pop.appendChild(this.opts.content);
      if (this.opts.trigger === 'click') {
        this.el.addEventListener('click', () => this.toggle());
      } else {
        this.el.addEventListener('mouseenter', () => this.show());
        this.el.addEventListener('mouseleave', () => this.hide());
      }
      document.addEventListener('click', (e) => { if (!this.el.contains(e.target) && !this._pop.contains(e.target)) this.hide(); });
    }
    _position() {
      const rect = this.el.getBoundingClientRect();
      const p = this._pop.getBoundingClientRect();
      let top = rect.top + window.scrollY, left = rect.left + window.scrollX;
      if (this.opts.placement === 'top') top -= p.height + 6;
      if (this.opts.placement === 'bottom') top += rect.height + 6;
      if (this.opts.placement === 'left') left -= p.width + 6;
      if (this.opts.placement === 'right') left += rect.width + 6;
      this._pop.style.top = top + 'px';
      this._pop.style.left = left + 'px';
    }
    show() { this._visible = true; this._pop.style.display = 'block'; this._position(); }
    hide() { this._visible = false; this._pop.style.display = 'none'; }
    toggle() { this._visible ? this.hide() : this.show(); }
    destroy() { if (this._pop && this._pop.parentNode) this._pop.parentNode.removeChild(this._pop); }
  }

  class Drawer {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Drawer: element not found');
      this.opts = Object.assign({ placement: 'left', width: 280, duration: 300 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-drawer');
      _setStyles(this.el, { position: 'fixed', top: '0', [this.opts.placement]: '0', width: _px(this.opts.width), height: '100vh', background: '#fff', boxShadow: '2px 0 12px rgba(0,0,0,0.1)', transform: `translateX(${this.opts.placement === 'left' ? '-100%' : '100%'})`, transition: `transform ${this.opts.duration}ms ease`, zIndex: 10000 });
      if (this.opts.placement === 'right') this.el.style.left = 'auto';
      this._overlay = _createEl('div', null, document.body);
      _setStyles(this._overlay, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.3)', opacity: '0', transition: `opacity ${this.opts.duration}ms ease`, pointerEvents: 'none', zIndex: 9999 });
      this._overlay.addEventListener('click', () => this.close());
    }
    open() {
      this.el.style.transform = 'translateX(0)';
      this._overlay.style.opacity = '1';
      this._overlay.style.pointerEvents = 'auto';
      this._callbacks.forEach(fn => fn({ open: true }));
    }
    close() {
      this.el.style.transform = `translateX(${this.opts.placement === 'left' ? '-100%' : '100%'})`;
      this._overlay.style.opacity = '0';
      this._overlay.style.pointerEvents = 'none';
      this._callbacks.forEach(fn => fn({ open: false }));
    }
    onToggle(fn) { this._callbacks.push(fn); }
    destroy() { if (this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay); }
  }

  class Skeleton {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Skeleton: element not found');
      this.opts = Object.assign({ rows: 4, rowHeight: 12, gap: 8, width: '100%' }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-skeleton');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', gap: _px(this.opts.gap), width: this.opts.width });
      for (let i = 0; i < this.opts.rows; i++) {
        const row = _createEl('div', null, this.el);
        const w = i === 0 ? '60%' : (i === this.opts.rows - 1 ? '40%' : '100%');
        _setStyles(row, { height: _px(this.opts.rowHeight), width, background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)', backgroundSize: '200% 100%', borderRadius: '4px', animation: 'ql-skeleton-shimmer 1.5s infinite' });
      }
      if (!document.getElementById('ql-skeleton-style')) {
        const style = _createEl('style', { id: 'ql-skeleton-style' }, document.head);
        style.textContent = '@keyframes ql-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
      }
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class InfiniteScroller {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('InfiniteScroller: element not found');
      this.opts = Object.assign({ threshold: 100, loading: false }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-infinite-scroller');
      _setStyles(this.el, { overflow: 'auto' });
      this._onScroll = () => {
        if (this.opts.loading) return;
        const nearBottom = this.el.scrollHeight - this.el.scrollTop - this.el.clientHeight < this.opts.threshold;
        if (nearBottom) { this.opts.loading = true; this._callbacks.forEach(fn => fn({ loadMore: true })); }
      };
      this.el.addEventListener('scroll', this._onScroll);
    }
    done() { this.opts.loading = false; }
    onLoadMore(fn) { this._callbacks.push(fn); }
    destroy() { this.el.removeEventListener('scroll', this._onScroll); }
  }

  class MultiSelect {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MultiSelect: element not found');
      this.opts = Object.assign({ items: [], selected: [], placeholder: 'Select...' }, options);
      this._callbacks = [];
      this._open = false;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-multi-select');
      _setStyles(this.el, { position: 'relative', display: 'inline-block', minWidth: '160px' });
      this._trigger = _createEl('div', null, this.el);
      _setStyles(this._trigger, { padding: '6px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
      this._trigger.textContent = this.opts.placeholder;
      this._dropdown = _createEl('div', null, this.el);
      _setStyles(this._dropdown, { position: 'absolute', top: '100%', left: '0', right: '0', marginTop: '4px', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'none', zIndex: 9999, maxHeight: '200px', overflow: 'auto' });
      this._renderOptions();
      this._trigger.addEventListener('click', () => { this._open = !this._open; this._dropdown.style.display = this._open ? 'block' : 'none'; });
      document.addEventListener('click', (e) => { if (!this.el.contains(e.target)) { this._open = false; this._dropdown.style.display = 'none'; } });
    }
    _renderOptions() {
      this._dropdown.innerHTML = '';
      this.opts.items.forEach(item => {
        const row = _createEl('div', null, this._dropdown);
        row.textContent = item.label;
        const checked = this.opts.selected.includes(item.value);
        _setStyles(row, { padding: '6px 10px', cursor: 'pointer', fontSize: '13px', background: checked ? 'rgba(91,77,255,0.08)' : 'transparent' });
        row.addEventListener('click', () => {
          if (checked) { this.opts.selected = this.opts.selected.filter(v => v !== item.value); } else { this.opts.selected.push(item.value); }
          this._renderOptions();
          this._updateTrigger();
          this._callbacks.forEach(fn => fn({ selected: this.opts.selected }));
        });
      });
    }
    _updateTrigger() {
      const labels = this.opts.items.filter(i => this.opts.selected.includes(i.value)).map(i => i.label);
      this._trigger.textContent = labels.length ? labels.join(', ') : this.opts.placeholder;
    }
    setSelected(arr) { this.opts.selected = arr; this._renderOptions(); this._updateTrigger(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class Collapsible {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('Collapsible: element not found');
      this.opts = Object.assign({ title: '', expanded: true, duration: 300 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-collapsible');
      _setStyles(this.el, { border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', overflow: 'hidden' });
      this._header = _createEl('div', null, this.el);
      _setStyles(this._header, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', userSelect: 'none' });
      this._header.textContent = this.opts.title;
      this._icon = _createEl('span', null, this._header);
      this._icon.textContent = this.opts.expanded ? '▼' : '▶';
      this._body = _createEl('div', null, this.el);
      _setStyles(this._body, { overflow: 'hidden', transition: `height ${this.opts.duration}ms ease` });
      this._content = _createEl('div', null, this._body);
      _setStyles(this._content, { padding: '8px 10px' });
      if (!this.opts.expanded) { this._body.style.height = '0px'; }
      this._header.addEventListener('click', () => this.toggle());
    }
    toggle() {
      this.opts.expanded = !this.opts.expanded;
      this._icon.textContent = this.opts.expanded ? '▼' : '▶';
      if (this.opts.expanded) { this._body.style.height = this._content.scrollHeight + 'px'; setTimeout(() => { this._body.style.height = 'auto'; }, this.opts.duration); }
      else { this._body.style.height = this._content.scrollHeight + 'px'; requestAnimationFrame(() => { this._body.style.height = '0px'; }); }
      this._callbacks.forEach(fn => fn({ expanded: this.opts.expanded }));
    }
    setContent(node) { this._content.innerHTML = ''; this._content.appendChild(node); }
    onToggle(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class TooltipAdvanced {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TooltipAdvanced: element not found');
      this.opts = Object.assign({ html: '', placement: 'top', delay: 300 }, options);
      this._timer = null;
      this._init();
    }
    _init() {
      this._tip = _createEl('div', null, document.body);
      _setStyles(this._tip, { position: 'absolute', display: 'none', background: '#333', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', zIndex: 99999, maxWidth: '240px', pointerEvents: 'none' });
      this.el.addEventListener('mouseenter', () => {
        this._timer = setTimeout(() => { this._tip.innerHTML = this.opts.html; this._tip.style.display = 'block'; this._position(); }, this.opts.delay);
      });
      this.el.addEventListener('mouseleave', () => { clearTimeout(this._timer); this._tip.style.display = 'none'; });
    }
    _position() {
      const r = this.el.getBoundingClientRect();
      const t = this._tip.getBoundingClientRect();
      let top = r.top + window.scrollY, left = r.left + window.scrollX;
      if (this.opts.placement === 'top') { top -= t.height + 6; left += (r.width - t.width) / 2; }
      if (this.opts.placement === 'bottom') { top += r.height + 6; left += (r.width - t.width) / 2; }
      this._tip.style.top = top + 'px';
      this._tip.style.left = left + 'px';
    }
    setHtml(v) { this.opts.html = v; }
    destroy() { clearTimeout(this._timer); if (this._tip && this._tip.parentNode) this._tip.parentNode.removeChild(this._tip); }
  }

  class MarqueeText {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('MarqueeText: element not found');
      this.opts = Object.assign({ text: '', speed: 50 }, options);
      this._raf = null;
      this._init();
    }
    _init() {
      this.el.classList.add('ql-marquee');
      _setStyles(this.el, { overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' });
      this._inner = _createEl('div', null, this.el);
      _setStyles(this._inner, { display: 'inline-block', whiteSpace: 'nowrap', paddingLeft: '100%' });
      this._inner.textContent = this.opts.text;
      let x = 0;
      const step = () => {
        x -= this.opts.speed / 60;
        if (Math.abs(x) > this._inner.scrollWidth) x = 0;
        this._inner.style.transform = `translateX(${x}px)`;
        this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }
    setText(v) { this.opts.text = v; this._inner.textContent = v; }
    destroy() { cancelAnimationFrame(this._raf); this.el.innerHTML = ''; }
  }

  class EditableLabel {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('EditableLabel: element not found');
      this.opts = Object.assign({ text: 'Label', editable: true }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-editable-label');
      _setStyles(this.el, { display: 'inline-block', padding: '2px 6px', borderRadius: '4px', cursor: 'text', fontSize: '13px' });
      this.el.textContent = this.opts.text;
      if (this.opts.editable) {
        this.el.addEventListener('dblclick', () => {
          const input = document.createElement('input');
          input.value = this.el.textContent;
          _setStyles(input, { border: '1px solid var(--accent, #5b4dff)', outline: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '13px' });
          this.el.innerHTML = '';
          this.el.appendChild(input);
          input.focus();
          const commit = () => {
            this.opts.text = input.value;
            this.el.textContent = input.value;
            this._callbacks.forEach(fn => fn({ text: input.value }));
          };
          input.addEventListener('blur', commit);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { input.blur(); } });
        });
      }
    }
    setText(v) { this.opts.text = v; this.el.textContent = v; }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class StepperWizard {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('StepperWizard: element not found');
      this.opts = Object.assign({ steps: [], active: 0 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-stepper-wizard');
      _setStyles(this.el, { display: 'flex', alignItems: 'center', gap: '4px' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      this.opts.steps.forEach((s, i) => {
        const dot = _createEl('div', null, this.el);
        const done = i < this.opts.active;
        const active = i === this.opts.active;
        _setStyles(dot, { width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', background: done ? 'var(--accent, #5b4dff)' : (active ? '#fff' : '#eee'), color: done ? '#fff' : (active ? 'var(--accent, #5b4dff)' : '#999'), border: active ? '2px solid var(--accent, #5b4dff)' : '2px solid transparent' });
        dot.textContent = done ? '✓' : (i + 1);
        if (i < this.opts.steps.length - 1) {
          const line = _createEl('div', null, this.el);
          _setStyles(line, { flex: '1', height: '2px', background: i < this.opts.active ? 'var(--accent, #5b4dff)' : 'rgba(0,0,0,0.08)' });
        }
      });
    }
    setActive(v) { this.opts.active = v; this._render(); this._callbacks.forEach(fn => fn({ active: v })); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class RatingStars {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('RatingStars: element not found');
      this.opts = Object.assign({ max: 5, value: 0, readonly: false }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-rating');
      _setStyles(this.el, { display: 'inline-flex', gap: '2px', fontSize: '18px', cursor: this.opts.readonly ? 'default' : 'pointer' });
      this._render();
    }
    _render() {
      this.el.innerHTML = '';
      for (let i = 1; i <= this.opts.max; i++) {
        const star = _createEl('span', null, this.el);
        star.textContent = i <= this.opts.value ? '★' : '☆';
        _setStyles(star, { color: i <= this.opts.value ? '#ffc107' : '#ddd' });
        if (!this.opts.readonly) {
          star.addEventListener('mouseenter', () => { for (let j = 0; j < this.opts.max; j++) { this.el.children[j].textContent = j < i ? '★' : '☆'; this.el.children[j].style.color = j < i ? '#ffc107' : '#ddd'; } });
          star.addEventListener('mouseleave', () => this._render());
          star.addEventListener('click', () => { this.opts.value = i; this._render(); this._callbacks.forEach(fn => fn({ value: i })); });
        }
      }
    }
    setValue(v) { this.opts.value = v; this._render(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  // 注册 v3.4
  QI.SplitPanel = SplitPanel;
  QI.DockPanel = DockPanel;
  QI.Breadcrumb = Breadcrumb;
  QI.Pagination = Pagination;
  QI.Badge = Badge;
  QI.Avatar = Avatar;
  QI.Card = Card;
  QI.ListView = ListView;
  QI.GridView = GridView;
  QI.PropertyGrid = PropertyGrid;
  QI.StatusBar = StatusBar;
  QI.MenuBar = MenuBar;
  QI.CommandPalette = CommandPalette;
  QI.ShortcutHint = ShortcutHint;
  QI.FloatingPanel = FloatingPanel;
  QI.Popover = Popover;
  QI.Drawer = Drawer;
  QI.Skeleton = Skeleton;
  QI.InfiniteScroller = InfiniteScroller;
  QI.MultiSelect = MultiSelect;
  QI.Collapsible = Collapsible;
  QI.TooltipAdvanced = TooltipAdvanced;
  QI.MarqueeText = MarqueeText;
  QI.EditableLabel = EditableLabel;
  QI.StepperWizard = StepperWizard;
  QI.RatingStars = RatingStars;

  /* ================= v3.5 数据与编辑组件 ================= */

  class FileTree {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('FileTree: element not found');
      this.opts = Object.assign({ data: [] }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-file-tree');
      _setStyles(this.el, { fontSize: '13px', userSelect: 'none', overflow: 'auto' });
      this._render(this.opts.data, this.el, 0);
    }
    _render(nodes, parent, depth) {
      nodes.forEach(node => {
        const row = _createEl('div', null, parent);
        _setStyles(row, { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', paddingLeft: (8 + depth * 16) + 'px', cursor: 'pointer', borderRadius: '4px' });
        row.textContent = (node.children ? '📁 ' : '📄 ') + node.label;
        row.addEventListener('click', () => this._callbacks.forEach(fn => fn({ node })));
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(0,0,0,0.03)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
        if (node.children) this._render(node.children, parent, depth + 1);
      });
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class DiffViewer {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('DiffViewer: element not found');
      this.opts = Object.assign({ oldText: '', newText: '' }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-diff-viewer');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', gap: '1px', fontFamily: 'monospace', fontSize: '12px', overflow: 'auto' });
      const oldLines = this.opts.oldText.split('\n');
      const newLines = this.opts.newText.split('\n');
      const max = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < max; i++) {
        const row = _createEl('div', null, this.el);
        _setStyles(row, { display: 'flex', gap: '8px', padding: '2px 6px' });
        const oldCell = _createEl('span', null, row); oldCell.textContent = oldLines[i] || ''; oldCell.style.flex = '1'; oldCell.style.background = oldLines[i] !== newLines[i] ? 'rgba(255,0,0,0.06)' : 'transparent';
        const newCell = _createEl('span', null, row); newCell.textContent = newLines[i] || ''; newCell.style.flex = '1'; newCell.style.background = oldLines[i] !== newLines[i] ? 'rgba(0,255,0,0.06)' : 'transparent';
      }
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class HexEditor {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('HexEditor: element not found');
      this.opts = Object.assign({ data: new Uint8Array(256) }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-hex-editor');
      _setStyles(this.el, { fontFamily: 'monospace', fontSize: '12px', overflow: 'auto', lineHeight: '1.6' });
      const bytes = this.opts.data;
      for (let i = 0; i < bytes.length; i += 16) {
        const row = _createEl('div', null, this.el);
        const addr = _createEl('span', null, row); addr.textContent = i.toString(16).padStart(6, '0') + '  '; addr.style.color = '#888';
        for (let j = 0; j < 16 && i + j < bytes.length; j++) {
          const b = _createEl('span', null, row); b.textContent = bytes[i + j].toString(16).padStart(2, '0') + ' '; b.style.marginRight = '2px';
        }
      }
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class JSONViewer {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('JSONViewer: element not found');
      this.opts = Object.assign({ data: {}, collapsed: false }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-json-viewer');
      _setStyles(this.el, { fontFamily: 'monospace', fontSize: '12px', overflow: 'auto', lineHeight: '1.5' });
      this._render(this.opts.data, this.el, 0);
    }
    _render(val, parent, depth) {
      if (typeof val !== 'object' || val === null) {
        const span = _createEl('span', null, parent);
        span.textContent = JSON.stringify(val);
        span.style.color = typeof val === 'string' ? '#0a0' : (typeof val === 'number' ? '#a00' : '#55a');
        return;
      }
      const isArr = Array.isArray(val);
      const keys = isArr ? val.map((_, i) => i) : Object.keys(val);
      keys.forEach((k, i) => {
        const row = _createEl('div', null, parent);
        _setStyles(row, { paddingLeft: (depth * 16) + 'px' });
        const keySpan = _createEl('span', null, row);
        keySpan.textContent = (isArr ? '' : `"${k}": `);
        keySpan.style.color = '#333';
        this._render(val[k], row, depth + 1);
        if (i < keys.length - 1) { const comma = _createEl('span', null, row); comma.textContent = ','; }
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class CanvasTimeline {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('CanvasTimeline: element not found');
      this.opts = Object.assign({ width: 800, height: 60, duration: 120, fps: 30, playhead: 0 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-canvas-timeline');
      _setStyles(this.el, { display: 'block', position: 'relative' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('click', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.opts.playhead = (x / this.opts.width) * this.opts.duration;
        this._draw();
        this._callbacks.forEach(fn => fn({ playhead: this.opts.playhead }));
      });
    }
    _draw() {
      const ctx = this._ctx; const w = this.opts.width; const h = this.opts.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath();
      for (let i = 0; i <= this.opts.duration; i += 5) { const x = (i / this.opts.duration) * w; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      ctx.stroke();
      const px = (this.opts.playhead / this.opts.duration) * w;
      ctx.fillStyle = 'var(--accent, #5b4dff)'; ctx.fillRect(px - 1, 0, 2, h);
    }
    setPlayhead(v) { this.opts.playhead = v; this._draw(); }
    onSeek(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class OscilloscopeWaterfall {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('OscilloscopeWaterfall: element not found');
      this.opts = Object.assign({ width: 400, height: 200, history: 50 }, options);
      this._buffers = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-osc-waterfall');
      _setStyles(this.el, { display: 'block' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    push(buffer) {
      this._buffers.push(buffer.slice());
      if (this._buffers.length > this.opts.history) this._buffers.shift();
      this._draw();
    }
    _draw() {
      const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      this._buffers.forEach((buf, row) => {
        const y = h - ((row + 1) / this.opts.history) * h;
        ctx.strokeStyle = `hsl(${200 + row * 2}, 80%, 60%)`;
        ctx.beginPath();
        for (let i = 0; i < buf.length; i++) {
          const x = (i / buf.length) * w;
          const amp = (buf[i] + 1) * 0.5;
          const py = y - amp * (h / this.opts.history);
          if (i === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        ctx.stroke();
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class BeatGrid {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('BeatGrid: element not found');
      this.opts = Object.assign({ width: 400, height: 120, beats: 16, subdivisions: 4 }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-beat-grid');
      _setStyles(this.el, { display: 'block' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      const cols = this.opts.beats * this.opts.subdivisions;
      for (let i = 0; i <= cols; i++) {
        const x = (i / cols) * w;
        ctx.lineWidth = i % this.opts.subdivisions === 0 ? 1.5 : 0.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * h;
        ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class NoteVelocityMap {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('NoteVelocityMap: element not found');
      this.opts = Object.assign({ width: 400, height: 120, notes: [] }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-velocity-map');
      _setStyles(this.el, { display: 'block' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
      this._canvas.addEventListener('mousedown', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const index = Math.floor((x / this.opts.width) * this.opts.notes.length);
        if (index >= 0 && index < this.opts.notes.length) {
          const y = e.clientY - rect.top;
          const vel = 1 - (y / this.opts.height);
          this.opts.notes[index].velocity = Math.max(0, Math.min(1, vel));
          this._draw();
          this._callbacks.forEach(fn => fn({ index, velocity: this.opts.notes[index].velocity }));
        }
      });
    }
    _draw() {
      const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(0, 0, w, h);
      this.opts.notes.forEach((n, i) => {
        const x = (i / this.opts.notes.length) * w;
        const bw = w / this.opts.notes.length;
        const bh = n.velocity * h;
        ctx.fillStyle = 'var(--accent, #5b4dff)';
        ctx.fillRect(x + 1, h - bh, bw - 2, bh);
      });
    }
    setNotes(notes) { this.opts.notes = notes; this._draw(); }
    onChange(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class SampleWaveform {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SampleWaveform: element not found');
      this.opts = Object.assign({ width: 300, height: 80, samples: [] }, options);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-sample-waveform');
      _setStyles(this.el, { display: 'block' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    _draw() {
      const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(0, 0, w, h);
      if (!this.opts.samples.length) return;
      ctx.strokeStyle = 'var(--accent, #5b4dff)'; ctx.lineWidth = 1;
      ctx.beginPath();
      const step = this.opts.samples.length / w;
      for (let x = 0; x < w; x++) {
        const idx = Math.floor(x * step);
        const amp = this.opts.samples[idx] || 0;
        const y = (1 - (amp + 1) * 0.5) * h;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    setSamples(s) { this.opts.samples = s; this._draw(); }
    destroy() { this.el.innerHTML = ''; }
  }

  class AudioLevelMeter {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('AudioLevelMeter: element not found');
      this.opts = Object.assign({ width: 24, height: 160, channels: 2 }, options);
      this._levels = Array(this.opts.channels).fill(-60);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-audio-level-meter');
      _setStyles(this.el, { display: 'flex', gap: '2px' });
      this._canvases = [];
      for (let c = 0; c < this.opts.channels; c++) {
        const canvas = _createEl('canvas', null, this.el);
        canvas.width = this.opts.width; canvas.height = this.opts.height;
        _setStyles(canvas, { display: 'block' });
        this._canvases.push(canvas);
      }
      this._draw();
    }
    setLevels(lvls) {
      this._levels = lvls;
      this._draw();
    }
    _draw() {
      this._canvases.forEach((canvas, c) => {
        const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const db = this._levels[c];
        const frac = Math.max(0, Math.min(1, (db + 60) / 60));
        const fillH = frac * h;
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#4caf50'); grad.addColorStop(0.6, '#ffeb3b'); grad.addColorStop(1, '#f44336');
        ctx.fillStyle = grad;
        ctx.fillRect(0, h - fillH, w, fillH);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.strokeRect(0, 0, w, h);
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  class PluginSlot Rack {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('PluginSlotRack: element not found');
      this.opts = Object.assign({ slots: 4 }, options);
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-plugin-rack');
      _setStyles(this.el, { display: 'flex', flexDirection: 'column', gap: '2px' });
      for (let i = 0; i < this.opts.slots; i++) {
        const slot = _createEl('div', null, this.el);
        _setStyles(slot, { padding: '6px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', border: '1px dashed rgba(0,0,0,0.1)' });
        slot.textContent = `Slot ${i + 1}`;
        slot.addEventListener('click', () => this._callbacks.forEach(fn => fn({ slot: i })));
      }
    }
    onSelect(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class TempoTapButton {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('TempoTapButton: element not found');
      this._taps = [];
      this._callbacks = [];
      this._init();
    }
    _init() {
      this.el.classList.add('ql-tempo-tap');
      _setStyles(this.el, { padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--accent, #5b4dff)', background: '#fff', color: 'var(--accent, #5b4dff)', cursor: 'pointer', fontWeight: '600', userSelect: 'none' });
      this.el.textContent = 'TAP';
      this.el.addEventListener('mousedown', () => {
        const now = performance.now();
        this._taps.push(now);
        if (this._taps.length > 8) this._taps.shift();
        if (this._taps.length >= 2) {
          const intervals = [];
          for (let i = 1; i < this._taps.length; i++) intervals.push(this._taps[i] - this._taps[i - 1]);
          const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const bpm = Math.round(60000 / avg);
          this._callbacks.forEach(fn => fn({ bpm }));
        }
        this.el.style.background = 'var(--accent, #5b4dff)';
        this.el.style.color = '#fff';
        setTimeout(() => { this.el.style.background = '#fff'; this.el.style.color = 'var(--accent, #5b4dff)'; }, 120);
      });
    }
    onTap(fn) { this._callbacks.push(fn); }
    destroy() { this.el.innerHTML = ''; }
  }

  class SpectrumBarGraph {
    constructor(element, options = {}) {
      this.el = typeof element === 'string' ? document.getElementById(element) : element;
      if (!this.el) throw new Error('SpectrumBarGraph: element not found');
      this.opts = Object.assign({ width: 300, height: 120, bars: 32 }, options);
      this._data = Array(this.opts.bars).fill(0);
      this._init();
    }
    _init() {
      this.el.classList.add('ql-spectrum-bar-graph');
      _setStyles(this.el, { display: 'block' });
      this._canvas = _createEl('canvas', null, this.el);
      this._canvas.width = this.opts.width; this._canvas.height = this.opts.height;
      _setStyles(this._canvas, { display: 'block' });
      this._ctx = this._canvas.getContext('2d');
      this._draw();
    }
    setData(arr) {
      this._data = arr.slice(0, this.opts.bars);
      while (this._data.length < this.opts.bars) this._data.push(0);
      this._draw();
    }
    _draw() {
      const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bw = w / this.opts.bars;
      this._data.forEach((v, i) => {
        const bh = v * h;
        const hue = 200 + (i / this.opts.bars) * 60;
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.fillRect(i * bw, h - bh, bw - 1, bh);
      });
    }
    destroy() { this.el.innerHTML = ''; }
  }

  QI.FileTree = FileTree;
  QI.DiffViewer = DiffViewer;
  QI.HexEditor = HexEditor;
  QI.JSONViewer = JSONViewer;
  QI.CanvasTimeline = CanvasTimeline;
  QI.OscilloscopeWaterfall = OscilloscopeWaterfall;
  QI.BeatGrid = BeatGrid;
  QI.NoteVelocityMap = NoteVelocityMap;
  QI.SampleWaveform = SampleWaveform;
  QI.AudioLevelMeter = AudioLevelMeter;
  QI.PluginSlotRack = PluginSlotRack;
  QI.TempoTapButton = TempoTapButton;
  QI.SpectrumBarGraph = SpectrumBarGraph;
})(QingluanUI);
