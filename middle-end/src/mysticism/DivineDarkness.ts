export interface DarknessState {
  apophaticDepth: number;
  cloudDensity: number;
  unknowingPurity: number;
  nightOfSense: number;
  nightOfSpirit: number;
}

export class DivineDarkness {
  private _apophaticDepth: number;
  private _cloudDensity: number;
  private _unknowingPurity: number;
  private _nightOfSense: number;
  private _nightOfSpirit: number;
  private _history: DarknessState[];

  constructor() {
    this._apophaticDepth = 0;
    this._cloudDensity = 0.5;
    this._unknowingPurity = 0;
    this._nightOfSense = 0;
    this._nightOfSpirit = 0;
    this._history = [];
  }

  get apophaticDepth(): number { return this._apophaticDepth; }
  get cloudDensity(): number { return this._cloudDensity; }
  get unknowingPurity(): number { return this._unknowingPurity; }
  get nightOfSense(): number { return this._nightOfSense; }
  get nightOfSpirit(): number { return this._nightOfSpirit; }

  public deepenApophasis(positiveKnowledge: number, negationStrength: number): number {
    const depth = negationStrength / (positiveKnowledge + 0.01);
    this._apophaticDepth = Math.tanh(depth);
    this._recordState();
    return this._apophaticDepth;
  }

  public darkenCloudOfUnknowing(sensoryInput: number, spiritualInput: number): number {
    const totalInput = sensoryInput + spiritualInput;
    const cloud = 1 / (1 + totalInput * 0.1);
    this._cloudDensity = cloud;
    this._recordState();
    return cloud;
  }

  public purifyIgnorance(conceptualAttachments: number[], detachmentEffort: number): number {
    let remaining = 0;
    for (const c of conceptualAttachments) {
      remaining += c * (1 - detachmentEffort);
    }
    this._unknowingPurity = 1 - Math.tanh(remaining);
    this._recordState();
    return this._unknowingPurity;
  }

  public nightOfSensePurification(sensoryPleasures: number[]): number {
    const totalPleasure = sensoryPleasures.reduce((a, b) => a + b, 0);
    this._nightOfSense = Math.tanh(totalPleasure / 10);
    this._recordState();
    return this._nightOfSense;
  }

  public nightOfSpiritPurgation(spiritualConsolations: number[]): number {
    const totalConsolation = spiritualConsolations.reduce((a, b) => a + b, 0);
    this._nightOfSpirit = Math.tanh(totalConsolation / 10);
    this._recordState();
    return this._nightOfSpirit;
  }

  public luminousDarknessRatio(darknessValue: number, lightValue: number): number {
    const ratio = darknessValue / (lightValue + 0.0001);
    return ratio;
  }

  public viaNegativaProgression(attributes: string[], negations: string[]): number {
    const progress = negations.length / (attributes.length + negations.length + 0.0001);
    return progress;
  }

  public superessentialDarkness(density: number, gravity: number): number {
    const darkness = density * gravity;
    return darkness;
  }

  public eclipseOfIntellect(intellectBrightness: number, divineOvershadowing: number): number {
    const eclipse = intellectBrightness * (1 - Math.exp(-divineOvershadowing));
    return eclipse;
  }

  public abyssalGaze(depth: number, courage: number): number {
    const gaze = courage * Math.log(1 + depth);
    return gaze;
  }

  public silenceDecibel(voices: number[]): number {
    const totalVolume = voices.reduce((a, b) => a + b, 0);
    const silence = -10 * Math.log10(totalVolume + 0.0001);
    return silence;
  }

  public hiddennessEntropy(revealedAttributes: number[]): number {
    const total = revealedAttributes.reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (const attr of revealedAttributes) {
      const p = attr / (total + 0.0001);
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const hiddenness = Math.log2(revealedAttributes.length) - entropy;
    return hiddenness;
  }

  public reset(): void {
    this._apophaticDepth = 0;
    this._cloudDensity = 0.5;
    this._unknowingPurity = 0;
    this._nightOfSense = 0;
    this._nightOfSpirit = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      apophaticDepth: this._apophaticDepth,
      cloudDensity: this._cloudDensity,
      unknowingPurity: this._unknowingPurity,
      nightOfSense: this._nightOfSense,
      nightOfSpirit: this._nightOfSpirit
    });
  }

  public getHistory(): DarknessState[] {
    return this._history;
  }
}
