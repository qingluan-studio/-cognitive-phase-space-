"""
认知涌现引擎 — 概念融合引擎
==============================
实现 Fauconnier & Turner "概念整合理论"的轻量版
从两个不同认知域取元素，混合产生第三种涌现意义

融合类型:
1. 复合(composite): A+B → 新组合领域  (如 认知科学+计算机 → 认知计算)
2. 镜射(mirror): 用B的框架理解A      (如 用物理学的相变理解思维跃迁)
3. 单域(single-scope): A的特征注入B   (如 用生物进化论看软件架构演进)
4. 双域(double-scope): A和B的结构真正融合 (如 数字孪生 = 物理+信息)

融合操作:
- 结构映射: 找两个概念的共享结构
- 属性投射: 从一个概念选择性引入新属性
- 涌现生成: 在融合空间中产生原来都没有的新性质

用法:
    from cee.app.local_llm import ConceptualBlending
    cb = ConceptualBlending(kgraph)
    result = cb.blend("神经网络", "人脑", blend_type="mirror")
    # -> {"insight":"神经网络的前馈结构类似人脑的层级加工...", "emergent":"...", "score":0.82}
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from .knowledge_store import STORAGE_DIR

if TYPE_CHECKING:
    from .knowledge_graph import KnowledgeGraph

BLEND_FILE = STORAGE_DIR / "conceptual_blending.json"

CONCEPT_PROPERTIES: dict[str, dict[str, list[str]]] = {
    "神经网络": {
        "attributes": ["层级", "权重", "非线性", "自适应", "梯度下降", "反向传播",
                       "泛化", "过拟合", "分布式表示"],
        "behaviors": ["从数据中学习", "逐步逼近目标", "并行计算", "容错"],
        "context": "人工智能 | 机器学习 | 模式识别",
    },
    "人脑": {
        "attributes": ["神经元", "突触", "可塑性", "意识", "情感", "创造力",
                       "节能", "进化产物", "多感官整合"],
        "behaviors": ["联想记忆", "类比推理", "启发式决策", "潜意识处理"],
        "context": "神经科学 | 心理学 | 认知科学",
    },
    "软件架构": {
        "attributes": ["模块", "接口", "分层", "依赖", "可扩展", "耦合",
                       "设计模式", "技术栈", "微服务"],
        "behaviors": ["编译构建", "运行时加载", "API调用", "事件驱动"],
        "context": "软件工程 | 系统设计 | 企业应用",
    },
    "生物进化": {
        "attributes": ["变异", "自然选择", "适应度", "种群", "遗传",
                       "共生", "灭绝", "趋同演化"],
        "behaviors": ["世代迭代", "环境压力选择", "多样性增长", "生态位分化"],
        "context": "生物学 | 复杂系统 | 地球历史",
    },
    "语言": {
        "attributes": ["语法", "语义", "词汇", "歧义", "语境", "隐喻",
                       "递归", "组合性"],
        "behaviors": ["沟通传递", "文化塑造", "思维框架", "版本演化"],
        "context": "语言学 | 哲学 | 人类学",
    },
    "数学": {
        "attributes": ["公理", "定理", "证明", "抽象", "不变性", "对称",
                       "映射", "同构", "完备性"],
        "behaviors": ["逻辑推导", "模式发现", "形式化建模", "量化解算"],
        "context": "抽象科学 | 各学科基础 | 形式系统",
    },
    "认知涌现": {
        "attributes": ["自组织", "混沌边缘", "相变", "层次涌现", "不可还原",
                       "超图", "测地线", "认知不变量"],
        "behaviors": ["从简单规则产生复杂行为", "系统级属性", "临界现象"],
        "context": "认知科学 | 复杂系统 | 物理学",
    },
    "代码编译器": {
        "attributes": ["词法分析", "语法树", "类型检查", "优化遍数", "字节码",
                       "JIT编译", "中间表示"],
        "behaviors": ["源代码→执行码", "静态分析", "编译时计算"],
        "context": "编程语言实现 | 虚拟机 | 底层系统",
    },
    "免疫系统": {
        "attributes": ["抗体", "记忆B细胞", "自体非自体识别", "疫苗记忆",
                       "细胞因子风暴", "适应性免疫"],
        "behaviors": ["快速响应已知威胁", "学习新病原体", "清除+记忆"],
        "context": "生物学 | 医学 | 复杂系统",
    },
    "金融市场": {
        "attributes": ["波动率", "流动性", "套利", "信息不对称", "泡沫",
                       "均值回归", "黑天鹅"],
        "behaviors": ["价格发现", "资源分配", "风险定价", "人群心理驱动"],
        "context": "经济学 | 金融学 | 行为科学",
    },
}

CROSS_DOMAIN_TEMPLATES: dict[str, list[str]] = {
    "composite": [
        "{a_name} + {b_name} 的交汇地带诞生了{a_attr}与{b_attr}的混合体——{emergent}。"
        "这种融合使得{b_behavior}可以被{a_behavior}加速实现，而{a_attr}在 {b_name} 的框架下获得全新解释维度。",
        "{a_name} 和 {b_name} 的复合产生了新的范式：{emergent}。"
        "它继承了{a_attr}的结构优势，又融入了{b_attr}的灵活性，在 {a_name} 的 {a_context} 与"
        " {b_name} 的 {b_context} 之间架起桥梁。",
    ],
    "mirror": [
        "如果把 {a_name} 看作 {b_name}，那么{a_attr}就如同{b_attr}，{a_behavior}恰似{b_behavior}。"
        "这个视角揭示了{emergent}——{a_name}或许也拥有 {b_name} 才有的{b_attr}特性。",
        "{b_name} 的透镜下，{a_name} 的{a_attr}不再是静态属性，而像{b_behavior}一样动态演化。"
        "关键洞察: {emergent}。",
    ],
    "single-scope": [
        "{a_name} 从 {b_name} 中借用{b_attr}的概念后，其{a_behavior}发生了质变——{emergent}。"
        "这是一种方向的注入：{b_name} 的{b_attr}被选择性映射到 {a_name} 的{a_attr}上。",
    ],
    "double-scope": [
        "{a_name} 和 {b_name} 在深层结构上展现出共同模式：{a_attr}⇔{b_attr}的对应，{a_behavior}⇔"
        "{b_behavior}的映射。双向融合产生了全新的概念空间——{emergent}。",
    ],
}


@dataclass
class BlendResult:
    id: str
    concept_a: str
    concept_b: str
    blend_type: str
    insight: str
    emergent_property: str
    score: float
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConceptualBlending:
    def __init__(self, kgraph: KnowledgeGraph | None = None):
        self._kgraph = kgraph
        self._history: list[BlendResult] = []
        self._properties: dict[str, dict] = dict(CONCEPT_PROPERTIES)
        self._load()

    def blend(self, concept_a: str, concept_b: str,
              blend_type: str = "auto") -> BlendResult | None:
        a_props = self._resolve_properties(concept_a)
        b_props = self._resolve_properties(concept_b)

        if not a_props or not b_props:
            return None

        if blend_type == "auto":
            blend_type = self._infer_type(a_props, b_props)

        insight, emergent = self._synthesize(concept_a, concept_b, a_props, b_props, blend_type)
        score = self._score(concept_a, concept_b, blend_type)

        rid = f"blend_{len(self._history) + 1}"
        result = BlendResult(
            id=rid, concept_a=concept_a, concept_b=concept_b,
            blend_type=blend_type, insight=insight, emergent_property=emergent,
            score=score,
        )
        self._history.append(result)
        if len(self._history) > 100:
            self._history = self._history[-50:]
        self._save()
        return result

    def try_blend_from_text(self, text: str) -> BlendResult | None:
        terms = re.findall(r'[\u4e00-\u9fa5a-zA-Z]{2,20}', text)
        unique = list(dict.fromkeys(terms))

        candidates = [t for t in unique if t in self._properties][:6]
        if len(candidates) < 2:
            if self._kgraph:
                nodes = list(self._kgraph._graph.keys())[:10]
                candidates = [n for n in nodes if n in unique or n in text][:4]
            if len(candidates) < 2:
                return None

        a, b = candidates[0], candidates[-1]
        return self.blend(a, b, blend_type="auto")

    def _resolve_properties(self, concept: str) -> dict | None:
        if concept in self._properties:
            return self._properties[concept]
        for key in self._properties:
            if key.replace(" ", "").lower() in concept.replace(" ", "").lower():
                return self._properties[key]
        if self._kgraph and concept in self._kgraph._graph:
            neighbors = list(self._kgraph._graph[concept].keys())[:4]
            return {
                "attributes": neighbors[:3],
                "behaviors": neighbors[3:] if len(neighbors) > 3 else [],
                "context": " | ".join(neighbors),
            }
        return None

    def _infer_type(self, a: dict, b: dict) -> str:
        a_attr = set(a.get("attributes", []))
        b_attr = set(b.get("attributes", []))
        overlap = len(a_attr & b_attr)

        if overlap >= 3:
            return "mirror"
        if overlap >= 2:
            return "double-scope"
        if overlap >= 1:
            return "single-scope"
        return "composite"

    def _synthesize(self, a_name: str, b_name: str, a: dict, b: dict,
                     blend_type: str) -> tuple[str, str]:
        a_attrs = a.get("attributes", ["A"])
        b_attrs = b.get("attributes", ["B"])
        a_behaviors = a.get("behaviors") or ["处理信息"]
        b_behaviors = b.get("behaviors") or ["演化"]
        a_ctx = a.get("context", "领域A")
        b_ctx = b.get("context", "领域B")

        emergent = self._generate_emergent(a_name, b_name, a_attrs, b_attrs, blend_type)

        templates = CROSS_DOMAIN_TEMPLATES.get(blend_type, CROSS_DOMAIN_TEMPLATES["composite"])
        import random
        template = random.choice(templates)

        insight = template.format(
            a_name=a_name, b_name=b_name,
            a_attr=a_attrs[0], b_attr=b_attrs[0],
            a_behavior=a_behaviors[0], b_behavior=b_behaviors[0],
            a_context=a_ctx, b_context=b_ctx,
            emergent=emergent,
        )
        return insight, emergent

    def _generate_emergent(self, a: str, b: str,
                            a_attrs: list[str], b_attrs: list[str],
                            blend_type: str) -> str:
        import random
        patterns = {
            "composite": [
                f"{a}驱动的{b}",
                f"{a_attrs[0]}{b}",
                f"融合之{a_attrs[0]}{b_attrs[0]}系统",
                f"{a[:2]}{b[:2]}协同引擎",
            ],
            "mirror": [
                f"{b}化的{a}模型",
                f"类{b}的{a}范式",
                f"{a}的{b}隐喻",
            ],
            "single-scope": [
                f"注入了{b_attrs[0]}特性的{a}",
                f"受{b}启发的{a}升级",
                f"{b_attrs[0]}加持的{a}",
            ],
            "double-scope": [
                f"{a[:2]}{b[:2]}融合空间",
                f"双向{a_attrs[0]}-{b_attrs[0]}架构",
                f"{a[:2]}{b[:2]}涌现体",
            ],
        }
        choices = patterns.get(blend_type, patterns["composite"])
        return random.choice(choices)

    def _score(self, a: str, b: str, blend_type: str) -> float:
        base = {"mirror": 0.85, "double-scope": 0.80, "single-scope": 0.72,
                "composite": 0.68}.get(blend_type, 0.6)
        if self._kgraph:
            try:
                path = self._kgraph.find_path(a, b, max_depth=3)
                if path and len(path) <= 3:
                    base += 0.1
            except Exception:
                pass
        return round(min(1.0, base), 3)

    def stats(self) -> dict:
        return {
            "total_blends": len(self._history),
            "recent_types": [h.blend_type for h in self._history[-5:]],
            "concepts_known": len(self._properties),
        }

    def _load(self):
        if BLEND_FILE.exists():
            try:
                with open(BLEND_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._history = [BlendResult(**r) for r in data.get("history", [])[-50:]]
                self._properties.update(data.get("properties", {}))
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "history": [{"id": h.id, "concept_a": h.concept_a, "concept_b": h.concept_b,
                             "blend_type": h.blend_type, "insight": h.insight,
                             "emergent_property": h.emergent_property,
                             "score": h.score, "created_at": h.created_at}
                            for h in self._history[-30:]],
                "properties": {k: v for k, v in self._properties.items()
                               if k not in CONCEPT_PROPERTIES},
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(BLEND_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
