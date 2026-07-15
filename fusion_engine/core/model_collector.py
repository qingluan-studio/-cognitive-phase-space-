"""
模型响应收集器

负责并行收集多个模型的输出，构建响应多样性池。
支持模拟模式和真实API调用模式。
"""

from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Callable


class ModelCapability(Enum):
    """模型能力维度"""
    REASONING = auto()
    CODING = auto()
    MATH = auto()
    CREATIVITY = auto()
    FACTUAL = auto()
    CHINESE = auto()
    LONG_CONTEXT = auto()
    SPEED = auto()


@dataclass
class ModelResponse:
    """单个模型的响应"""
    model_name: str
    prompt: str
    output: str
    latency_ms: float
    token_count: int
    capabilities: list[ModelCapability] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass  
class ModelProfile:
    """模型画像（用于模拟模式）"""
    name: str
    capabilities: list[ModelCapability]
    # 各能力维度的质量分数 (0-1)
    quality_scores: dict[ModelCapability, float] = field(default_factory=dict)
    latency_mean_ms: float = 1000.0
    latency_std_ms: float = 200.0
    # 成本系数 (相对值)
    cost_factor: float = 1.0
    # 模拟输出模板（按任务类型）
    output_templates: dict[str, list[str]] = field(default_factory=dict)


class ModelCollector:
    """
    多模型响应收集器
    
    支持两种模式：
    1. 模拟模式：基于概率模型生成模拟响应（用于开发和测试）
    2. API模式：真实调用各模型API（生产环境）
    """
    
    def __init__(self, mode: str = "simulation"):
        self.mode = mode
        self.profiles: dict[str, ModelProfile] = self._init_profiles()
        self._api_keys: dict[str, str] = {}
        
    def _init_profiles(self) -> dict[str, ModelProfile]:
        """初始化13个模型的画像"""
        return {
            "TRAE-Auto": ModelProfile(
                name="TRAE-Auto",
                capabilities=[ModelCapability.REASONING, ModelCapability.SPEED],
                quality_scores={
                    ModelCapability.REASONING: 0.82,
                    ModelCapability.CODING: 0.80,
                    ModelCapability.MATH: 0.78,
                    ModelCapability.CREATIVITY: 0.75,
                    ModelCapability.FACTUAL: 0.80,
                    ModelCapability.CHINESE: 0.78,
                    ModelCapability.LONG_CONTEXT: 0.70,
                    ModelCapability.SPEED: 0.90,
                },
                latency_mean_ms=800,
                latency_std_ms=150,
            ),
            "Doubao-Seed-2.1-Pro": ModelProfile(
                name="Doubao-Seed-2.1-Pro",
                capabilities=[ModelCapability.REASONING, ModelCapability.FACTUAL, ModelCapability.CHINESE],
                quality_scores={
                    ModelCapability.REASONING: 0.83,
                    ModelCapability.CODING: 0.84,
                    ModelCapability.MATH: 0.82,
                    ModelCapability.CREATIVITY: 0.80,
                    ModelCapability.FACTUAL: 0.86,
                    ModelCapability.CHINESE: 0.88,
                    ModelCapability.LONG_CONTEXT: 0.85,
                    ModelCapability.SPEED: 0.75,
                },
                latency_mean_ms=1200,
                latency_std_ms=250,
            ),
            "Doubao-Seed-2.1-Turbo": ModelProfile(
                name="Doubao-Seed-2.1-Turbo",
                capabilities=[ModelCapability.SPEED, ModelCapability.FACTUAL],
                quality_scores={
                    ModelCapability.REASONING: 0.75,
                    ModelCapability.CODING: 0.78,
                    ModelCapability.MATH: 0.76,
                    ModelCapability.CREATIVITY: 0.72,
                    ModelCapability.FACTUAL: 0.80,
                    ModelCapability.CHINESE: 0.80,
                    ModelCapability.LONG_CONTEXT: 0.70,
                    ModelCapability.SPEED: 0.95,
                },
                latency_mean_ms=400,
                latency_std_ms=80,
            ),
            "Doubao-Seed-Code": ModelProfile(
                name="Doubao-Seed-Code",
                capabilities=[ModelCapability.CODING, ModelCapability.REASONING],
                quality_scores={
                    ModelCapability.REASONING: 0.80,
                    ModelCapability.CODING: 0.90,
                    ModelCapability.MATH: 0.82,
                    ModelCapability.CREATIVITY: 0.70,
                    ModelCapability.FACTUAL: 0.75,
                    ModelCapability.CHINESE: 0.72,
                    ModelCapability.LONG_CONTEXT: 0.75,
                    ModelCapability.SPEED: 0.78,
                },
                latency_mean_ms=1100,
                latency_std_ms=200,
            ),
            "MiniMax-M3": ModelProfile(
                name="MiniMax-M3",
                capabilities=[ModelCapability.CREATIVITY, ModelCapability.REASONING],
                quality_scores={
                    ModelCapability.REASONING: 0.80,
                    ModelCapability.CODING: 0.76,
                    ModelCapability.MATH: 0.75,
                    ModelCapability.CREATIVITY: 0.88,
                    ModelCapability.FACTUAL: 0.78,
                    ModelCapability.CHINESE: 0.82,
                    ModelCapability.LONG_CONTEXT: 0.80,
                    ModelCapability.SPEED: 0.72,
                },
                latency_mean_ms=1400,
                latency_std_ms=300,
            ),
            "GLM-5.2": ModelProfile(
                name="GLM-5.2",
                capabilities=[ModelCapability.CHINESE, ModelCapability.CREATIVITY, ModelCapability.FACTUAL],
                quality_scores={
                    ModelCapability.REASONING: 0.82,
                    ModelCapability.CODING: 0.82,
                    ModelCapability.MATH: 0.80,
                    ModelCapability.CREATIVITY: 0.90,
                    ModelCapability.FACTUAL: 0.86,
                    ModelCapability.CHINESE: 0.94,
                    ModelCapability.LONG_CONTEXT: 0.88,
                    ModelCapability.SPEED: 0.78,
                },
                latency_mean_ms=1300,
                latency_std_ms=250,
            ),
            "GLM-5.1": ModelProfile(
                name="GLM-5.1",
                capabilities=[ModelCapability.CHINESE, ModelCapability.FACTUAL],
                quality_scores={
                    ModelCapability.REASONING: 0.80,
                    ModelCapability.CODING: 0.80,
                    ModelCapability.MATH: 0.78,
                    ModelCapability.CREATIVITY: 0.86,
                    ModelCapability.FACTUAL: 0.84,
                    ModelCapability.CHINESE: 0.92,
                    ModelCapability.LONG_CONTEXT: 0.85,
                    ModelCapability.SPEED: 0.80,
                },
                latency_mean_ms=1100,
                latency_std_ms=200,
            ),
            "GLM-5": ModelProfile(
                name="GLM-5",
                capabilities=[ModelCapability.CHINESE, ModelCapability.FACTUAL],
                quality_scores={
                    ModelCapability.REASONING: 0.78,
                    ModelCapability.CODING: 0.78,
                    ModelCapability.MATH: 0.76,
                    ModelCapability.CREATIVITY: 0.84,
                    ModelCapability.FACTUAL: 0.82,
                    ModelCapability.CHINESE: 0.90,
                    ModelCapability.LONG_CONTEXT: 0.80,
                    ModelCapability.SPEED: 0.82,
                },
                latency_mean_ms=900,
                latency_std_ms=180,
            ),
            "DeepSeek-V4-Pro": ModelProfile(
                name="DeepSeek-V4-Pro",
                capabilities=[ModelCapability.REASONING, ModelCapability.MATH, ModelCapability.CODING],
                quality_scores={
                    ModelCapability.REASONING: 0.90,
                    ModelCapability.CODING: 0.90,
                    ModelCapability.MATH: 0.90,
                    ModelCapability.CREATIVITY: 0.82,
                    ModelCapability.FACTUAL: 0.86,
                    ModelCapability.CHINESE: 0.80,
                    ModelCapability.LONG_CONTEXT: 0.85,
                    ModelCapability.SPEED: 0.65,
                },
                latency_mean_ms=2500,
                latency_std_ms=500,
            ),
            "DeepSeek-V4-Flash": ModelProfile(
                name="DeepSeek-V4-Flash",
                capabilities=[ModelCapability.SPEED, ModelCapability.REASONING, ModelCapability.CODING],
                quality_scores={
                    ModelCapability.REASONING: 0.84,
                    ModelCapability.CODING: 0.86,
                    ModelCapability.MATH: 0.84,
                    ModelCapability.CREATIVITY: 0.78,
                    ModelCapability.FACTUAL: 0.82,
                    ModelCapability.CHINESE: 0.76,
                    ModelCapability.LONG_CONTEXT: 0.85,
                    ModelCapability.SPEED: 0.88,
                },
                latency_mean_ms=900,
                latency_std_ms=180,
            ),
            "Kimi-K2.7-Code": ModelProfile(
                name="Kimi-K2.7-Code",
                capabilities=[ModelCapability.CODING, ModelCapability.LONG_CONTEXT, ModelCapability.REASONING],
                quality_scores={
                    ModelCapability.REASONING: 0.82,
                    ModelCapability.CODING: 0.94,
                    ModelCapability.MATH: 0.80,
                    ModelCapability.CREATIVITY: 0.76,
                    ModelCapability.FACTUAL: 0.78,
                    ModelCapability.CHINESE: 0.78,
                    ModelCapability.LONG_CONTEXT: 0.96,
                    ModelCapability.SPEED: 0.70,
                },
                latency_mean_ms=2000,
                latency_std_ms=400,
            ),
            "Kimi-K2.6": ModelProfile(
                name="Kimi-K2.6",
                capabilities=[ModelCapability.LONG_CONTEXT, ModelCapability.FACTUAL, ModelCapability.CHINESE],
                quality_scores={
                    ModelCapability.REASONING: 0.84,
                    ModelCapability.CODING: 0.86,
                    ModelCapability.MATH: 0.82,
                    ModelCapability.CREATIVITY: 0.82,
                    ModelCapability.FACTUAL: 0.84,
                    ModelCapability.CHINESE: 0.84,
                    ModelCapability.LONG_CONTEXT: 0.95,
                    ModelCapability.SPEED: 0.75,
                },
                latency_mean_ms=1600,
                latency_std_ms=300,
            ),
            "Qwen3.7-Plus": ModelProfile(
                name="Qwen3.7-Plus",
                capabilities=[ModelCapability.CODING, ModelCapability.REASONING, ModelCapability.FACTUAL],
                quality_scores={
                    ModelCapability.REASONING: 0.86,
                    ModelCapability.CODING: 0.88,
                    ModelCapability.MATH: 0.86,
                    ModelCapability.CREATIVITY: 0.82,
                    ModelCapability.FACTUAL: 0.88,
                    ModelCapability.CHINESE: 0.86,
                    ModelCapability.LONG_CONTEXT: 0.88,
                    ModelCapability.SPEED: 0.78,
                },
                latency_mean_ms=1200,
                latency_std_ms=220,
            ),
        }
    
    def set_api_key(self, model_name: str, api_key: str) -> None:
        """设置模型API密钥（API模式用）"""
        self._api_keys[model_name] = api_key
    
    def _detect_task_type(self, prompt: str) -> list[ModelCapability]:
        """基于prompt内容检测任务类型"""
        prompt_lower = prompt.lower()
        types = []
        
        # 代码相关
        if any(kw in prompt_lower for kw in ["代码", "code", "编程", "program", "函数", "function", "bug", "debug"]):
            types.append(ModelCapability.CODING)
        
        # 数学相关
        if any(kw in prompt_lower for kw in ["数学", "math", "计算", "calculate", "证明", "prove", "方程", "equation"]):
            types.append(ModelCapability.MATH)
        
        # 创意相关
        if any(kw in prompt_lower for kw in ["创意", "creative", "写", "write", "故事", "story", " poem", "诗歌"]):
            types.append(ModelCapability.CREATIVITY)
        
        # 事实问答
        if any(kw in prompt_lower for kw in ["什么", "what", "为什么", "why", "怎么", "how", "谁", "who"]):
            types.append(ModelCapability.FACTUAL)
        
        # 中文文化
        if any(kw in prompt_lower for kw in ["中国", "中文", "古诗", "成语", "文化", "历史"]):
            types.append(ModelCapability.CHINESE)
        
        # 长上下文
        if len(prompt) > 2000:
            types.append(ModelCapability.LONG_CONTEXT)
        
        # 默认推理
        if not types:
            types.append(ModelCapability.REASONING)
        
        return types
    
    def _simulate_response(self, profile: ModelProfile, prompt: str, task_types: list[ModelCapability]) -> ModelResponse:
        """模拟生成响应"""
        # 计算质量分数（基于任务类型和模型能力）
        scores = [profile.quality_scores.get(t, 0.7) for t in task_types]
        avg_quality = sum(scores) / len(scores) if scores else 0.7
        
        # 特长加成
        specialty_bonus = 0.05 if any(t in profile.capabilities for t in task_types) else 0.0
        
        # 随机波动
        noise = random.gauss(0, 0.04)
        final_quality = max(0.0, min(1.0, avg_quality + specialty_bonus + noise))
        
        # 模拟延迟
        latency = max(100, random.gauss(profile.latency_mean_ms, profile.latency_std_ms))
        
        # 模拟token数
        token_count = int(len(prompt) * random.uniform(0.5, 2.0))
        
        # 生成模拟输出（质量越高，输出越"详细"）
        quality_label = "high" if final_quality > 0.85 else "medium" if final_quality > 0.7 else "low"
        
        # 根据任务类型生成不同的模拟输出
        outputs = {
            "coding": {
                "high": f"// [{profile.name}] 高质量代码实现\nfunction optimizedSolution() {{\n  // 经过深思熟虑的算法设计\n  // 时间复杂度: O(n log n)\n  // 空间复杂度: O(n)\n  const result = [];\n  // 详细实现...\n  return result;\n}}\n\n// 附: 边界情况处理和测试用例",
                "medium": f"// [{profile.name}] 标准实现\nfunction solution() {{\n  // 基本算法\n  return [];\n}}",
                "low": f"// [{profile.name}] 基础尝试\nfunction attempt() {{\n  // 待完善\n}}",
            },
            "math": {
                "high": f"# [{profile.name}] 数学证明\n\n**定理**: ...\n\n**证明**: \n1. 首先，我们注意到...\n2. 由归纳法可得...\n3. 因此，结论成立。\n\n**Q.E.D.**\n\n*注: 此证明经过严格验证*",
                "medium": f"# [{profile.name}] 数学推导\n\n计算过程:\n1. 设变量...\n2. 代入公式...\n3. 得到结果...",
                "low": f"# [{profile.name}] 初步分析\n\n这个问题看起来需要...",
            },
            "creative": {
                "high": f"[{profile.name}] 创意作品\n\n在遥远的星系边缘，时间像融化的钟表一样流淌...\n\n（细腻的描写，丰富的意象，深刻的主题）",
                "medium": f"[{profile.name}] 故事草稿\n\n从前有座山，山里有座庙...\n\n（基本情节完整）",
                "low": f"[{profile.name}] 构思片段\n\n一个关于...的故事",
            },
            "default": {
                "high": f"[{profile.name}] 深度分析\n\n## 核心观点\n\n经过全面分析，我认为...\n\n### 论证过程\n1. 前提条件...\n2. 逻辑推导...\n3. 结论...\n\n### 反方观点与回应\n...\n\n*置信度: {final_quality:.1%}*",
                "medium": f"[{profile.name}] 分析\n\n关于这个问题，主要有以下几点...",
                "low": f"[{profile.name}] 初步看法\n\n这个问题涉及...",
            },
        }
        
        # 选择输出模板
        if ModelCapability.CODING in task_types:
            output = outputs["coding"][quality_label]
        elif ModelCapability.MATH in task_types:
            output = outputs["math"][quality_label]
        elif ModelCapability.CREATIVITY in task_types:
            output = outputs["creative"][quality_label]
        else:
            output = outputs["default"][quality_label]
        
        return ModelResponse(
            model_name=profile.name,
            prompt=prompt,
            output=output,
            latency_ms=latency,
            token_count=token_count,
            capabilities=task_types,
            metadata={
                "quality_score": final_quality,
                "specialty_match": any(t in profile.capabilities for t in task_types),
            },
        )
    
    def collect(self, prompt: str, model_names: list[str] | None = None) -> list[ModelResponse]:
        """
        收集多个模型的响应
        
        Args:
            prompt: 输入提示
            model_names: 指定要调用的模型列表，None表示调用所有模型
            
        Returns:
            模型响应列表
        """
        if model_names is None:
            model_names = list(self.profiles.keys())
        
        task_types = self._detect_task_type(prompt)
        responses = []
        
        if self.mode == "simulation":
            for name in model_names:
                if name in self.profiles:
                    profile = self.profiles[name]
                    response = self._simulate_response(profile, prompt, task_types)
                    responses.append(response)
        else:
            # API模式 - 需要异步调用
            # TODO: 实现真实的API调用
            raise NotImplementedError("API模式尚未实现，请先使用模拟模式")
        
        return responses
    
    def collect_async(self, prompt: str, model_names: list[str] | None = None) -> list[ModelResponse]:
        """异步收集（模拟模式下等同于同步）"""
        return self.collect(prompt, model_names)
    
    def get_model_profiles(self) -> dict[str, ModelProfile]:
        """获取所有模型画像"""
        return self.profiles
    
    def get_best_model_for_task(self, task_types: list[ModelCapability]) -> str:
        """根据任务类型推荐最佳模型"""
        best_model = None
        best_score = -1
        
        for name, profile in self.profiles.items():
            scores = [profile.quality_scores.get(t, 0.7) for t in task_types]
            avg_score = sum(scores) / len(scores) if scores else 0.7
            specialty_bonus = 0.05 if any(t in profile.capabilities for t in task_types) else 0.0
            score = avg_score + specialty_bonus
            
            if score > best_score:
                best_score = score
                best_model = name
        
        return best_model or list(self.profiles.keys())[0]