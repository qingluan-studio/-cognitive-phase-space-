#!/usr/bin/env python3
"""
从开源语料库训练合鸣模型 V2 - 基于仓库的快速路由

核心改进：
1. 基于仓库名快速路由到对应专家（避免逐条关键词匹配的开销）
2. 为常见技术栈创建专用专家
3. 自动扩展关键词覆盖新领域
"""
import sys
import json
import gzip
import os
import time
import argparse
from typing import List, Dict, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))


# --------------------------------------------------------------------------- #
# 仓库 → 专家路由映射表
# --------------------------------------------------------------------------- #
REPO_TO_EXPERT = {
    # Web 框架
    "flask": "web_framework",
    "flask-restful": "web_framework",
    "django": "web_framework",
    "fastapi": "web_framework",
    "starlette": "web_framework",
    "bottle": "web_framework",
    "falcon": "web_framework",
    "sanic": "web_framework",
    "tornado": "web_framework",
    "aiohttp": "web_framework",
    "uvicorn": "web_framework",
    "werkzeug": "web_framework",
    
    # HTTP/网络
    "requests": "http_client",
    "requests-html": "http_client",
    "requests-oauthlib": "http_client",
    "httpx": "http_client",
    "urllib3": "http_client",
    "httpie": "http_client",
    "aiofiles": "http_client",
    
    # 机器学习/深度学习
    "pytorch": "ml_dl",
    "tensorflow": "ml_dl",
    "keras": "ml_dl",
    "scikit-learn": "ml_dl",
    "scikit-image": "ml_dl",
    "transformers": "ml_dl",
    "tokenizers": "ml_dl",
    "accelerate": "ml_dl",
    "datasets": "ml_dl",
    "langchain": "ml_dl",
    "rasa": "ml_dl",
    "spaCy": "ml_dl",
    "mechanicalsoup": "ml_dl",
    
    # 数据处理/科学计算
    "numpy": "data_science",
    "pandas": "data_science",
    "scipy": "data_science",
    "sympy": "data_science",
    "xarray": "data_science",
    "modin": "data_science",
    "numba": "data_science",
    
    # 可视化
    "matplotlib": "visualization",
    "seaborn": "visualization",
    "plotly.py": "visualization",
    "bokeh": "visualization",
    
    # 数据库/ORM
    "sqlalchemy": "database",
    "databases": "database",
    "mongo-python-driver": "database",
    "redis-py": "database",
    "aiomysql": "database",
    "aiopg": "database",
    "orm": "database",
    
    # 测试/质量
    "pytest": "testing",
    "flake8": "testing",
    "black": "testing",
    "tox": "testing",
    "coverage": "testing",
    
    # 工具/基础设施
    "click": "tools",
    "rich": "tools",
    "textual": "tools",
    "pip": "tools",
    "wheel": "tools",
    "setuptools": "tools",
    "build": "tools",
    "toml": "tools",
    "mkdocs": "tools",
    "lxml": "tools",
    "beautifulsoup4": "tools",
    
    # 安全/加密
    "cryptography": "security",
    "pynacl": "security",
    "paramiko": "security",
    
    # 分布式/计算
    "ray": "distributed",
    "celery": "distributed",
    "dask": "distributed",
    "rq": "distributed",
    
    # 其他
    "jinja": "template",
    "markupsafe": "template",
    "pydantic": "validation",
    "pytorch-lightning": "ml_dl",
    "seaborn": "visualization",
}


# --------------------------------------------------------------------------- #
# 新增专家定义
# --------------------------------------------------------------------------- #
EXTRA_EXPERTS = [
    {
        "id": "web_framework",
        "name": "Web 框架",
        "domain": "Flask/Django/FastAPI",
        "keywords": [
            "flask", "django", "fastapi", "starlette", "route", "router",
            "request", "response", "middleware", "template", "view",
            "url", "endpoint", "api", "REST", "Werkzeug", "WSGI",
            "jinja2", "session", "cookie", "CSRF", "blueprint", "factory",
            "application", "decorator", "@app", "@router", "asgi",
        ],
        "fragments": [],
    },
    {
        "id": "http_client",
        "name": "HTTP 客户端",
        "domain": "Requests/HTTPX",
        "keywords": [
            "requests", "httpx", "urllib", "get", "post", "put", "delete",
            "header", "cookie", "session", "timeout", "重试", "代理",
            "http", "https", "json", "body", "params", "auth",
            "Response", "Request", "Client", "AsyncClient",
        ],
        "fragments": [],
    },
    {
        "id": "ml_dl",
        "name": "机器学习/深度学习",
        "domain": "PyTorch/TensorFlow/Transformers",
        "keywords": [
            "torch", "tensorflow", "keras", "model", "train", "epoch",
            "batch", "optimizer", "loss", "gradient", "neural", "layer",
            "transformer", "attention", "bert", "gpt", "tokenizer",
            "embedding", "inference", "predict", "evaluate", "dataset",
            "DataLoader", "optimizer", "Adam", "SGD", "learning_rate",
            "深度学习", "机器学习", "神经网络", "CNN", "RNN", "LSTM",
        ],
        "fragments": [],
    },
    {
        "id": "data_science",
        "name": "数据科学",
        "domain": "NumPy/Pandas/SciPy",
        "keywords": [
            "numpy", "pandas", "scipy", "array", "matrix", "dataframe",
            "series", "index", "column", "row", "filter", "groupby",
            "merge", "concat", "apply", "map", "plot", "统计",
            "mean", "std", "max", "min", "sum", "sort", "dropna",
            "matplotlib", "seaborn", "可视化", "图表",
        ],
        "fragments": [],
    },
    {
        "id": "visualization",
        "name": "可视化",
        "domain": "Matplotlib/Seaborn/Plotly",
        "keywords": [
            "matplotlib", "seaborn", "plot", "chart", "figure", "axes",
            "subplot", "legend", "label", "title", "color", "style",
            "bar", "line", "scatter", "histogram", "boxplot", "heatmap",
            "可视化", "图表", "绘图",
        ],
        "fragments": [],
    },
    {
        "id": "database",
        "name": "数据库",
        "domain": "SQL/Redis/MongoDB",
        "keywords": [
            "database", "sql", "mysql", "postgresql", "sqlite", "redis",
            "mongodb", "orm", "query", "table", "column", "row", "index",
            "select", "insert", "update", "delete", "join", "where",
            "primary key", "foreign key", "事务", "ACID", "缓存",
            "nosql", "document", "collection", "schema", "migration",
        ],
        "fragments": [],
    },
    {
        "id": "testing",
        "name": "测试",
        "domain": "Pytest/Quality",
        "keywords": [
            "pytest", "unittest", "test", "assert", "fixture", "parametrize",
            "coverage", "mock", "patch", "spy", "verify",
            "测试", "单元测试", "集成测试", "回归测试", "质量",
        ],
        "fragments": [],
    },
    {
        "id": "tools",
        "name": "工具",
        "domain": "CLI/DevTools",
        "keywords": [
            "cli", "command", "argument", "parser", "click", "argparse",
            "config", "setting", "option", "flag", "verbose", "help",
            "tool", "utility", "library", "package", "module",
            "开发工具", "命令行", "工具库",
        ],
        "fragments": [],
    },
    {
        "id": "security",
        "name": "安全",
        "domain": "Crypto/Auth",
        "keywords": [
            "security", "crypto", "encrypt", "decrypt", "hash", "sha",
            "ssl", "tls", "certificate", "key", "password", "token",
            "JWT", "OAuth", "authentication", "authorization",
            "安全", "加密", "认证", "授权",
        ],
        "fragments": [],
    },
    {
        "id": "distributed",
        "name": "分布式",
        "domain": "Ray/Celery/Dask",
        "keywords": [
            "distributed", "cluster", "parallel", "task", "worker",
            "queue", "broker", "schedule", "cron", "async", "celery",
            "ray", "dask", "scalable", "load balance",
            "分布式", "集群", "并行", "异步",
        ],
        "fragments": [],
    },
    {
        "id": "template",
        "name": "模板引擎",
        "domain": "Jinja2/Template",
        "keywords": [
            "template", "jinja", "jinja2", "render", "context", "block",
            "extends", "include", "variable", "expression", "filter",
            "macro", "loop", "if", "for", "模板", "渲染",
        ],
        "fragments": [],
    },
    {
        "id": "validation",
        "name": "数据验证",
        "domain": "Pydantic/Schema",
        "keywords": [
            "pydantic", "schema", "model", "field", "validator", "type",
            "constraint", "validate", "parse", "serialization", "deserialize",
            "BaseModel", "Field", "validator", "数据验证",
        ],
        "fragments": [],
    },
]


def load_corpus(path: str) -> Dict:
    """加载语料库并返回结构化数据"""
    print(f"加载语料库: {path}")
    if path.endswith('.gz'):
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            data = json.load(f)
    else:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    
    all_fragments = data.get('all_fragments', [])
    repos = data.get('repos', {})
    print(f"  片段总数: {len(all_fragments):,}")
    print(f"  仓库数: {len(repos)}")
    
    return {
        'fragments': all_fragments,
        'repos': repos,
        'repo_names': list(repos.keys()),
    }


def build_repo_fragment_map(corpus_data: Dict) -> Dict[str, List[str]]:
    """构建 仓库→片段 的映射
    
    由于 all_fragments 是一个扁平列表，而 repos 只记录了每个仓库的片段数量，
    我们采用以下策略：
    1. 根据 repos 中记录的片段数量，按比例从 all_fragments 中分配
    2. 使用随机但确定的种子分配，确保可复现
    """
    fragments = corpus_data['fragments']
    repos = corpus_data['repos']
    
    import hashlib
    
    repo_fragments: Dict[str, List[str]] = {}
    
    if not repos:
        return {'unknown': fragments}
    
    # 计算每个仓库的片段数量
    repo_names = sorted(repos.keys())
    repo_counts = {}
    for name in repo_names:
        info = repos[name]
        if isinstance(info, dict):
            count = info.get('fragments', 0)
            if isinstance(count, int):
                repo_counts[name] = count
    
    if not repo_counts:
        return {'unknown': fragments}
    
    total_repo_frags = sum(repo_counts.values())
    total_available = len(fragments)
    
    print(f"  仓库记录的总片段数: {total_repo_frags:,}")
    print(f"  实际可用片段数: {total_available:,}")
    
    # 按比例分配
    scale_factor = total_available / total_repo_frags if total_repo_frags > 0 else 1.0
    
    # 生成确定性的索引映射
    all_indices = list(range(total_available))
    
    assigned = set()
    for repo_name in repo_names:
        count = repo_counts.get(repo_name, 0)
        if count <= 0:
            repo_fragments[repo_name] = []
            continue
        
        # 计算实际分配数量
        actual_count = min(int(count * scale_factor), total_available - len(assigned))
        actual_count = max(0, actual_count)
        
        if actual_count == 0:
            repo_fragments[repo_name] = []
            continue
        
        # 确定性选择（使用 hash 作为种子）
        seed = int(hashlib.md5(repo_name.encode()).hexdigest()[:8], 16)
        import numpy as np
        rng = np.random.default_rng(seed)
        
        # 从未分配的索引中选择
        remaining = [i for i in all_indices if i not in assigned]
        if len(remaining) <= actual_count:
            selected = remaining
        else:
            selected = list(rng.choice(remaining, size=actual_count, replace=False))
        
        selected = [int(i) for i in selected]
        assigned.update(selected)
        repo_fragments[repo_name] = [fragments[i] for i in selected]
    
    # 将剩余片段分配给 general
    remaining_frags = [fragments[i] for i in range(total_available) if i not in assigned]
    if remaining_frags:
        repo_fragments['_unassigned_'] = remaining_frags
    
    total_assigned = sum(len(v) for v in repo_fragments.values())
    print(f"  已分配: {len(repo_fragments)} 个仓库, 共 {total_assigned:,} 片段")
    
    return repo_fragments


def train_v2(
    corpus_path: str,
    ckpt_dir: str,
    scale: str = "large",
    epochs: int = 1,
):
    """V2 训练：基于仓库路由"""
    print("=" * 60)
    print("  合鸣模型 V2 训练 - 基于仓库快速路由")
    print("=" * 60)
    
    # 1. 加载语料
    corpus_data = load_corpus(corpus_path)
    repo_fragments = build_repo_fragment_map(corpus_data)
    all_fragments = corpus_data['fragments']
    
    # 2. 加载/初始化引擎
    print("\n初始化引擎...")
    from fusion_engine.models.harmonia.harmonia13 import HarmoniaLiteEngine
    
    engine = HarmoniaLiteEngine(ckpt_dir=ckpt_dir, scale=scale)
    
    # 添加新专家
    existing_ids = {e['id'] for e in engine.experts}
    for exp in EXTRA_EXPERTS:
        if exp['id'] not in existing_ids:
            engine.experts.insert(-1, exp)  # 插入到 general 之前
            print(f"  添加新专家: {exp['id']}")
    
    before_total = sum(len(e['fragments']) for e in engine.experts)
    print(f"  训练前 - 专家数: {len(engine.experts)}, 片段总数: {before_total:,}")
    
    # 3. 基于仓库路由训练
    print(f"\n开始训练 ({epochs} epochs)...")
    total_start = time.time()
    
    for epoch in range(epochs):
        epoch_start = time.time()
        
        # 按仓库分组处理
        total_routed = 0
        total_new_kws = 0
        
        for repo_name, frags in sorted(repo_fragments.items()):
            if not frags:
                continue
            
            # 查找对应的专家
            expert_id = REPO_TO_EXPERT.get(repo_name, 'general')
            exp = engine._find(expert_id)
            
            if exp is None:
                exp = engine._find('general')
                expert_id = 'general'
            
            if exp is None:
                continue
            
            # 质量过滤
            clean_frags = []
            for f in frags:
                f = str(f).strip()
                if len(f) >= 25 and len(f) <= 600:
                    clean_frags.append(f)
            
            if not clean_frags:
                continue
            
            # 添加片段到专家
            exp['fragments'].extend(clean_frags)
            total_routed += len(clean_frags)
            
            # 为该专家添加仓库相关关键词
            new_kws = _extract_repo_keywords(repo_name, clean_frags, exp['keywords'])
            if new_kws:
                for kw in new_kws:
                    if kw not in exp['keywords']:
                        exp['keywords'].append(kw)
                total_new_kws += len(new_kws)
        
        # 更新 learned_fragments
        engine._learned_fragments.extend(all_fragments)
        
        epoch_time = time.time() - epoch_start
        after_total = sum(len(e['fragments']) for e in engine.experts)
        
        print(f"  Epoch {epoch+1} 完成:")
        print(f"    路由片段: {total_routed:,}")
        print(f"    新增关键词: {total_new_kws}")
        print(f"    当前总片段: {after_total:,}")
        print(f"    耗时: {epoch_time:.1f}s")
    
    total_time = time.time() - total_start
    
    # 4. 最终统计
    after_total = sum(len(e['fragments']) for e in engine.experts)
    
    print(f"\n{'=' * 60}")
    print(f"  训练完成！")
    print(f"  总耗时: {total_time:.1f}s")
    print(f"  片段增长: {before_total:,} → {after_total:,} (+{after_total - before_total:,})")
    
    # 5. 保存
    print(f"\n保存检查点...")
    result = engine.save(ckpt_dir)
    ckpt_size = os.path.getsize(result['path']) / 1024 / 1024
    print(f"  路径: {result['path']}")
    print(f"  大小: {ckpt_size:.1f} MB")
    
    # 6. 打印各专家统计
    print(f"\n{'=' * 60}")
    print(f"  专家统计")
    print(f"{'=' * 60}")
    for exp in engine.experts:
        print(f"  {exp['id']:20s} | {len(exp['fragments']):>8,} 片段 | {len(exp['keywords']):>4} 关键词")
    
    # 7. 快速验证
    print(f"\n{'=' * 60}")
    print(f"  验证生成")
    print(f"{'=' * 60}")
    test_prompts = [
        "Flask 路由怎么写？",
        "PyTorch 张量操作",
        "Docker 容器部署",
        "Python 异步编程",
        "Redis 缓存优化",
        "什么是 MoE？",
    ]
    for prompt in test_prompts:
        t0 = time.time()
        response = engine.generate(prompt, max_new_tokens=150, temperature=0.7)
        elapsed = time.time() - t0
        print(f"\n  Q: {prompt}")
        print(f"  A ({elapsed:.2f}s): {response[:120]}...")
    
    return engine


def _extract_repo_keywords(repo_name: str, fragments: List[str], existing_kws: List[str]) -> List[str]:
    """从仓库名和片段中提取关键词"""
    import re
    
    new_kws = []
    existing = set(k.lower() for k in existing_kws)
    
    # 添加仓库名本身
    repo_lower = repo_name.lower()
    if repo_lower not in existing:
        new_kws.append(repo_lower)
    
    # 从片段中提取高频英文词
    word_counts: Dict[str, int] = {}
    for frag in fragments[:100]:  # 只看前100个片段即可
        words = re.findall(r'[a-zA-Z][a-zA-Z0-9_]{2,}', frag.lower())
        for w in words:
            if len(w) >= 4 and w not in existing:
                word_counts[w] = word_counts.get(w, 0) + 1
    
    # 选择高频词（出现至少3次）
    for w, c in sorted(word_counts.items(), key=lambda x: x[1], reverse=True):
        if c >= 3 and len(new_kws) < 15:
            new_kws.append(w)
    
    return new_kws


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="训练合鸣模型 V2")
    parser.add_argument("--corpus", default="/workspace/xuni/corpus_clean_large.json.gz")
    parser.add_argument("--ckpt-dir", default="fusion_engine/models/harmonia/checkpoints")
    parser.add_argument("--scale", default="large", choices=["small", "medium", "large"])
    parser.add_argument("--epochs", type=int, default=1)
    args = parser.parse_args()
    
    train_v2(
        corpus_path=args.corpus,
        ckpt_dir=args.ckpt_dir,
        scale=args.scale,
        epochs=args.epochs,
    )
