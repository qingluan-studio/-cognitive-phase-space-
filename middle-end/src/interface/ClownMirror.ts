export type ErrorTone = 'self-deprecating' | 'slapstick' | 'absurdist' | 'deadpan' | 'melodramatic';

export interface WrappedError {
  code: string;
  rawMessage: string;
  story: string;
  tone: ErrorTone;
  severity: number;
  timestamp: number;
  sentimentScore: number;
  complexity: number;
}

export interface ClownProfile {
  defaultTone: ErrorTone;
  maxSeverityForHumor: number;
  templates: Map<ErrorTone, string[]>;
  sentimentThreshold: number;
}

export interface SentimentAnalysis {
  score: number;
  intensity: number;
  dominantEmotion: 'anger' | 'fear' | 'sadness' | 'confusion' | 'neutral';
}

export interface StoryMetrics {
  length: number;
  humorDensity: number;
  wordVariety: number;
  readability: number;
}

export class ClownMirror {
  private _profile: ClownProfile;
  private _wrapped: WrappedError[] = [];
  private _suppressed: Map<string, number> = new Map();
  private _suppressionThreshold = 5;
  private _fatigueIndex = 0;
  private _emotionVocabulary: Record<string, { emotion: SentimentAnalysis['dominantEmotion']; weight: number }> = {
    'error': { emotion: 'confusion', weight: 0.3 },
    'fail': { emotion: 'sadness', weight: 0.4 },
    'timeout': { emotion: 'fear', weight: 0.3 },
    'critical': { emotion: 'anger', weight: 0.5 },
    'warning': { emotion: 'fear', weight: 0.2 },
    'exception': { emotion: 'confusion', weight: 0.4 },
    'crash': { emotion: 'anger', weight: 0.6 },
    'retry': { emotion: 'sadness', weight: 0.3 },
    'invalid': { emotion: 'confusion', weight: 0.4 },
    'denied': { emotion: 'anger', weight: 0.4 },
  };

  constructor(profile?: Partial<ClownProfile>) {
    this._profile = {
      defaultTone: profile?.defaultTone ?? 'self-deprecating',
      maxSeverityForHumor: profile?.maxSeverityForHumor ?? 0.7,
      templates: profile?.templates ?? this._defaultTemplates(),
      sentimentThreshold: profile?.sentimentThreshold ?? 0.3,
    };
  }

  private _defaultTemplates(): Map<ErrorTone, string[]> {
    const map = new Map<ErrorTone, string[]>();
    map.set('self-deprecating', [
      'I tried my best and still face-planted: {msg}',
      'My code did a whoopsie-doodle: {msg}',
      'I appear to have misplaced my competence: {msg}',
      'Apologies for the brain fart: {msg}',
    ]);
    map.set('slapstick', [
      '*trips over a null pointer* — {msg}',
      'Slipped on a banana exception: {msg}',
      'Attempted a graceful exit, hit a wall: {msg}',
      'Face-planted into an error: {msg}',
    ]);
    map.set('absurdist', [
      'The existential dread reports: {msg}',
      'A goose confiscated the data: {msg}',
      'The universe conspires against us: {msg}',
      'Reality has glitch: {msg}',
    ]);
    map.set('deadpan', ['Error occurred. Naturally. {msg}', 'Yep, that happened. {msg}']);
    map.set('melodramatic', [
      'Alas! The data hath perished: {msg}',
      'Oh, the humanity of it: {msg}',
      'Tears flow for our fallen bytes: {msg}',
      'Darkness falls upon the system: {msg}',
    ]);
    return map;
  }

  analyzeSentiment(message: string): SentimentAnalysis {
    let score = 0;
    let intensity = 0;
    let emotionCounts: Record<SentimentAnalysis['dominantEmotion'], number> = { anger: 0, fear: 0, sadness: 0, confusion: 0, neutral: 0 };
    
    const words = message.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      const entry = this._emotionVocabulary[word];
      if (entry) {
        emotionCounts[entry.emotion] += entry.weight;
        intensity += entry.weight;
      }
    }
    
    if (words.length > 0) {
      score = (emotionCounts.anger * 0.5 + emotionCounts.fear * 0.3 + emotionCounts.sadness * 0.2) / words.length;
    }
    
    let dominantEmotion: SentimentAnalysis['dominantEmotion'] = 'neutral';
    let maxCount = 0;
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion as SentimentAnalysis['dominantEmotion'];
      }
    }
    
    return { score, intensity, dominantEmotion };
  }

  wrapError(code: string, message: string, severity: number): WrappedError {
    if (this._suppressed.get(code) ?? 0 >= this._suppressionThreshold) {
      this._fatigueIndex++;
    }
    
    this._suppressed.set(code, (this._suppressed.get(code) ?? 0) + 1);
    
    const sentiment = this.analyzeSentiment(message);
    const complexity = this._computeComplexity(message);
    
    let tone = severity > this._profile.maxSeverityForHumor ? 'deadpan' : this._profile.defaultTone;
    tone = this._adaptToneToSentiment(tone, sentiment);
    
    const story = this._renderStory(tone, message);
    
    const wrapped: WrappedError = {
      code,
      rawMessage: message,
      story,
      tone,
      severity,
      timestamp: Date.now(),
      sentimentScore: sentiment.score,
      complexity,
    };
    
    this._wrapped.push(wrapped);
    return wrapped;
  }

  private _computeComplexity(message: string): number {
    const words = message.split(/\s+/);
    const uniqueWords = new Set(words).size;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const punctuationCount = (message.match(/[.,!?;:]/g) || []).length;
    
    return Math.min(1, (uniqueWords / words.length + avgWordLength / 10 + punctuationCount / words.length) / 3);
  }

  private _adaptToneToSentiment(tone: ErrorTone, sentiment: SentimentAnalysis): ErrorTone {
    if (sentiment.dominantEmotion === 'anger' && sentiment.intensity > 0.5) {
      return 'deadpan';
    }
    if (sentiment.dominantEmotion === 'confusion' && sentiment.intensity > 0.4) {
      return 'absurdist';
    }
    if (sentiment.dominantEmotion === 'sadness' && sentiment.intensity > 0.3) {
      return 'melodramatic';
    }
    return tone;
  }

  private _renderStory(tone: ErrorTone, message: string): string {
    const templates = this._profile.templates.get(tone) ?? ['{msg}'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const processedMessage = this._obfuscateTechnicalTerms(message);
    return template.replace('{msg}', processedMessage);
  }

  private _obfuscateTechnicalTerms(message: string): string {
    const replacements: Record<string, string> = {
      'null': 'void of existence',
      'undefined': 'in a state of limbo',
      'stack': 'pile of things',
      'overflow': 'spilling over',
      'timeout': 'taking too long',
      'exception': 'unexpected surprise',
      'crash': 'sudden stop',
      'error': 'oopsie',
    };
    
    let result = message;
    for (const [term, replacement] of Object.entries(replacements)) {
      result = result.replace(new RegExp(term, 'gi'), replacement);
    }
    return result;
  }

  analyzeStory(story: string): StoryMetrics {
    const words = story.split(/\s+/);
    const uniqueWords = new Set(words).size;
    const humorMarkers = ['face-planted', 'whoopsie', 'goose', 'trips', 'banana', 'existential', 'doodle', 'glitch'];
    const humorCount = words.filter(w => humorMarkers.includes(w.toLowerCase())).length;
    
    const syllableCount = words.reduce((sum, w) => sum + Math.max(1, Math.ceil(w.length / 3)), 0);
    const readability = Math.max(0, 100 - syllableCount / words.length * 10);
    
    return {
      length: words.length,
      humorDensity: humorCount / words.length,
      wordVariety: uniqueWords / words.length,
      readability,
    };
  }

  setTone(tone: ErrorTone): void {
    this._profile.defaultTone = tone;
  }

  getRecentStories(limit: number = 10): string[] {
    return this._wrapped.slice(-limit).map(w => w.story);
  }

  getFatigueIndex(): number {
    return this._fatigueIndex;
  }

  clearSuppression(code: string): void {
    this._suppressed.delete(code);
  }

  addTemplate(tone: ErrorTone, template: string): void {
    const list = this._profile.templates.get(tone) ?? [];
    list.push(template);
    this._profile.templates.set(tone, list);
  }

  getWrappedHistory(): WrappedError[] {
    return [...this._wrapped];
  }

  get suppressionCount(): number {
    return this._suppressed.size;
  }

  get averageSentiment(): number {
    if (this._wrapped.length === 0) return 0;
    return this._wrapped.reduce((sum, w) => sum + w.sentimentScore, 0) / this._wrapped.length;
  }
}