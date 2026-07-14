export type VoiceEntry = {
  id: string;
  delay: number;
  duration: number;
  amplitude: number;
  callback: () => Promise<unknown>;
};

export type CounterpointResult = {
  voiceId: string;
  data: unknown;
  arrivalTime: number;
  deviation: number;
};

export type HarmonyConstraint = {
  maxPolyphony: number;
  minInterval: number;
  maxInterval: number;
};

export class CounterpointScheduler {
  private voices: VoiceEntry[] = [];
  private constraints: HarmonyConstraint = {
    maxPolyphony: 5,
    minInterval: 50,
    maxInterval: 500,
  };

  setConstraints(constraints: Partial<HarmonyConstraint>): void {
    this.constraints = { ...this.constraints, ...constraints };
  }

  addVoice(entry: VoiceEntry): void {
    if (this.voices.length >= this.constraints.maxPolyphony) {
      throw new Error('Max polyphony exceeded');
    }
    this.voices.push(entry);
  }

  private calculateInterval(index: number): number {
    const baseInterval = this.constraints.minInterval + 
      (this.constraints.maxInterval - this.constraints.minInterval) * Math.random();
    return Math.round(index * baseInterval);
  }

  scheduleCounterpoint(): Promise<CounterpointResult[]> {
    const sortedVoices = [...this.voices].sort((a, b) => a.duration - b.duration);
    const scheduled = sortedVoices.map((voice, index) => ({
      ...voice,
      delay: this.calculateInterval(index),
    }));

    const startTime = Date.now();
    const promises = scheduled.map(voice =>
      new Promise<CounterpointResult>((resolve) => {
        setTimeout(async () => {
          try {
            const data = await voice.callback();
            resolve({
              voiceId: voice.id,
              data,
              arrivalTime: Date.now() - startTime,
              deviation: 0,
            });
          } catch (error) {
            resolve({
              voiceId: voice.id,
              data: error,
              arrivalTime: Date.now() - startTime,
              deviation: Number.MAX_VALUE,
            });
          }
        }, voice.delay);
      })
    );

    return Promise.all(promises);
  }

  harmonizeResults(results: CounterpointResult[]): CounterpointResult[] {
    const sorted = [...results].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const targetInterval = this.constraints.minInterval;
    
    return sorted.map((result, index) => ({
      ...result,
      deviation: Math.abs(result.arrivalTime - index * targetInterval),
    }));
  }

  clearVoices(): void {
    this.voices = [];
  }

  getVoiceCount(): number {
    return this.voices.length;
  }

  removeVoice(id: string): void {
    this.voices = this.voices.filter(v => v.id !== id);
  }
}