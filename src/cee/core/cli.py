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
  cee-agent run --goal "..." --roles researcher,architect,coder
  cee-plugin list
  cee-process long-text --file input.txt
  cee-process pipeline --pipeline analyze
  cee-process read --file doc.md
  cee-learn feedback add --score 0.8
  cee-learn analyze
  cee-learn tune --params threshold:0.5,0.7,0.9
  cee-learn toggle [session_id] [on|off]
  cee-learn stats [session_id]
  cee-learn recall [session_id] [query]
  cee-learn config [session_id] [key=value ...]
  cee-cloud detect
  cee-cloud generate docker
  cee-cloud generate k8s
  cee-cloud health
  cee-perf stats
  cee-perf respond "query text"
  cee-multimodal info
  cee-models list
  cee-models kimi
  cee-knowledge learn "fact text"
  cee-knowledge query "keyword"
  cee-knowledge synthesize --topic "..."
  cee-output format --text "..." --style concise
  cee-output save --text "..." --file output.txt
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
    from cee.governance.adversarial import DeviationDetector

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
    from cee.governance.adversarial import DeviationDetector

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
            itc=itc,
            scs=scs,
            iec=iec,
            pfft=pfft,
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


def agent():
    """Multi-agent orchestration CLI."""
    from cee.agent import (
        MultiAgentOrchestrator, AgentRole as _AgentRole, TaskStatus,
    )

    if len(sys.argv) < 2:
        print("Usage: cee-agent run --goal \"...\" [--roles R1,R2,R3] [--status]")
        return

    subcmd = sys.argv[1]

    if subcmd == "run":
        goal = ""
        roles_str = ""
        args = sys.argv[2:]
        i = 0
        while i < len(args):
            if args[i] == "--goal" and i + 1 < len(args):
                goal = args[i + 1]; i += 2
            elif args[i] == "--roles" and i + 1 < len(args):
                roles_str = args[i + 1]; i += 2
            else:
                i += 1
        if not goal:
            print("Error: --goal required", file=sys.stderr)
            return
        orchestrator = MultiAgentOrchestrator()
        if roles_str:
            roles = [getattr(_AgentRole, r.strip().upper(), _AgentRole.RESEARCHER)
                     for r in roles_str.split(",")]
        else:
            roles = [_AgentRole.RESEARCHER, _AgentRole.ARCHITECT, _AgentRole.CODER,
                     _AgentRole.REVIEWER, _AgentRole.SYNTHESIZER]
        orchestrator.form_team(roles)
        result = orchestrator.execute(goal)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif subcmd == "status":
        orchestrator = MultiAgentOrchestrator()
        print(json.dumps(orchestrator.status, ensure_ascii=False, indent=2))


def plugin():
    """Plugin management CLI."""
    from cee.plugin import PluginManager

    if len(sys.argv) < 2:
        print("Usage: cee-plugin [list|discover|status]")
        return

    subcmd = sys.argv[1]
    manager = PluginManager()

    if subcmd == "list":
        plugins = manager.list_plugins()
        if not plugins:
            print("No plugins registered")
        else:
            for p in plugins:
                meta = p.get_metadata()
                print(f"  {meta.name} v{meta.version} [{meta.category.value}] — {meta.description}")
        print(f"\nTotal: {len(plugins)} plugins")

    elif subcmd == "discover":
        paths = sys.argv[2:] if len(sys.argv) > 2 else ["."]
        count = manager.discover_plugins(paths)
        print(f"Discovered {count} plugins")

    elif subcmd == "status":
        print(json.dumps(manager.status, ensure_ascii=False, indent=2))


def process():
    """Document and data processing CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-process [long-text|pipeline|read|format] [options]")
        return

    subcmd = sys.argv[1]

    if subcmd == "long-text":
        from cee.processing import LongTextProcessor, ChunkStrategy
        text = ""
        args = sys.argv[2:]
        i = 0
        while i < len(args):
            if args[i] == "--file" and i + 1 < len(args):
                text = Path(args[i + 1]).read_text(); i += 2
            elif args[i] == "--text" and i + 1 < len(args):
                text = args[i + 1]; i += 2
            elif args[i] == "--stdin":
                text = sys.stdin.read(); i += 1
            else:
                i += 1
        if not text:
            text = sys.stdin.read()
        processor = LongTextProcessor(chunk_size=1000, overlap=100)
        report = processor.process(text)
        print(f"Original: {report.original_length} chars → {report.chunk_count} chunks at depth {report.depth}")
        print(f"Key phrases: {', '.join(report.key_phrases[:10])}")
        print(f"Summary: {report.summary[:300]}")

    elif subcmd == "pipeline":
        from cee.processing import DataPipeline, TextTransformer, OutputFormatter, OutputFormat
        text = ""
        pipeline_name = "default"
        args = sys.argv[2:]
        i = 0
        while i < len(args):
            if args[i] == "--file" and i + 1 < len(args):
                text = Path(args[i + 1]).read_text(); i += 2
            elif args[i] == "--text" and i + 1 < len(args):
                text = args[i + 1]; i += 2
            elif args[i] == "--pipeline" and i + 1 < len(args):
                pipeline_name = args[i + 1]; i += 2
            else:
                i += 1
        if not text:
            text = sys.stdin.read()
        pipeline = DataPipeline(name=pipeline_name)
        pipeline.add_transformer("normalize", TextTransformer.normalize_whitespace)
        pipeline.add_transformer("anonymize", TextTransformer.anonymize_emails)
        result = pipeline.run(text)
        print(json.dumps({
            "pipeline": result.pipeline_name,
            "input_size": result.input_size,
            "output_size": result.output_size,
            "steps": result.steps_executed,
            "duration": f"{result.duration:.4f}s",
        }, ensure_ascii=False, indent=2))

    elif subcmd == "read":
        from cee.processing import DocReader, DocumentFormat, OutputFormatter, OutputFormat
        text = ""
        fmt = DocumentFormat.PLAIN_TEXT
        args = sys.argv[2:]
        i = 0
        while i < len(args):
            if args[i] == "--file" and i + 1 < len(args):
                text = Path(args[i + 1]).read_text(); i += 2
            elif args[i] == "--text" and i + 1 < len(args):
                text = args[i + 1]; i += 2
            elif args[i] == "--format" and i + 1 < len(args):
                try:
                    fmt = DocumentFormat(args[i + 1])
                except ValueError:
                    pass
                i += 2
            else:
                i += 1
        if not text:
            text = sys.stdin.read()
        reader = DocReader()
        doc = reader.read(text, fmt)
        print(json.dumps({
            "title": doc.title,
            "format": doc.format.value,
            "word_count": doc.word_count,
            "char_count": doc.char_count,
            "reading_time_minutes": doc.reading_time_minutes,
            "sections": len(doc.sections),
            "metadata": doc.metadata,
        }, ensure_ascii=False, indent=2))

    elif subcmd == "format":
        from cee.processing import OutputFormatter, OutputFormat
        text = ""
        out_fmt = OutputFormat.MARKDOWN
        args = sys.argv[2:]
        i = 0
        while i < len(args):
            if args[i] == "--file" and i + 1 < len(args):
                text = Path(args[i + 1]).read_text(); i += 2
            elif args[i] == "--text" and i + 1 < len(args):
                text = args[i + 1]; i += 2
            elif args[i] == "--format" and i + 1 < len(args):
                try:
                    out_fmt = OutputFormat(args[i + 1])
                except ValueError:
                    pass
                i += 2
            elif args[i] == "--stdin":
                text = sys.stdin.read(); i += 1
            else:
                i += 1
        if not text:
            text = sys.stdin.read()
        formatter = OutputFormatter()
        data = {"title": "Document", "content": text, "length": len(text)}
        output = formatter.format(data, out_fmt)
        print(output)


def learn():
    """Auto-learning CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-learn [feedback|analyze|tune|toggle|stats|recall|config] [options]")
        return

    subcmd = sys.argv[1]

    if subcmd == "toggle":
        from cee.app.engine.context_memory import get_global_context
        session_id = sys.argv[2] if len(sys.argv) > 2 else "default"
        enabled = sys.argv[3].lower() in ("true", "on", "1", "yes") if len(sys.argv) > 3 else None

        cm = get_global_context(session_id)
        if enabled is not None:
            cm.toggle_learning(enabled)
            print(json.dumps({
                "session_id": session_id,
                "auto_learn_enabled": enabled,
                "message": f"自动学习已{'开启' if enabled else '关闭'}",
            }, ensure_ascii=False, indent=2))
        else:
            cfg = cm.get_config()
            print(json.dumps({
                "session_id": session_id,
                "auto_learn_enabled": cfg["auto_learn_enabled"],
            }, ensure_ascii=False, indent=2))

    elif subcmd == "stats":
        from cee.app.engine.context_memory import get_global_context
        session_id = sys.argv[2] if len(sys.argv) > 2 else "default"
        cm = get_global_context(session_id)
        print(json.dumps(cm.stats(), ensure_ascii=False, indent=2))

    elif subcmd == "recall":
        from cee.app.engine.context_memory import get_global_context
        session_id = sys.argv[2] if len(sys.argv) > 2 else "default"
        query = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
        cm = get_global_context(session_id)
        results = cm.recall(query, top_k=10)
        print(f"查询: {query}")
        for r in results:
            print(f"  {r}")

    elif subcmd == "config":
        from cee.app.engine.context_memory import get_global_context
        session_id = sys.argv[2] if len(sys.argv) > 2 else "default"
        cm = get_global_context(session_id)

        updates = {}
        for arg in sys.argv[3:]:
            if "=" in arg:
                k, v = arg.split("=", 1)
                if v.lower() in ("true", "on", "1", "yes"):
                    updates[k] = True
                elif v.lower() in ("false", "off", "0", "no"):
                    updates[k] = False
                else:
                    try:
                        updates[k] = float(v)
                    except ValueError:
                        updates[k] = v

        if updates:
            cm.set_config(**updates)
        print(json.dumps(cm.get_config(), ensure_ascii=False, indent=2))

    elif subcmd == "feedback":
        from cee.learning import FeedbackStore, FeedbackType
        store = FeedbackStore()
        store.add(score=0.85, feedback_type=FeedbackType.EXPLICIT, message="Great output", tags=["quality"])
        store.add(score=0.4, feedback_type=FeedbackType.EXPLICIT, message="Needs improvement", tags=["quality"])
        store.add(score=0.75, tags=["performance"])
        stats = store.get_stats()
        print(json.dumps(stats, ensure_ascii=False, indent=2))

    elif subcmd == "analyze":
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.feedback.add(score=0.8, message="Good", tags=["quality"])
        learner.feedback.add(score=0.6, message="OK", tags=["quality"])
        learner.record_performance("baseline", {"threshold": 0.8}, 0.75)
        learner.record_performance("tuned", {"threshold": 0.85}, 0.82)
        insights = learner.analyze()
        for ins in insights:
            print(f"  [{ins.category}] {ins.name}: {ins.description} (confidence={ins.confidence:.2f})")
        recs = learner.recommend()
        print(f"\nRecommendations: {recs['recommendations']}")

    elif subcmd == "tune":
        from cee.learning import HyperOptimizer
        optimizer = HyperOptimizer()
        optimizer.set_param_space(threshold=[0.5, 0.7, 0.9], chunk_size=[500, 1000, 1500])
        def dummy_eval(params: dict) -> float:
            threshold_penalty = abs(params["threshold"] - 0.75)
            size_penalty = abs(params["chunk_size"] - 1000) / 1000
            return 1.0 - (threshold_penalty + size_penalty) / 2
        results = optimizer.grid_search(dummy_eval, top_k=3)
        print(json.dumps([
            {"params": p, "score": round(s, 4)} for p, s in results
        ], ensure_ascii=False, indent=2))


def cloud():
    """Cloud auto-config CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-cloud [detect|generate|health]")
        return

    subcmd = sys.argv[1]
    cfg = __import__("cee.cloud", fromlist=["CloudAutoConfig"]).CloudAutoConfig()

    if subcmd == "detect":
        info = cfg.detect()
        print(json.dumps(info.to_dict(), ensure_ascii=False, indent=2))

    elif subcmd == "generate":
        if len(sys.argv) > 2 and sys.argv[2] == "k8s":
            print(cfg.generate_k8s_manifest())
        elif len(sys.argv) > 2 and sys.argv[2] == "compose":
            print(cfg.generate_docker_compose())
        else:
            print(cfg.generate_dockerfile())

    elif subcmd == "health":
        config = cfg.auto_configure()
        print(json.dumps(cfg.get_status(), ensure_ascii=False, indent=2))


def perf():
    """Performance accelerator CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-perf [stats|respond]")
        return

    subcmd = sys.argv[1]
    fr = __import__("cee.performance", fromlist=["FastResponse"]).FastResponse()

    if subcmd == "stats":
        print(json.dumps(fr.stats(), ensure_ascii=False, indent=2))

    elif subcmd == "respond":
        query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Hello"
        result = fr.respond(query, lambda: f"Fast response to: {query}")
        print(result)


def multimodal():
    """Multimodal processing CLI."""
    mm = __import__("cee.multimodal", fromlist=["MultiModal"]).MultiModal()
    print(json.dumps(mm.router.stats(), ensure_ascii=False, indent=2))


def models():
    """Model registry CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-models [list|kimi|stats]")
        return

    subcmd = sys.argv[1]
    registry = __import__("cee.models", fromlist=["ModelRegistry"]).ModelRegistry()

    if subcmd == "list":
        for entry in registry.list_all():
            print(f"  {entry.provider.value:12s} {entry.model_name:20s}  {entry.description}")

    elif subcmd == "kimi":
        for entry in registry.kimi_models:
            print(f"  Kimi: {entry.model_name:20s}  {entry.description}")

    elif subcmd == "stats":
        print(json.dumps(registry.stats(), ensure_ascii=False, indent=2))

    else:
        for entry in registry.list_all():
            print(f"  {entry.provider.value:12s} {entry.model_name:20s}  {entry.description}")


def knowledge():
    """Knowledge engine CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-knowledge [learn|query|synthesize|stats]")
        return

    subcmd = sys.argv[1]
    brain = __import__("cee.knowledge", fromlist=["MassiveBrain"]).MassiveBrain()

    if subcmd == "learn":
        text = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "fact"
        node = brain.learn(text)
        print(f"Learned: {node.node_id} type={node.node_type}")

    elif subcmd == "query":
        keyword = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        results = brain.query_all(keyword)
        for node in results:
            print(f"  [{node.node_type}] {node.content[:100]} (置信度: {node.confidence:.2f})")

    elif subcmd == "synthesize":
        topic = ""
        texts: list[str] = []
        for arg in sys.argv[2:]:
            if arg.startswith("--topic="):
                topic = arg.split("=", 1)[1]
            else:
                texts.append(arg)
        if not texts:
            texts = ["示例知识片段"]
        result = brain.create_new_knowledge(topic or "默认主题", texts)
        print(f"新知: {result.insight}\n置信度: {result.confidence:.2f}  创新性: {result.novel}")

    elif subcmd == "stats":
        print(json.dumps(brain.stats(), ensure_ascii=False, indent=2))

    else:
        print(json.dumps(brain.stats(), ensure_ascii=False, indent=2))


def output():
    """Output engine CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-output [format|save|copy|stats]")
        return

    subcmd = sys.argv[1]
    responder = __import__("cee.output", fromlist=["AdaptiveResponder"]).AdaptiveResponder()

    if subcmd == "format":
        text = ""
        style = None
        for arg in sys.argv[2:]:
            if arg.startswith("--text="):
                text = arg.split("=", 1)[1]
            elif arg.startswith("--style="):
                from cee.output import ResponseStyle
                try:
                    style = ResponseStyle(arg.split("=", 1)[1])
                except ValueError:
                    pass
        result = responder.respond(text or "Hello, CEE!", style=style)
        print(result["formatted"])
        print(f"\n[可复制纯文本长度: {len(result['plain_text'])}]")

    elif subcmd == "save":
        text = ""
        filename = ""
        for arg in sys.argv[2:]:
            if arg.startswith("--text="):
                text = arg.split("=", 1)[1]
            elif arg.startswith("--file="):
                filename = arg.split("=", 1)[1]
        result = responder.respond(text or "Saved content", save_to=filename or "output.txt")
        print(f"已保存: {result.get('saved_to', 'N/A')}")
        print(f"风格: {result['style']}")

    elif subcmd == "copy":
        text = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Copy me!"
        plain = responder.copier.as_plain_text(text)
        print(plain)

    elif subcmd == "stats":
        print(json.dumps(responder.stats(), ensure_ascii=False, indent=2))

    else:
        print(json.dumps(responder.stats(), ensure_ascii=False, indent=2))


def memory_cli():
    """Memory bank CLI."""
    if len(sys.argv) < 2:
        print("Usage: cee-memory [remember|recall|stats]")
        return

    from cee.agent.memory_bank import MemoryBank, MemoryType

    bank = MemoryBank()
    subcmd = sys.argv[1]

    if subcmd == "remember":
        content = ""
        mtype = "fact"
        for arg in sys.argv[2:]:
            if arg.startswith("--text="):
                content = arg.split("=", 1)[1]
            elif arg.startswith("--type="):
                mtype = arg.split("=", 1)[1]
        if content:
            import importlib
            mod = importlib.import_module("cee.agent.memory_bank")
            mt = getattr(mod.MemoryType, mtype.upper(), MemoryType.FACT)
            entry = bank.remember(content, memory_type=mt)
            print(f"已记忆 [{mt.value}]: {entry.memory_id}")

    elif subcmd == "recall":
        query = ""
        for arg in sys.argv[2:]:
            if arg.startswith("--query="):
                query = arg.split("=", 1)[1]
        results = bank.recall(query, limit=5)
        for r in results:
            print(f"  [{r.memory_type.value}] {r.content[:80]}")

    elif subcmd == "stats":
        print(json.dumps(bank.stats(), ensure_ascii=False, indent=2))

    else:
        print(json.dumps(bank.stats(), ensure_ascii=False, indent=2))


def sandbox_cli():
    """Sandbox CLI."""
    from cee.sandbox import ExecutionSandbox, ResourceLimits, SandboxPolicy

    sandbox = ExecutionSandbox()

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(sandbox.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "check":
        ok, violations = sandbox.pre_check(estimated_tokens=100)
        print(f"预检查: {'通过' if ok else '未通过'}, 违规数: {len(violations)}")
    elif sys.argv[1] == "run":
        sandbox.time_budget.start()
        import time as _time
        _time.sleep(0.1)
        result = sandbox.post_check(execution_time=0.5, tokens_used=256)
        print(json.dumps({"success": result.success, "violations": len(result.violations)},
                         ensure_ascii=False))


def trace_cli():
    """Trace log CLI."""
    from cee.trace import TraceLog, DecisionType, DecisionMethod

    if len(sys.argv) < 2:
        print("Usage: cee-trace [record|query|chain|stats]")
        return

    log = TraceLog()
    subcmd = sys.argv[1]

    if subcmd == "stats":
        print(json.dumps(log.stats(), ensure_ascii=False, indent=2))
    elif subcmd == "query":
        d_type = None
        for arg in sys.argv[2:]:
            if arg.startswith("--type="):
                try:
                    d_type = DecisionType(arg.split("=", 1)[1])
                except ValueError:
                    pass
        results = log.query(decision_type=d_type, limit=10)
        for d in results:
            print(f"  [{d.decision_type.value}] {d.question[:60]} -> {d.chosen}")


def approve_cli():
    """Human approval gate CLI."""
    from cee.core.human_approval import HumanApprovalGate, RiskLevel

    if len(sys.argv) < 2:
        print("Usage: cee-approve [request|list|approve|reject|stats]")
        return

    gate = HumanApprovalGate(risk_threshold=RiskLevel.MEDIUM)
    subcmd = sys.argv[1]

    if subcmd == "request":
        action = "default_action"
        desc = ""
        for arg in sys.argv[2:]:
            if arg.startswith("--action="):
                action = arg.split("=", 1)[1]
            elif arg.startswith("--desc="):
                desc = arg.split("=", 1)[1]
        req = gate.request_approval(action, desc or action, risk_level=RiskLevel.MEDIUM)
        print(f"审批请求已创建: {req.request_id} -> {req.action}")
        gate.approve(req.request_id, approver="admin")
        print(f"已自动批准: {req.request_id}")

    elif subcmd == "list":
        for r in gate.get_pending_requests():
            print(f"  [{r.request_id}] {r.action} ({r.risk_level.value})")

    elif subcmd == "stats":
        print(json.dumps(gate.stats(), ensure_ascii=False, indent=2))


def explore_cli():
    """Explore-exploit controller CLI."""
    from cee.learning.explore_exploit import EpsilonGreedyController

    eg = EpsilonGreedyController(epsilon=0.2, decay=0.999)
    eg.register_strategy("baseline", {"a": 1}, expected_score=0.5)
    eg.register_strategy("experiment", {"a": 2}, expected_score=0.5)

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(eg.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "select":
        chosen = eg.select_strategy()
        if chosen:
            print(f"选择策略: {chosen.name} ({chosen.strategy_id})")
            eg.update(chosen.strategy_id, score=0.75, success=True)
    elif sys.argv[1] == "best":
        for s in eg.get_best_strategies(top_k=3):
            print(f"  {s.name}: avg={s.avg_score:.3f}, trials={s.trials}")


def route_cli():
    """Meta router CLI."""
    from cee.core.meta_router import MetaRouter

    router = MetaRouter()

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(router.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "templates":
        for t in router.list_templates():
            print(f"  [{t['category']}] {t['name']}: {', '.join(t['roles'])}")
    elif sys.argv[1] == "route":
        intent = " ".join(sys.argv[2:]) or "写代码"
        result = router.route(intent)
        print(f"意图: {intent}")
        print(f"分类: {result.category.value} (置信度: {result.confidence:.2f})")
        print(f"模板: {result.template.name}")
        print(f"角色: {', '.join(result.template.roles)}")


def market_cli():
    """Skill market CLI."""
    from cee.plugin.skill_market import SkillRegistry, SkillManifest, SkillCategory

    registry = SkillRegistry()
    registry.register(SkillManifest(
        name="客服专家", category=SkillCategory.SUPPORT,
        prompt_fragment="你是专业客服，礼貌耐心地解答用户问题。",
        tools=[],
    ))
    registry.register(SkillManifest(
        name="代码审查", category=SkillCategory.CODING,
        prompt_fragment="你审查代码质量、安全性和可维护性。",
        tools=[],
    ))
    registry.assign_to_agent("agent_1", ["客服专家"])

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(registry.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "list":
        for name, skill in registry._skills.items():
            print(f"  [{skill.category.value}] {name}: {skill.description or skill.prompt_fragment[:60]}")
    elif sys.argv[1] == "show":
        agent_id = sys.argv[2] if len(sys.argv) > 2 else "agent_1"
        prompt = registry.get_agent_prompt(agent_id)
        print(f"Agent {agent_id} prompt:\n{prompt}")


def mortem_cli():
    """Post-mortem agent CLI."""
    from cee.agent.post_mortem import PostMortemAgent, ExecutionTrace

    pm = PostMortemAgent()

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(pm.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "analyze":
        trace = ExecutionTrace(
            session_id="demo-1",
            goal="测试复盘分析",
            status="success" if "--fail" not in sys.argv else "failed",
            tasks=[
                {"status": "COMPLETED"},
                {"status": "COMPLETED"},
                {"status": "FAILED"},
            ],
            duration_seconds=45.0,
            consensus_rounds=2,
            agent_count=3,
        )
        report = pm.analyze(trace)
        print(f"复盘摘要: {report.summary}")
        for lesson in report.lessons:
            print(f"  [{lesson.lesson_type.value}] {lesson.content}")
        print(f"建议: {report.recommendations}")


def debate_cli():
    """Debate orchestrator CLI."""
    from cee.agent.parliament import DebateOrchestrator

    orch = DebateOrchestrator()

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(orch.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "run":
        result = orch.run_debate(
            topic="是否应该使用多智能体协作?",
            proponent_content=["多智能体提升结果质量", "协作减少幻觉"],
            opponent_content=["协调成本高", "可能陷入共识僵局"],
            max_rounds=2,
        )
        print(f"决议: {result['resolution']}")
        print(f"正方得分: {result['score_proponent']:.2f}, 反方得分: {result['score_opponent']:.2f}")
        print(f"胜方: {result['winner']}")


def shadow_cli():
    """Shadow runner CLI."""
    from cee.learning.shadow_ops import ShadowRunner, ShadowConfig

    runner = ShadowRunner()
    runner.set_shadow_config(ShadowConfig(
        name="finer_granularity",
        params={"task_granularity": "fine"},
        description="更细粒度的任务分解",
    ))

    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(runner.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "compare":
        result = runner.compare(
            main_output="summarized conclusion",
            shadow_output="detailed analysis with conclusion and recommendations",
            main_cost={"time": 1.0, "tokens": 200},
            shadow_cost={"time": 1.5, "tokens": 350},
        )
        print(f"对比结果: {result.winner} 胜出 (改进: {result.improvement:+.3f})")
    elif sys.argv[1] == "advice":
        advice = runner.generate_advice(min_trials=1)
        for a in advice:
            print(f"  [{a.dimension.value}] {a.current_value} -> {a.recommended_value} "
                  f"(置信度: {a.confidence:.2f})")


def resonance_cli():
    """T7 Cognitive Resonance CLI."""
    from cee.engine.t7_resonance import CognitiveResonanceEngine

    engine = CognitiveResonanceEngine()
    text = _read_text_or_stdin()
    if text:
        result = engine.detect_resonance_pattern(text)
        print(json.dumps(result, ensure_ascii=False, indent=2))


def entanglement_cli():
    """T8 Semantic Entanglement CLI."""
    from cee.engine.t8_entanglement import SemanticEntanglementEngine

    engine = SemanticEntanglementEngine()
    text = _read_text_or_stdin()
    if text:
        profile = engine.analyze(text)
        print(json.dumps(profile.to_dict(), ensure_ascii=False, indent=2))


def emergence_cli():
    """T9 Emergence Dynamics CLI."""
    from cee.engine.t9_emergence import EmergenceDynamicsEngine

    engine = EmergenceDynamicsEngine()
    text = _read_text_or_stdin()
    if text:
        timeline = engine.emergence_timeline(text)
        print(json.dumps(timeline, ensure_ascii=False, indent=2))


def vectorstore_cli():
    """Vector Store CLI."""
    from cee.vectorstore import VectorStore, IndexType, DistanceMetric

    vs = VectorStore(dim=128, index_type=IndexType.FLAT, metric=DistanceMetric.COSINE)
    if len(sys.argv) < 2 or sys.argv[1] == "stats":
        print(json.dumps(vs.stats(), ensure_ascii=False, indent=2))
    elif sys.argv[1] == "add":
        import numpy as np
        text = " ".join(sys.argv[2:]) or "test document"
        vec = np.random.randn(128).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        ids = vs.add([vec], [text])
        print(f"已添加: {ids}")


def workflow_cli():
    """Workflow Engine CLI."""
    from cee.workflow import WorkflowEngine, WorkflowConfig, NodeConfig, RetryPolicy

    engine = WorkflowEngine()

    def sample_handler(ctx):
        return {"result": "ok"}

    config = WorkflowConfig(
        name="cli_demo",
        nodes=[
            NodeConfig("step1", sample_handler, "Step 1"),
            NodeConfig("step2", sample_handler, "Step 2", depends_on=["step1"]),
        ],
    )
    engine.register_workflow(config)

    if len(sys.argv) < 2 or sys.argv[1] == "status":
        print(f"已注册工作流: {config.workflow_id}")
        import asyncio
        result = asyncio.run(engine.execute(config.workflow_id))
        print(json.dumps({
            "status": result.status.value,
            "total_duration": round(result.total_duration, 4),
            "metrics": result.metrics,
        }, ensure_ascii=False, indent=2))


def ethics_cli():
    """Ethics Evaluation CLI."""
    from cee.ethics import EthicsEngine

    engine = EthicsEngine()
    text = _read_text_or_stdin()
    if text:
        report = engine.evaluate(text)
        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))


def factcheck_cli():
    """Fact Check CLI."""
    from cee.app.engine.fact_checker import FactChecker

    checker = FactChecker()
    text = _read_text_or_stdin()
    if text:
        results = checker.verify(text)
        summary = checker.summary(results)
        print(json.dumps(summary, ensure_ascii=False, indent=2))


def curriculum_cli():
    """Curriculum Learning CLI."""
    from cee.app.engine.curriculum import (
        CurriculumLearningEngine, Concept, DifficultyLevel,
    )

    engine = CurriculumLearningEngine()
    profile = engine.create_learner("demo")

    engine.add_concept(Concept(
        id="python_basics", name="Python基础",
        difficulty=DifficultyLevel.BEGINNER,
    ))
    engine.add_concept(Concept(
        id="data_structures", name="数据结构",
        difficulty=DifficultyLevel.INTERMEDIATE,
        prerequisites=["python_basics"],
    ))

    plan = engine.plan_for_learner("demo", ["data_structures"])
    print(f"学习路径: {len(plan)} 个步骤")
    for item in plan:
        print(f"  {item.get('concept_name', '')} [{item.get('difficulty', '')}]")


def analogy_cli():
    """Analogy Engine CLI."""
    from cee.app.engine.analogy import AnalogyEngine

    engine = AnalogyEngine()
    target = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "神经网络"
    result = engine.quick_analogy(target)
    if result:
        print(f"类比: {result.source} → {result.target}")
        print(f"评分: {result.overall_score:.4f}")
        print(f"洞见: {result.key_insight}")
    else:
        print("未找到合适的类比")


def explain_cli():
    """Explainability CLI."""
    from cee.app.engine.explainability import ExplainabilityEngine

    engine = ExplainabilityEngine()
    text = _read_text_or_stdin()
    if text:
        result = engine.explain(text, text[:200])
        print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))


def _read_text_or_stdin() -> str:
    """Read text from CLI args or stdin."""
    text = ""
    args = sys.argv[2:] if len(sys.argv) > 2 else sys.argv[1:]

    for arg in args:
        if arg.startswith("--file="):
            path = Path(arg.split("=", 1)[1])
            if path.exists():
                return path.read_text()
        elif arg.startswith("--text="):
            return arg.split("=", 1)[1]
        elif arg in ("-h", "--help"):
            return ""

    text = " ".join(args)
    if not text:
        try:
            text = sys.stdin.read()
        except Exception:
            pass
    return text
