import { DataPacket, PacketMeta } from '../shared/types';

export interface ConditioningTrial {
  readonly trial: number;
  readonly stimulus: string;
  readonly response: string;
  readonly reinforcement: boolean;
  readonly latency: number;
  readonly strength: number;
}

export interface ReinforcementSchedule {
  readonly type: 'fixed-ratio' | 'variable-ratio' | 'fixed-interval' | 'variable-interval' | 'continuous';
  readonly ratio?: number;
  readonly interval?: number;
  readonly description: string;
}

export interface BehaviorAnalysis {
  readonly antecedent: string;
  readonly behavior: string;
  readonly consequence: string;
  readonly function: 'escape' | 'attention' | 'sensory' | 'tangibles';
  readonly frequency: number;
  readonly intensity: number;
}

export interface OperantResponse {
  readonly behavior: string;
  readonly rate: number;
  readonly cumulative: number;
  readonly extinctionBurst: boolean;
  readonly spontaneousRecovery: number;
}

export interface ClassicalConditioningResult {
  readonly cs: string;
  readonly us: string;
  readonly cr: string;
  readonly ur: string;
  readonly acquisitionTrials: number;
  readonly extinctionTrials: number;
  readonly spontaneousRecoveryLevel: number;
}

export interface TokenEconomy {
  readonly tokens: string;
  readonly backupReinforcers: string[];
  readonly exchangeRate: number;
  readonly targetBehaviors: string[];
  readonly effectiveness: number;
}

export interface BehaviorModificationPlan {
  readonly targetBehavior: string;
  readonly baseline: number;
  readonly goal: number;
  readonly intervention: string;
  readonly measurement: string;
  readonly reinforcement: ReinforcementSchedule;
  readonly progress: number;
}

export interface ShapingStep {
  readonly step: number;
  readonly criterion: string;
  readonly successRate: number;
  readonly approximation: string;
}

export interface ExtinctionRecord {
  readonly behavior: string;
  readonly preExtinctionRate: number;
  readonly postExtinctionRate: number;
  readonly extinctionBurst: boolean;
  readonly spontaneousRecovery: number;
  readonly resurgence: boolean;
}

export interface ObservationalLearningRecord {
  readonly model: string;
  readonly observer: string;
  readonly observedBehavior: string;
  readonly retention: number;
  readonly reproduction: number;
  readonly motivation: number;
  readonly learned: boolean;
}

export interface BehavioralAssessment {
  readonly instrument: string;
  readonly domains: string[];
  readonly score: number;
  readonly percentile: number;
  readonly interpretation: string;
}

export interface ExposureHierarchy {
  readonly item: string;
  readonly subjectiveUnits: number;
  readonly predictedDistress: number;
  readonly actualDistress: number;
  readonly mastered: boolean;
}

export class BehavioralPsychology {
  private _trials: ConditioningTrial[] = [];
  private _behaviors: Map<string, BehaviorAnalysis> = new Map();
  private _schedules: Map<string, ReinforcementSchedule> = new Map();
  private _modificationPlans: Map<string, BehaviorModificationPlan> = new Map();
  private _extinctionRecords: ExtinctionRecord[] = [];
  private _observationalRecords: ObservationalLearningRecord[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedSchedules();
  }

  get trialCount(): number { return this._trials.length; }
  get behaviorCount(): number { return this._behaviors.size; }
  get scheduleCount(): number { return this._schedules.size; }
  get planCount(): number { return this._modificationPlans.size; }
  get extinctionRecordCount(): number { return this._extinctionRecords.length; }
  get observationalRecordCount(): number { return this._observationalRecords.length; }

  classicalConditioning(cs: string, us: string, trials: number): ClassicalConditioningResult {
    const acquisitionCurve = Array.from({ length: trials }, (_, i) => 1 - Math.exp(-i * 0.15));
    const finalStrength = acquisitionCurve[acquisitionCurve.length - 1];
    const extinctionTrials = Math.ceil(finalStrength / 0.05);
    const result: ClassicalConditioningResult = {
      cs,
      us,
      cr: `conditioned-response-to-${cs}`,
      ur: `unconditioned-response-to-${us}`,
      acquisitionTrials: trials,
      extinctionTrials,
      spontaneousRecoveryLevel: Number((finalStrength * 0.3).toFixed(2)),
    };
    this._history.push({ op: 'classicalConditioning', cs, us, trials, finalStrength });
    return result;
  }

  operantConditioning(behavior: string, reinforcement: ReinforcementSchedule['type'], baselineRate: number): OperantResponse {
    const rateMap: Record<string, number> = {
      'continuous': baselineRate * 1.5,
      'fixed-ratio': baselineRate * 1.3,
      'variable-ratio': baselineRate * 1.4,
      'fixed-interval': baselineRate * 1.1,
      'variable-interval': baselineRate * 1.2,
    };
    const rate = rateMap[reinforcement] ?? baselineRate;
    const response: OperantResponse = {
      behavior,
      rate: Number(rate.toFixed(2)),
      cumulative: Math.round(rate * 100),
      extinctionBurst: false,
      spontaneousRecovery: 0,
    };
    this._history.push({ op: 'operantConditioning', behavior, reinforcement, rate });
    return response;
  }

  reinforcementSchedule(type: ReinforcementSchedule['type'], ratio?: number, interval?: number): ReinforcementSchedule {
    const descriptions: Record<string, string> = {
      'fixed-ratio': 'reinforcement-after-fixed-number-of-responses',
      'variable-ratio': 'reinforcement-after-variable-number-of-responses',
      'fixed-interval': 'reinforcement-after-fixed-time-interval',
      'variable-interval': 'reinforcement-after-variable-time-interval',
      'continuous': 'reinforcement-after-every-response',
    };
    const schedule: ReinforcementSchedule = { type, ratio, interval, description: descriptions[type] };
    this._schedules.set(type, schedule);
    return schedule;
  }

  schedulePerformance(type: ReinforcementSchedule['type']): { pattern: string; postReinforcementPause: number; rate: number; resistanceToExtinction: number } {
    const patterns: Record<string, { pattern: string; pause: number; rate: number; resistance: number }> = {
      'fixed-ratio': { pattern: 'scalloped-with-post-ratio-pause', pause: 2.5, rate: 1.4, resistance: 0.7 },
      'variable-ratio': { pattern: 'steady-high-rate', pause: 0.5, rate: 1.5, resistance: 0.9 },
      'fixed-interval': { pattern: 'scalloped-with-post-reinforcement-pause', pause: 3.0, rate: 1.1, resistance: 0.5 },
      'variable-interval': { pattern: 'moderate-steady-rate', pause: 1.0, rate: 1.2, resistance: 0.6 },
      'continuous': { pattern: 'rapid-acquisition', pause: 0.1, rate: 1.5, resistance: 0.2 },
    };
    const p = patterns[type];
    this._history.push({ op: 'schedulePerformance', type });
    return { pattern: p.pattern, postReinforcementPause: p.pause, rate: p.rate, resistanceToExtinction: p.resistance };
  }

  behaviorAnalysis(antecedent: string, behavior: string, consequence: string): BehaviorAnalysis {
    const functions: BehaviorAnalysis['function'][] = ['escape', 'attention', 'sensory', 'tangibles'];
    const func = functions[Math.floor(Math.random() * functions.length)];
    const analysis: BehaviorAnalysis = {
      antecedent,
      behavior,
      consequence,
      function: func,
      frequency: Math.random(),
      intensity: Math.random(),
    };
    this._behaviors.set(behavior, analysis);
    this._history.push({ op: 'behaviorAnalysis', behavior, function: func });
    return analysis;
  }

  functionalBehaviorAssessment(observations: { antecedent: string; behavior: string; consequence: string; frequency: number }[]): { hypothesizedFunction: string; maintainingVariable: string; recommendations: string[] } {
    const freqMap = new Map<string, number>();
    for (const obs of observations) {
      const key = `${obs.behavior}|${obs.consequence}`;
      freqMap.set(key, (freqMap.get(key) ?? 0) + obs.frequency);
    }
    let maxKey = '';
    let maxFreq = 0;
    for (const [key, freq] of freqMap) {
      if (freq > maxFreq) { maxFreq = freq; maxKey = key; }
    }
    const [behavior, consequence] = maxKey.split('|');
    const functions: Record<string, string> = {
      'escape': 'avoidance-maintained',
      'attention': 'attention-maintained',
      'sensory': 'automatically-reinforced',
      'tangibles': 'tangible-maintained',
    };
    const hypothesizedFunction = functions[consequence] ?? 'unknown';
    const recommendations = [
      'modify-antecedents',
      'teach-replacement-behavior',
      'modify-consequences',
      'environmental-enrichment',
    ];
    this._history.push({ op: 'functionalBehaviorAssessment', behavior, hypothesizedFunction });
    return { hypothesizedFunction, maintainingVariable: consequence, recommendations };
  }

  shaping(targetBehavior: string, currentBehavior: string, steps: number): ShapingStep[] {
    const shapingSteps: ShapingStep[] = [];
    for (let i = 0; i < steps; i++) {
      shapingSteps.push({
        step: i + 1,
        criterion: `approximation-${i + 1}-toward-${targetBehavior}`,
        successRate: Number((0.5 + i * 0.08).toFixed(2)),
        approximation: `${currentBehavior}-progression-${i + 1}`,
      });
    }
    this._history.push({ op: 'shaping', targetBehavior, steps });
    return shapingSteps;
  }

  chaining(behaviors: string[], type: 'forward' | 'backward' | 'total-task'): { sequence: string[]; links: number; masteredLinks: number; promptingLevel: string } {
    const masteredLinks = Math.floor(behaviors.length * 0.7);
    const promptingLevel = masteredLinks === behaviors.length ? 'independent' : 'partial-prompt';
    this._history.push({ op: 'chaining', type, links: behaviors.length });
    return { sequence: behaviors, links: behaviors.length, masteredLinks, promptingLevel };
  }

  tokenEconomy(tokens: string, backupReinforcers: string[], exchangeRate: number, targetBehaviors: string[]): TokenEconomy {
    const economy: TokenEconomy = {
      tokens,
      backupReinforcers,
      exchangeRate,
      targetBehaviors,
      effectiveness: Number((0.7 + backupReinforcers.length * 0.05).toFixed(2)),
    };
    this._history.push({ op: 'tokenEconomy', tokens, targetBehaviors: targetBehaviors.length });
    return economy;
  }

  behaviorModification(targetBehavior: string, baseline: number, goal: number, intervention: string, measurement: string, reinforcement: ReinforcementSchedule): BehaviorModificationPlan {
    const plan: BehaviorModificationPlan = {
      targetBehavior,
      baseline,
      goal,
      intervention,
      measurement,
      reinforcement,
      progress: 0,
    };
    this._modificationPlans.set(targetBehavior, plan);
    this._history.push({ op: 'behaviorModification', targetBehavior, intervention });
    return plan;
  }

  extinction(behavior: string, preExtinctionRate: number, postExtinctionRate: number): ExtinctionRecord {
    const record: ExtinctionRecord = {
      behavior,
      preExtinctionRate,
      postExtinctionRate,
      extinctionBurst: postExtinctionRate > preExtinctionRate * 1.2,
      spontaneousRecovery: Number((preExtinctionRate * 0.3).toFixed(2)),
      resurgence: false,
    };
    this._extinctionRecords.push(record);
    this._history.push({ op: 'extinction', behavior, preExtinctionRate, postExtinctionRate });
    return record;
  }

  spontaneousRecovery(behavior: string, originalStrength: number, timeSinceExtinction: number): number {
    const recovery = originalStrength * Math.exp(-timeSinceExtinction * 0.1) * 0.4;
    this._history.push({ op: 'spontaneousRecovery', behavior, recovery });
    return Number(recovery.toFixed(2));
  }

  generalization(behavior: string, trainedSetting: string, novelSettings: string[]): { settings: string[]; generalizationRatio: number; maintenance: number } {
    const ratio = Math.min(1, novelSettings.length * 0.15 + 0.3);
    const maintenance = Number((0.7 + Math.random() * 0.25).toFixed(2));
    this._history.push({ op: 'generalization', behavior, settings: novelSettings.length });
    return { settings: novelSettings, generalizationRatio: Number(ratio.toFixed(2)), maintenance };
  }

  discriminationTraining(behavior: string, sD: string, sDelta: string, trials: number): { accuracy: number; stimulusControl: number; errorRate: number } {
    const accuracy = Math.min(0.95, 0.5 + trials * 0.02);
    const stimulusControl = accuracy;
    const errorRate = Number((1 - accuracy).toFixed(2));
    this._history.push({ op: 'discriminationTraining', behavior, sD, trials });
    return { accuracy: Number(accuracy.toFixed(2)), stimulusControl: Number(stimulusControl.toFixed(2)), errorRate };
  }

  stimulusControl(behavior: string, controllingStimuli: string[]): { controllingStimuli: string[]; strength: number; generalizationGradient: number[] } {
    const strength = Math.min(1, controllingStimuli.length * 0.2 + 0.3);
    const gradient = controllingStimuli.map((_, i) => Number((strength * Math.exp(-i * 0.3)).toFixed(2)));
    this._history.push({ op: 'stimulusControl', behavior, stimuli: controllingStimuli.length });
    return { controllingStimuli, strength: Number(strength.toFixed(2)), generalizationGradient: gradient };
  }

  observationalLearning(model: string, observer: string, observedBehavior: string, retention: number, reproduction: number, motivation: number): ObservationalLearningRecord {
    const record: ObservationalLearningRecord = {
      model,
      observer,
      observedBehavior,
      retention,
      reproduction,
      motivation,
      learned: retention > 0.5 && reproduction > 0.5 && motivation > 0.5,
    };
    this._observationalRecords.push(record);
    this._history.push({ op: 'observationalLearning', model, observer, observedBehavior, learned: record.learned });
    return record;
  }

  vicariousConditioning(observer: string, modelConsequence: 'rewarded' | 'punished', behavior: string): { learningSpeed: number; avoidance: boolean; inhibition: number } {
    const learningSpeed = modelConsequence === 'punished' ? 0.3 : 0.7;
    const avoidance = modelConsequence === 'punished';
    const inhibition = modelConsequence === 'punished' ? 0.8 : 0.1;
    this._history.push({ op: 'vicariousConditioning', observer, modelConsequence });
    return { learningSpeed: Number(learningSpeed.toFixed(2)), avoidance, inhibition: Number(inhibition.toFixed(2)) };
  }

  exposureTherapy(hierarchy: ExposureHierarchy[], sessions: number): { progress: number; habituationCurve: number[]; endSubjectiveUnits: number; masteredItems: number } {
    const habituationCurve = Array.from({ length: sessions }, (_, i) => Number(((hierarchy[0]?.subjectiveUnits ?? 50) * Math.exp(-i * 0.2)).toFixed(2)));

    const masteredItems = Math.floor(hierarchy.length * Math.min(1, sessions * 0.1));
    const progress = Number((masteredItems / hierarchy.length).toFixed(2));
    this._history.push({ op: 'exposureTherapy', sessions, masteredItems });
    return { progress, habituationCurve, endSubjectiveUnits: habituationCurve[habituationCurve.length - 1] ?? 0, masteredItems };
  }

  responseCost(behavior: string, cost: number, baselineRate: number): { newRate: number; suppressionRatio: number; recovery: number } {
    const suppression = Math.min(0.9, cost * 0.3);
    const newRate = baselineRate * (1 - suppression);
    this._history.push({ op: 'responseCost', behavior, cost });
    return { newRate: Number(newRate.toFixed(2)), suppressionRatio: Number(suppression.toFixed(2)), recovery: Number((baselineRate * 0.3).toFixed(2)) };
  }

  timeOut(behavior: string, duration: number, baselineRate: number): { suppressionEffect: number; durationEffect: number; emotionalResponse: string; recoveryRate: number } {
    const suppression = Math.min(0.8, duration * 0.02);
    const durationEffect = duration > 10 ? 0.7 : duration > 5 ? 0.5 : 0.3;
    this._history.push({ op: 'timeOut', behavior, duration });
    return {
      suppressionEffect: Number(suppression.toFixed(2)),
      durationEffect: Number(durationEffect.toFixed(2)),
      emotionalResponse: duration > 15 ? 'distress' : 'mild-frustration',
      recoveryRate: Number((baselineRate * 0.4).toFixed(2)),
    };
  }

  behavioralActivation(depressionSeverity: number, activitySchedule: string[], monitoringDays: number): { activationLevel: number; moodImprovement: number; avoidanceReduction: number; behavioralGoals: string[] } {
    const activation = Math.min(1, activitySchedule.length * 0.05 + 0.3);
    const moodImprovement = Number((activation * 0.6 + (1 - depressionSeverity) * 0.4).toFixed(2));
    const avoidanceReduction = Number((monitoringDays * 0.02).toFixed(2));
    this._history.push({ op: 'behavioralActivation', depressionSeverity, monitoringDays });
    return { activationLevel: Number(activation.toFixed(2)), moodImprovement, avoidanceReduction, behavioralGoals: activitySchedule.slice(0, 3) };
  }

  habitReversal(competingResponse: string, awarenessTraining: number, relaxationTraining: number): { effectiveness: number; awarenessScore: number; competingResponseStrength: number; relapseRisk: number } {
    const effectiveness = Number(((awarenessTraining + relaxationTraining + 0.5) / 3).toFixed(2));
    this._history.push({ op: 'habitReversal', competingResponse });
    return { effectiveness, awarenessScore: Number(awarenessTraining.toFixed(2)), competingResponseStrength: Number((effectiveness * 0.8).toFixed(2)), relapseRisk: Number((1 - effectiveness).toFixed(2)) };
  }

  differentialReinforcement(targetBehavior: string, alternativeBehavior: string, reinforcementRate: number, extinctionRate: number): { targetDecrease: number; alternativeIncrease: number; behaviorRatio: number } {
    const targetDecrease = Math.min(1, extinctionRate * 0.5);
    const alternativeIncrease = Math.min(1, reinforcementRate * 0.6);
    this._history.push({ op: 'differentialReinforcement', targetBehavior, alternativeBehavior });
    return { targetDecrease: Number(targetDecrease.toFixed(2)), alternativeIncrease: Number(alternativeIncrease.toFixed(2)), behaviorRatio: Number((alternativeIncrease / Math.max(0.01, targetDecrease)).toFixed(2)) };
  }

  stimulusEquivalence(classA: string, classB: string, classC: string): { reflexivity: boolean; symmetry: boolean; transitivity: boolean; equivalenceClass: string[] } {
    this._history.push({ op: 'stimulusEquivalence', classes: [classA, classB, classC] });
    return { reflexivity: true, symmetry: true, transitivity: true, equivalenceClass: [classA, classB, classC] };
  }

  matchingLaw(alternativeARate: number, alternativeAReward: number, alternativeBRate: number, alternativeBReward: number): { ratio: number; deviation: number; sensitivity: number; bias: number } {
    const ratioA = alternativeARate / Math.max(0.0001, alternativeARate + alternativeBRate);
    const ratioRew = alternativeAReward / Math.max(0.0001, alternativeAReward + alternativeBReward);
    const sensitivity = ratioA / Math.max(0.0001, ratioRew);
    this._history.push({ op: 'matchingLaw', alternativeARate, alternativeBRate });
    return { ratio: Number(ratioA.toFixed(2)), deviation: Number(Math.abs(ratioA - ratioRew).toFixed(2)), sensitivity: Number(sensitivity.toFixed(2)), bias: Number((alternativeAReward / Math.max(0.0001, alternativeBReward)).toFixed(2)) };
  }

  behavioralMomentum(highProbabilityRequests: string[], lowProbabilityRequest: string): { complianceRate: number; momentumEffect: number; highPCompliance: number } {
    const highPCompliance = 0.9;
    const momentumEffect = highProbabilityRequests.length * 0.05;
    const complianceRate = Math.min(1, 0.4 + momentumEffect);
    this._history.push({ op: 'behavioralMomentum', lowProbabilityRequest });
    return { complianceRate: Number(complianceRate.toFixed(2)), momentumEffect: Number(momentumEffect.toFixed(2)), highPCompliance };
  }

 PremackAnalysis(preferredActivities: string[], nonPreferredActivities: string[]): { hierarchy: string[]; contingencyProbability: number; reinforcementValue: Record<string, number> } {
    const hierarchy = [...preferredActivities, ...nonPreferredActivities];
    const reinforcementValue: Record<string, number> = {};
    preferredActivities.forEach((a, i) => { reinforcementValue[a] = Number((1 - i * 0.1).toFixed(2)); });
    nonPreferredActivities.forEach((a, i) => { reinforcementValue[a] = Number((0.3 - i * 0.05).toFixed(2)); });
    this._history.push({ op: 'PremackAnalysis', preferredCount: preferredActivities.length });
    return { hierarchy, contingencyProbability: 0.75, reinforcementValue };
  }

  private _seedSchedules(): void {
    const schedules: ReinforcementSchedule[] = [
      { type: 'fixed-ratio', ratio: 5, description: 'reinforcement-after-every-5-responses' },
      { type: 'variable-ratio', ratio: 10, description: 'reinforcement-after-average-10-responses' },
      { type: 'fixed-interval', interval: 60, description: 'reinforcement-after-every-60-seconds' },
      { type: 'variable-interval', interval: 120, description: 'reinforcement-after-average-120-seconds' },
      { type: 'continuous', description: 'reinforcement-after-every-response' },
    ];
    for (const s of schedules) this._schedules.set(s.type, s);
  }

  /** Compute the conditioned reinforcement value. */
  conditionedReinforcementValue(pairingsWithPrimary: number, primaryReinforcerValue: number): number {
    return Number((Math.min(1, pairingsWithPrimary * 0.05) * primaryReinforcerValue).toFixed(2));
  }

  /** Compute the partial reinforcement extinction effect (PREE). */
  partialReinforcementExtinctionEffect(continuousReinforcementTrials: number, partialReinforcementTrials: number): number {
    return Number((partialReinforcementTrials / Math.max(1, continuousReinforcementTrials) * 0.5).toFixed(2));
  }

  /** Compute the behavioral contrast (positive or negative). */
  behavioralContrast(baselineRate: number, changedScheduleRate: number): number {
    return Number((changedScheduleRate - baselineRate).toFixed(2));
  }

  /** Compute the resistance to change. */
  resistanceToChange(reinforcementRate: number, alternativeReinforcement: number): number {
    return Number((reinforcementRate / Math.max(0.0001, reinforcementRate + alternativeReinforcement)).toFixed(2));
  }

  /** Compute the overmatching coefficient. */
  overmatchingCoefficient(obtainedRatio: number, scheduledRatio: number): number {
    if (scheduledRatio === 0) return 0;
    return Number((Math.log(obtainedRatio) / Math.log(scheduledRatio)).toFixed(2));
  }

  /** Compute the delay discounting function (Mazur's hyperbolic). */
  delayDiscounting(value: number, delay: number, k: number = 1): number {
    return Number((value / (1 + k * delay)).toFixed(2));
  }

  /** Compute the probability discounting function. */
  probabilityDiscounting(value: number, probability: number): number {
    return Number((value * probability).toFixed(2));
  }

  /** Compute the self-control choice (larger-later vs smaller-sooner). */
  selfControlChoice(smallerSoonerValue: number, smallerSoonerDelay: number, largerLaterValue: number, largerLaterDelay: number, k: number = 1): string {
    const ssDiscounted = this.delayDiscounting(smallerSoonerValue, smallerSoonerDelay, k);
    const llDiscounted = this.delayDiscounting(largerLaterValue, largerLaterDelay, k);
    return llDiscounted > ssDiscounted ? 'larger-later' : 'smaller-sooner';
  }

  /** Compute the demand curve (Hursh's exponential model). */
  demandCurve(baselineConsumption: number, price: number, alpha: number, k: number): number {
    return Number((baselineConsumption * Math.exp(-alpha * (price * baselineConsumption) * k)).toFixed(2));
  }

  /** Compute the essential value. */
  essentialValue(alpha: number, k: number): number {
    return Number((1 / (alpha * k)).toFixed(2));
  }

  /** Compute the reinforcer efficacy. */
  reinforcerEfficacy(magnitude: number, quality: number, immediacy: number, probability: number): number {
    return Number(((magnitude * quality * immediacy * probability) / 4).toFixed(2));
  }

  /** Compute the response deprivation hypothesis prediction. */
  responseDeprivation(baselineRate: number, restrictedRate: number, contingencyRate: number): boolean {
    return restrictedRate < baselineRate && contingencyRate > restrictedRate;
  }

  /** Compute the behavioral economics substitution elasticity. */
  substitutionElasticity(quantityA1: number, quantityA2: number, quantityB1: number, quantityB2: number): number {
    const dA = quantityA2 - quantityA1;
    const dB = quantityB2 - quantityB1;
    const avgA = (quantityA1 + quantityA2) / 2;
    const avgB = (quantityB1 + quantityB2) / 2;
    if (avgA === 0 || avgB === 0) return 0;
    return Number(((dA / avgA) / (dB / avgB)).toFixed(2));
  }

  /** Compute the melioration prediction. */
  melioration(rateA: number, reinforcementA: number, rateB: number, reinforcementB: number): string {
    const localA = reinforcementA / Math.max(0.0001, rateA);
    const localB = reinforcementB / Math.max(0.0001, rateB);
    return localA > localB ? 'A' : 'B';
  }

  /** Compute the maximization prediction. */
  maximization(rateA: number, reinforcementA: number, rateB: number, reinforcementB: number): string {
    const totalA = rateA * reinforcementA;
    const totalB = rateB * reinforcementB;
    return totalA > totalB ? 'A' : 'B';
  }

  /** Compute the stimulus generalization gradient. */
  generalizationGradient(testStimuli: number[], trainedStimulus: number, peakResponse: number): number[] {
    return testStimuli.map(s => Number((peakResponse * Math.exp(-Math.abs(s - trainedStimulus) * 0.5)).toFixed(2)));
  }

  /** Compute the peak shift magnitude. */
  peakShift(trainedStimulus: number, sMinus: number, testStimuli: number[]): number {
    const gradients = testStimuli.map(s => Math.exp(-Math.abs(s - trainedStimulus) * 0.5) - 0.5 * Math.exp(-Math.abs(s - sMinus) * 0.5));
    const peakIndex = gradients.indexOf(Math.max(...gradients));
    return Number((testStimuli[peakIndex] - trainedStimulus).toFixed(2));
  }

  /** Compute the errorless discrimination learning prediction. */
  errorlessDiscrimination(trials: number, fadingSteps: number): number {
    return Number((Math.min(1, trials * 0.01 + fadingSteps * 0.05)).toFixed(2));
  }

  /** Compute the learned helplessness index. */
  learnedHelplessness(uncontrollableTrials: number, controllableTrials: number): number {
    return Number((Math.min(1, uncontrollableTrials / Math.max(1, uncontrollableTrials + controllableTrials))).toFixed(2));
  }

  /** Compute the conditioned suppression ratio. */
  conditionedSuppression(baselineRate: number, csRate: number): number {
    const total = baselineRate + csRate;
    if (total === 0) return 0.5;
    return Number((csRate / total).toFixed(2));
  }

  /** Compute the signaled avoidance learning rate. */
  signaledAvoidance(csUsInterval: number, responseUsInterval: number): number {
    return Number((Math.min(1, responseUsInterval / Math.max(0.0001, csUsInterval))).toFixed(2));
  }

  /** Compute the operant resurgence prediction. */
  resurgencePrediction(historicalRate: number, alternativeRate: number, extinctionRate: number): number {
    return Number((historicalRate * (1 - alternativeRate) * extinctionRate).toFixed(2));
  }

  /** Compute the behavioral mass (total responses). */
  behavioralMass(responseRate: number, duration: number): number {
    return Math.round(responseRate * duration);
  }

  /** Compute the interresponse time distribution. */
  interresponseTime(meanIRT: number, variability: number): number[] {
    return Array.from({ length: 10 }, (_, i) => Number((meanIRT + (i - 5) * variability).toFixed(2)));
  }

  /** Compute the reward prediction error (Rescorla-Wagner). */
  rewardPredictionError(actualReward: number, predictedReward: number, learningRate: number): number {
    return Number((learningRate * (actualReward - predictedReward)).toFixed(4));
  }

  /** Compute the associative strength (Rescorla-Wagner). */
  associativeStrength(trials: number, alpha: number, beta: number, lambda: number): number {
    return Number((lambda * (1 - Math.exp(-alpha * beta * trials))).toFixed(4));
  }

  /** Compute the blocking effect prediction. */
  blockingEffect(compoundTrials: number, priorStrength: number, lambda: number): number {
    const predictionError = lambda - priorStrength;
    return Number((Math.max(0, predictionError * compoundTrials * 0.01)).toFixed(2));
  }

  /** Compute the relative validity prediction. */
  relativeValidity(validCueTrials: number, invalidCueTrials: number): number {
    const total = validCueTrials + invalidCueTrials;
    if (total === 0) return 0;
    return Number((validCueTrials / total - invalidCueTrials / total).toFixed(2));
  }

  /** Compute the overshadowing effect. */
  overshadowing(salienceA: number, salienceB: number): { strengthA: number; strengthB: number } {
    const total = salienceA + salienceB;
    if (total === 0) return { strengthA: 0, strengthB: 0 };
    return { strengthA: Number((salienceA / total).toFixed(2)), strengthB: Number((salienceB / total).toFixed(2)) };
  }

  /** Compute the conditioned taste aversion strength. */
  conditionedTasteAversion(tasteExposure: number, illnessIntensity: number, tasteIllnessInterval: number): number {
    const intervalFactor = Math.exp(-tasteIllnessInterval * 0.1);
    return Number((tasteExposure * illnessIntensity * intervalFactor).toFixed(2));
  }

  /** Compute the latent inhibition effect. */
  latentInhibition(preexposures: number, alpha: number): number {
    return Number((Math.exp(-alpha * preexposures)).toFixed(2));
  }

  /** Compute the sensory preconditioning strength. */
  sensoryPreconditioning(s1s2Pairings: number, s2reinforcement: number): number {
    return Number((s1s2Pairings * 0.05 * s2reinforcement).toFixed(2));
  }

  /** Compute the second-order conditioning strength. */
  secondOrderConditioning(cs1Trials: number, cs2Pairings: number): number {
    return Number((cs1Trials * 0.1 * cs2Pairings * 0.05).toFixed(2));
  }

  /** Compute the inhibitory conditioning prediction. */
  inhibitoryConditioning(excitorTrials: number, inhibitorTrials: number, lambda: number): number {
    return Number((Math.max(0, lambda - excitorTrials * 0.01) * inhibitorTrials * 0.01).toFixed(2));
  }

  /** Compute the occasion setting strength. */
  occasionSetting(featureTrials: number, targetTrials: number): number {
    return Number((Math.min(1, featureTrials * 0.02 + targetTrials * 0.01)).toFixed(2));
  }

  /** Compute the behavioral economics demand elasticity. */
  demandElasticity(consumption1: number, consumption2: number, price1: number, price2: number): number {
    const dQ = consumption2 - consumption1;
    const dP = price2 - price1;
    const avgQ = (consumption1 + consumption2) / 2;
    const avgP = (price1 + price2) / 2;
    if (avgQ === 0 || avgP === 0 || dP === 0) return 0;
    return Number(((dQ / avgQ) / (dP / avgP)).toFixed(2));
  }

  /** Compute the unit price effect. */
  unitPriceEffect(responseCost: number, reinforcerMagnitude: number): number {
    return Number((responseCost / Math.max(0.0001, reinforcerMagnitude)).toFixed(2));
  }

  /** Compute the open economy vs closed economy difference. */
  economyTypeEffect(baselineConsumption: number, economyType: 'open' | 'closed'): number {
    return Number((economyType === 'open' ? baselineConsumption * 1.2 : baselineConsumption * 0.8).toFixed(2));
  }

  /** Compute the schedule-induced behavior prediction. */
  scheduleInducedBehavior(interval: number, bodyWeight: number): number {
    return Number((Math.min(1, 60 / Math.max(1, interval) * 0.1 + (1 - bodyWeight) * 0.2)).toFixed(2));
  }

  /** Compute the adjunctive behavior rate. */
  adjunctiveBehaviorRate(interval: number, postReinforcementTime: number): number {
    return Number((Math.min(1, postReinforcementTime / Math.max(1, interval) * 2)).toFixed(2));
  }

  /** Compute the preference reversal magnitude. */
  preferenceReversal(ssValue: number, ssDelay: number, llValue: number, llDelay: number, k1: number, k2: number): boolean {
    return this.delayDiscounting(ssValue, ssDelay, k1) > this.delayDiscounting(llValue, llDelay, k1) &&
           this.delayDiscounting(ssValue, ssDelay, k2) < this.delayDiscounting(llValue, llDelay, k2);
  }

  /** Compute the temporal discounting area under curve (AUC). */
  temporalDiscountingAUC(values: number[], delays: number[]): number {
    if (values.length === 0 || delays.length === 0) return 0;
    const normalized = values.map((v, i) => v / Math.max(1, delays[i]));
    return Number((normalized.reduce((a, b) => a + b, 0) / normalized.length).toFixed(4));
  }

  /** Compute the impulsive choice ratio. */
  impulsiveChoiceRatio(choicesSS: number, choicesLL: number): number {
    const total = choicesSS + choicesLL;
    if (total === 0) return 0.5;
    return Number((choicesSS / total).toFixed(2));
  }

  /** Compute the hyperbolic discounting indifference point. */
  hyperbolicIndifferencePoint(smallerReward: number, largerReward: number, delayLarge: number, k: number): number {
    return Number(((largerReward / smallerReward - 1) / k - delayLarge).toFixed(2));
  }

  /** Compute the exponential discounting value. */
  exponentialDiscounting(value: number, delay: number, r: number): number {
    return Number((value * Math.exp(-r * delay)).toFixed(2));
  }

  /** Compute the quasi-hyperbolic discounting (beta-delta model). */
  quasiHyperbolicDiscounting(value: number, delay: number, beta: number, delta: number): number {
    return Number((value * beta * Math.pow(delta, delay)).toFixed(2));
  }

  /** Compute the probability weighting function (Tversky-Kahneman). */
  probabilityWeighting(probability: number, gamma: number = 0.61): number {
    return Number((Math.pow(probability, gamma) / Math.pow(Math.pow(probability, gamma) + Math.pow(1 - probability, gamma), 1 / gamma)).toFixed(2));
  }

  /** Compute the cumulative prospect theory value. */
  prospectTheoryValue(outcomes: number[], probabilities: number[], alpha: number = 0.88, beta: number = 0.88, lambda: number = 2.25): number {
    let value = 0;
    for (let i = 0; i < outcomes.length; i++) {
      const v = outcomes[i] >= 0 ? Math.pow(outcomes[i], alpha) : -lambda * Math.pow(-outcomes[i], beta);
      value += v * this.probabilityWeighting(probabilities[i]);
    }
    return Number(value.toFixed(2));
  }

  /** Compute the loss aversion coefficient. */
  lossAversionCoefficient(gainEquivalence: number, lossAmount: number): number {
    if (gainEquivalence === 0) return 0;
    return Number((lossAmount / gainEquivalence).toFixed(2));
  }

  /** Compute the reference dependence effect. */
  referenceDependence(outcome: number, referencePoint: number, alpha: number = 0.88, lambda: number = 2.25): number {
    const delta = outcome - referencePoint;
    return delta >= 0 ? Number(Math.pow(delta, alpha).toFixed(2)) : Number((-lambda * Math.pow(-delta, alpha)).toFixed(2));
  }

  /** Compute the endowment effect magnitude. */
  endowmentEffect(willingnessToPay: number, willingnessToAccept: number): number {
    if (willingnessToPay === 0) return 0;
    return Number((willingnessToAccept / willingnessToPay).toFixed(2));
  }

  /** Compute the sunk cost effect. */
  sunkCostEffect(investedCost: number, expectedValue: number, additionalCost: number): boolean {
    return investedCost > 0 && expectedValue < additionalCost;
  }

  /** Compute the framing effect magnitude. */
  framingEffect(gainFrameChoice: number, lossFrameChoice: number): number {
    return Number(Math.abs(gainFrameChoice - lossFrameChoice).toFixed(2));
  }

  /** Compute the certainty effect. */
  certaintyEffect(probability1: number, value1: number, probability2: number, value2: number): number {
    return Number((this.probabilityWeighting(probability1) * value1 - this.probabilityWeighting(probability2) * value2).toFixed(2));
  }

  /** Compute the isolation effect. */
  isolationEffect(commonOutcome: number, uniqueOutcome1: number, uniqueOutcome2: number): number {
    return Number((Math.abs(uniqueOutcome1 - uniqueOutcome2) / Math.max(0.0001, Math.abs(commonOutcome))).toFixed(2));
  }

  /** Generate a behavioral psychology dashboard. */
  behavioralDashboard(): Record<string, unknown> {
    return {
      conditioningTrials: this._trials.length,
      behaviorsAnalyzed: this._behaviors.size,
      reinforcementSchedules: this._schedules.size,
      modificationPlans: this._modificationPlans.size,
      extinctionRecords: this._extinctionRecords.length,
      observationalRecords: this._observationalRecords.length,
      timestamp: Date.now(),
    };
  }

  toPacket(): DataPacket<{
    trials: number;
    behaviors: number;
    schedules: number;
    modificationPlans: number;
    extinctionRecords: number;
    observationalRecords: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'BehavioralPsychology'],
      priority: 1,
      phase: 'behavioral-psychology',
    };
    return {
      id: `behavioral-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        trials: this._trials.length,
        behaviors: this._behaviors.size,
        schedules: this._schedules.size,
        modificationPlans: this._modificationPlans.size,
        extinctionRecords: this._extinctionRecords.length,
        observationalRecords: this._observationalRecords.length,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._trials = [];
    this._behaviors.clear();
    this._schedules.clear();
    this._modificationPlans.clear();
    this._extinctionRecords = [];
    this._observationalRecords = [];
    this._history = [];
    this._counter = 0;
    this._seedSchedules();
  }
}
