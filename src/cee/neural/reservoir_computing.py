"""
reservoir_computing.py — 储层计算引擎

实现 Echo State Network (ESN) 与 Liquid State Machine (LSM)，
支持储层特性分析 (谱半径、记忆容量) 与在线学习。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional, Callable


class EchoStateNetwork:
    """回声状态网络 (ESN) 实现。"""

    def __init__(self, n_inputs: int, n_reservoir: int, n_outputs: int,
                 spectral_radius: float = 0.9, leaking_rate: float = 0.3):
        self.n_inputs = n_inputs
        self.n_reservoir = n_reservoir
        self.n_outputs = n_outputs
        self.spectral_radius = spectral_radius
        self.leaking_rate = leaking_rate
        self.W_in = self._init_input_weights()
        self.W_res = self._init_reservoir_weights()
        self.W_out = [[0.0] * (n_reservoir + n_inputs) for _ in range(n_outputs)]
        self.state = [0.0] * n_reservoir
        self.state_history: List[List[float]] = []

    def _init_input_weights(self) -> List[List[float]]:
        """初始化输入权重。"""
        return [[random.uniform(-1.0, 1.0) for _ in range(self.n_inputs)]
                for _ in range(self.n_reservoir)]

    def _init_reservoir_weights(self) -> List[List[float]]:
        """初始化并缩放储层权重至指定谱半径。"""
        W = [[random.uniform(-1.0, 1.0) if random.random() < 0.1 else 0.0
              for _ in range(self.n_reservoir)]
             for _ in range(self.n_reservoir)]
        current_radius = self._approximate_spectral_radius(W)
        if current_radius > 0:
            scale = self.spectral_radius / current_radius
            W = [[w * scale for w in row] for row in W]
        return W

    def _approximate_spectral_radius(self, W: List[List[float]]) -> float:
        """通过幂迭代近似谱半径。"""
        n = len(W)
        vec = [random.random() for _ in range(n)]
        norm = math.sqrt(sum(v * v for v in vec))
        vec = [v / norm for v in vec]
        for _ in range(50):
            new = [sum(W[i][j] * vec[j] for j in range(n)) for i in range(n)]
            norm = math.sqrt(sum(v * v for v in new))
            vec = [v / norm for v in new]
        return norm

    def update(self, input_vec: List[float]) -> List[float]:
        """单步更新储层状态。"""
        pre = [math.tanh(sum(self.W_res[i][j] * self.state[j] for j in range(self.n_reservoir)) +
                         sum(self.W_in[i][j] * input_vec[j] for j in range(self.n_inputs)))
               for i in range(self.n_reservoir)]
        self.state = [(1.0 - self.leaking_rate) * self.state[i] + self.leaking_rate * pre[i]
                      for i in range(self.n_reservoir)]
        self.state_history.append(list(self.state))
        return list(self.state)

    def readout(self) -> List[float]:
        """线性读出层。"""
        extended = self.state + [0.0] * self.n_inputs
        return [sum(self.W_out[i][j] * extended[j]
                    for j in range(len(extended))) for i in range(self.n_outputs)]

    def train_ridge_regression(self, targets: List[List[float]], lambda_reg: float = 0.01) -> None:
        """使用岭回归训练读出权重。"""
        if not self.state_history or not targets:
            return
        X = [list(s) + [0.0] * self.n_inputs for s in self.state_history]
        Y = targets
        self.W_out = self._ridge_solve(X, Y, lambda_reg)

    def _ridge_solve(self, X: List[List[float]], Y: List[List[float]], lam: float) -> List[List[float]]:
        """简化的批量梯度下降求解岭回归。"""
        n_samples = len(X)
        n_features = len(X[0])
        n_out = len(Y[0])
        W = [[0.0] * n_features for _ in range(n_out)]
        lr = 0.01
        for _ in range(500):
            grad = [[0.0] * n_features for _ in range(n_out)]
            for xi, yi in zip(X, Y):
                pred = [sum(W[o][j] * xi[j] for j in range(n_features)) for o in range(n_out)]
                for o in range(n_out):
                    for j in range(n_features):
                        grad[o][j] += (pred[o] - yi[o]) * xi[j] + lam * W[o][j]
            for o in range(n_out):
                for j in range(n_features):
                    W[o][j] -= lr * grad[o][j] / n_samples
        return W

    def reset(self) -> None:
        """重置储层状态。"""
        self.state = [0.0] * self.n_reservoir
        self.state_history.clear()

    def memory_capacity(self, max_lag: int = 20, trials: int = 1000) -> List[float]:
        """测量不同延迟下的记忆容量。"""
        capacities = []
        self.reset()
        inputs = [random.uniform(-1.0, 1.0) for _ in range(trials)]
        for lag in range(1, max_lag + 1):
            states = []
            targets = []
            self.reset()
            for t in range(trials):
                self.update([inputs[t]])
                if t >= lag:
                    states.append(list(self.state))
                    targets.append([inputs[t - lag]])
            if states:
                W = self._ridge_solve(states, targets, 0.001)
                preds = [[sum(W[0][j] * s[j] for j in range(len(s)))] for s in states]
                var_t = sum(t[0] ** 2 for t in targets) / len(targets)
                mse = sum((p[0] - t[0]) ** 2 for p, t in zip(preds, targets)) / len(targets)
                cap = max(0.0, 1.0 - mse / var_t) if var_t > 0 else 0.0
                capacities.append(cap)
            else:
                capacities.append(0.0)
        return capacities

    def spectral_analysis(self) -> Dict[str, float]:
        """返回储层的谱分析指标。"""
        return {
            "spectral_radius": self.spectral_radius,
            "reservoir_size": self.n_reservoir,
            "connectivity": sum(1 for row in self.W_res for w in row if w != 0.0) / (self.n_reservoir ** 2),
            "mean_weight": sum(sum(row) for row in self.W_res) / (self.n_reservoir ** 2),
        }

    def intrinsic_dimensionality(self, samples: int = 500) -> float:
        """使用参与率估算储层内在维度。"""
        self.reset()
        for _ in range(samples):
            inp = [random.uniform(-1.0, 1.0) for _ in range(self.n_inputs)]
            self.update(inp)
        cov = self._covariance_matrix(self.state_history)
        trace = sum(cov[i][i] for i in range(len(cov)))
        trace_sq = sum(cov[i][j] ** 2 for i in range(len(cov)) for j in range(len(cov)))
        return trace ** 2 / trace_sq if trace_sq > 0 else 0.0

    def _covariance_matrix(self, data: List[List[float]]) -> List[List[float]]:
        """计算协方差矩阵。"""
        n = len(data)
        dim = len(data[0])
        means = [sum(data[i][j] for i in range(n)) / n for j in range(dim)]
        cov = [[0.0] * dim for _ in range(dim)]
        for i in range(dim):
            for j in range(dim):
                cov[i][j] = sum((data[k][i] - means[i]) * (data[k][j] - means[j]) for k in range(n)) / n
        return cov

    def feedback_output(self, input_vec: List[float], feedback: List[float]) -> List[float]:
        """支持输出反馈的更新。"""
        extended_input = input_vec + feedback
        pre = [math.tanh(sum(self.W_res[i][j] * self.state[j] for j in range(self.n_reservoir)) +
                         sum(self.W_in[i][min(j, self.n_inputs - 1)] * extended_input[j]
                             for j in range(len(extended_input))))
               for i in range(self.n_reservoir)]
        self.state = [(1.0 - self.leaking_rate) * self.state[i] + self.leaking_rate * pre[i]
                      for i in range(self.n_reservoir)]
        return self.readout()
