"""
mandelbrot.py — 曼德勃罗集引擎

实现复平面上 Mandelbrot 集的逃逸时间算法、
边界追踪、距离估计与多精度着色。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Callable, Optional


class MandelbrotEngine:
    """曼德勃罗集计算引擎。"""

    def __init__(self, max_iter: int = 256, escape_radius: float = 2.0):
        self.max_iter = max_iter
        self.escape_radius = escape_radius
        self.escape_sq = escape_radius * escape_radius

    def iterate(self, c_real: float, c_imag: float) -> int:
        """计算点 (c_real, c_imag) 的逃逸迭代次数。"""
        zr, zi = 0.0, 0.0
        for n in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                return n
            zi = 2.0 * zr * zi + c_imag
            zr = zr2 - zi2 + c_real
        return self.max_iter

    def smooth_iterate(self, c_real: float, c_imag: float) -> float:
        """平滑逃逸时间（用于连续着色）。"""
        zr, zi = 0.0, 0.0
        for n in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                log_zn = math.log(zr2 + zi2) / 2.0
                nu = math.log(log_zn / math.log(2.0)) / math.log(2.0)
                return n + 1.0 - nu
            zi = 2.0 * zr * zi + c_imag
            zr = zr2 - zi2 + c_real
        return float(self.max_iter)

    def distance_estimate(self, c_real: float, c_imag: float) -> float:
        """计算点 c 到 Mandelbrot 集边界的距离估计。"""
        zr, zi = 0.0, 0.0
        dr, di = 0.0, 0.0
        for _ in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                z_abs = math.sqrt(zr2 + zi2)
                d_abs = math.sqrt(dr * dr + di * di)
                return math.log(z_abs * z_abs) * z_abs / d_abs if d_abs > 0 else 0.0
            new_dr = 2.0 * (zr * dr - zi * di) + 1.0
            new_di = 2.0 * (zr * di + zi * dr)
            dr, di = new_dr, new_di
            zi = 2.0 * zr * zi + c_imag
            zr = zr2 - zi2 + c_real
        return 0.0

    def is_in_set(self, c_real: float, c_imag: float) -> bool:
        """快速判断点是否在集合内（含 cardioid / period-2 bulb 检测）。"""
        q = (c_real - 0.25) ** 2 + c_imag ** 2
        if q * (q + (c_real - 0.25)) <= 0.25 * c_imag ** 2:
            return True
        if (c_real + 1.0) ** 2 + c_imag ** 2 <= 0.0625:
            return True
        return self.iterate(c_real, c_imag) >= self.max_iter

    def render(self, x_min: float = -2.5, x_max: float = 1.0,
               y_min: float = -1.25, y_max: float = 1.25,
               width: int = 400, height: int = 400) -> List[List[float]]:
        """渲染整个图像的平滑逃逸时间。"""
        image = []
        for py in range(height):
            row = []
            imag = y_min + py * (y_max - y_min) / height
            for px in range(width):
                real = x_min + px * (x_max - x_min) / width
                row.append(self.smooth_iterate(real, imag))
            image.append(row)
        return image

    def boundary_trace(self, x_min: float = -2.5, x_max: float = 1.0,
                       y_min: float = -1.25, y_max: float = 1.25,
                       grid_size: int = 200) -> List[Tuple[float, float]]:
        """通过网格扫描近似提取边界点。"""
        boundary = []
        dx = (x_max - x_min) / grid_size
        dy = (y_max - y_min) / grid_size
        for py in range(grid_size):
            for px in range(grid_size):
                real = x_min + px * dx
                imag = y_min + py * dy
                inside = self.is_in_set(real, imag)
                neighbors = [
                    self.is_in_set(real + dx, imag),
                    self.is_in_set(real - dx, imag),
                    self.is_in_set(real, imag + dy),
                    self.is_in_set(real, imag - dy),
                ]
                if inside != any(neighbors):
                    boundary.append((real, imag))
        return boundary

    def orbit_trap(self, c_real: float, c_imag: float,
                   trap_center: Tuple[float, float] = (0.0, 0.0),
                   trap_radius: float = 0.5) -> float:
        """轨道陷阱着色值。"""
        zr, zi = 0.0, 0.0
        min_dist = float('inf')
        for _ in range(self.max_iter):
            zr2 = zr * zr
            zi2 = zi * zi
            if zr2 + zi2 > self.escape_sq:
                break
            dist = math.sqrt((zr - trap_center[0]) ** 2 + (zi - trap_center[1]) ** 2)
            if dist < min_dist:
                min_dist = dist
            zi = 2.0 * zr * zi + c_imag
            zr = zr2 - zi2 + c_real
        return min_dist

    def exterior_distance_histogram(self, x_min: float = -2.5, x_max: float = 1.0,
                                    y_min: float = -1.25, y_max: float = 1.25,
                                    samples: int = 10000) -> List[int]:
        """统计外部点的距离分布直方图。"""
        bins = [0] * 20
        for _ in range(samples):
            cr = random.uniform(x_min, x_max)
            ci = random.uniform(y_min, y_max)
            if not self.is_in_set(cr, ci):
                dist = self.distance_estimate(cr, ci)
                idx = int(dist * 10)
                if 0 <= idx < 20:
                    bins[idx] += 1
        return bins

    def zoom_sequence(self, center: Tuple[float, float], initial_width: float,
                      factor: float = 2.0, steps: int = 5) -> List[Tuple[float, float, float, float]]:
        """生成逐渐缩放的视口序列。"""
        regions = []
        w = initial_width
        for _ in range(steps):
            x_min = center[0] - w / 2.0
            x_max = center[0] + w / 2.0
            y_min = center[1] - w / 2.0
            y_max = center[1] + w / 2.0
            regions.append((x_min, x_max, y_min, y_max))
            w /= factor
        return regions

    def buddha_brot(self, x_min: float = -2.5, x_max: float = 1.0,
                    y_min: float = -1.25, y_max: float = 1.25,
                    width: int = 400, height: int = 400,
                    samples: int = 100000) -> List[List[int]]:
        """Buddhabrot 密度图渲染。"""
        hist = [[0] * width for _ in range(height)]
        for _ in range(samples):
            cr = random.uniform(x_min, x_max)
            ci = random.uniform(y_min, y_max)
            if self.is_in_set(cr, ci):
                continue
            orbit = []
            zr, zi = 0.0, 0.0
            for _ in range(self.max_iter):
                zr2 = zr * zr
                zi2 = zi * zi
                if zr2 + zi2 > self.escape_sq:
                    break
                orbit.append((zr, zi))
                zi = 2.0 * zr * zi + ci
                zr = zr2 - zi2 + cr
            for zr, zi in orbit:
                px = int((zr - x_min) / (x_max - x_min) * width)
                py = int((zi - y_min) / (y_max - y_min) * height)
                if 0 <= px < width and 0 <= py < height:
                    hist[py][px] += 1
        return hist

    def cardioid_area_estimate(self, samples: int = 100000) -> float:
        """使用蒙特卡洛估算 Mandelbrot 集面积。"""
        count = 0
        for _ in range(samples):
            cr = random.uniform(-2.5, 1.0)
            ci = random.uniform(-1.25, 1.25)
            if self.is_in_set(cr, ci):
                count += 1
        total_area = 3.5 * 2.5
        return total_area * count / samples
