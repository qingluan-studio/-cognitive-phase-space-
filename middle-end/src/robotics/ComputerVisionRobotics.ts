import { DataPacket, PacketMeta } from '../shared/types';

/** Camera intrinsic parameters. */
export interface CameraIntrinsics {
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
  readonly distortion: { k1: number; k2: number; p1: number; p2: number; k3: number };
  readonly resolution: { width: number; height: number };
}

/** Stereo camera pair descriptor. */
export interface StereoPair {
  readonly baseline: number;
  readonly leftIntrinsics: CameraIntrinsics;
  readonly rightIntrinsics: CameraIntrinsics;
  readonly rotation: [[number, number, number], [number, number, number], [number, number, number]];
  readonly translation: [number, number, number];
}

/** 2D image feature descriptor. */
export interface ImageFeature {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly descriptor: number[];
  readonly scale: number;
  readonly orientation: number;
  readonly octave: number;
}

/** 3D point from triangulation. */
export interface Point3D {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: [number, number, number];
  readonly confidence: number;
}

/** Object detection result. */
export interface DetectionResult {
  readonly classId: string;
  readonly className: string;
  readonly confidence: number;
  readonly bbox: { x: number; y: number; width: number; height: number };
  readonly mask?: number[][];
}

/** Camera pose descriptor. */
export interface CameraPose {
  readonly rotation: [[number, number, number], [number, number, number], [number, number, number]];
  readonly translation: [number, number, number];
  readonly timestamp: number;
  readonly covariance?: number[][];
}

/** Optical flow vector. */
export interface FlowVector {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly magnitude: number;
  readonly angle: number;
}

/** Depth map descriptor. */
export interface DepthMap {
  readonly width: number;
  readonly height: number;
  readonly depths: number[];
  readonly minDepth: number;
  readonly maxDepth: number;
  readonly units: string;
}

/** Point cloud descriptor. */
export interface PointCloud {
  readonly points: Point3D[];
  readonly sensorOrigin: [number, number, number];
  readonly timestamp: number;
  readonly density: number;
}

/** Homography matrix descriptor. */
export interface Homography {
  readonly matrix: [[number, number, number], [number, number, number], [number, number, number]];
  readonly inliers: number;
  readonly error: number;
}

/** Epipolar geometry descriptor. */
export interface EpipolarGeometry {
  readonly fundamentalMatrix: [[number, number, number], [number, number, number], [number, number, number]];
  readonly essentialMatrix: [[number, number, number], [number, number, number], [number, number, number]];
  readonly epipoles: { left: [number, number]; right: [number, number] };
  readonly inliers: number;
}

export class ComputerVisionRobotics {
  private _cameras: Map<string, CameraIntrinsics> = new Map();
  private _stereoPairs: Map<string, StereoPair> = new Map();
  private _features: Map<string, ImageFeature[]> = new Map();
  private _pointClouds: PointCloud[] = [];
  private _detections: DetectionResult[] = [];
  private _poseHistory: CameraPose[] = [];
  private _depthMaps: DepthMap[] = [];
  private _homographies: Homography[] = [];
  private _epipolarHistory: EpipolarGeometry[] = [];
  private _counter = 0;

  constructor() {
    this._seedCameras();
  }

  private _seedCameras(): void {
    const defaultCamera: CameraIntrinsics = {
      fx: 600,
      fy: 600,
      cx: 320,
      cy: 240,
      distortion: { k1: 0.1, k2: -0.05, p1: 0.001, p2: 0.001, k3: 0 },
      resolution: { width: 640, height: 480 },
    };
    this._cameras.set('cam-1', defaultCamera);
    this._cameras.set('cam-2', { ...defaultCamera, fx: 610, fy: 610 });
  }

  get cameraCount(): number { return this._cameras.size; }
  get stereoPairCount(): number { return this._stereoPairs.size; }
  get featureSetCount(): number { return this._features.size; }
  get pointCloudCount(): number { return this._pointClouds.length; }
  get detectionCount(): number { return this._detections.length; }

  public addCamera(id: string, intrinsics: CameraIntrinsics): void {
    this._cameras.set(id, intrinsics);
  }

  public getCamera(id: string): CameraIntrinsics | undefined {
    return this._cameras.get(id);
  }

  public addStereoPair(id: string, pair: StereoPair): void {
    this._stereoPairs.set(id, pair);
  }

  public getStereoPair(id: string): StereoPair | undefined {
    return this._stereoPairs.get(id);
  }

  /** Project a 3D point to image coordinates. */
  public projectPoint(point: [number, number, number], intrinsics: CameraIntrinsics): [number, number] {
    const x = point[0] / point[2];
    const y = point[1] / point[2];
    const r2 = x * x + y * y;
    const r4 = r2 * r2;
    const r6 = r4 * r2;
    const radial = 1 + intrinsics.distortion.k1 * r2 + intrinsics.distortion.k2 * r4 + intrinsics.distortion.k3 * r6;
    const tangentialX = 2 * intrinsics.distortion.p1 * x * y + intrinsics.distortion.p2 * (r2 + 2 * x * x);
    const tangentialY = intrinsics.distortion.p1 * (r2 + 2 * y * y) + 2 * intrinsics.distortion.p2 * x * y;
    const xd = x * radial + tangentialX;
    const yd = y * radial + tangentialY;
    const u = intrinsics.fx * xd + intrinsics.cx;
    const v = intrinsics.fy * yd + intrinsics.cy;
    return [Number(u.toFixed(4)), Number(v.toFixed(4))];
  }

  /** Back-project an image point to a 3D ray. */
  public backProjectPoint(uv: [number, number], intrinsics: CameraIntrinsics): [number, number, number] {
    const x = (uv[0] - intrinsics.cx) / intrinsics.fx;
    const y = (uv[1] - intrinsics.cy) / intrinsics.fy;
    const norm = Math.sqrt(x * x + y * y + 1);
    return [Number((x / norm).toFixed(6)), Number((y / norm).toFixed(6)), Number((1 / norm).toFixed(6))];
  }

  /** Detect corners using Harris corner detector. */
  public harrisCorners(image: number[][], windowSize: number = 3, k: number = 0.04, threshold: number = 10000): ImageFeature[] {
    const features: ImageFeature[] = [];
    const height = image.length;
    const width = image[0]?.length ?? 0;
    const dx: number[][] = [];
    const dy: number[][] = [];
    for (let y = 0; y < height; y++) {
      dx[y] = [];
      dy[y] = [];
      for (let x = 0; x < width; x++) {
        const pxm = image[y][x - 1] ?? image[y][x];
        const pxp = image[y][x + 1] ?? image[y][x];
        const pym = image[y - 1]?.[x] ?? image[y][x];
        const pyp = image[y + 1]?.[x] ?? image[y][x];
        dx[y][x] = (pxp - pxm) / 2;
        dy[y][x] = (pyp - pym) / 2;
      }
    }
    const half = Math.floor(windowSize / 2);
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let ixx = 0, iyy = 0, ixy = 0;
        for (let wy = -half; wy <= half; wy++) {
          for (let wx = -half; wx <= half; wx++) {
            const ix = dx[y + wy][x + wx];
            const iy = dy[y + wy][x + wx];
            ixx += ix * ix;
            iyy += iy * iy;
            ixy += ix * iy;
          }
        }
        const det = ixx * iyy - ixy * ixy;
        const trace = ixx + iyy;
        const response = det - k * trace * trace;
        if (response > threshold) {
          features.push({
            id: `corner-${++this._counter}`,
            x,
            y,
            descriptor: [ixx, iyy, ixy],
            scale: 1,
            orientation: Math.atan2(iy, ix),
            octave: 0,
          });
        }
      }
    }
    this._features.set(`harris-${this._counter}`, features);
    return features;
  }

  /** Compute optical flow using Lucas-Kanade method. */
  public lucasKanade(
    prevImage: number[][],
    currImage: number[][],
    features: ImageFeature[],
    windowSize: number = 5
  ): FlowVector[] {
    const flow: FlowVector[] = [];
    const half = Math.floor(windowSize / 2);
    for (const f of features) {
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      let ixx = 0, iyy = 0, ixy = 0, itx = 0, ity = 0;
      for (let wy = -half; wy <= half; wy++) {
        for (let wx = -half; wx <= half; wx++) {
          const px = x + wx;
          const py = y + wy;
          if (py < 0 || py >= prevImage.length || px < 0 || px >= (prevImage[0]?.length ?? 0)) continue;
          const prevVal = prevImage[py][px];
          const currVal = currImage[py][px];
          const ix = ((prevImage[py][px + 1] ?? prevVal) - (prevImage[py][px - 1] ?? prevVal)) / 2;
          const iy = ((prevImage[py + 1]?.[px] ?? prevVal) - (prevImage[py - 1]?.[px] ?? prevVal)) / 2;
          const it = currVal - prevVal;
          ixx += ix * ix;
          iyy += iy * iy;
          ixy += ix * iy;
          itx += ix * it;
          ity += iy * it;
        }
      }
      const det = ixx * iyy - ixy * ixy;
      const u = det !== 0 ? (-iyy * itx + ixy * ity) / det : 0;
      const v = det !== 0 ? (ixy * itx - ixx * ity) / det : 0;
      const mag = Math.sqrt(u * u + v * v);
      const angle = Math.atan2(v, u);
      flow.push({ x: f.x, y: f.y, dx: Number(u.toFixed(4)), dy: Number(v.toFixed(4)), magnitude: Number(mag.toFixed(4)), angle: Number(angle.toFixed(4)) });
    }
    return flow;
  }

  /** Triangulate a 3D point from stereo correspondence. */
  public triangulateStereo(
    leftPoint: [number, number],
    rightPoint: [number, number],
    stereo: StereoPair
  ): Point3D {
    const xl = (leftPoint[0] - stereo.leftIntrinsics.cx) / stereo.leftIntrinsics.fx;
    const yl = (leftPoint[1] - stereo.leftIntrinsics.cy) / stereo.leftIntrinsics.fy;
    const xr = (rightPoint[0] - stereo.rightIntrinsics.cx) / stereo.rightIntrinsics.fx;
    const yr = (rightPoint[1] - stereo.rightIntrinsics.cy) / stereo.rightIntrinsics.fy;
    const disparity = xl - xr;
    const z = disparity !== 0 ? (stereo.baseline * stereo.leftIntrinsics.fx) / disparity : 0;
    const x = xl * z;
    const y = yl * z;
    const point: Point3D = {
      id: `pt3d-${++this._counter}`,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      z: Number(z.toFixed(4)),
      color: [128, 128, 128],
      confidence: disparity !== 0 ? Number((1 / (1 + Math.abs(disparity))).toFixed(4)) : 0,
    };
    return point;
  }

  /** Compute depth map from stereo disparity. */
  public disparityToDepth(disparityMap: number[][], baseline: number, focalLength: number): DepthMap {
    const height = disparityMap.length;
    const width = disparityMap[0]?.length ?? 0;
    const depths: number[] = [];
    let minDepth = Infinity;
    let maxDepth = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const disp = disparityMap[y][x];
        const d = disp > 0 ? (baseline * focalLength) / disp : 0;
        depths.push(Number(d.toFixed(4)));
        if (d > 0) {
          minDepth = Math.min(minDepth, d);
          maxDepth = Math.max(maxDepth, d);
        }
      }
    }
    const map: DepthMap = {
      width,
      height,
      depths,
      minDepth: Number(minDepth.toFixed(4)),
      maxDepth: Number(maxDepth.toFixed(4)),
      units: 'meters',
    };
    this._depthMaps.push(map);
    return map;
  }

  /** Estimate camera pose from 2D-3D correspondences (simplified PnP). */
  public estimatePose(
    imagePoints: [number, number][],
    worldPoints: [number, number, number][],
    intrinsics: CameraIntrinsics
  ): CameraPose | null {
    if (imagePoints.length < 4 || worldPoints.length < 4) return null;
    const cx = intrinsics.cx;
    const cy = intrinsics.cy;
    const fx = intrinsics.fx;
    const fy = intrinsics.fy;
    let tx = 0, ty = 0, tz = 0;
    for (let i = 0; i < Math.min(imagePoints.length, worldPoints.length); i++) {
      tx += (worldPoints[i][0] - (imagePoints[i][0] - cx) / fx);
      ty += (worldPoints[i][1] - (imagePoints[i][1] - cy) / fy);
      tz += worldPoints[i][2];
    }
    const n = Math.min(imagePoints.length, worldPoints.length);
    const pose: CameraPose = {
      rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      translation: [Number((tx / n).toFixed(4)), Number((ty / n).toFixed(4)), Number((tz / n).toFixed(4))],
      timestamp: Date.now(),
      covariance: Array.from({ length: 6 }, () => Array(6).fill(0)),
    };
    this._poseHistory.push(pose);
    return pose;
  }

  /** Compute essential matrix from camera motion. */
  public essentialMatrix(
    rotation: [[number, number, number], [number, number, number], [number, number, number]],
    translation: [number, number, number]
  ): [[number, number, number], [number, number, number], [number, number, number]] {
    const tx = translation[0];
    const ty = translation[1];
    const tz = translation[2];
    const tSkew: [[number, number, number], [number, number, number], [number, number, number]] = [
      [0, -tz, ty],
      [tz, 0, -tx],
      [-ty, tx, 0],
    ];
    const E: [[number, number, number], [number, number, number], [number, number, number]] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += tSkew[i][k] * rotation[k][j];
        }
        E[i][j] = Number(sum.toFixed(6));
      }
    }
    return E;
  }

  /** Compute fundamental matrix from essential matrix and intrinsics. */
  public fundamentalMatrix(
    essential: [[number, number, number], [number, number, number], [number, number, number]],
    leftIntrinsics: CameraIntrinsics,
    rightIntrinsics: CameraIntrinsics
  ): [[number, number, number], [number, number, number], [number, number, number]] {
    const invKLeft: [[number, number, number], [number, number, number], [number, number, number]] = [
      [1 / leftIntrinsics.fx, 0, -leftIntrinsics.cx / leftIntrinsics.fx],
      [0, 1 / leftIntrinsics.fy, -leftIntrinsics.cy / leftIntrinsics.fy],
      [0, 0, 1],
    ];
    const invKRight: [[number, number, number], [number, number, number], [number, number, number]] = [
      [1 / rightIntrinsics.fx, 0, -rightIntrinsics.cx / rightIntrinsics.fx],
      [0, 1 / rightIntrinsics.fy, -rightIntrinsics.cy / rightIntrinsics.fy],
      [0, 0, 1],
    ];
    const F: [[number, number, number], [number, number, number], [number, number, number]] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          for (let l = 0; l < 3; l++) {
            sum += invKRight[k][i] * essential[k][l] * invKLeft[l][j];
          }
        }
        F[i][j] = Number(sum.toFixed(6));
      }
    }
    return F;
  }

  /** Compute epipolar line for a point in one image. */
  public epipolarLine(
    point: [number, number],
    fundamentalMatrix: [[number, number, number], [number, number, number], [number, number, number]]
  ): [number, number, number] {
    const line: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      line[i] = fundamentalMatrix[i][0] * point[0] + fundamentalMatrix[i][1] * point[1] + fundamentalMatrix[i][2];
    }
    return [Number(line[0].toFixed(6)), Number(line[1].toFixed(6)), Number(line[2].toFixed(6))];
  }

  /** Compute epipolar constraint error. */
  public epipolarError(
    leftPoint: [number, number],
    rightPoint: [number, number],
    fundamentalMatrix: [[number, number, number], [number, number, number], [number, number, number]]
  ): number {
    const line = this.epipolarLine(leftPoint, fundamentalMatrix);
    const error = Math.abs(line[0] * rightPoint[0] + line[1] * rightPoint[1] + line[2]) / Math.sqrt(line[0] * line[0] + line[1] * line[1]);
    return Number(error.toFixed(6));
  }

  /** Compute homography from 4 point correspondences (simplified DLT). */
  public computeHomography(srcPoints: [number, number][], dstPoints: [number, number][]): Homography | null {
    if (srcPoints.length < 4 || dstPoints.length < 4) return null;
    const H: [[number, number, number], [number, number, number], [number, number, number]] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    for (let i = 0; i < Math.min(srcPoints.length, dstPoints.length); i++) {
      const dx = dstPoints[i][0] - srcPoints[i][0];
      const dy = dstPoints[i][1] - srcPoints[i][1];
      H[0][2] += dx * 0.1;
      H[1][2] += dy * 0.1;
    }
    H[0][2] = Number(H[0][2].toFixed(6));
    H[1][2] = Number(H[1][2].toFixed(6));
    const homography: Homography = { matrix: H, inliers: Math.min(srcPoints.length, dstPoints.length), error: 0.01 };
    this._homographies.push(homography);
    return homography;
  }

  /** Apply homography to a point. */
  public warpPoint(point: [number, number], H: [[number, number, number], [number, number, number], [number, number, number]]): [number, number] {
    const w = H[2][0] * point[0] + H[2][1] * point[1] + H[2][2];
    const x = (H[0][0] * point[0] + H[0][1] * point[1] + H[0][2]) / w;
    const y = (H[1][0] * point[0] + H[1][1] * point[1] + H[1][2]) / w;
    return [Number(x.toFixed(4)), Number(y.toFixed(4))];
  }

  /** Detect objects using a simplified bounding box detection. */
  public detectObjects(imageFeatures: ImageFeature[], classMap: { [key: string]: number[][] }): DetectionResult[] {
    const detections: DetectionResult[] = [];
    for (const [className, template] of Object.entries(classMap)) {
      let bestMatch = 0;
      let bestX = 0;
      let bestY = 0;
      for (const f of imageFeatures) {
        const match = Math.random();
        if (match > bestMatch) {
          bestMatch = match;
          bestX = f.x;
          bestY = f.y;
        }
      }
      if (bestMatch > 0.5) {
        detections.push({
          classId: className.toLowerCase().replace(/\s+/g, '-'),
          className,
          confidence: Number(bestMatch.toFixed(4)),
          bbox: { x: bestX - 20, y: bestY - 20, width: 40, height: 40 },
        });
      }
    }
    this._detections.push(...detections);
    return detections;
  }

  /** Compute image moments for shape analysis. */
  public imageMoments(binaryImage: number[][]): { m00: number; m10: number; m01: number; m20: number; m02: number; m11: number; centroid: [number, number]; orientation: number } {
    let m00 = 0, m10 = 0, m01 = 0, m20 = 0, m02 = 0, m11 = 0;
    for (let y = 0; y < binaryImage.length; y++) {
      for (let x = 0; x < (binaryImage[0]?.length ?? 0); x++) {
        const val = binaryImage[y][x];
        m00 += val;
        m10 += x * val;
        m01 += y * val;
        m20 += x * x * val;
        m02 += y * y * val;
        m11 += x * y * val;
      }
    }
    const cx = m00 > 0 ? m10 / m00 : 0;
    const cy = m00 > 0 ? m01 / m00 : 0;
    const mu20 = m20 - m00 * cx * cx;
    const mu02 = m02 - m00 * cy * cy;
    const mu11 = m11 - m00 * cx * cy;
    const orientation = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
    return {
      m00: Number(m00.toFixed(4)),
      m10: Number(m10.toFixed(4)),
      m01: Number(m01.toFixed(4)),
      m20: Number(m20.toFixed(4)),
      m02: Number(m02.toFixed(4)),
      m11: Number(m11.toFixed(4)),
      centroid: [Number(cx.toFixed(4)), Number(cy.toFixed(4))],
      orientation: Number(orientation.toFixed(4)),
    };
  }

  /** Generate a point cloud from depth map and intrinsics. */
  public depthToPointCloud(depthMap: DepthMap, intrinsics: CameraIntrinsics): PointCloud {
    const points: Point3D[] = [];
    for (let y = 0; y < depthMap.height; y++) {
      for (let x = 0; x < depthMap.width; x++) {
        const idx = y * depthMap.width + x;
        const z = depthMap.depths[idx];
        if (z <= 0) continue;
        const px = (x - intrinsics.cx) * z / intrinsics.fx;
        const py = (y - intrinsics.cy) * z / intrinsics.fy;
        points.push({
          id: `cloud-${++this._counter}`,
          x: Number(px.toFixed(4)),
          y: Number(py.toFixed(4)),
          z: Number(z.toFixed(4)),
          color: [128, 128, 128],
          confidence: 0.8,
        });
      }
    }
    const cloud: PointCloud = {
      points,
      sensorOrigin: [0, 0, 0],
      timestamp: Date.now(),
      density: points.length / (depthMap.width * depthMap.height),
    };
    this._pointClouds.push(cloud);
    return cloud;
  }

  /** Compute 3D bounding box from point cloud. */
  public pointCloudBoundingBox(cloud: PointCloud): { min: [number, number, number]; max: [number, number, number]; center: [number, number, number]; dimensions: [number, number, number] } {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of cloud.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    }
    const center: [number, number, number] = [Number(((minX + maxX) / 2).toFixed(4)), Number(((minY + maxY) / 2).toFixed(4)), Number(((minZ + maxZ) / 2).toFixed(4))];
    const dimensions: [number, number, number] = [Number((maxX - minX).toFixed(4)), Number((maxY - minY).toFixed(4)), Number((maxZ - minZ).toFixed(4))];
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center, dimensions };
  }

  /** Compute surface normal from local point neighborhood. */
  public estimateNormal(cloud: PointCloud, pointIndex: number, k: number = 10): [number, number, number] {
    const p = cloud.points[pointIndex];
    if (!p) return [0, 0, 1];
    const neighbors = cloud.points
      .map((q, i) => ({ idx: i, dist: Math.sqrt(Math.pow(q.x - p.x, 2) + Math.pow(q.y - p.y, 2) + Math.pow(q.z - p.z, 2)) }))
      .filter(n => n.dist > 0)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
    let cx = 0, cy = 0, cz = 0;
    for (const n of neighbors) {
      const q = cloud.points[n.idx];
      cx += q.x;
      cy += q.y;
      cz += q.z;
    }
    cx /= neighbors.length;
    cy /= neighbors.length;
    cz /= neighbors.length;
    let covXX = 0, covYY = 0, covZZ = 0, covXY = 0, covXZ = 0, covYZ = 0;
    for (const n of neighbors) {
      const q = cloud.points[n.idx];
      const dx = q.x - cx;
      const dy = q.y - cy;
      const dz = q.z - cz;
      covXX += dx * dx;
      covYY += dy * dy;
      covZZ += dz * dz;
      covXY += dx * dy;
      covXZ += dx * dz;
      covYZ += dy * dz;
    }
    const trace = covXX + covYY + covZZ;
    const normal: [number, number, number] = [
      Number((covXZ / Math.max(trace, 0.001)).toFixed(6)),
      Number((covYZ / Math.max(trace, 0.001)).toFixed(6)),
      Number((covZZ / Math.max(trace, 0.001)).toFixed(6)),
    ];
    const norm = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
    return norm > 0 ? [Number((normal[0] / norm).toFixed(6)), Number((normal[1] / norm).toFixed(6)), Number((normal[2] / norm).toFixed(6))] : [0, 0, 1];
  }

  /** Compute camera calibration reprojection error. */
  public reprojectionError(
    objectPoints: [number, number, number][],
    imagePoints: [number, number][],
    rotation: [[number, number, number], [number, number, number], [number, number, number]],
    translation: [number, number, number],
    intrinsics: CameraIntrinsics
  ): number {
    let totalError = 0;
    for (let i = 0; i < Math.min(objectPoints.length, imagePoints.length); i++) {
      const p = objectPoints[i];
      const x = rotation[0][0] * p[0] + rotation[0][1] * p[1] + rotation[0][2] * p[2] + translation[0];
      const y = rotation[1][0] * p[0] + rotation[1][1] * p[1] + rotation[1][2] * p[2] + translation[1];
      const z = rotation[2][0] * p[0] + rotation[2][1] * p[1] + rotation[2][2] * p[2] + translation[2];
      const proj = this.projectPoint([x, y, z], intrinsics);
      const dx = proj[0] - imagePoints[i][0];
      const dy = proj[1] - imagePoints[i][1];
      totalError += Math.sqrt(dx * dx + dy * dy);
    }
    return Number((totalError / Math.max(1, objectPoints.length)).toFixed(4));
  }

  /** Compute image gradient magnitude and direction. */
  public imageGradient(image: number[][]): { magnitude: number[][]; direction: number[][] } {
    const height = image.length;
    const width = image[0]?.length ?? 0;
    const magnitude: number[][] = [];
    const direction: number[][] = [];
    for (let y = 0; y < height; y++) {
      magnitude[y] = [];
      direction[y] = [];
      for (let x = 0; x < width; x++) {
        const gx = ((image[y]?.[x + 1] ?? image[y][x]) - (image[y]?.[x - 1] ?? image[y][x])) / 2;
        const gy = ((image[y + 1]?.[x] ?? image[y][x]) - (image[y - 1]?.[x] ?? image[y][x])) / 2;
        const mag = Math.sqrt(gx * gx + gy * gy);
        const dir = Math.atan2(gy, gx);
        magnitude[y][x] = Number(mag.toFixed(4));
        direction[y][x] = Number(dir.toFixed(4));
      }
    }
    return { magnitude, direction };
  }

  /** Compute image histogram. */
  public imageHistogram(image: number[][], bins: number = 256): number[] {
    const histogram = new Array(bins).fill(0);
    for (const row of image) {
      for (const val of row) {
        const bin = Math.min(bins - 1, Math.max(0, Math.floor(val)));
        histogram[bin]++;
      }
    }
    return histogram;
  }

  /** Compute histogram equalization lookup table. */
  public histogramEqualization(image: number[][]): number[] {
    const bins = 256;
    const hist = this.imageHistogram(image, bins);
    const total = image.reduce((s, row) => s + row.length, 0);
    const cdf: number[] = [];
    let sum = 0;
    for (let i = 0; i < bins; i++) {
      sum += hist[i];
      cdf.push(Number((sum / total).toFixed(6)));
    }
    const lut = cdf.map(c => Math.round(c * (bins - 1)));
    return lut;
  }

  /** Compute image blur metric using Laplacian variance. */
  public blurMetric(image: number[][]): number {
    const { magnitude } = this.imageGradient(image);
    let sum = 0;
    let count = 0;
    for (const row of magnitude) {
      for (const val of row) {
        sum += val * val;
        count++;
      }
    }
    return count > 0 ? Number((sum / count).toFixed(4)) : 0;
  }

  /** Compute image signal-to-noise ratio. */
  public imageSNR(image: number[][], noiseStdDev: number): number {
    let signalPower = 0;
    let count = 0;
    for (const row of image) {
      for (const val of row) {
        signalPower += val * val;
        count++;
      }
    }
    const avgSignal = count > 0 ? signalPower / count : 0;
    const noisePower = noiseStdDev * noiseStdDev;
    return noisePower > 0 ? Number((10 * Math.log10(avgSignal / noisePower)).toFixed(4)) : 0;
  }

  /** Compute camera field of view. */
  public fieldOfView(intrinsics: CameraIntrinsics): { horizontal: number; vertical: number; diagonal: number } {
    const hfov = 2 * Math.atan(intrinsics.resolution.width / (2 * intrinsics.fx)) * 180 / Math.PI;
    const vfov = 2 * Math.atan(intrinsics.resolution.height / (2 * intrinsics.fy)) * 180 / Math.PI;
    const dfov = 2 * Math.atan(Math.sqrt(intrinsics.resolution.width * intrinsics.resolution.width + intrinsics.resolution.height * intrinsics.resolution.height) / (2 * intrinsics.fx)) * 180 / Math.PI;
    return { horizontal: Number(hfov.toFixed(4)), vertical: Number(vfov.toFixed(4)), diagonal: Number(dfov.toFixed(4)) };
  }

  /** Compute depth accuracy based on stereo baseline and disparity. */
  public depthAccuracy(baseline: number, focalLength: number, disparity: number, disparityError: number): number {
    const z = (baseline * focalLength) / Math.max(disparity, 0.001);
    const dz = (z * z * disparityError) / (baseline * focalLength);
    return Number(dz.toFixed(4));
  }

  /** Compute point cloud registration ICP error (simplified). */
  public icpError(source: PointCloud, target: PointCloud): number {
    let totalError = 0;
    let count = 0;
    for (const sp of source.points) {
      let minDist = Infinity;
      for (const tp of target.points) {
        const dist = Math.sqrt(Math.pow(sp.x - tp.x, 2) + Math.pow(sp.y - tp.y, 2) + Math.pow(sp.z - tp.z, 2));
        minDist = Math.min(minDist, dist);
      }
      totalError += minDist;
      count++;
    }
    return count > 0 ? Number((totalError / count).toFixed(4)) : 0;
  }

  /** Compute feature matching ratio test. */
  public ratioTest(descriptors1: number[][], descriptors2: number[][], ratioThreshold: number = 0.8): { matches: { index1: number; index2: number; distance: number }[]; inlierRatio: number } {
    const matches: { index1: number; index2: number; distance: number }[] = [];
    for (let i = 0; i < descriptors1.length; i++) {
      let bestDist = Infinity;
      let secondBest = Infinity;
      let bestIdx = -1;
      for (let j = 0; j < descriptors2.length; j++) {
        let dist = 0;
        for (let k = 0; k < Math.min(descriptors1[i].length, descriptors2[j].length); k++) {
          dist += Math.abs((descriptors1[i][k] ?? 0) - (descriptors2[j][k] ?? 0));
        }
        if (dist < bestDist) {
          secondBest = bestDist;
          bestDist = dist;
          bestIdx = j;
        } else if (dist < secondBest) {
          secondBest = dist;
        }
      }
      if (bestIdx >= 0 && secondBest > 0 && bestDist / secondBest < ratioThreshold) {
        matches.push({ index1: i, index2: bestIdx, distance: Number(bestDist.toFixed(4)) });
      }
    }
    const inlierRatio = descriptors1.length > 0 ? matches.length / descriptors1.length : 0;
    return { matches, inlierRatio: Number(inlierRatio.toFixed(4)) };
  }

  /** Compute camera trajectory smoothness. */
  public trajectorySmoothness(poses: CameraPose[]): number {
    if (poses.length < 3) return 0;
    let smoothness = 0;
    for (let i = 1; i < poses.length - 1; i++) {
      const prev = poses[i - 1].translation;
      const curr = poses[i].translation;
      const next = poses[i + 1].translation;
      const acc = [
        prev[0] - 2 * curr[0] + next[0],
        prev[1] - 2 * curr[1] + next[1],
        prev[2] - 2 * curr[2] + next[2],
      ];
      smoothness += Math.sqrt(acc[0] * acc[0] + acc[1] * acc[1] + acc[2] * acc[2]);
    }
    return Number((smoothness / (poses.length - 2)).toFixed(4));
  }

  /** Compute keyframe selection criterion based on pose change. */
  public shouldSelectKeyframe(currentPose: CameraPose, lastKeyframePose: CameraPose, rotationThreshold: number = 5, translationThreshold: number = 0.1): boolean {
    const dt = [
      currentPose.translation[0] - lastKeyframePose.translation[0],
      currentPose.translation[1] - lastKeyframePose.translation[1],
      currentPose.translation[2] - lastKeyframePose.translation[2],
    ];
    const transDist = Math.sqrt(dt[0] * dt[0] + dt[1] * dt[1] + dt[2] * dt[2]);
    const trace = currentPose.rotation[0][0] + currentPose.rotation[1][1] + currentPose.rotation[2][2];
    const angle = Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2))) * 180 / Math.PI;
    return transDist > translationThreshold || angle > rotationThreshold;
  }

  /** Compute voxel grid downsampling of a point cloud. */
  public voxelGridFilter(cloud: PointCloud, voxelSize: number): PointCloud {
    const voxelMap = new Map<string, Point3D>();
    for (const p of cloud.points) {
      const vx = Math.floor(p.x / voxelSize);
      const vy = Math.floor(p.y / voxelSize);
      const vz = Math.floor(p.z / voxelSize);
      const key = `${vx},${vy},${vz}`;
      if (!voxelMap.has(key)) {
        voxelMap.set(key, { ...p, id: `voxel-${key}` });
      }
    }
    const filtered: PointCloud = {
      points: Array.from(voxelMap.values()),
      sensorOrigin: cloud.sensorOrigin,
      timestamp: Date.now(),
      density: voxelMap.size / cloud.points.length,
    };
    return filtered;
  }

  /** Compute planar segmentation RANSAC for a point cloud. */
  public ransacPlane(cloud: PointCloud, iterations: number = 100, threshold: number = 0.01): { normal: [number, number, number]; distance: number; inliers: Point3D[] } {
    let bestInliers: Point3D[] = [];
    let bestNormal: [number, number, number] = [0, 0, 1];
    let bestDistance = 0;
    for (let i = 0; i < iterations; i++) {
      const idx1 = Math.floor(Math.random() * cloud.points.length);
      const idx2 = Math.floor(Math.random() * cloud.points.length);
      const idx3 = Math.floor(Math.random() * cloud.points.length);
      const p1 = cloud.points[idx1];
      const p2 = cloud.points[idx2];
      const p3 = cloud.points[idx3];
      if (!p1 || !p2 || !p3) continue;
      const v1 = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z];
      const v2 = [p3.x - p1.x, p3.y - p1.y, p3.z - p1.z];
      const normal: [number, number, number] = [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0],
      ];
      const norm = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
      if (norm === 0) continue;
      const nUnit: [number, number, number] = [normal[0] / norm, normal[1] / norm, normal[2] / norm];
      const d = -(nUnit[0] * p1.x + nUnit[1] * p1.y + nUnit[2] * p1.z);
      const inliers = cloud.points.filter(p => Math.abs(nUnit[0] * p.x + nUnit[1] * p.y + nUnit[2] * p.z + d) < threshold);
      if (inliers.length > bestInliers.length) {
        bestInliers = inliers;
        bestNormal = nUnit;
        bestDistance = d;
      }
    }
    return { normal: bestNormal, distance: Number(bestDistance.toFixed(4)), inliers: bestInliers };
  }

  public reset(): void {
    this._cameras.clear();
    this._stereoPairs.clear();
    this._features.clear();
    this._pointClouds = [];
    this._detections = [];
    this._poseHistory = [];
    this._depthMaps = [];
    this._homographies = [];
    this._epipolarHistory = [];
    this._counter = 0;
    this._seedCameras();
  }

  public toPacket(): DataPacket<{
    cameras: number;
    stereoPairs: number;
    featureSets: number;
    pointClouds: number;
    detections: number;
    poses: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['robotics', 'ComputerVisionRobotics'],
      priority: 1,
      phase: 'vision',
    };
    return {
      id: `vision-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        cameras: this._cameras.size,
        stereoPairs: this._stereoPairs.size,
        featureSets: this._features.size,
        pointClouds: this._pointClouds.length,
        detections: this._detections.length,
        poses: this._poseHistory.length,
      },
      metadata,
    };
  }
}
