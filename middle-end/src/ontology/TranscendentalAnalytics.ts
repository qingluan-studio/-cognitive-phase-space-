import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface PureConcept {
  id: string;
  name: string;
  type: 'quantity' | 'quality' | 'relation' | 'modality';
  position: number;
  description: string;
  schematized: boolean;
}

export interface SyntheticAporiori {
  id: string;
  statement: string;
  isSynthetic: boolean;
  isAporiori: boolean;
  validity: number;
  groundedIn: string[];
}

export interface IntuitionForm {
  id: string;
  name: string;
  type: 'space' | 'time';
  purity: number;
  description: string;
}

export class TranscendentalAnalytics {
  private _categories: Map<string, PureConcept> = new Map();
  private _syntheticJudgments: Map<string, SyntheticAporiori> = new Map();
  private _formsOfIntuition: Map<string, IntuitionForm> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initTwelveCategories();
    this._initFormsOfIntuition();
  }

  defineCategory(name: string, type: PureConcept['type']): PureConcept {
    const id = `cat-${(++this._counter).toString(36)}`;
    const typeCount = Array.from(this._categories.values()).filter(c => c.type === type).length;
    const category: PureConcept = {
      id,
      name,
      type,
      position: typeCount,
      description: `Pure concept of ${type}: ${name}`,
      schematized: false,
    };
    this._categories.set(id, category);
    this._recordHistory(`defineCategory:${name}:${type}`);
    return category;
  }

  schematize(categoryId: string): PureConcept | null {
    const category = this._categories.get(categoryId);
    if (!category) return null;

    category.schematized = true;
    category.description = `${category.description} (schematized through time)`;

    this._recordHistory(`schematize:${category.name}`);
    return category;
  }

  syntheticAporiori(statement: string): SyntheticAporiori {
    const id = `sa-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;

    const hasIntuitionForm = Array.from(this._formsOfIntuition.values()).some(f =>
      statement.toLowerCase().includes(f.name.toLowerCase())
    );

    const hasCategory = Array.from(this._categories.values()).some(c =>
      statement.toLowerCase().includes(c.name.toLowerCase())
    );

    const judgment: SyntheticAporiori = {
      id,
      statement,
      isSynthetic: true,
      isAporiori: hasIntuitionForm || hasCategory,
      validity: hasIntuitionForm && hasCategory ? 0.9 : hasIntuitionForm || hasCategory ? 0.6 : 0.3,
      groundedIn: [],
    };

    if (hasIntuitionForm) {
      judgment.groundedIn.push('forms of intuition');
    }
    if (hasCategory) {
      judgment.groundedIn.push('pure concepts');
    }

    this._syntheticJudgments.set(id, judgment);
    this._recordHistory(`syntheticAporiori:${statement.substring(0, 30)}`);
    return judgment;
  }

  transcendentalDeduction(): { valid: boolean; justification: string; categoryCount: number } {
    const schematizedCount = Array.from(this._categories.values()).filter(c => c.schematized).length;
    const totalCategories = this._categories.size;
    const valid = schematizedCount >= 12;

    return {
      valid,
      justification: valid
        ? 'All categories are schematized; transcendental deduction complete. Categories apply to appearances because they make experience possible.'
        : `${schematizedCount}/${totalCategories} categories schematized. Transcendental deduction requires all pure concepts to be schematized through time.`,
      categoryCount: totalCategories,
    };
  }

  antinomy(thesis: string, antithesis: string): {
    thesis: string;
    antithesis: string;
    resolution: string;
    type: 'mathematical' | 'dynamical';
    canBeResolved: boolean;
  } {
    const mathematicalKeywords = ['infinite', 'finite', 'simple', 'composite', 'beginning', 'world'];
    const isMathematical = mathematicalKeywords.some(k =>
      thesis.toLowerCase().includes(k) || antithesis.toLowerCase().includes(k)
    );

    const type = isMathematical ? 'mathematical' : 'dynamical';
    const canBeResolved = type === 'dynamical';

    const resolution = isMathematical
      ? 'Both thesis and antithesis are false. Reason oversteps its bounds when it tries to speak of the world as a whole.'
      : 'Both thesis and antithesis can be true if we distinguish between phenomena and noumena. Freedom applies to the intelligible character; determinism applies to the empirical character.';

    this._recordHistory(`antinomy:${type}`);
    return {
      thesis,
      antithesis,
      resolution,
      type,
      canBeResolved,
    };
  }

  transcendentalUnity(apperception: string): { unity: number; conditions: string[] } {
    const conditions = [
      'synthesis of apprehension in intuition',
      'synthesis of reproduction in imagination',
      'synthesis of recognition in concepts',
    ];

    const unityScore = 0.5 + conditions.length * 0.15;

    this._recordHistory(`transcendentalUnity:${apperception.substring(0, 20)}`);
    return {
      unity: Math.min(1, unityScore),
      conditions,
    };
  }

  getTableOfCategories(): PureConcept[][] {
    const types: PureConcept['type'][] = ['quantity', 'quality', 'relation', 'modality'];
    return types.map(type =>
      Array.from(this._categories.values())
        .filter(c => c.type === type)
        .sort((a, b) => a.position - b.position)
    );
  }

  categoryOfType(type: PureConcept['type']): PureConcept[] {
    return Array.from(this._categories.values())
      .filter(c => c.type === type)
      .sort((a, b) => a.position - b.position);
  }

  schematizedCount(): number {
    return Array.from(this._categories.values()).filter(c => c.schematized).length;
  }

  unschematizedCount(): number {
    return Array.from(this._categories.values()).filter(c => !c.schematized).length;
  }

  allCategoriesSchematized(): boolean {
    return Array.from(this._categories.values()).every(c => c.schematized);
  }

  analyticJudgment(statement: string): {
    isAnalytic: boolean;
    explanation: string;
  } {
    const subjectPredicate = statement.split(/ is | are | = /);
    if (subjectPredicate.length < 2) {
      return { isAnalytic: false, explanation: 'Cannot identify subject and predicate' };
    }

    const [subject, predicate] = subjectPredicate;
    const subjectLower = subject.toLowerCase().trim();
    const predicateLower = predicate.toLowerCase().trim();

    const analyticRelations: Record<string, string[]> = {
      'bachelor': ['unmarried', 'male', 'man'],
      'triangle': ['three-sided', 'three angles', 'shape'],
      'body': ['extended', 'spatial'],
      'mind': ['thinking', 'conscious'],
    };

    const isAnalytic = Object.entries(analyticRelations).some(([subj, preds]) =>
      subjectLower.includes(subj) && preds.some(p => predicateLower.includes(p))
    );

    return {
      isAnalytic,
      explanation: isAnalytic
        ? 'Predicate is contained in the subject concept'
        : 'Predicate adds new information beyond subject concept',
    };
  }

  syntheticJudgmentCount(): number {
    return this._syntheticJudgments.size;
  }

  aporioriJudgmentCount(): number {
    return Array.from(this._syntheticJudgments.values()).filter(j => j.isAporiori).length;
  }

  empiricalJudgmentCount(): number {
    return Array.from(this._syntheticJudgments.values()).filter(j => !j.isAporiori).length;
  }

  antinomyOfPureReason(type: string): {
    thesis: string;
    antithesis: string;
    resolution: string;
    mathematical: boolean;
  } {
    const antinomies: Record<string, { thesis: string; antithesis: string; resolution: string; mathematical: boolean }> = {
      'quantity': {
        thesis: 'The world has a beginning in time and is limited in space.',
        antithesis: 'The world has no beginning and no limits in space.',
        resolution: 'Both are false; the world as a whole is not an object of experience.',
        mathematical: true,
      },
      'quality': {
        thesis: 'Every composite substance is made of simple parts.',
        antithesis: 'No composite thing is made of simple parts.',
        resolution: 'Both are false; division is only potential, not actual.',
        mathematical: true,
      },
      'relation': {
        thesis: 'There is free causality in addition to natural laws.',
        antithesis: 'Everything happens according to natural laws only.',
        resolution: 'Both can be true; freedom applies to noumena, determinism to phenomena.',
        mathematical: false,
      },
      'modality': {
        thesis: 'There is an absolutely necessary being in the world.',
        antithesis: 'No absolutely necessary being exists anywhere.',
        resolution: 'Both can be true as regulative ideas of reason.',
        mathematical: false,
      },
    };

    return antinomies[type] || antinomies['quantity'];
  }

  paralogismsOfRationalPsychology(): {
    paralogisms: string[];
    critique: string;
  } {
    return {
      paralogisms: [
        'Substantiality: The soul is a substance',
        'Simplicity: The soul is simple',
        'Personality: The soul is a person',
        'Ideality: The soul is distinct from the body',
      ],
      critique: 'These are logical illusions; we confuse the formal unity of apperception with knowledge of a metaphysical substance.',
    };
  }

  idealOfPureReason(): {
    concept: string;
    role: string;
    constitutive: boolean;
  } {
    return {
      concept: 'Ideal of pure reason (God, ens realissimum)',
      role: 'A regulative principle for systematic unity of experience',
      constitutive: false,
    };
  }

  toPacket(): DataPacket {
    return {
      id: `transcendental-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        categories: Array.from(this._categories.values()),
        syntheticJudgments: Array.from(this._syntheticJudgments.values()),
        formsOfIntuition: Array.from(this._formsOfIntuition.values()),
        tableOfCategories: this.getTableOfCategories(),
        deduction: this.transcendentalDeduction(),
        totalCategories: this._categories.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ontology', 'TranscendentalAnalytics'],
        priority: Math.max(1, Math.floor(this._categories.size / 2)),
        phase: 'critiquing',
      },
    };
  }

  reset(): void {
    this._categories.clear();
    this._syntheticJudgments.clear();
    this._formsOfIntuition.clear();
    this._history = [];
    this._counter = 0;
    this._initTwelveCategories();
    this._initFormsOfIntuition();
  }

  get categoryCount(): number {
    return this._categories.size;
  }

  get judgmentCount(): number {
    return this._syntheticJudgments.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initTwelveCategories(): void {
    const categoryGroups: Array<[PureConcept['type'], string[]]> = [
      ['quantity', ['Unity', 'Plurality', 'Totality']],
      ['quality', ['Reality', 'Negation', 'Limitation']],
      ['relation', ['Substance', 'Cause', 'Community']],
      ['modality', ['Possibility', 'Existence', 'Necessity']],
    ];

    for (const [type, names] of categoryGroups) {
      for (let i = 0; i < names.length; i++) {
        const id = `cat-${type}-${i}`;
        this._categories.set(id, {
          id,
          name: names[i],
          type,
          position: i,
          description: `Pure concept of ${type}: ${names[i]}`,
          schematized: false,
        });
      }
    }
  }

  private _initFormsOfIntuition(): void {
    const space: IntuitionForm = {
      id: 'intuition-space',
      name: 'Space',
      type: 'space',
      purity: 1.0,
      description: 'Pure form of outer sense; geometry is grounded in it.',
    };
    const time: IntuitionForm = {
      id: 'intuition-time',
      name: 'Time',
      type: 'time',
      purity: 1.0,
      description: 'Pure form of inner sense; arithmetic is grounded in it.',
    };
    this._formsOfIntuition.set(space.id, space);
    this._formsOfIntuition.set(time.id, time);
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
