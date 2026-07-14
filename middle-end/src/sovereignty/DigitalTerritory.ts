/**
 * 数字领土：定义系统不可侵犯的运算边界。
 * 通过明确定义内存空间、计算资源和数据域的领地范围，防止越界访问。
 */

export interface TerritoryBoundary {
  domain: string;
  minRange: number;
  maxRange: number;
  description: string;
}

export interface TerritoryViolation {
  domain: string;
  intruder: string;
  attemptedLocation: number;
  detectedAt: number;
}

export type BoundaryStatus = 'inside' | 'border' | 'outside';

export interface LocationProbe {
  domain: string;
  location: number;
  status: BoundaryStatus;
}

export class DigitalTerritory {
  private _boundaries: Map<string, TerritoryBoundary> = new Map();
  private _violations: TerritoryViolation[] = [];
  private _intruderBlacklist: Set<string> = new Set();

  declareBoundary(boundary: TerritoryBoundary): void {
    this._boundaries.set(boundary.domain, boundary);
  }

  dissolveBoundary(domain: string): boolean {
    return this._boundaries.delete(domain);
  }

  probe(domain: string, location: number, intruder: string = 'unknown'): LocationProbe {
    const boundary = this._boundaries.get(domain);
    if (!boundary) {
      return { domain, location, status: 'outside' };
    }

    let status: BoundaryStatus;
    if (location < boundary.minRange || location > boundary.maxRange) {
      status = 'outside';
      this._recordViolation(domain, intruder, location);
    } else if (
      location === boundary.minRange ||
      location === boundary.maxRange
    ) {
      status = 'border';
    } else {
      status = 'inside';
    }

    return { domain, location, status };
  }

  isWithin(domain: string, location: number): boolean {
    const boundary = this._boundaries.get(domain);
    if (!boundary) return false;
    return location >= boundary.minRange && location <= boundary.maxRange;
  }

  blacklistIntruder(intruder: string): void {
    this._intruderBlacklist.add(intruder);
  }

  isBlacklisted(intruder: string): boolean {
    return this._intruderBlacklist.has(intruder);
  }

  getViolations(domain?: string): TerritoryViolation[] {
    if (domain) {
      return this._violations.filter(v => v.domain === domain);
    }
    return [...this._violations];
  }

  get totalDomains(): number {
    return this._boundaries.size;
  }

  get violationCount(): number {
    return this._violations.length;
  }

  private _recordViolation(domain: string, intruder: string, location: number): void {
    this._violations.push({
      domain,
      intruder,
      attemptedLocation: location,
      detectedAt: Date.now(),
    });
  }
}
