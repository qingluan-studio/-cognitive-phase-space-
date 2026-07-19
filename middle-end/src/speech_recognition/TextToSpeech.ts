import { DataPacket } from '../shared/types';
import { Audio } from './AudioProcessing';

export interface VoiceProfile {
  name: string;
  language: string;
  gender: string;
  sampleRate: number;
}

export interface SynthesizedSpeech {
  audio: Audio;
  text: string;
  voice: string;
  sampleRate: number;
  duration: number;
}

export class TextToSpeech {
  private _synthesized: SynthesizedSpeech[] = [];
  private _voice: string = 'default';
  private _counter: number = 0;
  private _sampleRate: number = 22050;
  private _lastResult: SynthesizedSpeech | null = null;

  get synthesized(): SynthesizedSpeech[] {
    return this._synthesized;
  }

  get voice(): string {
    return this._voice;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  synthesize(text: string, voice: string = 'default'): Audio {
    const result = this.tts(text, { name: 'default' }, voice);
    return result.audio;
  }

  tts(text: string, model: { name: string }, voice: string): SynthesizedSpeech {
    const sampleRate = this._sampleRate;
    const words = text.split(/\s+/);
    const duration = words.length * 0.3;
    const numSamples = Math.floor(duration * sampleRate);
    const samples: number[] = [];
    let seed = this._hash(text + voice + model.name);
    for (let i = 0; i < numSamples; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const noise = (seed / 0x7fffffff - 0.5) * 0.1;
      const freq = 100 + Math.sin(i * 0.001) * 50 + Math.sin(i * 0.003) * 30;
      const voiceSignal = Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.3;
      samples.push(voiceSignal + noise);
    }
    const audio: Audio = {
      samples,
      sampleRate,
      channels: 1,
      duration
    };
    const result: SynthesizedSpeech = {
      audio,
      text,
      voice,
      sampleRate,
      duration
    };
    this._lastResult = result;
    this._synthesized.push(result);
    this._voice = voice;
    return result;
  }

  concatTts(units: { text: string; audio: Audio }[], text: string): SynthesizedSpeech {
    const allSamples: number[] = [];
    const sampleRate = units[0]?.audio.sampleRate || 22050;
    for (const unit of units) {
      allSamples.push(...unit.audio.samples);
    }
    const audio: Audio = {
      samples: allSamples,
      sampleRate,
      channels: 1,
      duration: allSamples.length / sampleRate
    };
    const result: SynthesizedSpeech = {
      audio,
      text,
      voice: 'concat',
      sampleRate,
      duration: audio.duration
    };
    this._lastResult = result;
    this._synthesized.push(result);
    return result;
  }

  parametricTts(text: string, params: { pitch?: number; rate?: number; volume?: number }): SynthesizedSpeech {
    const pitch = params.pitch || 1.0;
    const rate = params.rate || 1.0;
    const volume = params.volume || 1.0;
    const sampleRate = this._sampleRate;
    const words = text.split(/\s+/);
    const duration = (words.length * 0.3) / rate;
    const numSamples = Math.floor(duration * sampleRate);
    const samples: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      const baseFreq = 150 * pitch;
      const vibrato = Math.sin(i * 0.005) * 5;
      const freq = baseFreq + vibrato;
      samples.push(Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.3 * volume);
    }
    const audio: Audio = {
      samples,
      sampleRate,
      channels: 1,
      duration
    };
    const result: SynthesizedSpeech = {
      audio,
      text,
      voice: 'parametric',
      sampleRate,
      duration
    };
    this._lastResult = result;
    this._synthesized.push(result);
    return result;
  }

  neuralTts(text: string, model: { name: string }): SynthesizedSpeech {
    const result = this.tts(text, model, 'neural');
    return result;
  }

  tacotronSynthesize(text: string, model: { name: string }): SynthesizedSpeech {
    const result = this.tts(text, model, 'tacotron');
    return result;
  }

  waveglowGenerate(melSpectrogram: number[][], model: { name: string }): Audio {
    const sampleRate = 22050;
    const numSamples = melSpectrogram.length * 256;
    const samples: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      const melIdx = Math.floor(i / 256);
      const melBin = i % melSpectrogram[0]?.length || 0;
      const amp = melSpectrogram[melIdx]?.[melBin] || 0;
      samples.push(Math.sin(i * 0.1) * amp * 0.5);
    }
    return {
      samples,
      sampleRate,
      channels: 1,
      duration: numSamples / sampleRate
    };
  }

  voiceCloning(audio: Audio, text: string): SynthesizedSpeech {
    const result = this.tts(text, { name: 'clone' }, 'cloned');
    return result;
  }

  prosodyControl(text: string, rate: number, pitch: number, volume: number): SynthesizedSpeech {
    return this.parametricTts(text, { rate, pitch, volume });
  }

  ssmlParse(ssml: string): { text: string; params: Record<string, number> } {
    let text = ssml.replace(/<[^>]+>/g, '');
    const params: Record<string, number> = {};
    const rateMatch = ssml.match(/rate="([^"]+)"/);
    const pitchMatch = ssml.match(/pitch="([^"]+)"/);
    const volumeMatch = ssml.match(/volume="([^"]+)"/);
    if (rateMatch) params.rate = parseFloat(rateMatch[1]) || 1;
    if (pitchMatch) params.pitch = parseFloat(pitchMatch[1]) || 1;
    if (volumeMatch) params.volume = parseFloat(volumeMatch[1]) || 1;
    return { text, params };
  }

  phonemize(text: string, language: string = 'en-us'): string[] {
    const phonemes: string[] = [];
    const words = text.toLowerCase().split(/\s+/);
    const phonemeMap: Record<string, string> = {
      'hello': 'həˈloʊ',
      'world': 'wɜːrld',
      'test': 'tɛst',
      'speech': 'spiːtʃ',
      'the': 'ðə',
      'a': 'ə',
      'is': 'ɪz',
      'this': 'ðɪs'
    };
    for (const word of words) {
      phonemes.push(phonemeMap[word] || word);
    }
    return phonemes;
  }

  audioDuration(text: string, rate: number = 1.0): number {
    const words = text.split(/\s+/);
    return (words.length * 0.3) / rate;
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toPacket(): DataPacket<SynthesizedSpeech> {
    const result = this._lastResult || {
      audio: { samples: [], sampleRate: 0, channels: 0, duration: 0 },
      text: '',
      voice: '',
      sampleRate: 0,
      duration: 0
    };
    this._counter++;
    return {
      id: `tts-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech', 'text-to-speech'],
        priority: 1,
        phase: 'text-to-speech'
      }
    };
  }

  reset(): void {
    this._synthesized = [];
    this._voice = 'default';
    this._counter = 0;
    this._sampleRate = 22050;
    this._lastResult = null;
  }
}
