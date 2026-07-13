"""
T7 — Cognitive Resonance: 认知共振与频率域分析引擎

T7 将文本认知状态映射到频率域，通过傅里叶变换分析语义节奏，
检测文本的认知共振频率、相干性和谐波结构。

核心能力:
  - 语义频率谱分解: 对文本语义流进行STFT分析
  - 共振频率检测: 识别文本中的主导认知频率
  - 相干性分析: 段落间语义一致性度量
  - 谐波结构: 主题重复/变奏模式检测
  - 认知节律: 句子长度/复杂度波动模式
  - 相位同步: 多段落认知相位对齐度

双轨制:
  ResonanceEngineering (工程版): 基于统计特征的快速频率分析
  ResonanceTheoretical (理论版): 基于信号处理的完整频谱分析

应用场景:
  - 写作风格一致性检查
  - 论证逻辑连贯性分析
  - 内容节奏/张力曲线评估
  - 多作者文本融合质量
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from math import exp, log2, pi, sqrt
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ResonanceProfile:
    """认知共振画像"""
    dominant_frequencies: list[float] = field(default_factory=list)
    frequency_spectrum: np.ndarray | None = None
    coherence_score: float = 0.0
    harmonic_ratio: float = 0.0
    phase_alignment: float = 0.0
    rhythm_entropy: float = 0.0
    tension_curve: list[float] = field(default_factory=list)
    resonance_peaks: list[tuple[float, float]] = field(default_factory=list)
    composite_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "dominant_frequencies": [round(f, 4) for f in self.dominant_frequencies],
            "coherence_score": round(self.coherence_score, 4),
            "harmonic_ratio": round(self.harmonic_ratio, 4),
            "phase_alignment": round(self.phase_alignment, 4),
            "rhythm_entropy": round(self.rhythm_entropy, 4),
            "resonance_peaks": [(round(f, 4), round(a, 4)) for f, a in self.resonance_peaks],
            "composite_score": round(self.composite_score, 4),
        }


def _tokenize_sentences(text: str) -> list[list[str]]:
    """将文本分割为句子，每个句子为词列表"""
    raw_sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")]
    return [s.lower().split() for s in raw_sentences if s]


def _sentence_lengths(text: str) -> list[int]:
    return [len(words) for words in _tokenize_sentences(text)]


def _paragraph_vectors(text: str) -> list[np.ndarray]:
    """将每段转换为词频向量"""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return []

    all_words = sorted(set(w for p in paragraphs for w in p.lower().split()))
    if not all_words:
        return []

    word_idx = {w: i for i, w in enumerate(all_words)}
    vectors = []
    for para in paragraphs:
        vec = np.zeros(len(all_words))
        for w in para.lower().split():
            if w in word_idx:
                vec[word_idx[w]] += 1
        total = vec.sum()
        if total > 0:
            vec = vec / total
        vectors.append(vec)
    return vectors


def _autocorrelation(signal: np.ndarray) -> np.ndarray:
    """计算自相关函数"""
    n = len(signal)
    mean = signal.mean()
    variance = signal.var()
    if variance == 0:
        return np.ones(n)
    centered = signal - mean
    result = np.correlate(centered, centered, mode="full")[n - 1:]
    return result / (variance * np.arange(n, 0, -1))


def _hamming_window(size: int) -> np.ndarray:
    """汉明窗函数"""
    return 0.54 - 0.46 * np.cos(2 * pi * np.arange(size) / (size - 1))


def _short_time_fourier_transform(
    signal: np.ndarray, window_size: int, hop_size: int
) -> np.ndarray:
    """短时傅里叶变换"""
    n = len(signal)
    n_frames = max(1, (n - window_size) // hop_size + 1)
    n_freqs = window_size // 2 + 1
    spectrogram = np.zeros((n_freqs, n_frames))
    window = _hamming_window(window_size)

    for i in range(n_frames):
        start = i * hop_size
        frame = signal[start:start + window_size].copy()
        if len(frame) < window_size:
            frame = np.pad(frame, (0, window_size - len(frame)))
        frame = frame * window
        spectrum = np.abs(np.fft.rfft(frame))
        spectrogram[:len(spectrum), i] = spectrum[:n_freqs]

    return spectrogram


class ResonanceEngineering:
    """T7 工程版 — 基于统计特征的快速共振分析"""

    def __init__(self, sampling_rate: int = 64, n_fft: int = 256):
        self.sampling_rate = sampling_rate
        self.n_fft = n_fft

    def analyze(self, text: str) -> ResonanceProfile:
        if not text.strip():
            return ResonanceProfile()

        profile = ResonanceProfile()
        sentences = _tokenize_sentences(text)
        if len(sentences) < 2:
            profile.composite_score = 0.5
            return profile

        sent_lengths = np.array([len(s) for s in sentences], dtype=np.float64)

        profile.coherence_score = self._compute_coherence(text)
        profile.harmonic_ratio = self._compute_harmonic_ratio(sent_lengths)
        profile.phase_alignment = self._compute_phase_alignment(text)
        profile.rhythm_entropy = self._compute_rhythm_entropy(sent_lengths)
        profile.tension_curve = self._compute_tension_curve(sent_lengths)

        n_fft = min(self.n_fft, len(sent_lengths))
        if n_fft >= 4:
            fft_result = np.abs(np.fft.rfft(sent_lengths, n=n_fft * 2))
            freqs = np.fft.rfftfreq(n_fft * 2, d=1.0 / self.sampling_rate)
            profile.frequency_spectrum = fft_result

            peak_indices = np.argsort(fft_result)[-5:]
            profile.resonance_peaks = [
                (freqs[i], fft_result[i]) for i in peak_indices if freqs[i] > 0
            ]
            profile.dominant_frequencies = [
                freqs[i] for i in peak_indices if freqs[i] > 0
            ]

        profile.composite_score = self._composite(profile)
        return profile

    def _compute_coherence(self, text: str) -> float:
        para_vecs = _paragraph_vectors(text)
        if len(para_vecs) < 2:
            return 1.0

        similarities = []
        for i in range(len(para_vecs) - 1):
            a, b = para_vecs[i], para_vecs[i + 1]
            norm = np.linalg.norm(a) * np.linalg.norm(b)
            if norm > 0:
                similarities.append(float(np.dot(a, b) / norm))

        if not similarities:
            return 0.0
        mean_sim = np.mean(similarities)
        std_sim = np.std(similarities)
        return float(mean_sim * (1.0 - min(std_sim, 0.5)))

    def _compute_harmonic_ratio(self, sent_lengths: np.ndarray) -> float:
        if len(sent_lengths) < 4:
            return 0.5

        autocorr = _autocorrelation(sent_lengths)
        if len(autocorr) < 4:
            return 0.5

        peaks = []
        for i in range(2, min(len(autocorr) // 2, 21)):
            if autocorr[i] > autocorr[i - 1] and autocorr[i] > autocorr[i + 1]:
                peaks.append((i, autocorr[i]))

        if not peaks:
            return 0.2

        sorted_peaks = sorted(peaks, key=lambda x: x[1], reverse=True)
        if len(sorted_peaks) >= 2:
            ratio = sorted_peaks[1][0] / max(sorted_peaks[0][0], 1)
            fundamental_strength = sorted_peaks[0][1]
            return float(min(fundamental_strength * ratio, 1.0) * 0.5 + 0.5)
        return 0.5

    def _compute_phase_alignment(self, text: str) -> float:
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if len(paragraphs) < 2:
            return 1.0

        para_lengths = np.array(
            [len(_tokenize_sentences(p)) for p in paragraphs], dtype=np.float64
        )
        if np.std(para_lengths) < 1e-6:
            return 1.0

        phase_shifts = []
        for i in range(len(paragraphs) - 1):
            shift = abs(para_lengths[i] - para_lengths[i + 1]) / (max(para_lengths[i], para_lengths[i + 1]) + 1)
            phase_shifts.append(float(shift))

        mean_shift = np.mean(phase_shifts)
        return float(1.0 - mean_shift * 0.5)

    def _compute_rhythm_entropy(self, sent_lengths: np.ndarray) -> float:
        if len(sent_lengths) < 2:
            return 0.0

        diffs = np.abs(np.diff(sent_lengths))
        if np.sum(diffs) == 0:
            return 0.0

        hist, _ = np.histogram(diffs, bins=min(10, len(set(diffs))))
        hist = hist / hist.sum()
        hist = hist[hist > 0]
        entropy = -np.sum(hist * np.log2(hist + 1e-12))
        max_entropy = log2(min(10, len(hist) + 1))
        return float(entropy / (max_entropy + 1e-12))

    def _compute_tension_curve(self, sent_lengths: np.ndarray) -> list[float]:
        if len(sent_lengths) < 2:
            return []

        window = max(3, len(sent_lengths) // 5)
        curve = []
        for i in range(len(sent_lengths) - window + 1):
            segment = sent_lengths[i:i + window]
            tension = float(np.std(segment) / (np.mean(segment) + 1))
            curve.append(min(tension, 1.0))
        return curve

    def _composite(self, profile: ResonanceProfile) -> float:
        weights = {
            "coherence": 0.25,
            "harmonic": 0.20,
            "phase": 0.20,
            "rhythm": 0.15,
            "peaks": 0.20,
        }
        peak_score = min(len(profile.dominant_frequencies) / 3.0, 1.0) if profile.dominant_frequencies else 0.3
        score = (
            weights["coherence"] * profile.coherence_score
            + weights["harmonic"] * profile.harmonic_ratio
            + weights["phase"] * profile.phase_alignment
            + weights["rhythm"] * profile.rhythm_entropy
            + weights["peaks"] * peak_score
        )
        return float(min(max(score, 0.0), 1.0))


class ResonanceTheoretical:
    """T7 理论版 — 基于信号处理的完整频谱分析"""

    def __init__(self, sampling_rate: int = 128, n_fft: int = 512,
                 window_type: str = "hamming"):
        self.sampling_rate = sampling_rate
        self.n_fft = n_fft
        self.window_type = window_type

    def analyze(self, text: str) -> ResonanceProfile:
        if not text.strip():
            return ResonanceProfile()

        profile = ResonanceProfile()
        sentences = _tokenize_sentences(text)
        if len(sentences) < 2:
            profile.composite_score = 0.5
            return profile

        sent_lengths = np.array([len(s) for s in sentences], dtype=np.float64)

        if len(sent_lengths) >= 16:
            profile.frequency_spectrum = self._full_spectrum(sent_lengths)
            profile.resonance_peaks = self._find_peaks(profile.frequency_spectrum)
            profile.dominant_frequencies = [p[0] for p in profile.resonance_peaks]

        profile.coherence_score = self._wavelet_coherence(sent_lengths)
        profile.harmonic_ratio = self._cepstral_harmonic(sent_lengths)
        profile.phase_alignment = self._hilbert_phase(text)
        profile.rhythm_entropy = self._spectral_entropy(sent_lengths)
        profile.tension_curve = self._smooth_tension(sent_lengths)

        profile.composite_score = self._composite(profile)
        return profile

    def _full_spectrum(self, signal: np.ndarray) -> np.ndarray:
        n = len(signal)
        window = _hamming_window(n) if self.window_type == "hamming" else np.ones(n)
        windowed = signal * window
        spectrum = np.abs(np.fft.rfft(windowed, n=self.n_fft))
        return spectrum / (np.max(spectrum) + 1e-12)

    def _find_peaks(self, spectrum: np.ndarray) -> list[tuple[float, float]]:
        freqs = np.fft.rfftfreq(len(spectrum) * 2 - 2, d=1.0 / self.sampling_rate)
        n = min(len(spectrum), len(freqs))

        peaks = []
        for i in range(2, n - 2):
            if (spectrum[i] > spectrum[i - 1] and spectrum[i] > spectrum[i - 2]
                    and spectrum[i] > spectrum[i + 1] and spectrum[i] > spectrum[i + 2]):
                if spectrum[i] > np.mean(spectrum) * 0.3:
                    peaks.append((float(freqs[i]), float(spectrum[i])))

        return sorted(peaks, key=lambda x: x[1], reverse=True)[:8]

    def _wavelet_coherence(self, signal: np.ndarray) -> float:
        """基于连续小波变换的相干性"""
        n = len(signal)
        if n < 4:
            return 0.5

        scales = np.arange(1, min(n // 2 + 1, 16))
        coef_matrix = np.zeros((len(scales), n))

        for s_idx, scale in enumerate(scales):
            if scale < 1:
                scale = 1
            for t in range(n):
                s = 0.0
                for tau in range(n):
                    if scale > 0:
                        x = (tau - t) / scale
                        wavelet = (1 - x * x) * exp(-x * x / 2)
                        s += signal[tau] * wavelet
                coef_matrix[s_idx, t] = s / sqrt(scale)

        scale_corrs = []
        for s_idx in range(len(scales)):
            c = coef_matrix[s_idx]
            std_c = np.std(c)
            if std_c > 0:
                autocorr = _autocorrelation(c)
                scale_corrs.append(float(np.max(autocorr[1:])) if len(autocorr) > 1 else 0.0)

        if scale_corrs:
            return float(np.mean(scale_corrs) * 0.6 + 0.4)
        return 0.5

    def _cepstral_harmonic(self, signal: np.ndarray) -> float:
        """倒谱谐波分析"""
        n = len(signal)
        if n < 4:
            return 0.5

        spectrum = np.abs(np.fft.rfft(signal))
        log_spectrum = np.log(spectrum + 1e-12)
        cepstrum = np.abs(np.fft.irfft(log_spectrum))

        if len(cepstrum) < 3:
            return 0.5

        quefrency_range = min(len(cepstrum), max(4, n // 3))
        peaks = []
        for i in range(2, quefrency_range - 1):
            if cepstrum[i] > cepstrum[i - 1] and cepstrum[i] > cepstrum[i + 1]:
                if cepstrum[i] > np.mean(cepstrum) * 1.5:
                    peaks.append((i, cepstrum[i]))

        if len(peaks) < 2:
            return 0.3

        sorted_p = sorted(peaks, key=lambda x: x[1], reverse=True)
        fundamental = sorted_p[0][0]
        if fundamental == 0:
            return 0.3

        harmonics_found = 0
        for i in range(2, 6):
            expected = fundamental * i
            for p, _ in sorted_p:
                if abs(p - expected) < max(1, fundamental * 0.15):
                    harmonics_found += 1
                    break

        return float(min(harmonics_found / 3.0, 1.0) * 0.6 + 0.3)

    def _hilbert_phase(self, text: str) -> float:
        """基于Hilbert变换的相位分析"""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if len(paragraphs) < 2:
            return 1.0

        para_lengths = np.array([len(p.split()) for p in paragraphs], dtype=np.float64)
        if len(para_lengths) < 4:
            return float(1.0 - np.std(para_lengths) / (np.mean(para_lengths) + 1) * 0.3)

        analytic_signal = np.fft.fft(para_lengths)
        n = len(analytic_signal)
        h = np.zeros(n, dtype=np.complex128)
        if n % 2 == 0:
            h[0] = 1
            h[n // 2] = 1
            h[1:n // 2] = 2
        else:
            h[0] = 1
            h[1:(n + 1) // 2] = 2
        analytic = np.fft.ifft(analytic_signal * h)

        phases = np.angle(analytic)
        phase_diffs = np.diff(np.unwrap(phases))
        phase_std = np.std(phase_diffs)

        return float(1.0 / (1.0 + phase_std * 0.3))

    def _spectral_entropy(self, signal: np.ndarray) -> float:
        """频谱熵"""
        n = len(signal)
        if n < 4:
            return 0.5

        spectrum = np.abs(np.fft.rfft(signal))
        spectrum = spectrum / (np.sum(spectrum) + 1e-12)
        spectrum = spectrum[spectrum > 0]
        entropy = -np.sum(spectrum * np.log2(spectrum + 1e-12))
        max_entropy = log2(len(spectrum) + 1)

        return float(entropy / (max_entropy + 1e-12))

    def _smooth_tension(self, signal: np.ndarray) -> list[float]:
        """基于高斯平滑的张力曲线"""
        if len(signal) < 2:
            return []

        n = len(signal)
        sigma = max(1.0, n / 10.0)
        smoothed = np.zeros(n)
        for i in range(n):
            weights = np.exp(-0.5 * ((np.arange(n) - i) / sigma) ** 2)
            smoothed[i] = np.sum(signal * weights) / np.sum(weights)

        normalized = smoothed / (np.max(smoothed) + 1e-12)
        return [float(v) for v in normalized]

    def _composite(self, profile: ResonanceProfile) -> float:
        weights = {"coherence": 0.25, "harmonic": 0.20, "phase": 0.20,
                    "rhythm": 0.15, "peaks": 0.20}
        peak_score = min(len(profile.resonance_peaks) / 5.0, 1.0) if profile.resonance_peaks else 0.25
        score = (
            weights["coherence"] * profile.coherence_score
            + weights["harmonic"] * profile.harmonic_ratio
            + weights["phase"] * profile.phase_alignment
            + weights["rhythm"] * profile.rhythm_entropy
            + weights["peaks"] * peak_score
        )
        return float(min(max(score, 0.0), 1.0))


class CognitiveResonanceEngine:
    """T7 认知共振引擎 — 统一接口，自动选择轨制"""

    def __init__(self, mode: str = "auto", **kwargs: Any) -> None:
        self.mode = mode
        self._engineering = ResonanceEngineering(**kwargs)
        self._theoretical = ResonanceTheoretical(**kwargs)

    def analyze(self, text: str, theoretical: bool = False) -> ResonanceProfile:
        if theoretical or self.mode == "theoretical":
            return self._theoretical.analyze(text)
        return self._engineering.analyze(text)

    def resonance_similarity(self, text_a: str, text_b: str) -> float:
        """比较两段文本的共振相似度"""
        profile_a = self.analyze(text_a)
        profile_b = self.analyze(text_b)

        scores_a = np.array([
            profile_a.coherence_score, profile_a.harmonic_ratio,
            profile_a.phase_alignment, profile_a.rhythm_entropy,
            profile_a.composite_score,
        ])
        scores_b = np.array([
            profile_b.coherence_score, profile_b.harmonic_ratio,
            profile_b.phase_alignment, profile_b.rhythm_entropy,
            profile_b.composite_score,
        ])

        diff = scores_a - scores_b
        return float(1.0 / (1.0 + np.linalg.norm(diff)))

    def detect_resonance_pattern(self, text: str) -> dict[str, Any]:
        """检测共振模式类型"""
        profile = self.analyze(text)

        if profile.composite_score >= 0.8:
            pattern = "harmonic" if profile.harmonic_ratio > 0.7 else "coherent"
        elif profile.composite_score >= 0.6:
            pattern = "rhythmic" if profile.rhythm_entropy > 0.5 else "structured"
        elif profile.composite_score >= 0.4:
            pattern = "irregular"
        else:
            pattern = "dissonant"

        return {
            "pattern": pattern,
            "profile": profile.to_dict(),
            "interpretation": self._interpret_pattern(pattern),
        }

    @staticmethod
    def _interpret_pattern(pattern: str) -> str:
        interpretations = {
            "harmonic": "文本具有高度谐波结构，主题以周期性变奏方式重复出现",
            "coherent": "文本在段落间保持良好一致性，信息流动自然平滑",
            "structured": "文本具有规则的结构模式，但存在局部不连续",
            "rhythmic": "文本节奏变化丰富，具有显著的认知张力波动",
            "irregular": "文本结构不规则，存在跳跃或断裂",
            "dissonant": "文本缺乏认知共振，段落间连贯性较弱",
        }
        return interpretations.get(pattern, "未知模式")
