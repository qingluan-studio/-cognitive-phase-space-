export interface SymbolicToken {
  id: string;
  symbol: string;
  power: number;
  bearer: string;
  issuedAt: number;
  expiresAt: number | null;
}

export interface ControlExertion {
  tokenId: string;
  target: string;
  action: string;
  effective: boolean;
  exertedAt: number;
}

export class SymbolicPower {
  private _tokens: Map<string, SymbolicToken> = new Map();
  private _exertions: ControlExertion[] = [];
  private _symbolRegistry: Map<string, number> = new Map();
  private _maxPower = 100;
  private _decayPerDay = 5;
  private _powerCurve: Map<string, number[]> = new Map();
  private _bearerReputation: Map<string, number> = new Map();

  registerSymbol(symbol: string, basePower: number): void {
    const normalized = Math.min(basePower, this._maxPower);
    this._symbolRegistry.set(symbol, normalized);
    this._powerCurve.set(symbol, [normalized]);
  }

  issue(symbol: string, bearer: string): SymbolicToken | null {
    const basePower = this._symbolRegistry.get(symbol);
    if (basePower === undefined) return null;
    const reputation = this._bearerReputation.get(bearer) ?? 0.5;
    const scaledPower = basePower * (0.5 + reputation);
    const token: SymbolicToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol,
      power: Math.min(this._maxPower, scaledPower),
      bearer,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    this._tokens.set(token.id, token);
    const curve = this._powerCurve.get(symbol) ?? [];
    curve.push(token.power);
    if (curve.length > 50) curve.shift();
    this._powerCurve.set(symbol, curve);
    return token;
  }

  exertControl(tokenId: string, target: string, action: string, requiredPower: number): ControlExertion | null {
    const token = this._tokens.get(tokenId);
    if (!token) return null;
    if (token.expiresAt && token.expiresAt < Date.now()) {
      token.power = 0;
      return null;
    }
    const effective = token.power >= requiredPower;
    const exertion: ControlExertion = {
      tokenId,
      target,
      action,
      effective,
      exertedAt: Date.now(),
    };
    this._exertions.push(exertion);
    if (this._exertions.length > 300) this._exertions.shift();
    if (effective) {
      const fatigue = requiredPower * 0.1;
      token.power = Math.max(0, token.power - fatigue);
      const rep = this._bearerReputation.get(token.bearer) ?? 0.5;
      this._bearerReputation.set(token.bearer, Math.min(1, rep + 0.02));
    } else {
      const rep = this._bearerReputation.get(token.bearer) ?? 0.5;
      this._bearerReputation.set(token.bearer, Math.max(0, rep - 0.01));
    }
    return exertion;
  }

  transferBearer(tokenId: string, newBearer: string): boolean {
    const token = this._tokens.get(tokenId);
    if (!token) return false;
    token.bearer = newBearer;
    return true;
  }

  amplify(tokenId: string, amount: number): boolean {
    const token = this._tokens.get(tokenId);
    if (!token) return false;
    token.power = Math.min(this._maxPower, token.power + amount);
    return true;
  }

  decayTokens(): number {
    let decayed = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    for (const token of this._tokens.values()) {
      const ageInDays = (Date.now() - token.issuedAt) / dayMs;
      const decayAmount = Math.floor(ageInDays) * this._decayPerDay;
      const newPower = Math.max(0, token.power - decayAmount);
      if (newPower < token.power) {
        token.power = newPower;
        decayed++;
      }
    }
    return decayed;
  }

  revoke(tokenId: string): boolean {
    const token = this._tokens.get(tokenId);
    if (!token) return false;
    token.power = 0;
    token.expiresAt = Date.now();
    return true;
  }

  findMostPowerful(): SymbolicToken | null {
    let max = 0;
    let result: SymbolicToken | null = null;
    for (const token of this._tokens.values()) {
      if (token.power > max) {
        max = token.power;
        result = token;
      }
    }
    return result;
  }

  getTokensByBearer(bearer: string): SymbolicToken[] {
    return Array.from(this._tokens.values()).filter(t => t.bearer === bearer);
  }

  getExertionHistory(limit: number = 50): ControlExertion[] {
    return this._exertions.slice(-limit);
  }

  get tokenCount(): number {
    return this._tokens.size;
  }

  get symbolCount(): number {
    return this._symbolRegistry.size;
  }

  computeSymbolEntropy(symbol: string): number {
    const curve = this._powerCurve.get(symbol) ?? [];
    if (curve.length === 0) return 0;
    const mean = curve.reduce((a, b) => a + b, 0) / curve.length;
    const variance = curve.reduce((a, b) => a + (b - mean) ** 2, 0) / curve.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * (variance + 0.001));
  }

  getBearerReputation(bearer: string): number {
    return this._bearerReputation.get(bearer) ?? 0.5;
  }
}
