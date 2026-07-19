import { DataPacket, PacketMeta } from '../shared/types';
import { Point } from '../affine_geometry/AffineSpace';

export interface MorphTarget {
  id: string;
  vertices: Point[];
  weight: number;
}

export interface MorphBlend {
  targets: string[];
  weights: number[];
  result: Point[];
}

export interface MorphKeyframe {
  time: number;
  targetId: string;
  weight: number;
}

export class MorphingEngine {
  private _targets: Map<string, MorphTarget> = new Map();
  private _blends: Map<string, MorphBlend> = new Map();
  private _keyframes: Map<string, MorphKeyframe[]> = new Map();
  private _history: unknown[] = [];
  private _currentFrame = 0;

  addTarget(id: string, vertices: Point[]): MorphTarget {
    const target: MorphTarget = { id, vertices, weight: 0 };
    this._targets.set(id, target);
    this._history.push({ type: 'addTarget', id, vertices });
    return target;
  }

  blend(targetIds: string[], weights: number[]): Point[] {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    const targets = targetIds.map(id => this._targets.get(id)).filter(Boolean) as MorphTarget[];
    if (targets.length === 0) return [];

    const firstTarget = targets[0];
    const result: Point[] = firstTarget.vertices.map(v => ({ ...v }));

    for (let i = 0; i < result.length; i++) {
      for (let j = 1; j < targets.length; j++) {
        const target = targets[j];
        const weight = normalizedWeights[j];
        result[i].x += (target.vertices[i]?.x || 0 - firstTarget.vertices[i].x) * weight;
        result[i].y += (target.vertices[i]?.y || 0 - firstTarget.vertices[i].y) * weight;
        result[i].z += (target.vertices[i]?.z || 0 - firstTarget.vertices[i].z) * weight;
      }
    }

    const blend: MorphBlend = { targets: targetIds, weights: normalizedWeights, result };
    this._blends.set(`blend-${Date.now()}`, blend);
    this._history.push({ type: 'blend', targetIds, weights, result });
    return result;
  }

  morphTo(targetId: string, duration: number): Point[] {
    const target = this._targets.get(targetId);
    if (!target) return [];

    const baseTarget = this._targets.values().next().value;
    if (!baseTarget) return [];

    const startVertices = baseTarget.vertices.map(v => ({ ...v }));
    const endVertices = target.vertices;
    const result: Point[] = [];

    for (let i = 0; i < startVertices.length; i++) {
      result.push({
        x: startVertices[i].x + (endVertices[i]?.x || 0 - startVertices[i].x) * (1 - Math.exp(-duration * 0.1)),
        y: startVertices[i].y + (endVertices[i]?.y || 0 - startVertices[i].y) * (1 - Math.exp(-duration * 0.1)),
        z: startVertices[i].z + (endVertices[i]?.z || 0 - startVertices[i].z) * (1 - Math.exp(-duration * 0.1)),
      });
    }

    this._history.push({ type: 'morphTo', targetId, duration, result });
    return result;
  }

  keyframeAnimation(keyframes: MorphKeyframe[]): Point[] {
    keyframes.sort((a, b) => a.time - b.time);

    const timelineId = `timeline-${Date.now()}`;
    this._keyframes.set(timelineId, keyframes);

    const activeKeyframes = keyframes.filter(kf => kf.time <= this._currentFrame);
    if (activeKeyframes.length === 0) return [];

    const targetIds = activeKeyframes.map(kf => kf.targetId);
    const weights = activeKeyframes.map(kf => kf.weight);
    const result = this.blend(targetIds, weights);

    this._history.push({ type: 'keyframeAnimation', timelineId, currentFrame: this._currentFrame, result });
    return result;
  }

  inverseMorph(targetId: string, source: Point[]): Point[] {
    const target = this._targets.get(targetId);
    if (!target) return [];

    const baseTarget = this._targets.values().next().value;
    if (!baseTarget) return [];

    const result: Point[] = [];
    for (let i = 0; i < source.length; i++) {
      const t = (source[i].x - baseTarget.vertices[i].x) / (target.vertices[i]?.x || 1 - baseTarget.vertices[i].x || 1);
      result.push({
        x: baseTarget.vertices[i].x - t * (target.vertices[i]?.x || 0 - baseTarget.vertices[i].x),
        y: baseTarget.vertices[i].y - t * (target.vertices[i]?.y || 0 - baseTarget.vertices[i].y),
        z: baseTarget.vertices[i].z - t * (target.vertices[i]?.z || 0 - baseTarget.vertices[i].z),
      });
    }

    this._history.push({ type: 'inverseMorph', targetId, source, result });
    return result;
  }

  morphGradient(startId: string, endId: string): Point[][] {
    const start = this._targets.get(startId);
    const end = this._targets.get(endId);
    if (!start || !end) return [];

    const steps = 10;
    const gradients: Point[][] = [];

    for (let t = 0; t <= steps; t++) {
      const weight = t / steps;
      const gradient: Point[] = [];
      for (let i = 0; i < start.vertices.length; i++) {
        gradient.push({
          x: start.vertices[i].x + (end.vertices[i]?.x || 0 - start.vertices[i].x) * weight,
          y: start.vertices[i].y + (end.vertices[i]?.y || 0 - start.vertices[i].y) * weight,
          z: start.vertices[i].z + (end.vertices[i]?.z || 0 - start.vertices[i].z) * weight,
        });
      }
      gradients.push(gradient);
    }

    this._history.push({ type: 'morphGradient', startId, endId, steps, result: gradients });
    return gradients;
  }

  morphQuality(blend: MorphBlend): { smoothness: number; deviation: number } {
    const targetCount = blend.targets.length;
    const vertexCount = blend.result.length;

    let smoothness = 0;
    let deviation = 0;

    for (let i = 0; i < vertexCount - 1; i++) {
      const dx = blend.result[i + 1].x - blend.result[i].x;
      const dy = blend.result[i + 1].y - blend.result[i].y;
      const dz = blend.result[i + 1].z - blend.result[i].z;
      smoothness += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    for (const targetId of blend.targets) {
      const target = this._targets.get(targetId);
      if (!target) continue;

      for (let i = 0; i < vertexCount; i++) {
        const dx = blend.result[i].x - target.vertices[i]?.x || 0;
        const dy = blend.result[i].y - target.vertices[i]?.y || 0;
        const dz = blend.result[i].z - target.vertices[i]?.z || 0;
        deviation += dx * dx + dy * dy + dz * dz;
      }
    }

    smoothness /= vertexCount;
    deviation /= targetCount * vertexCount;

    this._history.push({ type: 'morphQuality', blend, result: { smoothness, deviation } });
    return { smoothness, deviation };
  }

  getMorphTarget(id: string): MorphTarget | undefined {
    return this._targets.get(id);
  }

  toPacket(): DataPacket<{
    targets: Map<string, MorphTarget>;
    blends: Map<string, MorphBlend>;
    keyframes: Map<string, MorphKeyframe[]>;
    currentFrame: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['transformation_engine', 'MorphingEngine'],
      priority: 1,
      phase: 'morphing',
    };
    return {
      id: `morph-${Date.now().toString(36)}`,
      payload: {
        targets: this._targets,
        blends: this._blends,
        keyframes: this._keyframes,
        currentFrame: this._currentFrame,
      },
      metadata,
    };
  }

  reset(): void {
    this._targets = new Map();
    this._blends = new Map();
    this._keyframes = new Map();
    this._history = [];
    this._currentFrame = 0;
  }
}
