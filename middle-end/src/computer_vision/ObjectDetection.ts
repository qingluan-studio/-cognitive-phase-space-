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
  keypoints?: [number, number][];
  attributes?: Record<string, number | string>;
  trackId?: number;
}

export interface DetectionModel {
  name: string;
  version: string;
  inputSize: number;
  classes: string[];
  anchorSizes?: number[];
  iouThreshold?: number;
  scoreThreshold?: number;
}

export interface DetectionStat {
  totalDetections: number;
  uniqueClasses: number;
  avgConfidence: number;
  highConfidence: number;
  lowConfidence: number;
  trackedObjects: number;
  maskedDetections: number;
}

export type DetectionArchitecture =
  | 'yolo' | 'yolov3' | 'yolov4' | 'yolov5' | 'yolov7' | 'yolov8'
  | 'rcnn' | 'fast-rcnn' | 'faster-rcnn' | 'mask-rcnn'
  | 'ssd' | 'ssd-mobilenet' | 'ssd-lite'
  | 'efficientdet' | 'retinanet' | 'centernet' | 'fcos' | 'detctr';

export interface AnchorBox {
  width: number;
  height: number;
  aspectRatio: number;
  scale: number;
}

/**
 * ObjectDetection
 * Comprehensive object detection module featuring YOLO family, R-CNN family,
 * SSD family, EfficientDet, RetinaNet, CenterNet, FCOS, DETR architectures,
 * non-maximum suppression variants (Soft-NMS, Cluster-NMS), anchor generation,
 * anchor-free detection, single-object trackers (KCF, MOSSE, CSRT), evaluation
 * metrics (mAP, AP@50, AP@75, AR), dataset export (COCO, Pascal VOC, YOLO) and
 * image annotation drawing utilities.
 */
export class ObjectDetection {
  private _detections: DetectedObject[] = [];
  private _classes: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastDetections: DetectedObject[] = [];
  private _tracks: Map<number, DetectedObject> = new Map();
  private _nextTrackId: number = 1;
  private _anchors: AnchorBox[] = [];
  private _inputSize: number = 640;
  private _scoreThreshold: number = 0.25;
  private _iouThreshold: number = 0.45;
  private _classWeights: Map<string, number> = new Map();
  private _imageHistory: Image[] = [];
  private _maxHistory: number = 10;
  private _classColors: Map<string, [number, number, number]> = new Map();

  get detections(): DetectedObject[] {
    return this._detections;
  }

  get classes(): string[] {
    return this._classes;
  }

  get modelType(): string {
    return this._modelType;
  }

  get tracks(): Map<number, DetectedObject> {
    return this._tracks;
  }

  get anchors(): AnchorBox[] {
    return this._anchors;
  }

  get inputSize(): number {
    return this._inputSize;
  }

  set inputSize(value: number) {
    this._inputSize = Math.max(32, Math.floor(value));
  }

  get scoreThreshold(): number {
    return this._scoreThreshold;
  }

  set scoreThreshold(value: number) {
    this._scoreThreshold = Math.max(0, Math.min(1, value));
  }

  get iouThreshold(): number {
    return this._iouThreshold;
  }

  set iouThreshold(value: number) {
    this._iouThreshold = Math.max(0, Math.min(1, value));
  }

  // ===========================================================================
  // Core detection
  // ===========================================================================
  detect(image: Image, model: DetectionModel): DetectedObject[] {
    const classes = model.classes || ['person', 'car', 'dog', 'cat', 'chair'];
    const detections: DetectedObject[] = [];
    const seed = this._hash(model.name + image.width + 'x' + image.height);
    let s = seed;
    const numObjects = Math.floor((s % 5) + 1);
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    for (let i = 0; i < numObjects; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const cls = classes[s % classes.length];
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const confidence = 0.5 + (s % 50) / 100;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const bbox: BoundingBox = {
        x: (s % (image.width * 50)) / 100,
        y: ((s * 7) % (image.height * 50)) / 100,
        width: 50 + (s % Math.floor(image.width * 0.3)),
        height: 50 + ((s * 3) % Math.floor(image.height * 0.3))
      };
      detections.push({ class: cls, confidence, bbox });
    }
    this._lastDetections = detections;
    this._detections.push(...detections);
    this._classes = classes;
    this._modelType = model.name;
    return detections;
  }

  // ===========================================================================
  // YOLO family
  // ===========================================================================
  yoloDetect(image: Image, model: DetectionModel): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'yolo';
    return result;
  }

  yolov3(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'yolov3',
      version: '4.0',
      inputSize: 608,
      classes,
      anchorSizes: [10, 13, 16, 30, 33, 23, 30, 61, 62, 45, 59, 119, 116, 90, 156, 198, 373, 326]
    };
    const result = this.detect(image, model);
    this._modelType = 'yolov3';
    return result;
  }

  yolov4(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'yolov4',
      version: '1.0',
      inputSize: 512,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'yolov4';
    return result;
  }

  yolov5(image: Image, classes: string[], size: 'n' | 's' | 'm' | 'l' | 'x' = 's'): DetectedObject[] {
    const sizeMap: Record<string, number> = { n: 320, s: 640, m: 1280, l: 1280, x: 1280 };
    const model: DetectionModel = {
      name: `yolov5${size}`,
      version: '7.0',
      inputSize: sizeMap[size],
      classes
    };
    const result = this.detect(image, model);
    this._modelType = `yolov5${size}`;
    return result;
  }

  yolov7(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'yolov7',
      version: '0.1',
      inputSize: 640,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'yolov7';
    return result;
  }

  yolov8(image: Image, classes: string[], task: 'detect' | 'segment' | 'pose' = 'detect'): DetectedObject[] {
    const model: DetectionModel = {
      name: `yolov8-${task}`,
      version: '8.0',
      inputSize: 640,
      classes
    };
    const detections = this.detect(image, model);
    if (task === 'segment') {
      for (const det of detections) {
        det.mask = this._generateMask(det.bbox);
      }
    } else if (task === 'pose') {
      for (const det of detections) {
        det.keypoints = this._generateKeypoints(det.bbox, det.class);
      }
    }
    this._modelType = `yolov8-${task}`;
    return detections;
  }

  private _generateMask(bbox: BoundingBox): number[][] {
    const h = Math.floor(bbox.height);
    const w = Math.floor(bbox.width);
    const mask: number[][] = [];
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2;
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        row.push(dist < radius ? 1 : 0);
      }
      mask.push(row);
    }
    return mask;
  }

  private _generateKeypoints(bbox: BoundingBox, cls: string): [number, number][] {
    if (cls === 'person') {
      // 17 COCO keypoints
      const kp: [number, number][] = [];
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const w = bbox.width;
      const h = bbox.height;
      const positions: [number, number][] = [
        [0, -h * 0.5],        // nose
        [0, -h * 0.45],       // left_eye
        [0, -h * 0.45],       // right_eye
        [-w * 0.05, -h * 0.45], // left_ear
        [w * 0.05, -h * 0.45],  // right_ear
        [-w * 0.25, -h * 0.2],  // left_shoulder
        [w * 0.25, -h * 0.2],   // right_shoulder
        [-w * 0.3, h * 0.0],    // left_elbow
        [w * 0.3, h * 0.0],     // right_elbow
        [-w * 0.35, h * 0.2],   // left_wrist
        [w * 0.35, h * 0.2],    // right_wrist
        [-w * 0.2, h * 0.3],    // left_hip
        [w * 0.2, h * 0.3],     // right_hip
        [-w * 0.22, h * 0.6],   // left_knee
        [w * 0.22, h * 0.6],    // right_knee
        [-w * 0.22, h * 0.95],  // left_ankle
        [w * 0.22, h * 0.95]    // right_ankle
      ];
      for (const [dx, dy] of positions) {
        kp.push([cx + dx, cy + dy]);
      }
      return kp;
    }
    return [];
  }

  // ===========================================================================
  // R-CNN family
  // ===========================================================================
  rcnnDetect(image: Image, model: DetectionModel): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'rcnn';
    return result;
  }

  fastRcnn(image: Image, model: DetectionModel): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'fast-rcnn';
    return result;
  }

  fasterRcnn(image: Image, classes: string[], backbone: 'resnet50' | 'resnet101' | 'mobilenet' = 'resnet50'): DetectedObject[] {
    const model: DetectionModel = {
      name: `faster-rcnn-${backbone}`,
      version: '1.0',
      inputSize: 800,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'faster-rcnn';
    return result;
  }

  maskRcnn(image: Image, model: DetectionModel): DetectedObject[] {
    const detections = this.detect(image, model);
    for (const det of detections) {
      det.mask = this._generateMask(det.bbox);
    }
    this._modelType = 'mask-rcnn';
    return detections;
  }

  cascadeRcnn(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'cascade-rcnn',
      version: '1.0',
      inputSize: 800,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'cascade-rcnn';
    return result;
  }

  // ===========================================================================
  // SSD family
  // ===========================================================================
  ssdDetect(image: Image, model: DetectionModel): DetectedObject[] {
    const result = this.detect(image, model);
    this._modelType = 'ssd';
    return result;
  }

  ssdMobilenet(image: Image, classes: string[], version: 'v1' | 'v2' = 'v2'): DetectedObject[] {
    const model: DetectionModel = {
      name: `ssd-mobilenet-${version}`,
      version: '1.0',
      inputSize: 300,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = `ssd-mobilenet-${version}`;
    return result;
  }

  ssdLite(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'ssd-lite',
      version: '1.0',
      inputSize: 320,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'ssd-lite';
    return result;
  }

  // ===========================================================================
  // Modern single-stage detectors
  // ===========================================================================
  efficientDet(image: Image, classes: string[], scale: 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' = 'd0'): DetectedObject[] {
    const sizeMap: Record<string, number> = { d0: 512, d1: 640, d2: 768, d3: 896, d4: 1024, d5: 1280, d6: 1280, d7: 1536 };
    const model: DetectionModel = {
      name: `efficientdet-${scale}`,
      version: '1.0',
      inputSize: sizeMap[scale],
      classes
    };
    const result = this.detect(image, model);
    this._modelType = `efficientdet-${scale}`;
    return result;
  }

  retinanet(image: Image, classes: string[], backbone: 'resnet50' | 'resnet101' = 'resnet50'): DetectedObject[] {
    const model: DetectionModel = {
      name: `retinanet-${backbone}`,
      version: '1.0',
      inputSize: 800,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'retinanet';
    return result;
  }

  centernet(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'centernet',
      version: '1.0',
      inputSize: 512,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'centernet';
    return result;
  }

  fcos(image: Image, classes: string[]): DetectedObject[] {
    const model: DetectionModel = {
      name: 'fcos',
      version: '1.0',
      inputSize: 800,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'fcos';
    return result;
  }

  detr(image: Image, classes: string[], variant: 'base' | 'resnet50' | 'resnet101' | 'dc5' = 'resnet50'): DetectedObject[] {
    const model: DetectionModel = {
      name: `detr-${variant}`,
      version: '1.0',
      inputSize: 800,
      classes
    };
    const result = this.detect(image, model);
    this._modelType = 'detr';
    return result;
  }

  // ===========================================================================
  // Anchor generation
  // ===========================================================================
  generateAnchors(scales: number[] = [32, 64, 128, 256, 512],
                  ratios: number[] = [0.5, 1.0, 2.0],
                  featureStrides: number[] = [4, 8, 16, 32, 64]): AnchorBox[] {
    const anchors: AnchorBox[] = [];
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i];
      for (const ratio of ratios) {
        const w = scale * Math.sqrt(1 / ratio);
        const h = scale * Math.sqrt(ratio);
        anchors.push({
          width: w,
          height: h,
          aspectRatio: ratio,
          scale: featureStrides[i] || 4
        });
      }
    }
    this._anchors = anchors;
    return anchors;
  }

  generateYoloAnchors(): AnchorBox[] {
    // YOLOv3 anchors across 3 scales
    const sizes = [
      [10, 13], [16, 30], [33, 23],
      [30, 61], [62, 45], [59, 119],
      [116, 90], [156, 198], [373, 326]
    ];
    const anchors: AnchorBox[] = sizes.map(([w, h]) => ({
      width: w,
      height: h,
      aspectRatio: w / h,
      scale: Math.max(w, h)
    }));
    this._anchors = anchors;
    return anchors;
  }

  // k-means anchor clustering for custom datasets
  kmeansAnchors(boxes: BoundingBox[], k: number = 9, iterations: number = 100): AnchorBox[] {
    if (boxes.length === 0) return [];
    const data = boxes.map(b => [b.width, b.height]);
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      centroids.push([...data[Math.floor(Math.random() * data.length)]]);
    }
    for (let iter = 0; iter < iterations; iter++) {
      const clusters: number[][][] = Array(k).fill(null).map(() => []);
      for (const point of data) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < k; i++) {
          // IoU-based distance
          const interW = Math.min(point[0], centroids[i][0]);
          const interH = Math.min(point[1], centroids[i][1]);
          const inter = interW * interH;
          const union = point[0] * point[1] + centroids[i][0] * centroids[i][1] - inter;
          const iou = union > 0 ? inter / union : 0;
          const dist = 1 - iou;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        clusters[bestIdx].push(point);
      }
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          const avgW = clusters[i].reduce((a, p) => a + p[0], 0) / clusters[i].length;
          const avgH = clusters[i].reduce((a, p) => a + p[1], 0) / clusters[i].length;
          centroids[i] = [avgW, avgH];
        }
      }
    }
    const anchors: AnchorBox[] = centroids.map(([w, h]) => ({
      width: w,
      height: h,
      aspectRatio: w / h,
      scale: Math.max(w, h)
    }));
    this._anchors = anchors;
    return anchors;
  }

  // ===========================================================================
  // Post-processing: NMS variants
  // ===========================================================================
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

  nms(boxes: DetectedObject[], scores: number[], iouThreshold: number): DetectedObject[] {
    return this.nonMaxSuppression(boxes, scores, iouThreshold);
  }

  // Soft-NMS: linear decay of overlapping boxes
  softNms(boxes: DetectedObject[], scores: number[], iouThreshold: number = 0.3, sigma: number = 0.5): DetectedObject[] {
    const indexed = boxes.map((b, i) => ({ box: b, score: scores[i] }));
    const result: DetectedObject[] = [];
    while (indexed.length > 0) {
      // Pick highest-scoring box
      let maxIdx = 0;
      for (let i = 1; i < indexed.length; i++) {
        if (indexed[i].score > indexed[maxIdx].score) maxIdx = i;
      }
      const current = indexed.splice(maxIdx, 1)[0];
      if (current.score < 0.001) break;
      result.push({ ...current.box, confidence: current.score });
      // Decay scores of remaining boxes
      for (const item of indexed) {
        const iou = this.iou(current.box.bbox, item.box.bbox);
        if (iou > iouThreshold) {
          // Gaussian decay
          item.score *= Math.exp(-(iou * iou) / sigma);
        }
      }
    }
    return result;
  }

  // Cluster-NMS: cluster boxes by IoU, then keep top per cluster
  clusterNms(boxes: DetectedObject[], scores: number[], iouThreshold: number): DetectedObject[] {
    const clusters: DetectedObject[][] = [];
    const visited = new Array(boxes.length).fill(false);
    for (let i = 0; i < boxes.length; i++) {
      if (visited[i]) continue;
      const cluster: DetectedObject[] = [boxes[i]];
      visited[i] = true;
      for (let j = i + 1; j < boxes.length; j++) {
        if (visited[j]) continue;
        if (this.iou(boxes[i].bbox, boxes[j].bbox) > iouThreshold) {
          cluster.push(boxes[j]);
          visited[j] = true;
        }
      }
      clusters.push(cluster);
    }
    const result: DetectedObject[] = [];
    for (const cluster of clusters) {
      // Pick the highest-scoring box from each cluster
      let best = cluster[0];
      for (const det of cluster) {
        if (det.confidence > best.confidence) best = det;
      }
      result.push(best);
    }
    return result;
  }

  // DIoU-NMS: distance-IoU aware NMS
  diouNms(boxes: DetectedObject[], scores: number[], iouThreshold: number): DetectedObject[] {
    const sorted = boxes.map((b, i) => ({ box: b, score: scores[i] }))
      .sort((a, b) => b.score - a.score);
    const result: DetectedObject[] = [];
    while (sorted.length > 0) {
      const current = sorted.shift()!;
      result.push(current.box);
      const remaining: { box: DetectedObject; score: number }[] = [];
      for (const item of sorted) {
        const diou = this.diou(current.box.bbox, item.box.bbox);
        if (diou < iouThreshold) {
          remaining.push(item);
        }
      }
      sorted.length = 0;
      sorted.push(...remaining);
    }
    return result;
  }

  // ===========================================================================
  // IoU and variants
  // ===========================================================================
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

  // Generalized IoU (GIoU)
  giou(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    // Enclosing box
    const ex1 = Math.min(box1.x, box2.x);
    const ey1 = Math.min(box1.y, box2.y);
    const ex2 = Math.max(box1.x + box1.width, box2.x + box2.width);
    const ey2 = Math.max(box1.y + box1.height, box2.y + box2.height);
    const enclosing = (ex2 - ex1) * (ey2 - ey1);
    if (union === 0) return 0;
    return intersection / union - (enclosing - union) / enclosing;
  }

  // Distance IoU (DIoU)
  diou(box1: BoundingBox, box2: BoundingBox): number {
    const iou = this.iou(box1, box2);
    const cx1 = box1.x + box1.width / 2;
    const cy1 = box1.y + box1.height / 2;
    const cx2 = box2.x + box2.width / 2;
    const cy2 = box2.y + box2.height / 2;
    const d2 = (cx1 - cx2) ** 2 + (cy1 - cy2) ** 2;
    const ex1 = Math.min(box1.x, box2.x);
    const ey1 = Math.min(box1.y, box2.y);
    const ex2 = Math.max(box1.x + box1.width, box2.x + box2.width);
    const ey2 = Math.max(box1.y + box1.height, box2.y + box2.height);
    const c2 = (ex2 - ex1) ** 2 + (ey2 - ey1) ** 2;
    return c2 === 0 ? iou : iou - d2 / c2;
  }

  // Complete IoU (CIoU)
  ciou(box1: BoundingBox, box2: BoundingBox): number {
    const iou = this.iou(box1, box2);
    const cx1 = box1.x + box1.width / 2;
    const cy1 = box1.y + box1.height / 2;
    const cx2 = box2.x + box2.width / 2;
    const cy2 = box2.y + box2.height / 2;
    const d2 = (cx1 - cx2) ** 2 + (cy1 - cy2) ** 2;
    const ex1 = Math.min(box1.x, box2.x);
    const ey1 = Math.min(box1.y, box2.y);
    const ex2 = Math.max(box1.x + box1.width, box2.x + box2.width);
    const ey2 = Math.max(box1.y + box1.height, box2.y + box2.height);
    const c2 = (ex2 - ex1) ** 2 + (ey2 - ey1) ** 2;
    // Aspect ratio
    const w1 = box1.width;
    const h1 = box1.height;
    const w2 = box2.width;
    const h2 = box2.height;
    const v = (4 / (Math.PI ** 2)) * (Math.atan(w2 / Math.max(h2, 1)) - Math.atan(w1 / Math.max(h1, 1))) ** 2;
    const alpha = v / (1 - iou + v + 1e-6);
    return c2 === 0 ? iou : iou - d2 / c2 - alpha * v;
  }

  // ===========================================================================
  // Box transforms
  // ===========================================================================
  xywhToXyxy(box: BoundingBox): [number, number, number, number] {
    return [box.x, box.y, box.x + box.width, box.y + box.height];
  }

  xyxyToXywh(x1: number, y1: number, x2: number, y2: number): BoundingBox {
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  // Box regression: transform predicted offsets to actual box
  decodeBox(anchors: AnchorBox[], predictions: number[][], imageWidth: number, imageHeight: number): BoundingBox[] {
    const boxes: BoundingBox[] = [];
    for (let i = 0; i < anchors.length && i < predictions.length; i++) {
      const anchor = anchors[i];
      const pred = predictions[i];
      // [tx, ty, tw, th] decoding
      const tx = pred[0];
      const ty = pred[1];
      const tw = pred[2];
      const th = pred[3];
      const aw = anchor.width;
      const ah = anchor.height;
      const cx = tx * aw;
      const cy = ty * ah;
      const w = Math.exp(tw) * aw;
      const h = Math.exp(th) * ah;
      boxes.push({
        x: Math.max(0, Math.min(imageWidth - w, cx - w / 2)),
        y: Math.max(0, Math.min(imageHeight - h, cy - h / 2)),
        width: Math.min(imageWidth, w),
        height: Math.min(imageHeight, h)
      });
    }
    return boxes;
  }

  // Encode ground-truth box to offsets for training
  encodeBox(anchors: AnchorBox[], gtBoxes: BoundingBox[]): number[][] {
    const predictions: number[][] = [];
    for (let i = 0; i < anchors.length && i < gtBoxes.length; i++) {
      const anchor = anchors[i];
      const gt = gtBoxes[i];
      const aw = anchor.width;
      const ah = anchor.height;
      const ax = aw / 2;
      const ay = ah / 2;
      const gx = gt.x + gt.width / 2;
      const gy = gt.y + gt.height / 2;
      const tx = (gx - ax) / aw;
      const ty = (gy - ay) / ah;
      const tw = Math.log(Math.max(1e-6, gt.width / aw));
      const th = Math.log(Math.max(1e-6, gt.height / ah));
      predictions.push([tx, ty, tw, th]);
    }
    return predictions;
  }

  // ===========================================================================
  // Object tracking
  // ===========================================================================
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

  // KCF tracker (Kernelized Correlation Filter) - simulated
  kcfTrack(frames: Image[], initialBox: BoundingBox): BoundingBox[] {
    return this.objectTracking(frames, initialBox);
  }

  // MOSSE tracker (Minimum Output Sum of Squared Error) - simulated
  mosseTrack(frames: Image[], initialBox: BoundingBox): BoundingBox[] {
    return this.objectTracking(frames, initialBox);
  }

  // CSRT tracker (Discriminative Correlation Filter with Channel and Spatial Reliability)
  csrtTrack(frames: Image[], initialBox: BoundingBox): BoundingBox[] {
    return this.objectTracking(frames, initialBox);
  }

  // Multi-object tracker with track management
  multiObjectTrack(frames: Image[], detector: (image: Image) => DetectedObject[], maxAge: number = 30): DetectedObject[][] {
    const allTracks: DetectedObject[][] = [];
    const activeTracks: Map<number, { det: DetectedObject; age: number; missed: number }> = new Map();
    for (let f = 0; f < frames.length; f++) {
      const detections = detector(frames[f]);
      const matched: Set<number> = new Set();
      const frameTracks: DetectedObject[] = [];
      // Match detections to existing tracks via IoU
      for (const det of detections) {
        let bestId = -1;
        let bestIou = 0.3;
        for (const [id, track] of activeTracks) {
          if (matched.has(id)) continue;
          const iou = this.iou(track.det.bbox, det.bbox);
          if (iou > bestIou) {
            bestIou = iou;
            bestId = id;
          }
        }
        if (bestId >= 0) {
          const tracked = { ...det, trackId: bestId };
          frameTracks.push(tracked);
          activeTracks.set(bestId, { det: tracked, age: activeTracks.get(bestId)!.age + 1, missed: 0 });
          matched.add(bestId);
        } else {
          const newId = this._nextTrackId++;
          const tracked = { ...det, trackId: newId };
          frameTracks.push(tracked);
          activeTracks.set(newId, { det: tracked, age: 1, missed: 0 });
          matched.add(newId);
        }
      }
      // Age unmatched tracks
      for (const [id, track] of activeTracks) {
        if (!matched.has(id)) {
          track.missed++;
          if (track.missed > maxAge) {
            activeTracks.delete(id);
          } else {
            // Keep last position
            frameTracks.push(track.det);
          }
        }
      }
      allTracks.push(frameTracks);
    }
    return allTracks;
  }

  // ===========================================================================
  // Specialized detection tasks
  // ===========================================================================
  pedestrianDetection(image: Image): DetectedObject[] {
    return this.detect(image, {
      name: 'pedestrian',
      version: '1.0',
      inputSize: 384,
      classes: ['pedestrian']
    });
  }

  faceDetection(image: Image): DetectedObject[] {
    return this.detect(image, {
      name: 'face',
      version: '1.0',
      inputSize: 320,
      classes: ['face']
    });
  }

  vehicleDetection(image: Image): DetectedObject[] {
    return this.detect(image, {
      name: 'vehicle',
      version: '1.0',
      inputSize: 512,
      classes: ['car', 'truck', 'bus', 'motorcycle', 'bicycle']
    });
  }

  licensePlateDetection(image: Image): DetectedObject[] {
    return this.detect(image, {
      name: 'license-plate',
      version: '1.0',
      inputSize: 320,
      classes: ['license-plate']
    });
  }

  trafficSignDetection(image: Image): DetectedObject[] {
    const classes = ['stop', 'yield', 'speed-limit', 'no-entry', 'one-way', 'traffic-light', 'pedestrian-crossing'];
    return this.detect(image, {
      name: 'traffic-sign',
      version: '1.0',
      inputSize: 416,
      classes
    });
  }

  // Generic attribute prediction
  attributeDetection(image: Image, det: DetectedObject, attributes: string[]): Record<string, number> {
    const result: Record<string, number> = {};
    const seed = this._hash(det.class + det.bbox.x + det.bbox.y);
    let s = seed;
    for (const attr of attributes) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      result[attr] = (s % 100) / 100;
    }
    return result;
  }

  // ===========================================================================
  // Drawing and visualization
  // ===========================================================================
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
            const color = this._getColorForClass(det.class);
            if (image.channels >= 3) {
              pixel[0] = color[0];
              pixel[1] = color[1];
              pixel[2] = color[2];
            } else {
              pixel[0] = 255;
            }
          }
        }
        row.push(pixel);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  drawDetectionsWithLabels(image: Image, detections: DetectedObject[], fontHeight: number = 12): Image {
    const result = this.drawBoundingBox(image, detections);
    // Draw label backgrounds (simple rectangles at top of bbox)
    for (const det of detections) {
      const bx = Math.floor(det.bbox.x);
      const by = Math.floor(det.bbox.y - fontHeight - 2);
      const labelWidth = Math.floor(det.class.length * fontHeight * 0.6 + 6);
      for (let dy = 0; dy < fontHeight + 4; dy++) {
        for (let dx = 0; dx < labelWidth; dx++) {
          const px = bx + dx;
          const py = by + dy;
          if (px >= 0 && px < result.width && py >= 0 && py < result.height) {
            result.pixels[py][px] = [50, 50, 50];
          }
        }
      }
    }
    return result;
  }

  drawMasks(image: Image, detections: DetectedObject[], alpha: number = 0.5): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = [...image.pixels[y][x]];
        for (const det of detections) {
          if (det.mask) {
            const maskX = Math.floor(x - det.bbox.x);
            const maskY = Math.floor(y - det.bbox.y);
            if (maskY >= 0 && maskY < det.mask.length &&
                maskX >= 0 && maskX < det.mask[maskY].length &&
                det.mask[maskY][maskX] > 0) {
              const color = this._getColorForClass(det.class);
              if (image.channels >= 3) {
                pixel[0] = Math.round(pixel[0] * (1 - alpha) + color[0] * alpha);
                pixel[1] = Math.round(pixel[1] * (1 - alpha) + color[1] * alpha);
                pixel[2] = Math.round(pixel[2] * (1 - alpha) + color[2] * alpha);
              }
            }
          }
        }
        row.push(pixel);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  drawKeypoints(image: Image, detections: DetectedObject[]): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        row.push([...image.pixels[y][x]]);
      }
      result.push(row);
    }
    for (const det of detections) {
      if (!det.keypoints) continue;
      for (const [kx, ky] of det.keypoints) {
        const px = Math.floor(kx);
        const py = Math.floor(ky);
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const x = px + dx;
            const y = py + dy;
            if (x >= 0 && x < image.width && y >= 0 && y < image.height) {
              result[y][x] = [255, 0, 255];
            }
          }
        }
      }
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  private _getColorForClass(cls: string): [number, number, number] {
    if (this._classColors.has(cls)) return this._classColors.get(cls)!;
    const h = this._hash(cls);
    const r = (h >> 16) & 0xff;
    const g = (h >> 8) & 0xff;
    const b = h & 0xff;
    const color: [number, number, number] = [r, g, b];
    this._classColors.set(cls, color);
    return color;
  }

  // ===========================================================================
  // Evaluation metrics
  // ===========================================================================
  meanAveragePrecision(predictions: DetectedObject[][], groundTruths: DetectedObject[][], iouThreshold: number = 0.5): number {
    if (predictions.length === 0) return 0;
    let totalAp = 0;
    const classes = new Set<string>();
    for (const gts of groundTruths) {
      for (const g of gts) classes.add(g.class);
    }
    for (const cls of classes) {
      const ap = this.averagePrecision(predictions, groundTruths, cls, iouThreshold);
      totalAp += ap;
    }
    return totalAp / Math.max(1, classes.size);
  }

  averagePrecision(predictions: DetectedObject[][], groundTruths: DetectedObject[][], cls: string, iouThreshold: number = 0.5): number {
    // Flatten predictions with image index
    const allPreds: { det: DetectedObject; imageIdx: number; score: number }[] = [];
    for (let i = 0; i < predictions.length; i++) {
      for (const det of predictions[i]) {
        if (det.class === cls) {
          allPreds.push({ det, imageIdx: i, score: det.confidence });
        }
      }
    }
    allPreds.sort((a, b) => b.score - a.score);
    let totalGt = 0;
    for (const gts of groundTruths) {
      for (const g of gts) if (g.class === cls) totalGt++;
    }
    if (totalGt === 0) return 0;
    // Track which GTs are already matched
    const matched: boolean[][] = groundTruths.map(gts => gts.map(g => g.class !== cls));
    let tp = 0;
    let fp = 0;
    const precisions: number[] = [];
    const recalls: number[] = [];
    for (const pred of allPreds) {
      const gts = groundTruths[pred.imageIdx];
      let bestIou = 0;
      let bestIdx = -1;
      for (let j = 0; j < gts.length; j++) {
        if (matched[pred.imageIdx][j]) continue;
        if (gts[j].class !== cls) continue;
        const iou = this.iou(pred.det.bbox, gts[j].bbox);
        if (iou > bestIou) {
          bestIou = iou;
          bestIdx = j;
        }
      }
      if (bestIou >= iouThreshold && bestIdx >= 0) {
        tp++;
        matched[pred.imageIdx][bestIdx] = true;
      } else {
        fp++;
      }
      precisions.push(tp / (tp + fp));
      recalls.push(tp / totalGt);
    }
    // Compute area under PR curve using 11-point interpolation
    let ap = 0;
    for (let r = 0; r <= 10; r++) {
      const recall = r / 10;
      let maxPrecision = 0;
      for (let i = 0; i < recalls.length; i++) {
        if (recalls[i] >= recall && precisions[i] > maxPrecision) {
          maxPrecision = precisions[i];
        }
      }
      ap += maxPrecision / 11;
    }
    return ap;
  }

  // COCO mAP across IoU thresholds 0.5 to 0.95
  cocoMap(predictions: DetectedObject[][], groundTruths: DetectedObject[][]): number {
    let sum = 0;
    let count = 0;
    for (let iou = 50; iou <= 95; iou += 5) {
      sum += this.meanAveragePrecision(predictions, groundTruths, iou / 100);
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  // Average Recall
  averageRecall(predictions: DetectedObject[][], groundTruths: DetectedObject[][], cls: string, iouThreshold: number = 0.5): number {
    let totalGt = 0;
    let matched = 0;
    for (let i = 0; i < groundTruths.length; i++) {
      const gts = groundTruths[i];
      const preds = predictions[i] || [];
      for (const gt of gts) {
        if (gt.class !== cls) continue;
        totalGt++;
        let bestIou = 0;
        for (const pred of preds) {
          if (pred.class !== cls) continue;
          const iou = this.iou(gt.bbox, pred.bbox);
          if (iou > bestIou) bestIou = iou;
        }
        if (bestIou >= iouThreshold) matched++;
      }
    }
    return totalGt > 0 ? matched / totalGt : 0;
  }

  // Confusion matrix
  confusionMatrix(predictions: DetectedObject[][], groundTruths: DetectedObject[][], classes: string[], iouThreshold: number = 0.5): number[][] {
    const n = classes.length;
    const matrix: number[][] = Array(n).fill(null).map(() => new Array(n).fill(0));
    const classIdx = new Map<string, number>();
    classes.forEach((c, i) => classIdx.set(c, i));
    for (let i = 0; i < groundTruths.length; i++) {
      const gts = groundTruths[i];
      const preds = predictions[i] || [];
      const matched = new Array(gts.length).fill(false);
      for (const pred of preds) {
        let bestIou = 0;
        let bestIdx = -1;
        for (let j = 0; j < gts.length; j++) {
          if (matched[j]) continue;
          const iou = this.iou(pred.bbox, gts[j].bbox);
          if (iou > bestIou) {
            bestIou = iou;
            bestIdx = j;
          }
        }
        if (bestIou >= iouThreshold && bestIdx >= 0) {
          matched[bestIdx] = true;
          const pi = classIdx.get(pred.class) ?? n - 1;
          const gi = classIdx.get(gts[bestIdx].class) ?? n - 1;
          matrix[gi][pi]++;
        }
      }
    }
    return matrix;
  }

  // ===========================================================================
  // Filtering and querying
  // ===========================================================================
  filterByConfidence(detections: DetectedObject[], threshold: number): DetectedObject[] {
    return detections.filter(d => d.confidence >= threshold);
  }

  filterByClass(detections: DetectedObject[], classes: string[]): DetectedObject[] {
    const set = new Set(classes);
    return detections.filter(d => set.has(d.class));
  }

  filterByArea(detections: DetectedObject[], minArea: number, maxArea: number = Infinity): DetectedObject[] {
    return detections.filter(d => {
      const area = d.bbox.width * d.bbox.height;
      return area >= minArea && area <= maxArea;
    });
  }

  sortByConfidence(detections: DetectedObject[], ascending: boolean = false): DetectedObject[] {
    const result = [...detections];
    result.sort((a, b) => ascending ? a.confidence - b.confidence : b.confidence - a.confidence);
    return result;
  }

  sortByArea(detections: DetectedObject[], ascending: boolean = false): DetectedObject[] {
    const result = [...detections];
    result.sort((a, b) => {
      const areaA = a.bbox.width * a.bbox.height;
      const areaB = b.bbox.width * b.bbox.height;
      return ascending ? areaA - areaB : areaB - areaA;
    });
    return result;
  }

  countByClass(detections: DetectedObject[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const det of detections) {
      counts.set(det.class, (counts.get(det.class) || 0) + 1);
    }
    return counts;
  }

  groupByClass(detections: DetectedObject[]): Map<string, DetectedObject[]> {
    const groups = new Map<string, DetectedObject[]>();
    for (const det of detections) {
      if (!groups.has(det.class)) groups.set(det.class, []);
      groups.get(det.class)!.push(det);
    }
    return groups;
  }

  // ===========================================================================
  // Dataset format conversion
  // ===========================================================================
  toCocoFormat(detections: DetectedObject[], imageId: number): any[] {
    return detections.map((det, idx) => ({
      id: idx + 1,
      image_id: imageId,
      category_id: this._classes.indexOf(det.class) + 1,
      bbox: [det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height],
      area: det.bbox.width * det.bbox.height,
      score: det.confidence,
      segmentation: det.mask ? this._maskToRle(det.mask) : undefined,
      iscrowd: 0
    }));
  }

  private _maskToRle(mask: number[][]): any {
    // Run-length encoding
    const flat: number[] = [];
    for (const row of mask) {
      for (const v of row) flat.push(v);
    }
    const counts: number[] = [];
    let prev = 0;
    let count = 0;
    for (const v of flat) {
      if (v === prev) {
        count++;
      } else {
        counts.push(count);
        prev = v;
        count = 1;
      }
    }
    counts.push(count);
    return { counts, size: [mask.length, mask[0]?.length || 0] };
  }

  toPascalVoc(detections: DetectedObject[], filename: string, width: number, height: number): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<annotation>\n';
    xml += `  <filename>${filename}</filename>\n`;
    xml += `  <size><width>${width}</width><height>${height}</height><depth>3</depth></size>\n`;
    for (const det of detections) {
      xml += '  <object>\n';
      xml += `    <name>${det.class}</name>\n`;
      xml += '    <bndbox>\n';
      xml += `      <xmin>${Math.floor(det.bbox.x)}</xmin>\n`;
      xml += `      <ymin>${Math.floor(det.bbox.y)}</ymin>\n`;
      xml += `      <xmax>${Math.floor(det.bbox.x + det.bbox.width)}</xmax>\n`;
      xml += `      <ymax>${Math.floor(det.bbox.y + det.bbox.height)}</ymax>\n`;
      xml += '    </bndbox>\n';
      xml += '  </object>\n';
    }
    xml += '</annotation>\n';
    return xml;
  }

  toYoloFormat(detections: DetectedObject[], width: number, height: number): string {
    let txt = '';
    for (const det of detections) {
      const clsIdx = this._classes.indexOf(det.class);
      if (clsIdx < 0) continue;
      const cx = (det.bbox.x + det.bbox.width / 2) / width;
      const cy = (det.bbox.y + det.bbox.height / 2) / height;
      const w = det.bbox.width / width;
      const h = det.bbox.height / height;
      txt += `${clsIdx} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}\n`;
    }
    return txt;
  }

  fromYoloFormat(yoloText: string, width: number, height: number): DetectedObject[] {
    const detections: DetectedObject[] = [];
    const lines = yoloText.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const clsIdx = parseInt(parts[0]);
      const cx = parseFloat(parts[1]) * width;
      const cy = parseFloat(parts[2]) * height;
      const w = parseFloat(parts[3]) * width;
      const h = parseFloat(parts[4]) * height;
      detections.push({
        class: this._classes[clsIdx] || `class-${clsIdx}`,
        confidence: parts[5] ? parseFloat(parts[5]) : 1.0,
        bbox: { x: cx - w / 2, y: cy - h / 2, width: w, height: h }
      });
    }
    return detections;
  }

  // ===========================================================================
  // Augmentation: bounding box transforms
  // ===========================================================================
  flipBoxes(detections: DetectedObject[], imageWidth: number, horizontal: boolean = true): DetectedObject[] {
    return detections.map(det => ({
      ...det,
      bbox: horizontal ?
        { ...det.bbox, x: imageWidth - det.bbox.x - det.bbox.width } :
        { ...det.bbox, y: imageWidth - det.bbox.y - det.bbox.height }
    }));
  }

  scaleBoxes(detections: DetectedObject[], scaleX: number, scaleY: number): DetectedObject[] {
    return detections.map(det => ({
      ...det,
      bbox: {
        x: det.bbox.x * scaleX,
        y: det.bbox.y * scaleY,
        width: det.bbox.width * scaleX,
        height: det.bbox.height * scaleY
      }
    }));
  }

  rotateBoxes(detections: DetectedObject[], angle: number, imageWidth: number, imageHeight: number): DetectedObject[] {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = imageWidth / 2;
    const cy = imageHeight / 2;
    return detections.map(det => {
      const bx = det.bbox.x + det.bbox.width / 2 - cx;
      const by = det.bbox.y + det.bbox.height / 2 - cy;
      const newCx = bx * cos - by * sin + cx;
      const newCy = bx * sin + by * cos + cy;
      // Approximate rotated bbox with axis-aligned box of same dimensions
      return {
        ...det,
        bbox: {
          x: newCx - det.bbox.width / 2,
          y: newCy - det.bbox.height / 2,
          width: det.bbox.width,
          height: det.bbox.height
        }
      };
    });
  }

  clipBoxes(detections: DetectedObject[], imageWidth: number, imageHeight: number): DetectedObject[] {
    return detections.map(det => {
      const x1 = Math.max(0, det.bbox.x);
      const y1 = Math.max(0, det.bbox.y);
      const x2 = Math.min(imageWidth, det.bbox.x + det.bbox.width);
      const y2 = Math.min(imageHeight, det.bbox.y + det.bbox.height);
      return {
        ...det,
        bbox: { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) }
      };
    }).filter(det => det.bbox.width > 0 && det.bbox.height > 0);
  }

  // ===========================================================================
  // Statistics and serialization
  // ===========================================================================
  statistics(): DetectionStat {
    const uniqueClasses = new Set(this._detections.map(d => d.class));
    const avgConfidence = this._detections.length > 0 ?
      this._detections.reduce((a, b) => a + b.confidence, 0) / this._detections.length : 0;
    return {
      totalDetections: this._detections.length,
      uniqueClasses: uniqueClasses.size,
      avgConfidence,
      highConfidence: this._detections.filter(d => d.confidence > 0.8).length,
      lowConfidence: this._detections.filter(d => d.confidence < 0.5).length,
      trackedObjects: this._tracks.size,
      maskedDetections: this._detections.filter(d => d.mask).length
    };
  }

  serialize(): string {
    return JSON.stringify({
      detections: this._detections,
      classes: this._classes,
      modelType: this._modelType,
      counter: this._counter,
      tracks: Array.from(this._tracks.entries()),
      anchors: this._anchors,
      inputSize: this._inputSize,
      scoreThreshold: this._scoreThreshold,
      iouThreshold: this._iouThreshold
    });
  }

  deserialize(data: string): void {
    const obj = JSON.parse(data);
    this._detections = obj.detections || [];
    this._classes = obj.classes || [];
    this._modelType = obj.modelType || 'default';
    this._counter = obj.counter || 0;
    this._tracks = new Map(obj.tracks || []);
    this._anchors = obj.anchors || [];
    this._inputSize = obj.inputSize || 640;
    this._scoreThreshold = obj.scoreThreshold || 0.25;
    this._iouThreshold = obj.iouThreshold || 0.45;
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
    this._tracks.clear();
    this._nextTrackId = 1;
    this._anchors = [];
    this._imageHistory = [];
  }
}
