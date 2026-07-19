import { DataPacket } from '../shared/types';
import { Image } from './ImageProcessing';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  class: string;
  confidence: number;
  bbox: BoundingBox;
  mask?: number[][];
}

export class ObjectDetection {
  private _detections: DetectedObject[] = [];
  private _classes: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastDetections: DetectedObject[] = [];

  get detections(): DetectedObject[] {
    return this._detections;
  }

  get classes(): string[] {
    return this._classes;
  }

  get modelType(): string {
    return this._modelType;
  }

  detect(image: Image, model: { name: string; classes?: string[] }): DetectedObject[] {
    const classes = model.classes || ['person', 'car', 'dog', 'cat', 'chair'];
    const detections: DetectedObject[] = [];
    const numObjects = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numObjects; i++) {
      const cls = classes[i % classes.length];
      const confidence = 0.5 + Math.random() * 0.5;
      const bbox: BoundingBox = {
        x: Math.random() * (image.width * 0.5),
        y: Math.random() * (image.height * 0.5),
        width: 50 + Math.random() * (image.width * 0.3),
        height: 50 + Math.random() * (image.height * 0.3)
      };
      detections.push({ class: cls, confidence, bbox });
    }
    this._lastDetections = detections;
    this._detections.push(...detections);
    this._classes = classes;
    this._modelType = model.name;
    return detections;
  }

  yoloDetect(image: Image, model: { name: string; classes?: string[] }): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'yolo';
    return result;
  }

  rcnnDetect(image: Image, model: { name: string; classes?: string[] }): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'rcnn';
    return result;
  }

  ssdDetect(image: Image, model: { name: string; classes?: string[] }): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'ssd';
    return result;
  }

  fastRcnn(image: Image, model: { name: string; classes?: string[] }): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'fast-rcnn';
    return result;
  }

  maskRcnn(image: Image, model: { name: string; classes?: string[] }): DetectedObject[] {
    const detections = this.detect(image, model);
    for (const det of detections) {
      const maskH = Math.floor(det.bbox.height);
      const maskW = Math.floor(det.bbox.width);
      const mask: number[][] = [];
      for (let y = 0; y < maskH; y++) {
        const row: number[] = [];
        for (let x = 0; x < maskW; x++) {
          const dx = x / maskW - 0.5;
          const dy = y / maskH - 0.5;
          row.push(Math.exp(-(dx * dx + dy * dy) * 8) > 0.3 ? 1 : 0);
        }
        mask.push(row);
      }
      det.mask = mask;
    }
    this._modelType = 'mask-rcnn';
    return detections;
  }

  nonMaxSuppression(boxes: DetectedObject[], scores: number[], threshold: number): DetectedObject[] {
    const sorted = boxes.map((b, i) => ({ box: b, score: scores[i] }))
      .sort((a, b) => b.score - a.score);
    const result: DetectedObject[] = [];
    while (sorted.length > 0) {
      const current = sorted.shift()!;
      result.push(current.box);
      const remaining: { box: DetectedObject; score: number }[] = [];
      for (const item of sorted) {
        const iou = this.iou(current.box.bbox, item.box.bbox);
        if (iou < threshold) {
          remaining.push(item);
        }
      }
      sorted.length = 0;
      sorted.push(...remaining);
    }
    return result;
  }

  iou(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    return union > 0 ? intersection / union : 0;
  }

  nms(boxes: DetectedObject[], scores: number[], iouThreshold: number): DetectedObject[] {
    return this.nonMaxSuppression(boxes, scores, iouThreshold);
  }

  drawBoundingBox(image: Image, detections: DetectedObject[]): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = [...image.pixels[y][x]];
        for (const det of detections) {
          const bbox = det.bbox;
          const onEdge = (Math.abs(x - bbox.x) < 2 || Math.abs(x - (bbox.x + bbox.width)) < 2) &&
            y >= bbox.y && y <= bbox.y + bbox.height;
          const onEdgeY = (Math.abs(y - bbox.y) < 2 || Math.abs(y - (bbox.y + bbox.height)) < 2) &&
            x >= bbox.x && x <= bbox.x + bbox.width;
          if (onEdge || onEdgeY) {
            pixel[0] = 255;
            pixel[1] = 0;
            pixel[2] = 0;
          }
        }
        row.push(pixel);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  objectTracking(frames: Image[], initialBox: BoundingBox): BoundingBox[] {
    const trackers: BoundingBox[] = [initialBox];
    let currentBox = { ...initialBox };
    for (let i = 1; i < frames.length; i++) {
      currentBox = {
        ...currentBox,
        x: currentBox.x + (Math.random() - 0.5) * 10,
        y: currentBox.y + (Math.random() - 0.5) * 10,
        width: currentBox.width * (0.95 + Math.random() * 0.1),
        height: currentBox.height * (0.95 + Math.random() * 0.1)
      };
      trackers.push({ ...currentBox });
    }
    return trackers;
  }

  pedestrianDetection(image: Image): DetectedObject[] {
    return this.detect(image, { name: 'pedestrian', classes: ['pedestrian'] });
  }

  faceDetection(image: Image): DetectedObject[] {
    return this.detect(image, { name: 'face', classes: ['face'] });
  }

  toPacket(): DataPacket<DetectedObject[]> {
    this._counter++;
    return {
      id: `detection-${Date.now()}-${this._counter}`,
      payload: this._lastDetections,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'object-detection'],
        priority: 1,
        phase: 'detection'
      }
    };
  }

  reset(): void {
    this._detections = [];
    this._classes = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastDetections = [];
  }
}
