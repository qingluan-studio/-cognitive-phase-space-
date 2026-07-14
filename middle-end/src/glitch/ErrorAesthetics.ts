export type AestheticStyle = 'cyberpunk' | 'glitchcore' | 'minimal' | 'baroque' | 'lofi';

export interface AestheticPiece {
  id: string;
  source: string;
  style: AestheticStyle;
  expression: string;
  rhythm: number[];
  palette: string[];
  harmonyScore: number;
  createdAt: number;
}

export class ErrorAesthetics {
  private _pieces: AestheticPiece[] = [];
  private _palettes: Record<AestheticStyle, string[]> = {
    cyberpunk: ['#ff00ff', '#00ffff', '#ff0080', '#080020'],
    glitchcore: ['#ff0000', '#00ff00', '#0000ff', '#ffffff'],
    minimal: ['#000000', '#ffffff', '#888888'],
    baroque: ['#4b0082', '#8b4513', '#daa520', '#800020'],
    lofi: ['#708090', '#bdb76b', '#cd853f', '#2f4f4f'],
  };
  private _glyphMutators: string[] = ['░', '▒', '▓', '█', '▀', '▄', '◆', '◇'];
  private _markovChain: Map<string, Map<string, number>> = new Map();
  private _styleFrequency: Map<AestheticStyle, number> = new Map();

  transform(source: string, errorText: string, style: AestheticStyle = 'cyberpunk'): AestheticPiece {
    this._updateMarkov(errorText);
    const expression = this._stylize(errorText, style);
    const rhythm = this._buildRhythm(errorText);
    const palette = this._palettes[style];
    const harmonyScore = this._computeHarmony(palette);

    const piece: AestheticPiece = {
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      style,
      expression,
      rhythm,
      palette: [...palette],
      harmonyScore,
      createdAt: Date.now(),
    };
    this._pieces.push(piece);
    if (this._pieces.length > 100) this._pieces.shift();
    this._styleFrequency.set(style, (this._styleFrequency.get(style) ?? 0) + 1);
    return piece;
  }

  private _stylize(text: string, style: AestheticStyle): string {
    const chars = text.split('');
    const stylized = chars.map((c, i) => {
      if (c === ' ') return ' ';
      if (style === 'glitchcore' && i % 7 === 0) {
        return this._glyphMutators[Math.floor(Math.random() * this._glyphMutators.length)];
      }
      if (style === 'minimal') return c.toLowerCase();
      if (style === 'baroque' && i % 3 === 0) return `~${c}~`;
      if (style === 'lofi' && Math.random() < 0.1) return '.';
      if (style === 'cyberpunk' && /[aeiou]/i.test(c)) return c.toUpperCase();
      return c;
    });
    return stylized.join('');
  }

  private _buildRhythm(text: string): number[] {
    const rhythm: number[] = [];
    const windowSize = 4;
    for (let i = 0; i < text.length; i += windowSize) {
      const slice = text.slice(i, i + windowSize);
      const vowels = (slice.match(/[aeiou]/gi) ?? []).length;
      const consonants = slice.replace(/[^a-z]/gi, '').length - vowels;
      rhythm.push(vowels + consonants * 0.5);
    }
    const max = Math.max(...rhythm, 1);
    return rhythm.map(r => r / max);
  }

  private _computeHarmony(palette: string[]): number {
    if (palette.length < 2) return 1;
    const hues = palette.map(color => this._hexToHsl(color)[0]);
    let totalDiff = 0;
    let pairs = 0;
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const diff = Math.min(Math.abs(hues[i] - hues[j]), 360 - Math.abs(hues[i] - hues[j]));
        totalDiff += diff;
        pairs++;
      }
    }
    const avgDiff = totalDiff / pairs;
    if (avgDiff < 30) return 0.9;
    if (avgDiff > 150 && avgDiff < 210) return 0.85;
    if (avgDiff > 90 && avgDiff < 150) return 0.7;
    return 0.4;
  }

  private _hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return [h, s, l];
  }

  private _updateMarkov(text: string): void {
    const tokens = text.split(/\s+/);
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];
      if (!this._markovChain.has(current)) this._markovChain.set(current, new Map());
      const transitions = this._markovChain.get(current)!;
      transitions.set(next, (transitions.get(next) ?? 0) + 1);
    }
  }

  generateText(length: number = 10, seed?: string): string {
    if (this._markovChain.size === 0) return '';
    let current = seed ?? Array.from(this._markovChain.keys())[Math.floor(Math.random() * this._markovChain.size)];
    const result = [current];
    for (let i = 0; i < length - 1; i++) {
      const transitions = this._markovChain.get(current);
      if (!transitions || transitions.size === 0) break;
      const candidates = Array.from(transitions.entries());
      const total = candidates.reduce((s, [, c]) => s + c, 0);
      let r = Math.random() * total;
      for (const [next, count] of candidates) {
        r -= count;
        if (r <= 0) { current = next; break; }
      }
      result.push(current);
    }
    return result.join(' ');
  }

  registerPalette(style: AestheticStyle, colors: string[]): void {
    this._palettes[style] = [...colors];
  }

  curate(minRhythm: number = 0.5): AestheticPiece[] {
    return this._pieces.filter(p => {
      const avgRhythm = p.rhythm.reduce((a, b) => a + b, 0) / Math.max(1, p.rhythm.length);
      return avgRhythm >= minRhythm;
    });
  }

  getPieces(): AestheticPiece[] { return [...this._pieces]; }
  getByStyle(style: AestheticStyle): AestheticPiece[] { return this._pieces.filter(p => p.style === style); }
  get pieceCount(): number { return this._pieces.length; }
  get styleDiversity(): number { return this._styleFrequency.size; }
}
