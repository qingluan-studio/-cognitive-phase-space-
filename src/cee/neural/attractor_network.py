"""
attractor_network.py — 吸引子网络模拟器

实现 Hopfield 网络、连续吸引子网络及
基于能量的状态收敛与噪声稳定性分析。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class HopfieldNetwork:
    """离散 Hopfield 联想记忆网络。"""

    def __init__(self, size: int):
        self.size = size
        self.weights = [[0.0] * size for _ in range(size)]
        self.patterns: List[List[int]] = []
        self.energy_history: List[float] = []

    def train_hebbian(self, patterns: List[List[int]]) -> None:
        """使用 Hebbian 规则训练权重矩阵。"""
        self.patterns = [list(p) for p in patterns]
        n = len(patterns)
        for i in range(self.size):
            for j in range(self.size):
                if i == j:
                    self.weights[i][j] = 0.0
                else:
                    self.weights[i][j] = sum(p[i] * p[j] for p in patterns) / n

    def train_storkey(self, patterns: List[List[int]]) -> None:
        """使用 Storkey 学习规则减少串扰。"""
        self.weights = [[0.0] * self.size for _ in range(self.size)]
        for p in patterns:
            h = [sum(self.weights[i][j] * p[j] for j in range(self.size)) for i in range(self.size)]
            for i in range(self.size):
                for j in range(self.size):
                    if i != j:
                        self.weights[i][j] += (p[i] * p[j] - p[i] * h[j] - p[j] * h[i]) / self.size

    def update_sync(self, state: List[int]) -> List[int]:
        """同步更新所有神经元。"""
        new_state = []
        for i in range(self.size):
            h = sum(self.weights[i][j] * state[j] for j in range(self.size))
            new_state.append(1 if h >= 0 else -1)
        return new_state

    def update_async(self, state: List[int], temperature: float = 0.0) -> List[int]:
        """异步随机更新单个神经元，可选温度噪声。"""
        new_state = list(state)
        i = random.randint(0, self.size - 1)
        h = sum(self.weights[i][j] * state[j] for j in range(self.size))
        if temperature > 0:
            prob = 1.0 / (1.0 + math.exp(-2.0 * h / temperature))
            new_state[i] = 1 if random.random() < prob else -1
        else:
            new_state[i] = 1 if h >= 0 else -1
        return new_state

    def energy(self, state: List[int]) -> float:
        """计算网络能量 E = -0.5 * sum_i sum_j w_ij s_i s_j。"""
        e = 0.0
        for i in range(self.size):
            for j in range(self.size):
                e -= 0.5 * self.weights[i][j] * state[i] * state[j]
        return e

    def converge(self, initial: List[int], max_steps: int = 100,
                 async_mode: bool = True, temperature: float = 0.0) -> List[int]:
        """从初始状态收敛到吸引子。"""
        state = list(initial)
        self.energy_history.clear()
        for _ in range(max_steps):
            self.energy_history.append(self.energy(state))
            if async_mode:
                new_state = self.update_async(state, temperature)
            else:
                new_state = self.update_sync(state)
            if new_state == state:
                break
            state = new_state
        return state

    def storage_capacity(self) -> float:
        """理论存储容量 ~ 0.14 * N。"""
        return 0.14 * self.size

    def pattern_overlap(self, state: List[int], pattern_idx: int) -> float:
        """计算状态与某模式的归一化重叠。"""
        if pattern_idx >= len(self.patterns):
            return 0.0
        p = self.patterns[pattern_idx]
        return sum(state[i] * p[i] for i in range(self.size)) / self.size

    def spurious_states(self, trials: int = 100) -> List[List[int]]:
        """通过随机初始化搜索虚假吸引子。"""
        found = []
        seen = set()
        for _ in range(trials):
            init = [random.choice([-1, 1]) for _ in range(self.size)]
            final = self.converge(init)
            key = tuple(final)
            if key not in seen:
                seen.add(key)
                is_pattern = any(final == p for p in self.patterns)
                if not is_pattern:
                    found.append(final)
        return found

    def noise_robustness(self, pattern_idx: int, flip_ratio: float) -> float:
        """测试特定翻转比例下的模式恢复成功率。"""
        if pattern_idx >= len(self.patterns):
            return 0.0
        p = list(self.patterns[pattern_idx])
        flips = int(flip_ratio * self.size)
        indices = random.sample(range(self.size), flips)
        for idx in indices:
            p[idx] *= -1
        recovered = self.converge(p)
        return 1.0 if recovered == self.patterns[pattern_idx] else 0.0


class ContinuousAttractorNetwork:
    """一维连续吸引子网络 (CAN)。"""

    def __init__(self, num_neurons: int, preferred_range: Tuple[float, float] = (-math.pi, math.pi)):
        self.num_neurons = num_neurons
        self.pref_min, self.pref_max = preferred_range
        self.preferred = [self.pref_min + i * (self.pref_max - self.pref_min) / num_neurons
                          for i in range(num_neurons)]
        self.weights = [[0.0] * num_neurons for _ in range(num_neurons)]
        self.activities = [0.0] * num_neurons
        self.tau = 10.0
        self._build_weights()

    def _build_weights(self, sigma: float = 0.5, J0: float = 1.0) -> None:
        """构建高斯型局部兴奋连接。"""
        for i in range(self.num_neurons):
            for j in range(self.num_neurons):
                diff = abs(self.preferred[i] - self.preferred[j])
                diff = min(diff, 2.0 * math.pi - diff)
                self.weights[i][j] = J0 * math.exp(-diff ** 2 / (2.0 * sigma ** 2))

    def bump_input(self, position: float, amplitude: float = 1.0, sigma: float = 0.3) -> List[float]:
        """生成高斯型 bump 输入。"""
        return [amplitude * math.exp(-((p - position) ** 2) / (2.0 * sigma ** 2))
                for p in self.preferred]

    def step(self, dt: float, external_input: List[float]) -> None:
        """网络单步动力学。"""
        recurrent = [sum(self.weights[i][j] * max(0.0, self.activities[j])
                         for j in range(self.num_neurons))
                     for i in range(self.num_neurons)]
        for i in range(self.num_neurons):
            dact = (-self.activities[i] + recurrent[i] + external_input[i]) / self.tau
            self.activities[i] += dt * dact
            self.activities[i] = max(0.0, self.activities[i])

    def center_of_mass(self) -> float:
        """计算活动包络的质心位置。"""
        total = sum(self.activities)
        if total == 0:
            return 0.0
        return sum(p * a for p, a in zip(self.preferred, self.activities)) / total

    def bump_width(self) -> float:
        """估计活动 bump 的半高全宽。"""
        max_act = max(self.activities)
        if max_act <= 0:
            return 0.0
        half = max_act / 2.0
        above = [i for i, a in enumerate(self.activities) if a >= half]
        if not above:
            return 0.0
        span = (max(above) - min(above)) * (self.pref_max - self.pref_min) / self.num_neurons
        return span

    def path_integration(self, velocity: float, dt: float, duration: float) -> List[float]:
        """模拟路径积分过程。"""
        positions = []
        current_pos = self.center_of_mass()
        steps = int(duration / dt)
        for _ in range(steps):
            current_pos += velocity * dt
            inp = self.bump_input(current_pos)
            self.step(dt, inp)
            positions.append(self.center_of_mass())
        return positions

    def reset(self) -> None:
        """重置活动。"""
        self.activities = [0.0] * self.num_neurons

    def network_gain(self) -> float:
        """估算网络增益。"""
        return sum(max(0.0, a) for a in self.activities)

    def tuning_curve(self, neuron_idx: int, positions: List[float]) -> List[float]:
        """测量特定神经元的调谐曲线。"""
        responses = []
        for pos in positions:
            inp = self.bump_input(pos)
            self.reset()
            for _ in range(100):
                self.step(0.1, inp)
            responses.append(self.activities[neuron_idx])
        return responses
