/**
 * 闹鬼记忆：被删除的数据偶尔闪回。
 * 已被删除的数据片段以闪回形式重新出现在内存中，形成闹鬼现象。
 */

export type FlashbackTrigger = 'random' | 'associative' | 'temporal' | 'corruption';

export interface DeletedMemory {
  id: string;
  originalKey: string;
  content: unknown;
  deletedAt: number;
  flashbackPotential: number;
}

export interface FlashbackEvent {
  id: string;
  memoryId: string;
  trigger: FlashbackTrigger;
  glimpsedContent: unknown;
  intensity: number;
  occurredAt: number;
}

export class HauntedMemory {
  private _deleted: Map<string, DeletedMemory> = new Map();
  private _flashbacks: FlashbackEvent[] = [];
  private _flashbackProbability = 0.1;
  private _hauntingIntensity = 1.0;

  delete(key: string, content: unknown): DeletedMemory {
    const memory: DeletedMemory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      originalKey: key,
      content,
      deletedAt: Date.now(),
      flashbackPotential: Math.random() * this._hauntingIntensity,
    };
    this._deleted.set(memory.id, memory);
    return memory;
  }

  attemptFlashback(trigger: FlashbackTrigger = 'random'): FlashbackEvent | null {
    if (Math.random() > this._flashbackProbability) return null;
    const candidates = Array.from(this._deleted.values()).filter(m => m.flashbackPotential > 0.3);
    if (candidates.length === 0) return null;
    const memory = candidates[Math.floor(Math.random() * candidates.length)];

    const glimpsedContent = this._distort(memory.content);
    const intensity = memory.flashbackPotential * (0.5 + Math.random() * 0.5);
    memory.flashbackPotential *= 0.9;

    const event: FlashbackEvent = {
      id: `flash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      memoryId: memory.id,
      trigger,
      glimpsedContent,
      intensity,
      occurredAt: Date.now(),
    };
    this._flashbacks.push(event);
    if (this._flashbacks.length > 100) this._flashbacks.shift();
    return event;
  }

  private _distort(content: unknown): unknown {
    if (typeof content === 'string') {
      return content.split('').map(c => Math.random() < 0.1 ? '?' : c).join('');
    }
    if (typeof content === 'number') {
      return content + (Math.random() - 0.5) * content * 0.1;
    }
    return content;
  }

  purge(memoryId: string): boolean {
    return this._deleted.delete(memoryId);
  }

  exorciseAll(): number {
    const count = this._deleted.size;
    this._deleted.clear();
    return count;
  }

  setFlashbackProbability(p: number): void {
    this._flashbackProbability = Math.max(0, Math.min(1, p));
  }

  setHauntingIntensity(intensity: number): void {
    this._hauntingIntensity = Math.max(0, intensity);
  }

  getFlashbacks(limit: number = 50): FlashbackEvent[] {
    return this._flashbacks.slice(-limit);
  }

  get deletedCount(): number {
    return this._deleted.size;
  }
}
