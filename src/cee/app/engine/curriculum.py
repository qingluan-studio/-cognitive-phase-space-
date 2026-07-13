"""
课程学习引擎 — 自适应难度排序与渐进式学习

实现基于课程学习 (Curriculum Learning) 策略的自适应知识获取:
  - 难度评估: 自动评估学习材料的认知复杂度
  - 课程排序: 按从易到难的顺序组织学习内容
  - 自适应调度: 根据学习者表现动态调整进度
  - 知识图谱: 构建概念间的先修依赖关系
  - 间隔重复: 基于遗忘曲线的优化复习策略
  - 掌握度追踪: 实时评估各知识点的掌握程度
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class DifficultyLevel(Enum):
    BEGINNER = 1
    ELEMENTARY = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5


class MasteryState(Enum):
    UNEXPLORED = "unexplored"
    INTRODUCED = "introduced"
    PRACTICING = "practicing"
    PROFICIENT = "proficient"
    MASTERED = "mastered"


@dataclass
class Concept:
    id: str
    name: str
    description: str = ""
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
    prerequisites: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    category: str = "general"
    estimated_minutes: float = 10.0
    keywords: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LearningMaterial:
    id: str
    concept_id: str
    title: str
    content: str
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
    material_type: str = "text"
    estimated_minutes: float = 10.0
    questions: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LearnerProfile:
    learner_id: str
    concept_mastery: dict[str, MasteryState] = field(default_factory=dict)
    concept_scores: dict[str, float] = field(default_factory=dict)
    completed_materials: set[str] = field(default_factory=set)
    learning_history: list[dict[str, Any]] = field(default_factory=list)
    preferred_difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
    total_study_minutes: float = 0.0
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    learning_rate: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "learner_id": self.learner_id,
            "concepts_mastered": sum(
                1 for s in self.concept_mastery.values()
                if s == MasteryState.MASTERED
            ),
            "total_concepts": len(self.concept_mastery),
            "materials_completed": len(self.completed_materials),
            "total_study_minutes": round(self.total_study_minutes, 1),
            "preferred_difficulty": self.preferred_difficulty.name,
        }


class DifficultyEstimator:
    """学习材料难度评估器"""

    def estimate(self, text: str) -> DifficultyLevel:
        score = self._compute_difficulty_score(text)
        if score < 1.5:
            return DifficultyLevel.BEGINNER
        if score < 2.5:
            return DifficultyLevel.ELEMENTARY
        if score < 3.5:
            return DifficultyLevel.INTERMEDIATE
        if score < 4.5:
            return DifficultyLevel.ADVANCED
        return DifficultyLevel.EXPERT

    def _compute_difficulty_score(self, text: str) -> float:
        scores = []

        vocabulary = self._vocabulary_complexity(text)
        scores.append(vocabulary)

        sentence = self._sentence_complexity(text)
        scores.append(sentence)

        abstraction = self._concept_abstractness(text)
        scores.append(abstraction)

        information = self._information_density(text)
        scores.append(information)

        return float(np.mean(scores)) * 5.0

    @staticmethod
    def _vocabulary_complexity(text: str) -> float:
        words = text.lower().split()
        if not words:
            return 0.0

        common_words = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "have", "has", "had", "do", "does", "did", "will", "would",
            "的", "是", "在", "有", "和", "了", "不", "人", "这", "中", "大",
            "为", "上", "个", "国", "我", "以", "要", "他", "时", "来", "用",
        }
        uncommon = sum(1 for w in words if w not in common_words and len(w) > 2)
        return min(uncommon / len(words) * 2, 1.0) if words else 0.0

    @staticmethod
    def _sentence_complexity(text: str) -> float:
        sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        if not sentences:
            return 0.0

        lengths = [len(s.split()) for s in sentences]
        mean_len = np.mean(lengths) if lengths else 0

        return min(mean_len / 30.0, 1.0)

    @staticmethod
    def _concept_abstractness(text: str) -> float:
        abstract_keywords = [
            "理论", "原理", "概念", "范式", "模型", "框架", "架构",
            "抽象", "方法论", "哲学", "本体", "认识论",
            "theory", "principle", "concept", "paradigm", "model",
            "framework", "architecture", "abstract", "methodology",
        ]
        count = sum(1 for kw in abstract_keywords if kw.lower() in text.lower())
        return min(count / 5.0, 1.0)

    @staticmethod
    def _information_density(text: str) -> float:
        words = text.split()
        if not words:
            return 0.0

        unique_ratio = len(set(w.lower() for w in words)) / len(words)
        return unique_ratio


class SpacedRepetition:
    """间隔重复调度器 — 基于 SM-2 算法"""

    def __init__(self):
        self._cards: dict[str, dict[str, Any]] = {}

    def add_card(self, concept_id: str, ease_factor: float = 2.5) -> str:
        card_id = f"{concept_id}_{len(self._cards)}"
        self._cards[card_id] = {
            "concept_id": concept_id,
            "ease_factor": ease_factor,
            "interval": 1,
            "repetitions": 0,
            "next_review": datetime.now(timezone.utc),
            "last_quality": 0,
        }
        return card_id

    def review(self, card_id: str, quality: int) -> dict[str, Any]:
        """
        quality: 0-5, where:
          0 = complete blackout
          1 = incorrect, but upon seeing the answer remembered
          2 = incorrect, but answer seemed easy to recall
          3 = correct with serious difficulty
          4 = correct after hesitation
          5 = perfect response
        """
        card = self._cards.get(card_id)
        if not card:
            return {}

        if quality < 3:
            card["repetitions"] = 0
            card["interval"] = 1
        else:
            if card["repetitions"] == 0:
                card["interval"] = 1
            elif card["repetitions"] == 1:
                card["interval"] = 6
            else:
                card["interval"] = int(card["interval"] * card["ease_factor"])

            card["repetitions"] += 1

        card["ease_factor"] = max(
            1.3,
            card["ease_factor"] + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
        )

        card["last_quality"] = quality
        card["next_review"] = datetime.now(timezone.utc)

        return card

    def get_due_cards(self) -> list[str]:
        now = datetime.now(timezone.utc)
        return [cid for cid, card in self._cards.items()
                if card["next_review"] <= now]

    def get_card(self, card_id: str) -> dict[str, Any] | None:
        return self._cards.get(card_id)


class CurriculumPlanner:
    """课程规划器"""

    def __init__(self):
        self.estimator = DifficultyEstimator()
        self._concepts: dict[str, Concept] = {}
        self._materials: dict[str, list[LearningMaterial]] = defaultdict(list)

    def add_concept(self, concept: Concept) -> None:
        self._concepts[concept.id] = concept

    def add_material(self, material: LearningMaterial) -> None:
        self._materials[material.concept_id].append(material)

    def plan_curriculum(self, target_concepts: list[str],
                         profile: LearnerProfile) -> list[dict[str, Any]]:
        plan = []

        all_concepts = self._topological_sort(target_concepts)

        filtered = [
            cid for cid in all_concepts
            if profile.concept_mastery.get(cid, MasteryState.UNEXPLORED)
            != MasteryState.MASTERED
        ]

        for concept_id in filtered:
            concept = self._concepts.get(concept_id)
            if not concept:
                continue

            materials = self._materials.get(concept_id, [])
            if not materials:
                plan.append({
                    "concept_id": concept_id, "concept_name": concept.name,
                    "difficulty": concept.difficulty.name,
                    "materials": [],
                    "estimated_minutes": concept.estimated_minutes,
                })
                continue

            sorted_materials = sorted(
                materials,
                key=lambda m: m.difficulty.value if hasattr(m.difficulty, 'value') else 1,
            )
            for material in sorted_materials:
                plan.append({
                    "concept_id": concept_id,
                    "concept_name": concept.name,
                    "material_id": material.id,
                    "material_title": material.title,
                    "difficulty": material.difficulty.name if hasattr(material.difficulty, 'name') else str(material.difficulty),
                    "estimated_minutes": material.estimated_minutes,
                })

        return plan

    def _topological_sort(self, target_concepts: list[str]) -> list[str]:
        in_degree = defaultdict(int)
        edges = defaultdict(list)

        all_ids = set()
        queue = deque(target_concepts[:])

        while queue:
            cid = queue.popleft()
            if cid in all_ids:
                continue
            all_ids.add(cid)

            concept = self._concepts.get(cid)
            if not concept:
                continue

            for prereq in concept.prerequisites:
                edges[prereq].append(cid)
                in_degree[cid] += 1
                if prereq not in all_ids:
                    queue.append(prereq)

        ready = deque(cid for cid in all_ids if in_degree[cid] == 0)
        sorted_order = []

        while ready:
            cid = ready.popleft()
            sorted_order.append(cid)
            for neighbor in edges[cid]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    ready.append(neighbor)

        remaining = [cid for cid in all_ids if cid not in sorted_order]
        sorted_order.extend(remaining)

        return sorted_order


class CurriculumLearningEngine:
    """课程学习引擎主类"""

    def __init__(self):
        self.planner = CurriculumPlanner()
        self.estimator = DifficultyEstimator()
        self.spaced_rep = SpacedRepetition()
        self._learners: dict[str, LearnerProfile] = {}
        self._concepts: dict[str, Concept] = {}
        self._materials: dict[str, LearningMaterial] = {}

    def create_learner(self, learner_id: str) -> LearnerProfile:
        profile = LearnerProfile(learner_id=learner_id)
        self._learners[learner_id] = profile
        return profile

    def get_learner(self, learner_id: str) -> LearnerProfile | None:
        return self._learners.get(learner_id)

    def add_concept(self, concept: Concept) -> None:
        self._concepts[concept.id] = concept
        self.planner.add_concept(concept)

    def add_material(self, material: LearningMaterial) -> None:
        self._materials[material.id] = material
        self.planner.add_material(material)

        card_id = self.spaced_rep.add_card(material.concept_id)
        material.metadata["spaced_rep_id"] = card_id

    def assess_difficulty(self, text: str) -> DifficultyLevel:
        return self.estimator.estimate(text)

    def plan_for_learner(self, learner_id: str,
                          target_concepts: list[str]) -> list[dict[str, Any]]:
        profile = self._learners.get(learner_id)
        if not profile:
            raise ValueError(f"Learner '{learner_id}' not found")

        plan = self.planner.plan_curriculum(target_concepts, profile)

        for item in plan:
            cid = item["concept_id"]
            if cid not in profile.concept_mastery:
                profile.concept_mastery[cid] = MasteryState.UNEXPLORED

        return plan

    def record_progress(self, learner_id: str, material_id: str,
                          score: float, study_minutes: float = 0.0) -> dict[str, Any]:
        profile = self._learners.get(learner_id)
        if not profile:
            raise ValueError(f"Learner '{learner_id}' not found")

        profile.completed_materials.add(material_id)
        profile.total_study_minutes += study_minutes

        material = self._materials.get(material_id)
        if material:
            concept_id = material.concept_id
            profile.concept_scores[concept_id] = max(
                profile.concept_scores.get(concept_id, 0.0), score
            )

            if score >= 0.9:
                profile.concept_mastery[concept_id] = MasteryState.MASTERED
            elif score >= 0.7:
                profile.concept_mastery[concept_id] = MasteryState.PROFICIENT
            elif score >= 0.5:
                profile.concept_mastery[concept_id] = MasteryState.PRACTICING
            else:
                profile.concept_mastery[concept_id] = MasteryState.INTRODUCED

            quality = min(5, int(score * 5))
            card_id = material.metadata.get("spaced_rep_id")
            if card_id:
                self.spaced_rep.review(card_id, quality)

        profile.learning_history.append({
            "material_id": material_id,
            "score": score,
            "study_minutes": study_minutes,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return profile.to_dict()

    def get_due_review(self, learner_id: str) -> list[dict[str, Any]]:
        profile = self._learners.get(learner_id)
        if not profile:
            return []

        due_cards = self.spaced_rep.get_due_cards()
        reviews = []

        for card_id in due_cards:
            card = self.spaced_rep.get_card(card_id)
            if card:
                concept_id = card["concept_id"]
                concept = self._concepts.get(concept_id)
                reviews.append({
                    "card_id": card_id,
                    "concept_id": concept_id,
                    "concept_name": concept.name if concept else concept_id,
                    "interval": card["interval"],
                    "repetitions": card["repetitions"],
                })

        return reviews

    def learner_mastery_report(self, learner_id: str) -> dict[str, Any]:
        profile = self._learners.get(learner_id)
        if not profile:
            return {}

        mastery_counts = defaultdict(int)
        for state in profile.concept_mastery.values():
            mastery_counts[state.value] += 1

        strengths = [
            cid for cid, score in sorted(
                profile.concept_scores.items(), key=lambda x: x[1], reverse=True
            )[:5]
        ]
        weaknesses = [
            cid for cid, score in sorted(
                profile.concept_scores.items(), key=lambda x: x[1]
            )[:5]
        ]

        return {
            "learner_id": learner_id,
            "mastery_distribution": dict(mastery_counts),
            "total_concepts": len(profile.concept_mastery),
            "materials_completed": len(profile.completed_materials),
            "average_score": (
                np.mean(list(profile.concept_scores.values()))
                if profile.concept_scores else 0.0
            ),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "total_study_minutes": round(profile.total_study_minutes, 1),
        }
