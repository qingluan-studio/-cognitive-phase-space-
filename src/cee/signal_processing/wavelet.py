"""
wavelet.py — 小波变换引擎

实现连续小波变换 (CWT)、离散小波变换 (DWT) 简化版、
多分辨率分析与去噪。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Callable, Optional


class WaveletTransform:
    """小波变换引擎。"""

    def __init__(self):
        pass

    def morlet_wavelet(self, t: float, sigma: float = 1.0,
                       omega0: float = 5.0) -> complex:
        """Morlet 小波。"""
        return complex(math.exp(-t ** 2 / (2.0 * sigma ** 2)) * math.cos(omega0 * t),
                       math.exp(-t ** 2 / (2.0 * sigma ** 2)) * math.sin(omega0 * t))

    def mexican_hat_wavelet(self, t: float, sigma: float = 1.0) -> float:
        """墨西哥帽小波。"""
        return (2.0 / (math.sqrt(3.0 * sigma) * math.pi ** 0.25)) * \
               (1.0 - (t / sigma) ** 2) * math.exp(-t ** 2 / (2.0 * sigma ** 2))

    def cwt(self, signal: List[float], scales: List[float],
            wavelet: Callable[[float], complex],
            dt: float = 1.0) -> List[List[complex]]:
        """连续小波变换。"""
        N = len(signal)
        coefficients = []
        for scale in scales:
            row = []
            for n in range(N):
                sum_val = 0.0 + 0.0j
                for m in range(N):
                    t = (m - n) * dt / scale
                    sum_val += signal[m] * wavelet(t).conjugate()
                row.append(sum_val / math.sqrt(scale))
            coefficients.append(row)
        return coefficients

    def haar_dwt(self, signal: List[float]) -> Tuple[List[float], List[float]]:
        """Haar 离散小波变换（一层）。"""
        N = len(signal)
        if N % 2 != 0:
            signal = signal + [0.0]
            N += 1
        approx = []
        detail = []
        for i in range(0, N, 2):
            a = (signal[i] + signal[i + 1]) / math.sqrt(2.0)
            d = (signal[i] - signal[i + 1]) / math.sqrt(2.0)
            approx.append(a)
            detail.append(d)
        return approx, detail

    def inverse_haar_dwt(self, approx: List[float], detail: List[float]) -> List[float]:
        """逆 Haar DWT。"""
        signal = []
        for a, d in zip(approx, detail):
            s0 = (a + d) / math.sqrt(2.0)
            s1 = (a - d) / math.sqrt(2.0)
            signal.extend([s0, s1])
        return signal

    def multi_level_dwt(self, signal: List[float], levels: int = 3) -> List[Tuple[List[float], List[float]]]:
        """多级 DWT。"""
        result = []
        current = list(signal)
        for _ in range(levels):
            approx, detail = self.haar_dwt(current)
            result.append((approx, detail))
            current = approx
        return result

    def reconstruction(self, coefficients: List[Tuple[List[float], List[float]]]) -> List[float]:
        """从多级系数重构信号。"""
        if not coefficients:
            return []
        current = coefficients[-1][0]
        for approx, detail in reversed(coefficients[:-1]):
            extended = self.inverse_haar_dwt(current, detail)
            current = extended[:len(approx) * 2]
        final_approx, final_detail = coefficients[0]
        return self.inverse_haar_dwt(current, final_detail)[:len(final_approx) * 2]

    def denoise(self, signal: List[float], threshold: float = 0.1,
                levels: int = 3) -> List[float]:
        """小波阈值去噪。"""
        coeffs = self.multi_level_dwt(signal, levels)
        denoised_coeffs = []
        for approx, detail in coeffs:
            new_detail = [d if abs(d) > threshold else 0.0 for d in detail]
            denoised_coeffs.append((approx, new_detail))
        return self.reconstruction(denoised_coeffs)

    def scaleogram(self, signal: List[float], scales: List[float],
                   wavelet_type: str = "morlet") -> List[List[float]]:
        """计算 scaleogram（CWT 模的平方）。"""
        if wavelet_type == "morlet":
            wavelet = lambda t: self.morlet_wavelet(t)
        else:
            wavelet = lambda t: complex(self.mexican_hat_wavelet(t), 0.0)
        cwt_result = self.cwt(signal, scales, wavelet)
        return [[abs(c) ** 2 for c in row] for row in cwt_result]

    def peak_detection(self, signal: List[float], scales: List[float],
                       wavelet_type: str = "morlet") -> List[int]:
        """基于小波变换的峰值检测。"""
        scaleogram = self.scaleogram(signal, scales, wavelet_type)
        if not scaleogram:
            return []
        max_scale = max(scaleogram, key=lambda row: max(abs(v) for v in row))
        peaks = []
        for i in range(1, len(max_scale) - 1):
            if max_scale[i] > max_scale[i - 1] and max_scale[i] > max_scale[i + 1]:
                peaks.append(i)
        return peaks

    def energy_distribution(self, coefficients: List[Tuple[List[float], List[float]]]) -> List[float]:
        """计算各级能量分布。"""
        energies = []
        for approx, detail in coefficients:
            energy = sum(a ** 2 for a in approx) + sum(d ** 2 for d in detail)
            energies.append(energy)
        total = sum(energies)
        return [e / total for e in energies] if total > 0 else energies

    def instantaneous_frequency(self, signal: List[float], dt: float = 1.0) -> List[float]:
        """基于解析信号的瞬时频率（简化版）。"""
        from .fourier_transform import FourierTransform
        ft = FourierTransform()
        analytic = ft.fft_cooley_tukey([complex(x, 0.0) for x in signal])
        for i in range(len(analytic) // 2, len(analytic)):
            analytic[i] = 0.0 + 0.0j
        hilbert_approx = ft.idft(analytic)
        phase = [math.atan2(h.imag, h.real) for h in hilbert_approx]
        freq = []
        for i in range(1, len(phase)):
            dp = phase[i] - phase[i - 1]
            if dp > math.pi:
                dp -= 2.0 * math.pi
            elif dp < -math.pi:
                dp += 2.0 * math.pi
            freq.append(dp / (2.0 * math.pi * dt))
        freq.append(freq[-1] if freq else 0.0)
        return freq

    def wavelet_packet_decomposition(self, signal: List[float], level: int = 2) -> Dict[str, List[float]]:
        """小波包分解（简化版）。"""
        nodes = {"": list(signal)}
        for l in range(level):
            new_nodes = {}
            for key, node_signal in nodes.items():
                approx, detail = self.haar_dwt(node_signal)
                new_nodes[key + "a"] = approx
                new_nodes[key + "d"] = detail
            nodes = new_nodes
        return nodes
