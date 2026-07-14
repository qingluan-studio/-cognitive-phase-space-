export interface TransportRecord {
  id: string;
  substrate: string;
  concentrationInside: number;
  concentrationOutside: number;
  atpAvailable: number;
  pumpRate: number;
}

export interface TransportEvent {
  recordId: string;
  moleculesMoved: number;
  atpConsumed: number;
  electrochemicalGradient: number;
  timestamp: number;
}

export class ActiveTransport {
  private _records: Map<string, TransportRecord> = new Map();
  private _events: TransportEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _maxPumpRate: number = 100;
  private _atpCostPerMolecule: number = 1;
  private _faradayConstant: number = 96485;
  private _membranePotential: number = -70;
  private _transportEfficiency: number = 0;

  registerPump(record: TransportRecord): void {
    this._records.set(record.id, record);
  }

  pump(recordId: string, dt: number = 1): TransportEvent | null {
    const record = this._records.get(recordId);
    if (!record) return null;
    const km = 5;
    const vMax = this._maxPumpRate;
    const substrateAvailable = record.concentrationOutside;
    const velocity = (vMax * substrateAvailable) / (km + substrateAvailable);
    const moleculesMoved = Math.min(velocity * dt, record.atpAvailable / this._atpCostPerMolecule);
    const atpConsumed = moleculesMoved * this._atpCostPerMolecule;
    if (atpConsumed > record.atpAvailable) return null;
    record.atpAvailable -= atpConsumed;
    record.concentrationInside += moleculesMoved * 0.01;
    record.concentrationOutside -= moleculesMoved * 0.01;
    const gradient = this._computeElectrochemicalGradient(record);
    const event: TransportEvent = {
      recordId,
      moleculesMoved,
      atpConsumed,
      electrochemicalGradient: gradient,
      timestamp: Date.now(),
    };
    this._events.push(event);
    if (this._events.length > 200) this._events.shift();
    this._updateEfficiency();
    return event;
  }

  private _computeElectrochemicalGradient(record: TransportRecord): number {
    const valence = 1;
    const deltaC = record.concentrationOutside - record.concentrationInside;
    const chemical = this._gasConstant() * this._temperature() * Math.log(record.concentrationOutside / (record.concentrationInside + 1e-9));
    const electrical = valence * this._faradayConstant * this._membranePotential;
    return deltaC * (chemical + electrical);
  }

  private _gasConstant(): number {
    return 8.314;
  }

  private _temperature(): number {
    return 310;
  }

  private _updateEfficiency(): void {
    if (this._events.length === 0) return;
    const recent = this._events.slice(-20);
    const totalMoved = recent.reduce((s, e) => s + e.moleculesMoved, 0);
    const totalAtp = recent.reduce((s, e) => s + e.atpConsumed, 0);
    this._transportEfficiency = totalAtp > 0 ? totalMoved / totalAtp : 0;
  }

  getRecord(id: string): TransportRecord | null {
    return this._records.get(id) ?? null;
  }

  totalMoleculesMoved(): number {
    return this._events.reduce((s, e) => s + e.moleculesMoved, 0);
  }

  totalAtpConsumed(): number {
    return this._events.reduce((s, e) => s + e.atpConsumed, 0);
  }

  averageGradient(): number {
    if (this._events.length === 0) return 0;
    return this._events.reduce((s, e) => s + e.electrochemicalGradient, 0) / this._events.length;
  }

  setMaxPumpRate(rate: number): void {
    this._maxPumpRate = Math.max(0, rate);
  }

  setAtpCost(cost: number): void {
    this._atpCostPerMolecule = Math.max(0.1, cost);
  }

  setMembranePotential(potential: number): void {
    this._membranePotential = potential;
  }

  get transportEfficiency(): number {
    return this._transportEfficiency;
  }

  get eventCount(): number {
    return this._events.length;
  }

  transportReport(): Record<string, unknown> {
    return {
      pumpCount: this._records.size,
      eventCount: this._events.length,
      totalMoleculesMoved: this.totalMoleculesMoved().toFixed(2),
      totalAtpConsumed: this.totalAtpConsumed().toFixed(2),
      averageGradient: this.averageGradient().toFixed(4),
      transportEfficiency: this._transportEfficiency.toFixed(4),
      membranePotential: this._membranePotential.toFixed(2),
      state: this._state,
    };
  }
}
