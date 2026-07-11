# CEE 认知涌现引擎 API 参考

## 基础信息

- 基础地址: `http://localhost:8897`
- 内容类型: `application/json`
- 字符编码: `UTF-8`

---

## 认证

当前版本为开放 API，无需认证即可使用。后续版本将通过 API Key 进行认证：

```
Authorization: Bearer <your-api-key>
```

---

## REST API 端点

### 健康检查

**GET** `/api/health`

响应示例:

```json
{
  "status": "ok",
  "version": "4.0.0",
  "engines": ["T1", "T2", "T3", "T4", "T5", "T6"],
  "uptime": 1234.5,
  "sessions": 12,
  "decisions": 45,
  "legacy_items": 23
}
```

---

### 系统状态

**GET** `/api/system/status`

响应示例:

```json
{
  "engines": {
    "T1_Mirror": "online",
    "T2_Prism": "online",
    "T3_Geodesic": "online",
    "T4_Crystallization": "online",
    "T5_Genesis": "online",
    "T6_Invariant": "online"
  },
  "invariants": {"ITC": 0.87, "SCS": 0.91, "IEC": 0.65, "PFFT": 0.79},
  "tier": "A",
  "uptime_s": 1234.5,
  "decisions_logged": 45,
  "legacy_items": 23,
  "sessions": 12,
  "preview": {"total_tests": 493, "passed": 493, "pass_rate": 1.0}
}
```

---

### T1 认知同构镜

**POST** `/api/t1/mirror`

在原始认知对象与其形式化表征间建立双射映射。

请求:

```json
{
  "text": "人工智能正在改变世界的运作方式",
  "options": {"style_hint": "academic"}
}
```

响应:

```json
{
  "landmarks": [
    {"type": "concept", "content": "人工智能", "position": 0},
    {"type": "keyword", "content": "改变", "position": 2},
    {"type": "keyword", "content": "世界", "position": 4}
  ],
  "mirrored": "人工智能技术正从根本上重塑全球社会的运作范式",
  "equivalence_score": 0.93
}
```

---

### T2 超图坍缩棱镜

**POST** `/api/t2/prism`

将高维语义超图坍缩为多视角低维表征。

请求:

```json
{
  "text": "企业实施数字化转型需要全面的战略规划",
  "options": {"num_views": 5}
}
```

响应:

```json
{
  "perspectives": [
    {"angle": "视角1", "content": "战略层面：顶层设计与愿景", "score": 0.85},
    {"angle": "视角2", "content": "技术层面：基础设施升级", "score": 0.80},
    {"angle": "视角3", "content": "组织层面：文化变革", "score": 0.82},
    {"angle": "视角4", "content": "流程层面：业务再造", "score": 0.78},
    {"angle": "视角5", "content": "人才层面：技能重塑", "score": 0.75}
  ],
  "trace_rate": 0.952
}
```

---

### T3 测地线导航

**POST** `/api/t3/geodesic`

在语义流形上计算最短路径，发现概念间的原子突破。

请求:

```json
{
  "text": "量子计算与人工智能的交叉领域",
  "options": {"num_paths": 3}
}
```

响应:

```json
{
  "paths": [
    {"label": "路径1", "content": "量子加速的机器学习算法...", "novel": false, "distance": 0.35},
    {"label": "路径2", "content": "张量网络与深度学习的映射...", "novel": true, "distance": 0.52},
    {"label": "路径3", "content": "量子纠缠启发的神经网络...", "novel": true, "distance": 0.68}
  ],
  "novel_count": 2,
  "atomic_breakthrough": "量子-经典混合注意力机制"
}
```

---

### T4 知识结晶

**POST** `/api/t4/crystallize`

从非结构化文本中析出有序知识单元。

请求:

```json
{
  "text": "深度学习的基础包括卷积神经网络、循环神经网络和注意力机制。这些架构被广泛应用于计算机视觉、自然语言处理和语音识别等领域。"
}
```

响应:

```json
{
  "crystals": [
    {"id": "c1", "content": "卷积神经网络: 空间特征提取", "score": 0.85},
    {"id": "c2", "content": "循环神经网络: 序列建模", "score": 0.80},
    {"id": "c3", "content": "注意力机制: 上下文关系", "score": 0.78},
    {"id": "c4", "content": "计算机视觉: 图像处理应用", "score": 0.75},
    {"id": "c5", "content": "自然语言处理: 文本理解应用", "score": 0.72}
  ],
  "emergent_associations": ["CNN→图像→视觉", "RNN→序列→语言"],
  "crystal_count": 5
}
```

---

### T5 反事实生长

**POST** `/api/t5/genesis`

通过分支演化生成高适应度的反事实假设。

请求:

```json
{
  "text": "如何提高团队的生产力",
  "options": {"num_branches": 5}
}
```

响应:

```json
{
  "branches": [
    {"id": "b1", "content": "引入敏捷方法论，缩短迭代周期", "fitness": 0.75},
    {"id": "b2", "content": "建立跨职能协作机制", "fitness": 0.72},
    {"id": "b3", "content": "部署自动化工具链减少重复劳动", "fitness": 0.80}
  ],
  "hybrid": {"content": "敏捷+自动化工具链的复合方案", "advantage": 1.42},
  "branch_count": 3
}
```

---

### T6 认知不变量评估

**POST** `/api/t6/evaluate`

通过 ITC/SCS/IEC/PFFT 四个数学不变量评估文本认知质量。

请求:

```json
{
  "text": "认知涌现是指复杂系统中宏观有序行为从微观规则自发产生的现象",
  "options": {"theoretical": false}
}
```

响应:

```json
{
  "itc": 0.87,
  "scs": 0.91,
  "iec": 0.65,
  "pfft": 0.79,
  "tier": "A",
  "suggestions": [],
  "warnings": [],
  "breakdown": {
    "topology": 0.87,
    "smoothness": 0.91,
    "entropy": 0.65,
    "projection": 0.79
  }
}
```

质量等级说明:
- S 级 (>=0.9): 涌现态，出现全新洞察
- A 级 (>=0.8): 优秀，逻辑严密、表达清晰
- B 级 (>=0.7): 良好，基本满足认知质量要求
- C 级 (>=0.5): 可接受，需要优化
- D 级 (<0.5): 需优化，存在显著问题

---

### 闭环优化

**POST** `/api/optimize`

通过闭环控制器自动优化文本质量。

请求:

```json
{
  "text": "需要优化的文本内容",
  "options": {"threshold": 0.7}
}
```

响应:

```json
{
  "original": "需要优化的文本内容",
  "optimized": "优化后的文本内容",
  "scores": {"before": 0.62, "after": 0.85},
  "iterations": 3,
  "converged": true
}
```

---

### 聊天接口（引擎合成 / LLM 增强）

**POST** `/api/chat`

双模式聊天: 引擎合成模式 + LLM 增强模式。

请求:

```json
{
  "messages": [
    {"role": "user", "content": "什么是认知涌现？"}
  ],
  "session_id": "default",
  "api_key": "",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "deep_think": false
}
```

引擎模式响应:

```json
{
  "content": "认知涌现是指复杂认知系统中...",
  "model": "空间引擎",
  "cee_scores": {"itc": 0.87, "scs": 0.91, "iec": 0.65, "pfft": 0.79},
  "cee_tier": "A",
  "knowledge_hits": 1,
  "free_alts": 0,
  "mode": "engine"
}
```

LLM 模式响应:

```json
{
  "content": "GPT 生成的回复...",
  "model": "gpt-4o-mini",
  "cee_scores": {"itc": 0.85, "scs": 0.88, "iec": 0.62, "pfft": 0.76},
  "cee_tier": "A",
  "mode": "llm"
}
```

---

### 项目宪章

**GET** `/api/governance/constitution`

响应:

```json
{
  "title": "认知涌现引擎项目宪章",
  "version": "v4.0",
  "principles": [
    {"id": 1, "name": "数学严谨", "content": "所有结论必须有数学定义或实证支撑"},
    {"id": 2, "name": "客观优先", "content": "不依赖人工标注，AI在几何规则内自主判断质量"},
    {"id": 3, "name": "可验证", "content": "每个主张均可通过独立实验复现"},
    {"id": 4, "name": "结构优先", "content": "好的结构优先于好的内容"},
    {"id": 5, "name": "长期存续", "content": "体系可在创始团队离场后稳定运转"}
  ],
  "invariants": ["ITC 拓扑结构", "SCS 几何路径", "IEC 信息状态", "PFFT 投影质量"]
}
```

---

### 治理日志

**POST** `/api/governance/log`

记录治理决策到日志。

请求:

```json
{
  "event": "优化决策",
  "detail": "T6评估后触发闭环优化",
  "category": "decision",
  "data": {"threshold": 0.7, "iterations": 3}
}
```

**GET** `/api/governance/logs?limit=20`

---

### 知识遗产

**POST** `/api/governance/legacy`

保存关键知识到遗产库。

**GET** `/api/governance/legacy?limit=20`

---

### 会话管理

**GET** `/api/sessions` — 列出所有会话

**POST** `/api/sessions/new` — 创建新会话

**GET** `/api/sessions/{session_id}` — 获取会话详情

**DELETE** `/api/sessions/{session_id}` — 删除会话

---

### 引擎管线 **（新增）**

**POST** `/api/engine/pipeline`

执行预定义或自定义引擎管线。

请求:

```json
{
  "input_text": "量子计算在药物发现中的应用前景如何？",
  "pipeline_name": "deep_research",
  "options": {"cache": true, "parallel": true}
}
```

响应:

```json
{
  "task_id": "abc12345",
  "pipeline": "deep_research",
  "status": "completed",
  "result": {
    "summary": "量子计算在药物发现中...",
    "steps": [
      {"name": "search", "status": "done", "elapsed": 0.45},
      {"name": "think", "status": "done", "elapsed": 1.20},
      {"name": "rag", "status": "done", "elapsed": 0.35},
      {"name": "summarizer", "status": "done", "elapsed": 0.15},
      {"name": "creative", "status": "done", "elapsed": 0.60}
    ],
    "total_elapsed": 2.75
  }
}
```

---

### 综合合成 **（新增）**

**POST** `/api/engine/synthesis`

多引擎融合生成综合输出。

请求:

```json
{
  "query": "全球变暖对经济的影响",
  "sources": ["search", "knowledge_base"],
  "detail_level": "standard",
  "options": {"weighted_fusion": true, "resolve_conflicts": true}
}
```

响应:

```json
{
  "task_id": "synth_001",
  "status": "completed",
  "result": {
    "content": "全球变暖对经济的影响是多维度的...",
    "confidence": 0.85,
    "sources": [
      {"name": "search", "weight": 0.6},
      {"name": "knowledge_base", "weight": 0.4}
    ],
    "resolved_conflicts": 2,
    "citations": [
      {"source": "web", "url": "https://example.com/article1", "text": "..."},
      {"source": "knowledge", "id": "kb_001", "text": "..."}
    ]
  }
}
```

---

### 智能体任务 **（新增）**

**POST** `/api/engine/agent`

提交智能体任务。

请求:

```json
{
  "task": "分析最近半年的AI行业趋势，撰写一份500字的趋势报告",
  "tools": ["search", "sentiment", "summarizer"],
  "options": {"max_sub_tasks": 5, "parallel": true}
}
```

响应:

```json
{
  "task_id": "agent_001",
  "status": "accepted",
  "estimated_time": 15.0
}
```

**GET** `/api/engine/agent/{task_id}`

查询智能体任务状态。

响应:

```json
{
  "task_id": "agent_001",
  "status": "completed",
  "result": {
    "output": "AI行业趋势报告...",
    "sub_tasks": [
      {"id": "st1", "description": "搜索最新AI新闻", "status": "done", "elapsed": 2.3},
      {"id": "st2", "description": "情感分析行业热度", "status": "done", "elapsed": 1.8},
      {"id": "st3", "description": "汇总撰写报告", "status": "done", "elapsed": 3.5}
    ],
    "total_elapsed": 7.6
  }
}
```

---

## SSE 流式接口

### 流式聊天

**POST** `/api/chat/stream`

使用 Server-Sent Events 进行流式输出。

请求格式与 `/api/chat` 一致。

SSE 事件类型:

| 类型 | 说明 |
|------|------|
| `thinking` | 思考过程提示 |
| `step` | 执行步骤状态 (`running` / `done`) |
| `token` | 流式文本令牌 |
| `cee` | CEE 认知评估结果 |
| `error` | 错误信息 |
| `done` | 流结束 |

示例 SSE 事件流:

```
event: step
data: {"type":"step","step":"T2 超图坍缩","status":"running"}

event: thinking
data: {"type":"thinking","content":"T2 超图坍缩: 正在处理..."}

event: token
data: {"type":"token","content":"认知涌现"}

event: cee
data: {"type":"cee","scores":{"itc":0.87,"scs":0.91,"iec":0.65,"pfft":0.79},"tier":"A","mode":"engine"}

event: done
data: {"type":"done"}
```

---

## 错误码表

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | `bad_request` | 请求参数无效 |
| 404 | `not_found` | 资源不存在（如会话） |
| 405 | `method_not_allowed` | 不支持的 HTTP 方法 |
| 422 | `validation_error` | 请求体格式校验失败 |
| 429 | `rate_limited` | 触发限流 |
| 500 | `internal_error` | 服务器内部错误 |
| 503 | `service_unavailable` | 引擎不可用 |

错误响应格式:

```json
{
  "error": true,
  "code": "rate_limited",
  "message": "请求频率超过限制，请稍后重试",
  "status_code": 429,
  "timestamp": "2026-07-10T12:00:00Z",
  "path": "/api/chat",
  "details": []
}
```

---

## 限流策略

系统采用令牌桶算法进行限流，维度如下:

| 维度 | 默认速率 | 突发容量 |
|------|---------|---------|
| 全局默认 | 60 req/min | 10 |
| 每 IP | 100 req/min | 20 |
| 每用户 | 300 req/min | 50 |
| `/api/t6/evaluate` | 30 req/min | 5 |
| `/api/optimize` | 20 req/min | 3 |
| 搜索类端点 | 60 req/min | 10 |

限流响应头:
- `X-RateLimit-Limit`: 速率限制
- `X-RateLimit-Remaining`: 剩余请求数
- `X-RateLimit-Reset`: 重置时间（Unix 时间戳）
- `Retry-After`: 建议重试等待秒数
