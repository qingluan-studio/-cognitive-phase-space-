export interface InformationIntegration {
  phi: number;
  causeEffectStructure: number[][];
  partitions: number;
}

export interface ConsciousState {
  state: number[];
  phi: number;
  integratedInformation: number;
  complexity: number;
}

export class ConsciousnessModel {
  private _connectivity: number[][];
  private _nodeCount: number;
  private _currentState: number[];
  private _history: ConsciousState[];
  private _temperature: number;
  private _noiseLevel: number;

  constructor(nodeCount: number, temperature: number = 1.0) {
    this._nodeCount = nodeCount;
    this._temperature = temperature;
    this._connectivity = Array.from({ length: nodeCount }, () =>
      Array.from({ length: nodeCount }, () => Math.random() * 2 - 1)
    );
    this._currentState = Array.from({ length: nodeCount }, () => Math.random() < 0.5 ? 0 : 1);
    this._history = [];
    this._noiseLevel = 0.1;
  }

  get nodeCount(): number { return this._nodeCount; }
  get temperature(): number { return this._temperature; }
  get currentState(): number[] { return [...this._currentState]; }
  get history(): ConsciousState[] { return this._history; }

  public setTemperature(t: number): void {
    this._temperature = t;
  }

  public setNoiseLevel(n: number): void {
    this._noiseLevel = n;
  }

  public updateState(): void {
    const newState = new Array(this._nodeCount).fill(0);
    for (let i = 0; i < this._nodeCount; i++) {
      let input = 0;
      for (let j = 0; j < this._nodeCount; j++) {
        input += this._connectivity[i][j] * this._currentState[j];
      }
      input += (Math.random() - 0.5) * this._noiseLevel;
      const prob = 1 / (1 + Math.exp(-input / this._temperature));
      newState[i] = Math.random() < prob ? 1 : 0;
    }
    this._currentState = newState;
    this._recordState();
  }

  public run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.updateState();
    }
  }

  public computeEntropy(): number {
    const p1 = this._currentState.reduce((sum, s) => sum + s, 0) / this._nodeCount;
    const p0 = 1 - p1;
    if (p0 <= 0 || p1 <= 0) return 0;
    return -(p0 * Math.log2(p0) + p1 * Math.log2(p1));
  }

  public computeMutualInformation(): number {
    let mi = 0;
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = i + 1; j < this._nodeCount; j++) {
        const p11 = (this._currentState[i] && this._currentState[j]) ? 1 : 0;
        const p1i = this._currentState[i];
        const p1j = this._currentState[j];
        if (p11 > 0 && p1i > 0 && p1j > 0) {
          mi += p11 * Math.log2(p11 / (p1i * p1j));
        }
      }
    }
    return mi;
  }

  public computePhi(): number {
    const totalEntropy = this._computeSystemEntropy(this._currentState);
    let minPhi = Infinity;
    for (let i = 1; i < (1 << this._nodeCount) - 1; i++) {
      const partA: number[] = [];
      const partB: number[] = [];
      for (let j = 0; j < this._nodeCount; j++) {
        if (i & (1 << j)) partA.push(j);
        else partB.push(j);
      }
      if (partA.length === 0 || partB.length === 0) continue;
      const eA = this._computeSubsetEntropy(partA);
      const eB = this._computeSubsetEntropy(partB);
      const eTotal = this._computeSubsetEntropy([...partA, ...partB]);
      const phi = eTotal - (eA + eB);
      if (phi < minPhi) minPhi = phi;
    }
    return minPhi === Infinity ? 0 : minPhi;
  }

  private _computeSystemEntropy(state: number[]): number {
    const p1 = state.reduce((sum, s) => sum + s, 0) / state.length;
    const p0 = 1 - p1;
    if (p0 <= 0 || p1 <= 0) return 0;
    return -(p0 * Math.log2(p0) + p1 * Math.log2(p1));
  }

  private _computeSubsetEntropy(indices: number[]): number {
    const subset = indices.map(i => this._currentState[i]);
    return this._computeSystemEntropy(subset);
  }

  public computeComplexity(): number {
    const mi = this.computeMutualInformation();
    const entropy = this.computeEntropy();
    return entropy > 0 ? mi / entropy : 0;
  }

  public computeCausalDensity(): number {
    let density = 0;
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = 0; j < this._nodeCount; j++) {
        if (i !== j && Math.abs(this._connectivity[i][j]) > 0.3) {
          density++;
        }
      }
    }
    return density / (this._nodeCount * (this._nodeCount - 1));
  }

  public computeRecurrenceMatrix(): number[][] {
    const matrix: number[][] = Array.from({ length: this._nodeCount }, () => new Array(this._nodeCount).fill(0));
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = 0; j < this._nodeCount; j++) {
        matrix[i][j] = this._currentState[i] === this._currentState[j] ? 1 : 0;
      }
    }
    return matrix;
  }

  public computeSynchrony(): number {
    const active = this._currentState.filter(s => s === 1).length;
    const p = active / this._nodeCount;
    return p * (1 - p) * 4;
  }

  public perturbAndMeasure(nodeId: number): number {
    if (nodeId < 0 || nodeId >= this._nodeCount) return 0;
    const original = [...this._currentState];
    this._currentState[nodeId] = 1 - this._currentState[nodeId];
    this.updateState();
    const diff = original.reduce((sum, s, i) => sum + Math.abs(s - this._currentState[i]), 0);
    this._currentState = original;
    return diff / this._nodeCount;
  }

  public computeInformationIntegration(): InformationIntegration {
    const phi = this.computePhi();
    const ces = this.computeRecurrenceMatrix();
    let partitions = 0;
    for (let i = 1; i < (1 << this._nodeCount) - 1; i++) {
      partitions++;
    }
    return { phi, causeEffectStructure: ces, partitions };
  }

  public generateConsciousState(): ConsciousState {
    const phi = this.computePhi();
    const complexity = this.computeComplexity();
    const integrated = this.computeMutualInformation();
    return {
      state: [...this._currentState],
      phi,
      integratedInformation: integrated,
      complexity
    };
  }

  public simulateAnesthesia(reductionFactor: number = 0.5): void {
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = 0; j < this._nodeCount; j++) {
        this._connectivity[i][j] *= reductionFactor;
      }
    }
  }

  public recoverConnectivity(): void {
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = 0; j < this._nodeCount; j++) {
        this._connectivity[i][j] = Math.random() * 2 - 1;
      }
    }
  }

  private _recordState(): void {
    this._history.push(this.generateConsciousState());
    if (this._history.length > 500) this._history.shift();
  }

  public reset(): void {
    this._currentState = Array.from({ length: this._nodeCount }, () => Math.random() < 0.5 ? 0 : 1);
    this._history = [];
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = 0; j < this._nodeCount; j++) {
        this._connectivity[i][j] = Math.random() * 2 - 1;
      }
    }
  }

  public exportConnectivity(): number[][] {
    return this._connectivity.map(row => [...row]);
  }

  public exportHistory(): ConsciousState[] {
    return this._history.map(h => ({
      state: [...h.state],
      phi: h.phi,
      integratedInformation: h.integratedInformation,
      complexity: h.complexity
    }));
  }
}
