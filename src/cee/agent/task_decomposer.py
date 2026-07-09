"""CEE Agent Framework — Task decomposition and dependency management."""

from __future__ import annotations

import re
from collections import deque
from typing import Any

from .types import AgentCapability, AgentRole, Task, TaskStatus


class TaskDecomposer:
    """Decomposes complex goals into executable task DAGs.

    Analyzes goal descriptions and breaks them into hierarchical,
    dependency-ordered task sequences suitable for multi-agent execution.
    """

    ROLE_CAPABILITIES: dict[AgentRole, list[AgentCapability]] = {
        AgentRole.RESEARCHER: [AgentCapability.RESEARCH, AgentCapability.ANALYSIS, AgentCapability.SYNTHESIS],
        AgentRole.ARCHITECT: [AgentCapability.PLANNING, AgentCapability.REASONING, AgentCapability.ANALYSIS],
        AgentRole.CODER: [AgentCapability.CODE_GENERATION, AgentCapability.EXECUTION],
        AgentRole.REVIEWER: [AgentCapability.CRITIQUE, AgentCapability.VERIFICATION, AgentCapability.ANALYSIS],
        AgentRole.SYNTHESIZER: [AgentCapability.SYNTHESIS, AgentCapability.SUMMARIZATION],
        AgentRole.CRITIC: [AgentCapability.CRITIQUE, AgentCapability.VERIFICATION],
        AgentRole.DATA_ANALYST: [AgentCapability.DATA_PROCESSING, AgentCapability.ANALYSIS],
        AgentRole.WRITER: [AgentCapability.TEXT_GENERATION, AgentCapability.CREATIVE_WRITING],
        AgentRole.TRANSLATOR: [AgentCapability.TRANSLATION],
        AgentRole.TESTER: [AgentCapability.VERIFICATION, AgentCapability.EXECUTION],
        AgentRole.DEVOPS: [AgentCapability.EXECUTION],
        AgentRole.ORCHESTRATOR: [AgentCapability.ORCHESTRATION, AgentCapability.PLANNING],
    }

    def __init__(self, max_depth: int = 5, min_task_complexity: float = 0.1) -> None:
        self.max_depth = max_depth
        self.min_task_complexity = min_task_complexity

    def decompose(self, goal: str, context: dict[str, Any] | None = None) -> list[Task]:
        phases = self._identify_phases(goal)
        tasks: list[Task] = []
        for i, (phase_name, phase_desc) in enumerate(phases):
            role = self._infer_role(phase_name, phase_desc)
            t = Task(
                title=phase_name,
                description=phase_desc,
                required_capabilities=self.ROLE_CAPABILITIES.get(role, []),
                estimated_complexity=self._estimate_complexity(phase_desc),
                priority=i,
                context=context or {},
            )
            tasks.append(t)
        if tasks:
            self._merge_minor_tasks(tasks)
            for i in range(1, len(tasks)):
                tasks[i].dependencies = [tasks[i - 1].task_id]
            self._validate_dag(tasks)
        return tasks

    def _identify_phases(self, goal: str) -> list[tuple[str, str]]:
        patterns = [
            (r'(?:first|1\.?)\s+(?:research|analyze|gather|study|explore|understand)\s+(.+)',
             AgentRole.RESEARCHER),
            (r'(?:second|2\.?)\s+(?:design|architect|plan|structure|organize)\s+(.+)',
             AgentRole.ARCHITECT),
            (r'(?:third|3\.?)\s+(?:implement|code|develop|build|write|create)\s+(.+)',
             AgentRole.CODER),
            (r'(?:fourth|4\.?)\s+(?:review|test|verify|validate|check|evaluate)\s+(.+)',
             AgentRole.REVIEWER),
            (r'(?:fifth|5\.?)\s+(?:summarize|synthesize|consolidate|merge|combine)\s+(.+)',
             AgentRole.SYNTHESIZER),
        ]
        phases: list[tuple[str, str]] = []
        for pattern, role in patterns:
            m = re.search(pattern, goal, re.IGNORECASE)
            if m:
                phases.append((f"{role.value.capitalize()}: {m.group(1)[:80]}", m.group(0)))
        if not phases:
            parts = re.split(r'\s*(?:then\s+|,\s*then\s+)', goal, flags=re.IGNORECASE)
            default_roles = [
                AgentRole.RESEARCHER, AgentRole.ARCHITECT, AgentRole.CODER,
                AgentRole.REVIEWER, AgentRole.SYNTHESIZER,
            ]
            for i, part in enumerate(parts):
                part = part.strip()
                if part and i < 5:
                    phases.append((part[:100], part[:200]))
        if len(phases) < 2:
            sentences = re.split(r'(?<=[.!?])\s+', goal)
            if len(sentences) < 2:
                phrases = re.split(r'(?:,|;)\s+', goal)
                for i, phrase in enumerate(phrases[:5]):
                    phrase = phrase.strip()
                    if phrase:
                        phases.append((phrase[:100], phrase[:200]))
        return phases

    def _infer_role(self, phase_name: str, phase_desc: str) -> AgentRole:
        combined = (phase_name + " " + phase_desc).lower()
        keyword_roles = [
            (["research", "analyze", "study", "investigate", "explore"], AgentRole.RESEARCHER),
            (["design", "architect", "plan", "structure", "blueprint"], AgentRole.ARCHITECT),
            (["code", "implement", "develop", "build", "program"], AgentRole.CODER),
            (["review", "critique", "assess", "evaluate", "judge"], AgentRole.REVIEWER),
            (["summarize", "synthesize", "consolidate", "merge"], AgentRole.SYNTHESIZER),
            (["test", "verify", "validate", "check"], AgentRole.TESTER),
            (["write", "draft", "compose", "create content"], AgentRole.WRITER),
            (["translate", "localize", "convert language"], AgentRole.TRANSLATOR),
            (["data", "analyze data", "process", "transform", "etl"], AgentRole.DATA_ANALYST),
            (["deploy", "infrastructure", "monitor", "ci/cd"], AgentRole.DEVOPS),
        ]
        for keywords, role in keyword_roles:
            if any(kw in combined for kw in keywords):
                return role
        return AgentRole.RESEARCHER

    def _estimate_complexity(self, desc: str) -> float:
        words = len(desc.split())
        base = min(1.0, words / 200)
        technical_terms = len(re.findall(
            r'\b(?:algorithm|architecture|database|api|pipeline|framework|'
            r'optimization|scalability|security|integration|deployment)\b',
            desc, re.IGNORECASE))
        return min(1.0, base + technical_terms * 0.1)

    def _merge_minor_tasks(self, tasks: list[Task]) -> None:
        i = 0
        while i < len(tasks):
            if tasks[i].estimated_complexity < self.min_task_complexity and i + 1 < len(tasks):
                next_task = tasks[i + 1]
                tasks[i].description += f"\nAlso: {next_task.description}"
                tasks[i].estimated_complexity = min(1.0, tasks[i].estimated_complexity + next_task.estimated_complexity)
                tasks[i].required_capabilities = list(
                    set(tasks[i].required_capabilities) | set(next_task.required_capabilities))
                tasks.pop(i + 1)
            else:
                i += 1

    def _validate_dag(self, tasks: list[Task]) -> None:
        task_ids = {t.task_id for t in tasks}
        for t in tasks:
            for dep in t.dependencies:
                if dep not in task_ids:
                    raise ValueError(f"Task {t.task_id} depends on unknown task {dep}")
        visited: set[str] = set()
        in_stack: set[str] = set()

        def _dfs(tid: str) -> None:
            if tid in in_stack:
                raise ValueError(f"Circular dependency detected at task {tid}")
            if tid in visited:
                return
            in_stack.add(tid)
            for t in tasks:
                if t.task_id == tid:
                    for dep in t.dependencies:
                        _dfs(dep)
                    break
            in_stack.discard(tid)
            visited.add(tid)

        for t in tasks:
            _dfs(t.task_id)

    def estimate_parallelism(self, tasks: list[Task]) -> list[list[str]]:
        """Group tasks into parallel execution waves based on DAG dependencies."""
        wave_map: dict[str, int] = {}
        tid_to_task = {t.task_id: t for t in tasks}

        def _wave(tid: str) -> int:
            if tid in wave_map:
                return wave_map[tid]
            task = tid_to_task.get(tid)
            if not task:
                wave_map[tid] = 0
                return 0
            if not task.dependencies:
                wave_map[tid] = 0
                return 0
            max_dep_wave = max(_wave(dep) for dep in task.dependencies)
            wave_map[tid] = max_dep_wave + 1
            return wave_map[tid]

        for t in tasks:
            _wave(t.task_id)
        waves: dict[int, list[str]] = {}
        for tid, w in wave_map.items():
            waves.setdefault(w, []).append(tid)
        return [waves[w] for w in sorted(waves.keys())]
