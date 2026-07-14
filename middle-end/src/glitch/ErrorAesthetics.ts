/**
 * 错误美学：将错误输出转化为独特的审美表达。
 * 把异常信息视为艺术素材，通过符号变形、节奏编排和色彩映射生成审美对象。
 */

export type AestheticStyle = 'cyberpunk' | 'glitchcore' | 'minimal' | 'baroque' | 'lofi';

export interface AestheticPiece {
  id: string;
  source: string;
  style: AestheticStyle;
  expression: string;
  rhythm: number[];
  palette: string[];
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

  transform(source: string, errorText: string, style: AestheticStyle = 'cyberpunk'): AestheticPiece {
    const expression = this._stylize(errorText, style);
    const rhythm = this._buildRhythm(errorText);
    const palette = this._palettes[style];

    const piece: AestheticPiece = {
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      style,
      expression,
      rhythm,
      palette: [...palette],
      createdAt: Date.now(),
    };
    this._pieces.push(piece);
    if (this._pieces.length > 100) this._pieces.shift();
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
    for (let i = 0; i < text.length; i += 4) {
      const slice = text.slice(i, i + 4);
      rhythm.push(slice.length / 4);
    }
    return rhythm;
  }

  registerPalette(style: AestheticStyle, colors: string[]): void {
    this._palettes[style] = [...colors];
  }

  curate(minRhythm: number = 0.5): AestheticPiece[] {
    return this._pieces.filter(p =>
      p.rhythm.reduce((a, b) => a + b, 0) / Math.max(1, p.rhythm.length) >= minRhythm
    );
  }

  getPieces(): AestheticPiece[] {
    return [...this._pieces];
  }

  getByStyle(style: AestheticStyle): AestheticPiece[] {
    return this._pieces.filter(p => p.style === style);
  }

  get pieceCount(): number {
    return this._pieces.length;
  }
}
