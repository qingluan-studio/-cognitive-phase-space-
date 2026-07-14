export type SubjectEntry = { id: string; theme: string; delay: number; imitation: boolean; transposition: number; voice: 'soprano' | 'alto' | 'tenor' | 'bass' };
export type FugueState = { entries: SubjectEntry[]; currentEntry: number; isCompleted: boolean };
export type FugueResult = { entryId: string; theme: string; startTime: number; endTime: number; response: Record<string, unknown>; contrapuntalScore: number };

export class FugueOrchestrator {
  private _entries: SubjectEntry[] = [];
  private _state: FugueState = { entries: [], currentEntry: 0, isCompleted: false };
  private _countersubjects: Record<string, string> = {};
  private _interval = 3;
  private _stretto = 0.7;

  get entries(): SubjectEntry[] { return [...this._entries]; }
  get state(): FugueState { return { ...this._state }; }

  addSubject(entry: SubjectEntry): void {
    if (this._entries.filter(e => e.voice === entry.voice).length >= 2) throw new Error(`Voice ${entry.voice} occupied twice`);
    this._entries.push(entry);
  }

  setCountersubject(themeId: string, countersubject: string): void { this._countersubjects[themeId] = countersubject; }
  setInterval(interval: number): void { this._interval = Math.max(1, interval); }

  startFugue(): Promise<FugueResult[]> {
    const sorted = [...this._entries].sort((a, b) => a.delay - b.delay);
    this._state = { entries: sorted, currentEntry: 0, isCompleted: false };

    const results: FugueResult[] = [];
    const start = Date.now();

    const execute = async (index: number): Promise<void> => {
      if (index >= sorted.length) { this._state.isCompleted = true; return; }
      const entry = sorted[index];
      this._state.currentEntry = index;
      await new Promise(r => setTimeout(r, entry.delay));

      const ts = Date.now();
      const response = await this._execute(entry);
      const score = this._score(entry, index);

      results.push({ entryId: entry.id, theme: entry.theme, startTime: ts - start, endTime: Date.now() - start, response, contrapuntalScore: score });
      await execute(index + 1);
    };

    return execute(0).then(() => results);
  }

  private async _execute(entry: SubjectEntry): Promise<Record<string, unknown>> {
    let processed = entry.theme;
    if (entry.imitation) processed = this._imitate(processed, entry.transposition);
    const cs = this._countersubjects[entry.id];
    if (cs) processed = this._combine(processed, cs);
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    return { theme: processed, transposition: entry.transposition, imitation: entry.imitation };
  }

  private _imitate(theme: string, transposition: number): string {
    return theme.split('').map(note => {
      const code = note.charCodeAt(0);
      return code >= 65 && code <= 71 ? String.fromCharCode(65 + (code - 65 + transposition + 7) % 7) : note;
    }).join('');
  }

  private _combine(theme: string, countersubject: string): string {
    return Array.from({ length: Math.max(theme.length, countersubject.length) }, (_, i) => (theme[i] || ' ') + (countersubject[i] || ' ')).join('|');
  }

  private _score(entry: SubjectEntry, index: number): number {
    if (index === 0) return 1;
    let total = 0, count = 0;
    for (let i = 0; i < index; i++) {
      const prev = this._state.entries[i];
      total += this._intervalScore(prev, entry) * 0.4 + this._rhythmScore(prev, entry) * 0.3 + this._harmonyScore(prev.voice, entry.voice) * 0.3;
      count++;
    }
    return count > 0 ? total / count : 0;
  }

  private _intervalScore(a: SubjectEntry, b: SubjectEntry): number {
    const intervals = [0, 3, 4, 5, 7, 8, 9];
    const interval = Math.abs(a.transposition - b.transposition) % 12;
    const normalized = interval / 11;
    let best = 0;
    for (const target of intervals) best = Math.max(best, Math.max(0, 1 - Math.abs(normalized - target / 11) * 2));
    return best;
  }

  private _rhythmScore(a: SubjectEntry, b: SubjectEntry): number {
    const diff = Math.abs(a.delay - b.delay);
    return diff < 50 ? 1 : 1 - diff / 500;
  }

  private _harmonyScore(a: string, b: string): number {
    const order: Record<string, number> = { bass: 0, tenor: 1, alto: 2, soprano: 3 };
    return Math.abs(order[a] - order[b]) >= 1 ? 1 : 0.5;
  }

  getCurrentState(): FugueState { return this.state; }

  injectCounterpoint(id: string, theme: string, targetId: string): void {
    const idx = this._entries.findIndex(e => e.id === targetId);
    if (idx === -1) return;
    const target = this._entries[idx];
    const available = ['bass', 'tenor', 'alto', 'soprano'].filter(v => this._entries.filter(e => e.voice === v).length < 2 && v !== target.voice);
    this._entries.splice(idx + 1, 0, { id, theme, delay: target.delay + this._interval * 25, imitation: true, transposition: -target.transposition, voice: (available[0] || target.voice) as 'soprano' | 'alto' | 'tenor' | 'bass' });
  }

  injectStretto(entries: SubjectEntry[]): void {
    const sorted = [...this._entries].sort((a, b) => a.delay - b.delay);
    const last = sorted[sorted.length - 1]?.delay || 0;
    entries.forEach((e, i) => { e.delay = last + i * this._interval * 25 * this._stretto; this._entries.push(e); });
  }

  stopFugue(): void { this._state.isCompleted = true; this._state.currentEntry = this._entries.length; }
  reset(): void { this._state = { entries: [], currentEntry: 0, isCompleted: false }; }
  getEntryCount(): number { return this._entries.length; }
}