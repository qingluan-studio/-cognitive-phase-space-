/**
 * 青鸾 DAW — 主题管理器
 * ThemeManager
 * 支持8套内置主题：default、dark、geek、paper、midnight、sakura、forest、cyberpunk
 */

const BuiltInThemes = {
  default: {
    name: '默认米白',
    description: '清新明亮的默认主题',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f5f5f0',
      '--text': '#1a1a1a',
      '--text2': '#555',
      '--text3': '#888',
      '--accent': '#5b4dff',
      '--accent2': '#ff6b9d',
      '--accent3': '#7b6fff',
      '--bubble-user': '#5b4dff',
      '--bubble-ai': '#f0f0f5',
      '--card-bg': '#fff',
      '--card-bg-hover': '#fafafa',
      '--border': 'rgba(0,0,0,0.06)',
      '--border-strong': 'rgba(0,0,0,0.12)',
      '--pink-bg': '#f5f5f0',
      '--black-card': '#1a1a1a',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.04)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.06)',
      '--shadow-lg': '0 12px 40px rgba(0,0,0,0.08)',
      '--radius-sm': '6px',
      '--radius-md': '12px',
      '--radius-lg': '20px',
      '--radius-xl': '32px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans SC', sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', 'Consolas', monospace",
      '--success': '#2ecc71',
      '--warning': '#f39c12',
      '--error': '#e74c3c',
      '--info': '#3498db',
      '--overlay': 'rgba(0,0,0,0.35)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(0,0,0,0.1)',
      '--input-focus': 'rgba(91,77,255,0.2)',
      '--slider-track': 'rgba(0,0,0,0.1)',
      '--slider-thumb': '#5b4dff',
      '--switch-on': '#5b4dff',
      '--switch-off': 'rgba(0,0,0,0.15)',
      '--progress-bg': 'rgba(0,0,0,0.06)',
      '--progress-fill': '#5b4dff',
      '--scroll-track': 'rgba(0,0,0,0.04)',
      '--scroll-thumb': 'rgba(0,0,0,0.15)',
      '--scroll-thumb-hover': 'rgba(0,0,0,0.25)',
      '--tooltip-bg': 'rgba(30,30,30,0.9)',
      '--tooltip-text': '#fff',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(91,77,255,0.06)',
      '--modal-backdrop': 'rgba(0,0,0,0.45)',
      '--code-bg': '#f4f4f8',
      '--code-text': '#2d2d2d',
      '--tag-bg': 'rgba(91,77,255,0.08)',
      '--tag-text': '#5b4dff'
    }
  },

  dark: {
    name: '深色模式',
    description: '护眼黑底白字',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0f0f13',
      '--text': '#e8e8ec',
      '--text2': '#a0a0a8',
      '--text3': '#707078',
      '--accent': '#8b7dff',
      '--accent2': '#ff8bb5',
      '--accent3': '#a599ff',
      '--bubble-user': '#8b7dff',
      '--bubble-ai': '#1e1e28',
      '--card-bg': '#1a1a22',
      '--card-bg-hover': '#22222c',
      '--border': 'rgba(255,255,255,0.08)',
      '--border-strong': 'rgba(255,255,255,0.14)',
      '--pink-bg': '#12121a',
      '--black-card': '#252530',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 40px rgba(0,0,0,0.4)',
      '--radius-sm': '6px',
      '--radius-md': '12px',
      '--radius-lg': '20px',
      '--radius-xl': '32px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans SC', sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', 'Consolas', monospace",
      '--success': '#2ecc71',
      '--warning': '#f39c12',
      '--error': '#e74c3c',
      '--info': '#3498db',
      '--overlay': 'rgba(0,0,0,0.55)',
      '--input-bg': '#1e1e28',
      '--input-border': 'rgba(255,255,255,0.08)',
      '--input-focus': 'rgba(139,125,255,0.25)',
      '--slider-track': 'rgba(255,255,255,0.1)',
      '--slider-thumb': '#8b7dff',
      '--switch-on': '#8b7dff',
      '--switch-off': 'rgba(255,255,255,0.15)',
      '--progress-bg': 'rgba(255,255,255,0.06)',
      '--progress-fill': '#8b7dff',
      '--scroll-track': 'rgba(255,255,255,0.04)',
      '--scroll-thumb': 'rgba(255,255,255,0.12)',
      '--scroll-thumb-hover': 'rgba(255,255,255,0.22)',
      '--tooltip-bg': 'rgba(40,40,50,0.95)',
      '--tooltip-text': '#e8e8ec',
      '--menu-bg': '#1a1a22',
      '--menu-hover': 'rgba(139,125,255,0.1)',
      '--modal-backdrop': 'rgba(0,0,0,0.6)',
      '--code-bg': '#16161e',
      '--code-text': '#c8c8d0',
      '--tag-bg': 'rgba(139,125,255,0.12)',
      '--tag-text': '#8b7dff'
    }
  },

  geek: {
    name: '极客绿',
    description: '黑底绿字终端风格',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0a0a0a',
      '--text': '#00ff41',
      '--text2': '#00cc33',
      '--text3': '#009922',
      '--accent': '#00ff41',
      '--accent2': '#00ff88',
      '--accent3': '#33ff66',
      '--bubble-user': '#00ff41',
      '--bubble-ai': '#0f1f0f',
      '--card-bg': '#0f0f0f',
      '--card-bg-hover': '#131313',
      '--border': 'rgba(0,255,65,0.15)',
      '--border-strong': 'rgba(0,255,65,0.25)',
      '--pink-bg': '#080808',
      '--black-card': '#111111',
      '--shadow-sm': '0 0 4px rgba(0,255,65,0.1)',
      '--shadow-md': '0 0 12px rgba(0,255,65,0.15)',
      '--shadow-lg': '0 0 30px rgba(0,255,65,0.2)',
      '--radius-sm': '2px',
      '--radius-md': '4px',
      '--radius-lg': '6px',
      '--radius-xl': '8px',
      '--font-sans': "'Fira Code', 'Consolas', 'Courier New', monospace",
      '--font-mono': "'Fira Code', 'Consolas', 'Courier New', monospace",
      '--success': '#00ff41',
      '--warning': '#ffcc00',
      '--error': '#ff3333',
      '--info': '#00ccff',
      '--overlay': 'rgba(0,0,0,0.7)',
      '--input-bg': '#0a0a0a',
      '--input-border': 'rgba(0,255,65,0.2)',
      '--input-focus': 'rgba(0,255,65,0.3)',
      '--slider-track': 'rgba(0,255,65,0.15)',
      '--slider-thumb': '#00ff41',
      '--switch-on': '#00ff41',
      '--switch-off': 'rgba(0,255,65,0.15)',
      '--progress-bg': 'rgba(0,255,65,0.08)',
      '--progress-fill': '#00ff41',
      '--scroll-track': 'rgba(0,255,65,0.04)',
      '--scroll-thumb': 'rgba(0,255,65,0.2)',
      '--scroll-thumb-hover': 'rgba(0,255,65,0.35)',
      '--tooltip-bg': '#0a0a0a',
      '--tooltip-text': '#00ff41',
      '--menu-bg': '#0f0f0f',
      '--menu-hover': 'rgba(0,255,65,0.08)',
      '--modal-backdrop': 'rgba(0,0,0,0.7)',
      '--code-bg': '#050505',
      '--code-text': '#00ff41',
      '--tag-bg': 'rgba(0,255,65,0.1)',
      '--tag-text': '#00ff41'
    }
  },

  paper: {
    name: '纸张质感',
    description: '米黄底仿纸质风格',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f0e8d8',
      '--text': '#3a3020',
      '--text2': '#6a6050',
      '--text3': '#9a9080',
      '--accent': '#8b4513',
      '--accent2': '#cd853f',
      '--accent3': '#a0522d',
      '--bubble-user': '#8b4513',
      '--bubble-ai': '#e8e0d0',
      '--card-bg': '#faf6f0',
      '--card-bg-hover': '#f5f0e8',
      '--border': 'rgba(60,40,20,0.08)',
      '--border-strong': 'rgba(60,40,20,0.15)',
      '--pink-bg': '#f0e8d8',
      '--black-card': '#3a3020',
      '--shadow-sm': '0 1px 3px rgba(60,40,20,0.04)',
      '--shadow-md': '0 4px 12px rgba(60,40,20,0.06)',
      '--shadow-lg': '0 12px 40px rgba(60,40,20,0.08)',
      '--radius-sm': '4px',
      '--radius-md': '8px',
      '--radius-lg': '12px',
      '--radius-xl': '20px',
      '--font-sans': "'Noto Serif SC', 'Songti SC', 'STSong', serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#5d8c5d',
      '--warning': '#c4a35a',
      '--error': '#b05a5a',
      '--info': '#5a7a9a',
      '--overlay': 'rgba(60,40,20,0.3)',
      '--input-bg': '#faf6f0',
      '--input-border': 'rgba(60,40,20,0.12)',
      '--input-focus': 'rgba(139,69,19,0.2)',
      '--slider-track': 'rgba(60,40,20,0.1)',
      '--slider-thumb': '#8b4513',
      '--switch-on': '#8b4513',
      '--switch-off': 'rgba(60,40,20,0.15)',
      '--progress-bg': 'rgba(60,40,20,0.06)',
      '--progress-fill': '#8b4513',
      '--scroll-track': 'rgba(60,40,20,0.04)',
      '--scroll-thumb': 'rgba(60,40,20,0.15)',
      '--scroll-thumb-hover': 'rgba(60,40,20,0.25)',
      '--tooltip-bg': '#3a3020',
      '--tooltip-text': '#f0e8d8',
      '--menu-bg': '#faf6f0',
      '--menu-hover': 'rgba(139,69,19,0.06)',
      '--modal-backdrop': 'rgba(60,40,20,0.4)',
      '--code-bg': '#e8e0d0',
      '--code-text': '#3a3020',
      '--tag-bg': 'rgba(139,69,19,0.08)',
      '--tag-text': '#8b4513'
    }
  },

  midnight: {
    name: '午夜蓝',
    description: '深邃的蓝色调',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0a0e1a',
      '--text': '#c8d4e8',
      '--text2': '#8a9bb8',
      '--text3': '#5a6b88',
      '--accent': '#4d8aff',
      '--accent2': '#7eb8ff',
      '--accent3': '#66a3ff',
      '--bubble-user': '#4d8aff',
      '--bubble-ai': '#111827',
      '--card-bg': '#111827',
      '--card-bg-hover': '#1a2332',
      '--border': 'rgba(77,138,255,0.1)',
      '--border-strong': 'rgba(77,138,255,0.18)',
      '--pink-bg': '#080c18',
      '--black-card': '#1a2332',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.25)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.35)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.45)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(5,10,25,0.6)',
      '--input-bg': '#111827',
      '--input-border': 'rgba(77,138,255,0.12)',
      '--input-focus': 'rgba(77,138,255,0.25)',
      '--slider-track': 'rgba(77,138,255,0.12)',
      '--slider-thumb': '#4d8aff',
      '--switch-on': '#4d8aff',
      '--switch-off': 'rgba(77,138,255,0.15)',
      '--progress-bg': 'rgba(77,138,255,0.06)',
      '--progress-fill': '#4d8aff',
      '--scroll-track': 'rgba(77,138,255,0.04)',
      '--scroll-thumb': 'rgba(77,138,255,0.15)',
      '--scroll-thumb-hover': 'rgba(77,138,255,0.28)',
      '--tooltip-bg': 'rgba(17,24,39,0.95)',
      '--tooltip-text': '#c8d4e8',
      '--menu-bg': '#111827',
      '--menu-hover': 'rgba(77,138,255,0.1)',
      '--modal-backdrop': 'rgba(5,10,25,0.65)',
      '--code-bg': '#0d1320',
      '--code-text': '#a0b4d8',
      '--tag-bg': 'rgba(77,138,255,0.1)',
      '--tag-text': '#4d8aff'
    }
  },

  sakura: {
    name: '樱花粉',
    description: '柔和的粉白配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#fdf2f4',
      '--text': '#4a3040',
      '--text2': '#7a5a6a',
      '--text3': '#aa8a9a',
      '--accent': '#e86a92',
      '--accent2': '#ff8fb3',
      '--accent3': '#f07a9f',
      '--bubble-user': '#e86a92',
      '--bubble-ai': '#fce8ee',
      '--card-bg': '#fff',
      '--card-bg-hover': '#fef6f8',
      '--border': 'rgba(232,106,146,0.08)',
      '--border-strong': 'rgba(232,106,146,0.15)',
      '--pink-bg': '#fdf2f4',
      '--black-card': '#4a3040',
      '--shadow-sm': '0 1px 4px rgba(232,106,146,0.06)',
      '--shadow-md': '0 4px 16px rgba(232,106,146,0.08)',
      '--shadow-lg': '0 12px 48px rgba(232,106,146,0.1)',
      '--radius-sm': '10px',
      '--radius-md': '16px',
      '--radius-lg': '24px',
      '--radius-xl': '40px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#6bcb77',
      '--warning': '#f5c542',
      '--error': '#ff6b6b',
      '--info': '#6fa8dc',
      '--overlay': 'rgba(74,48,64,0.3)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(232,106,146,0.12)',
      '--input-focus': 'rgba(232,106,146,0.2)',
      '--slider-track': 'rgba(232,106,146,0.1)',
      '--slider-thumb': '#e86a92',
      '--switch-on': '#e86a92',
      '--switch-off': 'rgba(232,106,146,0.15)',
      '--progress-bg': 'rgba(232,106,146,0.06)',
      '--progress-fill': '#e86a92',
      '--scroll-track': 'rgba(232,106,146,0.04)',
      '--scroll-thumb': 'rgba(232,106,146,0.15)',
      '--scroll-thumb-hover': 'rgba(232,106,146,0.28)',
      '--tooltip-bg': 'rgba(74,48,64,0.9)',
      '--tooltip-text': '#fdf2f4',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(232,106,146,0.06)',
      '--modal-backdrop': 'rgba(74,48,64,0.4)',
      '--code-bg': '#fce8ee',
      '--code-text': '#5a4050',
      '--tag-bg': 'rgba(232,106,146,0.08)',
      '--tag-text': '#e86a92'
    }
  },

  forest: {
    name: '森林绿',
    description: '自然深绿配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0f1f17',
      '--text': '#c8dcc8',
      '--text2': '#8aaa8a',
      '--text3': '#5a7a5a',
      '--accent': '#5cb85c',
      '--accent2': '#7dd87d',
      '--accent3': '#6ac86a',
      '--bubble-user': '#5cb85c',
      '--bubble-ai': '#162a1e',
      '--card-bg': '#162a1e',
      '--card-bg-hover': '#1e3828',
      '--border': 'rgba(92,184,92,0.1)',
      '--border-strong': 'rgba(92,184,92,0.18)',
      '--pink-bg': '#0c1a12',
      '--black-card': '#1e3828',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#5cb85c',
      '--warning': '#d4a03a',
      '--error': '#d46a6a',
      '--info': '#6a9ad4',
      '--overlay': 'rgba(10,25,15,0.55)',
      '--input-bg': '#162a1e',
      '--input-border': 'rgba(92,184,92,0.12)',
      '--input-focus': 'rgba(92,184,92,0.25)',
      '--slider-track': 'rgba(92,184,92,0.1)',
      '--slider-thumb': '#5cb85c',
      '--switch-on': '#5cb85c',
      '--switch-off': 'rgba(92,184,92,0.15)',
      '--progress-bg': 'rgba(92,184,92,0.06)',
      '--progress-fill': '#5cb85c',
      '--scroll-track': 'rgba(92,184,92,0.04)',
      '--scroll-thumb': 'rgba(92,184,92,0.15)',
      '--scroll-thumb-hover': 'rgba(92,184,92,0.28)',
      '--tooltip-bg': 'rgba(22,42,30,0.95)',
      '--tooltip-text': '#c8dcc8',
      '--menu-bg': '#162a1e',
      '--menu-hover': 'rgba(92,184,92,0.08)',
      '--modal-backdrop': 'rgba(10,25,15,0.6)',
      '--code-bg': '#122418',
      '--code-text': '#a0c0a0',
      '--tag-bg': 'rgba(92,184,92,0.1)',
      '--tag-text': '#5cb85c'
    }
  },

  cyberpunk: {
    name: '赛博朋克',
    description: '霓虹紫粉未来感',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0a0014',
      '--text': '#e0c8ff',
      '--text2': '#b080ff',
      '--text3': '#7a40cc',
      '--accent': '#ff00ff',
      '--accent2': '#00ffff',
      '--accent3': '#ff66ff',
      '--bubble-user': '#ff00ff',
      '--bubble-ai': '#1a0033',
      '--card-bg': '#140029',
      '--card-bg-hover': '#1e003d',
      '--border': 'rgba(255,0,255,0.15)',
      '--border-strong': 'rgba(255,0,255,0.25)',
      '--pink-bg': '#05000a',
      '--black-card': '#1e003d',
      '--shadow-sm': '0 0 6px rgba(255,0,255,0.15)',
      '--shadow-md': '0 0 16px rgba(255,0,255,0.2)',
      '--shadow-lg': '0 0 40px rgba(255,0,255,0.3)',
      '--radius-sm': '2px',
      '--radius-md': '4px',
      '--radius-lg': '8px',
      '--radius-xl': '12px',
      '--font-sans': "'Orbitron', 'Rajdhani', 'Segoe UI', sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#00ff9f',
      '--warning': '#ffcc00',
      '--error': '#ff3366',
      '--info': '#00ccff',
      '--overlay': 'rgba(10,0,20,0.7)',
      '--input-bg': '#0a0014',
      '--input-border': 'rgba(255,0,255,0.2)',
      '--input-focus': 'rgba(255,0,255,0.35)',
      '--slider-track': 'rgba(255,0,255,0.15)',
      '--slider-thumb': '#ff00ff',
      '--switch-on': '#ff00ff',
      '--switch-off': 'rgba(255,0,255,0.15)',
      '--progress-bg': 'rgba(255,0,255,0.06)',
      '--progress-fill': '#ff00ff',
      '--scroll-track': 'rgba(255,0,255,0.04)',
      '--scroll-thumb': 'rgba(255,0,255,0.2)',
      '--scroll-thumb-hover': 'rgba(255,0,255,0.4)',
      '--tooltip-bg': '#140029',
      '--tooltip-text': '#ff00ff',
      '--menu-bg': '#140029',
      '--menu-hover': 'rgba(255,0,255,0.08)',
      '--modal-backdrop': 'rgba(10,0,20,0.75)',
      '--code-bg': '#0a0014',
      '--code-text': '#ff66ff',
      '--tag-bg': 'rgba(255,0,255,0.1)',
      '--tag-text': '#ff00ff'
    }
  }
};

/* ================= ThemeManager 类 ================= */

class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.currentTheme = 'default';
    this.scheduledTimers = new Map();
    this.listeners = [];
    this._loadBuiltinThemes();
    this._initFromStorage();
  }

  _loadBuiltinThemes() {
    Object.entries(BuiltInThemes).forEach(([name, config]) => {
      this.themes.set(name, config);
    });
  }

  _initFromStorage() {
    const saved = localStorage.getItem('qingluan_theme_manager_current');
    if (saved && this.themes.has(saved)) {
      this.applyTheme(saved, false);
    }
  }

  registerTheme(name, cssVariables, meta = {}) {
    const theme = {
      name: meta.name || name,
      description: meta.description || '',
      author: meta.author || 'User',
      version: meta.version || '1.0',
      variables: { ...cssVariables }
    };
    this.themes.set(name, theme);
    return this;
  }

  applyTheme(name, animate = true) {
    const theme = this.themes.get(name);
    if (!theme) {
      console.warn(`[ThemeManager] 未找到主题: ${name}`);
      return false;
    }

    const root = document.documentElement;
    Object.entries(theme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    this.currentTheme = name;
    localStorage.setItem('qingluan_theme_manager_current', name);

    if (animate) {
      this._animateTransition();
    }

    this._notifyListeners(name, theme);
    return true;
  }

  _animateTransition() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;background:var(--accent);opacity:0;transition:opacity 0.25s ease;';
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '0.12';
    });

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }, 180);
  }

  getCurrentTheme() {
    return {
      name: this.currentTheme,
      config: this.themes.get(this.currentTheme)
    };
  }

  listThemes() {
    const list = [];
    this.themes.forEach((config, name) => {
      list.push({
        id: name,
        name: config.name,
        description: config.description,
        author: config.author,
        version: config.version
      });
    });
    return list;
  }

  exportTheme(name) {
    const theme = this.themes.get(name);
    if (!theme) return null;
    return JSON.stringify({
      name,
      config: theme,
      exportedAt: new Date().toISOString(),
      app: 'qingluan-daw'
    }, null, 2);
  }

  importTheme(configString) {
    try {
      const data = JSON.parse(configString);
      if (!data.name || !data.config || !data.config.variables) {
        throw new Error('无效的主题配置');
      }
      this.registerTheme(data.name, data.config.variables, {
        name: data.config.name,
        description: data.config.description,
        author: data.config.author,
        version: data.config.version
      });
      return { success: true, name: data.name };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  autoDetectTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.applyTheme('dark');
      return 'dark';
    }
    this.applyTheme('default');
    return 'default';
  }

  scheduleThemeChange(name, time) {
    const now = Date.now();
    const target = time instanceof Date ? time.getTime() : new Date(time).getTime();
    const delay = target - now;
    if (delay <= 0) {
      this.applyTheme(name);
      return { success: true, immediate: true };
    }

    if (this.scheduledTimers.has(name)) {
      clearTimeout(this.scheduledTimers.get(name));
    }

    const timer = setTimeout(() => {
      this.applyTheme(name);
      this.scheduledTimers.delete(name);
    }, delay);

    this.scheduledTimers.set(name, timer);
    return { success: true, delay };
  }

  cancelScheduledChange(name) {
    if (this.scheduledTimers.has(name)) {
      clearTimeout(this.scheduledTimers.get(name));
      this.scheduledTimers.delete(name);
      return true;
    }
    return false;
  }

  onThemeChange(callback) {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  _notifyListeners(name, config) {
    this.listeners.forEach(cb => {
      try { cb(name, config); } catch (e) {}
    });
  }

  removeTheme(name) {
    if (BuiltInThemes[name]) {
      console.warn('[ThemeManager] 不能删除内置主题');
      return false;
    }
    return this.themes.delete(name);
  }

  getThemeCSS(name) {
    const theme = this.themes.get(name);
    if (!theme) return '';
    return Object.entries(theme.variables)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');
  }

  previewTheme(name, duration = 3000) {
    const previous = this.currentTheme;
    this.applyTheme(name);
    setTimeout(() => {
      this.applyTheme(previous);
    }, duration);
  }

  cloneTheme(sourceName, newName, overrides = {}) {
    const source = this.themes.get(sourceName);
    if (!source) return false;
    this.registerTheme(newName, { ...source.variables, ...overrides }, {
      name: overrides.name || source.name + ' (副本)',
      description: source.description,
      author: source.author,
      version: source.version
    });
    return true;
  }

  resetToDefault() {
    this.applyTheme('default');
    localStorage.removeItem('qingluan_theme_manager_current');
  }

  generateRandomTheme(name = 'random') {
    const hue = Math.floor(Math.random() * 360);
    const hue2 = (hue + 30) % 360;
    const vars = {
      '--phone-bg': `hsl(${hue}, 20%, 8%)`,
      '--text': `hsl(${hue}, 30%, 90%)`,
      '--text2': `hsl(${hue}, 25%, 70%)`,
      '--text3': `hsl(${hue}, 20%, 50%)`,
      '--accent': `hsl(${hue}, 80%, 60%)`,
      '--accent2': `hsl(${hue2}, 80%, 60%)`,
      '--card-bg': `hsl(${hue}, 20%, 12%)`,
      '--border': `hsla(${hue}, 80%, 60%, 0.1)`,
      '--shadow-md': `0 4px 16px hsla(${hue},80%,60%,0.15)`
    };
    this.registerTheme(name, vars, { name: '随机主题', description: '自动生成的主题' });
    return name;
  }
}

// 全局单例
const themeManager = new ThemeManager();

// 监听系统主题变化
if (window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener?.('change', () => {
    if (!localStorage.getItem('qingluan_theme_manager_current')) {
      themeManager.autoDetectTheme();
    }
  });
}

// 全局暴露
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
  window.themeManager = themeManager;
}

/* ================= 主题工具函数 ================= */

function injectThemeCSS(css, id = 'qingluan-theme-inject') {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function removeThemeCSS(id = 'qingluan-theme-inject') {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function createThemePreview(themeConfig, size = 120) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const vars = themeConfig.variables || themeConfig;

  // 背景
  ctx.fillStyle = vars['--phone-bg'] || '#fff';
  ctx.fillRect(0, 0, size, size);

  // 卡片
  ctx.fillStyle = vars['--card-bg'] || '#fafafa';
  roundRectPath(ctx, 10, 10, size - 20, size - 20, 8);
  ctx.fill();

  // 强调色块
  ctx.fillStyle = vars['--accent'] || '#5b4dff';
  roundRectPath(ctx, 20, 20, size - 40, 20, 4);
  ctx.fill();

  // 文字行
  ctx.fillStyle = vars['--text2'] || '#888';
  roundRectPath(ctx, 20, 52, size - 50, 8, 2);
  ctx.fill();
  roundRectPath(ctx, 20, 68, size - 60, 8, 2);
  ctx.fill();

  // 点缀
  ctx.fillStyle = vars['--accent2'] || '#ff6b9d';
  ctx.beginPath();
  ctx.arc(size - 30, size - 30, 10, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function roundRectPath(ctx, x, y, w, h, r) {
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

function createThemeSwitcherPanel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:12px;padding:12px;';

  themeManager.listThemes().forEach(theme => {
    const item = document.createElement('div');
    item.style.cssText = 'cursor:pointer;border-radius:12px;padding:8px;background:var(--card-bg);border:2px solid transparent;transition:all 0.2s;';
    item.dataset.theme = theme.id;

    const preview = createThemePreview(themeManager.themes.get(theme.id), 100);
    preview.style.width = '100%';
    preview.style.height = 'auto';
    preview.style.borderRadius = '8px';
    preview.style.display = 'block';

    const label = document.createElement('div');
    label.textContent = theme.name;
    label.style.cssText = 'text-align:center;font-size:12px;margin-top:6px;color:var(--text);';

    item.appendChild(preview);
    item.appendChild(label);

    item.addEventListener('click', () => {
      themeManager.applyTheme(theme.id);
      container.querySelectorAll('[data-theme]').forEach(el => el.style.borderColor = 'transparent');
      item.style.borderColor = 'var(--accent)';
    });

    if (themeManager.getCurrentTheme().name === theme.id) {
      item.style.borderColor = 'var(--accent)';
    }

    container.appendChild(item);
  });
}

function getCSSVariable(name, fallback = '') {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function setCSSVariable(name, value) {
  document.documentElement.style.setProperty(name, value);
}

/* ================= 主题过渡动画增强 ================= */

function animateColorTransition(duration = 400) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;background:var(--accent);opacity:0;transition:opacity 0.15s ease;';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '0.08'; });
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }, duration / 2);
}

/* ================= 导出增强 ================= */

/* ================= 动态主题 CSS 构建器 ================= */

function buildThemeCSS(themeName, selector = ':root') {
  const theme = themeManager.themes.get(themeName);
  if (!theme) return '';
  const vars = Object.entries(theme.variables).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `${selector} {\n${vars}\n}`;
}

function applyThemeToIFrame(iframe, themeName) {
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return false;
  let style = doc.getElementById('qingluan-theme');
  if (!style) {
    style = doc.createElement('style');
    style.id = 'qingluan-theme';
    doc.head.appendChild(style);
  }
  style.textContent = buildThemeCSS(themeName, ':root');
  return true;
}

/* ================= 主题对比工具 ================= */

function diffThemes(themeA, themeB) {
  const a = themeManager.themes.get(themeA);
  const b = themeManager.themes.get(themeB);
  if (!a || !b) return null;
  const diffs = [];
  const allKeys = new Set([...Object.keys(a.variables), ...Object.keys(b.variables)]);
  allKeys.forEach(key => {
    const va = a.variables[key];
    const vb = b.variables[key];
    if (va !== vb) diffs.push({ key, a: va, b: vb });
  });
  return diffs;
}

/* ================= 自适应主题 ================= */

class AdaptiveTheme {
  constructor() {
    this.hourlyThemes = new Map();
    this.enabled = false;
    this.timer = null;
  }

  setHourTheme(hour, themeName) {
    this.hourlyThemes.set(hour, themeName);
  }

  start() {
    this.enabled = true;
    this._check();
    this.timer = setInterval(() => this._check(), 60000);
  }

  stop() {
    this.enabled = false;
    if (this.timer) clearInterval(this.timer);
  }

  _check() {
    if (!this.enabled) return;
    const hour = new Date().getHours();
    const theme = this.hourlyThemes.get(hour);
    if (theme && themeManager.getCurrentTheme().name !== theme) {
      themeManager.applyTheme(theme);
    }
  }
}

const adaptiveTheme = new AdaptiveTheme();

/* ================= 导出增强 ================= */

/* ================= 主题热重载 ================= */

function watchThemeChanges(callback) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        callback(m.target.style.cssText);
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => observer.disconnect();
}

/* ================= 主题对比报告 ================= */

function generateThemeReport() {
  const current = themeManager.getCurrentTheme();
  const all = themeManager.listThemes();
  return {
    current: current.name,
    available: all.length,
    themes: all.map(t => ({ id: t.id, name: t.name, author: t.author })),
    timestamp: new Date().toISOString()
  };
}

/* ================= 导出增强 ================= */

// ============================================================================
// 追加：20+ 完整主题配置
// ============================================================================

const ExtendedThemes = {
  ocean: {
    name: '深海蓝',
    description: '宁静深邃的海洋色调',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#081820',
      '--text': '#c8e8e8',
      '--text2': '#80b8b8',
      '--text3': '#508888',
      '--accent': '#20c0c0',
      '--accent2': '#40e0d0',
      '--accent3': '#30d0c0',
      '--bubble-user': '#20c0c0',
      '--bubble-ai': '#0e2830',
      '--card-bg': '#0e2830',
      '--card-bg-hover': '#163840',
      '--border': 'rgba(32,192,192,0.1)',
      '--border-strong': 'rgba(32,192,192,0.18)',
      '--pink-bg': '#061418',
      '--black-card': '#163840',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(8,24,32,0.6)',
      '--input-bg': '#0e2830',
      '--input-border': 'rgba(32,192,192,0.12)',
      '--input-focus': 'rgba(32,192,192,0.25)',
      '--slider-track': 'rgba(32,192,192,0.1)',
      '--slider-thumb': '#20c0c0',
      '--switch-on': '#20c0c0',
      '--switch-off': 'rgba(32,192,192,0.15)',
      '--progress-bg': 'rgba(32,192,192,0.06)',
      '--progress-fill': '#20c0c0',
      '--scroll-track': 'rgba(32,192,192,0.04)',
      '--scroll-thumb': 'rgba(32,192,192,0.15)',
      '--scroll-thumb-hover': 'rgba(32,192,192,0.28)',
      '--tooltip-bg': 'rgba(14,40,48,0.95)',
      '--tooltip-text': '#c8e8e8',
      '--menu-bg': '#0e2830',
      '--menu-hover': 'rgba(32,192,192,0.1)',
      '--modal-backdrop': 'rgba(8,24,32,0.65)',
      '--code-bg': '#0a2028',
      '--code-text': '#90c8c8',
      '--tag-bg': 'rgba(32,192,192,0.1)',
      '--tag-text': '#20c0c0'
    }
  },

  flame: {
    name: '烈焰红',
    description: '炽热燃烧的火焰配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1a0808',
      '--text': '#f0c8c0',
      '--text2': '#c89080',
      '--text3': '#a06050',
      '--accent': '#ff4d2e',
      '--accent2': '#ff8844',
      '--accent3': '#ff6633',
      '--bubble-user': '#ff4d2e',
      '--bubble-ai': '#2a1010',
      '--card-bg': '#2a1010',
      '--card-bg-hover': '#3a1818',
      '--border': 'rgba(255,77,46,0.1)',
      '--border-strong': 'rgba(255,77,46,0.18)',
      '--pink-bg': '#140505',
      '--black-card': '#3a1818',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.25)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.35)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.45)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#ff4444',
      '--info': '#ff8844',
      '--overlay': 'rgba(26,8,8,0.6)',
      '--input-bg': '#2a1010',
      '--input-border': 'rgba(255,77,46,0.12)',
      '--input-focus': 'rgba(255,77,46,0.25)',
      '--slider-track': 'rgba(255,77,46,0.1)',
      '--slider-thumb': '#ff4d2e',
      '--switch-on': '#ff4d2e',
      '--switch-off': 'rgba(255,77,46,0.15)',
      '--progress-bg': 'rgba(255,77,46,0.06)',
      '--progress-fill': '#ff4d2e',
      '--scroll-track': 'rgba(255,77,46,0.04)',
      '--scroll-thumb': 'rgba(255,77,46,0.15)',
      '--scroll-thumb-hover': 'rgba(255,77,46,0.28)',
      '--tooltip-bg': 'rgba(42,16,16,0.95)',
      '--tooltip-text': '#f0c8c0',
      '--menu-bg': '#2a1010',
      '--menu-hover': 'rgba(255,77,46,0.1)',
      '--modal-backdrop': 'rgba(26,8,8,0.65)',
      '--code-bg': '#200c0c',
      '--code-text': '#d0a090',
      '--tag-bg': 'rgba(255,77,46,0.1)',
      '--tag-text': '#ff4d2e'
    }
  },

  starry: {
    name: '星空紫',
    description: '浩瀚星空的紫黑配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0a0818',
      '--text': '#d8d0f0',
      '--text2': '#a090c8',
      '--text3': '#7060a0',
      '--accent': '#a855f7',
      '--accent2': '#c084fc',
      '--accent3': '#b070f0',
      '--bubble-user': '#a855f7',
      '--bubble-ai': '#140e28',
      '--card-bg': '#140e28',
      '--card-bg-hover': '#1e1838',
      '--border': 'rgba(168,85,247,0.1)',
      '--border-strong': 'rgba(168,85,247,0.18)',
      '--pink-bg': '#080618',
      '--black-card': '#1e1838',
      '--shadow-sm': '0 0 6px rgba(168,85,247,0.12)',
      '--shadow-md': '0 0 16px rgba(168,85,247,0.18)',
      '--shadow-lg': '0 0 40px rgba(168,85,247,0.25)',
      '--radius-sm': '10px',
      '--radius-md': '16px',
      '--radius-lg': '24px',
      '--radius-xl': '40px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(10,8,24,0.6)',
      '--input-bg': '#140e28',
      '--input-border': 'rgba(168,85,247,0.12)',
      '--input-focus': 'rgba(168,85,247,0.25)',
      '--slider-track': 'rgba(168,85,247,0.1)',
      '--slider-thumb': '#a855f7',
      '--switch-on': '#a855f7',
      '--switch-off': 'rgba(168,85,247,0.15)',
      '--progress-bg': 'rgba(168,85,247,0.06)',
      '--progress-fill': '#a855f7',
      '--scroll-track': 'rgba(168,85,247,0.04)',
      '--scroll-thumb': 'rgba(168,85,247,0.15)',
      '--scroll-thumb-hover': 'rgba(168,85,247,0.28)',
      '--tooltip-bg': 'rgba(20,14,40,0.95)',
      '--tooltip-text': '#d8d0f0',
      '--menu-bg': '#140e28',
      '--menu-hover': 'rgba(168,85,247,0.1)',
      '--modal-backdrop': 'rgba(10,8,24,0.65)',
      '--code-bg': '#100a20',
      '--code-text': '#b0a0d0',
      '--tag-bg': 'rgba(168,85,247,0.1)',
      '--tag-text': '#a855f7'
    }
  },

  ink: {
    name: '水墨黑',
    description: '中国传统水墨风格',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0a0a0a',
      '--text': '#d0d0d0',
      '--text2': '#a0a0a0',
      '--text3': '#707070',
      '--accent': '#c8c8c8',
      '--accent2': '#a0a0a0',
      '--accent3': '#e0e0e0',
      '--bubble-user': '#c8c8c8',
      '--bubble-ai': '#1a1a1a',
      '--card-bg': '#141414',
      '--card-bg-hover': '#1e1e1e',
      '--border': 'rgba(200,200,200,0.1)',
      '--border-strong': 'rgba(200,200,200,0.18)',
      '--pink-bg': '#080808',
      '--black-card': '#1e1e1e',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.3)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.4)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.5)',
      '--radius-sm': '2px',
      '--radius-md': '4px',
      '--radius-lg': '6px',
      '--radius-xl': '8px',
      '--font-sans': "'Noto Serif SC', 'Songti SC', 'STSong', serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#90c890',
      '--warning': '#c8c090',
      '--error': '#c89090',
      '--info': '#90a0c8',
      '--overlay': 'rgba(0,0,0,0.6)',
      '--input-bg': '#141414',
      '--input-border': 'rgba(200,200,200,0.12)',
      '--input-focus': 'rgba(200,200,200,0.2)',
      '--slider-track': 'rgba(200,200,200,0.1)',
      '--slider-thumb': '#c8c8c8',
      '--switch-on': '#c8c8c8',
      '--switch-off': 'rgba(200,200,200,0.15)',
      '--progress-bg': 'rgba(200,200,200,0.06)',
      '--progress-fill': '#c8c8c8',
      '--scroll-track': 'rgba(200,200,200,0.04)',
      '--scroll-thumb': 'rgba(200,200,200,0.15)',
      '--scroll-thumb-hover': 'rgba(200,200,200,0.28)',
      '--tooltip-bg': 'rgba(30,30,30,0.95)',
      '--tooltip-text': '#d0d0d0',
      '--menu-bg': '#141414',
      '--menu-hover': 'rgba(200,200,200,0.08)',
      '--modal-backdrop': 'rgba(0,0,0,0.7)',
      '--code-bg': '#101010',
      '--code-text': '#b0b0b0',
      '--tag-bg': 'rgba(200,200,200,0.08)',
      '--tag-text': '#c8c8c8'
    }
  },

  washi: {
    name: '和纸白',
    description: '日系和纸温暖质感',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f5f0e8',
      '--text': '#3a3530',
      '--text2': '#6a6560',
      '--text3': '#9a9590',
      '--accent': '#c45c48',
      '--accent2': '#d4a058',
      '--accent3': '#b05040',
      '--bubble-user': '#c45c48',
      '--bubble-ai': '#ede8e0',
      '--card-bg': '#faf8f4',
      '--card-bg-hover': '#f5f2ec',
      '--border': 'rgba(60,50,40,0.08)',
      '--border-strong': 'rgba(60,50,40,0.15)',
      '--pink-bg': '#f5f0e8',
      '--black-card': '#3a3530',
      '--shadow-sm': '0 1px 4px rgba(60,50,40,0.04)',
      '--shadow-md': '0 4px 16px rgba(60,50,40,0.06)',
      '--shadow-lg': '0 12px 48px rgba(60,50,40,0.08)',
      '--radius-sm': '4px',
      '--radius-md': '8px',
      '--radius-lg': '12px',
      '--radius-xl': '20px',
      '--font-sans': "'Noto Sans JP', 'Hiragino Sans', 'Meiryo', sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#5d8c5d',
      '--warning': '#c4a35a',
      '--error': '#b05a5a',
      '--info': '#5a7a9a',
      '--overlay': 'rgba(60,50,40,0.3)',
      '--input-bg': '#faf8f4',
      '--input-border': 'rgba(60,50,40,0.12)',
      '--input-focus': 'rgba(196,92,72,0.2)',
      '--slider-track': 'rgba(60,50,40,0.1)',
      '--slider-thumb': '#c45c48',
      '--switch-on': '#c45c48',
      '--switch-off': 'rgba(60,50,40,0.15)',
      '--progress-bg': 'rgba(60,50,40,0.06)',
      '--progress-fill': '#c45c48',
      '--scroll-track': 'rgba(60,50,40,0.04)',
      '--scroll-thumb': 'rgba(60,50,40,0.15)',
      '--scroll-thumb-hover': 'rgba(60,50,40,0.25)',
      '--tooltip-bg': 'rgba(58,53,48,0.9)',
      '--tooltip-text': '#f5f0e8',
      '--menu-bg': '#faf8f4',
      '--menu-hover': 'rgba(196,92,72,0.06)',
      '--modal-backdrop': 'rgba(60,50,40,0.4)',
      '--code-bg': '#ece8e0',
      '--code-text': '#4a4540',
      '--tag-bg': 'rgba(196,92,72,0.08)',
      '--tag-text': '#c45c48'
    }
  },

  sunset: {
    name: '日落橙',
    description: '温暖日落渐变配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1a1010',
      '--text': '#f0d8c8',
      '--text2': '#d0a888',
      '--text3': '#a07858',
      '--accent': '#ff8855',
      '--accent2': '#ffaa66',
      '--accent3': '#ff7744',
      '--bubble-user': '#ff8855',
      '--bubble-ai': '#2a1810',
      '--card-bg': '#2a1810',
      '--card-bg-hover': '#3a2418',
      '--border': 'rgba(255,136,85,0.1)',
      '--border-strong': 'rgba(255,136,85,0.18)',
      '--pink-bg': '#140c08',
      '--black-card': '#3a2418',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '10px',
      '--radius-md': '16px',
      '--radius-lg': '24px',
      '--radius-xl': '40px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(26,16,16,0.6)',
      '--input-bg': '#2a1810',
      '--input-border': 'rgba(255,136,85,0.12)',
      '--input-focus': 'rgba(255,136,85,0.25)',
      '--slider-track': 'rgba(255,136,85,0.1)',
      '--slider-thumb': '#ff8855',
      '--switch-on': '#ff8855',
      '--switch-off': 'rgba(255,136,85,0.15)',
      '--progress-bg': 'rgba(255,136,85,0.06)',
      '--progress-fill': '#ff8855',
      '--scroll-track': 'rgba(255,136,85,0.04)',
      '--scroll-thumb': 'rgba(255,136,85,0.15)',
      '--scroll-thumb-hover': 'rgba(255,136,85,0.28)',
      '--tooltip-bg': 'rgba(42,24,16,0.95)',
      '--tooltip-text': '#f0d8c8',
      '--menu-bg': '#2a1810',
      '--menu-hover': 'rgba(255,136,85,0.1)',
      '--modal-backdrop': 'rgba(26,16,16,0.65)',
      '--code-bg': '#20140c',
      '--code-text': '#d0b090',
      '--tag-bg': 'rgba(255,136,85,0.1)',
      '--tag-text': '#ff8855'
    }
  },

  mint: {
    name: '薄荷绿',
    description: '清新薄荷浅绿配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f0f8f4',
      '--text': '#1a3028',
      '--text2': '#4a7060',
      '--text3': '#7aa090',
      '--accent': '#34c88a',
      '--accent2': '#5ae0a8',
      '--accent3': '#44d898',
      '--bubble-user': '#34c88a',
      '--bubble-ai': '#e0f0e8',
      '--card-bg': '#fff',
      '--card-bg-hover': '#f5faf8',
      '--border': 'rgba(52,200,138,0.08)',
      '--border-strong': 'rgba(52,200,138,0.15)',
      '--pink-bg': '#f0f8f4',
      '--black-card': '#1a3028',
      '--shadow-sm': '0 1px 4px rgba(26,48,40,0.04)',
      '--shadow-md': '0 4px 16px rgba(26,48,40,0.06)',
      '--shadow-lg': '0 12px 48px rgba(26,48,40,0.08)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34c88a',
      '--warning': '#f5c542',
      '--error': '#e85a5a',
      '--info': '#5aa8d4',
      '--overlay': 'rgba(26,48,40,0.35)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(52,200,138,0.12)',
      '--input-focus': 'rgba(52,200,138,0.2)',
      '--slider-track': 'rgba(52,200,138,0.1)',
      '--slider-thumb': '#34c88a',
      '--switch-on': '#34c88a',
      '--switch-off': 'rgba(52,200,138,0.15)',
      '--progress-bg': 'rgba(52,200,138,0.06)',
      '--progress-fill': '#34c88a',
      '--scroll-track': 'rgba(52,200,138,0.04)',
      '--scroll-thumb': 'rgba(52,200,138,0.15)',
      '--scroll-thumb-hover': 'rgba(52,200,138,0.28)',
      '--tooltip-bg': 'rgba(26,48,40,0.9)',
      '--tooltip-text': '#f0f8f4',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(52,200,138,0.06)',
      '--modal-backdrop': 'rgba(26,48,40,0.45)',
      '--code-bg': '#e8f4ee',
      '--code-text': '#2a5040',
      '--tag-bg': 'rgba(52,200,138,0.08)',
      '--tag-text': '#34c88a'
    }
  },

  lavender: {
    name: '薰衣草紫',
    description: '浪漫淡紫配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f4f0f8',
      '--text': '#2e2040',
      '--text2': '#5e5070',
      '--text3': '#8e80a0',
      '--accent': '#9b7ed8',
      '--accent2': '#b8a0e8',
      '--accent3': '#a890e0',
      '--bubble-user': '#9b7ed8',
      '--bubble-ai': '#ece8f4',
      '--card-bg': '#fff',
      '--card-bg-hover': '#f8f6fc',
      '--border': 'rgba(155,126,216,0.08)',
      '--border-strong': 'rgba(155,126,216,0.15)',
      '--pink-bg': '#f4f0f8',
      '--black-card': '#2e2040',
      '--shadow-sm': '0 1px 4px rgba(46,32,64,0.04)',
      '--shadow-md': '0 4px 16px rgba(46,32,64,0.06)',
      '--shadow-lg': '0 12px 48px rgba(46,32,64,0.08)',
      '--radius-sm': '10px',
      '--radius-md': '16px',
      '--radius-lg': '24px',
      '--radius-xl': '40px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#6bcb77',
      '--warning': '#f5c542',
      '--error': '#ff6b6b',
      '--info': '#6fa8dc',
      '--overlay': 'rgba(46,32,64,0.35)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(155,126,216,0.12)',
      '--input-focus': 'rgba(155,126,216,0.2)',
      '--slider-track': 'rgba(155,126,216,0.1)',
      '--slider-thumb': '#9b7ed8',
      '--switch-on': '#9b7ed8',
      '--switch-off': 'rgba(155,126,216,0.15)',
      '--progress-bg': 'rgba(155,126,216,0.06)',
      '--progress-fill': '#9b7ed8',
      '--scroll-track': 'rgba(155,126,216,0.04)',
      '--scroll-thumb': 'rgba(155,126,216,0.15)',
      '--scroll-thumb-hover': 'rgba(155,126,216,0.28)',
      '--tooltip-bg': 'rgba(46,32,64,0.9)',
      '--tooltip-text': '#f4f0f8',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(155,126,216,0.06)',
      '--modal-backdrop': 'rgba(46,32,64,0.45)',
      '--code-bg': '#ece8f4',
      '--code-text': '#4e4060',
      '--tag-bg': 'rgba(155,126,216,0.08)',
      '--tag-text': '#9b7ed8'
    }
  },

  gold: {
    name: '奢华金',
    description: '黑金奢华配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#0f0f0f',
      '--text': '#e8dcc8',
      '--text2': '#b8a888',
      '--text3': '#887858',
      '--accent': '#d4af37',
      '--accent2': '#e8c858',
      '--accent3': '#c9a030',
      '--bubble-user': '#d4af37',
      '--bubble-ai': '#1a1a1a',
      '--card-bg': '#1a1a1a',
      '--card-bg-hover': '#242424',
      '--border': 'rgba(212,175,55,0.15)',
      '--border-strong': 'rgba(212,175,55,0.25)',
      '--pink-bg': '#0a0a0a',
      '--black-card': '#242424',
      '--shadow-sm': '0 0 4px rgba(212,175,55,0.1)',
      '--shadow-md': '0 0 12px rgba(212,175,55,0.15)',
      '--shadow-lg': '0 0 30px rgba(212,175,55,0.2)',
      '--radius-sm': '4px',
      '--radius-md': '8px',
      '--radius-lg': '12px',
      '--radius-xl': '20px',
      '--font-sans': "'Cinzel', 'Playfair Display', serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(0,0,0,0.6)',
      '--input-bg': '#1a1a1a',
      '--input-border': 'rgba(212,175,55,0.2)',
      '--input-focus': 'rgba(212,175,55,0.3)',
      '--slider-track': 'rgba(212,175,55,0.15)',
      '--slider-thumb': '#d4af37',
      '--switch-on': '#d4af37',
      '--switch-off': 'rgba(212,175,55,0.15)',
      '--progress-bg': 'rgba(212,175,55,0.08)',
      '--progress-fill': '#d4af37',
      '--scroll-track': 'rgba(212,175,55,0.04)',
      '--scroll-thumb': 'rgba(212,175,55,0.2)',
      '--scroll-thumb-hover': 'rgba(212,175,55,0.35)',
      '--tooltip-bg': 'rgba(26,26,26,0.95)',
      '--tooltip-text': '#e8dcc8',
      '--menu-bg': '#1a1a1a',
      '--menu-hover': 'rgba(212,175,55,0.08)',
      '--modal-backdrop': 'rgba(0,0,0,0.7)',
      '--code-bg': '#141414',
      '--code-text': '#c8b888',
      '--tag-bg': 'rgba(212,175,55,0.1)',
      '--tag-text': '#d4af37'
    }
  },

  nord: {
    name: 'Nord 极北',
    description: 'Nord 配色方案移植',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#2e3440',
      '--text': '#d8dee9',
      '--text2': '#81a1c1',
      '--text3': '#5e81ac',
      '--accent': '#88c0d0',
      '--accent2': '#8fbcbb',
      '--accent3': '#81a1c1',
      '--bubble-user': '#88c0d0',
      '--bubble-ai': '#3b4252',
      '--card-bg': '#3b4252',
      '--card-bg-hover': '#434c5e',
      '--border': 'rgba(136,192,208,0.1)',
      '--border-strong': 'rgba(136,192,208,0.18)',
      '--pink-bg': '#242933',
      '--black-card': '#434c5e',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#a3be8c',
      '--warning': '#ebcb8b',
      '--error': '#bf616a',
      '--info': '#81a1c1',
      '--overlay': 'rgba(46,52,64,0.6)',
      '--input-bg': '#3b4252',
      '--input-border': 'rgba(136,192,208,0.12)',
      '--input-focus': 'rgba(136,192,208,0.25)',
      '--slider-track': 'rgba(136,192,208,0.1)',
      '--slider-thumb': '#88c0d0',
      '--switch-on': '#88c0d0',
      '--switch-off': 'rgba(136,192,208,0.15)',
      '--progress-bg': 'rgba(136,192,208,0.06)',
      '--progress-fill': '#88c0d0',
      '--scroll-track': 'rgba(136,192,208,0.04)',
      '--scroll-thumb': 'rgba(136,192,208,0.15)',
      '--scroll-thumb-hover': 'rgba(136,192,208,0.28)',
      '--tooltip-bg': 'rgba(59,66,82,0.95)',
      '--tooltip-text': '#d8dee9',
      '--menu-bg': '#3b4252',
      '--menu-hover': 'rgba(136,192,208,0.1)',
      '--modal-backdrop': 'rgba(46,52,64,0.65)',
      '--code-bg': '#2e3440',
      '--code-text': '#d8dee9',
      '--tag-bg': 'rgba(136,192,208,0.1)',
      '--tag-text': '#88c0d0'
    }
  },

  dracula: {
    name: 'Dracula 德古拉',
    description: 'Dracula 经典暗色主题',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#282a36',
      '--text': '#f8f8f2',
      '--text2': '#6272a4',
      '--text3': '#44475a',
      '--accent': '#ff79c6',
      '--accent2': '#8be9fd',
      '--accent3': '#bd93f9',
      '--bubble-user': '#ff79c6',
      '--bubble-ai': '#44475a',
      '--card-bg': '#44475a',
      '--card-bg-hover': '#4d5066',
      '--border': 'rgba(255,121,198,0.1)',
      '--border-strong': 'rgba(255,121,198,0.18)',
      '--pink-bg': '#21222c',
      '--black-card': '#4d5066',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#50fa7b',
      '--warning': '#f1fa8c',
      '--error': '#ff5555',
      '--info': '#8be9fd',
      '--overlay': 'rgba(40,42,54,0.6)',
      '--input-bg': '#44475a',
      '--input-border': 'rgba(255,121,198,0.12)',
      '--input-focus': 'rgba(255,121,198,0.25)',
      '--slider-track': 'rgba(255,121,198,0.1)',
      '--slider-thumb': '#ff79c6',
      '--switch-on': '#ff79c6',
      '--switch-off': 'rgba(255,121,198,0.15)',
      '--progress-bg': 'rgba(255,121,198,0.06)',
      '--progress-fill': '#ff79c6',
      '--scroll-track': 'rgba(255,121,198,0.04)',
      '--scroll-thumb': 'rgba(255,121,198,0.15)',
      '--scroll-thumb-hover': 'rgba(255,121,198,0.28)',
      '--tooltip-bg': 'rgba(68,71,90,0.95)',
      '--tooltip-text': '#f8f8f2',
      '--menu-bg': '#44475a',
      '--menu-hover': 'rgba(255,121,198,0.1)',
      '--modal-backdrop': 'rgba(40,42,54,0.65)',
      '--code-bg': '#282a36',
      '--code-text': '#f8f8f2',
      '--tag-bg': 'rgba(255,121,198,0.1)',
      '--tag-text': '#ff79c6'
    }
  },

  solarizedDark: {
    name: 'Solarized 暗',
    description: 'Solarized 暗色方案',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#002b36',
      '--text': '#eee8d5',
      '--text2': '#93a1a1',
      '--text3': '#839496',
      '--accent': '#268bd2',
      '--accent2': '#2aa198',
      '--accent3': '#859900',
      '--bubble-user': '#268bd2',
      '--bubble-ai': '#073642',
      '--card-bg': '#073642',
      '--card-bg-hover': '#0a3d4a',
      '--border': 'rgba(38,139,210,0.1)',
      '--border-strong': 'rgba(38,139,210,0.18)',
      '--pink-bg': '#001f27',
      '--black-card': '#0a3d4a',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '4px',
      '--radius-md': '6px',
      '--radius-lg': '10px',
      '--radius-xl': '16px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#859900',
      '--warning': '#b58900',
      '--error': '#dc322f',
      '--info': '#268bd2',
      '--overlay': 'rgba(0,43,54,0.6)',
      '--input-bg': '#073642',
      '--input-border': 'rgba(38,139,210,0.12)',
      '--input-focus': 'rgba(38,139,210,0.25)',
      '--slider-track': 'rgba(38,139,210,0.1)',
      '--slider-thumb': '#268bd2',
      '--switch-on': '#268bd2',
      '--switch-off': 'rgba(38,139,210,0.15)',
      '--progress-bg': 'rgba(38,139,210,0.06)',
      '--progress-fill': '#268bd2',
      '--scroll-track': 'rgba(38,139,210,0.04)',
      '--scroll-thumb': 'rgba(38,139,210,0.15)',
      '--scroll-thumb-hover': 'rgba(38,139,210,0.28)',
      '--tooltip-bg': 'rgba(7,54,66,0.95)',
      '--tooltip-text': '#eee8d5',
      '--menu-bg': '#073642',
      '--menu-hover': 'rgba(38,139,210,0.1)',
      '--modal-backdrop': 'rgba(0,43,54,0.65)',
      '--code-bg': '#002b36',
      '--code-text': '#eee8d5',
      '--tag-bg': 'rgba(38,139,210,0.1)',
      '--tag-text': '#268bd2'
    }
  },

  solarizedLight: {
    name: 'Solarized 亮',
    description: 'Solarized 亮色方案',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#fdf6e3',
      '--text': '#073642',
      '--text2': '#586e75',
      '--text3': '#93a1a1',
      '--accent': '#268bd2',
      '--accent2': '#2aa198',
      '--accent3': '#859900',
      '--bubble-user': '#268bd2',
      '--bubble-ai': '#eee8d5',
      '--card-bg': '#fff',
      '--card-bg-hover': '#f5f0e0',
      '--border': 'rgba(38,139,210,0.08)',
      '--border-strong': 'rgba(38,139,210,0.15)',
      '--pink-bg': '#fdf6e3',
      '--black-card': '#073642',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.04)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.06)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.08)',
      '--radius-sm': '4px',
      '--radius-md': '6px',
      '--radius-lg': '10px',
      '--radius-xl': '16px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#859900',
      '--warning': '#b58900',
      '--error': '#dc322f',
      '--info': '#268bd2',
      '--overlay': 'rgba(7,54,66,0.35)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(38,139,210,0.12)',
      '--input-focus': 'rgba(38,139,210,0.2)',
      '--slider-track': 'rgba(38,139,210,0.1)',
      '--slider-thumb': '#268bd2',
      '--switch-on': '#268bd2',
      '--switch-off': 'rgba(38,139,210,0.15)',
      '--progress-bg': 'rgba(38,139,210,0.06)',
      '--progress-fill': '#268bd2',
      '--scroll-track': 'rgba(38,139,210,0.04)',
      '--scroll-thumb': 'rgba(38,139,210,0.15)',
      '--scroll-thumb-hover': 'rgba(38,139,210,0.28)',
      '--tooltip-bg': 'rgba(7,54,66,0.9)',
      '--tooltip-text': '#fdf6e3',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(38,139,210,0.06)',
      '--modal-backdrop': 'rgba(7,54,66,0.45)',
      '--code-bg': '#eee8d5',
      '--code-text': '#073642',
      '--tag-bg': 'rgba(38,139,210,0.08)',
      '--tag-text': '#268bd2'
    }
  },

  matrix: {
    name: '矩阵绿',
    description: '经典矩阵数字雨风格',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#000000',
      '--text': '#00ff00',
      '--text2': '#00cc00',
      '--text3': '#009900',
      '--accent': '#00ff00',
      '--accent2': '#33ff33',
      '--accent3': '#66ff66',
      '--bubble-user': '#00ff00',
      '--bubble-ai': '#001100',
      '--card-bg': '#001100',
      '--card-bg-hover': '#002200',
      '--border': 'rgba(0,255,0,0.15)',
      '--border-strong': 'rgba(0,255,0,0.25)',
      '--pink-bg': '#000500',
      '--black-card': '#002200',
      '--shadow-sm': '0 0 4px rgba(0,255,0,0.1)',
      '--shadow-md': '0 0 12px rgba(0,255,0,0.15)',
      '--shadow-lg': '0 0 30px rgba(0,255,0,0.2)',
      '--radius-sm': '0px',
      '--radius-md': '0px',
      '--radius-lg': '0px',
      '--radius-xl': '0px',
      '--font-sans': "'Fira Code', 'Consolas', 'Courier New', monospace",
      '--font-mono': "'Fira Code', 'Consolas', 'Courier New', monospace",
      '--success': '#00ff00',
      '--warning': '#ffff00',
      '--error': '#ff0000',
      '--info': '#00ffff',
      '--overlay': 'rgba(0,0,0,0.7)',
      '--input-bg': '#001100',
      '--input-border': 'rgba(0,255,0,0.2)',
      '--input-focus': 'rgba(0,255,0,0.3)',
      '--slider-track': 'rgba(0,255,0,0.15)',
      '--slider-thumb': '#00ff00',
      '--switch-on': '#00ff00',
      '--switch-off': 'rgba(0,255,0,0.15)',
      '--progress-bg': 'rgba(0,255,0,0.08)',
      '--progress-fill': '#00ff00',
      '--scroll-track': 'rgba(0,255,0,0.04)',
      '--scroll-thumb': 'rgba(0,255,0,0.2)',
      '--scroll-thumb-hover': 'rgba(0,255,0,0.35)',
      '--tooltip-bg': '#001100',
      '--tooltip-text': '#00ff00',
      '--menu-bg': '#001100',
      '--menu-hover': 'rgba(0,255,0,0.08)',
      '--modal-backdrop': 'rgba(0,0,0,0.75)',
      '--code-bg': '#000500',
      '--code-text': '#00ff00',
      '--tag-bg': 'rgba(0,255,0,0.1)',
      '--tag-text': '#00ff00'
    }
  },

  highContrast: {
    name: '高对比度',
    description: '无障碍高对比度模式',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#000000',
      '--text': '#ffffff',
      '--text2': '#ffffff',
      '--text3': '#cccccc',
      '--accent': '#ffff00',
      '--accent2': '#00ffff',
      '--accent3': '#ff00ff',
      '--bubble-user': '#ffff00',
      '--bubble-ai': '#000000',
      '--card-bg': '#000000',
      '--card-bg-hover': '#111111',
      '--border': '#ffffff',
      '--border-strong': '#ffffff',
      '--pink-bg': '#000000',
      '--black-card': '#000000',
      '--shadow-sm': 'none',
      '--shadow-md': 'none',
      '--shadow-lg': 'none',
      '--radius-sm': '0px',
      '--radius-md': '0px',
      '--radius-lg': '0px',
      '--radius-xl': '0px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#00ff00',
      '--warning': '#ffff00',
      '--error': '#ff0000',
      '--info': '#00ffff',
      '--overlay': 'rgba(0,0,0,0.8)',
      '--input-bg': '#000000',
      '--input-border': '#ffffff',
      '--input-focus': '#ffff00',
      '--slider-track': '#ffffff',
      '--slider-thumb': '#ffff00',
      '--switch-on': '#ffff00',
      '--switch-off': '#666666',
      '--progress-bg': '#ffffff',
      '--progress-fill': '#ffff00',
      '--scroll-track': '#ffffff',
      '--scroll-thumb': '#ffff00',
      '--scroll-thumb-hover': '#ffff00',
      '--tooltip-bg': '#000000',
      '--tooltip-text': '#ffffff',
      '--menu-bg': '#000000',
      '--menu-hover': '#333333',
      '--modal-backdrop': 'rgba(0,0,0,0.9)',
      '--code-bg': '#000000',
      '--code-text': '#ffffff',
      '--tag-bg': '#333333',
      '--tag-text': '#ffff00'
    }
  },

  coffee: {
    name: '咖啡棕',
    description: '温暖咖啡色调',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1e1510',
      '--text': '#e8d8c8',
      '--text2': '#b8a088',
      '--text3': '#887058',
      '--accent': '#c69060',
      '--accent2': '#d4a070',
      '--accent3': '#b88050',
      '--bubble-user': '#c69060',
      '--bubble-ai': '#2a2018',
      '--card-bg': '#2a2018',
      '--card-bg-hover': '#3a2c20',
      '--border': 'rgba(198,144,96,0.1)',
      '--border-strong': 'rgba(198,144,96,0.18)',
      '--pink-bg': '#16100c',
      '--black-card': '#3a2c20',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#7aaa60',
      '--warning': '#c8a860',
      '--error': '#c87060',
      '--info': '#6090c8',
      '--overlay': 'rgba(30,21,16,0.6)',
      '--input-bg': '#2a2018',
      '--input-border': 'rgba(198,144,96,0.12)',
      '--input-focus': 'rgba(198,144,96,0.25)',
      '--slider-track': 'rgba(198,144,96,0.1)',
      '--slider-thumb': '#c69060',
      '--switch-on': '#c69060',
      '--switch-off': 'rgba(198,144,96,0.15)',
      '--progress-bg': 'rgba(198,144,96,0.06)',
      '--progress-fill': '#c69060',
      '--scroll-track': 'rgba(198,144,96,0.04)',
      '--scroll-thumb': 'rgba(198,144,96,0.15)',
      '--scroll-thumb-hover': 'rgba(198,144,96,0.28)',
      '--tooltip-bg': 'rgba(42,32,24,0.95)',
      '--tooltip-text': '#e8d8c8',
      '--menu-bg': '#2a2018',
      '--menu-hover': 'rgba(198,144,96,0.1)',
      '--modal-backdrop': 'rgba(30,21,16,0.65)',
      '--code-bg': '#201810',
      '--code-text': '#c8b8a0',
      '--tag-bg': 'rgba(198,144,96,0.1)',
      '--tag-text': '#c69060'
    }
  },

  rose: {
    name: '玫瑰红',
    description: '浪漫玫瑰深红配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1e1018',
      '--text': '#f0d8e0',
      '--text2': '#d0a0b0',
      '--text3': '#a07080',
      '--accent': '#e85a80',
      '--accent2': '#f07090',
      '--accent3': '#d85070',
      '--bubble-user': '#e85a80',
      '--bubble-ai': '#2a1820',
      '--card-bg': '#2a1820',
      '--card-bg-hover': '#3a2430',
      '--border': 'rgba(232,90,128,0.1)',
      '--border-strong': 'rgba(232,90,128,0.18)',
      '--pink-bg': '#160c12',
      '--black-card': '#3a2430',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '10px',
      '--radius-md': '16px',
      '--radius-lg': '24px',
      '--radius-xl': '40px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#ff4444',
      '--info': '#ff88aa',
      '--overlay': 'rgba(30,16,24,0.6)',
      '--input-bg': '#2a1820',
      '--input-border': 'rgba(232,90,128,0.12)',
      '--input-focus': 'rgba(232,90,128,0.25)',
      '--slider-track': 'rgba(232,90,128,0.1)',
      '--slider-thumb': '#e85a80',
      '--switch-on': '#e85a80',
      '--switch-off': 'rgba(232,90,128,0.15)',
      '--progress-bg': 'rgba(232,90,128,0.06)',
      '--progress-fill': '#e85a80',
      '--scroll-track': 'rgba(232,90,128,0.04)',
      '--scroll-thumb': 'rgba(232,90,128,0.15)',
      '--scroll-thumb-hover': 'rgba(232,90,128,0.28)',
      '--tooltip-bg': 'rgba(42,24,32,0.95)',
      '--tooltip-text': '#f0d8e0',
      '--menu-bg': '#2a1820',
      '--menu-hover': 'rgba(232,90,128,0.1)',
      '--modal-backdrop': 'rgba(30,16,24,0.65)',
      '--code-bg': '#201418',
      '--code-text': '#d0a8b8',
      '--tag-bg': 'rgba(232,90,128,0.1)',
      '--tag-text': '#e85a80'
    }
  },

  ice: {
    name: '冰霜蓝',
    description: '冰冷清透蓝白配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#e8f0f8',
      '--text': '#1a2838',
      '--text2': '#4a6078',
      '--text3': '#7a90a8',
      '--accent': '#4a90d9',
      '--accent2': '#6ab0e8',
      '--accent3': '#5aa0e0',
      '--bubble-user': '#4a90d9',
      '--bubble-ai': '#d8e8f8',
      '--card-bg': '#fff',
      '--card-bg-hover': '#f0f6fc',
      '--border': 'rgba(74,144,217,0.08)',
      '--border-strong': 'rgba(74,144,217,0.15)',
      '--pink-bg': '#e8f0f8',
      '--black-card': '#1a2838',
      '--shadow-sm': '0 1px 4px rgba(26,40,56,0.04)',
      '--shadow-md': '0 4px 16px rgba(26,40,56,0.06)',
      '--shadow-lg': '0 12px 48px rgba(26,40,56,0.08)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34c88a',
      '--warning': '#f5c542',
      '--error': '#e85a5a',
      '--info': '#5aa8d4',
      '--overlay': 'rgba(26,40,56,0.35)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(74,144,217,0.12)',
      '--input-focus': 'rgba(74,144,217,0.2)',
      '--slider-track': 'rgba(74,144,217,0.1)',
      '--slider-thumb': '#4a90d9',
      '--switch-on': '#4a90d9',
      '--switch-off': 'rgba(74,144,217,0.15)',
      '--progress-bg': 'rgba(74,144,217,0.06)',
      '--progress-fill': '#4a90d9',
      '--scroll-track': 'rgba(74,144,217,0.04)',
      '--scroll-thumb': 'rgba(74,144,217,0.15)',
      '--scroll-thumb-hover': 'rgba(74,144,217,0.28)',
      '--tooltip-bg': 'rgba(26,40,56,0.9)',
      '--tooltip-text': '#e8f0f8',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(74,144,217,0.06)',
      '--modal-backdrop': 'rgba(26,40,56,0.45)',
      '--code-bg': '#dce8f4',
      '--code-text': '#2a4058',
      '--tag-bg': 'rgba(74,144,217,0.08)',
      '--tag-text': '#4a90d9'
    }
  },

  amber: {
    name: '琥珀黄',
    description: '温暖琥珀黄昏配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1a1408',
      '--text': '#f0e0c0',
      '--text2': '#d0b880',
      '--text3': '#a08850',
      '--accent': '#f0a030',
      '--accent2': '#f0b840',
      '--accent3': '#e09828',
      '--bubble-user': '#f0a030',
      '--bubble-ai': '#2a2010',
      '--card-bg': '#2a2010',
      '--card-bg-hover': '#3a2c18',
      '--border': 'rgba(240,160,48,0.1)',
      '--border-strong': 'rgba(240,160,48,0.18)',
      '--pink-bg': '#120e06',
      '--black-card': '#3a2c18',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(26,20,8,0.6)',
      '--input-bg': '#2a2010',
      '--input-border': 'rgba(240,160,48,0.12)',
      '--input-focus': 'rgba(240,160,48,0.25)',
      '--slider-track': 'rgba(240,160,48,0.1)',
      '--slider-thumb': '#f0a030',
      '--switch-on': '#f0a030',
      '--switch-off': 'rgba(240,160,48,0.15)',
      '--progress-bg': 'rgba(240,160,48,0.06)',
      '--progress-fill': '#f0a030',
      '--scroll-track': 'rgba(240,160,48,0.04)',
      '--scroll-thumb': 'rgba(240,160,48,0.15)',
      '--scroll-thumb-hover': 'rgba(240,160,48,0.28)',
      '--tooltip-bg': 'rgba(42,32,16,0.95)',
      '--tooltip-text': '#f0e0c0',
      '--menu-bg': '#2a2010',
      '--menu-hover': 'rgba(240,160,48,0.1)',
      '--modal-backdrop': 'rgba(26,20,8,0.65)',
      '--code-bg': '#20180c',
      '--code-text': '#d0c0a0',
      '--tag-bg': 'rgba(240,160,48,0.1)',
      '--tag-text': '#f0a030'
    }
  },

  pastel: {
    name: ' pastel 粉彩',
    description: '柔和粉彩马卡龙配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f8f4f8',
      '--text': '#4a4050',
      '--text2': '#7a7080',
      '--text3': '#aaa0b0',
      '--accent': '#e8a0c8',
      '--accent2': '#a8d8f0',
      '--accent3': '#f0d0a0',
      '--bubble-user': '#e8a0c8',
      '--bubble-ai': '#f0ecf0',
      '--card-bg': '#fff',
      '--card-bg-hover': '#faf8fa',
      '--border': 'rgba(200,160,200,0.08)',
      '--border-strong': 'rgba(200,160,200,0.15)',
      '--pink-bg': '#f8f4f8',
      '--black-card': '#4a4050',
      '--shadow-sm': '0 1px 4px rgba(74,64,80,0.04)',
      '--shadow-md': '0 4px 16px rgba(74,64,80,0.06)',
      '--shadow-lg': '0 12px 48px rgba(74,64,80,0.08)',
      '--radius-sm': '12px',
      '--radius-md': '18px',
      '--radius-lg': '28px',
      '--radius-xl': '44px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#a0d8b0',
      '--warning': '#f0d8a0',
      '--error': '#f0a0a0',
      '--info': '#a0c8f0',
      '--overlay': 'rgba(74,64,80,0.3)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(200,160,200,0.12)',
      '--input-focus': 'rgba(232,160,200,0.2)',
      '--slider-track': 'rgba(200,160,200,0.1)',
      '--slider-thumb': '#e8a0c8',
      '--switch-on': '#e8a0c8',
      '--switch-off': 'rgba(200,160,200,0.15)',
      '--progress-bg': 'rgba(200,160,200,0.06)',
      '--progress-fill': '#e8a0c8',
      '--scroll-track': 'rgba(200,160,200,0.04)',
      '--scroll-thumb': 'rgba(200,160,200,0.15)',
      '--scroll-thumb-hover': 'rgba(200,160,200,0.28)',
      '--tooltip-bg': 'rgba(74,64,80,0.9)',
      '--tooltip-text': '#f8f4f8',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(232,160,200,0.06)',
      '--modal-backdrop': 'rgba(74,64,80,0.4)',
      '--code-bg': '#f0ecf0',
      '--code-text': '#5a5060',
      '--tag-bg': 'rgba(232,160,200,0.08)',
      '--tag-text': '#c880a8'
    }
  },

  retroTerminal: {
    name: '复古终端',
    description: 'AMBER 复古终端风格',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1a1205',
      '--text': '#ffb000',
      '--text2': '#cc8800',
      '--text3': '#996600',
      '--accent': '#ffb000',
      '--accent2': '#ffcc33',
      '--accent3': '#ffdd66',
      '--bubble-user': '#ffb000',
      '--bubble-ai': '#2a1e0a',
      '--card-bg': '#2a1e0a',
      '--card-bg-hover': '#3a2c10',
      '--border': 'rgba(255,176,0,0.15)',
      '--border-strong': 'rgba(255,176,0,0.25)',
      '--pink-bg': '#140e04',
      '--black-card': '#3a2c10',
      '--shadow-sm': '0 0 4px rgba(255,176,0,0.1)',
      '--shadow-md': '0 0 12px rgba(255,176,0,0.15)',
      '--shadow-lg': '0 0 30px rgba(255,176,0,0.2)',
      '--radius-sm': '0px',
      '--radius-md': '0px',
      '--radius-lg': '0px',
      '--radius-xl': '0px',
      '--font-sans': "'VT323', 'Fira Code', 'Consolas', monospace",
      '--font-mono': "'VT323', 'Fira Code', 'Consolas', monospace",
      '--success': '#33ff33',
      '--warning': '#ffff33',
      '--error': '#ff3333',
      '--info': '#33ffff',
      '--overlay': 'rgba(0,0,0,0.7)',
      '--input-bg': '#2a1e0a',
      '--input-border': 'rgba(255,176,0,0.2)',
      '--input-focus': 'rgba(255,176,0,0.3)',
      '--slider-track': 'rgba(255,176,0,0.15)',
      '--slider-thumb': '#ffb000',
      '--switch-on': '#ffb000',
      '--switch-off': 'rgba(255,176,0,0.15)',
      '--progress-bg': 'rgba(255,176,0,0.08)',
      '--progress-fill': '#ffb000',
      '--scroll-track': 'rgba(255,176,0,0.04)',
      '--scroll-thumb': 'rgba(255,176,0,0.2)',
      '--scroll-thumb-hover': 'rgba(255,176,0,0.35)',
      '--tooltip-bg': '#2a1e0a',
      '--tooltip-text': '#ffb000',
      '--menu-bg': '#2a1e0a',
      '--menu-hover': 'rgba(255,176,0,0.08)',
      '--modal-backdrop': 'rgba(0,0,0,0.75)',
      '--code-bg': '#1a1205',
      '--code-text': '#ffb000',
      '--tag-bg': 'rgba(255,176,0,0.1)',
      '--tag-text': '#ffb000'
    }
  },

  desert: {
    name: '沙漠黄',
    description: '沙漠与沙丘的温暖色调',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#f0e8d0',
      '--text': '#3a3020',
      '--text2': '#6a6050',
      '--text3': '#9a9080',
      '--accent': '#c8a050',
      '--accent2': '#d8b060',
      '--accent3': '#b89040',
      '--bubble-user': '#c8a050',
      '--bubble-ai': '#e8e0d0',
      '--card-bg': '#faf6f0',
      '--card-bg-hover': '#f5f0e8',
      '--border': 'rgba(80,60,40,0.08)',
      '--border-strong': 'rgba(80,60,40,0.15)',
      '--pink-bg': '#f0e8d0',
      '--black-card': '#3a3020',
      '--shadow-sm': '0 1px 4px rgba(60,50,40,0.04)',
      '--shadow-md': '0 4px 16px rgba(60,50,40,0.06)',
      '--shadow-lg': '0 12px 48px rgba(60,50,40,0.08)',
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'Fira Code', 'Consolas', monospace",
      '--success': '#7aaa60',
      '--warning': '#c8a860',
      '--error': '#c87060',
      '--info': '#6090c8',
      '--overlay': 'rgba(58,48,32,0.35)',
      '--input-bg': '#faf6f0',
      '--input-border': 'rgba(80,60,40,0.12)',
      '--input-focus': 'rgba(200,160,80,0.2)',
      '--slider-track': 'rgba(80,60,40,0.1)',
      '--slider-thumb': '#c8a050',
      '--switch-on': '#c8a050',
      '--switch-off': 'rgba(80,60,40,0.15)',
      '--progress-bg': 'rgba(80,60,40,0.06)',
      '--progress-fill': '#c8a050',
      '--scroll-track': 'rgba(80,60,40,0.04)',
      '--scroll-thumb': 'rgba(80,60,40,0.15)',
      '--scroll-thumb-hover': 'rgba(80,60,40,0.25)',
      '--tooltip-bg': 'rgba(58,48,32,0.9)',
      '--tooltip-text': '#f0e8d0',
      '--menu-bg': '#faf6f0',
      '--menu-hover': 'rgba(200,160,80,0.06)',
      '--modal-backdrop': 'rgba(58,48,32,0.45)',
      '--code-bg': '#e8e0d0',
      '--code-text': '#4a4030',
      '--tag-bg': 'rgba(200,160,80,0.08)',
      '--tag-text': '#c8a050'
    }
  },

  twilight: {
    name: '暮光紫',
    description: '黄昏暮光的紫灰配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#1a1824',
      '--text': '#d0cce0',
      '--text2': '#9088a0',
      '--text3': '#605870',
      '--accent': '#8877aa',
      '--accent2': '#a090c0',
      '--accent3': '#9988bb',
      '--bubble-user': '#8877aa',
      '--bubble-ai': '#242230',
      '--card-bg': '#242230',
      '--card-bg-hover': '#2e2c3c',
      '--border': 'rgba(136,119,170,0.1)',
      '--border-strong': 'rgba(136,119,170,0.18)',
      '--pink-bg': '#14121c',
      '--black-card': '#2e2c3c',
      '--shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 12px 48px rgba(0,0,0,0.4)',
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '22px',
      '--radius-xl': '36px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
      '--overlay': 'rgba(26,24,36,0.6)',
      '--input-bg': '#242230',
      '--input-border': 'rgba(136,119,170,0.12)',
      '--input-focus': 'rgba(136,119,170,0.25)',
      '--slider-track': 'rgba(136,119,170,0.1)',
      '--slider-thumb': '#8877aa',
      '--switch-on': '#8877aa',
      '--switch-off': 'rgba(136,119,170,0.15)',
      '--progress-bg': 'rgba(136,119,170,0.06)',
      '--progress-fill': '#8877aa',
      '--scroll-track': 'rgba(136,119,170,0.04)',
      '--scroll-thumb': 'rgba(136,119,170,0.15)',
      '--scroll-thumb-hover': 'rgba(136,119,170,0.28)',
      '--tooltip-bg': 'rgba(36,34,48,0.95)',
      '--tooltip-text': '#d0cce0',
      '--menu-bg': '#242230',
      '--menu-hover': 'rgba(136,119,170,0.1)',
      '--modal-backdrop': 'rgba(26,24,36,0.65)',
      '--code-bg': '#1e1c28',
      '--code-text': '#b0a8c0',
      '--tag-bg': 'rgba(136,119,170,0.1)',
      '--tag-text': '#8877aa'
    }
  },

  candy: {
    name: '糖果色',
    description: '甜美糖果多彩配色',
    author: 'Qingluan',
    version: '1.0',
    variables: {
      '--phone-bg': '#fff0f5',
      '--text': '#4a3040',
      '--text2': '#7a5a6a',
      '--text3': '#aa8a9a',
      '--accent': '#ff6b9d',
      '--accent2': '#88c8f0',
      '--accent3': '#f0d878',
      '--bubble-user': '#ff6b9d',
      '--bubble-ai': '#f8e8f0',
      '--card-bg': '#fff',
      '--card-bg-hover': '#fff8fa',
      '--border': 'rgba(255,107,157,0.08)',
      '--border-strong': 'rgba(255,107,157,0.15)',
      '--pink-bg': '#fff0f5',
      '--black-card': '#4a3040',
      '--shadow-sm': '0 1px 4px rgba(74,48,64,0.04)',
      '--shadow-md': '0 4px 16px rgba(74,48,64,0.06)',
      '--shadow-lg': '0 12px 48px rgba(74,48,64,0.08)',
      '--radius-sm': '12px',
      '--radius-md': '18px',
      '--radius-lg': '28px',
      '--radius-xl': '44px',
      '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'SF Mono', 'Fira Code', monospace",
      '--success': '#88d8a0',
      '--warning': '#f0d890',
      '--error': '#f09090',
      '--info': '#90c8f0',
      '--overlay': 'rgba(74,48,64,0.3)',
      '--input-bg': '#fff',
      '--input-border': 'rgba(255,107,157,0.12)',
      '--input-focus': 'rgba(255,107,157,0.2)',
      '--slider-track': 'rgba(255,107,157,0.1)',
      '--slider-thumb': '#ff6b9d',
      '--switch-on': '#ff6b9d',
      '--switch-off': 'rgba(255,107,157,0.15)',
      '--progress-bg': 'rgba(255,107,157,0.06)',
      '--progress-fill': '#ff6b9d',
      '--scroll-track': 'rgba(255,107,157,0.04)',
      '--scroll-thumb': 'rgba(255,107,157,0.15)',
      '--scroll-thumb-hover': 'rgba(255,107,157,0.28)',
      '--tooltip-bg': 'rgba(74,48,64,0.9)',
      '--tooltip-text': '#fff0f5',
      '--menu-bg': '#fff',
      '--menu-hover': 'rgba(255,107,157,0.06)',
      '--modal-backdrop': 'rgba(74,48,64,0.4)',
      '--code-bg': '#f8e8f0',
      '--code-text': '#5a4050',
      '--tag-bg': 'rgba(255,107,157,0.08)',
      '--tag-text': '#ff6b9d'
    }
  }
};

// 注册扩展主题
Object.entries(ExtendedThemes).forEach(([name, config]) => {
  if (!BuiltInThemes[name]) {
    BuiltInThemes[name] = config;
  }
});

// ============================================================================
// 追加：配色方案工具（色彩理论）
// ============================================================================

/**
 * 将 hex 颜色转为 RGB 对象
 * @param {string} hex
 * @returns {{r:number,g:number,b:number}|null}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * 将 RGB 转为 hex
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 将 RGB 转为 HSL
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{h:number,s:number,l:number}}
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

/**
 * 将 HSL 转为 RGB
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {{r:number,g:number,b:number}}
 */
function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

/**
 * 生成互补色
 * @param {string} hex
 * @returns {string}
 */
export function getComplementaryColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.h = (hsl.h + 180) % 360;
  const comp = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(comp.r, comp.g, comp.b);
}

/**
 * 生成三色配色
 * @param {string} hex
 * @returns {[string, string, string]}
 */
export function getTriadicColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex, hex];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return [0, 120, 240].map(offset => {
    const h = (hsl.h + offset) % 360;
    const c = hslToRgb(h, hsl.s, hsl.l);
    return rgbToHex(c.r, c.g, c.b);
  });
}

/**
 * 生成类比色配色
 * @param {string} hex
 * @returns {[string, string, string]}
 */
export function getAnalogousColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex, hex];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return [-30, 0, 30].map(offset => {
    const h = (hsl.h + offset + 360) % 360;
    const c = hslToRgb(h, hsl.s, hsl.l);
    return rgbToHex(c.r, c.g, c.b);
  });
}

/**
 * 生成分裂互补色
 * @param {string} hex
 * @returns {[string, string, string]}
 */
export function getSplitComplementaryColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex, hex];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return [150, 180, 210].map(offset => {
    const h = (hsl.h + offset) % 360;
    const c = hslToRgb(h, hsl.s, hsl.l);
    return rgbToHex(c.r, c.g, c.b);
  });
}

/**
 * 生成 Tetradic（矩形）配色
 * @param {string} hex
 * @returns {[string, string, string, string]}
 */
export function getTetradicColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex, hex, hex];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return [0, 60, 180, 240].map(offset => {
    const h = (hsl.h + offset) % 360;
    const c = hslToRgb(h, hsl.s, hsl.l);
    return rgbToHex(c.r, c.g, c.b);
  });
}

/**
 * 生成渐变色阶
 * @param {string} startHex
 * @param {string} endHex
 * @param {number} steps
 * @returns {string[]}
 */
export function generateGradientSteps(startHex, endHex, steps = 5) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  if (!start || !end) return [startHex, endHex];
  const result = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = start.r + (end.r - start.r) * t;
    const g = start.g + (end.g - start.g) * t;
    const b = start.b + (end.b - start.b) * t;
    result.push(rgbToHex(r, g, b));
  }
  return result;
}

/**
 * 生成 CSS 渐变字符串
 * @param {string} direction
 * @param {string[]} colors
 * @returns {string}
 */
export function generateCSSGradient(direction = 'to right', colors = ['#ff0000', '#0000ff']) {
  return `linear-gradient(${direction}, ${colors.join(', ')})`;
}

/**
 * 颜色对比度计算 (WCAG)
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
export function colorContrast(hex1, hex2) {
  const lum = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  const l1 = lum(hex1) + 0.05;
  const l2 = lum(hex2) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

/**
 * 检查颜色组合是否符合 WCAG AA 标准
 * @param {string} fg
 * @param {string} bg
 * @returns {boolean}
 */
export function isWCAGAA(fg, bg) {
  return colorContrast(fg, bg) >= 4.5;
}

/**
 * 检查颜色组合是否符合 WCAG AAA 标准
 * @param {string} fg
 * @param {string} bg
 * @returns {boolean}
 */
export function isWCAGAAA(fg, bg) {
  return colorContrast(fg, bg) >= 7;
}

// ============================================================================
// 追加：材质设计 Token 系统
// ============================================================================

export const MaterialTokens = {
  elevation: {
    level0: 'none',
    level1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    level2: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    level3: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    level4: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
    level5: '0 20px 40px rgba(0,0,0,0.2)'
  },
  shape: {
    none: '0px',
    extraSmall: '4px',
    small: '8px',
    medium: '12px',
    large: '16px',
    extraLarge: '28px',
    full: '9999px'
  },
  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      linear: 'linear',
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)'
    }
  },
  typography: {
    display: { fontSize: '57px', lineHeight: '64px', letterSpacing: '-0.25px', weight: 400 },
    headline: { fontSize: '32px', lineHeight: '40px', letterSpacing: '0px', weight: 400 },
    title: { fontSize: '22px', lineHeight: '28px', letterSpacing: '0px', weight: 500 },
    body: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0.5px', weight: 400 },
    label: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.25px', weight: 500 },
    caption: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0.4px', weight: 400 }
  }
};

/**
 * 将材质设计 Token 注入主题变量
 * @param {object} theme
 * @returns {object}
 */
export function injectMaterialTokens(theme) {
  const vars = { ...theme.variables };
  vars['--md-sys-elevation-1'] = MaterialTokens.elevation.level1;
  vars['--md-sys-elevation-2'] = MaterialTokens.elevation.level2;
  vars['--md-sys-elevation-3'] = MaterialTokens.elevation.level3;
  vars['--md-sys-shape-small'] = MaterialTokens.shape.small;
  vars['--md-sys-shape-medium'] = MaterialTokens.shape.medium;
  vars['--md-sys-shape-large'] = MaterialTokens.shape.large;
  vars['--md-sys-motion-fast'] = MaterialTokens.motion.duration.fast;
  vars['--md-sys-motion-normal'] = MaterialTokens.motion.duration.normal;
  vars['--md-sys-motion-slow'] = MaterialTokens.motion.duration.slow;
  vars['--md-sys-easing-standard'] = MaterialTokens.motion.easing.standard;
  vars['--md-sys-easing-decelerate'] = MaterialTokens.motion.easing.decelerate;
  vars['--md-sys-easing-accelerate'] = MaterialTokens.motion.easing.accelerate;
  return { ...theme, variables: vars };
}

// ============================================================================
// 追加：动态主题过渡动画增强
// ============================================================================

const EasingFunctions = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
};

/**
 * 高级主题过渡动画
 * @param {string} fromThemeName
 * @param {string} toThemeName
 * @param {number} duration
 * @param {string} easingName
 */
export function animateThemeTransition(fromThemeName, toThemeName, duration = 600, easingName = 'easeInOutCubic') {
  const fromTheme = themeManager.themes.get(fromThemeName);
  const toTheme = themeManager.themes.get(toThemeName);
  if (!fromTheme || !toTheme) return;

  const root = document.documentElement;
  const startVars = { ...fromTheme.variables };
  const endVars = { ...toTheme.variables };
  const allKeys = new Set([...Object.keys(startVars), ...Object.keys(endVars)]);
  const animatableKeys = [];

  allKeys.forEach(key => {
    const sv = startVars[key];
    const ev = endVars[key];
    if (sv && ev && sv.startsWith('#') && ev.startsWith('#')) {
      const srgb = hexToRgb(sv);
      const ergb = hexToRgb(ev);
      if (srgb && ergb) {
        animatableKeys.push({ key, srgb, ergb });
      }
    }
  });

  const easing = EasingFunctions[easingName] || EasingFunctions.easeInOutCubic;
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easing(t);

    animatableKeys.forEach(({ key, srgb, ergb }) => {
      const r = srgb.r + (ergb.r - srgb.r) * eased;
      const g = srgb.g + (ergb.g - srgb.g) * eased;
      const b = srgb.b + (ergb.b - srgb.b) * eased;
      root.style.setProperty(key, rgbToHex(r, g, b));
    });

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      themeManager.applyTheme(toThemeName, false);
    }
  }

  requestAnimationFrame(frame);
}

// ============================================================================
// 追加：基于时间的自动主题切换
// ============================================================================

export class TimeBasedThemeSwitch {
  constructor() {
    this.schedule = new Map();
    this.timer = null;
    this.enabled = false;
    this.interval = 60000;
  }

  setSchedule(hour, themeName) {
    this.schedule.set(hour, themeName);
  }

  removeSchedule(hour) {
    this.schedule.delete(hour);
  }

  start() {
    this.enabled = true;
    this._check();
    this.timer = setInterval(() => this._check(), this.interval);
  }

  stop() {
    this.enabled = false;
    if (this.timer) clearInterval(this.timer);
  }

  _check() {
    if (!this.enabled) return;
    const now = new Date();
    const hour = now.getHours();
    const theme = this.schedule.get(hour);
    if (theme && themeManager.getCurrentTheme().name !== theme) {
      themeManager.applyTheme(theme);
    }
  }

  getNextSwitch() {
    const now = new Date();
    const currentHour = now.getHours();
    const hours = Array.from(this.schedule.keys()).sort((a, b) => a - b);
    let nextHour = hours.find(h => h > currentHour);
    if (nextHour === undefined) nextHour = hours[0];
    if (nextHour === undefined) return null;
    const nextTime = new Date(now);
    nextTime.setHours(nextHour, 0, 0, 0);
    if (nextHour <= currentHour) nextTime.setDate(nextTime.getDate() + 1);
    return { hour: nextHour, theme: this.schedule.get(nextHour), time: nextTime };
  }
}

export const timeBasedThemeSwitch = new TimeBasedThemeSwitch();

// 预设时间主题
function initDefaultTimeSchedule() {
  timeBasedThemeSwitch.setSchedule(6, 'default');
  timeBasedThemeSwitch.setSchedule(9, 'ice');
  timeBasedThemeSwitch.setSchedule(12, 'mint');
  timeBasedThemeSwitch.setSchedule(15, 'desert');
  timeBasedThemeSwitch.setSchedule(18, 'sunset');
  timeBasedThemeSwitch.setSchedule(20, 'midnight');
  timeBasedThemeSwitch.setSchedule(22, 'starry');
  timeBasedThemeSwitch.setSchedule(0, 'dark');
}
initDefaultTimeSchedule();

// ============================================================================
// 追加：基于音频情绪的主题推荐
// ============================================================================

export class AudioMoodThemeRecommender {
  constructor() {
    this.moodMap = new Map();
    this._initMappings();
  }

  _initMappings() {
    this.moodMap.set('energetic', ['flame', 'cyberpunk', 'matrix', 'gold']);
    this.moodMap.set('calm', ['ocean', 'forest', 'ice', 'mint']);
    this.moodMap.set('romantic', ['rose', 'sakura', 'lavender', 'pastel']);
    this.moodMap.set('melancholic', ['ink', 'twilight', 'midnight', 'nord']);
    this.moodMap.set('focused', ['geek', 'matrix', 'solarizedDark', 'highContrast']);
    this.moodMap.set('happy', ['candy', 'washi', 'sakura', 'pastel']);
    this.moodMap.set('dark', ['dark', 'cyberpunk', 'starry', 'dracula']);
    this.moodMap.set('warm', ['sunset', 'coffee', 'amber', 'washi']);
    this.moodMap.set('cool', ['ocean', 'ice', 'nord', 'midnight']);
    this.moodMap.set('retro', ['retroTerminal', 'paper', 'geek', 'solarizedDark']);
  }

  recommend(bpm, spectralCentroid, loudness, valence = 0.5) {
    let mood = 'calm';
    if (bpm > 140 && loudness > 0.7) mood = 'energetic';
    else if (bpm > 120 && valence > 0.6) mood = 'happy';
    else if (bpm < 80 && spectralCentroid < 2000) mood = 'melancholic';
    else if (valence > 0.7 && bpm < 110) mood = 'romantic';
    else if (loudness > 0.5 && bpm > 100) mood = 'focused';
    else if (valence < 0.3 && spectralCentroid < 3000) mood = 'dark';
    else if (spectralCentroid < 3000 && valence > 0.5) mood = 'warm';
    else if (spectralCentroid > 6000) mood = 'cool';
    else if (bpm > 100 && bpm < 130 && valence > 0.4) mood = 'retro';

    const themes = this.moodMap.get(mood) || ['default'];
    return { mood, themes, primary: themes[0] };
  }

  applyRecommended(bpm, spectralCentroid, loudness, valence) {
    const rec = this.recommend(bpm, spectralCentroid, loudness, valence);
    if (rec.primary) {
      themeManager.applyTheme(rec.primary);
    }
    return rec;
  }
}

export const audioMoodRecommender = new AudioMoodThemeRecommender();

// ============================================================================
// 追加：用户自定义主题编辑器
// ============================================================================

export class ThemeEditor {
  constructor() {
    this.variables = {};
    this.baseTheme = 'default';
    this.previewElement = null;
    this.listeners = [];
  }

  setBaseTheme(name) {
    const theme = themeManager.themes.get(name);
    if (theme) {
      this.baseTheme = name;
      this.variables = { ...theme.variables };
    }
  }

  setVariable(key, value) {
    this.variables[key] = value;
    this._notify();
  }

  removeVariable(key) {
    delete this.variables[key];
    this._notify();
  }

  setPreviewElement(el) {
    this.previewElement = el;
    this._applyPreview();
  }

  _notify() {
    this._applyPreview();
    this.listeners.forEach(cb => {
      try { cb(this.variables); } catch (e) {}
    });
  }

  _applyPreview() {
    if (!this.previewElement) return;
    Object.entries(this.variables).forEach(([key, value]) => {
      this.previewElement.style.setProperty(key, value);
    });
  }

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  exportJSON() {
    return JSON.stringify({
      name: 'custom-theme',
      baseTheme: this.baseTheme,
      variables: this.variables,
      createdAt: new Date().toISOString()
    }, null, 2);
  }

  importJSON(json) {
    try {
      const data = JSON.parse(json);
      if (data.variables) {
        this.variables = { ...data.variables };
        if (data.baseTheme) this.baseTheme = data.baseTheme;
        this._notify();
        return { success: true };
      }
      return { success: false, error: 'Invalid format' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  generateRandom() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 60 + Math.floor(Math.random() * 30);
    const light = 45 + Math.floor(Math.random() * 20);
    this.variables['--accent'] = `hsl(${hue}, ${sat}%, ${light}%)`;
    this.variables['--accent2'] = `hsl(${(hue + 30) % 360}, ${sat}%, ${light + 10}%)`;
    this.variables['--accent3'] = `hsl(${(hue + 60) % 360}, ${sat}%, ${light - 5}%)`;
    this._notify();
  }

  reset() {
    const theme = themeManager.themes.get(this.baseTheme);
    if (theme) {
      this.variables = { ...theme.variables };
      this._notify();
    }
  }

  saveAs(name) {
    themeManager.registerTheme(name, this.variables, {
      name: name,
      description: '用户自定义主题',
      author: 'User',
      version: '1.0'
    });
    return name;
  }
}

export const themeEditor = new ThemeEditor();

// ============================================================================
// 追加：主题导入/导出增强（批量）
// ============================================================================

/**
 * 批量导出所有主题为 JSON
 * @returns {string}
 */
export function exportAllThemes() {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'qingluan-daw',
    themes: {}
  };
  themeManager.themes.forEach((config, name) => {
    exportData.themes[name] = config;
  });
  return JSON.stringify(exportData, null, 2);
}

/**
 * 批量导入主题包
 * @param {string} json
 * @returns {{success:number,failed:number,errors:string[]}}
 */
export function importThemePack(json) {
  try {
    const data = JSON.parse(json);
    let success = 0;
    let failed = 0;
    const errors = [];
    if (data.themes) {
      Object.entries(data.themes).forEach(([name, config]) => {
        if (config.variables) {
          themeManager.registerTheme(name, config.variables, {
            name: config.name || name,
            description: config.description || '',
            author: config.author || 'Imported',
            version: config.version || '1.0'
          });
          success++;
        } else {
          failed++;
          errors.push(`Missing variables for ${name}`);
        }
      });
    }
    return { success, failed, errors };
  } catch (e) {
    return { success: 0, failed: 1, errors: [e.message] };
  }
}

/**
 * 下载主题为文件
 * @param {string} themeName
 * @param {string} filename
 */
export function downloadTheme(themeName, filename = null) {
  const json = themeManager.exportTheme(themeName);
  if (!json) return false;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${themeName}-theme.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  return true;
}

/**
 * 从文件读取主题
 * @param {File} file
 * @returns {Promise<{success:boolean,name?:string,error?:string}>}
 */
export function uploadTheme(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = themeManager.importTheme(e.target.result);
      resolve(result);
    };
    reader.onerror = () => resolve({ success: false, error: 'File read error' });
    reader.readAsText(file);
  });
}

// ============================================================================
// 追加：无障碍与高对比度模式
// ============================================================================

export class AccessibilityMode {
  constructor() {
    this.enabled = false;
    this.highContrast = false;
    this.reduceMotion = false;
    this.largeText = false;
  }

  enableHighContrast() {
    this.highContrast = true;
    themeManager.applyTheme('highContrast');
  }

  disableHighContrast() {
    this.highContrast = false;
    themeManager.applyTheme('default');
  }

  enableReduceMotion() {
    this.reduceMotion = true;
    document.documentElement.style.setProperty('--motion-duration', '0ms');
  }

  disableReduceMotion() {
    this.reduceMotion = false;
    document.documentElement.style.removeProperty('--motion-duration');
  }

  enableLargeText() {
    this.largeText = true;
    document.documentElement.style.fontSize = '18px';
  }

  disableLargeText() {
    this.largeText = false;
    document.documentElement.style.fontSize = '';
  }

  toggleHighContrast() {
    this.highContrast ? this.disableHighContrast() : this.enableHighContrast();
  }

  toggleReduceMotion() {
    this.reduceMotion ? this.disableReduceMotion() : this.enableReduceMotion();
  }

  toggleLargeText() {
    this.largeText ? this.disableLargeText() : this.enableLargeText();
  }
}

export const accessibilityMode = new AccessibilityMode();

// ============================================================================
// 追加：主题预览增强（实时预览 iframe）
// ============================================================================

export class ThemeLivePreview {
  constructor(iframe) {
    this.iframe = iframe;
    this.currentTheme = null;
  }

  apply(themeName) {
    const theme = themeManager.themes.get(themeName);
    if (!theme || !this.iframe) return false;
    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!doc) return false;
    let style = doc.getElementById('qingluan-live-theme');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'qingluan-live-theme';
      doc.head.appendChild(style);
    }
    const css = Object.entries(theme.variables)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');
    style.textContent = `:root {\n${css}\n}`;
    this.currentTheme = themeName;
    return true;
  }

  applyVariables(variables) {
    if (!this.iframe) return false;
    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!doc) return false;
    let style = doc.getElementById('qingluan-live-theme');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'qingluan-live-theme';
      doc.head.appendChild(style);
    }
    const css = Object.entries(variables)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');
    style.textContent = `:root {\n${css}\n}`;
    return true;
  }
}

// ============================================================================
// 追加：主题统计与报告
// ============================================================================

export function generateThemeStatistics() {
  const themes = themeManager.listThemes();
  const stats = {
    total: themes.length,
    builtIn: Object.keys(BuiltInThemes).length,
    custom: themes.length - Object.keys(BuiltInThemes).length,
    lightThemes: 0,
    darkThemes: 0,
    colorDistribution: {}
  };

  themes.forEach(t => {
    const config = themeManager.themes.get(t.id);
    if (!config) return;
    const bg = config.variables['--phone-bg'] || '';
    const rgb = hexToRgb(bg);
    if (rgb) {
      const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
      if (luminance > 0.5) stats.lightThemes++;
      else stats.darkThemes++;
    }

    const accent = config.variables['--accent'] || '';
    const accentRgb = hexToRgb(accent);
    if (accentRgb) {
      const hsl = rgbToHsl(accentRgb.r, accentRgb.g, accentRgb.b);
      const range = Math.floor(hsl.h / 30) * 30;
      const key = `${range}-${range + 30}`;
      stats.colorDistribution[key] = (stats.colorDistribution[key] || 0) + 1;
    }
  });

  return stats;
}

// ============================================================================
// 追加：全局注册增强
// ============================================================================

if (typeof window !== 'undefined') {
  window.ExtendedThemes = ExtendedThemes;
  window.MaterialTokens = MaterialTokens;
  window.timeBasedThemeSwitch = timeBasedThemeSwitch;
  window.audioMoodRecommender = audioMoodRecommender;
  window.themeEditor = themeEditor;
  window.accessibilityMode = accessibilityMode;
  window.ThemeLivePreview = ThemeLivePreview;
  window.ThemeEditor = ThemeEditor;
  window.TimeBasedThemeSwitch = TimeBasedThemeSwitch;
  window.AudioMoodThemeRecommender = AudioMoodThemeRecommender;
  window.AccessibilityMode = AccessibilityMode;
}

export { ThemeManager, themeManager, BuiltInThemes, injectThemeCSS, removeThemeCSS, createThemePreview, createThemeSwitcherPanel, getCSSVariable, setCSSVariable, animateColorTransition, buildThemeCSS, applyThemeToIFrame, diffThemes, AdaptiveTheme, adaptiveTheme, watchThemeChanges, generateThemeReport };
export default ThemeManager;
