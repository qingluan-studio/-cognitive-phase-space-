"""提示词热插拔技能市场 — 动态加载 Agent 技能。

SkillPlugin 包含 system_prompt 片段和 tool_definitions，
PluginManager 加载后自动合并到 Agent，无需改代码即可切换角色。
"""

import copy
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


class SkillCategory(Enum):
    CODING = "coding"
    WRITING = "writing"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    SUPPORT = "support"
    LEGAL = "legal"
    MEDICAL = "medical"
    CUSTOM = "custom"


@dataclass
class ToolDefinition:
    """工具定义 — OpenAI function-call 兼容。"""

    name: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)
    handler: Optional[Callable] = None

    def to_openai_schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


@dataclass
class SkillManifest:
    """技能清单 — 单条技能的完整定义。"""

    name: str
    version: str = "1.0.0"
    description: str = ""
    category: SkillCategory = SkillCategory.CUSTOM
    author: str = ""
    prompt_fragment: str = ""
    tools: list[ToolDefinition] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    compatible_roles: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "category": self.category.value,
            "author": self.author,
            "tools": [t.name for t in self.tools],
            "tags": self.tags,
            "compatible_roles": self.compatible_roles,
            "dependencies": self.dependencies,
        }


class SkillRegistry:
    """技能注册中心 — 管理技能的加载/卸载/热插拔。

    使用方式:
        registry = SkillRegistry()
        registry.register(SkillManifest(name="客服", prompt_fragment="你是专业客服..."))
        registry.hot_swap("agent_1", "客服")  # 无需重启
    """

    def __init__(self) -> None:
        self._skills: dict[str, SkillManifest] = {}
        self._agent_skills: dict[str, list[str]] = {}
        self._loaded_order: list[str] = []
        self._lock = threading.RLock()

    @property
    def skill_count(self) -> int:
        with self._lock:
            return len(self._skills)

    def register(self, skill: SkillManifest) -> bool:
        with self._lock:
            if skill.name in self._skills:
                return False
            for dep in skill.dependencies:
                if dep not in self._skills:
                    return False
            self._skills[skill.name] = skill
            self._loaded_order.append(skill.name)
            return True

    def unregister(self, name: str) -> bool:
        with self._lock:
            if name not in self._skills:
                return False
            for other in self._skills.values():
                if name in other.dependencies:
                    return False
            del self._skills[name]
            self._loaded_order.remove(name)
            for agent_id in list(self._agent_skills):
                self._agent_skills[agent_id] = [
                    s for s in self._agent_skills[agent_id] if s != name
                ]
            return True

    def get(self, name: str) -> Optional[SkillManifest]:
        with self._lock:
            return self._skills.get(name)

    def list_by_category(self, category: SkillCategory) -> list[SkillManifest]:
        with self._lock:
            return [s for s in self._skills.values() if s.category == category]

    def list_by_tag(self, tag: str) -> list[SkillManifest]:
        with self._lock:
            return [s for s in self._skills.values() if tag in s.tags]

    def assign_to_agent(self, agent_id: str, skill_names: list[str]) -> int:
        with self._lock:
            assigned = []
            for name in skill_names:
                if name in self._skills:
                    assigned.append(name)
            self._agent_skills[agent_id] = assigned
            return len(assigned)

    def get_agent_skills(self, agent_id: str) -> list[SkillManifest]:
        with self._lock:
            names = self._agent_skills.get(agent_id, [])
            return [self._skills[n] for n in names if n in self._skills]

    def get_agent_prompt(self, agent_id: str) -> str:
        """合并 Agent 所有技能的系统提示词片段。"""
        skills = self.get_agent_skills(agent_id)
        prompt_parts = []
        for skill in skills:
            if skill.prompt_fragment:
                prompt_parts.append(f"[技能: {skill.name}] {skill.prompt_fragment}")
        return "\n\n".join(prompt_parts) if prompt_parts else ""

    def get_agent_tools(self, agent_id: str) -> list[ToolDefinition]:
        tools: list[ToolDefinition] = []
        for skill in self.get_agent_skills(agent_id):
            tools.extend(skill.tools)
        return tools

    def hot_swap(self, agent_id: str, skill_names: list[str]) -> int:
        """热插拔：无需重启即可切换 Agent 技能集。"""
        return self.assign_to_agent(agent_id, skill_names)

    def remove_agent(self, agent_id: str) -> None:
        with self._lock:
            self._agent_skills.pop(agent_id, None)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            by_category: dict[str, int] = {}
            for s in self._skills.values():
                c = s.category.value
                by_category[c] = by_category.get(c, 0) + 1
            total_tools = sum(len(s.tools) for s in self._skills.values())
            return {
                "total_skills": len(self._skills),
                "by_category": by_category,
                "total_tools": total_tools,
                "active_agents": len(self._agent_skills),
                "loaded_order": copy.copy(self._loaded_order),
            }

    def reset(self) -> None:
        with self._lock:
            self._skills.clear()
            self._agent_skills.clear()
            self._loaded_order.clear()
