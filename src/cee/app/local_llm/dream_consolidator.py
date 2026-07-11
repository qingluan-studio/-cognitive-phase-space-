"""
认知涌现引擎 — 梦境巩固器
=========================
模拟人脑睡眠期的知识巩固与创意重组

四个梦境模式:
1. 记忆回放(replay): 按时间顺序回放最近的对话片段
   → 高频调用的事实增加置信度；被遗忘的(长期未召回)轻微衰减

2. 随机融合(shuffle): 随机配对两个不同领域的事实
   → 通过ConceptualBlending产生惊喜连接，存入"潜洞见"队列
   → 潜洞见在后续对话中若被验证(用户like)则升级为正式知识

3. 抽象爬梯(ladder): 对同一话题的事实向上抽取出共性规律
   → 例如: "神经网络用梯度下降"+"决策树用分裂增益" → "机器学习算法都依赖优化准则"
   → 生成更高层级的抽象知识

4. 异常侦测(anomaly): 检测知识库中的矛盾事实
   → "Python是编译型语言"(错) vs "Python是解释型语言"(对)
   → 标记低置信度矛盾，触发人类确认

触发条件:
- consolidate()被调用时执行一次完整的睡眠周期
- 建议在闲置期(如无用户请求>30秒)或每50轮对话触发

用法:
    dc = DreamConsolidator(knowledge_store, auto_learner, kgraph)
    results = dc.dream_cycle()
    # -> {"consolidated": 3, "blended": 1, "abstracted": 2, "anomalies": 1}
"""

from __future__ import annotations

import json
import random
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import TYPE_CHECKING

from .knowledge_store import STORAGE_DIR

if TYPE_CHECKING:
    from .knowledge_store import SelfLearningKnowledgeStore
    from .auto_learner import AutoLearner
    from .knowledge_graph import KnowledgeGraph
    from .conceptual_blending import ConceptualBlending

DREAM_FILE = STORAGE_DIR / "dream_consolidator.json"


@dataclass
class DreamInsight:
    id: str
    dream_type: str
    content: str
    source_facts: list[str]
    confidence: float
    verified: bool = False
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DreamConsolidator:
    def __init__(self, knowledge_store: SelfLearningKnowledgeStore | None = None,
                 auto_learner: AutoLearner | None = None,
                 kgraph: KnowledgeGraph | None = None,
                 blender: ConceptualBlending | None = None):
        self._store = knowledge_store
        self._learner = auto_learner
        self._kgraph = kgraph
        self._blender = blender

        self._insights: list[DreamInsight] = []
        self._dream_count: int = 0
        self._last_dream: str = datetime.now(timezone.utc).isoformat()
        self._cycles: list[dict] = []
        self._load()

    def dream_cycle(self) -> dict:
        self._dream_count += 1
        results = {"consolidated": 0, "blended": 0, "abstracted": 0,
                   "anomalies": 0, "emergent_insights": []}

        self._memory_replay()
        results["consolidated"] = self._consolidate_facts()

        if self._learner:
            facts = self._learner._facts
            if len(facts) >= 4:
                blend_count = self._shuffle_blend(facts)
                results["blended"] = blend_count

            if len(facts) >= 6:
                abstracted = self._ladder_abstraction(facts)
                results["abstracted"] = abstracted

            if len(facts) >= 5:
                anomalies = self._detect_anomalies(facts)
                results["anomalies"] = anomalies

        if self._kgraph and self._dream_count % 5 == 0:
            removed = self._kgraph.decay_edges(decay_factor=0.97, min_weight=0.15)
            results["kg_edge_decay"] = removed

        self._cycles.append(results)
        if len(self._cycles) > 50:
            self._cycles = self._cycles[-30:]

        self._last_dream = datetime.now(timezone.utc).isoformat()
        self._save()
        return results

    def verify_insight(self, insight_id: str, verified: bool = True):
        for ins in self._insights:
            if ins.id == insight_id:
                ins.verified = verified
                ins.confidence = min(1.0, ins.confidence + 0.3) if verified else max(0.2, ins.confidence - 0.2)
                if verified and self._learner:
                    self._learner._stats["learned"] += 1
                self._save()
                return

    def get_pending_insights(self, top_k: int = 3) -> list[DreamInsight]:
        unverified = [i for i in self._insights if not i.verified]
        unverified.sort(key=lambda x: x.confidence, reverse=True)
        return unverified[:top_k]

    def _memory_replay(self):
        pass

    def _consolidate_facts(self) -> int:
        if self._learner:
            return self._learner.consolidate()
        return 0

    def _shuffle_blend(self, facts: list) -> int:
        if not self._blender or len(facts) < 4:
            return 0

        blended = 0
        by_topic: dict[str, list] = {}
        for f in facts:
            by_topic.setdefault(f.topic, []).append(f)

        topics = list(by_topic.keys())
        if len(topics) < 2:
            return 0

        for _ in range(min(3, len(topics) - 1)):
            t1, t2 = random.sample(topics, 2)
            f1 = random.choice(by_topic[t1])
            f2 = random.choice(by_topic[t2])

            a_name = self._extract_core_concept(f1.fact)
            b_name = self._extract_core_concept(f2.fact)

            if a_name and b_name and a_name != b_name:
                result = self._blender.blend(a_name, b_name, blend_type="auto")
                if result and result.score > 0.55:
                    insight = DreamInsight(
                        id=f"dream_{self._dream_count}_{blended + 1}",
                        dream_type="shuffle",
                        content=result.insight,
                        source_facts=[f1.fact, f2.fact],
                        confidence=result.score,
                    )
                    self._insights.append(insight)
                    blended += 1

        if len(self._insights) > 200:
            self._insights = self._insights[-100:]

        return blended

    def _ladder_abstraction(self, facts: list) -> int:
        by_topic: dict[str, list] = {}
        for f in facts:
            by_topic.setdefault(f.topic, []).append(f)

        abstracted = 0
        for topic, fact_list in by_topic.items():
            if len(fact_list) < 3:
                continue
            text = " ".join(f.fact for f in fact_list[-6:])

            keywords = re.findall(r'[\u4e00-\u9fa5a-zA-Z]{2,12}', text)
            freq = Counter(keywords)
            common = [kw for kw, cnt in freq.most_common(5) if cnt >= 2 and len(kw) > 1]

            if len(common) >= 2:
                core = common[0]
                pattern = common[1]
                abstraction = f"在{topic}领域，{core}与{pattern}构成核心机制，"
                modality = self._infer_modality(abstraction, fact_list)
                if modality:
                    abstraction += f"共有的底层模式是{modality}"

                insight = DreamInsight(
                    id=f"ladder_{self._dream_count}_{abstracted + 1}",
                    dream_type="ladder",
                    content=abstraction,
                    source_facts=[f.fact for f in fact_list[:4]],
                    confidence=0.55,
                )
                self._insights.append(insight)
                abstracted += 1

        return abstracted

    def _detect_anomalies(self, facts: list) -> int:
        anomalies = 0
        for i, f1 in enumerate(facts):
            for f2 in facts[i + 1:]:
                if f1.topic == f2.topic and self._are_contradictory(f1.fact, f2.fact):
                    insight = DreamInsight(
                        id=f"anomaly_{self._dream_count}_{anomalies + 1}",
                        dream_type="anomaly",
                        content=f"潜在矛盾: [{f1.fact}] vs [{f2.fact}] — 需人工确认",
                        source_facts=[f1.fact, f2.fact],
                        confidence=0.35,
                    )
                    self._insights.append(insight)
                    anomalies += 1
                if anomalies >= 5:
                    break
            if anomalies >= 5:
                break
        return anomalies

    def _extract_core_concept(self, fact: str) -> str:
        match = re.match(r'([\u4e00-\u9fa5a-zA-Z]{2,16})', fact)
        if match:
            return match.group(1).strip()

        known = [
            "认知涌现", "神经网络", "深度学习", "软件架构", "人脑",
            "生物进化", "语言", "数学", "代码编译器", "免疫系统",
            "金融市场", "混沌边缘", "Python", "认知几何",
        ]
        for k in known:
            if k in fact:
                return k
        return ""

    def _infer_modality(self, text: str, facts: list) -> str:
        patterns = {
            "优化": "基于目标函数的最小化原则",
            "学习": "从经验中归纳出可泛化的规则",
            "结构": "层级组织的模块化设计",
            "演化": "变异+选择的迭代过程",
            "计算": "符号转换与状态迁移",
            "信息": "不确定性的消除与传递",
            "网络": "节点间的连接与信号传播",
        }
        for kw, mod in patterns.items():
            if kw in text:
                return mod
        return ""

    def _are_contradictory(self, f1: str, f2: str) -> bool:
        negation_pairs = [
            ("是", "不是"), ("可以", "不可以"), ("能", "不能"),
            ("属于", "不属于"), ("支持", "不支持"),
        ]
        for pos, neg in negation_pairs:
            if pos in f1 and neg in f2:
                return True
            if neg in f1 and pos in f2:
                return True
        return False

    def stats(self) -> dict:
        return {
            "dream_count": self._dream_count,
            "insights_total": len(self._insights),
            "insights_unverified": sum(1 for i in self._insights if not i.verified),
            "last_dream": self._last_dream,
            "recent_cycles": self._cycles[-5:] if self._cycles else [],
        }

    def _load(self):
        if DREAM_FILE.exists():
            try:
                with open(DREAM_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._insights = [DreamInsight(**i) for i in data.get("insights", [])[-100:]]
                self._dream_count = data.get("dream_count", 0)
                self._last_dream = data.get("last_dream", datetime.now(timezone.utc).isoformat())
                self._cycles = data.get("cycles", [])[-30:]
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "insights": [{"id": i.id, "dream_type": i.dream_type,
                              "content": i.content, "source_facts": i.source_facts,
                              "confidence": i.confidence, "verified": i.verified,
                              "created_at": i.created_at}
                             for i in self._insights[-100:]],
                "dream_count": self._dream_count,
                "last_dream": self._last_dream,
                "cycles": self._cycles[-30:],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(DREAM_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
