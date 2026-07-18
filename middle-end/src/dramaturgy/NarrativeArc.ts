import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface StoryBeat {
  id: string;
  timestamp: number;
  act: number;
  position: number;
  type: string;
  description: string;
  tensionDelta: number;
  metadata: Record<string, unknown>;
}

export interface CharacterArc {
  id: string;
  characterId: string;
  name: string;
  startingState: string;
  endingState: string;
  milestones: string[];
  growth: number;
}

export interface ThreeActStructure {
  act1: { setup: string; incitingIncident: string; lockIn: string };
  act2: { risingAction: string; midpoint: string; secondPinch: string };
  act3: { climax: string; fallingAction: string; resolution: string };
  completeness: number;
}

export interface TensionPoint {
  beatId: string;
  position: number;
  tension: number;
}

export interface Theme {
  id: string;
  name: string;
  motif: string;
  occurrences: number;
  resonance: number;
}

export class NarrativeArc {
  private _beats: Map<string, StoryBeat> = new Map();
  private _characters: Map<string, CharacterArc> = new Map();
  private _threeAct: ThreeActStructure = {
    act1: { setup: '', incitingIncident: '', lockIn: '' },
    act2: { risingAction: '', midpoint: '', secondPinch: '' },
    act3: { climax: '', fallingAction: '', resolution: '' },
    completeness: 0,
  };
  private _tensionCurve: TensionPoint[] = [];
  private _history: string[] = [];
  private _themes: Map<string, Theme> = new Map();
  private _counter = 0;
  private _currentTension = 0.3;
  private _premise = '';

  setupStory(premise: string): void {
    this._premise = premise;
    this._beats.clear();
    this._tensionCurve = [];
    this._currentTension = 0.3;
    this._threeAct = {
      act1: { setup: premise, incitingIncident: '', lockIn: '' },
      act2: { risingAction: '', midpoint: '', secondPinch: '' },
      act3: { climax: '', fallingAction: '', resolution: '' },
      completeness: 0.1,
    };
    this._recordHistory(`setupStory:${premise.substring(0, 30)}`);
  }

  addBeat(beat: Omit<StoryBeat, 'id' | 'timestamp'>): StoryBeat {
    const id = `beat-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const newBeat: StoryBeat = {
      id,
      timestamp: Date.now(),
      ...beat,
    };
    this._beats.set(id, newBeat);
    this._currentTension = Math.max(0, Math.min(1, this._currentTension + beat.tensionDelta));
    this._tensionCurve.push({ beatId: id, position: beat.position, tension: this._currentTension });
    this._updateThreeActCompleteness();
    this._recordHistory(`addBeat:${beat.type}`);
    return newBeat;
  }

  incitingIncident(description: string): StoryBeat {
    this._threeAct.act1.incitingIncident = description;
    return this.addBeat({
      act: 1,
      position: 0.25,
      type: 'incitingIncident',
      description,
      tensionDelta: 0.15,
      metadata: { act: 1 },
    });
  }

  risingAction(tensionIncrement: number): StoryBeat {
    this._threeAct.act2.risingAction = `Rising action with tension +${tensionIncrement}`;
    return this.addBeat({
      act: 2,
      position: 0.4,
      type: 'risingAction',
      description: 'Complications and rising stakes',
      tensionDelta: tensionIncrement,
      metadata: { act: 2 },
    });
  }

  midpointReversal(reversal: string): StoryBeat {
    this._threeAct.act2.midpoint = reversal;
    return this.addBeat({
      act: 2,
      position: 0.5,
      type: 'midpoint',
      description: reversal,
      tensionDelta: 0.2,
      metadata: { act: 2, reversal: true },
    });
  }

  climax(climaxEvent: string): StoryBeat {
    this._threeAct.act3.climax = climaxEvent;
    return this.addBeat({
      act: 3,
      position: 0.85,
      type: 'climax',
      description: climaxEvent,
      tensionDelta: 0.25,
      metadata: { act: 3, peak: true },
    });
  }

  fallingAction(resolutionEvents: string): StoryBeat {
    this._threeAct.act3.fallingAction = resolutionEvents;
    return this.addBeat({
      act: 3,
      position: 0.9,
      type: 'fallingAction',
      description: resolutionEvents,
      tensionDelta: -0.15,
      metadata: { act: 3 },
    });
  }

  resolution(denouement: string): StoryBeat {
    this._threeAct.act3.resolution = denouement;
    this._threeAct.completeness = 1;
    return this.addBeat({
      act: 3,
      position: 1,
      type: 'resolution',
      description: denouement,
      tensionDelta: -0.2,
      metadata: { act: 3, final: true },
    });
  }

  getTensionCurve(): TensionPoint[] {
    return [...this._tensionCurve].sort((a, b) => a.position - b.position);
  }

  chekhovsGunDetect(): string[] {
    const setupElements = Array.from(this._beats.values())
      .filter(b => b.position < 0.3)
      .map(b => b.description.toLowerCase());
    const payoffElements = Array.from(this._beats.values())
      .filter(b => b.position > 0.7)
      .map(b => b.description.toLowerCase());

    const guns: string[] = [];
    for (const setup of setupElements) {
      const keywords = setup.split(/\s+/).filter(w => w.length > 4);
      for (const kw of keywords) {
        if (payoffElements.some(p => p.includes(kw))) {
          guns.push(kw);
          break;
        }
      }
    }
    return guns;
  }

  deusExMachinaCheck(): boolean {
    if (this._beats.size < 5) return false;
    const sortedBeats = Array.from(this._beats.values()).sort((a, b) => a.position - b.position);
    const climaxBeat = sortedBeats.find(b => b.type === 'climax');
    if (!climaxBeat) return false;

    const setupBeats = sortedBeats.filter(b => b.position < 0.5);
    const setupKeywords = new Set(
      setupBeats.flatMap(b => b.description.toLowerCase().split(/\s+/).filter(w => w.length > 4))
    );
    const climaxKeywords = climaxBeat.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const overlap = climaxKeywords.filter(k => setupKeywords.has(k)).length;
    return overlap === 0 && setupBeats.length > 3;
  }

  addTheme(name: string, motif: string): Theme {
    const id = `theme-${(++this._counter).toString(36)}`;
    const theme: Theme = {
      id,
      name,
      motif,
      occurrences: 0,
      resonance: 0.5,
    };
    this._themes.set(id, theme);
    this._recordHistory(`addTheme:${name}`);
    return theme;
  }

  trackThemeOccurrence(themeId: string): Theme | null {
    const theme = this._themes.get(themeId);
    if (!theme) return null;
    theme.occurrences++;
    theme.resonance = Math.min(1, theme.resonance + 0.05);
    return theme;
  }

  plotHoleDetect(): string[] {
    const holes: string[] = [];
    const sortedBeats = Array.from(this._beats.values()).sort((a, b) => a.position - b.position);

    if (sortedBeats.length < 3) {
      holes.push('Insufficient plot beats');
      return holes;
    }

    const hasSetup = sortedBeats.some(b => b.position < 0.25);
    if (!hasSetup) holes.push('Missing setup phase');

    const hasIncitingIncident = sortedBeats.some(b => b.type === 'incitingIncident');
    if (!hasIncitingIncident) holes.push('Missing inciting incident');

    const hasMidpoint = sortedBeats.some(b => b.type === 'midpoint');
    if (!hasMidpoint) holes.push('Missing midpoint reversal');

    const hasClimax = sortedBeats.some(b => b.type === 'climax');
    if (!hasClimax) holes.push('Missing climax');

    const hasResolution = sortedBeats.some(b => b.type === 'resolution');
    if (!hasResolution) holes.push('Missing resolution');

    const setupToMid = sortedBeats.filter(b => b.position >= 0.2 && b.position <= 0.6).length;
    if (setupToMid === 0) holes.push('No rising action between setup and midpoint');

    const midToClimax = sortedBeats.filter(b => b.position >= 0.5 && b.position <= 0.85).length;
    if (midToClimax === 0) holes.push('No action between midpoint and climax');

    return holes;
  }

  pacingAnalysis(): {
    overallPace: number;
    actPaces: { act1: number; act2: number; act3: number };
    recommendations: string[];
  } {
    const sortedBeats = Array.from(this._beats.values()).sort((a, b) => a.position - b.position);
    const recommendations: string[] = [];

    if (sortedBeats.length < 2) {
      return { overallPace: 0.5, actPaces: { act1: 0.5, act2: 0.5, act3: 0.5 }, recommendations: ['Add more beats for pacing analysis'] };
    }

    const overallPace = sortedBeats.length / 10;

    const act1Beats = sortedBeats.filter(b => b.position <= 0.33);
    const act2Beats = sortedBeats.filter(b => b.position > 0.33 && b.position <= 0.67);
    const act3Beats = sortedBeats.filter(b => b.position > 0.67);

    const actPaces = {
      act1: act1Beats.length / Math.max(1, sortedBeats.length * 0.33),
      act2: act2Beats.length / Math.max(1, sortedBeats.length * 0.34),
      act3: act3Beats.length / Math.max(1, sortedBeats.length * 0.33),
    };

    if (actPaces.act1 > 1.5) recommendations.push('Act 1 may be too dense');
    if (actPaces.act1 < 0.5) recommendations.push('Act 1 needs more development');
    if (actPaces.act2 > 1.5) recommendations.push('Act 2 may have pacing issues');
    if (actPaces.act2 < 0.5) recommendations.push('Act 2 needs more content');
    if (actPaces.act3 > 1.5) recommendations.push('Act 3 may feel rushed');
    if (actPaces.act3 < 0.5) recommendations.push('Act 3 could use more resolution');

    return {
      overallPace: Math.min(1, overallPace),
      actPaces,
      recommendations,
    };
  }

  characterArcProgress(charId: string): CharacterArc | null {
    const char = this._characters.get(charId);
    if (!char) return null;

    const beatCount = this._beats.size;
    const progress = beatCount > 0 ? Math.min(1, beatCount / 10) : 0;
    char.growth = progress;

    return char;
  }

  addCharacterArc(charId: string, name: string, startingState: string, endingState: string): CharacterArc {
    const id = `chararc-${(++this._counter).toString(36)}`;
    const arc: CharacterArc = {
      id,
      characterId: charId,
      name,
      startingState,
      endingState,
      milestones: [],
      growth: 0,
    };
    this._characters.set(charId, arc);
    this._recordHistory(`addCharacterArc:${name}`);
    return arc;
  }

  addMilestone(charId: string, milestone: string): CharacterArc | null {
    const char = this._characters.get(charId);
    if (!char) return null;
    char.milestones.push(milestone);
    char.growth = Math.min(1, char.growth + 0.1);
    return char;
  }

  toPacket(): DataPacket {
    return {
      id: `narrative-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        beats: Array.from(this._beats.values()),
        characters: Array.from(this._characters.values()),
        threeAct: { ...this._threeAct },
        tensionCurve: [...this._tensionCurve],
        themes: Array.from(this._themes.values()),
        premise: this._premise,
        currentTension: this._currentTension,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['dramaturgy', 'NarrativeArc'],
        priority: Math.max(1, Math.floor(this._threeAct.completeness * 10)),
        phase: 'narrating',
      },
    };
  }

  reset(): void {
    this._beats.clear();
    this._characters.clear();
    this._threeAct = {
      act1: { setup: '', incitingIncident: '', lockIn: '' },
      act2: { risingAction: '', midpoint: '', secondPinch: '' },
      act3: { climax: '', fallingAction: '', resolution: '' },
      completeness: 0,
    };
    this._tensionCurve = [];
    this._history = [];
    this._themes.clear();
    this._counter = 0;
    this._currentTension = 0.3;
    this._premise = '';
  }

  get beatCount(): number {
    return this._beats.size;
  }

  get currentTension(): number {
    return this._currentTension;
  }

  get threeActStructure(): ThreeActStructure {
    return { ...this._threeAct };
  }

  get history(): string[] {
    return [...this._history];
  }

  private _updateThreeActCompleteness(): void {
    const act1 = [this._threeAct.act1.setup, this._threeAct.act1.incitingIncident].filter(Boolean).length / 3;
    const act2 = [this._threeAct.act2.risingAction, this._threeAct.act2.midpoint].filter(Boolean).length / 3;
    const act3 = [this._threeAct.act3.climax, this._threeAct.act3.fallingAction, this._threeAct.act3.resolution].filter(Boolean).length / 3;
    this._threeAct.completeness = (act1 + act2 + act3) / 3;
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
