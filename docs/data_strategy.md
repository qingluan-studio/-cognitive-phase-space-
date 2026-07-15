# 单API训练策略：如何用1个Kimi API生成"多专家"训练数据

## 核心问题

> 只有一个Kimi API，怎么获取13个模型的输出？怎么训练融合模型？

## 答案：三层策略

```
Layer 1: 单模型多角色 → 模拟多样性
Layer 2: 本地开源模型 → 补充真实多样性  
Layer 3: 数据飞轮 → 自举放大
```

---

## Layer 1: 单模型多角色增强（现在就能做）

**核心洞察**：同一个Kimi模型，通过不同的system prompt和temperature，可以模拟不同"专家人格"的输出。

### 实现方法

```python
EXPERT_PERSONAS = {
    "code_expert": {
        "system": "你是一位资深软件工程师，擅长编写高效、优雅的代码。",
        "temperature": 0.2,
        "style": "严谨、注释清晰、考虑边界情况"
    },
    "creative_writer": {
        "system": "你是一位富有想象力的作家，擅长创意表达。",
        "temperature": 0.9,
        "style": "生动、意象丰富、情感饱满"
    },
    "math_professor": {
        "system": "你是一位数学教授，擅长严谨的逻辑推导。",
        "temperature": 0.3,
        "style": "严谨、步步推导、引用定理"
    },
    "concise_assistant": {
        "system": "你是一位极简主义者，追求用最少的文字表达最多的信息。",
        "temperature": 0.4,
        "style": "简洁、直击要点、无废话"
    },
    "detail_oriented": {
        "system": "你是一位注重细节的分析师，考虑所有可能性。",
        "temperature": 0.5,
        "style": "全面、深入、多角度分析"
    },
    "beginner_friendly": {
        "system": "你是一位耐心的老师，善于用简单语言解释复杂概念。",
        "temperature": 0.6,
        "style": "通俗、比喻丰富、循序渐进"
    }
}
```

### 操作流程

1. **同一个问题，换6种人格问Kimi** → 得到6种不同风格的答案
2. **用Judge模型评估哪个最好** → 得到偏好对
3. **重复1000次** → 得到6000条多样化数据

**成本**：6次API调用 × 1000个问题 = 6000次调用
**按Kimi价格**：约 6000 × ￥0.012 = **￥72**（很便宜！）

---

## Layer 2: 本地开源模型补充（免费！）

**核心洞察**：用本地跑的开源模型生成更多样化的数据，零API成本。

### 推荐本地模型（按显存需求排序）

| 模型 | 大小 | 显存需求 | 特点 |
|------|------|----------|------|
| Qwen2.5-0.5B-Instruct | 0.5B | 2GB | 超轻量，CPU都能跑 |
| Qwen2.5-1.5B-Instruct | 1.5B | 4GB | 笔记本可跑 |
| Qwen2.5-7B-Instruct | 7B | 14GB | 质量较好，3060可跑 |
| DeepSeek-Coder-V2-Lite | 16B | 32GB | 代码特化 |
| GLM-4-9B-Chat | 9B | 18GB | 中文特化 |

### 一键启动本地模型

```bash
# 安装依赖
pip install transformers torch accelerate

# 下载并运行（以Qwen2.5-1.5B为例）
python -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-1.5B-Instruct')
tokenizer = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-1.5B-Instruct')
# 现在可以本地推理了，零API成本！
"
```

### 混合策略

```
数据生成流水线:
├── 60% Kimi API (高质量，多角色)
├── 30% 本地Qwen (补充多样性，免费)
└── 10% 本地GLM/DeepSeek (特定领域补充)
```

---

## Layer 3: 数据飞轮（自举放大）

**核心洞察**：用模型生成的数据训练更小的模型，小模型再生成更多数据，循环放大。

### 飞轮流程

```
Round 1: Kimi生成1000条高质量数据
    ↓
训练一个小模型（如Qwen-0.5B）
    ↓
Round 2: Qwen-0.5B生成10000条数据
    ↓
用Kimi筛选最好的3000条
    ↓
训练更大的模型（如Qwen-1.5B）
    ↓
Round 3: Qwen-1.5B生成50000条数据
    ↓
...循环...
```

### 关键技巧：拒绝采样（Rejection Sampling）

```python
def rejection_sampling(prompt, generator, judge, n=10):
    """
    让模型生成10个答案，只保留最好的1-2个
    """
    candidates = [generator.generate(prompt) for _ in range(n)]
    scores = [judge.score(c) for c in candidates]
    
    # 只保留前20%
    threshold = np.percentile(scores, 80)
    good_samples = [c for c, s in zip(candidates, scores) if s >= threshold]
    
    return good_samples
```

---

## 实际执行计划

### Phase 1: 纯Kimi启动（￥100预算）

```bash
# 1. 生成1000个问题 × 6种人格 = 6000条数据
python scripts/generate_dataset.py \
    --size 1000 \
    --personas 6 \
    --output data/phase1_kimi.jsonl

# 2. 用Kimi自己评估质量（生成偏好对）
python scripts/generate_preferences.py \
    --input data/phase1_kimi.jsonl \
    --output data/phase1_dpo.jsonl

# 3. 训练一个小模型（本地Qwen-0.5B）
python training/train_sft.py \
    --model Qwen/Qwen2.5-0.5B-Instruct \
    --data data/phase1_kimi.jsonl
```

**预期结果**：一个比原始Qwen-0.5B强20%的小模型

### Phase 2: 飞轮放大（零API成本）

```bash
# 1. 用Phase1模型生成10000条数据
python scripts/generate_with_model.py \
    --model checkpoints/phase1 \
    --size 10000 \
    --output data/phase2_generated.jsonl

# 2. 用Kimi筛选最好的30%（只调用3000次API）
python scripts/filter_with_kimi.py \
    --input data/phase2_generated.jsonl \
    --output data/phase2_filtered.jsonl \
    --top_percent 30

# 3. 训练更大的模型
python training/train_sft.py \
    --model Qwen/Qwen2.5-1.5B-Instruct \
    --data data/phase2_filtered.jsonl
```

**预期结果**：一个接近Kimi质量的1.5B小模型

### Phase 3: 多模型融合（需要更多API或本地模型）

```bash
# 同时运行本地模型 + Kimi API
python fusion_engine/run_hybrid.py \
    --local_models Qwen-1.5B,GLM-4-9B \
    --api_models Kimi-K2.6 \
    --fusion_strategy judge
```

---

## 成本估算

| 阶段 | API调用 | 本地计算 | 预估成本 |
|------|---------|----------|----------|
| Phase 1 | 6000次 | 8小时(GPU) | ￥100 |
| Phase 2 | 3000次 | 24小时(GPU) | ￥50 |
| Phase 3 | 按需 | 持续 | ￥50/月 |
| **总计启动** | **9000次** | **32小时** | **￥150** |

---

## 一句话总结

> **没有多模型API？没关系！用1个Kimi API + 6种人格 + 本地开源模型 + 数据飞轮，照样能训练出融合多优点的模型。关键是：先用Kimi启动，再用开源模型放大！**
