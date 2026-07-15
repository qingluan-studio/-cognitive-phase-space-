"""
julia_set.py — 朱利亚集引擎

实现 Julia 集的逃逸时间渲染、填充 Julia 集检测、
以及参数空间探索与连通性分析。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Optional


class JuliaEngine:
    """朱利亚集计算引擎。"""

    def __init__(self, c_real: float = -0.7, c_imag: float = 0.27015,
                 max_iter: int = 256, escape_radius: float = 2.0):
        self.c_real = c_real
        self.c_imag = c_imag
        self.max_iter = max_iter
        self.escape_sq = escape_radius * escape_radius

    def iterate(self, z_real: float, z_imag: float) -> int:
        """计算点 z 的逃逸迭代次数。"""
        zr, zi = z_real, z_imag
        for n in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                return n
            zi = 2.0 * zr * zi + self.c_imag
            zr = zr2 - zi2 + self.c_real
        return self.max_iter

    def smooth_iterate(self, z_real: float, z_imag: float) -> float:
        """平滑逃逸时间。"""
        zr, zi = z_real, z_imag
        for n in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                log_zn = math.log(zr2 + zi2) / 2.0
                nu = math.log(log_zn / math.log(2.0)) / math.log(2.0)
                return n + 1.0 - nu
            zi = 2.0 * zr * zi + self.c_imag
            zr = zr2 - zi2 + self.c_real
        return float(self.max_iter)

    def is_connected(self) -> bool:
        """判断 Julia 集是否连通（临界点 0 不逃逸）。"""
        return self.iterate(0.0, 0.0) >= self.max_iter

    def is_in_filled_julia(self, z_real: float, z_imag: float) -> bool:
        """判断点是否在填充 Julia 集中。"""
        return self.iterate(z_real, z_imag) >= self.max_iter

    def render(self, x_min: float = -2.0, x_max: float = 2.0,
               y_min: float = -2.0, y_max: float = 2.0,
               width: int = 400, height: int = 400) -> List[List[float]]:
        """渲染平滑逃逸时间图像。"""
        image = []
        for py in range(height):
            row = []
            imag = y_min + py * (y_max - y_min) / height
            for px in range(width):
                real = x_min + px * (x_max - x_min) / width
                row.append(self.smooth_iterate(real, imag))
            image.append(row)
        return image

    def distance_estimate(self, z_real: float, z_imag: float) -> float:
        """距离估计。"""
        zr, zi = z_real, z_imag
        dr, di = 1.0, 0.0
        for _ in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                z_abs = math.sqrt(zr2 + zi2)
                d_abs = math.sqrt(dr * dr + di * di)
                return math.log(z_abs * z_abs) * z_abs / d_abs if d_abs > 0 else 0.0
            new_dr = 2.0 * (zr * dr - zi * di)
            new_di = 2.0 * (zr * di + zi * dr)
            dr, di = new_dr, new_di
            zi = 2.0 * zr * zi + self.c_imag
            zr = zr2 - zi2 + self.c_real
        return 0.0

    def period_detection(self, z_real: float = 0.0, z_imag: float = 0.0,
                         max_period: int = 20) -> int:
        """检测临界点的吸引周期。"""
        zr, zi = z_real, z_imag
        orbit = []
        for _ in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                return 0
            orbit.append((zr, zi))
            zi = 2.0 * zr * zi + self.c_imag
            zr = zr2 - zi2 + self.c_real
            if len(orbit) > 100:
                for p in range(1, max_period + 1):
                    if len(orbit) > p:
                        last = orbit[-1]
                        prev = orbit[-1 - p]
                        if abs(last[0] - prev[0]) < 1e-6 and abs(last[1] - prev[1]) < 1e-6:
                            return p
        return -1

    def set_parameter(self, c_real: float, c_imag: float) -> None:
        """更改 Julia 集参数。"""
        self.c_real = c_real
        self.c_imag = c_imag

    def parameter_space_scan(self, c_range: Tuple[float, float, float, float] = (-2.0, 2.0, -2.0, 2.0),
                             grid: int = 100) -> List[List[bool]]:
        """扫描参数空间，标记连通 Julia 集。"""
        c_min, c_max, ci_min, ci_max = c_range
        result = []
        old_cr, old_ci = self.c_real, self.c_imag
        for py in range(grid):
            row = []
            ci = ci_min + py * (ci_max - ci_min) / grid
            for px in range(grid):
                cr = c_min + px * (c_max - c_min) / grid
                self.set_parameter(cr, ci)
                row.append(self.is_connected())
            result.append(row)
        self.set_parameter(old_cr, old_ci)
        return result

    def boundary_length_estimate(self, x_min: float = -2.0, x_max: float = 2.0,
                                  y_min: float = -2.0, y_max: float = 2.0,
                                  grid: int = 200) -> float:
        """估算边界长度。"""
        dx = (x_max - x_min) / grid
        dy = (y_max - y_min) / grid
        boundary_pixels = 0
        for py in range(1, grid - 1):
            for px in range(1, grid - 1):
                real = x_min + px * dx
                imag = y_min + py * dy
                inside = self.is_in_filled_julia(real, imag)
                neighbors = [
                    self.is_in_filled_julia(real + dx, imag),
                    self.is_in_filled_julia(real - dx, imag),
                    self.is_in_filled_julia(real, imag + dy),
                    self.is_in_filled_julia(real, imag - dy),
                ]
                if inside != all(neighbors):
                    boundary_pixels += 1
        return boundary_pixels * math.sqrt(dx * dy)

    def orbit_analysis(self, z_real: float, z_imag: float) -> List[Tuple[float, float]]:
        """返回某点的轨道。"""
        orbit = [(z_real, z_imag)]
        zr, zi = z_real, z_imag
        for _ in range(min(self.max_iter, 100)):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                break
            zi = 2.0 * zr * zi + self.c_imag
            zr = zr2 - zi2 + self.c_real
            orbit.append((zr, zi))
        return orbit

    def lyapunov_exponent(self, z_real: float = 0.0, z_imag: float = 0.0) -> float:
        """估算 Lyapunov 指数。"""
        zr, zi = z_real, z_imag
        lyap = 0.0
        for n in range(1, self.max_iter + 1):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                break
            abs_z = math.sqrt(zr2 + zi2)
            if abs_z > 0:
                lyap += math.log(2.0 * abs_z)
            zi = 2.0 * zr * zi + self.c_imag
            zr = zr2 - zi2 + self.c_real
        return lyap / self.max_iter

    def newton_basins(self, x_min: float = -2.0, x_max: float = 2.0,
                      y_min: float = -2.0, y_max: float = 2.0,
                      width: int = 200, height: int = 200,
                      roots: Optional[List[complex]] = None) -> List[List[int]]:
        """计算 Julia 集相关的 Newton 分 basin。"""
        if roots is None:
            roots = [complex(1, 0), complex(-0.5, math.sqrt(3) / 2), complex(-0.5, -math.sqrt(3) / 2)]
        basins = [[-1] * width for _ in range(height)]
        for py in range(height):
            for px in range(width):
                z = complex(x_min + px * (x_max - x_min) / width,
                            y_min + py * (y_max - y_min) / height)
                for _ in range(50):
                    if abs(z) < 1e-10:
                        break
                    dz = sum(1.0 / (z - r) for r in roots)
                    z = z - 1.0 / dz if dz != 0 else z
                for idx, r in enumerate(roots):
                    if abs(z - r) < 1e-3:
                        basins[py][px] = idx
                        break
        return basins
