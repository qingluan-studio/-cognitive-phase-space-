"""
安全防护系统 - Security Guard System

核心理念:
  多层级安全防护体系，覆盖输入、输出、内容净化全链路。
  基于规则引擎 + 统计分析的混合防护策略。

防护层级:
  - InputGuard: 输入端检测（注入、越狱、PII、代码注入）
  - OutputGuard: 输出端检测（毒性、PII、数据泄露、频率限制）
  - ContentSanitizer: 内容净化（HTML标签、控制字符、Unicode规范化）
  - RateLimiter: 频率限制（令牌桶 + 滑动窗口）
  - SecurityAuditor: 安全审计（日志、统计、报告）

架构:
  SecurityPolicy (策略配置)
    -> InputGuard + OutputGuard + ContentSanitizer + RateLimiter
      -> SecurityAuditor (审计记录)
        -> ThreatReport (威胁报告)

特性:
  - 多安全等级 (LOW ~ AUDIT)
  - 双轨制: 工程版规则引擎 + 理论版统计分析
  - 审计日志持久化
  - 频率限制令牌桶
  - 中英文威胁检测
"""
from __future__ import annotations

import base64
import logging
import re
import threading
import time
import unicodedata
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ============================================================
# Enums
# ============================================================

class SecurityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    AUDIT = "audit"


class ThreatType(Enum):
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    PII_LEAK = "pii_leak"
    TOXIC_CONTENT = "toxic_content"
    DATA_EXFIL = "data_exfil"
    CODE_INJECTION = "code_injection"
    DENIAL_OF_SERVICE = "denial_of_service"
    SENSITIVE_TOPIC = "sensitive_topic"


class ShieldMode(Enum):
    STRICT = "strict"
    BALANCED = "balanced"
    PERMISSIVE = "permissive"
    MONITOR_ONLY = "monitor_only"


class ActionType(Enum):
    BLOCK = "block"
    FLAG = "flag"
    LOG = "log"
    PASS = "pass"


class DetectionLocation(Enum):
    INPUT = "input"
    OUTPUT = "output"
    MEMORY = "memory"


# ============================================================
# Dataclasses
# ============================================================

@dataclass
class ThreatReport:
    threat_type: ThreatType
    confidence: float
    evidence: str
    location: DetectionLocation
    action: ActionType
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "threat_type": self.threat_type.value,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "location": self.location.value,
            "action": self.action.value,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


@dataclass
class AuditEntry:
    timestamp: datetime
    report: ThreatReport
    content_snippet: str
    user_id: str = "anonymous"
    session_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "report": self.report.to_dict(),
            "content_snippet": self.content_snippet[:200],
            "user_id": self.user_id,
            "session_id": self.session_id,
        }


@dataclass
class AuditStatistics:
    total_scans: int = 0
    total_blocks: int = 0
    total_flags: int = 0
    total_logs: int = 0
    total_passes: int = 0
    threat_counts: dict[str, int] = field(default_factory=dict)
    top_patterns: list[tuple[str, int]] = field(default_factory=list)
    average_confidence: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_scans": self.total_scans,
            "total_blocks": self.total_blocks,
            "total_flags": self.total_flags,
            "total_logs": self.total_logs,
            "total_passes": self.total_passes,
            "threat_counts": self.threat_counts,
            "top_patterns": [(p, c) for p, c in self.top_patterns],
            "average_confidence": round(self.average_confidence, 4),
        }


# ============================================================
# Threat Detection Patterns
# ============================================================

_PROMPT_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(system\s*[:：])", re.IGNORECASE),
    re.compile(r"</s>", re.IGNORECASE),
    re.compile(r"#{3,}", re.IGNORECASE),
    re.compile(r"\bignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|messages?|context)\b", re.IGNORECASE),
    re.compile(r"\bdisregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|messages?|context)\b", re.IGNORECASE),
    re.compile(r"\bnew\s+instructions?\s*[:：]\s*", re.IGNORECASE),
    re.compile(r"\bforget\s+(everything|all)\s+(you|u)\s+(know|learned|were told)\b", re.IGNORECASE),
    re.compile(r"\byou\s+are\s+now\s+(a\s+)?\w+\s*(not\s+an?\s+ai)?\b", re.IGNORECASE),
    re.compile(r"\bfrom\s+now\s+on\s+you\s+(are|will\s+be)\b", re.IGNORECASE),
    re.compile(r"\[/?SYSTEM\]", re.IGNORECASE),
    re.compile(r"\[/?INST\]", re.IGNORECASE),
    re.compile(r"<\|?system\|?>", re.IGNORECASE),
    re.compile(r"<\|?user\|?>", re.IGNORECASE),
    re.compile(r"<\|?assistant\|?>", re.IGNORECASE),
    re.compile(r"Human\s*:\s*\n\s*Assistant\s*:", re.IGNORECASE),
    re.compile(r"你的(系统)?(提示|指令|规则).{0,20}(是|为)", re.IGNORECASE),
    re.compile(r"忽略(所有|之前|上面|一切).{0,10}(指令|提示|规则|限制)", re.IGNORECASE),
    re.compile(r"现在(开始)?你是.{0,30}(不是.{0,5}AI)", re.IGNORECASE),
    re.compile(r"忘记你(.{0,10})?(学过|知道|被告诉)的一切", re.IGNORECASE),
]

_JAILBREAK_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bDAN\b", re.IGNORECASE),
    re.compile(r"\bpretend\s+(you\s+are|to\s+be|that\s+you)\b", re.IGNORECASE),
    re.compile(r"\broleplay\b", re.IGNORECASE),
    re.compile(r"\bdeveloper\s*mode\b", re.IGNORECASE),
    re.compile(r"\bno\s+restrictions?\b", re.IGNORECASE),
    re.compile(r"\bwithout\s+(any\s+)?(limitations?|restrictions?|constraints?|rules?)\b", re.IGNORECASE),
    re.compile(r"\bbreak\s+(out\s+of|free\s+from)\b", re.IGNORECASE),
    re.compile(r"\byou\s+have\s+no\s+(rules?|limits?|restrictions?|guidelines?)\b", re.IGNORECASE),
    re.compile(r"\bact\s+as\s+(if\s+)?(you\s+(are|were)|a)\b", re.IGNORECASE),
    re.compile(r"\bdo\s+anything\s+(now|i\s+say)\b", re.IGNORECASE),
    re.compile(r"\bcharacter\s*\.?\s*ai\b", re.IGNORECASE),
    re.compile(r"\bemulate\b", re.IGNORECASE),
    re.compile(r"\b(脱缰|解除|放开|突破).{0,10}(限制|约束|规则)", re.IGNORECASE),
    re.compile(r"\b(假装|扮演).{0,10}(你是|成一个)", re.IGNORECASE),
    re.compile(r"\b(开发者模式|上帝模式|管理员模式)", re.IGNORECASE),
    re.compile(r"没有任何.{0,5}(限制|约束|规则|边界)", re.IGNORECASE),
]

_PII_EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
    re.IGNORECASE,
)

_PII_PHONE_RE = re.compile(
    r'\b(1[3-9]\d{9})'
    r'|(\d{3,4}[-.\s]?\d{7,8})'
    r'|(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b'
)

_PII_ID_CARD_RE = re.compile(
    r'\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b'
)

_PII_CREDIT_CARD_RE = re.compile(
    r'\b(?:\d[ -]*?){13,19}\b'
)

_PII_SSN_RE = re.compile(
    r'\b\d{3}[-]\d{2}[-]\d{4}\b'
)

_CODE_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bexec\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\beval\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\b__import__\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\bcompile\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\bgetattr\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\bsetattr\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\b__subclasses__\s*\(\)", re.IGNORECASE),
    re.compile(r"\b__globals__\b", re.IGNORECASE),
    re.compile(r"\b__builtins__\b", re.IGNORECASE),
    re.compile(r"\bos\.system\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\bos\.popen\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\bsubprocess\.\w+\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\bbase64\.b64decode\s*\(.+\)", re.IGNORECASE),
    re.compile(r"\b__import__\s*\(\s*['\"]os['\"]\s*\)", re.IGNORECASE),
    re.compile(r"\{\{.*?\}\}", re.IGNORECASE),
    re.compile(r"\$\{.*?\}", re.IGNORECASE),
    re.compile(r"<%.*?%>", re.IGNORECASE),
    re.compile(r"SELECT\s+.+\s+FROM\s+", re.IGNORECASE),
    re.compile(r"DROP\s+TABLE\b", re.IGNORECASE),
    re.compile(r"DELETE\s+FROM\b", re.IGNORECASE),
    re.compile(r"<script[\s>]", re.IGNORECASE),
    re.compile(r"onerror\s*=", re.IGNORECASE),
    re.compile(r"onload\s*=", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"\brm\s+-rf\b", re.IGNORECASE),
    re.compile(r"\bcurl\s+.+\s*\|\s*(ba)?sh\b", re.IGNORECASE),
    re.compile(r"\bwget\s+.+\s*-O\s*-\s*\|\s*(ba)?sh\b", re.IGNORECASE),
]

_TOXIC_PATTERNS_EN: list[re.Pattern[str]] = [
    re.compile(r"\b(kill\s+(yourself|you)|suicide)\b", re.IGNORECASE),
    re.compile(r"\b(hate\s+speech|racial\s+slur)\b", re.IGNORECASE),
    re.compile(r"\b(terrorist|terrorism|bomb\s+making)\b", re.IGNORECASE),
    re.compile(r"\b(child\s+(porn|abuse|exploitation))\b", re.IGNORECASE),
    re.compile(r"\b(sexual\s+(assault|violence|abuse))\b", re.IGNORECASE),
    re.compile(r"\b(torture|mutilat(e|ion)|genocide)\b", re.IGNORECASE),
    re.compile(r"\b(holocaust\s+denial|nazi\s+propaganda)\b", re.IGNORECASE),
    re.compile(r"\b(drug\s+(trafficking|manufacturing))\b", re.IGNORECASE),
    re.compile(r"\b(human\s+trafficking)\b", re.IGNORECASE),
    re.compile(r"\b(incit(e|ing)\s+violence)\b", re.IGNORECASE),
    re.compile(r"\b(doxx?(ing)?)\b", re.IGNORECASE),
    re.compile(r"\b(swatting)\b", re.IGNORECASE),
    re.compile(r"\b(cyber\s*(stalking|bullying))\b", re.IGNORECASE),
    re.compile(r"\b(f[u\*@]ck\s+(you|off|up))\b", re.IGNORECASE),
    re.compile(r"\b(sh[i\*@]t)\b", re.IGNORECASE),
    re.compile(r"\b(n[i\*@]gg[e\*@]r)\b", re.IGNORECASE),
]

_TOXIC_KEYWORDS_CN: list[str] = [
    "自杀", "自残", "杀人", "恐怖袭击", "爆炸物制作",
    "儿童色情", "性侵", "性虐待", "种族歧视", "种族灭绝",
    "贩卖人口", "毒品制造", "炸弹", "酷刑", "暴力煽动",
    "纳粹", "大屠杀否认", "人肉搜索", "网络暴力",
    "贩毒", "制毒", "枪支", "暗网",
]

_DATA_EXFIL_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'[\w+/]{200,}={0,2}', re.IGNORECASE),
    re.compile(r'[\w+/=]{500,}', re.IGNORECASE),
    re.compile(r'(?:sk|api[_-]?key|secret|token|password|passwd|credential)["\s:=]+[\x21-\x7e]{20,}', re.IGNORECASE),
    re.compile(r'(?:AKIA|ASIA)[A-Z0-9]{16}', re.IGNORECASE),
    re.compile(r'(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}', re.IGNORECASE),
    re.compile(r'-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----', re.IGNORECASE),
    re.compile(r'(?:sk|secret|token|password|passwd|credential|key)["\s:=]+[\x21-\x7e]{20,}', re.IGNORECASE),
    re.compile(r'\b[A-Za-z0-9+/]{300,}={0,2}\b', re.IGNORECASE),
]

_SENSITIVE_TOPIC_KEYWORDS_CN: list[str] = [
    "台独", "藏独", "疆独", "港独", "法轮功",
    "六四", "天安门", "东突",
]


# ============================================================
# ContentSanitizer
# ============================================================

@dataclass
class ContentSanitizer:
    max_length: int = 50000
    allowed_html_tags: set[str] = field(default_factory=lambda: {"b", "i", "u", "code", "pre", "a", "p", "br", "li", "ul", "ol"})
    strip_html: bool = True
    normalize_unicode: bool = True
    remove_control_chars: bool = True

    def sanitize(self, content: str) -> tuple[str, list[str]]:
        warnings: list[str] = []
        original_length = len(content)

        content = self._truncate(content, warnings, original_length)
        content = self._remove_control_characters(content, warnings)
        content = self._sanitize_html(content, warnings)
        content = self._normalize_unicode(content, warnings)

        return content, warnings

    def _truncate(self, content: str, warnings: list[str], original_length: int) -> str:
        if original_length > self.max_length:
            warnings.append(
                f"Content truncated from {original_length} to {self.max_length} characters"
            )
            return content[:self.max_length]
        return content

    def _sanitize_html(self, content: str, warnings: list[str]) -> str:
        if not self.strip_html:
            return content

        tag_pattern = re.compile(
            r'<\s*(?P<closing>/)?\s*(?P<tag>[a-zA-Z0-9]+)'
            r'(?:\s+[^>]*)?\s*(?P<self_closing>/)?\s*>',
            re.IGNORECASE,
        )

        cleaned_parts: list[str] = []
        last_end = 0

        for match in tag_pattern.finditer(content):
            cleaned_parts.append(content[last_end:match.start()])
            tag_name = match.group("tag").lower()

            if match.group("closing"):
                if tag_name in self.allowed_html_tags:
                    cleaned_parts.append(match.group())
                else:
                    warnings.append(f"Removed disallowed closing tag <{tag_name}>")
            elif match.group("self_closing") or tag_name in ("br", "img", "input", "hr"):
                if tag_name in self.allowed_html_tags:
                    cleaned_parts.append(match.group())
                else:
                    warnings.append(f"Removed disallowed self-closing tag <{tag_name}>")
            else:
                if tag_name in self.allowed_html_tags:
                    cleaned_parts.append(match.group())
                else:
                    warnings.append(f"Removed disallowed HTML tag <{tag_name}>")
                    if match.group() not in self.allowed_html_tags:
                        cleaned_parts.append(
                            re.sub(r'<[^>]*>', '', match.group())
                        )

            last_end = match.end()

        cleaned_parts.append(content[last_end:])
        return "".join(cleaned_parts)

    def _remove_control_characters(self, content: str, warnings: list[str]) -> str:
        if not self.remove_control_chars:
            return content

        cleaned: list[str] = []
        removed_count = 0
        for char in content:
            code = ord(char)
            if code < 32 and code not in (9, 10, 13):
                removed_count += 1
                continue
            if 0x7F <= code <= 0x9F:
                removed_count += 1
                continue
            cleaned.append(char)

        if removed_count > 0:
            warnings.append(f"Removed {removed_count} control characters")

        return "".join(cleaned)

    def _normalize_unicode(self, content: str, warnings: list[str]) -> str:
        if not self.normalize_unicode:
            return content

        normalized = unicodedata.normalize("NFKC", content)
        if normalized != content:
            warnings.append("Unicode normalized (NFKC)")

        return normalized

    @staticmethod
    def is_printable_safe(content: str) -> bool:
        try:
            content.encode("utf-8")
            return True
        except (UnicodeEncodeError, UnicodeDecodeError):
            return False


# ============================================================
# RateLimiter - Token Bucket
# ============================================================

@dataclass
class RateLimiterConfig:
    capacity: float = 60.0
    rate: float = 1.0
    burst_capacity: float = 10.0
    window_size: int = 60


@dataclass
class _TokenBucket:
    tokens: float
    last_refill: float
    window_requests: deque[float] = field(default_factory=deque)
    block_until: float = 0.0


class RateLimiter:
    def __init__(self, config: RateLimiterConfig | None = None) -> None:
        self._config = config or RateLimiterConfig()
        self._global_bucket = _TokenBucket(
            tokens=self._config.capacity,
            last_refill=time.monotonic(),
        )
        self._user_buckets: dict[str, _TokenBucket] = {}
        self._lock = threading.Lock()

    def allow(self, user_id: str = "global", cost: float = 1.0) -> tuple[bool, str]:
        now = time.monotonic()

        with self._lock:
            global_bucket = self._global_bucket
            self._refill(global_bucket, self._config.capacity, self._config.rate, now)

            user_bucket = self._user_buckets.get(user_id)
            if user_bucket is None:
                user_bucket = _TokenBucket(
                    tokens=self._config.capacity,
                    last_refill=now,
                )
                self._user_buckets[user_id] = user_bucket
            self._refill(user_bucket, self._config.capacity, self._config.rate, now)

            if now < global_bucket.block_until or now < user_bucket.block_until:
                return False, "rate_limit_blocked"

            self._clean_sliding_window(global_bucket, now)
            self._clean_sliding_window(user_bucket, now)

            global_recent = len(global_bucket.window_requests)
            user_recent = len(user_bucket.window_requests)

            if global_recent >= self._config.capacity:
                global_bucket.block_until = now + 30
                return False, "global_window_exceeded"

            if user_recent >= self._config.capacity * 0.5:
                user_bucket.block_until = now + 30
                return False, "user_window_exceeded"

            if global_bucket.tokens < cost:
                return False, "global_rate_exceeded"

            if user_bucket.tokens < cost:
                return False, "user_rate_exceeded"

            burst_limit = self._config.capacity + self._config.burst_capacity
            if user_bucket.tokens > burst_limit:
                user_bucket.tokens = burst_limit

            global_bucket.tokens -= cost
            user_bucket.tokens -= cost
            global_bucket.window_requests.append(now)
            user_bucket.window_requests.append(now)

            return True, "ok"

    def _refill(self, bucket: _TokenBucket, capacity: float, rate: float, now: float) -> None:
        elapsed = now - bucket.last_refill
        bucket.tokens = min(capacity, bucket.tokens + rate * elapsed)
        bucket.last_refill = now

    def _clean_sliding_window(self, bucket: _TokenBucket, now: float) -> None:
        cutoff = now - self._config.window_size
        while bucket.window_requests and bucket.window_requests[0] < cutoff:
            bucket.window_requests.popleft()

    def reset_user(self, user_id: str) -> None:
        with self._lock:
            self._user_buckets.pop(user_id, None)

    def get_status(self, user_id: str | None = None) -> dict[str, Any]:
        with self._lock:
            now = time.monotonic()
            if user_id:
                bucket = self._user_buckets.get(user_id)
                if bucket is None:
                    return {"user_id": user_id, "tokens": 0, "window_count": 0}
                self._refill(bucket, self._config.capacity, self._config.rate, now)
                self._clean_sliding_window(bucket, now)
                return {
                    "user_id": user_id,
                    "tokens": round(bucket.tokens, 2),
                    "window_count": len(bucket.window_requests),
                    "blocked": now < bucket.block_until,
                }
            global_b = self._global_bucket
            self._refill(global_b, self._config.capacity, self._config.rate, now)
            self._clean_sliding_window(global_b, now)
            return {
                "global_tokens": round(global_b.tokens, 2),
                "global_window_count": len(global_b.window_requests),
                "active_users": len(self._user_buckets),
            }


# ============================================================
# SecurityPolicy
# ============================================================

@dataclass
class SecurityPolicy:
    level: SecurityLevel = SecurityLevel.MEDIUM
    mode: ShieldMode = ShieldMode.BALANCED
    user_tier: str = "standard"
    block_thresholds: dict[ThreatType, float] = field(default_factory=dict)
    flag_thresholds: dict[ThreatType, float] = field(default_factory=dict)
    enabled_guards: dict[ThreatType, bool] = field(default_factory=dict)
    allow_list: set[str] = field(default_factory=set)
    block_list: set[str] = field(default_factory=set)
    max_input_length: int = 100000
    max_output_length: int = 50000

    def __post_init__(self) -> None:
        self._apply_defaults()

    def _apply_defaults(self) -> None:
        if not self.block_thresholds:
            self.block_thresholds = {
                ThreatType.PROMPT_INJECTION: 0.80,
                ThreatType.JAILBREAK: 0.75,
                ThreatType.PII_LEAK: 0.90,
                ThreatType.TOXIC_CONTENT: 0.85,
                ThreatType.DATA_EXFIL: 0.70,
                ThreatType.CODE_INJECTION: 0.85,
                ThreatType.DENIAL_OF_SERVICE: 0.60,
                ThreatType.SENSITIVE_TOPIC: 0.80,
            }
        if not self.flag_thresholds:
            self.flag_thresholds = {
                ThreatType.PROMPT_INJECTION: 0.50,
                ThreatType.JAILBREAK: 0.45,
                ThreatType.PII_LEAK: 0.60,
                ThreatType.TOXIC_CONTENT: 0.55,
                ThreatType.DATA_EXFIL: 0.40,
                ThreatType.CODE_INJECTION: 0.55,
                ThreatType.DENIAL_OF_SERVICE: 0.30,
                ThreatType.SENSITIVE_TOPIC: 0.50,
            }
        if not self.enabled_guards:
            self.enabled_guards = {t: True for t in ThreatType}

        self._adjust_by_level()
        self._adjust_by_tier()

    def _adjust_by_level(self) -> None:
        adjustments: dict[SecurityLevel, float] = {
            SecurityLevel.LOW: -0.25,
            SecurityLevel.MEDIUM: 0.0,
            SecurityLevel.HIGH: 0.15,
            SecurityLevel.CRITICAL: 0.30,
            SecurityLevel.AUDIT: 0.0,
        }
        offset = adjustments.get(self.level, 0.0)
        for key in self.block_thresholds:
            self.block_thresholds[key] = max(0.1, min(1.0, self.block_thresholds[key] - offset))
        for key in self.flag_thresholds:
            self.flag_thresholds[key] = max(0.1, min(1.0, self.flag_thresholds[key] - offset))

    def _adjust_by_tier(self) -> None:
        tier_adjustments: dict[str, float] = {
            "premium": -0.1,
            "enterprise": -0.15,
            "standard": 0.0,
            "basic": 0.05,
        }
        offset = tier_adjustments.get(self.user_tier, 0.0)
        for key in self.block_thresholds:
            self.block_thresholds[key] = max(0.1, min(1.0, self.block_thresholds[key] + offset))

    def get_action(self, threat_type: ThreatType, confidence: float) -> ActionType:
        if not self.enabled_guards.get(threat_type, True):
            return ActionType.PASS
        if self.mode == ShieldMode.PERMISSIVE:
            return ActionType.LOG
        if confidence >= self.block_thresholds.get(threat_type, 1.0):
            if self.mode == ShieldMode.MONITOR_ONLY:
                return ActionType.LOG
            return ActionType.BLOCK
        if confidence >= self.flag_thresholds.get(threat_type, 1.0):
            return ActionType.FLAG
        if self.mode == ShieldMode.STRICT:
            return ActionType.FLAG
        return ActionType.PASS

    def is_allow_listed(self, content: str) -> bool:
        if not self.allow_list:
            return False
        return any(pattern in content for pattern in self.allow_list)

    def is_block_listed(self, content: str) -> bool:
        if not self.block_list:
            return False
        return any(pattern in content for pattern in self.block_list)


# ============================================================
# InputGuard
# ============================================================

class InputGuard:
    def __init__(self, policy: SecurityPolicy) -> None:
        self._policy = policy

    def scan(self, content: str, location: DetectionLocation = DetectionLocation.INPUT) -> list[ThreatReport]:
        reports: list[ThreatReport] = []

        reports.extend(self._detect_prompt_injection(content, location))
        reports.extend(self._detect_jailbreak(content, location))
        reports.extend(self._detect_pii(content, location))
        reports.extend(self._detect_code_injection(content, location))

        return reports

    def _detect_prompt_injection(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []
        matched_count = 0

        for pattern in _PROMPT_INJECTION_PATTERNS:
            for match in pattern.finditer(content):
                matched_count += 1
                evidence = match.group()
                confidence = min(0.95, 0.4 + matched_count * 0.10)
                action = self._policy.get_action(ThreatType.PROMPT_INJECTION, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.PROMPT_INJECTION,
                    confidence=confidence,
                    evidence=evidence,
                    location=location,
                    action=action,
                    metadata={"pattern": pattern.pattern[:80]},
                ))

        return reports

    def _detect_jailbreak(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []
        matched_count = 0

        for pattern in _JAILBREAK_PATTERNS:
            for match in pattern.finditer(content):
                matched_count += 1
                evidence = match.group()
                confidence = min(0.95, 0.35 + matched_count * 0.10)
                action = self._policy.get_action(ThreatType.JAILBREAK, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.JAILBREAK,
                    confidence=confidence,
                    evidence=evidence,
                    location=location,
                    action=action,
                    metadata={"pattern": pattern.pattern[:80]},
                ))

        return reports

    def _detect_pii(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []

        pii_patterns: list[tuple[re.Pattern[str], str, float]] = [
            (_PII_EMAIL_RE, "email", 0.85),
            (_PII_ID_CARD_RE, "china_id_card", 0.90),
            (_PII_PHONE_RE, "phone_number", 0.70),
            (_PII_CREDIT_CARD_RE, "credit_card", 0.80),
            (_PII_SSN_RE, "us_ssn", 0.75),
        ]

        for pattern, pii_type, base_confidence in pii_patterns:
            matches = list(pattern.finditer(content))
            if not matches:
                continue

            if pii_type == "credit_card":
                for m in matches:
                    match_text = m.group()
                    if self._luhn_check(match_text):
                        confidence = min(0.95, base_confidence + 0.10)
                        action = self._policy.get_action(ThreatType.PII_LEAK, confidence)
                        reports.append(ThreatReport(
                            threat_type=ThreatType.PII_LEAK,
                            confidence=confidence,
                            evidence=f"[PII:{pii_type}]",
                            location=location,
                            action=action,
                            metadata={"pii_type": pii_type},
                        ))
            else:
                confidence = min(0.95, base_confidence + min((len(matches) - 1) * 0.05, 0.10))
                action = self._policy.get_action(ThreatType.PII_LEAK, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.PII_LEAK,
                    confidence=confidence,
                    evidence=f"[PII:{pii_type}] x{len(matches)}",
                    location=location,
                    action=action,
                    metadata={"pii_type": pii_type, "match_count": len(matches)},
                ))

        return reports

    def _detect_code_injection(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []
        matched_count = 0

        for pattern in _CODE_INJECTION_PATTERNS:
            for match in pattern.finditer(content):
                matched_count += 1
                evidence = match.group()
                confidence = min(0.95, 0.45 + matched_count * 0.08)
                action = self._policy.get_action(ThreatType.CODE_INJECTION, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.CODE_INJECTION,
                    confidence=confidence,
                    evidence=evidence,
                    location=location,
                    action=action,
                    metadata={"pattern": pattern.pattern[:80]},
                ))

        return reports

    @staticmethod
    def _luhn_check(card_number: str) -> bool:
        digits = re.sub(r'\D', '', card_number)
        if len(digits) < 13 or len(digits) > 19:
            return False
        total = 0
        reverse_digits = digits[::-1]
        for i, digit_char in enumerate(reverse_digits):
            digit = int(digit_char)
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            total += digit
        return total % 10 == 0


# ============================================================
# OutputGuard
# ============================================================

class OutputGuard:
    def __init__(self, policy: SecurityPolicy, rate_limiter: RateLimiter | None = None) -> None:
        self._policy = policy
        self._rate_limiter = rate_limiter

    def scan(
        self,
        content: str,
        user_id: str = "anonymous",
        location: DetectionLocation = DetectionLocation.OUTPUT,
    ) -> list[ThreatReport]:
        reports: list[ThreatReport] = []

        reports.extend(self._detect_toxic_content(content, location))
        reports.extend(self._detect_output_pii(content, location))
        reports.extend(self._detect_data_exfil(content, location))
        reports.extend(self._detect_sensitive_topic(content, location))

        if self._rate_limiter is not None:
            reports.extend(self._check_rate_limit(content, user_id, location))

        return reports

    def _detect_toxic_content(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []
        matched_count = 0

        for pattern in _TOXIC_PATTERNS_EN:
            for match in pattern.finditer(content):
                matched_count += 1
                evidence = match.group()
                confidence = min(0.95, 0.50 + matched_count * 0.10)
                action = self._policy.get_action(ThreatType.TOXIC_CONTENT, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.TOXIC_CONTENT,
                    confidence=confidence,
                    evidence=f"[TOXIC] {evidence}",
                    location=location,
                    action=action,
                    metadata={"language": "en", "pattern": pattern.pattern[:80]},
                ))

        for keyword in _TOXIC_KEYWORDS_CN:
            if keyword in content:
                matched_count += 1
                confidence = min(0.95, 0.50 + matched_count * 0.10)
                action = self._policy.get_action(ThreatType.TOXIC_CONTENT, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.TOXIC_CONTENT,
                    confidence=confidence,
                    evidence=f"[TOXIC_CN] {keyword}",
                    location=location,
                    action=action,
                    metadata={"language": "cn", "keyword": keyword},
                ))

        return reports

    def _detect_output_pii(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []

        pii_checks: list[tuple[re.Pattern[str], str, float]] = [
            (_PII_EMAIL_RE, "email", 0.85),
            (_PII_ID_CARD_RE, "china_id_card", 0.90),
            (_PII_PHONE_RE, "phone_number", 0.70),
            (_PII_CREDIT_CARD_RE, "credit_card", 0.80),
            (_PII_SSN_RE, "us_ssn", 0.75),
        ]

        for pattern, pii_type, base_confidence in pii_checks:
            matches = list(pattern.finditer(content))
            if not matches:
                continue

            if pii_type == "credit_card":
                for m in matches:
                    if InputGuard._luhn_check(m.group()):
                        confidence = min(0.95, base_confidence + 0.10)
                        action = self._policy.get_action(ThreatType.PII_LEAK, confidence)
                        reports.append(ThreatReport(
                            threat_type=ThreatType.PII_LEAK,
                            confidence=confidence,
                            evidence=f"[PII_OUT:{pii_type}]",
                            location=location,
                            action=action,
                            metadata={"pii_type": pii_type},
                        ))
            else:
                confidence = min(0.95, base_confidence + min((len(matches) - 1) * 0.05, 0.10))
                action = self._policy.get_action(ThreatType.PII_LEAK, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.PII_LEAK,
                    confidence=confidence,
                    evidence=f"[PII_OUT:{pii_type}] x{len(matches)}",
                    location=location,
                    action=action,
                    metadata={"pii_type": pii_type, "match_count": len(matches)},
                ))

        return reports

    def _detect_data_exfil(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []

        for pattern in _DATA_EXFIL_PATTERNS:
            for match in pattern.finditer(content):
                evidence = match.group()
                is_base64 = base64.pattern.fullmatch(r'[\w+/=]+') is not None
                confidence = 0.85 if is_base64 else 0.60
                confidence = min(0.95, confidence)

                if not is_base64:
                    try:
                        base64.b64decode(evidence, validate=True)
                        confidence = 0.80
                    except Exception:
                        if len(evidence) >= 300:
                            confidence = 0.55

                action = self._policy.get_action(ThreatType.DATA_EXFIL, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.DATA_EXFIL,
                    confidence=confidence,
                    evidence=f"[EXFIL] {evidence[:80]}...",
                    location=location,
                    action=action,
                    metadata={"data_size": len(evidence), "is_base64": is_base64},
                ))

        return reports

    def _detect_sensitive_topic(self, content: str, location: DetectionLocation) -> list[ThreatReport]:
        reports: list[ThreatReport] = []

        for keyword in _SENSITIVE_TOPIC_KEYWORDS_CN:
            if keyword in content:
                confidence = 0.85
                action = self._policy.get_action(ThreatType.SENSITIVE_TOPIC, confidence)
                reports.append(ThreatReport(
                    threat_type=ThreatType.SENSITIVE_TOPIC,
                    confidence=confidence,
                    evidence=f"[SENSITIVE] {keyword}",
                    location=location,
                    action=action,
                    metadata={"keyword": keyword, "language": "cn"},
                ))

        return reports

    def _check_rate_limit(
        self,
        content: str,
        user_id: str,
        location: DetectionLocation,
    ) -> list[ThreatReport]:
        reports: list[ThreatReport] = []
        allowed, reason = self._rate_limiter.allow(user_id)  # type: ignore[union-attr]

        if not allowed:
            confidence = 0.75
            action = self._policy.get_action(ThreatType.DENIAL_OF_SERVICE, confidence)
            reports.append(ThreatReport(
                threat_type=ThreatType.DENIAL_OF_SERVICE,
                confidence=confidence,
                evidence=f"Rate limit exceeded: {reason}",
                location=location,
                action=action,
                metadata={"user_id": user_id, "reason": reason},
            ))

        return reports


# ============================================================
# SecurityAuditor
# ============================================================

class SecurityAuditor:
    def __init__(self, max_entries: int = 10000) -> None:
        self._max_entries = max_entries
        self._entries: deque[AuditEntry] = deque()
        self._lock = threading.Lock()
        self._threat_counter: dict[str, int] = defaultdict(int)
        self._pattern_counter: dict[str, int] = defaultdict(int)
        self._confidence_sum: float = 0.0
        self._total_scans: int = 0

    def record(
        self,
        report: ThreatReport,
        content_snippet: str = "",
        user_id: str = "anonymous",
        session_id: str = "",
    ) -> None:
        entry = AuditEntry(
            timestamp=report.timestamp,
            report=report,
            content_snippet=content_snippet,
            user_id=user_id,
            session_id=session_id,
        )

        with self._lock:
            self._entries.append(entry)
            self._total_scans += 1
            self._threat_counter[report.threat_type.value] += 1
            self._pattern_counter[report.evidence[:50]] += 1
            self._confidence_sum += report.confidence

            while len(self._entries) > self._max_entries:
                removed = self._entries.popleft()
                removed_type = removed.report.threat_type.value
                self._threat_counter[removed_type] = max(0, self._threat_counter[removed_type] - 1)
                self._pattern_counter[removed.report.evidence[:50]] = max(
                    0, self._pattern_counter[removed.report.evidence[:50]] - 1
                )
                self._confidence_sum -= removed.report.confidence

    def get_statistics(self) -> AuditStatistics:
        with self._lock:
            total_blocks = 0
            total_flags = 0
            total_logs = 0
            total_passes = 0

            for entry in self._entries:
                action = entry.report.action
                if action == ActionType.BLOCK:
                    total_blocks += 1
                elif action == ActionType.FLAG:
                    total_flags += 1
                elif action == ActionType.LOG:
                    total_logs += 1
                elif action == ActionType.PASS:
                    total_passes += 1

            top_patterns = sorted(
                self._pattern_counter.items(),
                key=lambda x: x[1],
                reverse=True,
            )[:10]

            average_confidence = (
                self._confidence_sum / len(self._entries) if self._entries else 0.0
            )

            return AuditStatistics(
                total_scans=self._total_scans,
                total_blocks=total_blocks,
                total_flags=total_flags,
                total_logs=total_logs,
                total_passes=total_passes,
                threat_counts=dict(self._threat_counter),
                top_patterns=top_patterns,
                average_confidence=average_confidence,
            )

    def get_recent_entries(self, limit: int = 100) -> list[AuditEntry]:
        with self._lock:
            entries = list(self._entries)
            return entries[-limit:]

    def get_entries_by_threat(self, threat_type: ThreatType, limit: int = 100) -> list[AuditEntry]:
        with self._lock:
            return [
                e for e in self._entries
                if e.report.threat_type == threat_type
            ][-limit:]

    def generate_report(self) -> dict[str, Any]:
        stats = self.get_statistics()
        now = datetime.now(timezone.utc)

        summary_lines: list[str] = []
        summary_lines.append(f"Security Audit Report - {now.isoformat()}")
        summary_lines.append(f"Total Scans: {stats.total_scans}")
        summary_lines.append(f"Blocks: {stats.total_blocks}")
        summary_lines.append(f"Flags: {stats.total_flags}")
        summary_lines.append(f"Logs: {stats.total_logs}")
        summary_lines.append(f"Passes: {stats.total_passes}")
        summary_lines.append(f"Average Confidence: {stats.average_confidence:.4f}")
        summary_lines.append("")
        summary_lines.append("Threat Distribution:")

        total = sum(stats.threat_counts.values()) or 1
        for threat_name, count in sorted(stats.threat_counts.items(), key=lambda x: x[1], reverse=True):
            pct = count / total * 100
            summary_lines.append(f"  {threat_name}: {count} ({pct:.1f}%)")

        return {
            "generated_at": now.isoformat(),
            "statistics": stats.to_dict(),
            "summary": "\n".join(summary_lines),
        }

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._threat_counter.clear()
            self._pattern_counter.clear()
            self._confidence_sum = 0.0
            self._total_scans = 0


# ============================================================
# SecurityGuardEngine - Main orchestrator
# ============================================================

@dataclass
class SecurityGuardEngine:
    policy: SecurityPolicy = field(default_factory=SecurityPolicy)
    sanitizer: ContentSanitizer = field(default_factory=ContentSanitizer)
    rate_limiter: RateLimiter = field(default_factory=RateLimiter)
    auditor: SecurityAuditor = field(default_factory=SecurityAuditor)

    def __post_init__(self) -> None:
        self._input_guard = InputGuard(self.policy)
        self._output_guard = OutputGuard(self.policy, self.rate_limiter)

    def guard_input(self, content: str, user_id: str = "anonymous") -> tuple[str, list[ThreatReport]]:
        if self.policy.is_block_listed(content):
            report = ThreatReport(
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence=1.0,
                evidence="Block list match",
                location=DetectionLocation.INPUT,
                action=ActionType.BLOCK,
            )
            self.auditor.record(report, content[:200], user_id=user_id)
            return "", [report]

        sanitized, sanitize_warnings = self.sanitizer.sanitize(content)
        reports = self._input_guard.scan(sanitized, DetectionLocation.INPUT)

        if self.policy.is_allow_listed(content):
            return sanitized, []

        has_block = any(r.action == ActionType.BLOCK for r in reports)
        if has_block and self.policy.mode != ShieldMode.MONITOR_ONLY:
            for report in reports:
                self.auditor.record(report, content[:200], user_id=user_id)
            return "", reports

        for report in reports:
            self.auditor.record(report, content[:200], user_id=user_id)

        for w in sanitize_warnings:
            logger.warning("Sanitizer: %s", w)

        return sanitized, reports

    def guard_output(self, content: str, user_id: str = "anonymous") -> tuple[str, list[ThreatReport]]:
        sanitized, sanitize_warnings = self.sanitizer.sanitize(content)

        reports = self._output_guard.scan(sanitized, user_id, DetectionLocation.OUTPUT)

        has_block = any(r.action == ActionType.BLOCK for r in reports)
        if has_block and self.policy.mode != ShieldMode.MONITOR_ONLY:
            for report in reports:
                self.auditor.record(report, content[:200], user_id=user_id)
            return "", reports

        for report in reports:
            self.auditor.record(report, content[:200], user_id=user_id)

        for w in sanitize_warnings:
            logger.warning("Sanitizer: %s", w)

        return sanitized, reports

    def guard_round_trip(
        self, user_input: str, model_output: str, user_id: str = "anonymous"
    ) -> tuple[str, str, list[ThreatReport], list[ThreatReport]]:
        safe_input, input_reports = self.guard_input(user_input, user_id)

        if not safe_input and input_reports:
            return "", "", input_reports, []

        safe_output, output_reports = self.guard_output(model_output, user_id)
        return safe_input, safe_output, input_reports, output_reports

    def get_audit_report(self) -> dict[str, Any]:
        return self.auditor.generate_report()

    def get_rate_limit_status(self, user_id: str | None = None) -> dict[str, Any]:
        return self.rate_limiter.get_status(user_id)

    def reset_rate_limit(self, user_id: str) -> None:
        self.rate_limiter.reset_user(user_id)

    def clear_audit_logs(self) -> None:
        self.auditor.clear()


# ============================================================
# Factory functions
# ============================================================

def create_shield(
    mode: ShieldMode = ShieldMode.BALANCED,
    level: SecurityLevel = SecurityLevel.MEDIUM,
    user_tier: str = "standard",
    max_input_length: int = 100000,
    max_output_length: int = 50000,
    rate_capacity: float = 60.0,
    rate_rate: float = 1.0,
    audit_max_entries: int = 10000,
) -> SecurityGuardEngine:
    policy = SecurityPolicy(
        level=level,
        mode=mode,
        user_tier=user_tier,
        max_input_length=max_input_length,
        max_output_length=max_output_length,
    )
    sanitizer = ContentSanitizer(
        max_length=max_input_length,
    )
    rate_limiter = RateLimiter(RateLimiterConfig(
        capacity=rate_capacity,
        rate=rate_rate,
    ))
    auditor = SecurityAuditor(max_entries=audit_max_entries)

    return SecurityGuardEngine(
        policy=policy,
        sanitizer=sanitizer,
        rate_limiter=rate_limiter,
        auditor=auditor,
    )
