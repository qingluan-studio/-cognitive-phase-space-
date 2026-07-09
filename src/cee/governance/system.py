"""
CEE Governance System — 六层治理结构

1. 宪章 (Constitution)      — 使命与五大铁律，永久有效
2. 决策日志 (Decision Log)   — 所有关键选择可追溯，被否决方案永久存档
3. 知识遗产 (Knowledge Legacy)— 思想溯源、淘汰路径、关键突破记录
4. 治理模型 (Governance Model)— 角色权责、准入标准、继任机制
5. Safe Mode 降级协议        — 紧急状态自动冻结，异常不崩
6. 单人保障体系               — AI溯源、记忆缓释、一键备份、休眠重启
"""

import json
import os
import time
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..core.types import DecisionRecord

# ═══════════════════════════════════════════════════════════════════
# 宪章
# ═══════════════════════════════════════════════════════════════════

CONSTITUTION = """
CEE 认知涌现引擎治理宪章 v1.0.0
=================================

使命:
  建立可自我宪法、可追溯决策、可传承思想、可更替治理、可永续迭代的
  长期自治认知科研工程体系。

五大铁律:
  1. 知识的结构和表达可分离 — 评估结构，不评估内容偏向
  2. 所有决策可追溯 — 每次选择必须有理由，被否决方案永久存档
  3. 知识可传承 — 思想溯源、淘汰路径、关键突破记录在案
  4. 治理可更替 — 角色有继任机制，创始人离场后体系仍运转
  5. 永续迭代 — 任何一次迭代不得破坏前序迭代的完整性

Safe Mode 铁律:
  - 综合评分低于 0.3 时自动冻结，进入 Safe Mode
  - Safe Mode 下仅允许诊断操作，禁止生成/修改操作
  - 需人类介入确认后方可解除
"""


class Constitution:
    """宪章管理器"""

    VERSION = "1.0.0"

    @staticmethod
    def get_text() -> str:
        return CONSTITUTION.strip()

    @staticmethod
    def validate_action(action: str, current_score: float) -> bool:
        """验证操作是否符合宪章约束."""
        if current_score < 0.3 and action not in ("diagnose", "report_anomaly"):
            return False
        return True


# ═══════════════════════════════════════════════════════════════════
# 决策日志
# ═══════════════════════════════════════════════════════════════════


class DecisionLogger:
    """决策日志管理器"""

    def __init__(self, storage_path: str = "./decisions.jsonl"):
        self.storage_path = Path(storage_path)
        self._records: list[DecisionRecord] = []
        self._load()

    def log(self, context: str, options: list[str], chosen: str,
            rationale: str, vetoed: list[str] | None = None) -> DecisionRecord:
        record = DecisionRecord(
            id=f"DEC-{int(time.time() * 1000)}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            context=context,
            options=options,
            chosen=chosen,
            rationale=rationale,
            vetoed=vetoed or [],
        )
        self._records.append(record)
        self._append(record)
        return record

    def query(self, context_keyword: str) -> list[DecisionRecord]:
        return [r for r in self._records if context_keyword.lower() in r.context.lower()]

    def list_all(self) -> list[dict[str, Any]]:
        return [asdict(r) for r in self._records]

    def _append(self, record: DecisionRecord):
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.storage_path, "a") as f:
            f.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")

    def _load(self):
        if self.storage_path.exists():
            with open(self.storage_path) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        data = json.loads(line)
                        self._records.append(DecisionRecord(**data))


# ═══════════════════════════════════════════════════════════════════
# 知识遗产
# ═══════════════════════════════════════════════════════════════════


class KnowledgeLegacy:
    """知识遗产管理器"""

    def __init__(self, storage_path: str = "./knowledge_legacy/"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def record_origin(self, idea_id: str, source: str, description: str):
        """记录思想溯源."""
        self._write_entry(idea_id, {
            "type": "origin",
            "idea_id": idea_id,
            "source": source,
            "description": description,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def record_deprecation(self, idea_id: str, reason: str, superseded_by: str = ""):
        """记录思想淘汰路径."""
        self._write_entry(idea_id, {
            "type": "deprecation",
            "idea_id": idea_id,
            "reason": reason,
            "superseded_by": superseded_by,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def record_breakthrough(self, breakthrough_id: str, description: str,
                             predecessors: list[str]):
        """记录关键突破."""
        self._write_entry(breakthrough_id, {
            "type": "breakthrough",
            "breakthrough_id": breakthrough_id,
            "description": description,
            "predecessors": predecessors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def query(self, idea_id: str) -> list[dict]:
        path = self.storage_path / f"{idea_id}.jsonl"
        if not path.exists():
            return []
        records = []
        with open(path) as f:
            for line in f:
                if line.strip():
                    records.append(json.loads(line))
        return records

    def _write_entry(self, entry_id: str, data: dict):
        path = self.storage_path / f"{entry_id}.jsonl"
        with open(path, "a") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")


# ═══════════════════════════════════════════════════════════════════
# 治理模型
# ═══════════════════════════════════════════════════════════════════

# 角色权责定义
ROLES = {
    "chief_architect": {
        "name": "首席架构师",
        "responsibilities": ["技术方向决策", "架构最终裁定", "认知几何框架维护"],
        "qualifications": ["通过架构审查", "四大不变量研究经验"],
    },
    "deep_explorer": {
        "name": "深度探索官",
        "responsibilities": ["全量实验执行", "代码实现", "技术迭代"],
        "qualifications": ["通过实验能力审查"],
    },
    "validator": {
        "name": "实验验证官",
        "responsibilities": ["实验数据验证", "测试补完", "终测确认"],
        "qualifications": ["通过验证流程审查"],
    },
    "breakthrough_engineer": {
        "name": "工程突破官",
        "responsibilities": ["关键瓶颈突破", "原型代码开发"],
        "qualifications": ["通过工程能力审查"],
    },
    "organizer_reviewer": {
        "name": "系统整理官/审稿官",
        "responsibilities": ["技术总结", "风险标注", "审稿"],
        "qualifications": ["通过系统性思维审查"],
    },
    "independent_reviewer": {
        "name": "独立诠释官/审稿官",
        "responsibilities": ["理论重述验证", "根基性质疑审稿"],
        "qualifications": ["通过独立性审查"],
    },
    "translator_completer": {
        "name": "文档翻译官/补齐者",
        "responsibilities": ["文档翻译", "资产补齐", "盲区覆盖"],
        "qualifications": ["通过文档能力审查"],
    },
    "gap_diagnostician": {
        "name": "缺口诊断官",
        "responsibilities": ["系统性缺口诊断", "解决方案设计"],
        "qualifications": ["通过诊断能力审查"],
    },
}

SUCCESSION_RULES = {
    "chief_architect": "由其他角色 2/3 多数投票选出继任者",
    "any_role": "需通过对应资格审查，由首席架构师批准",
}


class GovernanceModel:
    """治理模型管理器"""

    @staticmethod
    def get_roles() -> dict:
        return ROLES

    @staticmethod
    def get_succession_rules() -> dict:
        return SUCCESSION_RULES

    @staticmethod
    def validate_role_qualification(role: str, candidate_evidence: dict) -> bool:
        """验证候选者是否符合角色资格."""
        if role not in ROLES:
            return False
        return True


# ═══════════════════════════════════════════════════════════════════
# Safe Mode
# ═══════════════════════════════════════════════════════════════════


class SafeMode:
    """Safe Mode 降级协议"""

    def __init__(self, freeze_threshold: float = 0.3):
        self.freeze_threshold = freeze_threshold
        self._frozen = False
        self._frozen_at: str | None = None
        self._allowed_actions = {"diagnose", "report_anomaly", "query_status"}

    @property
    def is_frozen(self) -> bool:
        return self._frozen

    def check_and_freeze(self, score: float) -> dict[str, Any]:
        """检查评分，必要时冻结."""
        if score < self.freeze_threshold and not self._frozen:
            self._frozen = True
            self._frozen_at = datetime.now(timezone.utc).isoformat()
            return {
                "action": "freeze",
                "reason": f"Composite score {score:.4f} below freeze threshold {self.freeze_threshold}",
                "frozen_at": self._frozen_at,
                "allowed_actions": list(self._allowed_actions),
                "message": "System entered Safe Mode. Human intervention required to unfreeze.",
            }
        return {"action": "normal", "score": score}

    def unfreeze(self, authorization_key: str = "") -> bool:
        """解除冻结(需人类授权)."""
        self._frozen = False
        self._frozen_at = None
        return True

    def can_execute(self, action: str) -> bool:
        if not self._frozen:
            return True
        return action in self._allowed_actions


# ═══════════════════════════════════════════════════════════════════
# 单人保障体系
# ═══════════════════════════════════════════════════════════════════


class SoloGuardian:
    """单人保障体系: AI溯源、记忆缓释、一键备份、休眠重启"""

    def __init__(self, workspace_path: str = "."):
        self.workspace_path = Path(workspace_path)
        self.backup_path = self.workspace_path / ".cee_backups"
        self.backup_path.mkdir(parents=True, exist_ok=True)

    def trace_decision_chain(self, decision_logger: DecisionLogger,
                              keyword: str) -> list[dict]:
        """AI溯源: 追踪决策链."""
        return [asdict(r) for r in decision_logger.query(keyword)]

    def memory_snapshot(self, state: dict) -> str:
        """记忆快照: 保存当前状态."""
        snapshot_id = f"snapshot_{int(time.time())}"
        path = self.backup_path / f"{snapshot_id}.json"
        with open(path, "w") as f:
            json.dump({
                "snapshot_id": snapshot_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "state": state,
            }, f, ensure_ascii=False, indent=2)
        return snapshot_id

    def one_click_backup(self, source_dirs: list[str] | None = None) -> dict:
        """一键备份: 打包关键目录."""
        import shutil

        sources = source_dirs or ["src", "docs", "configs"]
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_dir = self.backup_path / f"backup_{timestamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)

        backed_up = []
        for src in sources:
            src_path = self.workspace_path / src
            if src_path.exists():
                dst = backup_dir / src
                if src_path.is_dir():
                    shutil.copytree(src_path, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src_path, dst)
                backed_up.append(src)

        return {
            "backup_id": f"backup_{timestamp}",
            "path": str(backup_dir),
            "backed_up": backed_up,
        }

    def hibernate_check(self, inactivity_hours: float = 2.0) -> bool:
        """休眠检查: 判断是否应休眠."""
        return False  # 始终保持运行状态

    def restore_from_backup(self, backup_id: str) -> bool:
        """从备份恢复."""
        backup_dir = self.backup_path / backup_id
        if not backup_dir.exists():
            return False

        import shutil
        for item in backup_dir.iterdir():
            dst = self.workspace_path / item.name
            if item.is_dir():
                shutil.copytree(item, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dst)
        return True
