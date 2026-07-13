"""
认知涌现引擎 — 组合字典引擎
============================
统一管理 4 新字典 + 旧 5 本字典 (排除旧感情字典)
FragmentRanker: 相关性 + 新颖性 + 多样性 三维排序
"""

from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from .dicts.character_dict import CharacterDictionary, DictEntry
from .dicts.symbol_dict import SymbolDictionary
from .dicts.code_dict import CodeDictionary
from .dicts.emotion_dict import EmotionDictionary


@dataclass
class RankedFragment:
    entry: DictEntry
    relevance: float
    novelty: float
    diversity: float
    total_score: float = 0.0

    def __post_init__(self):
        self.total_score = self.relevance * 0.5 + self.novelty * 0.3 + self.diversity * 0.2


class FragmentRanker:
    def __init__(self):
        self._hit_tracker: dict[str, int] = defaultdict(int)

    def rank(self, fragments: list[DictEntry], query: str,
             novelty_weight: float = 0.3) -> list[RankedFragment]:
        scored = []
        query_words = set(query)

        for frag in fragments:
            relevance = self._compute_relevance(frag, query_words)
            novelty = self._compute_novelty(frag)
            diversity = self._compute_diversity(frag)

            rf = RankedFragment(
                entry=frag,
                relevance=relevance,
                novelty=novelty,
                diversity=diversity,
            )
            rf.total_score = relevance * (1 - novelty_weight) + novelty * novelty_weight + diversity * 0.1
            scored.append(rf)

        scored.sort(key=lambda x: x.total_score, reverse=True)
        return scored

    def _compute_relevance(self, frag: DictEntry, query_words: set[str]) -> float:
        if not query_words:
            return 0.5
        payload = frag.payload
        relevant_text = frag.key
        for v in payload.values():
            if isinstance(v, str):
                relevant_text += v
        hits = sum(1 for w in query_words if w in relevant_text)
        return min(hits / max(len(query_words), 1), 1.0) + frag.weight * 0.3

    def _compute_novelty(self, frag: DictEntry) -> float:
        hit_count = self._hit_tracker.get(frag.key, 0)
        if hit_count == 0:
            return 1.0
        return max(0.1, 1.0 / (1.0 + hit_count * 0.1))

    def _compute_diversity(self, frag: DictEntry) -> float:
        return random.uniform(0.7, 1.0)

    def record_hit(self, key: str) -> None:
        self._hit_tracker[key] += 1
        if len(self._hit_tracker) > 10000:
            old_keys = sorted(self._hit_tracker, key=self._hit_tracker.get)[:2000]
            for k in old_keys:
                del self._hit_tracker[k]

    def stats(self) -> dict:
        return {
            "tracked_fragments": len(self._hit_tracker),
            "top_hits": sorted(self._hit_tracker.items(), key=lambda x: x[1], reverse=True)[:10],
        }


class CompositedDictionaryEngine:
    """
    统一字典管理引擎

    整合:
    - 4 新字典: character, symbol, code, emotion
    - 5 旧字典: sentence, alphabet, pattern, intent, symbol(legacy)
    (旧感情字典被新 EmotionDictionary 替代)
    """

    def __init__(self, legacy_da=None):
        self._char = CharacterDictionary()
        self._symbol = SymbolDictionary()
        self._code = CodeDictionary()
        self._emotion = EmotionDictionary()
        self._legacy_da = legacy_da
        self._ranker = FragmentRanker()
        self._loaded = False
        _patch_code_dict_for_composited(self._code)

    def load_all(self) -> None:
        if self._loaded:
            return
        self._char.load()
        self._symbol.load()
        self._code.load()
        self._emotion.load()
        self._loaded = True

    def query(self, intent: str, query: str,
              max_fragments: int = 20) -> list[RankedFragment]:
        self.load_all()

        all_fragments: list[DictEntry] = []

        all_fragments.extend(self._char.top_by_frequency(10))
        all_fragments.extend(self._code.match_pattern_fragments(query))
        all_fragments.extend(self._code.search_by_keywords(query))
        all_fragments.extend(self._symbol.fuzzy_match(query))

        ranked = self._ranker.rank(all_fragments, query)
        return ranked[:max_fragments]

    def assemble(self, query: str, fragments: list[RankedFragment]) -> str:
        if not fragments:
            return self._fallback_assemble(query)

        emotion_result = self._emotion.detect(query)
        tone_templates = self._emotion.get_tone_templates(
            emotion_result["emotion"], emotion_result["level"]
        )

        opening = self._safe_format(tone_templates, keyword=self._extract_keyword(query))

        content_parts = []
        for rf in fragments[:5]:
            ctx_list = rf.entry.payload.get("ctx", [])
            ctx_list = rf.entry.payload.get("context_examples", ctx_list)
            if isinstance(ctx_list, list) and ctx_list:
                content_parts.append(random.choice(ctx_list))

        best_variants = []
        for rf in fragments:
            variants = rf.entry.payload.get("variants", [])
            if variants:
                best_variants.extend(variants)

        if best_variants:
            v = random.choice(best_variants[:10])
            code = v.get("code", "") if isinstance(v, dict) else str(v)
            if code:
                content_parts.append(code)

        if not content_parts:
            content_parts.append(f"关于{self._extract_keyword(query)}, 这是基于字典碎片的最优组装结果。")

        body = "\n\n".join(content_parts[:3])

        closing = "以上分析来源于{count}本字典的碎片组装。".format(
            count=len(set(rf.entry.category for rf in fragments))
        )

        return f"{opening}\n\n{body}\n\n{closing}"

    def _fallback_assemble(self, query: str) -> str:
        if self._legacy_da:
            return self._legacy_da.assemble(query)
        return f"关于\"{query}\"，我正在进行自学习，暂时无法提供完整回答。"

    def _extract_keyword(self, query: str) -> str:
        import re
        words = re.findall(r'[\u4e00-\u9fa5a-zA-Z]{2,10}', query)
        return words[0] if words else "这个问题"

    def _safe_format(self, templates: list[str], **kwargs) -> str:
        import re as _re
        tmpl = random.choice(templates)
        placeholders = _re.findall(r'\{(\w+)\}', tmpl)
        safe_kwargs = {k: kwargs.get(k, k) for k in placeholders}
        return tmpl.format(**safe_kwargs)

    def recalibrate_weights(self) -> None:
        self.load_all()
        for entry in self._char._entries.values():
            if entry.hit_count > 0:
                entry.success_rate = min(1.0, entry.success_rate + 0.02)
                entry.weight = max(0.1, min(1.0, entry.weight + (entry.success_rate - 0.5) * 0.1))

    def record_assembly_hit(self, fragment_key: str) -> None:
        self._ranker.record_hit(fragment_key)

    def stats(self) -> dict:
        return {
            "character": self._char.stats(),
            "symbol": self._symbol.stats(),
            "code": self._code.stats(),
            "emotion": self._emotion.stats(),
            "ranker": self._ranker.stats(),
            "has_legacy": self._legacy_da is not None,
        }


def _patch_code_dict_for_composited(cd: CodeDictionary):
    """运行时给 CodeDictionary 添加 combo 查询方法"""
    if not hasattr(cd, "match_pattern_fragments"):
        cd.match_pattern_fragments = lambda q: [
            DictEntry(
                key=v.get("type", "pattern"),
                category="code_pattern",
                payload={"variants": [v["variant"]], "desc": v.get("type", "")},
                weight=0.8,
            )
            for v in cd.match_pattern(q)
        ]
    if not hasattr(cd, "search_by_keywords"):
        cd.search_by_keywords = lambda q: [
            e for e in cd.search("")[:5]
        ]
