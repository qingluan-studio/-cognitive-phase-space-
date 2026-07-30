"""
AI 造物引擎 — 创造而非融合

核心理念：
  不是融合(A+B+C)，而是创造一种全新的存在
  产出至少包含指定属性，可能涌现额外的、不可控的属性

用法：
    from ai_creator import Creator

    creator = Creator()
    result = creator.create(["不可伪造", "远程连接", "身份验证"])
    print(result["description"])
    print(creator.get_emergent_report(result))
"""

from .creator import Creator, SimulatedAI, RealAIBackend
from .properties import Creation, PropertyValidator, Property
from .config import PROPERTY_LIBRARY, AI_CONFIG

__version__ = "0.1.0"
__all__ = [
    "Creator",
    "SimulatedAI",
    "RealAIBackend",
    "Creation",
    "PropertyValidator",
    "Property",
    "PROPERTY_LIBRARY",
    "AI_CONFIG",
]
