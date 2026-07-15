"""
l_system.py — L系统分形生成器

实现上下文无关 L-system 的字符串重写、海龟绘图解释器、
以及参数化 L-system 与随机变体。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class LSystem:
    """L-system 字符串重写系统。"""

    def __init__(self, axiom: str, rules: Dict[str, str],
                 angle: float = 90.0, step: float = 1.0):
        self.axiom = axiom
        self.rules = rules
        self.angle_deg = angle
        self.step = step
        self.current = axiom
        self.generation = 0

    def rewrite(self, iterations: int = 1) -> str:
        """执行 n 次重写。"""
        s = self.axiom
        for _ in range(iterations):
            s = "".join(self.rules.get(c, c) for c in s)
        self.current = s
        self.generation = iterations
        return s

    def interpret_turtle(self, s: Optional[str] = None) -> List[Tuple[float, float]]:
        """将 L-system 字符串解释为海龟路径点序列。"""
        if s is None:
            s = self.current
        x, y = 0.0, 0.0
        heading = 0.0
        points = [(x, y)]
        stack: List[Tuple[float, float, float]] = []
        for c in s:
            if c == "F" or c == "G":
                rad = math.radians(heading)
                x += self.step * math.cos(rad)
                y += self.step * math.sin(rad)
                points.append((x, y))
            elif c == "f":
                rad = math.radians(heading)
                x += self.step * math.cos(rad)
                y += self.step * math.sin(rad)
            elif c == "+":
                heading += self.angle_deg
            elif c == "-":
                heading -= self.angle_deg
            elif c == "[":
                stack.append((x, y, heading))
            elif c == "]":
                if stack:
                    x, y, heading = stack.pop()
                    points.append((x, y))
        return points

    def bounding_box(self, points: Optional[List[Tuple[float, float]]] = None) -> Tuple[float, float, float, float]:
        """计算路径的包围盒。"""
        if points is None:
            points = self.interpret_turtle()
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        return min(xs), max(xs), min(ys), max(ys)

    def scale_to_fit(self, points: List[Tuple[float, float]],
                     target_width: float, target_height: float) -> List[Tuple[float, float]]:
        """缩放路径到目标尺寸。"""
        min_x, max_x, min_y, max_y = self.bounding_box(points)
        w = max_x - min_x if max_x != min_x else 1.0
        h = max_y - min_y if max_y != min_y else 1.0
        scale = min(target_width / w, target_height / h)
        return [((p[0] - min_x) * scale, (p[1] - min_y) * scale) for p in points]

    def segment_count(self, s: Optional[str] = None) -> int:
        """统计线段数量。"""
        if s is None:
            s = self.current
        return s.count("F") + s.count("G")

    def string_length(self, s: Optional[str] = None) -> int:
        """字符串长度。"""
        if s is None:
            s = self.current
        return len(s)

    def production_complexity(self) -> float:
        """计算生产复杂度。"""
        return len(self.current) / max(1, len(self.axiom) * (2 ** self.generation))

    @staticmethod
    def koch_curve() -> LSystem:
        """预定义 Koch 曲线。"""
        return LSystem("F", {"F": "F+F-F-F+F"}, angle=90.0)

    @staticmethod
    def sierpinski_triangle() -> LSystem:
        """预定义 Sierpinski 三角形。"""
        return LSystem("F-G-G", {"F": "F-G+F+G-F", "G": "GG"}, angle=120.0)

    @staticmethod
    def dragon_curve() -> LSystem:
        """预定义 Dragon 曲线。"""
        return LSystem("FX", {"X": "X+YF+", "Y": "-FX-Y"}, angle=90.0)

    @staticmethod
    def barnsley_fern() -> LSystem:
        """预定义 Barnsley 蕨类。"""
        return LSystem("X", {"X": "F+[[X]-X]-F[-FX]+X", "F": "FF"}, angle=25.0)

    def branch_points(self, points: Optional[List[Tuple[float, float]]] = None) -> List[Tuple[float, float]]:
        """提取分支点（栈操作位置）。"""
        if points is None:
            points = self.interpret_turtle()
        branches = []
        stack_depth = 0
        s = self.current
        idx = 0
        for c in s:
            if c == "[":
                stack_depth += 1
                if idx < len(points):
                    branches.append(points[idx])
            elif c == "]":
                stack_depth -= 1
            elif c in "FGf":
                idx += 1
        return branches

    def stochastic_rewrite(self, rules_prob: Dict[str, List[Tuple[str, float]]]) -> str:
        """随机重写。"""
        result = []
        for c in self.current:
            if c in rules_prob:
                r = random.random()
                cum = 0.0
                for prod, prob in rules_prob[c]:
                    cum += prob
                    if r <= cum:
                        result.append(prod)
                        break
                else:
                    result.append(rules_prob[c][-1][0])
            else:
                result.append(c)
        self.current = "".join(result)
        return self.current
