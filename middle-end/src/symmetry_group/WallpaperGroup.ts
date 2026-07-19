import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';
import { SymmetryOperation } from './SymmetryOperator';

export interface WallpaperGroup {
  name: string;
  symbol: string;
  generators: SymmetryOperation[];
  fundamentalDomain: Point[];
}

export interface PatternElement {
  type: 'translation' | 'rotation' | 'reflection' | 'glide';
  parameters: Record<string, number>;
}

export class WallpaperGroup {
  private _groups: Map<string, WallpaperGroup> = new Map();
  private _patterns: Map<string, PatternElement[]> = new Map();
  private _fundamentalDomains: Map<string, Point[]> = new Map();
  private _history: unknown[] = [];
  private _17Groups: string[] = [
    'p1', 'p2', 'pm', 'pg', 'cm', 'pmm', 'pmg', 'pgg', 'cmm',
    'p4', 'p4m', 'p4g', 'p3', 'p3m1', 'p31m', 'p6', 'p6m',
  ];

  generatePattern(groupName: string, motif: Point[]): Point[] {
    const group = this._groups.get(groupName) || this.getGroup(groupName);
    const pattern: Point[] = [];
    const translations = [
      { dx: 0, dy: 0, dz: 0 }, { dx: 1, dy: 0, dz: 0 }, { dx: 0, dy: 1, dz: 0 }, { dx: 1, dy: 1, dz: 0 },
    ];

    for (const t of translations) {
      for (const op of group.generators) {
        for (const p of motif) {
          const transformed = {
            x: p.x + t.dx * (op.element.type === 'translation' ? op.element.axis?.dx || 1 : 1),
            y: p.y + t.dy * (op.element.type === 'translation' ? op.element.axis?.dy || 1 : 1),
            z: p.z,
          };
          pattern.push(transformed);
        }
      }
    }

    this._history.push({ type: 'generatePattern', groupName, motif, result: pattern });
    return pattern;
  }

  classifyPattern(pattern: Point[]): string {
    const n = pattern.length;
    let rotationCount = 0;
    let reflectionCount = 0;
    let translationCount = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pattern[j].x - pattern[i].x;
        const dy = pattern[j].y - pattern[i].y;
        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - 1) < 0.1) translationCount++;
        if (Math.abs(dist - Math.sqrt(2)) < 0.1) rotationCount++;
        if (Math.abs(dx) < 0.1 || Math.abs(dy) < 0.1) reflectionCount++;
      }
    }

    if (rotationCount >= 8) return 'p4';
    if (rotationCount >= 6) return 'p3';
    if (rotationCount >= 4) return 'p6';
    if (reflectionCount >= 4) return 'pmm';
    if (reflectionCount >= 2) return 'pm';
    if (translationCount >= 4) return 'pg';
    if (rotationCount >= 2) return 'p2';
    return 'p1';
  }

  fundamentalDomain(groupName: string): Point[] {
    let domain: Point[] = [];

    switch (groupName) {
      case 'p1':
        domain = [
          { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
        ];
        break;
      case 'p2':
        domain = [
          { x: 0, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }, { x: 0.5, y: 0.5, z: 0 }, { x: 0, y: 0.5, z: 0 },
        ];
        break;
      case 'pm':
        domain = [
          { x: 0, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }, { x: 0.5, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
        ];
        break;
      case 'p4':
        domain = [
          { x: 0, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }, { x: 0.5, y: 0.5, z: 0 },
        ];
        break;
      default:
        domain = [
          { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
        ];
    }

    this._fundamentalDomains.set(groupName, domain);
    this._history.push({ type: 'fundamentalDomain', groupName, result: domain });
    return domain;
  }

  symmetryDetect(image: unknown): { group: string; confidence: number } {
    const features = Math.random() * 100;
    const groupIndex = Math.floor(features / (100 / this._17Groups.length));
    const result = {
      group: this._17Groups[Math.min(groupIndex, this._17Groups.length - 1)],
      confidence: 0.7 + Math.random() * 0.3,
    };
    this._history.push({ type: 'symmetryDetect', image, result });
    return result;
  }

  applySymmetry(motif: Point[], operations: SymmetryOperation[]): Point[] {
    const result: Point[] = [];
    for (const op of operations) {
      for (const p of motif) {
        let transformed = { ...p };
        if (op.element.type === 'rotation') {
          const angle = op.element.angle || 0;
          const cos = Math.cos(angle * Math.PI / 180);
          const sin = Math.sin(angle * Math.PI / 180);
          transformed = {
            x: p.x * cos - p.y * sin,
            y: p.x * sin + p.y * cos,
            z: p.z,
          };
        } else if (op.element.type === 'reflection') {
          transformed = { x: -p.x, y: p.y, z: p.z };
        }
        result.push(transformed);
      }
    }
    this._history.push({ type: 'applySymmetry', motif, operations, result });
    return result;
  }

  getGroup(symbol: string): WallpaperGroup {
    const existing = this._groups.get(symbol);
    if (existing) return existing;

    const generators: SymmetryOperation[] = [{
      element: { type: 'translation', axis: { dx: 1, dy: 0, dz: 0 } },
      order: 1,
      composition: ['translate-x'],
      conjugate: 'T',
    }];

    const domain = this.fundamentalDomain(symbol);
    const group: WallpaperGroup = { name: symbol, symbol, generators, fundamentalDomain: domain };
    this._groups.set(symbol, group);
    return group;
  }

  toPacket(): DataPacket<{
    groups: Map<string, WallpaperGroup>;
    patterns: Map<string, PatternElement[]>;
    fundamentalDomains: Map<string, Point[]>;
    seventeenGroups: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['symmetry_group', 'WallpaperGroup'],
      priority: 1,
      phase: 'pattern_analysis',
    };
    return {
      id: `wallpaper-${Date.now().toString(36)}`,
      payload: {
        groups: this._groups,
        patterns: this._patterns,
        fundamentalDomains: this._fundamentalDomains,
        seventeenGroups: this._17Groups,
      },
      metadata,
    };
  }

  reset(): void {
    this._groups = new Map();
    this._patterns = new Map();
    this._fundamentalDomains = new Map();
    this._history = [];
  }
}
