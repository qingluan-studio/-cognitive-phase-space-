export type ExpansionPhase = 'inflation' | 'reheating' | 'deceleration' | 'acceleration' | 'bigRip' | 'bigFreeze';

export interface CosmologicalParams {
  omegaM: number;
  omegaLambda: number;
  omegaK: number;
  hubbleParameter: number;
  equationOfState: number;
  darkEnergyDensity: number;
  scaleFactor: number;
  decelerationParameter: number;
}

export interface ExpansionEvent {
  timestamp: number;
  scaleFactor: number;
  expansionRate: number;
  phase: ExpansionPhase;
  darkEnergyShare: number;
  temperature: number;
  entropy: number;
}

export interface QuintessenceField {
  potential: number;
  kineticEnergy: number;
  fieldValue: number;
  equationOfState: number;
  isPhantom: boolean;
  trackerSolution: number;
}

export interface FutureScenario {
  scenario: 'bigRip' | 'bigFreeze' | 'bigCrunch' | 'heatDeath';
  timeToOccurrence: number;
  confidence: number;
  requiredW: number;
  currentW: number;
}

export class DarkEnergyAccelerator {
  private _params: CosmologicalParams;
  private _events: ExpansionEvent[] = [];
  private _ticker = 0;
  private _quintessence: QuintessenceField;
  private _criticalDensity = 1.0;
  private _phantomCrossThreshold = -1.0;
  private _tensionConstant = 0.7;
  private _inflationEfoldings = 0;
  private _maxEfoldings = 60;
  private _recombinationThreshold = 0.001;
  private _scalarFieldMass = 1e-3;
  private _isPhantomWarning = false;

  get scaleFactor(): number { return this._params.scaleFactor; }
  get hubbleParameter(): number { return this._params.hubbleParameter; }
  get expansionPhase(): ExpansionPhase { return this._currentPhase(); }
  get darkEnergyFraction(): number { return this._params.omegaLambda / (this._params.omegaM + this._params.omegaLambda + Math.abs(this._params.omegaK)); }
  get events(): ExpansionEvent[] { return [...this._events]; }

  constructor(params?: Partial<CosmologicalParams>) {
    this._params = {
      omegaM: params?.omegaM ?? 0.3,
      omegaLambda: params?.omegaLambda ?? 0.7,
      omegaK: params?.omegaK ?? 0.0,
      hubbleParameter: params?.hubbleParameter ?? 0.07,
      equationOfState: params?.equationOfState ?? -1.0,
      darkEnergyDensity: params?.darkEnergyDensity ?? 0.7,
      scaleFactor: params?.scaleFactor ?? 1.0,
      decelerationParameter: params?.decelerationParameter ?? -0.55,
    };
    this._quintessence = {
      potential: 1.0,
      kineticEnergy: 0.0,
      fieldValue: 1.0,
      equationOfState: -1.0,
      isPhantom: false,
      trackerSolution: 0.0,
    };
  }

  inflate(efoldings: number = 60): ExpansionEvent {
    const deltaA = Math.exp(efoldings) - this._params.scaleFactor;
    this._params.scaleFactor += deltaA * 0.99;
    this._inflationEfoldings += efoldings;
    this._params.hubbleParameter = Math.sqrt(this._params.darkEnergyDensity) * (1 + this._params.scaleFactor * 0.1);
    this._params.decelerationParameter = -1.0 + 0.01 * this._inflationEfoldings;
    this._quintessence.kineticEnergy = this._scalarFieldMass * this._scalarFieldMass * 0.5;
    this._quintessence.fieldValue *= Math.exp(-efoldings * 0.1);
    this._quintessence.trackerSolution = this._params.scaleFactor;
    this._ticker++;
    return this._recordEvent();
  }

  evolve(deltaT: number): ExpansionEvent | null {
    this._ticker++;
    const w = this._quintessence.equationOfState;
    const hubble = this._params.hubbleParameter;
    const expansionRate = hubble * this._params.scaleFactor;
    this._params.scaleFactor *= (1 + expansionRate * deltaT * 0.001);
    const rhoLambda = this._params.darkEnergyDensity;
    const rhoMatter = this._params.omegaM / Math.max(1e-9, this._params.scaleFactor ** 3);
    const rhoCurvature = this._params.omegaK / Math.max(1e-9, this._params.scaleFactor ** 2);
    const totalDensity = rhoLambda + rhoMatter + Math.abs(rhoCurvature);
    this._params.hubbleParameter = Math.sqrt(totalDensity / this._criticalDensity) * 0.07;
    this._params.darkEnergyDensity = rhoLambda * this._params.scaleFactor ** (3 * (1 + w));
    this._params.omegaLambda = this._params.darkEnergyDensity / Math.max(1e-9, totalDensity);
    this._params.omegaM = rhoMatter / Math.max(1e-9, totalDensity);
    this._params.decelerationParameter = -this._params.scaleFactor * (rhoLambda + 3 * w * rhoLambda) / (2 * totalDensity);
    this._quintessence.fieldValue *= Math.exp(-deltaT * hubble * 0.1);
    this._quintessence.potential = this._scalarFieldMass * this._scalarFieldMass * this._quintessence.fieldValue * this._quintessence.fieldValue;
    this._quintessence.kineticEnergy = 0.5 * (this._quintessence.fieldValue * hubble) ** 2;
    const totalQE = this._quintessence.kineticEnergy + this._quintessence.potential;
    this._quintessence.equationOfState = totalQE > 1e-15
      ? (this._quintessence.kineticEnergy - this._quintessence.potential) / totalQE
      : -1;
    this._quintessence.isPhantom = this._quintessence.equationOfState < this._phantomCrossThreshold;
    if (this._quintessence.isPhantom && !this._isPhantomWarning) {
      this._isPhantomWarning = true;
    }
    if (this._inflationEfoldings >= this._maxEfoldings) {
      this._reheat();
    }
    return this._recordEvent();
  }

  predictFuture(lookAhead: number): FutureScenario[] {
    const scenarios: FutureScenario[] = [];
    const w = this._quintessence.equationOfState;
    const h = this._params.hubbleParameter;
    const hubbleTime = 1 / Math.max(1e-9, h);
    if (w < -1) {
      scenarios.push({
        scenario: 'bigRip',
        timeToOccurrence: hubbleTime * Math.abs(1 / (1 + w)) * 1000,
        confidence: 0.8,
        requiredW: w,
        currentW: w,
      });
    }
    if (w >= -1 && w < -0.9) {
      scenarios.push({
        scenario: 'heatDeath',
        timeToOccurrence: hubbleTime * 1e6,
        confidence: 0.7,
        requiredW: -1,
        currentW: w,
      });
    }
    if (w >= -0.9) {
      scenarios.push({
        scenario: 'bigFreeze',
        timeToOccurrence: hubbleTime * 100,
        confidence: 0.6,
        requiredW: -1,
        currentW: w,
      });
    }
    if (this._params.omegaK > 0.1) {
      scenarios.push({
        scenario: 'bigCrunch',
        timeToOccurrence: hubbleTime * 50,
        confidence: 0.3,
        requiredW: -1,
        currentW: w,
      });
    }
    return scenarios;
  }

  getCosmicTension(): number {
    const expansion = this._params.hubbleParameter;
    const density = this._params.darkEnergyDensity;
    return Math.abs(expansion - this._tensionConstant) / this._tensionConstant
      + Math.abs(density - this._tensionConstant) / this._tensionConstant;
  }

  setEquationOfState(w: number): void {
    this._params.equationOfState = Math.max(-2, Math.min(0, w));
    this._quintessence.equationOfState = w;
    this._quintessence.isPhantom = w < this._phantomCrossThreshold;
  }

  getQuintessence(): QuintessenceField {
    return { ...this._quintessence };
  }

  getParams(): CosmologicalParams {
    return { ...this._params };
  }

  private _currentPhase(): ExpansionPhase {
    if (this._quintessence.isPhantom) return 'bigRip';
    if (this._params.decelerationParameter < -0.5) return 'acceleration';
    if (this._inflationEfoldings < 10 && this._inflationEfoldings > 0) return 'inflation';
    if (this._inflationEfoldings >= this._maxEfoldings && this._ticker < 5) return 'reheating';
    if (this._params.decelerationParameter > 0) return 'deceleration';
    return 'acceleration';
  }

  private _recordEvent(): ExpansionEvent {
    const event: ExpansionEvent = {
      timestamp: Date.now(),
      scaleFactor: this._params.scaleFactor,
      expansionRate: this._params.hubbleParameter * this._params.scaleFactor,
      phase: this._currentPhase(),
      darkEnergyShare: this.darkEnergyFraction,
      temperature: 2.725 / this._params.scaleFactor,
      entropy: this._params.scaleFactor ** 3 * this._params.darkEnergyDensity,
    };
    this._events.push(event);
    if (this._events.length > 500) this._events.shift();
    return event;
  }

  private _reheat(): void {
    this._params.darkEnergyDensity *= 0.3;
    this._quintessence.kineticEnergy = this._params.darkEnergyDensity * 0.5;
    this._quintessence.fieldValue = 0.1;
    this._inflationEfoldings = 0;
  }
}
