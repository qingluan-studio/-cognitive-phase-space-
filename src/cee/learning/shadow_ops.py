"""影子运维 — 在线策略梯度优化。

同时运行主副两条编排流水线：
- 主线: 对外暴露的正常策略
- 影子线: 略有不同的参数（分解粒度、共识策略等）
- 对比两条输出质量和成本
- 逐步向最优方向调整

不改变主策略，只在后台收集对比数据。
"""

import copy
import math
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


class OptimizationDimension(Enum):
    TASK_GRANULARITY = "task_granularity"
    CONSENSUS_STRATEGY = "consensus_strategy"
    AGENT_COUNT = "agent_count"
    TEMPERATURE = "temperature"
    MAX_ITERATIONS = "max_iterations"
    REVIEW_DEPTH = "review_depth"
    PARALLEL_DEGREE = "parallel_degree"


@dataclass
class ShadowConfig:
    """影子配置 — 与主线略有不同的参数。"""

    name: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    description: str = ""


@dataclass
class ShadowTrial:
    """单次影子试验结果。"""

    trial_id: str = ""
    config: ShadowConfig = field(default_factory=ShadowConfig)
    main_score: float = 0.0
    shadow_score: float = 0.0
    improvement: float = 0.0
    cost_main: dict[str, float] = field(default_factory=dict)
    cost_shadow: dict[str, float] = field(default_factory=dict)
    winner: str = ""
    timestamp: float = field(default_factory=time.time)

    @property
    def shadow_wins(self) -> bool:
        return self.improvement > 0


@dataclass
class OptimizationAdvice:
    """优化建议。"""

    dimension: OptimizationDimension
    current_value: Any
    recommended_value: Any
    confidence: float
    trials_supporting: int
    avg_improvement: float
    reasoning: str = ""


class HyperOptimizer:
    """超参数优化器 — 网格搜索 + 模拟退火。

    从影子试验数据中学习最优配置。
    """

    def __init__(self, param_space: Optional[dict] = None) -> None:
        self._param_space = param_space or {}
        self._history: list[tuple[dict, float]] = []
        self._lock = threading.RLock()

    def set_param_space(self, **ranges: list) -> None:
        self._param_space = ranges

    def grid_search(
        self, eval_fn: Callable[[dict], float], top_k: int = 5
    ) -> list[tuple[dict, float]]:
        keys = list(self._param_space.keys())
        if not keys:
            return []

        def _grid(idx: int, current: dict, results: list):
            if idx == len(keys):
                score = eval_fn(copy.copy(current))
                results.append((copy.copy(current), score))
                return
            key = keys[idx]
            for val in self._param_space[key]:
                current[key] = val
                _grid(idx + 1, current, results)

        results: list[tuple[dict, float]] = []
        _grid(0, {}, results)
        results.sort(key=lambda x: x[1], reverse=True)

        with self._lock:
            self._history.extend(results)
        return results[:top_k]

    def simulated_annealing(
        self,
        eval_fn: Callable[[dict], float],
        iterations: int = 100,
        initial_temp: float = 1.0,
        cooling_rate: float = 0.95,
    ) -> dict:
        import random
        current = {k: random.choice(v) for k, v in self._param_space.items()}
        current_score = eval_fn(current)
        best = copy.copy(current)
        best_score = current_score
        temp = initial_temp

        for _ in range(iterations):
            neighbor = copy.copy(current)
            key = random.choice(list(self._param_space.keys()))
            neighbor[key] = random.choice(self._param_space[key])
            neighbor_score = eval_fn(neighbor)

            delta = neighbor_score - current_score
            if delta > 0 or random.random() < math.exp(delta / max(temp, 1e-8)):
                current = neighbor
                current_score = neighbor_score

            if current_score > best_score:
                best = copy.copy(current)
                best_score = current_score

            temp *= cooling_rate

        with self._lock:
            self._history.append((best, best_score))
        return best

    def get_best(self) -> tuple[dict, float]:
        with self._lock:
            if not self._history:
                return {}, 0.0
            return max(self._history, key=lambda x: x[1])

    def get_history(self) -> list[tuple[dict, float]]:
        with self._lock:
            return list(self._history)

    def reset(self) -> None:
        with self._lock:
            self._history.clear()


class ShadowRunner:
    """影子运维执行器。

    使用方式:
        runner = ShadowRunner()
        runner.set_shadow_config(ShadowConfig(name="finer_grained",
            params={"task_granularity": "fine"}))
        result = runner.compare(main_output, shadow_output, main_cost, shadow_cost)
        if result.shadow_wins:
            advice = runner.generate_advice()
    """

    def __init__(self) -> None:
        self._shadow_configs: list[ShadowConfig] = []
        self._trials: list[ShadowTrial] = []
        self._optimizer = HyperOptimizer()
        self._lock = threading.RLock()

    @property
    def trial_count(self) -> int:
        with self._lock:
            return len(self._trials)

    @property
    def optimizer(self) -> HyperOptimizer:
        return self._optimizer

    def set_shadow_config(self, config: ShadowConfig) -> None:
        with self._lock:
            for i, c in enumerate(self._shadow_configs):
                if c.name == config.name:
                    self._shadow_configs[i] = config
                    return
            self._shadow_configs.append(config)

    def remove_shadow_config(self, name: str) -> bool:
        with self._lock:
            for i, c in enumerate(self._shadow_configs):
                if c.name == name:
                    self._shadow_configs.pop(i)
                    return True
        return False

    def get_shadow_configs(self) -> list[ShadowConfig]:
        with self._lock:
            return list(self._shadow_configs)

    def compare(
        self,
        main_output: Any,
        shadow_output: Any,
        main_cost: Optional[dict] = None,
        shadow_cost: Optional[dict] = None,
        config_name: str = "",
    ) -> ShadowTrial:
        """比较主线和影子线输出。"""
        main_score = self._score_output(main_output)
        shadow_score = self._score_output(shadow_output)

        config = ShadowConfig(name="default")
        for c in self._shadow_configs:
            if c.name == config_name:
                config = c
                break
        if not config_name and self._shadow_configs:
            config = self._shadow_configs[0]

        trial = ShadowTrial(
            trial_id=str(uuid.uuid4())[:8],
            config=config,
            main_score=main_score,
            shadow_score=shadow_score,
            improvement=shadow_score - main_score,
            cost_main=main_cost or {},
            cost_shadow=shadow_cost or {},
            winner="shadow" if shadow_score > main_score else "main",
        )

        with self._lock:
            self._trials.append(trial)
        return trial

    def _score_output(self, output: Any) -> float:
        if output is None:
            return 0.0
        if isinstance(output, dict):
            text = output.get("synthesis", "")
            if not text and "result" in output:
                text = str(output["result"])
        elif isinstance(output, str):
            text = output
        else:
            text = str(output)

        if not text:
            return 0.2

        score = 0.5
        score += 0.1 * min(1.0, len(text) / 2000)
        completeness_keywords = ["conclusion", "summary", "result", "recommendation",
                                 "结论", "总结", "结果", "建议"]
        matched = sum(1 for k in completeness_keywords if k.lower() in text.lower())
        score += 0.1 * min(1.0, matched / 3)
        return min(1.0, score)

    def generate_advice(self, min_trials: int = 5) -> list[OptimizationAdvice]:
        with self._lock:
            if len(self._trials) < min_trials:
                return []

            advice_list: list[OptimizationAdvice] = []
            configs = self._shadow_configs
            for config in configs:
                relevant = [t for t in self._trials if t.config.name == config.name]
                if len(relevant) < 3:
                    continue

                wins = sum(1 for t in relevant if t.shadow_wins)
                avg_imp = sum(t.improvement for t in relevant) / len(relevant)

                if wins > len(relevant) / 2:
                    for key, val in config.params.items():
                        dim = self._guess_dimension(key)
                        if dim:
                            advice_list.append(OptimizationAdvice(
                                dimension=dim,
                                current_value="default",
                                recommended_value=val,
                                confidence=min(0.95, wins / len(relevant)),
                                trials_supporting=wins,
                                avg_improvement=avg_imp,
                                reasoning=f"影子策略 '{config.name}' 在 {wins}/{len(relevant)} 次对比中胜出",
                            ))

            return advice_list

    def _guess_dimension(self, param_name: str) -> Optional[OptimizationDimension]:
        mapping = {
            "task_granularity": OptimizationDimension.TASK_GRANULARITY,
            "granularity": OptimizationDimension.TASK_GRANULARITY,
            "consensus": OptimizationDimension.CONSENSUS_STRATEGY,
            "consensus_strategy": OptimizationDimension.CONSENSUS_STRATEGY,
            "agent_count": OptimizationDimension.AGENT_COUNT,
            "temperature": OptimizationDimension.TEMPERATURE,
            "max_iterations": OptimizationDimension.MAX_ITERATIONS,
            "review_depth": OptimizationDimension.REVIEW_DEPTH,
            "parallel": OptimizationDimension.PARALLEL_DEGREE,
            "parallel_degree": OptimizationDimension.PARALLEL_DEGREE,
        }
        return mapping.get(param_name)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            wins = sum(1 for t in self._trials if t.shadow_wins)
            avg_imp = (
                sum(t.improvement for t in self._trials) / max(len(self._trials), 1)
            )
            return {
                "total_trials": len(self._trials),
                "shadow_wins": wins,
                "main_wins": len(self._trials) - wins,
                "avg_improvement": round(avg_imp, 4),
                "active_configs": len(self._shadow_configs),
                "best_config": self._optimizer.get_best()[0],
            }

    def reset(self) -> None:
        with self._lock:
            self._trials.clear()
            self._shadow_configs.clear()
            self._optimizer.reset()
