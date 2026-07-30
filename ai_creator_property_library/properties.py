"""
属性系统：属性注册、验证、涌现属性检测
"""

from dataclasses import dataclass, field
from typing import List, Dict, Set


@dataclass
class Property:
    """单个属性"""
    name: str
    category: str = "custom"
    keywords: List[str] = field(default_factory=list)
    is_emergent: bool = False  # 是否为涌现属性（非指定）


@dataclass
class Creation:
    """AI 创造的产物"""
    name: str
    description: str
    mechanism: str
    core_properties: List[str] = field(default_factory=list)   # 指定的核心属性
    emergent_properties: List[str] = field(default_factory=list)  # 涌现的额外属性
    all_properties: List[str] = field(default_factory=list)       # 全部属性


class PropertyValidator:
    """属性验证器：检查造物是否满足指定属性"""

    def __init__(self, library: Dict[str, Dict] = None):
        self.library = library or {}

    def register_property(self, name: str, category: str = "custom",
                          keywords: List[str] = None):
        """注册自定义属性到库中"""
        self.library[name] = {
            "category": category,
            "keywords": keywords or [name],
        }

    def get_keywords(self, property_name: str) -> List[str]:
        """获取属性的验证关键词"""
        if property_name in self.library:
            return self.library[property_name].get("keywords", [property_name])
        # 自定义属性：用属性名本身作为关键词
        return [property_name]

    def validate_text(self, text: str, required_properties: List[str]) -> Dict:
        """
        验证文本中是否包含指定属性
        返回: {satisfied: [满足的], missing: [缺失的], emergent: [涌现的]}
        """
        satisfied = []
        missing = []

        text_lower = text.lower()

        for prop in required_properties:
            keywords = self.get_keywords(prop)
            found = any(kw.lower() in text_lower for kw in keywords)
            if found:
                satisfied.append(prop)
            else:
                missing.append(prop)

        return {
            "satisfied": satisfied,
            "missing": missing,
            "emergent": self._detect_emergent(text, required_properties),
        }

    def _detect_emergent(self, text: str, required: List[str]) -> List[str]:
        """
        检测涌现属性：文本中出现但不在指定列表中的库内属性
        """
        emergent = []
        text_lower = text.lower()
        required_lower = {r.lower() for r in required}

        for prop_name, prop_info in self.library.items():
            if prop_name.lower() in required_lower:
                continue
            keywords = prop_info.get("keywords", [])
            if any(kw.lower() in text_lower for kw in keywords):
                emergent.append(prop_name)

        return emergent

    def extract_properties_from_text(self, text: str) -> List[str]:
        """从文本中提取所有匹配的属性"""
        found = []
        text_lower = text.lower()

        for prop_name, prop_info in self.library.items():
            keywords = prop_info.get("keywords", [prop_name])
            if any(kw.lower() in text_lower for kw in keywords):
                found.append(prop_name)

        return found
