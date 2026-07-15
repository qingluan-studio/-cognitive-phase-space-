"""
hebbian_learning.py — 赫布学习引擎

实现经典 Hebbian 规则、Oja 规则、BCM 理论、
以及基于 STDP 的突触可塑性模拟。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class HebbianRule:
    """经典 Hebbian 学习规则的数值实现。"""

    def __init__(self, learning_rate: float = 0.01, decay: float = 0.001):
        self.learning_rate = learning_rate
        self.decay = decay

    def update(self, pre_activity: float, post_activity: float, weight: float) -> float:
        """标准 Hebb 更新: dw = eta * pre * post - decay * w。"""
        dw = self.learning_rate * pre_activity * post_activity - self.decay * weight
        return weight + dw

    def covariance_rule(self, pre: float, post: float, pre_mean: float, post_mean: float, weight: float) -> float:
        """协方差规则: dw = eta * (pre - pre_mean) * (post - post_mean)。"""
        dw = self.learning_rate * (pre - pre_mean) * (post - post_mean)
        return weight + dw - self.decay * weight

    def activity_dependent_decay(self, weight: float, activity: float, target: float = 1.0) -> float:
        """活动依赖的突触衰减。"""
        return weight + self.learning_rate * activity * (target - weight) - self.decay * weight

    def competitive_hebbian(self, weights: List[float], pre: float, post_activities: List[float], winner_idx: int) -> List[float]:
        """竞争型 Hebbian 仅强化胜者突触。"""
        new_weights = list(weights)
        for i, post in enumerate(post_activities):
            if i == winner_idx:
                new_weights[i] += self.learning_rate * pre * post
            else:
                new_weights[i] -= self.learning_rate * pre * post * 0.5
            new_weights[i] = max(0.0, new_weights[i])
        return new_weights

    def rate_based_plasticity(self, pre_rates: List[float], post_rates: List[float],
                              weight_matrix: List[List[float]], steps: int = 100) -> List[List[float]]:
        """对完整权重矩阵进行多步率型可塑性更新。"""
        W = [row[:] for row in weight_matrix]
        for _ in range(steps):
            for i, pre in enumerate(pre_rates):
                for j, post in enumerate(post_rates):
                    W[i][j] = self.update(pre, post, W[i][j])
        return W

    def normalization(self, weights: List[float], target_sum: float = 1.0) -> List[float]:
        """突触权重的和归一化。"""
        total = sum(weights)
        if total > 0:
            scale = target_sum / total
            return [w * scale for w in weights]
        return weights

    def multiplicative_constraint(self, weights: List[float], target: float = 1.0) -> List[float]:
        """乘性约束归一化。"""
        total = sum(weights)
        if total > 0:
            return [w * (target / total) for w in weights]
        return weights

    def clipping(self, weights: List[float], w_min: float = 0.0, w_max: float = 1.0) -> List[float]:
        """将权重裁剪到指定范围。"""
        return [min(w_max, max(w_min, w)) for w in weights]


class OjaRule:
    """Oja 学习规则：带归一化的 Hebbian 学习。"""

    def __init__(self, learning_rate: float = 0.01, alpha: float = 1.0):
        self.learning_rate = learning_rate
        self.alpha = alpha

    def update(self, pre: float, post: float, weight: float) -> float:
        """Oja 更新: dw = eta * (post * pre - alpha * post^2 * w)。"""
        dw = self.learning_rate * (post * pre - self.alpha * post * post * weight)
        return weight + dw

    def batch_update(self, inputs: List[List[float]], weights: List[float],
                     steps: int = 100) -> List[float]:
        """批量输入下的权重更新。"""
        W = list(weights)
        for _ in range(steps):
            for x in inputs:
                post = sum(xi * wi for xi, wi in zip(x, W))
                for i in range(len(W)):
                    W[i] = self.update(x[i], post, W[i])
        return W

    def principal_component(self, inputs: List[List[float]], dim: int = 1,
                            steps: int = 500) -> List[List[float]]:
        """使用 Oja 规则提取主成分方向。"""
        n = len(inputs[0])
        W = [[random.uniform(-0.1, 0.1) for _ in range(n)] for _ in range(dim)]
        for _ in range(steps):
            for x in inputs:
                for j in range(dim):
                    post = sum(x[i] * W[j][i] for i in range(n))
                    for i in range(n):
                        W[j][i] += self.learning_rate * (post * x[i] - self.alpha * post * post * W[j][i])
        return W

    def stability_analysis(self, weight: float, pre_var: float, post_var: float) -> bool:
        """分析单突触的局部稳定性。"""
        jacobian = 1.0 - self.learning_rate * self.alpha * post_var
        return abs(jacobian) < 1.0

    def forgetting_curve(self, initial_weight: float, trials: int) -> List[float]:
        """模拟无输入时的遗忘曲线。"""
        weights = [initial_weight]
        w = initial_weight
        for _ in range(trials):
            w *= (1.0 - self.learning_rate * 0.1)
            weights.append(w)
        return weights

    def synaptic_drift(self, weights: List[float], noise_std: float = 0.01) -> List[float]:
        """加入随机漂移的突触权重。"""
        return [w + random.gauss(0.0, noise_std) for w in weights]


class BCMTheory:
    """BCM (Bienenstock-Cooper-Munro) 可塑性理论实现。"""

    def __init__(self, learning_rate: float = 0.01, tau_theta: float = 10.0):
        self.learning_rate = learning_rate
        self.tau_theta = tau_theta
        self.theta = 0.0

    def update_threshold(self, post_history: List[float], dt: float = 1.0) -> None:
        """更新滑动阈值 theta_M = <post>^2。"""
        if post_history:
            mean_post = sum(post_history) / len(post_history)
            target = mean_post ** 2
            self.theta += (target - self.theta) * dt / self.tau_theta

    def update(self, pre: float, post: float, weight: float) -> float:
        """BCM 更新: dw = eta * pre * post * (post - theta_M)。"""
        dw = self.learning_rate * pre * post * (post - self.theta)
        return weight + dw

    def homeostatic_regulation(self, post_activity: float, target: float = 0.5,
                               gain: float = 0.001) -> float:
        """稳态调节因子。"""
        return 1.0 + gain * (target - post_activity)

    def selective_potentiation(self, pre: float, post: float, weight: float,
                                low_threshold: float = 0.2) -> float:
        """低阈值下的选择性增强。"""
        effective_theta = max(self.theta, low_threshold)
        dw = self.learning_rate * pre * post * (post - effective_theta)
        return max(0.0, weight + dw)

    def metaplasticity(self, weight: float, history: List[float]) -> float:
        """元可塑性：根据历史修改学习率。"""
        if len(history) < 2:
            return self.learning_rate
        variance = sum((h - sum(history) / len(history)) ** 2 for h in history) / len(history)
        return self.learning_rate / (1.0 + variance)

    def rate_normalization(self, weights: List[float], target_rate: float = 1.0) -> List[float]:
        """基于目标发放率的归一化。"""
        total = sum(weights)
        if total > 0:
            scale = target_rate / total
            return [w * scale for w in weights]
        return weights

    def threshold_history(self, duration: int) -> List[float]:
        """模拟阈值随时间的演化历史。"""
        history = [self.theta]
        for _ in range(duration):
            self.theta *= 0.99
            history.append(self.theta)
        return history

    def bcm_window(self, pre_trace: float, post_trace: float, weight: float) -> float:
        """使用迹(trace)的 BCM 更新。"""
        dw = self.learning_rate * pre_trace * post_trace * (post_trace - self.theta)
        return weight + dw


class STDP:
    """Spike-Timing-Dependent Plasticity (STDP) 实现。"""

    def __init__(self, a_plus: float = 0.01, a_minus: float = 0.0105,
                 tau_plus: float = 20.0, tau_minus: float = 20.0):
        self.a_plus = a_plus
        self.a_minus = a_minus
        self.tau_plus = tau_plus
        self.tau_minus = tau_minus

    def dw(self, delta_t: float) -> float:
        """根据 pre-post 时间差计算权重变化。"""
        if delta_t > 0:
            return self.a_plus * math.exp(-delta_t / self.tau_plus)
        else:
            return -self.a_minus * math.exp(delta_t / self.tau_minus)

    def pair_based_update(self, pre_spikes: List[float], post_spikes: List[float],
                          weight: float) -> float:
        """基于所有 spike pair 的权重更新。"""
        delta = 0.0
        for t_pre in pre_spikes:
            for t_post in post_spikes:
                delta += self.dw(t_post - t_pre)
        return weight + delta

    def triplet_rule(self, pre_spikes: List[float], post_spikes: List[float],
                     weight: float) -> float:
        """简化的 triplet STDP 规则。"""
        delta = 0.0
        for t_post in post_spikes:
            for t_pre in pre_spikes:
                dt = t_post - t_pre
                if dt > 0:
                    r1 = sum(math.exp(-(t_post - t) / self.tau_plus)
                             for t in pre_spikes if t < t_post)
                    delta += self.a_plus * r1 * math.exp(-dt / self.tau_plus)
                elif dt < 0:
                    o1 = sum(math.exp(-(t - t_pre) / self.tau_minus)
                             for t in post_spikes if t > t_pre)
                    delta -= self.a_minus * o1 * math.exp(dt / self.tau_minus)
        return weight + delta

    def weight_dependence(self, delta: float, weight: float, w_max: float = 1.0,
                          mu: float = 0.4) -> float:
        """权重依赖的 STDP 更新。"""
        if delta > 0:
            return delta * (w_max - weight) ** mu
        else:
            return delta * weight ** mu

    def soft_bound_update(self, pre_spikes: List[float], post_spikes: List[float],
                          weight: float, w_max: float = 1.0) -> float:
        """软边界 STDP 更新。"""
        raw = self.pair_based_update(pre_spikes, post_spikes, 0.0) - weight
        if raw > 0:
            return weight + raw * (w_max - weight)
        else:
            return weight + raw * weight

    def frequency_dependence(self, rate: float, weight: float) -> float:
        """频率依赖的突触效率调制。"""
        factor = 1.0 / (1.0 + math.exp(-(rate - 20.0) / 5.0))
        return weight * factor
