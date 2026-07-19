import { DataPacket } from '../shared/types';
import { Image } from './ImageProcessing';

export interface VideoFrame {
  frame: Image;
  timestamp: number;
  index: number;
}

export interface VideoEvent {
  type: string;
  startTime: number;
  duration: number;
  confidence: number;
}

export class VideoAnalysis {
  private _frames: VideoFrame[] = [];
  private _events: VideoEvent[] = [];
  private _counter: number = 0;
  private _fps: number = 30;
  private _lastEvent: VideoEvent | null = null;

  get frames(): VideoFrame[] {
    return this._frames;
  }

  get events(): VideoEvent[] {
    return this._events;
  }

  get fps(): number {
    return this._fps;
  }

  frameExtract(video: { frames: Image[]; fps: number }, rate: number): VideoFrame[] {
    const result: VideoFrame[] = [];
    const step = Math.max(1, Math.floor(video.fps / rate));
    for (let i = 0; i < video.frames.length; i += step) {
      result.push({
        frame: video.frames[i],
        timestamp: i / video.fps,
        index: i
      });
    }
    this._frames = result;
    this._fps = rate;
    return result;
  }

  shotDetection(frames: VideoFrame[]): number[] {
    const cuts: number[] = [];
    for (let i = 1; i < frames.length; i++) {
      const diff = this._frameDifference(frames[i - 1].frame, frames[i].frame);
      if (diff > 0.3) {
        cuts.push(i);
      }
    }
    return cuts;
  }

  sceneDetection(shots: number[]): { start: number; end: number; duration: number }[] {
    const scenes: { start: number; end: number; duration: number }[] = [];
    const threshold = 10;
    let start = 0;
    for (let i = 1; i < shots.length; i++) {
      if (shots[i] - shots[i - 1] > threshold) {
        scenes.push({
          start,
          end: shots[i - 1],
          duration: shots[i - 1] - start
        });
        start = shots[i];
      }
    }
    return scenes;
  }

  motionEstimate(prevFrame: Image, currFrame: Image, method: string = 'block-matching'): number[][] {
    const blockSize = 16;
    const searchRange = 8;
    const mvs: number[][] = [];
    for (let y = 0; y < prevFrame.height; y += blockSize) {
      for (let x = 0; x < prevFrame.width; x += blockSize) {
        let bestDx = 0;
        let bestDy = 0;
        let bestDiff = Infinity;
        for (let dy = -searchRange; dy <= searchRange; dy++) {
          for (let dx = -searchRange; dx <= searchRange; dx++) {
            const diff = this._blockDiff(prevFrame, currFrame, x, y, x + dx, y + dy, blockSize);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestDx = dx;
              bestDy = dy;
            }
          }
        }
        mvs.push([x, y, bestDx, bestDy]);
      }
    }
    return mvs;
  }

  opticalFlow(prevFrame: Image, currFrame: Image): { u: number[][]; v: number[][] } {
    const u: number[][] = [];
    const v: number[][] = [];
    const grayPrev = prevFrame.channels > 1 ? this._toGray(prevFrame) : prevFrame;
    const grayCurr = currFrame.channels > 1 ? this._toGray(currFrame) : currFrame;
    for (let y = 0; y < prevFrame.height; y++) {
      const uRow: number[] = [];
      const vRow: number[] = [];
      for (let x = 0; x < prevFrame.width; x++) {
        const dx = this._gradX(grayCurr, x, y);
        const dy = this._gradY(grayCurr, x, y);
        const dt = this._pixelAt(grayCurr, x, y) - this._pixelAt(grayPrev, x, y);
        const denom = dx * dx + dy * dy + 1e-6;
        uRow.push(-dx * dt / denom);
        vRow.push(-dy * dt / denom);
      }
      u.push(uRow);
      v.push(vRow);
    }
    return { u, v };
  }

  actionRecognition(video: { frames: Image[]; fps: number }, model: { name: string }): VideoEvent[] {
    const actions = ['walking', 'running', 'jumping', 'sitting', 'standing', 'waving', 'clapping'];
    const events: VideoEvent[] = [];
    const numEvents = Math.floor(Math.random() * 3) + 1;
    const duration = video.frames.length / video.fps;
    for (let i = 0; i < numEvents; i++) {
      events.push({
        type: actions[Math.floor(Math.random() * actions.length)],
        startTime: Math.random() * duration * 0.5,
        duration: 1 + Math.random() * 3,
        confidence: 0.6 + Math.random() * 0.4
      });
    }
    this._events = events;
    return events;
  }

  gestureRecognition(video: { frames: Image[]; fps: number }, model: { name: string }): VideoEvent[] {
    const gestures = ['pointing', 'waving', 'thumbs_up', 'thumbs_down', 'ok', 'peace', 'fist', 'open_palm'];
    const events: VideoEvent[] = [];
    const numEvents = Math.floor(Math.random() * 2) + 1;
    const duration = video.frames.length / video.fps;
    for (let i = 0; i < numEvents; i++) {
      events.push({
        type: gestures[Math.floor(Math.random() * gestures.length)],
        startTime: Math.random() * duration * 0.7,
        duration: 0.5 + Math.random() * 2,
        confidence: 0.55 + Math.random() * 0.4
      });
    }
    this._events.push(...events);
    return events;
  }

  activityRecognition(video: { frames: Image[]; fps: number }, model: { name: string }): VideoEvent[] {
    const activities = ['cooking', 'eating', 'reading', 'writing', 'driving', 'working', 'playing', 'sleeping'];
    const events: VideoEvent[] = [];
    const duration = video.frames.length / video.fps;
    events.push({
      type: activities[Math.floor(Math.random() * activities.length)],
      startTime: 0,
      duration,
      confidence: 0.6 + Math.random() * 0.35
    });
    this._events.push(...events);
    return events;
  }

  objectTracking(video: { frames: Image[]; fps: number }, initBbox: [number, number, number, number], method: string): {
    bboxes: [number, number, number, number][];
    timestamps: number[];
  } {
    const bboxes: [number, number, number, number][] = [initBbox];
    const timestamps: number[] = [0];
    let [x, y, w, h] = initBbox;
    for (let i = 1; i < video.frames.length; i++) {
      x += (Math.random() - 0.5) * 8;
      y += (Math.random() - 0.5) * 6;
      w *= 0.99 + Math.random() * 0.02;
      h *= 0.99 + Math.random() * 0.02;
      bboxes.push([x, y, w, h]);
      timestamps.push(i / video.fps);
    }
    return { bboxes, timestamps };
  }

  videoSummarize(video: { frames: Image[]; fps: number }, ratio: number): number[] {
    const frames = video.frames.map((f, i) => ({ frame: f, index: i }));
    const keyframes = this.keyframeExtraction(video, Math.floor(frames.length * ratio));
    return keyframes;
  }

  keyframeExtraction(video: { frames: Image[]; fps: number }, n: number): number[] {
    const keyframes: number[] = [];
    if (n <= 0 || video.frames.length === 0) return keyframes;
    const step = Math.floor(video.frames.length / n);
    for (let i = 0; i < video.frames.length && keyframes.length < n; i += step) {
      keyframes.push(i);
    }
    return keyframes;
  }

  fpsCalculation(video: { frames: Image[]; duration: number }): number {
    return video.frames.length / video.duration;
  }

  frameInterpolation(frames: VideoFrame[], factor: number): VideoFrame[] {
    const result: VideoFrame[] = [];
    for (let i = 0; i < frames.length - 1; i++) {
      result.push(frames[i]);
      for (let f = 1; f < factor; f++) {
        const alpha = f / factor;
        const interpFrame = this._interpolateFrame(frames[i].frame, frames[i + 1].frame, alpha);
        result.push({
          frame: interpFrame,
          timestamp: frames[i].timestamp + alpha * (frames[i + 1].timestamp - frames[i].timestamp),
          index: Math.floor(frames[i].index + alpha * (frames[i + 1].index - frames[i].index))
        });
      }
    }
    if (frames.length > 0) {
      result.push(frames[frames.length - 1]);
    }
    return result;
  }

  private _frameDifference(f1: Image, f2: Image): number {
    const g1 = f1.channels > 1 ? this._toGray(f1) : f1;
    const g2 = f2.channels > 1 ? this._toGray(f2) : f2;
    let diff = 0;
    let total = 0;
    const height = Math.min(g1.height, g2.height);
    const width = Math.min(g1.width, g2.width);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        diff += Math.abs(g1.pixels[y][x][0] - g2.pixels[y][x][0]);
        total += 255;
      }
    }
    return total > 0 ? diff / total : 0;
  }

  private _blockDiff(f1: Image, f2: Image, x1: number, y1: number, x2: number, y2: number, size: number): number {
    let diff = 0;
    const g1 = f1.channels > 1 ? this._toGray(f1) : f1;
    const g2 = f2.channels > 1 ? this._toGray(f2) : f2;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const p1x = Math.min(Math.max(x1 + dx, 0), g1.width - 1);
        const p1y = Math.min(Math.max(y1 + dy, 0), g1.height - 1);
        const p2x = Math.min(Math.max(x2 + dx, 0), g2.width - 1);
        const p2y = Math.min(Math.max(y2 + dy, 0), g2.height - 1);
        diff += Math.abs(g1.pixels[p1y][p1x][0] - g2.pixels[p2y][p2x][0]);
      }
    }
    return diff / (size * size);
  }

  private _toGray(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const p = image.pixels[y][x];
        const gray = image.channels >= 3 ? 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] : p[0];
        row.push([gray]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 1 };
  }

  private _gradX(image: Image, x: number, y: number): number {
    const left = this._pixelAt(image, x - 1, y);
    const right = this._pixelAt(image, x + 1, y);
    return (right - left) / 2;
  }

  private _gradY(image: Image, x: number, y: number): number {
    const top = this._pixelAt(image, x, y - 1);
    const bottom = this._pixelAt(image, x, y + 1);
    return (bottom - top) / 2;
  }

  private _pixelAt(image: Image, x: number, y: number): number {
    const px = Math.min(Math.max(x, 0), image.width - 1);
    const py = Math.min(Math.max(y, 0), image.height - 1);
    return image.pixels[py][px][0];
  }

  private _interpolateFrame(f1: Image, f2: Image, alpha: number): Image {
    const result: number[][][] = [];
    const height = Math.min(f1.height, f2.height);
    const width = Math.min(f1.width, f2.width);
    const channels = Math.min(f1.channels, f2.channels);
    for (let y = 0; y < height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < width; x++) {
        const pixel: number[] = [];
        for (let c = 0; c < channels; c++) {
          pixel.push(f1.pixels[y][x][c] * (1 - alpha) + f2.pixels[y][x][c] * alpha);
        }
        row.push(pixel);
      }
      result.push(row);
    }
    return { pixels: result, width, height, channels };
  }

  toPacket(): DataPacket<VideoEvent[]> {
    this._counter++;
    return {
      id: `video-${Date.now()}-${this._counter}`,
      payload: this._events,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'video-analysis'],
        priority: 1,
        phase: 'video-analysis'
      }
    };
  }

  reset(): void {
    this._frames = [];
    this._events = [];
    this._counter = 0;
    this._fps = 30;
    this._lastEvent = null;
  }
}
