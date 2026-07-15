"""
spiking_neuron.py — 脉冲神经网络模拟器

实现基于 LIF (Leaky Integrate-and-Fire) 与 Izhikevich 模型的
脉冲神经元网络，支持 STDP 学习与群体编码。
"""

from __future__ import annotations

import math
import random
from typing import List, Dict, Tuple, Optional, Callable


class LIFNeuron:
    """漏电积分发放 (LIF) 神经元模型。"""

    def __init__(self, tau_m: float = 20.0, v_rest: float = -65.0,
                 v_threshold: float = -50.0, v_reset: float = -65.0,
                 r_input: float = 1.0):
        self.tau_m = tau_m
        self.v_rest = v_rest
        self.v_threshold = v_threshold
        self.v_reset = v_reset
        self.r_input = r_input
        self.v = v_rest
        self.spike_times: List[float] = []
        self.refractory_until = 0.0
        self.refractory_period = 2.0

    def reset(self) -> None:
        """重置神经元到静息状态。"""
        self.v = self.v_rest
        self.spike_times.clear()
        self.refractory_until = 0.0

    def step(self, dt: float, I_ext: float, t: float) -> bool:
        """单步积分，若发放则返回 True。"""
        if t < self.refractory_until:
            self.v = self.v_reset
            return False
        dv = (-(self.v - self.v_rest) + self.r_input * I_ext) / self.tau_m
        self.v += dv * dt
        if self.v >= self.v_threshold:
            self.v = self.v_reset
            self.spike_times.append(t)
            self.refractory_until = t + self.refractory_period
            return True
        return False

    def firing_rate(self, t_start: float, t_end: float) -> float:
        """计算时间窗口内的平均发放率 (Hz)。"""
        count = sum(1 for ts in self.spike_times if t_start <= ts <= t_end)
        duration = t_end - t_start
        return count / duration * 1000.0 if duration > 0 else 0.0

    def membrane_potential(self) -> float:
        """返回当前膜电位。"""
        return self.v

    def isi_distribution(self) -> List[float]:
        """返回发放间隔 (ISI) 列表。"""
        if len(self.spike_times) < 2:
            return []
        return [self.spike_times[i] - self.spike_times[i - 1]
                for i in range(1, len(self.spike_times))]

    def cv_coefficient(self) -> float:
        """计算发放间隔的变异系数 (CV)。"""
        isis = self.isi_distribution()
        if len(isis) < 2:
            return 0.0
        mean = sum(isis) / len(isis)
        variance = sum((x - mean) ** 2 for x in isis) / len(isis)
        std = math.sqrt(variance)
        return std / mean if mean > 0 else 0.0

    def copy(self) -> LIFNeuron:
        """返回具有相同参数的副本神经元。"""
        return LIFNeuron(self.tau_m, self.v_rest, self.v_threshold,
                         self.v_reset, self.r_input)


class IzhikevichNeuron:
    """Izhikevich 双变量神经元模型，支持多种放电模式。"""

    def __init__(self, a: float = 0.02, b: float = 0.2,
                 c: float = -65.0, d: float = 8.0):
        self.a = a
        self.b = b
        self.c = c
        self.d = d
        self.v = -65.0
        self.u = self.b * self.v
        self.spike_times: List[float] = []

    def reset(self) -> None:
        """重置神经元。"""
        self.v = -65.0
        self.u = self.b * self.v
        self.spike_times.clear()

    def step(self, dt: float, I_ext: float, t: float) -> bool:
        """单步积分。"""
        self.v += dt * (0.04 * self.v ** 2 + 5.0 * self.v + 140.0 - self.u + I_ext)
        self.u += dt * self.a * (self.b * self.v - self.u)
        if self.v >= 30.0:
            self.v = self.c
            self.u += self.d
            self.spike_times.append(t)
            return True
        return False

    def set_parameters(self, pattern: str) -> None:
        """根据经典模式设置参数 (regular, bursting, chattering, fast_spiking)。"""
        params = {
            "regular": (0.02, 0.2, -65.0, 8.0),
            "bursting": (0.02, 0.2, -55.0, 4.0),
            "chattering": (0.02, 0.2, -50.0, 2.0),
            "fast_spiking": (0.1, 0.2, -65.0, 2.0),
        }
        if pattern in params:
            self.a, self.b, self.c, self.d = params[pattern]
            self.reset()

    def firing_rate(self, t_start: float, t_end: float) -> float:
        """计算时间窗口内的平均发放率。"""
        count = sum(1 for ts in self.spike_times if t_start <= ts <= t_end)
        duration = t_end - t_start
        return count / duration * 1000.0 if duration > 0 else 0.0

    def membrane_potential(self) -> float:
        """返回当前膜电位。"""
        return self.v

    def recovery_variable(self) -> float:
        """返回恢复变量 u。"""
        return self.u

    def isi_distribution(self) -> List[float]:
        """返回发放间隔列表。"""
        if len(self.spike_times) < 2:
            return []
        return [self.spike_times[i] - self.spike_times[i - 1]
                for i in range(1, len(self.spike_times))]


class SpikingNetwork:
    """脉冲神经网络：支持 LIF 与 Izhikevich 神经元的混合网络。"""

    def __init__(self, num_neurons: int, neuron_type: str = "lif"):
        self.num_neurons = num_neurons
        self.neuron_type = neuron_type
        self.neurons: List[LIFNeuron | IzhikevichNeuron] = []
        self.weights: List[List[float]] = [[0.0] * num_neurons for _ in range(num_neurons)]
        self.delays: List[List[float]] = [[0.0] * num_neurons for _ in range(num_neurons)]
        self.spike_buffer: Dict[int, List[Tuple[float, float]]] = {i: [] for i in range(num_neurons)}
        self.dt = 0.1
        self.t = 0.0

        for _ in range(num_neurons):
            if neuron_type == "lif":
                self.neurons.append(LIFNeuron())
            else:
                self.neurons.append(IzhikevichNeuron())

    def set_weight(self, pre: int, post: int, w: float, delay: float = 0.0) -> None:
        """设置突触连接权重与延迟。"""
        self.weights[pre][post] = w
        self.delays[pre][post] = delay

    def random_connect(self, p: float = 0.3, w_mean: float = 0.5, w_std: float = 0.2) -> None:
        """以概率 p 随机建立连接。"""
        for i in range(self.num_neurons):
            for j in range(self.num_neurons):
                if i != j and random.random() < p:
                    w = random.gauss(w_mean, w_std)
                    self.set_weight(i, j, w, random.uniform(0.0, 5.0))

    def step(self, inputs: List[float]) -> List[bool]:
        """网络单步演化，返回各神经元是否发放。"""
        spikes = []
        for i, neuron in enumerate(self.neurons):
            I_syn = 0.0
            for pre in range(self.num_neurons):
                for spike_time, weight in self.spike_buffer.get(pre, []):
                    if abs(spike_time - self.t) < self.dt:
                        I_syn += weight * self.weights[pre][i]
            fired = neuron.step(self.dt, inputs[i] + I_syn, self.t)
            spikes.append(fired)
            if fired:
                self.spike_buffer[i].append((self.t, 1.0))
        self.t += self.dt
        return spikes

    def simulate(self, inputs: List[List[float]], duration: float) -> List[List[bool]]:
        """在 duration 毫秒内运行网络模拟。"""
        steps = int(duration / self.dt)
        history = []
        for s in range(steps):
            inp = inputs[s] if s < len(inputs) else [0.0] * self.num_neurons
            history.append(self.step(inp))
        return history

    def population_rate(self, t_start: float, t_end: float) -> float:
        """计算群体平均发放率。"""
        total = sum(n.firing_rate(t_start, t_end) for n in self.neurons)
        return total / self.num_neurons

    def raster_data(self) -> Dict[int, List[float]]:
        """返回用于绘制 raster plot 的数据。"""
        return {i: list(n.spike_times) for i, n in enumerate(self.neurons)}

    def reset(self) -> None:
        """重置整个网络。"""
        self.t = 0.0
        for n in self.neurons:
            n.reset()
        self.spike_buffer = {i: [] for i in range(self.num_neurons)}
