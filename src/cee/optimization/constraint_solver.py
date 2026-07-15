"""
constraint_solver.py — 约束求解引擎

实现线性规划简化版、罚函数法、增广 Lagrangian 法、
以及可行性恢复与对偶问题求解。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class ConstraintSolver:
    """约束优化求解引擎。"""

    def __init__(self):
        self.history: List[Tuple[float, float]] = []

    def penalty_method(self, f: Callable[[List[float]], float],
                       inequalities: List[Callable[[List[float]], float]],
                       equalities: List[Callable[[List[float]], float]],
                       x0: List[float], steps: int = 1000,
                       mu_init: float = 1.0, mu_factor: float = 10.0) -> List[float]:
        """罚函数法。"""
        x = list(x0)
        mu = mu_init
        for _ in range(steps):
            def penalized(x_var):
                penalty = 0.0
                for g in inequalities:
                    val = g(x_var)
                    if val > 0:
                        penalty += val ** 2
                for h in equalities:
                    penalty += h(x_var) ** 2
                return f(x_var) + mu * penalty
            x = self._gradient_descent_step(penalized, x)
            mu *= mu_factor
            feas = self._feasibility(x, inequalities, equalities)
            self.history.append((f(x), feas))
        return x

    def augmented_lagrangian(self, f: Callable[[List[float]], float],
                             equalities: List[Callable[[List[float]], float]],
                             x0: List[float], steps: int = 1000,
                             mu: float = 10.0) -> List[float]:
        """增广 Lagrangian 法。"""
        x = list(x0)
        lambdas = [0.0] * len(equalities)
        for _ in range(steps):
            def aug_lag(x_var):
                val = f(x_var)
                for i, h in enumerate(equalities):
                    hi = h(x_var)
                    val += lambdas[i] * hi + 0.5 * mu * hi ** 2
                return val
            x = self._gradient_descent_step(aug_lag, x)
            for i, h in enumerate(equalities):
                lambdas[i] += mu * h(x)
            feas = sum(abs(h(x)) for h in equalities)
            self.history.append((f(x), feas))
        return x

    def barrier_method(self, f: Callable[[List[float]], float],
                       inequalities: List[Callable[[List[float]], float]],
                       x0: List[float], steps: int = 1000,
                       mu_init: float = 1.0, mu_factor: float = 0.1) -> List[float]:
        """内点障碍函数法。"""
        x = list(x0)
        mu = mu_init
        for _ in range(steps):
            def barrier(x_var):
                val = f(x_var)
                for g in inequalities:
                    gi = g(x_var)
                    if gi >= 0:
                        return float('inf')
                    val -= mu * math.log(-gi)
                return val
            x = self._gradient_descent_step(barrier, x, lr=0.001)
            mu *= mu_factor
            self.history.append((f(x), mu))
        return x

    def _gradient_descent_step(self, f: Callable[[List[float]], float],
                               x: List[float], lr: float = 0.01,
                               num_steps: int = 10) -> List[float]:
        """简短梯度下降。"""
        for _ in range(num_steps):
            g = self._numerical_gradient(f, x)
            for i in range(len(x)):
                x[i] -= lr * g[i]
        return x

    def _numerical_gradient(self, f: Callable[[List[float]], float],
                            x: List[float], eps: float = 1e-5) -> List[float]:
        """数值梯度。"""
        grad = []
        for i in range(len(x)):
            x_plus = list(x)
            x_minus = list(x)
            x_plus[i] += eps
            x_minus[i] -= eps
            grad.append((f(x_plus) - f(x_minus)) / (2.0 * eps))
        return grad

    def _feasibility(self, x: List[float],
                     inequalities: List[Callable[[List[float]], float]],
                     equalities: List[Callable[[List[float]], float]]) -> float:
        """计算不可行度。"""
        viol = 0.0
        for g in inequalities:
            viol += max(0.0, g(x)) ** 2
        for h in equalities:
            viol += h(x) ** 2
        return math.sqrt(viol)

    @staticmethod
    def simplex_method(c: List[float], A: List[List[float]],
                       b: List[float], max_iter: int = 100) -> Optional[List[float]]:
        """简化版单纯形法（仅用于小规模问题）。"""
        m = len(A)
        n = len(c)
        tableau = [row[:] + [1.0 if i == j else 0.0 for j in range(m)] + [b[i]] for i, row in enumerate(A)]
        tableau.append([-ci for ci in c] + [0.0] * m + [0.0])
        for _ in range(max_iter):
            last_row = tableau[-1][:-1]
            if all(val >= -1e-10 for val in last_row):
                solution = [0.0] * n
                for j in range(n):
                    col = [tableau[i][j] for i in range(m)]
                    if col.count(1.0) == 1 and col.count(0.0) == m - 1:
                        row_idx = col.index(1.0)
                        solution[j] = tableau[row_idx][-1]
                return solution
            entering = last_row.index(min(last_row))
            ratios = []
            for i in range(m):
                if tableau[i][entering] > 1e-10:
                    ratios.append(tableau[i][-1] / tableau[i][entering])
                else:
                    ratios.append(float('inf'))
            if all(r == float('inf') for r in ratios):
                return None
            leaving = ratios.index(min(ratios))
            pivot = tableau[leaving][entering]
            tableau[leaving] = [val / pivot for val in tableau[leaving]]
            for i in range(m + 1):
                if i != leaving:
                    factor = tableau[i][entering]
                    tableau[i] = [tableau[i][j] - factor * tableau[leaving][j] for j in range(len(tableau[i]))]
        return None

    def feasible_direction_method(self, f: Callable[[List[float]], float],
                                  grad_f: Callable[[List[float]], List[float]],
                                  inequalities: List[Callable[[List[float]], float]],
                                  x0: List[float], steps: int = 100) -> List[float]:
        """可行方向法（简化版）。"""
        x = list(x0)
        for _ in range(steps):
            g = grad_f(x)
            direction = [-gi for gi in g]
            alpha = 0.1
            for _ in range(10):
                x_new = [x[i] + alpha * direction[i] for i in range(len(x))]
                if all(g(x_new) <= 1e-6 for g in inequalities):
                    x = x_new
                    break
                alpha *= 0.5
            self.history.append((f(x), self._feasibility(x, inequalities, [])))
        return x

    def dual_ascent(self, f: Callable[[List[float]], float],
                    grad_f: Callable[[List[float]], List[float]],
                    A: List[List[float]], b: List[float],
                    x0: List[float], steps: int = 100,
                    lr: float = 0.01) -> List[float]:
        """对偶上升法（线性约束）。"""
        x = list(x0)
        lambda_dual = [0.0] * len(b)
        for _ in range(steps):
            grad = grad_f(x)
            for i in range(len(x)):
                grad[i] += sum(lambda_dual[j] * A[j][i] for j in range(len(b)))
            for i in range(len(x)):
                x[i] -= lr * grad[i]
            for j in range(len(b)):
                constraint_val = sum(A[j][i] * x[i] for i in range(len(x))) - b[j]
                lambda_dual[j] += lr * constraint_val
                lambda_dual[j] = max(0.0, lambda_dual[j])
            self.history.append((f(x), sum(abs(sum(A[j][i] * x[i] for i in range(len(x))) - b[j]) for j in range(len(b)))))
        return x

    def projection_gradient(self, f: Callable[[List[float]], float],
                            grad_f: Callable[[List[float]], List[float]],
                            projection: Callable[[List[float]], List[float]],
                            x0: List[float], steps: int = 100,
                            lr: float = 0.01) -> List[float]:
        """投影梯度法。"""
        x = list(x0)
        for _ in range(steps):
            g = grad_f(x)
            x = [x[i] - lr * g[i] for i in range(len(x))]
            x = projection(x)
            self.history.append((f(x), 0.0))
        return x

    def kkt_residual(self, x: List[float], grad_f: List[float],
                     A_eq: List[List[float]], b_eq: List[float],
                     A_ineq: List[List[float]], b_ineq: List[float]) -> float:
        """计算 KKT 残差。"""
        stationarity = sum(abs(grad_f[i] + sum(A_eq[j][i] for j in range(len(b_eq))) +
                               sum(A_ineq[j][i] for j in range(len(b_ineq)))) for i in range(len(x)))
        primal_feas = sum(abs(sum(A_eq[j][i] * x[i] for i in range(len(x))) - b_eq[j]) for j in range(len(b_eq)))
        primal_feas += sum(max(0.0, sum(A_ineq[j][i] * x[i] for i in range(len(x))) - b_ineq[j]) for j in range(len(b_ineq)))
        return stationarity + primal_feas
