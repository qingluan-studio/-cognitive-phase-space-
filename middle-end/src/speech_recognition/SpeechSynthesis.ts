import { DataPacket } from '../shared/types';

export interface Phoneme {
  text: string;
  ipa: string;
  duration: number;
  stress: number;
  position: number;
}

export interface Syllable {
  phonemes: Phoneme[];
  stress: number;
  duration: number;
  isStressed: boolean;
}

export interface WordSynthesis {
  text: string;
  phonemes: Phoneme[];
  syllables: Syllable[];
  duration: number;
  startOffset: number;
  endOffset: number;
  partOfSpeech: string;
}

export interface ProsodyFeatures {
  pitch: number[];
  pitchMean: number;
  pitchRange: number;
  energy: number[];
  energyMean: number;
  duration: number;
  speakingRate: number;
  intonationPattern: string;
}

export interface TTSResult {
  audio: number[];
  sampleRate: number;
  duration: number;
  text: string;
  phonemes: Phoneme[];
  words: WordSynthesis[];
  prosody: ProsodyFeatures;
  vocoderType: string;
  modelType: string;
  speakingRate: number;
  pitchShift: number;
  volume: number;
  latency: number;
}

export interface VocoderConfig {
  type: string;
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  fftSize: number;
  numBands: number;
  numFilters: number;
}

export interface SynthesisModel {
  type: string;
  hiddenDim: number;
  numLayers: number;
  vocabSize: number;
  phonemeSet: string[];
  sampleRate: number;
}

export class SpeechSynthesis {
  private _modelType: string = 'tacotron';
  private _vocoderType: string = 'griffin-lim';
  private _sampleRate: number = 22050;
  private _frameSize: number = 1024;
  private _hopSize: number = 256;
  private _fftSize: number = 1024;
  private _speakingRate: number = 1.0;
  private _pitchShift: number = 0;
  private _volume: number = 1.0;
  private _voice: string = 'default';
  private _language: string = 'en';
  private _phonemeSet: string[] = [];
  private _vocabSize: number = 0;
  private _lastAudio: number[] = [];
  private _lastText: string = '';
  private _phonemes: Phoneme[] = [];
  private _words: WordSynthesis[] = [];
  private _prosody: ProsodyFeatures | null = null;
  private _duration: number = 0;
  private _latency: number = 0;
  private _counter: number = 0;
  private _lastResult: TTSResult | null = null;
  private _pitchMean: number = 120;
  private _pitchRange: number = 40;
  private _energyMean: number = 0.5;
  private _numMels: number = 80;
  private _f0Min: number = 80;
  private _f0Max: number = 400;

  constructor() {
    this._initDefaultPhonemes();
  }

  private _initDefaultPhonemes(): void {
    this._phonemeSet = [
      'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'B', 'CH', 'D', 'DH',
      'EH', 'ER', 'EY', 'F', 'G', 'HH', 'IH', 'IY', 'JH', 'K',
      'L', 'M', 'N', 'NG', 'OW', 'OY', 'P', 'R', 'S', 'SH',
      'T', 'TH', 'UH', 'UW', 'V', 'W', 'Y', 'Z', 'ZH',
      'pau', 'sil', 'sp'
    ];
    this._vocabSize = this._phonemeSet.length;
  }

  get modelType(): string {
    return this._modelType;
  }

  get vocoderType(): string {
    return this._vocoderType;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get frameSize(): number {
    return this._frameSize;
  }

  get hopSize(): number {
    return this._hopSize;
  }

  get speakingRate(): number {
    return this._speakingRate;
  }

  get pitchShift(): number {
    return this._pitchShift;
  }

  get volume(): number {
    return this._volume;
  }

  get voice(): string {
    return this._voice;
  }

  get language(): string {
    return this._language;
  }

  get phonemeSet(): string[] {
    return [...this._phonemeSet];
  }

  get vocabSize(): number {
    return this._vocabSize;
  }

  get lastAudio(): number[] {
    return [...this._lastAudio];
  }

  get phonemes(): Phoneme[] {
    return [...this._phonemes];
  }

  get words(): WordSynthesis[] {
    return [...this._words];
  }

  get prosody(): ProsodyFeatures | null {
    return this._prosody;
  }

  get duration(): number {
    return this._duration;
  }

  get latency(): number {
    return this._latency;
  }

  get pitchMean(): number {
    return this._pitchMean;
  }

  get pitchRange(): number {
    return this._pitchRange;
  }

  setModelType(type: string): void {
    const validTypes = ['tacotron', 'tacotron2', 'fastspeech', 'fastspeech2', 'vits', 'glow-tts'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid TTS model type: ${type}`);
    }
    this._modelType = type;
  }

  setVocoderType(type: string): void {
    const validTypes = ['griffin-lim', 'waveglow', 'melgan', 'hifigan', 'wavegrad', 'wavefft'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid vocoder type: ${type}`);
    }
    this._vocoderType = type;
  }

  setSampleRate(rate: number): void {
    this._sampleRate = rate;
  }

  setFrameSize(size: number): void {
    this._frameSize = size;
  }

  setHopSize(size: number): void {
    this._hopSize = size;
  }

  setSpeakingRate(rate: number): void {
    if (rate <= 0) {
      throw new Error('Speaking rate must be positive');
    }
    this._speakingRate = rate;
  }

  setPitchShift(semitones: number): void {
    this._pitchShift = semitones;
  }

  setVolume(volume: number): void {
    if (volume < 0 || volume > 2) {
      throw new Error('Volume must be in [0, 2]');
    }
    this._volume = volume;
  }

  setVoice(voice: string): void {
    this._voice = voice;
  }

  setLanguage(lang: string): void {
    this._language = lang;
  }

  setPitchMean(hz: number): void {
    this._pitchMean = hz;
  }

  setPitchRange(hz: number): void {
    this._pitchRange = hz;
  }

  textToPhonemes(text: string): Phoneme[] {
    const words = text.toLowerCase().split(/\s+/);
    const phonemes: Phoneme[] = [];
    let position = 0;
    for (const word of words) {
      const wordPhonemes = this._graphemeToPhoneme(word);
      for (const p of wordPhonemes) {
        phonemes.push({
          text: p,
          ipa: this._arpabetToIpa(p),
          duration: 0.08 + Math.random() * 0.04,
          stress: /[012]/.test(p) ? parseInt(p.charAt(p.length - 1)) : 0,
          position
        });
        position++;
      }
      if (word !== words[words.length - 1]) {
        phonemes.push({
          text: 'pau',
          ipa: 'ʔ',
          duration: 0.05,
          stress: 0,
          position
        });
        position++;
      }
    }
    return phonemes;
  }

  private _graphemeToPhoneme(word: string): string[] {
    const phonemes: string[] = [];
    const letters = word.split('');
    for (let i = 0; i < letters.length; i++) {
      const c = letters[i];
      switch (c) {
        case 'a': phonemes.push('AA'); break;
        case 'e': phonemes.push('EH'); break;
        case 'i': phonemes.push('IY'); break;
        case 'o': phonemes.push('OW'); break;
        case 'u': phonemes.push('UW'); break;
        case 'b': phonemes.push('B'); break;
        case 'c': phonemes.push('K'); break;
        case 'd': phonemes.push('D'); break;
        case 'f': phonemes.push('F'); break;
        case 'g': phonemes.push('G'); break;
        case 'h': phonemes.push('HH'); break;
        case 'j': phonemes.push('JH'); break;
        case 'k': phonemes.push('K'); break;
        case 'l': phonemes.push('L'); break;
        case 'm': phonemes.push('M'); break;
        case 'n': phonemes.push('N'); break;
        case 'p': phonemes.push('P'); break;
        case 'q': phonemes.push('K'); phonemes.push('W'); break;
        case 'r': phonemes.push('R'); break;
        case 's': phonemes.push('S'); break;
        case 't': phonemes.push('T'); break;
        case 'v': phonemes.push('V'); break;
        case 'w': phonemes.push('W'); break;
        case 'x': phonemes.push('K'); phonemes.push('S'); break;
        case 'y': phonemes.push('Y'); break;
        case 'z': phonemes.push('Z'); break;
        default: break;
      }
    }
    if (phonemes.length > 0) {
      const lastIdx = phonemes.length - 1;
      phonemes[lastIdx] = phonemes[lastIdx] + '1';
    }
    return phonemes;
  }

  private _arpabetToIpa(arpabet: string): string {
    const base = arpabet.replace(/[012]/g, '');
    const map: Record<string, string> = {
      'AA': 'ɑ', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔ', 'AW': 'aʊ', 'AY': 'aɪ',
      'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'EH': 'ɛ', 'ER': 'ɜ˞',
      'EY': 'eɪ', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'IH': 'ɪ', 'IY': 'i',
      'JH': 'dʒ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ',
      'OW': 'oʊ', 'OY': 'ɔɪ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ',
      'T': 't', 'TH': 'θ', 'UH': 'ʊ', 'UW': 'u', 'V': 'v', 'W': 'w',
      'Y': 'j', 'Z': 'z', 'ZH': 'ʒ', 'pau': 'ʔ', 'sil': '', 'sp': ''
    };
    return map[base] || base;
  }

  generateMelSpectrogram(phonemes: Phoneme[]): number[][] {
    const totalDuration = phonemes.reduce((sum, p) => sum + p.duration, 0) / this._speakingRate;
    const numFrames = Math.floor(totalDuration * this._sampleRate / this._hopSize);
    const melSpec: number[][] = [];
    for (let f = 0; f < numFrames; f++) {
      const frame = new Array(this._numMels).fill(0);
      const time = (f * this._hopSize) / this._sampleRate;
      let phoneIdx = 0;
      let cumTime = 0;
      for (let p = 0; p < phonemes.length; p++) {
        cumTime += phonemes[p].duration / this._speakingRate;
        if (cumTime >= time) {
          phoneIdx = p;
          break;
        }
      }
      const phone = phonemes[phoneIdx] || phonemes[0];
      const center = this._phonemeToMelBand(phone.text);
      for (let m = 0; m < this._numMels; m++) {
        const dist = Math.abs(m - center);
        frame[m] = Math.exp(-dist * dist / 20) * 0.8 + Math.random() * 0.1;
      }
      melSpec.push(frame);
    }
    return melSpec;
  }

  private _phonemeToMelBand(phoneme: string): number {
    const base = phoneme.replace(/[012]/g, '');
    const vowels = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
    const vowelIdx = vowels.indexOf(base);
    if (vowelIdx >= 0) {
      return 20 + vowelIdx * 3;
    }
    const consonants = ['B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 'N', 'NG', 'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH'];
    const consIdx = consonants.indexOf(base);
    if (consIdx >= 0) {
      return 40 + (consIdx % 10) * 3;
    }
    return 30;
  }

  griffinLim(melSpec: number[][], iterations: number = 30): number[] {
    const numFrames = melSpec.length;
    const numMels = melSpec[0].length;
    const audioLen = (numFrames - 1) * this._hopSize + this._fftSize;
    let audio = new Array(audioLen).fill(0);
    for (let i = 0; i < audioLen; i++) {
      audio[i] = (Math.random() - 0.5) * 0.01;
    }
    for (let iter = 0; iter < iterations; iter++) {
      const stft = this._stft(audio);
      for (let f = 0; f < numFrames; f++) {
        for (let b = 0; b < Math.min(numMels, stft[f].length); b++) {
          stft[f][b] = melSpec[f][b] * Math.sign(stft[f][b] || 1);
        }
      }
      audio = this._istft(stft, audioLen);
    }
    return audio;
  }

  private _stft(signal: number[]): number[][] {
    const numFrames = Math.floor((signal.length - this._frameSize) / this._hopSize) + 1;
    const spec: number[][] = [];
    const window = this._hannWindow(this._frameSize);
    for (let f = 0; f < numFrames; f++) {
      const start = f * this._hopSize;
      const frame = new Array(this._fftSize).fill(0);
      for (let i = 0; i < this._frameSize; i++) {
        frame[i] = signal[start + i] * window[i];
      }
      spec.push(this._fftMagnitude(frame));
    }
    return spec;
  }

  private _istft(spec: number[][], outputLen: number): number[] {
    const audio = new Array(outputLen).fill(0);
    const window = this._hannWindow(this._frameSize);
    for (let f = 0; f < spec.length; f++) {
      const start = f * this._hopSize;
      const frame = this._ifftMagnitude(spec[f]);
      for (let i = 0; i < this._frameSize && start + i < outputLen; i++) {
        audio[start + i] += frame[i] * window[i];
      }
    }
    return audio;
  }

  private _hannWindow(size: number): number[] {
    const w = new Array(size);
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return w;
  }

  private _fftMagnitude(signal: number[]): number[] {
    const n = this._fftSize;
    const mag = new Array(n / 2 + 1);
    for (let k = 0; k <= n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      mag[k] = Math.sqrt(real * real + imag * imag) / n;
    }
    return mag;
  }

  private _ifftMagnitude(magnitude: number[]): number[] {
    const n = this._fftSize;
    const signal = new Array(n).fill(0);
    const phase = new Array(n / 2 + 1);
    for (let i = 0; i <= n / 2; i++) {
      phase[i] = Math.random() * 2 * Math.PI - Math.PI;
    }
    for (let t = 0; t < n; t++) {
      let sum = 0;
      for (let k = 0; k <= n / 2; k++) {
        const angle = (2 * Math.PI * k * t) / n + phase[k];
        sum += magnitude[k] * Math.cos(angle) * 2;
      }
      signal[t] = sum / n;
    }
    return signal;
  }

  generatePitchContour(phonemes: Phoneme[]): number[] {
    const totalDuration = phonemes.reduce((sum, p) => sum + p.duration, 0) / this._speakingRate;
    const numFrames = Math.floor(totalDuration * this._sampleRate / this._hopSize);
    const pitch = new Array(numFrames);
    const basePitch = this._pitchMean * Math.pow(2, this._pitchShift / 12);
    for (let f = 0; f < numFrames; f++) {
      const t = f / numFrames;
      let vowels = 0;
      let stressed = 0;
      const time = t * totalDuration;
      let cumTime = 0;
      for (const p of phonemes) {
        const dur = p.duration / this._speakingRate;
        if (cumTime <= time && time < cumTime + dur) {
          if (p.stress > 0) stressed = p.stress;
          if (/[AEIOU]/.test(p.text)) vowels = 1;
          break;
        }
        cumTime += dur;
      }
      const intonation = Math.sin(t * Math.PI * 2) * 0.3 + Math.sin(t * Math.PI * 4) * 0.1;
      const stressEffect = stressed > 0 ? 1.15 : 1.0;
      const vowelEffect = vowels > 0 ? 1.0 : 0.7;
      pitch[f] = basePitch * (1 + intonation * 0.1) * stressEffect * vowelEffect;
      pitch[f] = Math.max(this._f0Min, Math.min(this._f0Max, pitch[f]));
    }
    return pitch;
  }

  generateEnergyContour(phonemes: Phoneme[]): number[] {
    const totalDuration = phonemes.reduce((sum, p) => sum + p.duration, 0) / this._speakingRate;
    const numFrames = Math.floor(totalDuration * this._sampleRate / this._hopSize);
    const energy = new Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      const t = f / numFrames;
      const time = t * totalDuration;
      let cumTime = 0;
      let stress = 0;
      for (const p of phonemes) {
        const dur = p.duration / this._speakingRate;
        if (cumTime <= time && time < cumTime + dur) {
          stress = p.stress;
          break;
        }
        cumTime += dur;
      }
      const envelope = Math.sin(t * Math.PI) * 0.3 + 0.7;
      const stressEffect = stress > 0 ? 1.2 : 1.0;
      energy[f] = this._energyMean * envelope * stressEffect + Math.random() * 0.05;
      energy[f] = Math.max(0, Math.min(1, energy[f]));
    }
    return energy;
  }

  vocode(melSpec: number[][], pitch: number[], energy: number[]): number[] {
    switch (this._vocoderType) {
      case 'griffin-lim':
        return this.griffinLim(melSpec);
      case 'waveglow':
      case 'melgan':
      case 'hifigan':
        return this._neuralVocode(melSpec, pitch, energy);
      default:
        return this.griffinLim(melSpec);
    }
  }

  private _neuralVocode(melSpec: number[][], pitch: number[], energy: number[]): number[] {
    const numFrames = melSpec.length;
    const audioLen = (numFrames - 1) * this._hopSize + this._frameSize;
    const audio = new Array(audioLen).fill(0);
    for (let f = 0; f < numFrames; f++) {
      const f0 = pitch[f] || this._pitchMean;
      const amp = energy[f] || this._energyMean;
      const start = f * this._hopSize;
      for (let i = 0; i < this._hopSize && start + i < audioLen; i++) {
        const t = (start + i) / this._sampleRate;
        let sample = 0;
        const numHarmonics = Math.min(10, Math.floor(this._sampleRate / 2 / f0));
        for (let h = 1; h <= numHarmonics; h++) {
          sample += Math.sin(2 * Math.PI * f0 * h * t) / h * (0.8 + 0.2 * Math.random());
        }
        sample *= amp * 0.3 * this._volume;
        sample += (Math.random() - 0.5) * amp * 0.05;
        audio[start + i] += sample;
      }
    }
    return audio;
  }

  synthesize(text: string): TTSResult {
    const startTime = Date.now();
    this._lastText = text;
    const phonemes = this.textToPhonemes(text);
    this._phonemes = phonemes;
    const words = this._extractWordSynthesis(text, phonemes);
    this._words = words;
    const pitch = this.generatePitchContour(phonemes);
    const energy = this.generateEnergyContour(phonemes);
    const melSpec = this.generateMelSpectrogram(phonemes);
    const audio = this.vocode(melSpec, pitch, energy);
    let maxVal = 0;
    for (const s of audio) {
      maxVal = Math.max(maxVal, Math.abs(s));
    }
    if (maxVal > 0) {
      for (let i = 0; i < audio.length; i++) {
        audio[i] = (audio[i] / maxVal) * 0.9 * this._volume;
      }
    }
    this._lastAudio = audio;
    this._duration = audio.length / this._sampleRate;
    const pitchMean = pitch.reduce((a, b) => a + b, 0) / pitch.length;
    const energyMean = energy.reduce((a, b) => a + b, 0) / energy.length;
    const pitchMin = Math.min(...pitch);
    const pitchMax = Math.max(...pitch);
    this._prosody = {
      pitch,
      pitchMean,
      pitchRange: pitchMax - pitchMin,
      energy,
      energyMean,
      duration: this._duration,
      speakingRate: this._speakingRate,
      intonationPattern: 'declarative'
    };
    this._latency = Date.now() - startTime;
    const result: TTSResult = {
      audio: this._lastAudio,
      sampleRate: this._sampleRate,
      duration: this._duration,
      text,
      phonemes: this._phonemes,
      words: this._words,
      prosody: this._prosody,
      vocoderType: this._vocoderType,
      modelType: this._modelType,
      speakingRate: this._speakingRate,
      pitchShift: this._pitchShift,
      volume: this._volume,
      latency: this._latency
    };
    this._lastResult = result;
    return result;
  }

  private _extractWordSynthesis(text: string, phonemes: Phoneme[]): WordSynthesis[] {
    const words = text.split(/\s+/);
    const result: WordSynthesis[] = [];
    let phoneIdx = 0;
    let offset = 0;
    for (const word of words) {
      const wordPhonemes: Phoneme[] = [];
      let wordDuration = 0;
      while (phoneIdx < phonemes.length) {
        const p = phonemes[phoneIdx];
        if (p.text === 'pau' && wordPhonemes.length > 0) {
          break;
        }
        wordPhonemes.push(p);
        wordDuration += p.duration;
        phoneIdx++;
      }
      const syllables: Syllable[] = [];
      let currentSyllable: Phoneme[] = [];
      for (const p of wordPhonemes) {
        currentSyllable.push(p);
        if (/[AEIOU]/.test(p.text) && p.stress >= 0) {
          syllables.push({
            phonemes: [...currentSyllable],
            stress: p.stress,
            duration: currentSyllable.reduce((s, ph) => s + ph.duration, 0),
            isStressed: p.stress === 1
          });
          currentSyllable = [];
        }
      }
      if (currentSyllable.length > 0 && syllables.length > 0) {
        syllables[syllables.length - 1].phonemes.push(...currentSyllable);
      } else if (currentSyllable.length > 0) {
        syllables.push({
          phonemes: currentSyllable,
          stress: 0,
          duration: currentSyllable.reduce((s, ph) => s + ph.duration, 0),
          isStressed: false
        });
      }
      result.push({
        text: word,
        phonemes: wordPhonemes,
        syllables,
        duration: wordDuration,
        startOffset: offset,
        endOffset: offset + wordDuration,
        partOfSpeech: 'unknown'
      });
      offset += wordDuration;
      if (phoneIdx < phonemes.length && phonemes[phoneIdx].text === 'pau') {
        offset += phonemes[phoneIdx].duration;
        phoneIdx++;
      }
    }
    return result;
  }

  toPacket(): DataPacket<TTSResult> {
    const result = this._lastResult || {
      audio: this._lastAudio,
      sampleRate: this._sampleRate,
      duration: this._duration,
      text: this._lastText,
      phonemes: this._phonemes,
      words: this._words,
      prosody: this._prosody,
      vocoderType: this._vocoderType,
      modelType: this._modelType,
      speakingRate: this._speakingRate,
      pitchShift: this._pitchShift,
      volume: this._volume,
      latency: this._latency
    };
    this._counter++;
    return {
      id: `speech-synthesis-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'speech_synthesis'],
        priority: 1,
        phase: 'synthesis'
      }
    };
  }

  reset(): void {
    this._modelType = 'tacotron';
    this._vocoderType = 'griffin-lim';
    this._sampleRate = 22050;
    this._frameSize = 1024;
    this._hopSize = 256;
    this._fftSize = 1024;
    this._speakingRate = 1.0;
    this._pitchShift = 0;
    this._volume = 1.0;
    this._voice = 'default';
    this._language = 'en';
    this._phonemeSet = [];
    this._vocabSize = 0;
    this._lastAudio = [];
    this._lastText = '';
    this._phonemes = [];
    this._words = [];
    this._prosody = null;
    this._duration = 0;
    this._latency = 0;
    this._counter = 0;
    this._lastResult = null;
    this._pitchMean = 120;
    this._pitchRange = 40;
    this._energyMean = 0.5;
    this._numMels = 80;
    this._f0Min = 80;
    this._f0Max = 400;
    this._initDefaultPhonemes();
  }
}
