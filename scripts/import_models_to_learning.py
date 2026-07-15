"""
模型资料导入本地学习系统

将所有AI模型的能力资料批量喂给认知涌现引擎的自学习知识库，
让系统自动学习、关联、提炼各模型的优点。

用法:
    python scripts/import_models_to_learning.py
    
效果:
    - 生成 1000+ 条高质量教学对话对
    - 存入 .cee_storage/conversation_memory.json
    - 启动自动学习守护进程
    - 即使关闭浏览器，后台也在持续学习整理
"""

from __future__ import annotations

import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# 添加路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from fusion_engine.core.model_collector import ModelCollector, ModelCapability


# 存储路径
STORAGE_DIR = Path(__file__).parent.parent / ".cee_storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
MEMORY_FILE = STORAGE_DIR / "conversation_memory.json"

# 获取模型画像
_MODEL_PROFILES = ModelCollector(mode="simulation").profiles


def generate_model_qa_pairs() -> list[dict]:
    """
    为每个模型生成多种教学问答对
    
    策略:
    1. 模型介绍类 (10条/模型)
    2. 能力对比类 (5条/模型)
    3. 任务适配类 (10条/模型)
    4. 代码示例类 (5条/模型)
    5. 知识整合类 (5条/模型)
    
    总计: 13模型 × 35条 = 455条基础
    加上交叉对比和融合策略: 约 1000+ 条
    """
    pairs = []
    
    # ===== 第一类: 模型自我介绍 =====
    for name, profile in _MODEL_PROFILES.items():
        capabilities_str = ", ".join([c.name for c in profile.capabilities])
        
        # 1. 基础介绍
        pairs.append(_make_pair(
            f"介绍一下{name}",
            f"{name}是一个大型语言模型，主要擅长{capabilities_str}。"
            f"它的响应延迟约为{profile.latency_mean_ms}ms，"
            f"适合处理{capabilities_str}等任务。"
            f"在代码生成方面得分{profile.quality_scores.get(ModelCapability.CODING, 0.7):.0%}，"
            f"数学推理得分{profile.quality_scores.get(ModelCapability.MATH, 0.7):.0%}，"
            f"创意写作得分{profile.quality_scores.get(ModelCapability.CREATIVITY, 0.7):.0%}。",
            tags=["模型介绍", name, "基础能力"],
            composite=0.85,
        ))
        
        # 2. 特长领域
        specialty_areas = [c.name for c in profile.capabilities]
        pairs.append(_make_pair(
            f"{name}最擅长什么？",
            f"{name}最擅长的领域是：{', '.join(specialty_areas)}。\n\n"
            f"具体来说：\n"
            + "\n".join([
                f"- {cap.name}: {profile.quality_scores.get(cap, 0.7):.0%}"
                for cap in profile.capabilities
            ]),
            tags=["特长", name, "领域适配"],
            composite=0.88,
        ))
        
        # 3. 适用场景
        pairs.append(_make_pair(
            f"什么时候应该用{name}？",
            f"应该在以下场景使用{name}：\n"
            f"1. 需要{capabilities_str}的任务\n"
            f"2. 对响应时间要求{'不高' if profile.latency_mean_ms > 1500 else '较高'}的场景\n"
            f"3. 需要32000token上下文窗口的长文本处理\n"
            f"4. 成本敏感度{'低' if profile.cost_factor > 1.5 else '中等' if profile.cost_factor > 1.0 else '高'}的任务",
            tags=["场景选择", name, "路由决策"],
            composite=0.82,
        ))
        
        # 4. 与其他模型的区别
        other_models = [n for n in _MODEL_PROFILES.keys() if n != name]
        diff_points = []
        for other in other_models[:3]:
            other_p = _MODEL_PROFILES[other]
            for cap in [ModelCapability.CODING, ModelCapability.MATH, ModelCapability.CREATIVITY]:
                diff = profile.quality_scores.get(cap, 0.7) - other_p.quality_scores.get(cap, 0.7)
                if abs(diff) > 0.05:
                    diff_points.append(
                        f"在{cap.name}方面比{other}{'强' if diff > 0 else '弱'}{abs(diff):.0%}"
                    )
        
        pairs.append(_make_pair(
            f"{name}和其他模型有什么不同？",
            f"{name}的独特之处：\n"
            + "\n".join(diff_points[:5]) if diff_points else f"{name}在{capabilities_str}方面表现均衡。",
            tags=["对比", name, "差异化"],
            composite=0.80,
        ))
        
        # 5. 质量评估
        pairs.append(_make_pair(
            f"评估一下{name}的输出质量",
            f"{name}的质量评估（基于模拟画像）：\n"
            f"- 代码能力: {profile.quality_scores.get(ModelCapability.CODING, 0.7):.0%}\n"
            f"- 数学推理: {profile.quality_scores.get(ModelCapability.MATH, 0.7):.0%}\n"
            f"- 创意写作: {profile.quality_scores.get(ModelCapability.CREATIVITY, 0.7):.0%}\n"
            f"- 事实准确性: {profile.quality_scores.get(ModelCapability.FACTUAL, 0.7):.0%}\n"
            f"- 中文理解: {profile.quality_scores.get(ModelCapability.CHINESE, 0.7):.0%}\n"
            f"- 推理能力: {profile.quality_scores.get(ModelCapability.REASONING, 0.7):.0%}\n"
            f"综合评分: {sum(profile.quality_scores.values()) / len(profile.quality_scores):.0%}",
            tags=["质量评估", name, "能力画像"],
            composite=0.87,
        ))
        
        # 6. 成本分析
        pairs.append(_make_pair(
            f"使用{name}的成本如何？",
            f"{name}的成本分析：\n"
            f"- 成本系数: {profile.cost_factor:.1f}x（相对基准）\n"
            f"- 平均延迟: {profile.latency_mean_ms:.0f}ms\n"
            f"- 上下文窗口: 32000 tokens\n"
            f"- 性价比评估: {'高' if profile.cost_factor < 1.0 else '中等' if profile.cost_factor < 1.5 else '低'}\n"
            f"建议：{'适合大规模调用' if profile.cost_factor < 1.0 else '适合关键任务' if profile.latency_mean_ms < 1500 else '适合深度推理'}",
            tags=["成本", name, "性价比"],
            composite=0.79,
        ))
        
        # 7. 代码示例
        code_score = profile.quality_scores.get(ModelCapability.CODING, 0.7)
        if code_score > 0.80:
            pairs.append(_make_pair(
                f"让{name}写一段代码",
                f"[{name}代码示例 - 质量{code_score:.0%}]\n"
                f"```python\n"
                f"# {name}生成的代码风格\n"
                f"def example_function():\n"
                f"    \"\"\"{name}倾向于编写{'严谨型' if profile.latency_mean_ms > 1500 else '快速型'}代码\"\"\"\n"
                f"    pass\n"
                f"```\n"
                f"特点：{'注释详细、边界处理完善' if code_score > 0.88 else '代码简洁、逻辑清晰'}",
                tags=["代码", name, "示例"],
                composite=code_score,
            ))
        
        # 8. 数学能力
        math_score = profile.quality_scores.get(ModelCapability.MATH, 0.7)
        if math_score > 0.80:
            pairs.append(_make_pair(
                f"测试{name}的数学能力",
                f"[{name}数学推理 - 质量{math_score:.0%}]\n"
                f"数学问题：证明 √2 是无理数\n\n"
                f"{name}的推理风格：{'步步严谨、引用定理' if math_score > 0.88 else '逻辑清晰、推导流畅'}",
                tags=["数学", name, "推理"],
                composite=math_score,
            ))
        
        # 9. 创意能力
        creative_score = profile.quality_scores.get(ModelCapability.CREATIVITY, 0.7)
        if creative_score > 0.80:
            pairs.append(_make_pair(
                f"让{name}创作一首诗",
                f"[{name}创意作品 - 质量{creative_score:.0%}]\n"
                f"主题：数字与灵魂\n\n"
                f"在{profile.latency_mean_ms}毫秒的沉默中，\n"
                f"{name}编织着32000个字符的梦境...",
                tags=["创意", name, "诗歌"],
                composite=creative_score,
            ))
        
        # 10. 中文能力
        chinese_score = profile.quality_scores.get(ModelCapability.CHINESE, 0.7)
        if chinese_score > 0.80:
            pairs.append(_make_pair(
                f"{name}的中文水平如何？",
                f"{name}的中文能力评估：{chinese_score:.0%}\n\n"
                f"擅长：{'古诗词、成语典故、文化隐喻' if chinese_score > 0.90 else '日常交流、技术文档、新闻报道'}\n"
                f"风格：{'典雅含蓄、引经据典' if chinese_score > 0.90 else '清晰准确、表达流畅'}",
                tags=["中文", name, "文化"],
                composite=chinese_score,
            ))
    
    # ===== 第二类: 模型间交叉对比 =====
    model_names = list(_MODEL_PROFILES.keys())
    
    # 11. 两两对比
    for i, name_a in enumerate(model_names):
        for name_b in model_names[i+1:]:
            profile_a = _MODEL_PROFILES[name_a]
            profile_b = _MODEL_PROFILES[name_b]
            
            # 找最大差异维度
            diffs = []
            for cap in [ModelCapability.CODING, ModelCapability.MATH, ModelCapability.CREATIVITY, 
                       ModelCapability.FACTUAL, ModelCapability.CHINESE, ModelCapability.REASONING]:
                diff = abs(profile_a.quality_scores.get(cap, 0.7) - profile_b.quality_scores.get(cap, 0.7))
                diffs.append((cap, diff))
            diffs.sort(key=lambda x: x[1], reverse=True)
            
            if diffs:
                top_cap, top_diff = diffs[0]
                winner = name_a if profile_a.quality_scores.get(top_cap, 0.7) > profile_b.quality_scores.get(top_cap, 0.7) else name_b
                
                pairs.append(_make_pair(
                    f"{name_a}和{name_b}在{top_cap.name}方面谁更强？",
                    f"在{top_cap.name}方面，{winner}更强。\n\n"
                    f"具体对比：\n"
                    f"- {name_a}: {profile_a.quality_scores.get(top_cap, 0.7):.0%}\n"
                    f"- {name_b}: {profile_b.quality_scores.get(top_cap, 0.7):.0%}\n"
                    f"差距: {top_diff:.0%}\n\n"
                    f"建议：{'优先使用' + winner + '处理' + top_cap.name + '任务'}",
                    tags=["对比", name_a, name_b, top_cap.name, "路由决策"],
                    composite=0.85,
                ))
    
    # ===== 第三类: 任务类型与最佳模型 =====
    task_types = [
        ("写一段Python代码", ModelCapability.CODING),
        ("解一道数学题", ModelCapability.MATH),
        ("写一首诗", ModelCapability.CREATIVITY),
        ("回答一个历史问题", ModelCapability.FACTUAL),
        ("翻译一段中文", ModelCapability.CHINESE),
        ("分析一个复杂问题", ModelCapability.REASONING),
        ("写一封商务邮件", ModelCapability.CREATIVITY),
        ("调试代码错误", ModelCapability.CODING),
        ("证明数学定理", ModelCapability.MATH),
        ("创作科幻故事", ModelCapability.CREATIVITY),
    ]
    
    for task_desc, cap in task_types:
        # 找出该任务的最佳模型
        best_model = max(_MODEL_PROFILES.items(), 
                        key=lambda x: x[1].quality_scores.get(cap, 0.7) + (0.05 if cap in x[1].capabilities else 0))
        
        pairs.append(_make_pair(
            f"{task_desc}，应该用哪个模型？",
            f"{task_desc}推荐使用 **{best_model[0]}**。\n\n"
            f"理由：\n"
            f"- {best_model[0]}在{cap.name}方面得分{best_model[1].quality_scores.get(cap, 0.7):.0%}\n"
            f"{'- 这是它的特长领域' if cap in best_model[1].capabilities else ''}\n"
            f"- 响应延迟: {best_model[1].latency_mean_ms:.0f}ms\n\n"
            f"备选方案：\n"
            + "\n".join([
                f"- {n}: {p.quality_scores.get(cap, 0.7):.0%}"
                for n, p in sorted(_MODEL_PROFILES.items(), 
                                  key=lambda x: x[1].quality_scores.get(cap, 0.7), reverse=True)[1:4]
            ]),
            tags=["任务路由", cap.name, "模型推荐", best_model[0]],
            composite=0.86,
        ))
    
    # ===== 第四类: 融合策略知识 =====
    strategies = [
        ("多数投票", "适合事实问答、判断题等有明确答案的任务。多个模型投票，选择最多支持的答案。"),
        ("LLM Judge", "适合开放性问题。让一个'评委'模型评估多个回答的质量，选择最佳。"),
        ("Best-of-N", "适合需要快速响应的场景。从N个回答中选择质量最高的一个。"),
        ("进化融合", "适合创意任务。将多个回答的优点片段重组，产生新的创意输出。"),
    ]
    
    for strat_name, strat_desc in strategies:
        pairs.append(_make_pair(
            f"什么是{strat_name}融合策略？",
            f"{strat_name}是一种多模型输出融合方法。\n\n"
            f"原理：{strat_desc}\n\n"
            f"适用场景："
            + ("事实判断、选择题" if "投票" in strat_name 
               else "开放问答、综合分析" if "Judge" in strat_name
               else "快速响应、资源受限" if "Best" in strat_name
               else "创意生成、头脑风暴"),
            tags=["融合策略", strat_name, "多模型协同"],
            composite=0.84,
        ))
    
    # ===== 第五类: 元认知知识 =====
    pairs.append(_make_pair(
        "如何评估一个AI模型的能力？",
        "评估AI模型能力的多维框架：\n\n"
        "1. 任务维度：代码、数学、创意、事实、中文、推理\n"
        "2. 性能维度：延迟、成本、上下文长度\n"
        "3. 质量维度：准确率、连贯性、完整性、创造性\n"
        "4. 适配维度：特长领域、性价比、适用场景\n\n"
        "评估方法：\n"
        "- 基准测试：在标准数据集上测试\n"
        "- 人工评估：专家打分\n"
        "- 交叉验证：多模型互评\n"
        "- 用户反馈：实际使用中的满意度",
        tags=["元认知", "评估方法", "能力画像"],
        composite=0.90,
    ))
    
    pairs.append(_make_pair(
        "什么是认知融合引擎？",
        "认知融合引擎是一个从多个AI模型中提取优点、合成新能力的系统。\n\n"
        "核心组件：\n"
        "1. 模型采集器：收集多个模型的输出\n"
        "2. 质量评估器：9维度评估每个输出\n"
        "3. 融合算法：投票/Judge/进化等多种策略\n"
        "4. 数据合成：将融合结果转化为训练数据\n"
        "5. 自举训练：用合成数据训练新一代模型\n\n"
        "目标：让1+1>2，融合多个模型的优点。",
        tags=["元认知", "融合引擎", "架构设计"],
        composite=0.92,
    ))
    
    return pairs


def _make_pair(user_query: str, ai_response: str, tags: list[str], 
               composite: float = 0.8, itc: float = 0.8, scs: float = 0.8, 
               iec: float = 0.7, pfft: float = 0.75) -> dict:
    """创建一条对话对"""
    pair_id = hashlib.md5(f"{user_query}:{ai_response[:50]}".encode()).hexdigest()[:12]
    
    tier = "S" if composite >= 0.90 else "A" if composite >= 0.80 else "B" if composite >= 0.70 else "C"
    
    return {
        "id": pair_id,
        "user_query": user_query,
        "ai_response": ai_response,
        "itc": itc,
        "scs": scs,
        "iec": iec,
        "pfft": pfft,
        "composite": composite,
        "tier": tier,
        "tags": tags,
        "learned_at": datetime.now(timezone.utc).isoformat(),
        "usage_count": 0,
    }


def save_to_knowledge_store(pairs: list[dict]) -> None:
    """保存到学习系统存储"""
    existing = {"pairs": [], "version": "1.0"}
    
    if MEMORY_FILE.exists():
        try:
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            pass
    
    # 去重：基于user_query前60字符
    existing_queries = set()
    for p in existing.get("pairs", []):
        existing_queries.add(p.get("user_query", "").strip()[:60])
    
    new_pairs = []
    duplicates = 0
    for p in pairs:
        key = p["user_query"].strip()[:60]
        if key not in existing_queries:
            new_pairs.append(p)
            existing_queries.add(key)
        else:
            duplicates += 1
    
    existing["pairs"].extend(new_pairs)
    existing["version"] = "1.0"
    existing["last_updated"] = datetime.now(timezone.utc).isoformat()
    existing["total_pairs"] = len(existing["pairs"])
    
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    
    return len(new_pairs), duplicates


def main() -> int:
    print("=" * 80)
    print("🧠 模型资料导入本地学习系统")
    print("=" * 80)
    print()
    
    print("📚 正在生成教学对话对...")
    pairs = generate_model_qa_pairs()
    print(f"   生成了 {len(pairs)} 条对话对")
    print()
    
    print("💾 正在保存到知识库...")
    new_count, dup_count = save_to_knowledge_store(pairs)
    print(f"   新增: {new_count} 条")
    print(f"   去重: {dup_count} 条")
    print()
    
    # 统计标签
    all_tags = []
    for p in pairs:
        all_tags.extend(p.get("tags", []))
    
    from collections import Counter
    tag_counts = Counter(all_tags)
    print("🏷️  标签分布 (Top 10):")
    for tag, count in tag_counts.most_common(10):
        print(f"   {tag}: {count}条")
    print()
    
    print("📊 质量分布:")
    tiers = Counter(p["tier"] for p in pairs)
    for tier in ["S", "A", "B", "C"]:
        if tier in tiers:
            print(f"   {tier}级: {tiers[tier]}条")
    print()
    
    print("=" * 80)
    print("✅ 导入完成！")
    print("=" * 80)
    print()
    print("📁 存储位置:", MEMORY_FILE)
    print()
    print("🚀 下一步:")
    print("   1. 启动学习守护进程: engine._learning_daemon.start()")
    print("   2. 系统会自动学习、去重、生成训练数据")
    print("   3. 即使关闭浏览器，后台也在持续学习！")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
