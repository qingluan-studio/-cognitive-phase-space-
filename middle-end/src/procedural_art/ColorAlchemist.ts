import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  mood: string;
  temperature: number;
  harmony: number;
}

export interface EmotionColorMap {
  emotion: string;
  primary: string;
  secondary: string[];
  intensity: number;
}

export interface ColorTransform {
  hueShift: number;
  saturationAdjust: number;
  lightnessAdjust: number;
  contrast: number;
}

export class ColorAlchemist {
  private _palettes: Map<string, ColorPalette>;
  private _emotionMaps: Map<string, EmotionColorMap>;
  private _currentPalette: ColorPalette | null;
  private _history: ColorPalette[];
  private _temperatureBias: number;
  private _harmonyTarget: number;

  constructor() {
    this._palettes = new Map();
    this._emotionMaps = new Map();
    this._currentPalette = null;
    this._history = [];
    this._temperatureBias = 0;
    this._harmonyTarget = 0.7;
    this._initializeDefaultPalettes();
    this._initializeEmotionMaps();
  }

  get paletteCount(): number { return this._palettes.size; }
  get currentPalette(): ColorPalette | null { return this._currentPalette; }
  get history(): ColorPalette[] { return this._history.map(p => ({ ...p, colors: [...p.colors] })); }
  get temperatureBias(): number { return this._temperatureBias; }
  get harmonyTarget(): number { return this._harmonyTarget; }

  private _initializeDefaultPalettes(): void {
    const palettes: ColorPalette[] = [
      {
        id: 'sunset',
        name: 'Sunset Dreams',
        colors: ['#FF6B6B', '#FFE66D', '#FF8E53', '#FE6B8B', '#4ECDC4'],
        mood: 'warm',
        temperature: 0.8,
        harmony: 0.75
      },
      {
        id: 'ocean',
        name: 'Deep Ocean',
        colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#023E8A'],
        mood: 'calm',
        temperature: 0.2,
        harmony: 0.85
      },
      {
        id: 'forest',
        name: 'Mystic Forest',
        colors: ['#2D5016', '#4A7C23', '#6B8E23', '#9ACD32', '#ADFF2F'],
        mood: 'natural',
        temperature: 0.4,
        harmony: 0.8
      },
      {
        id: 'noir',
        name: 'Film Noir',
        colors: ['#0D0D0D', '#1A1A1A', '#2B2B2B', '#404040', '#A0A0A0'],
        mood: 'dramatic',
        temperature: 0.3,
        harmony: 0.9
      },
      {
        id: 'candy',
        name: 'Candy Pop',
        colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0080', '#80FF00'],
        mood: 'playful',
        temperature: 0.6,
        harmony: 0.5
      }
    ];
    for (const p of palettes) {
      this._palettes.set(p.id, p);
    }
    this._currentPalette = palettes[0];
  }

  private _initializeEmotionMaps(): void {
    const emotions: EmotionColorMap[] = [
      { emotion: 'joy', primary: '#FFD700', secondary: ['#FFA500', '#FF69B4', '#00FF7F'], intensity: 0.9 },
      { emotion: 'sadness', primary: '#4169E1', secondary: ['#6495ED', '#000080', '#87CEEB'], intensity: 0.3 },
      { emotion: 'anger', primary: '#DC143C', secondary: ['#FF0000', '#8B0000', '#FF4500'], intensity: 0.95 },
      { emotion: 'fear', primary: '#4B0082', secondary: ['#2F0050', '#7B68EE', '#000080'], intensity: 0.7 },
      { emotion: 'calm', primary: '#90EE90', secondary: ['#20B2AA', '#87CEEB', '#E0FFFF'], intensity: 0.2 },
      { emotion: 'mystery', primary: '#483D8B', secondary: ['#2F4F4F', '#696969', '#9370DB'], intensity: 0.6 },
      { emotion: 'passion', primary: '#FF1493', secondary: ['#FF69B4', '#C71585', '#FFB6C1'], intensity: 0.85 },
      { emotion: 'melancholy', primary: '#708090', secondary: ['#778899', '#6A5ACD', '#B0C4DE'], intensity: 0.4 }
    ];
    for (const e of emotions) {
      this._emotionMaps.set(e.emotion, e);
    }
  }

  public hexToRgb(hex: string): RGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  public rgbToHex(rgb: RGB): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  public rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  public hslToRgb(hsl: HSL): RGB {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    if (s === 0) {
      const v = l * 255;
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: hue2rgb(p, q, h + 1 / 3) * 255,
      g: hue2rgb(p, q, h) * 255,
      b: hue2rgb(p, q, h - 1 / 3) * 255
    };
  }

  public setTemperatureBias(bias: number): void {
    this._temperatureBias = Math.max(-1, Math.min(1, bias));
  }

  public setHarmonyTarget(target: number): void {
    this._harmonyTarget = Math.max(0, Math.min(1, target));
  }

  public generatePaletteFromEmotion(emotion: string, intensity: number = 0.7): ColorPalette {
    const emotionMap = this._emotionMaps.get(emotion) || this._emotionMaps.get('calm')!;
    const colors: string[] = [];
    const baseRgb = this.hexToRgb(emotionMap.primary);
    const baseHsl = this.rgbToHsl(baseRgb);

    colors.push(emotionMap.primary);

    for (let i = 0; i < 4; i++) {
      const hueShift = (i - 2) * 30 * intensity;
      const satAdjust = (i % 2 === 0 ? 1 : -1) * 20 * intensity;
      const lightAdjust = (i - 2) * 15;
      
      const newHsl: HSL = {
        h: (baseHsl.h + hueShift + 360) % 360,
        s: Math.max(10, Math.min(90, baseHsl.s + satAdjust)),
        l: Math.max(10, Math.min(90, baseHsl.l + lightAdjust))
      };
      colors.push(this.rgbToHex(this.hslToRgb(newHsl)));
    }

    const palette: ColorPalette = {
      id: `emotion_${emotion}_${Date.now()}`,
      name: `Emotion: ${emotion}`,
      colors,
      mood: emotion,
      temperature: this._calculateTemperature(colors),
      harmony: this._calculateHarmony(colors)
    };

    this._palettes.set(palette.id, palette);
    this._currentPalette = palette;
    this._history.push(palette);
    return palette;
  }

  public generateComplementary(baseColor: string): string[] {
    const rgb = this.hexToRgb(baseColor);
    const hsl = this.rgbToHsl(rgb);
    const complements: string[] = [];
    
    const complementaryHue = (hsl.h + 180) % 360;
    const compHsl = { ...hsl, h: complementaryHue };
    complements.push(this.rgbToHex(this.hslToRgb(compHsl)));

    for (let i = 1; i <= 2; i++) {
      const adjHsl = {
        h: (complementaryHue + i * 15) % 360,
        s: Math.max(10, Math.min(90, hsl.s + i * 10)),
        l: Math.max(10, Math.min(90, hsl.l + i * 10))
      };
      complements.push(this.rgbToHex(this.hslToRgb(adjHsl)));
    }

    return complements;
  }

  public generateAnalogous(baseColor: string, count: number = 5): string[] {
    const rgb = this.hexToRgb(baseColor);
    const hsl = this.rgbToHsl(rgb);
    const colors: string[] = [];
    const step = 30;
    const start = -Math.floor(count / 2) * step;

    for (let i = 0; i < count; i++) {
      const newHsl: HSL = {
        h: (hsl.h + start + i * step + 360) % 360,
        s: hsl.s,
        l: hsl.l
      };
      colors.push(this.rgbToHex(this.hslToRgb(newHsl)));
    }
    return colors;
  }

  public transformColor(color: string, transform: ColorTransform): string {
    const rgb = this.hexToRgb(color);
    const hsl = this.rgbToHsl(rgb);

    const newHsl: HSL = {
      h: (hsl.h + transform.hueShift + 360) % 360,
      s: Math.max(0, Math.min(100, hsl.s + transform.saturationAdjust)),
      l: Math.max(0, Math.min(100, hsl.l + transform.lightnessAdjust))
    };

    let result = this.hslToRgb(newHsl);
    
    if (transform.contrast !== 0) {
      const factor = (259 * (transform.contrast * 255 + 255)) / (255 * (259 - transform.contrast * 255));
      result = {
        r: factor * (result.r - 128) + 128,
        g: factor * (result.g - 128) + 128,
        b: factor * (result.b - 128) + 128
      };
    }

    return this.rgbToHex(result);
  }

  public blendColors(colorA: string, colorB: string, ratio: number = 0.5): string {
    const rgbA = this.hexToRgb(colorA);
    const rgbB = this.hexToRgb(colorB);
    const blended: RGB = {
      r: rgbA.r * ratio + rgbB.r * (1 - ratio),
      g: rgbA.g * ratio + rgbB.g * (1 - ratio),
      b: rgbA.b * ratio + rgbB.b * (1 - ratio)
    };
    return this.rgbToHex(blended);
  }

  private _calculateTemperature(colors: string[]): number {
    let totalTemp = 0;
    for (const color of colors) {
      const rgb = this.hexToRgb(color);
      const warmness = (rgb.r - rgb.b) / 255;
      totalTemp += (warmness + 1) / 2;
    }
    return totalTemp / colors.length;
  }

  private _calculateHarmony(colors: string[]): number {
    if (colors.length < 2) return 1;

    const hslValues = colors.map(c => this.rgbToHsl(this.hexToRgb(c)));
    let harmony = 0;
    let comparisons = 0;

    for (let i = 0; i < hslValues.length; i++) {
      for (let j = i + 1; j < hslValues.length; j++) {
        let hueDiff = Math.abs(hslValues[i].h - hslValues[j].h);
        hueDiff = Math.min(hueDiff, 360 - hueDiff);
        const normalizedDiff = hueDiff / 180;
        
        const harmonicRatios = [0, 1/12, 1/6, 1/4, 1/3, 1/2];
        let closeness = 0;
        for (const ratio of harmonicRatios) {
          const dist = Math.abs(normalizedDiff - ratio);
          closeness = Math.max(closeness, 1 - dist * 3);
        }

        const satDiff = Math.abs(hslValues[i].s - hslValues[j].s) / 100;
        const lightDiff = Math.abs(hslValues[i].l - hslValues[j].l) / 100;
        
        const pairHarmony = closeness * 0.5 + (1 - satDiff) * 0.25 + (1 - lightDiff) * 0.25;
        harmony += Math.max(0, Math.min(1, pairHarmony));
        comparisons++;
      }
    }

    return comparisons > 0 ? harmony / comparisons : 0;
  }

  public selectPalette(paletteId: string): ColorPalette | null {
    const palette = this._palettes.get(paletteId);
    if (palette) {
      this._currentPalette = palette;
      this._history.push(palette);
    }
    return palette || null;
  }

  public getPalette(paletteId: string): ColorPalette | undefined {
    return this._palettes.get(paletteId);
  }

  public findPalettesByMood(mood: string): ColorPalette[] {
    return Array.from(this._palettes.values()).filter(p => p.mood.includes(mood));
  }

  public getContrastRatio(colorA: string, colorB: string): number {
    const luminance = (color: string) => {
      const rgb = this.hexToRgb(color);
      const toLin = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
    };
    const l1 = luminance(colorA);
    const l2 = luminance(colorB);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  public exportPalettePacket(paletteId: string): DataPacket<ColorPalette> | null {
    const palette = this._palettes.get(paletteId);
    if (!palette) return null;
    return {
      id: `packet_${paletteId}`,
      payload: palette,
      metadata: {
        createdAt: Date.now(),
        route: ['procedural_art', 'color_alchemist'],
        priority: 2,
        phase: 'transmutation'
      }
    };
  }

  public extractKnowledgeUnit(paletteId: string): KnowledgeUnit | null {
    const palette = this._palettes.get(paletteId);
    if (!palette) return null;
    
    const vector = [
      palette.temperature,
      palette.harmony,
      palette.colors.length / 10,
      ...this._paletteToVector(palette)
    ];

    return {
      id: `color_knowledge_${paletteId}`,
      content: `Color palette '${palette.name}' with mood '${palette.mood}'`,
      vector: vector.slice(0, 16),
      lineage: ['color_alchemist']
    };
  }

  private _paletteToVector(palette: ColorPalette): number[] {
    const vec: number[] = [];
    for (const color of palette.colors) {
      const hsl = this.rgbToHsl(this.hexToRgb(color));
      vec.push(hsl.h / 360, hsl.s / 100, hsl.l / 100);
    }
    return vec;
  }

  public registerPalette(palette: ColorPalette): void {
    this._palettes.set(palette.id, palette);
  }

  public reset(): void {
    this._palettes.clear();
    this._emotionMaps.clear();
    this._history = [];
    this._currentPalette = null;
    this._temperatureBias = 0;
    this._harmonyTarget = 0.7;
    this._initializeDefaultPalettes();
    this._initializeEmotionMaps();
  }

  public exportPalettes(): ColorPalette[] {
    return Array.from(this._palettes.values()).map(p => ({ ...p, colors: [...p.colors] }));
  }
}
