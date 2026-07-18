import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Scene {
  id: string;
  setting: string;
  purpose: string;
  beats: string[];
  sequel: string | null;
  duration: number;
  pace: number;
  subtext: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface SceneBeat {
  id: string;
  sceneId: string;
  description: string;
  type: 'action' | 'dialogue' | 'description' | 'revelation' | 'transition';
  weight: number;
  subtext: string;
}

export interface UnitOfTime {
  id: string;
  unit: string;
  weight: number;
  description: string;
}

export class SceneArchitect {
  private _scenes: Map<string, Scene> = new Map();
  private _beats: Map<string, SceneBeat> = new Map();
  private _units: Map<string, UnitOfTime> = new Map();
  private _history: string[] = [];
  private _dramaticPace = 0.5;
  private _counter = 0;

  createScene(setting: string, purpose: string): Scene {
    const id = `scene-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const scene: Scene = {
      id,
      setting,
      purpose,
      beats: [],
      sequel: null,
      duration: 0,
      pace: 0.5,
      subtext: '',
      createdAt: Date.now(),
      metadata: {},
    };
    this._scenes.set(id, scene);
    this._updateDramaticPace();
    this._recordHistory(`createScene:${setting.substring(0, 20)}`);
    return scene;
  }

  addBeat(sceneId: string, beat: Omit<SceneBeat, 'id' | 'sceneId'>): SceneBeat | null {
    const scene = this._scenes.get(sceneId);
    if (!scene) return null;

    const id = `beat-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const newBeat: SceneBeat = {
      id,
      sceneId,
      ...beat,
    };

    this._beats.set(id, newBeat);
    scene.beats.push(id);
    scene.duration += beat.weight;

    this._updateScenePace(sceneId);
    this._updateDramaticPace();
    this._recordHistory(`addBeat:${sceneId}:${beat.type}`);
    return newBeat;
  }

  sceneSequel(sceneId: string, reaction: string): Scene | null {
    const scene = this._scenes.get(sceneId);
    if (!scene) return null;
    scene.sequel = reaction;
    this._recordHistory(`sceneSequel:${sceneId}`);
    return scene;
  }

  setUnitOfTime(unit: string, weight: number): UnitOfTime {
    const id = `unit-${(++this._counter).toString(36)}`;
    const u: UnitOfTime = {
      id,
      unit,
      weight,
      description: `Time unit: ${unit}`,
    };
    this._units.set(id, u);
    this._recordHistory(`setUnitOfTime:${unit}`);
    return u;
  }

  calculatePace(sceneId: string): number {
    const scene = this._scenes.get(sceneId);
    if (!scene) return 0;
    return this._updateScenePace(sceneId);
  }

  subtextDetect(sceneId: string): string {
    const scene = this._scenes.get(sceneId);
    if (!scene) return '';

    const sceneBeats = scene.beats
      .map(id => this._beats.get(id))
      .filter((b): b is SceneBeat => !!b);

    const subtextParts = sceneBeats
      .map(b => b.subtext)
      .filter(s => s.length > 0);

    if (subtextParts.length === 0) {
      return 'No subtext detected';
    }

    const combined = subtextParts.join('; ');
    scene.subtext = combined;
    return combined;
  }

  getSceneCount(): number {
    return this._scenes.size;
  }

  sceneTransition(fromSceneId: string, toSceneId: string, transitionType: string): {
    from: Scene | undefined;
    to: Scene | undefined;
    transition: string;
    smoothness: number;
  } {
    const from = this._scenes.get(fromSceneId);
    const to = this._scenes.get(toSceneId);

    let smoothness = 0.5;
    if (from && to) {
      const paceDiff = Math.abs(from.pace - to.pace);
      smoothness = 1 - paceDiff;
    }

    this._recordHistory(`sceneTransition:${fromSceneId}->${toSceneId}:${transitionType}`);
    return { from, to, transition: transitionType, smoothness };
  }

  dramaticUnitAnalysis(): {
    totalScenes: number;
    totalBeats: number;
    avgBeatsPerScene: number;
    avgPace: number;
    paceVariance: number;
  } {
    const scenes = Array.from(this._scenes.values());
    const totalScenes = scenes.length;
    const totalBeats = scenes.reduce((s, sc) => s + sc.beats.length, 0);
    const avgBeatsPerScene = totalScenes > 0 ? totalBeats / totalScenes : 0;
    const avgPace = totalScenes > 0 ? scenes.reduce((s, sc) => s + sc.pace, 0) / totalScenes : 0;

    let paceVariance = 0;
    if (totalScenes > 1) {
      const sumSq = scenes.reduce((s, sc) => s + Math.pow(sc.pace - avgPace, 2), 0);
      paceVariance = sumSq / totalScenes;
    }

    return {
      totalScenes,
      totalBeats,
      avgBeatsPerScene,
      avgPace,
      paceVariance,
    };
  }

  sceneSequencing(): Scene[] {
    return Array.from(this._scenes.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  beatTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const beat of this._beats.values()) {
      distribution[beat.type] = (distribution[beat.type] || 0) + 1;
    }
    return distribution;
  }

  addScenePurpose(sceneId: string, purpose: string): Scene | null {
    const scene = this._scenes.get(sceneId);
    if (!scene) return null;
    scene.purpose = purpose;
    this._recordHistory(`addScenePurpose:${sceneId}`);
    return scene;
  }

  setSceneDuration(sceneId: string, duration: number): Scene | null {
    const scene = this._scenes.get(sceneId);
    if (!scene) return null;
    scene.duration = duration;
    this._updateDramaticPace();
    return scene;
  }

  toPacket(): DataPacket {
    return {
      id: `architect-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        scenes: Array.from(this._scenes.values()),
        beats: Array.from(this._beats.values()),
        units: Array.from(this._units.values()),
        dramaticPace: this._dramaticPace,
        totalScenes: this._scenes.size,
        totalBeats: this._beats.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['dramaturgy', 'SceneArchitect'],
        priority: Math.max(1, Math.floor(this._dramaticPace * 10)),
        phase: 'architecting',
      },
    };
  }

  reset(): void {
    this._scenes.clear();
    this._beats.clear();
    this._units.clear();
    this._history = [];
    this._dramaticPace = 0.5;
    this._counter = 0;
  }

  get sceneCount(): number {
    return this._scenes.size;
  }

  get dramaticPace(): number {
    return this._dramaticPace;
  }

  get history(): string[] {
    return [...this._history];
  }

  getScene(sceneId: string): Scene | undefined {
    return this._scenes.get(sceneId);
  }

  private _updateScenePace(sceneId: string): number {
    const scene = this._scenes.get(sceneId);
    if (!scene) return 0;

    const sceneBeats = scene.beats
      .map(id => this._beats.get(id))
      .filter((b): b is SceneBeat => !!b);

    if (sceneBeats.length === 0) {
      scene.pace = 0.5;
      return 0.5;
    }

    const actionWeight = sceneBeats
      .filter(b => b.type === 'action' || b.type === 'revelation')
      .reduce((s, b) => s + b.weight, 0);
    const totalWeight = sceneBeats.reduce((s, b) => s + b.weight, 0);

    scene.pace = totalWeight > 0 ? actionWeight / totalWeight : 0.5;
    return scene.pace;
  }

  private _updateDramaticPace(): void {
    if (this._scenes.size === 0) {
      this._dramaticPace = 0.5;
      return;
    }

    const paces = Array.from(this._scenes.values()).map(s => s.pace);
    this._dramaticPace = paces.reduce((s, p) => s + p, 0) / paces.length;
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
