import { DataPacket, PacketMeta } from '../shared/types';

export interface DevelopmentalStage {
  readonly stage: string;
  readonly ageRange: [number, number];
  readonly domain: 'physical' | 'cognitive' | 'social' | 'emotional';
  readonly milestones: string[];
  readonly theorists: string[];
}

export interface CognitiveDevelopment {
  readonly stage: string;
  readonly age: number;
  readonly characteristics: string[];
  readonly limitations: string[];
  readonly tasks: string[];
}

export interface SocialDevelopment {
  readonly stage: string;
  readonly age: number;
  readonly socialSkills: string[];
  readonly peerRelationships: string[];
  readonly selfConcept: string[];
}

export interface EmotionalDevelopment {
  readonly stage: string;
  readonly age: number;
  readonly emotions: string[];
  readonly emotionalRegulation: number;
  readonly empathy: number;
  readonly attachment: string;
}

export interface MoralDevelopment {
  readonly stage: number;
  readonly level: string;
  readonly age: number;
  readonly orientation: string;
  readonly reasoning: string[];
}

export interface AttachmentStyle {
  readonly style: 'secure' | 'avoidant' | 'ambivalent' | 'disorganized';
  readonly characteristics: string[];
  readonly outcomes: string[];
  readonly caregiverBehavior: string[];
}

export interface DevelopmentalTask {
  readonly stage: string;
  readonly task: string;
  readonly successfulResolution: string[];
  readonly unsuccessfulResolution: string[];
  readonly psychosocialCrisis: string;
}

export interface DevelopmentalDisorder {
  readonly name: string;
  readonly onsetAge: number;
  readonly characteristics: string[];
  readonly diagnosticCriteria: string[];
  readonly prevalence: number;
}

export interface DevelopmentalMilestone {
  readonly domain: string;
  readonly age: number;
  readonly milestone: string;
  readonly description: string;
  readonly variability: number;
}

export interface ParentingStyle {
  readonly style: 'authoritative' | 'authoritarian' | 'permissive' | 'uninvolved';
  readonly responsiveness: number;
  readonly demandingness: number;
  readonly outcomes: string[];
  readonly communicationPattern: string;
}

export interface PlayDevelopment {
  readonly type: 'sensorimotor' | 'symbolic' | 'constructive' | 'cooperative' | 'competitive';
  readonly ageRange: [number, number];
  readonly characteristics: string[];
  readonly cognitiveBenefits: string[];
  readonly socialBenefits: string[];
}

export interface CognitiveMilestone {
  readonly domain: 'attention' | 'memory' | 'language' | 'problem-solving' | 'reasoning';
  readonly age: number;
  readonly milestone: string;
  readonly description: string;
  readonly typicalPerformance: number;
}

export interface PhysicalDevelopment {
  readonly domain: 'gross-motor' | 'fine-motor' | 'sensory' | 'growth';
  readonly age: number;
  readonly milestone: string;
  readonly description: string;
  readonly genderDifferences: string[];
}

export interface LanguageDevelopment {
  readonly stage: string;
  readonly ageRange: [number, number];
  readonly comprehension: number;
  readonly production: number;
  readonly vocabularySize: number;
  readonly grammaticalComplexity: number;
}

export interface PeerRelationship {
  readonly type: 'playmate' | 'friend' | 'best-friend' | 'romantic';
  readonly ageRange: [number, number];
  readonly characteristics: string[];
  readonly functions: string[];
  readonly impact: string[];
}

export interface IdentityDevelopment {
  readonly stage: string;
  readonly ageRange: [number, number];
  readonly exploration: number;
  readonly commitment: number;
  readonly status: 'diffusion' | 'moratorium' | 'foreclosure' | 'achievement';
  readonly domains: string[];
}

export class DevelopmentalPsychology {
  private _stages: Map<string, DevelopmentalStage> = new Map();
  private _cognitiveStages: Map<string, CognitiveDevelopment> = new Map();
  private _socialStages: Map<string, SocialDevelopment> = new Map();
  private _emotionalStages: Map<string, EmotionalDevelopment> = new Map();
  private _moralStages: MoralDevelopment[] = [];
  private _attachmentStyles: Map<string, AttachmentStyle> = new Map();
  private _developmentalTasks: Map<string, DevelopmentalTask> = new Map();
  private _playStages: Map<string, PlayDevelopment> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  get stageCount(): number { return this._stages.size; }
  get cognitiveStageCount(): number { return this._cognitiveStages.size; }
  get socialStageCount(): number { return this._socialStages.size; }
  get emotionalStageCount(): number { return this._emotionalStages.size; }
  get moralStageCount(): number { return this._moralStages.length; }
  get attachmentStyleCount(): number { return this._attachmentStyles.size; }
  get playStageCount(): number { return this._playStages.size; }

  constructor() {
    this._seedData();
  }

  private _seedData(): void {
    this._cognitiveStages.set('sensorimotor', {
      stage: 'Sensorimotor',
      age: 2,
      characteristics: ['object-permanence', 'goal-directed-behavior', 'circular-reactions'],
      limitations: ['egocentrism', 'no-representational-thought'],
      tasks: ['object-search', 'imitation', 'cause-effect'],
    });
    this._cognitiveStages.set('preoperational', {
      stage: 'Preoperational',
      age: 7,
      characteristics: ['symbolic-thought', 'language-development', 'pretend-play'],
      limitations: ['egocentrism', 'centration', 'irreversibility'],
      tasks: ['conservation', 'perspective-taking', 'classification'],
    });
    this._cognitiveStages.set('concrete-operational', {
      stage: 'Concrete Operational',
      age: 11,
      characteristics: ['conservation', 'reversibility', 'logical-thought'],
      limitations: ['concrete-only', 'abstract-thinking-limited'],
      tasks: ['seriation', 'classification', 'transitivity'],
    });
    this._cognitiveStages.set('formal-operational', {
      stage: 'Formal Operational',
      age: 16,
      characteristics: ['abstract-thinking', 'hypothetical-reasoning', 'metacognition'],
      limitations: ['idealism', 'can-be-naive'],
      tasks: ['hypothetical-deductive-reasoning', 'propositional-thinking'],
    });

    this._attachmentStyles.set('secure', {
      style: 'secure',
      characteristics: ['explores-freely', 'seeks-comfort', 'returns-to-explore'],
      outcomes: ['healthy-social-development', 'good-self-esteem', 'secure-relationships'],
      caregiverBehavior: ['responsive', 'consistent', 'emotionally-available'],
    });
    this._attachmentStyles.set('avoidant', {
      style: 'avoidant',
      characteristics: ['avoids-contact', 'little-distress', 'ignores-caregiver'],
      outcomes: ['difficulty-with-intimacy', 'emotionally-detached'],
      caregiverBehavior: ['unresponsive', 'rejecting', 'inconsistent'],
    });
    this._attachmentStyles.set('ambivalent', {
      style: 'ambivalent',
      characteristics: ['clinging', 'distressed-separation', 'rejects-reunion'],
      outcomes: ['anxious-attachment', 'fearful-of-abandonment'],
      caregiverBehavior: ['inconsistent', 'overprotective', 'unpredictable'],
    });
    this._attachmentStyles.set('disorganized', {
      style: 'disorganized',
      characteristics: ['confused-behavior', 'freezing', 'disoriented'],
      outcomes: ['severe-attachment-issues', 'trauma-symptoms'],
      caregiverBehavior: ['abusive', 'terrifying', 'neglectful'],
    });

    this._moralStages = [
      { stage: 1, level: 'Preconventional', age: 9, orientation: 'punishment-obedience', reasoning: ['avoid-punishment', 'obey-authority'] },
      { stage: 2, level: 'Preconventional', age: 10, orientation: 'instrumental-relativist', reasoning: ['self-interest', 'exchange-benefits'] },
      { stage: 3, level: 'Conventional', age: 13, orientation: 'interpersonal-concordance', reasoning: ['good-boy-good-girl', 'approval-seeking'] },
      { stage: 4, level: 'Conventional', age: 16, orientation: 'law-and-order', reasoning: ['maintain-social-order', 'respect-authority'] },
      { stage: 5, level: 'Postconventional', age: 20, orientation: 'social-contract', reasoning: ['social-agreement', 'individual-rights'] },
      { stage: 6, level: 'Postconventional', age: 25, orientation: 'universal-ethical-principles', reasoning: ['moral-principles', 'conscience'] },
    ];

    this._playStages.set('sensorimotor', {
      type: 'sensorimotor',
      ageRange: [0, 2],
      characteristics: ['exploration', 'object-manipulation', 'simple-repetition'],
      cognitiveBenefits: ['object-permanence', 'cause-effect'],
      socialBenefits: ['caregiver-interaction'],
    });
    this._playStages.set('symbolic', {
      type: 'symbolic',
      ageRange: [2, 7],
      characteristics: ['pretend-play', 'imagination', 'role-taking'],
      cognitiveBenefits: ['symbolic-thought', 'perspective-taking'],
      socialBenefits: ['cooperative-play', 'social-understanding'],
    });
    this._playStages.set('constructive', {
      type: 'constructive',
      ageRange: [4, 10],
      characteristics: ['building', 'creation', 'problem-solving'],
      cognitiveBenefits: ['spatial-reasoning', 'planning'],
      socialBenefits: ['shared-goals', 'collaboration'],
    });
    this._playStages.set('cooperative', {
      type: 'cooperative',
      ageRange: [6, 12],
      characteristics: ['rules', 'roles', 'shared-objectives'],
      cognitiveBenefits: ['executive-function', 'strategic-thinking'],
      socialBenefits: ['teamwork', 'conflict-resolution'],
    });
    this._playStages.set('competitive', {
      type: 'competitive',
      ageRange: [8, 18],
      characteristics: ['competition', 'winning', 'sportsmanship'],
      cognitiveBenefits: ['goal-setting', 'self-regulation'],
      socialBenefits: ['fair-play', 'leadership'],
    });
  }

  piagetStage(age: number): CognitiveDevelopment | null {
    const stages = Array.from(this._cognitiveStages.values());
    const stage = stages.find(s => age <= s.age);
    this._history.push({ op: 'piagetStage', age, stage: stage?.stage });
    return stage ?? null;
  }

  sensorimotorStage(age: number): { substage: string; achievements: string[]; typicalBehavior: string[]; age: number; cognitiveOperations: string[] } {
    const substages = [
      { age: 0, name: 'reflexes', achievements: ['rooting', 'sucking', 'grasping'], behavior: ['automatic-reflexes'], operations: ['innate-reflexes'] },
      { age: 1, name: 'primary-circular-reactions', achievements: ['repeating-pleasurable-actions'], behavior: ['thumb-sucking'], operations: ['sensorimotor-coordination'] },
      { age: 4, name: 'secondary-circular-reactions', achievements: ['repeat-action-effect'], behavior: ['shaking-rattle'], operations: ['object-manipulation'] },
      { age: 8, name: 'coordination-of-secondary-schemes', achievements: ['intentional-behavior', 'object-permanence-emerging'], behavior: ['search-for-hidden-toy'], operations: ['goal-directed-behavior'] },
      { age: 12, name: 'tertiary-circular-reactions', achievements: ['experimentation', 'novel-combinations'], behavior: ['trying-different-ways-to-open-box'], operations: ['trial-and-error'] },
      { age: 18, name: 'mental-representation', achievements: ['object-permanence', 'deferred-imitation'], behavior: ['pretending-to-drink-from-cup'], operations: ['symbolic-representation'] },
    ];
    const substage = substages.find(s => age >= s.age) ?? substages[substages.length - 1];
    this._history.push({ op: 'sensorimotorStage', age, substage: substage.name });
    return {
      substage: substage.name,
      achievements: substage.achievements,
      typicalBehavior: substage.behavior,
      age: substage.age,
      cognitiveOperations: substage.operations,
    };
  }

  preoperationalStage(age: number): { characteristics: string[]; limitations: string[]; cognitiveSkills: string[]; playType: string; egocentricLevel: number } {
    const cognitiveSkills = age < 4 ? ['symbolic-play', 'language-acquisition']
      : age < 6 ? ['drawing-representations', 'counting']
      : ['classification', 'simple-reasoning'];
    const playType = age < 4 ? 'functional-play' : age < 6 ? 'symbolic-play' : 'constructive-play';
    const egocentricLevel = age < 4 ? 0.9 : age < 6 ? 0.7 : 0.5;
    this._history.push({ op: 'preoperationalStage', age, playType, egocentricLevel });
    return {
      characteristics: ['symbolic-thought', 'egocentrism', 'animism', 'centration'],
      limitations: ['irreversibility', 'lack-of-conservation', 'egocentric-thinking'],
      cognitiveSkills,
      playType,
      egocentricLevel: Number(egocentricLevel.toFixed(2)),
    };
  }

  concreteOperationalStage(age: number): { conservation: boolean; logicalOperations: string[]; classificationSkills: string[]; seriation: boolean; reversibility: boolean; deductiveReasoning: number } {
    const conservation = age >= 7;
    const reversibility = age >= 8;
    const logicalOperations = conservation ? ['reversibility', 'decentration', 'conservation'] : ['emerging-logic'];
    const classificationSkills = age >= 8 ? ['hierarchical-classification', 'multiple-classification'] : ['simple-classification'];
    const seriation = age >= 7;
    const deductiveReasoning = age >= 9 ? 0.7 : age >= 7 ? 0.4 : 0.1;
    this._history.push({ op: 'concreteOperationalStage', age, conservation });
    return { conservation, logicalOperations, classificationSkills, seriation, reversibility, deductiveReasoning: Number(deductiveReasoning.toFixed(2)) };
  }

  formalOperationalStage(age: number): { abstractThinking: boolean; hypotheticalReasoning: boolean; metacognition: boolean; cognitiveSkills: string[]; adolescentEgocentrism: boolean; propositionalLogic: number } {
    const abstractThinking = age >= 14;
    const hypotheticalReasoning = age >= 15;
    const metacognition = age >= 16;
    const cognitiveSkills = abstractThinking ? ['systematic-problem-solving', 'propositional-logic', 'metacognitive-awareness'] : ['emerging-abstract-thinking'];
    const adolescentEgocentrism = age >= 12 && age <= 16;
    const propositionalLogic = age >= 15 ? 0.8 : age >= 13 ? 0.5 : 0.2;
    this._history.push({ op: 'formalOperationalStage', age, abstractThinking });
    return { abstractThinking, hypotheticalReasoning, metacognition, cognitiveSkills, adolescentEgocentrism, propositionalLogic: Number(propositionalLogic.toFixed(2)) };
  }

  eriksonStage(age: number): { stage: string; psychosocialCrisis: string; virtue: string; age: number; tasks: string[]; outcomes: { positive: string[]; negative: string[] }; developmentalTask: string } {
    const stages = [
      { age: 1, stage: 'Trust vs Mistrust', crisis: 'trust-mistrust', virtue: 'hope', tasks: ['basic-care', 'consistency'], outcomes: { positive: ['trust', 'security', 'confidence'], negative: ['distrust', 'insecurity', 'fear'] }, task: 'develop-trust' },
      { age: 3, stage: 'Autonomy vs Shame/Doubt', crisis: 'autonomy-shame', virtue: 'will', tasks: ['potty-training', 'self-feeding', 'exploration'], outcomes: { positive: ['autonomy', 'self-control', 'independence'], negative: ['shame', 'doubt', 'low-self-esteem'] }, task: 'develop-autonomy' },
      { age: 6, stage: 'Initiative vs Guilt', crisis: 'initiative-guilt', virtue: 'purpose', tasks: ['play', 'imagination', 'social-interaction'], outcomes: { positive: ['initiative', 'purpose', 'leadership'], negative: ['guilt', 'inhibition', 'passivity'] }, task: 'develop-initiative' },
      { age: 12, stage: 'Industry vs Inferiority', crisis: 'industry-inferiority', virtue: 'competence', tasks: ['school-work', 'skill-development', 'peer-relations'], outcomes: { positive: ['competence', 'achievement', 'confidence'], negative: ['inferiority', 'failure', 'withdrawal'] }, task: 'develop-competence' },
      { age: 18, stage: 'Identity vs Role Confusion', crisis: 'identity-role-confusion', virtue: 'fidelity', tasks: ['self-exploration', 'career-choice', 'value-formation'], outcomes: { positive: ['identity', 'direction', 'commitment'], negative: ['role-confusion', 'identity-diffusion', 'directionlessness'] }, task: 'develop-identity' },
      { age: 40, stage: 'Intimacy vs Isolation', crisis: 'intimacy-isolation', virtue: 'love', tasks: ['relationships', 'commitment', 'social-network'], outcomes: { positive: ['intimacy', 'love', 'connection'], negative: ['isolation', 'loneliness', 'superficial-relations'] }, task: 'develop-intimacy' },
      { age: 65, stage: 'Generativity vs Stagnation', crisis: 'generativity-stagnation', virtue: 'care', tasks: ['parenting', 'mentoring', 'legacy'], outcomes: { positive: ['generativity', 'purpose', 'legacy'], negative: ['stagnation', 'self-absorption', 'boredom'] }, task: 'develop-generativity' },
      { age: 80, stage: 'Ego Integrity vs Despair', crisis: 'integrity-despair', virtue: 'wisdom', tasks: ['life-review', 'acceptance', 'meaning-making'], outcomes: { positive: ['integrity', 'wisdom', 'acceptance'], negative: ['despair', 'regret', 'bitterness'] }, task: 'develop-integrity' },
    ];
    const stage = stages.find(s => age <= s.age) ?? stages[stages.length - 1];
    this._history.push({ op: 'eriksonStage', age, stage: stage.stage });
    return {
      stage: stage.stage,
      psychosocialCrisis: stage.crisis,
      virtue: stage.virtue,
      age: stage.age,
      tasks: stage.tasks,
      outcomes: stage.outcomes,
      developmentalTask: stage.task,
    };
  }

  attachment(style: 'secure' | 'avoidant' | 'ambivalent' | 'disorganized'): AttachmentStyle | null {
    const attachment = this._attachmentStyles.get(style);
    this._history.push({ op: 'attachment', style });
    return attachment ?? null;
  }

  strangeSituation(behavior: string[]): { attachmentStyle: string; classification: string; indicators: string[]; implications: string[]; maternalSensitivity: number } {
    const avoidantIndicators = ['little-distress', 'avoids-caregiver', 'no-preference-stranger'];
    const ambivalentIndicators = ['intense-distress', 'clinging', 'rejects-reunion'];
    const disorganizedIndicators = ['confused', 'freezing', 'disoriented'];
    const secureIndicators = ['moderate-distress', 'seeks-comfort', 'returns-to-explore'];

    let style = 'secure';
    let classification = 'B';
    let indicators: string[] = [];

    if (behavior.some(b => disorganizedIndicators.includes(b))) {
      style = 'disorganized';
      classification = 'D';
      indicators = disorganizedIndicators;
    } else if (behavior.some(b => ambivalentIndicators.includes(b))) {
      style = 'ambivalent';
      classification = 'C';
      indicators = ambivalentIndicators;
    } else if (behavior.some(b => avoidantIndicators.includes(b))) {
      style = 'avoidant';
      classification = 'A';
      indicators = avoidantIndicators;
    } else {
      indicators = secureIndicators;
    }

    const implications = style === 'secure' ? ['positive-outcomes', 'healthy-social-development']
      : style === 'avoidant' ? ['emotional-distance', 'trust-issues']
      : style === 'ambivalent' ? ['anxiety', 'fear-of-abandonment']
      : ['severe-attachment-issues', 'trauma-risk'];

    const maternalSensitivity = style === 'secure' ? 0.85 : style === 'avoidant' ? 0.4 : style === 'ambivalent' ? 0.5 : 0.2;

    this._history.push({ op: 'strangeSituation', style, classification });
    return { attachmentStyle: style, classification, indicators, implications, maternalSensitivity: Number(maternalSensitivity.toFixed(2)) };
  }

  moralDevelopment(kohlbergStage: number): MoralDevelopment | null {
    const stage = this._moralStages.find(s => s.stage === kohlbergStage);
    this._history.push({ op: 'moralDevelopment', stage: kohlbergStage });
    return stage ?? null;
  }

  moralReasoning(scenario: string, age: number, moralDomain: 'harm' | 'fairness' | 'authority' | 'purity' = 'harm'): { stage: number; level: string; reasoning: string[]; justification: string; domainSpecific: number } {
    let stage = 1;
    let level = 'Preconventional';
    let reasoning: string[] = [];

    if (age >= 9 && age < 13) {
      stage = 3;
      level = 'Conventional';
      reasoning = ['approval-seeking', 'maintaining-relations'];
    } else if (age >= 13 && age < 18) {
      stage = 4;
      level = 'Conventional';
      reasoning = ['law-and-order', 'social-order'];
    } else if (age >= 18) {
      stage = 5;
      level = 'Postconventional';
      reasoning = ['social-contract', 'individual-rights'];
    } else {
      reasoning = ['avoid-punishment', 'obedience'];
    }

    const domainSpecific = moralDomain === 'harm' ? 0.8 : moralDomain === 'fairness' ? 0.7 : 0.6;
    const justification = reasoning.join(', ');
    this._history.push({ op: 'moralReasoning', stage, level, moralDomain });
    return { stage, level, reasoning, justification, domainSpecific: Number(domainSpecific.toFixed(2)) };
  }

  vygotskyZone(actualDevelopment: number, potentialDevelopment: number, scaffoldingQuality: number = 0.7): { zoneOfProximalDevelopment: number; scaffoldingNeeded: boolean; supportLevel: string; learningPotential: number; scaffoldingEffect: number } {
    const zpd = potentialDevelopment - actualDevelopment;
    const scaffoldingNeeded = zpd > 0;
    const scaffoldingEffect = scaffoldingQuality * 0.3;
    const supportLevel = zpd > 1 ? 'high-support' : zpd > 0.5 ? 'moderate-support' : 'minimal-support';
    const learningPotential = zpd + scaffoldingEffect;
    this._history.push({ op: 'vygotskyZone', zpd, scaffoldingNeeded });
    return {
      zoneOfProximalDevelopment: Number(zpd.toFixed(2)),
      scaffoldingNeeded,
      supportLevel,
      learningPotential: Number(Math.min(1, learningPotential).toFixed(2)),
      scaffoldingEffect: Number(scaffoldingEffect.toFixed(2)),
    };
  }

  scaffolding(task: string, learnerLevel: number, taskComplexity: number, scaffoldingType: 'direct' | 'guided' | 'collaborative' = 'guided'): { scaffoldingType: string; supportStrategies: string[]; fadingPlan: string[]; successProbability: number; optimalDuration: number } {
    const gap = taskComplexity - learnerLevel;
    let strategies: string[] = [];
    let fading: string[] = [];
    let optimalDuration = 0;

    if (scaffoldingType === 'direct' || gap > 1.5) {
      scaffoldingType = 'direct';
      strategies = ['modeling', 'explicit-guidance', 'step-by-step'];
      fading = ['gradual-release', 'independent-practice'];
      optimalDuration = 8;
    } else if (scaffoldingType === 'guided' || gap > 0.8) {
      scaffoldingType = 'guided';
      strategies = ['questions', 'hints', 'feedback'];
      fading = ['reduced-support', 'self-regulation'];
      optimalDuration = 12;
    } else {
      scaffoldingType = 'collaborative';
      strategies = ['peer-tutoring', 'collaborative-problem-solving'];
      fading = ['independent-work'];
      optimalDuration = 6;
    }

    const successProbability = Math.min(1, 0.5 + (1 - gap) * 0.5);
    this._history.push({ op: 'scaffolding', type: scaffoldingType, successProbability });
    return {
      scaffoldingType,
      supportStrategies: strategies,
      fadingPlan: fading,
      successProbability: Number(successProbability.toFixed(2)),
      optimalDuration,
    };
  }

  parentingStyle(style: ParentingStyle['style']): ParentingStyle {
    const styles: Record<string, ParentingStyle> = {
      authoritative: {
        style: 'authoritative',
        responsiveness: 0.9,
        demandingness: 0.7,
        outcomes: ['high-self-esteem', 'good-social-skills', 'independence', 'academic-success'],
        communicationPattern: 'open-dialogue',
      },
      authoritarian: {
        style: 'authoritarian',
        responsiveness: 0.3,
        demandingness: 0.9,
        outcomes: ['obedience', 'low-self-esteem', 'poor-social-skills', 'rebellion'],
        communicationPattern: 'one-way',
      },
      permissive: {
        style: 'permissive',
        responsiveness: 0.9,
        demandingness: 0.2,
        outcomes: ['low-self-control', 'entitlement', 'poor-self-regulation'],
        communicationPattern: 'lenient',
      },
      uninvolved: {
        style: 'uninvolved',
        responsiveness: 0.2,
        demandingness: 0.2,
        outcomes: ['low-self-esteem', 'behavior-problems', 'attachment-issues'],
        communicationPattern: 'minimal',
      },
    };
    this._history.push({ op: 'parentingStyle', style });
    return styles[style];
  }

  parentingStyleImpact(style: ParentingStyle['style'], childAge: number = 8): { outcomes: string[]; selfEsteem: number; socialSkills: number; academicPerformance: number; behaviorProblems: number; ageEffect: number } {
    const styleData = this.parentingStyle(style);
    const ageEffect = childAge > 12 ? 1.1 : childAge < 5 ? 0.9 : 1;
    const outcomes = styleData.outcomes;
    const selfEsteemMap = { authoritative: 0.85, authoritarian: 0.55, permissive: 0.7, uninvolved: 0.4 };
    const socialSkillsMap = { authoritative: 0.8, authoritarian: 0.5, permissive: 0.65, uninvolved: 0.45 };
    const academicMap = { authoritative: 0.85, authoritarian: 0.7, permissive: 0.55, uninvolved: 0.4 };
    const behaviorMap = { authoritative: 0.2, authoritarian: 0.5, permissive: 0.4, uninvolved: 0.7 };
    this._history.push({ op: 'parentingStyleImpact', style, childAge });
    return {
      outcomes,
      selfEsteem: Number((selfEsteemMap[style] * ageEffect).toFixed(2)),
      socialSkills: Number((socialSkillsMap[style] * ageEffect).toFixed(2)),
      academicPerformance: Number((academicMap[style] * ageEffect).toFixed(2)),
      behaviorProblems: Number((behaviorMap[style] * ageEffect).toFixed(2)),
      ageEffect: Number(ageEffect.toFixed(2)),
    };
  }

  developmentalTasks(eriksonStage: string): DevelopmentalTask | null {
    const tasks: Record<string, DevelopmentalTask> = {
      'Trust vs Mistrust': {
        stage: 'Trust vs Mistrust',
        task: 'develop-trust',
        successfulResolution: ['trust', 'security', 'hope'],
        unsuccessfulResolution: ['distrust', 'fear', 'suspicion'],
        psychosocialCrisis: 'trust-mistrust',
      },
      'Autonomy vs Shame/Doubt': {
        stage: 'Autonomy vs Shame/Doubt',
        task: 'develop-autonomy',
        successfulResolution: ['independence', 'self-control', 'will'],
        unsuccessfulResolution: ['shame', 'doubt', 'dependency'],
        psychosocialCrisis: 'autonomy-shame',
      },
      'Initiative vs Guilt': {
        stage: 'Initiative vs Guilt',
        task: 'develop-initiative',
        successfulResolution: ['purpose', 'direction', 'leadership'],
        unsuccessfulResolution: ['guilt', 'inhibition', 'passivity'],
        psychosocialCrisis: 'initiative-guilt',
      },
      'Industry vs Inferiority': {
        stage: 'Industry vs Inferiority',
        task: 'develop-competence',
        successfulResolution: ['competence', 'achievement', 'confidence'],
        unsuccessfulResolution: ['inferiority', 'failure', 'withdrawal'],
        psychosocialCrisis: 'industry-inferiority',
      },
      'Identity vs Role Confusion': {
        stage: 'Identity vs Role Confusion',
        task: 'develop-identity',
        successfulResolution: ['identity', 'commitment', 'fidelity'],
        unsuccessfulResolution: ['role-confusion', 'identity-diffusion'],
        psychosocialCrisis: 'identity-role-confusion',
      },
      'Intimacy vs Isolation': {
        stage: 'Intimacy vs Isolation',
        task: 'develop-intimacy',
        successfulResolution: ['intimacy', 'love', 'connection'],
        unsuccessfulResolution: ['isolation', 'loneliness'],
        psychosocialCrisis: 'intimacy-isolation',
      },
      'Generativity vs Stagnation': {
        stage: 'Generativity vs Stagnation',
        task: 'develop-generativity',
        successfulResolution: ['generativity', 'legacy', 'purpose'],
        unsuccessfulResolution: ['stagnation', 'self-absorption'],
        psychosocialCrisis: 'generativity-stagnation',
      },
      'Ego Integrity vs Despair': {
        stage: 'Ego Integrity vs Despair',
        task: 'develop-integrity',
        successfulResolution: ['integrity', 'wisdom', 'acceptance'],
        unsuccessfulResolution: ['despair', 'regret'],
        psychosocialCrisis: 'integrity-despair',
      },
    };
    this._history.push({ op: 'developmentalTasks', stage: eriksonStage });
    return tasks[eriksonStage] ?? null;
  }

  developmentalMilestones(age: number, domain: string = ''): DevelopmentalMilestone[] {
    const allMilestones: Record<number, DevelopmentalMilestone[]> = {
      1: [{ domain: 'physical', age: 1, milestone: 'lifts-head', description: 'can lift head when on stomach', variability: 0.3 }],
      3: [{ domain: 'physical', age: 3, milestone: 'rolls-over', description: 'can roll from stomach to back', variability: 0.2 }],
      6: [{ domain: 'physical', age: 6, milestone: 'sits-up', description: 'can sit independently', variability: 0.2 },
          { domain: 'cognitive', age: 6, milestone: 'object-permanence', description: 'understands objects exist when hidden', variability: 0.3 }],
      12: [{ domain: 'physical', age: 12, milestone: 'first-steps', description: 'takes first independent steps', variability: 0.25 },
           { domain: 'language', age: 12, milestone: 'first-words', description: 'says 1-2 words with meaning', variability: 0.3 }],
      24: [{ domain: 'language', age: 24, milestone: 'two-word-phrases', description: 'combines two words', variability: 0.2 },
           { domain: 'social', age: 24, milestone: 'parallel-play', description: 'plays near other children', variability: 0.25 }],
      36: [{ domain: 'cognitive', age: 36, milestone: 'counts-to-10', description: 'can count to 10', variability: 0.3 },
           { domain: 'social', age: 36, milestone: 'cooperative-play', description: 'plays cooperatively with peers', variability: 0.2 }],
      60: [{ domain: 'cognitive', age: 60, milestone: 'conservation', description: 'understands quantity is conserved', variability: 0.3 },
           { domain: 'language', age: 60, milestone: 'complex-sentences', description: 'uses complex sentences', variability: 0.2 }],
      120: [{ domain: 'cognitive', age: 120, milestone: 'formal-operational', description: 'can think abstractly', variability: 0.3 },
            { domain: 'social', age: 120, milestone: 'identity-formation', description: 'develops sense of identity', variability: 0.3 }],
    };
    const ageKey = Object.keys(allMilestones).map(Number).sort((a, b) => b - a).find(a => age >= a);
    const milestones = ageKey ? allMilestones[ageKey] : [];
    const filtered = domain ? milestones.filter(m => m.domain === domain) : milestones;
    this._history.push({ op: 'developmentalMilestones', age, count: filtered.length, domain });
    return filtered;
  }

  developmentalDisorder(disorder: string): DevelopmentalDisorder | null {
    const disorders: Record<string, DevelopmentalDisorder> = {
      'autism-spectrum-disorder': {
        name: 'Autism Spectrum Disorder',
        onsetAge: 3,
        characteristics: ['social-communication-deficits', 'restricted-repetitive-behaviors', 'sensory-processing'],
        diagnosticCriteria: ['social-interaction', 'communication', 'restricted-interests'],
        prevalence: 0.01,
      },
      'adhd': {
        name: 'Attention Deficit Hyperactivity Disorder',
        onsetAge: 7,
        characteristics: ['inattention', 'hyperactivity', 'impulsivity'],
        diagnosticCriteria: ['six-or-more-symptoms', 'impairment-in-two-settings'],
        prevalence: 0.05,
      },
      'dyslexia': {
        name: 'Dyslexia',
        onsetAge: 6,
        characteristics: ['reading-difficulty', 'phonological-processing', 'spelling-difficulty'],
        diagnosticCriteria: ['reading-achievement-below-expected', 'no-other-explanation'],
        prevalence: 0.05,
      },
      'down-syndrome': {
        name: 'Down Syndrome',
        onsetAge: 0,
        characteristics: ['intellectual-disability', 'characteristic-physical-features', 'language-delays'],
        diagnosticCriteria: ['chromosomal-analysis', 'clinical-features'],
        prevalence: 0.001,
      },
      'asd': {
        name: 'Autism Spectrum Disorder',
        onsetAge: 3,
        characteristics: ['social-communication-deficits', 'restricted-repetitive-behaviors', 'sensory-processing'],
        diagnosticCriteria: ['social-interaction', 'communication', 'restricted-interests'],
        prevalence: 0.01,
      },
      'oppositional-defiant': {
        name: 'Oppositional Defiant Disorder',
        onsetAge: 8,
        characteristics: ['argumentative', 'defiant', 'hostile'],
        diagnosticCriteria: ['four-or-more-symptoms', 'six-months-duration'],
        prevalence: 0.03,
      },
      'conduct-disorder': {
        name: 'Conduct Disorder',
        onsetAge: 10,
        characteristics: ['aggression', 'destruction', 'deceitfulness', 'rule-breaking'],
        diagnosticCriteria: ['three-or-more-symptoms', 'twelve-months-duration'],
        prevalence: 0.02,
      },
      'speech-delay': {
        name: 'Speech Sound Disorder',
        onsetAge: 4,
        characteristics: ['articulation-errors', 'phonological-processes'],
        diagnosticCriteria: ['speech-sounds-below-age-expectations'],
        prevalence: 0.03,
      },
    };
    this._history.push({ op: 'developmentalDisorder', disorder });
    return disorders[disorder.toLowerCase()] ?? null;
  }

  puberty(tannerStage: number, gender: 'male' | 'female'): { stage: number; characteristics: string[]; ageRange: [number, number]; hormonalChanges: string[]; psychologicalEffects: string[]; physicalChanges: string[] } {
    const stages: Record<string, { characteristics: string[]; ageRange: [number, number]; hormonal: string[]; psychological: string[]; physical: string[] }> = {
      '1-male': { characteristics: ['prepubertal', 'no-secondary-sex-characteristics'], ageRange: [9, 11], hormonal: ['gonadotropin-releasing-hormone'], psychological: ['pre-adolescent'], physical: ['no-external-changes'] },
      '2-male': { characteristics: ['testicular-enlargement', 'pubic-hair'], ageRange: [11, 13], hormonal: ['testosterone-increase'], psychological: ['early-adolescent', 'body-conscious'], physical: ['growth-spurt-start'] },
      '3-male': { characteristics: ['penile-growth', 'voice-change'], ageRange: [13, 15], hormonal: ['testosterone-peak'], psychological: ['mood-swings', 'identity-exploration'], physical: ['facial-hair-begins', 'acne'] },
      '4-male': { characteristics: ['facial-hair', 'spermarche'], ageRange: [15, 17], hormonal: ['stable-testosterone'], psychological: ['sexual-awareness', 'independence-seeking'], physical: ['axillary-hair', 'muscle-mass-increase'] },
      '5-male': { characteristics: ['adult-secondary-sex-characteristics'], ageRange: [17, 19], hormonal: ['adult-hormonal-levels'], psychological: ['adolescent-maturity'], physical: ['full-body-hair', 'adult-height'] },
      '1-female': { characteristics: ['prepubertal', 'no-secondary-sex-characteristics'], ageRange: [8, 10], hormonal: ['gonadotropin-releasing-hormone'], psychological: ['pre-adolescent'], physical: ['no-external-changes'] },
      '2-female': { characteristics: ['breast-buds', 'pubic-hair'], ageRange: [10, 12], hormonal: ['estrogen-increase'], psychological: ['body-image-concerns', 'early-adolescent'], physical: ['breast-development-start'] },
      '3-female': { characteristics: ['breast-development', 'growth-spurt'], ageRange: [12, 14], hormonal: ['estrogen-peak'], psychological: ['mood-swings', 'menstruation-anticipation'], physical: ['hip-widening', 'body-fat-increase'] },
      '4-female': { characteristics: ['menarche', 'adult-breast-shape'], ageRange: [14, 16], hormonal: ['menstrual-cycle-establishment'], psychological: ['sexual-awareness', 'emotional-intensity'], physical: ['axillary-hair', 'regular-periods'] },
      '5-female': { characteristics: ['adult-secondary-sex-characteristics'], ageRange: [16, 18], hormonal: ['adult-hormonal-levels'], psychological: ['adolescent-maturity'], physical: ['full-breast-development', 'adult-height'] },
    };
    const key = `${tannerStage}-${gender}`;
    const data = stages[key] ?? stages['1-male'];
    this._history.push({ op: 'puberty', stage: tannerStage, gender });
    return {
      stage: tannerStage,
      characteristics: data.characteristics,
      ageRange: data.ageRange,
      hormonalChanges: data.hormonal,
      psychologicalEffects: data.psychological,
      physicalChanges: data.physical,
    };
  }

  aging(age: number, healthStatus: number = 0.7): { stage: string; physicalChanges: string[]; cognitiveChanges: string[]; socialChanges: string[]; psychologicalChanges: string[]; healthConcerns: string[]; healthEffect: number } {
    let stage = '';
    let physical: string[] = [];
    let cognitive: string[] = [];
    let social: string[] = [];
    let psychological: string[] = [];
    let health: string[] = [];

    const healthBonus = healthStatus * 0.2;

    if (age >= 65 && age < 75) {
      stage = 'young-old';
      physical = ['slight-decline-muscle', 'vision-changes', 'hearing-changes'];
      cognitive = ['normal-cognition', 'slight-memory-decline'];
      social = ['retirement', 'social-network-maintenance'];
      psychological = ['life-satisfaction', 'adjustment-to-retirement'];
      health = ['hypertension', 'diabetes'];
    } else if (age >= 75 && age < 85) {
      stage = 'old-old';
      physical = ['muscle-loss', 'mobility-issues', 'chronic-conditions'];
      cognitive = ['memory-decline', 'executive-function-changes'];
      social = ['social-isolation-risk', 'caregiver-need'];
      psychological = ['identity-redefinition', 'loss-adjustment'];
      health = ['arthritis', 'cardiovascular-disease', 'dementia-risk'];
    } else if (age >= 85) {
      stage = 'oldest-old';
      physical = ['frailty', 'dependency', 'multiple-chronic-conditions'];
      cognitive = ['dementia', 'cognitive-impairment'];
      social = ['institutional-care', 'end-of-life'];
      psychological = ['life-review', 'acceptance'];
      health = ['dementia', 'falls', 'infections'];
    } else {
      stage = 'middle-adulthood';
      physical = ['gradual-decline', 'metabolism-slowdown'];
      cognitive = ['peak-cognitive-performance'];
      social = ['career-peak', 'family-responsibilities'];
      psychological = ['midlife-transition', 'generativity'];
      health = ['preventive-care', 'risk-screening'];
    }

    this._history.push({ op: 'aging', stage, age, healthStatus });
    return { stage, physicalChanges: physical, cognitiveChanges: cognitive, socialChanges: social, psychologicalChanges: psychological, healthConcerns: health, healthEffect: Number(healthBonus.toFixed(2)) };
  }

  playDevelopment(age: number): PlayDevelopment | null {
    const stages = Array.from(this._playStages.values());
    const stage = stages.find(s => age >= s.ageRange[0] && age <= s.ageRange[1]);
    this._history.push({ op: 'playDevelopment', age, stage: stage?.type });
    return stage ?? null;
  }

  playTypeImpact(playType: PlayDevelopment['type'], childAge: number): { cognitiveBenefits: string[]; socialBenefits: string[]; emotionalBenefits: string[]; developmentalOutcomes: string[]; ageAppropriate: boolean } {
    const stage = this._playStages.get(playType);
    if (!stage) return { cognitiveBenefits: [], socialBenefits: [], emotionalBenefits: [], developmentalOutcomes: [], ageAppropriate: false };
    const ageAppropriate = childAge >= stage.ageRange[0] && childAge <= stage.ageRange[1];
    const emotionalBenefits = playType === 'sensorimotor' ? ['emotional-regulation', 'security']
      : playType === 'symbolic' ? ['imagination', 'emotional-expression']
      : playType === 'constructive' ? ['persistence', 'self-efficacy']
      : playType === 'cooperative' ? ['empathy', 'conflict-resolution']
      : ['sportsmanship', 'self-esteem'];
    const developmentalOutcomes = stage.cognitiveBenefits.concat(stage.socialBenefits, emotionalBenefits);
    this._history.push({ op: 'playTypeImpact', playType, childAge, ageAppropriate });
    return { cognitiveBenefits: stage.cognitiveBenefits, socialBenefits: stage.socialBenefits, emotionalBenefits, developmentalOutcomes, ageAppropriate };
  }

  cognitiveMilestone(domain: CognitiveMilestone['domain'], age: number): CognitiveMilestone {
    const milestones: Record<string, Record<number, CognitiveMilestone>> = {
      attention: {
        6: { domain: 'attention', age: 6, milestone: 'sustained-attention-5-minutes', description: 'can sustain attention for 5 minutes', typicalPerformance: 0.6 },
        12: { domain: 'attention', age: 12, milestone: 'sustained-attention-15-minutes', description: 'can sustain attention for 15 minutes', typicalPerformance: 0.75 },
        60: { domain: 'attention', age: 60, milestone: 'selective-attention', description: 'can focus on task despite distractions', typicalPerformance: 0.8 },
        120: { domain: 'attention', age: 120, milestone: 'divided-attention', description: 'can attend to multiple tasks', typicalPerformance: 0.7 },
      },
      memory: {
        12: { domain: 'memory', age: 12, milestone: 'object-permanence', description: 'understands objects exist when hidden', typicalPerformance: 0.7 },
        24: { domain: 'memory', age: 24, milestone: 'short-term-memory-2-items', description: 'can remember 2 items', typicalPerformance: 0.6 },
        60: { domain: 'memory', age: 60, milestone: 'working-memory-4-items', description: 'can hold 4 items in working memory', typicalPerformance: 0.7 },
        120: { domain: 'memory', age: 120, milestone: 'strategic-memory', description: 'uses strategies to remember', typicalPerformance: 0.8 },
      },
      language: {
        12: { domain: 'language', age: 12, milestone: 'first-words', description: 'says 1-2 meaningful words', typicalPerformance: 0.6 },
        24: { domain: 'language', age: 24, milestone: 'two-word-phrases', description: 'combines two words', typicalPerformance: 0.7 },
        60: { domain: 'language', age: 60, milestone: 'complex-sentences', description: 'uses complex sentences', typicalPerformance: 0.8 },
        120: { domain: 'language', age: 120, milestone: 'metalinguistic-awareness', description: 'can reflect on language', typicalPerformance: 0.75 },
      },
      'problem-solving': {
        12: { domain: 'problem-solving', age: 12, milestone: 'trial-and-error', description: 'uses trial and error', typicalPerformance: 0.5 },
        24: { domain: 'problem-solving', age: 24, milestone: 'simple-problems', description: 'solves simple problems', typicalPerformance: 0.6 },
        60: { domain: 'problem-solving', age: 60, milestone: 'systematic-problem-solving', description: 'solves problems systematically', typicalPerformance: 0.75 },
        120: { domain: 'problem-solving', age: 120, milestone: 'abstract-problem-solving', description: 'solves abstract problems', typicalPerformance: 0.7 },
      },
      reasoning: {
        60: { domain: 'reasoning', age: 60, milestone: 'transitive-inference', description: 'can do transitive inference', typicalPerformance: 0.6 },
        120: { domain: 'reasoning', age: 120, milestone: 'deductive-reasoning', description: 'can reason deductively', typicalPerformance: 0.75 },
        180: { domain: 'reasoning', age: 180, milestone: 'hypothetical-reasoning', description: 'can reason hypothetically', typicalPerformance: 0.8 },
      },
    };
    const domainMilestones = milestones[domain] || {};
    const ages = Object.keys(domainMilestones).map(Number).sort((a, b) => b - a);
    const ageKey = ages.find(a => age >= a);
    const milestone = ageKey !== undefined ? domainMilestones[ageKey] : { domain, age, milestone: 'emerging', description: 'skill emerging', typicalPerformance: 0.3 };
    this._history.push({ op: 'cognitiveMilestone', domain, age, milestone: milestone.milestone });
    return milestone;
  }

  physicalDevelopment(domain: PhysicalDevelopment['domain'], age: number): PhysicalDevelopment {
    const milestones: Record<string, Record<number, PhysicalDevelopment>> = {
      'gross-motor': {
        1: { domain: 'gross-motor', age: 1, milestone: 'lifts-head', description: 'can lift head when prone', genderDifferences: [] },
        6: { domain: 'gross-motor', age: 6, milestone: 'sits-up', description: 'can sit independently', genderDifferences: [] },
        12: { domain: 'gross-motor', age: 12, milestone: 'first-steps', description: 'takes first steps', genderDifferences: ['girls-slightly-earlier'] },
        24: { domain: 'gross-motor', age: 24, milestone: 'runs', description: 'can run', genderDifferences: [] },
        60: { domain: 'gross-motor', age: 60, milestone: 'jumps', description: 'can jump with both feet', genderDifferences: ['boys-better-coordination'] },
        120: { domain: 'gross-motor', age: 120, milestone: 'sports-skills', description: 'can play organized sports', genderDifferences: ['boys-greater-strength'] },
      },
      'fine-motor': {
        6: { domain: 'fine-motor', age: 6, milestone: 'reaches-for-objects', description: 'can reach and grasp', genderDifferences: [] },
        12: { domain: 'fine-motor', age: 12, milestone: 'pincer-grasp', description: 'can use pincer grasp', genderDifferences: [] },
        24: { domain: 'fine-motor', age: 24, milestone: 'stack-blocks', description: 'can stack 6 blocks', genderDifferences: [] },
        60: { domain: 'fine-motor', age: 60, milestone: 'draws-shapes', description: 'can draw circles and squares', genderDifferences: ['girls-better-fine-motor'] },
        120: { domain: 'fine-motor', age: 120, milestone: 'writes-legibly', description: 'can write legibly', genderDifferences: ['girls-neater-handwriting'] },
      },
      sensory: {
        1: { domain: 'sensory', age: 1, milestone: 'visual-tracking', description: 'can track moving objects', genderDifferences: [] },
        6: { domain: 'sensory', age: 6, milestone: 'object-exploration', description: 'explores objects with senses', genderDifferences: [] },
        24: { domain: 'sensory', age: 24, milestone: 'sensory-discrimination', description: 'can discriminate between senses', genderDifferences: [] },
        60: { domain: 'sensory', age: 60, milestone: 'sensory-integration', description: 'can integrate sensory information', genderDifferences: [] },
      },
      growth: {
        1: { domain: 'growth', age: 1, milestone: 'doubles-birth-weight', description: 'weight doubles by 6 months', genderDifferences: ['boys-slightly-heavier'] },
        12: { domain: 'growth', age: 12, milestone: 'triples-birth-weight', description: 'weight triples by 12 months', genderDifferences: ['boys-slightly-heavier'] },
        60: { domain: 'growth', age: 60, milestone: 'steady-growth', description: 'grows about 5cm per year', genderDifferences: ['girls-slightly-shorter'] },
        120: { domain: 'growth', age: 120, milestone: 'prepubertal-growth', description: 'growth spurt begins', genderDifferences: ['girls-start-earlier'] },
      },
    };
    const domainMilestones = milestones[domain] || {};
    const ages = Object.keys(domainMilestones).map(Number).sort((a, b) => b - a);
    const ageKey = ages.find(a => age >= a);
    const milestone = ageKey !== undefined ? domainMilestones[ageKey] : { domain, age, milestone: 'ongoing', description: 'development ongoing', genderDifferences: [] };
    this._history.push({ op: 'physicalDevelopment', domain, age, milestone: milestone.milestone });
    return milestone;
  }

  languageDevelopment(age: number): LanguageDevelopment {
    if (age <= 12) {
      return { stage: 'prelinguistic', ageRange: [0, 12], comprehension: 0.3, production: 0.1, vocabularySize: 0, grammaticalComplexity: 0 };
    } else if (age <= 24) {
      return { stage: 'one-word', ageRange: [12, 24], comprehension: 0.5, production: 0.2, vocabularySize: 50, grammaticalComplexity: 0.1 };
    } else if (age <= 36) {
      return { stage: 'two-word', ageRange: [24, 36], comprehension: 0.7, production: 0.4, vocabularySize: 200, grammaticalComplexity: 0.2 };
    } else if (age <= 60) {
      return { stage: 'telegraphic', ageRange: [36, 60], comprehension: 0.85, production: 0.6, vocabularySize: 500, grammaticalComplexity: 0.4 };
    } else if (age <= 120) {
      return { stage: 'fluent', ageRange: [60, 120], comprehension: 0.95, production: 0.85, vocabularySize: 2000, grammaticalComplexity: 0.7 };
    } else {
      return { stage: 'metalinguistic', ageRange: [120, 180], comprehension: 1, production: 0.95, vocabularySize: 5000, grammaticalComplexity: 0.9 };
    }
  }

  peerRelationship(age: number): PeerRelationship {
    if (age <= 36) {
      return { type: 'playmate', ageRange: [0, 36], characteristics: ['parallel-play', 'simple-interaction'], functions: ['social-learning', 'play-skills'], impact: ['basic-social-skills'] };
    } else if (age <= 84) {
      return { type: 'friend', ageRange: [36, 84], characteristics: ['shared-interests', 'reciprocity'], functions: ['emotional-support', 'social-comparison'], impact: ['self-esteem', 'social-competence'] };
    } else if (age <= 144) {
      return { type: 'best-friend', ageRange: [84, 144], characteristics: ['intimacy', 'loyalty', 'self-disclosure'], functions: ['identity-exploration', 'emotional-regulation'], impact: ['identity-formation', 'social-support'] };
    } else {
      return { type: 'romantic', ageRange: [144, 180], characteristics: ['romantic-attraction', 'commitment'], functions: ['intimacy-development', 'relationship-skills'], impact: ['attachment-development', 'social-maturity'] };
    }
  }

  identityDevelopment(age: number): IdentityDevelopment {
    if (age <= 120) {
      return { stage: 'identity-diffusion', ageRange: [0, 120], exploration: 0.2, commitment: 0.1, status: 'diffusion', domains: [] };
    } else if (age <= 156) {
      return { stage: 'identity-moratorium', ageRange: [120, 156], exploration: 0.7, commitment: 0.3, status: 'moratorium', domains: ['career', 'values', 'relationships'] };
    } else if (age <= 180) {
      return { stage: 'identity-achievement', ageRange: [156, 180], exploration: 0.8, commitment: 0.7, status: 'achievement', domains: ['career', 'values', 'relationships', 'religion'] };
    } else {
      return { stage: 'identity-maintenance', ageRange: [180, 240], exploration: 0.6, commitment: 0.8, status: 'achievement', domains: ['career', 'family', 'community'] };
    }
  }

  toPacket(): DataPacket<{
    stages: number;
    cognitiveStages: number;
    socialStages: number;
    emotionalStages: number;
    moralStages: number;
    attachmentStyles: number;
    playStages: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'DevelopmentalPsychology'],
      priority: 1,
      phase: 'developmental-psychology',
    };
    return {
      id: `developmental-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        stages: this._stages.size,
        cognitiveStages: this._cognitiveStages.size,
        socialStages: this._socialStages.size,
        emotionalStages: this._emotionalStages.size,
        moralStages: this._moralStages.length,
        attachmentStyles: this._attachmentStyles.size,
        playStages: this._playStages.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._stages.clear();
    this._cognitiveStages.clear();
    this._socialStages.clear();
    this._emotionalStages.clear();
    this._moralStages = [];
    this._attachmentStyles.clear();
    this._developmentalTasks.clear();
    this._playStages.clear();
    this._history = [];
    this._counter = 0;
    this._seedData();
  }
}