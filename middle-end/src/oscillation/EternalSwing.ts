export interface SwingState {
  label: 'A' | 'B';
  value: number;
  enteredAt: number;
}

export interface SwingRecord {
  cycles: number;
  lastTransition: number;
  amplitude: number;
  period: number;
  kramersRate: number;
}

export class EternalSwing {
  private _current: SwingState;
  private _records: SwingRecord[] = [];
  private _amplitude: number;
  private _period: number;
  private _cycleCount = 0;
  private _damping = 0;
  private _noiseIntensity = 0.05;
  private _potentialBarrier = 1.0;
  private _temperature = 0.1;
  private _metropolisChain: number[] = [];

  constructor(amplitude: number = 1.0, period: number = 1000) {
    this._amplitude = amplitude;
    this._period = period;
    this._current = { label: 'A', value: amplitude, enteredAt: Date.now() };
  }

  tick(now: number = Date.now()): SwingState {
    const elapsed = now - this._current.enteredAt;
    const langevinForce = this._noiseIntensity * (Math.random() - 0.5);
    const effectiveBarrier = this._potentialBarrier * (1 - this._damping);
    if (elapsed >= this._period || this._metropolisAccept(effectiveBarrier)) {
      const nextLabel = this._current.label === 'A' ? 'B' : 'A';
      const nextValue = nextLabel === 'A' ? this._amplitude : -this._amplitude;
      this._current = { label: nextLabel, value: nextValue * (1 - this._damping) + langevinForce, enteredAt: now };
      this._cycleCount++;
      const kramers = this._computeKramersRate();
      this._records.push({
        cycles: this._cycleCount,
        lastTransition: now,
        amplitude: this._amplitude,
        period: this._period,
        kramersRate: kramers,
      });
      if (this._records.length > 200) this._records.shift();
    }
    return this._current;
  }

  setAmplitude(value: number): void {
    this._amplitude = Math.max(0, value);
  }

  setPeriod(ms: number): void {
    this._period = Math.max(50, ms);
  }

  applyDamping(factor: number): void {
    this._damping = Math.max(0, Math.min(1, factor));
  }

  setNoiseIntensity(intensity: number): void {
    this._noiseIntensity = Math.max(0, intensity);
  }

  setPotentialBarrier(barrier: number): void {
    this._potentialBarrier = Math.max(0.01, barrier);
  }

  setTemperature(temp: number): void {
    this._temperature = Math.max(0.001, temp);
  }

  forceFlip(): SwingState {
    const nextLabel = this._current.label === 'A' ? 'B' : 'A';
    this._current = {
      label: nextLabel,
      value: nextLabel === 'A' ? this._amplitude : -this._amplitude,
      enteredAt: Date.now(),
    };
    return this._current;
  }

  computeStochasticResonanceSignalToNoise(): number {
    if (this._records.length < 2) return 0;
    const signalPower = this._amplitude * this._amplitude;
    const noisePower = this._noiseIntensity * this._noiseIntensity;
    const kramers = this._computeKramersRate();
    const snr = (Math.PI * this._potentialBarrier * this._potentialBarrier / (2 * this._temperature * this._temperature)) * Math.exp(-this._potentialBarrier / this._temperature);
    return snr * signalPower / (noisePower + 1e-9);
  }

  computeFokkerPlanckDrift(x: number): number {
    const potentialGradient = 4 * x * (x * x - this._potentialBarrier);
    return -potentialGradient - this._damping * x;
  }

  computeFokkerPlanckDiffusion(): number {
    return this._noiseIntensity * this._noiseIntensity / 2;
  }

  runMetropolisChain(steps: number): number[] {
    const chain: number[] = [this._current.value];
    for (let i = 0; i < steps; i++) {
      const proposal = chain[chain.length - 1] + this._noiseIntensity * (Math.random() - 0.5);
      const deltaE = this._doubleWellEnergy(proposal) - this._doubleWellEnergy(chain[chain.length - 1]);
      if (deltaE < 0 || Math.random() < Math.exp(-deltaE / this._temperature)) {
        chain.push(proposal);
      } else {
        chain.push(chain[chain.length - 1]);
      }
    }
    this._metropolisChain = chain;
    return chain;
  }

  getCurrent(): SwingState {
    return { ...this._current };
  }

  getRecords(limit: number = 50): SwingRecord[] {
    return this._records.slice(-limit);
  }

  get cycleCount(): number {
    return this._cycleCount;
  }

  get metropolisChain(): number[] {
    return [...this._metropolisChain];
  }

  get kramersRate(): number {
    return this._computeKramersRate();
  }

  private _computeKramersRate(): number {
    const prefactor = Math.sqrt(2) * Math.PI;
    const barrier = this._potentialBarrier;
    const temp = this._temperature;
    return prefactor * Math.exp(-barrier / (temp + 1e-9));
  }

  private _metropolisAccept(barrier: number): boolean {
    const rate = this._computeKramersRate();
    return Math.random() < rate * 0.01;
  }

  private _doubleWellEnergy(x: number): number {
    return x * x * x * x - 2 * this._potentialBarrier * x * x;
  }
}
