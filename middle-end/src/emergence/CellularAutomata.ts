export interface CellState {
  alive: boolean;
  age: number;
  energy: number;
}

export interface AutomataRule {
  name: string;
  birth: number[];
  survival: number[];
}

export class CellularAutomata {
  private _grid: CellState[][];
  private _rows: number;
  private _cols: number;
  private _rule: AutomataRule;
  private _history: CellState[][][];
  private _generation: number;
  private _toroidal: boolean;

  constructor(rows: number, cols: number, toroidal: boolean = true) {
    this._rows = rows;
    this._cols = cols;
    this._toroidal = toroidal;
    this._rule = { name: 'Conway', birth: [3], survival: [2, 3] };
    this._grid = [];
    this._history = [];
    this._generation = 0;
    for (let r = 0; r < rows; r++) {
      const row: CellState[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({ alive: false, age: 0, energy: 0 });
      }
      this._grid.push(row);
    }
  }

  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get generation(): number { return this._generation; }
  get toroidal(): boolean { return this._toroidal; }
  get currentGrid(): CellState[][] { return this._grid.map(row => row.map(cell => ({ ...cell }))); }

  public setRule(rule: AutomataRule): void {
    this._rule = rule;
  }

  public getRule(): AutomataRule {
    return { ...this._rule };
  }

  public randomize(density: number = 0.3): void {
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const alive = Math.random() < density;
        this._grid[r][c] = { alive, age: alive ? 1 : 0, energy: alive ? 1.0 : 0.0 };
      }
    }
  }

  public setCell(row: number, col: number, alive: boolean): void {
    if (row >= 0 && row < this._rows && col >= 0 && col < this._cols) {
      this._grid[row][col].alive = alive;
      this._grid[row][col].age = alive ? 1 : 0;
      this._grid[row][col].energy = alive ? 1.0 : 0.0;
    }
  }

  private _countNeighbors(r: number, c: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        let nr = r + dr;
        let nc = c + dc;
        if (this._toroidal) {
          nr = (nr + this._rows) % this._rows;
          nc = (nc + this._cols) % this._cols;
        }
        if (nr >= 0 && nr < this._rows && nc >= 0 && nc < this._cols) {
          if (this._grid[nr][nc].alive) count++;
        }
      }
    }
    return count;
  }

  public step(): void {
    const newGrid: CellState[][] = [];
    for (let r = 0; r < this._rows; r++) {
      const row: CellState[] = [];
      for (let c = 0; c < this._cols; c++) {
        const neighbors = this._countNeighbors(r, c);
        const current = this._grid[r][c];
        let alive = current.alive;
        let age = current.age;
        let energy = current.energy * 0.9;
        if (current.alive) {
          alive = this._rule.survival.includes(neighbors);
          if (alive) age++;
          else age = 0;
        } else {
          alive = this._rule.birth.includes(neighbors);
          if (alive) {
            age = 1;
            energy = 1.0;
          }
        }
        row.push({ alive, age, energy });
      }
      newGrid.push(row);
    }
    this._history.push(this._grid.map(row => row.map(cell => ({ ...cell }))));
    if (this._history.length > 100) this._history.shift();
    this._grid = newGrid;
    this._generation++;
  }

  public run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  public computeDensity(): number {
    let alive = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        if (this._grid[r][c].alive) alive++;
      }
    }
    return alive / (this._rows * this._cols);
  }

  public computeEntropy(): number {
    const freq = new Map<number, number>();
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const n = this._countNeighbors(r, c);
        freq.set(n, (freq.get(n) || 0) + 1);
      }
    }
    const total = this._rows * this._cols;
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public findOscillators(): number[][][] {
    const oscillators: number[][][] = [];
    for (let r = 1; r < this._rows - 1; r++) {
      for (let c = 1; c < this._cols - 1; c++) {
        if (this._grid[r][c].alive && this._countNeighbors(r, c) === 2) {
          const pattern = [[r, c], [r, c + 1], [r, c - 1]];
          oscillators.push(pattern);
        }
      }
    }
    return oscillators;
  }

  public applyRule30(): number[] {
    const width = this._cols;
    let row = new Array(width).fill(0);
    row[Math.floor(width / 2)] = 1;
    const result: number[] = [...row];
    for (let gen = 0; gen < this._rows - 1; gen++) {
      const newRow = new Array(width).fill(0);
      for (let i = 0; i < width; i++) {
        const left = row[(i - 1 + width) % width];
        const center = row[i];
        const right = row[(i + 1) % width];
        const pattern = (left << 2) | (center << 1) | right;
        newRow[i] = (30 >> pattern) & 1;
      }
      row = newRow;
      for (let i = 0; i < width; i++) {
        if (row[i]) result.push(1);
        else result.push(0);
      }
    }
    return result;
  }

  public computeCorrelationLength(): number {
    const centerR = Math.floor(this._rows / 2);
    const centerC = Math.floor(this._cols / 2);
    const centerVal = this._grid[centerR][centerC].alive ? 1 : 0;
    const correlations: number[] = [];
    const maxDist = Math.min(this._rows, this._cols) / 2;
    for (let d = 1; d < maxDist; d++) {
      let sum = 0;
      let count = 0;
      for (let r = 0; r < this._rows; r++) {
        for (let c = 0; c < this._cols; c++) {
          const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
          if (Math.abs(dist - d) < 0.5) {
            const val = this._grid[r][c].alive ? 1 : 0;
            sum += val * centerVal;
            count++;
          }
        }
      }
      correlations.push(count > 0 ? sum / count : 0);
    }
    for (let i = 0; i < correlations.length; i++) {
      if (correlations[i] < 0.1) return i;
    }
    return maxDist;
  }

  public computeLyapunovExponent(perturbationRadius: number = 3): number {
    const original = this.currentGrid;
    const perturbed = this.currentGrid;
    const pr = Math.floor(this._rows / 2);
    const pc = Math.floor(this._cols / 2);
    for (let r = pr - perturbationRadius; r <= pr + perturbationRadius; r++) {
      for (let c = pc - perturbationRadius; c <= pc + perturbationRadius; c++) {
        if (r >= 0 && r < this._rows && c >= 0 && c < this._cols) {
          perturbed[r][c].alive = !perturbed[r][c].alive;
        }
      }
    }
    let divergence = 0;
    const steps = 10;
    for (let s = 0; s < steps; s++) {
      this._grid = original.map(row => row.map(cell => ({ ...cell })));
      this.step();
      const origNext = this.currentGrid;
      this._grid = perturbed.map(row => row.map(cell => ({ ...cell })));
      this.step();
      const pertNext = this.currentGrid;
      let diff = 0;
      for (let r = 0; r < this._rows; r++) {
        for (let c = 0; c < this._cols; c++) {
          if (origNext[r][c].alive !== pertNext[r][c].alive) diff++;
        }
      }
      divergence += diff;
    }
    this._grid = original;
    return divergence / (steps * this._rows * this._cols);
  }

  public exportPattern(): string {
    let pattern = '';
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        pattern += this._grid[r][c].alive ? 'O' : '.';
      }
      pattern += '\n';
    }
    return pattern;
  }

  public reset(): void {
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        this._grid[r][c] = { alive: false, age: 0, energy: 0 };
      }
    }
    this._history = [];
    this._generation = 0;
  }
}
