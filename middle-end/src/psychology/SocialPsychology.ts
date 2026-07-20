import { DataPacket, PacketMeta } from '../shared/types';

export interface SocialInfluence {
  readonly type: 'conformity' | 'compliance' | 'obedience' | 'persuasion' | 'social-learning';
  readonly source: string;
  readonly target: string;
  readonly compliance: number;
  readonly mechanism: string;
  readonly duration: number;
}

export interface Group {
  readonly id: string;
  readonly role: string;
  readonly norm: string;
  readonly cohesion: number;
  readonly size: number;
  readonly leader?: string;
  readonly structure: 'hierarchical' | 'flat' | 'network';
  readonly communicationPattern: string;
}

export interface Attitude {
  readonly object: string;
  readonly affective: number;
  readonly behavioral: number;
  readonly cognitive: number;
  readonly strength: number;
  readonly accessibility: number;
  readonly ambivalence: number;
}

export interface AttributionResult {
  readonly behavior: string;
  readonly internal: number;
  readonly external: number;
  readonly locus: 'internal' | 'external';
  readonly stability: number;
  readonly controllability: number;
}

export interface GroupthinkSymptoms {
  readonly group: string;
  readonly symptoms: string[];
  readonly risk: 'low' | 'moderate' | 'high' | 'critical';
  readonly conditions: string[];
  readonly interventionNeeded: boolean;
}

export interface PrejudiceDescriptor {
  readonly ingroup: string;
  readonly outgroup: string;
  readonly stereotype: string[];
  readonly intensity: number;
  readonly basis: string;
  readonly behavioralManifestation: string[];
}

export interface SocialIdentity {
  readonly group: string;
  readonly identification: number;
  readonly selfEsteem: number;
  readonly distinctiveness: number;
  readonly status: 'high' | 'medium' | 'low';
}

export interface IntergroupConflict {
  readonly groups: [string, string];
  readonly type: 'realistic' | 'symbolic' | 'identity';
  readonly intensity: number;
  readonly sources: string[];
  readonly resolutionPotential: number;
}

export interface ProsocialBehavior {
  readonly type: 'altruism' | 'cooperation' | 'helping' | 'sharing';
  readonly actor: string;
  readonly recipient: string;
  readonly motivation: string;
  readonly cost: number;
  readonly benefit: number;
}

export interface SocialExchange {
  readonly actors: [string, string];
  readonly resources: [string, string];
  readonly equity: number;
  readonly satisfaction: number;
  readonly reciprocity: boolean;
}

export interface SocialComparison {
  readonly target: string;
  readonly reference: string;
  readonly dimension: string;
  readonly direction: 'upward' | 'downward';
  readonly effect: string;
  readonly selfEvaluation: number;
}

export interface SocialNorms {
  readonly norm: string;
  readonly type: 'descriptive' | 'injunctive';
  readonly enforcement: number;
  readonly conformityRate: number;
  readonly exceptions: string[];
}

export interface SocialStatus {
  readonly individual: string;
  readonly status: number;
  readonly sources: string[];
  readonly perceivedStatus: number;
  readonly influence: number;
}

export interface SocialDilemma {
  readonly type: 'prisoners-dilemma' | 'tragedy-of-commons' | 'public-goods';
  readonly players: number;
  readonly cooperationRate: number;
  readonly payoffMatrix: number[][];
  readonly nashEquilibrium: string;
}

export interface Altruism {
  readonly actor: string;
  readonly recipient: string;
  readonly cost: number;
  readonly benefit: number;
  readonly motivation: 'empathy' | 'reciprocity' | 'social-norm' | 'kin-selection';
  readonly evolutionaryExplanation: string;
}

export interface Aggression {
  readonly type: 'physical' | 'verbal' | 'relational' | 'instrumental' | 'hostile';
  readonly perpetrator: string;
  readonly target: string;
  readonly intensity: number;
  readonly triggers: string[];
  readonly consequences: string[];
}

export interface SocialSupport {
  readonly type: 'emotional' | 'instrumental' | 'informational' | 'appraisal';
  readonly provider: string;
  readonly recipient: string;
  readonly quality: number;
  readonly effectiveness: number;
  readonly outcomes: string[];
}

export class SocialPsychology {
  private _influences: SocialInfluence[] = [];
  private _groups: Group[] = [];
  private _attitudes: Attitude[] = [];
  private _socialIdentities: Map<string, SocialIdentity> = new Map();
  private _intergroupConflicts: IntergroupConflict[] = [];
  private _prosocialBehaviors: ProsocialBehavior[] = [];
  private _socialNorms: Map<string, SocialNorms> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  get influenceCount(): number { return this._influences.length; }
  get groupCount(): number { return this._groups.length; }
  get attitudeCount(): number { return this._attitudes.length; }
  get socialIdentityCount(): number { return this._socialIdentities.size; }
  get intergroupConflictCount(): number { return this._intergroupConflicts.length; }
  get prosocialBehaviorCount(): number { return this._prosocialBehaviors.length; }
  get socialNormCount(): number { return this._socialNorms.size; }

  conformity(group: Group, individual: string, groupSize: number = 5, unanimity: boolean = true, public: boolean = true): { conformRate: number; mechanism: string; informational: number; normative: number; factors: string[]; publicCompliance: number } {
    const unanimityEffect = unanimity ? 1 : 0.7;
    const sizeEffect = Math.min(1, groupSize / 7);
    const publicEffect = public ? 1.1 : 0.8;
    const conformRate = group.cohesion * 0.6 * unanimityEffect * sizeEffect * publicEffect;
    const influence: SocialInfluence = {
      type: 'conformity',
      source: group.id,
      target: individual,
      compliance: conformRate,
      mechanism: 'normative-and-informational',
      duration: 30,
    };
    this._influences.push(influence);
    const factors = [];
    if (groupSize >= 3) factors.push('group-size');
    if (unanimity) factors.push('unanimity');
    if (group.cohesion > 0.7) factors.push('high-cohesion');
    if (public) factors.push('public-setting');
    this._history.push({ op: 'conformity', group: group.id, individual, conformRate });
    return {
      conformRate: Number(conformRate.toFixed(2)),
      mechanism: 'normative-and-informational',
      informational: Number((conformRate * 0.4).toFixed(2)),
      normative: Number((conformRate * 0.6).toFixed(2)),
      factors,
      publicCompliance: Number((conformRate * (public ? 1 : 0.5)).toFixed(2)),
    };
  }

  obedience(authority: string, subject: string, proximity: 'close' | 'remote', legitimacy: number = 0.8, responsibilityDiffusion: number = 0.5): { obeyRate: number; level: number; agenticState: boolean; factors: string[]; responsibility: number } {
    const proximityEffect = proximity === 'close' ? 1 : 0.6;
    const legitimacyEffect = legitimacy;
    const diffusionEffect = 1 + responsibilityDiffusion * 0.3;
    const obeyRate = 0.65 * proximityEffect * legitimacyEffect * diffusionEffect;
    const level = obeyRate > 0.7 ? 5 : obeyRate > 0.5 ? 4 : obeyRate > 0.3 ? 3 : 2;
    const factors = [];
    if (proximity === 'close') factors.push('authority-proximity');
    if (legitimacy > 0.7) factors.push('legitimate-authority');
    if (responsibilityDiffusion > 0.5) factors.push('diffusion-of-responsibility');
    this._history.push({ op: 'obedience', authority, subject, obeyRate });
    return {
      obeyRate: Number(obeyRate.toFixed(2)),
      level,
      agenticState: obeyRate > 0.5,
      factors,
      responsibility: Number((1 - responsibilityDiffusion).toFixed(2)),
    };
  }

  compliance(request: string, technique: 'foot-in-door' | 'door-in-face' | 'lowball' | 'scarcity' | 'reciprocity' | 'commitment' | 'social-proof', target: string = '', context: string = ''): { rate: number; technique: string; principle: string; conditions: string[]; contextEffect: number } {
    const rates: Record<typeof technique, number> = {
      'foot-in-door': 0.62,
      'door-in-face': 0.58,
      'lowball': 0.72,
      'scarcity': 0.68,
      'reciprocity': 0.64,
      'commitment': 0.66,
      'social-proof': 0.61,
    };
    const principles: Record<typeof technique, string> = {
      'foot-in-door': 'commitment-consistency',
      'door-in-face': 'reciprocity-concession',
      'lowball': 'commitment-withheld-information',
      'scarcity': 'scarcity-principle',
      'reciprocity': 'reciprocity-norm',
      'commitment': 'commitment-consistency',
      'social-proof': 'social-validation',
    };
    const conditions: Record<typeof technique, string[]> = {
      'foot-in-door': ['initial-request-small', 'requests-related'],
      'door-in-face': ['initial-request-excessive', 'concession-made'],
      'lowball': ['initial-agreement', 'hidden-costs'],
      'scarcity': ['limited-quantity', 'time-pressure'],
      'reciprocity': ['prior-favor', 'perceived-obligation'],
      'commitment': ['public-commitment', 'effort-investment'],
      'social-proof': ['similar-others', 'uncertainty'],
    };
    const contextEffect = context.includes('friend') ? 0.1 : context.includes('authority') ? 0.05 : 0;
    this._history.push({ op: 'compliance', technique, rate: rates[technique], context });
    return {
      rate: Number((rates[technique] + contextEffect).toFixed(2)),
      technique,
      principle: principles[technique],
      conditions: conditions[technique],
      contextEffect: Number(contextEffect.toFixed(2)),
    };
  }

  persuasion(source: string, message: string, audience: string, elaborationLikelihood: number = 0.5, sourceAttractiveness: number = 0.5): { central: number; peripheral: number; route: string; attitudeChange: number; sourceCredibility: number; messageQuality: number; attractivenessEffect: number } {
    const sourceCredibility = 0.7;
    const messageQuality = 0.6;
    const central = elaborationLikelihood * 0.7;
    const peripheral = (1 - elaborationLikelihood) * 0.5 + sourceAttractiveness * 0.15;
    const route = elaborationLikelihood > 0.5 ? 'central' : 'peripheral';
    const attitudeChange = central * 0.4 + peripheral * 0.3;
    this._history.push({ op: 'persuasion', route, attitudeChange, sourceAttractiveness });
    return {
      central: Number(central.toFixed(2)),
      peripheral: Number(peripheral.toFixed(2)),
      route,
      attitudeChange: Number(attitudeChange.toFixed(2)),
      sourceCredibility,
      messageQuality,
      attractivenessEffect: Number((sourceAttractiveness * 0.1).toFixed(2)),
    };
  }

  cognitiveDissonance(belief: string, behavior: string, importance: number = 0.7, selfConsistency: number = 0.8): { dissonance: number; reduction: string[]; attitudeChange: number; strategies: string[]; consistencyEffect: number } {
    const dissonance = importance * 0.6 * (1 - selfConsistency * 0.2);
    const strategies = ['change-belief', 'change-behavior', 'add-cognitions', 'trivialize', 'selective-exposure'];
    const reduction = strategies.slice(0, Math.min(3, Math.floor(importance * 4)));
    const attitudeChange = dissonance * 0.4;
    this._history.push({ op: 'cognitiveDissonance', dissonance, importance, selfConsistency });
    return {
      dissonance: Number(dissonance.toFixed(2)),
      reduction,
      attitudeChange: Number(attitudeChange.toFixed(2)),
      strategies,
      consistencyEffect: Number((selfConsistency * 0.1).toFixed(2)),
    };
  }

  attribution(behavior: string, internal: number, external: number, observerPerspective: boolean = true, culturalOrientation: 'individualistic' | 'collectivistic' = 'individualistic'): AttributionResult {
    const actorObserverEffect = observerPerspective ? 0.15 : -0.1;
    const culturalEffect = culturalOrientation === 'collectivistic' ? -0.1 : 0;
    const adjustedInternal = Math.min(1, Math.max(0, internal + actorObserverEffect + culturalEffect));
    const adjustedExternal = Math.min(1, Math.max(0, external - actorObserverEffect - culturalEffect));
    const locus: AttributionResult['locus'] = adjustedInternal > adjustedExternal ? 'internal' : 'external';
    this._history.push({ op: 'attribution', locus, observerPerspective, culturalOrientation });
    return {
      behavior,
      internal: Number(adjustedInternal.toFixed(2)),
      external: Number(adjustedExternal.toFixed(2)),
      locus,
      stability: Number((internal * 0.6 + external * 0.4).toFixed(2)),
      controllability: Number((internal * 0.7).toFixed(2)),
    };
  }

  fundamentalAttribution(behavior: string, observer: string, culture: 'individualistic' | 'collectivistic', familiarity: number = 0.3): { overattribution: number; situationalUnderweight: number; culturalFactor: number; biasStrength: 'weak' | 'moderate' | 'strong'; familiarityEffect: number } {
    const culturalModifier = culture === 'individualistic' ? 1 : 0.6;
    const familiarityPenalty = familiarity * 0.2;
    const overattribution = (0.5 - familiarityPenalty) * culturalModifier;
    const situationalUnderweight = (0.4 - familiarityPenalty * 0.5) * culturalModifier;
    const biasStrength: 'weak' | 'moderate' | 'strong' = culturalModifier < 0.8 ? 'weak' : culturalModifier < 0.95 ? 'moderate' : 'strong';
    this._history.push({ op: 'fundamentalAttribution', culture, biasStrength, familiarity });
    return {
      overattribution: Number(overattribution.toFixed(2)),
      situationalUnderweight: Number(situationalUnderweight.toFixed(2)),
      culturalFactor: Number(culturalModifier.toFixed(2)),
      biasStrength,
      familiarityEffect: Number((-familiarityPenalty).toFixed(2)),
    };
  }

  selfServingBias(outcome: 'success' | 'failure' | 'neutral', selfEsteem: number = 0.7, defensiveAttribution: number = 0.5): { attribution: string; locus: string; bias: number; defenseMechanism: string; defensiveness: number } {
    const selfEsteemEffect = selfEsteem > 0.6 ? 1.2 : 0.8;
    const defensiveEffect = defensiveAttribution * 0.3;
    let attribution = '';
    let locus = '';
    let bias = 0;
    if (outcome === 'success') {
      attribution = 'internal-ability-effort';
      locus = 'internal';
      bias = (0.4 + defensiveEffect) * selfEsteemEffect;
    } else if (outcome === 'failure') {
      attribution = 'external-circumstances-luck';
      locus = 'external';
      bias = (0.35 + defensiveEffect) * selfEsteemEffect;
    } else {
      attribution = 'mixed';
      locus = 'both';
      bias = 0.1;
    }
    this._history.push({ op: 'selfServingBias', outcome, bias, defensiveAttribution });
    return { attribution, locus, bias: Number(bias.toFixed(2)), defenseMechanism: 'self-enhancement', defensiveness: Number(defensiveEffect.toFixed(2)) };
  }

  bystanderEffect(emergency: string, bystanders: number, ambiguity: number = 0.3, familiarity: number = 0.2): { helpProbability: number; diffusion: number; intervention: number; pluralisticIgnorance: boolean; factors: string[]; familiarityBonus: number } {
    const ambiguityEffect = Math.max(0.3, 1 - ambiguity);
    const familiarityBonus = familiarity * 0.15;
    const helpProbability = ((1 / Math.max(1, bystanders)) * ambiguityEffect) + familiarityBonus;
    const pluralisticIgnorance = bystanders > 2 && ambiguity > 0.5;
    const factors = [];
    if (bystanders > 3) factors.push('diffusion-of-responsibility');
    if (ambiguity > 0.5) factors.push('ambiguous-situation');
    if (pluralisticIgnorance) factors.push('pluralistic-ignorance');
    if (familiarity > 0.3) factors.push('familiarity-with-victim');
    this._history.push({ op: 'bystanderEffect', bystanders, helpProbability, familiarity });
    return {
      helpProbability: Number(helpProbability.toFixed(3)),
      diffusion: Number((1 - helpProbability).toFixed(3)),
      intervention: helpProbability > 0.5 ? 0.8 : 0.2,
      pluralisticIgnorance,
      factors,
      familiarityBonus: Number(familiarityBonus.toFixed(2)),
    };
  }

  groupthink(group: Group, conditions: string[], cohesion: number = 0.8, leaderDominance: number = 0.5): GroupthinkSymptoms {
    const allSymptoms = [
      'illusion-of-invulnerability', 'collective-rationalization', 'belief-in-moral-superiority',
      'stereotyping-outgroup', 'self-censorship', 'pressure-on-dissent', 'mindguarding',
      'illusion-of-unanimity', 'direct-pressure', 'closed-mindedness',
    ];
    const severityIndex = conditions.length * 0.2 + (1 - cohesion) * 0.3 + leaderDominance * 0.2;
    const risk: GroupthinkSymptoms['risk'] = severityIndex > 0.7 ? 'critical' : severityIndex > 0.5 ? 'high' : severityIndex > 0.3 ? 'moderate' : 'low';
    const symptomCount = risk === 'critical' ? 8 : risk === 'high' ? 6 : risk === 'moderate' ? 4 : 2;
    const interventionNeeded = risk === 'critical' || risk === 'high';
    this._history.push({ op: 'groupthink', group: group.id, risk, leaderDominance });
    return {
      group: group.id,
      symptoms: allSymptoms.slice(0, symptomCount),
      risk,
      conditions,
      interventionNeeded,
    };
  }

  groupPolarization(group: Group, initial: number, discussionTime: number = 30, homogeneity: number = 0.7): { shifted: number; direction: 'risky' | 'cautious' | 'extreme'; mechanism: string; magnitude: 'small' | 'moderate' | 'large'; homogeneityEffect: number } {
    const timeEffect = Math.min(1, discussionTime / 45);
    const homogeneityEffect = homogeneity * 0.1;
    const shiftAmount = (0.15 + homogeneityEffect) * timeEffect * group.cohesion;
    const shifted = initial > 0.5 ? Math.min(1, initial + shiftAmount) : Math.max(0, initial - shiftAmount);
    const direction: 'risky' | 'cautious' | 'extreme' = shifted > 0.7 ? 'risky' : shifted < 0.3 ? 'cautious' : 'extreme';
    const magnitude: 'small' | 'moderate' | 'large' = Math.abs(shifted - initial) < 0.1 ? 'small' : Math.abs(shifted - initial) < 0.2 ? 'moderate' : 'large';
    this._history.push({ op: 'groupPolarization', direction, magnitude, homogeneity });
    return {
      shifted: Number(shifted.toFixed(2)),
      direction,
      mechanism: 'social-comparison-and-persuasive-arguments',
      magnitude,
      homogeneityEffect: Number(homogeneityEffect.toFixed(2)),
    };
  }

  socialLoafing(group: Group, individual: string, identifiability: boolean = false, taskImportance: number = 0.5): { effort: number; reduction: number; identifiable: boolean; compensation: boolean; factors: string[]; importanceEffect: number } {
    const identifiabilityEffect = identifiability ? 0.3 : 0;
    const importanceBonus = taskImportance * 0.15;
    const effort = Math.max(0.4, 1 - group.size * 0.05 + identifiabilityEffect + importanceBonus);
    const reduction = 1 - effort;
    const compensation = group.size > 5 && !identifiability;
    const factors = [];
    if (group.size > 3) factors.push('group-size');
    if (!identifiability) factors.push('low-identifiability');
    if (compensation) factors.push('compensation-effect');
    if (taskImportance > 0.7) factors.push('high-task-importance');
    this._history.push({ op: 'socialLoafing', group: group.id, individual, effort, taskImportance });
    return {
      effort: Number(effort.toFixed(2)),
      reduction: Number(reduction.toFixed(2)),
      identifiable: identifiability,
      compensation,
      factors,
      importanceEffect: Number(importanceBonus.toFixed(2)),
    };
  }

  stereotype(group: string, attributes: string[], accuracy: number = 0.3, context: string = ''): { group: string; attributes: string[]; accuracy: number; valence: 'positive' | 'negative' | 'mixed'; content: string[]; functions: string[]; contextModulation: number } {
    const positiveCount = attributes.filter(a => ['competent', 'hardworking', 'trustworthy', 'intelligent'].includes(a)).length;
    const negativeCount = attributes.length - positiveCount;
    const valence: 'positive' | 'negative' | 'mixed' = positiveCount === 0 ? 'negative' : negativeCount === 0 ? 'positive' : 'mixed';
    const content = attributes;
    const functions = ['cognitive-simplification', 'social-identity-maintenance', 'self-esteem-protection'];
    const contextModulation = context.includes('professional') ? 0.1 : context.includes('social') ? -0.05 : 0;
    this._history.push({ op: 'stereotype', group, valence, context });
    return {
      group,
      attributes,
      accuracy: Number((accuracy + contextModulation).toFixed(2)),
      valence,
      content,
      functions,
      contextModulation: Number(contextModulation.toFixed(2)),
    };
  }

  prejudice(ingroup: string, outgroup: string, contact: number = 0.2, intergroupAnxiety: number = 0.5): PrejudiceDescriptor {
    const contactEffect = Math.max(0, 1 - contact * 3);
    const anxietyEffect = intergroupAnxiety * 0.2;
    const intensity = (0.5 * contactEffect) + anxietyEffect;
    const stereotypes = contact < 0.3 ? ['outgroup-homogeneity', 'negative-attribution', 'threat-perception'] : ['neutral-association'];
    const behavioralManifestation = intensity > 0.4 ? ['avoidance', 'discrimination', 'verbal-hostility'] : ['social-distance'];
    this._history.push({ op: 'prejudice', ingroup, outgroup, intensity, intergroupAnxiety });
    return {
      ingroup,
      outgroup,
      stereotype: stereotypes,
      intensity: Number(intensity.toFixed(2)),
      basis: contact < 0.3 ? 'social-identity' : 'minimal-group',
      behavioralManifestation,
    };
  }

  discrimination(basis: string, action: string, institutional: boolean = false, structural: boolean = false): { basis: string; action: string; severity: number; systematic: boolean; type: 'individual' | 'institutional' | 'structural'; intersectionality: number } {
    const severity = institutional ? 0.75 : structural ? 0.85 : 0.5;
    const type: 'individual' | 'institutional' | 'structural' = structural ? 'structural' : institutional ? 'institutional' : 'individual';
    const intersectionality = basis.includes('+') ? 0.7 : 0.3;
    this._history.push({ op: 'discrimination', basis, type, severity, structural });
    return {
      basis,
      action,
      severity: Number(severity.toFixed(2)),
      systematic: institutional || structural,
      type,
      intersectionality: Number(intersectionality.toFixed(2)),
    };
  }

  socialIdentity(group: string, identification: number, selfEsteem: number = 0.7, distinctiveness: number = 0.5): SocialIdentity {
    const effectiveDistinctiveness = Math.min(1, identification * 0.8 + distinctiveness * 0.2);
    const status: SocialIdentity['status'] = selfEsteem > 0.8 ? 'high' : selfEsteem > 0.5 ? 'medium' : 'low';
    const identity: SocialIdentity = { group, identification, selfEsteem, distinctiveness: effectiveDistinctiveness, status };
    this._socialIdentities.set(group, identity);
    this._history.push({ op: 'socialIdentity', group, identification, status });
    return identity;
  }

  socialIdentityTheory(group: string, compareGroup: string, socialMobility: number = 0.5): { identification: number; socialComparison: 'favorable' | 'unfavorable'; selfEsteemChange: number; strategy: string; mobilityEffect: number } {
    const ingroup = this._socialIdentities.get(group);
    const outgroup = this._socialIdentities.get(compareGroup);
    const ingroupId = ingroup?.identification ?? 0.5;
    const outgroupId = outgroup?.identification ?? 0.4;
    const comparison = ingroupId > outgroupId ? 'favorable' : 'unfavorable';
    const selfEsteemChange = comparison === 'favorable' ? 0.15 : -0.1;
    const strategy = comparison === 'favorable' ? 'social-competition' : 
                     socialMobility > 0.5 ? 'social-mobility' : 'social-creativity';
    this._history.push({ op: 'socialIdentityTheory', comparison, strategy, socialMobility });
    return {
      identification: Number(ingroupId.toFixed(2)),
      socialComparison: comparison,
      selfEsteemChange: Number(selfEsteemChange.toFixed(2)),
      strategy,
      mobilityEffect: Number(socialMobility.toFixed(2)),
    };
  }

  intergroupConflict(groupA: string, groupB: string, type: IntergroupConflict['type'], resources: number = 0.5, historicalAnimosity: number = 0.3): IntergroupConflict {
    const animosityBonus = historicalAnimosity * 0.2;
    const intensity = type === 'realistic' ? resources * 0.8 + animosityBonus : type === 'identity' ? 0.7 + animosityBonus : 0.6 + animosityBonus;
    const sources = type === 'realistic' ? ['resource-competition', 'goal-incompatibility']
      : type === 'symbolic' ? ['value-conflict', 'norm-differences']
      : ['identity-threat', 'social-status'];
    const resolutionPotential = type === 'realistic' ? 0.6 - animosityBonus : type === 'symbolic' ? 0.4 - animosityBonus : 0.3 - animosityBonus;
    const conflict: IntergroupConflict = {
      groups: [groupA, groupB],
      type,
      intensity: Number(intensity.toFixed(2)),
      sources,
      resolutionPotential: Number(Math.max(0, resolutionPotential).toFixed(2)),
    };
    this._intergroupConflicts.push(conflict);
    this._history.push({ op: 'intergroupConflict', type, intensity, historicalAnimosity });
    return conflict;
  }

  contactHypothesis(groupA: string, groupB: string, conditions: string[], duration: number = 10): { prejudiceReduction: number; success: boolean; factors: string[]; recommendations: string[]; durationEffect: number } {
    const idealConditions = ['equal-status', 'common-goal', 'intergroup-cooperation', 'authority-support'];
    const matchedConditions = conditions.filter(c => idealConditions.includes(c));
    const durationBonus = Math.min(0.2, duration / 50);
    const reduction = (matchedConditions.length / idealConditions.length * 0.5) + durationBonus;
    const success = matchedConditions.length >= 3 && duration >= 5;
    const recommendations = idealConditions.filter(c => !conditions.includes(c));
    this._history.push({ op: 'contactHypothesis', success, reduction, duration });
    return {
      prejudiceReduction: Number(reduction.toFixed(2)),
      success,
      factors: matchedConditions,
      recommendations,
      durationEffect: Number(durationBonus.toFixed(2)),
    };
  }

  prosocialBehavior(type: ProsocialBehavior['type'], actor: string, recipient: string, cost: number = 0.3, relationship: string = 'stranger'): ProsocialBehavior {
    const motivation = type === 'altruism' ? 'empathy-altruism' : type === 'cooperation' ? 'mutual-benefit' : 'social-norm';
    const relationshipBonus = relationship === 'friend' ? 0.2 : relationship === 'family' ? 0.3 : 0;
    const benefit = (cost * 1.5) + relationshipBonus;
    const behavior: ProsocialBehavior = { type, actor, recipient, motivation, cost, benefit };
    this._prosocialBehaviors.push(behavior);
    this._history.push({ op: 'prosocialBehavior', type, actor, recipient, relationship });
    return behavior;
  }

  empathyAltruism(hypothesis: boolean = true, empathicConcern: number = 0.7, personalDistress: number = 0.3): { helping: boolean; motivation: string; costSensitivity: number; perspectiveTaking: boolean; distressEffect: number } {
    const helping = hypothesis && empathicConcern > 0.5 && personalDistress < 0.6;
    const motivation = helping ? 'altruistic' : 'egoistic';
    const costSensitivity = helping ? 0.3 : 0.7;
    const distressEffect = personalDistress * 0.15;
    this._history.push({ op: 'empathyAltruism', helping, motivation, empathicConcern, personalDistress });
    return { helping, motivation, costSensitivity: Number(costSensitivity.toFixed(2)), perspectiveTaking: empathicConcern > 0.5, distressEffect: Number(distressEffect.toFixed(2)) };
  }

  socialExchange(actorA: string, actorB: string, resourceA: string, resourceB: string, powerBalance: number = 0.5): SocialExchange {
    const equity = 0.7 + Math.random() * 0.2 - Math.abs(powerBalance - 0.5) * 0.1;
    const satisfaction = equity > 0.8 ? 0.85 : equity > 0.6 ? 0.6 : 0.4;
    const reciprocity = equity > 0.75;
    this._history.push({ op: 'socialExchange', equity, satisfaction, powerBalance });
    return {
      actors: [actorA, actorB],
      resources: [resourceA, resourceB],
      equity: Number(equity.toFixed(2)),
      satisfaction: Number(satisfaction.toFixed(2)),
      reciprocity,
    };
  }

  equityTheory(inputRatio: number, comparisonRatio: number, sensitivity: number = 0.7): { equitable: boolean; distress: number; tension: number; predictedBehavior: string; sensitivityFactor: number } {
    const equitable = Math.abs(inputRatio - comparisonRatio) < 0.1;
    const distress = Math.abs(inputRatio - comparisonRatio) * 0.8 * sensitivity;
    const tension = distress * 0.7;
    let predictedBehavior = '';
    if (inputRatio > comparisonRatio) predictedBehavior = 'reduce-inputs';
    else if (inputRatio < comparisonRatio) predictedBehavior = 'increase-outputs-or-change-comparison';
    else predictedBehavior = 'maintain-status-quo';
    this._history.push({ op: 'equityTheory', equitable, predictedBehavior, sensitivity });
    return {
      equitable,
      distress: Number(distress.toFixed(2)),
      tension: Number(tension.toFixed(2)),
      predictedBehavior,
      sensitivityFactor: Number(sensitivity.toFixed(2)),
    };
  }

  socialComparison(target: string, reference: string, dimension: string, direction: 'upward' | 'downward', selfEsteem: number = 0.5): SocialComparison {
    let effect = '';
    let selfEvaluation = 0.5;
    if (direction === 'upward') {
      effect = 'self-improvement-motivation';
      selfEvaluation = 0.4 + selfEsteem * 0.1;
    } else {
      effect = 'self-enhancement';
      selfEvaluation = 0.7 + selfEsteem * 0.1;
    }
    this._history.push({ op: 'socialComparison', direction, effect, selfEsteem });
    return {
      target,
      reference,
      dimension,
      direction,
      effect,
      selfEvaluation: Number(selfEvaluation.toFixed(2)),
    };
  }

  upwardComparison(target: string, reference: string, dimension: string, similarity: number = 0.5): { selfEvaluation: number; motivation: string; affect: 'positive' | 'negative'; assimilation: boolean; similarityEffect: number } {
    const selfEvaluation = 0.45 + similarity * 0.05;
    const motivation = 'self-improvement';
    const affect: 'positive' | 'negative' = similarity > 0.5 ? 'positive' : 'negative';
    const assimilation = affect === 'positive';
    this._history.push({ op: 'upwardComparison', motivation, affect, similarity });
    return {
      selfEvaluation: Number(selfEvaluation.toFixed(2)),
      motivation,
      affect,
      assimilation,
      similarityEffect: Number(similarity.toFixed(2)),
    };
  }

  downwardComparison(target: string, reference: string, dimension: string, relevance: number = 0.5): { selfEvaluation: number; selfEsteemBoost: number; affect: 'positive'; contrast: boolean; relevanceEffect: number } {
    const selfEvaluation = 0.75 + relevance * 0.1;
    const selfEsteemBoost = 0.2 + relevance * 0.1;
    this._history.push({ op: 'downwardComparison', selfEvaluation, relevance });
    return {
      selfEvaluation: Number(selfEvaluation.toFixed(2)),
      selfEsteemBoost: Number(selfEsteemBoost.toFixed(2)),
      affect: 'positive',
      contrast: true,
      relevanceEffect: Number(relevance.toFixed(2)),
    };
  }

  socialFacilitation(task: string, taskType: 'simple' | 'complex', audienceSize: number = 3, arousalControl: number = 0.5): { performance: number; arousal: number; dominantResponse: boolean; effect: 'enhancement' | 'impairment'; arousalManagement: number } {
    const arousal = Math.min(1, audienceSize / 5 * 0.8);
    const arousalManagement = arousalControl * 0.15;
    let performance = 0;
    if (taskType === 'simple') {
      performance = 0.8 + arousal * 0.15 + arousalManagement;
    } else {
      performance = 0.7 - arousal * 0.1 + arousalManagement;
    }
    const effect = performance > 0.75 ? 'enhancement' : 'impairment';
    this._history.push({ op: 'socialFacilitation', taskType, effect, arousalControl });
    return {
      performance: Number(performance.toFixed(2)),
      arousal: Number(arousal.toFixed(2)),
      dominantResponse: taskType === 'simple',
      effect,
      arousalManagement: Number(arousalManagement.toFixed(2)),
    };
  }

  socialInhibition(task: string, taskType: 'simple' | 'complex', audienceSize: number = 3, selfPresentation: number = 0.7): { performance: number; anxiety: number; selfConsciousness: number; effect: 'inhibition' | 'facilitation'; selfPresentationEffect: number } {
    const anxiety = Math.min(1, audienceSize / 4 * 0.7 + selfPresentation * 0.2);
    const selfPresentationEffect = selfPresentation * 0.1;
    let performance = 0;
    if (taskType === 'complex') {
      performance = 0.65 - anxiety * 0.15 + selfPresentationEffect;
    } else {
      performance = 0.85 + anxiety * 0.05;
    }
    const effect = performance < 0.7 ? 'inhibition' : 'facilitation';
    this._history.push({ op: 'socialInhibition', taskType, effect, selfPresentation });
    return {
      performance: Number(performance.toFixed(2)),
      anxiety: Number(anxiety.toFixed(2)),
      selfConsciousness: Number((anxiety * 0.8).toFixed(2)),
      effect,
      selfPresentationEffect: Number(selfPresentationEffect.toFixed(2)),
    };
  }

  deindividuation(groupSize: number, anonymity: boolean = true, arousal: number = 0.6, selfAwareness: number = 0.5): { selfAwareness: number; impulseControl: number; antisocialBehavior: boolean; riskTaking: number; disinhibition: number } {
    const baseSelfAwareness = Math.max(0.1, 1 - groupSize * 0.08 - (anonymity ? 0.3 : 0));
    const adjustedSelfAwareness = Math.max(0.1, baseSelfAwareness * selfAwareness);
    const impulseControl = adjustedSelfAwareness * 0.8;
    const antisocialBehavior = adjustedSelfAwareness < 0.4 && arousal > 0.5;
    const riskTaking = 1 - impulseControl;
    const disinhibition = 1 - adjustedSelfAwareness;
    this._history.push({ op: 'deindividuation', selfAwareness: adjustedSelfAwareness, antisocialBehavior, arousal });
    return {
      selfAwareness: Number(adjustedSelfAwareness.toFixed(2)),
      impulseControl: Number(impulseControl.toFixed(2)),
      antisocialBehavior,
      riskTaking: Number(riskTaking.toFixed(2)),
      disinhibition: Number(disinhibition.toFixed(2)),
    };
  }

  leadership(group: Group, style: 'autocratic' | 'democratic' | 'laissez-faire' | 'transformational' | 'transactional', groupMaturity: number = 0.5): { effectiveness: number; satisfaction: number; productivity: number; style: string; outcomes: string[]; maturityEffect: number } {
    const effectivenessMap = { democratic: 0.85, autocratic: 0.7, 'laissez-faire': 0.5, transformational: 0.9, transactional: 0.8 };
    const satisfactionMap = { democratic: 0.8, 'laissez-faire': 0.6, autocratic: 0.5, transformational: 0.85, transactional: 0.7 };
    const productivityMap = { autocratic: 0.8, democratic: 0.75, 'laissez-faire': 0.5, transformational: 0.8, transactional: 0.85 };
    const maturityBonus = groupMaturity * 0.1;
    const effectiveness = Math.min(1, effectivenessMap[style] + maturityBonus);
    const satisfaction = Math.min(1, satisfactionMap[style] + maturityBonus);
    const productivity = Math.min(1, productivityMap[style] + maturityBonus);
    const outcomes = style === 'democratic' ? ['high-satisfaction', 'moderate-productivity', 'group-cohesion']
      : style === 'autocratic' ? ['high-productivity', 'low-satisfaction', 'quick-decision']
      : style === 'laissez-faire' ? ['low-productivity', 'moderate-satisfaction', 'creative-output']
      : style === 'transformational' ? ['high-motivation', 'innovation', 'vision-alignment']
      : ['goal-achievement', 'reward-system', 'efficiency'];
    this._history.push({ op: 'leadership', style, effectiveness, groupMaturity });
    return {
      effectiveness: Number(effectiveness.toFixed(2)),
      satisfaction: Number(satisfaction.toFixed(2)),
      productivity: Number(productivity.toFixed(2)),
      style,
      outcomes,
      maturityEffect: Number(maturityBonus.toFixed(2)),
    };
  }

  groupCohesion(group: Group, factors: string[], externalThreat: number = 0.3): { cohesion: number; stability: number; performance: number; factors: string[]; consequences: string[]; threatEffect: number } {
    const baseCohesion = group.cohesion;
    const factorBonus = factors.length * 0.05;
    const threatBonus = externalThreat * 0.15;
    const cohesion = Math.min(1, baseCohesion + factorBonus + threatBonus);
    const stability = cohesion * 0.9;
    const performance = cohesion > 0.7 ? 0.85 : cohesion > 0.5 ? 0.7 : 0.55;
    const consequences = cohesion > 0.7 ? ['high-performance', 'low-turnover', 'groupthink-risk']
      : cohesion > 0.5 ? ['moderate-performance', 'stable-membership']
      : ['low-performance', 'high-turnover'];
    this._history.push({ op: 'groupCohesion', cohesion, stability, externalThreat });
    return {
      cohesion: Number(cohesion.toFixed(2)),
      stability: Number(stability.toFixed(2)),
      performance: Number(performance.toFixed(2)),
      factors,
      consequences,
      threatEffect: Number(threatBonus.toFixed(2)),
    };
  }

  socialNorms(norm: string, type: 'descriptive' | 'injunctive', enforcement: number = 0.7, context: string = ''): SocialNorms {
    const conformityRate = type === 'descriptive' ? 0.75 : 0.85;
    const exceptions = context.includes('emergency') ? ['emergency-exception'] : [];
    const socialNorm: SocialNorms = { norm, type, enforcement: Number(enforcement.toFixed(2)), conformityRate: Number(conformityRate.toFixed(2)), exceptions };
    this._socialNorms.set(norm, socialNorm);
    this._history.push({ op: 'socialNorms', norm, type, enforcement });
    return socialNorm;
  }

  socialStatus(individual: string, sources: string[], perceivedStatus: number = 0.5): SocialStatus {
    const status = Math.min(1, sources.length * 0.15 + perceivedStatus * 0.3);
    const influence = status * 0.8;
    this._history.push({ op: 'socialStatus', individual, status });
    return {
      individual,
      status: Number(status.toFixed(2)),
      sources,
      perceivedStatus: Number(perceivedStatus.toFixed(2)),
      influence: Number(influence.toFixed(2)),
    };
  }

  socialDilemma(type: SocialDilemma['type'], players: number = 2, cooperationIncentive: number = 0.5): SocialDilemma {
    let cooperationRate = 0;
    let payoffMatrix: number[][] = [];
    let nashEquilibrium = '';
    if (type === 'prisoners-dilemma') {
      cooperationRate = 0.3 + cooperationIncentive * 0.3;
      payoffMatrix = [[3, 5], [0, 1]];
      nashEquilibrium = 'defect-defect';
    } else if (type === 'tragedy-of-commons') {
      cooperationRate = 0.2 + cooperationIncentive * 0.2;
      payoffMatrix = [[4, 6], [2, 3]];
      nashEquilibrium = 'overuse';
    } else {
      cooperationRate = 0.4 + cooperationIncentive * 0.3;
      payoffMatrix = [[5, 8], [0, 4]];
      nashEquilibrium = 'free-rider';
    }
    this._history.push({ op: 'socialDilemma', type, cooperationRate, players });
    return {
      type,
      players,
      cooperationRate: Number(cooperationRate.toFixed(2)),
      payoffMatrix,
      nashEquilibrium,
    };
  }

  altruism(actor: string, recipient: string, cost: number = 0.3, motivation: Altruism['motivation'] = 'empathy', relatedness: number = 0): Altruism {
    const relatednessBonus = relatedness * 0.2;
    const benefit = (cost * 1.5) + relatednessBonus;
    const evolutionaryExplanation = motivation === 'kin-selection' ? 'inclusive-fitness' : 
                                    motivation === 'reciprocity' ? 'reciprocal-altruism' : 
                                    motivation === 'social-norm' ? 'group-selection' : 'empathy-altruism';
    this._history.push({ op: 'altruism', actor, recipient, motivation, relatedness });
    return {
      actor,
      recipient,
      cost: Number(cost.toFixed(2)),
      benefit: Number(benefit.toFixed(2)),
      motivation,
      evolutionaryExplanation,
    };
  }

  aggression(type: Aggression['type'], perpetrator: string, target: string, triggers: string[], intensity: number = 0.5): Aggression {
    const consequences = type === 'physical' ? ['harm', 'legal-consequences', 'relationship-damage']
      : type === 'verbal' ? ['emotional-harm', 'conflict-escalation']
      : type === 'relational' ? ['social-isolation', 'reputation-damage']
      : type === 'instrumental' ? ['goal-achievement', 'negative-backlash']
      : ['emotional-release', 'relationship-damage'];
    this._history.push({ op: 'aggression', type, intensity, triggerCount: triggers.length });
    return {
      type,
      perpetrator,
      target,
      intensity: Number(intensity.toFixed(2)),
      triggers,
      consequences,
    };
  }

  socialSupport(type: SocialSupport['type'], provider: string, recipient: string, quality: number = 0.7, duration: number = 10): SocialSupport {
    const effectiveness = quality * 0.8 + duration * 0.01;
    const outcomes = type === 'emotional' ? ['stress-reduction', 'emotional-regulation']
      : type === 'instrumental' ? ['problem-resolution', 'resource-access']
      : type === 'informational' ? ['knowledge-gain', 'decision-quality']
      : ['self-awareness', 'feedback-processing'];
    this._history.push({ op: 'socialSupport', type, effectiveness, quality });
    return {
      type,
      provider,
      recipient,
      quality: Number(quality.toFixed(2)),
      effectiveness: Number(Math.min(1, effectiveness).toFixed(2)),
      outcomes,
    };
  }

  toPacket(): DataPacket<{
    influences: SocialInfluence[];
    groups: Group[];
    attitudes: Attitude[];
    socialIdentities: number;
    intergroupConflicts: IntergroupConflict[];
    prosocialBehaviors: ProsocialBehavior[];
    socialNorms: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'SocialPsychology'],
      priority: 1,
      phase: 'social-psychology',
    };
    return {
      id: `social-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        influences: [...this._influences],
        groups: [...this._groups],
        attitudes: [...this._attitudes],
        socialIdentities: this._socialIdentities.size,
        intergroupConflicts: [...this._intergroupConflicts],
        prosocialBehaviors: [...this._prosocialBehaviors],
        socialNorms: this._socialNorms.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._influences = [];
    this._groups = [];
    this._attitudes = [];
    this._socialIdentities.clear();
    this._intergroupConflicts = [];
    this._prosocialBehaviors = [];
    this._socialNorms.clear();
    this._history = [];
    this._counter = 0;
  }
}