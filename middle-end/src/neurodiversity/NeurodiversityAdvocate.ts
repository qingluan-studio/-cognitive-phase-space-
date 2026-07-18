import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type Neurotype = 'autistic' | 'adhd' | 'dyslexic' | 'synesthetic' | 'neurotypical' | 'mixed';

export interface NeurotypeProfile {
  id: string;
  name: string;
  neurotype: Neurotype;
  strengths: string[];
  challenges: string[];
  accommodations: string[];
  representationScore: number;
}

export interface AdvocacyInitiative {
  id: string;
  name: string;
  description: string;
  target: string;
  progress: number;
  supporters: string[];
  status: 'planning' | 'active' | 'completed' | 'paused';
  createdAt: number;
}

export interface InclusiveDesign {
  id: string;
  feature: string;
  neurotypesSupported: Neurotype[];
  accessibilityScore: number;
  implementationStatus: number;
  userFeedback: FeedbackEntry[];
}

export interface FeedbackEntry {
  id: string;
  neurotype: Neurotype;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface Accommodation {
  id: string;
  name: string;
  description: string;
  category: 'sensory' | 'cognitive' | 'motor' | 'social' | 'communication';
  effectiveness: number;
  effort: number;
  neurotypes: Neurotype[];
}

export interface CollaborationSpace {
  id: string;
  name: string;
  members: Map<string, NeurotypeProfile>;
  projects: string[];
  communicationNorms: string[];
  sensoryAdjustments: string[];
  tools: string[];
  inclusionScore: number;
}

export interface DiversityMetrics {
  neurotypeDistribution: Record<Neurotype, number>;
  representationRatio: number;
  inclusionScore: number;
  accessibilityScore: number;
  accommodationAdoption: number;
  senseOfBelonging: number;
}

export interface AdvocacyResult {
  initiativeId: string;
  impact: number;
  reach: number;
  livesImproved: number;
  policyChanges: string[];
  awarenessRaised: number;
}

export class NeurodiversityAdvocate {
  private _profiles: Map<string, NeurotypeProfile>;
  private _initiatives: Map<string, AdvocacyInitiative>;
  private _designs: Map<string, InclusiveDesign>;
  private _accommodations: Map<string, Accommodation>;
  private _spaces: Map<string, CollaborationSpace>;
  private _currentSpace: string | null;
  private _advocacyHistory: AdvocacyResult[];
  private _baseInclusionScore: number;

  constructor(baseInclusionScore: number = 0.5) {
    this._profiles = new Map();
    this._initiatives = new Map();
    this._designs = new Map();
    this._accommodations = new Map();
    this._spaces = new Map();
    this._currentSpace = null;
    this._advocacyHistory = [];
    this._baseInclusionScore = baseInclusionScore;
    this._initializeDefaultAccommodations();
  }

  get profileCount(): number { return this._profiles.size; }
  get initiativeCount(): number { return this._initiatives.size; }
  get designCount(): number { return this._designs.size; }
  get accommodationCount(): number { return this._accommodations.size; }
  get spaceCount(): number { return this._spaces.size; }
  get currentSpace(): string | null { return this._currentSpace; }

  public registerProfile(id: string, name: string, neurotype: Neurotype): NeurotypeProfile {
    const profile: NeurotypeProfile = {
      id,
      name,
      neurotype,
      strengths: this._getStrengths(neurotype),
      challenges: this._getChallenges(neurotype),
      accommodations: this._getDefaultAccommodations(neurotype),
      representationScore: this._calculateRepresentation(neurotype)
    };

    this._profiles.set(id, profile);
    return profile;
  }

  public createInitiative(
    name: string,
    description: string,
    target: string
  ): AdvocacyInitiative {
    const initiative: AdvocacyInitiative = {
      id: `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      target,
      progress: 0,
      supporters: [],
      status: 'planning',
      createdAt: Date.now()
    };

    this._initiatives.set(initiative.id, initiative);
    return initiative;
  }

  public joinInitiative(initiativeId: string, profileId: string): boolean {
    const initiative = this._initiatives.get(initiativeId);
    const profile = this._profiles.get(profileId);

    if (!initiative || !profile) return false;

    if (!initiative.supporters.includes(profileId)) {
      initiative.supporters.push(profileId);
    }

    if (initiative.status === 'planning' && initiative.supporters.length >= 3) {
      initiative.status = 'active';
    }

    return true;
  }

  public advanceInitiative(initiativeId: string, amount: number): boolean {
    const initiative = this._initiatives.get(initiativeId);
    if (!initiative) return false;

    initiative.progress = Math.min(1, initiative.progress + amount);

    if (initiative.progress >= 1) {
      initiative.status = 'completed';
      const result = this._generateAdvocacyResult(initiative);
      this._advocacyHistory.push(result);
    }

    return true;
  }

  public createInclusiveDesign(
    feature: string,
    neurotypes: Neurotype[]
  ): InclusiveDesign {
    const design: InclusiveDesign = {
      id: `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      feature,
      neurotypesSupported: neurotypes,
      accessibilityScore: this._calculateAccessibility(neurotypes),
      implementationStatus: 0,
      userFeedback: []
    };

    this._designs.set(design.id, design);
    return design;
  }

  public addFeedback(
    designId: string,
    profileId: string,
    rating: number,
    comment: string
  ): boolean {
    const design = this._designs.get(designId);
    const profile = this._profiles.get(profileId);

    if (!design || !profile) return false;

    design.userFeedback.push({
      id: `feedback-${Date.now()}`,
      neurotype: profile.neurotype,
      rating,
      comment,
      timestamp: Date.now()
    });

    const avgRating = design.userFeedback.reduce((s, f) => s + f.rating, 0) / design.userFeedback.length;
    design.accessibilityScore = (design.accessibilityScore + avgRating / 5) / 2;

    return true;
  }

  public createSpace(name: string): CollaborationSpace {
    const space: CollaborationSpace = {
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      members: new Map(),
      projects: [],
      communicationNorms: [
        'Use clear, direct language',
        'Allow processing time',
        'Respect sensory needs',
        'Multiple communication formats available'
      ],
      sensoryAdjustments: [
        'Adjustable lighting',
        'Quiet areas available',
        'Sound-dampening options',
        'Fidget tools available'
      ],
      tools: [
        'Visual schedules',
        'Task breakdown templates',
        'Noise-canceling options',
        'Text-to-speech support'
      ],
      inclusionScore: this._baseInclusionScore
    };

    this._spaces.set(space.id, space);
    if (!this._currentSpace) {
      this._currentSpace = space.id;
    }

    return space;
  }

  public selectSpace(spaceId: string): boolean {
    if (this._spaces.has(spaceId)) {
      this._currentSpace = spaceId;
      return true;
    }
    return false;
  }

  public addToSpace(spaceId: string, profileId: string): boolean {
    const space = this._spaces.get(spaceId);
    const profile = this._profiles.get(profileId);

    if (!space || !profile) return false;

    space.members.set(profileId, profile);
    this._updateSpaceInclusion(space);
    return true;
  }

  public addAccommodation(accommodation: Accommodation): void {
    this._accommodations.set(accommodation.id, accommodation);
  }

  public recommendAccommodations(profileId: string): Accommodation[] {
    const profile = this._profiles.get(profileId);
    if (!profile) return [];

    const recommendations: Accommodation[] = [];
    for (const acc of this._accommodations.values()) {
      if (acc.neurotypes.includes(profile.neurotype)) {
        recommendations.push(acc);
      }
    }

    return recommendations.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  public calculateDiversityMetrics(spaceId?: string): DiversityMetrics {
    const space = spaceId ? this._spaces.get(spaceId) : null;
    const profiles = space ? Array.from(space.members.values()) : Array.from(this._profiles.values());

    const distribution: Record<Neurotype, number> = {
      autistic: 0,
      adhd: 0,
      dyslexic: 0,
      synesthetic: 0,
      neurotypical: 0,
      mixed: 0
    };

    for (const profile of profiles) {
      distribution[profile.neurotype] = (distribution[profile.neurotype] || 0) + 1;
    }

    const total = profiles.length || 1;
    const representedNeurotypes = Object.values(distribution).filter(v => v > 0).length;
    const representationRatio = representedNeurotypes / 6;

    const avgRepresentation = profiles.reduce((s, p) => s + p.representationScore, 0) / total;
    const inclusionScore = space ? space.inclusionScore : this._baseInclusionScore;

    const accommodationAdoption = this._calculateAccommodationAdoption(profiles);

    return {
      neurotypeDistribution: distribution,
      representationRatio,
      inclusionScore: (inclusionScore + avgRepresentation) / 2,
      accessibilityScore: this._calculateOverallAccessibility(),
      accommodationAdoption,
      senseOfBelonging: this._calculateBelonging(profiles)
    };
  }

  public facilitateCollaboration(
    spaceId: string,
    task: string,
    units: KnowledgeUnit[]
  ): {
    task: string;
    roleAssignments: Map<string, string>;
    expectedSynergy: number;
    accommodations: string[];
  } {
    const space = this._spaces.get(spaceId);
    if (!space) {
      return {
        task,
        roleAssignments: new Map(),
        expectedSynergy: 0,
        accommodations: []
      };
    }

    const members = Array.from(space.members.values());
    const roleAssignments = new Map<string, string>();

    const roles = [
      'pattern-detector',
      'big-picture-thinker',
      'detail-specialist',
      'creative-synthesizer',
      'communicator',
      'organizer'
    ];

    for (let i = 0; i < members.length; i++) {
      const role = this._matchRole(members[i], roles[i % roles.length]);
      roleAssignments.set(members[i].id, role);
    }

    const synergy = this._calculateSynergy(members);
    const accommodations = this._collectAccommodations(members);

    return {
      task,
      roleAssignments,
      expectedSynergy: synergy,
      accommodations
    };
  }

  public raiseAwareness(topic: string, audienceSize: number): AdvocacyResult {
    const result: AdvocacyResult = {
      initiativeId: `awareness-${Date.now()}`,
      impact: Math.min(1, audienceSize / 1000),
      reach: audienceSize,
      livesImproved: Math.floor(audienceSize * 0.1),
      policyChanges: [],
      awarenessRaised: 0.1 + Math.random() * 0.3
    };

    this._advocacyHistory.push(result);
    return result;
  }

  public assessInclusion(spaceId?: string): {
    score: number;
    strengths: string[];
    improvements: string[];
  } {
    const metrics = this.calculateDiversityMetrics(spaceId);
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (metrics.representationRatio > 0.5) {
      strengths.push('Strong neurotype representation');
    } else {
      improvements.push('Increase neurotype diversity');
    }

    if (metrics.inclusionScore > 0.7) {
      strengths.push('High sense of inclusion');
    } else {
      improvements.push('Improve inclusion practices');
    }

    if (metrics.accessibilityScore > 0.6) {
      strengths.push('Good accessibility support');
    } else {
      improvements.push('Enhance accessibility features');
    }

    if (metrics.accommodationAdoption > 0.5) {
      strengths.push('Accommodations well-adopted');
    } else {
      improvements.push('Increase accommodation availability');
    }

    return {
      score: (metrics.inclusionScore + metrics.representationRatio + metrics.accessibilityScore) / 3,
      strengths,
      improvements
    };
  }

  private _getStrengths(neurotype: Neurotype): string[] {
    const strengthsMap: Record<Neurotype, string[]> = {
      autistic: [
        'Pattern recognition excellence',
        'Deep focus and concentration',
        'Attention to detail',
        'Systematic thinking',
        'Honest and direct communication',
        'Loyalty and reliability'
      ],
      adhd: [
        'Creative thinking',
        'Hyperfocus on interests',
        'High energy and enthusiasm',
        'Spontaneity and flexibility',
        'Ability to think outside the box',
        'Rapid idea generation'
      ],
      dyslexic: [
        'Strong visual thinking',
        'Holistic perspective',
        'Creativity and innovation',
        'Storytelling ability',
        'Spatial reasoning',
        'Entrepreneurial thinking'
      ],
      synesthetic: [
        'Enhanced memory',
        'Cross-modal creativity',
        'Unique perceptual insights',
        'Artistic expression',
        'Pattern recognition across domains',
        'Vivid imagination'
      ],
      neurotypical: [
        'Social intuition',
        'Conventional communication skills',
        'Standard executive function',
        'Group coordination ability',
        'Emotional regulation',
        'Routine adherence'
      ],
      mixed: [
        'Multiple perspective integration',
        'Adaptable thinking styles',
        'Diverse problem-solving approaches',
        'Cross-neurotype understanding',
        'Creative synthesis',
        'Flexible processing'
      ]
    };
    return strengthsMap[neurotype] || [];
  }

  private _getChallenges(neurotype: Neurotype): string[] {
    const challengesMap: Record<Neurotype, string[]> = {
      autistic: [
        'Social communication differences',
        'Sensory processing sensitivity',
        'Change and transition difficulty',
        'Executive function challenges',
        'Masking and burnout',
        'Misunderstanding from others'
      ],
      adhd: [
        'Task initiation difficulty',
        'Distractibility',
        'Time management challenges',
        'Working memory limits',
        'Emotional regulation',
        'Task switching costs'
      ],
      dyslexic: [
        'Reading and writing challenges',
        'Spelling difficulties',
        'Processing speed for text',
        'Working memory for language',
        'Organization of written work',
        'Standard testing bias'
      ],
      synesthetic: [
        'Sensory overload potential',
        'Difficulty explaining perceptions',
        'Potential distraction from synesthesia',
        'Individual variability',
        'Limited understanding from others',
        'Variable intensity'
      ],
      neurotypical: [
        'May miss unconventional patterns',
        'Less flexible thinking in some domains',
        'Assuming others think similarly',
        'Difficulty with neurodivergent communication',
        'Underestimating sensory challenges',
        'Bias toward "normal" approaches'
      ],
      mixed: [
        'Variable challenges by context',
        'Difficulty categorizing needs',
        'Fluctuating capacity',
        'Multiple accommodation needs',
        'Complex self-understanding',
        'Varied support requirements'
      ]
    };
    return challengesMap[neurotype] || [];
  }

  private _getDefaultAccommodations(neurotype: Neurotype): string[] {
    const accMap: Record<Neurotype, string[]> = {
      autistic: ['sensory supports', 'predictable schedules', 'clear communication', 'quiet spaces'],
      adhd: ['time management tools', 'breaking tasks down', 'flexible deadlines', 'movement options'],
      dyslexic: ['text-to-speech', 'visual aids', 'extra time', 'audio materials'],
      synesthetic: ['sensory considerations', 'color-coding options', 'reduced visual clutter'],
      neurotypical: ['standard accommodations', 'clear expectations'],
      mixed: ['individualized approach', 'multiple support options', 'flexible accommodations']
    };
    return accMap[neurotype] || [];
  }

  private _calculateRepresentation(neurotype: Neurotype): number {
    const baseRepresentation: Record<Neurotype, number> = {
      autistic: 0.02,
      adhd: 0.05,
      dyslexic: 0.1,
      synesthetic: 0.04,
      neurotypical: 0.7,
      mixed: 0.05
    };
    return baseRepresentation[neurotype] || 0.05;
  }

  private _initializeDefaultAccommodations(): void {
    const defaults: Accommodation[] = [
      {
        id: 'acc-quiet-space',
        name: 'Quiet Work Space',
        description: 'A low-stimulation environment for focused work',
        category: 'sensory',
        effectiveness: 0.85,
        effort: 0.3,
        neurotypes: ['autistic', 'adhd', 'synesthetic']
      },
      {
        id: 'acc-flexible-schedule',
        name: 'Flexible Schedule',
        description: 'Adjustable working hours and deadlines',
        category: 'cognitive',
        effectiveness: 0.8,
        effort: 0.4,
        neurotypes: ['adhd', 'autistic', 'dyslexic']
      },
      {
        id: 'acc-text-to-speech',
        name: 'Text-to-Speech Tools',
        description: 'Audio versions of written materials',
        category: 'communication',
        effectiveness: 0.75,
        effort: 0.2,
        neurotypes: ['dyslexic', 'autistic', 'adhd']
      },
      {
        id: 'acc-sensory-tools',
        name: 'Sensory Tools',
        description: 'Fidget tools, noise-canceling headphones, etc.',
        category: 'sensory',
        effectiveness: 0.7,
        effort: 0.1,
        neurotypes: ['autistic', 'adhd', 'synesthetic']
      },
      {
        id: 'acc-task-breakdown',
        name: 'Task Breakdown Support',
        description: 'Assistance breaking large tasks into manageable steps',
        category: 'cognitive',
        effectiveness: 0.8,
        effort: 0.3,
        neurotypes: ['adhd', 'autistic', 'dyslexic']
      }
    ];

    for (const acc of defaults) {
      this._accommodations.set(acc.id, acc);
    }
  }

  private _calculateAccessibility(neurotypes: Neurotype[]): number {
    const coverage = neurotypes.length / 6;
    return Math.min(1, coverage * 0.7 + 0.3);
  }

  private _updateSpaceInclusion(space: CollaborationSpace): void {
    const members = Array.from(space.members.values());
    const uniqueTypes = new Set(members.map(m => m.neurotype)).size;
    const diversityBonus = uniqueTypes / 6 * 0.3;
    space.inclusionScore = Math.min(1, this._baseInclusionScore + diversityBonus);
  }

  private _calculateAccommodationAdoption(profiles: NeurotypeProfile[]): number {
    if (profiles.length === 0) return 0;
    const totalAcc = profiles.reduce((s, p) => s + p.accommodations.length, 0);
    return Math.min(1, totalAcc / (profiles.length * 4));
  }

  private _calculateOverallAccessibility(): number {
    if (this._designs.size === 0) return this._baseInclusionScore;
    const avg = Array.from(this._designs.values()).reduce((s, d) => s + d.accessibilityScore, 0);
    return avg / this._designs.size;
  }

  private _calculateBelonging(profiles: NeurotypeProfile[]): number {
    if (profiles.length < 2) return 0.5;
    const uniqueTypes = new Set(profiles.map(p => p.neurotype)).size;
    return 0.4 + (uniqueTypes / 6) * 0.6;
  }

  private _matchRole(profile: NeurotypeProfile, suggestedRole: string): string {
    const strengthRoles: Record<string, string[]> = {
      'pattern-detector': ['autistic', 'synesthetic'],
      'big-picture-thinker': ['adhd', 'dyslexic'],
      'detail-specialist': ['autistic'],
      'creative-synthesizer': ['adhd', 'synesthetic', 'mixed'],
      'communicator': ['neurotypical'],
      'organizer': ['autistic', 'neurotypical']
    };

    for (const [role, types] of Object.entries(strengthRoles)) {
      if (types.includes(profile.neurotype)) {
        return role;
      }
    }
    return suggestedRole;
  }

  private _calculateSynergy(members: NeurotypeProfile[]): number {
    if (members.length < 2) return 0.5;

    const uniqueTypes = new Set(members.map(m => m.neurotype)).size;
    const diversityBonus = Math.min(1, uniqueTypes / 4) * 0.3;

    let totalStrengths = 0;
    const allStrengths = new Set<string>();
    for (const member of members) {
      for (const strength of member.strengths) {
        allStrengths.add(strength);
      }
      totalStrengths += member.strengths.length;
    }

    const coverageBonus = Math.min(1, allStrengths.size / 10) * 0.3;
    const base = 0.4;

    return Math.min(1, base + diversityBonus + coverageBonus);
  }

  private _collectAccommodations(members: NeurotypeProfile[]): string[] {
    const allAcc = new Set<string>();
    for (const member of members) {
      for (const acc of member.accommodations) {
        allAcc.add(acc);
      }
    }
    return Array.from(allAcc);
  }

  private _generateAdvocacyResult(initiative: AdvocacyInitiative): AdvocacyResult {
    return {
      initiativeId: initiative.id,
      impact: initiative.progress,
      reach: initiative.supporters.length * 10,
      livesImproved: Math.floor(initiative.supporters.length * 5),
      policyChanges: [initiative.target],
      awarenessRaised: 0.5 + Math.random() * 0.3
    };
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<DiversityMetrics> {
    const spaceId = packet.metadata.phase;
    if (!this._spaces.has(spaceId)) {
      this.createSpace(`Space-${spaceId}`);
      this.selectSpace(spaceId);
    }

    const neurotypes: Neurotype[] = ['autistic', 'adhd', 'dyslexic', 'synesthetic', 'neurotypical', 'mixed'];
    for (let i = 0; i < packet.payload.length; i++) {
      const ku = packet.payload[i];
      const neurotype = neurotypes[i % neurotypes.length];
      this.registerProfile(ku.id, ku.content.substring(0, 20), neurotype);
      this.addToSpace(spaceId, ku.id);
    }

    const metrics = this.calculateDiversityMetrics(spaceId);
    return {
      id: `neuroadvocate-${packet.id}`,
      payload: metrics,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'NeurodiversityAdvocate']
      }
    };
  }

  public exportSpace(spaceId: string): { id: string; name: string; memberCount: number; inclusionScore: number } | null {
    const space = this._spaces.get(spaceId);
    if (!space) return null;
    return {
      id: space.id,
      name: space.name,
      memberCount: space.members.size,
      inclusionScore: space.inclusionScore
    };
  }

  public reset(): void {
    this._profiles.clear();
    this._initiatives.clear();
    this._designs.clear();
    this._accommodations.clear();
    this._spaces.clear();
    this._currentSpace = null;
    this._advocacyHistory = [];
  }
}
