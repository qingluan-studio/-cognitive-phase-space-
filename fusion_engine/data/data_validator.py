# -*- coding: utf-8 -*-
"""
Data Validator Module
=====================
Validates generated dataset quality by checking format compliance,
text length, duplicate content, and producing a human-readable report.
"""

import hashlib
import json
import os
import re
from collections import Counter, defaultdict
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


class DataValidator:
    """
    DataValidator inspects a dataset (list of records or JSONL file)
    and enforces quality criteria.

    Attributes:
        min_prompt_length: Minimum allowed prompt text length.
        max_prompt_length: Maximum allowed prompt text length.
        min_response_length: Minimum allowed response text length.
        max_response_length: Maximum allowed response text length.
        max_duplicate_ratio: Maximum allowed duplicate ratio (0.0-1.0).
        required_fields: Fields that every record must contain.
        custom_filters: Additional predicate functions for filtering.
    """

    def __init__(
        self,
        min_prompt_length: int = 5,
        max_prompt_length: int = 2000,
        min_response_length: int = 1,
        max_response_length: int = 10000,
        max_duplicate_ratio: float = 0.15,
        required_fields: Optional[List[str]] = None,
    ):
        self.min_prompt_length = min_prompt_length
        self.max_prompt_length = max_prompt_length
        self.min_response_length = min_response_length
        self.max_response_length = max_response_length
        self.max_duplicate_ratio = max_duplicate_ratio
        self.required_fields = required_fields or ["prompt_id", "prompt_text", "response"]
        self.custom_filters: List[Callable[[Dict[str, Any]], bool]] = []

        # Internal statistics
        self._stats: Dict[str, Any] = {}
        self._filtered_records: List[Dict[str, Any]] = []
        self._invalid_records: List[Tuple[Dict[str, Any], str]] = []

    # -------------------------------------------------------------------------
    # Validation helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _extract_text(record: Dict[str, Any], field: str) -> str:
        """Safely extract string text from a record field."""
        value = record.get(field)
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            return value.get("response_text", "") or value.get("text", "") or json.dumps(value)
        return str(value)

    @staticmethod
    def _normalized_hash(text: str) -> str:
        """Compute a hash for deduplication based on normalized text."""
        normalized = re.sub(r"\s+", " ", text.strip().lower())
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    # -------------------------------------------------------------------------
    # Validation rules
    # -------------------------------------------------------------------------

    def _check_format(self, record: Dict[str, Any]) -> Optional[str]:
        """Verify that the record contains all required fields."""
        missing = [f for f in self.required_fields if f not in record]
        if missing:
            return f"Missing required fields: {missing}"
        return None

    def _check_prompt_length(self, record: Dict[str, Any]) -> Optional[str]:
        """Check prompt text length constraints."""
        text = self._extract_text(record, "prompt_text")
        length = len(text)
        if length < self.min_prompt_length:
            return f"Prompt too short ({length} < {self.min_prompt_length})"
        if length > self.max_prompt_length:
            return f"Prompt too long ({length} > {self.max_prompt_length})"
        return None

    def _check_response_length(self, record: Dict[str, Any]) -> Optional[str]:
        """Check response text length constraints."""
        text = self._extract_text(record, "response")
        length = len(text)
        if length < self.min_response_length:
            return f"Response too short ({length} < {self.min_response_length})"
        if length > self.max_response_length:
            return f"Response too long ({length} > {self.max_response_length})"
        return None

    def _check_gibberish(self, record: Dict[str, Any]) -> Optional[str]:
        """
        Heuristic check for gibberish or low-quality text.
        Flags responses with excessive repetition or non-alphanumeric density.
        """
        text = self._extract_text(record, "response")
        if not text:
            return "Empty response"
        # Excessive repetition of a single character
        max_repeat = max((len(m.group(0)) for m in re.finditer(r"(.)\1*", text)), default=0)
        if max_repeat > 30:
            return f"Excessive character repetition (run length {max_repeat})"
        # Too few alphanumeric characters
        alnum_ratio = sum(1 for c in text if c.isalnum()) / max(len(text), 1)
        if alnum_ratio < 0.3:
            return f"Low alphanumeric ratio ({alnum_ratio:.2f})"
        return None

    def _check_custom(self, record: Dict[str, Any]) -> Optional[str]:
        """Apply user-defined custom filter predicates."""
        for predicate in self.custom_filters:
            try:
                if not predicate(record):
                    return "Failed custom filter"
            except Exception as exc:
                return f"Custom filter error: {exc}"
        return None

    def _validate_single(self, record: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Run all validation checks on a single record.

        Returns:
            (is_valid, reason_or_none)
        """
        checks = [
            self._check_format,
            self._check_prompt_length,
            self._check_response_length,
            self._check_gibberish,
            self._check_custom,
        ]
        for check in checks:
            reason = check(record)
            if reason:
                return False, reason
        return True, None

    # -------------------------------------------------------------------------
    # Duplicate detection
    # -------------------------------------------------------------------------

    def _compute_duplicates(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze prompt and response duplicates.

        Returns:
            A dict with duplicate counts and ratios.
        """
        prompt_hashes: List[str] = []
        response_hashes: List[str] = []
        for rec in records:
            prompt_hashes.append(self._normalized_hash(self._extract_text(rec, "prompt_text")))
            response_hashes.append(self._normalized_hash(self._extract_text(rec, "response")))

        def dup_stats(hashes: List[str]) -> Dict[str, Any]:
            counter = Counter(hashes)
            duplicates = sum(1 for c in counter.values() if c > 1)
            dup_records = sum(c - 1 for c in counter.values() if c > 1)
            return {
                "unique": len(counter),
                "duplicate_hashes": duplicates,
                "duplicate_records": dup_records,
                "duplicate_ratio": dup_records / max(len(hashes), 1),
                "most_common": counter.most_common(3),
            }

        return {
            "prompts": dup_stats(prompt_hashes),
            "responses": dup_stats(response_hashes),
        }

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    def add_custom_filter(self, predicate: Callable[[Dict[str, Any]], bool]) -> None:
        """Add a custom filter predicate."""
        self.custom_filters.append(predicate)

    def validate_records(self, records: List[Dict[str, Any]]) -> "DataValidator":
        """
        Validate a list of records in-memory.

        Returns:
            self (for chaining).
        """
        self._filtered_records = []
        self._invalid_records = []

        for rec in records:
            valid, reason = self._validate_single(rec)
            if valid:
                self._filtered_records.append(rec)
            else:
                self._invalid_records.append((rec, reason))

        self._stats = self._compute_stats(records, self._filtered_records, self._invalid_records)
        return self

    def validate_jsonl(self, filepath: str, max_records: Optional[int] = None) -> "DataValidator":
        """
        Validate records from a JSONL file.

        Args:
            filepath: Path to the JSONL file.
            max_records: Optional limit on records to read.

        Returns:
            self (for chaining).
        """
        records: List[Dict[str, Any]] = []
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"JSONL file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                if max_records is not None and idx >= max_records:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    # Create a placeholder for malformed lines
                    records.append({"__raw_line": line, "__line_number": idx + 1})
        return self.validate_records(records)

    def _compute_stats(
        self,
        all_records: List[Dict[str, Any]],
        valid_records: List[Dict[str, Any]],
        invalid_records: List[Tuple[Dict[str, Any], str]],
    ) -> Dict[str, Any]:
        """Compute comprehensive statistics."""
        total = len(all_records)
        valid_count = len(valid_records)
        invalid_count = len(invalid_records)

        # Length distributions
        prompt_lengths = [len(self._extract_text(r, "prompt_text")) for r in valid_records]
        response_lengths = [len(self._extract_text(r, "response")) for r in valid_records]

        def distribution(arr: List[int]) -> Dict[str, Any]:
            if not arr:
                return {"count": 0, "min": 0, "max": 0, "mean": 0.0, "median": 0.0}
            arr_sorted = sorted(arr)
            n = len(arr_sorted)
            return {
                "count": n,
                "min": arr_sorted[0],
                "max": arr_sorted[-1],
                "mean": sum(arr_sorted) / n,
                "median": arr_sorted[n // 2] if n % 2 else (arr_sorted[n // 2 - 1] + arr_sorted[n // 2]) / 2,
            }

        # Category distribution
        category_counter: Counter = Counter()
        for r in valid_records:
            category_counter[r.get("category", "unknown")] += 1

        # Failure reasons
        failure_counter: Counter = Counter()
        for _, reason in invalid_records:
            failure_counter[reason] += 1

        # Duplicate analysis
        duplicates = self._compute_duplicates(valid_records)

        overall_pass = (
            invalid_count == 0
            and duplicates["prompts"]["duplicate_ratio"] <= self.max_duplicate_ratio
            and duplicates["responses"]["duplicate_ratio"] <= self.max_duplicate_ratio
        )

        return {
            "total": total,
            "valid": valid_count,
            "invalid": invalid_count,
            "validity_ratio": valid_count / max(total, 1),
            "prompt_length": distribution(prompt_lengths),
            "response_length": distribution(response_lengths),
            "categories": dict(category_counter),
            "failure_reasons": dict(failure_counter),
            "duplicates": duplicates,
            "overall_pass": overall_pass,
        }

    def get_valid_records(self) -> List[Dict[str, Any]]:
        """Return the list of records that passed validation."""
        return list(self._filtered_records)

    def get_invalid_records(self) -> List[Tuple[Dict[str, Any], str]]:
        """Return the list of records that failed validation with reasons."""
        return list(self._invalid_records)

    def get_stats(self) -> Dict[str, Any]:
        """Return the computed statistics dict."""
        return dict(self._stats)

    def write_valid_jsonl(self, filepath: str) -> int:
        """
        Write valid records to a JSONL file.

        Returns:
            Number of records written.
        """
        with open(filepath, "w", encoding="utf-8") as f:
            for rec in self._filtered_records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        return len(self._filtered_records)

    def generate_report(self, output_path: Optional[str] = None) -> str:
        """
        Generate a human-readable quality report.

        Args:
            output_path: Optional file path to write the report.

        Returns:
            The report string.
        """
        s = self._stats
        lines: List[str] = []
        lines.append("=" * 60)
        lines.append("DATA QUALITY REPORT")
        lines.append("=" * 60)
        lines.append(f"Total Records      : {s.get('total', 0)}")
        lines.append(f"Valid Records      : {s.get('valid', 0)}")
        lines.append(f"Invalid Records    : {s.get('invalid', 0)}")
        lines.append(f"Validity Ratio     : {s.get('validity_ratio', 0.0):.2%}")
        lines.append(f"Overall Pass       : {'YES' if s.get('overall_pass') else 'NO'}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("PROMPT LENGTH DISTRIBUTION")
        lines.append("-" * 40)
        pl = s.get("prompt_length", {})
        lines.append(f"  Count : {pl.get('count', 0)}")
        lines.append(f"  Min   : {pl.get('min', 0)}")
        lines.append(f"  Max   : {pl.get('max', 0)}")
        lines.append(f"  Mean  : {pl.get('mean', 0.0):.1f}")
        lines.append(f"  Median: {pl.get('median', 0.0):.1f}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("RESPONSE LENGTH DISTRIBUTION")
        lines.append("-" * 40)
        rl = s.get("response_length", {})
        lines.append(f"  Count : {rl.get('count', 0)}")
        lines.append(f"  Min   : {rl.get('min', 0)}")
        lines.append(f"  Max   : {rl.get('max', 0)}")
        lines.append(f"  Mean  : {rl.get('mean', 0.0):.1f}")
        lines.append(f"  Median: {rl.get('median', 0.0):.1f}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("CATEGORY DISTRIBUTION")
        lines.append("-" * 40)
        for cat, count in sorted(s.get("categories", {}).items()):
            lines.append(f"  {cat:20s}: {count}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("DUPLICATE ANALYSIS")
        lines.append("-" * 40)
        dup = s.get("duplicates", {})
        dp = dup.get("prompts", {})
        dr = dup.get("responses", {})
        lines.append(f"  Prompt Duplicates  : {dp.get('duplicate_records', 0)} ({dp.get('duplicate_ratio', 0.0):.2%})")
        lines.append(f"  Response Duplicates: {dr.get('duplicate_records', 0)} ({dr.get('duplicate_ratio', 0.0):.2%})")
        lines.append("")
        lines.append("-" * 40)
        lines.append("FAILURE REASONS")
        lines.append("-" * 40)
        for reason, count in sorted(s.get("failure_reasons", {}).items(), key=lambda x: -x[1]):
            lines.append(f"  {reason:40s}: {count}")
        lines.append("")
        lines.append("=" * 60)
        report = "\n".join(lines)
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(report + "\n")
        return report


# =============================================================================
# Utility functions
# =============================================================================

def validate_file(filepath: str, **kwargs: Any) -> DataValidator:
    """Convenience function to validate a JSONL file and return the validator."""
    validator = DataValidator(**kwargs)
    validator.validate_jsonl(filepath)
    return validator


def quick_check(record: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Quick validation of a single record using default settings."""
    validator = DataValidator()
    return validator._validate_single(record)


# =============================================================================
# Module entry point
# =============================================================================

if __name__ == "__main__":
    # Demo: validate a synthetic dataset
    demo_records = [
        {
            "prompt_id": "test_001",
            "category": "coding",
            "prompt_text": "Write a Python function to sort a list.",
            "response": {"response_text": "Here is a Python function using sorted(): ..."},
        },
        {
            "prompt_id": "test_002",
            "category": "math",
            "prompt_text": "Solve x+1=2",
            "response": {"response_text": "x = 1"},
        },
        {
            "prompt_id": "test_003",
            "category": "factual_qa",
            "prompt_text": "What is the capital of France?",
            "response": {"response_text": "Paris"},
        },
        {
            "prompt_id": "test_004",
            "category": "creative_writing",
            "prompt_text": "Write a story about a robot.",
            "response": {"response_text": ""},
        },
    ]
    validator = DataValidator()
    validator.validate_records(demo_records)
    print(validator.generate_report())
