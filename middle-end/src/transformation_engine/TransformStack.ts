import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface Transform {
  type: string;
  matrix: number[][];
  parameters: Record<string, number>;
  name: string;
}

export interface TransformStack {
  transforms: Transform[];
  currentMatrix: number[][];
  mode: 'model' | 'view' | 'projection';
}

export interface StackFrame {
  transforms: Transform[];
  matrix: number[][];
}

export class TransformStack {
  private _stacks: Map<string, TransformStack> = new Map();
  private _frames: StackFrame[] = [];
  private _currentMode: 'model' | 'view' | 'projection' = 'model';
  private _history: unknown[] = [];

  push(type: string, parameters: Record<string, number>): void {
    let matrix: number[][] = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

    switch (type) {
      case 'translate':
        matrix = [
          [1, 0, 0, parameters.x || 0],
          [0, 1, 0, parameters.y || 0],
          [0, 0, 1, parameters.z || 0],
          [0, 0, 0, 1],
        ];
        break;
      case 'rotate':
        const theta = (parameters.angle || 0) * Math.PI / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const axis = parameters.axis || 'z';
        if (axis === 'x') {
          matrix = [[1, 0, 0, 0], [0, cos, -sin, 0], [0, sin, cos, 0], [0, 0, 0, 1]];
        } else if (axis === 'y') {
          matrix = [[cos, 0, sin, 0], [0, 1, 0, 0], [-sin, 0, cos, 0], [0, 0, 0, 1]];
        } else {
          matrix = [[cos, -sin, 0, 0], [sin, cos, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
        }
        break;
      case 'scale':
        matrix = [
          [parameters.x || 1, 0, 0, 0],
          [0, parameters.y || 1, 0, 0],
          [0, 0, parameters.z || 1, 0],
          [0, 0, 0, 1],
        ];
        break;
    }

    const transform: Transform = { type, matrix, parameters, name: `${type}-${Date.now()}` };
    const stack = this._stacks.get(this._currentMode) || { transforms: [], currentMatrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], mode: this._currentMode };
    stack.transforms.push(transform);
    stack.currentMatrix = this._multiply(stack.currentMatrix, matrix);
    this._stacks.set(this._currentMode, stack);
    this._history.push({ type: 'push', transform, mode: this._currentMode });
  }

  pop(): Transform | undefined {
    const stack = this._stacks.get(this._currentMode);
    if (!stack || stack.transforms.length === 0) return undefined;

    const popped = stack.transforms.pop()!;
    if (stack.transforms.length === 0) {
      stack.currentMatrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    } else {
      stack.currentMatrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      for (const t of stack.transforms) {
        stack.currentMatrix = this._multiply(stack.currentMatrix, t.matrix);
      }
    }
    this._stacks.set(this._currentMode, stack);
    this._history.push({ type: 'pop', transform: popped, mode: this._currentMode });
    return popped;
  }

  clear(): void {
    const stack = this._stacks.get(this._currentMode);
    if (stack) {
      stack.transforms = [];
      stack.currentMatrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      this._stacks.set(this._currentMode, stack);
    }
    this._history.push({ type: 'clear', mode: this._currentMode });
  }

  modelMatrix(object: unknown): number[][] {
    this._currentMode = 'model';
    const stack = this._stacks.get('model');
    this._history.push({ type: 'modelMatrix', object, result: stack?.currentMatrix });
    return stack?.currentMatrix || [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  }

  viewMatrix(camera: { position: Point; target: Point; up: Vector }): number[][] {
    this._currentMode = 'view';
    const forward: Vector = {
      dx: camera.target.x - camera.position.x,
      dy: camera.target.y - camera.position.y,
      dz: camera.target.z - camera.position.z,
    };
    const len = Math.sqrt(forward.dx ** 2 + forward.dy ** 2 + forward.dz ** 2);
    const f = { dx: forward.dx / len, dy: forward.dy / len, dz: forward.dz / len };

    const right: Vector = {
      dx: f.dy * camera.up.dz - f.dz * camera.up.dy,
      dy: f.dz * camera.up.dx - f.dx * camera.up.dz,
      dz: f.dx * camera.up.dy - f.dy * camera.up.dx,
    };
    const rLen = Math.sqrt(right.dx ** 2 + right.dy ** 2 + right.dz ** 2);
    const r = { dx: right.dx / rLen, dy: right.dy / rLen, dz: right.dz / rLen };

    const newUp: Vector = {
      dx: r.dy * f.dz - r.dz * f.dy,
      dy: r.dz * f.dx - r.dx * f.dz,
      dz: r.dx * f.dy - r.dy * f.dx,
    };

    const matrix: number[][] = [
      [r.dx, r.dy, r.dz, -r.dx * camera.position.x - r.dy * camera.position.y - r.dz * camera.position.z],
      [newUp.dx, newUp.dy, newUp.dz, -newUp.dx * camera.position.x - newUp.dy * camera.position.y - newUp.dz * camera.position.z],
      [-f.dx, -f.dy, -f.dz, f.dx * camera.position.x + f.dy * camera.position.y + f.dz * camera.position.z],
      [0, 0, 0, 1],
    ];

    const stack = this._stacks.get('view') || { transforms: [], currentMatrix: matrix, mode: 'view' };
    stack.currentMatrix = matrix;
    this._stacks.set('view', stack);
    this._history.push({ type: 'viewMatrix', camera, result: matrix });
    return matrix;
  }

  projectionMatrix(frustum: { fov: number; aspect: number; near: number; far: number }): number[][] {
    this._currentMode = 'projection';
    const f = 1 / Math.tan(frustum.fov * Math.PI / 180 / 2);
    const matrix: number[][] = [
      [f / frustum.aspect, 0, 0, 0],
      [0, f, 0, 0],
      [0, 0, (frustum.far + frustum.near) / (frustum.near - frustum.far), 2 * frustum.far * frustum.near / (frustum.near - frustum.far)],
      [0, 0, -1, 0],
    ];

    const stack = this._stacks.get('projection') || { transforms: [], currentMatrix: matrix, mode: 'projection' };
    stack.currentMatrix = matrix;
    this._stacks.set('projection', stack);
    this._history.push({ type: 'projectionMatrix', frustum, result: matrix });
    return matrix;
  }

  MVP(): number[][] {
    const model = this._stacks.get('model')?.currentMatrix || [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    const view = this._stacks.get('view')?.currentMatrix || [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    const projection = this._stacks.get('projection')?.currentMatrix || [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

    const mv = this._multiply(model, view);
    const mvp = this._multiply(mv, projection);
    this._history.push({ type: 'MVP', result: mvp });
    return mvp;
  }

  saveFrame(): void {
    const stack = this._stacks.get(this._currentMode);
    if (stack) {
      const frame: StackFrame = {
        transforms: [...stack.transforms],
        matrix: stack.currentMatrix.map(row => [...row]),
      };
      this._frames.push(frame);
      this._history.push({ type: 'saveFrame', mode: this._currentMode });
    }
  }

  restoreFrame(): void {
    const frame = this._frames.pop();
    if (frame && this._stacks.has(this._currentMode)) {
      const stack = this._stacks.get(this._currentMode)!;
      stack.transforms = frame.transforms;
      stack.currentMatrix = frame.matrix;
      this._stacks.set(this._currentMode, stack);
      this._history.push({ type: 'restoreFrame', mode: this._currentMode });
    }
  }

  get getCurrentMatrix(): number[][] {
    return this._stacks.get(this._currentMode)?.currentMatrix || [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  }

  private _multiply(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  toPacket(): DataPacket<{
    stacks: Map<string, TransformStack>;
    frames: StackFrame[];
    currentMode: 'model' | 'view' | 'projection';
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['transformation_engine', 'TransformStack'],
      priority: 1,
      phase: 'transform_stack',
    };
    return {
      id: `transform-stack-${Date.now().toString(36)}`,
      payload: {
        stacks: this._stacks,
        frames: this._frames,
        currentMode: this._currentMode,
      },
      metadata,
    };
  }

  reset(): void {
    this._stacks = new Map();
    this._frames = [];
    this._currentMode = 'model';
    this._history = [];
  }
}
