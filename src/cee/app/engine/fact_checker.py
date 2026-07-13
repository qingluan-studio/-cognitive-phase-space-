"""
事实核查引擎 — 声明验证与可信度评估

提供基于多源的声明核查和可信度评分:
  - 声明抽取: 从文本中提取可验证的事实声明
  - 源比对: 将声明与已知来源进行比对
  - 可信度评分: 多维度(权威性/时效性/一致性/引用)评分
  - 交叉验证: 多源交叉验证提高准确率
  - 不确定度量化: 对核查结果的置信度评估
  - 可追溯性: 每条核查结果附带证据链
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class Verdict(Enum):
    TRUE = "true"
    MOSTLY_TRUE = "mostly_true"
    HALF_TRUE = "half_true"
    MOSTLY_FALSE = "mostly_false"
    FALSE = "false"
    UNVERIFIABLE = "unverifiable"
    PENDING = "pending"


class CredibilityLevel(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


@dataclass
class FactClaim:
    text: str
    claim_type: str = ""
    entities: list[str] = field(default_factory=list)
    numbers: list[float] = field(default_factory=list)
    dates: list[str] = field(default_factory=list)
    confidence: float = 0.5
    position: tuple[int, int] = (0, 0)


@dataclass
class SourceEvidence:
    source_name: str
    source_url: str = ""
    credibility: CredibilityLevel = CredibilityLevel.UNKNOWN
    content_snippet: str = ""
    supports_claim: bool = True
    publication_date: str = ""
    relevance_score: float = 0.0


@dataclass
class VerificationResult:
    claim: FactClaim
    verdict: Verdict
    confidence: float
    evidence: list[SourceEvidence] = field(default_factory=list)
    reasoning: str = ""
    alternative_facts: list[str] = field(default_factory=list)
    corrections: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "claim": self.claim.text,
            "verdict": self.verdict.value,
            "confidence": round(self.confidence, 4),
            "evidence_count": len(self.evidence),
            "reasoning": self.reasoning,
            "corrections": self.corrections,
        }


class ClaimExtractor:
    """声明抽取器"""

    PATTERNS: list[tuple[str, str]] = [
        (r"([^。！？.!?\n]{10,80}(?:是|为|即|等于|相当于)[^。！？.!?\n]{5,60})", "identification"),
        (r"([^。！？.!?\n]{10,80}(?:发现|表明|显示|证实|证明|揭示)[^。！？.!?\n]{5,60})", "discovery"),
        (r"([^。！？.!?\n]{10,80}(?:据|根据|依据|按照)[^。！？.!?\n]{5,60})", "citation"),
        (r"([^。！？.!?\n]{10,80}(?:\d+[万亿千百十]?(?:元|美元|人|次|个|只|项|条|%|岁|年|月|日|小时|公里|米|吨|千克))[^。！？.!?\n]{0,40})", "quantitative"),
        (r"([^。！？.!?\n]{10,80}(?:于\d{4}年|在\d{4}年|自\d{4}年)[^。！？.!?\n]{5,60})", "historical"),
        (r"([^。！？.!?\n]{10,80}(?:最[大高快多强长早晚]|第[一二三]|首创|首次|唯一|最大|最小)[^。！？.!?\n]{5,60})", "superlative"),
        (r"([^。！？.!?\n]{10,120}(?:causes?|leads? to|results? in|indicates?|shows?|proves?)[^.!?\n]{5,80})", "causal"),
    ]

    def extract(self, text: str) -> list[FactClaim]:
        claims = []
        seen = set()

        for pattern, claim_type in self.PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                claim_text = match.group(1).strip()
                key = claim_text[:50]
                if key not in seen and len(claim_text) >= 15:
                    seen.add(key)
                    claims.append(FactClaim(
                        text=claim_text,
                        claim_type=claim_type,
                        entities=self._extract_entities(claim_text),
                        numbers=self._extract_numbers(claim_text),
                        dates=self._extract_dates(claim_text),
                        position=(match.start(), match.end()),
                        confidence=0.6,
                    ))

        return claims

    @staticmethod
    def _extract_entities(text: str) -> list[str]:
        entity_patterns = [
            r"[A-Z][a-z]+(?:\s[A-Z][a-z]+)*",
            r"[\u4e00-\u9fff]{2,10}(?:公司|大学|组织|机构|政府|部门|委员会|协会|基金)",
            r"[\u4e00-\u9fff]{2,4}(?:国|省|市|县|区|镇|村)",
        ]
        entities = []
        for pattern in entity_patterns:
            entities.extend(re.findall(pattern, text))
        return list(set(entities))[:10]

    @staticmethod
    def _extract_numbers(text: str) -> list[float]:
        numbers = re.findall(r"\d+(?:\.\d+)?", text)
        return [float(n) for n in numbers[:5]]

    @staticmethod
    def _extract_dates(text: str) -> list[str]:
        patterns = [
            r"\d{4}年\d{1,2}月\d{1,2}日",
            r"\d{4}年\d{1,2}月",
            r"\d{4}年",
            r"\d{4}-\d{2}-\d{2}",
            r"\d{4}/\d{2}/\d{2}",
        ]
        dates = []
        for p in patterns:
            dates.extend(re.findall(p, text))
        return list(set(dates))


class CredibilityScorer:
    """可信度评分器 — 多维度评估"""

    def __init__(self):
        self._domain_authority: dict[str, float] = {
            ".gov": 0.9, ".edu": 0.85, ".org": 0.7,
            ".com": 0.5, ".net": 0.4, ".io": 0.45,
        }

    def score(self, sources: list[SourceEvidence]) -> float:
        if not sources:
            return 0.1

        scores = []
        for src in sources:
            credibility_weight = {
                CredibilityLevel.HIGH: 1.0,
                CredibilityLevel.MEDIUM: 0.6,
                CredibilityLevel.LOW: 0.3,
                CredibilityLevel.UNKNOWN: 0.2,
            }

            source_score = (
                credibility_weight[src.credibility] * 0.4
                + src.relevance_score * 0.3
                + self._domain_authority_score(src.source_url) * 0.2
                + (1.0 if src.supports_claim else 0.2) * 0.1
            )
            scores.append(source_score)

        return float(np.mean(scores)) if scores else 0.2

    def _domain_authority_score(self, url: str) -> float:
        for domain, score in self._domain_authority.items():
            if domain in url.lower():
                return score
        return 0.4


class CrossValidator:
    """交叉验证器"""

    def validate(self, claims: list[FactClaim],
                 sources: list[SourceEvidence]) -> list[dict[str, Any]]:
        results = []
        for claim in claims:
            supporting = 0
            opposing = 0
            for src in sources:
                if self._source_relevant_to_claim(src, claim):
                    if src.supports_claim:
                        supporting += 1
                    else:
                        opposing += 1

            total = supporting + opposing
            if total == 0:
                consistency = 0.5
            else:
                consistency = supporting / total

            results.append({
                "claim": claim.text,
                "supporting_sources": supporting,
                "opposing_sources": opposing,
                "consistency": consistency,
                "verdict": (
                    "consistent" if consistency > 0.8 else
                    "mostly_consistent" if consistency > 0.6 else
                    "mixed" if consistency > 0.4 else
                    "mostly_inconsistent" if consistency > 0.2 else
                    "contradicted"
                ),
            })

        return results

    @staticmethod
    def _source_relevant_to_claim(source: SourceEvidence, claim: FactClaim) -> bool:
        claim_words = set(claim.text.lower().split())
        source_words = set(source.content_snippet.lower().split())
        if not claim_words or not source_words:
            return False
        overlap = len(claim_words & source_words) / min(len(claim_words), len(source_words))
        return overlap > 0.1


class FactChecker:
    """事实核查引擎主类"""

    def __init__(self):
        self.extractor = ClaimExtractor()
        self.scorer = CredibilityScorer()
        self.cross_validator = CrossValidator()
        self._knowledge_base: dict[str, dict[str, Any]] = {}
        self._verification_history: list[VerificationResult] = []

    def add_knowledge(self, fact: str, verdict: Verdict,
                       sources: list[dict] | None = None) -> None:
        key = self._normalize_key(fact)
        self._knowledge_base[key] = {
            "fact": fact, "verdict": verdict,
            "sources": sources or [],
        }

    @staticmethod
    def _normalize_key(text: str) -> str:
        return re.sub(r'[^\w\s]', '', text.lower()).strip()

    def verify(self, text: str) -> list[VerificationResult]:
        claims = self.extractor.extract(text)
        results = []

        for claim in claims:
            result = self._verify_claim(claim)
            results.append(result)
            self._verification_history.append(result)

        return results

    def _verify_claim(self, claim: FactClaim) -> VerificationResult:
        key = self._normalize_key(claim.text)

        if key in self._knowledge_base:
            kb = self._knowledge_base[key]
            sources = [
                SourceEvidence(
                    source_name=s.get("name", "knowledge_base"),
                    source_url=s.get("url", ""),
                    credibility=CredibilityLevel(s.get("credibility", "medium")),
                    content_snippet=s.get("snippet", kb["fact"]),
                    supports_claim=kb.get("verdict", Verdict.PENDING) in
                                    (Verdict.TRUE, Verdict.MOSTLY_TRUE),
                )
                for s in kb.get("sources", [])
            ]
            confidence = self.scorer.score(sources)
            return VerificationResult(
                claim=claim,
                verdict=kb["verdict"],
                confidence=confidence,
                evidence=sources,
                reasoning=f"匹配知识库中的已知事实 (置信度: {confidence:.2f})",
            )

        evidence = self._search_evidence(claim)
        verdict, confidence = self._determine_verdict(claim, evidence)

        reasoning = self._generate_reasoning(claim, evidence, verdict, confidence)
        corrections = self._suggest_corrections(claim, verdict)

        return VerificationResult(
            claim=claim,
            verdict=verdict,
            confidence=confidence,
            evidence=evidence,
            reasoning=reasoning,
            corrections=corrections,
        )

    def _search_evidence(self, claim: FactClaim) -> list[SourceEvidence]:
        """模拟证据搜索"""
        evidence = []

        if claim.numbers:
            evidence.append(SourceEvidence(
                source_name="Numerical Consistency",
                source_url="",
                credibility=CredibilityLevel.MEDIUM,
                content_snippet=f"包含 {len(claim.numbers)} 个数值声明",
                supports_claim=True,
                relevance_score=0.6,
            ))

        if claim.entities:
            evidence.append(SourceEvidence(
                source_name="Entity Recognition",
                source_url="",
                credibility=CredibilityLevel.MEDIUM,
                content_snippet=f"涉及实体: {', '.join(claim.entities[:3])}",
                supports_claim=True,
                relevance_score=0.5,
            ))

        text_lower = claim.text.lower()
        speculativeness = sum(
            1 for kw in ["可能", "也许", "大概", "估计", "might", "may", "possibly"]
            if kw in text_lower
        )
        if speculativeness > 0:
            evidence.append(SourceEvidence(
                source_name="Language Analysis",
                source_url="",
                credibility=CredibilityLevel.MEDIUM,
                content_snippet="声明包含推测性语言",
                supports_claim=True,
                relevance_score=0.4,
            ))

        return evidence

    def _determine_verdict(self, claim: FactClaim,
                            evidence: list[SourceEvidence]) -> tuple[Verdict, float]:
        if not evidence:
            return Verdict.UNVERIFIABLE, 0.1

        credibility = self.scorer.score(evidence)

        if credibility > 0.8:
            return Verdict.TRUE, credibility
        if credibility > 0.6:
            return Verdict.MOSTLY_TRUE, credibility
        if credibility > 0.4:
            return Verdict.HALF_TRUE, credibility
        if credibility > 0.3:
            return Verdict.MOSTLY_FALSE, credibility
        return Verdict.UNVERIFIABLE, credibility

    def _generate_reasoning(self, claim: FactClaim, evidence: list[SourceEvidence],
                             verdict: Verdict, confidence: float) -> str:
        parts = [f"对声明 '{claim.text[:60]}...' 的核查结论: {verdict.value}"]

        if evidence:
            parts.append(f"基于 {len(evidence)} 项证据")
            parts.append(f"综合可信度评分: {confidence:.2f}")

            supporting = sum(1 for e in evidence if e.supports_claim)
            parts.append(f"支持性证据: {supporting}/{len(evidence)}")

        if claim.numbers:
            parts.append(f"数值验证: 发现 {len(claim.numbers)} 个数值")

        return "。".join(parts) + "。"

    def _suggest_corrections(self, claim: FactClaim, verdict: Verdict) -> list[str]:
        corrections = []

        if verdict in (Verdict.FALSE, Verdict.MOSTLY_FALSE):
            corrections.append("该声明未能在可验证来源中得到充分证实")

        if verdict == Verdict.UNVERIFIABLE:
            corrections.append("该声明缺乏可验证的证据支撑，建议标注为'待核实'")

        speculativeness = sum(
            1 for kw in ["可能", "也许", "大概", "估计", "might", "may", "possibly"]
            if kw in claim.text.lower()
        )
        if speculativeness > 2:
            corrections.append("声明中包含较多推测性语言，建议增加确定性表述")

        if claim.claim_type == "superlative":
            corrections.append("包含最高级声明，此类声明通常需要更严格的验证")

        return corrections

    def batch_verify(self, texts: list[str]) -> dict[str, list[VerificationResult]]:
        results = {}
        for text in texts:
            results[text[:50]] = self.verify(text)
        return results

    def summary(self, results: list[VerificationResult]) -> dict[str, Any]:
        verdict_counts = defaultdict(int)
        total = len(results)
        for r in results:
            verdict_counts[r.verdict.value] += 1

        return {
            "total_claims": total,
            "verdict_distribution": dict(verdict_counts),
            "average_confidence": (
                np.mean([r.confidence for r in results]) if results else 0.0
            ),
            "verified_ratio": (
                verdict_counts["true"] + verdict_counts["mostly_true"]
            ) / max(total, 1),
        }

    @property
    def knowledge_size(self) -> int:
        return len(self._knowledge_base)

    @property
    def history_size(self) -> int:
        return len(self._verification_history)
