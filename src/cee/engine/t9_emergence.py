"""
T9 — Emergence Dynamics: 涌现动力学与相变检测引擎

T9 研究认知系统的涌现行为——当信息量积累到临界点时，
系统自发产生新的、不可从组分直接推导的高阶认知结构。

核心能力:
  - 涌现临界点检测: 识别文本信息复杂度达到涌现阈值的时刻
  - 相变分析: 认知系统从"简单"到"复杂"的相变过程
  - 序参量追踪: 追踪定义涌现的核心序参量演化
  - 分形维度: 文本认知结构的分形特征分析
  - 自组织临界性: 检测系统是否处于"混沌边缘"
  - 涌现模式识别: 分类涌现的具体形态(层级/网络/流形等)

双轨制:
  EmergenceEngineering (工程版): 基于统计力学的快速涌现检测
  EmergenceTheoretical (理论版): 基于重整化群和相变的完整分析

理论基础:
  - Bak-Tang-Wiesenfeld 自组织临界性模型
  - Landau 相变理论(序参量)
  - Fisher 信息矩阵与涌现度量
  - 重整化群粗粒化
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from math import log, log2, sqrt
from typing import Any

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class EmergencePattern(Enum):
    """涌现模式"""
    HIERARCHICAL = "hierarchical"
    NETWORK = "network"
    MANIFOLD = "manifold"
    CRITICAL = "critical"
    CHAOTIC = "chaotic"
    ORDERED = "ordered"
    NONE = "none"


class PhaseState(Enum):
    """相态"""
    DISORDERED = "disordered"
    CRITICAL = "critical"
    ORDERED = "ordered"
    COMPLEX = "complex"


@dataclass
class CriticalPoint:
    """涌现临界点"""
    position: int
    order_parameter: float
    susceptibility: float
    phase_before: PhaseState
    phase_after: PhaseState
    emergence_magnitude: float


@dataclass
class EmergenceProfile:
    """涌现动力学画像"""
    emergence_detected: bool = False
    critical_points: list[CriticalPoint] = field(default_factory=list)
    order_parameter_curve: list[float] = field(default_factory=list)
    susceptibility_curve: list[float] = field(default_factory=list)
    fractal_dimension: float = 0.0
    self_organized_criticality: float = 0.0
    emergence_pattern: EmergencePattern = EmergencePattern.NONE
    phase_diagram: list[PhaseState] = field(default_factory=list)
    fisher_information: float = 0.0
    complexity_gradient: list[float] = field(default_factory=list)
    composite_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "emergence_detected": self.emergence_detected,
            "critical_point_count": len(self.critical_points),
            "fractal_dimension": round(self.fractal_dimension, 4),
            "self_organized_criticality": round(self.self_organized_criticality, 4),
            "emergence_pattern": self.emergence_pattern.value,
            "fisher_information": round(self.fisher_information, 4),
            "composite_score": round(self.composite_score, 4),
        }


def _sliding_windows(text: str, window_size: int, step: int) -> list[str]:
    """滑动窗口分割文本"""
    words = text.split()
    if len(words) < window_size:
        return [text]

    windows = []
    for i in range(0, len(words) - window_size + 1, step):
        windows.append(" ".join(words[i:i + window_size]))
    return windows


def _shannon_entropy_of_window(text: str) -> float:
    """窗口文本的Shannon熵"""
    words = text.lower().split()
    if not words:
        return 0.0
    counter = {}
    for w in words:
        counter[w] = counter.get(w, 0) + 1
    total = len(words)
    entropy = 0.0
    for count in counter.values():
        p = count / total
        entropy -= p * log2(p)
    return entropy


def _type_token_ratio(text: str) -> float:
    """类型/标记比"""
    words = [w.lower() for w in text.split()]
    if not words:
        return 0.0
    return len(set(words)) / len(words)


def _h_index(citations: np.ndarray) -> float:
    """H-index (类比学术引用,衡量信息贡献分布)"""
    if len(citations) == 0:
        return 0.0
    sorted_c = np.sort(citations)[::-1]
    h = 0
    for i, c in enumerate(sorted_c):
        if c >= i + 1:
            h = i + 1
        else:
            break
    return float(h)


def _box_counting_dimension(curve: np.ndarray) -> float:
    """盒计数法计算分形维度"""
    n = len(curve)
    if n < 4:
        return 1.0

    y_min, y_max = curve.min(), curve.max()
    if y_max - y_min < 1e-6:
        return 1.0

    scales = [max(1, int(n / (2 ** i))) for i in range(1, min(6, int(log2(n)) + 1))]
    scales = sorted(set(scales))
    if len(scales) < 2:
        return 1.0

    log_scales = []
    log_counts = []
    for scale in scales:
        bins = np.zeros(scale)
        bin_width = (y_max - y_min) / scale if scale > 0 else 1.0
        if bin_width <= 0:
            continue
        for y in curve:
            idx = min(int((y - y_min) / bin_width), scale - 1)
            bins[idx] = 1.0
        occupied = np.sum(bins)
        if occupied > 0:
            log_scales.append(log(1.0 / scale))
            log_counts.append(log(occupied))

    if len(log_scales) < 2:
        return 1.0

    slope, _ = np.polyfit(log_scales, log_counts, 1)
    return float(-slope)


def _fisher_information(probabilities: np.ndarray) -> float:
    """Fisher信息矩阵（标量近似）"""
    n = len(probabilities)
    if n < 2:
        return 0.0
    p = probabilities / (probabilities.sum() + 1e-12)
    fi = 0.0
    for i in range(n - 1):
        dp = p[i + 1] - p[i]
        fi += dp * dp / (p[i] + 1e-12)
    return float(fi / n)


class EmergenceEngineering:
    """T9 工程版 — 基于统计力学的快速涌现检测"""

    def __init__(self, window_size: int = 64, step: int = 16,
                 critical_threshold: float = 0.15):
        self.window_size = window_size
        self.step = step
        self.critical_threshold = critical_threshold

    def analyze(self, text: str) -> EmergenceProfile:
        if not text.strip():
            return EmergenceProfile()

        windows = _sliding_windows(text, self.window_size, self.step)
        if len(windows) < 3:
            return EmergenceProfile(composite_score=0.3)

        entropy_curve = np.array([_shannon_entropy_of_window(w) for w in windows])

        profile = EmergenceProfile()
        profile.order_parameter_curve = [float(v) for v in entropy_curve]
        profile.susceptibility_curve = self._compute_susceptibility(entropy_curve)
        profile.complexity_gradient = [float(v) for v in np.gradient(entropy_curve)]
        profile.critical_points = self._detect_critical_points(
            entropy_curve, profile.susceptibility_curve
        )
        profile.emergence_detected = len(profile.critical_points) > 0
        profile.fractal_dimension = _box_counting_dimension(entropy_curve)
        profile.self_organized_criticality = self._compute_soc(entropy_curve)
        profile.fisher_information = _fisher_information(entropy_curve)
        profile.phase_diagram = self._classify_phases(entropy_curve)
        profile.emergence_pattern = self._identify_pattern(profile)
        profile.composite_score = self._composite(profile)

        return profile

    def _compute_susceptibility(self, entropy: np.ndarray) -> list[float]:
        """计算响应率（熵的波动幅度）"""
        if len(entropy) < 2:
            return [0.0] * len(entropy)

        susceptibility = []
        window = max(2, len(entropy) // 4)
        for i in range(len(entropy)):
            start = max(0, i - window // 2)
            end = min(len(entropy), i + window // 2 + 1)
            segment = entropy[start:end]
            if len(segment) > 1:
                susceptibility.append(float(np.std(segment)))
            else:
                susceptibility.append(0.0)
        return susceptibility

    def _detect_critical_points(self, entropy: np.ndarray,
                                 susceptibility: list[float]) -> list[CriticalPoint]:
        """检测涌现临界点 — 熵急剧变化的点"""
        points = []
        if len(entropy) < 3:
            return points

        sus = np.array(susceptibility)
        sus_mean = sus.mean()
        sus_std = sus.std() if sus.std() > 0 else 1.0

        for i in range(1, len(entropy) - 1):
            z_score = (sus[i] - sus_mean) / sus_std
            if z_score > 2.0:
                delta = entropy[i] - entropy[i - 1]
                emergence_magnitude = abs(delta) + sus[i] * 2

                if emergence_magnitude > self.critical_threshold:
                    phase_before = self._local_phase(entropy[:i])
                    phase_after = self._local_phase(entropy[i:])
                    points.append(CriticalPoint(
                        position=i * self.step + self.window_size // 2,
                        order_parameter=float(entropy[i]),
                        susceptibility=float(sus[i]),
                        phase_before=phase_before,
                        phase_after=phase_after,
                        emergence_magnitude=float(emergence_magnitude),
                    ))

        return sorted(points, key=lambda p: p.emergence_magnitude, reverse=True)[:10]

    def _local_phase(self, entropy_segment: np.ndarray) -> PhaseState:
        """判断局部相态"""
        if len(entropy_segment) < 2:
            return PhaseState.DISORDERED

        mean_e = entropy_segment.mean()
        std_e = entropy_segment.std()

        if std_e < 0.1 and mean_e < 2.0:
            return PhaseState.ORDERED
        if std_e > 0.4:
            return PhaseState.CRITICAL
        if mean_e > 3.0:
            return PhaseState.COMPLEX
        return PhaseState.DISORDERED

    def _compute_soc(self, entropy: np.ndarray) -> float:
        """自组织临界性 — 检测幂律分布特征"""
        if len(entropy) < 10:
            return 0.3

        diffs = np.abs(np.diff(entropy))
        diffs = diffs[diffs > 1e-12]

        if len(diffs) < 5:
            return 0.3

        hist, bin_edges = np.histogram(diffs, bins=min(20, len(diffs)))
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

        positive = (hist > 0) & (bin_centers > 0)
        if positive.sum() < 3:
            return 0.3

        log_x = np.log(bin_centers[positive])
        log_y = np.log(hist[positive])

        slope, intercept, r_value, _, _ = stats.linregress(log_x, log_y)
        r_squared = r_value ** 2

        if 1.5 < -slope < 3.0 and r_squared > 0.7:
            return float(min(r_squared, 0.95))
        return float(r_squared * 0.5)

    def _classify_phases(self, entropy: np.ndarray) -> list[PhaseState]:
        """分类每个窗口的相态"""
        phases = []
        for i, e in enumerate(entropy):
            if e < 1.5:
                phases.append(PhaseState.ORDERED)
            elif e < 3.0:
                phases.append(PhaseState.CRITICAL)
            elif e < 4.5:
                phases.append(PhaseState.COMPLEX)
            else:
                phases.append(PhaseState.DISORDERED)
        return phases

    def _identify_pattern(self, profile: EmergenceProfile) -> EmergencePattern:
        """识别涌现模式"""
        n_critical = len(profile.critical_points)
        if n_critical >= 3 and profile.self_organized_criticality > 0.7:
            return EmergencePattern.CRITICAL
        if n_critical >= 2 and profile.fractal_dimension > 1.5:
            return EmergencePattern.NETWORK
        if profile.fractal_dimension > 1.8:
            return EmergencePattern.HIERARCHICAL
        if n_critical == 1:
            return EmergencePattern.MANIFOLD
        if profile.self_organized_criticality > 0.8:
            return EmergencePattern.CHAOTIC
        return EmergencePattern.NONE

    def _composite(self, profile: EmergenceProfile) -> float:
        emergence_bonus = 0.3 if profile.emergence_detected else 0.0
        soc = profile.self_organized_criticality
        fractal = min(profile.fractal_dimension / 2.0, 1.0)
        fisher = min(profile.fisher_information / 10.0, 1.0)
        critical_count = min(len(profile.critical_points) / 3.0, 1.0)

        score = 0.30 * soc + 0.20 * fractal + 0.20 * fisher + 0.15 * critical_count + emergence_bonus
        return float(min(max(score, 0.0), 1.0))


class EmergenceTheoretical:
    """T9 理论版 — 基于重整化群和相变的完整分析"""

    def __init__(self, window_size: int = 128, step: int = 32,
                 critical_threshold: float = 0.12):
        self.window_size = window_size
        self.step = step
        self.critical_threshold = critical_threshold

    def analyze(self, text: str) -> EmergenceProfile:
        if not text.strip():
            return EmergenceProfile()

        windows = _sliding_windows(text, self.window_size, self.step)
        if len(windows) < 3:
            return EmergenceProfile(composite_score=0.3)

        entropy = np.array([_shannon_entropy_of_window(w) for w in windows])
        ttr = np.array([_type_token_ratio(w) for w in windows])

        profile = EmergenceProfile()
        profile.order_parameter_curve = [float(v) for v in entropy]
        profile.susceptibility_curve = self._compute_susceptibility(entropy)
        profile.complexity_gradient = self._compute_complexity_gradient(entropy, ttr)
        profile.critical_points = self._detect_phase_transitions(entropy)
        profile.emergence_detected = len(profile.critical_points) > 0
        profile.fractal_dimension = self._renormalized_fractal_dimension(entropy)
        profile.self_organized_criticality = self._avalanche_analysis(entropy)
        profile.fisher_information = self._full_fisher_information(entropy)
        profile.phase_diagram = self._landau_phase_classification(entropy)
        profile.emergence_pattern = self._identify_pattern(profile)
        profile.composite_score = self._composite(profile)

        return profile

    def _compute_susceptibility(self, entropy: np.ndarray) -> list[float]:
        """重整化群响应率"""
        n = len(entropy)
        if n < 3:
            return [0.0] * n

        susceptibility = []
        for i in range(n):
            weights = np.exp(-0.5 * ((np.arange(n) - i) / max(1, n / 8)) ** 2)
            weighted_mean = np.average(entropy, weights=weights)
            weighted_var = np.average((entropy - weighted_mean) ** 2, weights=weights)
            susceptibility.append(float(sqrt(weighted_var)))
        return susceptibility

    def _compute_complexity_gradient(self, entropy: np.ndarray,
                                      ttr: np.ndarray) -> list[float]:
        """综合复杂度梯度 (联合熵 × TTR)"""
        combined = entropy * ttr
        gradient = np.gradient(combined)
        return [float(v) for v in gradient]

    def _detect_phase_transitions(self, entropy: np.ndarray) -> list[CriticalPoint]:
        """基于Landau理论的相变检测"""
        points = []
        n = len(entropy)
        if n < 5:
            return points

        for i in range(2, n - 2):
            d1 = entropy[i] - entropy[i - 1]
            d2 = entropy[i + 1] - entropy[i]
            curvature = d2 - d1

            local_std = np.std(entropy[max(0, i - 3):min(n, i + 4)])

            if abs(curvature) > 0.05 and local_std > 0.15:
                phase_before = self._local_phase(entropy[max(0, i - 5):i])
                phase_after = self._local_phase(entropy[i + 1:min(n, i + 6)])

                if phase_before != phase_after:
                    points.append(CriticalPoint(
                        position=i * self.step + self.window_size // 2,
                        order_parameter=float(entropy[i]),
                        susceptibility=float(local_std),
                        phase_before=phase_before,
                        phase_after=phase_after,
                        emergence_magnitude=float(abs(curvature) + local_std),
                    ))

        return sorted(points, key=lambda p: p.emergence_magnitude, reverse=True)[:10]

    def _local_phase(self, entropy_segment: np.ndarray) -> PhaseState:
        if len(entropy_segment) < 2:
            return PhaseState.DISORDERED
        m, s = entropy_segment.mean(), entropy_segment.std()
        if s < 0.08 and m < 2.0:
            return PhaseState.ORDERED
        if s > 0.35:
            return PhaseState.CRITICAL
        if m > 3.5:
            return PhaseState.COMPLEX
        return PhaseState.DISORDERED

    def _renormalized_fractal_dimension(self, entropy: np.ndarray) -> float:
        """重整化分形维度 — 多尺度粗粒化"""
        n = len(entropy)
        if n < 8:
            return 1.0

        dimensions = []
        coarse_levels = [1, 2, 4, 8]
        for level in coarse_levels:
            if n < level * 2:
                continue
            coarse = np.array([
                np.mean(entropy[i:i + level])
                for i in range(0, n - level + 1, level)
            ])
            if len(coarse) >= 4:
                dim = _box_counting_dimension(coarse)
                dimensions.append(dim)

        return float(np.mean(dimensions)) if dimensions else 1.0

    def _avalanche_analysis(self, entropy: np.ndarray) -> float:
        """雪崩动力学分析 — 自组织临界性"""
        n = len(entropy)
        if n < 10:
            return 0.3

        threshold = np.mean(entropy) + 0.5 * np.std(entropy)
        above = entropy > threshold

        avalanche_sizes = []
        current_size = 0
        for a in above:
            if a:
                current_size += 1
            else:
                if current_size > 0:
                    avalanche_sizes.append(current_size)
                current_size = 0
        if current_size > 0:
            avalanche_sizes.append(current_size)

        if len(avalanche_sizes) < 5:
            return 0.3

        sizes = np.array(avalanche_sizes)
        hist, edges = np.histogram(sizes, bins=min(15, len(set(sizes))))
        centers = (edges[:-1] + edges[1:]) / 2

        positive = (hist > 0) & (centers > 0)
        if np.sum(positive) < 3:
            return 0.3

        log_x = np.log(centers[positive])
        log_y = np.log(hist[positive])

        slope, _, r, _, _ = stats.linregress(log_x, log_y)
        r2 = r ** 2

        if 1.0 < -slope < 3.5:
            return float(r2 * 0.8 + 0.2)
        return float(r2 * 0.4)

    def _full_fisher_information(self, entropy: np.ndarray) -> float:
        """完整Fisher信息"""
        n = len(entropy)
        if n < 3:
            return 0.0

        sigma = np.std(entropy)
        if sigma < 1e-6:
            return 0.0

        mu = np.mean(entropy)
        z_scores = (entropy - mu) / sigma
        kernelled = np.exp(-0.5 * z_scores ** 2)
        kernelled = kernelled / (kernelled.sum() + 1e-12)

        fi = 0.0
        for i in range(len(kernelled) - 1):
            dp = kernelled[i + 1] - kernelled[i]
            fi += dp * dp / (kernelled[i] + 1e-12)

        return float(fi * 100)

    def _landau_phase_classification(self, entropy: np.ndarray) -> list[PhaseState]:
        """基于Landau理论的相态分类"""
        phases = []
        mean_e = np.mean(entropy)
        std_e = np.std(entropy)

        for e in entropy:
            z = (e - mean_e) / (std_e + 1e-12)
            if z < -1.0:
                phases.append(PhaseState.ORDERED)
            elif -1.0 <= z < 0.5:
                phases.append(PhaseState.DISORDERED)
            elif 0.5 <= z < 1.5:
                phases.append(PhaseState.CRITICAL)
            else:
                phases.append(PhaseState.COMPLEX)
        return phases

    def _identify_pattern(self, profile: EmergenceProfile) -> EmergencePattern:
        n_critical = len(profile.critical_points)
        if n_critical >= 4 and profile.self_organized_criticality > 0.75:
            return EmergencePattern.CRITICAL
        if n_critical >= 2 and profile.fractal_dimension > 1.6:
            return EmergencePattern.NETWORK
        if n_critical >= 3:
            return EmergencePattern.HIERARCHICAL
        if n_critical == 1 and profile.fisher_information > 5.0:
            return EmergencePattern.MANIFOLD
        if profile.self_organized_criticality > 0.85:
            return EmergencePattern.CHAOTIC
        return EmergencePattern.NONE

    def _composite(self, profile: EmergenceProfile) -> float:
        emergence_bonus = 0.25 if profile.emergence_detected else 0.0
        soc = profile.self_organized_criticality
        fractal = min(profile.fractal_dimension / 2.2, 1.0)
        fisher = min(profile.fisher_information / 12.0, 1.0)
        c_count = min(len(profile.critical_points) / 4.0, 1.0)

        score = 0.25 * soc + 0.25 * fractal + 0.20 * fisher + 0.15 * c_count + emergence_bonus
        return float(min(max(score, 0.0), 1.0))


class EmergenceDynamicsEngine:
    """T9 涌现动力学引擎 — 统一接口"""

    def __init__(self, mode: str = "auto", **kwargs: Any) -> None:
        self.mode = mode
        self._engineering = EmergenceEngineering(**kwargs)
        self._theoretical = EmergenceTheoretical(**kwargs)

    def analyze(self, text: str, theoretical: bool = False) -> EmergenceProfile:
        if theoretical or self.mode == "theoretical":
            return self._theoretical.analyze(text)
        return self._engineering.analyze(text)

    def emergence_timeline(self, text: str) -> dict[str, Any]:
        """生成涌现时间线"""
        profile = self.analyze(text)
        return {
            "total_points": len(profile.critical_points),
            "points": [
                {
                    "position": p.position,
                    "phase_transition": f"{p.phase_before.value} → {p.phase_after.value}",
                    "magnitude": round(p.emergence_magnitude, 4),
                    "order_parameter": round(p.order_parameter, 4),
                }
                for p in profile.critical_points
            ],
            "order_parameter_curve": profile.order_parameter_curve,
            "susceptibility_curve": profile.susceptibility_curve,
        }

    def compare_emergence(self, text_a: str, text_b: str) -> dict[str, Any]:
        """比较两段文本的涌现特征"""
        profile_a = self.analyze(text_a)
        profile_b = self.analyze(text_b)

        return {
            "text_a_pattern": profile_a.emergence_pattern.value,
            "text_b_pattern": profile_b.emergence_pattern.value,
            "text_a_composite": round(profile_a.composite_score, 4),
            "text_b_composite": round(profile_b.composite_score, 4),
            "a_more_emergent": profile_a.composite_score > profile_b.composite_score,
            "fractal_difference": round(
                profile_a.fractal_dimension - profile_b.fractal_dimension, 4
            ),
            "soc_difference": round(
                profile_a.self_organized_criticality - profile_b.self_organized_criticality, 4
            ),
        }
