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
