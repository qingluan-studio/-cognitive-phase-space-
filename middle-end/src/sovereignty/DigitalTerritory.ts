export interface TerritoryBoundary {
  domain: string;
  minRange: number;
  maxRange: number;
  description: string;
  softBorderWidth: number;
}

export interface TerritoryViolation {
  domain: string;
  intruder: string;
  attemptedLocation: number;
  detectedAt: number;
  severity: number;
  penetrationDepth: number;
}

export type BoundaryStatus = 'inside' | 'border' | 'soft' | 'outside';

export interface LocationProbe {
  domain: string;
  location: number;
  status: BoundaryStatus;
  distanceFromBoundary: number;
}

export class DigitalTerritory {
  private _boundaries: Map<string, TerritoryBoundary> = new Map();
  private _violations: TerritoryViolation[] = [];
  private _intruderBlacklist: Set<string> = new Set();
  private _intruderHistory: Map<string, number[]> = new Map();
  private _adjacency: Map<string, Set<string>> = new Map();
  private _escrow: Map<string, number> = new Map();

  declareBoundary(boundary: TerritoryBoundary): void {
    this._boundaries.set(boundary.domain, { ...boundary, softBorderWidth: Math.max(0, boundary.softBorderWidth) });
  }

  dissolveBoundary(domain: string): boolean {
    return this._boundaries.delete(domain);
  }

  linkDomains(a: string, b: string): void {
    const setA = this._adjacency.get(a) ?? new Set<string>();
    const setB = this._adjacency.get(b) ?? new Set<string>();
    setA.add(b);
    setB.add(a);
    this._adjacency.set(a, setA);
    this._adjacency.set(b, setB);
  }

  probe(domain: string, location: number, intruder: string = 'unknown'): LocationProbe {
    const boundary = this._boundaries.get(domain);
    if (!boundary) {
      return { domain, location, status: 'outside', distanceFromBoundary: Infinity };
    }

    const span = Math.max(1, boundary.maxRange - boundary.minRange);
    const softWidth = boundary.softBorderWidth * span;
    let status: BoundaryStatus;
    let distance = 0;

    if (location < boundary.minRange || location > boundary.maxRange) {
      status = 'outside';
      distance = location < boundary.minRange
        ? boundary.minRange - location
        : location - boundary.maxRange;
      if (!this.isBlacklisted(intruder)) {
        this._recordViolation(domain, intruder, location, distance);
      }
    } else if (location === boundary.minRange || location === boundary.maxRange) {
      status = 'border';
      distance = 0;
    } else if (
      location < boundary.minRange + softWidth ||
      location > boundary.maxRange - softWidth
    ) {
      status = 'soft';
      distance = Math.min(
        location - boundary.minRange,
        boundary.maxRange - location
      );
    } else {
      status = 'inside';
      distance = Math.min(
        location - boundary.minRange,
        boundary.maxRange - location
      );
    }

    return { domain, location, status, distanceFromBoundary: distance };
  }

  isWithin(domain: string, location: number): boolean {
    const boundary = this._boundaries.get(domain);
    if (!boundary) return false;
    return location >= boundary.minRange && location <= boundary.maxRange;
  }

  transferLocation(from: string, to: string, value: number): boolean {
    if (!this.isWithin(from, value)) return false;
    if (!this._adjacency.get(from)?.has(to)) return false;
    const target = this._boundaries.get(to);
    if (!target) return false;
    const normalized = (value - (this._boundaries.get(from)?.minRange ?? 0)) /
      Math.max(1, (this._boundaries.get(from)?.maxRange ?? 1) - (this._boundaries.get(from)?.minRange ?? 0));
    const mapped = target.minRange + normalized * (target.maxRange - target.minRange);
    this._escrow.set(`${from}->${to}`, mapped);
    return this.isWithin(to, mapped);
  }

  blacklistIntruder(intruder: string): void {
    this._intruderBlacklist.add(intruder);
  }

  isBlacklisted(intruder: string): boolean {
    return this._intruderBlacklist.has(intruder);
  }

  getViolations(domain?: string): TerritoryViolation[] {
    if (domain) return this._violations.filter(v => v.domain === domain);
    return [...this._violations];
  }

  getIntruderProfile(intruder: string): { attempts: number; domains: Set<string>; avgSeverity: number } {
    const records = this._violations.filter(v => v.intruder === intruder);
    const domains = new Set(records.map(r => r.domain));
    const avg = records.length > 0
      ? records.reduce((s, r) => s + r.severity, 0) / records.length
      : 0;
    return { attempts: records.length, domains, avgSeverity: avg };
  }

  get totalDomains(): number { return this._boundaries.size; }
  get violationCount(): number { return this._violations.length; }
  get blacklistSize(): number { return this._intruderBlacklist.size; }

  private _recordViolation(domain: string, intruder: string, location: number, depth: number): void {
    const boundary = this._boundaries.get(domain)!;
    const span = Math.max(1, boundary.maxRange - boundary.minRange);
    const severity = Math.min(1, depth / span);
    this._violations.push({
      domain,
      intruder,
      attemptedLocation: location,
      detectedAt: Date.now(),
      severity,
      penetrationDepth: depth,
    });
    const history = this._intruderHistory.get(intruder) ?? [];
    history.push(Date.now());
    if (history.length > 50) history.shift();
    this._intruderHistory.set(intruder, history);
    if (history.length >= 5 && !this._intruderBlacklist.has(intruder)) {
      this.blacklistIntruder(intruder);
    }
  }
}
