# Cognitive Emergence Engine (CEE)

认知涌现引擎 — 通过六大认知几何引擎（T1-T6）实现文本质量的结构化评估与优化。

## 架构

```
src/cee/
├── core/           # 核心类型、闭环控制器
├── engine/         # T1-T6 六大引擎
│   ├── t1_mirror.py           # 认知同构
│   ├── t2_prism.py            # 超图坍缩
│   ├── t3_geodesic.py         # 测地线导航
│   ├── t4_crystallization.py  # 知识结晶
│   ├── t5_genesis.py          # 反事实生长
│   └── t6_invariant.py        # 认知几何不变量
├── api/            # REST API (FastAPI, 端口 8899)
├── app/            # CEE Chat (FastAPI + Web, 端口 8898)
├── sdk/            # Python 客户端
└── governance/     # 六层治理体系
```

## 快速开始

```bash
pip install -e .
pytest tests/ -v
```

## 当前实现状态

| 组件 | 状态 | 说明 |
|-----|------|------|
| T6 InvariantEngine (Engineering) | 就绪 | 工程近似公式，轻量快速，36项单元测试全过 |
| T6 InvariantTheoretical | 就绪 | 严格遵循文档公式的理论版，与工程版并存 |
| T1 MirrorEngine (Real) | 就绪 | 路标提取 + 镜像生成 + 差异纯化，支持独立文本优化 |
| T2 Prism | 就绪 | 超图坍缩生成多视角，可追溯率验证 |
| T3 Geodesic | 就绪 | 代码/文本流形上的测地线导航 |
| T4 Crystallization | 就绪 | 知识碎片融合结晶，涌现关联检测 |
| T5 Genesis | 就绪 | 反事实分枝生长 + 杂交实验 |
| T6 (双轨制) | 就绪 | InvariantEngineering（工程版）+ InvariantTheoretical（理论版） |
| Closed-Loop Controller | 就绪 | 评估→优化→迭代骨架 + T1真实引擎集成 |
| CEE Chat | 就绪 | LLM代理 + T6评估 → 低分自动重写闭环 |
| REST API | 就绪 | 7个端点 (evaluate/optimize/compare/crystallize/evolve/health) |
| 治理体系 | 就绪 | 六层全实现（宪章/决策日志/知识遗产/治理模型/SafeMode/单人保障） |
| 单元测试 | 36/36 通过 | T6:10, T1:5, T2:3, T3:3, T4:3, T5:4, 闭环:2, 治理:6 |
| 集成测试 | 就绪 | 端到端闭环测试 + T6双轨制对比 + T1独立优化 |

## 版本映射：文档公式 vs 代码实现

| 不变量 | 文档公式 | 工程版 (InvariantEngineering) | 理论版 (InvariantTheoretical) |
|--------|---------|---------------------------|---------------------------|
| ITC | (C/C_random) / (L/L_random) | 1 - (冗余度 × 基尼系数) | 基于networkx图论精确计算 |
| SCS | -log(Σ&#124;Δκ_i&#124;/n) | 余弦相似度均值 × (1-std/2) | 文本曲率序列差分计算 |
| IEC | exp(-&#124;H-H_crit&#124;/σ) | 分段线性 [3.5, 6.5] = 1.0 | 指数衰减形式 |
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
