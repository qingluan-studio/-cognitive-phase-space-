"""
认知涌现引擎 — 降级规则引擎
===========================
冷启动用：知识库为空或无匹配时，用规则模板生成回复

策略分层:
1. 意图匹配 → 特定领域模板
2. 知识库关键字命中 → 精准回答
3. 问候/情感 → 社交话术
4. 所有失败 → 通用兜底
"""

from __future__ import annotations

import re
import random
from typing import Optional

from .knowledge_store import ConversationPair


# ── 内置知识库 (冷启动时用) ──────────────────────────────────────────────

BUILTIN_KNOWLEDGE = {
    "认知涌现": "认知涌现(Cognitive Emergence)指复杂认知系统中，宏观有序的智能行为从微观简单规则的相互作用中自发产生的现象。关键特征：不可预测性、自组织性、整体大于部分之和。",
    "认知几何": "认知几何(Cognitive Geometry)用微分几何刻画思维空间。四个不变量：ITC(拓扑连接度)衡量概念网络紧密度，SCS(截面曲率光滑性)衡量推理路径顺畅度，IEC(信息熵临界度)衡量信息量是否位于混沌边缘，PFFT(保真度投影)衡量忠实与独创的平衡。",
    "T1 认知同构": 'T1认知同构镜(Cognitive Isomorphism Engine)在原始认知对象与其形式化表征间建立双射映射，保证语义等价的同时产生「被理解的再表达」。核心操作：地标提取→语义保持→风格迁移。',
    "T2 超图坍缩": "T2超图坍缩棱镜(HyperGraph Collapse)将高维语义超图通过多视角投影坍缩为低维可解释表征。每个视角保留一条迹(trace)，确保信息不丢失。应用：多角度论证、盲点检测。",
    "T3 测地线导航": "T3测地线导航(Geodesic Navigation)在语义流形上计算最短路径，发现概念间的原子突破(atomic breakthrough)——前人未见的直接连接。核心算法：语义嵌入→黎曼度量→测地线积分。",
    "T4 知识结晶": "T4知识结晶(Crystallization)模拟晶体生长过程，从非结构化文本中析出有序知识单元。晶体间通过涌现关联形成概念网络。应用：知识图谱自动构建、隐性知识显性化。",
    "T5 反事实生长": "T5反事实生长(Genesis)通过分支演化+杂交育种生成高适应度的反事实假设。每个分支在适应性景观上爬坡，杂交操作产生超加性优势。应用：创新方案生成、假设推演。",
    "T6 认知不变量": "T6认知几何不变量(Invariant Engine)通过ITC/SCS/IEC/PFFT四个数学不变量严格评估任意文本的认知质量。等级：S级(涌现态,≥0.9)、A级(优秀,≥0.8)、B级(良好,≥0.7)、C级(可接受)、D级(需优化)。",
    "涌现": "涌现(Emergence)指系统整体展现出其组成部分不具备的新属性。在认知系统中，当IEC位于混沌边缘(~0.5-0.7)且ITC和SCS均高时，最可能发生认知涌现——突然产生全新的洞察。",
    "混沌边缘": "混沌边缘(Edge of Chaos)是复杂系统的最优运行区间，位于完全有序和完全随机之间的临界带。在认知系统中，IEC≈0.4-0.7时系统处于混沌边缘，信息量恰到好处，最有利于创新和涌现。",
    "项目宪章": "空间项目宪章五原则：1)数学严谨——所有结论必须有数学定义或实证支撑；2)客观优先——不依赖人工标注，AI在几何规则内自主判断质量；3)可验证——每个主张均可通过独立实验复现；4)结构优先——好的结构优先于好的内容；5)长期存续——体系可在创始团队离场后稳定运转。",
    "Python": "Python是一种解释型、面向对象的高级编程语言，以简洁语法和丰富的生态著称。核心特性：动态类型、垃圾回收、列表推导式、装饰器、上下文管理器、async/await异步编程。主要应用：数据科学(NumPy/Pandas)、机器学习(PyTorch/TensorFlow)、Web开发(Django/FastAPI)、自动化运维。",
    "深度学习": "深度学习基础：多层神经网络通过反向传播自动学习层级化特征表示。核心组件：卷积层(空间特征)、注意力机制(上下文关系)、残差连接(梯度流动)。训练技巧：学习率预热、梯度裁剪、混合精度训练。评估指标：困惑度(语言模型)、BLEU/ROUGE(生成质量)、F1(分类)。",
    "AI编程代理": "AI编程代理(AI Coding Agent)是一种能自主理解任务需求、制定执行计划、读取项目文件、编写代码、运行终端命令、修复错误并迭代交付的智能体。核心能力：任务拆解(将复杂需求分解为可执行步骤)、环境感知(读取和理解现有代码结构)、工具调用(文件读写、终端执行、类型检查)、错误自愈(根据报错信息自动修复)。",
    "第一性原理": "第一性原理(First Principles)是一种将复杂问题分解到最基本、最不可简化的真命题层面，再从此出发重新构建解决方案的思维方法。核心训练方法是反复问'为什么'直到无法继续。",
    "敏捷开发": "敏捷开发(Agile)是一种迭代式软件开发方法论，强调快速交付价值、响应变化、持续改进。四个价值观：个体与互动高于流程与工具、可工作的软件高于详尽的文档、客户合作高于合同谈判、响应变化高于遵循计划。",
}

PAID_ALTERNATIVES = {
    "chatgpt": "Ollama + 开源模型如 Llama3/Qwen",
    "photoshop": "GIMP (免费开源)",
    "office": "LibreOffice (免费开源)",
    "midjourney": "Stable Diffusion (免费开源)",
    "openai": "Ollama 本地运行 Llama3/Qwen (完全免费离线)",
    "cursor": "VS Code + Continue 插件 + Ollama (完全免费)",
    "copilot": "Continue.dev 或 CodeGPT + Ollama (免费)",
    "notion": "AppFlowy 或 Outline (免费开源)",
    "figma": "Penpot (免费开源设计工具)",
    "vercel": "Netlify 或 Cloudflare Pages (免费层)",
    "supabase": "自托管 Supabase 或 PocketBase (免费开源)",
    "firebase": "Supabase 或 Appwrite (免费开源替代)",
}


def _lookup_knowledge(text: str) -> str:
    """内置知识库检索 (空格不敏感，双向子串 + 词汇级匹配)"""
    normalized = text.replace(" ", "").lower()
    for keyword, content in BUILTIN_KNOWLEDGE.items():
        kn = keyword.replace(" ", "").lower()
        if kn in normalized or normalized in kn:
            return f"【{keyword}】{content}"
    # 词汇级回退: 检测文本中的词是否出现在知识标题中
    for keyword, content in BUILTIN_KNOWLEDGE.items():
        kn = keyword.replace(" ", "").lower()
        for word_len in (4, 3, 2):
            for i in range(len(normalized) - word_len + 1):
                if normalized[i:i + word_len] in kn:
                    return f"【{keyword}】{content}"
    return ""


def _detect_paid_alternatives(text: str) -> str:
    """检测付费服务并返回免费替代"""
    text_lower = text.lower()
    found = []
    for keyword, alt in PAID_ALTERNATIVES.items():
        if keyword in text_lower:
            found.append(f"  {keyword} → {alt}")
    if not found:
        return ""
    return "【免费替代方案】\n" + "\n".join(found[:5])

GREETING_PATTERNS = [
    (r"^(你好|hi|hello|嗨|哈喽|在吗|在不在)", "greeting"),
    (r"(早上好|下午好|晚上好|晚安|早安)", "greeting"),
    (r"(再见|拜拜|bye|下次聊|先这样)", "farewell"),
    (r"(谢谢|感谢|thanks|thank|多谢)", "thanks"),
    (r"(你是谁|你叫什么|你是什么|你的名字|你是什么模型)", "identity"),
    (r"(你能做什么|你会什么|你有什么功能|能干啥)", "capability"),
    (r"(怎么用|使用方法|使用教程|help|帮助|怎么操作)", "help"),
    (r"^(\?|？)$", "confused"),
]

HELP_REPLY = """我是空间 CEE 认知涌现引擎，100% 本地离线运行，无需 API Key。

核心能力:
- T1-T6 全引擎闭环评估和优化回复
- 自学习知识库：每次对话自动学习，越用越聪明
- 免费替代检测：自动推荐开源方案替代付费工具
- 知识图谱联想：自动扩展相关知识
- 情感感知：根据你的语气自动调节回复风格
- 三层记忆：记住你的偏好、兴趣和之前聊过的内容

直接输入你的问题，我会用全引擎管线为你分析。"""

CAPABILITY_REPLY = """我可以帮你分析各种问题，全部离线本地运行。

主要功能:
1. 知识问答 — 基于自学习的知识库检索 + 图谱联想
2. 免费替代 — 检测付费工具并推荐开源方案
3. 深度分析 — T1-T6 全引擎链路处理复杂问题
4. 代码帮助 — 解释代码、调试建议、架构设计
5. 创意生成 — T5 反事实生长产生创新方案
6. 认知评估 — T6 四不变量量化任何文本的质量
7. 情感感知 — 自动检测你的情绪并调整回复语气
8. 持续学习 — 每次对话自动记住新知识

每次对话我都会评估回复质量，高质量的回复会自动学习，下次遇到类似问题时会回答得更好。"""

IDENTITY_REPLY = """我是空间认知涌现引擎(Cognitive Emergence Engine)，v6.0。

一个完全本地运行的 AI 对话系统，基于十层智能管线和六大认知引擎(T1-T6)，不需要任何外部 API 或付费服务。

核心架构: 情感感知 -> 加速缓存 -> 意图澄清 -> 阅读理解 ->
        记忆召回 -> 用户画像 -> 知识图谱 -> 知识库检索 ->
        规则模板 -> 引擎合成 -> 自我反思

我通过数学不变量(ITC/SCS/IEC/PFFT)评估和优化每一句话的认知质量，确保回复的严谨性、完整性和独创性。"""


GENERAL_FALLBACKS = [
    "关于「{q}...」，让我从几个维度分析：\n\n"
    "这是一个值得深入探讨的话题。你可以提供更多背景信息，"
    "我会用 T1-T6 全引擎为你做深度分析。\n\n"
    "目前我的知识库还比较新，随着我们的对话增多，"
    "我会自动学习并变得越来越准确。",

    "这是一个好问题。要全面理解「{q}」，我们需要考虑：\n\n"
    "1. 核心定义和背景\n"
    "2. 实际应用场景\n"
    "3. 相关的前沿发展\n\n"
    "你想从哪个方面深入？",

    "关于这个话题，我目前的知识库有限，但可以从基本框架来分析：\n\n"
    "首先梳理核心概念，然后看实际例子，最后探讨更深的含义。\n\n"
    "如果你能提供更多背景或具体场景，我可以给出更精准的分析。",

    "这个问题涉及多个层面，让我帮你梳理一下思考框架：\n\n"
    "- 概念层面：精确的含义和边界\n"
    "- 实用层面：怎么用、什么时候用\n"
    "- 关联层面：和其他概念的交叉\n\n"
    "你有没有特别想了解的方向？",
]

TOPIC_TEMPLATES = {
    "代码": {
        "patterns": [
            r"(写|帮我写|生成|编写|实现).*(代码|程序|脚本|函数|类|接口)",
            r"(代码|编程|程序|bug|错误|报错|debug).*(怎么|如何|为什么)",
            r"(python|javascript|java|go|rust|c\+\+|typescript|html|css|sql)",
            r"(算法|数据结构|设计模式|架构|重构)",
        ],
        "reply": lambda text: (
            _lookup_knowledge(text) or
            random.choice([
                "关于这个问题，让我从代码层面分析：\n\n"
                "1. 先确认你的需求和技术栈\n"
                "2. 写出核心逻辑的框架\n"
                "3. 给出可运行的示例\n\n"
                "你用的是哪种语言？我可以直接给出代码示例。",

                "这是一个编程问题。我建议这样思考：\n\n"
                "- 明确输入和期望输出\n"
                "- 选择合适的数据结构和算法\n"
                "- 考虑边界情况\n\n"
                "告诉我更多细节(语言/框架/场景)，我可以写具体的代码。",
            ])
        ),
    },
    "概念": {
        "patterns": [
            r"(什么.*是|什么是|解释|含义|定义|是什么|什么意思)",
            r"(讲.*一下|解释.*一下|介绍.*一下|说明.*一下)",
        ],
        "reply": lambda text: (
            _lookup_knowledge(text) or
            _detect_paid_alternatives(text) or
            random.choice([
                "这是一个值得深入理解的概念。\n\n"
                "从基础定义出发，然后看它如何与其他概念关联，最后探讨实际应用。\n\n"
                "你想先了解哪个方面？",

                "让我从多角度拆解这个概念的认知结构：\n\n"
                "基础层：核心定义\n"
                "理论层：与其他概念的关联\n"
                "应用层：实际场景中的运用\n\n"
                "有具体的使用场景吗？",
            ])
        ),
    },
    "工具": {
        "patterns": [
            r"(推荐|有什么|哪些|哪个).*(工具|软件|库|框架|平台|应用|网站)",
            r"(用什么|选什么|怎么选).*(工具|软件|框架)",
            r"(免费|开源|替代|代替|有没有).*(工具|软件|服务|方案)",
        ],
        "reply": lambda text: (
            _detect_paid_alternatives(text) or
            random.choice([
                "让我推荐几个方案：\n\n"
                "优先推荐免费开源的，然后根据需要升级到商业方案。\n\n"
                "能告诉我更多吗：用在什么项目上、对性能的要求、是否需要协作？",

                "工具选择取决于具体场景。我建议你考虑：\n\n"
                "1. 学习成本 vs 功能需求\n"
                "2. 社区活跃度和文档质量\n"
                "3. 与现有技术栈的兼容性\n\n"
                "你的具体需求和场景是什么？",
            ])
        ),
    },
    "学习": {
        "patterns": [
            r"(怎么学|如何学|学什么|入门|新手|小白).*(编程|开发|技术|代码|AI|机器学习)",
            r"(学习路径|学习路线|学习计划|学习建议)",
            r"(推荐|有什么).*(书|课程|教程|资源|文档|文章)",
        ],
        "reply": random.choice([
            "学习路线建议：\n\n"
            "阶段1: 基础概念 + 动手小项目\n"
            "阶段2: 核心原理 + 中型实战\n"
            "阶段3: 高级主题 + 开源贡献\n\n"
            "免费的优质资源有很多：官方文档、GitHub开源项目、技术博客。你想从哪个方向开始？",

            "按我的经验，最高效的学习方法是：\n\n"
            "1. 先理解为什么需要这个技术\n"
            "2. 动手写最简单的例子\n"
            "3. 遇到问题再查文档和原理\n"
            "4. 用真实项目加深理解\n\n"
            "你有具体的想学的内容吗？",
        ]),
    },
    "创意": {
        "patterns": [
            r"(想法|创意|点子|灵感|方案|策略).*(怎么|如何|有没有|什么)",
            r"(脑暴|头脑风暴|创新|突破)",
            r"(设计|规划|策划).*(方案|思路|想法)",
        ],
        "reply": random.choice([
            "用 T5 反事实生长引擎帮你激发创意：\n\n"
            "核心方法：打破常规假设，从完全不同的维度重新审视。\n\n"
            "试试这样思考：如果约束条件全变会怎样？如果把A领域的方法用到B领域？\n\n"
            "你有具体的场景吗？",

            "创意突破往往来自跨领域的类比和反事实推演。\n\n"
            "三个方向可以尝试：\n"
            "1. 倒置思考：反着想的可能性是什么？\n"
            "2. 极端化：把某个变量推到极限会怎样？\n"
            "3. 杂交：把两个不相关领域的精华合并\n\n"
            "我们可以一起头脑风暴。",
        ]),
    },
}


def detect_intent(text: str) -> str:
    """检测用户意图"""
    for pattern, intent in GREETING_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return intent

    for topic, cfg in TOPIC_TEMPLATES.items():
        for pattern in cfg["patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                return f"topic_{topic}"

    if len(text) < 8:
        return "short"

    return "general"


def generate_fallback(text: str, intent: str = "",
                      retrieved: Optional[list[ConversationPair]] = None) -> str:
    """生成降级回复"""

    intent = intent or detect_intent(text)

    replies = {
        "greeting": lambda: random.choice([
            "你好！我是空间 CEE 认知涌现引擎。有什么可以帮你的？",
            "嗨！有什么想聊的？我可以帮你分析问题、推荐工具、或深度探讨任何话题。",
        ]),
        "farewell": lambda: random.choice([
            "再见！如果以后有任何问题随时回来。",
            "好的，下次见！我会继续在这里学习，下次回来时我会更聪明。",
        ]),
        "thanks": lambda: random.choice([
            "不客气！能帮到你就好。",
            "随时都可以问我。",
        ]),
        "identity": lambda: IDENTITY_REPLY,
        "capability": lambda: CAPABILITY_REPLY,
        "help": lambda: HELP_REPLY,
        "short": lambda: "能多说一点吗？我想更准确地理解你的需求。",
        "confused": lambda: "有什么想问的？尽管说。",
        "general": lambda: generate_general(text, retrieved),
    }

    for topic_name, cfg in TOPIC_TEMPLATES.items():
        if intent == f"topic_{topic_name}":
            reply = cfg["reply"]
            return reply(text) if callable(reply) else reply

    return replies.get(intent, replies["general"])()


def generate_general(text: str,
                     retrieved: Optional[list[ConversationPair]] = None) -> str:
    """通用回复生成: 知识库检索 + 历史对话引用"""

    # 内置知识库检索
    kb_hit = _lookup_knowledge(text)
    if kb_hit:
        return kb_hit

    # 付费替代检测
    alt_text = _detect_paid_alternatives(text)
    if alt_text:
        return alt_text

    # 检索到的历史高质量对话
    if retrieved:
        best = retrieved[0]
        return (
            f"关于「{text[:30]}...」这个问题，我之前遇到过类似的讨论：\n\n"
            f"{best.ai_response[:400]}"
        )

    return random.choice(GENERAL_FALLBACKS).format(q=text[:40])
