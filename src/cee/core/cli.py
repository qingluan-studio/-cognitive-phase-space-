"""
CEE CLI — 命令行工具

Usage:
  cee-evaluate "text to evaluate"
  cee-evaluate --file input.txt
  cee-benchmark
"""

import json
import sys
from pathlib import Path


def evaluate():
    """CLI 评估入口."""
    from cee.engine.t6_invariant import InvariantEngine

    engine = InvariantEngine()

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "--file" and len(sys.argv) > 2:
            path = Path(sys.argv[2])
            if not path.exists():
                print(f"Error: file not found: {path}", file=sys.stderr)
                sys.exit(1)
            text = path.read_text()
        elif arg in ("-h", "--help"):
            print(__doc__)
            return
        else:
            text = arg
    else:
        text = sys.stdin.read()

    if not text.strip():
        print("Error: no text provided", file=sys.stderr)
        sys.exit(1)

    result = engine.evaluate_detailed(text)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def benchmark():
    """基准测试入口."""
    from cee.engine.t6_invariant import InvariantEngine

    engine = InvariantEngine()

    samples = {
        "high_quality": (
            "The cognitive emergence engine demonstrates that knowledge structure "
            "and expression are separable properties. By evaluating structural "
            "invariants — topological compactness, curvature smoothness, entropy "
            "criticality, and projection fidelity — we can autonomously assess "
            "content quality without human annotation. The closed-loop system "
            "automatically optimizes content through iterative refinement, "
            "selecting the best optimization path from five cognitive engines."
        ),
        "medium_quality": (
            "This is a somewhat decent text. It has some structure, but could be "
            "better organized. There are a few key points here and there, though "
            "the flow is not always smooth. The ideas are there but not fully "
            "developed. Overall it's OK but needs work."
        ),
        "low_quality": (
            "stuff things random words scattered mess chaos disorder broken "
            "fragmented incomplete unclear vague ambiguous unclear uncertain "
        ),
        "chinese_sample": (
            "认知涌现引擎证明知识的结构和表达是可分离的属性。通过评估结构不变量"
            "——拓扑紧致性、曲率平滑度、熵临界性和投影保真度——我们可以在没有"
            "人类标注的情况下自主评估内容质量。闭环系统通过迭代精炼自动优化内容，"
            "从五个认知引擎中选择最佳优化路径。"
        ),
    }

    print("=" * 60)
    print("CEE T6 Invariant Engine — Benchmark")
    print("=" * 60)

    results = []
    for label, text in samples.items():
        scores = engine.evaluate(text)
        print(f"\n[{label}]")
        print(f"  ITC:  {scores.itc:.4f}  (Compactness)")
        print(f"  SCS:  {scores.scs:.4f}  (Smoothness)")
        print(f"  IEC:  {scores.iec:.4f}  (Entropy Criticality)")
        print(f"  PFFT: {scores.pfft:.4f}  (Fidelity-Flexibility)")
        print(f"  ---> Composite: {scores.composite:.4f}  [{scores.tier.value}]")
        results.append((label, scores.composite))

    print("\n" + "-" * 60)
    print("Summary:")
    for label, score in results:
        print(f"  {label:.<25s} {score:.4f}")

    scores_only = [s for _, s in results]
    print(f"  Mean: {sum(scores_only) / len(scores_only):.4f}")
    print("=" * 60)
