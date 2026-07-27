#!/usr/bin/env python3
"""
从开源语料库训练合鸣模型

用法:
    python train_from_corpus.py [--corpus /path/to/corpus.json.gz] [--epochs N]
"""
import sys
import json
import gzip
import os
import time
import argparse
from typing import List, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from fusion_engine.models.harmonia.harmonia13 import HarmoniaLiteEngine


def load_corpus(path: str) -> List[str]:
    """加载语料库，提取代码片段列表"""
    print(f"加载语料库: {path}")
    if path.endswith('.gz'):
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            data = json.load(f)
    else:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    
    if isinstance(data, list):
        fragments = [str(x) for x in data if str(x).strip()]
    elif isinstance(data, dict):
        # 提取 all_fragments 或 fragments 字段
        fragments = []
        for key in ('all_fragments', 'fragments', 'clean_fragments'):
            if key in data and isinstance(data[key], list):
                fragments.extend([str(x) for x in data[key] if str(x).strip()])
        # 如果没有上述字段，尝试从 file_particles 或 repos 中提取
        if not fragments and 'file_particles' in data:
            for fp in data['file_particles']:
                if isinstance(fp, dict) and 'summary' in fp:
                    fragments.append(fp['summary'])
        if not fragments:
            print(f"  警告: 未找到标准语料字段，尝试提取所有字符串...")
            def extract_strings(obj, depth=0):
                result = []
                if isinstance(obj, str) and len(obj) > 20:
                    result.append(obj)
                elif isinstance(obj, (list, tuple)):
                    for item in obj:
                        result.extend(extract_strings(item, depth + 1))
                elif isinstance(obj, dict):
                    for v in obj.values():
                        result.extend(extract_strings(v, depth + 1))
                return result
            fragments = extract_strings(data)
    else:
        raise ValueError(f"未知语料格式: {type(data)}")
    
    # 清理和去重
    seen = set()
    clean = []
    for frag in fragments:
        frag = frag.strip()
        if len(frag) < 15:
            continue
        key = frag[:100]
        if key not in seen:
            seen.add(key)
            clean.append(frag)
    
    print(f"  提取到 {len(clean):,} 个有效代码片段")
    return clean


def train(
    corpus_path: str,
    ckpt_dir: str,
    scale: str = "large",
    epochs: int = 3,
    batch_size: int = 10000,
    test_prompts: Optional[List[str]] = None,
):
    """训练主函数"""
    print("=" * 60)
    print("  合鸣模型大规模训练")
    print("=" * 60)
    print(f"  语料: {corpus_path}")
    print(f"  检查点: {ckpt_dir}")
    print(f"  规模: {scale}")
    print(f"  Epochs: {epochs}")
    print()

    # 1. 加载语料
    fragments = load_corpus(corpus_path)
    if not fragments:
        print("错误: 未加载到任何语料")
        sys.exit(1)

    # 2. 初始化引擎
    print("\n初始化引擎...")
    engine = HarmoniaLiteEngine(ckpt_dir=ckpt_dir, scale=scale)
    
    before_total = sum(len(e['fragments']) for e in engine.experts)
    before_learned = len(engine._learned_fragments)
    print(f"  训练前 - 专家片段: {before_total:,}, 已学习: {before_learned:,}")

    # 3. 分批训练
    print(f"\n开始训练 ({epochs} epochs)...")
    total_start = time.time()
    
    for epoch in range(epochs):
        epoch_start = time.time()
        epoch_learned = 0
        
        for batch_idx in range(0, len(fragments), batch_size):
            batch = fragments[batch_idx:batch_idx + batch_size]
            
            # 训练这一批
            old_count = len(engine._learned_fragments)
            engine.train(data=batch, epochs=1)
            new_count = len(engine._learned_fragments)
            learned = new_count - old_count
            epoch_learned += learned
            
            progress = min(100, (batch_idx + batch_size) / len(fragments) * 100)
            elapsed = time.time() - epoch_start
            print(
                f"  Epoch {epoch+1}/{epochs} | "
                f"Batch {batch_idx//batch_size + 1}/{(len(fragments)-1)//batch_size + 1} | "
                f"进度 {progress:.0f}% | "
                f"本批 {learned:,} | "
                f"累计 {new_count:,} | "
                f"耗时 {elapsed:.1f}s",
                end='\r'
            )
        
        epoch_time = time.time() - epoch_start
        print(f"\n  Epoch {epoch+1} 完成 - 新增 {epoch_learned:,} 片段, 耗时 {epoch_time:.1f}s")

    total_time = time.time() - total_start
    
    # 4. 统计训练结果
    after_total = sum(len(e['fragments']) for e in engine.experts)
    after_learned = len(engine._learned_fragments)
    
    print(f"\n{'=' * 60}")
    print(f"  训练完成！")
    print(f"  总耗时: {total_time:.1f}s")
    print(f"  专家片段: {before_total:,} → {after_total:,} (新增 {after_total - before_total:,})")
    print(f"  已学习: {before_learned:,} → {after_learned:,} (新增 {after_learned - before_learned:,})")
    
    # 5. 保存检查点
    print(f"\n保存检查点...")
    result = engine.save(ckpt_dir)
    ckpt_size = os.path.getsize(result['path']) / 1024 / 1024
    print(f"  路径: {result['path']}")
    print(f"  大小: {ckpt_size:.1f} MB")
    
    # 6. 测试生成
    if test_prompts:
        print(f"\n{'=' * 60}")
        print(f"  验证生成效果")
        print(f"{'=' * 60}")
        for prompt in test_prompts:
            print(f"\n  问题: {prompt}")
            t0 = time.time()
            response = engine.generate(prompt, max_new_tokens=200, temperature=0.7)
            elapsed = time.time() - t0
            print(f"  回答 ({elapsed:.2f}s):")
            for line in response.split('\n'):
                if line.strip():
                    print(f"    {line.strip()[:100]}")
    
    print(f"\n{'=' * 60}")
    return engine


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="训练合鸣模型")
    parser.add_argument(
        "--corpus",
        default="/workspace/xuni/corpus_clean_large.json.gz",
        help="语料库路径",
    )
    parser.add_argument(
        "--ckpt-dir",
        default="fusion_engine/models/harmonia/checkpoints",
        help="检查点目录",
    )
    parser.add_argument(
        "--scale",
        default="large",
        choices=["small", "medium", "large"],
        help="模型规模",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="训练轮数",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10000,
        help="每批训练的片段数",
    )
    args = parser.parse_args()
    
    test_prompts = [
        "Flask 路由怎么写？",
        "PyTorch 张量操作",
        "Git 常用命令",
        "Docker 容器部署",
        "Python 异步编程",
        "Redis 缓存优化",
    ]
    
    train(
        corpus_path=args.corpus,
        ckpt_dir=args.ckpt_dir,
        scale=args.scale,
        epochs=args.epochs,
        batch_size=args.batch_size,
        test_prompts=test_prompts,
    )
