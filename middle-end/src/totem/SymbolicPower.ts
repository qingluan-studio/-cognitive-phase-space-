/**
 * 象征力量模块：符号本身携带实际控制力，
 * 通过符号认证、符号授权来对系统资源进行控制。
 */

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

  registerSymbol(symbol: string, basePower: number): void {
    this._symbolRegistry.set(symbol, Math.min(basePower, this._maxPower));
  }

  issue(symbol: string, bearer: string): SymbolicToken | null {
    const basePower = this._symbolRegistry.get(symbol);
    if (basePower === undefined) return null;
    const token: SymbolicToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol,
      power: basePower,
      bearer,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    this._tokens.set(token.id, token);
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
      token.power = Math.max(0, token.power - requiredPower * 0.1);
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
}
