"""Semantic similarity metrics for text, sentences, and concepts.

Implements classical text similarity measures including cosine, Jaccard,
Levenshtein distance, semantic overlap via WordNet-like taxonomy,
and sentence-level similarity using bag-of-vectors.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Dict, List, Optional, Sequence, Set, Tuple


class SemanticSimilarityEngine:
    """Compute semantic and lexical similarity between texts.

    Provides token-level, sentence-level, and concept-level similarity
using vector space, set overlap, edit distance, and taxonomy-based
measures.
    """

    def __init__(self) -> None:
        """Initialize internal caches for precomputed vectors."""
        self._vector_cache: Dict[str, Dict[str, float]] = {}
        self._stopwords: Set[str] = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "shall",
            "can", "need", "dare", "ought", "used", "to", "of", "in",
            "for", "on", "with", "at", "by", "from", "as", "into",
            "through", "during", "before", "after", "above", "below",
            "between", "under", "and", "but", "or", "yet", "so",
        }

    def _tokenize(self, text: str) -> List[str]:
        """Lowercase and split text into alphanumeric tokens.

        Args:
            text: Raw input string.

        Returns:
            List of cleaned tokens.
        """
        return [t.lower() for t in re.findall(r"[a-zA-Z0-9]+", text) if t.lower() not in self._stopwords]

    def cosine_text_similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between TF-weighted text vectors.

        Args:
            text1: First text.
            text2: Second text.

        Returns:
            Cosine similarity in [0, 1].
        """
        vec1 = Counter(self._tokenize(text1))
        vec2 = Counter(self._tokenize(text2))
        if not vec1 or not vec2:
            return 0.0
        all_terms = set(vec1.keys()) | set(vec2.keys())
        dot = sum(vec1.get(t, 0) * vec2.get(t, 0) for t in all_terms)
        norm1 = math.sqrt(sum(c * c for c in vec1.values()))
        norm2 = math.sqrt(sum(c * c for c in vec2.values()))
        if norm1 == 0.0 or norm2 == 0.0:
            return 0.0
        return dot / (norm1 * norm2)

    def jaccard_similarity(self, text1: str, text2: str) -> float:
        """Compute Jaccard index over token sets.

        Args:
            text1: First text.
            text2: Second text.

        Returns:
            Jaccard similarity in [0, 1].
        """
        set1 = set(self._tokenize(text1))
        set2 = set(self._tokenize(text2))
        if not set1 and not set2:
            return 1.0
        inter = len(set1 & set2)
        union = len(set1 | set2)
        return inter / union if union else 0.0

    def levenshtein_distance(self, s1: str, s2: str) -> int:
        """Compute edit distance between two strings.

        Args:
            s1: First string.
            s2: Second string.

        Returns:
            Minimum number of single-character edits.
        """
        if len(s1) < len(s2):
            return self.levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)
        prev = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            curr = [i + 1]
            for j, c2 in enumerate(s2):
                inserts = prev[j + 1] + 1
                deletes = curr[j] + 1
                subs = prev[j] + (0 if c1 == c2 else 1)
                curr.append(min(inserts, deletes, subs))
            prev = curr
        return prev[-1]

    def normalized_levenshtein(self, s1: str, s2: str) -> float:
        """Return normalized edit distance in [0, 1] where 1 is identical.

        Args:
            s1: First string.
            s2: Second string.

        Returns:
            Normalized similarity.
        """
        max_len = max(len(s1), len(s2))
        if max_len == 0:
            return 1.0
        dist = self.levenshtein_distance(s1, s2)
        return 1.0 - dist / max_len

    def dice_coefficient(self, text1: str, text2: str) -> float:
        """Compute Sorensen-Dice coefficient over bigrams.

        Args:
            text1: First text.
            text2: Second text.

        Returns:
            Dice coefficient in [0, 1].
        """
        def bigrams(s: str) -> Set[str]:
            tokens = self._tokenize(s)
            b: Set[str] = set()
            for t in tokens:
                for i in range(len(t) - 1):
                    b.add(t[i:i + 2])
            return b
        b1 = bigrams(text1)
        b2 = bigrams(text2)
        if not b1 and not b2:
            return 1.0
        inter = len(b1 & b2)
        return (2.0 * inter) / (len(b1) + len(b2))

    def semantic_overlap(self, text1: str, text2: str, synonym_map: Optional[Dict[str, Set[str]]] = None) -> float:
        """Compute semantic overlap allowing synonym substitution.

        Args:
            text1: First text.
            text2: Second text.
            synonym_map: Mapping from word to set of synonyms.

        Returns:
            Semantic overlap ratio in [0, 1].
        """
        tokens1 = self._tokenize(text1)
        tokens2 = self._tokenize(text2)
        if not tokens1 or not tokens2:
            return 0.0
        matched = 0
        used = set()
        synonym_map = synonym_map or {}
        for t1 in tokens1:
            found = False
            for i, t2 in enumerate(tokens2):
                if i in used:
                    continue
                if t1 == t2 or t1 in synonym_map.get(t2, set()) or t2 in synonym_map.get(t1, set()):
                    found = True
                    used.add(i)
                    break
            if found:
                matched += 1
        return matched / max(len(tokens1), len(tokens2))

    def sentence_similarity(self, sent1: str, sent2: str, word_vectors: Optional[Dict[str, List[float]]] = None) -> float:
        """Compute sentence-level similarity using averaged word vectors.

        Args:
            sent1: First sentence.
            sent2: Second sentence.
            word_vectors: Optional pre-trained word vector dictionary.

        Returns:
            Cosine similarity between sentence vectors.
        """
        tokens1 = self._tokenize(sent1)
        tokens2 = self._tokenize(sent2)
        if word_vectors is None:
            return self.cosine_text_similarity(sent1, sent2)
        vec1 = self._average_vector(tokens1, word_vectors)
        vec2 = self._average_vector(tokens2, word_vectors)
        dot = sum(a * b for a, b in zip(vec1, vec2))
        n1 = math.sqrt(sum(a * a for a in vec1))
        n2 = math.sqrt(sum(b * b for b in vec2))
        if n1 == 0.0 or n2 == 0.0:
            return 0.0
        return dot / (n1 * n2)

    def _average_vector(self, tokens: List[str], word_vectors: Dict[str, List[float]]) -> List[float]:
        """Average word vectors for a token list.

        Args:
            tokens: List of words.
            word_vectors: Word to vector mapping.

        Returns:
            Averaged vector or zero vector.
        """
        dim = len(next(iter(word_vectors.values()))) if word_vectors else 0
        vec = [0.0] * dim
        count = 0
        for t in tokens:
            if t in word_vectors:
                for d in range(dim):
                    vec[d] += word_vectors[t][d]
                count += 1
        if count == 0:
            return vec
        for d in range(dim):
            vec[d] /= count
        return vec

    def longest_common_subsequence(self, s1: str, s2: str) -> float:
        """Compute LCS-based similarity between token sequences.

        Args:
            s1: First text.
            s2: Second text.

        Returns:
            Normalized LCS length in [0, 1].
        """
        t1 = self._tokenize(s1)
        t2 = self._tokenize(s2)
        m, n = len(t1), len(t2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if t1[i - 1] == t2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        max_len = max(m, n)
        return dp[m][n] / max_len if max_len else 1.0
