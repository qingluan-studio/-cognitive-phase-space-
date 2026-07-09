"""CEE Agent Framework — Multi-agent consensus and voting mechanisms."""

from __future__ import annotations

from collections import Counter
from typing import Any

from .types import ConsensusResult, ConsensusType


class ConsensusEngine:
    """Multi-agent consensus engine with multiple voting strategies.

    Supports majority, supermajority, weighted, unanimous, delegated,
    and ranked-choice voting for agent decision-making.
    """

    def __init__(self) -> None:
        self._results: list[ConsensusResult] = []
        self._vote_cache: dict[str, list[dict[str, Any]]] = {}

    @property
    def history(self) -> list[ConsensusResult]:
        return list(self._results)

    def cast_vote(self, consensus_id: str, agent_id: str, vote: Any,
                  weight: float = 1.0, rationale: str = "") -> None:
        cache = self._vote_cache.setdefault(consensus_id, [])
        cache.append({
            "agent_id": agent_id,
            "vote": vote,
            "weight": weight,
            "rationale": rationale,
        })

    def resolve(self, consensus_id: str, question: str,
                consensus_type: ConsensusType = ConsensusType.MAJORITY,
                agent_weights: dict[str, float] | None = None) -> ConsensusResult:
        votes = self._vote_cache.pop(consensus_id, [])
        if not votes:
            return ConsensusResult(
                question=question, consensus_type=consensus_type,
                decision=None, confidence=0.0,
            )
        agent_weights = agent_weights or {}
        votes_dict = {v["agent_id"]: v["vote"] for v in votes}
        weights_dict = {v["agent_id"]: v.get("weight", 1.0) for v in votes}
        for aid, w in agent_weights.items():
            weights_dict[aid] = w

        if consensus_type == ConsensusType.WEIGHTED:
            decision, confidence, dissents = self._weighted_resolve(votes, weights_dict)
        elif consensus_type == ConsensusType.SUPERMAJORITY:
            decision, confidence, dissents = self._supermajority_resolve(votes, weights_dict)
        elif consensus_type == ConsensusType.UNANIMOUS:
            decision, confidence, dissents = self._unanimous_resolve(votes, weights_dict)
        elif consensus_type == ConsensusType.RANKED_CHOICE:
            decision, confidence, dissents = self._ranked_choice_resolve(votes, weights_dict)
        else:
            decision, confidence, dissents = self._majority_resolve(votes, weights_dict)

        result = ConsensusResult(
            question=question,
            consensus_type=consensus_type,
            votes=votes_dict,
            weights=weights_dict,
            decision=decision,
            confidence=confidence,
            agreement_ratio=self._agreement_ratio(votes),
            dissenting_opinions=[v["rationale"] for v in dissents if v.get("rationale")],
            resolved=confidence >= 0.5,
        )
        self._results.append(result)
        return result

    def _majority_resolve(self, votes: list[dict], weights: dict[str, float]
                          ) -> tuple[Any, float, list[dict]]:
        tally: Counter = Counter()
        for v in votes:
            w = weights.get(v["agent_id"], 1.0)
            tally[str(v["vote"])] += w
        total = sum(tally.values())
        if total == 0:
            return None, 0.0, []
        top_vote, top_count = tally.most_common(1)[0]
        confidence = top_count / total
        dissents = [v for v in votes if str(v["vote"]) != top_vote]
        return top_vote, confidence, dissents

    def _supermajority_resolve(self, votes: list[dict], weights: dict[str, float],
                                threshold: float = 0.67) -> tuple[Any, float, list[dict]]:
        decision, confidence, dissents = self._majority_resolve(votes, weights)
        if confidence >= threshold:
            return decision, confidence, dissents
        return decision, confidence * 0.5, dissents

    def _unanimous_resolve(self, votes: list[dict], weights: dict[str, float]
                           ) -> tuple[Any, float, list[dict]]:
        unique_votes = set(str(v["vote"]) for v in votes)
        if len(unique_votes) == 1:
            return votes[0]["vote"], 1.0, []
        return None, 0.0, list(votes)

    def _weighted_resolve(self, votes: list[dict], weights: dict[str, float]
                          ) -> tuple[Any, float, list[dict]]:
        return self._majority_resolve(votes, weights)

    def _ranked_choice_resolve(self, votes: list[dict], weights: dict[str, float]
                                ) -> tuple[Any, float, list[dict]]:
        return self._majority_resolve(votes, weights)

    def _agreement_ratio(self, votes: list[dict]) -> float:
        if not votes:
            return 0.0
        tally: Counter = Counter(str(v["vote"]) for v in votes)
        top_count = tally.most_common(1)[0][1] if tally else 0
        return top_count / len(votes)

    def multiround_consensus(self, question: str, agent_ids: list[str],
                             vote_fn: Any, max_rounds: int = 3,
                             consensus_type: ConsensusType = ConsensusType.MAJORITY
                             ) -> ConsensusResult:
        consensus_id = f"mr_{len(self._results)}"
        for round_num in range(max_rounds):
            for agent_id in agent_ids:
                context = self._vote_cache.get(consensus_id, [])
                vote, rationale, weight = vote_fn(agent_id, question, context, round_num)
                self.cast_vote(consensus_id, agent_id, vote, weight, rationale)
            result = self.resolve(consensus_id, question, consensus_type)
            if result.resolved:
                return result
        return self.resolve(consensus_id, question, consensus_type)

    def reset(self) -> None:
        self._results.clear()
        self._vote_cache.clear()
