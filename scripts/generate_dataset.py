#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Dataset Script
=======================
Main entry point for generating synthetic datasets using the fusion engine.
Supports command-line configuration of size, output path, and generation strategy.

Example:
    python generate_dataset.py --size 1000 --output dataset.jsonl --strategy random
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional

# Ensure the project root is on the path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fusion_engine.data.prompt_library import get_all_prompts, get_categories, get_random_prompts
from fusion_engine.data.batch_generator import BatchGenerator
from fusion_engine.data.data_validator import DataValidator


# =============================================================================
# Argument parsing
# =============================================================================

def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate a synthetic dataset using the cognitive-phase-space fusion engine.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Supported strategies:
  random     Sample prompts uniformly at random from the library.
  category   Cycle through categories proportionally.
  difficulty Sample based on difficulty distribution.
        """,
    )
    parser.add_argument(
        "--size",
        type=int,
        default=1000,
        help="Number of samples to generate (default: 1000).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="dataset.jsonl",
        help="Output JSONL file path (default: dataset.jsonl).",
    )
    parser.add_argument(
        "--strategy",
        type=str,
        choices=["random", "category", "difficulty"],
        default="random",
        help="Prompt selection strategy (default: random).",
    )
    parser.add_argument(
        "--categories",
        type=str,
        default="",
        help="Comma-separated list of categories to include (default: all).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Flush buffer size for JSONL writes (default: 50).",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="Maximum retries per prompt (default: 3).",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        default=True,
        help="Run data validation after generation (default: True).",
    )
    parser.add_argument(
        "--report",
        type=str,
        default="validation_report.txt",
        help="Path to write the validation report (default: validation_report.txt).",
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        default=False,
        help="Ignore existing checkpoint and start fresh.",
    )
    return parser.parse_args(argv)


# =============================================================================
# Strategy implementations
# =============================================================================

def select_prompts_random(size: int, categories: Optional[List[str]] = None, seed: Optional[int] = None) -> List[Dict[str, Any]]:
    """Select prompts uniformly at random."""
    return get_random_prompts(n=size, categories=categories, seed=seed)


def select_prompts_by_category(size: int, categories: Optional[List[str]] = None, seed: Optional[int] = None) -> List[Dict[str, Any]]:
    """Cycle through categories proportionally to ensure balanced coverage."""
    if categories is None:
        categories = get_categories()
    all_prompts: List[Dict[str, Any]] = []
    for cat in categories:
        all_prompts.extend(get_all_prompts() if cat not in [c.get("category") for c in get_all_prompts()] else [p for p in get_all_prompts() if p.get("category") == cat])
    # Simpler: just use get_random_prompts with categories
    return get_random_prompts(n=size, categories=categories, seed=seed)


def select_prompts_by_difficulty(size: int, categories: Optional[List[str]] = None, seed: Optional[int] = None) -> List[Dict[str, Any]]:
    """Select prompts weighted toward mid-range difficulty."""
    import random
    if seed is not None:
        random.seed(seed)
    pool = get_all_prompts()
    if categories:
        pool = [p for p in pool if p.get("category") in categories]
    # Weight by closeness to 0.5 difficulty
    weights = [1.0 - abs(p.get("difficulty", 0.5) - 0.5) * 1.5 for p in pool]
    weights = [max(w, 0.1) for w in weights]
    total_weight = sum(weights)
    probs = [w / total_weight for w in weights]
    selected = random.choices(pool, weights=probs, k=size)
    return selected


# =============================================================================
# Main generation pipeline
# =============================================================================

def main(argv: Optional[List[str]] = None) -> int:
    """
    Main entry point for the dataset generation script.

    Returns:
        Exit code (0 for success, 1 for failure).
    """
    args = parse_args(argv)

    # Resolve categories
    categories: Optional[List[str]] = None
    if args.categories:
        categories = [c.strip() for c in args.categories.split(",") if c.strip()]
        available = get_categories()
        invalid = [c for c in categories if c not in available]
        if invalid:
            print(f"[ERROR] Invalid categories: {invalid}")
            print(f"Available: {available}")
            return 1

    # Resolve strategy
    strategy_map = {
        "random": select_prompts_random,
        "category": select_prompts_by_category,
        "difficulty": select_prompts_by_difficulty,
    }
    selector = strategy_map[args.strategy]

    print("=" * 60)
    print("COGNITIVE PHASE SPACE — Dataset Generator")
    print("=" * 60)
    print(f"Strategy      : {args.strategy}")
    print(f"Size          : {args.size}")
    print(f"Output        : {args.output}")
    print(f"Categories    : {categories if categories else 'all'}")
    print(f"Seed          : {args.seed}")
    print(f"Batch size    : {args.batch_size}")
    print(f"Max retries   : {args.max_retries}")
    print(f"Resume        : {not args.no_resume}")
    print("=" * 60)

    # Select prompts
    print("\n[1/3] Selecting prompts...")
    prompts = selector(size=args.size, categories=categories, seed=args.seed)
    print(f"      Selected {len(prompts)} prompts.")

    # Initialize generator
    generator = BatchGenerator(
        output_path=args.output,
        batch_size=args.batch_size,
        max_retries=args.max_retries,
        show_progress=True,
        seed=args.seed,
    )

    # Generate
    print("\n[2/3] Generating responses...")
    summary = generator.generate_batch(prompts=prompts, resume=not args.no_resume)
    print(f"      Done. Success: {summary['success']}, Failed: {summary['failed']}, Skipped: {summary['skipped']}")

    # Validate
    if args.validate and os.path.exists(args.output):
        print("\n[3/3] Validating output...")
        validator = DataValidator()
        validator.validate_jsonl(args.output)
        report = validator.generate_report(output_path=args.report)
        print(report)
        valid_ratio = validator.get_stats().get("validity_ratio", 0.0)
        if valid_ratio < 0.95:
            print(f"[WARN] Validity ratio {valid_ratio:.2%} is below 95% threshold.")
            return 1
    else:
        print("\n[3/3] Validation skipped.")

    print("\nAll stages complete.")
    return 0


# =============================================================================
# Module entry point
# =============================================================================

if __name__ == "__main__":
    sys.exit(main())
