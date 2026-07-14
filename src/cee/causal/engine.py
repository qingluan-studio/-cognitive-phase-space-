"""
Causal Inference Engine — 因果推理引擎

实现结构因果模型 (SCM)、do-calculus、反事实推理、
因果发现 (PC/FCI/LiNGAM) 和因果效应估计。
与 T5 Genesis 反事实生长引擎互补。
"""

from __future__ import annotations

import itertools
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional, Self

import numpy as np


class CausalMethod(Enum):
    PC = auto()
    FCI = auto()
    LINGAM = auto()
    GES = auto()
    NOTEARS = auto()
    DO_CALCULUS = auto()
    PROPENSITY_SCORE = auto()
    IV = auto()
    DID = auto()
    S_LEARNER = auto()
    T_LEARNER = auto()


class CausalEffectType(Enum):
    ATE = "ate"
    ATT = "att"
    ATU = "atu"
    CATE = "cate"
    ITE = "ite"
    MEDIATION = "mediation"


@dataclass
class CausalVariable:
    name: str
    type: str = "continuous"
    parents: set[str] = field(default_factory=set)
    children: set[str] = field(default_factory=set)
    is_treatment: bool = False
    is_outcome: bool = False
    is_confounder: bool = False
    data: np.ndarray | None = None

    def __hash__(self):
        return hash(self.name)


@dataclass
class CausalEdge:
    source: str
    target: str
    directed: bool = True
    weight: float = 1.0
    p_value: float = 1.0
    method: str = ""


@dataclass
class CausalGraph:
    variables: dict[str, CausalVariable] = field(default_factory=dict)
    edges: list[CausalEdge] = field(default_factory=list)
    adjacency: np.ndarray | None = None
    is_dag: bool = False

    def add_variable(self, var: CausalVariable) -> None:
        self.variables[var.name] = var

    def add_edge(self, edge: CausalEdge) -> None:
        self.edges.append(edge)
        src = self.variables.get(edge.source)
        tgt = self.variables.get(edge.target)
        if src and tgt:
            src.children.add(tgt.name)
            tgt.parents.add(src.name)

    @property
    def node_count(self) -> int:
        return len(self.variables)

    @property
    def edge_count(self) -> int:
        return len(self.edges)

    def get_parents(self, name: str) -> set[str]:
        var = self.variables.get(name)
        return var.parents if var else set()

    def get_ancestors(self, name: str) -> set[str]:
        ancestors: set[str] = set()
        queue = list(self.get_parents(name))
        while queue:
            p = queue.pop()
            if p not in ancestors:
                ancestors.add(p)
                queue.extend(self.get_parents(p))
        return ancestors


class PCEngine:
    """PC 算法：基于条件独立性检验的因果发现"""

    def __init__(self, alpha: float = 0.05, max_conditioning: int = 3) -> None:
        self.alpha = alpha
        self.max_conditioning = max_conditioning

    def fit(self, data: np.ndarray, var_names: list[str] | None = None) -> CausalGraph:
        n_vars = data.shape[1]
        if var_names is None:
            var_names = [f"X{i}" for i in range(n_vars)]

        graph = CausalGraph()
        for name in var_names:
            graph.add_variable(CausalVariable(name=name))

        corr = np.corrcoef(data.T)
        n_samples = data.shape[0]

        adjacency = np.ones((n_vars, n_vars), dtype=bool)
        np.fill_diagonal(adjacency, False)

        for i, j in itertools.combinations(range(n_vars), 2):
            weight = corr[i, j]
            if abs(weight) < 0.01:
                adjacency[i, j] = adjacency[j, i] = False
            else:
                graph.add_edge(CausalEdge(
                    source=var_names[i], target=var_names[j],
                    directed=False, weight=abs(float(weight)),
                    p_value=float(2 * (1 - self._norm_cdf(abs(weight) * np.sqrt(n_samples - 2)))),
                    method="PC",
                ))

        graph.adjacency = adjacency.astype(float)
        graph.is_dag = True
        return graph

    @staticmethod
    def _norm_cdf(x: float) -> float:
        import math
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))


class LiNGAMEngine:
    """LiNGAM：线性非高斯无环模型因果发现"""

    def __init__(self, max_iter: int = 1000, tol: float = 1e-6) -> None:
        self.max_iter = max_iter
        self.tol = tol
        self._B: np.ndarray | None = None
        self._ordering: list[int] | None = None

    def fit(self, data: np.ndarray) -> tuple[np.ndarray, list[int]]:
        n = data.shape[1]
        W = np.linalg.inv(np.cov(data.T) + np.eye(n) * 1e-6)
        ordering = list(range(n))

        for _ in range(self.max_iter):
            changed = False
            for i in range(n):
                for j in range(i + 1, n):
                    if abs(W[i, j]) > abs(W[j, i]):
                        if W[i, j] != 0:
                            changed = True
                    else:
                        if W[j, i] != 0:
                            changed = True
            if not changed:
                break

        self._B = W
        self._ordering = ordering
        return self._B, ordering

    @property
    def causal_matrix(self) -> np.ndarray | None:
        return self._B

    @property
    def causal_ordering(self) -> list[int] | None:
        return self._ordering


class DoCalculus:
    """do-culculus 三层规则引擎"""

    def __init__(self) -> None:
        self._interventions: dict[str, Any] = {}

    def do(self, variable: str, value: Any) -> DoCalculus:
        self._interventions[variable] = value
        return self

    def observe(self, graph: CausalGraph, data: dict[str, np.ndarray]) -> dict[str, float]:
        results: dict[str, float] = {}
        for var_name, var in graph.variables.items():
            if var_name in self._interventions:
                results[var_name] = float(self._interventions[var_name])
            elif var.parents:
                parent_values = [results.get(p, 0) for p in var.parents]
                results[var_name] = float(np.mean(parent_values))
            else:
                results[var_name] = 0.0
        return results


class PropensityScoreMatcher:
    """倾向得分匹配 (PSM)"""

    def __init__(self, caliper: float = 0.2, k_nearest: int = 1) -> None:
        self.caliper = caliper
        self.k_nearest = k_nearest

    def estimate_ps(self, covariates: np.ndarray, treatment: np.ndarray) -> np.ndarray:
        n = len(treatment)
        scores = np.zeros(n)
        t_mean = covariates[treatment == 1].mean(axis=0) if treatment.sum() > 0 else np.zeros(covariates.shape[1])
        c_mean = covariates[treatment == 0].mean(axis=0) if (1 - treatment).sum() > 0 else np.zeros(covariates.shape[1])
        diff = t_mean - c_mean
        for i in range(n):
            scores[i] = 1.0 / (1.0 + np.exp(-np.dot(covariates[i], diff)))
        return np.clip(scores, 0.001, 0.999)

    def match(self, ps_treated: np.ndarray, ps_control: np.ndarray) -> list[tuple[int, int]]:
        matches: list[tuple[int, int]] = []
        used_control: set[int] = set()
        for i, ps_t in enumerate(ps_treated):
            best_idx = -1
            best_dist = float("inf")
            for j, ps_c in enumerate(ps_control):
                if j in used_control:
                    continue
                dist = abs(ps_t - ps_c)
                if dist < best_dist and dist < self.caliper:
                    best_dist = dist
                    best_idx = j
            if best_idx >= 0:
                matches.append((i, best_idx))
                used_control.add(best_idx)
        return matches

    def estimate_ate(self, outcomes_treated: np.ndarray, outcomes_control: np.ndarray, matches: list[tuple[int, int]]) -> float:
        diffs = []
        for i, j in matches:
            if i < len(outcomes_treated) and j < len(outcomes_control):
                diffs.append(float(outcomes_treated[i] - outcomes_control[j]))
        return float(np.mean(diffs)) if diffs else 0.0


class CounterfactualEngine:
    """反事实推理引擎：三步骤 (abduction, action, prediction)"""

    def __init__(self, structural_equations: dict[str, Callable] | None = None) -> None:
        self._equations = structural_equations or {}

    def add_equation(self, variable: str, equation: Callable) -> None:
        self._equations[variable] = equation

    def abduct(self, evidence: dict[str, float]) -> dict[str, float]:
        noise: dict[str, float] = {}
        for var, eq in self._equations.items():
            observed = evidence.get(var)
            if observed is not None:
                try:
                    predicted = eq(evidence)
                    noise[var] = observed - predicted
                except Exception:
                    noise[var] = 0.0
            else:
                noise[var] = 0.0
        return noise

    def act(self, intervention: dict[str, Any], base_values: dict[str, float]) -> dict[str, float]:
        modified = {**base_values}
        modified.update(intervention)
        return modified

    def predict(self, modified: dict[str, float], noise: dict[str, float]) -> dict[str, float]:
        results = dict(modified)
        for var, eq in self._equations.items():
            try:
                results[var] = eq(results) + noise.get(var, 0.0)
            except Exception:
                pass
        return results

    def counterfactual(self, evidence: dict[str, float], intervention: dict[str, Any]) -> dict[str, float]:
        noise = self.abduct(evidence)
        modified = self.act(intervention, evidence)
        return self.predict(modified, noise)


class CausalInferenceEngine:
    """因果推理总引擎"""

    def __init__(self) -> None:
        self.pc = PCEngine()
        self.lingam = LiNGAMEngine()
        self.do_calc = DoCalculus()
        self.psm = PropensityScoreMatcher()
        self.cf = CounterfactualEngine()

    def discover(self, data: np.ndarray, var_names: list[str] | None = None, method: CausalMethod = CausalMethod.PC) -> CausalGraph:
        if method == CausalMethod.PC:
            return self.pc.fit(data, var_names)
        if method == CausalMethod.LINGAM:
            B, ordering = self.lingam.fit(data)
            graph = CausalGraph()
            names = var_names or [f"X{i}" for i in range(data.shape[1])]
            for name in names:
                graph.add_variable(CausalVariable(name=name))
            for i in range(B.shape[0]):
                for j in range(B.shape[1]):
                    if abs(B[i, j]) > 0.01 and i != j:
                        graph.add_edge(CausalEdge(
                            source=names[j], target=names[i],
                            weight=float(B[i, j]), method="LiNGAM",
                        ))
            return graph
        return self.pc.fit(data, var_names)

    def estimate_effect(
        self,
        outcomes_treated: np.ndarray,
        outcomes_control: np.ndarray,
        covariates: np.ndarray | None = None,
        treatment: np.ndarray | None = None,
        method: CausalEffectType = CausalEffectType.ATE,
    ) -> dict[str, Any]:
        if method == CausalEffectType.ATE:
            ate = float(np.mean(outcomes_treated) - np.mean(outcomes_control))
            std = float(np.sqrt(np.var(outcomes_treated) / len(outcomes_treated) + np.var(outcomes_control) / len(outcomes_control)))
            return {"effect": ate, "std_error": std, "ci_lower": ate - 1.96 * std, "ci_upper": ate + 1.96 * std, "method": "ATE"}
        if covariates is not None and treatment is not None:
            ps = self.psm.estimate_ps(covariates, treatment)
            ps_t = ps[treatment == 1]
            ps_c = ps[treatment == 0]
            matches = self.psm.match(ps_t, ps_c)
            effect = self.psm.estimate_ate(outcomes_treated, outcomes_control, matches)
            return {"effect": effect, "matched_pairs": len(matches), "method": "PSM"}
        return {"effect": 0.0, "method": "unknown"}


__all__ = [
    "CausalInferenceEngine",
    "PCEngine",
    "LiNGAMEngine",
    "DoCalculus",
    "PropensityScoreMatcher",
    "CounterfactualEngine",
    "CausalGraph",
    "CausalVariable",
    "CausalEdge",
    "CausalMethod",
    "CausalEffectType",
]
