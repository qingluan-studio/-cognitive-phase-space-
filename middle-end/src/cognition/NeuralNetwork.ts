export interface NeuronState {
  activation: number;
  bias: number;
  delta: number;
}

export interface NetworkLayer {
  neurons: NeuronState[];
  weights: number[][];
}

export class NeuralNetwork {
  private _layers: NetworkLayer[];
  private _learningRate: number;
  private _activation: 'sigmoid' | 'tanh' | 'relu';
  private _history: { epoch: number; error: number }[];
  private _inputSize: number;
  private _outputSize: number;

  constructor(layerSizes: number[], learningRate: number = 0.1, activation: 'sigmoid' | 'tanh' | 'relu' = 'sigmoid') {
    this._layers = [];
    this._learningRate = learningRate;
    this._activation = activation;
    this._history = [];
    this._inputSize = layerSizes[0];
    this._outputSize = layerSizes[layerSizes.length - 1];
    for (let l = 1; l < layerSizes.length; l++) {
      const neurons: NeuronState[] = [];
      const weights: number[][] = [];
      for (let n = 0; n < layerSizes[l]; n++) {
        neurons.push({ activation: 0, bias: Math.random() * 2 - 1, delta: 0 });
        const neuronWeights: number[] = [];
        for (let w = 0; w < layerSizes[l - 1]; w++) {
          neuronWeights.push(Math.random() * 2 - 1);
        }
        weights.push(neuronWeights);
      }
      this._layers.push({ neurons, weights });
    }
  }

  get layerCount(): number { return this._layers.length; }
  get learningRate(): number { return this._learningRate; }
  get activation(): string { return this._activation; }
  get inputSize(): number { return this._inputSize; }
  get outputSize(): number { return this._outputSize; }
  get history(): { epoch: number; error: number }[] { return this._history; }

  public setLearningRate(lr: number): void {
    this._learningRate = lr;
  }

  private _activate(x: number): number {
    if (this._activation === 'sigmoid') return 1 / (1 + Math.exp(-x));
    if (this._activation === 'tanh') return Math.tanh(x);
    return x > 0 ? x : 0.01 * x;
  }

  private _activateDerivative(x: number): number {
    if (this._activation === 'sigmoid') {
      const s = 1 / (1 + Math.exp(-x));
      return s * (1 - s);
    }
    if (this._activation === 'tanh') {
      const t = Math.tanh(x);
      return 1 - t * t;
    }
    return x > 0 ? 1 : 0.01;
  }

  public forward(inputs: number[]): number[] {
    let current = [...inputs];
    for (const layer of this._layers) {
      const next: number[] = [];
      for (let n = 0; n < layer.neurons.length; n++) {
        let sum = layer.neurons[n].bias;
        for (let w = 0; w < current.length; w++) {
          sum += current[w] * layer.weights[n][w];
        }
        layer.neurons[n].activation = this._activate(sum);
        next.push(layer.neurons[n].activation);
      }
      current = next;
    }
    return current;
  }

  public backward(targets: number[]): void {
    const lastLayer = this._layers[this._layers.length - 1];
    for (let n = 0; n < lastLayer.neurons.length; n++) {
      const error = targets[n] - lastLayer.neurons[n].activation;
      lastLayer.neurons[n].delta = error * this._activateDerivative(lastLayer.neurons[n].activation);
    }
    for (let l = this._layers.length - 2; l >= 0; l--) {
      const layer = this._layers[l];
      const nextLayer = this._layers[l + 1];
      for (let n = 0; n < layer.neurons.length; n++) {
        let error = 0;
        for (let nn = 0; nn < nextLayer.neurons.length; nn++) {
          error += nextLayer.neurons[nn].delta * nextLayer.weights[nn][n];
        }
        layer.neurons[n].delta = error * this._activateDerivative(layer.neurons[n].activation);
      }
    }
  }

  public update(inputs: number[]): void {
    let current = [...inputs];
    for (let l = 0; l < this._layers.length; l++) {
      const layer = this._layers[l];
      for (let n = 0; n < layer.neurons.length; n++) {
        layer.neurons[n].bias += this._learningRate * layer.neurons[n].delta;
        for (let w = 0; w < current.length; w++) {
          layer.weights[n][w] += this._learningRate * layer.neurons[n].delta * current[w];
        }
      }
      current = layer.neurons.map(neuron => neuron.activation);
    }
  }

  public train(inputs: number[][], targets: number[][], epochs: number = 1000): void {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;
      for (let i = 0; i < inputs.length; i++) {
        const output = this.forward(inputs[i]);
        this.backward(targets[i]);
        this.update(inputs[i]);
        for (let j = 0; j < output.length; j++) {
          totalError += (targets[i][j] - output[j]) ** 2;
        }
      }
      this._history.push({ epoch, error: totalError / inputs.length });
    }
  }

  public predict(inputs: number[]): number[] {
    return this.forward(inputs);
  }

  public computeAccuracy(inputs: number[][], targets: number[][]): number {
    let correct = 0;
    for (let i = 0; i < inputs.length; i++) {
      const output = this.predict(inputs[i]);
      const pred = output.indexOf(Math.max(...output));
      const actual = targets[i].indexOf(Math.max(...targets[i]));
      if (pred === actual) correct++;
    }
    return correct / inputs.length;
  }

  public computeLoss(inputs: number[][], targets: number[][]): number {
    let loss = 0;
    for (let i = 0; i < inputs.length; i++) {
      const output = this.predict(inputs[i]);
      for (let j = 0; j < output.length; j++) {
        loss += (targets[i][j] - output[j]) ** 2;
      }
    }
    return loss / inputs.length;
  }

  public getWeights(layerIndex: number): number[][] {
    if (layerIndex < 0 || layerIndex >= this._layers.length) return [];
    return this._layers[layerIndex].weights.map(row => [...row]);
  }

  public getActivations(layerIndex: number): number[] {
    if (layerIndex < 0 || layerIndex >= this._layers.length) return [];
    return this._layers[layerIndex].neurons.map(n => n.activation);
  }

  public regularize(lambda: number): void {
    for (const layer of this._layers) {
      for (let n = 0; n < layer.neurons.length; n++) {
        for (let w = 0; w < layer.weights[n].length; w++) {
          layer.weights[n][w] *= (1 - this._learningRate * lambda);
        }
      }
    }
  }

  public computeGradientNorm(): number {
    let norm = 0;
    for (const layer of this._layers) {
      for (const neuron of layer.neurons) {
        norm += neuron.delta ** 2;
      }
    }
    return Math.sqrt(norm);
  }

  public reset(): void {
    for (const layer of this._layers) {
      for (const neuron of layer.neurons) {
        neuron.activation = 0;
        neuron.delta = 0;
      }
      for (let n = 0; n < layer.neurons.length; n++) {
        for (let w = 0; w < layer.weights[n].length; w++) {
          layer.weights[n][w] = Math.random() * 2 - 1;
        }
        layer.neurons[n].bias = Math.random() * 2 - 1;
      }
    }
    this._history = [];
  }

  public exportStructure(): NetworkLayer[] {
    return this._layers.map(layer => ({
      neurons: layer.neurons.map(n => ({ ...n })),
      weights: layer.weights.map(row => [...row])
    }));
  }
}
