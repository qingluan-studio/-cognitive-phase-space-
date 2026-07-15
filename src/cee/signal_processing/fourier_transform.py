"""
fourier_transform.py — 傅里叶变换引擎

实现 DFT、IDFT、FFT 简化版、功率谱密度估计、
频谱分析与滤波器响应计算。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class FourierTransform:
    """傅里叶变换引擎。"""

    def __init__(self):
        pass

    def dft(self, signal: List[complex]) -> List[complex]:
        """离散傅里叶变换。"""
        N = len(signal)
        result = []
        for k in range(N):
            sum_val = 0.0 + 0.0j
            for n in range(N):
                angle = -2.0 * math.pi * k * n / N
                sum_val += signal[n] * complex(math.cos(angle), math.sin(angle))
            result.append(sum_val)
        return result

    def idft(self, spectrum: List[complex]) -> List[complex]:
        """逆离散傅里叶变换。"""
        N = len(spectrum)
        result = []
        for n in range(N):
            sum_val = 0.0 + 0.0j
            for k in range(N):
                angle = 2.0 * math.pi * k * n / N
                sum_val += spectrum[k] * complex(math.cos(angle), math.sin(angle))
            result.append(sum_val / N)
        return result

    def fft_cooley_tukey(self, signal: List[complex]) -> List[complex]:
        """Cooley-Tukey FFT（要求长度为 2 的幂）。"""
        N = len(signal)
        if N <= 1:
            return signal
        if N % 2 != 0:
            return self.dft(signal)
        even = self.fft_cooley_tukey(signal[0::2])
        odd = self.fft_cooley_tukey(signal[1::2])
        result = [0.0 + 0.0j] * N
        for k in range(N // 2):
            angle = -2.0 * math.pi * k / N
            twiddle = complex(math.cos(angle), math.sin(angle)) * odd[k]
            result[k] = even[k] + twiddle
            result[k + N // 2] = even[k] - twiddle
        return result

    def power_spectrum(self, signal: List[float], sampling_rate: float = 1.0) -> List[Tuple[float, float]]:
        """计算功率谱密度。"""
        N = len(signal)
        complex_signal = [complex(x, 0.0) for x in signal]
        spectrum = self.fft_cooley_tukey(complex_signal)
        freqs = [k * sampling_rate / N for k in range(N // 2)]
        power = [abs(spectrum[k]) ** 2 / N for k in range(N // 2)]
        return list(zip(freqs, power))

    def magnitude_spectrum(self, signal: List[float]) -> List[float]:
        """计算幅度谱。"""
        complex_signal = [complex(x, 0.0) for x in signal]
        spectrum = self.fft_cooley_tukey(complex_signal)
        return [abs(x) for x in spectrum[:len(spectrum) // 2]]

    def phase_spectrum(self, signal: List[float]) -> List[float]:
        """计算相位谱。"""
        complex_signal = [complex(x, 0.0) for x in signal]
        spectrum = self.fft_cooley_tukey(complex_signal)
        return [math.atan2(x.imag, x.real) for x in spectrum[:len(spectrum) // 2]]

    def frequency_bins(self, N: int, sampling_rate: float = 1.0) -> List[float]:
        """生成频率轴。"""
        return [k * sampling_rate / N for k in range(N // 2)]

    def convolution_theorem(self, signal1: List[float], signal2: List[float]) -> List[float]:
        """使用 FFT 计算循环卷积。"""
        N = max(len(signal1), len(signal2))
        N = 2 ** math.ceil(math.log2(N))
        s1 = [complex(x, 0.0) for x in signal1] + [0.0 + 0.0j] * (N - len(signal1))
        s2 = [complex(x, 0.0) for x in signal2] + [0.0 + 0.0j] * (N - len(signal2))
        S1 = self.fft_cooley_tukey(s1)
        S2 = self.fft_cooley_tukey(s2)
        product = [S1[i] * S2[i] for i in range(N)]
        result = self.fft_cooley_tukey(product)
        return [result[i].real / N for i in range(len(signal1) + len(signal2) - 1)]

    def autocorrelation_fft(self, signal: List[float]) -> List[float]:
        """使用 FFT 计算自相关。"""
        N = len(signal)
        padded = signal + [0.0] * N
        spec = self.fft_cooley_tukey([complex(x, 0.0) for x in padded])
        power = [abs(x) ** 2 for x in spec]
        corr = self.fft_cooley_tukey(power)
        return [corr[i].real / (N - i) if i < N else 0.0 for i in range(N)]

    def windowed_fft(self, signal: List[float], window_type: str = "hann") -> List[complex]:
        """加窗 FFT。"""
        N = len(signal)
        if window_type == "hann":
            window = [0.5 * (1.0 - math.cos(2.0 * math.pi * n / (N - 1))) for n in range(N)]
        elif window_type == "hamming":
            window = [0.54 - 0.46 * math.cos(2.0 * math.pi * n / (N - 1)) for n in range(N)]
        else:
            window = [1.0] * N
        windowed = [signal[i] * window[i] for i in range(N)]
        return self.fft_cooley_tukey([complex(x, 0.0) for x in windowed])

    def spectrogram(self, signal: List[float], window_size: int = 256,
                    hop_size: int = 128) -> List[List[float]]:
        """计算语谱图。"""
        spectrogram = []
        for start in range(0, len(signal) - window_size, hop_size):
            window = signal[start:start + window_size]
            fft_result = self.windowed_fft(window, "hann")
            magnitude = [abs(x) for x in fft_result[:window_size // 2]]
            spectrogram.append(magnitude)
        return spectrogram

    def cepstrum(self, signal: List[float]) -> List[float]:
        """计算倒谱。"""
        N = len(signal)
        spec = self.fft_cooley_tukey([complex(x, 0.0) for x in signal])
        log_mag = [math.log(max(1e-10, abs(x))) for x in spec]
        cepstrum = self.fft_cooley_tukey([complex(x, 0.0) for x in log_mag])
        return [x.real for x in cepstrum]

    def dominant_frequency(self, signal: List[float], sampling_rate: float = 1.0) -> float:
        """提取主导频率。"""
        psd = self.power_spectrum(signal, sampling_rate)
        return max(psd, key=lambda x: x[1])[0]

    def bandwidth(self, signal: List[float], sampling_rate: float = 1.0,
                  threshold_db: float = -3.0) -> float:
        """估算 -3dB 带宽。"""
        psd = self.power_spectrum(signal, sampling_rate)
        max_power = max(p for _, p in psd)
        threshold = max_power * 10 ** (threshold_db / 10.0)
        freqs_above = [f for f, p in psd if p >= threshold]
        return max(freqs_above) - min(freqs_above) if freqs_above else 0.0

    @staticmethod
    def generate_sine(frequency: float, amplitude: float, length: int,
                      sampling_rate: float = 1.0, phase: float = 0.0) -> List[float]:
        """生成正弦信号。"""
        return [amplitude * math.sin(2.0 * math.pi * frequency * n / sampling_rate + phase)
                for n in range(length)]

    def zero_padding_interpolation(self, signal: List[float], factor: int = 2) -> List[float]:
        """通过零填充进行频域插值。"""
        N = len(signal)
        padded = [complex(x, 0.0) for x in signal] + [0.0 + 0.0j] * (N * (factor - 1))
        spectrum = self.fft_cooley_tukey(padded)
        interpolated = self.idft(spectrum)
        return [x.real for x in interpolated]
