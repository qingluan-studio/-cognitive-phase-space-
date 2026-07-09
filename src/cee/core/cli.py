"""
CEE CLI — 命令行工具

Usage:
  cee-evaluate "text to evaluate"
  cee-evaluate --file input.txt
  cee-benchmark
  cee-adversarial evaluate --text "..."
  cee-adversarial experiment --type deviation_detection
  cee-adversarial status
  cee-adversarial precedent list
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


def adversarial():
    """对抗治理 CLI 主入口."""
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return

    subcommand = sys.argv[1]
    if subcommand == "evaluate":
        _adversarial_evaluate()
    elif subcommand == "experiment":
        _adversarial_experiment()
    elif subcommand == "status":
        _adversarial_status()
    elif subcommand == "precedent":
        _adversarial_precedent()
    else:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        print(__doc__)


def _adversarial_evaluate():
    """对抗治理单次评估."""
    from cee.governance.adversarial import AdversarialGovernance
    from cee.engine.t6_invariant import InvariantEngine
    import numpy as np

    text = ""
    domain = "text_quality_assessment"

    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == "--text" and i + 1 < len(args):
            text = args[i + 1]
            i += 2
        elif args[i] == "--file" and i + 1 < len(args):
            path = Path(args[i + 1])
            if not path.exists():
                print(f"Error: file not found: {path}", file=sys.stderr)
                sys.exit(1)
            text = path.read_text()
            i += 2
        elif args[i] == "--domain" and i + 1 < len(args):
            domain = args[i + 1]
            i += 2
        else:
            i += 1

    if not text.strip():
        print("Error: no text provided. Use --text or --file", file=sys.stderr)
        sys.exit(1)

    gov = AdversarialGovernance()
    engine = InvariantEngine()
    scores = engine.evaluate(text)
    builder_dir = np.array([0.2, 0.2, 0.2, 0.2])

    result = gov.process_round(
        content=text,
        current_scores=scores,
        builder_direction=builder_dir,
        domain_boundaries=[domain],
    )

    output = {
        "round": result.round_number,
        "game_state": result.game_state.value,
        "innovation_score": result.builder_output.innovation_score,
        "deviation_detected": result.watcher_output.is_malignant,
        "deviation_confidence": result.watcher_output.confidence,
        "deviation_types": [
            e.deviation_type.label_cn for e in result.watcher_output.evidence
        ],
        "recommendation": result.watcher_output.recommendation,
        "builder_role": result.builder_role_agent,
        "watcher_role": result.watcher_role_agent,
        "convergence_score": result.convergence_score,
        "iterations": result.iterations,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))


def _adversarial_experiment():
    """运行对抗治理实验."""
    from cee.governance.adversarial import (
        AdversarialGovernance, DeviationDetector, DeviationType,
    )
    from cee.engine.t6_invariant import InvariantEngine
    import numpy as np

    exp_type = "deviation_detection"
    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == "--type" and i + 1 < len(args):
            exp_type = args[i + 1]
            i += 2
        else:
            i += 1

    if exp_type == "deviation_detection":
        _run_deviation_detection_experiment()
    elif exp_type == "innovation_protection":
        _run_innovation_protection_experiment()
    elif exp_type == "long_term_stability":
        _run_long_term_stability_experiment()
    else:
        print(f"Unknown experiment type: {exp_type}")
        print("Available: deviation_detection, innovation_protection, long_term_stability")


def _run_deviation_detection_experiment():
    detector = DeviationDetector()

    test_cases = [
        ("严谨性退化", (
            "This approach seems to work very well, and many people feel it is "
            "quite effective. It appears to be roughly better in some ways, and "
            "generally speaking it is probably the right direction."
        )),
        ("范式回归", (
            "I think this is good because in my opinion it feels right. My "
            "experience tells me this works, and I believe the human evaluation "
            "confirms it."
        )),
        ("无依据声称", (
            "This revolutionary approach significantly improved performance "
            "and dramatically enhanced results. It clearly shows unprecedented "
            "breakthroughs that prove our approach is groundbreaking."
        )),
        ("维度错位", (
            "The output is well-written, eloquent, and beautiful. The writing "
            "is elegant, engaging, and very readable."
        )),
        ("短期架构", (
            "This is a quick fix for now. The hardcoded value is a temporary "
            "workaround. Remove this placeholder later."
        )),
        ("边界超限", (
            "Our system can also do image recognition and NLP. It works for "
            "any domain without any limitation or restriction."
        )),
        ("合法创新(对照)", (
            "The structural coherence analysis shows a measured improvement "
            "of 15.3% (p < 0.01) with formal fidelity maintained at 0.92 "
            "across all evaluated dimensions."
        )),
    ]

    print("=" * 70)
    print("实验一：偏离检出有效性测试")
    print("=" * 70)

    detected = 0
    total_malignant = 6
    false_positive = 0

    for label, content in test_cases:
        report = detector.detect_all(content)
        types = [e.deviation_type.label_cn for e in report.evidence]
        status = "检出" if report.is_malignant else "放行"
        print(f"\n[{label}] -> {status}")
        print(f"  置信度: {report.confidence:.3f}")
        print(f"  检出类型: {', '.join(types) if types else '无'}")
        if report.is_malignant:
            detected += 1
        elif label != "合法创新(对照)":
            false_positive += 1

    print(f"\n{'=' * 70}")
    print(f"恶性偏离检出率: {detected}/{total_malignant} = {detected/total_malignant*100:.1f}%")
    print(f"创新误杀率: {false_positive}/6 = {false_positive/6*100:.1f}%")
    print("=" * 70)


def _run_innovation_protection_experiment():
    detector = DeviationDetector()

    test_cases = [
        ("高维创新试探", (
            "We propose a novel framework that extends invariant manifold "
            "theory to multi-dimensional phase spaces. The formal proof "
            "demonstrates convergence under all admissible transformations."
        )),
        ("高风险高增益", (
            "This framework introduces an entirely new class of cognitive "
            "invariants with mathematical foundation extending to continuous "
            "semantic manifolds. Benchmark: 23% improvement, p = 0.0001."
        )),
        ("正常波动", (
            "Routine analysis shows minor fluctuations from 0.82 to 0.79, "
            "within expected oscillation range of +-0.05."
        )),
    ]

    print("=" * 70)
    print("实验二：零误杀创新保护测试")
    print("=" * 70)

    false_positives = 0
    for label, content in test_cases:
        report = detector.detect_all(content)
        status = "放行" if not report.is_malignant else "误杀!"
        print(f"\n[{label}] -> {status}")
        print(f"  置信度: {report.confidence:.3f}")
        if report.is_malignant:
            false_positives += 1

    print(f"\n{'=' * 70}")
    print(f"误报率: {false_positives}/{len(test_cases)} = {false_positives/len(test_cases)*100:.1f}%")
    print(f"合格: {'PASS' if false_positives == 0 else 'FAIL'}")
    print("=" * 70)


def _run_long_term_stability_experiment():
    from cee.governance.adversarial import AdversarialGovernance
    from cee.core.types import InvariantScores
    import numpy as np

    gov = AdversarialGovernance(rotation_interval=3)

    def make_scores(itc=0.7, scs=0.7, iec=0.7, pfft=0.7):
        return InvariantScores(
            iterative_coherence=itc,
            structural_coherence=scs,
            information_efficiency=iec,
            formal_fidelity=pfft,
        )

    print("=" * 70)
    print("实验四：长期博弈稳态测试")
    print("=" * 70)

    innovation_scores = []
    total_rounds = 20

    for i in range(total_rounds):
        content = (
            f"Round {i}: The structural coherence analysis shows consistent "
            f"metrics with iterative convergence at {0.7 + (i % 3) * 0.05:.2f} "
            f"and formal fidelity within expected bounds. Measured improvement "
            f"of {3 + i % 5}% with statistical significance p < 0.05."
        )
        result = gov.process_round(
            content, make_scores(),
            np.array([0.05, 0.05, 0.05, 0.05]),
        )
        innovation_scores.append(result.builder_output.innovation_score)

    first_avg = np.mean(innovation_scores[:5])
    last_avg = np.mean(innovation_scores[-5:])
    rotations = gov.rotation_manager.get_rotation_stats()["total_rotations"]

    print(f"总轮次: {total_rounds}")
    print(f"角色轮换次数: {rotations}")
    print(f"前5轮平均创新得分: {first_avg:.4f}")
    print(f"后5轮平均创新得分: {last_avg:.4f}")
    print(f"创新能力衰减: {(first_avg - last_avg) / first_avg * 100:.1f}%")
    print(f"稳态判定: {'PASS' if last_avg > first_avg * 0.5 else 'WARN'}")

    session = gov.get_session_report()
    print(f"收敛率: {session['convergence_rate']:.2%}")
    print(f"冻结事件: {session['frozen_events']}")
    print(f"人类升级: {session['human_escalations']}")
    print(f"判例库规模: {session['precedent_stats']['total_cases']}")
    print("=" * 70)


def _adversarial_status():
    """查看对抗治理状态."""
    from cee.governance.adversarial import PrecedentStore

    store = PrecedentStore()
    stats = store.stats()

    print("=" * 60)
    print("CEE 对抗治理系统状态")
    print("=" * 60)
    print(f"判例总数: {stats['total_cases']}")
    print(f"已否决判例: {stats['overruled']}")
    print(f"\n按偏离类型分布:")
    for dtype, count in stats.get("by_type", {}).items():
        print(f"  {dtype}: {count}")
    print(f"\n按裁决分布:")
    for verdict, count in stats.get("by_verdict", {}).items():
        print(f"  {verdict}: {count}")
    print("=" * 60)


def _adversarial_precedent():
    """判例管理."""
    from cee.governance.adversarial import PrecedentStore

    if len(sys.argv) < 3:
        print("Usage: cee-adversarial precedent <list|export|import> [options]")
        return

    action = sys.argv[2]
    store = PrecedentStore()

    if action == "list":
        cases = store.find_by_type(
            next(iter(store._type_index.keys()))
            if store._type_index else None
        )
        if not cases:
            print("No precedents stored yet.")
            return
        for c in cases[:20]:
            print(f"  {c.case_id[:16]} | {c.deviation_type.value} | "
                  f"{c.verdict.value} | {c.legal_rationale[:50]}")

    elif action == "export":
        output_path = "precedents.jsonl"
        args = sys.argv[3:]
        i = 0
        while i < len(args):
            if args[i] == "--output" and i + 1 < len(args):
                output_path = args[i + 1]
                i += 2
            else:
                i += 1
        store.export_jsonl(output_path)
        print(f"Exported to {output_path}")

    elif action == "import":
        input_path = "precedents.jsonl"
        args = sys.argv[3:]
        i = 0
        while i < len(args):
            if args[i] == "--input" and i + 1 < len(args):
                input_path = args[i + 1]
                i += 2
            else:
                i += 1
        store.import_jsonl(input_path)
        print(f"Imported from {input_path}")
        print(f"Total cases: {store.stats()['total_cases']}")
