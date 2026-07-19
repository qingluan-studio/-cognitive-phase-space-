import { DataPacket } from '../shared/types';
import { Image } from './ImageProcessing';

export interface Landmark {
  name: string;
  position: [number, number];
}

export interface Face {
  id: string;
  landmarks: Landmark[];
  embedding: number[];
  confidence: number;
}

export class FaceRecognition {
  private _faces: Face[] = [];
  private _database: Map<string, number[]> = new Map();
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastFace: Face | null = null;

  get faces(): Face[] {
    return this._faces;
  }

  get database(): Map<string, number[]> {
    return this._database;
  }

  get modelType(): string {
    return this._modelType;
  }

  detectFaces(image: Image, model: { name: string }): Face[] {
    const faces: Face[] = [];
    const numFaces = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numFaces; i++) {
      const landmarks: Landmark[] = [];
      const landmarkNames = ['left_eye', 'right_eye', 'nose', 'left_mouth', 'right_mouth', 'chin', 'left_eyebrow', 'right_eyebrow'];
      const cx = image.width * (0.3 + Math.random() * 0.4);
      const cy = image.height * (0.3 + Math.random() * 0.4);
      for (let j = 0; j < landmarkNames.length; j++) {
        const angle = (j / landmarkNames.length) * Math.PI * 2;
        landmarks.push({
          name: landmarkNames[j],
          position: [cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30]
        });
      }
      const embedding = new Array(128).fill(0);
      let seed = i * 9973;
      for (let j = 0; j < 128; j++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        embedding[j] = (seed / 0x7fffffff) * 2 - 1;
      }
      const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
      for (let j = 0; j < 128; j++) {
        embedding[j] /= norm;
      }
      faces.push({
        id: `face-${i}`,
        landmarks,
        embedding,
        confidence: 0.7 + Math.random() * 0.3
      });
    }
    this._faces = faces;
    this._modelType = model.name;
    this._lastFace = faces[0] || null;
    return faces;
  }

  alignFace(image: Image, landmarks: Landmark[]): Image {
    const leftEye = landmarks.find(l => l.name === 'left_eye');
    const rightEye = landmarks.find(l => l.name === 'right_eye');
    if (!leftEye || !rightEye) return image;
    const dx = rightEye.position[0] - leftEye.position[0];
    const dy = rightEye.position[1] - leftEye.position[1];
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const rotated = this._rotateImage(image, angle);
    return rotated;
  }

  extractFaceEmbedding(faceImage: Image, model: { name: string }): number[] {
    const embedding = new Array(128).fill(0);
    let seed = this._hash(model.name + faceImage.width + 'x' + faceImage.height);
    for (let i = 0; i < 128; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embedding[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
    return embedding.map(v => v / norm);
  }

  matchFaces(embedding1: number[], embedding2: number[], threshold: number): boolean {
    const sim = this._cosineSimilarity(embedding1, embedding2);
    return sim > threshold;
  }

  recognize(image: Image, database: Map<string, number[]>, threshold: number): Face[] {
    const faces = this.detectFaces(image, { name: 'recognize' });
    const result: Face[] = [];
    for (const face of faces) {
      let bestId = 'unknown';
      let bestSim = threshold;
      for (const [id, emb] of database) {
        const sim = this._cosineSimilarity(face.embedding, emb);
        if (sim > bestSim) {
          bestSim = sim;
          bestId = id;
        }
      }
      result.push({ ...face, id: bestId, confidence: bestSim });
    }
    this._faces = result;
    this._modelType = 'recognize';
    return result;
  }

  verify(image1: Image, image2: Image, threshold: number): boolean {
    const faces1 = this.detectFaces(image1, { name: 'verify' });
    const faces2 = this.detectFaces(image2, { name: 'verify' });
    if (faces1.length === 0 || faces2.length === 0) return false;
    return this.matchFaces(faces1[0].embedding, faces2[0].embedding, threshold);
  }

  facialLandmarks(image: Image, points: number = 68): Landmark[] {
    const landmarks: Landmark[] = [];
    const cx = image.width / 2;
    const cy = image.height / 2;
    const names = ['jaw', 'left_eyebrow', 'right_eyebrow', 'nose_bridge', 'nose_tip', 'left_eye', 'right_eye', 'outer_lip', 'inner_lip'];
    for (let i = 0; i < points; i++) {
      const groupIdx = Math.floor((i / points) * names.length);
      const angle = (i / points) * Math.PI * 2;
      const r = 50 + (groupIdx % 3) * 10;
      landmarks.push({
        name: `${names[groupIdx % names.length]}_${i}`,
        position: [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
      });
    }
    return landmarks;
  }

  ageEstimation(faceImage: Image): number {
    const seed = this._hash('age' + faceImage.width + faceImage.height);
    return 10 + (seed % 60);
  }

  genderEstimation(faceImage: Image): string {
    const seed = this._hash('gender' + faceImage.width + faceImage.height);
    return seed % 2 === 0 ? 'male' : 'female';
  }

  expressionRecognition(faceImage: Image): string {
    const expressions = ['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'neutral'];
    const seed = this._hash('expression' + faceImage.width + faceImage.height);
    return expressions[seed % expressions.length];
  }

  faceTracking(video: Image[], initialFace: Face): Face[] {
    const track: Face[] = [initialFace];
    let current = { ...initialFace };
    for (let i = 1; i < video.length; i++) {
      current = {
        ...current,
        landmarks: current.landmarks.map(l => ({
          ...l,
          position: [
            l.position[0] + (Math.random() - 0.5) * 5,
            l.position[1] + (Math.random() - 0.5) * 5
          ]
        }))
      };
      track.push({ ...current });
    }
    return track;
  }

  antispoofing(faceImage: Image): boolean {
    const seed = this._hash('spoof' + faceImage.width + faceImage.height);
    return seed % 3 !== 0;
  }

  private _rotateImage(image: Image, angle: number): Image {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = image.width / 2;
    const cy = image.height / 2;
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const srcX = Math.floor(cx + dx * cos + dy * sin);
        const srcY = Math.floor(cy - dx * sin + dy * cos);
        if (srcX >= 0 && srcX < image.width && srcY >= 0 && srcY < image.height) {
          row.push(image.pixels[srcY][srcX]);
        } else {
          row.push(new Array(image.channels).fill(0));
        }
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  private _cosineSimilarity(v1: number[], v2: number[]): number {
    let dot = 0;
    let n1 = 0;
    let n2 = 0;
    const minLen = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLen; i++) {
      dot += v1[i] * v2[i];
      n1 += v1[i] * v1[i];
      n2 += v2[i] * v2[i];
    }
    const denom = Math.sqrt(n1) * Math.sqrt(n2);
    return denom === 0 ? 0 : dot / denom;
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

  toPacket(): DataPacket<Face[]> {
    this._counter++;
    return {
      id: `face-rec-${Date.now()}-${this._counter}`,
      payload: this._faces,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'face-recognition'],
        priority: 1,
        phase: 'face-recognition'
      }
    };
  }

  reset(): void {
    this._faces = [];
    this._database.clear();
    this._counter = 0;
    this._modelType = 'default';
    this._lastFace = null;
  }
}
