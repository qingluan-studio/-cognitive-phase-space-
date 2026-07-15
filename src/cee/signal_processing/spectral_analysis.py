"""
spectral_analysis.py — 谱分析引擎

实现周期图、Welch 方法、多窗口法 (MTM) 简化版、
相干函数与传递函数估计。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class SpectralAnalysis:
    """谱分析引擎。"""

    def __init__(self, sampling_rate: float = 1.0):
        self.fs = sampling_rate

    def periodogram(self, signal: List[float]) -> List[Tuple[float, float]]:
        """计算周期图。"""
        N = len(signal)
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        spectrum = ft.fft_cooley_tukey([complex(x, 0.0) for x in signal])
        freqs = [k * self.fs / N for k in range(N // 2)]
        power = [abs(spectrum[k]) ** 2 / N for k in range(N // 2)]
        return list(zip(freqs, power))

    def welch_method(self, signal: List[float], window_size: int = 256,
                     overlap: int = 128) -> List[Tuple[float, float]]:
        """Welch 功率谱密度估计。"""
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        psd_sum = [0.0] * (window_size // 2)
        count = 0
        for start in range(0, len(signal) - window_size, window_size - overlap):
            window = signal[start:start + window_size]
            windowed = [x * (0.5 * (1.0 - math.cos(2.0 * math.pi * i / (window_size - 1))))
                        for i, x in enumerate(window)]
            spectrum = ft.fft_cooley_tukey([complex(x, 0.0) for x in windowed])
            for k in range(window_size // 2):
                psd_sum[k] += abs(spectrum[k]) ** 2
            count += 1
        freqs = [k * self.fs / window_size for k in range(window_size // 2)]
        if count > 0:
            psd = [p / (count * self.fs) for p in psd_sum]
        else:
            psd = psd_sum
        return list(zip(freqs, psd))

    def multitaper_estimate(self, signal: List[float], num_tapers: int = 4) -> List[Tuple[float, float]]:
        """多窗口谱估计（简化 Slepian 序列近似）。"""
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        N = len(signal)
        psd_sum = [0.0] * (N // 2)
        for taper_idx in range(num_tapers):
            window = [math.sin(math.pi * (n + 0.5) * (taper_idx + 1) / N) for n in range(N)]
            windowed = [signal[n] * window[n] for n in range(N)]
            spectrum = ft.fft_cooley_tukey([complex(x, 0.0) for x in windowed])
            for k in range(N // 2):
                psd_sum[k] += abs(spectrum[k]) ** 2
        freqs = [k * self.fs / N for k in range(N // 2)]
        psd = [p / (num_tapers * self.fs) for p in psd_sum]
        return list(zip(freqs, psd))

    def coherence(self, signal1: List[float], signal2: List[float],
                  window_size: int = 256, overlap: int = 128) -> List[Tuple[float, float]]:
        """计算两信号的相干函数。"""
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        cross_sum = [0.0 + 0.0j] * (window_size // 2)
        psd1_sum = [0.0] * (window_size // 2)
        psd2_sum = [0.0] * (window_size // 2)
        count = 0
        for start in range(0, min(len(signal1), len(signal2)) - window_size, window_size - overlap):
            w1 = signal1[start:start + window_size]
            w2 = signal2[start:start + window_size]
            s1 = ft.fft_cooley_tukey([complex(x, 0.0) for x in w1])
            s2 = ft.fft_cooley_tukey([complex(x, 0.0) for x in w2])
            for k in range(window_size // 2):
                cross_sum[k] += s1[k] * s2[k].conjugate()
                psd1_sum[k] += abs(s1[k]) ** 2
                psd2_sum[k] += abs(s2[k]) ** 2
            count += 1
        freqs = [k * self.fs / window_size for k in range(window_size // 2)]
        coherence = []
        for k in range(window_size // 2):
            denom = math.sqrt(psd1_sum[k] * psd2_sum[k])
            if denom > 0:
                coherence.append(abs(cross_sum[k]) / denom)
            else:
                coherence.append(0.0)
        return list(zip(freqs, coherence))

    def transfer_function(self, input_signal: List[float], output_signal: List[float],
                          window_size: int = 256) -> List[Tuple[float, complex]]:
        """估算传递函数 H(f) = S_xy / S_xx。"""
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        if len(input_signal) < window_size or len(output_signal) < window_size:
            return []
        x = input_signal[:window_size]
        y = output_signal[:window_size]
        X = ft.fft_cooley_tukey([complex(v, 0.0) for v in x])
        Y = ft.fft_cooley_tukey([complex(v, 0.0) for v in y])
        freqs = [k * self.fs / window_size for k in range(window_size // 2)]
        H = []
        for k in range(window_size // 2):
            sxx = abs(X[k]) ** 2
            sxy = Y[k] * X[k].conjugate()
            if sxx > 0:
                H.append(sxy / sxx)
            else:
                H.append(0.0 + 0.0j)
        return list(zip(freqs, H))

    def spectral_entropy(self, signal: List[float]) -> float:
        """计算谱熵。"""
        psd = self.periodogram(signal)
        power = [p for _, p in psd]
        total = sum(power)
        if total == 0:
            return 0.0
        probs = [p / total for p in power]
        return -sum(p * math.log(p, 2) for p in probs if p > 0)

    def spectral_flatness(self, signal: List[float]) -> float:
        """计算谱平坦度。"""
        psd = self.periodogram(signal)
        power = [p for _, p in psd]
        if not power or any(p <= 0 for p in power):
            return 0.0
        geometric = math.exp(sum(math.log(p) for p in power) / len(power))
        arithmetic = sum(power) / len(power)
        return geometric / arithmetic if arithmetic > 0 else 0.0

    def spectral_centroid(self, signal: List[float]) -> float:
        """计算谱质心。"""
        psd = self.periodogram(signal)
        if not psd:
            return 0.0
        numerator = sum(f * p for f, p in psd)
        denominator = sum(p for _, p in psd)
        return numerator / denominator if denominator > 0 else 0.0

    def spectral_rolloff(self, signal: List[float], percentile: float = 0.85) -> float:
        """计算谱滚降点。"""
        psd = self.periodogram(signal)
        power = [p for _, p in psd]
        freqs = [f for f, _ in psd]
        total = sum(power)
        cumsum = 0.0
        for f, p in zip(freqs, power):
            cumsum += p
            if cumsum >= percentile * total:
                return f
        return freqs[-1] if freqs else 0.0

    def peak_frequencies(self, signal: List[float], num_peaks: int = 3) -> List[Tuple[float, float]]:
        """提取主要谱峰频率。"""
        psd = self.periodogram(signal)
        sorted_psd = sorted(psd, key=lambda x: x[1], reverse=True)
        return sorted_psd[:num_peaks]

    @staticmethod
    def generate_noise(length: int, noise_type: str = "white") -> List[float]:
        """生成噪声信号。"""
        if noise_type == "white":
            return [random.gauss(0.0, 1.0) for _ in range(length)]
        elif noise_type == "pink":
            white = [random.gauss(0.0, 1.0) for _ in range(length)]
            from .fourier_transform import FourierTransform
            ft = FourierTransform()
            spectrum = ft.fft_cooley_tukey([complex(x, 0.0) for x in white])
            for k in range(1, len(spectrum) // 2):
                factor = 1.0 / math.sqrt(k)
                spectrum[k] *= factor
                spectrum[len(spectrum) - k] *= factor
            pink = ft.idft(spectrum)
            return [p.real for p in pink]
        return [random.gauss(0.0, 1.0) for _ in range(length)]

    def harmonic_ratio(self, signal: List[float], fundamental: float) -> float:
        """计算谐波能量比。"""
        psd = self.periodogram(signal)
        harmonic_power = 0.0
        total_power = sum(p for _, p in psd)
        for f, p in psd:
            if abs(f - fundamental) < self.fs / len(signal) or any(abs(f - n * fundamental) < self.fs / len(signal) for n in range(2, 6)):
                harmonic_power += p
        return harmonic_power / total_power if total_power > 0 else 0.0
