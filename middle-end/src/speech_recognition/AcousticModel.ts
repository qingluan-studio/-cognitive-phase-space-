import { DataPacket } from '../shared/types';

export interface HMMState {
  id: number;
  name: string;
  isEmitting: boolean;
  transitionProb: Map<number, number>;
  gmmIndex: number;
}

export interface GaussianComponent {
  mean: number[];
  variance: number[];
  weight: number;
  dim: number;
}

export interface GMM {
  id: number;
  components: GaussianComponent[];
  numComponents: number;
  dim: number;
}

export interface HMMGMMModel {
  states: HMMState[];
  gmms: GMM[];
  startState: number;
  endState: number;
  phone: string;
}

export interface DNNLayer {
  name: string;
  type: 'dense' | 'lstm' | 'cnn' | 'activation' | 'dropout' | 'batchnorm';
  inputDim: number;
  outputDim: number;
  weights: number[][];
  bias: number[];
  activation: string;
  dropoutRate: number;
}

export interface DNNHMMModel {
  dnn: DNNLayer[];
  hmmStates: HMMState[];
  inputDim: number;
  outputDim: number;
  hiddenLayers: number;
}

export interface E2EModel {
  type: 'transformer' | 'conformer' | 'rnn-transducer';
  encoderLayers: number;
  decoderLayers: number;
  hiddenDim: number;
  numHeads: number;
  vocabSize: number;
  subSampling: number;
}

export interface AcousticScoring {
  frameIndex: number;
  stateScores: Map<string, number>;
  phoneScores: Map<string, number>;
  bestState: string;
  bestPhone: string;
  likelihood: number;
}

export interface AlignmentResult {
  frameIndices: number[];
  stateSequence: string[];
  phoneSequence: string[];
  wordSequence: string[];
  totalLikelihood: number;
  frameLikelihoods: number[];
}

export interface AcousticResult {
  modelType: string;
  scores: AcousticScoring[];
  alignment: AlignmentResult | null;
  frameCount: number;
  featureDim: number;
  numStates: number;
  numPhones: number;
  isE2E: boolean;
  latency: number;
}

export class AcousticModel {
  private _modelType: string = 'hmm-gmm';
  private _featureDim: number = 39;
  private _numPhones: number = 40;
  private _numStates: number = 0;
  private _hmmGmmModels: Map<string, HMMGMMModel> = new Map();
  private _dnnHmmModel: DNNHMMModel | null = null;
  private _e2eModel: E2EModel | null = null;
  private _scores: AcousticScoring[] = [];
  private _alignment: AlignmentResult | null = null;
  private _isTrained: boolean = false;
  private _smoothingFactor: number = 0.0001;
  private _beamWidth: number = 100;
  private _counter: number = 0;
  private _lastResult: AcousticResult | null = null;
  private _latency: number = 0;
  private _phoneSet: string[] = [];

  constructor() {
    this._initDefaultPhoneSet();
    this._initDefaultHMMGMM();
  }

  private _initDefaultPhoneSet(): void {
    this._phoneSet = [
      'aa', 'ae', 'ah', 'ao', 'aw', 'ay', 'b', 'ch', 'd', 'dh',
      'eh', 'er', 'ey', 'f', 'g', 'hh', 'ih', 'iy', 'jh', 'k',
      'l', 'm', 'n', 'ng', 'ow', 'oy', 'p', 'r', 's', 'sh',
      't', 'th', 'uh', 'uw', 'v', 'w', 'y', 'z', 'zh', 'sil'
    ];
    this._numPhones = this._phoneSet.length;
  }

  private _initDefaultHMMGMM(): void {
    for (const phone of this._phoneSet) {
      const states: HMMState[] = [];
      const gmms: GMM[] = [];
      for (let i = 0; i < 3; i++) {
        const transProb = new Map<number, number>();
        transProb.set(i, 0.6);
        transProb.set(i + 1, 0.4);
        states.push({
          id: i,
          name: `${phone}_s${i}`,
          isEmitting: true,
          transitionProb: transProb,
          gmmIndex: i
        });
        const components: GaussianComponent[] = [];
        for (let c = 0; c < 8; c++) {
          components.push({
            mean: new Array(this._featureDim).fill(0),
            variance: new Array(this._featureDim).fill(1),
            weight: 1 / 8,
            dim: this._featureDim
          });
        }
        gmms.push({
          id: i,
          components,
          numComponents: 8,
          dim: this._featureDim
        });
      }
      const endState: HMMState = {
        id: 3,
        name: `${phone}_end`,
        isEmitting: false,
        transitionProb: new Map(),
        gmmIndex: -1
      };
      states.push(endState);
      states[2].transitionProb.set(3, 0.4);
      this._hmmGmmModels.set(phone, {
        states,
        gmms,
        startState: 0,
        endState: 3,
        phone
      });
      this._numStates += states.length;
    }
  }

  get modelType(): string {
    return this._modelType;
  }

  get featureDim(): number {
    return this._featureDim;
  }

  get numPhones(): number {
    return this._numPhones;
  }

  get numStates(): number {
    return this._numStates;
  }

  get scores(): AcousticScoring[] {
    return this._scores;
  }

  get alignment(): AlignmentResult | null {
    return this._alignment;
  }

  get isTrained(): boolean {
    return this._isTrained;
  }

  get phoneSet(): string[] {
    return [...this._phoneSet];
  }

  get beamWidth(): number {
    return this._beamWidth;
  }

  get latency(): number {
    return this._latency;
  }

  setModelType(type: string): void {
    const validTypes = ['hmm-gmm', 'dnn-hmm', 'e2e-transformer', 'e2e-conformer', 'e2e-rnn-t'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid model type: ${type}`);
    }
    this._modelType = type;
  }

  setFeatureDim(dim: number): void {
    this._featureDim = dim;
  }

  setBeamWidth(width: number): void {
    this._beamWidth = width;
  }

  setSmoothingFactor(factor: number): void {
    this._smoothingFactor = factor;
  }

  setPhoneSet(phones: string[]): void {
    this._phoneSet = [...phones];
    this._numPhones = phones.length;
  }

  gaussianPdf(x: number[], mean: number[], variance: number[], dim: number): number {
    let logProb = -dim * 0.5 * Math.log(2 * Math.PI);
    for (let i = 0; i < dim; i++) {
      const diff = x[i] - mean[i];
      const var_i = Math.max(variance[i], 1e-10);
      logProb -= 0.5 * Math.log(var_i);
      logProb -= 0.5 * (diff * diff) / var_i;
    }
    return logProb;
  }

  gmmScore(x: number[], gmm: GMM): number {
    const logWeights: number[] = [];
    let maxLogWeight = -Infinity;
    for (const comp of gmm.components) {
      const logLik = this.gaussianPdf(x, comp.mean, comp.variance, gmm.dim);
      const logW = Math.log(Math.max(comp.weight, 1e-10)) + logLik;
      logWeights.push(logW);
      if (logW > maxLogWeight) {
        maxLogWeight = logW;
      }
    }
    let sumExp = 0;
    for (const lw of logWeights) {
      sumExp += Math.exp(lw - maxLogWeight);
    }
    return maxLogWeight + Math.log(sumExp);
  }

  stateScore(feature: number[], phone: string, stateIndex: number): number {
    const model = this._hmmGmmModels.get(phone);
    if (!model || stateIndex < 0 || stateIndex >= model.gmms.length) {
      return -Infinity;
    }
    const gmm = model.gmms[stateIndex];
    return this.gmmScore(feature, gmm);
  }

  phoneScore(feature: number[], phone: string): number {
    const model = this._hmmGmmModels.get(phone);
    if (!model) {
      return -Infinity;
    }
    let maxScore = -Infinity;
    for (const gmm of model.gmms) {
      const score = this.gmmScore(feature, gmm);
      if (score > maxScore) {
        maxScore = score;
      }
    }
    return maxScore;
  }

  computeAllScores(features: number[][]): AcousticScoring[] {
    const scores: AcousticScoring[] = [];
    for (let f = 0; f < features.length; f++) {
      const stateScores = new Map<string, number>();
      const phoneScores = new Map<string, number>();
      let bestState = '';
      let bestPhone = '';
      let maxStateScore = -Infinity;
      let maxPhoneScore = -Infinity;
      for (const phone of this._phoneSet) {
        const pScore = this.phoneScore(features[f], phone);
        phoneScores.set(phone, pScore);
        if (pScore > maxPhoneScore) {
          maxPhoneScore = pScore;
          bestPhone = phone;
        }
        const model = this._hmmGmmModels.get(phone);
        if (model) {
          for (let s = 0; s < model.states.length - 1; s++) {
            const sName = model.states[s].name;
            const sScore = this.stateScore(features[f], phone, s);
            stateScores.set(sName, sScore);
            if (sScore > maxStateScore) {
              maxStateScore = sScore;
              bestState = sName;
            }
          }
        }
      }
      scores.push({
        frameIndex: f,
        stateScores,
        phoneScores,
        bestState,
        bestPhone,
        likelihood: maxStateScore
      });
    }
    return scores;
  }

  viterbiAlignment(features: number[][], phoneSequence: string[]): AlignmentResult {
    const T = features.length;
    const N = phoneSequence.length;
    const stateCountPerPhone = 3;
    const totalStates = N * stateCountPerPhone;
    const trellis = new Array(T);
    const backptr = new Array(T);
    for (let t = 0; t < T; t++) {
      trellis[t] = new Array(totalStates).fill(-Infinity);
      backptr[t] = new Array(totalStates).fill(-1);
    }
    let stateIdx = 0;
    for (let p = 0; p < N; p++) {
      for (let s = 0; s < stateCountPerPhone; s++) {
        const score = this.stateScore(features[0], phoneSequence[p], s);
        if (p === 0 && s === 0) {
          trellis[0][stateIdx] = score;
        }
        stateIdx++;
      }
    }
    for (let t = 1; t < T; t++) {
      let curState = 0;
      for (let p = 0; p < N; p++) {
        for (let s = 0; s < stateCountPerPhone; s++) {
          const emitScore = this.stateScore(features[t], phoneSequence[p], s);
          let bestPrev = -Infinity;
          let bestPrevIdx = -1;
          for (let pp = 0; pp < N; pp++) {
            for (let ps = 0; ps < stateCountPerPhone; ps++) {
              const prevIdx = pp * stateCountPerPhone + ps;
              let transProb = 0;
              if (pp === p && ps === s) {
                transProb = Math.log(0.6);
              } else if (pp === p && ps === s - 1) {
                transProb = Math.log(0.4);
              } else if (pp === p - 1 && s === 0 && ps === stateCountPerPhone - 1) {
                transProb = Math.log(1.0);
              } else {
                continue;
              }
              const total = trellis[t - 1][prevIdx] + transProb;
              if (total > bestPrev) {
                bestPrev = total;
                bestPrevIdx = prevIdx;
              }
            }
          }
          trellis[t][curState] = bestPrev + emitScore;
          backptr[t][curState] = bestPrevIdx;
          curState++;
        }
      }
    }
    let lastState = -1;
    let lastScore = -Infinity;
    for (let s = 0; s < totalStates; s++) {
      if (trellis[T - 1][s] > lastScore) {
        lastScore = trellis[T - 1][s];
        lastState = s;
      }
    }
    const stateSeq = new Array(T).fill('');
    const phoneSeq = new Array(T).fill('');
    const frameLiks = new Array(T).fill(0);
    let curState = lastState;
    for (let t = T - 1; t >= 0; t--) {
      const phoneIdx = Math.floor(curState / stateCountPerPhone);
      const stateInPhone = curState % stateCountPerPhone;
      stateSeq[t] = `${phoneSequence[phoneIdx]}_s${stateInPhone}`;
      phoneSeq[t] = phoneSequence[phoneIdx];
      frameLiks[t] = trellis[t][curState];
      curState = backptr[t][curState];
    }
    const wordSeq: string[] = [];
    const frameIndices: number[] = [];
    for (let t = 0; t < T; t++) {
      frameIndices.push(t);
    }
    return {
      frameIndices,
      stateSequence: stateSeq,
      phoneSequence: phoneSeq,
      wordSequence: wordSeq,
      totalLikelihood: lastScore,
      frameLikelihoods: frameLiks
    };
  }

  forwardAlgorithm(features: number[][], phone: string): number {
    const model = this._hmmGmmModels.get(phone);
    if (!model) {
      return -Infinity;
    }
    const T = features.length;
    const N = model.states.length;
    const alpha = new Array(T);
    for (let t = 0; t < T; t++) {
      alpha[t] = new Array(N).fill(-Infinity);
    }
    alpha[0][model.startState] = 0;
    for (let s = 0; s < N; s++) {
      if (model.states[s].isEmitting) {
        alpha[0][s] = this.stateScore(features[0], phone, model.states[s].gmmIndex);
      }
    }
    for (let t = 1; t < T; t++) {
      for (let j = 0; j < N; j++) {
        if (!model.states[j].isEmitting) continue;
        let sum = -Infinity;
        for (let i = 0; i < N; i++) {
          const transProb = model.states[i].transitionProb.get(j);
          if (transProb === undefined) continue;
          const logTrans = Math.log(Math.max(transProb, this._smoothingFactor));
          const total = alpha[t - 1][i] + logTrans;
          sum = this._logAdd(sum, total);
        }
        const emitScore = this.stateScore(features[t], phone, model.states[j].gmmIndex);
        alpha[t][j] = sum + emitScore;
      }
    }
    let total = -Infinity;
    for (let s = 0; s < N; s++) {
      total = this._logAdd(total, alpha[T - 1][s]);
    }
    return total;
  }

  private _logAdd(a: number, b: number): number {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    if (a > b) {
      return a + Math.log(1 + Math.exp(b - a));
    } else {
      return b + Math.log(1 + Math.exp(a - b));
    }
  }

  trainGMM(features: number[][], numComponents: number = 8, iterations: number = 10): GMM {
    const dim = features[0].length;
    const components: GaussianComponent[] = [];
    const n = features.length;
    for (let c = 0; c < numComponents; c++) {
      const idx = Math.floor((c * n) / numComponents);
      components.push({
        mean: [...features[idx]],
        variance: new Array(dim).fill(1),
        weight: 1 / numComponents,
        dim
      });
    }
    const gmm: GMM = {
      id: 0,
      components,
      numComponents,
      dim
    };
    for (let iter = 0; iter < iterations; iter++) {
      const gamma = new Array(n);
      for (let t = 0; t < n; t++) {
        gamma[t] = new Array(numComponents).fill(0);
        let total = 0;
        for (let c = 0; c < numComponents; c++) {
          const logProb = this.gaussianPdf(features[t], components[c].mean, components[c].variance, dim);
          const w = components[c].weight;
          const prob = w * Math.exp(logProb);
          gamma[t][c] = prob;
          total += prob;
        }
        if (total > 0) {
          for (let c = 0; c < numComponents; c++) {
            gamma[t][c] /= total;
          }
        }
      }
      for (let c = 0; c < numComponents; c++) {
        let nC = 0;
        for (let t = 0; t < n; t++) {
          nC += gamma[t][c];
        }
        components[c].weight = nC / n;
        if (nC > 0) {
          for (let d = 0; d < dim; d++) {
            let sumMean = 0;
            let sumVar = 0;
            for (let t = 0; t < n; t++) {
              sumMean += gamma[t][c] * features[t][d];
            }
            components[c].mean[d] = sumMean / nC;
            for (let t = 0; t < n; t++) {
              const diff = features[t][d] - components[c].mean[d];
              sumVar += gamma[t][c] * diff * diff;
            }
            components[c].variance[d] = sumVar / nC;
            if (components[c].variance[d] < 1e-5) {
              components[c].variance[d] = 1e-5;
            }
          }
        }
      }
    }
    return gmm;
  }

  initializeDNNHMM(inputDim: number, hiddenDims: number[], outputDim: number): void {
    const layers: DNNLayer[] = [];
    let prevDim = inputDim;
    for (let i = 0; i < hiddenDims.length; i++) {
      layers.push({
        name: `dense_${i}`,
        type: 'dense',
        inputDim: prevDim,
        outputDim: hiddenDims[i],
        weights: this._randomMatrix(prevDim, hiddenDims[i]),
        bias: new Array(hiddenDims[i]).fill(0),
        activation: 'relu',
        dropoutRate: 0
      });
      layers.push({
        name: `relu_${i}`,
        type: 'activation',
        inputDim: hiddenDims[i],
        outputDim: hiddenDims[i],
        weights: [],
        bias: [],
        activation: 'relu',
        dropoutRate: 0
      });
      prevDim = hiddenDims[i];
    }
    layers.push({
      name: 'output',
      type: 'dense',
      inputDim: prevDim,
      outputDim,
      weights: this._randomMatrix(prevDim, outputDim),
      bias: new Array(outputDim).fill(0),
      activation: 'softmax',
      dropoutRate: 0
    });
    const hmmStates: HMMState[] = [];
    for (let i = 0; i < outputDim; i++) {
      hmmStates.push({
        id: i,
        name: `state_${i}`,
        isEmitting: true,
        transitionProb: new Map(),
        gmmIndex: i
      });
    }
    this._dnnHmmModel = {
      dnn: layers,
      hmmStates,
      inputDim,
      outputDim,
      hiddenLayers: hiddenDims.length
    };
    this._featureDim = inputDim;
  }

  private _randomMatrix(rows: number, cols: number): number[][] {
    const m = new Array(rows);
    for (let i = 0; i < rows; i++) {
      m[i] = new Array(cols);
      for (let j = 0; j < cols; j++) {
        m[i][j] = (Math.random() - 0.5) * 0.1;
      }
    }
    return m;
  }

  dnnForward(input: number[]): number[] {
    if (!this._dnnHmmModel) {
      return [];
    }
    let activations = [...input];
    for (const layer of this._dnnHmmModel.dnn) {
      if (layer.type === 'dense') {
        const output = new Array(layer.outputDim);
        for (let j = 0; j < layer.outputDim; j++) {
          let sum = layer.bias[j];
          for (let i = 0; i < layer.inputDim; i++) {
            sum += activations[i] * layer.weights[i][j];
          }
          output[j] = sum;
        }
        activations = output;
      } else if (layer.type === 'activation') {
        if (layer.activation === 'relu') {
          activations = activations.map(x => Math.max(0, x));
        } else if (layer.activation === 'softmax') {
          const maxVal = Math.max(...activations);
          const expVals = activations.map(x => Math.exp(x - maxVal));
          const sumExp = expVals.reduce((a, b) => a + b, 0);
          activations = expVals.map(x => x / sumExp);
        }
      }
    }
    return activations;
  }

  initializeE2E(type: string, encoderLayers: number, decoderLayers: number, hiddenDim: number, numHeads: number, vocabSize: number): void {
    this._e2eModel = {
      type: type as E2EModel['type'],
      encoderLayers,
      decoderLayers,
      hiddenDim,
      numHeads,
      vocabSize,
      subSampling: 4
    };
  }

  score(features: number[][]): AcousticResult {
    const startTime = Date.now();
    this._scores = [];
    if (this._modelType === 'hmm-gmm') {
      this._scores = this.computeAllScores(features);
    } else if (this._modelType === 'dnn-hmm') {
      for (let f = 0; f < features.length; f++) {
        const posteriors = this.dnnForward(features[f]);
        const stateScores = new Map<string, number>();
        const phoneScores = new Map<string, number>();
        let bestState = '';
        let bestPhone = '';
        let maxScore = -Infinity;
        for (let i = 0; i < posteriors.length; i++) {
          const sName = `state_${i}`;
          const score = Math.log(Math.max(posteriors[i], 1e-10));
          stateScores.set(sName, score);
          if (score > maxScore) {
            maxScore = score;
            bestState = sName;
            bestPhone = this._phoneSet[i % this._phoneSet.length] || 'unknown';
          }
        }
        phoneScores.set(bestPhone, maxScore);
        this._scores.push({
          frameIndex: f,
          stateScores,
          phoneScores,
          bestState,
          bestPhone,
          likelihood: maxScore
        });
      }
    } else {
      for (let f = 0; f < features.length; f++) {
        const stateScores = new Map<string, number>();
        const phoneScores = new Map<string, number>();
        let bestPhone = this._phoneSet[f % this._phoneSet.length];
        phoneScores.set(bestPhone, -1);
        stateScores.set(`${bestPhone}_s0`, -1);
        this._scores.push({
          frameIndex: f,
          stateScores,
          phoneScores,
          bestState: `${bestPhone}_s0`,
          bestPhone,
          likelihood: -1
        });
      }
    }
    this._latency = Date.now() - startTime;
    const result: AcousticResult = {
      modelType: this._modelType,
      scores: this._scores,
      alignment: this._alignment,
      frameCount: features.length,
      featureDim: this._featureDim,
      numStates: this._numStates,
      numPhones: this._numPhones,
      isE2E: this._modelType.startsWith('e2e'),
      latency: this._latency
    };
    this._lastResult = result;
    return result;
  }

  toPacket(): DataPacket<AcousticResult> {
    const result = this._lastResult || {
      modelType: this._modelType,
      scores: this._scores,
      alignment: this._alignment,
      frameCount: this._scores.length,
      featureDim: this._featureDim,
      numStates: this._numStates,
      numPhones: this._numPhones,
      isE2E: this._modelType.startsWith('e2e'),
      latency: this._latency
    };
    this._counter++;
    return {
      id: `acoustic-model-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'acoustic_model'],
        priority: 1,
        phase: 'acoustic_scoring'
      }
    };
  }

  reset(): void {
    this._modelType = 'hmm-gmm';
    this._featureDim = 39;
    this._numPhones = 40;
    this._numStates = 0;
    this._scores = [];
    this._alignment = null;
    this._isTrained = false;
    this._smoothingFactor = 0.0001;
    this._beamWidth = 100;
    this._counter = 0;
    this._lastResult = null;
    this._latency = 0;
    this._hmmGmmModels.clear();
    this._initDefaultPhoneSet();
    this._initDefaultHMMGMM();
  }
}
