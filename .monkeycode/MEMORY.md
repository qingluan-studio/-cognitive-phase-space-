# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

### 构建与测试命令
- Date: 2026-07-09
- Context: Agent 在开发 CEE v2.0/v2.1 时发现
- Category: 构建方法|测试方法
- Instructions:
  - 运行新系统测试: `PYTHONPATH=/tmp/cee_repo/src python3 -m pytest /tmp/cee_repo/tests/test_v2_1_systems.py -v`
  - 运行全量回归测试: `PYTHONPATH=/tmp/cee_repo/src python3 -m pytest /tmp/cee_repo/tests/`
  - 单独运行某测试类: `PYTHONPATH=/tmp/cee_repo/src python3 -m pytest /tmp/cee_repo/tests/test_v2_systems.py::TestMessageBus -v`
  - 当前全量回归测试共 395 项 (原有54 + 对抗65 + v2.0 180 + v2.1 96)

### 工作目录与仓库
- Date: 2026-07-09
- Context: Agent 在执行所有 CEE 项目开发任务时确认
- Category: 环境配置
- Instructions:
  - 项目根目录: `/tmp/cee_repo/`
  - 源码目录: `/tmp/cee_repo/src/cee/`
  - GitHub remote: `https://github.com/qingluan-studio/-cognitive-phase-space-`
  - 当前版本: 2.1.0
  - Git 凭据助手 (`git credential fill`): 经常返回 500 错误，导致无法推送
  - 已设置 crontab 每分钟尝试推送: `* * * * * cd /tmp/cee_repo && git push origin main`
  - 提交格式: 中文描述 + 英文 commit message title

### threading.Lock 死锁陷阱
- Date: 2026-07-09
- Context: Agent 在开发 performance/ 和 output/ 模块时发现多个 Lock 死锁
- Category: 排错调试
- Instructions:
  - CEE 项目中所有模块的 `stats()` 方法和其他可能嵌套调用的方法必须使用 `threading.RLock()` 而非 `threading.Lock()`
  - 典型案例: `SpeedOutput.stats()` 在持有锁时调用 `self.average_speed()`，后者也获取同一把锁 → 死锁
  - 典型案例: `FileSaver.stats()` 在持有锁时读取 `self.last_saved` 属性，后者也获取锁 → 死锁
  - 排查方法: 测试超时且无堆栈信息往往就是死锁，检查 `stats()` 方法内是否调用了其他带锁方法

### MessageBus 参数顺序
- Date: 2026-07-09
- Context: Agent 在调试 test_topic_subscription 失败时发现
- Category: 排错调试
- Instructions:
  - `MessageBus.subscribe_topic(agent_id, topic)` — agent_id 在前，topic 在后
  - `MessageBus.publish(topic, message)` — topic 在前，message 在后
  - 错误调用 `subscribe_topic("events", "agent1")` 会导致 topic 和 agent_id 对调

### Python defaultdict 注意事项
- Date: 2026-07-09
- Context: Agent 在修复 MessageBus.publish 时发现
- Category: 排错调试
- Instructions:
  - `defaultdict(set).get(key, set())` 不触发 default_factory，需直接用 `dict[key]` 语法
  - 或用 `self._topics[topic]` 替代 `self._topics.get(topic, set())` 确保自动初始化

### TaskDecomposer 依赖链顺序
- Date: 2026-07-09
- Context: Agent 在修复 v2.0 测试时发现
- Category: 排错调试
- Instructions:
  - `_merge_minor_tasks()` 必须先于依赖关系赋值执行
  - 原因: 合并会删除任务，若先设了依赖再合并，依赖会指向不存在的 task_id
  - 正确顺序: 创建 tasks → 合并 → 设置 `tasks[i].dependencies = [tasks[i-1].task_id]` → 验证 DAG

### 用户功能需求
- Date: 2026-07-09
- Context: 用户提出 CEE 后续更新需求
- Instructions:
  - 每一分钟自动推送一次代码到 GitHub
  - 需要快速响应、极速理解、极速输出能力
  - 需要多模态处理（图像/音频/视频/表格）
  - 需要 Kimi 大模型集成
  - 需要自我配置、自我部署（cloud/auto_config.py 已有基础）
  - 需要自创可行新知（knowledge/ 已实现 KnowledgeSynthesizer）
  - 需要大量知识存储（knowledge/MassiveBrain 已实现）
  - 输出文件可保存（output/FileSaver 已实现）
  - 回答可复制（output/CopyableFormatter 已实现）
  - 回答灵活不死板（output/AdaptiveResponder 含 6 种风格自适应）
