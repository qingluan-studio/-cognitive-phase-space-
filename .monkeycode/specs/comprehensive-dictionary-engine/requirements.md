# Requirements Document

## Introduction

构建"全字符字典自学习引擎"，将全体汉字、汉字符号、编程代码符号、用户情感状态编码为唯一标识的字典条目，嵌入CEE认知引擎。引擎在无外部API依赖下自行组装字典碎片生成回复，并通过自模拟对话进行自主学习和进化。后台持续运行，关闭浏览器仍可学习（每日最长六小时）。

## Glossary

- **CEE**: Cognitive Emergence Engine，认知涌现引擎
- **字典(Dictionary)**: 编码后的字符/符号/情感条目及其元数据的结构化集合
- **字典碎片(Dictionary Fragment)**: 单条字典条目的权重表示，可被引擎检索和拼装
- **自组装(Self-Assembly)**: 引擎根据意图检索相关字典碎片，通过加权随机组合生成回复
- **自模拟对话(Self-Simulation)**: 引擎自主生成提问并自答，形成训练循环，无需人工输入
- **LocalInferenceEngine**: 已有的零API本地推理引擎
- **DictionaryAssembler**: 已有的六本字典组装引擎
- **AutoTrainer**: 已有的后台自学习训练线程

## Requirements

### Requirement 1: 全量汉字字符字典

**User Story:** AS 系统架构师, I want 全体CJK统一汉字编码进字典, so that 引擎能覆盖完整的中文语义空间。

#### Acceptance Criteria

1. The system SHALL encode all CJK Unified Ideographs (U+4E00 - U+9FFF, 20992 characters) into dictionary entries.
2. The system SHALL encode all CJK Unified Ideographs Extension A (U+3400 - U+4DBF, 6592 characters).
3. Each dictionary entry SHALL contain: the character itself, its unicode codepoint, a compact semantic embedding (64维TF-IDF向量), and weight.
4. The dictionary SHALL be stored as a compressed binary format with lazy-loading (按需加载, 首次用时读入内存).
5. IF a character lookup fails for valid CJK range, the system SHALL generate a on-the-fly fallback entry.

### Requirement 2: 汉字符号与标点字典

**User Story:** AS 用户, I want 中文标点和符号编码进字典, so that 引擎理解完整的句子结构和语气。

#### Acceptance Criteria

1. The system SHALL encode all CJK Symbols and Punctuation (U+3000 - U+303F).
2. The system SHALL encode all Fullwidth Forms (U+FF00 - U+FFEF) relevant to Chinese.
3. The system SHALL encode all CJK Strokes (U+31C0 - U+31EF).
4. Each symbol entry SHALL include symbol name, category (标点/括号/连接符/序号), and common usage contexts.
5. The symbol dictionary SHALL support fuzzy matching with base ASCII equivalents (e.g. "(" matches both "(" and "（").

### Requirement 3: 编程代码符号字典

**User Story:** AS 开发者, I want 编程语言符号和代码模式编码进字典, so that 引擎能以代码片段形式回应编程问题。

#### Acceptance Criteria

1. The system SHALL encode programming symbols from Python, JavaScript, C, Rust, Go, and Bash.
2. The system SHALL encode operators (算术/比较/逻辑/位运算/赋值), delimiters, keywords, and common library APIs as dictionary entries.
3. Each code symbol entry SHALL include: symbol, language category, rank-frequency weight, and 1-3 code context examples.
4. The system SHALL encode 100+ code pattern templates (sort/filter/map/reduce/async/class/error handling) with 3-5 variants each.
5. WHEN user query intent is "code", the system SHALL prioritize code-pattern dictionary over general dictionary during assembly.

### Requirement 4: 用户情感状态字典

**User Story:** AS 对话者, I want 用户情感变化编码进字典, so that 引擎能感知和回应用户的情绪状态。

#### Acceptance Criteria

1. The system SHALL encode 6 core emotion categories: 好奇/困惑/沮丧/兴奋/疲惫/中性.
2. Each emotion entry SHALL contain: emotion name, intensity vector [0-1], 5-10 tone-response templates, and association weights to other emotions.
3. The AffectEngine SHALL detect emotion from user input using keyword + syntax pattern matching.
4. The system SHALL support emotion transition tracking (从兴奋→困惑, 从沮丧→满意) for multi-turn context.
5. The emotion dictionary SHALL include 3 intensity levels per emotion (低/中/高) to avoid binary classification.

### Requirement 5: 字典自组装推理引擎

**User Story:** AS 最终用户, I want 引擎根据查询自行从字典检索和拼装回复, so that 无需外部LLM API即可获得高质量回答。

#### Acceptance Criteria

1. The system SHALL implement a Dictionary Inference Pipeline that: (a) detects intent, (b) queries 6 dictionaries in parallel, (c) ranks fragments by relevance and novelty, (d) assembles weighted random fragments into a response.
2. The assembled response SHALL pass through CEE T6 quality evaluation (ITC/SCS/IEC/PFFT >= 0.70 composite).
3. IF assembled quality is below threshold, the system SHALL re-assemble with higher-weight fragments and different combination variants (max 3 retries).
4. Each assembly SHALL be unique — the system SHALL track assembly history (last 2000 hashes) to prevent repetition.
5. The system SHALL support progressive refinement (多轮迭代): initial broad assembly → detect gaps → targeted re-query → refine.

### Requirement 6: 自模拟对话循环

**User Story:** AS 系统, I want 引擎自主生成提问并自答, so that 持续学习无需人工干预。

#### Acceptance Criteria

1. The system SHALL implement Self-Dialogue Simulator that generates user-like queries from random dictionary seed combinations.
2. Each simulation cycle SHALL: (a) pick 2-3 random dictionary entries as seed, (b) generate a plausible user query, (c) run Dictionary Inference Pipeline, (d) evaluate response quality with T6, (e) store high-quality pairs in KnowledgeStore.
3. The simulator SHALL produce queries across 8 categories: 解释概念/代码编写/情感咨询/逻辑推理/创意生成/翻译/比较分析/日常对话.
4. The system SHALL track simulation metrics: queries generated, quality distribution, top-performing assembly patterns.
5. The simulation SHALL prioritize generating from under-explored dictionary regions to ensure diversity.

### Requirement 7: 后台持续学习守护进程

**User Story:** AS 系统管理员, I want 关闭浏览器后引擎仍在后台学习和优化字典, so that 知识持续增长不中断。

#### Acceptance Criteria

1. The system SHALL implement Background Learning Daemon that runs as a separate daemon thread (extending existing AutoTrainer).
2. The daemon SHALL run continuously without daily limit, alternating between: (a) self-simulation cycles (10 min), (b) knowledge deduplication and pruning (2 min), (c) dictionary weight recalibration (3 min), (d) idle cooldown (5 min).
3. The system SHALL pause learning when total CPU usage exceeds 50% to avoid resource contention.
4. The daemon SHALL produce a daily learning report: new dictionary entries added, quality distribution, top-emerging patterns, total simulation cycles.

### Requirement 8: 实时数据跟踪与存储

**User Story:** AS 开发者, I want 所有学习过程和字典变更实时落盘, so that 数据永不丢失且可回放。

#### Acceptance Criteria

1. The system SHALL persist all dictionary entries to `.cee_storage/dicts/` directory with atomic file writes.
2. The system SHALL maintain a transaction log (`.cee_storage/dicts/_changelog.jsonl`) recording every dictionary mutation with timestamp.
3. The system SHALL auto-save dictionary state after every 100 assembly operations or every 60 seconds, whichever comes first.
4. The system SHALL support dictionary state snapshots for rollback and comparison across versions.
5. The system SHALL track per-dictionary usage statistics: hit count, success rate, average assembly quality.
