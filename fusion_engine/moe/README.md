# 混合专家（MoE）架构原型

本项目在 `fusion_engine/moe/` 下实现了一套**可扩展的 MoE（Mixture-of-Experts）架构原型**，旨在从 **13 个领域特定模型**的优点中提取知识，并构建一个稀疏激活的统一大模型。

---

## 1. 设计动机

在实际业务中，我们常常拥有多个在特定领域上表现优异的“小模型”（例如：代码生成、数学推理、法律文本、医疗问答、多语言翻译等）。直接将这些模型 ensemble 成本高昂，而简单的参数平均会抹平各自的领域特性。

**MoE 架构**提供了一种优雅的解决方案：
- 将每个领域模型的专长编码为独立的 **Expert（专家）**。
- 通过 **Gate（门控网络）** 动态判断当前输入应该由哪些专家处理。
- 采用 **稀疏激活**（每次只激活 2~4 个专家），在扩展模型容量的同时，保持推理成本与 dense 模型相当。

---

## 2. 如何从 13 个模型构建 MoE

我们的构建流程分为三个阶段：

### 阶段一：知识提取（Weight Merging）

13 个微调模型共享同一个预训练基座，但各自在不同领域数据上微调。我们首先计算它们相对于基座的 **Task Vector**（任务向量），然后使用以下算法进行合并与提炼：

| 算法 | 作用 |
|------|------|
| **Task Vector 加法** | 将多个任务向量加权求和，快速得到一个通用能力强的初始化。 |
| **TIES-Merging** | 先 Trim（修剪掉低幅度参数），再 Elect Sign（符号选举），最后 Merge（只保留同号参数），有效消除参数干扰。 |
| **SLERP** | 球面线性插值，用于在相邻领域模型之间平滑过渡，生成兼具两者特性的“过渡专家”。 |

通过这些算法，我们可以为 13 个 Expert 生成高质量的初始权重，使它们既保留领域特色，又避免相互冲突。

### 阶段二：架构组装（Architecture）

将生成的 13 个 Expert 插入到 `MoELayer` 中，每层包含：
- `num_experts = 13` 个轻量级 FFN 专家。
- 一个 `Gate` 网络，将输入 token 映射为到 13 个专家的 routing 概率。
- **Top-k 路由**：每次只选择概率最高的 k 个专家（默认 k=2），并重新归一化权重。
- **容量因子（Capacity Factor）**：限制每个专家每轮处理的最大 token 数，确保稀疏性。

多个 `MoELayer` 与标准多头自注意力（Multi-Head Self-Attention）交替堆叠，形成完整的 `MoEModel`。

### 阶段三：端到端训练（Training）

训练过程中：
- **主损失**：语言建模的交叉熵损失（自回归预测下一个 token）。
- **辅助损失**：负载均衡损失（Load Balance Loss），惩罚门控网络将过多 token 分配给少数专家的行为，鼓励 13 个专家被均匀调用。
- 通过 `MoETrainer` 实现完整的训练循环，包括梯度裁剪、余弦退火学习率、验证集 perplexity 评估与检查点保存。

---

## 3. 架构图

```
输入序列
    |
    v
+-------------------+
| Token Embedding   |
| Pos Embedding     |
+-------------------+
    |
    v
+-----------------------------+
| Layer 1                     |
|  +-----------------------+  |
|  | Multi-Head Attention  |  |
|  +-----------------------+  |
|              |              |
|  +-----------------------+  |
|  | LayerNorm             |  |
|  +-----------------------+  |
|              |              |
|  +-----------------------+  |
|  | MoELayer              |  |
|  |  +-----------------+  |  |
|  |  | Gate Network    |  |  |
|  |  | (top-k select)  |  |  |
|  |  +-----------------+  |  |
|  |         |             |  |
|  |  +-----------------+  |  |
|  |  | Expert 0 (领域A) |  |  |
|  |  | Expert 1 (领域B) |  |  |
|  |  | ...              |  |  |
|  |  | Expert 12(领域M) |  |  |
|  |  +-----------------+  |  |
|  |         |             |  |
|  |  (加权求和，仅激活2个)  |  |
|  +-----------------------+  |
+-----------------------------+
    |
    v
         ...
    |
    v
+-----------------------------+
| Final LayerNorm             |
+-----------------------------+
    |
    v
+-----------------------------+
| LM Head (共享 Emb 权重)      |
+-----------------------------+
    |
    v
输出 logits
```

---

## 4. 文件说明

| 文件 | 说明 |
|------|------|
| `architecture.py` | MoE 核心架构：Expert、Gate、MoELayer、MoEModel。 |
| `weight_merging.py` | 权重合并算法：Task Vector、TIES-Merging、SLERP。 |
| `training.py` | 训练框架：专家池初始化、负载均衡训练、端到端循环。 |
| `README.md` | 本文档。 |

---

## 5. 使用示例（伪代码）

```python
from moe.architecture import MoEModel
from moe.weight_merging import merge_multiple_models
from moe.training import ExpertPool, MoETrainer, train_moe

# 1. 定义模型：13 个专家，每次激活 2 个
model = MoEModel(vocab_size=32000, num_experts=13, top_k=2)

# 2. 从 13 个检查点初始化专家
pool = ExpertPool(checkpoint_dir="./ckpts", pretrained_path="./base.pt")
pool.load_checkpoints()
pool.initialize_moe_model(model, method="ties")

# 3. 训练
trainer = train_moe(model, pool, num_epochs=5, batch_size=16)
```

---

## 6. 扩展方向

- **专家并行（Expert Parallelism）**：将不同 Expert 放置在不同 GPU 上，突破单卡显存限制。
- **共享专家（Shared Expert）**：设置 1~2 个始终激活的共享专家，学习通用语言知识。
- **动态专家数量**：根据输入复杂度自适应调整 k 值。
- **更细粒度的合并策略**：对不同层使用不同的合并算法（如底层用 SLERP，顶层用 TIES）。

---

## 7. 总结

本原型展示了如何系统性地将 **13 个领域模型的优点** 转化为一个 **稀疏激活的 MoE 大模型**。通过权重合并获得高质量的初始化，再通过门控网络与负载均衡损失实现动态路由，最终在不显著增加推理成本的前提下，大幅提升模型的多领域泛化能力。
