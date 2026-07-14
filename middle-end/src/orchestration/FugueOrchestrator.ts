export type SubjectEntry = {
  id: string;
  theme: string;
  delay: number;
  imitation: boolean;
  transposition: number;
};

export type FugueState = {
  entries: SubjectEntry[];
  currentEntry: number;
  isCompleted: boolean;
};

export type FugueResult = {
  entryId: string;
  theme: string;
  startTime: number;
  endTime: number;
  response: unknown;
};

export class FugueOrchestrator {
  private subjectEntries: SubjectEntry[] = [];
  private currentState: FugueState = {
    entries: [],
    currentEntry: 0,
    isCompleted: false,
  };

  addSubject(entry: SubjectEntry): void {
    this.subjectEntries.push(entry);
  }

  startFugue(): Promise<FugueResult[]> {
    const sorted = [...this.subjectEntries].sort((a, b) => a.delay - b.delay);
    this.currentState = {
      entries: sorted,
      currentEntry: 0,
      isCompleted: false,
    };

    const results: FugueResult[] = [];
    const startTime = Date.now();

    const executeEntry = async (index: number): Promise<void> => {
      if (index >= sorted.length) {
        this.currentState.isCompleted = true;
        return;
      }

      const entry = sorted[index];
      this.currentState.currentEntry = index;

      await new Promise(r => setTimeout(r, entry.delay));

      const start = Date.now();
      const response = await this.executeTheme(entry);
      const end = Date.now();

      results.push({
        entryId: entry.id,
        theme: entry.theme,
        startTime: start - startTime,
        endTime: end - startTime,
        response,
      });

      await executeEntry(index + 1);
    };

    return executeEntry(0).then(() => results);
  }

  private async executeTheme(entry: SubjectEntry): Promise<unknown> {
    const processedTheme = entry.imitation 
      ? `${entry.theme} (imitation x${entry.transposition})`
      : entry.theme;
    
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    return processedTheme;
  }

  getCurrentState(): FugueState {
    return { ...this.currentState };
  }

  injectCounterpoint(counterpointId: string, theme: string, targetEntryId: string): void {
    const targetIndex = this.subjectEntries.findIndex(e => e.id === targetEntryId);
    if (targetIndex !== -1) {
      this.subjectEntries.splice(targetIndex + 1, 0, {
        id: counterpointId,
        theme,
        delay: this.subjectEntries[targetIndex].delay + 50,
        imitation: true,
        transposition: -1,
      });
    }
  }

  stopFugue(): void {
    this.currentState.isCompleted = true;
    this.currentState.currentEntry = this.subjectEntries.length;
  }

  reset(): void {
    this.currentState = {
      entries: [],
      currentEntry: 0,
      isCompleted: false,
    };
  }

  getEntryCount(): number {
    return this.subjectEntries.length;
  }
}