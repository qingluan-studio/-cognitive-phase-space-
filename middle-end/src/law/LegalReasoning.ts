import { DataPacket, PacketMeta } from '../shared/types';

/** A legal argument structure. */
export interface LegalArgument {
  readonly premises: string[];
  readonly conclusion: string;
  readonly rule: string;
  readonly exception?: string;
  readonly strength: 'weak' | 'moderate' | 'strong';
}

/** A syllogism with major/minor premises and conclusion. */
export interface Syllogism {
  readonly major: string;
  readonly minor: string;
  readonly conclusion: string;
  readonly valid: boolean;
}

/** Evidence descriptor. */
export interface Evidence {
  readonly id: string;
  readonly type: 'testimonial' | 'documentary' | 'physical' | 'demonstrative' | 'real';
  readonly description: string;
  readonly relevant: boolean;
  readonly hearsay?: boolean;
  readonly authenticated?: boolean;
}

/** Burden of proof descriptor. */
export interface BurdenOfProof {
  readonly party: 'plaintiff' | 'prosecution' | 'defendant';
  readonly standard: 'preponderance' | 'clear-and-convincing' | 'beyond-reasonable-doubt';
  readonly met: boolean;
}

/** Admissibility ruling. */
export interface AdmissibilityRuling {
  readonly evidenceId: string;
  readonly admissible: boolean;
  readonly grounds: string[];
  readonly rule: string;
}

/** Presumption descriptor. */
export interface Presumption {
  readonly type: 'rebuttable' | 'conclusive';
  readonly statement: string;
  readonly rebuttable: boolean;
}

/** Chain of custody record. */
export interface ChainOfCustody {
  readonly evidenceId: string;
  readonly handlers: string[];
  readonly timestamps: number[];
  readonly intact: boolean;
}

/**
 * LegalReasoning performs deductive, inductive, and analogical reasoning,
 * manages evidence, and applies rules of evidence (hearsay, privilege, etc.).
 */
export class LegalReasoning {
  private _arguments: LegalArgument[] = [];
  private _syllogisms: Syllogism[] = [];
  private _evidence: Map<string, Evidence> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  get argumentCount(): number { return this._arguments.length; }
  get syllogismCount(): number { return this._syllogisms.length; }
  get evidenceCount(): number { return this._evidence.size; }

  /** Construct a deductive argument. */
  deductiveReasoning(rule: string, facts: string[], conclusion: string): LegalArgument {
    const strength: LegalArgument['strength'] = facts.length > 3 ? 'strong' : facts.length > 1 ? 'moderate' : 'weak';
    const arg: LegalArgument = {
      premises: [rule, ...facts],
      conclusion,
      rule,
      strength,
    };
    this._arguments.push(arg);
    this._history.push({ op: 'deductiveReasoning', conclusion });
    return arg;
  }

  /** Construct an inductive argument from a pattern of cases. */
  inductiveReasoning(cases: string[], pattern: string): LegalArgument {
    const conclusion = `pattern "${pattern}" likely applies (n=${cases.length})`;
    const strength: LegalArgument['strength'] = cases.length > 10 ? 'strong' : cases.length > 3 ? 'moderate' : 'weak';
    const arg: LegalArgument = {
      premises: cases,
      conclusion,
      rule: pattern,
      strength,
    };
    this._arguments.push(arg);
    return arg;
  }

  /** Construct an analogical argument from source to target. */
  analogicalReasoning(source: string, target: string): LegalArgument {
    const strength: LegalArgument['strength'] = source.length > 50 && target.length > 50 ? 'moderate' : 'weak';
    const arg: LegalArgument = {
      premises: [`source: ${source}`, `target: ${target}`],
      conclusion: `${target} should be treated like ${source}`,
      rule: 'analogy',
      strength,
    };
    this._arguments.push(arg);
    this._history.push({ op: 'analogicalReasoning', source, target });
    return arg;
  }

  /** Construct a generic syllogism. */
  syllogism(major: string, minor: string): Syllogism {
    const conclusion = `${minor}; therefore, by "${major.substring(0, 30)}..."`;
    const s: Syllogism = { major, minor, conclusion, valid: true };
    this._syllogisms.push(s);
    return s;
  }

  /** Construct a legal syllogism (IRAC-style). */
  legalSyllogism(rule: string, fact: string, conclusion: string): Syllogism {
    const valid = rule.length > 0 && fact.length > 0;
    const s: Syllogism = {
      major: `Rule: ${rule}`,
      minor: `Fact: ${fact}`,
      conclusion,
      valid,
    };
    this._syllogisms.push(s);
    this._history.push({ op: 'legalSyllogism', valid });
    return s;
  }

  /** Determine the burden of proof for a party. */
  burdenOfProof(party: BurdenOfProof['party'], standard: BurdenOfProof['standard']): BurdenOfProof {
    return { party, standard, met: false };
  }

  /** Return the standard of proof for a case type. */
  standardOfProof(type: 'civil' | 'criminal' | 'equity'): BurdenOfProof['standard'] {
    if (type === 'criminal') return 'beyond-reasonable-doubt';
    if (type === 'equity') return 'clear-and-convincing';
    return 'preponderance';
  }

  /** Apply an evidence rule to a piece of evidence. */
  evidenceRule(evidence: Evidence, rule: string): { rule: string; applies: boolean; effect: string } {
    const applies = rule === 'hearsay' && !!evidence.hearsay;
    return {
      rule,
      applies,
      effect: applies ? 'excluded-unless-exception' : 'no-effect',
    };
  }

  /** Determine admissibility of evidence. */
  admissibility(evidence: Evidence): AdmissibilityRuling {
    const grounds: string[] = [];
    let admissible = true;
    if (!evidence.relevant) { grounds.push('irrelevant'); admissible = false; }
    if (evidence.hearsay && !this._hearsayException(evidence)) {
      grounds.push('hearsay-no-exception');
      admissible = false;
    }
    if (evidence.authenticated === false) {
      grounds.push('not-authenticated');
      admissible = false;
    }
    return {
      evidenceId: evidence.id,
      admissible,
      grounds,
      rule: 'FRE-rules',
    };
  }

  /** Assess relevance of evidence to a fact. */
  relevance(evidence: Evidence, fact: string): { relevant: boolean; probative: number; prejudicial: number } {
    const probative = evidence.description.toLowerCase().includes(fact.toLowerCase()) ? 0.7 : 0.2;
    const prejudicial = evidence.type === 'physical' ? 0.4 : 0.2;
    return { relevant: probative > 0.3, probative, prejudicial };
  }

  /** Apply hearsay rule with optional exception. */
  hearsay(statement: string, exception?: string): { hearsay: boolean; exception: string | null; admissible: boolean } {
    const isHearsay = statement.includes('said') || statement.includes('told');
    const hasException = !!exception;
    return {
      hearsay: isHearsay,
      exception: exception ?? null,
      admissible: !isHearsay || hasException,
    };
  }

  /** Apply privilege rule. */
  privilege(communication: string, type: 'attorney-client' | 'spousal' | 'doctor-patient' | 'clergy' | 'none'): { privileged: boolean; scope: string } {
    const privileged = type !== 'none';
    return { privileged, scope: `${type}-communications` };
  }

  /** Determine authentication status of evidence. */
  authentication(evidence: Evidence): { required: boolean; methods: string[] } {
    const methods: string[] = [];
    if (evidence.type === 'documentary') methods.push('witness-testimony', 'handwriting-expert');
    if (evidence.type === 'physical') methods.push('chain-of-custody');
    if (evidence.type === 'demonstrative') methods.push('foundation');
    return { required: methods.length > 0, methods };
  }

  /** Verify chain of custody. */
  chainOfCustody(evidence: Evidence): ChainOfCustody {
    const handlers = ['officer-1', 'lab-tech', 'evidence-clerk'];
    const timestamps = [Date.now() - 86400000, Date.now() - 43200000, Date.now()];
    return {
      evidenceId: evidence.id,
      handlers,
      timestamps,
      intact: true,
    };
  }

  /** Apply a legal presumption. */
  presumption(type: Presumption['type'], rebuttable: boolean): Presumption {
    return { type, statement: `presumption-${type}`, rebuttable: type === 'rebuttable' };
  }

  private _hearsayException(evidence: Evidence): boolean {
    const exceptions = ['dying-declaration', 'excited-utterance', 'business-record', 'present-sense-impression'];
    return exceptions.some(e => evidence.description.toLowerCase().includes(e));
  }

  toPacket(): DataPacket<{
    arguments: LegalArgument[];
    syllogisms: Syllogism[];
    evidence: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['law', 'LegalReasoning'],
      priority: 1,
      phase: 'legal-reasoning',
    };
    return {
      id: `legal-reasoning-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        arguments: [...this._arguments],
        syllogisms: [...this._syllogisms],
        evidence: this._evidence.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._arguments = [];
    this._syllogisms = [];
    this._evidence.clear();
    this._history = [];
    this._counter = 0;
  }
}
