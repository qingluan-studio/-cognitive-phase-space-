"""智能体议会 — 引入对抗性辩论，多轮交叉质询。

创建 DebateOrchestrator，在关键决策节点启动辩论子流程：
- 正方(Proponent) vs 反方(Opponent) N 轮辩论
- 质询交叉进行
- 辩论记录输入共识机制

继承基础编排器，仅替换综合阶段为辩论阶段。
"""

import uuid
import time
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class DebateRole(Enum):
    PROPONENT = "proponent"
    OPPONENT = "opponent"


class ArgumentQuality(Enum):
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"
    FALLACY = "fallacy"


@dataclass
class Argument:
    """单轮辩论论点。"""

    argument_id: str = ""
    round_number: int = 0
    role: DebateRole = DebateRole.PROPONENT
    content: str = ""
    quality: ArgumentQuality = ArgumentQuality.MODERATE
    evidence: list[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)


@dataclass
class DebateRound:
    """一轮辩论记录。"""

    round_number: int
    proponent_argument: Argument
    opponent_argument: Argument
    cross_examination: list[str] = field(default_factory=list)
    summary: str = ""
    winner: Optional[DebateRole] = None


@dataclass
class DebateSession:
    """完整辩论会话。"""

    session_id: str = ""
    topic: str = ""
    max_rounds: int = 3
    rounds: list[DebateRound] = field(default_factory=list)
    final_resolution: str = ""
    winner: Optional[DebateRole] = None
    score_proponent: float = 0.0
    score_opponent: float = 0.0
    created_at: float = field(default_factory=time.time)
    status: str = "pending"


class DebateSessionManager:
    """辩论会话管理 — 支持多 Agent 参与的对抗性辩论。

    使用方式:
        mgr = DebateSessionManager()
        session = mgr.create_session("AI 是否应该自主决策?", max_rounds=3)
        mgr.add_argument(session.session_id, 1, DebateRole.PROPONENT, "AI 提高效率...")
        mgr.add_argument(session.session_id, 1, DebateRole.OPPONENT, "但存在失控风险...")
        resolution, winner = mgr.resolve(session.session_id)
    """

    def __init__(self) -> None:
        self._sessions: dict[str, DebateSession] = {}
        self._lock = threading.RLock()

    def create_session(
        self, topic: str, max_rounds: int = 3
    ) -> DebateSession:
        session = DebateSession(
            session_id=str(uuid.uuid4())[:8],
            topic=topic,
            max_rounds=max_rounds,
            status="active",
        )
        with self._lock:
            self._sessions[session.session_id] = session
        return session

    def add_argument(
        self,
        session_id: str,
        round_number: int,
        role: DebateRole,
        content: str,
        evidence: Optional[list[str]] = None,
    ) -> Optional[Argument]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None

            argument = Argument(
                argument_id=str(uuid.uuid4())[:8],
                round_number=round_number,
                role=role,
                content=content,
                evidence=evidence or [],
            )

            while len(session.rounds) < round_number:
                session.rounds.append(DebateRound(
                    round_number=len(session.rounds) + 1,
                    proponent_argument=Argument(argument_id=""),
                    opponent_argument=Argument(argument_id=""),
                ))

            debate_round = session.rounds[round_number - 1]
            if role == DebateRole.PROPONENT:
                debate_round.proponent_argument = argument
            else:
                debate_round.opponent_argument = argument

            return argument

    def add_cross_examination(
        self, session_id: str, round_number: int, question: str
    ) -> bool:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            if round_number > len(session.rounds):
                return False
            session.rounds[round_number - 1].cross_examination.append(question)
            return True

    def score_round(self, session_id: str, round_number: int) -> Optional[DebateRound]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if round_number > len(session.rounds):
                return None

            r = session.rounds[round_number - 1]
            pro_score = self._evaluate_argument(r.proponent_argument)
            opp_score = self._evaluate_argument(r.opponent_argument)

            r.winner = (
                DebateRole.PROPONENT if pro_score > opp_score
                else DebateRole.OPPONENT if opp_score > pro_score
                else None
            )
            return r

    def _evaluate_argument(self, arg: Argument) -> float:
        score = 0.5
        if arg.quality == ArgumentQuality.STRONG:
            score = 0.9
        elif arg.quality == ArgumentQuality.WEAK:
            score = 0.3
        elif arg.quality == ArgumentQuality.FALLACY:
            score = 0.1

        if arg.content:
            score += 0.1 * min(1.0, len(arg.content) / 500)
        if arg.evidence:
            score += 0.1 * min(1.0, len(arg.evidence) / 3)

        return min(1.0, score)

    def resolve(self, session_id: str) -> tuple[str, Optional[DebateRole], float, float]:
        """结束辩论并产生决议。"""
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return "No such session", None, 0.0, 0.0

            pro_wins = 0
            opp_wins = 0
            pro_total_score = 0.0
            opp_total_score = 0.0

            for i in range(1, len(session.rounds) + 1):
                self.score_round(session_id, i)
                r = session.rounds[i - 1]
                if r.winner == DebateRole.PROPONENT:
                    pro_wins += 1
                elif r.winner == DebateRole.OPPONENT:
                    opp_wins += 1
                pro_total_score += self._evaluate_argument(r.proponent_argument)
                opp_total_score += self._evaluate_argument(r.opponent_argument)

            n = max(len(session.rounds), 1)
            session.score_proponent = pro_total_score / n
            session.score_opponent = opp_total_score / n

            if pro_wins > opp_wins:
                session.winner = DebateRole.PROPONENT
                resolution = (f"经过 {len(session.rounds)} 轮辩论，正方获胜 "
                              f"({pro_wins}:{opp_wins})。{session.topic} 的结论: 支持立场。")
            elif opp_wins > pro_wins:
                session.winner = DebateRole.OPPONENT
                resolution = (f"经过 {len(session.rounds)} 轮辩论，反方获胜 "
                              f"({opp_wins}:{pro_wins})。{session.topic} 的结论: 反对立场。")
            else:
                session.winner = None
                resolution = (f"经过 {len(session.rounds)} 轮辩论，双方势均力敌 "
                              f"({pro_wins}:{opp_wins})。需要更多证据。")

            session.final_resolution = resolution
            session.status = "resolved"
            return resolution, session.winner, session.score_proponent, session.score_opponent

    def get_session(self, session_id: str) -> Optional[DebateSession]:
        with self._lock:
            return self._sessions.get(session_id)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            by_status: dict[str, int] = {}
            for s in self._sessions.values():
                by_status[s.status] = by_status.get(s.status, 0) + 1

            pro_wins = sum(1 for s in self._sessions.values()
                           if s.winner == DebateRole.PROPONENT)
            opp_wins = sum(1 for s in self._sessions.values()
                           if s.winner == DebateRole.OPPONENT)
            return {
                "total_sessions": len(self._sessions),
                "active": by_status.get("active", 0),
                "resolved": by_status.get("resolved", 0),
                "proponent_wins": pro_wins,
                "opponent_wins": opp_wins,
                "draws": self._sessions.__len__() - pro_wins - opp_wins,
            }

    def reset(self) -> None:
        with self._lock:
            self._sessions.clear()


class DebateOrchestrator:
    """辩论编排器 — 启动结构化辩论子流程。

    使用方式:
        orch = DebateOrchestrator()
        resolution = orch.run_debate(
            topic="是否使用加权共识替代多数投票?",
            proponent_content=["加权减少噪声"],
            opponent_content=["多数投票简单高效"],
            max_rounds=2,
        )
    """

    def __init__(self) -> None:
        self._manager = DebateSessionManager()

    @property
    def manager(self) -> DebateSessionManager:
        return self._manager

    def run_debate(
        self,
        topic: str,
        proponent_content: list[str],
        opponent_content: list[str],
        max_rounds: int = 3,
    ) -> dict[str, Any]:
        """运行完整辩论流程。"""
        session = self._manager.create_session(topic, max_rounds)

        n_rounds = min(max_rounds, max(len(proponent_content), len(opponent_content)))
        for i in range(n_rounds):
            pro = proponent_content[i] if i < len(proponent_content) else ""
            opp = opponent_content[i] if i < len(opponent_content) else ""

            self._manager.add_argument(
                session.session_id, i + 1, DebateRole.PROPONENT,
                pro, evidence=[],
            )
            self._manager.add_argument(
                session.session_id, i + 1, DebateRole.OPPONENT,
                opp, evidence=[],
            )

            if i < n_rounds - 1:
                self._manager.add_cross_examination(
                    session.session_id, i + 1,
                    f"对方在第{i+1}轮的论点有何漏洞?",
                )

        resolution, winner, pro_score, opp_score = self._manager.resolve(
            session.session_id)

        return {
            "resolution": resolution,
            "winner": winner.value if winner else "draw",
            "score_proponent": pro_score,
            "score_opponent": opp_score,
            "rounds": len(session.rounds),
            "session_id": session.session_id,
        }

    def stats(self) -> dict[str, Any]:
        return self._manager.stats()

    def reset(self) -> None:
        self._manager.reset()
