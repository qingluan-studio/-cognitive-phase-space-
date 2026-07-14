export interface DataFace {
  id: string;
  content: number;
  orientation: number;
  visible: boolean;
}

export type FoldTransform = {
  axisAngle: number;
  foldAngle: number;
  layerOrder: number[];
};

export interface OrigamiConfig {
  faceCount: number;
  defaultOrientation: number;
  foldResolution: number;
}

export class OrigamiData {
  private _config: OrigamiConfig;
  private _faces: DataFace[] = [];
  private _transform: FoldTransform | null = null;
  private _state: Record<string, unknown> = {};
  private _rotationMatrix: number[][] = [[1, 0], [0, 1]];
  private _faceAdjacency: Map<string, Set<string>> = new Map();
  private _dihedralAngles: Map<string, number> = new Map();

  constructor(config: OrigamiConfig) {
    this._config = config;
    this._initFaces();
  }

  get faceCount(): number {
    return this._faces.length;
  }

  get visibleFaces(): number {
    return this._faces.filter((f) => f.visible).length;
  }

  private _initFaces(): void {
    this._faces = [];
    for (let i = 0; i < this._config.faceCount; i++) {
      this._faces.push({
        id: `face-${i}`,
        content: i,
        orientation: this._config.defaultOrientation,
        visible: true,
      });
    }
  }

  private _rotation(theta: number): void {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    this._rotationMatrix = [[cos, -sin], [sin, cos]];
  }

  private _updateAdjacency(): void {
    this._faceAdjacency.clear();
    for (let i = 0; i < this._faces.length; i++) {
      const neighbors = new Set<string>();
      if (i > 0) neighbors.add(this._faces[i - 1].id);
      if (i < this._faces.length - 1) neighbors.add(this._faces[i + 1].id);
      this._faceAdjacency.set(this._faces[i].id, neighbors);
    }
  }

  addFace(id: string, content: number): DataFace {
    const face: DataFace = { id, content, orientation: this._config.defaultOrientation, visible: true };
    this._faces.push(face);
    if (this._faces.length > this._config.faceCount * 2) {
      this._faces.shift();
    }
    this._updateAdjacency();
    return face;
  }

  fold(axisAngle: number, foldAngle: number): FoldTransform {
    this._rotation(foldAngle);
    for (const face of this._faces) {
      const x = face.content;
      const y = face.orientation;
      const nx = this._rotationMatrix[0][0] * x + this._rotationMatrix[0][1] * y;
      const ny = this._rotationMatrix[1][0] * x + this._rotationMatrix[1][1] * y;
      face.orientation = Math.atan2(ny, nx);
      face.visible = Math.abs(foldAngle) < Math.PI / 2;
      const key = `${face.id}-axis`;
      this._dihedralAngles.set(key, Math.abs(foldAngle - axisAngle));
    }
    this._transform = {
      axisAngle,
      foldAngle,
      layerOrder: this._faces.filter((f) => f.visible).map((f) => parseInt(f.id.split('-')[1]) || 0),
    };
    this._state.lastFold = { axisAngle, foldAngle };
    return this._transform;
  }

  unfold(): void {
    for (const face of this._faces) {
      face.orientation = this._config.defaultOrientation;
      face.visible = true;
    }
    this._transform = null;
    this._rotationMatrix = [[1, 0], [0, 1]];
    this._state.unfoldedAt = Date.now();
  }

  findFace(id: string): DataFace | null {
    return this._faces.find((f) => f.id === id) ?? null;
  }

  visibleContent(): number[] {
    return this._faces.filter((f) => f.visible).map((f) => f.content);
  }

  isFlat(): boolean {
    return this._faces.every((f) => Math.abs(f.orientation - this._config.defaultOrientation) < 0.01);
  }

  computeDihedralEntropy(): number {
    const values = Array.from(this._dihedralAngles.values());
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
    return 0.5 * Math.log(2 * Math.PI * Math.E * (variance + 0.001));
  }

  reset(): void {
    this._initFaces();
    this._transform = null;
    this._dihedralAngles.clear();
    this._faceAdjacency.clear();
    this._rotationMatrix = [[1, 0], [0, 1]];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      faces: this._faces.length,
      visible: this.visibleFaces,
      transform: this._transform,
      state: this._state,
      dihedralEntropy: this.computeDihedralEntropy().toFixed(4),
    };
  }
}
