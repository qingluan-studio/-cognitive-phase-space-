# -*- coding: utf-8 -*-
"""
Batch Generator Module
======================
Generates batched responses from a prompt library using a fusion engine.
Supports progress tracking, error retry with exponential backoff,
checkpoint/resume, and JSONL output.
"""

import json
import os
import random
import time
import traceback
from typing import Any, Callable, Dict, List, Optional

from .prompt_library import get_all_prompts, get_prompts_by_category, get_random_prompts


class BatchGenerator:
    """
    BatchGenerator handles large-scale prompt processing with resilience features.

    Attributes:
        engine: A callable that accepts a prompt dict and returns a response dict.
        output_path: Path to the JSONL output file.
        checkpoint_path: Path to the checkpoint file for resume support.
        max_retries: Maximum number of retries per item.
        retry_delay_base: Base delay in seconds for exponential backoff.
        batch_size: Number of items to process before flushing to disk.
        show_progress: Whether to print progress to stdout.
        seed: Optional random seed for reproducibility.
    """

    def __init__(
        self,
        engine: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
        output_path: str = "generated_dataset.jsonl",
        checkpoint_path: str = "batch_checkpoint.json",
        max_retries: int = 3,
        retry_delay_base: float = 1.0,
        batch_size: int = 10,
        show_progress: bool = True,
        seed: Optional[int] = None,
    ):
        self.engine = engine or self._default_engine
        self.output_path = output_path
        self.checkpoint_path = checkpoint_path
        self.max_retries = max_retries
        self.retry_delay_base = retry_delay_base
        self.batch_size = batch_size
        self.show_progress = show_progress
        self.seed = seed

        if self.seed is not None:
            random.seed(self.seed)

        # Internal state
        self._processed_ids: set = set()
        self._total: int = 0
        self._success_count: int = 0
        self._fail_count: int = 0
        self._skip_count: int = 0
        self._buffer: List[Dict[str, Any]] = []
        self._start_time: Optional[float] = None

    # -------------------------------------------------------------------------
    # Default engine stub
    # -------------------------------------------------------------------------

    @staticmethod
    def _default_engine(prompt: Dict[str, Any]) -> Dict[str, Any]:
        """
        A placeholder engine that returns a synthetic response.
        In production, replace with a call to the actual fusion engine.
        """
        prompt_text = prompt.get("prompt_text", "")
        response_text = f"Response to: {prompt_text[:50]}..."
        return {
            "response_id": prompt.get("id", "unknown"),
            "response_text": response_text,
            "model": "fusion_stub",
            "latency_ms": 0.0,
        }

    # -------------------------------------------------------------------------
    # Checkpoint management
    # -------------------------------------------------------------------------

    def _load_checkpoint(self) -> Dict[str, Any]:
        """Load checkpoint data if it exists."""
        if os.path.exists(self.checkpoint_path):
            try:
                with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {}

    def _save_checkpoint(self) -> None:
        """Persist current progress to the checkpoint file."""
        data = {
            "processed_ids": sorted(list(self._processed_ids)),
            "total": self._total,
            "success_count": self._success_count,
            "fail_count": self._fail_count,
            "skip_count": self._skip_count,
            "output_path": self.output_path,
        }
        tmp_path = self.checkpoint_path + ".tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, self.checkpoint_path)
        except IOError as e:
            if self.show_progress:
                print(f"[WARN] Failed to save checkpoint: {e}")

    # -------------------------------------------------------------------------
    # Output management
    # -------------------------------------------------------------------------

    def _flush_buffer(self) -> None:
        """Write buffered records to the JSONL output file."""
        if not self._buffer:
            return
        try:
            with open(self.output_path, "a", encoding="utf-8") as f:
                for record in self._buffer:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
            self._buffer.clear()
        except IOError as e:
            if self.show_progress:
                print(f"[WARN] Failed to flush buffer: {e}")

    def _append_record(self, record: Dict[str, Any]) -> None:
        """Add a record to the buffer and flush if batch size reached."""
        self._buffer.append(record)
        if len(self._buffer) >= self.batch_size:
            self._flush_buffer()

    # -------------------------------------------------------------------------
    # Progress display
    # -------------------------------------------------------------------------

    def _print_progress(self, current: int) -> None:
        """Print a progress bar and statistics."""
        if not self.show_progress:
            return
        pct = (current / self._total * 100) if self._total > 0 else 0
        bar_len = 30
        filled = int(bar_len * current / self._total) if self._total > 0 else bar_len
        bar = "█" * filled + "░" * (bar_len - filled)
        elapsed = time.time() - self._start_time if self._start_time else 0.0
        rate = current / elapsed if elapsed > 0 else 0.0
        eta = (self._total - current) / rate if rate > 0 else 0.0
        print(
            f"\r[{bar}] {pct:5.1f}% | "
            f"{current}/{self._total} | "
            f"OK={self._success_count} FAIL={self._fail_count} SKIP={self._skip_count} | "
            f"{rate:.1f}it/s ETA={eta:.0f}s",
            end="",
            flush=True,
        )

    def _print_done(self) -> None:
        """Print final summary."""
        if not self.show_progress:
            return
        elapsed = time.time() - self._start_time if self._start_time else 0.0
        print()
        print("=" * 60)
        print("Batch generation complete.")
        print(f"  Output file : {self.output_path}")
        print(f"  Checkpoint  : {self.checkpoint_path}")
        print(f"  Total       : {self._total}")
        print(f"  Success     : {self._success_count}")
        print(f"  Failed      : {self._fail_count}")
        print(f"  Skipped     : {self._skip_count}")
        print(f"  Elapsed     : {elapsed:.2f}s")
        if elapsed > 0:
            print(f"  Throughput  : {self._success_count / elapsed:.2f} items/s")
        print("=" * 60)

    # -------------------------------------------------------------------------
    # Core generation logic
    # -------------------------------------------------------------------------

    def _generate_single(self, prompt: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Generate a response for a single prompt with retry logic.

        Returns:
            A merged record dict on success, None on failure.
        """
        prompt_id = prompt.get("id", "unknown")
        last_exception: Optional[str] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.engine(prompt)
                record = {
                    "prompt_id": prompt_id,
                    "category": prompt.get("category", "unknown"),
                    "difficulty": prompt.get("difficulty", 0.0),
                    "prompt_type": prompt.get("type", "unknown"),
                    "prompt_text": prompt.get("prompt_text", ""),
                    "response": response,
                    "attempt": attempt,
                    "timestamp": time.time(),
                }
                return record
            except Exception as exc:
                last_exception = str(exc)
                if attempt < self.max_retries:
                    delay = self.retry_delay_base * (2 ** (attempt - 1))
                    if self.show_progress:
                        print(f"\n[RETRY] {prompt_id} attempt {attempt}/{self.max_retries} failed: {last_exception}. Sleeping {delay:.1f}s...")
                    time.sleep(delay)
                else:
                    if self.show_progress:
                        print(f"\n[FAIL] {prompt_id} exhausted all retries.")

        # All retries exhausted
        error_record = {
            "prompt_id": prompt_id,
            "category": prompt.get("category", "unknown"),
            "difficulty": prompt.get("difficulty", 0.0),
            "prompt_type": prompt.get("type", "unknown"),
            "prompt_text": prompt.get("prompt_text", ""),
            "response": None,
            "error": last_exception,
            "attempt": self.max_retries,
            "timestamp": time.time(),
        }
        return error_record

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    def reset(self) -> None:
        """Clear internal state and checkpoint."""
        self._processed_ids.clear()
        self._total = 0
        self._success_count = 0
        self._fail_count = 0
        self._skip_count = 0
        self._buffer.clear()
        self._start_time = None
        if os.path.exists(self.checkpoint_path):
            os.remove(self.checkpoint_path)

    def generate_batch(
        self,
        prompts: Optional[List[Dict[str, Any]]] = None,
        categories: Optional[List[str]] = None,
        limit: Optional[int] = None,
        resume: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate responses for a batch of prompts.

        Args:
            prompts: Optional explicit list of prompt dicts. If None, uses library.
            categories: Optional list of categories to pull from the library.
            limit: Maximum number of prompts to process.
            resume: Whether to resume from a previous checkpoint.

        Returns:
            A summary dict with counts and file paths.
        """
        # Resolve prompt list
        if prompts is not None:
            prompt_list = list(prompts)
        elif categories is not None:
            prompt_list = []
            for cat in categories:
                prompt_list.extend(get_prompts_by_category(cat))
        else:
            prompt_list = get_all_prompts()

        if limit is not None and limit > 0:
            prompt_list = prompt_list[:limit]

        self._total = len(prompt_list)

        # Resume handling
        checkpoint = self._load_checkpoint() if resume else {}
        if resume and checkpoint.get("output_path") == self.output_path:
            previous_ids = set(checkpoint.get("processed_ids", []))
            self._processed_ids = previous_ids
            self._success_count = checkpoint.get("success_count", 0)
            self._fail_count = checkpoint.get("fail_count", 0)
            self._skip_count = checkpoint.get("skip_count", 0)
            if self.show_progress:
                print(f"[RESUME] Found checkpoint with {len(previous_ids)} previously processed items.")
        else:
            if not resume and os.path.exists(self.output_path):
                # Starting fresh: truncate output
                open(self.output_path, "w", encoding="utf-8").close()

        self._start_time = time.time()

        for idx, prompt in enumerate(prompt_list):
            prompt_id = prompt.get("id", f"unknown_{idx}")

            if prompt_id in self._processed_ids:
                self._skip_count += 1
                self._print_progress(idx + 1)
                continue

            record = self._generate_single(prompt)
            self._processed_ids.add(prompt_id)

            if record is not None:
                if record.get("error"):
                    self._fail_count += 1
                else:
                    self._success_count += 1
                self._append_record(record)
            else:
                self._fail_count += 1

            # Periodic checkpoint
            if (idx + 1) % self.batch_size == 0:
                self._flush_buffer()
                self._save_checkpoint()

            self._print_progress(idx + 1)

        # Final flush
        self._flush_buffer()
        self._save_checkpoint()
        self._print_done()

        return {
            "output_path": self.output_path,
            "checkpoint_path": self.checkpoint_path,
            "total": self._total,
            "success": self._success_count,
            "failed": self._fail_count,
            "skipped": self._skip_count,
        }

    def generate_from_random(
        self,
        n: int = 100,
        categories: Optional[List[str]] = None,
        resume: bool = True,
    ) -> Dict[str, Any]:
        """
        Convenience method to generate responses for n random prompts.

        Args:
            n: Number of random prompts.
            categories: Optional category filter.
            resume: Whether to resume from checkpoint.

        Returns:
            Summary dict.
        """
        prompts = get_random_prompts(n, categories=categories, seed=self.seed)
        return self.generate_batch(prompts=prompts, resume=resume)


# =============================================================================
# Utility functions
# =============================================================================

def create_generator(
    engine: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
    output_path: str = "generated_dataset.jsonl",
    **kwargs: Any,
) -> BatchGenerator:
    """Factory function to create a BatchGenerator instance."""
    return BatchGenerator(engine=engine, output_path=output_path, **kwargs)


def merge_jsonl_files(input_paths: List[str], output_path: str) -> int:
    """
    Merge multiple JSONL files into one.

    Returns:
        Total number of records written.
    """
    count = 0
    with open(output_path, "w", encoding="utf-8") as outf:
        for path in input_paths:
            if not os.path.exists(path):
                continue
            with open(path, "r", encoding="utf-8") as inf:
                for line in inf:
                    line = line.strip()
                    if line:
                        outf.write(line + "\n")
                        count += 1
    return count


# =============================================================================
# Module entry point
# =============================================================================

if __name__ == "__main__":
    gen = BatchGenerator(output_path="demo_output.jsonl", batch_size=5, show_progress=True)
    result = gen.generate_from_random(n=20, categories=["coding", "math"])
    print(json.dumps(result, indent=2))
