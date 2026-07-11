# CEE 认知涌现引擎 — 用户指南

## 快速开始

### 启动服务

```bash
cd /tmp/cee_repo
PYTHONPATH=src python3 -c "from cee.app.mobile_server import main; main()"
```

服务默认运行在 `http://localhost:8897`。

### 验证服务

```bash
curl http://localhost:8897/api/health
```

---

## 基本聊天

### Web 界面

打开浏览器访问 `http://localhost:8897`，进入 Mobile UI，直接在输入框输入问题即可。

### API 调用

```python
import requests

resp = requests.post("http://localhost:8897/api/chat", json={
    "messages": [{"role": "user", "content": "什么是认知涌现？"}],
    "session_id": "my_session"
})
print(resp.json()["content"])
```

### 两种聊天模式

1. **引擎合成模式**（默认）: 不提供 `api_key`，系统使用 T1-T6 全部引擎合成回复
2. **LLM 增强模式**: 提供 `api_key` 和 `base_url`，系统调用 OpenAI 兼容 API 并附加 CEE 评估

---

## 联网搜索

在引擎合成模式下，知识库会自动匹配用户提问中的关键词，返回相关知识条目。

知识库覆盖以下领域:

- 认知涌现理论 (T1-T6)
- 免费开源替代方案
- AI/ML 技术栈
- 软件开发方法论
- 项目宪章原则

---

## 文件上传和处理

CEE 引擎支持多格式文件处理:

| 格式 | 解析能力 |
|------|---------|
| PDF | 全文提取 + 分块 |
| DOCX | Word 文档解析 |
| CSV | 表格数据导入 |
| XLSX | Excel 电子表格 |
| 图片 | OCR 文字提取 |
| 代码文件 | 语法高亮 + 结构分析 |

```python
response = requests.post("http://localhost:8897/api/files/upload",
    files={"file": open("document.pdf", "rb")})
```
---

## 深度思考模式

在请求中设置 `deep_think: true` 启用深度思考模式。

深度思考模式会:
1. 展示 T1-T6 管线内各引擎的中间处理结果
2. 对用户输入进行 T6 认知评估
3. 从"认知维度""逻辑维度""语义维度"多角度分析

```json
{
  "messages": [{"role": "user", "content": "量子计算会如何改变密码学"}],
  "deep_think": true
}
```

---

## 创意合成

使用创意合成引擎进行跨领域知识融合和创新生成。

### 概念关联图

构建领域间概念网络，发现隐藏关联:
```
量子计算 ←→ 密码学 ←→ 数学 ←→ 信息论 ←→ 生物信息学
```

### SCAMPER 创新方法

- **S**(Substitute) 替代: 用新组件替换现有方案
- **C**(Combine) 组合: 融合两个不相关领域
- **A**(Adapt) 适应: 借鉴其他领域解决方案
- **M**(Modify) 修改: 改变方案的部分属性
- **P**(Put to other use) 他用: 寻找新应用场景
- **E**(Eliminate) 消除: 简化到最核心
- **R**(Rearrange) 重排: 重新组织元素

### 类比推理

从源领域映射到目标领域:

```
源领域: 蜂群智能 → 分布式决策
目标领域: 蚁群算法 → 物流路径优化
类比: 群体智能在物流中的应用
```

---

## 知识库管理

### 查看知识库内容

```bash
curl http://localhost:8897/api/governance/legacy?limit=20
```

### 添加知识条目

```bash
curl -X POST http://localhost:8897/api/governance/legacy \
  -H "Content-Type: application/json" \
  -d '{"event": "新知识条目", "detail": "详细内容", "category": "knowledge"}'
```

### 知识库自动检索

引擎合成模式下，系统自动根据用户提问的关键词匹配知识库条目。

---

## 会话管理

### 创建新会话

```bash
curl -X POST http://localhost:8897/api/sessions/new
```

返回:
```json
{"session_id": "a1b2c3d4e5f6"}
```

### 查看所有会话

```bash
curl http://localhost:8897/api/sessions
```

### 查看指定会话

```bash
curl http://localhost:8897/api/sessions/a1b2c3d4e5f6
```

### 删除会话

```bash
curl -X DELETE http://localhost:8897/api/sessions/a1b2c3d4e5f6
```

---

## 设置说明

### LLM 增强模式配置

在聊天请求中配置 LLM 参数:

```json
{
  "api_key": "sk-your-openai-key",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-4o-mini",
  "temperature": 0.7
}
```

支持的 LLM 提供商:
- OpenAI (GPT-4 / GPT-3.5)
- 任何 OpenAI 兼容 API (Ollama, vLLM, LM Studio 等)

### 引擎 T6 阈值配置

T6 评估等级阈值可通过环境变量调整:

```bash
export CEE_ENGINE__INVARIANT__S_THRESHOLD=0.92
export CEE_ENGINE__INVARIANT__A_THRESHOLD=0.82
export CEE_ENGINE__INVARIANT__B_THRESHOLD=0.72
```

---

## 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息 |
| `Shift+Enter` | 换行 |
| `Ctrl+N` | 新建会话 |
| `Ctrl+/` | 切换深度思考模式 |
| `Esc` | 取消当前操作 |

---

## 常见问题

### Q: 引擎合成模式和 LLM 增强模式有什么区别？

引擎合成模式完全基于本地 CEE 引擎管线（T1-T6）生成回复，无需外部 API 调用，完全免费。LLM 增强模式调用外部大模型 API 生成回复，并用 T6 引擎评估质量。

### Q: 如何添加自定义知识？

通过 API 添加:

```bash
curl -X POST http://localhost:8897/api/governance/legacy \
  -H "Content-Type: application/json" \
  -d '{"event": "分类", "detail": "知识内容", "category": "knowledge"}'
```

### Q: 支持哪些文件格式？

PDF、DOCX、CSV、XLSX、图片文件（JPG/PNG）和常见代码文件。

### Q: T6 评估的各指标是什么含义？

- **ITC** (拓扑连接度): 概念间连接的密度和有序程度
- **SCS** (截面曲率光滑性): 推理路径的流畅程度
- **IEC** (信息熵临界度): 信息量是否处于混沌边缘
- **PFFT** (保真度投影): 忠实度与独创性的平衡

### Q: 如何查看服务运行状态？

```bash
curl http://localhost:8897/api/system/status
```

### Q: 支持流式输出吗？

支持。`/api/chat/stream` 端点使用 SSE (Server-Sent Events) 实现流式输出。

### Q: 如何开发自定义插件？

参考 `docs/development.md` 中的"添加新插件"章节。

### Q: 服务占用的端口可以修改吗？

通过环境变量修改:

```bash
export CEE_SERVER__PORT=8897
```

### Q: 支持并发多少用户？

默认配置下支持数百并发请求，会话上限 100 个。可通过配置调整:

```bash
export CEE_SESSION__MAX_SESSIONS=500
```
