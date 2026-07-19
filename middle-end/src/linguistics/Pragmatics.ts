import { DataPacket, PacketMeta } from '../shared/types';

/** Speech act type (Searle's classification). */
export type SpeechActType =
  | 'assertive' | 'directive' | 'commissive' | 'expressive' | 'declaration';

/** Illocutionary force. */
export type IllocutionaryForce =
  | 'stating' | 'questioning' | 'commanding' | 'requesting' | 'promising'
  | 'threatening' | 'warning' | 'advising' | 'thanking' | 'apologizing' | 'declaring';

/** A speech act. */
export interface SpeechAct {
  sentence: string;
  type: SpeechActType;
  force: IllocutionaryForce;
  content: string;
  sincerity: boolean;
  propositionalContent: string;
}

/** A conversational implicature. */
export interface Implicature {
  utterance: string;
  implicated: string;
  maxim: 'quality' | 'quantity' | 'relation' | 'manner';
  cancellable: boolean;
}

/** Deixis reference. */
export interface Deixis {
  type: 'person' | 'spatial' | 'temporal' | 'discourse' | 'social';
  expression: string;
  reference: string;
  context: string;
}

/** History record. */
interface PragRecord {
  operation: string;
  utterance: string;
  timestamp: number;
}

/** Face (politeness theory). */
export type Face = 'positive' | 'negative';

export class Pragmatics {
  private _acts: SpeechAct[] = [];
  private _implicatures: Implicature[] = [];
  private _deixis: Deixis[] = [];
  private _history: PragRecord[] = [];

  speechAct(sentence: string, context: string): SpeechAct {
    const force = this.illocutionaryForce(sentence);
    const type = this._forceToType(force);
    const act: SpeechAct = {
      sentence,
      type,
      force,
      content: sentence,
      sincerity: true,
      propositionalContent: sentence.replace(/^(please|kindly|do|don't)\s+/i, ''),
    };
    this._acts.push(act);
    this._history.push({ operation: 'speechAct', utterance: sentence, timestamp: Date.now() });
    void context;
    return act;
  }

  illocutionaryForce(sentence: string): IllocutionaryForce {
    const s = sentence.toLowerCase().trim();
    if (s.endsWith('?')) return 'questioning';
    if (/^(please|kindly|do)\s/.test(s)) return 'requesting';
    if (/^(stop|don't|do not|never)\s/.test(s)) return 'commanding';
    if (/^(must|have to|need to)\s/.test(s)) return 'commanding';
    if (/^(i promise|i will|i shall|i swear)/.test(s)) return 'promising';
    if (/^(i threaten|or else)\b/.test(s)) return 'threatening';
    if (/^(be careful|watch out|beware)/.test(s)) return 'warning';
    if (/^(you should|i advise|i recommend)/.test(s)) return 'advising';
    if (/^(thank|thanks)/.test(s)) return 'thanking';
    if (/^(i apologize|sorry|forgive me)/.test(s)) return 'apologizing';
    if (/^(i hereby|i declare|i pronounce)/.test(s)) return 'declaring';
    return 'stating';
  }

  griceMaxims(conversation: string[]): { maxim: 'quality' | 'quantity' | 'relation' | 'manner'; violated: boolean; reason: string }[] {
    const results: { maxim: 'quality' | 'quantity' | 'relation' | 'manner'; violated: boolean; reason: string }[] = [];
    for (const utterance of conversation) {
      const words = utterance.split(/\s+/);
      if (words.length > 100) results.push({ maxim: 'quantity', violated: true, reason: 'too verbose' });
      else if (words.length < 3) results.push({ maxim: 'quantity', violated: true, reason: 'too brief' });
      else results.push({ maxim: 'quantity', violated: false, reason: '' });
      if (/\b(maybe|perhaps|possibly|kind of|sort of)\b/i.test(utterance)) results.push({ maxim: 'quality', violated: true, reason: 'hedge' });
      else results.push({ maxim: 'quality', violated: false, reason: '' });
      if (/\b(um|uh|well|you know|like)\b/i.test(utterance)) results.push({ maxim: 'manner', violated: true, reason: 'obscurity' });
      else results.push({ maxim: 'manner', violated: false, reason: '' });
    }
    return results;
  }

  conversationalImplicature(utterance: string): Implicature {
    const s = utterance.toLowerCase();
    let implicated = '';
    let maxim: Implicature['maxim'] = 'relation';
    if (s.includes('some')) {
      implicated = 'not all';
      maxim = 'quantity';
    } else if (/^(is|are|can|could|would|do|does)\b/.test(s)) {
      implicated = 'speaker wants information';
      maxim = 'relation';
    } else if (s.includes('but')) {
      implicated = 'contrast between clauses is significant';
      maxim = 'manner';
    } else if (/^(it's getting late|i should go)\b/.test(s)) {
      implicated = 'conversation should end';
      maxim = 'relation';
    } else if (s.includes('extremely') || s.includes('very very')) {
      implicated = 'speaker feels strongly';
      maxim = 'quality';
    } else {
      implicated = 'speaker is being cooperative';
    }
    const impl: Implicature = {
      utterance,
      implicated,
      maxim,
      cancellable: true,
    };
    this._implicatures.push(impl);
    return impl;
  }

  presupposition(sentence: string): string[] {
    const pres: string[] = [];
    if (/\bstop\b/i.test(sentence)) pres.push('subject did the action before');
    if (/\bagain\b/i.test(sentence)) pres.push('the action happened before');
    if (/\bregret\b/i.test(sentence)) pres.push('the event occurred');
    if (/\brealize\b/i.test(sentence)) pres.push('the proposition is true');
    if (/\bcancel\b/i.test(sentence)) pres.push('an arrangement existed');
    if (/\bthe\b/i.test(sentence)) pres.push('the referent exists and is identifiable');
    return pres;
  }

  entailmentPragmatic(sentence: string): string[] {
    const entails: string[] = [];
    if (/\bkill\b/i.test(sentence)) entails.push('the patient died');
    if (/\bbuy\b/i.test(sentence)) entails.push('ownership transferred');
    if (/\bsell\b/i.test(sentence)) entails.push('ownership transferred');
    if (/\bborrow\b/i.test(sentence)) entails.push('temporary possession');
    if (/\blend\b/i.test(sentence)) entails.push('temporary transfer');
    return entails;
  }

  deixisResolve(expression: string, context: string): Deixis {
    let type: Deixis['type'] = 'person';
    let reference = '';
    const e = expression.toLowerCase();
    if (/^(i|me|my|mine)\b/.test(e)) { type = 'person'; reference = 'speaker'; }
    else if (/^(you|your|yours)\b/.test(e)) { type = 'person'; reference = 'addressee'; }
    else if (/^(he|she|him|her|his|hers)\b/.test(e)) { type = 'person'; reference = 'third party'; }
    else if (/^(here|there)\b/.test(e)) { type = 'spatial'; reference = e === 'here' ? 'near speaker' : 'away from speaker'; }
    else if (/^(this|that)\b/.test(e)) { type = 'spatial'; reference = e === 'this' ? 'proximal' : 'distal'; }
    else if (/^(now|then|today|yesterday|tomorrow)\b/.test(e)) { type = 'temporal'; reference = 'time relative to utterance'; }
    else if (/^(above|below|behind|in front of)\b/.test(e)) { type = 'spatial'; reference = 'relative position'; }
    const d: Deixis = { type, expression, reference, context };
    this._deixis.push(d);
    return d;
  }

  politeness(sentence: string, face: Face): number {
    let score = 0.5;
    const s = sentence.toLowerCase();
    if (face === 'negative') {
      if (/\bplease\b/.test(s)) score += 0.2;
      if (/\bcould you\b|\bwould you\b/.test(s)) score += 0.15;
      if (/\bmight\b|\bperhaps\b/.test(s)) score += 0.1;
      if (/^(do|stop|don't)\b/.test(s)) score -= 0.3;
    } else {
      if (/\bwe\b|\bus\b|\blet's\b/.test(s)) score += 0.2;
      if (/\bgreat job\b|\bwell done\b|\bexcellent\b/.test(s)) score += 0.2;
      if (/\bstupid\b|\bwrong\b|\bbad\b/.test(s)) score -= 0.2;
    }
    return Math.max(0, Math.min(1, score));
  }

  faceThreatening(act: SpeechAct): boolean {
    if (act.type === 'directive' && act.force === 'commanding') return true;
    if (act.type === 'expressive' && act.force === 'apologizing') return true;
    if (act.type === 'commissive' && act.force === 'threatening') return true;
    return false;
  }

  relevanceTheory(utterance: string, context: string): { cognitiveEffect: number; processingEffort: number; relevance: number } {
    const sharedWords = utterance.toLowerCase().split(/\s+/).filter(w => context.toLowerCase().includes(w)).length;
    const cognitiveEffect = sharedWords * 0.2 + (utterance.length > 0 ? 0.3 : 0);
    const processingEffort = utterance.split(/\s+/).length * 0.05;
    const relevance = cognitiveEffect / (processingEffort + 1e-6);
    return { cognitiveEffect, processingEffort, relevance };
  }

  cooperativePrinciple(participants: string[]): { participant: string; contributions: number; qualityScore: number }[] {
    return participants.map(p => ({
      participant: p,
      contributions: Math.floor(Math.random() * 10) + 1,
      qualityScore: 0.5 + Math.random() * 0.5,
    }));
  }

  speechActClassification(sentence: string): SpeechActType {
    const force = this.illocutionaryForce(sentence);
    return this._forceToType(force);
  }

  felicityConditions(act: SpeechAct): { condition: string; satisfied: boolean }[] {
    const conditions: { condition: string; satisfied: boolean }[] = [];
    if (act.force === 'promising') {
      conditions.push({ condition: 'speaker intends to do action', satisfied: act.sincerity });
      conditions.push({ condition: 'speaker is able to do action', satisfied: true });
      conditions.push({ condition: 'action is in hearer\'s interest', satisfied: true });
    } else if (act.force === 'commanding') {
      conditions.push({ condition: 'speaker has authority', satisfied: true });
      conditions.push({ condition: 'hearer is able to comply', satisfied: true });
    } else if (act.force === 'questioning') {
      conditions.push({ condition: 'speaker does not know answer', satisfied: true });
      conditions.push({ condition: 'hearer might know answer', satisfied: true });
    } else if (act.force === 'declaring') {
      conditions.push({ condition: 'speaker has institutional role', satisfied: true });
      conditions.push({ condition: 'context is appropriate', satisfied: true });
    } else {
      conditions.push({ condition: 'normal input/output conditions', satisfied: true });
    }
    return conditions;
  }

  toPacket(): DataPacket<{ acts: SpeechAct[]; implicatures: Implicature[]; deixis: Deixis[]; history: PragRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['linguistics', 'Pragmatics'],
      priority: 1,
      phase: 'pragmatics',
    };
    return {
      id: `pragmatics-${Date.now().toString(36)}`,
      payload: {
        acts: this._acts,
        implicatures: this._implicatures,
        deixis: this._deixis,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._acts = [];
    this._implicatures = [];
    this._deixis = [];
    this._history = [];
  }

  get actCount(): number { return this._acts.length; }
  get implicatureCount(): number { return this._implicatures.length; }
  get deixisCount(): number { return this._deixis.length; }

  private _forceToType(force: IllocutionaryForce): SpeechActType {
    if (['stating', 'declaring', 'warning', 'advising'].includes(force)) return 'assertive';
    if (['questioning', 'commanding', 'requesting'].includes(force)) return 'directive';
    if (['promising', 'threatening'].includes(force)) return 'commissive';
    if (['thanking', 'apologizing'].includes(force)) return 'expressive';
    return 'declaration';
  }
}
