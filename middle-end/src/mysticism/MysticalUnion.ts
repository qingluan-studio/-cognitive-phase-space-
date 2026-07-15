export interface UnionState {
  dissolutionDegree: number;
  loverIntensity: number;
  belovedPresence: number;
  fusionTemperature: number;
  egoBoundaryPermeability: number;
}

export class MysticalUnion {
  private _dissolutionDegree: number;
  private _loverIntensity: number;
  private _belovedPresence: number;
  private _fusionTemperature: number;
  private _egoBoundaryPermeability: number;
  private _history: UnionState[];

  constructor() {
    this._dissolutionDegree = 0;
    this._loverIntensity = 0.5;
    this._belovedPresence = 0;
    this._fusionTemperature = 300;
    this._egoBoundaryPermeability = 0.01;
    this._history = [];
  }

  get dissolutionDegree(): number { return this._dissolutionDegree; }
  get loverIntensity(): number { return this._loverIntensity; }
  get belovedPresence(): number { return this._belovedPresence; }
  get fusionTemperature(): number { return this._fusionTemperature; }
  get egoBoundaryPermeability(): number { return this._egoBoundaryPermeability; }

  public igniteLoverFlame(devotion: number, longing: number): number {
    const flame = devotion * longing;
    this._loverIntensity = Math.min(this._loverIntensity + flame * 0.1, 1.0);
    this._recordState();
    return this._loverIntensity;
  }

  public invokeBelovedGrace(ritualPurity: number, sacredSpace: number): number {
    const grace = ritualPurity * sacredSpace;
    this._belovedPresence = Math.tanh(grace);
    this._recordState();
    return this._belovedPresence;
  }

  public dissolveEgoBoundary(meditationDepth: number, surrenderFactor: number): number {
    const dissolution = meditationDepth * surrenderFactor;
    this._dissolutionDegree = Math.tanh(dissolution);
    this._egoBoundaryPermeability = this._dissolutionDegree;
    this._recordState();
    return this._dissolutionDegree;
  }

  public measureFusionHeat(separation: number, attraction: number): number {
    const heat = attraction / (separation + 0.001);
    this._fusionTemperature = 300 + heat * 1000;
    this._recordState();
    return this._fusionTemperature;
  }

  public unionEntropy(loverStates: number[], belovedStates: number[]): number {
    const jointProb = loverStates.map((l, i) => l * belovedStates[i]);
    const total = jointProb.reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (const p of jointProb) {
      const prob = p / (total + 0.0001);
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    return entropy;
  }

  public ecstaticOscillation(frequency: number, amplitude: number, cycles: number): number[] {
    const wave: number[] = [];
    for (let t = 0; t < cycles; t++) {
      wave.push(amplitude * Math.sin(2 * Math.PI * frequency * t / cycles));
    }
    return wave;
  }

  public mirrorReflection(selfImage: number[], divineImage: number[]): number {
    if (selfImage.length !== divineImage.length) return 0;
    let dot = 0;
    let selfNorm = 0;
    let divineNorm = 0;
    for (let i = 0; i < selfImage.length; i++) {
      dot += selfImage[i] * divineImage[i];
      selfNorm += selfImage[i] * selfImage[i];
      divineNorm += divineImage[i] * divineImage[i];
    }
    const similarity = dot / (Math.sqrt(selfNorm * divineNorm) + 0.0001);
    return similarity;
  }

  public annihilationRadiance(egoMass: number, lightSpeed: number): number {
    const radiance = egoMass * lightSpeed * lightSpeed;
    this._dissolutionDegree = Math.min(1, this._dissolutionDegree + radiance * 0.0001);
    this._recordState();
    return radiance;
  }

  public breathSynchronization(breathsA: number[], breathsB: number[]): number {
    let sync = 0;
    const n = Math.min(breathsA.length, breathsB.length);
    for (let i = 0; i < n; i++) {
      sync += 1 / (1 + Math.abs(breathsA[i] - breathsB[i]));
    }
    return sync / n;
  }

  public veiledRevelation(veilThickness: number, penetration: number): number {
    const revelation = penetration / (veilThickness + 0.01);
    return Math.tanh(revelation);
  }

  public sacredGeometryResonance(vertices: [number, number][], center: [number, number]): number {
    let resonance = 0;
    for (const v of vertices) {
      const dx = v[0] - center[0];
      const dy = v[1] - center[1];
      resonance += 1 / (Math.sqrt(dx * dx + dy * dy) + 0.001);
    }
    return resonance;
  }

  public intoxicationCurve(dose: number, tolerance: number, timeSteps: number): number[] {
    const curve: number[] = [];
    for (let t = 0; t < timeSteps; t++) {
      curve.push(dose * Math.exp(-t / (tolerance + 1)));
    }
    return curve;
  }

  public reset(): void {
    this._dissolutionDegree = 0;
    this._loverIntensity = 0.5;
    this._belovedPresence = 0;
    this._fusionTemperature = 300;
    this._egoBoundaryPermeability = 0.01;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      dissolutionDegree: this._dissolutionDegree,
      loverIntensity: this._loverIntensity,
      belovedPresence: this._belovedPresence,
      fusionTemperature: this._fusionTemperature,
      egoBoundaryPermeability: this._egoBoundaryPermeability
    });
  }

  public getHistory(): UnionState[] {
    return this._history;
  }
}
