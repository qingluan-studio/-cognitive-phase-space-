"""
gradient_descent.py — 梯度下降优化引擎

实现批量、随机与小批量梯度下降，
支持动量、AdaGrad、RMSprop 与 Adam 优化器。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class GradientDescent:
    """梯度下降优化器。"""

    def __init__(self, learning_rate: float = 0.01):
        self.lr = learning_rate

    def optimize(self, f: Callable[[List[float]], float],
                 grad_f: Callable[[List[float]], List[float]],
                 x0: List[float], steps: int = 1000) -> List[float]:
        """标准梯度下降。"""
        x = list(x0)
        for _ in range(steps):
            g = grad_f(x)
            for i in range(len(x)):
                x[i] -= self.lr * g[i]
        return x

    def momentum_optimize(self, f: Callable[[List[float]], float],
                          grad_f: Callable[[List[float]], List[float]],
                          x0: List[float], steps: int = 1000,
                          momentum: float = 0.9) -> List[float]:
        """带动量的梯度下降。"""
        x = list(x0)
        v = [0.0] * len(x0)
        for _ in range(steps):
            g = grad_f(x)
            for i in range(len(x)):
                v[i] = momentum * v[i] + self.lr * g[i]
                x[i] -= v[i]
        return x

    def nesterov_optimize(self, f: Callable[[List[float]], float],
                          grad_f: Callable[[List[float]], List[float]],
                          x0: List[float], steps: int = 1000,
                          momentum: float = 0.9) -> List[float]:
        """Nesterov 加速梯度下降。"""
        x = list(x0)
        v = [0.0] * len(x0)
        for _ in range(steps):
            lookahead = [x[i] - momentum * v[i] for i in range(len(x))]
            g = grad_f(lookahead)
            for i in range(len(x)):
                v[i] = momentum * v[i] + self.lr * g[i]
                x[i] -= v[i]
        return x

    def adagrad_optimize(self, f: Callable[[List[float]], float],
                         grad_f: Callable[[List[float]], List[float]],
                         x0: List[float], steps: int = 1000,
                         epsilon: float = 1e-8) -> List[float]:
        """AdaGrad 优化。"""
        x = list(x0)
        cache = [0.0] * len(x0)
        for _ in range(steps):
            g = grad_f(x)
            for i in range(len(x)):
                cache[i] += g[i] ** 2
                x[i] -= self.lr * g[i] / math.sqrt(cache[i] + epsilon)
        return x

    def rmsprop_optimize(self, f: Callable[[List[float]], float],
                         grad_f: Callable[[List[float]], List[float]],
                         x0: List[float], steps: int = 1000,
                         decay: float = 0.9, epsilon: float = 1e-8) -> List[float]:
        """RMSprop 优化。"""
        x = list(x0)
        cache = [0.0] * len(x0)
        for _ in range(steps):
            g = grad_f(x)
            for i in range(len(x)):
                cache[i] = decay * cache[i] + (1.0 - decay) * g[i] ** 2
                x[i] -= self.lr * g[i] / math.sqrt(cache[i] + epsilon)
        return x

    def adam_optimize(self, f: Callable[[List[float]], float],
                      grad_f: Callable[[List[float]], List[float]],
                      x0: List[float], steps: int = 1000,
                      beta1: float = 0.9, beta2: float = 0.999,
                      epsilon: float = 1e-8) -> List[float]:
        """Adam 优化。"""
        x = list(x0)
        m = [0.0] * len(x0)
        v = [0.0] * len(x0)
        for t in range(1, steps + 1):
            g = grad_f(x)
            for i in range(len(x)):
                m[i] = beta1 * m[i] + (1.0 - beta1) * g[i]
                v[i] = beta2 * v[i] + (1.0 - beta2) * g[i] ** 2
                m_hat = m[i] / (1.0 - beta1 ** t)
                v_hat = v[i] / (1.0 - beta2 ** t)
                x[i] -= self.lr * m_hat / (math.sqrt(v_hat) + epsilon)
        return x

    def stochastic_gradient_descent(self, data: List[Tuple[List[float], float]],
                                    model: Callable[[List[float], List[float]], float],
                                    grad_model: Callable[[List[float], List[float], float], List[float]],
                                    x0: List[float], epochs: int = 100,
                                    batch_size: int = 1) -> List[float]:
        """随机/小批量梯度下降。"""
        x = list(x0)
        n = len(data)
        for epoch in range(epochs):
            indices = list(range(n))
            random.shuffle(indices)
            for start in range(0, n, batch_size):
                batch = [data[i] for i in indices[start:start + batch_size]]
                grad_sum = [0.0] * len(x)
                for inp, target in batch:
                    g = grad_model(x, inp, target)
                    for i in range(len(x)):
                        grad_sum[i] += g[i]
                for i in range(len(x)):
                    x[i] -= self.lr * grad_sum[i] / len(batch)
        return x

    def line_search(self, f: Callable[[List[float]], float],
                    x: List[float], direction: List[float],
                    alpha: float = 1.0, c: float = 0.5,
                    rho: float = 0.5, max_iter: int = 20) -> float:
        """回溯线搜索。"""
        fx = f(x)
        grad_dot_dir = sum(direction[i] ** 2 for i in range(len(x)))
        for _ in range(max_iter):
            x_new = [x[i] + alpha * direction[i] for i in range(len(x))]
            if f(x_new) <= fx + c * alpha * grad_dot_dir:
                return alpha
            alpha *= rho
        return alpha

    def conjugate_gradient(self, f: Callable[[List[float]], float],
                           grad_f: Callable[[List[float]], List[float]],
                           x0: List[float], steps: int = 100) -> List[float]:
        """非线性共轭梯度法（Fletcher-Reeves）。"""
        x = list(x0)
        g = grad_f(x)
        d = [-gi for gi in g]
        for _ in range(steps):
            alpha = self.line_search(f, x, d)
            for i in range(len(x)):
                x[i] += alpha * d[i]
            g_new = grad_f(x)
            beta = sum(g_new[i] ** 2 for i in range(len(x))) / sum(gi ** 2 for gi in g) if sum(gi ** 2 for gi in g) > 0 else 0.0
            for i in range(len(x)):
                d[i] = -g_new[i] + beta * d[i]
            g = g_new
        return x

    def convergence_rate(self, history: List[float]) -> float:
        """估算收敛速率。"""
        if len(history) < 3:
            return 0.0
        ratios = [abs(history[i] - history[-1]) / abs(history[i - 1] - history[-1])
                  for i in range(1, len(history)) if abs(history[i - 1] - history[-1]) > 1e-10]
        return sum(ratios) / len(ratios) if ratios else 0.0

    def numerical_gradient(self, f: Callable[[List[float]], float],
                           x: List[float], eps: float = 1e-5) -> List[float]:
        """数值梯度。"""
        grad = []
        for i in range(len(x)):
            x_plus = list(x)
            x_minus = list(x)
            x_plus[i] += eps
            x_minus[i] -= eps
            grad.append((f(x_plus) - f(x_minus)) / (2.0 * eps))
        return grad

    def hessian_approx(self, f: Callable[[List[float]], float],
                       x: List[float], eps: float = 1e-4) -> List[List[float]]:
        """数值 Hessian 近似。"""
        n = len(x)
        h = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                x_pp = list(x); x_pp[i] += eps; x_pp[j] += eps
                x_pm = list(x); x_pm[i] += eps; x_pm[j] -= eps
                x_mp = list(x); x_mp[i] -= eps; x_mp[j] += eps
                x_mm = list(x); x_mm[i] -= eps; x_mm[j] -= eps
                h[i][j] = (f(x_pp) - f(x_pm) - f(x_mp) + f(x_mm)) / (4.0 * eps * eps)
        return h

    def condition_number(self, hessian: List[List[float]]) -> float:
        """Hessian 条件数（简化谱半径比）。"""
        n = len(hessian)
        if n == 0:
            return 0.0
        trace = sum(hessian[i][i] for i in range(n))
        det_approx = trace / n
        return max(trace, 1.0) / max(det_approx, 1e-10)
