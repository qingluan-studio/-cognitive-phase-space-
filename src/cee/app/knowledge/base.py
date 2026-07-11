from __future__ import annotations

import json
import re
import hashlib
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

CATEGORIES = [
    "AI编程",
    "前端开发",
    "后端开发",
    "数据科学",
    "DevOps",
    "产品设计",
    "认知科学",
    "学习方法",
    "工具推荐",
    "其他",
]


@dataclass
class KnowledgeItem:
    id: str
    title: str
    content: str
    category: str = "其他"
    tags: list[str] = field(default_factory=list)
    source: str = ""
    quality_score: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    embedding: Optional[list[float]] = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> KnowledgeItem:
        return cls(**{k: d.get(k, v.default if v.default is not field(default_factory) else v.default_factory() if v.default_factory is not field(default_factory) else None)
                      for k, v in cls.__dataclass_fields__.items()})  # type: ignore[misc]


class KnowledgeBase:
    def __init__(self) -> None:
        self._items: dict[str, KnowledgeItem] = {}
        self._next_id = 1
        self._load_presets()

    def _gen_id(self) -> str:
        i = self._next_id
        self._next_id += 1
        return f"kb_{i:06d}"

    def _load_presets(self) -> None:
        for item in _PRESET_KNOWLEDGE:
            self._items[item.id] = item
            try:
                n = int(item.id.split("_")[1])
                if n >= self._next_id:
                    self._next_id = n + 1
            except (IndexError, ValueError):
                pass

    def add(self, title: str, content: str, category: str = "其他",
            tags: Optional[list[str]] = None, source: str = "",
            embedding: Optional[list[float]] = None) -> KnowledgeItem:
        if category not in CATEGORIES:
            category = "其他"
        tags = tags or []
        item = KnowledgeItem(
            id=self._gen_id(),
            title=title,
            content=content,
            category=category,
            tags=tags,
            source=source,
            quality_score=self._score(content, tags),
            embedding=embedding,
        )
        if self._is_duplicate(item):
            return self._find_similar(item)
        self._items[item.id] = item
        return item

    def get(self, item_id: str) -> Optional[KnowledgeItem]:
        return self._items.get(item_id)

    def update(self, item_id: str, **kwargs: Any) -> Optional[KnowledgeItem]:
        item = self._items.get(item_id)
        if not item:
            return None
        for k, v in kwargs.items():
            if hasattr(item, k):
                setattr(item, k, v)
        item.updated_at = datetime.now(timezone.utc).isoformat()
        if "content" in kwargs or "tags" in kwargs:
            item.quality_score = self._score(item.content, item.tags)
        return item

    def remove(self, item_id: str) -> bool:
        return self._items.pop(item_id, None) is not None

    def search(self, keyword: str = "", category: Optional[str] = None,
               tags: Optional[list[str]] = None, fuzzy: bool = True,
               limit: int = 50) -> list[KnowledgeItem]:
        results: list[KnowledgeItem] = []
        kw = keyword.lower() if keyword else ""
        for item in self._items.values():
            if category and item.category != category:
                continue
            if tags and not set(tags).intersection(item.tags):
                continue
            if kw:
                if fuzzy:
                    score = self._fuzzy_match(kw, item.title.lower(), item.content.lower())
                    if score < 0.3:
                        continue
                else:
                    if kw not in item.title.lower() and kw not in item.content.lower():
                        continue
            results.append(item)
        results.sort(key=lambda x: x.quality_score, reverse=True)
        return results[:limit]

    def list_by_category(self, category: str) -> list[KnowledgeItem]:
        return sorted(
            [i for i in self._items.values() if i.category == category],
            key=lambda x: x.quality_score, reverse=True,
        )

    def list_by_tag(self, tag: str) -> list[KnowledgeItem]:
        return sorted(
            [i for i in self._items.values() if tag in i.tags],
            key=lambda x: x.quality_score, reverse=True,
        )

    def list_all(self) -> list[KnowledgeItem]:
        return sorted(self._items.values(), key=lambda x: x.created_at, reverse=True)

    def get_categories(self) -> list[str]:
        return CATEGORIES

    def get_category_stats(self) -> dict[str, int]:
        stats: dict[str, int] = {c: 0 for c in CATEGORIES}
        for item in self._items.values():
            if item.category in stats:
                stats[item.category] += 1
        return stats

    def get_tag_stats(self) -> dict[str, int]:
        stats: dict[str, int] = {}
        for item in self._items.values():
            for tag in item.tags:
                stats[tag] = stats.get(tag, 0) + 1
        return stats

    @property
    def total_count(self) -> int:
        return len(self._items)

    @property
    def avg_quality(self) -> float:
        if not self._items:
            return 0.0
        return sum(i.quality_score for i in self._items.values()) / len(self._items)

    def _score(self, content: str, tags: list[str]) -> float:
        s = 0.0
        cl = len(content)
        if cl >= 2000:
            s += 0.35
        elif cl >= 800:
            s += 0.25
        elif cl >= 300:
            s += 0.15
        elif cl >= 100:
            s += 0.08
        paragraphs = len([p for p in content.split("\n") if p.strip()])
        if paragraphs >= 5:
            s += 0.20
        elif paragraphs >= 3:
            s += 0.12
        elif paragraphs >= 1:
            s += 0.05
        tag_count = len(tags)
        if tag_count >= 5:
            s += 0.20
        elif tag_count >= 3:
            s += 0.12
        elif tag_count >= 1:
            s += 0.05
        structured = bool(re.search(r'\d+[.、)]', content)) or "：" in content or ":" in content
        if structured:
            s += 0.25
        return min(s, 1.0)

    def _fuzzy_match(self, keyword: str, title: str, content: str) -> float:
        if keyword in title:
            return 1.0
        if keyword in content:
            return 0.8
        title_words = set(re.findall(r'\w+', title.lower()))
        kw_words = set(re.findall(r'\w+', keyword.lower()))
        if kw_words and title_words:
            overlap = len(kw_words & title_words) / max(len(kw_words | title_words), 1)
            return overlap * 0.6
        content_words = set(re.findall(r'\w+', content.lower()))
        if kw_words and content_words:
            overlap = len(kw_words & content_words) / max(len(kw_words | content_words), 1)
            return overlap * 0.4
        return 0.0

    def _content_hash(self, content: str) -> str:
        return hashlib.md5(content.encode()).hexdigest()

    def _is_duplicate(self, item: KnowledgeItem) -> bool:
        h = self._content_hash(item.content)
        for existing in self._items.values():
            if self._content_hash(existing.content) == h:
                return True
            if _jaccard(existing.content, item.content) > 0.85:
                return True
        return False

    def _find_similar(self, item: KnowledgeItem) -> KnowledgeItem:
        h = self._content_hash(item.content)
        for existing in self._items.values():
            if self._content_hash(existing.content) == h:
                return existing
        best, best_sim = None, 0.0
        for existing in self._items.values():
            sim = _jaccard(existing.content, item.content)
            if sim > best_sim:
                best, best_sim = existing, sim
        return best or item

    def export_json(self, filepath: str) -> None:
        data = [i.to_dict() for i in self._items.values()]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def import_json(self, filepath: str, merge: bool = True) -> int:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        count = 0
        for d in data:
            title = d.get("title", "")
            content = d.get("content", "")
            if not title or not content:
                continue
            if not merge:
                self._items = {}
            item = self.add(
                title=title,
                content=content,
                category=d.get("category", "其他"),
                tags=d.get("tags", []),
                source=d.get("source", ""),
                embedding=d.get("embedding"),
            )
            count += 1
        return count


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(re.findall(r'\w+', a.lower())), set(re.findall(r'\w+', b.lower()))
    if not sa and not sb:
        return 0.0
    return len(sa & sb) / max(len(sa | sb), 1)


def _build_id(idx: int) -> str:
    return f"kb_{idx:06d}"


_PRESET_KNOWLEDGE: list[KnowledgeItem] = [
    KnowledgeItem(id=_build_id(1), title="AI编程代理概述", category="AI编程",
        tags=["AI编程代理", "编码助手", "智能体"],
        content="AI编程代理是一种能自主理解任务需求、制定执行计划、读取项目文件、编写代码、运行终端命令、修复错误并迭代交付的智能体。核心能力包括任务拆解、环境感知、工具调用、错误自愈。典型工作流：读取技术规范→创建待办清单→初始化项目→逐步构建→合并验证→最终交付。Kimi K2.6、Claude Code、MonkeyCode均为代表性AI编程代理。",
        source="内部整理", quality_score=0.9),
    KnowledgeItem(id=_build_id(2), title="Aider使用指南", category="AI编程",
        tags=["Aider", "AI编程代理", "终端工具"],
        content="Aider是一款基于终端的AI编程助手，支持多模型后端。核心特性：全仓库上下文感知、自动git提交、增量编辑、多文件重构。常用命令：aider --model <model> 启动、/add <file>添加文件、/diff查看变更、/undo撤销。支持OpenAI、Anthropic、本地Ollama模型。最佳实践：在git仓库根目录启动、使用/code明确编辑指令。",
        source="Aider官方文档", quality_score=0.85),
    KnowledgeItem(id=_build_id(3), title="Cursor编辑器", category="AI编程",
        tags=["Cursor", "IDE", "AI编辑器"],
        content="Cursor是基于VS Code的AI原生编辑器，深度集成AI编程能力。核心功能：Tab自动补全、Cmd+K内联编辑、AI Chat面板、Composer多文件编辑、@符号上下文引用。支持引用文件、文档、Git历史作为上下文。定价：免费版2000次补全/月，Pro版$20/月无限使用。与GitHub Copilot相比，Cursor的上下文感知和代码库理解更深入。",
        source="Cursor官方文档", quality_score=0.88),
    KnowledgeItem(id=_build_id(4), title="Claude Code使用", category="AI编程",
        tags=["Claude Code", "Anthropic", "终端代理"],
        content="Claude Code是Anthropic推出的终端AI编程代理。核心能力：直接读写文件、执行shell命令、管理git、运行测试。支持自定义指令(MEMORY.md)、项目级配置。使用方式：claude命令启动交互会话、--print非交互模式、--dangerously-skip-permissions跳过权限确认。最佳实践：编写详细的MEMORY.md、分步提交代码、使用/pull请求审查。",
        source="Anthropic官方文档", quality_score=0.87),
    KnowledgeItem(id=_build_id(5), title="GitHub Copilot", category="AI编程",
        tags=["Copilot", "GitHub", "代码补全"],
        content="GitHub Copilot是微软/GitHub推出的AI代码补全工具。核心功能：代码行补全、Copilot Chat对话、Copilot Workspace项目级开发。集成IDE：VS Code、JetBrains全家桶、Neovim。支持多模型：GPT-4o、Claude 3.5 Sonnet。定价：个人$10/月、商业$19/月、企业$39/月。免费替代：Codeium、Tabnine(基础版免费)、Continue(开源)。",
        source="GitHub官方文档", quality_score=0.86),
    KnowledgeItem(id=_build_id(6), title="Windsurf编辑器", category="AI编程",
        tags=["Windsurf", "Codeium", "AI IDE"],
        content="Windsurf(原Codeium)是Codeium公司推出的AI IDE，强调流(Flow)式工作模式。核心特性：Cascade多文件上下文感知、Supercomplete智能补全、Flow自动多步骤操作。与Cursor对比：Windsurf更侧重自动化流，Cursor更侧重开发者精细控制。定价：免费版基础补全，Pro版$15/月。支持自定义规则和工作流配置。",
        source="Windsurf官方文档", quality_score=0.82),
    KnowledgeItem(id=_build_id(7), title="React框架深入", category="前端开发",
        tags=["React", "前端", "JavaScript", "UI"],
        content="React是Meta开源的声明式UI框架。核心概念：JSX语法、组件化、虚拟DOM、单向数据流、Hooks API。React 19新特性：Server Components、Actions(表单处理)、use() Hook、Document Metadata。性能优化：React.memo、useMemo、useCallback、lazy加载、Suspense流式渲染。配套生态：React Router(路由)、Redux/Zustand(状态管理)、React Query(数据获取)、Next.js(全栈框架)、React Native(移动端)。",
        source="React官方文档", quality_score=0.92),
    KnowledgeItem(id=_build_id(8), title="Vue 3组合式API", category="前端开发",
        tags=["Vue", "前端", "JavaScript", "组合式API"],
        content="Vue 3的Composition API(组合式API)提供了比Options API更灵活的逻辑组织方式。核心API：ref/reactive(响应式)、computed(计算属性)、watch/watchEffect(侦听器)、onMounted/onUnmounted(生命周期)。setup语法糖：<script setup>自动暴露变量到模板。组合函数(Composables)：useMouse、useFetch等可复用逻辑模式。配套生态：Pinia(状态管理)、Vue Router、Vite(构建工具)、Nuxt(全栈框架)。",
        source="Vue官方文档", quality_score=0.90),
    KnowledgeItem(id=_build_id(9), title="Next.js全栈框架", category="前端开发",
        tags=["Next.js", "React", "全栈", "SSR"],
        content="Next.js是Vercel推出的React全栈框架，支持SSR/SSG/ISR多种渲染模式。App Router(新)：基于文件系统的路由+Server Components+布局嵌套。核心特性：Server Actions(服务端数据变更)、Route Handlers(API路由)、Middleware(中间件)、Image组件(自动优化)。数据获取：fetch API+缓存策略、Server Components直接查询数据库。部署：Vercel(一键)、Docker、Node.js自托管。",
        source="Next.js官方文档", quality_score=0.91),
    KnowledgeItem(id=_build_id(10), title="Nuxt 3全栈框架", category="前端开发",
        tags=["Nuxt", "Vue", "全栈", "SSR"],
        content="Nuxt 3是Vue的全栈元框架，基于Nitro服务端引擎。核心特性：文件系统路由、自动导入组件/组合函数、Hybrid Rendering(混合渲染)、Server Routes(API)、Layers(模块扩展)。模块生态：@nuxt/content(Markdown站点)、@nuxt/image(图片优化)、@nuxt/ui(UI组件库)。数据获取：useFetch、useAsyncData(自动去重+缓存)。部署：多平台预设(Vercel/Netlify/Cloudflare/Node)。",
        source="Nuxt官方文档", quality_score=0.88),
    KnowledgeItem(id=_build_id(11), title="Svelte与SvelteKit", category="前端开发",
        tags=["Svelte", "前端", "编译时框架"],
        content="Svelte是编译时框架，在构建阶段将组件编译为高效的原生DOM操作代码。核心概念：响应式赋值($:)、stores(状态共享)、事件分发、过渡动画。SvelteKit是Svelte的全栈框架：文件路由、load函数(服务端数据加载)、form actions、适配器(多平台部署)。Svelte 5引入Runes(信号)作为新的响应式原语：$state、$derived、$effect。",
        source="Svelte官方文档", quality_score=0.84),
    KnowledgeItem(id=_build_id(12), title="Astro内容站点框架", category="前端开发",
        tags=["Astro", "静态站点", "内容驱动"],
        content="Astro是现代内容驱动站点框架，默认零JavaScript输出。核心特性：Islands Architecture(交互岛屿)、Content Collections(类型安全内容管理)、View Transitions(SPA过渡)。支持多UI框架：React/Vue/Svelte/Solid组件混合使用。Markdown/MDX原生支持。部署：静态导出+多适配器(SSR可选)。适用场景：博客、文档站、营销页面、电商。",
        source="Astro官方文档", quality_score=0.83),
    KnowledgeItem(id=_build_id(13), title="Solid.js高性能框架", category="前端开发",
        tags=["Solid", "前端", "响应式", "性能"],
        content="Solid.js是高性能响应式UI框架，借鉴React语法但有精粒度的响应式更新(无虚拟DOM)。核心概念：Signals(信号)、Effects(副作用)、Memos(记忆化)。组件只执行一次，后续通过Signals精确更新DOM。SolidStart是全栈元框架。性能优势：比React/Vue更少的运行时开销、更小的bundle体积。生态：Solid Router、Solid Primitives。",
        source="Solid.js官方文档", quality_score=0.81),
    KnowledgeItem(id=_build_id(14), title="FastAPI后端框架", category="后端开发",
        tags=["FastAPI", "Python", "后端", "REST"],
        content="FastAPI是高性能Python Web框架，基于Starlette和Pydantic。核心特性：自动OpenAPI文档、类型安全请求/响应验证、异步支持(async/await)、依赖注入系统、WebSocket支持。数据验证：Pydantic v2模型声明请求体和响应模式。中间件：CORS、GZip、TrustedHost。部署：Uvicorn/Gunicorn+Uvicorn workers。适用场景：REST API、微服务、ML模型服务。",
        source="FastAPI官方文档", quality_score=0.91),
    KnowledgeItem(id=_build_id(15), title="Django全栈框架", category="后端开发",
        tags=["Django", "Python", "后端", "全栈"],
        content="Django是Python重量级Web框架，遵循batteries-included理念。核心组件：ORM(对象关系映射)、Admin后台(自动生成)、模板引擎、表单系统、认证系统、中间件。MVT架构：Model(数据层)、View(业务逻辑)、Template(表现层)。Django REST Framework(DRF)提供强大API层：Serializer、ViewSet、Router、权限系统。适用场景：CMS、电商、社交平台、企业应用。",
        source="Django官方文档", quality_score=0.89),
    KnowledgeItem(id=_build_id(16), title="Spring Boot框架", category="后端开发",
        tags=["Spring Boot", "Java", "后端", "微服务"],
        content="Spring Boot是Java生态最流行的微服务框架。核心特性：自动配置、起步依赖(Starter)、嵌入式服务器(Tomcat/Jetty/Undertow)、Actuator(监控端点)。Spring生态：Spring MVC(Web)、Spring Data(JPA/MongoDB/Redis)、Spring Security(认证授权)、Spring Cloud(微服务治理)。注解驱动：@RestController、@Service、@Repository、@Autowired。构建工具：Maven/Gradle。",
        source="Spring官方文档", quality_score=0.88),
    KnowledgeItem(id=_build_id(17), title="Express.js框架", category="后端开发",
        tags=["Express", "Node.js", "后端", "REST"],
        content="Express.js是Node.js最流行的Web框架，极简、灵活。核心概念：路由、中间件、请求/响应对象链式处理。中间件生态：cors、helmet(安全头)、morgan(日志)、body-parser、express-session。路由组织：express.Router实现模块化路由。错误处理：统一错误处理中间件。配合TypeScript：@types/express、使用Zod做请求验证。部署：PM2进程管理、反向代理(Nginx)。",
        source="Express.js官方文档", quality_score=0.84),
    KnowledgeItem(id=_build_id(18), title="Gin Go框架", category="后端开发",
        tags=["Gin", "Go", "后端", "高性能"],
        content="Gin是Go语言高性能Web框架，比大多数同类框架快40倍。核心特性：零分配路由、中间件链、请求数据绑定与验证、JSON/XML/Protobuf渲染、错误管理。Api分组：Group routes by prefix。常用中间件：Logger、Recovery(panic恢复)、CORS、Auth(JWT)。数据绑定：ShouldBindJSON/ShouldBindQuery+validator标签。适用场景：高并发API、微服务网关。",
        source="Gin官方文档", quality_score=0.83),
    KnowledgeItem(id=_build_id(19), title="Fiber Go框架", category="后端开发",
        tags=["Fiber", "Go", "后端", "Express风格"],
        content="Fiber是Go语言Web框架，API设计受Express.js启发，底层基于Fasthttp(零内存分配)。核心特性：极简路由、中间件管道、模板引擎(多款支持)、静态文件服务、WebSocket。速度对比：比Express快约20倍、比Gin快约1.5倍。内置工具：ctx.BodyParser、ctx.Params、ctx.Query、ctx.SendFile。适用场景：高性能API、实时应用、静态文件服务。",
        source="Fiber官方文档", quality_score=0.80),
    KnowledgeItem(id=_build_id(20), title="PostgreSQL数据库", category="后端开发",
        tags=["PostgreSQL", "数据库", "SQL", "关系型"],
        content="PostgreSQL是开源对象关系型数据库，以标准兼容性和扩展性著称。核心特性：ACID事务、MVCC(多版本并发控制)、JSONB(文档存储)、全文搜索、地理空间(PostGIS)、窗口函数、CTE递归查询。索引类型：B-Tree、Hash、GiST、GIN、BRIN。高级特性：表分区、物化视图、逻辑复制、并行查询、JIT编译。扩展：pg_stat_statements(查询分析)、pg_partman(分区管理)。",
        source="PostgreSQL官方文档", quality_score=0.92),
    KnowledgeItem(id=_build_id(21), title="MySQL数据库", category="后端开发",
        tags=["MySQL", "数据库", "SQL", "关系型"],
        content="MySQL是最流行的开源关系型数据库。核心特性：InnoDB存储引擎(ACID事务、行级锁、MVCC)、复制(异步/半同步/Group Replication)、分区。MySQL 8.0+新特性：窗口函数、CTE、JSON增强、角色管理、不可见索引。性能优化：EXPLAIN分析查询、慢查询日志、索引优化、连接池配置、Buffer Pool调优。云版本：AWS RDS、Google Cloud SQL、Azure Database。",
        source="MySQL官方文档", quality_score=0.87),
    KnowledgeItem(id=_build_id(22), title="MongoDB NoSQL数据库", category="后端开发",
        tags=["MongoDB", "数据库", "NoSQL", "文档型"],
        content="MongoDB是文档型NoSQL数据库。核心概念：Collection(集合)、Document(BSON文档)、灵活的Schema。查询语言：MQL(类JSON语法)、聚合管道(多阶段数据处理)。索引：单字段、复合、多键(数组)、文本、地理空间、TTL。高级特性：Change Streams(实时数据变更)、事务(多文档ACID)、分片(水平扩展)、Atlas Search(全文搜索)。驱动：Node.js/Mongoose、Python/PyMongo、Java/Spring Data。",
        source="MongoDB官方文档", quality_score=0.86),
    KnowledgeItem(id=_build_id(23), title="Redis缓存数据库", category="后端开发",
        tags=["Redis", "数据库", "缓存", "内存"],
        content="Redis是内存数据结构存储，用作数据库、缓存、消息代理。核心数据结构：String、List、Set、Sorted Set、Hash、Stream、HyperLogLog、Bitmap、Geospatial。高级特性：Pub/Sub消息模式、Lua脚本(原子操作)、事务、过期策略、持久化(RDB/AOF)、主从复制、Sentinel高可用、Cluster分片。使用场景：缓存、会话存储、排行榜、消息队列、实时计数、分布式锁。",
        source="Redis官方文档", quality_score=0.90),
    KnowledgeItem(id=_build_id(24), title="SQLite嵌入式数据库", category="后端开发",
        tags=["SQLite", "数据库", "嵌入式", "轻量级"],
        content="SQLite是嵌入式关系型数据库，零配置、无服务器。核心特性：单文件存储、ACID事务、全SQL支持、跨平台(文件格式一致)。适用场景：移动应用数据存储、桌面应用、嵌入式设备、边缘计算、中小型Web应用。高级特性：FTS5(全文搜索)、JSON1(JSON支持)、WAL模式(并发读写)。限制：写操作串行、不适合高并发写入场景。配合ORM：Prisma/Turso(边缘数据库)、Drizzle。",
        source="SQLite官方文档", quality_score=0.85),
    KnowledgeItem(id=_build_id(25), title="ClickHouse列存数据库", category="后端开发",
        tags=["ClickHouse", "数据库", "OLAP", "分析"],
        content="ClickHouse是开源列式分析型数据库，专为实时分析查询优化。核心特性：列式存储(高压缩比)、向量化查询执行、数据压缩(多种算法)、分布式查询、物化视图。表引擎：MergeTree(主力)、ReplacingMergeTree(去重)、SummingMergeTree(聚合)。适用场景：用户行为分析、BI报表、日志分析、时序数据、数据仓库。性能优势：单表每秒数十亿行聚合查询，比传统行存快100-1000倍。",
        source="ClickHouse官方文档", quality_score=0.84),
    KnowledgeItem(id=_build_id(26), title="认知偏差大全", category="认知科学",
        tags=["认知偏差", "心理学", "决策"],
        content="认知偏差是思维中的系统性偏差模式。主要类型：1)确认偏误——倾向于寻找支持已有信念的证据；2)锚定效应——过度依赖最先获得的信息；3)可用性启发——根据容易想到的例证判断概率；4)幸存者偏差——只看成功案例忽略失败；5)达克效应——能力低者高估自己；6)后见之明偏差——事后觉得事情显而易见；7)框架效应——同一信息不同表述导致不同决策；8)沉没成本谬误——因已投入而继续坚持。",
        source="维基百科+心理学教材", quality_score=0.88),
    KnowledgeItem(id=_build_id(27), title="思维模型集", category="认知科学",
        tags=["思维模型", "决策框架", "认知"],
        content="核心思维模型：1)第一性原理——分解到最基本真命题后重新构建；2)二阶思维——考虑决策的后续后果；3)逆向思维——从目标倒推必要条件；4)系统思维——关注元素间相互作用而非孤立分析；5)帕累托法则——80%结果来自20%原因；6)复利思维——小改进持续累积产生巨大效果；7)奥卡姆剃刀——简单解释优于复杂解释；8)机会成本——选择某方案的最优替代方案价值；9)安全边际——为不确定留缓冲。",
        source="查理·芒格+思考框架文献", quality_score=0.89),
    KnowledgeItem(id=_build_id(28), title="决策框架", category="认知科学",
        tags=["决策", "框架", "方法论"],
        content="结构化决策框架：1)CYNE框架——将问题分简单/繁杂/复杂/混沌/混乱五域，匹配不同方法；2)决策矩阵——列出选项×标准，加权评分；3)事前验尸——假设项目已失败，倒推原因；4)10-10-10规则——考虑10分钟/10个月/10年后的感受；5)WRAP方法——Widen options(拓宽选项)、Reality-test(现实检验)、Attain distance(拉开距离)、Prepare to be wrong(准备犯错)。",
        source="决策科学文献", quality_score=0.85),
    KnowledgeItem(id=_build_id(29), title="设计模式概述", category="AI编程",
        tags=["设计模式", "GoF", "软件工程", "最佳实践"],
        content="GoF设计模式23种，分三类：1)创建型(5)：单例、工厂方法、抽象工厂、建造者、原型；2)结构型(7)：适配器、桥接、组合、装饰、外观、享元、代理；3)行为型(11)：责任链、命令、解释器、迭代器、中介者、备忘录、观察者、状态、策略、模板方法、访问者。现代实践：简单工厂替代抽象工厂、依赖注入替代部分创建型模式、函数式风格简化部分行为型模式。",
        source="GoF《设计模式》", quality_score=0.86),
    KnowledgeItem(id=_build_id(30), title="SOLID原则", category="AI编程",
        tags=["SOLID", "设计原则", "面向对象", "最佳实践"],
        content="SOLID是面向对象设计的五个基本原则：S-单一职责：一个类只负责一件事；O-开闭原则：对扩展开放、对修改关闭(通过接口/继承扩展)；L-里氏替换：子类必须能替换父类而不破坏程序；I-接口隔离：不强迫客户端依赖不用的接口；D-依赖反转：高层模块不依赖低层模块，都依赖抽象。实践建议：优先组合优于继承、用依赖注入实现DIP、小而专注的接口。",
        source="Robert C. Martin", quality_score=0.87),
    KnowledgeItem(id=_build_id(31), title="DRY原则与测试策略", category="AI编程",
        tags=["DRY", "测试", "最佳实践", "代码质量"],
        content="DRY(Don't Repeat Yourself)：每块知识在系统中应有单一、明确的表示。实现方式：提取公共函数、抽象通用组件、使用模板减少重复。但避免过度DRY导致不当耦合。测试策略金字塔：底层(单元测试：快、多、隔离)→中层(集成测试：模块间协作)→顶层(E2E测试：关键流程、少而精)。测试最佳实践：AAA模式(Arrange-Act-Assert)、单一断言原则、Mock外部依赖、测试行为非实现。",
        source="软件工程最佳实践", quality_score=0.85),
    KnowledgeItem(id=_build_id(32), title="Midjourney AI绘图", category="AI编程",
        tags=["Midjourney", "AI绘图", "设计", "生成式AI"],
        content="Midjourney是领先的AI图像生成工具。核心用法：/imagine prompt+参数。关键参数：--ar(宽高比,如16:9)、--v(版本,6.1最新)、--style raw(减少美化)、--stylize(风格化程度0-1000)、--chaos(随机性)。高级技巧：图片引用(--cref角色参考、--sref风格参考)、多重提示(::权重分配)、Remix模式(变体时修改prompt)。平面设计用--style raw还原真实感，艺术创作适当提高stylize。",
        source="Midjourney官方文档", quality_score=0.86),
    KnowledgeItem(id=_build_id(33), title="Stable Diffusion开源绘图", category="AI编程",
        tags=["Stable Diffusion", "AI绘图", "开源", "本地运行"],
        content="Stable Diffusion是开源文生图模型，可本地运行。SDXL(SD 1.5的升级版)支持1024分辨率。部署方式：Automatic1111 WebUI(最流行)、ComfyUI(节点式工作流)、Diffusers(HuggingFace Python库)。关键概念：Checkpoint(基础模型)、LoRA(微调权重)、VAE(编解码)、CLIP(文本理解)。ControlNet实现精准控制：姿态、深度图、线稿、语义分割。推荐模型：SDXL Base、Realistic Vision、DreamShaper。",
        source="Stability AI", quality_score=0.87),
    KnowledgeItem(id=_build_id(34), title="Runway AI视频", category="AI编程",
        tags=["Runway", "AI视频", "视频生成"],
        content="Runway是AI视频编辑和生成平台。Gen-3 Alpha：文本/图片生成视频，支持Motion Brush(运动画笔)、Camera Control(相机控制)。功能：视频风格迁移、绿幕抠像(无需绿幕)、视频修复/扩展、帧插值(慢动作)。图层式时间轴编辑+AI生成结合。定价：免费版每月125 credits，Unlimited版$95/月。替代方案：Pika(交互式)、Stable Video Diffusion(开源)、Moonvalley(免费)。",
        source="Runway官方文档", quality_score=0.82),
    KnowledgeItem(id=_build_id(35), title="Suno AI音乐生成", category="AI编程",
        tags=["Suno", "AI音乐", "音乐生成", "音频"],
        content="Suno AI是文本到音乐生成工具。使用方式：描述音乐风格+歌词→一键生成带人声的完整歌曲。v4版本改进：更长时长(4分钟+)、更佳的语音质量和情感表达。高级技巧：元标签[Verse][Chorus][Bridge]控制结构、指定音乐风格+乐器+情绪+速度。定价：免费版每天5首歌，Pro版$10/月500首歌。替代方案：Udio(免费层)、Stable Audio(开源)、MusicGen(Meta开源)。",
        source="Suno官方文档", quality_score=0.83),
    KnowledgeItem(id=_build_id(36), title="ElevenLabs语音合成", category="AI编程",
        tags=["ElevenLabs", "TTS", "语音合成", "音频"],
        content="ElevenLabs是高质量的AI语音合成平台。核心功能：文本转语音(29种语言)、语音克隆(即时/专业)、声音设计、语音到语音转换。Turbo v2.5模型低延迟(~400ms)。API支持流式输出。定价：免费版10k字符/月，Starter$5/月30k字符。开源替代：Edge-TTS(微软免费)、Coqui TTS、Fish-Speech(中文声音克隆)。声音设置：稳定性(低=更有表现力)、相似度、风格夸张度。",
        source="ElevenLabs官方文档", quality_score=0.84),
    KnowledgeItem(id=_build_id(37), title="Coursera在线学习", category="学习方法",
        tags=["Coursera", "在线课程", "MOOC", "证书"],
        content="Coursera是全球最大的MOOC平台，与顶尖大学和企业合作。课程类型：单门课程(4-6周)、专项课程(多门组成)、专业证书(职业导向)、在线学位。知名课程：Andrew Ng机器学习、Google数据分析证书、IBM数据科学。学习模式：免费旁听(无证书)、付费获取证书+作业评分。特色：Coursera Plus($59/月大部分课程无限访问)。配合使用：课程视频+配套Jupyter Notebook实操。",
        source="Coursera官网", quality_score=0.82),
    KnowledgeItem(id=_build_id(38), title="Fast.ai深度学习课程", category="学习方法",
        tags=["Fast.ai", "深度学习", "实践", "免费"],
        content="Fast.ai提供免费的深度学习实践课程。核心理念：自顶向下教学(先用再理解)、实战项目驱动。课程内容：Practical Deep Learning(计算机视觉+NLP+表格数据)、From Deep Learning Foundations(从零实现Stable Diffusion)。工具栈：fastai库(简化PyTorch)、Gradient/HuggingFace Notebooks。特色：不要求高深数学基础、每周实战项目、活跃社区论坛。对比吴恩达课程：Fast.ai更偏工程实践、动手性强。",
        source="Fast.ai官网", quality_score=0.85),
    KnowledgeItem(id=_build_id(39), title="MIT OCW开放课程", category="学习方法",
        tags=["MIT OCW", "开放课程", "计算机科学", "免费"],
        content="MIT OpenCourseWare是MIT的免费公开课平台。经典CS课程：6.006算法导论、6.824分布式系统、6.031软件构造、6.S191深度学习导论、6.858计算机系统安全、6.172性能工程。每个课程包含：教学大纲、视频讲座、讲义、作业(答案)、考试。学习建议：每周固定时间学习、动手完成作业、参与社区讨论(Reddit/Discord)。组合学习：MIT理论深度+Fast.ai实践广度。",
        source="MIT OCW官网", quality_score=0.85),
    KnowledgeItem(id=_build_id(40), title="LeetCode刷题平台", category="学习方法",
        tags=["LeetCode", "算法", "面试", "编程练习"],
        content="LeetCode是算法练习和面试准备平台，3000+题目。题目难度：Easy/Medium/Hard。学习路径：1)数据结构基础(数组/链表/树/图/哈希/堆；2)算法核心(双指针/滑动窗口/二分/回溯/DP/贪心/并查集)；3)专项突破(按公司标签高频题)。刷题策略：按主题集中刷、限时模拟、理解多解并记录、定期复习。Python/Java/C++三语切换。LeetCode Premium($35/月)：公司题库、模拟面试、题解。",
        source="LeetCode官网", quality_score=0.86),
    KnowledgeItem(id=_build_id(41), title="Notion效率工具", category="工具推荐",
        tags=["Notion", "笔记", "知识管理", "效率"],
        content="Notion是all-in-one工作空间，融合笔记、数据库、项目管理、Wiki。核心功能：页面嵌套(无限层级)、数据库(表格/看板/日历/画廊)、模板、关系型数据库关联。常见模板：P.A.R.A笔记法、GTD任务管理、阅读清单、旅行规划。AI功能：Notion AI自动写作/总结/翻译。定价：免费版(个人够用)、Plus$10/月(无限AI+上传)。免费替代：AppFlowy(开源)、Outline(开源)、Anytype(本地优先)。",
        source="Notion官方文档", quality_score=0.84),
    KnowledgeItem(id=_build_id(42), title="Obsidian双链笔记", category="工具推荐",
        tags=["Obsidian", "笔记", "双链", "知识管理"],
        content="Obsidian是基于Markdown的本地双链笔记工具。核心理念：知识网络(通过[[]]链接连接笔记形成图谱)。核心功能：双向链接、关系图谱、Canvas白板、标签系统、全文搜索、本地存储。插件生态：社区插件1000+(Excalidraw绘画、Dataview数据查询、Calendar日历)。同步：Obsidian Sync($5/月)或第三方方案(iCloud/Git)。与Notion对比：Obsidian本地优先+快速，Notion协作+在线优先。",
        source="Obsidian官方文档", quality_score=0.86),
    KnowledgeItem(id=_build_id(43), title="Raycast效率启动器", category="工具推荐",
        tags=["Raycast", "效率", "macOS", "启动器"],
        content="Raycast是macOS效率启动器，比Alfred更现代。核心功能：快速启动应用、文件搜索、剪贴板历史、窗口管理、片段(Snippets)快速输入。扩展商店：GitHub/GitLab集成、Jira任务、VS Code最近项目、翻译、货币转换、颜色取色器。AI功能(Raycast Pro$8/月)：AI Chat、快捷指令增强。生产力技巧：创建自定义快捷指令、将重复工作流封装为扩展、热键映射常用操作。替代：uTools(跨平台开源)、Alfred(Powerpack)。",
        source="Raycast官方文档", quality_score=0.83),
    KnowledgeItem(id=_build_id(44), title="Warp终端", category="工具推荐",
        tags=["Warp", "终端", "开发工具", "AI"],
        content="Warp是现代化Rust编写的终端，内置AI和协作功能。核心特性：块(block)式输出(每个命令+输出为独立块，可折叠/复制/分享)；AI Command Search(自然语言生成命令)；Workflows(参数化命令模板)；Warp Drive(个人知识库保存有用命令)。智能补全：命令参数、路径、git分支历史。协作：终端会话分享链接。团队版：共享Workflows+Warp Drive。免费个人使用。",
        source="Warp官方文档", quality_score=0.82),
    KnowledgeItem(id=_build_id(45), title="数据科学入门", category="数据科学",
        tags=["数据科学", "Python", "Pandas", "机器学习"],
        content="数据科学是交叉学科，结合统计学、编程和领域知识从数据中提取洞见。核心工具栈：Python(NumPy/Pandas/Scikit-learn)、Jupyter Notebook、SQL。工作流程：数据获取→清洗→探索性分析(EDA)→特征工程→建模→评估→部署。Pandas核心操作：读取(read_csv)、过滤(query/loc)、分组(groupby)、聚合(agg)、合并(merge/join)、透视(pivot_table)。可视化：Matplotlib(基础)、Seaborn(统计图)、Plotly(交互)。",
        source="行业实践总结", quality_score=0.88),
    KnowledgeItem(id=_build_id(46), title="NumPy科学计算", category="数据科学",
        tags=["NumPy", "Python", "科学计算", "数组"],
        content="NumPy是Python科学计算的基础库，提供多维数组对象和向量化运算。核心概念：ndarray(n维数组)、广播(broadcasting)、通用函数(ufunc)、fancy indexing。常用操作：reshape/ravel(变形)、concatenate/stack(拼接)、where/select(条件选择)。线性代数：np.linalg模块(逆矩阵、特征值、SVD)。性能：向量化替代Python循环(快100x+)、内存连续布局。实践建议：避免显式循环、使用np.where替代if-else。",
        source="NumPy官方文档", quality_score=0.86),
    KnowledgeItem(id=_build_id(47), title="Pandas数据分析", category="数据科学",
        tags=["Pandas", "Python", "数据分析", "DataFrame"],
        content="Pandas是Python数据分析核心库，DataFrame是主要数据结构。核心操作：读取数据(read_csv/read_excel/read_sql)、选择过滤(loc按标签/iloc按位置/query表达式)、分组聚合(groupby+agg/transform)、合并连接(merge/concat/join)、数据透视(pivot/pivot_table/melt)、时间序列(resample/rolling/shift)。性能优化：category类型节省内存、chunksize分批读取大文件、eval/query加速过滤。",
        source="Pandas官方文档", quality_score=0.87),
    KnowledgeItem(id=_build_id(48), title="DevOps实践指南", category="DevOps",
        tags=["DevOps", "CI/CD", "自动化", "运维"],
        content="DevOps是开发与运维融合的文化+实践+工具集。核心实践：持续集成(CI：自动构建测试)、持续交付(CD：自动部署)、基础设施即代码(IaC：Terraform/Pulumi)、监控可观测性(Prometheus/Grafana/ELK)。CI/CD工具：GitHub Actions(免费额度)、GitLab CI、Jenkins、ArgoCD(K8s GitOps)。容器化：Docker(镜像)、Kubernetes(编排)、Helm(包管理)。DevOps三步法：流动(加速从左到右)→反馈(加速从右到左)→持续学习。",
        source="《DevOps Handbook》", quality_score=0.89),
    KnowledgeItem(id=_build_id(49), title="Docker容器化", category="DevOps",
        tags=["Docker", "容器", "虚拟化", "CI/CD"],
        content="Docker是应用容器化平台，一次构建到处运行。核心概念：Dockerfile(构建定义)、Image(镜像/只读模板)、Container(运行实例)、Volume(持久化存储)、Network(网络)。Dockerfile最佳实践：多阶段构建(减小体积)、使用.dockerignore、按变更频率排序层、非root用户运行。Docker Compose：多容器应用编排，docker-compose.yml定义服务。常用命令：docker build/run/logs/exec/compose up。",
        source="Docker官方文档", quality_score=0.87),
    KnowledgeItem(id=_build_id(50), title="Kubernetes编排", category="DevOps",
        tags=["Kubernetes", "K8s", "容器编排", "云原生"],
        content="Kubernetes(K8s)是容器编排平台，自动化部署、扩展、管理容器化应用。核心资源：Pod(最小部署单元)、Deployment(声明式更新)、Service(网络接入+L4负载均衡)、ConfigMap/Secret(配置)、Ingress(L7路由+TLS)。架构：Control Plane(API Server/Scheduler/Controller Manager/etcd)+Worker Nodes(Kubelet/Kube-proxy)。管理工具：kubectl(CLI)、Helm(包管理)、Lens(IDE)、k9s(终端UI)。",
        source="Kubernetes官方文档", quality_score=0.87),
    KnowledgeItem(id=_build_id(51), title="Terraform IaC", category="DevOps",
        tags=["Terraform", "IaC", "基础设施", "多云"],
        content="Terraform是HashiCorp的基础设施即代码工具，使用HCL声明式语言。工作流：Write(定义基础设施)→Plan(预览变更)→Apply(应用变更)。核心概念：Provider(AWS/GCP/Azure/其他)、Resource(具体资源)、Data Source(查询已有资源)、State(状态文件管理实际资源映射)、Module(可复用组件)。最佳实践：远程State(S3+GCS)、变量分离(tfvars)、Module化、Terraform Cloud/Enterprise。替代：Pulumi(通用编程语言)、OpenTofu(开源分支)。",
        source="Terraform官方文档", quality_score=0.86),
    KnowledgeItem(id=_build_id(52), title="产品设计基础", category="产品设计",
        tags=["产品设计", "UX", "UI", "用户体验"],
        content="产品设计是在技术约束和业务目标下为用户创造价值的过程。设计思维五阶段：共情(理解用户)→定义(明确问题)→构思(生成方案)→原型(制作样品)→测试(验证假设)。设计原则：Nielsen十大可用性启发、Don Norman的可视性/反馈/约束/映射/一致性。工具链：Figma(界面设计+原型)、Miro(协作白板)、Notion(文档)、Dovetail(用户研究)。UX交付物：用户旅程地图、线框图、交互原型、设计系统。",
        source="设计方法论文献", quality_score=0.85),
    KnowledgeItem(id=_build_id(53), title="Figma设计工具", category="产品设计",
        tags=["Figma", "UI设计", "原型", "协作"],
        content="Figma是基于浏览器的协作设计工具。核心功能：矢量编辑、自动布局(Auto Layout：响应式设计)、组件+变体(Variants：不同状态)、原型交互、开发者模式(查看代码)。设计系统构建：Design Tokens(设计令牌)→基础组件→复合组件→页面。效率技巧：批量重命名(Cmd+R)、快速搜索(Cmd+/)、插件生态(Iconify/Unsplash/Content Reel)。免费替代：Penpot(开源)、Lunacy。学习资源：Figma YouTube官方频道、Figma Community模板。",
        source="Figma官方文档", quality_score=0.84),
    KnowledgeItem(id=_build_id(54), title="Git版本控制", category="AI编程",
        tags=["Git", "版本控制", "协作", "最佳实践"],
        content="Git是分布式版本控制系统。核心概念：工作区→暂存区→本地仓库→远程仓库。Git数据模型：blob(文件)、tree(目录)、commit(快照)、tag(标签)、branch(引用)。常用工作流：GitHub Flow(main+feature分支)、Git Flow(main+develop+feature+release+hotfix)。命令速查：git log/status/add/commit/push/pull/fetch/merge/rebase/stash/cherry-pick。最佳实践：原子提交、有意义的commit message(Conventional Commits规范)。",
        source="Pro Git book", quality_score=0.88),
]
