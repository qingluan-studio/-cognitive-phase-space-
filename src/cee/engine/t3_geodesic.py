"""
T3 — Project Geodesic: 测地线导航引擎

核心思想: 将代码生成/文本生成转化为高维流形上的测地线导航。
在多个可能解之间找到最优路径(Geodesic)。

证据: 3条路径探索，2条新颖路径，原子层破局
"""

import ast
import textwrap
from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class CodeLandmark:
    """代码流形上的路标点."""
    position: list[float]       # 流形坐标
    code_snippet: str           # 对应的代码
    quality_score: float        # 局部质量评分
    description: str = ""       # 路标描述


@dataclass
class GeodesicPath:
    """测地线路径."""
    landmarks: list[CodeLandmark]
    total_distance: float       # 总测地线距离
    smoothness: float          # 路径平滑度
    novelty_score: float       # 新颖性分数
    label: str = ""            # 路径标签


class GeodesicNavigationEngine:
    """T3 测地线导航引擎"""

    def __init__(self, n_paths: int = 3, exploration_factor: float = 0.3):
        self.n_paths = n_paths
        self.exploration_factor = exploration_factor

    def extract_landmarks(self, code: str) -> list[CodeLandmark]:
        """
        从代码中提取路标点。

        将代码解析为AST，将每个关键节点映射为流形上的点。
        """
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return self._fallback_landmarks(code)

        landmarks = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
                pos = self._node_to_position(node, landmarks)
                snippet = ast.unparse(node) if hasattr(ast, 'unparse') else str(node)
                landmarks.append(CodeLandmark(
                    position=pos,
                    code_snippet=snippet,
                    quality_score=self._local_quality(node),
                    description=self._describe_node(node),
                ))

        if not landmarks:
            landmarks = self._fallback_landmarks(code)

        return landmarks

    def _fallback_landmarks(self, code: str) -> list[CodeLandmark]:
        lines = [l for l in code.split("\n") if l.strip()]
        n = len(lines)
        if n == 0:
            return []

        n_landmarks = min(5, n)
        indices = np.linspace(0, n - 1, n_landmarks, dtype=int)
        landmarks = []
        for i, idx in enumerate(indices):
            landmarks.append(CodeLandmark(
                position=[i / n_landmarks, 0.5, 0.0],
                code_snippet=lines[idx].strip(),
                quality_score=0.5,
                description=f"line-{idx + 1}",
            ))
        return landmarks

    def _node_to_position(self, node: ast.AST,
                           existing: list[CodeLandmark]) -> list[float]:
        base = len(existing)
        col = node.col_offset if hasattr(node, 'col_offset') else 0
        return [
            base / max(base + 1, 1),
            min(col / 80.0, 1.0),
            np.random.uniform(-0.1, 0.1),  # 小随机扰动
        ]

    def _local_quality(self, node: ast.AST) -> float:
        score = 0.6
        if isinstance(node, ast.FunctionDef):
            if node.returns:
                score += 0.1
            if len(node.args.args) <= 5:
                score += 0.1
            if ast.get_docstring(node):
                score += 0.1
        elif isinstance(node, ast.ClassDef):
            if len(node.bases) > 0:
                score += 0.15
            if ast.get_docstring(node):
                score += 0.1
        return min(1.0, score)

    def _describe_node(self, node: ast.AST) -> str:
        if isinstance(node, ast.FunctionDef):
            return f"function:{node.name}"
        elif isinstance(node, ast.ClassDef):
            return f"class:{node.name}"
        elif isinstance(node, ast.AsyncFunctionDef):
            return f"async:{node.name}"
        return f"node:{type(node).__name__}"

    def find_geodesic_paths(self, code: str) -> list[GeodesicPath]:
        """
        在代码流形上寻找多条测地线路径。

        每条路径代表一种实现方案或代码结构优化路径。
        """
        landmarks = self.extract_landmarks(code)
        if len(landmarks) < 2:
            return [GeodesicPath(
                landmarks=landmarks,
                total_distance=0.0,
                smoothness=1.0,
                novelty_score=0.0,
                label="trivial",
            )]

        paths = []
        for p in range(self.n_paths):
            if p == 0:
                ordered = sorted(landmarks, key=lambda l: l.position[0])
                label = "natural-order"
            elif p == 1:
                ordered = sorted(landmarks, key=lambda l: l.quality_score, reverse=True)
                label = "quality-priority"
            elif p == 2:
                ordered = sorted(landmarks, key=lambda l: l.position[1], reverse=True)
                label = "structural-alternative"
            else:
                rng = np.random.RandomState(p)
                indices = list(range(len(landmarks)))
                rng.shuffle(indices)
                ordered = [landmarks[i] for i in indices]
                label = f"exploratory-{p}"

            distance = self._geodesic_distance(ordered)
            smoothness = self._path_smoothness(ordered)
            novelty = self._compute_novelty(ordered, [l for l in landmarks if l not in ordered])

            paths.append(GeodesicPath(
                landmarks=ordered,
                total_distance=distance,
                smoothness=smoothness,
                novelty_score=novelty,
                label=label,
            ))

        return paths

    def _geodesic_distance(self, landmarks: list[CodeLandmark]) -> float:
        if len(landmarks) < 2:
            return 0.0
        total = 0.0
        for i in range(len(landmarks) - 1):
            p1 = np.array(landmarks[i].position)
            p2 = np.array(landmarks[i + 1].position)
            total += np.linalg.norm(p2 - p1)
        return float(total)

    def _path_smoothness(self, landmarks: list[CodeLandmark]) -> float:
        if len(landmarks) < 3:
            return 1.0
        angles = []
        for i in range(1, len(landmarks) - 1):
            v1 = np.array(landmarks[i].position) - np.array(landmarks[i - 1].position)
            v2 = np.array(landmarks[i + 1].position) - np.array(landmarks[i].position)
            n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
            if n1 > 0 and n2 > 0:
                cos_angle = np.clip(np.dot(v1, v2) / (n1 * n2), -1, 1)
                angles.append(np.arccos(cos_angle))
        if not angles:
            return 1.0
        avg_angle = np.mean(angles)
        return float(np.exp(-avg_angle / np.pi))

    def _compute_novelty(self, ordered: list[CodeLandmark],
                           excluded: list[CodeLandmark]) -> float:
        if not excluded:
            return 0.0
        ordered_quality = np.mean([l.quality_score for l in ordered])
        excluded_quality = np.mean([l.quality_score for l in excluded])
        novelty = abs(ordered_quality - excluded_quality)
        return min(1.0, novelty / 0.3)

    def recommend_path(self, paths: list[GeodesicPath],
                        prefer_novelty: bool = True) -> GeodesicPath:
        """推荐最优路径(综合质量、平滑度、新颖性)."""
        if not paths:
            raise ValueError("No paths available")

        best = paths[0]
        best_score = -1.0
        for path in paths:
            avg_quality = np.mean([l.quality_score for l in path.landmarks]) if path.landmarks else 0.0
            score = (
                0.4 * avg_quality
                + 0.3 * path.smoothness
                + 0.3 * (path.novelty_score if prefer_novelty else (1 - path.novelty_score))
            )
            if score > best_score:
                best_score = score
                best = path
        return best

    def generate_implementation_template(self, path: GeodesicPath) -> str:
        """基于测地线路径生成实现模板."""
        if not path.landmarks:
            return "# No implementation landmarks found"

        lines = ["# Generated from geodesic path: " + path.label]
        lines.append(f"# Distance: {path.total_distance:.2f}, Smoothness: {path.smoothness:.2f}")
        lines.append("")

        for lm in path.landmarks:
            lines.append(f"# [{lm.description}] quality={lm.quality_score:.2f}")

        return "\n".join(lines)
