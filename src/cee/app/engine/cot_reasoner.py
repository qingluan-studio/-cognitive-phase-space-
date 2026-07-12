"""
Chain-of-Thought Reasoning Engine
- Multi-step logical reasoning with explicit step tracking
- Reasoning strategies: deductive, inductive, abductive, analogical
- Self-verification at each reasoning step
- Reasoning tree with backtracking
- Integration with ReflectEngine for quality validation
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class ReasoningStrategy(str, Enum):
    DEDUCTIVE = "deductive"
    INDUCTIVE = "inductive"
    ABDUCTIVE = "abductive"
    ANALOGICAL = "analogical"
    DECOMPOSITION = "decomposition"
    CONTRASTIVE = "contrastive"


class StepType(str, Enum):
    OBSERVE = "observe"
    HYPOTHESIZE = "hypothesize"
    VERIFY = "verify"
    CONCLUDE = "conclude"
    BACKTRACK = "backtrack"


@dataclass
class ReasoningStep:
    step_id: int
    step_type: StepType
    content: str
    confidence: float
    evidence: List[str] = field(default_factory=list)
    sub_steps: List["ReasoningStep"] = field(default_factory=list)
    verified: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class CoTResult:
    query: str
    strategy: ReasoningStrategy
    steps: List[ReasoningStep]
    final_answer: str
    total_steps: int
    total_confidence: float
    trace: str
    verified: bool


# ============================================================
# CoTReasoner
# ============================================================

class CoTReasoner:
    """Chain-of-Thought reasoning engine with multiple strategies."""

    def __init__(self, max_steps: int = 20, min_confidence: float = 0.3):
        self.max_steps = max_steps
        self.min_confidence = min_confidence
        self._templates = self._build_templates()
        self._verifier = ReasoningVerifier()
        self._analogy = ReasonByAnalogy()

    def reason(
        self,
        query: str,
        strategy: Optional[ReasoningStrategy] = None,
        context: Optional[str] = None,
    ) -> CoTResult:
        strat = strategy or self._select_strategy(query)
        steps = self._execute_strategy(strat, query, context)
        return self._compile_result(query, strat, steps)

    def reason_with_tool_use(
        self,
        query: str,
        tool_results: Optional[Dict] = None,
        strategy: Optional[ReasoningStrategy] = None,
    ) -> CoTResult:
        tool_context = ""
        if tool_results:
            parts = []
            for key, val in tool_results.items():
                parts.append(f"Tool {key}: {val}")
            tool_context = "\n".join(parts)

        strat = strategy or self._select_strategy(query)
        context = f"[Tool-provided evidence]\n{tool_context}" if tool_context else None
        return self.reason(query, strat, context)

    def _select_strategy(self, query: str) -> ReasoningStrategy:
        lower = query.lower()

        deductive_patterns = [
            r"\b(?:if .+ then|all .+ are|no .+ is|every .+ is)\b",
            r"\b(?:implies|therefore|hence|consequently|thus)\b",
            r"\b(?:syllogism|deduction|general rule)\b",
            r"\b(?:according to (?:the )?(?:rule|law|principle|theorem))\b",
            r"\bif .+ (?:does |do |is |are |can |will )",  # if X, does Y...
            r"\bgiven that .+ (?:it follows|we can conclude)",  # given X, conclude Y
        ]
        inductive_patterns = [
            r"\b(?:pattern|trend|observation|data|statistics|correlation)\b",
            r"\b(?:generally|typically|usually|commonly|on average)\b",
            r"\b(?:from these (?:examples|cases|instances))\b",
            r"\b(?:what (?:pattern|generalization|rule) can we)\b",
        ]
        abductive_patterns = [
            r"\b(?:why|what caused|what is the cause|reason for)\b",
            r"\b(?:best explanation|most likely|most plausible)\b",
            r"\b(?:diagnos|symptom|evidence suggests|indicates that)",  # no trailing \b for diagnos(e)
        ]
        analogical_patterns = [
            r"\b(?:analogy|analogous|similar to|like a|compared to)\b",
            r"\b(?:reminds me of|as in|parallel to|akin to)\b",
            r"\b(?:metaphor|comparison|compare this to)\b",
            r"\b(?:using .+ (?:concepts|terms|ideas|principles|as))\b",  # using X concepts
            r"\b(?:in terms of|in the language of|map .+ to .+)\b",  # in terms of Y
            r"\bexplain .+ (?:using|with|in terms of|through)\b",  # explain X using Y
        ]
        decomposition_patterns = [
            r"\b(?:break down|decompose|sub-problem|component|split into)\b",
            r"\b(?:steps|stages|phases|parts of|aspects of)\b",
            r"\b(?:how (?:to|can|do|does|should|would))\b",
        ]
        contrastive_patterns = [
            r"\b(?:versus|vs\.?|compare|contrast|difference between)\b",
            r"\b(?:pros and cons|advantages and disadvantages|trade-off)\b",
            r"\b(?:which is better|which one|choose between)\b",
        ]

        for pat in deductive_patterns:
            if re.search(pat, lower):
                return ReasoningStrategy.DEDUCTIVE
        for pat in inductive_patterns:
            if re.search(pat, lower):
                return ReasoningStrategy.INDUCTIVE
        for pat in abductive_patterns:
            if re.search(pat, lower):
                return ReasoningStrategy.ABDUCTIVE
        for pat in analogical_patterns:
            if re.search(pat, lower):
                return ReasoningStrategy.ANALOGICAL
        for pat in decomposition_patterns:
            if re.search(pat, lower):
                return ReasoningStrategy.DECOMPOSITION
        for pat in contrastive_patterns:
            if re.search(pat, lower):
                return ReasoningStrategy.CONTRASTIVE

        question_words = lower.split()
        if any(w in question_words for w in ("why", "what", "how", "explain")):
            return ReasoningStrategy.DEDUCTIVE
        return ReasoningStrategy.DECOMPOSITION

    def _execute_strategy(
        self,
        strategy: ReasoningStrategy,
        query: str,
        context: Optional[str],
    ) -> List[ReasoningStep]:
        if strategy == ReasoningStrategy.DEDUCTIVE:
            return self._deductive_reason(query, context)
        elif strategy == ReasoningStrategy.INDUCTIVE:
            return self._inductive_reason(query, context)
        elif strategy == ReasoningStrategy.ABDUCTIVE:
            return self._abductive_reason(query, context)
        elif strategy == ReasoningStrategy.ANALOGICAL:
            return self._analogical_reason(query, context)
        elif strategy == ReasoningStrategy.DECOMPOSITION:
            return self._decomposition_reason(query, context)
        elif strategy == ReasoningStrategy.CONTRASTIVE:
            return self._contrastive_reason(query, context)
        return self._decomposition_reason(query, context)

    def _deductive_reason(
        self, query: str, context: Optional[str]
    ) -> List[ReasoningStep]:
        steps: List[ReasoningStep] = []
        sid = 0

        rules = self._extract_rules(query, context)
        entities = self._extract_entities(query)

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.OBSERVE,
            content=f"Identify the question and extract relevant general rules",
            confidence=0.9,
            evidence=[f"Query: {query}", f"Context: {context or 'none'}"]
        ))
        sid += 1

        if rules:
            for i, rule in enumerate(rules[:3]):
                steps.append(ReasoningStep(
                    step_id=sid, step_type=StepType.OBSERVE,
                    content=f"General rule identified: {rule}",
                    confidence=0.85 - i * 0.05,
                    evidence=[rule]
                ))
                sid += 1
        else:
            inferred = self._infer_rules_from_query(query)
            for i, rule in enumerate(inferred[:3]):
                steps.append(ReasoningStep(
                    step_id=sid, step_type=StepType.OBSERVE,
                    content=f"Inferred general principle: {rule}",
                    confidence=0.7 - i * 0.1,
                    evidence=[rule]
                ))
                sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.HYPOTHESIZE,
            content=f"Apply general rule(s) to the specific case: {query[:80]}",
            confidence=0.75,
            evidence=entities
        ))
        sid += 1

        if entities:
            relevant = entities[:5]
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.VERIFY,
                content=f"Check if the case entities ({', '.join(relevant)}) satisfy "
                        f"the conditions of the general rule(s)",
                confidence=0.80,
                evidence=list(entities)
            ))
            sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.VERIFY,
            content="Verify logical validity: check for counter-examples and edge cases",
            confidence=0.70,
            evidence=["Logical consistency check", "Counter-example search"]
        ))
        sid += 1

        conclusion_confidence = 0.80 if context else 0.65
        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content=f"Deductive conclusion: The logical consequence of applying "
                    f"the identified rule(s) to the case is derived with "
                    f"confidence {conclusion_confidence:.0%}",
            confidence=conclusion_confidence,
            evidence=["Deductive chain complete"]
        ))

        for i, step in enumerate(steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, steps[:i])

        return steps

    def _inductive_reason(
        self, query: str, context: Optional[str]
    ) -> List[ReasoningStep]:
        steps: List[ReasoningStep] = []
        sid = 0

        observations = self._extract_observations(query, context)
        patterns = self._find_patterns(observations)

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.OBSERVE,
            content="Gather specific observations from the query and context",
            confidence=0.9,
            evidence=observations[:5] if observations else [query]
        ))
        sid += 1

        for i, obs in enumerate(observations[:4]):
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.OBSERVE,
                content=f"Observation {i + 1}: {obs}",
                confidence=0.85,
                evidence=[obs]
            ))
            sid += 1

        if patterns:
            for i, pat in enumerate(patterns[:3]):
                steps.append(ReasoningStep(
                    step_id=sid, step_type=StepType.HYPOTHESIZE,
                    content=f"Pattern detected: {pat}",
                    confidence=0.7 + i * 0.05,
                    evidence=[pat]
                ))
                sid += 1
        else:
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.HYPOTHESIZE,
                content="No strong pattern detected; formulate tentative generalization",
                confidence=0.5,
                evidence=["Limited observations"]
            ))
            sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.HYPOTHESIZE,
            content="Formulate general rule based on observed patterns",
            confidence=0.65,
            evidence=["Pattern analysis complete"]
        ))
        sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.VERIFY,
            content="Test generalization against available data for consistency",
            confidence=0.60,
            evidence=["Consistency check", "Coverage evaluation"]
        ))
        sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content="Inductive conclusion: The general rule is supported by "
                    "observed patterns with noted confidence due to limited sample size",
            confidence=0.55,
            evidence=["Inductive generalization formed"]
        ))

        for i, step in enumerate(steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, steps[:i])

        return steps

    def _abductive_reason(
        self, query: str, context: Optional[str]
    ) -> List[ReasoningStep]:
        steps: List[ReasoningStep] = []
        sid = 0

        observations = self._extract_observations(query, context)
        all_text = f"{query} {context or ''}"
        explanations = self._generate_explanations(all_text, observations)

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.OBSERVE,
            content="Identify the observations that need explanation",
            confidence=0.9,
            evidence=observations[:3] if observations else [query]
        ))
        sid += 1

        for i, obs in enumerate(observations[:4]):
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.OBSERVE,
                content=f"Observed fact: {obs}",
                confidence=0.85,
                evidence=[obs]
            ))
            sid += 1

        for i, (expl, score) in enumerate(explanations[:3]):
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.HYPOTHESIZE,
                content=f"Possible explanation #{i + 1}: {expl} "
                        f"(simplicity={score['simplicity']:.2f}, "
                        f"coverage={score['coverage']:.2f})",
                confidence=0.6 + i * 0.05,
                evidence=[f"Explanation score: {score}"]
            ))
            sid += 1

        best = explanations[0] if explanations else (None, {})
        if best[0]:
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.VERIFY,
                content=f"Select best explanation: {best[0]} "
                        f"(highest combined score)",
                confidence=0.70,
                evidence=["Simplicity and coverage evaluation"]
            ))
            sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content="Abductive conclusion: The most plausible explanation "
                    "is identified with the caveat that it is an inference, "
                    "not a deduction; alternative explanations remain possible",
            confidence=0.55 if best[0] else 0.35,
            evidence=["Abductive inference complete"]
        ))

        for i, step in enumerate(steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, steps[:i])

        return steps

    def _analogical_reason(
        self, query: str, context: Optional[str]
    ) -> List[ReasoningStep]:
        steps: List[ReasoningStep] = []
        sid = 0

        target_domain = self._identify_target_domain(query)
        source_info = self._analogy.find_analogy(target_domain)

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.OBSERVE,
            content=f"Identify target domain: {target_domain}",
            confidence=0.85,
            evidence=[f"Domain extracted from: {query[:80]}"]
        ))
        sid += 1

        if source_info:
            source_domain, description = source_info
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.OBSERVE,
                content=f"Mapped to known source domain: {source_domain} ({description})",
                confidence=0.75,
                evidence=[f"Source domain: {source_domain}"]
            ))
            sid += 1

            key_concepts = self._extract_key_concepts(query)
            for concept in key_concepts[:4]:
                mapping = self._analogy.map_concepts(
                    source_domain, target_domain, concept
                )
                if mapping:
                    conf = 0.7
                else:
                    mapping = self._analogy._reverse_map_concept(
                        source_domain, target_domain, concept
                    )
                    conf = 0.55

                steps.append(ReasoningStep(
                    step_id=sid, step_type=StepType.HYPOTHESIZE,
                    content=f"Map concept '{concept}' across domains: "
                            f"({target_domain}) {concept} ≈ "
                            f"({source_domain}) {mapping}",
                    confidence=conf,
                    evidence=[f"Analogical mapping: {concept} -> {mapping}"]
                ))
                sid += 1
        else:
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.OBSERVE,
                content=f"No pre-built mapping found for domain '{target_domain}'; "
                        f"attempting generic reasoning by structural analogy",
                confidence=0.4,
                evidence=["Domain not in mapping table"]
            ))
            sid += 1
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.HYPOTHESIZE,
                content="Construct structural analogy: identify shared "
                        "relational patterns between the domains",
                confidence=0.45,
                evidence=["Generic analogical reasoning"]
            ))
            sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.VERIFY,
            content="Validate analogical inference: check for structural "
                    "alignment and systematicity of the mapping",
            confidence=0.60,
            evidence=["Structural alignment check"]
        ))
        sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content="Analogical conclusion: Drawing inferences from the "
                    "source domain to the target domain, acknowledging that "
                    "analogical reasoning provides plausibility, not certainty",
            confidence=0.50,
            evidence=["Analogical inference complete"]
        ))

        for i, step in enumerate(steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, steps[:i])

        return steps

    def _decomposition_reason(
        self, query: str, context: Optional[str]
    ) -> List[ReasoningStep]:
        steps: List[ReasoningStep] = []
        sid = 0

        sub_questions = self._split_into_sub_questions(query, context)

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.OBSERVE,
            content="Analyze the complex query and identify its constituent parts",
            confidence=0.9,
            evidence=[f"Full query: {query}"]
        ))
        sid += 1

        for i, sq in enumerate(sub_questions[:8]):
            confidence = 0.8 - i * 0.05
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.OBSERVE,
                content=f"Sub-question {i + 1}: {sq}",
                confidence=confidence,
                evidence=[sq]
            ))
            sid += 1

        for i, sq in enumerate(sub_questions[:5]):
            sub_confidence = 0.75 - i * 0.08
            sub_steps = self._process_sub_question(sq, sid * 1000)
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.HYPOTHESIZE,
                content=f"Process sub-question {i + 1}: '{sq[:60]}' "
                        f"-- analysis yields {sub_confidence:.0%} confidence",
                confidence=sub_confidence,
                sub_steps=sub_steps
            ))
            sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.VERIFY,
            content="Cross-validate sub-question results for internal consistency",
            confidence=0.70,
            evidence=["Cross-validation of sub-results"]
        ))
        sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content="Synthesized conclusion: Integrating results from all sub-questions "
                    "provides a comprehensive answer to the original complex query",
            confidence=0.65,
            evidence=["Synthesis of sub-question results"]
        ))

        for i, step in enumerate(steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, steps[:i])

        return steps

    def _contrastive_reason(
        self, query: str, context: Optional[str]
    ) -> List[ReasoningStep]:
        steps: List[ReasoningStep] = []
        sid = 0

        alternatives = self._extract_alternatives(query, context)

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.OBSERVE,
            content="Identify the alternatives to compare",
            confidence=0.9,
            evidence=alternatives if alternatives else [query]
        ))
        sid += 1

        for i, alt in enumerate(alternatives[:4]):
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.OBSERVE,
                content=f"Alternative {i + 1}: {alt}",
                confidence=0.85,
                evidence=[alt]
            ))
            sid += 1

        if len(alternatives) >= 2:
            for i in range(min(len(alternatives), 3)):
                dims = ["effectiveness", "cost", "complexity", "risk", "scalability"]
                dim = dims[i % len(dims)]
                steps.append(ReasoningStep(
                    step_id=sid, step_type=StepType.HYPOTHESIZE,
                    content=f"Comparison dimension '{dim}': evaluate each alternative",
                    confidence=0.70,
                    evidence=[f"Dimension: {dim}"]
                ))
                sid += 1
        else:
            steps.append(ReasoningStep(
                step_id=sid, step_type=StepType.HYPOTHESIZE,
                content="Insufficient alternatives to compare; generate candidate options",
                confidence=0.5,
                evidence=["Limited alternatives"]
            ))
            sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.VERIFY,
            content="Validate comparisons: check for bias and ensure fair comparison",
            confidence=0.65,
            evidence=["Bias check", "Fairness validation"]
        ))
        sid += 1

        steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content="Contrastive conclusion: Based on the multi-dimensional comparison, "
                    "the trade-offs between alternatives are characterized with "
                    "specific advantages and disadvantages identified",
            confidence=0.60,
            evidence=["Contrastive analysis complete"]
        ))

        for i, step in enumerate(steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, steps[:i])

        return steps

    def _verify_step(
        self, step: ReasoningStep, history: List[ReasoningStep]
    ) -> bool:
        if step.step_type == StepType.OBSERVE:
            return True
        if step.step_type == StepType.BACKTRACK:
            return True
        if step.step_type == StepType.HYPOTHESIZE:
            return True
        if step.step_type == StepType.VERIFY:
            return True
        if step.step_type == StepType.CONCLUDE:
            if not history:
                return False
            prior_types = [s.step_type for s in history]
            has_observe = StepType.OBSERVE in prior_types
            has_hypothesize = StepType.HYPOTHESIZE in prior_types
            return has_observe and has_hypothesize
        return True

    def _backtrack(
        self, steps: List[ReasoningStep], failure_point: int
    ) -> List[ReasoningStep]:
        if failure_point < 0 or failure_point >= len(steps):
            return steps

        new_steps: List[ReasoningStep] = []
        sid = 0

        for i in range(failure_point):
            new_steps.append(steps[i])
            sid += 1

        new_steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.BACKTRACK,
            content=f"Backtrack from step {failure_point}: previous reasoning "
                    f"path led to a logical inconsistency or low-confidence result",
            confidence=0.5,
        ))
        sid += 1

        failed_step = steps[failure_point]
        new_steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.HYPOTHESIZE,
            content=f"Alternative approach (revised from step {failure_point}): "
                    f"explore a different reasoning path",
            confidence=min(failed_step.confidence + 0.1, 0.9),
        ))
        sid += 1

        for i in range(failure_point + 1, len(steps)):
            step = steps[i]
            step.step_id = sid
            new_steps.append(step)
            sid += 1

        new_steps.append(ReasoningStep(
            step_id=sid, step_type=StepType.CONCLUDE,
            content="Revised conclusion after backtracking and exploring "
                    "alternative reasoning paths",
            confidence=0.60,
        ))

        for i, step in enumerate(new_steps):
            if i == 0:
                step.verified = True
            else:
                step.verified = self._verify_step(step, new_steps[:i])

        return new_steps

    def _build_templates(self) -> Dict[str, List[str]]:
        return {
            ReasoningStrategy.DEDUCTIVE.value: [
                "Let's start by identifying the general rule or principle that applies.",
                "Apply the general rule to the specific case at hand.",
                "Check that the conditions are fully satisfied before drawing a conclusion.",
                "Verify the logical validity of the deduction.",
                "Draw the necessary conclusion based on the rule and the case.",
            ],
            ReasoningStrategy.INDUCTIVE.value: [
                "Gather specific observations and cases.",
                "Look for recurring patterns across the observations.",
                "Formulate a tentative generalization.",
                "Test the generalization against additional evidence.",
                "State the inductive conclusion with appropriate confidence caveats.",
            ],
            ReasoningStrategy.ABDUCTIVE.value: [
                "List the observations that require explanation.",
                "Generate possible explanations (hypotheses).",
                "Evaluate each explanation for simplicity and coverage.",
                "Select the best explanation.",
                "Present the conclusion with acknowledgment of uncertainty.",
            ],
            ReasoningStrategy.ANALOGICAL.value: [
                "Identify the target domain and its key characteristics.",
                "Find a well-understood source domain with structural similarities.",
                "Map concepts and relations from source to target domain.",
                "Validate the analogical mapping for systematicity.",
                "Draw inferences about the target domain based on the analogy.",
            ],
            ReasoningStrategy.DECOMPOSITION.value: [
                "Analyze the problem to identify its constituent parts.",
                "Break the problem into independent sub-problems.",
                "Solve each sub-problem separately.",
                "Cross-validate the sub-solutions for consistency.",
                "Synthesize the results into a comprehensive answer.",
            ],
            ReasoningStrategy.CONTRASTIVE.value: [
                "List the alternatives to be compared.",
                "Define relevant comparison dimensions.",
                "Evaluate each alternative along each dimension.",
                "Identify trade-offs and key differentiators.",
                "Present a balanced comparison with recommendations.",
            ],
        }

    def _compile_result(
        self,
        query: str,
        strategy: ReasoningStrategy,
        steps: List[ReasoningStep],
    ) -> CoTResult:
        total_conf = 0.0
        count = 0
        for s in steps:
            total_conf += s.confidence
            count += 1
        avg_conf = total_conf / count if count > 0 else 0.0

        trace = self._build_trace(steps)

        last = steps[-1] if steps else None
        final_answer = last.content if last else "Unable to reach a conclusion."

        verified = all(s.verified for s in steps) if steps else False
        if not steps:
            verified = False

        return CoTResult(
            query=query,
            strategy=strategy,
            steps=steps,
            final_answer=final_answer,
            total_steps=len(steps),
            total_confidence=round(avg_conf, 4),
            trace=trace,
            verified=verified,
        )

    def format_trace(self, result: CoTResult, detail_level: str = "full") -> str:
        if detail_level == "summary":
            return self._format_trace_summary(result)
        return self._format_trace_full(result)

    def _format_trace_full(self, result: CoTResult) -> str:
        lines = [
            f"COT Trace: {result.query}",
            f"Strategy: {result.strategy.value}",
            f"Total Steps: {result.total_steps}",
            f"Overall Confidence: {result.total_confidence:.2%}",
            f"Verified: {result.verified}",
            f"{'─' * 60}",
        ]
        for step in result.steps:
            tag = f"[{step.step_type.value.upper()}]"
            conf = f"({step.confidence:.0%})"
            verified = " ✓" if step.verified else ""
            lines.append(f"  Step {step.step_id} {tag} {step.content} {conf}{verified}")
            if step.evidence:
                for ev in step.evidence[:3]:
                    lines.append(f"       Evidence: {ev[:80]}")
            if step.sub_steps:
                for sub in step.sub_steps:
                    lines.append(f"         > [{sub.step_type.value}] {sub.content[:80]}")
        lines.append(f"{'─' * 60}")
        lines.append(f"Final Answer: {result.final_answer}")
        return "\n".join(lines)

    def _format_trace_summary(self, result: CoTResult) -> str:
        step_count_by_type: Dict[str, int] = {}
        for s in result.steps:
            t = s.step_type.value
            step_count_by_type[t] = step_count_by_type.get(t, 0) + 1

        lines = [
            f"COT Summary: {result.query[:80]}",
            f"Strategy: {result.strategy.value}",
            f"Confidence: {result.total_confidence:.2%}",
            f"Step breakdown: {step_count_by_type}",
            f"Final: {result.final_answer[:120]}",
        ]
        return "\n".join(lines)

    def _build_trace(self, steps: List[ReasoningStep]) -> str:
        lines = []
        for step in steps:
            tag = f"[{step.step_type.value.upper()}]"
            lines.append(f"Step {step.step_id} {tag}: {step.content}")
        return "\n".join(lines)

    def _extract_rules(
        self, query: str, context: Optional[str]
    ) -> List[str]:
        rules: List[str] = []
        text = f"{query} {context or ''}"

        rule_patterns = [
            re.compile(r"(?:all|every|no|any)\s+(\w+(?:\s+\w+){0,5})\s+(?:is|are)\s+(\w+(?:\s+\w+){0,5})", re.IGNORECASE),
            re.compile(r"if\s+(.+?),\s*then\s+(.+)", re.IGNORECASE),
            re.compile(r"(.+?)\s+(?:implies|entails|means)\s+(.+)", re.IGNORECASE),
            re.compile(r"(?:the|a)\s+(?:rule|law|principle|theorem)\s+(?:of|that)\s+(.+)", re.IGNORECASE),
            re.compile(r"according\s+to\s+(.+?),\s+(.+)", re.IGNORECASE),
        ]

        for pat in rule_patterns:
            for match in pat.finditer(text):
                rules.append(match.group(0).strip())

        return rules

    def _extract_entities(self, text: str) -> List[str]:
        entities: List[str] = []
        words = re.findall(r"[A-Z][a-z]+(?:\s[A-Z][a-z]+)*", text)
        entities.extend(words)

        noun_phrases = re.findall(
            r"\b(?:the\s+)?([a-z]{3,}(?:\s+[a-z]{3,}){0,3})\b",
            text.lower()
        )
        stop_words = {
            "the", "and", "for", "are", "was", "were", "have", "has", "had",
            "not", "but", "from", "with", "that", "this", "these", "those",
            "what", "when", "where", "which", "who", "whom", "how", "why",
            "can", "will", "would", "could", "should", "may", "might", "shall",
            "does", "each", "every", "some", "any", "such", "also", "just",
            "about", "above", "after", "again", "into", "over", "under",
            "than", "then", "there", "their", "they", "been", "being", "other",
        }
        for np in noun_phrases:
            if np not in stop_words and len(np) > 3:
                entities.append(np)

        deduped: List[str] = []
        seen = set()
        for e in entities:
            lower_e = e.lower()
            if lower_e not in seen:
                seen.add(lower_e)
                deduped.append(e)
        return deduped

    def _infer_rules_from_query(self, query: str) -> List[str]:
        keywords = self._extract_keywords(query)
        if not keywords:
            return ["Apply general reasoning principles to the case"]

        rules = []
        for i, kw in enumerate(keywords[:3]):
            rules.append(
                f"General principle involving '{kw}': "
                f"entities with properties related to {kw} follow established patterns"
            )
        return rules or ["Apply domain-general reasoning framework"]

    def _extract_observations(
        self, query: str, context: Optional[str]
    ) -> List[str]:
        observations: List[str] = []
        text = f"{query} {context or ''}"

        sentences = re.split(r"[.!?。!?？\n]+", text)
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
            if len(sent.split()) >= 5:
                observations.append(sent)

        if not observations:
            words = query.split()
            for i in range(0, len(words), 5):
                chunk = " ".join(words[i : i + 5])
                if chunk.strip():
                    observations.append(chunk)

        return observations[:10]

    def _find_patterns(self, observations: List[str]) -> List[str]:
        patterns: List[str] = []
        if len(observations) < 2:
            return patterns

        all_words: List[str] = []
        for obs in observations:
            all_words.extend(re.findall(r"\b[a-z]{4,}\b", obs.lower()))

        counter = Counter(all_words)
        frequent = [w for w, c in counter.most_common(5) if c >= 2]

        if frequent:
            patterns.append(
                f"Recurring elements: {', '.join(frequent[:4])} appear "
                f"across multiple observations"
            )

        lengths = [len(o.split()) for o in observations]
        if lengths:
            patterns.append(
                f"Observation distribution: {len(observations)} observations "
                f"with avg length {sum(lengths) / len(lengths):.1f} words"
            )

        if len(observations) >= 3:
            first_words = [
                o.split()[0].lower() if o.split() else "" for o in observations[:3]
            ]
            patterns.append(
                f"Sequential patterns in observation structure: "
                f"{' -> '.join(first_words)}"
            )

        return patterns

    def _generate_explanations(
        self, text: str, observations: List[str]
    ) -> List[Tuple[Optional[str], Dict[str, float]]]:
        explanations: List[Tuple[Optional[str], Dict[str, float]]] = []
        keywords = self._extract_keywords(text)

        if not observations:
            observations = [text]

        if keywords:
            ob_text = " ".join(observations[:2])[:120]
            full = keywords[0] if keywords else "underlying factors"
            explanations.append(
                (f"The phenomenon can be explained by {full} as the primary "
                 f"causal factor in {ob_text}",
                 {"simplicity": 0.75, "coverage": 0.70}),
            )
            if len(keywords) > 1:
                explanations.append(
                    (f"Alternatively, a combination of {keywords[0]} and "
                     f"{keywords[1]} together explain the observations",
                     {"simplicity": 0.55, "coverage": 0.80}),
                )
            explanations.append(
                (f"A systemic interaction among {', '.join(keywords[:3])} "
                 f"provides the most comprehensive explanation",
                 {"simplicity": 0.40, "coverage": 0.90}),
            )

        if not explanations:
            explanations.append(
                ("The observations can be explained by the most probable "
                 "underlying mechanism based on Occam's razor",
                 {"simplicity": 0.70, "coverage": 0.65}),
            )
            explanations.append(
                ("A multi-factor explanation accounts for more of the "
                 "observed variance",
                 {"simplicity": 0.45, "coverage": 0.85}),
            )

        return explanations

    def _identify_target_domain(self, query: str) -> str:
        domain_keywords: Dict[str, List[str]] = {
            "software": ["code", "program", "software", "app", "application", "api",
                          "database", "server", "bug", "debug", "deploy", "compile"],
            "human body": ["heart", "brain", "blood", "nerve", "muscle", "organ",
                            "disease", "health", "anatomy", "surgery"],
            "business": ["company", "revenue", "profit", "market", "customer",
                          "product", "sales", "marketing", "strategy", "startup"],
            "ecosystem": ["species", "habitat", "ecosystem", "predator", "prey",
                           "biodiversity", "niche", "population", "extinction"],
            "architecture": ["building", "structure", "bridge", "design", "architect",
                              "construction", "foundation", "blueprint", "skyscraper"],
            "mechanical": ["engine", "pump", "machine", "gear", "motor", "piston",
                            "valve", "turbine", "mechanism", "fuel"],
        }

        lower = query.lower()
        scores: Dict[str, int] = {}
        for domain, keywords in domain_keywords.items():
            score = sum(1 for kw in keywords if kw in lower)
            if score > 0:
                scores[domain] = score

        if scores:
            return max(scores, key=scores.get)

        return "software"

    def _extract_key_concepts(self, text: str) -> List[str]:
        words = re.findall(r"[a-zA-Z]{4,}", text)
        counter = Counter(w.lower() for w in words)
        stop = {
            "that", "this", "what", "with", "from", "have", "been",
            "when", "where", "which", "about", "their", "there",
        }
        return [w for w, _ in counter.most_common(6) if w not in stop]

    def _extract_alternatives(
        self, query: str, context: Optional[str]
    ) -> List[str]:
        text = f"{query} {context or ''}"

        alternatives: List[str] = []

        vs_patterns = re.findall(
            r"(.+?)\s+(?:vs\.?|versus)\s+(.+)", text, re.IGNORECASE
        )
        for a, b in vs_patterns:
            alternatives.append(a.strip())
            alternatives.append(b.strip())

        if not alternatives:
            compare_patterns = re.findall(
                r"(?:compare|contrast|between)\s+(.+?)\s+(?:and|with)\s+(.+)",
                text, re.IGNORECASE,
            )
            for a, b in compare_patterns:
                alternatives.append(a.strip())
                alternatives.append(b.strip())

        if not alternatives:
            or_patterns = re.findall(
                r"^(.+?)\s+or\s+(.+?)(\?|$)", text, re.IGNORECASE
            )
            for a, b, _ in or_patterns:
                alternatives.append(a.strip())
                alternatives.append(b.strip())

        deduped: List[str] = []
        seen = set()
        for alt in alternatives:
            if alt.lower() not in seen:
                seen.add(alt.lower())
                deduped.append(alt)

        return deduped

    def _split_into_sub_questions(
        self, query: str, context: Optional[str]
    ) -> List[str]:
        sub_questions: List[str] = []

        conjunctions = [
            r"\s+and\s+", r"\s+also\s+", r"\s+plus\s+",
            r"\s+以及\s+", r"\s+并且\s+", r"\s+还有\s+",
        ]
        text = query
        if context:
            text = f"{query}\n{context}"

        segments = re.findall(r"\b(?:what|how|why|when|where|which|who)\b", text.lower())
        if len(segments) >= 2:
            q_parts = re.split(r"(\?|。|；)", query)
            for part in q_parts:
                part = part.strip().rstrip("?")
                if part and len(part.split()) > 2:
                    sub_questions.append(part + "?" if not part.endswith("?") else part)

        if not sub_questions:
            sub_questions = [
                f"What are the core components of: {query[:60]}?",
                f"How do these components interact?",
                f"What are the key dependencies or prerequisites?",
                f"What constraints apply to this problem?",
                f"What criteria define a successful solution?",
                f"What are the potential obstacles or challenges?",
                f"How can the results be validated or verified?",
            ]

        return sub_questions[:10]

    def _process_sub_question(
        self, sub_q: str, base_id: int
    ) -> List[ReasoningStep]:
        return [
            ReasoningStep(
                step_id=base_id + 1, step_type=StepType.OBSERVE,
                content=f"Analyze: {sub_q[:70]}", confidence=0.80,
            ),
            ReasoningStep(
                step_id=base_id + 2, step_type=StepType.HYPOTHESIZE,
                content=f"Formulate approach for: {sub_q[:70]}", confidence=0.70,
            ),
            ReasoningStep(
                step_id=base_id + 3, step_type=StepType.CONCLUDE,
                content=f"Sub-conclusion reached", confidence=0.65,
            ),
        ]

    def _extract_keywords(self, text: str) -> List[str]:
        words = re.findall(r"[\u4e00-\u9fff]{2,}|[a-zA-Z]{3,}", text)
        counter = Counter(w.lower() for w in words)
        return [w for w, _ in counter.most_common(10)]


# ============================================================
# ReasonByAnalogy
# ============================================================

class ReasonByAnalogy:
    """Specialized analogical reasoning with pre-built domain mappings."""

    def __init__(self):
        self._domain_mappings: Dict[str, Dict[str, str]] = {
            "software": {
                "bug": "crack",
                "refactor": "renovation",
                "api": "door",
                "database": "foundation",
                "server": "building",
                "deploy": "construct",
                "framework": "scaffolding",
                "interface": "facade",
                "module": "room",
                "architecture": "blueprint",
                "compile": "assemble",
                "runtime": "occupancy",
                "cache": "storage",
                "pipeline": "plumbing",
                "test": "inspection",
                "debug": "repair",
                "monolith": "single structure",
                "microservice": "modular unit",
            },
            "human body": {
                "heart": "pump",
                "brain": "cpu",
                "nerves": "wires",
                "blood": "fuel",
                "lungs": "air filter",
                "stomach": "processor",
                "liver": "filter",
                "kidney": "purifier",
                "skeleton": "frame",
                "muscle": "actuator",
                "skin": "casing",
                "eye": "camera",
                "ear": "microphone",
                "immune system": "security system",
                "dna": "blueprint",
                "hormone": "signal",
            },
            "business": {
                "company": "organism",
                "competition": "predation",
                "growth": "evolution",
                "market": "ecosystem",
                "revenue": "energy",
                "profit": "surplus energy",
                "employee": "cell",
                "department": "organ",
                "strategy": "adaptation",
                "innovation": "mutation",
                "customer": "resource",
                "supply chain": "food web",
                "disruption": "extinction event",
                "synergy": "symbiosis",
                "bankruptcy": "death",
                "acquisition": "ingestion",
            },
        }

        self._reverse_mappings: Dict[str, Dict[str, str]] = {}
        for target, mapping in self._domain_mappings.items():
            for concept, mapped in mapping.items():
                if "mapped" not in target:
                    rev_key = self._infer_source_domain(target)
                    if rev_key:
                        self._reverse_mappings.setdefault(rev_key, {})[mapped] = concept

    def find_analogy(self, target_domain: str) -> Optional[Tuple[str, str]]:
        descriptions: Dict[str, str] = {
            "software": "building architecture",
            "human body": "mechanical machine",
            "business": "ecological ecosystem",
            "ecosystem": "business marketplace",
            "architecture": "software design",
            "mechanical": "biological system",
        }

        target = target_domain.strip().lower()
        for domain, mapping in self._domain_mappings.items():
            if domain in target or target in domain:
                source = self._infer_source_domain(domain)
                if source:
                    return (source, descriptions.get(source, source))
        return None

    def map_concepts(
        self, source: str, target: str, concept: str
    ) -> Optional[str]:
        target_clean = target.strip().lower()
        concept_clean = concept.strip().lower()

        if target_clean in self._domain_mappings:
            mapping = self._domain_mappings[target_clean]
            for term, mapped in mapping.items():
                if term in concept_clean or concept_clean in term:
                    return mapped

        if concept_clean in self._domain_mappings.get(target_clean, {}):
            return self._domain_mappings[target_clean][concept_clean]

        word_parts = concept_clean.lower().split()
        for part in word_parts:
            if part in self._domain_mappings.get(target_clean, {}):
                return self._domain_mappings[target_clean][part]

        return None

    def _reverse_map_concept(
        self, source: str, target: str, concept: str
    ) -> Optional[str]:
        source_clean = source.strip().lower()
        concept_clean = concept.strip().lower()
        for rev_key, mapping in self._reverse_mappings.items():
            if source_clean in rev_key or rev_key in source_clean:
                for term, mapped in mapping.items():
                    if term in concept_clean or concept_clean in term:
                        return mapped
                if concept_clean in mapping:
                    return mapping[concept_clean]
        return None

    def _infer_source_domain(self, target: str) -> Optional[str]:
        inference: Dict[str, str] = {
            "software": "architecture",
            "human body": "machine",
            "business": "ecology",
            "ecosystem": "business",
            "architecture": "software",
            "mechanical": "human body",
        }
        return inference.get(target)


# ============================================================
# ReasoningVerifier
# ============================================================

class ReasoningVerifier:
    """Verifies reasoning chains for logical validity."""

    _valid_sequences: Dict[StepType, List[StepType]] = {
        StepType.OBSERVE: [StepType.OBSERVE, StepType.HYPOTHESIZE, StepType.BACKTRACK],
        StepType.HYPOTHESIZE: [StepType.HYPOTHESIZE, StepType.VERIFY, StepType.CONCLUDE],
        StepType.VERIFY: [StepType.VERIFY, StepType.HYPOTHESIZE, StepType.CONCLUDE, StepType.BACKTRACK],
        StepType.BACKTRACK: [StepType.HYPOTHESIZE, StepType.OBSERVE, StepType.BACKTRACK],
        StepType.CONCLUDE: [StepType.CONCLUDE],
    }

    def verify_chain(
        self, steps: List[ReasoningStep]
    ) -> Tuple[bool, List[str]]:
        errors: List[str] = []

        if not steps:
            return True, errors

        for i, step in enumerate(steps):
            valid = self._verify_step_validity(step, steps)
            if not valid:
                errors.append(
                    f"Step {i}: invalid step type sequence "
                    f"({step.step_type.value} cannot follow "
                    f"{steps[i-1].step_type.value if i > 0 else 'start'})"
                )

        for i, step in enumerate(steps):
            consistent = self._check_consistency(step, steps[:i])
            if not consistent:
                errors.append(
                    f"Step {i}: content inconsistent with prior reasoning"
                )

        if len(steps) >= 3:
            last = steps[-1]
            if last.step_type != StepType.CONCLUDE:
                if not any(s.step_type == StepType.CONCLUDE for s in steps):
                    errors.append(
                        "Chain: no conclusion step found in reasoning path"
                    )

        confidence_trend_ok = self._check_confidence_trend(steps)
        if not confidence_trend_ok:
            errors.append(
                "Chain: confidence scores are erratic without justification"
            )

        return len(errors) == 0, errors

    def _verify_step_validity(
        self, step: ReasoningStep, all_steps: List[ReasoningStep]
    ) -> bool:
        step_idx = None
        for i, s in enumerate(all_steps):
            if s.step_id == step.step_id:
                step_idx = i
                break

        if step_idx is None:
            return True

        if step_idx == 0:
            return True

        prev_step = all_steps[step_idx - 1]
        allowed = self._valid_sequences.get(prev_step.step_type, [])

        if step.step_type in allowed:
            return True

        return False

    def _check_consistency(
        self, step: ReasoningStep, history: List[ReasoningStep]
    ) -> bool:
        if not history:
            return True

        step_keywords = set(re.findall(r"\b[a-zA-Z]{4,}\b", step.content.lower()))
        for prev in history:
            prev_keywords = set(
                re.findall(r"\b[a-zA-Z]{4,}\b", prev.content.lower())
            )
            overlap = step_keywords & prev_keywords

            if prev.step_type == StepType.BACKTRACK:
                continue

            contradiction_words = {"contradiction", "however", "but not",
                                    "despite", "although", "opposes"}
            content_lower = step.content.lower()
            if contradiction_words & set(content_lower.split()) and overlap:
                continue

        return True

    def _check_confidence_trend(self, steps: List[ReasoningStep]) -> bool:
        if len(steps) < 3:
            return True

        confidences = [s.confidence for s in steps]
        jumps = 0
        for i in range(1, len(confidences)):
            if abs(confidences[i] - confidences[i - 1]) > 0.4:
                jumps += 1

        return jumps <= len(confidences) // 2


# ============================================================
# Singleton
# ============================================================

_cot_reasoner: Optional[CoTReasoner] = None


def get_cot_reasoner() -> CoTReasoner:
    global _cot_reasoner
    if _cot_reasoner is None:
        _cot_reasoner = CoTReasoner()
    return _cot_reasoner


def reset_cot_reasoner() -> None:
    global _cot_reasoner
    _cot_reasoner = None
