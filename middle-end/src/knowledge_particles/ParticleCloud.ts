import { KnowledgeUnit, Signal } from '../shared/types';
import { KnowledgeParticle } from './KnowledgeParticle';

export interface ParticleInteraction {
  type: 'collision' | 'merger' | 'exchange' | 'repulsion' | 'entanglement';
  particleA: string;
  particleB: string;
  intensity: number;
  timestamp: number;
  result: string;
}

export interface CloudStatistics {
  particleCount: number;
  totalEnergy: number;
  avgEnergy: number;
  totalEntropy: number;
  avgEntropy: number;
  avgCoherence: number;
  temperature: number;
  density: number;
  pressure: number;
}

export interface CollisionEvent {
  id: string;
  particles: string[];
  kineticEnergy: number;
  momentum: number;
  products: string[];
  energyReleased: number;
}

export interface IParticleCloud {
  particleCount: number;
  addParticle(particle: KnowledgeParticle): void;
  removeParticle(particleId: string): void;
  getParticle(particleId: string): KnowledgeParticle | undefined;
  computeStatistics(): CloudStatistics;
  simulateStep(timeDelta: number): void;
  findCollisions(threshold: number): CollisionEvent[];
  applyGravity(center: number[], strength: number): void;
  condenseParticles(particleIds: string[]): KnowledgeParticle | null;
  getInteractions(minIntensity: number): ParticleInteraction[];
  findByState(state: string): string[];
}

export class ParticleCloud implements IParticleCloud {
  private _particles: Map<string, KnowledgeParticle>;
  private _positions: Map<string, number[]>;
  private _velocities: Map<string, number[]>;
  private _interactions: ParticleInteraction[];
  private _collisionLog: CollisionEvent[];
  private _dimension: number;
  private _boundarySize: number;
  private _viscosity: number;
  private _maxParticles: number;
  private _maxInteractionLog: number;
  private _time: number;

  constructor(dimension: number = 3, boundarySize: number = 100) {
    this._particles = new Map();
    this._positions = new Map();
    this._velocities = new Map();
    this._interactions = [];
    this._collisionLog = [];
    this._dimension = dimension;
    this._boundarySize = boundarySize;
    this._viscosity = 0.01;
    this._maxParticles = 1000;
    this._maxInteractionLog = 500;
    this._time = 0;
  }

  get particleCount(): number { return this._particles.size; }
  get dimension(): number { return this._dimension; }
  get boundarySize(): number { return this._boundarySize; }
  get time(): number { return this._time; }
  get interactionCount(): number { return this._interactions.length; }
  get collisionCount(): number { return this._collisionLog.length; }

  public addParticle(particle: KnowledgeParticle): void {
    if (this._particles.size >= this._maxParticles) {
      this._removeLowestEnergy();
    }
    this._particles.set(particle.id, particle);
    const pos = new Array(this._dimension).fill(0).map(() => (Math.random() - 0.5) * this._boundarySize);
    const vel = new Array(this._dimension).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    this._positions.set(particle.id, pos);
    this._velocities.set(particle.id, vel);
  }

  private _removeLowestEnergy(): void {
    let minEnergy = Infinity;
    let minId = '';
    for (const [id, p] of this._particles) {
      if (p.energy < minEnergy) {
        minEnergy = p.energy;
        minId = id;
      }
    }
    if (minId) {
      this.removeParticle(minId);
    }
  }

  public removeParticle(particleId: string): void {
    this._particles.delete(particleId);
    this._positions.delete(particleId);
    this._velocities.delete(particleId);
    for (const [, p] of this._particles) {
      p.disentangle(particleId);
    }
  }

  public getParticle(particleId: string): KnowledgeParticle | undefined {
    return this._particles.get(particleId);
  }

  public getPosition(particleId: string): number[] | undefined {
    const pos = this._positions.get(particleId);
    return pos ? [...pos] : undefined;
  }

  public getVelocity(particleId: string): number[] | undefined {
    const vel = this._velocities.get(particleId);
    return vel ? [...vel] : undefined;
  }

  public setPosition(particleId: string, position: number[]): void {
    if (this._particles.has(particleId)) {
      this._positions.set(particleId, [...position]);
    }
  }

  public setVelocity(particleId: string, velocity: number[]): void {
    if (this._particles.has(particleId)) {
      this._velocities.set(particleId, [...velocity]);
    }
  }

  public computeStatistics(): CloudStatistics {
    const particles = Array.from(this._particles.values());
    if (particles.length === 0) {
      return {
        particleCount: 0,
        totalEnergy: 0,
        avgEnergy: 0,
        totalEntropy: 0,
        avgEntropy: 0,
        avgCoherence: 0,
        temperature: 0,
        density: 0,
        pressure: 0
      };
    }
    let totalEnergy = 0;
    let totalEntropy = 0;
    let totalCoherence = 0;
    let totalKE = 0;
    for (const p of particles) {
      totalEnergy += p.energy;
      totalEntropy += p.computeEntropy();
      totalCoherence += p.coherence;
      const vel = this._velocities.get(p.id) || new Array(this._dimension).fill(0);
      let speed = 0;
      for (let i = 0; i < this._dimension; i++) {
        speed += vel[i] * vel[i];
      }
      totalKE += speed * p.mass * 0.5;
    }
    const volume = Math.pow(this._boundarySize, this._dimension);
    const density = particles.length / volume;
    const temperature = totalKE / particles.length;
    const pressure = density * temperature;
    return {
      particleCount: particles.length,
      totalEnergy,
      avgEnergy: totalEnergy / particles.length,
      totalEntropy,
      avgEntropy: totalEntropy / particles.length,
      avgCoherence: totalCoherence / particles.length,
      temperature,
      density,
      pressure
    };
  }

  public simulateStep(timeDelta: number = 1): void {
    this._time += timeDelta;
    const ids = Array.from(this._particles.keys());
    for (const id of ids) {
      const pos = this._positions.get(id);
      const vel = this._velocities.get(id);
      const particle = this._particles.get(id);
      if (!pos || !vel || !particle) continue;
      for (let i = 0; i < this._dimension; i++) {
        pos[i] += vel[i] * timeDelta;
        if (Math.abs(pos[i]) > this._boundarySize / 2) {
          vel[i] *= -0.9;
          pos[i] = Math.sign(pos[i]) * this._boundarySize / 2;
        }
        vel[i] *= (1 - this._viscosity * timeDelta);
      }
      particle.decay(0.001 * timeDelta);
    }
    this._computeInteractions();
    const collisions = this.findCollisions(1.5);
    this._collisionLog.push(...collisions);
    if (this._collisionLog.length > this._maxInteractionLog) {
      this._collisionLog.splice(0, this._collisionLog.length - this._maxInteractionLog);
    }
  }

  private _computeInteractions(): void {
    const ids = Array.from(this._particles.keys());
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pi = this._particles.get(ids[i])!;
        const pj = this._particles.get(ids[j])!;
        const posI = this._positions.get(ids[i])!;
        const posJ = this._positions.get(ids[j])!;
        const dist = this._euclideanDistance(posI, posJ);
        if (dist < 5) {
          const intensity = 1 / (1 + dist);
          const interference = pi.interferesWith(pj);
          const interactionType = this._classifyInteraction(pi, pj, dist, interference);
          this._recordInteraction(interactionType, ids[i], ids[j], intensity);
          if (interactionType === 'entanglement') {
            pi.entangle(ids[j]);
            pj.entangle(ids[i]);
          }
        }
      }
    }
  }

  private _classifyInteraction(
    pi: KnowledgeParticle,
    pj: KnowledgeParticle,
    distance: number,
    interference: number
  ): ParticleInteraction['type'] {
    if (distance < 1.5 && pi.coherence > 0.7 && pj.coherence > 0.7) {
      return 'merger';
    }
    if (interference > 0.3) {
      return 'entanglement';
    }
    if (interference < -0.3) {
      return 'repulsion';
    }
    if (distance < 3) {
      return 'exchange';
    }
    return 'collision';
  }

  private _recordInteraction(
    type: ParticleInteraction['type'],
    a: string,
    b: string,
    intensity: number
  ): void {
    const interaction: ParticleInteraction = {
      type,
      particleA: a,
      particleB: b,
      intensity,
      timestamp: Date.now(),
      result: `${type} interaction between ${a} and ${b}`
    };
    this._interactions.push(interaction);
    if (this._interactions.length > this._maxInteractionLog) {
      this._interactions.shift();
    }
  }

  private _euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length && i < b.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  public findCollisions(threshold: number = 1.5): CollisionEvent[] {
    const collisions: CollisionEvent[] = [];
    const ids = Array.from(this._particles.keys());
    const processed = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const posI = this._positions.get(ids[i])!;
        const posJ = this._positions.get(ids[j])!;
        const dist = this._euclideanDistance(posI, posJ);
        if (dist < threshold) {
          const pairKey = [ids[i], ids[j]].sort().join(':');
          if (processed.has(pairKey)) continue;
          processed.add(pairKey);
          const pi = this._particles.get(ids[i])!;
          const pj = this._particles.get(ids[j])!;
          const velI = this._velocities.get(ids[i])!;
          const velJ = this._velocities.get(ids[j])!;
          let relSpeed = 0;
          for (let d = 0; d < this._dimension; d++) {
            relSpeed += (velI[d] - velJ[d]) ** 2;
          }
          relSpeed = Math.sqrt(relSpeed);
          const ke = 0.5 * (pi.mass + pj.mass) * relSpeed * relSpeed;
          const momentum = (pi.mass + pj.mass) * relSpeed;
          const products: string[] = [];
          if (pi.coherence > 0.6 && pj.coherence > 0.6 && ke < 0.5) {
            products.push(`fused-${ids[i]}-${ids[j]}`);
          }
          const energyReleased = ke * 0.1;
          collisions.push({
            id: `collision-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            particles: [ids[i], ids[j]],
            kineticEnergy: ke,
            momentum,
            products,
            energyReleased
          });
        }
      }
    }
    return collisions;
  }

  public applyGravity(center: number[], strength: number = 0.1): void {
    for (const [id, particle] of this._particles) {
      const pos = this._positions.get(id)!;
      const vel = this._velocities.get(id)!;
      const dist = this._euclideanDistance(pos, center);
      if (dist < 0.1) continue;
      const force = strength * particle.mass / (dist * dist);
      for (let d = 0; d < this._dimension; d++) {
        const direction = (center[d] - pos[d]) / dist;
        vel[d] += direction * force;
      }
    }
  }

  public condenseParticles(particleIds: string[]): KnowledgeParticle | null {
    if (particleIds.length < 2) return null;
    const particles: KnowledgeParticle[] = [];
    for (const id of particleIds) {
      const p = this._particles.get(id);
      if (p) particles.push(p);
    }
    if (particles.length < 2) return null;
    let totalEnergy = 0;
    let totalMass = 0;
    const combinedProps = new Map<string, { value: number; uncertainty: number }>();
    const allStates = new Map<string, number>();
    const allEntangled = new Set<string>();
    let totalCoherence = 0;
    const centerPos = new Array(this._dimension).fill(0);
    for (const p of particles) {
      totalEnergy += p.energy;
      totalMass += p.mass;
      totalCoherence += p.coherence;
      const props = Array.from(p.superpositionStates.entries());
      for (const [state, prob] of props) {
        allStates.set(state, (allStates.get(state) || 0) + prob / particles.length);
      }
      for (const e of p.entangledWith) {
        if (!particleIds.includes(e)) {
          allEntangled.add(e);
        }
      }
      const pos = this._positions.get(p.id);
      if (pos) {
        for (let d = 0; d < this._dimension; d++) {
          centerPos[d] += pos[d] / particles.length;
        }
      }
    }
    const newId = `condensed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const condensedContent = particles.map(p => p.content).join('+');
    const condensed = new KnowledgeParticle(newId, condensedContent);
    condensed.excite(totalEnergy * 0.8);
    for (const [state, prob] of allStates) {
      condensed.addSuperpositionState(state, prob);
    }
    for (const e of allEntangled) {
      condensed.entangle(e);
    }
    const avgCoherence = totalCoherence / particles.length;
    for (let i = 0; i < 10; i++) {
      condensed.setProperty(`combined_${i}`, Math.random(), 1 - avgCoherence);
    }
    this.addParticle(condensed);
    this.setPosition(newId, centerPos);
    for (const id of particleIds) {
      this.removeParticle(id);
    }
    return condensed;
  }

  public getInteractions(minIntensity: number = 0.1): ParticleInteraction[] {
    return this._interactions
      .filter(i => i.intensity >= minIntensity)
      .map(i => ({ ...i }));
  }

  public findByState(state: string): string[] {
    const result: string[] = [];
    for (const [id, p] of this._particles) {
      if (p.state === state) {
        result.push(id);
      }
    }
    return result;
  }

  public findHighestEnergy(k: number = 5): KnowledgeParticle[] {
    const particles = Array.from(this._particles.values());
    particles.sort((a, b) => b.energy - a.energy);
    return particles.slice(0, k);
  }

  public toKnowledgeUnit(particleId: string): KnowledgeUnit | null {
    const p = this._particles.get(particleId);
    if (!p) return null;
    const ku = p.toKnowledgeUnit();
    const pos = this._positions.get(particleId) || [];
    const vel = this._velocities.get(particleId) || [];
    return {
      ...ku,
      vector: [...ku.vector, ...pos, ...vel],
      lineage: [...ku.lineage, 'particle-cloud']
    };
  }

  public toSignal(): Signal {
    const stats = this.computeStatistics();
    return {
      source: 'particle-cloud',
      magnitude: stats.totalEnergy,
      entropy: stats.totalEntropy,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._particles.clear();
    this._positions.clear();
    this._velocities.clear();
    this._interactions = [];
    this._collisionLog = [];
    this._time = 0;
  }
}
