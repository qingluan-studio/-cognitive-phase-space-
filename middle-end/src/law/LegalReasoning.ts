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

/** A legal doctrine descriptor. */
export interface LegalDoctrine {
  readonly name: string;
  readonly category: 'constitutional' | 'common-law' | 'statutory' | 'equity';
  readonly description: string;
  readonly elements: string[];
  readonly exceptions: string[];
}

/** A statutory interpretation result. */
export interface StatutoryInterpretation {
  readonly statute: string;
  readonly text: string;
  readonly plainMeaning: string;
  readonly legislativeHistory: string;
  readonly purposive: string;
  readonly interpretation: string;
}

/** An issue preclusion analysis. */
export interface IssuePreclusion {
  readonly issue: string;
  readonly actuallyLitigated: boolean;
  readonly necessarilyDetermined: boolean;
  readonly finalJudgment: boolean;
  readonly sameParties: boolean;
  readonly applies: boolean;
}

/** A claim preclusion (res judicata) analysis. */
export interface ClaimPreclusion {
  readonly claim: string;
  readonly finalJudgment: boolean;
  readonly sameClaim: boolean;
  readonly sameParties: boolean;
  readonly applies: boolean;
}

/** A standing analysis. */
export interface StandingAnalysis {
  readonly plaintiff: string;
  readonly injuryInFact: boolean;
  readonly causation: boolean;
  readonly redressability: boolean;
  readonly hasStanding: boolean;
}

/** A mootness analysis. */
export interface MootnessAnalysis {
  readonly issue: string;
  readonly liveControversy: boolean;
  readonly capableOfRepetition: boolean;
  readonly evadingReview: boolean;
  readonly moot: boolean;
}

/** A ripeness analysis. */
export interface RipenessAnalysis {
  readonly issue: string;
  readonly harmImminent: boolean;
  readonly finalAgencyAction: boolean;
  readonly fitForReview: boolean;
  readonly ripe: boolean;
}

/** A statutory element analysis. */
export interface ElementAnalysis {
  readonly offense: string;
  readonly elements: { element: string; satisfied: boolean; evidence: string }[];
  readonly allSatisfied: boolean;
}

/** A judicial precedent summary. */
export interface PrecedentSummary {
  readonly caseName: string;
  readonly holding: string;
  readonly ratio: string;
  readonly dicta: string[];
  readonly binding: boolean;
}

/** A legal test result. */
export interface LegalTest {
  readonly name: string;
  readonly factors: { factor: string; satisfied: boolean; weight: number }[];
  readonly outcome: string;
  readonly satisfied: boolean;
}

/** A burden-shifting analysis. */
export interface BurdenShift {
  readonly stage: 'prima-facie' | 'rebuttal' | 'pretext';
  readonly party: BurdenOfProof['party'];
  readonly met: boolean;
  readonly explanation: string;
}

/** An expert witness descriptor. */
export interface ExpertWitness {
  readonly name: string;
  readonly qualifications: string[];
  readonly testimonyType: 'opinion' | 'factual' | 'demonstrative';
  readonly reliability: number;
  readonly methodology: string;
}

/**
 * LegalReasoning performs deductive, inductive, and analogical reasoning,
 * manages evidence, and applies rules of evidence (hearsay, privilege, etc.).
 */
export class LegalReasoning {
  private _arguments: LegalArgument[] = [];
  private _syllogisms: Syllogism[] = [];
  private _evidence: Map<string, Evidence> = new Map();
  private _doctrines: Map<string, LegalDoctrine> = new Map();
  private _expertWitnesses: ExpertWitness[] = [];
  private _burdenShifts: BurdenShift[] = [];
  private _precedents: PrecedentSummary[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedDoctrines();
  }

  get argumentCount(): number { return this._arguments.length; }
  get syllogismCount(): number { return this._syllogisms.length; }
  get evidenceCount(): number { return this._evidence.size; }
  get doctrineCount(): number { return this._doctrines.size; }
  get expertWitnessCount(): number { return this._expertWitnesses.length; }
  get burdenShiftCount(): number { return this._burdenShifts.length; }
  get precedentCount(): number { return this._precedents.length; }

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

  private _seedDoctrines(): void {
    const doctrines: LegalDoctrine[] = [
      {
        name: 'stare-decisis',
        category: 'common-law',
        description: 'Stand by things decided; precedent binds future courts.',
        elements: ['prior-decision', 'same-issue', 'same-jurisdiction'],
        exceptions: ['distinguishable-facts', 'changed-circumstances'],
      },
      {
        name: 'res-judicata',
        category: 'common-law',
        description: 'A claim already judged cannot be relitigated.',
        elements: ['final-judgment', 'same-claim', 'same-parties'],
        exceptions: ['lack-of-jurisdiction', 'fraud'],
      },
      {
        name: 'chevron-deference',
        category: 'administrative',
        description: 'Courts defer to agency interpretations of ambiguous statutes.',
        elements: ['ambiguous-statute', 'reasonable-interpretation', 'agency-authority'],
        exceptions: ['direct-conflict', 'arbitrary-capricious'],
      },
      {
        name: 'fair-use',
        category: 'statutory',
        description: 'Limited use of copyrighted material without permission.',
        elements: ['purpose', 'nature', 'amount', 'market-effect'],
        exceptions: ['commercial-use', 'substantial-portion'],
      },
    ];
    for (const d of doctrines) this._doctrines.set(d.name, d);
  }

  /** Register an expert witness. */
  registerExpert(witness: ExpertWitness): ExpertWitness {
    this._expertWitnesses.push(witness);
    this._history.push({ op: 'registerExpert', name: witness.name });
    return witness;
  }

  /** Qualify an expert witness under Daubert standard. */
  daubertTest(witness: ExpertWitness): { qualified: boolean; factors: { factor: string; met: boolean }[] } {
    const factors = [
      { factor: 'testable-methodology', met: witness.methodology.includes('test') || witness.methodology.includes('peer') },
      { factor: 'known-error-rate', met: witness.reliability > 0.6 },
      { factor: 'peer-review', met: witness.qualifications.some(q => q.includes('published')) },
      { factor: 'general-acceptance', met: witness.reliability > 0.7 },
    ];
    return {
      qualified: factors.filter(f => f.met).length >= 3,
      factors,
    };
  }

  /** Apply the Frye standard for expert testimony. */
  fryeTest(witness: ExpertWitness): { qualified: boolean; reasoning: string } {
    const qualified = witness.reliability > 0.7 && witness.methodology.includes('accepted');
    return {
      qualified,
      reasoning: qualified ? 'generally-accepted-in-scientific-community' : 'insufficient-acceptance',
    };
  }

  /** Apply a burden-shifting framework (McDonnell Douglas). */
  burdenShift(stage: BurdenShift['stage'], party: BurdenOfProof['party'], met: boolean, explanation: string): BurdenShift {
    const shift: BurdenShift = { stage, party, met, explanation };
    this._burdenShifts.push(shift);
    this._history.push({ op: 'burdenShift', stage, party });
    return shift;
  }

  /** Analyze a prima facie case. */
  primaFacieCase(elements: { element: string; satisfied: boolean }[]): { established: boolean; missing: string[] } {
    const missing = elements.filter(e => !e.satisfied).map(e => e.element);
    return {
      established: missing.length === 0,
      missing,
    };
  }

  /** Analyze issue preclusion (collateral estoppel). */
  issuePreclusion(issue: string, actuallyLitigated: boolean, necessarilyDetermined: boolean, finalJudgment: boolean, sameParties: boolean): IssuePreclusion {
    return {
      issue,
      actuallyLitigated,
      necessarilyDetermined,
      finalJudgment,
      sameParties,
      applies: actuallyLitigated && necessarilyDetermined && finalJudgment && sameParties,
    };
  }

  /** Analyze claim preclusion (res judicata). */
  claimPreclusion(claim: string, finalJudgment: boolean, sameClaim: boolean, sameParties: boolean): ClaimPreclusion {
    return {
      claim,
      finalJudgment,
      sameClaim,
      sameParties,
      applies: finalJudgment && sameClaim && sameParties,
    };
  }

  /** Analyze constitutional standing. */
  standing(plaintiff: string, injuryInFact: boolean, causation: boolean, redressability: boolean): StandingAnalysis {
    return {
      plaintiff,
      injuryInFact,
      causation,
      redressability,
      hasStanding: injuryInFact && causation && redressability,
    };
  }

  /** Analyze mootness. */
  mootness(issue: string, liveControversy: boolean, capableOfRepetition: boolean, evadingReview: boolean): MootnessAnalysis {
    return {
      issue,
      liveControversy,
      capableOfRepetition,
      evadingReview,
      moot: !liveControversy && !(capableOfRepetition && evadingReview),
    };
  }

  /** Analyze ripeness. */
  ripeness(issue: string, harmImminent: boolean, finalAgencyAction: boolean, fitForReview: boolean): RipenessAnalysis {
    return {
      issue,
      harmImminent,
      finalAgencyAction,
      fitForReview,
      ripe: harmImminent && finalAgencyAction && fitForReview,
    };
  }

  /** Analyze statutory elements. */
  analyzeElements(offense: string, elements: { element: string; evidence: string }[]): ElementAnalysis {
    const elementAnalysis = elements.map(e => ({
      element: e.element,
      satisfied: e.evidence.length > 0,
      evidence: e.evidence,
    }));
    return {
      offense,
      elements: elementAnalysis,
      allSatisfied: elementAnalysis.every(e => e.satisfied),
    };
  }

  /** Apply a multi-factor legal test. */
  applyLegalTest(name: string, factors: { factor: string; satisfied: boolean; weight: number }[]): LegalTest {
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const satisfiedWeight = factors.filter(f => f.satisfied).reduce((s, f) => s + f.weight, 0);
    const satisfied = totalWeight > 0 && satisfiedWeight / totalWeight > 0.5;
    return {
      name,
      factors,
      outcome: satisfied ? 'test-satisfied' : 'test-failed',
      satisfied,
    };
  }

  /** Apply the Lemon test (Establishment Clause). */
  lemonTest(purpose: boolean, effect: boolean, entanglement: boolean): LegalTest {
    return this.applyLegalTest('lemon-test', [
      { factor: 'secular-purpose', satisfied: purpose, weight: 1 },
      { factor: 'no-religious-effect', satisfied: effect, weight: 1 },
      { factor: 'no-excessive-entanglement', satisfied: !entanglement, weight: 1 },
    ]);
  }

  /** Apply the Strict Scrutiny test. */
  strictScrutiny(compellingInterest: boolean, narrowlyTailored: boolean, leastRestrictive: boolean): LegalTest {
    return this.applyLegalTest('strict-scrutiny', [
      { factor: 'compelling-government-interest', satisfied: compellingInterest, weight: 1 },
      { factor: 'narrowly-tailored', satisfied: narrowlyTailored, weight: 1 },
      { factor: 'least-restrictive-means', satisfied: leastRestrictive, weight: 1 },
    ]);
  }

  /** Apply the Intermediate Scrutiny test. */
  intermediateScrutiny(importantInterest: boolean, substantiallyRelated: boolean): LegalTest {
    return this.applyLegalTest('intermediate-scrutiny', [
      { factor: 'important-government-interest', satisfied: importantInterest, weight: 1 },
      { factor: 'substantially-related', satisfied: substantiallyRelated, weight: 1 },
    ]);
  }

  /** Apply the Rational Basis test. */
  rationalBasis(legitimateInterest: boolean, rationallyRelated: boolean): LegalTest {
    return this.applyLegalTest('rational-basis', [
      { factor: 'legitimate-government-interest', satisfied: legitimateInterest, weight: 1 },
      { factor: 'rationally-related', satisfied: rationallyRelated, weight: 1 },
    ]);
  }

  /** Compute a statutory interpretation using multiple canons. */
  interpretStatute(statute: string, text: string, context: string): StatutoryInterpretation {
    const plainMeaning = text.split(/[,;.]/)[0] ?? text;
    const legislativeHistory = context.length > 0 ? context : 'no-record';
    const purposive = text.includes('protect') ? 'protective-purpose'
      : text.includes('promote') ? 'promotional-purpose'
      : text.includes('regulate') ? 'regulatory-purpose'
      : 'neutral-purpose';
    return {
      statute,
      text,
      plainMeaning,
      legislativeHistory,
      purposive,
      interpretation: `Interpreted under plain meaning: "${plainMeaning}".`,
    };
  }

  /** Apply the plain meaning rule. */
  plainMeaningRule(text: string): string {
    return text.replace(/[^\w\s]/g, '').trim();
  }

  /** Apply the rule of lenity (for criminal statutes). */
  ruleOfLenity(text: string, ambiguous: boolean): { resolvesFor: 'defendant' | 'government' | 'none'; reasoning: string } {
    if (!ambiguous) return { resolvesFor: 'none', reasoning: 'statute-unambiguous' };
    return { resolvesFor: 'defendant', reasoning: 'ambiguity-resolved-in-favor-of-defendant' };
  }

  /** Apply the ejusdem generis canon. */
  ejusdemGeneris(specificItems: string[], generalTerm: string): { applies: boolean; category: string } {
    if (specificItems.length < 2) return { applies: false, category: 'insufficient-specifics' };
    return {
      applies: true,
      category: `general-term-${generalTerm}-restricted-to-category-of-${specificItems.join('-')}`,
    };
  }

  /** Apply the expressio unius canon. */
  expressioUnius(items: string[], excluded: string): { applies: boolean; reasoning: string } {
    return {
      applies: !items.includes(excluded),
      reasoning: `exclusion of "${excluded}" is intentional`,
    };
  }

  /** Apply the noscitur a sociis canon. */
  nosciturASociis(word: string, associates: string[]): { meaning: string } {
    return {
      meaning: `${word}-in-context-of-${associates.join('-')}`,
    };
  }

  /** Add evidence to the registry. */
  addEvidence(evidence: Evidence): Evidence {
    this._evidence.set(evidence.id, evidence);
    this._history.push({ op: 'addEvidence', id: evidence.id });
    return evidence;
  }

  /** Retrieve evidence by id. */
  getEvidence(id: string): Evidence | null {
    return this._evidence.get(id) ?? null;
  }

  /** Compute the weight of evidence. */
  evidenceWeight(evidence: Evidence): number {
    let weight = 0.5;
    if (evidence.relevant) weight += 0.2;
    if (evidence.authenticated) weight += 0.15;
    if (!evidence.hearsay) weight += 0.15;
    if (evidence.type === 'documentary') weight += 0.05;
    return Math.min(1, weight);
  }

  /** Compute cumulative weight of evidence. */
  cumulativeWeight(evidenceIds: string[]): number {
    const items = evidenceIds.map(id => this._evidence.get(id)).filter(Boolean) as Evidence[];
    if (items.length === 0) return 0;
    return Number((items.reduce((s, e) => s + this.evidenceWeight(e), 0) / items.length).toFixed(2));
  }

  /** Detect contradictory evidence. */
  contradictoryEvidence(evidenceIds: string[]): { contradictions: [string, string][]; consistency: number } {
    const items = evidenceIds.map(id => this._evidence.get(id)).filter(Boolean) as Evidence[];
    const contradictions: [string, string][] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].type !== items[j].type && items[i].description.includes('not') !== items[j].description.includes('not')) {
          contradictions.push([items[i].id, items[j].id]);
        }
      }
    }
    const consistency = items.length > 0 ? 1 - contradictions.length / (items.length * (items.length - 1) / 2) : 1;
    return { contradictions, consistency: Number(consistency.toFixed(2)) };
  }

  /** Apply the best evidence rule. */
  bestEvidenceRule(originalAvailable: boolean, copyQuality: 'high' | 'medium' | 'low'): { applies: boolean; admissible: boolean } {
    if (originalAvailable) return { applies: false, admissible: true };
    return {
      applies: true,
      admissible: copyQuality === 'high',
    };
  }

  /** Apply the parole evidence rule. */
  paroleEvidenceRule(integrated: boolean, written: boolean, extrinsicEvidence: boolean): { admissible: boolean; reasoning: string } {
    if (!written) return { admissible: true, reasoning: 'not-written-agreement' };
    if (!integrated) return { admissible: true, reasoning: 'not-fully-integrated' };
    if (extrinsicEvidence) return { admissible: false, reasoning: 'contradicts-written-terms' };
    return { admissible: true, reasoning: 'consistent-with-written-terms' };
  }

  /** Analyze a precedent and create a summary. */
  analyzePrecedent(caseName: string, holding: string, reasoning: string, binding: boolean): PrecedentSummary {
    const sentences = reasoning.split(/(?<=[.!?])\s+/);
    const dicta = sentences.filter(s => /observe|note|by the way|incidentally/i.test(s));
    const summary: PrecedentSummary = {
      caseName,
      holding,
      ratio: sentences[0] ?? holding,
      dicta,
      binding,
    };
    this._precedents.push(summary);
    return summary;
  }

  /** Distinguish a current case from a precedent. */
  distinguishFromPrecedent(currentFacts: string[], precedentFacts: string[]): { distinguishable: boolean; differences: string[] } {
    const differences = currentFacts.filter(f => !precedentFacts.includes(f));
    differences.push(...precedentFacts.filter(f => !currentFacts.includes(f)).map(f => `precedent-has:${f}`));
    return {
      distinguishable: differences.length > 0,
      differences,
    };
  }

  /** Apply the holding of a precedent to current facts. */
  applyPrecedent(holding: string, currentFacts: string[]): { applicable: boolean; reasoning: string } {
    const applicable = currentFacts.length >= 2;
    return {
      applicable,
      reasoning: applicable ? `Holding "${holding}" applies to current facts.` : 'insufficient-facts-to-apply-holding',
    };
  }

  /** Construct an argument by analogy. */
  argumentByAnalogy(source: string, target: string, similarities: string[], differences: string[]): { strength: number; reasoning: string } {
    const similarityScore = similarities.length / (similarities.length + differences.length + 1);
    return {
      strength: Number(similarityScore.toFixed(2)),
      reasoning: `Source "${source}" and target "${target}" share ${similarities.length} similarities and ${differences.length} differences.`,
    };
  }

  /** Validate a deductive argument's structure. */
  validateDeduction(premises: string[], conclusion: string): { valid: boolean; formErrors: string[] } {
    const errors: string[] = [];
    if (premises.length < 2) errors.push('insufficient-premises');
    if (!conclusion) errors.push('missing-conclusion');
    const hasUniversal = premises.some(p => /all|every|each/i.test(p));
    const hasParticular = premises.some(p => /some|there exists|a/i.test(p));
    if (!hasUniversal && !hasParticular) errors.push('missing-quantifier');
    return { valid: errors.length === 0, formErrors: errors };
  }

  /** Construct a reductio ad absurdum argument. */
  reductioAdAbsurdum(assumption: string, absurdity: string): LegalArgument {
    return {
      premises: [`assume: ${assumption}`, `then: ${absurdity}`, `${absurdity} is absurd`],
      conclusion: `therefore, ${assumption} is false`,
      rule: 'reductio-ad-absurdum',
      strength: 'strong',
    };
  }

  /** Compute the logical consistency of a set of premises. */
  logicalConsistency(premises: string[]): { consistent: boolean; conflicts: [string, string][] } {
    const conflicts: [string, string][] = [];
    for (let i = 0; i < premises.length; i++) {
      for (let j = i + 1; j < premises.length; j++) {
        const a = premises[i].toLowerCase();
        const b = premises[j].toLowerCase();
        if ((a.includes('not') && b.includes(a.replace('not ', ''))) ||
          (b.includes('not') && a.includes(b.replace('not ', '')))) {
          conflicts.push([premises[i], premises[j]]);
        }
      }
    }
    return { consistent: conflicts.length === 0, conflicts };
  }

  /** Compute the strength of an inductive argument. */
  inductiveStrength(sampleSize: number, diversity: number, randomness: boolean): number {
    let strength = Math.min(0.5, sampleSize / 100);
    strength += diversity * 0.3;
    if (randomness) strength += 0.2;
    return Number(Math.min(1, strength).toFixed(2));
  }

  /** Compute the validity of a conditional (hypothetical) syllogism. */
  conditionalSyllogism(antecedent: string, consequent: string, observed: string): { valid: boolean; form: string } {
    if (observed === antecedent) {
      return { valid: true, form: 'modus-ponens' };
    }
    if (observed === `not-${consequent}`) {
      return { valid: true, form: 'modus-tollens' };
    }
    return { valid: false, form: 'invalid' };
  }

  /** Detect a logical fallacy in an argument. */
  detectFallacy(premises: string[], conclusion: string): { fallacy: string | null; explanation: string } {
    if (premises.length === 1 && premises[0] === conclusion) {
      return { fallacy: 'begging-the-question', explanation: 'conclusion restates premise' };
    }
    if (premises.some(p => p.includes('everyone') || p.includes('everybody'))) {
      return { fallacy: 'appeal-to-popularity', explanation: 'premise appeals to popular opinion' };
    }
    if (premises.some(p => p.includes('authority') || p.includes('expert'))) {
      return { fallacy: 'appeal-to-authority', explanation: 'premise appeals to authority' };
    }
    if (premises.length > 3) {
      return { fallacy: 'slippery-slope', explanation: 'chain-of-causation-without-evidence' };
    }
    return { fallacy: null, explanation: 'no-fallacy-detected' };
  }

  /** Apply the doctrine of constitutional avoidance. */
  constitutionalAvoidance(statuteText: string, constitutionalIssue: boolean): { avoided: boolean; interpretation: string } {
    if (!constitutionalIssue) return { avoided: false, interpretation: 'no-constitutional-issue' };
    return {
      avoided: true,
      interpretation: `statute "${statuteText}" interpreted to avoid constitutional infirmity`,
    };
  }

  /** Compute the persuasiveness of an argument. */
  argumentPersuasiveness(strength: LegalArgument['strength'], evidenceCount: number, authorityCount: number): number {
    const strengthScore = strength === 'strong' ? 0.5 : strength === 'moderate' ? 0.3 : 0.1;
    const evidenceScore = Math.min(0.3, evidenceCount * 0.05);
    const authorityScore = Math.min(0.2, authorityCount * 0.05);
    return Number((strengthScore + evidenceScore + authorityScore).toFixed(2));
  }

  /** Retrieve a legal doctrine by name. */
  getDoctrine(name: string): LegalDoctrine | null {
    return this._doctrines.get(name.toLowerCase()) ?? null;
  }

  /** List all doctrines by category. */
  doctrinesByCategory(category: LegalDoctrine['category']): LegalDoctrine[] {
    return Array.from(this._doctrines.values()).filter(d => d.category === category);
  }

  /** Apply the Erie doctrine (federal courts apply state law in diversity). */
  erieDoctrine(federalCourt: boolean, diversity: boolean, stateLawIssue: boolean): { applies: boolean; law: string } {
    if (federalCourt && diversity && stateLawIssue) {
      return { applies: true, law: 'state-law-applies' };
    }
    return { applies: false, law: 'federal-law-applies' };
  }

  /** Compute the probability that evidence will be admitted. */
  admissionProbability(evidence: Evidence): number {
    let prob = 0.5;
    if (evidence.relevant) prob += 0.2;
    if (evidence.authenticated) prob += 0.15;
    if (!evidence.hearsay) prob += 0.1;
    if (evidence.type === 'documentary') prob += 0.05;
    return Math.min(1, Number(prob.toFixed(2)));
  }

  /** Generate a legal memo outline from arguments. */
  memoOutline(issue: string, arguments: LegalArgument[]): { section: string; content: string }[] {
    return [
      { section: 'Question Presented', content: issue },
      { section: 'Short Answer', content: arguments[0]?.conclusion ?? 'no-conclusion' },
      { section: 'Facts', content: arguments.flatMap(a => a.premises).join('; ') },
      { section: 'Discussion', content: arguments.map(a => a.conclusion).join('; ') },
      { section: 'Conclusion', content: arguments[arguments.length - 1]?.conclusion ?? 'no-conclusion' },
    ];
  }

  /** Compute an argument complexity score. */
  argumentComplexity(arg: LegalArgument): number {
    let score = 0;
    score += Math.min(30, arg.premises.length * 5);
    score += Math.min(20, arg.conclusion.length / 10);
    score += arg.exception ? 10 : 0;
    score += arg.strength === 'strong' ? 20 : arg.strength === 'moderate' ? 10 : 0;
    return Math.min(100, score);
  }

  /** Summarize all arguments by strength. */
  argumentsByStrength(): Record<LegalArgument['strength'], number> {
    const counts: Record<LegalArgument['strength'], number> = { weak: 0, moderate: 0, strong: 0 };
    for (const a of this._arguments) counts[a.strength]++;
    return counts;
  }

  /** Determine if a case presents a federal question. */
  federalQuestion(issue: string): boolean {
    return /federal|constitution|U\.S\.C|federal-question/i.test(issue);
  }

  /** Determine diversity jurisdiction. */
  diversityJurisdiction(plaintiffState: string, defendantState: string, amountInControversy: number): { applies: boolean; reasoning: string } {
    if (plaintiffState === defendantState) return { applies: false, reasoning: 'no-complete-diversity' };
    if (amountInControversy < 75000) return { applies: false, reasoning: 'amount-not-met' };
    return { applies: true, reasoning: 'complete-diversity-and-amount-met' };
  }

  /** Apply the constructive trust doctrine. */
  constructiveTrust(wrongfulConduct: boolean, propertyTraceable: boolean): { imposed: boolean; reasoning: string } {
    if (wrongfulConduct && propertyTraceable) {
      return { imposed: true, reasoning: 'wrongful-acquisition-traceable-to-property' };
    }
    return { imposed: false, reasoning: 'elements-not-satisfied' };
  }

  /** Compute the strength of a precedent's holding. */
  holdingStrength(precedent: PrecedentSummary): number {
    let strength = 0.4;
    if (precedent.binding) strength += 0.3;
    if (precedent.holding.length > 50) strength += 0.15;
    if (precedent.dicta.length === 0) strength += 0.15;
    return Math.min(1, strength);
  }

  /** Apply the last shot rule in contract disputes. */
  lastShotRule(offer: string, acceptance: string): { winner: 'offeror' | 'offeree'; reasoning: string } {
    return {
      winner: 'offeree',
      reasoning: 'offeree-acceptance-is-last-expression-terms-prevail',
    };
  }

  /** Apply the mirror image rule. */
  mirrorImageRule(offer: string, acceptance: string): { contract: boolean; reasoning: string } {
    const contract = offer.trim() === acceptance.trim();
    return {
      contract,
      reasoning: contract ? 'acceptance-mirrors-offer' : 'acceptance-varies-offer-no-contract',
    };
  }

  /** Apply the mailbox rule. */
  mailboxRule(dispatched: boolean, received: boolean): { effective: boolean; reasoning: string } {
    return {
      effective: dispatched,
      reasoning: dispatched ? 'acceptance-effective-on-dispatch' : 'no-dispatch-no-effect',
    };
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
    this._doctrines.clear();
    this._expertWitnesses = [];
    this._burdenShifts = [];
    this._precedents = [];
    this._history = [];
    this._counter = 0;
    this._seedDoctrines();
  }
}
