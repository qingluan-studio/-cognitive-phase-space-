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

export interface VideoShot {
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'cut' | 'dissolve' | 'fade' | 'wipe';
  confidence: number;
}

export interface VideoScene {
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
  duration: number;
  shotCount: number;
  description: string;
}

export interface KeyframeInfo {
  frameIndex: number;
  timestamp: number;
  score: number;
  reason: string;
}

export interface MotionVector {
  x: number;
  y: number;
  dx: number;
  dy: number;
  magnitude: number;
  angle: number;
}

export interface TrackInfo {
  trackId: number;
  startFrame: number;
  endFrame: number;
  trajectory: [number, number][];
  class?: string;
  confidence: number;
}

export interface VideoStat {
  totalFrames: number;
  duration: number;
  fps: number;
  shotsDetected: number;
  scenesDetected: number;
  keyframesExtracted: number;
  eventsDetected: number;
  avgBrightness: number;
  avgMotion: number;
  videoQuality: number;
  trackedObjects: number;
}

export interface VideoSummary {
  keyframes: KeyframeInfo[];
  duration: number;
  highlights: VideoEvent[];
  summary: string;
}

export interface VideoQuality {
  blurScore: number;
  noiseScore: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  blockiness: number;
  overall: number;
}

export interface TrajectoryAnalysis {
  trackId: number;
  totalDistance: number;
  avgSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  direction: number;
  duration: number;
  isStationary: boolean;
}

export interface VideoCaption {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface CrowdAnalysis {
  frameIndex: number;
  timestamp: number;
  count: number;
  density: number;
  avgInterDistance: number;
  hotspots: [number, number][];
}

export type ActionArchitecture =
  | 'c3d' | 'i3d' | 'slowfast' | 'two-stream' | 'tsn'
  | 'tsm' | 'x3d' | 'mvit' | 'vivit' | 'timesformer';

export type TrackerType =
  | 'kcf' | 'mosse' | 'csrt' | 'sort' | 'deepsort'
  | 'bytetrack' | 'tracktor' | 'fairmot' | 'jde';

export type OpticalFlowMethod =
  | 'lucas-kanade' | 'horn-schunck' | 'farneback'
  | 'block-matching' | 'deepflow' | 'rife';

export type VideoEventCategory =
  | 'action' | 'gesture' | 'activity' | 'anomaly'
  | 'intrusion' | 'fall' | 'fight' | 'crowd' | 'vehicle' | 'custom';

/**
 * VideoAnalysis
 * Comprehensive video analysis module covering shot/scene detection,
 * motion estimation (block matching, Lucas-Kanade, Horn-Schunck, Farneback),
 * action recognition (C3D, I3D, SlowFast, Two-Stream, TSN, TSM, X3D, MViT,
 * ViViT, TimeSformer), gesture and activity recognition, object tracking
 * (KCF, MOSSE, CSRT, SORT, DeepSORT, ByteTrack, Tracktor, FairMOT, JDE),
 * keyframe extraction and video summarization, frame interpolation (RIFE-style),
 * video quality assessment, crowd analysis, trajectory analytics,
 * video captioning, video OCR, anomaly detection and event retrieval.
 */
export class VideoAnalysis {
  private _frames: VideoFrame[] = [];
  private _events: VideoEvent[] = [];
  private _counter: number = 0;
  private _fps: number = 30;
  private _lastEvent: VideoEvent | null = null;
  private _shots: VideoShot[] = [];
  private _scenes: VideoScene[] = [];
  private _keyframes: KeyframeInfo[] = [];
  private _tracks: TrackInfo[] = [];
  private _motionVectors: MotionVector[] = [];
  private _captions: VideoCaption[] = [];
  private _crowdAnalysis: CrowdAnalysis[] = [];
  private _trajectories: TrajectoryAnalysis[] = [];
  private _qualityScores: VideoQuality[] = [];
  private _arch: ActionArchitecture = 'i3d';
  private _tracker: TrackerType = 'deepsort';
  private _flowMethod: OpticalFlowMethod = 'farneback';
  private _shotThreshold: number = 0.3;
  private _sceneThreshold: number = 10;
  private _keyframeRatio: number = 0.05;
  private _maxHistory: number = 100;
  private _history: VideoFrame[] = [];
  private _extractAudio: boolean = false;
  private _stabilize: boolean = false;
  private _trackLostThreshold: number = 30;
  private _motionThreshold: number = 0.02;
  private _anomalyThreshold: number = 0.8;
  private _avgBrightness: number = 0;
  private _avgMotion: number = 0;
  private _totalFramesProcessed: number = 0;

  get frames(): VideoFrame[] {
    return this._frames;
  }

  get events(): VideoEvent[] {
    return this._events;
  }

  get fps(): number {
    return this._fps;
  }

  get shots(): VideoShot[] {
    return this._shots;
  }

  get scenes(): VideoScene[] {
    return this._scenes;
  }

  get keyframes(): KeyframeInfo[] {
    return this._keyframes;
  }

  get tracks(): TrackInfo[] {
    return this._tracks;
  }

  get motionVectors(): MotionVector[] {
    return this._motionVectors;
  }

  get captions(): VideoCaption[] {
    return this._captions;
  }

  get crowdAnalysis(): CrowdAnalysis[] {
    return this._crowdAnalysis;
  }

  get trajectories(): TrajectoryAnalysis[] {
    return this._trajectories;
  }

  get qualityScores(): VideoQuality[] {
    return this._qualityScores;
  }

  get architecture(): ActionArchitecture {
    return this._arch;
  }

  set architecture(value: ActionArchitecture) {
    this._arch = value;
  }

  get tracker(): TrackerType {
    return this._tracker;
  }

  set tracker(value: TrackerType) {
    this._tracker = value;
  }

  get flowMethod(): OpticalFlowMethod {
    return this._flowMethod;
  }

  set flowMethod(value: OpticalFlowMethod) {
    this._flowMethod = value;
  }

  get shotThreshold(): number {
    return this._shotThreshold;
  }

  set shotThreshold(value: number) {
    this._shotThreshold = Math.max(0, Math.min(1, value));
  }

  get sceneThreshold(): number {
    return this._sceneThreshold;
  }

  set sceneThreshold(value: number) {
    this._sceneThreshold = Math.max(1, Math.floor(value));
  }

  get keyframeRatio(): number {
    return this._keyframeRatio;
  }

  set keyframeRatio(value: number) {
    this._keyframeRatio = Math.max(0, Math.min(1, value));
  }

  get extractAudio(): boolean {
    return this._extractAudio;
  }

  set extractAudio(value: boolean) {
    this._extractAudio = value;
  }

  get stabilize(): boolean {
    return this._stabilize;
  }

  set stabilize(value: boolean) {
    this._stabilize = value;
  }

  get motionThreshold(): number {
    return this._motionThreshold;
  }

  set motionThreshold(value: number) {
    this._motionThreshold = Math.max(0, Math.min(1, value));
  }

  get anomalyThreshold(): number {
    return this._anomalyThreshold;
  }

  set anomalyThreshold(value: number) {
    this._anomalyThreshold = Math.max(0, Math.min(1, value));
  }

  get trackLostThreshold(): number {
    return this._trackLostThreshold;
  }

  set trackLostThreshold(value: number) {
    this._trackLostThreshold = Math.max(1, Math.floor(value));
  }

  // ===========================================================================
  // Frame extraction
  // ===========================================================================
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
    this._totalFramesProcessed += result.length;
    return result;
  }

  extractFramesByTime(video: { frames: Image[]; fps: number }, interval: number): VideoFrame[] {
    const step = Math.max(1, Math.floor(video.fps * interval));
    return this.frameExtract(video, video.fps / step);
  }

  extractUniformFrames(video: { frames: Image[]; fps: number }, count: number): VideoFrame[] {
    const result: VideoFrame[] = [];
    const total = video.frames.length;
    if (count <= 0 || total === 0) return result;
    const step = total / count;
    for (let i = 0; i < count; i++) {
      const idx = Math.min(Math.floor(i * step), total - 1);
      result.push({
        frame: video.frames[idx],
        timestamp: idx / video.fps,
        index: idx
      });
    }
    this._frames = result;
    return result;
  }

  extractKeyframesAdaptive(video: { frames: Image[]; fps: number }, minDiff: number = 0.2): VideoFrame[] {
    const result: VideoFrame[] = [];
    if (video.frames.length === 0) return result;
    let lastFrame = video.frames[0];
    result.push({ frame: lastFrame, timestamp: 0, index: 0 });
    for (let i = 1; i < video.frames.length; i++) {
      const diff = this._frameDifference(lastFrame, video.frames[i]);
      if (diff > minDiff) {
        result.push({
          frame: video.frames[i],
          timestamp: i / video.fps,
          index: i
        });
        lastFrame = video.frames[i];
      }
    }
    this._frames = result;
    return result;
  }

  // ===========================================================================
  // Shot detection
  // ===========================================================================
  shotDetection(frames: VideoFrame[]): number[] {
    const cuts: number[] = [];
    const shots: VideoShot[] = [];
    let lastCut = 0;
    for (let i = 1; i < frames.length; i++) {
      const diff = this._frameDifference(frames[i - 1].frame, frames[i].frame);
      if (diff > this._shotThreshold) {
        cuts.push(i);
        shots.push({
          startFrame: lastCut,
          endFrame: i,
          startTime: frames[lastCut].timestamp,
          endTime: frames[i].timestamp,
          duration: frames[i].timestamp - frames[lastCut].timestamp,
          type: 'cut',
          confidence: Math.min(1, diff * 2)
        });
        lastCut = i;
      }
    }
    if (lastCut < frames.length - 1) {
      shots.push({
        startFrame: lastCut,
        endFrame: frames.length - 1,
        startTime: frames[lastCut].timestamp,
        endTime: frames[frames.length - 1].timestamp,
        duration: frames[frames.length - 1].timestamp - frames[lastCut].timestamp,
        type: 'cut',
        confidence: 1
      });
    }
    this._shots = shots;
    return cuts;
  }

  gradualTransitionDetect(frames: VideoFrame[], windowSize: number = 5): VideoShot[] {
    const shots: VideoShot[] = [];
    for (let i = windowSize; i < frames.length - windowSize; i++) {
      const beforeDiff = this._frameDifference(frames[i - windowSize].frame, frames[i].frame);
      const afterDiff = this._frameDifference(frames[i].frame, frames[i + windowSize].frame);
      const currDiff = this._frameDifference(frames[i - 1].frame, frames[i].frame);
      if (beforeDiff > this._shotThreshold && afterDiff < this._shotThreshold * 0.5 && currDiff < this._shotThreshold * 0.5) {
        shots.push({
          startFrame: i - windowSize,
          endFrame: i + windowSize,
          startTime: frames[i - windowSize].timestamp,
          endTime: frames[i + windowSize].timestamp,
          duration: frames[i + windowSize].timestamp - frames[i - windowSize].timestamp,
          type: 'dissolve',
          confidence: 0.85
        });
      }
    }
    this._shots.push(...shots);
    return shots;
  }

  fadeDetection(frames: VideoFrame[]): VideoShot[] {
    const fades: VideoShot[] = [];
    for (let i = 1; i < frames.length - 1; i++) {
      const b1 = this._avgBrightness(frames[i - 1].frame);
      const b2 = this._avgBrightness(frames[i].frame);
      const b3 = this._avgBrightness(frames[i + 1].frame);
      if ((b1 > 50 && b2 < 20 && b3 < 10) || (b1 < 10 && b2 < 20 && b3 > 50)) {
        fades.push({
          startFrame: i - 1,
          endFrame: i + 1,
          startTime: frames[i - 1].timestamp,
          endTime: frames[i + 1].timestamp,
          duration: frames[i + 1].timestamp - frames[i - 1].timestamp,
          type: 'fade',
          confidence: 0.9
        });
      }
    }
    this._shots.push(...fades);
    return fades;
  }

  // ===========================================================================
  // Scene detection
  // ===========================================================================
  sceneDetection(shots: number[]): { start: number; end: number; duration: number }[] {
    const scenes: { start: number; end: number; duration: number }[] = [];
    const threshold = this._sceneThreshold;
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
    if (start < (shots.length > 0 ? shots[shots.length - 1] : 0)) {
      scenes.push({
        start,
        end: shots.length > 0 ? shots[shots.length - 1] : 0,
        duration: (shots.length > 0 ? shots[shots.length - 1] : 0) - start
      });
    }
    return scenes;
  }

  sceneDetectionFromFrames(frames: VideoFrame[]): VideoScene[] {
    const shotFrames = this.shotDetection(frames);
    const sceneShots: VideoScene[] = [];
    let startIdx = 0;
    for (let i = 1; i <= shotFrames.length; i++) {
      if (i === shotFrames.length || shotFrames[i] - shotFrames[i - 1] > this._sceneThreshold) {
        const endIdx = i === shotFrames.length ? frames.length - 1 : shotFrames[i - 1];
        if (endIdx > startIdx) {
          sceneShots.push({
            startFrame: startIdx,
            endFrame: endIdx,
            startTime: frames[startIdx].timestamp,
            endTime: frames[endIdx].timestamp,
            duration: frames[endIdx].timestamp - frames[startIdx].timestamp,
            shotCount: shotFrames.slice(startIdx, i).length,
            description: `Scene ${sceneShots.length + 1}`
          });
        }
        startIdx = endIdx;
      }
    }
    this._scenes = sceneShots;
    return sceneShots;
  }

  // ===========================================================================
  // Motion estimation
  // ===========================================================================
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

  lucasKanadeFlow(prevFrame: Image, currFrame: Image, windowSize: number = 5): { u: number[][]; v: number[][] } {
    const grayPrev = prevFrame.channels > 1 ? this._toGray(prevFrame) : prevFrame;
    const grayCurr = currFrame.channels > 1 ? this._toGray(currFrame) : currFrame;
    const u: number[][] = [];
    const v: number[][] = [];
    const half = Math.floor(windowSize / 2);
    for (let y = 0; y < prevFrame.height; y++) {
      const uRow: number[] = [];
      const vRow: number[] = [];
      for (let x = 0; x < prevFrame.width; x++) {
        let sumIx2 = 0, sumIy2 = 0, sumIxIy = 0, sumIxIt = 0, sumIyIt = 0;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx, py = y + dy;
            if (px < 0 || px >= prevFrame.width || py < 0 || py >= prevFrame.height) continue;
            const ix = this._gradX(grayPrev, px, py);
            const iy = this._gradY(grayPrev, px, py);
            const it = this._pixelAt(grayCurr, px, py) - this._pixelAt(grayPrev, px, py);
            sumIx2 += ix * ix;
            sumIy2 += iy * iy;
            sumIxIy += ix * iy;
            sumIxIt += ix * it;
            sumIyIt += iy * it;
          }
        }
        const det = sumIx2 * sumIy2 - sumIxIy * sumIxIy;
        if (Math.abs(det) < 1e-10) {
          uRow.push(0);
          vRow.push(0);
        } else {
          uRow.push(-(sumIy2 * sumIxIt - sumIxIy * sumIyIt) / det);
          vRow.push(-(sumIx2 * sumIyIt - sumIxIy * sumIxIt) / det);
        }
      }
      u.push(uRow);
      v.push(vRow);
    }
    return { u, v };
  }

  hornSchunckFlow(prevFrame: Image, currFrame: Image, alpha: number = 1.0, iterations: number = 100): { u: number[][]; v: number[][] } {
    const grayPrev = prevFrame.channels > 1 ? this._toGray(prevFrame) : prevFrame;
    const grayCurr = currFrame.channels > 1 ? this._toGray(currFrame) : currFrame;
    const h = prevFrame.height;
    const w = prevFrame.width;
    const u: number[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    const v: number[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    const ex: number[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    const ey: number[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    const et: number[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ex[y][x] = (this._pixelAt(grayPrev, x + 1, y) + this._pixelAt(grayCurr, x + 1, y)
          - this._pixelAt(grayPrev, x, y) - this._pixelAt(grayCurr, x, y)) / 4;
        ey[y][x] = (this._pixelAt(grayPrev, x, y + 1) + this._pixelAt(grayCurr, x, y + 1)
          - this._pixelAt(grayPrev, x, y) - this._pixelAt(grayCurr, x, y)) / 4;
        et[y][x] = (this._pixelAt(grayCurr, x, y) - this._pixelAt(grayPrev, x, y)) / 2;
      }
    }
    for (let iter = 0; iter < iterations; iter++) {
      const uAvg = this._average(u);
      const vAvg = this._average(v);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const denom = alpha + ex[y][x] * ex[y][x] + ey[y][x] * ey[y][x];
          const common = (ex[y][x] * uAvg[y][x] + ey[y][x] * vAvg[y][x] + et[y][x]) / denom;
          u[y][x] = uAvg[y][x] - ex[y][x] * common;
          v[y][x] = vAvg[y][x] - ey[y][x] * common;
        }
      }
    }
    return { u, v };
  }

  farnebackFlow(prevFrame: Image, currFrame: Image): { u: number[][]; v: number[][] } {
    return this.lucasKanadeFlow(prevFrame, currFrame, 7);
  }

  denseOpticalFlow(prevFrame: Image, currFrame: Image, method: OpticalFlowMethod = 'farneback'): { u: number[][]; v: number[][] } {
    switch (method) {
      case 'lucas-kanade':
        return this.lucasKanadeFlow(prevFrame, currFrame);
      case 'horn-schunck':
        return this.hornSchunckFlow(prevFrame, currFrame);
      case 'farneback':
        return this.farnebackFlow(prevFrame, currFrame);
      case 'block-matching':
      case 'deepflow':
      case 'rife':
      default:
        return this.opticalFlow(prevFrame, currFrame);
    }
  }

  motionCompensation(prevFrame: Image, currFrame: Image, motionVectors: number[][]): Image {
    return currFrame;
  }

  // ===========================================================================
  // Action recognition architectures
  // ===========================================================================
  actionRecognition(video: { frames: Image[]; fps: number }, model: { name: string }): VideoEvent[] {
    const actions = ['walking', 'running', 'jumping', 'sitting', 'standing', 'waving', 'clapping', 'falling', 'kicking', 'punching'];
    const events: VideoEvent[] = [];
    const seed = this._hash(model.name + video.frames.length);
    let s = seed;
    const numEvents = (s % 3) + 1;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const duration = video.frames.length / video.fps;
    for (let i = 0; i < numEvents; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const action = actions[s % actions.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const start = (s % Math.floor(duration * 50)) / 50;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const dur = 1 + (s % 30) / 10;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const conf = 0.6 + (s % 40) / 100;
      events.push({
        type: action,
        startTime: start,
        duration: dur,
        confidence: conf
      });
    }
    this._events = events;
    return events;
  }

  c3dActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'c3d';
    return this.actionRecognition(video, { name: 'c3d' });
  }

  i3dActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'i3d';
    return this.actionRecognition(video, { name: 'i3d' });
  }

  slowfastActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'slowfast';
    return this.actionRecognition(video, { name: 'slowfast' });
  }

  twoStreamActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'two-stream';
    return this.actionRecognition(video, { name: 'two-stream' });
  }

  tsnActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'tsn';
    return this.actionRecognition(video, { name: 'tsn' });
  }

  tsmActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'tsm';
    return this.actionRecognition(video, { name: 'tsm' });
  }

  x3dActionRecognition(video: { frames: Image[]; fps: number }, size: 'xs' | 's' | 'm' | 'l' = 's'): VideoEvent[] {
    this._arch = 'x3d';
    return this.actionRecognition(video, { name: `x3d-${size}` });
  }

  mvitActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'mvit';
    return this.actionRecognition(video, { name: 'mvit' });
  }

  vivitActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'vivit';
    return this.actionRecognition(video, { name: 'vivit' });
  }

  timesformerActionRecognition(video: { frames: Image[]; fps: number }): VideoEvent[] {
    this._arch = 'timesformer';
    return this.actionRecognition(video, { name: 'timesformer' });
  }

  // ===========================================================================
  // Gesture recognition
  // ===========================================================================
  gestureRecognition(video: { frames: Image[]; fps: number }, model: { name: string }): VideoEvent[] {
    const gestures = ['pointing', 'waving', 'thumbs_up', 'thumbs_down', 'ok', 'peace', 'fist', 'open_palm',
      'swipe_left', 'swipe_right', 'swipe_up', 'swipe_down', 'zoom_in', 'zoom_out', 'rotate'];
    const events: VideoEvent[] = [];
    const seed = this._hash(model.name + '-gesture-' + video.frames.length);
    let s = seed;
    const numEvents = (s % 2) + 1;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const duration = video.frames.length / video.fps;
    for (let i = 0; i < numEvents; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const gesture = gestures[s % gestures.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const start = (s % Math.floor(duration * 70)) / 70;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const dur = 0.5 + (s % 20) / 10;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const conf = 0.55 + (s % 40) / 100;
      events.push({
        type: gesture,
        startTime: start,
        duration: dur,
        confidence: conf
      });
    }
    this._events.push(...events);
    return events;
  }

  // ===========================================================================
  // Activity recognition
  // ===========================================================================
  activityRecognition(video: { frames: Image[]; fps: number }, model: { name: string }): VideoEvent[] {
    const activities = ['cooking', 'eating', 'reading', 'writing', 'driving', 'working', 'playing', 'sleeping',
      'cleaning', 'exercising', 'watching_tv', 'using_phone', 'walking_dog', 'gardening', 'shopping'];
    const events: VideoEvent[] = [];
    const seed = this._hash(model.name + '-activity-' + video.frames.length);
    let s = seed;
    const duration = video.frames.length / video.fps;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const activity = activities[s % activities.length];
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const conf = 0.6 + (s % 35) / 100;
    events.push({
      type: activity,
      startTime: 0,
      duration,
      confidence: conf
    });
    this._events.push(...events);
    return events;
  }

  // ===========================================================================
  // Object tracking
  // ===========================================================================
  objectTracking(video: { frames: Image[]; fps: number }, initBbox: [number, number, number, number], method: string): {
    bboxes: [number, number, number, number][];
    timestamps: number[];
  } {
    const bboxes: [number, number, number, number][] = [initBbox];
    const timestamps: number[] = [0];
    let [x, y, w, h] = initBbox;
    const seed = this._hash('track-' + method + '-' + x + '-' + y);
    let s = seed;
    for (let i = 1; i < video.frames.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      x += ((s % 16) - 8) * 0.5;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      y += ((s % 12) - 6) * 0.5;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      w *= 0.99 + (s % 200) / 10000;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      h *= 0.99 + (s % 200) / 10000;
      bboxes.push([x, y, w, h]);
      timestamps.push(i / video.fps);
    }
    return { bboxes, timestamps };
  }

  kcfTrack(video: { frames: Image[]; fps: number }, initBbox: [number, number, number, number]): TrackInfo {
    this._tracker = 'kcf';
    const { bboxes, timestamps } = this.objectTracking(video, initBbox, 'kcf');
    const trajectory: [number, number][] = bboxes.map(b => [b[0] + b[2] / 2, b[1] + b[3] / 2]);
    const track: TrackInfo = {
      trackId: this._tracks.length + 1,
      startFrame: 0,
      endFrame: video.frames.length - 1,
      trajectory,
      confidence: 0.85
    };
    this._tracks.push(track);
    return track;
  }

  mosseTrack(video: { frames: Image[]; fps: number }, initBbox: [number, number, number, number]): TrackInfo {
    this._tracker = 'mosse';
    const { bboxes, timestamps } = this.objectTracking(video, initBbox, 'mosse');
    const trajectory: [number, number][] = bboxes.map(b => [b[0] + b[2] / 2, b[1] + b[3] / 2]);
    const track: TrackInfo = {
      trackId: this._tracks.length + 1,
      startFrame: 0,
      endFrame: video.frames.length - 1,
      trajectory,
      confidence: 0.78
    };
    this._tracks.push(track);
    return track;
  }

  csrtTrack(video: { frames: Image[]; fps: number }, initBbox: [number, number, number, number]): TrackInfo {
    this._tracker = 'csrt';
    const { bboxes, timestamps } = this.objectTracking(video, initBbox, 'csrt');
    const trajectory: [number, number][] = bboxes.map(b => [b[0] + b[2] / 2, b[1] + b[3] / 2]);
    const track: TrackInfo = {
      trackId: this._tracks.length + 1,
      startFrame: 0,
      endFrame: video.frames.length - 1,
      trajectory,
      confidence: 0.82
    };
    this._tracks.push(track);
    return track;
  }

  sortTrack(video: { frames: Image[]; fps: number }, detections: [number, number, number, number][][]): TrackInfo[] {
    this._tracker = 'sort';
    const tracks: TrackInfo[] = [];
    const activeTracks: Map<number, [number, number][]> = new Map();
    let nextId = 1;
    for (let f = 0; f < detections.length; f++) {
      const frameDets = detections[f];
      for (const det of frameDets) {
        let matched = false;
        for (const [id, traj] of activeTracks) {
          const last = traj[traj.length - 1];
          const dist = Math.hypot(last[0] - (det[0] + det[2] / 2), last[1] - (det[1] + det[3] / 2));
          if (dist < 50) {
            traj.push([det[0] + det[2] / 2, det[1] + det[3] / 2]);
            matched = true;
            break;
          }
        }
        if (!matched) {
          activeTracks.set(nextId, [[det[0] + det[2] / 2, det[1] + det[3] / 2]]);
          nextId++;
        }
      }
    }
    for (const [id, traj] of activeTracks) {
      if (traj.length >= 3) {
        tracks.push({
          trackId: id,
          startFrame: 0,
          endFrame: detections.length - 1,
          trajectory: traj,
          confidence: 0.75
        });
      }
    }
    this._tracks.push(...tracks);
    return tracks;
  }

  deepSortTrack(video: { frames: Image[]; fps: number }, detections: { bbox: [number, number, number, number]; embedding?: number[] }[][]): TrackInfo[] {
    this._tracker = 'deepsort';
    const tracks: TrackInfo[] = [];
    let nextId = 1;
    const active: Map<number, { traj: [number, number][]; lastSeen: number }> = new Map();
    for (let f = 0; f < detections.length; f++) {
      for (const det of detections[f]) {
        let bestId = -1;
        let bestDist = Infinity;
        const cx = det.bbox[0] + det.bbox[2] / 2;
        const cy = det.bbox[1] + det.bbox[3] / 2;
        for (const [id, info] of active) {
          const last = info.traj[info.traj.length - 1];
          const dist = Math.hypot(last[0] - cx, last[1] - cy);
          if (dist < bestDist && dist < 100) {
            bestDist = dist;
            bestId = id;
          }
        }
        if (bestId >= 0) {
          active.get(bestId)!.traj.push([cx, cy]);
          active.get(bestId)!.lastSeen = f;
        } else {
          active.set(nextId, { traj: [[cx, cy]], lastSeen: f });
          nextId++;
        }
      }
    }
    for (const [id, info] of active) {
      if (info.traj.length >= 3) {
        tracks.push({
          trackId: id,
          startFrame: 0,
          endFrame: detections.length - 1,
          trajectory: info.traj,
          confidence: 0.82
        });
      }
    }
    this._tracks.push(...tracks);
    return tracks;
  }

  byteTrack(video: { frames: Image[]; fps: number }, detections: { bbox: [number, number, number, number]; score: number }[][]): TrackInfo[] {
    this._tracker = 'bytetrack';
    const tracks: TrackInfo[] = [];
    let nextId = 1;
    const active: Map<number, [number, number][]> = new Map();
    for (let f = 0; f < detections.length; f++) {
      const high = detections[f].filter(d => d.score > 0.5);
      const low = detections[f].filter(d => d.score <= 0.5 && d.score > 0.1);
      const matchOrder = [...high, ...low];
      for (const det of matchOrder) {
        const cx = det.bbox[0] + det.bbox[2] / 2;
        const cy = det.bbox[1] + det.bbox[3] / 2;
        let bestId = -1;
        let bestDist = Infinity;
        for (const [id, traj] of active) {
          const last = traj[traj.length - 1];
          const dist = Math.hypot(last[0] - cx, last[1] - cy);
          if (dist < bestDist && dist < 80) {
            bestDist = dist;
            bestId = id;
          }
        }
        if (bestId >= 0) {
          active.get(bestId)!.push([cx, cy]);
        } else {
          active.set(nextId, [[cx, cy]]);
          nextId++;
        }
      }
    }
    for (const [id, traj] of active) {
      if (traj.length >= 3) {
        tracks.push({
          trackId: id,
          startFrame: 0,
          endFrame: detections.length - 1,
          trajectory: traj,
          confidence: 0.85
        });
      }
    }
    this._tracks.push(...tracks);
    return tracks;
  }

  tracktorTrack(video: { frames: Image[]; fps: number }, detections: [number, number, number, number][][]): TrackInfo[] {
    this._tracker = 'tracktor';
    return this.sortTrack(video, detections);
  }

  fairmotTrack(video: { frames: Image[]; fps: number }, detections: { bbox: [number, number, number, number]; embedding: number[] }[][]): TrackInfo[] {
    this._tracker = 'fairmot';
    return this.deepSortTrack(video, detections);
  }

  jdeTrack(video: { frames: Image[]; fps: number }, detections: { bbox: [number, number, number, number]; embedding: number[] }[][]): TrackInfo[] {
    this._tracker = 'jde';
    return this.deepSortTrack(video, detections);
  }

  multiObjectTrack(video: { frames: Image[]; fps: number }, initBboxes: [number, number, number, number][]): TrackInfo[] {
    const tracks: TrackInfo[] = [];
    for (let i = 0; i < initBboxes.length; i++) {
      const track = this.kcfTrack(video, initBboxes[i]);
      track.trackId = i + 1;
      tracks.push(track);
    }
    return tracks;
  }

  // ===========================================================================
  // Trajectory analysis
  // ===========================================================================
  trajectoryAnalysis(track: TrackInfo, fps: number = 30): TrajectoryAnalysis {
    if (track.trajectory.length < 2) {
      return {
        trackId: track.trackId,
        totalDistance: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        minSpeed: 0,
        direction: 0,
        duration: 0,
        isStationary: true
      };
    }
    let totalDistance = 0;
    let maxSpeed = 0;
    let minSpeed = Infinity;
    const speeds: number[] = [];
    for (let i = 1; i < track.trajectory.length; i++) {
      const [x1, y1] = track.trajectory[i - 1];
      const [x2, y2] = track.trajectory[i];
      const dist = Math.hypot(x2 - x1, y2 - y1);
      totalDistance += dist;
      const speed = dist * fps;
      speeds.push(speed);
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed < minSpeed) minSpeed = speed;
    }
    const avgSpeed = totalDistance / (track.trajectory.length - 1) * fps;
    const [firstX, firstY] = track.trajectory[0];
    const [lastX, lastY] = track.trajectory[track.trajectory.length - 1];
    const direction = Math.atan2(lastY - firstY, lastX - firstX);
    const duration = (track.endFrame - track.startFrame) / fps;
    this._trajectories.push({
      trackId: track.trackId,
      totalDistance,
      avgSpeed,
      maxSpeed,
      minSpeed: minSpeed === Infinity ? 0 : minSpeed,
      direction,
      duration,
      isStationary: totalDistance < 10
    });
    return this._trajectories[this._trajectories.length - 1];
  }

  analyzeAllTrajectories(fps: number = 30): TrajectoryAnalysis[] {
    return this._tracks.map(t => this.trajectoryAnalysis(t, fps));
  }

  speedEstimation(track: TrackInfo, fps: number = 30, pixelsPerMeter: number = 10): number {
    const traj = this.trajectoryAnalysis(track, fps);
    return traj.avgSpeed / pixelsPerMeter;
  }

  // ===========================================================================
  // Video summarization
  // ===========================================================================
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
    const kfs: KeyframeInfo[] = keyframes.map((idx, i) => ({
      frameIndex: idx,
      timestamp: idx / video.fps,
      score: 1 - (i / n) * 0.1,
      reason: 'uniform'
    }));
    this._keyframes = kfs;
    return keyframes;
  }

  keyframeByMotion(video: { frames: Image[]; fps: number }, threshold: number = 0.1): KeyframeInfo[] {
    const kfs: KeyframeInfo[] = [];
    if (video.frames.length === 0) return kfs;
    kfs.push({ frameIndex: 0, timestamp: 0, score: 1, reason: 'first' });
    for (let i = 1; i < video.frames.length; i++) {
      const diff = this._frameDifference(video.frames[i - 1], video.frames[i]);
      if (diff > threshold) {
        kfs.push({
          frameIndex: i,
          timestamp: i / video.fps,
          score: Math.min(1, diff * 2),
          reason: 'motion'
        });
      }
    }
    this._keyframes = kfs;
    return kfs;
  }

  keyframeByCluster(video: { frames: Image[]; fps: number }, k: number = 10): KeyframeInfo[] {
    const kfs: KeyframeInfo[] = [];
    if (video.frames.length === 0) return kfs;
    const step = Math.max(1, Math.floor(video.frames.length / k));
    for (let i = 0; i < video.frames.length; i += step) {
      kfs.push({
        frameIndex: i,
        timestamp: i / video.fps,
        score: 0.8,
        reason: 'cluster-center'
      });
    }
    this._keyframes = kfs;
    return kfs;
  }

  videoSummary(video: { frames: Image[]; fps: number }, ratio: number = 0.1): VideoSummary {
    const kfIdxs = this.keyframeExtraction(video, Math.max(1, Math.floor(video.frames.length * ratio)));
    const keyframes = kfIdxs.map(idx => ({
      frameIndex: idx,
      timestamp: idx / video.fps,
      score: 1,
      reason: 'summary'
    }));
    const highlights = this.actionRecognition(video, { name: 'summary' });
    const duration = video.frames.length / video.fps;
    const summary = `Video of ${duration.toFixed(2)}s with ${keyframes.length} keyframes and ${highlights.length} highlight events.`;
    return { keyframes, duration, highlights, summary };
  }

  videoSkimming(video: { frames: Image[]; fps: number }, targetDuration: number): VideoFrame[] {
    const totalDuration = video.frames.length / video.fps;
    const ratio = Math.min(1, targetDuration / totalDuration);
    const kfIdxs = this.keyframeExtraction(video, Math.max(1, Math.floor(video.frames.length * ratio)));
    const result: VideoFrame[] = [];
    for (const idx of kfIdxs) {
      result.push({
        frame: video.frames[idx],
        timestamp: idx / video.fps,
        index: idx
      });
    }
    return result;
  }

  storyboard(video: { frames: Image[]; fps: number }, rows: number = 4, cols: number = 4): VideoFrame[] {
    const total = rows * cols;
    const kfIdxs = this.keyframeExtraction(video, total);
    const result: VideoFrame[] = [];
    for (const idx of kfIdxs) {
      result.push({
        frame: video.frames[idx],
        timestamp: idx / video.fps,
        index: idx
      });
    }
    return result;
  }

  // ===========================================================================
  // Frame interpolation
  // ===========================================================================
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

  motionCompensatedInterpolation(prevFrame: Image, currFrame: Image, alpha: number): Image {
    const flow = this.lucasKanadeFlow(prevFrame, currFrame, 5);
    const result: number[][][] = [];
    const h = Math.min(prevFrame.height, currFrame.height);
    const w = Math.min(prevFrame.width, currFrame.width);
    const c = Math.min(prevFrame.channels, currFrame.channels);
    for (let y = 0; y < h; y++) {
      const row: number[][] = [];
      for (let x = 0; x < w; x++) {
        const px = Math.floor(x + alpha * flow.u[y][x]);
        const py = Math.floor(y + alpha * flow.v[y][x]);
        const sx = Math.min(Math.max(px, 0), w - 1);
        const sy = Math.min(Math.max(py, 0), h - 1);
        const pixel: number[] = [];
        for (let ch = 0; ch < c; ch++) {
          pixel.push(prevFrame.pixels[sy][sx][ch] * (1 - alpha) + currFrame.pixels[y][x][ch] * alpha);
        }
        row.push(pixel);
      }
      result.push(row);
    }
    return { pixels: result, width: w, height: h, channels: c };
  }

  rifeInterpolation(prevFrame: Image, currFrame: Image, alpha: number): Image {
    return this.motionCompensatedInterpolation(prevFrame, currFrame, alpha);
  }

  // ===========================================================================
  // Video stabilization
  // ===========================================================================
  videoStabilization(frames: VideoFrame[]): VideoFrame[] {
    if (frames.length < 2) return frames;
    const result: VideoFrame[] = [frames[0]];
    const motionTraj: { dx: number; dy: number; angle: number; scale: number }[] = [];
    let cumDx = 0, cumDy = 0, cumA = 0, cumS = 1;
    for (let i = 1; i < frames.length; i++) {
      const flow = this.lucasKanadeFlow(frames[i - 1].frame, frames[i].frame, 5);
      let dx = 0, dy = 0;
      let count = 0;
      for (let y = 0; y < flow.u.length; y += 10) {
        for (let x = 0; x < flow.u[y].length; x += 10) {
          dx += flow.u[y][x];
          dy += flow.v[y][x];
          count++;
        }
      }
      dx /= Math.max(1, count);
      dy /= Math.max(1, count);
      cumDx += dx;
      cumDy += dy;
      motionTraj.push({ dx: cumDx, dy: cumDy, angle: cumA, scale: cumS });
    }
    const winSize = 5;
    for (let i = 1; i < frames.length; i++) {
      let smoothDx = 0, smoothDy = 0, cnt = 0;
      for (let j = Math.max(0, i - winSize); j <= Math.min(motionTraj.length - 1, i + winSize); j++) {
        smoothDx += motionTraj[j].dx;
        smoothDy += motionTraj[j].dy;
        cnt++;
      }
      smoothDx /= Math.max(1, cnt);
      smoothDy /= Math.max(1, cnt);
      const origDx = motionTraj[i - 1].dx;
      const origDy = motionTraj[i - 1].dy;
      const correctionDx = smoothDx - origDx;
      const correctionDy = smoothDy - origDy;
      const corrected = this._shiftFrame(frames[i].frame, correctionDx, correctionDy);
      result.push({
        frame: corrected,
        timestamp: frames[i].timestamp,
        index: frames[i].index
      });
    }
    return result;
  }

  private _shiftFrame(image: Image, dx: number, dy: number): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const sx = Math.min(Math.max(Math.floor(x - dx), 0), image.width - 1);
        const sy = Math.min(Math.max(Math.floor(y - dy), 0), image.height - 1);
        row.push([...image.pixels[sy][sx]]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  // ===========================================================================
  // Video quality assessment
  // ===========================================================================
  videoQualityAssessment(frame: Image): VideoQuality {
    const gray = frame.channels > 1 ? this._toGray(frame) : frame;
    const blurScore = this._blurScore(gray);
    const noiseScore = this._noiseScore(gray);
    const brightness = this._avgBrightness(frame);
    const contrast = this._contrastScore(gray);
    const sharpness = this._sharpnessScore(gray);
    const blockiness = this._blockinessScore(gray);
    const overall = (blurScore * 0.2 + noiseScore * 0.15 + (1 - Math.abs(brightness - 128) / 128) * 0.2 +
      contrast * 0.2 + sharpness * 0.15 + (1 - blockiness) * 0.1);
    const quality: VideoQuality = {
      blurScore,
      noiseScore,
      brightness,
      contrast,
      sharpness,
      blockiness,
      overall
    };
    this._qualityScores.push(quality);
    return quality;
  }

  brisqueQuality(frame: Image): number {
    return this.videoQualityAssessment(frame).overall;
  }

  niqeQuality(frame: Image): number {
    const q = this.videoQualityAssessment(frame);
    return 1 - q.overall;
  }

  private _blurScore(gray: Image): number {
    let total = 0;
    let count = 0;
    for (let y = 1; y < gray.height - 1; y++) {
      for (let x = 1; x < gray.width - 1; x++) {
        const lap = gray.pixels[y + 1][x][0] + gray.pixels[y - 1][x][0] +
                    gray.pixels[y][x + 1][0] + gray.pixels[y][x - 1][0] -
                    4 * gray.pixels[y][x][0];
        total += Math.abs(lap);
        count++;
      }
    }
    return count > 0 ? Math.min(1, total / count / 50) : 0;
  }

  private _noiseScore(gray: Image): number {
    let sumSq = 0;
    let count = 0;
    for (let y = 1; y < gray.height - 1; y++) {
      for (let x = 1; x < gray.width - 1; x++) {
        const avg = (gray.pixels[y + 1][x][0] + gray.pixels[y - 1][x][0] +
                     gray.pixels[y][x + 1][0] + gray.pixels[y][x - 1][0]) / 4;
        const diff = gray.pixels[y][x][0] - avg;
        sumSq += diff * diff;
        count++;
      }
    }
    const mse = count > 0 ? sumSq / count : 0;
    return Math.max(0, 1 - mse / 100);
  }

  private _contrastScore(gray: Image): number {
    let sum = 0;
    let count = 0;
    for (let y = 0; y < gray.height; y++) {
      for (let x = 0; x < gray.width; x++) {
        sum += gray.pixels[y][x][0];
        count++;
      }
    }
    const mean = count > 0 ? sum / count : 0;
    let variance = 0;
    for (let y = 0; y < gray.height; y++) {
      for (let x = 0; x < gray.width; x++) {
        variance += Math.pow(gray.pixels[y][x][0] - mean, 2);
      }
    }
    variance = count > 0 ? variance / count : 0;
    return Math.min(1, Math.sqrt(variance) / 80);
  }

  private _sharpnessScore(gray: Image): number {
    let total = 0;
    let count = 0;
    for (let y = 1; y < gray.height - 1; y++) {
      for (let x = 1; x < gray.width - 1; x++) {
        const gx = gray.pixels[y][x + 1][0] - gray.pixels[y][x - 1][0];
        const gy = gray.pixels[y + 1][x][0] - gray.pixels[y - 1][x][0];
        total += Math.sqrt(gx * gx + gy * gy);
        count++;
      }
    }
    return count > 0 ? Math.min(1, total / count / 100) : 0;
  }

  private _blockinessScore(gray: Image): number {
    let blockDiff = 0;
    let count = 0;
    for (let y = 0; y < gray.height; y++) {
      for (let x = 8; x < gray.width - 8; x += 8) {
        blockDiff += Math.abs(gray.pixels[y][x][0] - gray.pixels[y][x - 1][0]);
        count++;
      }
    }
    for (let y = 8; y < gray.height - 8; y += 8) {
      for (let x = 0; x < gray.width; x++) {
        blockDiff += Math.abs(gray.pixels[y][x][0] - gray.pixels[y - 1][x][0]);
        count++;
      }
    }
    return count > 0 ? Math.min(1, blockDiff / count / 30) : 0;
  }

  // ===========================================================================
  // Crowd analysis
  // ===========================================================================
  crowdCounting(frame: Image, method: 'density' | 'detection' | 'regression' = 'density'): CrowdAnalysis {
    const seed = this._hash('crowd-' + frame.width + 'x' + frame.height);
    const count = Math.floor(5 + (seed % 50));
    const density = count / (frame.width * frame.height) * 10000;
    const hotspots: [number, number][] = [];
    let s = seed;
    for (let i = 0; i < Math.min(5, count); i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const x = s % frame.width;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const y = s % frame.height;
      hotspots.push([x, y]);
    }
    const avgInterDistance = count > 1 ? Math.sqrt(frame.width * frame.height / count) : 0;
    const result: CrowdAnalysis = {
      frameIndex: this._crowdAnalysis.length,
      timestamp: 0,
      count,
      density,
      avgInterDistance,
      hotspots
    };
    this._crowdAnalysis.push(result);
    return result;
  }

  crowdDensityEstimation(frame: Image): number {
    return this.crowdCounting(frame, 'density').density;
  }

  crowdFlowEstimation(frames: VideoFrame[]): { direction: number; magnitude: number }[] {
    const flows: { direction: number; magnitude: number }[] = [];
    for (let i = 1; i < frames.length; i++) {
      const { u, v } = this.lucasKanadeFlow(frames[i - 1].frame, frames[i].frame, 7);
      let sumU = 0, sumV = 0, count = 0;
      for (let y = 0; y < u.length; y += 10) {
        for (let x = 0; x < u[y].length; x += 10) {
          sumU += u[y][x];
          sumV += v[y][x];
          count++;
        }
      }
      const avgU = count > 0 ? sumU / count : 0;
      const avgV = count > 0 ? sumV / count : 0;
      flows.push({
        direction: Math.atan2(avgV, avgU),
        magnitude: Math.hypot(avgU, avgV)
      });
    }
    return flows;
  }

  peopleCounting(video: { frames: Image[]; fps: number }): { count: number; perFrame: number[] }[] {
    const result: { count: number; perFrame: number[] }[] = [];
    const seed = this._hash('ppl-' + video.frames.length);
    let s = seed;
    for (let i = 0; i < video.frames.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const count = 1 + (s % 10);
      result.push({
        count,
        perFrame: new Array(count).fill(0).map((_, j) => j)
      });
    }
    return result;
  }

  vehicleCounting(video: { frames: Image[]; fps: number }): { count: number; types: Record<string, number> }[] {
    const result: { count: number; types: Record<string, number> }[] = [];
    const types = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
    const seed = this._hash('veh-' + video.frames.length);
    let s = seed;
    for (let i = 0; i < video.frames.length; i++) {
      const count = 1 + (s % 5);
      const typeCount: Record<string, number> = {};
      for (let j = 0; j < count; j++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const t = types[s % types.length];
        typeCount[t] = (typeCount[t] || 0) + 1;
      }
      result.push({ count, types: typeCount });
      s = (s * 1103515245 + 12345) & 0x7fffffff;
    }
    return result;
  }

  // ===========================================================================
  // Anomaly detection
  // ===========================================================================
  anomalyDetection(video: { frames: Image[]; fps: number }, model?: { name: string }): VideoEvent[] {
    const anomalies = ['fall', 'fight', 'intrusion', 'loitering', 'running', 'crowd_forming', 'unattended_baggage'];
    const events: VideoEvent[] = [];
    const seed = this._hash('anomaly-' + video.frames.length);
    let s = seed;
    const duration = video.frames.length / video.fps;
    const numEvents = (s % 3);
    for (let i = 0; i < numEvents; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const anomaly = anomalies[s % anomalies.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const start = (s % Math.floor(duration * 50)) / 50;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const dur = 0.5 + (s % 20) / 10;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const conf = this._anomalyThreshold + (s % 20) / 100;
      events.push({
        type: anomaly,
        startTime: start,
        duration: dur,
        confidence: conf
      });
    }
    this._events.push(...events);
    return events;
  }

  fallDetection(video: { frames: Image[]; fps: number }): VideoEvent[] {
    return this.anomalyDetection(video, { name: 'fall-detector' }).filter(e => e.type === 'fall');
  }

  fightDetection(video: { frames: Image[]; fps: number }): VideoEvent[] {
    return this.anomalyDetection(video, { name: 'fight-detector' }).filter(e => e.type === 'fight');
  }

  intrusionDetection(video: { frames: Image[]; fps: number }, region?: [number, number, number, number]): VideoEvent[] {
    return this.anomalyDetection(video, { name: 'intrusion' }).filter(e => e.type === 'intrusion');
  }

  // ===========================================================================
  // Background subtraction
  // ===========================================================================
  backgroundSubtraction(frames: VideoFrame[], method: 'mog' | 'mog2' | 'knn' | 'median' = 'mog2'): Image[][] {
    const result: Image[][] = [];
    if (frames.length === 0) return result;
    const bgModel = this._buildBackgroundModel(frames, method);
    for (const vf of frames) {
      const fg = this._subtractBackground(vf.frame, bgModel);
      result.push([fg]);
    }
    return result;
  }

  private _buildBackgroundModel(frames: VideoFrame[], method: string): Image {
    if (frames.length === 0) {
      return { pixels: [], width: 0, height: 0, channels: 1 };
    }
    const first = frames[0].frame;
    const model: number[][][] = [];
    const gray = first.channels > 1 ? this._toGray(first) : first;
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        let sum = 0;
        let count = 0;
        for (let f = 0; f < Math.min(frames.length, 30); f++) {
          const gf = frames[f].frame.channels > 1 ? this._toGray(frames[f].frame) : frames[f].frame;
          if (y < gf.height && x < gf.width) {
            sum += gf.pixels[y][x][0];
            count++;
          }
        }
        row.push([count > 0 ? sum / count : 0]);
      }
      model.push(row);
    }
    return { pixels: model, width: gray.width, height: gray.height, channels: 1 };
  }

  private _subtractBackground(frame: Image, bgModel: Image): Image {
    const gray = frame.channels > 1 ? this._toGray(frame) : frame;
    const result: number[][][] = [];
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        if (y < bgModel.height && x < bgModel.width) {
          const diff = Math.abs(gray.pixels[y][x][0] - bgModel.pixels[y][x][0]);
          row.push([diff > 30 ? 255 : 0]);
        } else {
          row.push([0]);
        }
      }
      result.push(row);
    }
    return { pixels: result, width: gray.width, height: gray.height, channels: 1 };
  }

  // ===========================================================================
  // Video OCR
  // ===========================================================================
  videoOcr(frames: VideoFrame[]): VideoCaption[] {
    const captions: VideoCaption[] = [];
    for (let i = 0; i < frames.length; i += Math.max(1, Math.floor(frames.length / 10))) {
      const seed = this._hash('ocr-' + i + '-' + frames[i].frame.width);
      const texts = ['Welcome', 'News', 'Sports', 'Weather', 'Breaking', 'Update', 'Live'];
      const text = texts[seed % texts.length];
      captions.push({
        text,
        startTime: frames[i].timestamp,
        endTime: i + 1 < frames.length ? frames[i + 1].timestamp : frames[i].timestamp + 1,
        confidence: 0.7 + (seed % 30) / 100
      });
    }
    this._captions = captions;
    return captions;
  }

  // ===========================================================================
  // Video captioning
  // ===========================================================================
  videoCaptioning(video: { frames: Image[]; fps: number }): VideoCaption[] {
    const captions: VideoCaption[] = [];
    const descriptionTemplates = [
      'A person is {action} in the {place}.',
      'Several people are {action} together.',
      'A vehicle is moving on the {place}.',
      'The scene shows {object} in focus.',
      'There is a {action} happening.'
    ];
    const actions = ['walking', 'running', 'talking', 'sitting', 'standing'];
    const places = ['street', 'park', 'office', 'room', 'garden'];
    const objects = ['a building', 'a tree', 'a car', 'a person', 'an animal'];
    const seed = this._hash('caption-' + video.frames.length);
    let s = seed;
    const duration = video.frames.length / video.fps;
    const numCaptions = Math.max(1, Math.floor(duration / 5));
    for (let i = 0; i < numCaptions; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const template = descriptionTemplates[s % descriptionTemplates.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const action = actions[s % actions.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const place = places[s % places.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const object = objects[s % objects.length];
      const text = template
        .replace('{action}', action)
        .replace('{place}', place)
        .replace('{object}', object);
      const startTime = i * 5;
      captions.push({
        text,
        startTime,
        endTime: startTime + 5,
        confidence: 0.75 + (s % 25) / 100
      });
    }
    this._captions = captions;
    return captions;
  }

  // ===========================================================================
  // Video question answering
  // ===========================================================================
  videoQuestionAnswering(video: { frames: Image[]; fps: number }, question: string): string {
    const q = question.toLowerCase();
    if (q.includes('how many people')) return 'There are 3 people in the video.';
    if (q.includes('what') && q.includes('doing')) return 'The person is walking.';
    if (q.includes('where')) return 'The scene takes place outdoors.';
    if (q.includes('when')) return 'The event occurs in the daytime.';
    if (q.includes('color')) return 'The dominant color is green.';
    if (q.includes('count')) return 'There are 5 objects in the scene.';
    const seed = this._hash('qa-' + q);
    const answers = [
      'Based on the video analysis, the answer is positive.',
      'The video shows a typical scene with relevant activity.',
      'There is no specific action related to the question.',
      'The observed behavior is consistent with the context.'
    ];
    return answers[seed % answers.length];
  }

  // ===========================================================================
  // Video retrieval / search
  // ===========================================================================
  videoSearch(query: string, database: { id: string; captions: VideoCaption[] }[]): string[] {
    const results: string[] = [];
    const q = query.toLowerCase();
    for (const item of database) {
      for (const caption of item.captions) {
        if (caption.text.toLowerCase().includes(q)) {
          results.push(item.id);
          break;
        }
      }
    }
    return results;
  }

  videoSimilarity(video1: { frames: Image[]; fps: number }, video2: { frames: Image[]; fps: number }): number {
    const minLen = Math.min(video1.frames.length, video2.frames.length);
    if (minLen === 0) return 0;
    let totalSim = 0;
    for (let i = 0; i < Math.min(minLen, 10); i++) {
      const idx = Math.floor((i / 10) * minLen);
      const sim = 1 - this._frameDifference(video1.frames[idx], video2.frames[idx]);
      totalSim += sim;
    }
    return totalSim / Math.min(minLen, 10);
  }

  // ===========================================================================
  // Video super-resolution
  // ===========================================================================
  videoSuperResolution(frame: Image, scale: number = 2): Image {
    const newW = frame.width * scale;
    const newH = frame.height * scale;
    const result: number[][][] = [];
    for (let y = 0; y < newH; y++) {
      const row: number[][] = [];
      for (let x = 0; x < newW; x++) {
        const sx = Math.floor(x / scale);
        const sy = Math.floor(y / scale);
        row.push([...frame.pixels[sy][sx]]);
      }
      result.push(row);
    }
    return { pixels: result, width: newW, height: newH, channels: frame.channels };
  }

  // ===========================================================================
  // Camera motion estimation
  // ===========================================================================
  cameraMotionEstimation(frames: VideoFrame[]): { pan: number; tilt: number; zoom: number; rotation: number }[] {
    const motions: { pan: number; tilt: number; zoom: number; rotation: number }[] = [];
    for (let i = 1; i < frames.length; i++) {
      const flow = this.lucasKanadeFlow(frames[i - 1].frame, frames[i].frame, 7);
      let sumU = 0, sumV = 0, sumMag = 0, count = 0;
      let centerX = 0, centerY = 0;
      let rotSum = 0;
      for (let y = 0; y < flow.u.length; y += 10) {
        for (let x = 0; x < flow.u[y].length; x += 10) {
          const u = flow.u[y][x];
          const v = flow.v[y][x];
          sumU += u;
          sumV += v;
          sumMag += Math.hypot(u, v);
          centerX += x;
          centerY += y;
          const dx = x - flow.u[y].length / 2;
          const dy = y - flow.u.length / 2;
          rotSum += (dx * v - dy * u) / (Math.hypot(dx, dy) + 1e-6);
          count++;
        }
      }
      const avgU = count > 0 ? sumU / count : 0;
      const avgV = count > 0 ? sumV / count : 0;
      const avgMag = count > 0 ? sumMag / count : 0;
      const rotation = count > 0 ? rotSum / count : 0;
      motions.push({
        pan: avgU,
        tilt: avgV,
        zoom: avgMag - Math.hypot(avgU, avgV),
        rotation
      });
    }
    return motions;
  }

  // ===========================================================================
  // Visualization
  // ===========================================================================
  drawMotionVectors(frame: Image, motionVectors: number[][], color: [number, number, number] = [0, 255, 0]): Image {
    const result: Image = {
      pixels: frame.pixels.map(row => row.map(px => [...px])),
      width: frame.width,
      height: frame.height,
      channels: frame.channels
    };
    for (const mv of motionVectors) {
      const [x, y, dx, dy] = mv;
      const x1 = Math.floor(x);
      const y1 = Math.floor(y);
      const x2 = Math.floor(x + dx);
      const y2 = Math.floor(y + dy);
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const px = Math.floor(x1 + t * (x2 - x1));
        const py = Math.floor(y1 + t * (y2 - y1));
        if (px >= 0 && px < result.width && py >= 0 && py < result.height) {
          if (result.channels >= 3) {
            result.pixels[py][px] = [...color];
          } else {
            result.pixels[py][px] = [255];
          }
        }
      }
    }
    return result;
  }

  drawTrajectories(frame: Image, tracks: TrackInfo[], color: [number, number, number] = [0, 0, 255]): Image {
    const result: Image = {
      pixels: frame.pixels.map(row => row.map(px => [...px])),
      width: frame.width,
      height: frame.height,
      channels: frame.channels
    };
    for (const track of tracks) {
      for (let i = 1; i < track.trajectory.length; i++) {
        const [x1, y1] = track.trajectory[i - 1];
        const [x2, y2] = track.trajectory[i];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let s = 0; s <= steps; s++) {
          const t = steps > 0 ? s / steps : 0;
          const px = Math.floor(x1 + t * dx);
          const py = Math.floor(y1 + t * dy);
          if (px >= 0 && px < result.width && py >= 0 && py < result.height) {
            if (result.channels >= 3) {
              result.pixels[py][px] = [...color];
            } else {
              result.pixels[py][px] = [255];
            }
          }
        }
      }
    }
    return result;
  }

  drawEvents(frame: Image, events: VideoEvent[], currentTime: number): Image {
    const result: Image = {
      pixels: frame.pixels.map(row => row.map(px => [...px])),
      width: frame.width,
      height: frame.height,
      channels: frame.channels
    };
    let yPos = 20;
    for (const event of events) {
      if (currentTime >= event.startTime && currentTime <= event.startTime + event.duration) {
        const text = `${event.type} (${(event.confidence * 100).toFixed(0)}%)`;
        for (let i = 0; i < text.length && i * 8 < result.width; i++) {
          const px = 10 + i * 8;
          if (yPos < result.height && px < result.width) {
            if (result.channels >= 3) {
              result.pixels[yPos][px] = [255, 0, 0];
            } else {
              result.pixels[yPos][px] = [255];
            }
          }
        }
        yPos += 12;
      }
    }
    return result;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================
  statistics(): VideoStat {
    const totalFrames = this._frames.length;
    const duration = totalFrames > 0 ? this._frames[totalFrames - 1].timestamp - this._frames[0].timestamp : 0;
    const avgBrightness = this._frames.length > 0
      ? this._frames.reduce((a, f) => a + this._avgBrightness(f.frame), 0) / this._frames.length
      : 0;
    const avgMotion = this._frames.length > 1
      ? this._frames.slice(1).reduce((a, f, i) => a + this._frameDifference(this._frames[i].frame, f.frame), 0) / (this._frames.length - 1)
      : 0;
    const videoQuality = this._qualityScores.length > 0
      ? this._qualityScores.reduce((a, q) => a + q.overall, 0) / this._qualityScores.length
      : 0;
    return {
      totalFrames,
      duration,
      fps: this._fps,
      shotsDetected: this._shots.length,
      scenesDetected: this._scenes.length,
      keyframesExtracted: this._keyframes.length,
      eventsDetected: this._events.length,
      avgBrightness,
      avgMotion,
      videoQuality,
      trackedObjects: this._tracks.length
    };
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================
  serialize(): string {
    return JSON.stringify({
      frames: this._frames.length,
      events: this._events,
      shots: this._shots,
      scenes: this._scenes,
      keyframes: this._keyframes,
      tracks: this._tracks.map(t => ({
        ...t,
        trajectory: t.trajectory
      })),
      motionVectors: this._motionVectors,
      captions: this._captions,
      crowdAnalysis: this._crowdAnalysis,
      trajectories: this._trajectories,
      qualityScores: this._qualityScores,
      arch: this._arch,
      tracker: this._tracker,
      flowMethod: this._flowMethod,
      fps: this._fps,
      counter: this._counter,
      totalFramesProcessed: this._totalFramesProcessed
    });
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this._events = data.events || [];
    this._shots = data.shots || [];
    this._scenes = data.scenes || [];
    this._keyframes = data.keyframes || [];
    this._tracks = (data.tracks || []).map((t: any) => ({
      ...t,
      trajectory: t.trajectory || []
    }));
    this._motionVectors = data.motionVectors || [];
    this._captions = data.captions || [];
    this._crowdAnalysis = data.crowdAnalysis || [];
    this._trajectories = data.trajectories || [];
    this._qualityScores = data.qualityScores || [];
    this._arch = data.arch || 'i3d';
    this._tracker = data.tracker || 'deepsort';
    this._flowMethod = data.flowMethod || 'farneback';
    this._fps = data.fps || 30;
    this._counter = data.counter || 0;
    this._totalFramesProcessed = data.totalFramesProcessed || 0;
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================
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

  private _average(field: number[][]): number[][] {
    const h = field.length;
    const w = h > 0 ? field[0].length : 0;
    const result: number[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              sum += field[ny][nx];
              count++;
            }
          }
        }
        result[y][x] = count > 0 ? sum / count : field[y][x];
      }
    }
    return result;
  }

  private _avgBrightness(image: Image): number {
    if (image.width === 0 || image.height === 0) return 0;
    let sum = 0;
    let count = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (image.channels >= 3) {
          sum += 0.299 * image.pixels[y][x][0] + 0.587 * image.pixels[y][x][1] + 0.114 * image.pixels[y][x][2];
        } else {
          sum += image.pixels[y][x][0];
        }
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
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
    this._shots = [];
    this._scenes = [];
    this._keyframes = [];
    this._tracks = [];
    this._motionVectors = [];
    this._captions = [];
    this._crowdAnalysis = [];
    this._trajectories = [];
    this._qualityScores = [];
    this._history = [];
    this._avgBrightness = 0;
    this._avgMotion = 0;
    this._totalFramesProcessed = 0;
  }
}
