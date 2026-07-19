import { DataPacket, PacketMeta } from '../shared/types';

/** A social influence descriptor. */
export interface SocialInfluence {
  readonly type: 'conformity' | 'compliance' | 'obedience' | 'persuasion';
  readonly source: string;
  readonly target: string;
  readonly compliance: number;
  readonly mechanism: string;
}

/** A group descriptor. */
export interface Group {
  readonly id: string;
  readonly role: string;
  readonly norm: string;
  readonly cohesion: number;
  readonly size: number;
  readonly leader?: string;
}

/** An attitude descriptor. */
export interface Attitude {
  readonly object: string;
  readonly affective: number;
  readonly behavioral: number;
  readonly cognitive: number;
  readonly strength: number;
}

/** Attribution result. */
export interface AttributionResult {
  readonly behavior: string;
  readonly internal: number;
  readonly external: number;
  readonly locus: 'internal' | 'external';
  readonly stability: number;
}

/** Groupthink descriptor. */
export interface GroupthinkSymptoms {
  readonly group: string;
  readonly symptoms: string[];
  readonly risk: 'low' | 'moderate' | 'high';
  readonly conditions: string[];
}

/** Prejudice descriptor. */
export interface PrejudiceDescriptor {
  readonly ingroup: string;
  readonly outgroup: string;
  readonly stereotype: string[];
  readonly intensity: number;
  readonly basis: string;
}

/**
 * SocialPsychology models conformity, obedience, persuasion, attribution,
 * group dynamics (groupthink, polarization, loafing), and prejudice.
 */
export class SocialPsychology {
  private _influences: SocialInfluence[] = [];
  private _groups: Group[] = [];
  private _attitudes: Attitude[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get influenceCount(): number { return this._influences.length; }
  get groupCount(): number { return this._groups.length; }
  get attitudeCount(): number { return this._attitudes.length; }

  /** Model conformity pressure on an individual. */
  conformity(group: Group, individual: string): { conformRate: number; mechanism: string; informational: number; normative: number } {
    const conformRate = group.cohesion * 0.7;
    const influence: SocialInfluence = {
      type: 'conformity',
      source: group.id,
      target: individual,
      compliance: conformRate,
      mechanism: 'normative-social-influence',
    };
    this._influences.push(influence);
    return {
      conformRate: Number(conformRate.toFixed(2)),
      mechanism: 'normative-and-informational',
      informational: 0.3,
      normative: 0.7,
    };
  }

  /** Model obedience to authority. */
  obedience(authority: string, subject: string): { obeyRate: number; level: number; agenticState: boolean } {
    return {
      obeyRate: 0.65,
      level: 4,
      agenticState: true,
    };
  }

  /** Model compliance using Cialdini techniques. */
  compliance(request: string, technique: 'foot-in-door' | 'door-in-face' | 'lowball' | 'scarcity' | 'reciprocity'): { rate: number; technique: string; principle: string } {
    const rates: Record<typeof technique, number> = {
      'foot-in-door': 0.6,
      'door-in-face': 0.55,
      'lowball': 0.7,
      'scarcity': 0.65,
      'reciprocity': 0.6,
    };
    const principles: Record<typeof technique, string> = {
      'foot-in-door': 'commitment-consistency',
      'door-in-face': 'reciprocity',
      'lowball': 'commitment',
      'scarcity': 'scarcity',
      'reciprocity': 'reciprocity',
    };
    return { rate: rates[technique], technique, principle: principles[technique] };
  }

  /** Model persuasion via elaboration likelihood model. */
  persuasion(source: string, message: string, audience: string): { central: number; peripheral: number; route: string; attitudeChange: number } {
    return {
      central: 0.6,
      peripheral: 0.4,
      route: 'dual-process',
      attitudeChange: 0.3,
    };
  }

  /** Model cognitive dissonance. */
  cognitiveDissonance(belief: string, behavior: string): { dissonance: number; reduction: string[]; attitudeChange: number } {
    return {
      dissonance: 0.6,
      reduction: ['change-belief', 'change-behavior', 'add-cognitions', 'trivialize'],
      attitudeChange: 0.25,
    };
  }

  /** Compute attribution for a behavior. */
  attribution(behavior: string, internal: number, external: number): AttributionResult {
    const locus: AttributionResult['locus'] = internal > external ? 'internal' : 'external';
    return {
      behavior,
      internal: Number(internal.toFixed(2)),
      external: Number(external.toFixed(2)),
      locus,
      stability: 0.5,
    };
  }

  /** Model fundamental attribution error. */
  fundamentalAttribution(behavior: string, observer: string): { overattribution: number; situationalUnderweight: number; culturalFactor: number } {
    return {
      overattribution: 0.5,
      situationalUnderweight: 0.4,
      culturalFactor: 0.3,
    };
  }

  /** Model self-serving bias. */
  selfServingBias(outcome: 'success' | 'failure'): { attribution: string; locus: string; bias: number } {
    return {
      attribution: outcome === 'success' ? 'internal-ability' : 'external-circumstances',
      locus: outcome === 'success' ? 'internal' : 'external',
      bias: 0.4,
    };
  }

  /** Model bystander effect. */
  bystanderEffect(emergency: string, bystanders: number): { helpProbability: number; diffusion: number; intervention: number } {
    const helpProbability = 1 / Math.max(1, bystanders);
    return {
      helpProbability: Number(helpProbability.toFixed(3)),
      diffusion: Number((1 - helpProbability).toFixed(3)),
      intervention: helpProbability > 0.5 ? 0.8 : 0.2,
    };
  }

  /** Identify groupthink symptoms. */
  groupthink(group: Group, conditions: string[]): GroupthinkSymptoms {
    const symptoms = ['illusion-of-invulnerability', 'collective-rationalization', 'belief-in-moral-superiority', 'stereotyping', 'self-censorship', 'pressure-on-dissent', 'mindguarding'];
    const risk: GroupthinkSymptoms['risk'] = conditions.length > 4 ? 'high' : conditions.length > 2 ? 'moderate' : 'low';
    return {
      group: group.id,
      symptoms: symptoms.slice(0, 3 + conditions.length),
      risk,
      conditions,
    };
  }

  /** Model group polarization. */
  groupPolarization(group: Group, initial: number): { shifted: number; direction: 'risky' | 'cautious'; mechanism: string } {
    const shifted = initial > 0.5 ? Math.min(1, initial + 0.15) : Math.max(0, initial - 0.15);
    return {
      shifted: Number(shifted.toFixed(2)),
      direction: initial > 0.5 ? 'risky' : 'cautious',
      mechanism: 'social-comparison-and-persuasive-arguments',
    };
  }

  /** Model social loafing. */
  socialLoafing(group: Group, individual: string): { effort: number; reduction: number; identifiable: boolean } {
    const effort = Math.max(0.4, 1 - group.size * 0.05);
    return {
      effort: Number(effort.toFixed(2)),
      reduction: Number((1 - effort).toFixed(2)),
      identifiable: false,
    };
  }

  /** Identify stereotype for a group. */
  stereotype(group: string, attributes: string[]): { group: string; attributes: string[]; accuracy: number; valence: string } {
    return {
      group,
      attributes,
      accuracy: 0.3,
      valence: attributes.length > 3 ? 'mixed' : 'negative',
    };
  }

  /** Measure prejudice between ingroup and outgroup. */
  prejudice(ingroup: string, outgroup: string): PrejudiceDescriptor {
    return {
      ingroup,
      outgroup,
      stereotype: ['outgroup-homogeneity', 'minimal-group-effect'],
      intensity: 0.5,
      basis: 'social-identity',
    };
  }

  /** Measure discrimination action. */
  discrimination(basis: string, action: string): { basis: string; action: string; severity: number; systematic: boolean } {
    return {
      basis,
      action,
      severity: 0.6,
      systematic: true,
    };
  }

  toPacket(): DataPacket<{
    influences: SocialInfluence[];
    groups: Group[];
    attitudes: Attitude[];
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
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._influences = [];
    this._groups = [];
    this._attitudes = [];
    this._history = [];
    this._counter = 0;
  }
}
