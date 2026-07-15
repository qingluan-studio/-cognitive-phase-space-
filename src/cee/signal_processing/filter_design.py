"""
filter_design.py — 滤波器设计引擎

实现 FIR、IIR（简化）、移动平均、中值滤波、
Butterworth 近似与陷波滤波器。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Optional


class FilterDesign:
    """数字滤波器设计引擎。"""

    def __init__(self, sampling_rate: float = 1.0):
        self.fs = sampling_rate

    def moving_average(self, signal: List[float], window_size: int = 5) -> List[float]:
        """移动平均滤波。"""
        result = []
        half = window_size // 2
        for i in range(len(signal)):
            start = max(0, i - half)
            end = min(len(signal), i + half + 1)
            window = signal[start:end]
            result.append(sum(window) / len(window))
        return result

    def exponential_moving_average(self, signal: List[float], alpha: float = 0.3) -> List[float]:
        """指数移动平均滤波。"""
        result = [signal[0]]
        for i in range(1, len(signal)):
            result.append(alpha * signal[i] + (1.0 - alpha) * result[-1])
        return result

    def median_filter(self, signal: List[float], window_size: int = 5) -> List[float]:
        """中值滤波。"""
        result = []
        half = window_size // 2
        for i in range(len(signal)):
            start = max(0, i - half)
            end = min(len(signal), i + half + 1)
            window = sorted(signal[start:end])
            result.append(window[len(window) // 2])
        return result

    def fir_lowpass(self, cutoff: float, num_taps: int = 21) -> List[float]:
        """FIR 低通滤波器设计（窗函数法）。"""
        taps = []
        fc = cutoff / (self.fs / 2.0)
        for n in range(num_taps):
            if n == (num_taps - 1) // 2:
                h = fc
            else:
                h = math.sin(math.pi * fc * (n - (num_taps - 1) / 2.0)) / (math.pi * (n - (num_taps - 1) / 2.0))
            window = 0.54 - 0.46 * math.cos(2.0 * math.pi * n / (num_taps - 1))
            taps.append(h * window)
        total = sum(taps)
        return [t / total for t in taps] if total > 0 else taps

    def fir_highpass(self, cutoff: float, num_taps: int = 21) -> List[float]:
        """FIR 高通滤波器设计。"""
        lowpass = self.fir_lowpass(cutoff, num_taps)
        return [-t for t in lowpass[:num_taps // 2]] + [1.0 - lowpass[num_taps // 2]] + [-t for t in lowpass[num_taps // 2 + 1:]]

    def apply_fir(self, signal: List[float], taps: List[float]) -> List[float]:
        """应用 FIR 滤波器。"""
        result = []
        M = len(taps)
        for i in range(len(signal)):
            acc = 0.0
            for j in range(M):
                idx = i - j
                if idx >= 0:
                    acc += taps[j] * signal[idx]
            result.append(acc)
        return result

    def iir_lowpass(self, signal: List[float], alpha: float = 0.1) -> List[float]:
        """一阶 IIR 低通滤波器。"""
        result = [signal[0]]
        for i in range(1, len(signal)):
            result.append(alpha * signal[i] + (1.0 - alpha) * result[-1])
        return result

    def butterworth_approx(self, signal: List[float], cutoff: float, order: int = 2) -> List[float]:
        """Butterworth 滤波器近似（级联一阶）。"""
        result = list(signal)
        alpha = 2.0 * math.pi * cutoff / self.fs
        alpha = alpha / (alpha + 1.0)
        for _ in range(order):
            result = self.iir_lowpass(result, alpha)
        return result

    def notch_filter(self, signal: List[float], freq: float, bandwidth: float = 0.1) -> List[float]:
        """陷波滤波器（简化版）。"""
        result = list(signal)
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        spectrum = ft.fft_cooley_tukey([complex(x, 0.0) for x in signal])
        N = len(signal)
        bin_width = self.fs / N
        for k in range(N):
            f = k * bin_width if k <= N // 2 else (k - N) * bin_width
            if abs(abs(f) - freq) < bandwidth:
                spectrum[k] = 0.0 + 0.0j
        filtered = ft.idft(spectrum)
        return [x.real for x in filtered]

    def bandpass_filter(self, signal: List[float], low_cut: float, high_cut: float) -> List[float]:
        """带通滤波器（频域方法）。"""
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        spectrum = ft.fft_cooley_tukey([complex(x, 0.0) for x in signal])
        N = len(signal)
        bin_width = self.fs / N
        for k in range(N):
            f = k * bin_width if k <= N // 2 else (k - N) * bin_width
            if abs(f) < low_cut or abs(f) > high_cut:
                spectrum[k] = 0.0 + 0.0j
        filtered = ft.idft(spectrum)
        return [x.real for x in filtered]

    def savitzky_golay(self, signal: List[float], window_size: int = 5,
                       polyorder: int = 2) -> List[float]:
        """Savitzky-Golay 平滑滤波（简化二次拟合）。"""
        result = []
        half = window_size // 2
        for i in range(len(signal)):
            start = max(0, i - half)
            end = min(len(signal), i + half + 1)
            window = list(range(start, end))
            values = signal[start:end]
            if len(window) < 3:
                result.append(signal[i])
                continue
            n = len(window)
            sum_x = sum(window)
            sum_x2 = sum(x ** 2 for x in window)
            sum_y = sum(values)
            sum_xy = sum(x * y for x, y in zip(window, values))
            denom = n * sum_x2 - sum_x ** 2
            if denom == 0:
                result.append(signal[i])
            else:
                a = (n * sum_xy - sum_x * sum_y) / denom
                b = (sum_y * sum_x2 - sum_x * sum_xy) / denom
                result.append(a * i + b)
        return result

    def group_delay(self, taps: List[float], freqs: List[float]) -> List[float]:
        """估算 FIR 滤波器群延迟。"""
        delays = []
        for f in freqs:
            omega = 2.0 * math.pi * f / self.fs
            numerator = sum(n * taps[n] * math.sin(omega * n) for n in range(len(taps)))
            denominator = sum(taps[n] * math.cos(omega * n) for n in range(len(taps)))
            delays.append(numerator / denominator if denominator != 0 else 0.0)
        return delays

    def frequency_response(self, taps: List[float], num_points: int = 512) -> List[Tuple[float, float]]:
        """计算 FIR 滤波器频率响应。"""
        response = []
        for k in range(num_points // 2):
            f = k * self.fs / num_points
            omega = 2.0 * math.pi * f / self.fs
            H = sum(taps[n] * complex(math.cos(omega * n), -math.sin(omega * n)) for n in range(len(taps)))
            response.append((f, abs(H)))
        return response

    @staticmethod
    def snr(signal: List[float], noise: List[float]) -> float:
        """计算信噪比 (dB)。"""
        signal_power = sum(s ** 2 for s in signal) / len(signal)
        noise_power = sum(n ** 2 for n in noise) / len(noise)
        return 10.0 * math.log10(signal_power / noise_power) if noise_power > 0 else float('inf')
