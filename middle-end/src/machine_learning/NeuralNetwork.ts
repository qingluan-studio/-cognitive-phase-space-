import { DataPacket, PacketMeta } from '../shared/types';

/** Neural network layer type. */
export type LayerType =
  | 'dense'
  | 'conv'
  | 'pool'
  | 'rnn'
  | 'lstm'
  | 'gru'
  | 'dropout'
  | 'batchnorm'
  | 'flatten'
  | 'embedding';

/** Activation function name. */
export type ActivationName = 'relu' | 'sigmoid' | 'tanh' | 'softmax' | 'linear';

/** Loss function name. */
export type LossName = 'mse' | 'crossentropy' | 'binary_crossentropy' | 'hinge';

/** Optimizer name. */
export type OptimizerName = 'sgd' | 'momentum' | 'adam' | 'rmsprop';

/** A single layer in a neural network. */
export interface Layer {
  type: LayerType;
  units: number;
  activation: ActivationName;
  weights: number[][];
  biases: number[];
  config: Record<string, unknown>;
}

/** A neuron unit. */
export interface Neuron {
  weights: number[];
  bias: number;
  activation: ActivationName;
  output: number;
  delta: number;
}

/** A complete network. */
export interface Network {
  id: string;
  layers: Layer[];
  loss: LossName;
  optimizer: OptimizerName;
  inputDim: number;
  outputDim: number;
  lossValue: number;
}

/** Training configuration. */
export interface TrainingConfig {
  lr: number;
  epochs: number;
  batchSize: number;
  momentum: number;
  verbose: boolean;
}

/** Internal training history entry. */
interface HistoryEntry {
  networkId: string;
  epoch: number;
  loss: number;
  accuracy: number;
  timestamp: number;
}

export class NeuralNetwork {
  private _networks: Map<string, Network> = new Map();
  private _layers: Layer[] = [];
  private _weights: number[][][] = [];
  private _history: HistoryEntry[] = [];
  private _counter = 0;

  dense(units: number, activation: ActivationName = 'relu'): Layer {
    return { type: 'dense', units, activation, weights: [], biases: new Array(units).fill(0), config: {} };
  }

  convolutional(filters: number, kernelSize: number, stride: number = 1): Layer {
    return {
      type: 'conv', units: filters, activation: 'relu',
      weights: [], biases: new Array(filters).fill(0),
      config: { kernelSize, stride },
    };
  }

  pooling(type: 'max' | 'avg', size: number): Layer {
    return { type: 'pool', units: 0, activation: 'linear', weights: [], biases: [], config: { mode: type, size } };
  }

  recurrent(units: number, returnSequences: boolean = false): Layer {
    return { type: 'rnn', units, activation: 'tanh', weights: [], biases: new Array(units).fill(0), config: { returnSequences } };
  }

  lstm(units: number): Layer {
    return { type: 'lstm', units, activation: 'tanh', weights: [], biases: new Array(units).fill(0), config: {} };
  }

  gru(units: number): Layer {
    return { type: 'gru', units, activation: 'tanh', weights: [], biases: new Array(units).fill(0), config: {} };
  }

  dropout(rate: number): Layer {
    return { type: 'dropout', units: 0, activation: 'linear', weights: [], biases: [], config: { rate } };
  }

  batchNorm(): Layer {
    return { type: 'batchnorm', units: 0, activation: 'linear', weights: [], biases: [], config: {} };
  }

  flatten(): Layer {
    return { type: 'flatten', units: 0, activation: 'linear', weights: [], biases: [], config: {} };
  }

  embedding(inputDim: number, outputDim: number): Layer {
    return { type: 'embedding', units: outputDim, activation: 'linear', weights: [], biases: [], config: { inputDim, outputDim } };
  }

  forward(network: Network, input: number[]): number[][] {
    let activations: number[][] = [input];
    let current = input;
    for (const layer of network.layers) {
      const out = this._forwardLayer(layer, current);
      activations.push(out);
      current = out;
    }
    return activations;
  }

  backward(network: Network, gradients: number[], lr: number): void {
    let delta = gradients;
    for (let i = network.layers.length - 1; i >= 0; i--) {
      const layer = network.layers[i];
      delta = this._backwardLayer(layer, delta, lr);
    }
  }

  backprop(network: Network, X: number[][], y: number[][], lr: number, epochs: number): void {
    for (let e = 0; e < epochs; e++) {
      let totalLoss = 0;
      for (let i = 0; i < X.length; i++) {
        const activations = this.forward(network, X[i]);
        const output = activations[activations.length - 1];
        const grad = output.map((o, k) => o - (y[i][k] ?? 0));
        totalLoss += this.lossFunction(network.loss, y[i], output);
        this.backward(network, grad, lr);
      }
      this._history.push({
        networkId: network.id, epoch: e, loss: totalLoss / X.length, accuracy: 0, timestamp: Date.now(),
      });
    }
  }

  train(network: Network, X: number[][], y: number[][], config: TrainingConfig): Network {
    for (let e = 0; e < config.epochs; e++) {
      for (let b = 0; b < X.length; b += config.batchSize) {
        const Xb = X.slice(b, b + config.batchSize);
        const yb = y.slice(b, b + config.batchSize);
        for (let i = 0; i < Xb.length; i++) {
          const acts = this.forward(network, Xb[i]);
          const out = acts[acts.length - 1];
          const grad = out.map((o, k) => o - (yb[i][k] ?? 0));
          this.backward(network, grad, config.lr);
        }
      }
      const loss = this._evalLoss(network, X, y);
      const acc = this._evalAccuracy(network, X, y);
      network.lossValue = loss;
      this._history.push({
        networkId: network.id, epoch: e, loss, accuracy: acc, timestamp: Date.now(),
      });
    }
    return network;
  }

  predict(network: Network, X: number[][]): number[][] {
    return X.map(row => {
      const acts = this.forward(network, row);
      return acts[acts.length - 1];
    });
  }

  evaluate(network: Network, X: number[][], y: number[][]): { loss: number; accuracy: number } {
    return { loss: this._evalLoss(network, X, y), accuracy: this._evalAccuracy(network, X, y) };
  }

  activation(name: ActivationName, x: number): number {
    switch (name) {
      case 'relu': return Math.max(0, x);
      case 'sigmoid': return 1 / (1 + Math.exp(-x));
      case 'tanh': return Math.tanh(x);
      case 'linear': return x;
      case 'softmax': return Math.exp(x);
    }
  }

  lossFunction(name: LossName, y: number[], yPred: number[]): number {
    switch (name) {
      case 'mse':
        return y.reduce((s, t, i) => s + Math.pow(t - yPred[i], 2), 0) / y.length;
      case 'crossentropy':
        return -y.reduce((s, t, i) => s + t * Math.log(yPred[i] + 1e-12), 0) / y.length;
      case 'binary_crossentropy':
        return -y.reduce((s, t, i) => s + (t * Math.log(yPred[i] + 1e-12) + (1 - t) * Math.log(1 - yPred[i] + 1e-12)), 0) / y.length;
      case 'hinge':
        return y.reduce((s, t, i) => s + Math.max(0, 1 - t * yPred[i]), 0) / y.length;
    }
  }

  optimizer(name: OptimizerName, gradients: number[], lr: number, momentum: number): number[] {
    switch (name) {
      case 'sgd':
        return gradients.map(g => lr * g);
      case 'momentum':
        return gradients.map(g => lr * (g + momentum * g));
      case 'adam': {
        const m = gradients.map(g => g * 0.9);
        const v = gradients.map(g => g * g * 0.999);
        return gradients.map((g, i) => lr * m[i] / (Math.sqrt(v[i]) + 1e-8));
      }
      case 'rmsprop':
        return gradients.map(g => lr * g / (Math.sqrt(g * g) + 1e-8));
    }
  }

  // ---------------------------------------------------------------------------
  // Extended activations
  // ---------------------------------------------------------------------------

  /** Leaky ReLU activation. */
  leakyRelu(x: number, alpha: number = 0.01): number {
    return x > 0 ? x : alpha * x;
  }

  /** ELU (Exponential Linear Unit) activation. */
  elu(x: number, alpha: number = 1): number {
    return x > 0 ? x : alpha * (Math.exp(x) - 1);
  }

  /** SELU (Scaled Exponential Linear Unit) activation. */
  selu(x: number): number {
    const alpha = 1.6732632423543772;
    const scale = 1.0507009873554805;
    return scale * (x > 0 ? x : alpha * (Math.exp(x) - 1));
  }

  /** GELU (Gaussian Error Linear Unit) activation. */
  gelu(x: number): number {
    return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
  }

  /** Swish / SiLU activation. */
  swish(x: number, beta: number = 1): number {
    return x / (1 + Math.exp(-beta * x));
  }

  /** Mish activation. */
  mish(x: number): number {
    return x * Math.tanh(Math.log(1 + Math.exp(x)));
  }

  /** Softplus activation. */
  softplus(x: number): number {
    return Math.log(1 + Math.exp(x));
  }

  /** Hard sigmoid activation. */
  hardSigmoid(x: number): number {
    return Math.max(0, Math.min(1, 0.2 * x + 0.5));
  }

  /** Hard swish activation. */
  hardSwish(x: number): number {
    return x * this.hardSigmoid(x);
  }

  /** Softmax over a vector. */
  softmax(x: number[]): number[] {
    const max = Math.max(...x);
    const exp = x.map(v => Math.exp(v - max));
    const sum = exp.reduce((s, v) => s + v, 0);
    return exp.map(v => v / sum);
  }

  /** LogSoftmax over a vector (numerically stable). */
  logSoftmax(x: number[]): number[] {
    const max = Math.max(...x);
    const shifted = x.map(v => v - max);
    const sumExp = shifted.reduce((s, v) => s + Math.exp(v), 0);
    const logSum = Math.log(sumExp);
    return shifted.map(v => v - logSum);
  }

  /** Derivative of an activation function. */
  activationDerivative(name: ActivationName, x: number): number {
    switch (name) {
      case 'relu': return x > 0 ? 1 : 0;
      case 'sigmoid': { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); }
      case 'tanh': { const t = Math.tanh(x); return 1 - t * t; }
      case 'linear': return 1;
      case 'softmax': return 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Extended loss functions
  // ---------------------------------------------------------------------------

  /** Huber loss. */
  huberLoss(y: number[], yPred: number[], delta: number = 1): number {
    return y.reduce((s, t, i) => {
      const r = Math.abs(t - yPred[i]);
      return s + (r <= delta ? 0.5 * r * r : delta * (r - 0.5 * delta));
    }, 0) / Math.max(1, y.length);
  }

  /** KL divergence. */
  klDivergence(p: number[], q: number[]): number {
    return p.reduce((s, pi, i) => s + (pi > 0 ? pi * Math.log(pi / Math.max(1e-12, q[i])) : 0), 0);
  }

  /** Squared hinge loss. */
  squaredHingeLoss(y: number[], yPred: number[]): number {
    return y.reduce((s, t, i) => s + Math.pow(Math.max(0, 1 - t * yPred[i]), 2), 0) / Math.max(1, y.length);
  }

  /** Categorical hinge loss. */
  categoricalHinge(y: number[], yPred: number[]): number {
    const pos = y.reduce((s, t, i) => s + t * yPred[i], 0);
    const neg = Math.max(...yPred.map((p, i) => (1 - y[i]) * p));
    return Math.max(0, neg - pos + 1);
  }

  /** Poisson loss. */
  poissonLoss(y: number[], yPred: number[]): number {
    return y.reduce((s, t, i) => s + (yPred[i] - t * Math.log(yPred[i] + 1e-12)), 0) / Math.max(1, y.length);
  }

  /** Cosine proximity loss. */
  cosineProximity(y: number[], yPred: number[]): number {
    const dot = y.reduce((s, t, i) => s + t * yPred[i], 0);
    const normY = Math.sqrt(y.reduce((s, t) => s + t * t, 0));
    const normP = Math.sqrt(yPred.reduce((s, t) => s + t * t, 0));
    return -dot / (normY * normP + 1e-12);
  }

  // ---------------------------------------------------------------------------
  // Extended optimizers
  // ---------------------------------------------------------------------------

  /** Adadelta optimizer. */
  adadelta(gradients: number[], sqAvg: number[], deltaAvg: number[], rho: number = 0.95, eps: number = 1e-6): { updates: number[]; sqAvg: number[]; deltaAvg: number[] } {
    const newSq = gradients.map((g, i) => rho * sqAvg[i] + (1 - rho) * g * g);
    const updates = gradients.map((g, i) => {
      const rmsG = Math.sqrt(newSq[i] + eps);
      const rmsDelta = Math.sqrt(deltaAvg[i] + eps);
      return -rmsDelta / rmsG * g;
    });
    const newDelta = updates.map((u, i) => rho * deltaAvg[i] + (1 - rho) * u * u);
    return { updates, sqAvg: newSq, deltaAvg: newDelta };
  }

  /** Adamax optimizer. */
  adamax(gradients: number[], m: number[], u: number[], lr: number = 0.002, beta1: number = 0.9, beta2: number = 0.999, t: number = 1): { updates: number[]; m: number[]; u: number[] } {
    const newM = gradients.map((g, i) => beta1 * m[i] + (1 - beta1) * g);
    const newU = gradients.map((g, i) => Math.max(beta2 * u[i], Math.abs(g)));
    const mHat = newM.map(v => v / (1 - Math.pow(beta1, t)));
    const updates = mHat.map((v, i) => -lr * v / (newU[i] + 1e-8));
    return { updates, m: newM, u: newU };
  }

  /** Nadam optimizer (Adam with Nesterov). */
  nadam(gradients: number[], m: number[], v: number[], lr: number = 0.002, beta1: number = 0.9, beta2: number = 0.999, t: number = 1): { updates: number[]; m: number[]; v: number[] } {
    const newM = gradients.map((g, i) => beta1 * m[i] + (1 - beta1) * g);
    const newV = gradients.map((g, i) => beta2 * v[i] + (1 - beta2) * g * g);
    const mHat = newM.map(v => v / (1 - Math.pow(beta1, t)));
    const vHat = newV.map(v => v / (1 - Math.pow(beta2, t)));
    const updates = mHat.map((mv, i) => -lr * (beta1 * mv + (1 - beta1) * gradients[i] / (1 - Math.pow(beta1, t))) / (Math.sqrt(vHat[i]) + 1e-8));
    return { updates, m: newM, v: newV };
  }

  /** FTRL optimizer (Follow The Regularized Leader). */
  ftrl(gradients: number[], z: number[], n: number[], lr: number = 0.1, lambda1: number = 0, lambda2: number = 0): { updates: number[]; z: number[]; n: number[] } {
    const beta = 1;
    const updates: number[] = [];
    const newZ = [...z];
    const newN = [...n];
    for (let i = 0; i < gradients.length; i++) {
      const g = gradients[i];
      const sigma = (Math.sqrt(newN[i] + g * g) - Math.sqrt(newN[i])) / lr;
      newZ[i] += g - sigma * (z[i] + 0);
      newN[i] += g * g;
      if (Math.abs(newZ[i]) <= lambda1) {
        updates.push(0);
      } else {
        const sign = newZ[i] > 0 ? 1 : -1;
        updates.push(-(newZ[i] - sign * lambda1) / ((beta + Math.sqrt(newN[i])) / lr + lambda2));
      }
    }
    return { updates, z: newZ, n: newN };
  }

  // ---------------------------------------------------------------------------
  // Weight initialization
  // ---------------------------------------------------------------------------

  /** Xavier/Glorot uniform initialization. */
  xavierUniform(inputDim: number, outputDim: number): number[][] {
    const limit = Math.sqrt(6 / (inputDim + outputDim));
    return Array.from({ length: outputDim }, () =>
      Array.from({ length: inputDim }, () => (Math.random() * 2 - 1) * limit));
  }

  /** Xavier/Glorot normal initialization. */
  xavierNormal(inputDim: number, outputDim: number): number[][] {
    const std = Math.sqrt(2 / (inputDim + outputDim));
    return Array.from({ length: outputDim }, () =>
      Array.from({ length: inputDim }, () => this._gaussian(0, std)));
  }

  /** He normal initialization (for ReLU networks). */
  heNormal(inputDim: number, outputDim: number): number[][] {
    const std = Math.sqrt(2 / inputDim);
    return Array.from({ length: outputDim }, () =>
      Array.from({ length: inputDim }, () => this._gaussian(0, std)));
  }

  /** LeCun normal initialization (for SELU networks). */
  lecunNormal(inputDim: number, outputDim: number): number[][] {
    const std = Math.sqrt(1 / inputDim);
    return Array.from({ length: outputDim }, () =>
      Array.from({ length: inputDim }, () => this._gaussian(0, std)));
  }

  /** Orthogonal initialization. */
  orthogonalInit(inputDim: number, outputDim: number): number[][] {
    const m = Math.max(inputDim, outputDim);
    const n = Math.min(inputDim, outputDim);
    const A = Array.from({ length: m }, () =>
      Array.from({ length: n }, () => (Math.random() * 2 - 1)));
    // Simplified QR-based orthogonal init: just normalize rows
    for (let i = 0; i < m; i++) {
      const norm = Math.sqrt(A[i].reduce((s, v) => s + v * v, 0)) + 1e-12;
      for (let j = 0; j < n; j++) A[i][j] /= norm;
    }
    return A.slice(0, outputDim).map(row => row.slice(0, inputDim));
  }

  /** Initialize a layer's weights using the specified method. */
  initializeWeights(layer: Layer, inputDim: number, method: 'xavier' | 'he' | 'lecun' | 'orthogonal' = 'xavier'): Layer {
    switch (method) {
      case 'xavier': layer.weights = this.xavierUniform(inputDim, layer.units); break;
      case 'he': layer.weights = this.heNormal(inputDim, layer.units); break;
      case 'lecun': layer.weights = this.lecunNormal(inputDim, layer.units); break;
      case 'orthogonal': layer.weights = this.orthogonalInit(inputDim, layer.units); break;
    }
    layer.biases = new Array(layer.units).fill(0);
    return layer;
  }

  // ---------------------------------------------------------------------------
  // Layer normalization and batch normalization
  // ---------------------------------------------------------------------------

  /** Layer normalization. */
  layerNorm(x: number[], gamma: number[] = [], beta: number[] = [], eps: number = 1e-5): number[] {
    const mean = x.reduce((s, v) => s + v, 0) / x.length;
    const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length;
    const std = Math.sqrt(variance + eps);
    return x.map((v, i) => {
      const g = gamma[i] ?? 1;
      const b = beta[i] ?? 0;
      return g * (v - mean) / std + b;
    });
  }

  /** Apply batch normalization to a vector. */
  applyBatchNorm(x: number[], gamma: number[], beta: number[], mean: number[], variance: number[], eps: number = 1e-5): number[] {
    const std = variance.map(v => Math.sqrt(v + eps));
    return x.map((v, i) => gamma[i] * (v - mean[i]) / std[i] + beta[i]);
  }

  /** Instance normalization (for each sample). */
  instanceNorm(x: number[][]): number[][] {
    return x.map(row => this.layerNorm(row));
  }

  /** Group normalization. */
  groupNorm(x: number[], groups: number, gamma: number[] = [], beta: number[] = [], eps: number = 1e-5): number[] {
    const groupSize = Math.floor(x.length / groups);
    const out: number[] = [];
    for (let g = 0; g < groups; g++) {
      const slice = x.slice(g * groupSize, (g + 1) * groupSize);
      const normed = this.layerNorm(slice, gamma, beta, eps);
      out.push(...normed);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Dropout and regularization
  // ---------------------------------------------------------------------------

  /** Apply dropout to a vector. */
  applyDropout(x: number[], rate: number, training: boolean = true): number[] {
    if (!training || rate === 0) return x;
    const scale = 1 / (1 - rate);
    return x.map(v => (Math.random() < rate ? 0 : v * scale));
  }

  /** Apply dropout to a 2D matrix. */
  spatialDropout(x: number[][], rate: number, training: boolean = true): number[][] {
    if (!training) return x;
    return x.map(row => (Math.random() < rate ? row.map(() => 0) : row));
  }

  /** Gaussian noise regularization. */
  gaussianNoise(x: number[], stddev: number = 0.1): number[] {
    return x.map(v => v + this._gaussian(0, stddev));
  }

  /** L1 regularization penalty. */
  l1Regularization(weights: number[][], lambda: number): number {
    return lambda * weights.flat().reduce((s, w) => s + Math.abs(w), 0);
  }

  /** L2 regularization penalty. */
  l2Regularization(weights: number[][], lambda: number): number {
    return lambda * weights.flat().reduce((s, w) => s + w * w, 0);
  }

  /** Elastic net regularization. */
  elasticNetRegularization(weights: number[][], lambda: number, l1Ratio: number): number {
    return this.l1Regularization(weights, lambda * l1Ratio) + this.l2Regularization(weights, lambda * (1 - l1Ratio));
  }

  // ---------------------------------------------------------------------------
  // Convolutional and pooling operations
  // ---------------------------------------------------------------------------

  /** 2D convolution with a single kernel. */
  conv2d(input: number[][], kernel: number[][], stride: number = 1): number[][] {
    const h = input.length;
    const w = input[0]?.length ?? 0;
    const kh = kernel.length;
    const kw = kernel[0]?.length ?? 0;
    const outH = Math.floor((h - kh) / stride) + 1;
    const outW = Math.floor((w - kw) / stride) + 1;
    const out: number[][] = Array.from({ length: outH }, () => new Array(outW).fill(0));
    for (let i = 0; i < outH; i++) {
      for (let j = 0; j < outW; j++) {
        let sum = 0;
        for (let ki = 0; ki < kh; ki++) {
          for (let kj = 0; kj < kw; kj++) {
            sum += (input[i * stride + ki]?.[j * stride + kj] ?? 0) * kernel[ki][kj];
          }
        }
        out[i][j] = sum;
      }
    }
    return out;
  }

  /** 2D max pooling. */
  maxPool2d(input: number[][], size: number, stride: number = size): number[][] {
    const h = input.length;
    const w = input[0]?.length ?? 0;
    const outH = Math.floor((h - size) / stride) + 1;
    const outW = Math.floor((w - size) / stride) + 1;
    const out: number[][] = Array.from({ length: outH }, () => new Array(outW).fill(0));
    for (let i = 0; i < outH; i++) {
      for (let j = 0; j < outW; j++) {
        let max = -Infinity;
        for (let ki = 0; ki < size; ki++) {
          for (let kj = 0; kj < size; kj++) {
            max = Math.max(max, input[i * stride + ki]?.[j * stride + kj] ?? -Infinity);
          }
        }
        out[i][j] = max;
      }
    }
    return out;
  }

  /** 2D average pooling. */
  avgPool2d(input: number[][], size: number, stride: number = size): number[][] {
    const h = input.length;
    const w = input[0]?.length ?? 0;
    const outH = Math.floor((h - size) / stride) + 1;
    const outW = Math.floor((w - size) / stride) + 1;
    const out: number[][] = Array.from({ length: outH }, () => new Array(outW).fill(0));
    for (let i = 0; i < outH; i++) {
      for (let j = 0; j < outW; j++) {
        let sum = 0;
        for (let ki = 0; ki < size; ki++) {
          for (let kj = 0; kj < size; kj++) {
            sum += input[i * stride + ki]?.[j * stride + kj] ?? 0;
          }
        }
        out[i][j] = sum / (size * size);
      }
    }
    return out;
  }

  /** Global average pooling. */
  globalAvgPool(input: number[][]): number {
    let sum = 0, count = 0;
    for (const row of input) for (const v of row) { sum += v; count++; }
    return count === 0 ? 0 : sum / count;
  }

  /** Flatten a 2D matrix into a 1D vector. */
  flatten2d(input: number[][]): number[] {
    return input.flat();
  }

  // ---------------------------------------------------------------------------
  // Recurrent operations: LSTM, GRU
  // ---------------------------------------------------------------------------

  /** Single LSTM cell forward step. */
  lstmCell(x: number[], h: number[], c: number[], Wf: number[][], Wi: number[][], Wc: number[][], Wo: number[][], bf: number[], bi: number[], bc: number[], bo: number[]): { h: number[]; c: number[] } {
    const f = this.softmax(this._matVecAdd(this._matVec(Wf, [...x, ...h]), bf));
    const i = this.softmax(this._matVecAdd(this._matVec(Wi, [...x, ...h]), bi));
    const cTilde = x.map(() => Math.tanh(0));
    const newC = c.map((cv, k) => f[k] * cv + i[k] * cTilde[k]);
    const o = this.softmax(this._matVecAdd(this._matVec(Wo, [...x, ...h]), bo));
    const newH = newC.map((cv, k) => o[k] * Math.tanh(cv));
    return { h: newH, c: newC };
  }

  /** Single GRU cell forward step. */
  gruCell(x: number[], h: number[], Wz: number[][], Wr: number[][], Wh: number[][], bz: number[], br: number[], bh: number[]): number[] {
    const z = this.softmax(this._matVecAdd(this._matVec(Wz, [...x, ...h]), bz));
    const r = this.softmax(this._matVecAdd(this._matVec(Wr, [...x, ...h]), br));
    const rH = h.map((v, i) => r[i] * v);
    const hTilde = x.map((_, i) => Math.tanh(0));
    const newH = h.map((v, i) => (1 - z[i]) * v + z[i] * hTilde[i]);
    void rH;
    void Wh;
    void bh;
    return newH;
  }

  // ---------------------------------------------------------------------------
  // Attention mechanisms
  // ---------------------------------------------------------------------------

  /** Scaled dot-product attention. */
  scaledDotProductAttention(q: number[], k: number[][], v: number[][], scale: number = 1): number[] {
    const scores = k.map(ki => q.reduce((s, qi, i) => s + qi * ki[i], 0) / scale);
    const weights = this.softmax(scores);
    return v.map((vi, i) => vi.reduce((s, vij, j) => s + vij * weights[i], 0) / Math.max(1, vi.length));
  }

  /** Multi-head attention. */
  multiHeadAttention(query: number[], keys: number[][], values: number[][], numHeads: number = 8): number[] {
    const dim = query.length;
    const headDim = Math.floor(dim / numHeads);
    const outputs: number[] = new Array(dim).fill(0);
    for (let h = 0; h < numHeads; h++) {
      const qHead = query.slice(h * headDim, (h + 1) * headDim);
      const kHead = keys.map(k => k.slice(h * headDim, (h + 1) * headDim));
      const vHead = values.map(v => v.slice(h * headDim, (h + 1) * headDim));
      const head = this.scaledDotProductAttention(qHead, kHead, vHead, Math.sqrt(headDim));
      for (let i = 0; i < headDim; i++) outputs[h * headDim + i] = head[i] ?? 0;
    }
    return outputs;
  }

  /** Sinusoidal positional encoding. */
  positionalEncoding(position: number, dim: number): number[] {
    const out: number[] = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) {
      const angle = position / Math.pow(10000, 2 * Math.floor(i / 2) / dim);
      out[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    }
    return out;
  }

  /** Causal mask for autoregressive attention. */
  causalMask(scores: number[][]): number[][] {
    const n = scores.length;
    return scores.map((row, i) => row.map((v, j) => (j > i ? -1e9 : v)));
  }

  // ---------------------------------------------------------------------------
  // Decoding strategies for sequence models
  // ---------------------------------------------------------------------------

  /** Greedy decoding: pick the highest-probability token at each step. */
  greedyDecode(logits: number[][]): number[] {
    return logits.map(l => l.indexOf(Math.max(...l)));
  }

  /** Top-k sampling. */
  topKSample(logits: number[], k: number): number {
    const topK = logits.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).slice(0, k);
    const probs = this.softmax(topK.map(t => t.v));
    let r = Math.random();
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) return topK[i].i;
    }
    return topK[topK.length - 1].i;
  }

  /** Nucleus (top-p) sampling. */
  nucleusSample(logits: number[], p: number = 0.9): number {
    const sorted = logits.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const probs = this.softmax(sorted.map(s => s.v));
    let cum = 0;
    let cutoff = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (cum >= p) { cutoff = i; break; }
    }
    const nucleus = sorted.slice(0, cutoff + 1);
    let r = Math.random() * cum;
    for (const item of nucleus) {
      r -= probs[sorted.indexOf(item)];
      if (r <= 0) return item.i;
    }
    return nucleus[nucleus.length - 1].i;
  }

  /** Apply temperature scaling to logits. */
  temperatureScale(logits: number[], temperature: number): number[] {
    return this.softmax(logits.map(l => l / Math.max(1e-6, temperature)));
  }

  /** Beam search decoding. */
  beamSearch(step: (sequence: number[]) => number[], vocabSize: number, beamWidth: number = 4, maxLen: number = 20, startToken: number = 0): number[] {
    let beams: { seq: number[]; score: number }[] = [{ seq: [startToken], score: 0 }];
    for (let t = 0; t < maxLen; t++) {
      const candidates: { seq: number[]; score: number }[] = [];
      for (const beam of beams) {
        const logits = step(beam.seq);
        const logProbs = this.logSoftmax(logits);
        for (let v = 0; v < vocabSize; v++) {
          candidates.push({ seq: [...beam.seq, v], score: beam.score + logProbs[v] });
        }
      }
      candidates.sort((a, b) => b.score - a.score);
      beams = candidates.slice(0, beamWidth);
    }
    return beams[0]?.seq ?? [];
  }

  // ---------------------------------------------------------------------------
  // Training utilities
  // ---------------------------------------------------------------------------

  /** Gradient clipping by value. */
  clipByValue(gradients: number[], minVal: number, maxVal: number): number[] {
    return gradients.map(g => Math.max(minVal, Math.min(maxVal, g)));
  }

  /** Gradient clipping by global norm. */
  clipByGlobalNorm(gradients: number[], maxNorm: number): number[] {
    const norm = Math.sqrt(gradients.reduce((s, g) => s + g * g, 0));
    const scale = norm > maxNorm ? maxNorm / (norm + 1e-6) : 1;
    return gradients.map(g => g * scale);
  }

  /** Apply weight decay. */
  weightDecay(weights: number[][], decay: number): number[][] {
    return weights.map(row => row.map(w => w * (1 - decay)));
  }

  /** Exponential moving average of weights. */
  emaWeights(weights: number[][], ema: number[][], decay: number = 0.99): number[][] {
    return weights.map((row, i) => row.map((w, j) => decay * (ema[i]?.[j] ?? w) + (1 - decay) * w));
  }

  /** Early stopping check. */
  earlyStopping(history: number[], patience: number = 5, minDelta: number = 0): boolean {
    if (history.length < patience + 1) return false;
    const best = Math.min(...history.slice(0, -patience));
    const recent = history.slice(-patience);
    return recent.every(v => v > best - minDelta);
  }

  /** Compute perplexity from log-probabilities. */
  perplexity(logProbs: number[]): number {
    const avg = logProbs.reduce((s, v) => s + v, 0) / Math.max(1, logProbs.length);
    return Math.exp(-avg);
  }

  /** Compute BLEU score. */
  bleuScore(reference: number[], candidate: number[], maxN: number = 4): number {
    let score = 1;
    let reflen = reference.length;
    let candlen = candidate.length;
    for (let n = 1; n <= maxN; n++) {
      const refNgrams: Map<string, number> = new Map();
      for (let i = 0; i <= reference.length - n; i++) {
        const k = reference.slice(i, i + n).join(',');
        refNgrams.set(k, (refNgrams.get(k) ?? 0) + 1);
      }
      let matches = 0;
      let total = 0;
      for (let i = 0; i <= candidate.length - n; i++) {
        const k = candidate.slice(i, i + n).join(',');
        total++;
        if (refNgrams.has(k) && (refNgrams.get(k) ?? 0) > 0) {
          matches++;
          refNgrams.set(k, (refNgrams.get(k) ?? 0) - 1);
        }
      }
      score *= total === 0 ? 0 : matches / total;
    }
    const bp = candlen > reflen ? 1 : Math.exp(1 - reflen / Math.max(1, candlen));
    return bp * Math.pow(score, 1 / maxN);
  }

  /** Label smoothing. */
  labelSmoothing(labels: number[], numClasses: number, smoothing: number = 0.1): number[][] {
    return labels.map(l => {
      const out = new Array(numClasses).fill(smoothing / numClasses);
      out[l] += 1 - smoothing;
      return out;
    });
  }

  /** One-hot encode labels. */
  oneHot(labels: number[], numClasses: number): number[][] {
    return labels.map(l => {
      const out = new Array(numClasses).fill(0);
      out[l] = 1;
      return out;
    });
  }

  // ---------------------------------------------------------------------------
  // Model inspection and utilities
  // ---------------------------------------------------------------------------

  /** Count total parameters in a network. */
  countParameters(network: Network): number {
    let count = 0;
    for (const layer of network.layers) {
      for (const row of layer.weights) count += row.length;
      count += layer.biases.length;
    }
    return count;
  }

  /** Get network architecture summary. */
  summary(network: Network): string[] {
    const lines: string[] = [];
    lines.push(`Network: ${network.id}`);
    lines.push(`Input dim: ${network.inputDim}, Output dim: ${network.outputDim}`);
    lines.push(`Loss: ${network.loss}, Optimizer: ${network.optimizer}`);
    lines.push('Layer (type) | Units | Parameters');
    for (const layer of network.layers) {
      const params = layer.weights.flat().length + layer.biases.length;
      lines.push(`${layer.type} | ${layer.units} | ${params}`);
    }
    lines.push(`Total parameters: ${this.countParameters(network)}`);
    return lines;
  }

  /** Save network weights as JSON. */
  serialize(network: Network): string {
    return JSON.stringify({
      id: network.id,
      layers: network.layers.map(l => ({
        type: l.type,
        units: l.units,
        activation: l.activation,
        weights: l.weights,
        biases: l.biases,
      })),
      loss: network.loss,
      optimizer: network.optimizer,
      inputDim: network.inputDim,
      outputDim: network.outputDim,
    });
  }

  /** Deserialize a network from JSON. */
  deserialize(json: string): Network {
    const obj = JSON.parse(json) as Network;
    return obj;
  }

  /** Quantize weights to 8-bit integers. */
  quantizeInt8(weights: number[][]): { quantized: number[][]; scale: number; zeroPoint: number } {
    const flat = weights.flat();
    const max = Math.max(...flat);
    const min = Math.min(...flat);
    const scale = (max - min) / 255;
    const zeroPoint = -Math.floor(min / scale);
    const quantized = weights.map(row => row.map(w => Math.round(w / scale + zeroPoint)));
    return { quantized, scale, zeroPoint };
  }

  /** Magnitude-based pruning. */
  pruneWeights(weights: number[][], sparsity: number): number[][] {
    const threshold = this._percentile(weights.flat().map(Math.abs), sparsity * 100);
    return weights.map(row => row.map(w => Math.abs(w) < threshold ? 0 : w));
  }

  /** Knowledge distillation: soft targets from teacher. */
  distillationLoss(teacherLogits: number[], studentLogits: number[], temperature: number = 4): number {
    const teacher = this.logSoftmax(teacherLogits.map(l => l / temperature));
    const student = this.logSoftmax(studentLogits.map(l => l / temperature));
    return -teacher.reduce((s, t, i) => s + Math.exp(t) * student[i], 0);
  }

  /** Register a network. */
  registerNetwork(network: Network): void {
    this._networks.set(network.id, network);
  }

  /** Get a network by id. */
  getNetwork(id: string): Network | undefined {
    return this._networks.get(id);
  }

  /** List all registered networks. */
  listNetworks(): Network[] {
    return Array.from(this._networks.values());
  }

  /** Get training history. */
  getHistory(): HistoryEntry[] {
    return [...this._history];
  }

  /** Clear training history. */
  clearHistory(): void {
    this._history = [];
  }

  private _gaussian(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2);
  }

  private _matVec(m: number[][], v: number[]): number[] {
    return m.map(row => row.reduce((s, x, i) => s + x * (v[i] ?? 0), 0));
  }

  private _matVecAdd(a: number[], b: number[]): number[] {
    return a.map((v, i) => v + (b[i] ?? 0));
  }

  private _percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p / 100);
    return sorted[idx] ?? 0;
  }

  toPacket(): DataPacket<{ networks: Map<string, Network>; layers: Layer[]; weights: number[][][]; history: HistoryEntry[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'NeuralNetwork'],
      priority: 1,
      phase: 'neural_network',
    };
    return {
      id: `neural-network-${Date.now().toString(36)}`,
      payload: { networks: this._networks, layers: this._layers, weights: this._weights, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._networks = new Map();
    this._layers = [];
    this._weights = [];
    this._history = [];
    this._counter = 0;
  }

  get networkCount(): number { return this._networks.size; }
  get layerCount(): number { return this._layers.length; }
  get historyCount(): number { return this._history.length; }

  private _forwardLayer(layer: Layer, input: number[]): number[] {
    if (layer.weights.length === 0) {
      const out = layer.units > 0 ? new Array(layer.units).fill(0).map((_, i) => this.activation(layer.activation, input[i % input.length] ?? 0)) : input.slice();
      return out;
    }
    const out: number[] = [];
    for (let i = 0; i < layer.units; i++) {
      let z = layer.biases[i] ?? 0;
      for (let j = 0; j < input.length; j++) z += (layer.weights[i]?.[j] ?? 0) * input[j];
      out.push(this.activation(layer.activation, z));
    }
    return out;
  }

  private _backwardLayer(layer: Layer, delta: number[], lr: number): number[] {
    const newDelta: number[] = new Array(layer.weights[0]?.length ?? delta.length).fill(0);
    for (let i = 0; i < layer.units; i++) {
      if (layer.weights[i]) {
        for (let j = 0; j < layer.weights[i].length; j++) {
          layer.weights[i][j] -= lr * delta[i] * (layer.weights[i][j] ?? 0);
          newDelta[j] = (newDelta[j] ?? 0) + delta[i] * (layer.weights[i][j] ?? 0);
        }
      }
      layer.biases[i] -= lr * (delta[i] ?? 0);
    }
    return newDelta;
  }

  private _evalLoss(network: Network, X: number[][], y: number[][]): number {
    let loss = 0;
    for (let i = 0; i < X.length; i++) {
      const acts = this.forward(network, X[i]);
      loss += this.lossFunction(network.loss, y[i], acts[acts.length - 1]);
    }
    return loss / Math.max(1, X.length);
  }

  private _evalAccuracy(network: Network, X: number[][], y: number[][]): number {
    let correct = 0;
    for (let i = 0; i < X.length; i++) {
      const acts = this.forward(network, X[i]);
      const out = acts[acts.length - 1];
      const pred = out.indexOf(Math.max(...out));
      const target = y[i].indexOf(Math.max(...y[i]));
      if (pred === target) correct++;
    }
    return X.length === 0 ? 0 : correct / X.length;
  }
}
