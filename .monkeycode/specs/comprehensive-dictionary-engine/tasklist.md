# 需求实施计划

- [ ] 1. 创建 dicts/ 子包并实现四本新字典
  - [ ] 1.1 实现 CharacterDictionary (CJK 基本区 20992 + 扩展A 6592 汉字)
    - 文件: `src/cee/app/local_llm/dicts/__init__.py`, `src/cee/app/local_llm/dicts/character_dict.py`
    - 每条条目: {char, unicode_codepoint, stroke_count, radical, embedding(64d), weight, frequency_rank}
    - 懒加载: 首次访问时从 disk 加载, 模块级锁保护
    - 存储: MessagePack 压缩二进制, 每区一个文件
    - 三层索引: 部首笔画 + 拼音首字母 + UTF-8 字节前缀
    - 引用: requirements R1
  - [ ] 1.2 实现 SymbolDictionary (CJK符号, 全角标点, 笔划)
    - 文件: `src/cee/app/local_llm/dicts/symbol_dict.py`
    - 范围: U+3000-U+303F, U+FF00-U+FFEF, U+31C0-U+31EF
    - 模糊匹配: `_fuzzy_match("（") == "("` 中英括号互转
    - 引用: requirements R2
  - [ ] 1.3 实现 CodeDictionary (Python/JS/C/Rust/Go/Bash 六语言)
    - 文件: `src/cee/app/local_llm/dicts/code_dict.py`
    - 符号表: 运算符 + 关键字 + 内置函数 (~600 条)
    - 模式模板: 100+ 模板 × 3~5 变体 (~400 条)
    - 引用: requirements R3
  - [ ] 1.4 实现 EmotionDictionary (6 种核心情感 × 3 级强度)
    - 文件: `src/cee/app/local_llm/dicts/emotion_dict.py`
    - 情感: 好奇/困惑/沮丧/兴奋/疲惫/中性
    - 检测: 关键词 + 否定词 + 句式模式三重匹配
    - 与已有 AffectEngine 集成, 不重复实现
    - 引用: requirements R4

- [ ] 2. 实现 CompositedDictionaryEngine 统一字典管理
  - 文件: `src/cee/app/local_llm/composited_dict.py`
  - 整合 4 本新字典 + 旧 5 本字典 (除旧感情字典被新 EmotionDictionary 替代)
  - 接口: `query(intent, fragments) -> list[DictFragment]`, `assemble(fragments) -> str`, `recalibrate_weights()`
  - FragmentRanker: 按相关性 + 新颖性 + 多样性三维排序
  - 引用: design 6.1

- [ ] 3. 创建 DictionaryInferencePipeline 字典推理流水线
  - 文件: `src/cee/app/local_llm/inference_pipeline.py`
  - 流程: IntentDetect → CompositedDict.query → Ranker → Assembler → T6 Gate → Retry/Dedup
  - assembly hash 去重 (SHA-256 前 8 字节, LRU 2000)
  - 3 次重试后退回最佳结果
  - 引用: requirements R5

- [ ] 4. 创建 SelfDialogueSimulator 自模拟对话生成器
  - 文件: `src/cee/app/local_llm/self_dialogue.py`
  - 从 9 本字典随机 pick 2-3 条种子生成 query
  - 8 种 query 类别: explain/code/emotion/logic/creative/translate/compare/chat
  - 质量门控: composite >= 0.65 存 KnowledgeStore, < 0.50 丢弃, 0.50-0.65 缓存
  - query 去重: 3 条 LRU 历史
  - 引用: requirements R6

- [ ] 5. 创建 BackgroundLearningDaemon 后台学习守护进程
  - 文件: `src/cee/app/local_llm/learning_daemon.py`
  - 扩展已有 AutoTrainer, 加入自模拟循环
  - 调度 20 分钟一轮: 10min 模拟 → 2min 去重 → 3min 权重重校准 → 5min 冷却
  - CPU 感知: > 70% 暂停, < 30% 恢复
  - 每日学习报告输出到 `.cee_storage/learning_report.json`
  - 引用: requirements R7

- [ ] 6. 创建 RealtimeDataTracker 实时数据持久化
  - 文件: `src/cee/app/local_llm/data_tracker.py`
  - 原子写入: write temp file → os.rename
  - 变更日志: `.cee_storage/dicts/_changelog.jsonl` 每行一条 mutation
  - 自动保存: 每 100 次 assembly 或每 60 秒
  - 每日快照: 零时自动创建, 保留 7 天
  - 引用: requirements R8

- [ ] 7. 集成接入本地推理引擎与前端服务
  - [ ] 7.1 修改 LocalInferenceEngine.chat() 使用 DictionaryInferencePipeline
    - 文件: `src/cee/app/local_llm/local_inference.py`
    - 保留现有 LLM API 路径, 在无 API 模式下 fallback 到字典推理
  - [ ] 7.2 修改 LocalInferenceEngine.__init__ 初始化新增组件
    - 文件: `src/cee/app/local_llm/local_inference.py`
    - 加入: CompositedDictionaryEngine, SelfDialogueSimulator, LearningDaemon, DataTracker
  - [ ] 7.3 修改 mobile_server.py 启动时初始化 LearningDaemon + DataTracker
    - 文件: `src/cee/app/mobile_server.py`
    - 生命周期事件中 start/stop daemon
  - [ ] 7.4 更新 `__init__.py` 导出新增模块
    - 文件: `src/cee/app/local_llm/__init__.py`
    - 导出: CompositedDictionaryEngine, DictionaryInferencePipeline, SelfDialogueSimulator, LearningDaemon, RealtimeDataTracker

- [ ] 8. 检查点 — 确保所有测试通过
  - 运行: `PYTHONPATH=/workspace/src python3 -m pytest tests/ -q`
  - 确保 2002+ tests passed
  - 如有疑问请询问用户
