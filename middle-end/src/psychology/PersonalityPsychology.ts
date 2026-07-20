import { DataPacket, PacketMeta } from '../shared/types';

export interface Trait {
  readonly name: string;
  readonly pole: string;
  readonly description: string;
  readonly score: number;
}

export interface PersonalityModel {
  readonly name: 'big-five' | 'mbti' | 'enneagram' | 'hexaco' | 'dark-triad';
  readonly dimensions: { name: string; score: number }[];
}

export interface PersonalityTest {
  readonly name: string;
  readonly scales: string[];
  readonly items: number;
  readonly reliability: number;
}

export interface BigFiveResult {
  readonly openness: number;
  readonly conscientiousness: number;
  readonly extraversion: number;
  readonly agreeableness: number;
  readonly neuroticism: number;
  readonly profile: string;
}

export interface MBTIResult {
  readonly type: string;
  readonly functions: { function: string; attitude: string }[];
  readonly description: string;
}

export interface EnneagramResult {
  readonly type: number;
  readonly wing: number;
  readonly level: number;
  readonly description: string;
}

export interface ProjectiveResult {
  readonly test: 'rorschach' | 'tat' | 'draw-a-person';
  readonly response: string;
  readonly interpretation: string;
}

export interface PersonalityDisorder {
  readonly name: string;
  readonly cluster: 'A' | 'B' | 'C';
  readonly traits: string[];
  readonly diagnosticCriteria: string[];
  readonly impairment: number;
  readonly comorbidity: string[];
}

export interface TraitProfile {
  readonly trait: string;
  readonly score: number;
  readonly percentile: number;
  readonly description: string;
  readonly behavioralIndicators: string[];
}

export interface PersonalityChange {
  readonly trait: string;
  readonly baseline: number;
  readonly post: number;
  readonly change: number;
  readonly direction: 'increase' | 'decrease' | 'stable';
  readonly intervention: string;
  readonly permanence: number;
}

export interface Temperament {
  readonly type: 'easy' | 'difficult' | 'slow-to-warm';
  readonly reactivity: number;
  readonly selfRegulation: number;
  readonly emotionality: number;
  readonly sociability: number;
}

export interface CharacterStrength {
  readonly name: string;
  readonly category: 'wisdom' | 'courage' | 'humanity' | 'justice' | 'temperance' | 'transcendence';
  readonly score: number;
  readonly description: string;
  readonly manifestations: string[];
}

export interface SelfConcept {
  readonly domain: 'academic' | 'social' | 'emotional' | 'physical';
  readonly selfEsteem: number;
  readonly selfEfficacy: number;
  readonly selfSchema: string[];
  readonly identityStatus: string;
}

export interface InteractionStyle {
  readonly style: 'dominant' | 'submissive' | 'passive-aggressive' | 'assertive';
  readonly communicationPattern: string;
  readonly conflictResolution: string;
  readonly relationshipImpact: string[];
}

export class PersonalityPsychology {
  private _traits: Map<string, Trait> = new Map();
  private _models: PersonalityModel[] = [];
  private _tests: PersonalityTest[] = [];
  private _personalityDisorders: Map<string, PersonalityDisorder> = new Map();
  private _characterStrengths: Map<string, CharacterStrength> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedTraits();
    this._seedDisorders();
    this._seedStrengths();
  }

  get traitCount(): number { return this._traits.size; }
  get modelCount(): number { return this._models.length; }
  get testCount(): number { return this._tests.length; }
  get personalityDisorderCount(): number { return this._personalityDisorders.size; }
  get characterStrengthCount(): number { return this._characterStrengths.size; }

  bigFive(openness: number, conscientiousness: number, extraversion: number, agreeableness: number, neuroticism: number, context: string = 'general'): BigFiveResult {
    const profile = extraversion > 0.5 && openness > 0.5 ? 'explorer'
      : conscientiousness > 0.7 ? 'achiever'
        : agreeableness > 0.7 ? 'harmonizer'
          : neuroticism > 0.6 ? 'sensitive'
            : 'individualist';
    const result: BigFiveResult = {
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism,
      profile,
    };
    this._models.push({
      name: 'big-five',
      dimensions: [
        { name: 'openness', score: openness },
        { name: 'conscientiousness', score: conscientiousness },
        { name: 'extraversion', score: extraversion },
        { name: 'agreeableness', score: agreeableness },
        { name: 'neuroticism', score: neuroticism },
      ],
    });
    this._history.push({ op: 'bigFive', profile, context });
    return result;
  }

  bigFiveProfile(openness: number, conscientiousness: number, extraversion: number, agreeableness: number, neuroticism: number): { traits: TraitProfile[]; summary: string; strengths: string[]; growthAreas: string[]; careerFit: string[] } {
    const traits: TraitProfile[] = [
      { trait: 'Openness', score: openness, percentile: Math.round(openness * 100), description: openness > 0.7 ? 'curious and creative' : openness > 0.4 ? 'moderately open' : 'practical and traditional', behavioralIndicators: openness > 0.7 ? ['seeks-new-experiences', 'enjoys-learning', 'creative-thinking'] : ['prefers-routine', 'practical-focus'] },
      { trait: 'Conscientiousness', score: conscientiousness, percentile: Math.round(conscientiousness * 100), description: conscientiousness > 0.7 ? 'organized and reliable' : conscientiousness > 0.4 ? 'moderately conscientious' : 'flexible and spontaneous', behavioralIndicators: conscientiousness > 0.7 ? ['goal-oriented', 'detail-oriented', 'punctual'] : ['easy-going', 'spontaneous'] },
      { trait: 'Extraversion', score: extraversion, percentile: Math.round(extraversion * 100), description: extraversion > 0.7 ? 'outgoing and energetic' : extraversion > 0.4 ? 'ambiverted' : 'reserved and introspective', behavioralIndicators: extraversion > 0.7 ? ['enjoys-socializing', 'energetic', 'talkative'] : ['prefers-solitude', 'listens-more'] },
      { trait: 'Agreeableness', score: agreeableness, percentile: Math.round(agreeableness * 100), description: agreeableness > 0.7 ? 'cooperative and kind' : agreeableness > 0.4 ? 'moderately agreeable' : 'independent and assertive', behavioralIndicators: agreeableness > 0.7 ? ['cooperative', 'empathetic', 'trusting'] : ['competitive', 'independent'] },
      { trait: 'Neuroticism', score: neuroticism, percentile: Math.round(neuroticism * 100), description: neuroticism > 0.7 ? 'sensitive and emotional' : neuroticism > 0.4 ? 'moderately stable' : 'calm and resilient', behavioralIndicators: neuroticism > 0.7 ? ['emotionally-reactive', 'anxious', 'worries'] : ['emotionally-stable', 'calm'] },
    ];
    const strengths = traits.filter(t => t.score > 0.7).map(t => t.trait);
    const growthAreas = traits.filter(t => t.score < 0.4).map(t => t.trait);
    const careerFit = conscientiousness > 0.7 ? ['management', 'accounting', 'project-management'] : 
                     openness > 0.7 ? ['creative-fields', 'research', 'design'] : 
                     extraversion > 0.7 ? ['sales', 'marketing', 'leadership'] : ['analysis', 'writing', 'technical-roles'];
    const summary = `Your profile shows high ${strengths.join(', ')} and potential growth in ${growthAreas.join(', ')}.`;
    this._history.push({ op: 'bigFiveProfile', strengthCount: strengths.length, growthCount: growthAreas.length });
    return { traits, summary, strengths, growthAreas, careerFit };
  }

  mbti(type: string, functions: string[], cognitiveStyle: string = ''): MBTIResult {
    const descriptions: Record<string, string> = {
      INTJ: 'architect-strategic',
      INTP: 'logician-analytical',
      ENTJ: 'commander-leader',
      ENTP: 'debater-innovator',
      INFJ: 'advocate-idealistic',
      INFP: 'mediator-healer',
      ENFJ: 'protagonist-mentor',
      ENFP: 'campaigner-enthusiast',
      ISTJ: 'logistician-duty',
      ISFJ: 'defender-protector',
      ESTJ: 'executive-organizer',
      ESFJ: 'consul-caregiver',
      ISTP: 'virtuoso-craftsman',
      ISFP: 'adventurer-artist',
      ESTP: 'entrepreneur-dynamo',
      ESFP: 'entertainer-performer',
    };
    return {
      type,
      functions: functions.map(f => ({
        function: f,
        attitude: f.startsWith('E') || f.startsWith('I') ? f.substring(0, 1) : 'X',
      })),
      description: descriptions[type] ?? 'unknown-type',
    };
  }

  mbtiTypeDescription(type: string): { type: string; description: string; strengths: string[]; blindSpots: string[]; careerSuggestions: string[]; relationshipStyle: string } {
    const descriptions: Record<string, { desc: string; strengths: string[]; blindSpots: string[]; careers: string[]; relationships: string }> = {
      INTJ: { desc: 'Strategic visionary', strengths: ['strategic-thinking', 'independence', 'focus'], blindSpots: ['overly-critical', 'impatient'], careers: ['leadership', 'strategy', 'engineering'], relationships: 'deep-intellectual-connections' },
      INTP: { desc: 'Analytical problem-solver', strengths: ['logical', 'creative', 'curious'], blindSpots: ['disorganized', 'avoidant'], careers: ['research', 'technology', 'analysis'], relationships: 'intellectual-compatibility' },
      ENTJ: { desc: 'Confident leader', strengths: ['decisive', 'strategic', 'ambitious'], blindSpots: ['domineering', 'impatient'], careers: ['management', 'law', 'politics'], relationships: 'respect-and-admiration' },
      ENTP: { desc: 'Innovative debater', strengths: ['creative', 'quick-witted', 'resourceful'], blindSpots: ['argumentative', 'unfocused'], careers: ['entrepreneurship', 'marketing', 'law'], relationships: 'intellectual-sparring' },
      INFJ: { desc: 'Compassionate visionary', strengths: ['intuitive', 'empathetic', 'insightful'], blindSpots: ['overly-idealistic', 'sensitive'], careers: ['counseling', 'education', 'writing'], relationships: 'deep-emotional-connection' },
      INFP: { desc: 'Idealistic healer', strengths: ['creative', 'empathic', 'values-driven'], blindSpots: ['overly-sensitive', 'avoidant'], careers: ['counseling', 'art', 'social-work'], relationships: 'authentic-emotional-bonds' },
      ENFJ: { desc: 'Charismatic mentor', strengths: ['charismatic', 'empathetic', 'persuasive'], blindSpots: ['overly-involved', 'approval-seeking'], careers: ['leadership', 'education', 'counseling'], relationships: 'nurturing-supportive' },
      ENFP: { desc: 'Enthusiastic explorer', strengths: ['enthusiastic', 'creative', 'adaptable'], blindSpots: ['unfocused', 'overly-optimistic'], careers: ['entrepreneurship', 'marketing', 'education'], relationships: 'exciting-spontaneous' },
      ISTJ: { desc: 'Reliable organizer', strengths: ['reliable', 'organized', 'practical'], blindSpots: ['rigid', 'resistant-to-change'], careers: ['administration', 'accounting', 'military'], relationships: 'stable-dependable' },
      ISFJ: { desc: 'Caring protector', strengths: ['caring', 'responsible', 'detail-oriented'], blindSpots: ['overly-cautious', 'people-pleasing'], careers: ['healthcare', 'education', 'administration'], relationships: 'nurturing-devoted' },
      ESTJ: { desc: 'Efficient executor', strengths: ['organized', 'practical', 'decisive'], blindSpots: ['rigid', 'impatient'], careers: ['management', 'finance', 'law-enforcement'], relationships: 'traditional-stable' },
      ESFJ: { desc: 'Warm caregiver', strengths: ['friendly', 'cooperative', 'responsible'], blindSpots: ['overly-trusting', 'needy'], careers: ['healthcare', 'education', 'hospitality'], relationships: 'warm-communal' },
      ISTP: { desc: 'Practical craftsman', strengths: ['practical', 'hands-on', 'resourceful'], blindSpots: ['reserved', 'impulsive'], careers: ['engineering', 'technology', 'trades'], relationships: 'independent-actions' },
      ISFP: { desc: 'Artistic adventurer', strengths: ['creative', 'sensitive', 'spontaneous'], blindSpots: ['disorganized', 'avoidant'], careers: ['art', 'design', 'healthcare'], relationships: 'sensory-experiences' },
      ESTP: { desc: 'Energetic dynamo', strengths: ['energetic', 'practical', 'adaptable'], blindSpots: ['impulsive', 'reckless'], careers: ['sales', 'sports', 'emergency-services'], relationships: 'exciting-active' },
      ESFP: { desc: 'Vibrant performer', strengths: ['friendly', 'energetic', 'spontaneous'], blindSpots: ['impulsive', 'shallow'], careers: ['performing-arts', 'sales', 'hospitality'], relationships: 'fun-social' },
    };
    const data = descriptions[type] || { desc: 'unknown', strengths: [], blindSpots: [], careers: [], relationships: 'variable' };
    this._history.push({ op: 'mbtiTypeDescription', type });
    return { type, description: data.desc, strengths: data.strengths, blindSpots: data.blindSpots, careerSuggestions: data.careers, relationshipStyle: data.relationships };
  }

  enneagram(type: number, wing: number, levels: number): EnneagramResult {
    const descriptions: Record<number, string> = {
      1: 'reformer-perfectionist',
      2: 'helper-giver',
      3: 'achiever-performer',
      4: 'individualist-romantic',
      5: 'investigator-observer',
      6: 'loyalist-skeptic',
      7: 'enthusiast-epicure',
      8: 'challenger-protector',
      9: 'peacemaker-mediator',
    };
    return {
      type,
      wing,
      level: levels,
      description: descriptions[type] ?? 'unknown-type',
    };
  }

  enneagramTypeAnalysis(type: number, wing: number): { type: number; wing: number; coreMotivation: string; coreFear: string; strengths: string[]; growthAreas: string[]; integrationPath: string; disintegrationPath: string } {
    const analysis: Record<number, { motivation: string; fear: string; strengths: string[]; growth: string[]; integration: string; disintegration: string }> = {
      1: { motivation: 'to be good', fear: 'being bad', strengths: ['principled', 'ethical', 'responsible'], growth: ['flexibility', 'self-compassion'], integration: 'moving-toward-7', disintegration: 'moving-toward-4' },
      2: { motivation: 'to be loved', fear: 'being unwanted', strengths: ['caring', 'generous', 'supportive'], growth: ['self-care', 'assertiveness'], integration: 'moving-toward-4', disintegration: 'moving-toward-8' },
      3: { motivation: 'to be admired', fear: 'being worthless', strengths: ['ambitious', 'competent', 'charismatic'], growth: ['authenticity', 'vulnerability'], integration: 'moving-toward-6', disintegration: 'moving-toward-9' },
      4: { motivation: 'to be unique', fear: 'being ordinary', strengths: ['creative', 'insightful', 'emotional'], growth: ['acceptance', 'practicality'], integration: 'moving-toward-1', disintegration: 'moving-toward-2' },
      5: { motivation: 'to be competent', fear: 'being overwhelmed', strengths: ['knowledgeable', 'independent', 'analytical'], growth: ['engagement', 'vulnerability'], integration: 'moving-toward-8', disintegration: 'moving-toward-7' },
      6: { motivation: 'to be secure', fear: 'being unsupported', strengths: ['loyal', 'responsible', 'cautious'], growth: ['trust', 'confidence'], integration: 'moving-toward-9', disintegration: 'moving-toward-3' },
      7: { motivation: 'to be happy', fear: 'being deprived', strengths: ['optimistic', 'creative', 'adventurous'], growth: ['depth', 'commitment'], integration: 'moving-toward-5', disintegration: 'moving-toward-1' },
      8: { motivation: 'to be powerful', fear: 'being harmed', strengths: ['courageous', 'protective', 'direct'], growth: ['vulnerability', 'compassion'], integration: 'moving-toward-2', disintegration: 'moving-toward-5' },
      9: { motivation: 'to be at peace', fear: 'being in conflict', strengths: ['peaceful', 'accepting', 'supportive'], growth: ['assertiveness', 'engagement'], integration: 'moving-toward-3', disintegration: 'moving-toward-6' },
    };
    const data = analysis[type] || { motivation: 'unknown', fear: 'unknown', strengths: [], growth: [], integration: '', disintegration: '' };
    this._history.push({ op: 'enneagramTypeAnalysis', type, wing });
    return { type, wing, coreMotivation: data.motivation, coreFear: data.fear, strengths: data.strengths, growthAreas: data.growth, integrationPath: data.integration, disintegrationPath: data.disintegration };
  }

  hexaco(dimensions: { honestyHumility: number; emotionality: number; extraversion: number; agreeableness: number; conscientiousness: number; openness: number }): PersonalityModel {
    const model: PersonalityModel = {
      name: 'hexaco',
      dimensions: [
        { name: 'honesty-humility', score: dimensions.honestyHumility },
        { name: 'emotionality', score: dimensions.emotionality },
        { name: 'extraversion', score: dimensions.extraversion },
        { name: 'agreeableness', score: dimensions.agreeableness },
        { name: 'conscientiousness', score: dimensions.conscientiousness },
        { name: 'openness', score: dimensions.openness },
      ],
    };
    this._models.push(model);
    return model;
  }

  hexacoProfile(dimensions: { honestyHumility: number; emotionality: number; extraversion: number; agreeableness: number; conscientiousness: number; openness: number }): { dimensions: TraitProfile[]; summary: string; integrityScore: number; socialEffectiveness: number; adaptability: number } {
    const traitProfiles: TraitProfile[] = [
      { trait: 'Honesty-Humility', score: dimensions.honestyHumility, percentile: Math.round(dimensions.honestyHumility * 100), description: dimensions.honestyHumility > 0.7 ? 'sincere and modest' : dimensions.honestyHumility > 0.4 ? 'moderately honest' : 'self-serving', behavioralIndicators: dimensions.honestyHumility > 0.7 ? ['truthful', 'fair', 'modest'] : ['manipulative', 'entitled'] },
      { trait: 'Emotionality', score: dimensions.emotionality, percentile: Math.round(dimensions.emotionality * 100), description: dimensions.emotionality > 0.7 ? 'emotionally expressive' : dimensions.emotionality > 0.4 ? 'moderately emotional' : 'emotionally detached', behavioralIndicators: dimensions.emotionality > 0.7 ? ['empathetic', 'sensitive', 'emotional'] : ['stoic', 'unemotional'] },
      { trait: 'Extraversion', score: dimensions.extraversion, percentile: Math.round(dimensions.extraversion * 100), description: dimensions.extraversion > 0.7 ? 'outgoing' : dimensions.extraversion > 0.4 ? 'ambiverted' : 'introverted', behavioralIndicators: dimensions.extraversion > 0.7 ? ['talkative', 'energetic', 'social'] : ['reserved', 'quiet'] },
      { trait: 'Agreeableness', score: dimensions.agreeableness, percentile: Math.round(dimensions.agreeableness * 100), description: dimensions.agreeableness > 0.7 ? 'cooperative' : dimensions.agreeableness > 0.4 ? 'moderate' : 'competitive', behavioralIndicators: dimensions.agreeableness > 0.7 ? ['forgiving', 'gentle', 'cooperative'] : ['critical', 'tough'] },
      { trait: 'Conscientiousness', score: dimensions.conscientiousness, percentile: Math.round(dimensions.conscientiousness * 100), description: dimensions.conscientiousness > 0.7 ? 'organized' : dimensions.conscientiousness > 0.4 ? 'moderate' : 'spontaneous', behavioralIndicators: dimensions.conscientiousness > 0.7 ? ['organized', 'reliable', 'self-disciplined'] : ['careless', 'impulsive'] },
      { trait: 'Openness', score: dimensions.openness, percentile: Math.round(dimensions.openness * 100), description: dimensions.openness > 0.7 ? 'curious' : dimensions.openness > 0.4 ? 'moderate' : 'conventional', behavioralIndicators: dimensions.openness > 0.7 ? ['imaginative', 'creative', 'curious'] : ['traditional', 'practical'] },
    ];
    const integrityScore = dimensions.honestyHumility * 0.6 + dimensions.agreeableness * 0.4;
    const socialEffectiveness = dimensions.extraversion * 0.4 + dimensions.agreeableness * 0.3 + dimensions.emotionality * 0.3;
    const adaptability = dimensions.openness * 0.4 + dimensions.conscientiousness * 0.3 + dimensions.emotionality * 0.3;
    const summary = `Your HEXACO profile shows integrity at ${Math.round(integrityScore * 100)}%, social effectiveness at ${Math.round(socialEffectiveness * 100)}%, and adaptability at ${Math.round(adaptability * 100)}%.`;
    this._history.push({ op: 'hexacoProfile', integrityScore, socialEffectiveness, adaptability });
    return { dimensions: traitProfiles, summary, integrityScore: Number(integrityScore.toFixed(2)), socialEffectiveness: Number(socialEffectiveness.toFixed(2)), adaptability: Number(adaptability.toFixed(2)) };
  }

  darkTriad(narcissism: number, machiavellianism: number, psychopathy: number): { narcissism: number; machiavellianism: number; psychopathy: number; total: number; riskLevel: string; subscales: { name: string; score: number; interpretation: string }[] } {
    const total = (narcissism + machiavellianism + psychopathy) / 3;
    const subscales = [
      { name: 'Narcissism', score: narcissism, interpretation: narcissism > 0.7 ? 'high-narcissism' : narcissism > 0.4 ? 'moderate-narcissism' : 'low-narcissism' },
      { name: 'Machiavellianism', score: machiavellianism, interpretation: machiavellianism > 0.7 ? 'high-machiavellianism' : machiavellianism > 0.4 ? 'moderate-machiavellianism' : 'low-machiavellianism' },
      { name: 'Psychopathy', score: psychopathy, interpretation: psychopathy > 0.7 ? 'high-psychopathy' : psychopathy > 0.4 ? 'moderate-psychopathy' : 'low-psychopathy' },
    ];
    this._history.push({ op: 'darkTriad', total, riskLevel: total > 0.7 ? 'high' : total > 0.4 ? 'moderate' : 'low' });
    return {
      narcissism,
      machiavellianism,
      psychopathy,
      total: Number(total.toFixed(2)),
      riskLevel: total > 0.7 ? 'high' : total > 0.4 ? 'moderate' : 'low',
      subscales,
    };
  }

  traitConsistency(trait: string, situations: string[], context: string = 'general'): { consistency: number; crossSituational: number; variability: number; stability: number; contextualModulation: number } {
    const baseConsistency = 0.65;
    const stability = situations.length > 5 ? 0.7 : 0.5;
    const contextualModulation = context === 'work' ? 0.05 : context === 'social' ? -0.05 : 0;
    this._history.push({ op: 'traitConsistency', trait, situationCount: situations.length, context });
    return {
      consistency: Number((baseConsistency + contextualModulation).toFixed(2)),
      crossSituational: 0.6,
      variability: 0.4,
      stability: Number(stability.toFixed(2)),
      contextualModulation: Number(contextualModulation.toFixed(2)),
    };
  }

  heritability(trait: string, twinStudies: number): { heritability: number; sharedEnvironment: number; nonSharedEnvironment: number; geneEnvironmentInteraction: number; epigeneticEffects: number } {
    const heritabilityMap: Record<string, number> = {
      'extraversion': 0.5, 'neuroticism': 0.4, 'conscientiousness': 0.4, 'openness': 0.5, 'agreeableness': 0.4,
      'intelligence': 0.5, 'personality': 0.45, 'temperament': 0.5, 'self-esteem': 0.3, 'happiness': 0.5,
    };
    const heritability = heritabilityMap[trait.toLowerCase()] ?? 0.45;
    this._history.push({ op: 'heritability', trait, heritability });
    return {
      heritability: Number(heritability.toFixed(2)),
      sharedEnvironment: 0.1,
      nonSharedEnvironment: 0.45,
      geneEnvironmentInteraction: 0.15,
      epigeneticEffects: 0.05,
    };
  }

  personalityStability(trait: string, age: number, lifeEvents: number = 0): { stability: number; rankOrder: number; meanLevel: number; lifeEventImpact: number; maturationEffect: number } {
    const baseStability = age > 30 ? 0.7 : 0.5;
    const lifeEventImpact = lifeEvents * 0.05;
    const maturationEffect = age > 50 ? 0.1 : 0;
    const stability = Math.max(0.3, baseStability - lifeEventImpact + maturationEffect);
    this._history.push({ op: 'personalityStability', trait, age, lifeEvents });
    return {
      stability: Number(stability.toFixed(2)),
      rankOrder: 0.6,
      meanLevel: 0.4,
      lifeEventImpact: Number(lifeEventImpact.toFixed(2)),
      maturationEffect: Number(maturationEffect.toFixed(2)),
    };
  }

  personalityChange(intervention: 'therapy' | 'meditation' | 'life-event' | 'education' | 'career-change', trait: string, duration: number = 6): PersonalityChange {
    const changeMagnitude: Record<string, number> = {
      therapy: 0.15, meditation: 0.1, 'life-event': 0.2, education: 0.08, 'career-change': 0.12,
    };
    const change = changeMagnitude[intervention] ?? 0.1;
    const permanence = duration > 12 ? 0.7 : duration > 6 ? 0.5 : 0.3;
    const direction: 'increase' | 'decrease' | 'stable' = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable';
    this._history.push({ op: 'personalityChange', intervention, trait, change, duration });
    return {
      trait,
      baseline: 0.5,
      post: Number((0.5 + change).toFixed(2)),
      change: Number(change.toFixed(2)),
      direction,
      intervention,
      permanence: Number(permanence.toFixed(2)),
    };
  }

  personalityDisorder(trait: string, cluster: 'A' | 'B' | 'C', maladaptive: boolean): PersonalityDisorder | null {
    const disorder = this._personalityDisorders.get(`${cluster}-${trait}`);
    if (!disorder) return null;
    this._history.push({ op: 'personalityDisorder', disorder: disorder.name, cluster, maladaptive });
    return disorder;
  }

  personalityDisorderAssessment(cluster: 'A' | 'B' | 'C', traits: string[], impairmentLevel: number = 0.5): { possibleDisorders: PersonalityDisorder[]; severity: 'mild' | 'moderate' | 'severe'; recommendations: string[]; comorbidityRisk: number } {
    const disorders = Array.from(this._personalityDisorders.values()).filter(d => d.cluster === cluster);
    const severity: 'mild' | 'moderate' | 'severe' = impairmentLevel > 0.7 ? 'severe' : impairmentLevel > 0.4 ? 'moderate' : 'mild';
    const comorbidityRisk = disorders.length > 2 ? 0.7 : 0.4;
    const recommendations = severity === 'severe' ? ['professional-evaluation', 'therapy', 'medication-consideration']
      : severity === 'moderate' ? ['therapy', 'skill-building']
      : ['self-awareness', 'coping-strategies'];
    this._history.push({ op: 'personalityDisorderAssessment', cluster, severity, impairmentLevel });
    return { possibleDisorders: disorders.slice(0, 3), severity, recommendations, comorbidityRisk: Number(comorbidityRisk.toFixed(2)) };
  }

  projectiveTest(type: ProjectiveResult['test'], response: string, interpretation: string = ''): ProjectiveResult {
    const interpretations: Record<typeof type, string> = {
      rorschach: 'content-and-form-analysis',
      tat: 'thematic-content-analysis',
      'draw-a-person': 'projected-self-image',
    };
    this._history.push({ op: 'projectiveTest', type });
    return {
      test: type,
      response,
      interpretation: interpretation || interpretations[type],
    };
  }

  projectiveTestAnalysis(type: ProjectiveResult['test'], response: string): { test: string; response: string; interpretation: string; thematicAnalysis: string[]; psychologicalDimensions: { dimension: string; score: number; interpretation: string }[] } {
    const interpretations: Record<string, string> = {
      rorschach: 'content-and-form-analysis',
      tat: 'thematic-content-analysis',
      'draw-a-person': 'projected-self-image',
    };
    const thematicAnalysis = type === 'rorschach' ? ['color-response', 'form-quality', 'movement']
      : type === 'tat' ? ['hero-figure', 'goal-orientation', 'interpersonal-themes']
      : ['figure-size', 'detail-level', 'emotional-expression'];
    const psychologicalDimensions = [
      { dimension: 'emotional-expression', score: 0.6, interpretation: 'moderate-emotional-expression' },
      { dimension: 'interpersonal-concerns', score: 0.5, interpretation: 'average-interpersonal-focus' },
      { dimension: 'cognitive-organization', score: 0.7, interpretation: 'good-cognitive-organization' },
    ];
    this._history.push({ op: 'projectiveTestAnalysis', type });
    return { test: type, response, interpretation: interpretations[type], thematicAnalysis, psychologicalDimensions };
  }

  temperament(type: Temperament['type'], reactivity: number = 0.5, selfRegulation: number = 0.5): Temperament {
    const emotionality = type === 'difficult' ? 0.8 : type === 'easy' ? 0.4 : 0.6;
    const sociability = type === 'easy' ? 0.7 : type === 'difficult' ? 0.3 : 0.5;
    this._history.push({ op: 'temperament', type });
    return { type, reactivity: Number(reactivity.toFixed(2)), selfRegulation: Number(selfRegulation.toFixed(2)), emotionality: Number(emotionality.toFixed(2)), sociability: Number(sociability.toFixed(2)) };
  }

  temperamentDevelopment(age: number, temperament: Temperament['type']): { temperament: string; developmentalTrajectory: string[]; parentingImplications: string[]; expectedOutcomes: string[]; plasticity: number } {
    const trajectories: Record<string, string[]> = {
      easy: ['predictable-routines', 'positive-mood', 'adaptable'],
      difficult: ['irritable', 'slow-to-adapt', 'intense-emotions'],
      'slow-to-warm': ['shy-initially', 'gradual-adaptation', 'reserved'],
    };
    const implications: Record<string, string[]> = {
      easy: ['consistent-routines', 'encourage-independence'],
      difficult: ['patient-responses', 'emotional-regulation-support'],
      'slow-to-warm': ['gentle-introduction', 'predictable-environment'],
    };
    const outcomes: Record<string, string[]> = {
      easy: ['good-social-adjustment', 'positive-self-esteem'],
      difficult: ['risk-behavior-problems', 'resilient-with-support'],
      'slow-to-warm': ['good-self-control', 'deep-relationships'],
    };
    const plasticity = age < 3 ? 0.8 : age < 6 ? 0.6 : 0.4;
    this._history.push({ op: 'temperamentDevelopment', age, temperament });
    return { temperament, developmentalTrajectory: trajectories[temperament] || [], parentingImplications: implications[temperament] || [], expectedOutcomes: outcomes[temperament] || [], plasticity: Number(plasticity.toFixed(2)) };
  }

  characterStrengths(survey: { name: string; score: number }[]): CharacterStrength[] {
    return survey.map(s => {
      const existing = this._characterStrengths.get(s.name);
      return {
        name: s.name,
        category: existing?.category ?? 'wisdom',
        score: s.score,
        description: existing?.description ?? 'character-strength',
        manifestations: existing?.manifestations ?? [],
      };
    }).sort((a, b) => b.score - a.score);
  }

  characterStrengthProfile(strengths: string[], context: string = 'general'): { strengths: CharacterStrength[]; signatureStrengths: string[]; growthOpportunities: string[]; applications: string[]; well-beingImpact: number } {
    const profile: CharacterStrength[] = strengths.map(name => {
      const existing = this._characterStrengths.get(name);
      return existing || { name, category: 'wisdom', score: 0.7, description: name, manifestations: [] };
    });
    const signatureStrengths = profile.filter(s => s.score > 0.7).map(s => s.name);
    const growthOpportunities = profile.filter(s => s.score < 0.5).map(s => s.name);
    const applications = signatureStrengths.length > 0 ? ['use-signature-strengths-daily', 'develop-growth-areas'] : ['explore-various-strengths'];
    const well-beingImpact = profile.reduce((sum, s) => sum + s.score * 0.2, 0);
    this._history.push({ op: 'characterStrengthProfile', signatureCount: signatureStrengths.length, context });
    return { strengths: profile, signatureStrengths, growthOpportunities, applications, well-beingImpact: Number(well-beingImpact.toFixed(2)) };
  }

  selfConcept(domain: SelfConcept['domain'], selfEsteem: number = 0.5, selfEfficacy: number = 0.5): SelfConcept {
    const identityStatus = selfEsteem > 0.7 ? 'achieved' : selfEsteem > 0.4 ? 'moratorium' : 'diffuse';
    const selfSchema = domain === 'academic' ? ['intelligence', 'achievement', 'competence']
      : domain === 'social' ? ['likability', 'popularity', 'belonging']
      : domain === 'emotional' ? ['emotional-stability', 'self-regulation', 'resilience']
      : ['physical-attractiveness', 'health', 'appearance'];
    this._history.push({ op: 'selfConcept', domain, selfEsteem });
    return { domain, selfEsteem: Number(selfEsteem.toFixed(2)), selfEfficacy: Number(selfEfficacy.toFixed(2)), selfSchema, identityStatus };
  }

  selfConceptDevelopment(age: number, domain: SelfConcept['domain']): { selfConcept: SelfConcept; developmentalChanges: string[]; socialInfluences: string[]; stability: number; interventionPoints: string[] } {
    const selfConcept = this.selfConcept(domain);
    const developmentalChanges = age < 6 ? ['basic-self-awareness', 'simple-self-description']
      : age < 12 ? ['social-comparison', 'self-evaluation']
      : age < 18 ? ['identity-exploration', 'self-esteem-fluctuations']
      : ['self-acceptance', 'identity-consolidation'];
    const socialInfluences = age < 6 ? ['caregivers', 'family']
      : age < 12 ? ['peers', 'teachers']
      : age < 18 ? ['peers', 'media', 'romantic-partners']
      : ['career', 'relationships', 'life-experiences'];
    const stability = age > 18 ? 0.7 : age > 12 ? 0.5 : 0.3;
    const interventionPoints = selfConcept.selfEsteem < 0.5 ? ['build-self-efficacy', 'positive-feedback', 'skill-development'] : ['maintain-self-esteem', 'challenge-growth', 'identity-exploration'];
    this._history.push({ op: 'selfConceptDevelopment', age, domain });
    return { selfConcept, developmentalChanges, socialInfluences, stability: Number(stability.toFixed(2)), interventionPoints };
  }

  interactionStyle(style: InteractionStyle['style']): InteractionStyle {
    const communicationPatterns: Record<string, string> = {
      dominant: 'direct-assertive',
      submissive: 'indirect-accommodating',
      'passive-aggressive': 'indirect-resistive',
      assertive: 'direct-respectful',
    };
    const conflictResolution: Record<string, string> = {
      dominant: 'competing',
      submissive: 'avoiding',
      'passive-aggressive': 'indirect-challenging',
      assertive: 'collaborating',
    };
    const relationshipImpact: Record<string, string[]> = {
      dominant: ['leadership-roles', 'potential-conflict'],
      submissive: ['harmonious', 'potential-exploitation'],
      'passive-aggressive': ['underlying-tension', 'relationship-strain'],
      assertive: ['healthy-boundaries', 'mutual-respect'],
    };
    this._history.push({ op: 'interactionStyle', style });
    return { style, communicationPattern: communicationPatterns[style], conflictResolution: conflictResolution[style], relationshipImpact: relationshipImpact[style] };
  }

  interactionStyleImprovement(currentStyle: InteractionStyle['style'], goals: string[]): { currentStyle: string; targetStyle: string; strategies: string[]; expectedChanges: string[]; timeline: number; successProbability: number } {
    const targetStyle = currentStyle === 'dominant' ? 'assertive' : 
                       currentStyle === 'submissive' ? 'assertive' : 
                       currentStyle === 'passive-aggressive' ? 'assertive' : 'assertive';
    const strategies = currentStyle === 'dominant' ? ['active-listening', 'empathy-practice', 'collaboration']
      : currentStyle === 'submissive' ? ['self-advocacy', 'boundary-setting', 'confidence-building']
      : currentStyle === 'passive-aggressive' ? ['direct-communication', 'emotional-awareness', 'conflict-resolution']
      : ['maintain-assertiveness', 'continuous-improvement'];
    const expectedChanges = ['improved-communication', 'better-conflict-resolution', 'healthier-relationships'];
    const timeline = 3;
    const successProbability = 0.7;
    this._history.push({ op: 'interactionStyleImprovement', currentStyle, targetStyle });
    return { currentStyle, targetStyle, strategies, expectedChanges, timeline, successProbability: Number(successProbability.toFixed(2)) };
  }

  private _seedTraits(): void {
    const traits: Trait[] = [
      { name: 'openness', pole: 'open-closed', description: 'openness to experience', score: 0 },
      { name: 'conscientiousness', pole: 'organized-careless', description: 'self-discipline', score: 0 },
      { name: 'extraversion', pole: 'outgoing-reserved', description: 'sociability', score: 0 },
      { name: 'agreeableness', pole: 'cooperative-antagonistic', description: 'interpersonal orientation', score: 0 },
      { name: 'neuroticism', pole: 'sensitive-resilient', description: 'emotional stability', score: 0 },
    ];
    for (const t of traits) this._traits.set(t.name, t);
  }

  private _seedDisorders(): void {
    const disorders: PersonalityDisorder[] = [
      { name: 'Paranoid Personality Disorder', cluster: 'A', traits: ['distrustful', 'suspicious', 'secretive'], diagnosticCriteria: ['suspicious-without-basis', 'unwarranted-distrust'], impairment: 0.7, comorbidity: ['schizophrenia', 'delusional-disorder'] },
      { name: 'Schizoid Personality Disorder', cluster: 'A', traits: ['detached', 'lonely', 'emotionally-cold'], diagnosticCriteria: ['lack-interest-social', 'emotional-detachment'], impairment: 0.6, comorbidity: ['schizophrenia', 'autism'] },
      { name: 'Schizotypal Personality Disorder', cluster: 'A', traits: ['eccentric', 'magical-thinking', 'social-anxiety'], diagnosticCriteria: ['odd-beliefs', 'social-interaction-deficits'], impairment: 0.75, comorbidity: ['schizophrenia', 'social-anxiety'] },
      { name: 'Borderline Personality Disorder', cluster: 'B', traits: ['unstable-mood', 'fear-abandonment', 'impulsive'], diagnosticCriteria: ['unstable-relationships', 'identity-disturbance'], impairment: 0.8, comorbidity: ['depression', 'ptsd', 'substance-use'] },
      { name: 'Narcissistic Personality Disorder', cluster: 'B', traits: ['grandiose', 'entitled', 'lack-empathy'], diagnosticCriteria: ['grandiosity', 'need-admiration'], impairment: 0.7, comorbidity: ['borderline', 'antisocial'] },
      { name: 'Antisocial Personality Disorder', cluster: 'B', traits: ['aggressive', 'deceitful', 'impulsive'], diagnosticCriteria: ['disregard-rights', 'aggressive-behavior'], impairment: 0.85, comorbidity: ['substance-use', 'conduct-disorder'] },
      { name: 'Histrionic Personality Disorder', cluster: 'B', traits: ['dramatic', 'attention-seeking', 'shallow-emotions'], diagnosticCriteria: ['attention-seeking', 'exaggerated-emotions'], impairment: 0.6, comorbidity: ['borderline', 'narcissistic'] },
      { name: 'Avoidant Personality Disorder', cluster: 'C', traits: ['shy', 'fear-rejection', 'socially-withdrawn'], diagnosticCriteria: ['social-inhibition', 'fear-criticism'], impairment: 0.7, comorbidity: ['social-anxiety', 'depression'] },
      { name: 'Dependent Personality Disorder', cluster: 'C', traits: ['needy', 'submissive', 'fear-separation'], diagnosticCriteria: ['excessive-need-reassurance', 'difficulty-making-decisions'], impairment: 0.65, comorbidity: ['borderline', 'avoidant'] },
      { name: 'Obsessive-Compulsive Personality Disorder', cluster: 'C', traits: ['rigid', 'perfectionistic', 'controlling'], diagnosticCriteria: ['preoccupation-order', 'perfectionism'], impairment: 0.6, comorbidity: ['ocd', 'depression'] },
    ];
    for (const d of disorders) this._personalityDisorders.set(`${d.cluster}-${d.name.toLowerCase().split(' ')[0]}`, d);
  }

  private _seedStrengths(): void {
    const strengths: CharacterStrength[] = [
      { name: 'creativity', category: 'wisdom', score: 0, description: 'thinking of novel ways', manifestations: ['generating-ideas', 'creative-expression', 'innovation'] },
      { name: 'curiosity', category: 'wisdom', score: 0, description: 'taking interest', manifestations: ['exploring', 'learning', 'asking-questions'] },
      { name: 'bravery', category: 'courage', score: 0, description: 'facing threats', manifestations: ['courageous-action', 'standing-up', 'risk-taking'] },
      { name: 'love', category: 'humanity', score: 0, description: 'valuing close relations', manifestations: ['caring', 'intimacy', 'connection'] },
      { name: 'fairness', category: 'justice', score: 0, description: 'treating people equally', manifestations: ['impartiality', 'equity', 'justice'] },
      { name: 'forgiveness', category: 'temperance', score: 0, description: 'forgiving wrongs', manifestations: ['letting-go', 'compassion', 'reconciliation'] },
      { name: 'gratitude', category: 'transcendence', score: 0, description: 'being aware of blessings', manifestations: ['appreciation', 'thankfulness', 'acknowledgment'] },
      { name: 'hope', category: 'transcendence', score: 0, description: 'expecting the best', manifestations: ['optimism', 'goal-setting', 'perseverance'] },
    ];
    for (const s of strengths) this._characterStrengths.set(s.name, s);
  }

  toPacket(): DataPacket<{
    traits: number;
    models: PersonalityModel[];
    tests: PersonalityTest[];
    personalityDisorders: number;
    characterStrengths: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'PersonalityPsychology'],
      priority: 1,
      phase: 'personality-psychology',
    };
    return {
      id: `personality-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        traits: this._traits.size,
        models: [...this._models],
        tests: [...this._tests],
        personalityDisorders: this._personalityDisorders.size,
        characterStrengths: this._characterStrengths.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._traits.clear();
    this._models = [];
    this._tests = [];
    this._personalityDisorders.clear();
    this._characterStrengths.clear();
    this._history = [];
    this._counter = 0;
    this._seedTraits();
    this._seedDisorders();
    this._seedStrengths();
  }
}