export type CadencePattern = {
  beats: number[];
  tempo: number;
  signature: string;
};

export type RhythmState = {
  currentBeat: number;
  nextBeatTime: number;
  isPaused: boolean;
  beatsPerMinute: number;
};

export type BeatEvent = {
  timestamp: number;
  beatIndex: number;
  duration: number;
};

export class CadenceGovernor {
  private pattern: CadencePattern = {
    beats: [1, 0.5, 0.5, 1],
    tempo: 60,
    signature: '4/4',
  };

  private state: RhythmState = {
    currentBeat: 0,
    nextBeatTime: 0,
    isPaused: true,
    beatsPerMinute: 60,
  };

  private beatHistory: BeatEvent[] = [];

  setPattern(pattern: Partial<CadencePattern>): void {
    this.pattern = { ...this.pattern, ...pattern };
  }

  setTempo(bpm: number): void {
    this.state.beatsPerMinute = Math.max(10, Math.min(300, bpm));
    this.pattern.tempo = this.state.beatsPerMinute;
  }

  start(): void {
    if (!this.state.isPaused) return;
    this.state.isPaused = false;
    this.state.nextBeatTime = Date.now();
    this.playBeat();
  }

  pause(): void {
    this.state.isPaused = true;
  }

  stop(): void {
    this.state.isPaused = true;
    this.state.currentBeat = 0;
    this.beatHistory = [];
  }

  private playBeat(): void {
    if (this.state.isPaused) return;

    const now = Date.now();
    const beatIndex = this.state.currentBeat % this.pattern.beats.length;
    const beatDuration = (60 / this.state.beatsPerMinute) * this.pattern.beats[beatIndex] * 1000;

    this.beatHistory.push({
      timestamp: now,
      beatIndex,
      duration: beatDuration,
    });

    this.onBeat(beatIndex);

    this.state.currentBeat++;
    this.state.nextBeatTime = now + beatDuration;

    setTimeout(() => this.playBeat(), beatDuration);
  }

  protected onBeat(beatIndex: number): void {}

  getState(): RhythmState {
    return { ...this.state };
  }

  getBeatHistory(): BeatEvent[] {
    return [...this.beatHistory];
  }

  synchronize(externalBeatTime: number): void {
    const now = Date.now();
    const offset = externalBeatTime - now;
    this.state.nextBeatTime = externalBeatTime;
    
    if (offset > 0) {
      setTimeout(() => this.playBeat(), offset);
    } else {
      this.playBeat();
    }
  }

  calculateAverageBeatDuration(): number {
    if (this.beatHistory.length === 0) return 0;
    const total = this.beatHistory.reduce((sum, beat) => sum + beat.duration, 0);
    return total / this.beatHistory.length;
  }
}