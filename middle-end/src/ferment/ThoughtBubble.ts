/**
 * 思绪泡泡：半成形的想法浮出意识表面。
 * 模糊的半成形想法以气泡形式浮出意识表面，可被捕获或破灭。
 */

export type BubbleFate = 'floating' | 'captured' | 'popped' | 'dissolved';

export interface BubbleRecord {
  id: string;
  content: string;
  clarity: number;
  size: number;
  fate: BubbleFate;
  surfacedAt: number;
}

export class ThoughtBubble {
  private _bubbles: Map<string, BubbleRecord> = new Map();
  private _depth = 0;
  private _surfaceThreshold = 0.5;
  private _formationRate = 0.3;

  form(content: string, initialClarity: number = 0.3): BubbleRecord | null {
    if (Math.random() > this._formationRate) return null;
    const bubble: BubbleRecord = {
      id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      clarity: initialClarity,
      size: 1,
      fate: 'floating',
      surfacedAt: Date.now(),
    };
    this._bubbles.set(bubble.id, bubble);
    return bubble;
  }

  surface(bubbleId: string): BubbleRecord | null {
    const bubble = this._bubbles.get(bubbleId);
    if (!bubble || bubble.fate !== 'floating') return null;
    bubble.clarity += 0.2;
    bubble.size += 1;
    if (bubble.clarity >= this._surfaceThreshold) {
      this._depth++;
    }
    return bubble;
  }

  capture(bubbleId: string): BubbleRecord | null {
    const bubble = this._bubbles.get(bubbleId);
    if (!bubble || bubble.fate !== 'floating') return null;
    if (bubble.clarity < this._surfaceThreshold) return null;
    bubble.fate = 'captured';
    return bubble;
  }

  pop(bubbleId: string): BubbleRecord | null {
    const bubble = this._bubbles.get(bubbleId);
    if (!bubble) return null;
    bubble.fate = 'popped';
    return bubble;
  }

  dissolve(bubbleId: string): BubbleRecord | null {
    const bubble = this._bubbles.get(bubbleId);
    if (!bubble) return null;
    bubble.fate = 'dissolved';
    bubble.clarity = 0;
    return bubble;
  }

  setFormationRate(rate: number): void {
    this._formationRate = Math.max(0, Math.min(1, rate));
  }

  setSurfaceThreshold(value: number): void {
    this._surfaceThreshold = Math.max(0, Math.min(1, value));
  }

  getFloating(): BubbleRecord[] {
    return Array.from(this._bubbles.values()).filter(b => b.fate === 'floating');
  }

  getCaptured(): BubbleRecord[] {
    return Array.from(this._bubbles.values()).filter(b => b.fate === 'captured');
  }

  get depth(): number {
    return this._depth;
  }

  get bubbleCount(): number {
    return this._bubbles.size;
  }
}
