# Cognitive Emergence Engine (CEE)

认知涌现引擎 — 通过六大认知几何引擎（T1-T6）实现文本质量的结构化评估与优化。

**融合模型：合鸣（Harmonia-13）** — 13 个领域专家稀疏激活、协同涌现的统一大模型。

## 架构

```
src/cee/
├── core/              # 核心类型、闭环控制器、元路由、人工审批
├── engine/            # T1-T6 六大认知几何引擎
│   ├── t1_mirror.py           # 认知同构（路标提取 + 镜像生成 + 差异纯化）
│   ├── t2_prism.py            # 超图坍缩（多视角生成，追溯率验证）
│   ├── t3_geodesic.py         # 测地线导航（代码/文本流形路径探索）
│   ├── t4_crystallization.py  # 知识结晶（碎片融合、涌现关联检测）
│   ├── t5_genesis.py          # 反事实生长（分枝生成 + 杂交实验）
│   └── t6_invariant.py        # 认知几何不变量（双轨制：工程版 + 理论版）
├── app/               # CEE Chat + 17 应用引擎 + 本地推理
│   ├── chat_backend.py        # CEE Chat 后端（端口 8898）
│   ├── mobile_server.py       # Mobile Server（端口 8897）
│   ├── engine/                # 17 应用引擎（search/rag/think/creative/bias/
│   │   │                        memory/code_interpreter/contradiction/
│   │   │                        sentiment/translator/reasoning/multimodal/
│   │   │                        summarizer/topic_model/files/synthesis/pipeline）
│   ├── local_llm/             # 本地推理引擎 v8.1（23 模块）
│   ├── core/                  # 配置、缓存、数据库、日志、限流
│   ├── models/                # 模型 schema
│   ├── api/                   # 路由 + 中间件
│   ├── knowledge/             # 知识管理与策展
│   ├── monitor/               # 指标 + 健康检查
│   ├── utils/                 # 文本/Web/异步工具
│   └── plugins/               # 插件加载器
├── agent/             # 多智能体框架（9 个模块）
│   ├── orchestrator.py        # 编排器：plan → delegate → execute → review → synthesize
│   ├── consensus.py           # 共识引擎
│   ├── parliament.py          # 议会辩论
│   ├── memory_bank.py         # 记忆银行
│   ├── task_decomposer.py     # 任务分解器
│   ├── message_bus.py         # 消息总线
│   ├── base_agent.py          # 基础智能体
│   ├── post_mortem.py         # 事后分析
│   └── types.py               # 类型定义
├── api/               # REST API（FastAPI, 端口 8899）
├── sdk/               # Python 客户端
├── cli/               # CLI 工具
├── models/            # 模型适配器（Kimi 等）
├── governance/        # 六层治理体系
├── processing/        # 数据处理管道（长文本、文档读取）
├── output/            # 输出引擎
├── performance/       # 性能加速器
├── cloud/             # 云端自动配置
└── plugin/            # 插件市场、插件管理器
```

## 快速开始

```bash
pip install -e .
pytest tests/ -v
```

## CEE Chat 后端（端口 8898）

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/api/chat` | POST | 主对话端点，LLM 生成 + T6 评估 → 低分自动闭环优化 |
| `/api/health` | GET | 健康检查 |
| `/api/learn/toggle` | POST | 自动学习开关 |
| `/api/learn/config` | POST | 学习管道配置 |
| `/api/learn/stats` | GET | 学习统计 |
| `/api/learn/feedback` | POST | 用户反馈（like/dislike） |
| `/api/learn/recall` | POST | 记忆召回 |

闭环优化路径：LLM 生成 → T6 评估 → 不达标时 T1 Mirror 生成改进变体 / T2 Prism 多视角重构 → 返回最优版本。

## Mobile Server（端口 8897）

三模式智能引擎：本机自学习推理（默认免费） / LLM 增强（可选） / 引擎合成（最低保障）。集成 TF-IDF 语义检索、自学习知识库、后台训练管道及 T1-T6 全引擎。

## 多智能体框架

| 组件 | 说明 |
|-----|------|
| Orchestrator | 工作流引擎：plan → delegate → execute → review → synthesize |
| Consensus | 多智能体共识达成机制 |
| Parliament | 议会辩论式决策 |
| Memory Bank | 跨会话记忆持久化 |
| Task Decomposer | 复杂任务自动拆解分配 |
| Message Bus | 智能体间消息路由 |
| Post Mortem | 任务完成后的事后分析报告 |

## 上下文感知记忆系统

一体化记忆管道，集成 AutoLearner + MemorySystem + KnowledgeGraph + UserProfile：

- 双向自动学习：从用户提问和 AI 回复中提取知识
- 短期/长期记忆交织，跨会话持久化
- 知识图谱自动建边，联想推理
- 用户画像：逐步构建兴趣领域、知识水平、风格偏好
- 可配置的学习开关和管道参数

## 应用引擎（17 个模块）

| 引擎 | 文件 | 功能 |
|-----|------|------|
| Search | `search.py` | 搜索增强 |
| RAG | `rag.py` | 检索增强生成 |
| Think | `think.py` | 深度推理与思考 |
| Creative | `creative.py` | 创意生成 |
| Bias | `bias.py` | 偏见检测 |
| Memory | `memory.py` | 记忆管理 |
| Code Interpreter | `code_interpreter.py` | 代码解释与执行 |
| Contradiction | `contradiction.py` | 矛盾检测 |
| Sentiment | `sentiment.py` | 情感分析 |
| Translator | `translator.py` | 翻译引擎 |
| Reasoning | `reasoning.py` | 推理链 |
| Multimodal | `multimodal.py` | 多模态处理 |
| Summarizer | `summarizer.py` | 摘要生成 |
| Topic Model | `topic_model.py` | 主题建模 |
| Files | `files.py` | 文件处理 |
| Synthesis | `synthesis.py` | 知识综合 |
| Pipeline | `pipeline.py` | 引擎编排管道 |

## 本地推理引擎 v8.1

双六层智能管线 + 23 模块协同 + 自进化循环。

前六层（感知/响应）：情感感知 → 突显网络 → 加速缓存 → 意图澄清 → 阅读理解 → CEE 合成
后六层（认知/学习）：记忆召回 → 用户画像 → 知识图谱 → 知识库检索 → 规则模板 → 元认知

自进化模块：自动学习器、反馈学习器、反思引擎、梦境巩固器、概念融合、相变检测、字典组装、反事实推理。

## 当前实现状态

| 组件 | 状态 | 说明 |
|-----|------|------|
| T6 InvariantEngine (Engineering) | 就绪 | 工程近似公式，轻量快速 |
| T6 InvariantTheoretical | 就绪 | 严格遵循文档公式的理论版 |
| T1 MirrorEngine (Real) | 就绪 | 路标提取 + 镜像生成 + 差异纯化 |
| T2 Prism | 就绪 | 超图坍缩生成多视角，可追溯率验证 |
| T3 Geodesic | 就绪 | 代码/文本流形上的测地线导航 |
| T4 Crystallization | 就绪 | 知识碎片融合结晶，涌现关联检测 |
| T5 Genesis | 就绪 | 反事实分枝生长 + 杂交实验 |
| T6 (双轨制) | 就绪 | InvariantEngineering（工程版）+ InvariantTheoretical（理论版） |
| Closed-Loop Controller | 就绪 | 评估 → 优化 → 迭代骨架 + T1-T5 真实引擎集成 |
| CEE Chat | 就绪 | LLM 代理 + T6 评估 → 低分自动重写闭环（T1/T2 引擎优化） |
| Mobile Server | 就绪 | 三模式推理（本地 / LLM / 引擎合成） |
| REST API | 就绪 | 7 个端点 |
| 多智能体框架 | 就绪 | 编排器 + 共识 + 议会 + 记忆银行 + 任务分解 + 消息总线 |
| 上下文记忆系统 | 就绪 | 自动学习 + 知识图谱 + 用户画像一体化管道 |
| 应用引擎 | 就绪 | 17 个专用引擎（search/rag/think/creative/bias/memory 等） |
| 本地推理引擎 | 就绪 | v8.1 双六层管线 + 23 模块 + 自进化 |
| 治理体系 | 就绪 | 六层全实现（宪章/决策日志/知识遗产/治理模型/SafeMode/单人保障） |
| 单元测试 | 1087/1087 通过 | 全模块覆盖 |
| 集成测试 | 就绪 | 端到端闭环测试 + T6 双轨制对比 + T1 独立优化 |

## 版本映射：文档公式 vs 代码实现

| 不变量 | 文档公式 | 工程版 (InvariantEngineering) | 理论版 (InvariantTheoretical) |
|--------|---------|---------------------------|---------------------------|
| ITC | (C/C_random) / (L/L_random) | 1 - (冗余度 × 基尼系数) | 基于 networkx 图论精确计算 |
| SCS | -log(Σ|Δκ_i|/n) | 余弦相似度均值 × (1-std/2) | 文本曲率序列差分计算 |
| IEC | exp(-|H-H_crit|/σ) | 分段线性 [3.5, 6.5] = 1.0 | 指数衰减形式 |
| PFFT | Fidelity × Freedom | 2×P×D/(P+D) 谐波均值 | 2×F×D/(F+D) 谐波均值 |

## 闭环优化路径

```
用户输入 → LLM 生成
    ↓
T6 评估 (工程版或理论版)
    ↓
评分 < 阈值？
    ├─ ITC低 → T2 Prism 多视角重构
    ├─ SCS低 → LLM 过渡平滑化
    ├─ IEC低 → T5 Genesis 复杂度调节
    ├─ PFFT低 → T1 Mirror 认知同构重写
    ├─ T-engine 改进 → 直接替换内容
    └─ 无 → 通过
    ↓
返回最优版本
```

## 运行测试

```bash
# 单元测试
pytest tests/test_all.py -v

# 集成测试
pytest tests/test_integration.py -v

# 全部测试
pytest tests/ -v
```

## 许可证

MIT
