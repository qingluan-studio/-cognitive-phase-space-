export interface TesseractVertex {
  id: number;
  coordinates: number[];
  projected: number[];
}

export interface FoldOperation {
  axis: number[];
  angle: number;
  sequence: number;
}

export class TesseractFold {
  private _vertices: TesseractVertex[] = [];
  private _operations: FoldOperation[] = [];
  private _rotationMatrix: number[][] = [];
  private _sequenceCounter: number = 0;
  private _hypervolumeCache: number = 0;
  private _stereographicRadius: number = 1;

  constructor() {
    this._buildTesseract();
  }

  get vertexCount(): number {
    return this._vertices.length;
  }

  get operationCount(): number {
    return this._operations.length;
  }

  private _buildTesseract(): void {
    this._vertices = [];
    for (let i = 0; i < 16; i++) {
      const x = i & 1 ? 1 : -1;
      const y = i & 2 ? 1 : -1;
      const z = i & 4 ? 1 : -1;
      const w = i & 8 ? 1 : -1;
      this._vertices.push({
        id: i,
        coordinates: [x, y, z, w],
        projected: [x, y, z],
      });
    }
    this._hypervolumeCache = this._computeHypervolume();
  }

  private _computeHypervolume(): number {
    const edge = 2;
    return edge * edge * edge * edge;
  }

  fold(axis: number[], angle: number): FoldOperation {
    const normalized = this._normalize(axis);
    const operation: FoldOperation = {
      axis: normalized,
      angle,
      sequence: this._sequenceCounter++,
    };
    this._operations.push(operation);
    this._applyRotation(normalized, angle);
    return operation;
  }

  private _normalize(v: number[]): number[] {
    const mag = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    return mag > 0 ? v.map(c => c / mag) : v;
  }

  private _applyRotation(axis: number[], angle: number): void {
    const q = this._axisAngleToQuaternion(axis, angle);
    for (const vertex of this._vertices) {
      const rotated = this._quaternionRotate(vertex.coordinates, q);
      vertex.coordinates = rotated;
      vertex.projected = this._stereographicProject(rotated);
    }
  }

  private _axisAngleToQuaternion(axis: number[], angle: number): number[] {
    const half = angle / 2;
    const s = Math.sin(half);
    return [Math.cos(half), axis[0] * s, axis[1] * s, axis[2] * s];
  }

  private _quaternionRotate(v: number[], q: number[]): number[] {
    if (v.length < 3) return v;
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const qw = q[0];
    const qx = q[1];
    const qy = q[2];
    const qz = q[3];
    const rx = x * (1 - 2 * qy * qy - 2 * qz * qz) + y * (2 * qx * qy - 2 * qz * qw) + z * (2 * qx * qz + 2 * qy * qw);
    const ry = x * (2 * qx * qy + 2 * qz * qw) + y * (1 - 2 * qx * qx - 2 * qz * qz) + z * (2 * qy * qz - 2 * qx * qw);
    const rz = x * (2 * qx * qz - 2 * qy * qw) + y * (2 * qy * qz + 2 * qx * qw) + z * (1 - 2 * qx * qx - 2 * qy * qy);
    return [rx, ry, rz, v[3] ?? 0];
  }

  private _stereographicProject(v4: number[]): number[] {
    const w = v4[3] ?? 0;
    const denom = this._stereographicRadius - w + 0.001;
    return [v4[0] / denom, v4[1] / denom, v4[2] / denom];
  }

  getVertex(id: number): TesseractVertex | null {
    return this._vertices.find(v => v.id === id) ?? null;
  }

  getEdgeLength(): number {
    if (this._vertices.length < 2) return 0;
    const a = this._vertices[0].coordinates;
    const b = this._vertices[1].coordinates;
    return Math.sqrt(a.reduce((sum, c, i) => sum + (c - b[i]) ** 2, 0));
  }

  getHypervolume(): number {
    return this._hypervolumeCache;
  }

  projectTo3D(): number[][] {
    return this._vertices.map(v => [...v.projected]);
  }

  unfold(): void {
    this._operations = [];
    this._sequenceCounter = 0;
    this._buildTesseract();
  }

  getOperationHistory(): FoldOperation[] {
    return [...this._operations];
  }

  computeHypersphereVolume(radius: number): number {
    return 0.5 * Math.PI * Math.PI * Math.pow(radius, 4);
  }

  computeHypersphereSurfaceArea(radius: number): number {
    return 2 * Math.PI * Math.PI * Math.pow(radius, 3);
  }

  setStereographicRadius(r: number): void {
    this._stereographicRadius = Math.max(0.1, r);
    for (const vertex of this._vertices) {
      vertex.projected = this._stereographicProject(vertex.coordinates);
    }
  }

  computeDistanceIn4D(a: number, b: number): number {
    const va = this._vertices.find(v => v.id === a);
    const vb = this._vertices.find(v => v.id === b);
    if (!va || !vb) return 0;
    return Math.sqrt(va.coordinates.reduce((sum, c, i) => sum + (c - vb.coordinates[i]) ** 2, 0));
  }

  getRotationMatrix(): number[][] {
    return this._rotationMatrix;
  }

  computeTesseractDiagonal(): number {
    return Math.sqrt(4 + 4 + 4 + 4);
  }
}
