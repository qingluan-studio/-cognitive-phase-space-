"""
T8 — Semantic Entanglement: 语义纠缠与量子启发关联引擎

将量子力学中的纠缠态概念引入文本语义分析，检测词语、句子、段落
之间深层的非局部语义关联。两个看似独立的文本单元可能在语义空间
中形成纠缠态——修改一处会非局部地影响另一处。

核心能力:
  - 语义纠缠度: 两段文本间的非局部语义关联强度
  - 纠缠网络: 全文本的纠缠关系图结构
  - 语义超距作用: 检测跨段落的隐含指代/呼应关系
  - 密度矩阵: 将文本表示为混合语义态的密度矩阵
  - 互信息谱: 词对间的量子互信息分析
  - 退相干检测: 语义纠缠随文本推进的衰减模式

双轨制:
  EntanglementEngineering (工程版): 基于共现矩阵和互信息的快速分析
  EntanglementTheoretical (理论版): 基于密度矩阵和von Neumann熵的完整分析
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from math import log2
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class EntanglementPair:
    """一对纠缠的文本单元"""
    unit_a: str
    unit_b: str
    entanglement_strength: float
    mutual_information: float
    distance: int
    pattern_type: str = "semantic"


@dataclass
class EntanglementProfile:
    """语义纠缠画像"""
    global_entanglement: float = 0.0
    pair_count: int = 0
    pairs: list[EntanglementPair] = field(default_factory=list)
    density_matrix_vn_entropy: float = 0.0
    entanglement_network_density: float = 0.0
    decoherence_curve: list[float] = field(default_factory=list)
    coherence_length: int = 0
    composite_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "global_entanglement": round(self.global_entanglement, 4),
            "pair_count": self.pair_count,
            "density_matrix_vn_entropy": round(self.density_matrix_vn_entropy, 4),
            "entanglement_network_density": round(self.entanglement_network_density, 4),
            "coherence_length": self.coherence_length,
            "composite_score": round(self.composite_score, 4),
        }


def _segment_paragraphs(text: str, unit_size: int = 1) -> list[str]:
    """将文本分割为分析单元"""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if unit_size == 1:
        return paragraphs

    segments = []
    for p in paragraphs:
        words = p.split()
        for i in range(0, len(words), unit_size):
            seg = " ".join(words[i:i + unit_size])
            if seg.strip():
                segments.append(seg)
    return segments


def _build_term_frequency_matrix(segments: list[str]) -> tuple[np.ndarray, dict[str, int]]:
    """构建词频矩阵"""
    all_terms = sorted(set(w for seg in segments for w in seg.lower().split() if len(w) > 1))
    if not all_terms:
        return np.zeros((len(segments), 1)), {"": 0}

    term_idx = {t: i for i, t in enumerate(all_terms)}
    matrix = np.zeros((len(segments), len(all_terms)))
    for i, seg in enumerate(segments):
        for w in seg.lower().split():
            if w in term_idx:
                matrix[i, term_idx[w]] += 1

    row_sums = matrix.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    return matrix / row_sums, term_idx


def _mutual_information_matrix(tf_matrix: np.ndarray) -> np.ndarray:
    """计算互信息矩阵"""
    n_segments = tf_matrix.shape[0]
    mi_matrix = np.zeros((n_segments, n_segments))

    n_terms = tf_matrix.shape[1]
    if n_terms == 0:
        return mi_matrix

    for i in range(n_segments):
        for j in range(i + 1, n_segments):
            mi = _pairwise_mutual_info(tf_matrix[i], tf_matrix[j])
            mi_matrix[i, j] = mi
            mi_matrix[j, i] = mi

    return mi_matrix


def _pairwise_mutual_info(p_i: np.ndarray, p_j: np.ndarray) -> float:
    """计算两个分布之间的互信息"""
    joint = np.outer(p_i, p_j)
    eps = 1e-12
    mi = 0.0
    for a in range(len(p_i)):
        for b in range(len(p_j)):
            if joint[a, b] > eps and p_i[a] > eps and p_j[b] > eps:
                mi += joint[a, b] * log2(joint[a, b] / (p_i[a] * p_j[b]))
    return float(mi)


def _von_neumann_entropy(density_matrix: np.ndarray) -> float:
    """计算von Neumann熵"""
    eigenvalues = np.linalg.eigvalsh(density_matrix)
    eigenvalues = eigenvalues[eigenvalues > 1e-12]
    if len(eigenvalues) == 0:
        return 0.0
    return float(-np.sum(eigenvalues * np.log2(eigenvalues)))


def _purity(density_matrix: np.ndarray) -> float:
    """计算密度矩阵的纯度 Tr(rho^2)"""
    return float(np.trace(density_matrix @ density_matrix))


class EntanglementEngineering:
    """T8 工程版 — 基于共现和互信息的快速纠缠检测"""

    def __init__(self, threshold: float = 0.3):
        self.threshold = threshold

    def analyze(self, text: str) -> EntanglementProfile:
        if not text.strip():
            return EntanglementProfile()

        segments = _segment_paragraphs(text)
        if len(segments) < 2:
            profile = EntanglementProfile()
            profile.composite_score = 0.5
            return profile

        tf_matrix, term_idx = _build_term_frequency_matrix(segments)
        if tf_matrix.shape[1] <= 1:
            return EntanglementProfile(composite_score=0.3)

        mi_matrix = _mutual_information_matrix(tf_matrix)
        profile = EntanglementProfile()
        profile.pairs = self._detect_pairs(segments, mi_matrix)
        profile.pair_count = len(profile.pairs)
        profile.global_entanglement = self._global_entanglement(mi_matrix)
        profile.entanglement_network_density = self._network_density(mi_matrix)
        profile.decoherence_curve = self._decoherence_curve(mi_matrix)
        profile.coherence_length = self._estimate_coherence_length(mi_matrix)

        density_matrix = self._build_density_matrix(tf_matrix)
        profile.density_matrix_vn_entropy = _von_neumann_entropy(density_matrix)

        profile.composite_score = self._composite(profile)
        return profile

    def _detect_pairs(self, segments: list[str],
                      mi_matrix: np.ndarray) -> list[EntanglementPair]:
        pairs = []
        n = len(segments)
        for i in range(n):
            for j in range(i + 1, n):
                mi = mi_matrix[i, j]
                if mi > self.threshold:
                    distance = j - i
                    pattern = self._classify_pattern(segments[i], segments[j])
                    pairs.append(EntanglementPair(
                        unit_a=segments[i][:50], unit_b=segments[j][:50],
                        entanglement_strength=float(mi),
                        mutual_information=float(mi),
                        distance=distance,
                        pattern_type=pattern,
                    ))
        return sorted(pairs, key=lambda p: p.entanglement_strength, reverse=True)

    def _classify_pattern(self, a: str, b: str) -> str:
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        overlap = len(words_a & words_b)
        union = len(words_a | words_b)
        jaccard = overlap / union if union > 0 else 0

        if jaccard > 0.5:
            return "coreference"
        if jaccard > 0.2:
            return "paraphrase"
        if overlap > 0:
            return "association"
        return "implicit"

    def _global_entanglement(self, mi_matrix: np.ndarray) -> float:
        """全局纠缠度 — 所有对上互信息的加权平均"""
        n = mi_matrix.shape[0]
        if n < 2:
            return 0.0

        values = []
        for i in range(n):
            for j in range(i + 1, n):
                distance = j - i
                weight = 1.0 / (1.0 + log2(1 + distance))
                values.append(mi_matrix[i, j] * weight)

        if not values:
            return 0.0
        return float(np.mean(values) * 2)

    def _network_density(self, mi_matrix: np.ndarray) -> float:
        """纠缠网络密度"""
        n = mi_matrix.shape[0]
        if n < 2:
            return 0.0

        possible_edges = n * (n - 1) / 2
        actual_edges = np.sum(mi_matrix > self.threshold) / 2 - np.sum(
            np.diag(mi_matrix) > self.threshold
        )
        return float(actual_edges / possible_edges)

    def _decoherence_curve(self, mi_matrix: np.ndarray) -> list[float]:
        """退相干曲线 — 纠缠强度随距离衰减"""
        n = mi_matrix.shape[0]
        if n < 2:
            return []

        max_dist = min(n, 20)
        curve = []
        for d in range(1, max_dist + 1):
            values = []
            for i in range(n - d):
                values.append(mi_matrix[i, i + d])
            curve.append(float(np.mean(values)) if values else 0.0)
        return curve

    def _estimate_coherence_length(self, mi_matrix: np.ndarray) -> int:
        """估计相干长度 — 纠缠强度衰减到一半时的距离"""
        curve = self._decoherence_curve(mi_matrix)
        if not curve or curve[0] == 0:
            return 1

        half = curve[0] * 0.5
        for i, v in enumerate(curve):
            if v < half:
                return i + 1
        return len(curve)

    def _build_density_matrix(self, tf_matrix: np.ndarray) -> np.ndarray:
        """构建密度矩阵"""
        n = tf_matrix.shape[0]
        if n == 0:
            return np.array([[1.0]])

        dm = np.zeros((n, n))
        for i in range(n):
            for j in range(n):
                dm[i, j] = np.dot(tf_matrix[i], tf_matrix[j]) / (
                    np.linalg.norm(tf_matrix[i]) * np.linalg.norm(tf_matrix[j]) + 1e-12
                )

        dm = dm / np.trace(dm)
        dm = (dm + dm.T) / 2
        return dm

    def _composite(self, profile: EntanglementProfile) -> float:
        global_norm = min(profile.global_entanglement / 0.5, 1.0)
        density = profile.entanglement_network_density
        vn_entropy_norm = min(profile.density_matrix_vn_entropy / 4.0, 1.0)
        coherence_norm = min(profile.coherence_length / 10.0, 1.0)

        score = 0.30 * global_norm + 0.25 * density + 0.25 * vn_entropy_norm + 0.20 * coherence_norm
        return float(min(max(score, 0.0), 1.0))


class EntanglementTheoretical:
    """T8 理论版 — 基于密度矩阵和量子信息论的完整分析"""

    def __init__(self, threshold: float = 0.25, regularization: float = 0.01):
        self.threshold = threshold
        self.regularization = regularization

    def analyze(self, text: str) -> EntanglementProfile:
        if not text.strip():
            return EntanglementProfile()

        segments = _segment_paragraphs(text, unit_size=1)
        if len(segments) < 2:
            profile = EntanglementProfile()
            profile.composite_score = 0.5
            return profile

        tf_matrix, term_idx = _build_term_frequency_matrix(segments)
        if tf_matrix.shape[1] <= 1:
            return EntanglementProfile(composite_score=0.3)

        density_matrix = self._build_regularized_density(tf_matrix)
        profile = EntanglementProfile()
        profile.density_matrix_vn_entropy = _von_neumann_entropy(density_matrix)
        profile.global_entanglement = self._negativity(density_matrix)

        concurrence_matrix = self._concurrence_matrix(tf_matrix)
        profile.pairs = self._detect_entangled_pairs(segments, concurrence_matrix)
        profile.pair_count = len(profile.pairs)
        profile.entanglement_network_density = self._network_density(concurrence_matrix)
        profile.decoherence_curve = self._decoherence_curve(concurrence_matrix)
        profile.coherence_length = self._estimate_coherence_length(concurrence_matrix)

        profile.composite_score = self._composite(profile)
        return profile

    def _build_regularized_density(self, tf_matrix: np.ndarray) -> np.ndarray:
        """构建正则化密度矩阵"""
        n = tf_matrix.shape[0]
        dm = np.zeros((n, n))
        for i in range(n):
            for j in range(n):
                n_i = np.linalg.norm(tf_matrix[i])
                n_j = np.linalg.norm(tf_matrix[j])
                dm[i, j] = np.dot(tf_matrix[i], tf_matrix[j]) / (n_i * n_j + self.regularization)

        dm = dm / np.trace(dm)
        dm = (dm + dm.T) / 2

        eigenvalues = np.linalg.eigvalsh(dm)
        if np.any(eigenvalues < 0):
            eigenvalues = np.maximum(eigenvalues, 0)
            dm = np.diag(eigenvalues)

        return dm

    def _negativity(self, density_matrix: np.ndarray) -> float:
        """计算Negativity纠缠度量"""
        n = density_matrix.shape[0]
        if n < 2:
            return 0.0

        anti_diag = np.fliplr(density_matrix)
        partial_transpose = density_matrix.copy()
        half_n = n // 2
        for i in range(half_n):
            for j in range(half_n):
                partial_transpose[i, j + half_n] = anti_diag[i, j]

        eigenvalues = np.linalg.eigvalsh(partial_transpose)
        negative_sum = -np.sum(eigenvalues[eigenvalues < 0])

        return float(min(negative_sum / (n * 0.1), 1.0))

    def _concurrence_matrix(self, tf_matrix: np.ndarray) -> np.ndarray:
        """计算Concurrence矩阵 (量子纠缠度量)"""
        n = tf_matrix.shape[0]
        conc = np.zeros((n, n))

        for i in range(n):
            for j in range(i + 1, n):
                n_i = np.linalg.norm(tf_matrix[i])
                n_j = np.linalg.norm(tf_matrix[j])

                if n_i < 1e-8 or n_j < 1e-8:
                    conc[i, j] = 0.0
                    conc[j, i] = 0.0
                    continue

                overlap = np.dot(tf_matrix[i], tf_matrix[j]) / (n_i * n_j)
                sigma_y = np.array([[0, -1j], [1j, 0]])
                rho = np.array([[1, overlap], [overlap, 1]]) / 2.0
                rho_tilde = sigma_y @ rho.conj() @ sigma_y
                r = np.real(rho @ rho_tilde)

                eigenvalues = np.linalg.eigvals(r)
                eigenvalues = np.sort(np.real(eigenvalues))[::-1]
                sqrt_eig = np.sqrt(np.maximum(eigenvalues, 0))

                concurrence = max(0.0, float(sqrt_eig[0] - sqrt_eig[1] - sqrt_eig[2] - sqrt_eig[3]))
                conc[i, j] = min(concurrence, 1.0)
                conc[j, i] = conc[i, j]

        return conc

    def _detect_entangled_pairs(self, segments: list[str],
                                 concurrence_matrix: np.ndarray) -> list[EntanglementPair]:
        pairs = []
        n = len(segments)
        for i in range(n):
            for j in range(i + 1, n):
                c = concurrence_matrix[i, j]
                if c > self.threshold:
                    pairs.append(EntanglementPair(
                        unit_a=segments[i][:50], unit_b=segments[j][:50],
                        entanglement_strength=float(c),
                        mutual_information=float(c),
                        distance=j - i,
                        pattern_type="concurrence" if c > 0.5 else "partial",
                    ))
        return sorted(pairs, key=lambda p: p.entanglement_strength, reverse=True)[:30]

    def _network_density(self, matrix: np.ndarray) -> float:
        n = matrix.shape[0]
        if n < 2:
            return 0.0
        max_edges = n * (n - 1) / 2
        actual = np.sum(matrix > self.threshold) / 2
        return float(actual / max_edges)

    def _decoherence_curve(self, matrix: np.ndarray) -> list[float]:
        n = matrix.shape[0]
        max_dist = min(n, 20)
        curve = []
        for d in range(1, max_dist + 1):
            values = [matrix[i, i + d] for i in range(n - d)]
            curve.append(float(np.mean(values)) if values else 0.0)
        return curve

    def _estimate_coherence_length(self, matrix: np.ndarray) -> int:
        curve = self._decoherence_curve(matrix)
        if not curve or curve[0] <= 0:
            return 1
        half = curve[0] * 0.5
        for i, v in enumerate(curve):
            if v < half:
                return i + 1
        return len(curve)

    def _composite(self, profile: EntanglementProfile) -> float:
        global_norm = min(profile.global_entanglement / 0.5, 1.0)
        vn_norm = min(profile.density_matrix_vn_entropy / 5.0, 1.0)
        density = profile.entanglement_network_density
        coherence = min(profile.coherence_length / 12.0, 1.0)

        score = 0.25 * global_norm + 0.30 * vn_norm + 0.25 * density + 0.20 * coherence
        return float(min(max(score, 0.0), 1.0))


class SemanticEntanglementEngine:
    """T8 语义纠缠引擎 — 统一接口"""

    def __init__(self, mode: str = "auto", **kwargs: Any) -> None:
        self.mode = mode
        self._engineering = EntanglementEngineering(**kwargs)
        self._theoretical = EntanglementTheoretical(**kwargs)

    def analyze(self, text: str, theoretical: bool = False) -> EntanglementProfile:
        if theoretical or self.mode == "theoretical":
            return self._theoretical.analyze(text)
        return self._engineering.analyze(text)

    def pair_entanglement(self, text_a: str, text_b: str) -> float:
        """计算两段文本间的纠缠强度"""
        combined = text_a + "\n\n" + text_b
        profile = self.analyze(combined)
        if not profile.pairs:
            return 0.0

        cross_pairs = [p for p in profile.pairs
                       if p.unit_a in text_a or p.unit_b in text_a]
        if not cross_pairs:
            return profile.global_entanglement * 0.5

        return float(np.mean([p.entanglement_strength for p in cross_pairs]))

    def entanglement_network(self, text: str) -> dict[str, Any]:
        """构建完整的纠缠网络"""
        profile = self.analyze(text)
        nodes = []
        edges = []

        seen = {}
        node_id = 0
        for pair in profile.pairs:
            if pair.unit_a not in seen:
                seen[pair.unit_a] = node_id
                nodes.append({"id": node_id, "text": pair.unit_a})
                node_id += 1
            if pair.unit_b not in seen:
                seen[pair.unit_b] = node_id
                nodes.append({"id": node_id, "text": pair.unit_b})
                node_id += 1
            edges.append({
                "source": seen[pair.unit_a],
                "target": seen[pair.unit_b],
                "weight": round(pair.entanglement_strength, 4),
                "pattern": pair.pattern_type,
            })

        return {"nodes": nodes, "edges": edges, "profile": profile.to_dict()}
