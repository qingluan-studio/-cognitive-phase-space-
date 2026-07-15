export interface DemonState {
  gateOpen: boolean;
  fastParticles: number;
  slowParticles: number;
  entropyCreated: number;
  informationStored: number;
}

export interface Particle {
  velocity: number;
  position: number;
  mass: number;
}

export class MaxwellDemonEngine {
  private _temperature: number;
  private _particleCount: number;
  private _chamberDivider: number;
  private _gateOpen: boolean;
  private _fastParticles: number;
  private _slowParticles: number;
  private _leftChamberTemp: number;
  private _rightChamberTemp: number;
  private _informationBits: number;
  private _entropyCreated: number;
  private _particles: Particle[];
  private _history: DemonState[];
  private _boltzmannConstant: number;
  private _measurementCost: number;

  constructor(temperature: number = 300, particleCount: number = 1000) {
    this._temperature = temperature;
    this._particleCount = particleCount;
    this._chamberDivider = 0.5;
    this._gateOpen = false;
    this._fastParticles = 0;
    this._slowParticles = 0;
    this._leftChamberTemp = temperature;
    this._rightChamberTemp = temperature;
    this._informationBits = 0;
    this._entropyCreated = 0;
    this._particles = this._initializeParticles();
    this._history = [];
    this._boltzmannConstant = 1.38e-23;
    this._measurementCost = 0;
  }

  get temperature(): number {
    return this._temperature;
  }

  get gateOpen(): boolean {
    return this._gateOpen;
  }

  get leftChamberTemp(): number {
    return this._leftChamberTemp;
  }

  get rightChamberTemp(): number {
    return this._rightChamberTemp;
  }

  get informationBits(): number {
    return this._informationBits;
  }

  private _initializeParticles(): Particle[] {
    const particles: Particle[] = [];
    const sigma = Math.sqrt(this._boltzmannConstant * this._temperature);
    for (let i = 0; i < this._particleCount; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      particles.push({
        velocity: sigma * z,
        position: Math.random(),
        mass: 1,
      });
    }
    return particles;
  }

  public measureParticle(index: number): boolean {
    if (index < 0 || index >= this._particleCount) return false;
    const p = this._particles[index];
    const isFast = Math.abs(p.velocity) > Math.sqrt(2 * this._boltzmannConstant * this._temperature);
    this._informationBits += 1;
    this._measurementCost += this._boltzmannConstant * this._temperature * Math.log(2);
    return isFast;
  }

  public operateGate(): void {
    this._gateOpen = !this._gateOpen;
    if (!this._gateOpen) {
      this._computeChamberTemperatures();
    }
  }

  private _computeChamberTemperatures(): void {
    let leftEnergy = 0;
    let leftCount = 0;
    let rightEnergy = 0;
    let rightCount = 0;
    for (const p of this._particles) {
      if (p.position < this._chamberDivider) {
        leftEnergy += 0.5 * p.mass * p.velocity * p.velocity;
        leftCount++;
      } else {
        rightEnergy += 0.5 * p.mass * p.velocity * p.velocity;
        rightCount++;
      }
    }
    this._leftChamberTemp = leftCount > 0 ? (2 * leftEnergy) / (3 * leftCount * this._boltzmannConstant) : this._temperature;
    this._rightChamberTemp = rightCount > 0 ? (2 * rightEnergy) / (3 * rightCount * this._boltzmannConstant) : this._temperature;
  }

  public tick(dt: number): void {
    for (const p of this._particles) {
      p.position += p.velocity * dt;
      if (p.position < 0) {
        p.position = -p.position;
        p.velocity = -p.velocity;
      }
      if (p.position > 1) {
        p.position = 2 - p.position;
        p.velocity = -p.velocity;
      }
      if (!this._gateOpen && Math.abs(p.position - this._chamberDivider) < 0.01) {
        p.velocity = -p.velocity;
      }
    }
    this._computeChamberTemperatures();
    const deltaS = this._computeEntropyChange();
    this._entropyCreated += deltaS;
    const state: DemonState = {
      gateOpen: this._gateOpen,
      fastParticles: this._fastParticles,
      slowParticles: this._slowParticles,
      entropyCreated: this._entropyCreated,
      informationStored: this._informationBits,
    };
    this._history.push(state);
    if (this._history.length > 200) this._history.shift();
  }

  private _computeEntropyChange(): number {
    const dT = Math.abs(this._leftChamberTemp - this._rightChamberTemp);
    return this._boltzmannConstant * this._particleCount * (dT * dT) / (this._temperature * this._temperature);
  }

  public computeLandauerCost(): number {
    return this._informationBits * this._boltzmannConstant * this._temperature * Math.log(2);
  }

  public computeAvailableWork(): number {
    const dT = Math.abs(this._leftChamberTemp - this._rightChamberTemp);
    const efficiency = dT / Math.max(this._leftChamberTemp, this._rightChamberTemp);
    return efficiency * this._computeHeatTransfer();
  }

  private _computeHeatTransfer(): number {
    return this._particleCount * this._boltzmannConstant * Math.abs(this._leftChamberTemp - this._rightChamberTemp);
  }

  public sortParticlesByVelocity(): void {
    this._fastParticles = 0;
    this._slowParticles = 0;
    const threshold = Math.sqrt(2 * this._boltzmannConstant * this._temperature);
    for (const p of this._particles) {
      if (Math.abs(p.velocity) > threshold) {
        this._fastParticles++;
        if (p.position < this._chamberDivider) {
          p.position += this._chamberDivider;
        }
      } else {
        this._slowParticles++;
        if (p.position >= this._chamberDivider) {
          p.position -= this._chamberDivider;
        }
      }
    }
    this._computeChamberTemperatures();
  }

  public getTemperatureDifference(): number {
    return Math.abs(this._leftChamberTemp - this._rightChamberTemp);
  }

  public getParticles(): Particle[] {
    return this._particles.map(p => ({ ...p }));
  }

  public getHistory(): DemonState[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeShannonEntropyOfDistribution(): number {
    const bins = 10;
    const counts = new Array(bins).fill(0);
    for (const p of this._particles) {
      const bin = Math.min(bins - 1, Math.max(0, Math.floor((p.velocity + 5) / 10 * bins)));
      counts[bin]++;
    }
    let entropy = 0;
    for (const count of counts) {
      if (count > 0) {
        const p = count / this._particleCount;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  public eraseInformation(bitsToErase: number): number {
    const erased = Math.min(bitsToErase, this._informationBits);
    this._informationBits -= erased;
    return erased * this._boltzmannConstant * this._temperature * Math.log(2);
  }

  public reset(): void {
    this._gateOpen = false;
    this._fastParticles = 0;
    this._slowParticles = 0;
    this._leftChamberTemp = this._temperature;
    this._rightChamberTemp = this._temperature;
    this._informationBits = 0;
    this._entropyCreated = 0;
    this._particles = this._initializeParticles();
    this._history = [];
    this._measurementCost = 0;
  }
}
