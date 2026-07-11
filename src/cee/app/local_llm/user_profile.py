"""
认知涌现引擎 — 用户画像引擎
=============================
长期对话中逐步构建用户画像

维度:
1. 知识水平: 新手/中级/高级 (通过提问复杂度推断)
2. 兴趣领域: 编程/AI/设计/认知科学/工具...
3. 对话风格偏好: 简洁/详细, 技术向/生活向
4. 常用语境: 工作场景/学习场景/开发场景

输出: 在每次推理时注入画像上下文，个性化回复
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .knowledge_store import STORAGE_DIR

PROFILE_FILE = STORAGE_DIR / "user_profile.json"


class UserProfile:
    """
    用户画像引擎

    用法:
        up = UserProfile(session_id="user_abc")
        up.update_from_query("Python中怎么用装饰器实现缓存？")
        up.update_from_query("我是一个刚开始学编程的新手")
        ctx = up.get_context()  # -> "用户是编程新手, 关注Python..."
    """

    INTEREST_KEYWORDS = {
        "Python开发": ["python", "django", "fastapi", "flask", "pytorch", "numpy", "pandas",
                       "装饰器", "生成器", "异步", "类型"],
        "前端开发": ["vue", "react", "html", "css", "javascript", "typescript", "tailwind",
                      "组件", "页面", "UI", "前端", "响应式"],
        "后端开发": ["数据库", "API", "sql", "postgres", "mysql", "redis", "docker",
                      "部署", "服务器", "nginx", "微服务"],
        "AI/机器学习": ["深度学习", "大模型", "LLM", "推理", "训练", "agent", "transformer",
                        "神经网络", "embedding", "token", "prompt"],
        "认知科学": ["认知", "涌现", "思维", "意识", "哲学", "第一性", "逻辑", "推理",
                      "记忆", "学习"],
        "工具与效率": ["推荐", "替代", "免费", "开源", "插件", "快捷键",
                       "对比", "选择", "哪个好"],
        "设计创作": ["设计", "配色", "布局", "动画", "视频", "图片", "字体", "创意"],
    }

    LEVEL_INDICATORS = {
        "新手": ["新手", "入门", "初学", "刚开始", "不会", "不懂", "基础", "小白",
                 "从零", "零基础", "什么是", "怎么学", "学什么"],
        "中级": ["进阶", "优化", "最佳实践", "原理", "底层", "源码", "比较", "选哪个",
                 "区别", "优缺点", "经验"],
        "高级": ["架构", "设计模式", "性能", "分布式", "高并发", "编译", "内核",
                 "低级", "数学", "证明", "理论", "前沿"],
    }

    def __init__(self, session_id: str = "default"):
        self._session_id = session_id
        self._profile: dict[str, dict] = defaultdict(lambda: {"score": 0, "evidence": []})
        self._interests: Counter[str] = Counter()
        self._level_scores: dict[str, float] = {"新手": 0.0, "中级": 0.0, "高级": 0.0}
        self._query_count: int = 0
        self._style_prefs: dict[str, float] = {"简洁": 0.0, "详细": 0.0, "技术": 0.0, "生活": 0.0}
        self._load()

    def update_from_query(self, user_text: str):
        """从用户提问中更新画像"""
        self._query_count += 1
        tl = user_text.lower()

        # 兴趣分析
        for interest, keywords in self.INTEREST_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if kw.lower() in tl:
                    score += 1
            if score > 0:
                self._interests[interest] += score
                self._profile[interest]["score"] += score
                self._profile[interest]["evidence"].append(user_text[:60])
                if len(self._profile[interest]["evidence"]) > 10:
                    self._profile[interest]["evidence"] = self._profile[interest]["evidence"][-10:]

        # 水平分析
        for level, indicators in self.LEVEL_INDICATORS.items():
            for ind in indicators:
                if ind.lower() in tl:
                    self._level_scores[level] += 1

        # 风格偏好
        if len(user_text) > 80:
            self._style_prefs["详细"] += 1
        if len(user_text) < 15:
            self._style_prefs["简洁"] += 1
        if any(t in tl for t in ["代码", "实现", "api", "算法", "架构", "bug"]):
            self._style_prefs["技术"] += 1
        if any(t in tl for t in ["推荐", "建议", "看法", "观点"]):
            self._style_prefs["生活"] += 1

        if self._query_count % 10 == 0:
            self._save()

    def get_context(self) -> str:
        """生成用于注入推理的画像上下文"""
        parts = []

        # 兴趣领域
        top_interests = self._interests.most_common(3)
        if top_interests:
            interests_str = "、".join(f"{name}({cnt}次)" for name, cnt in top_interests)
            parts.append(f"用户关注领域: {interests_str}")

        # 知识水平
        if self._query_count >= 3:
            level = self._estimate_level()
            if level:
                parts.append(f"用户知识水平: {level}")

        # 风格偏好
        style = self._estimate_style()
        if style:
            parts.append(f"偏好风格: {style}")

        if not parts:
            return ""
        return "[用户画像]\n" + "\n".join(parts)

    def get_profile_dict(self) -> dict:
        """完整画像字典"""
        return {
            "query_count": self._query_count,
            "interests": dict(self._interests.most_common(10)),
            "level": {k: round(v, 2) for k, v in self._level_scores.items()},
            "style": {k: round(v, 2) for k, v in self._style_prefs.items()},
            "session_id": self._session_id,
        }

    def get_match_score(self, query: str) -> dict:
        """
        计算查询与画像的匹配度。
        用于判断是否需要在回复中引用画像信息。

        返回: {"matched": True/False, "interest": "Python开发", "level": "中级", ...}
        """
        result = {"matched": False}
        tl = query.lower()

        # 兴趣匹配
        for interest, keywords in self.INTEREST_KEYWORDS.items():
            if interest in self._interests and self._interests[interest] >= 2:
                for kw in keywords:
                    if kw.lower() in tl:
                        result["matched"] = True
                        result["interest"] = interest
                        break

        # 水平匹配
        level = self._estimate_level()
        if level and self._query_count >= 5:
            result["level"] = level
            result["matched"] = True

        return result

    # ── 内部 ────────────────────────────────────────────────

    def _estimate_level(self) -> str:
        total = sum(self._level_scores.values()) or 1
        if self._level_scores["高级"] / total > 0.3:
            return "高级"
        if self._level_scores["中级"] / total > 0.3:
            return "中级"
        if self._level_scores["新手"] / total > 0.3:
            return "新手"
        return ""

    def _estimate_style(self) -> str:
        if self._query_count < 5:
            return ""
        if self._style_prefs["技术"] > self._style_prefs["生活"]:
            return "技术向"
        if self._style_prefs["生活"] > self._style_prefs["技术"]:
            return "生活向"
        if self._style_prefs["详细"] > self._style_prefs["简洁"]:
            return "偏好详细解释"
        return "偏好简洁直接"

    def _load(self):
        if PROFILE_FILE.exists():
            try:
                with open(PROFILE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._interests = Counter(data.get("interests", {}))
                self._level_scores = data.get("level", {"新手": 0, "中级": 0, "高级": 0})
                self._query_count = data.get("query_count", 0)
                self._style_prefs = data.get("style", {"简洁": 0, "详细": 0, "技术": 0, "生活": 0})
            except Exception:
                pass

    def _save(self):
        try:
            data = self.get_profile_dict()
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            with open(PROFILE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def stats(self) -> dict:
        return self.get_profile_dict()

    def clear(self):
        self._profile.clear()
        self._interests.clear()
        self._level_scores = {"新手": 0.0, "中级": 0.0, "高级": 0.0}
        self._query_count = 0
        self._style_prefs = {"简洁": 0.0, "详细": 0.0, "技术": 0.0, "生活": 0.0}
        self._save()
