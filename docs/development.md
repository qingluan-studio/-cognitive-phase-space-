# CEE 认知涌现引擎 — 开发指南

## 环境搭建

### 系统要求

- Python 3.10+
- pip（Python 包管理器）

### 安装依赖

```bash
pip install -e .
```

主要依赖:
- `fastapi` + `uvicorn`: Web 框架
- `httpx`: HTTP 客户端（LLM 增强模式）
- `pydantic`: 数据校验
- `pyyaml`: YAML 配置支持

### 验证环境

```bash
PYTHONPATH=src python3 -c "from cee.app.mobile_server import app; print('OK')"
```

---

## 项目结构

```
/tmp/cee_repo/
├── docs/                        # 项目文档
│   ├── api.md                   # API 参考
│   ├── architecture.md          # 架构设计
│   ├── user_guide.md            # 用户指南
│   └── development.md           # 开发指南
├── src/
│   └── cee/
│       ├── __init__.py
│       ├── app/                 # 核心应用
│       │   ├── __init__.py
│       │   ├── mobile_server.py # FastAPI 服务主文件
│       │   ├── chat_backend.py  # 聊天后端逻辑
│       │   ├── api/             # API 层
│       │   │   ├── __init__.py
│       │   │   ├── router.py    # 路由定义
│       │   │   └── middleware.py # 中间件
│       │   ├── core/            # 核心基础设施
│       │   │   ├── __init__.py
│       │   │   ├── config.py    # 配置管理
│       │   │   ├── cache.py     # 缓存系统
│       │   │   ├── database.py  # 数据库
│       │   │   ├── rate_limit.py # 限流器
│       │   │   └── logging_setup.py
│       │   ├── engine/          # 引擎层
│       │   │   ├── __init__.py
│       │   │   ├── search.py    # 搜索引擎
│       │   │   ├── rag.py       # RAG 引擎
│       │   │   ├── think.py     # 深度思考
│       │   │   ├── creative.py  # 创意合成
│       │   │   ├── bias.py      # 偏差检测
│       │   │   ├── memory.py    # 记忆系统
│       │   │   ├── files.py     # 文件处理
│       │   │   ├── summarizer.py # 摘要引擎
│       │   │   ├── sentiment.py # 情感分析
│       │   │   ├── topic_model.py # 主题模型
│       │   │   ├── reasoning.py # 推理引擎
│       │   │   ├── translator.py # 翻译引擎
│       │   │   ├── code_interpreter.py # 代码解释
│       │   │   ├── multimodal.py # 多模态
│       │   │   ├── contradiction.py # 矛盾检测
│       │   │   ├── pipeline.py  # 管线编排
│       │   │   ├── synthesis.py # 综合合成
│       │   │   └── agent.py     # 智能体引擎
│       │   ├── models/          # 数据模型
│       │   │   ├── __init__.py
│       │   │   └── schemas.py   # Pydantic/数据类
│       │   ├── utils/           # 工具函数
│       │   │   ├── __init__.py
│       │   │   ├── text.py      # 文本处理
│       │   │   ├── web.py       # Web 工具
│       │   │   └── async_utils.py # 异步工具
│       │   ├── plugins/         # 插件系统
│       │   │   ├── __init__.py
│       │   │   └── loader.py    # 插件加载器
│       │   ├── knowledge/       # 知识管理
│       │   │   ├── __init__.py
│       │   │   ├── base.py      # 知识库基类
│       │   │   └── curator.py   # 知识策展
│       │   ├── monitor/         # 监控
│       │   │   ├── __init__.py
│       │   │   ├── health.py    # 健康检查
│       │   │   └── metrics.py   # 指标收集
│       │   └── frontend/        # 前端静态文件
│       ├── agent/               # Agent 框架
│       ├── core/                # 核心控制器
│       ├── engine/              # T1-T6 认知引擎
│       ├── learning/            # 学习模块
│       ├── plugin/              # 旧插件系统
│       ├── sandbox/             # 沙箱
│       └── sdk/                 # SDK
├── tests/                       # 测试
├── docker/                      # Docker 配置
├── scripts/                     # 辅助脚本
└── pyproject.toml               # 项目配置
```

---

## 开发流程

### 1. 创建功能分支

```bash
git checkout -b 260710-feat-my-feature
```

### 2. 开发与测试

```bash
# 开发过程中随时验证导入
PYTHONPATH=src python3 -c "from cee.app.engine.my_module import *"

# 启动服务
PYTHONPATH=src python3 -c "from cee.app.mobile_server import main; main()"
```

### 3. 代码检查

```bash
# 运行测试
python3 -m pytest tests/ -v
```

### 4. 提交

遵循约定式提交:

```
feat(engine): add new synthesis engine
fix(core): resolve cache key collision
docs(api): update endpoint documentation
refactor(utils): extract async helpers
```

---

## 添加新引擎模块

### 步骤 1: 创建模块文件

在 `src/cee/app/engine/` 下创建 `my_engine.py`:

```python
"""
我的引擎 — 功能描述
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MyResult:
    output: str = ""
    score: float = 0.0


class MyEngine:
    """我的引擎

    Usage:
        engine = MyEngine()
        result = engine.process("input text")
    """

    def __init__(self, param: str = "default"):
        self.param = param

    def process(self, text: str) -> MyResult:
        # 核心逻辑
        processed = f"[{self.param}] {text.upper()}"
        return MyResult(output=processed, score=0.85)
```

### 步骤 2: 注册导出

在 `src/cee/app/engine/__init__.py` 中添加:

```python
from cee.app.engine.my_engine import MyEngine, MyResult
```

### 步骤 3: 验证导入

```bash
PYTHONPATH=/tmp/cee_repo/src python3 -c "from cee.app.engine.my_engine import MyEngine; print(MyEngine().process('test'))"
```

---

## 添加新插件

### 创建插件

```python
# src/cee/app/plugins/my_plugin.py
from cee.app.plugins.loader import register_plugin

@register_plugin(
    name="weather_lookup",
    version="1.0.0",
    plugin_type="tool",
    description="查询天气信息"
)
class WeatherPlugin:
    def execute(self, input_data: dict) -> dict:
        city = input_data.get("city", "北京")
        return {"city": city, "temperature": "22°C"}
```

### 在 API 中使用插件

```python
from cee.app.plugins.loader import get_plugin

plugin = get_plugin("weather_lookup")
if plugin:
    result = plugin.execute({"city": "上海"})
```

---

## 测试指南

### 运行全部测试

```bash
python3 -m pytest tests/ -v
```

### 运行特定测试

```bash
python3 -m pytest tests/test_v2_2_systems.py -v
```

### 编写测试

```python
# tests/test_my_engine.py
import sys
sys.path.insert(0, "src")

def test_my_engine_basic():
    from cee.app.engine.my_engine import MyEngine
    engine = MyEngine()
    result = engine.process("hello")
    assert result.score >= 0.0
    assert len(result.output) > 0
```

### 测试覆盖目标

- 单元测试覆盖率 > 80%
- 每个引擎模块至少一个基础功能测试
- API 端点的请求/响应格式测试

---

## 代码规范

### 命名约定

| 类型 | 风格 | 示例 |
|------|------|------|
| 模块/包 | snake_case | `rate_limit.py` |
| 类 | PascalCase | `TokenBucket` |
| 函数/方法 | snake_case | `consume_tokens()` |
| 变量 | snake_case | `max_size` |
| 常量 | UPPER_SNAKE | `MAX_SIZE` |
| 私有成员 | 前缀 `_` | `_lock` |

### 文档字符串

使用三重双引号，包含:
1. 功能简述
2. 主要特性列表
3. 使用示例

### 导入顺序

```python
from __future__ import annotations

# 标准库
import json
import time

# 第三方库
from fastapi import FastAPI

# 本地模块
from cee.app.core.config import ConfigLoader
```

### 类型标注

所有公开函数必须包含类型标注:

```python
def process(self, text: str, options: dict | None = None) -> dict[str, Any]:
    ...
```

---

## 提交规范

### 提交消息格式

```
<type>(<scope>): <subject>

[body]
```

类型:
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

### 示例

```
feat(engine): add pipeline orchestrator for multi-engine execution

Add PipelineOrchestrator class with support for:
- Configurable pipeline definitions
- Parallel execution of independent steps
- Conditional execution based on previous results
- Step-level timing and status tracking
```
