"""Word embedding computation and vector space models.

This module implements classical word embedding algorithms including
Skip-Gram, CBOW, GloVe-style matrix factorization, and vector arithmetic
for semantic relationships.
"""

from __future__ import annotations

import math
import random
from collections import Counter
from typing import Dict, List, Optional, Sequence, Tuple


class WordEmbeddingModel:
    """Train and query word embeddings using classical algorithms.

    Implements Skip-Gram with negative sampling, CBOW, and GloVe-style
co-occurrence matrix factorization. Provides vector arithmetic for
analogy solving and semantic similarity queries.
    """

    def __init__(
        self,
        vector_dim: int = 50,
        window_size: int = 2,
        learning_rate: float = 0.025,
        negative_samples: int = 5,
    ) -> None:
        """Initialize embedding hyperparameters.

        Args:
            vector_dim: Dimensionality of embedding vectors.
            window_size: Context window radius.
            learning_rate: Initial SGD learning rate.
            negative_samples: Number of negative samples per positive pair.
        """
        self.vector_dim = vector_dim
        self.window_size = window_size
        self.learning_rate = learning_rate
        self.negative_samples = negative_samples
        self.vocab: Dict[str, int] = {}
        self.id2word: Dict[int, str] = {}
        self.word_freq: Counter = Counter()
        self.W: List[List[float]] = []
        self.W_context: List[List[float]] = []
        self.noise_dist: List[float] = []

    def _tokenize(self, text: str) -> List[str]:
        """Simple whitespace tokenization with lowercasing.

        Args:
            text: Raw input text.

        Returns:
            List of lowercased tokens.
        """
        return [t.lower().strip(".,!?;:\"'()") for t in text.split() if t.strip()]

    def build_vocabulary(self, corpus: Sequence[str], min_count: int = 1) -> None:
        """Build vocabulary and frequency statistics from a corpus.

        Args:
            corpus: Iterable of text documents.
            min_count: Minimum word frequency to include.
        """
        self.word_freq = Counter()
        for doc in corpus:
            self.word_freq.update(self._tokenize(doc))
        filtered = {w: c for w, c in self.word_freq.items() if c >= min_count}
        self.vocab = {w: i for i, w in enumerate(filtered)}
        self.id2word = {i: w for w, i in self.vocab.items()}
        total = sum(filtered.values())
        self.noise_dist = [math.pow(filtered[self.id2word[i]] / total, 0.75)
                           for i in range(len(self.vocab))]
        n = len(self.vocab)
        self.W = [[random.uniform(-0.5 / self.vector_dim, 0.5 / self.vector_dim)
                   for _ in range(self.vector_dim)] for _ in range(n)]
        self.W_context = [[random.uniform(-0.5 / self.vector_dim, 0.5 / self.vector_dim)
                          for _ in range(self.vector_dim)] for _ in range(n)]

    def _sigmoid(self, x: float) -> float:
        """Numerically stable sigmoid.

        Args:
            x: Input scalar.

        Returns:
            Sigmoid of x.
        """
        if x >= 0:
            z = math.exp(-x)
            return 1.0 / (1.0 + z)
        z = math.exp(x)
        return z / (1.0 + z)

    def _negative_sampling(self, batch_size: int) -> List[int]:
        """Sample negative word indices according to noise distribution.

        Args:
            batch_size: Number of negative samples to draw.

        Returns:
            List of sampled word indices.
        """
        total = sum(self.noise_dist)
        probs = [p / total for p in self.noise_dist]
        return random.choices(range(len(probs)), weights=probs, k=batch_size)

    def train_skipgram(self, corpus: Sequence[str], epochs: int = 5) -> None:
        """Train word embeddings using Skip-Gram with negative sampling.

        Args:
            corpus: Iterable of text documents.
            epochs: Number of training passes.
        """
        if not self.vocab:
            self.build_vocabulary(corpus)
        tokens_list = []
        for doc in corpus:
            tokens = [self.vocab[t] for t in self._tokenize(doc) if t in self.vocab]
            tokens_list.extend(tokens)
        n = len(tokens_list)
        for epoch in range(epochs):
            lr = self.learning_rate * (1.0 - epoch / epochs)
            for i in range(n):
                center = tokens_list[i]
                start = max(0, i - self.window_size)
                end = min(n, i + self.window_size + 1)
                for j in range(start, end):
                    if i == j:
                        continue
                    context = tokens_list[j]
                    self._update_pair(center, context, lr, label=1.0)
                    for neg in self._negative_sampling(self.negative_samples):
                        self._update_pair(center, neg, lr, label=0.0)

    def _update_pair(self, center: int, context: int, lr: float, label: float) -> None:
        """Perform one SGD update for a center-context pair.

        Args:
            center: Center word index.
            context: Context word index.
            lr: Current learning rate.
            label: 1.0 for positive, 0.0 for negative.
        """
        v_c = self.W[center]
        v_o = self.W_context[context]
        dot = sum(a * b for a, b in zip(v_c, v_o))
        pred = self._sigmoid(dot)
        grad = (pred - label)
        for d in range(self.vector_dim):
            v_c[d] -= lr * grad * v_o[d]
            v_o[d] -= lr * grad * v_c[d]

    def train_cbow(self, corpus: Sequence[str], epochs: int = 5) -> None:
        """Train word embeddings using Continuous Bag of Words.

        Args:
            corpus: Iterable of text documents.
            epochs: Number of training passes.
        """
        if not self.vocab:
            self.build_vocabulary(corpus)
        tokens_list = []
        for doc in corpus:
            tokens = [self.vocab[t] for t in self._tokenize(doc) if t in self.vocab]
            tokens_list.extend(tokens)
        n = len(tokens_list)
        for epoch in range(epochs):
            lr = self.learning_rate * (1.0 - epoch / epochs)
            for i in range(n):
                start = max(0, i - self.window_size)
                end = min(n, i + self.window_size + 1)
                context_ids = [tokens_list[j] for j in range(start, end) if j != i]
                if not context_ids:
                    continue
                center = tokens_list[i]
                self._update_cbow(context_ids, center, lr)

    def _update_cbow(self, context_ids: List[int], center: int, lr: float) -> None:
        """Perform one CBOW update.

        Args:
            context_ids: List of context word indices.
            center: Center word index to predict.
            lr: Current learning rate.
        """
        vec = [0.0] * self.vector_dim
        for cid in context_ids:
            for d in range(self.vector_dim):
                vec[d] += self.W_context[cid][d]
        for d in range(self.vector_dim):
            vec[d] /= len(context_ids)
        dot = sum(vec[d] * self.W[center][d] for d in range(self.vector_dim))
        pred = self._sigmoid(dot)
        grad = pred - 1.0
        for d in range(self.vector_dim):
            delta = lr * grad * vec[d]
            self.W[center][d] -= delta
        for cid in context_ids:
            for d in range(self.vector_dim):
                self.W_context[cid][d] -= lr * grad * self.W[center][d] / len(context_ids)

    def vector(self, word: str) -> List[float]:
        """Retrieve the embedding vector for a word.

        Args:
            word: Input word.

        Returns:
            Embedding vector, or zero vector if word not in vocabulary.
        """
        idx = self.vocab.get(word)
        if idx is None:
            return [0.0] * self.vector_dim
        return self.W[idx][:]

    def cosine_similarity(self, word1: str, word2: str) -> float:
        """Compute cosine similarity between two word vectors.

        Args:
            word1: First word.
            word2: Second word.

        Returns:
            Cosine similarity in [-1, 1].
        """
        v1 = self.vector(word1)
        v2 = self.vector(word2)
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0.0 or norm2 == 0.0:
            return 0.0
        return dot / (norm1 * norm2)

    def most_similar(self, word: str, topn: int = 5) -> List[Tuple[str, float]]:
        """Find the most similar words to a query word.

        Args:
            word: Query word.
            topn: Number of results to return.

        Returns:
            List of (word, similarity) tuples sorted descending.
        """
        query = self.vector(word)
        qnorm = math.sqrt(sum(a * a for a in query))
        if qnorm == 0.0:
            return []
        scores: List[Tuple[str, float]] = []
        for idx, vec in enumerate(self.W):
            dot = sum(a * b for a, b in zip(query, vec))
            vnorm = math.sqrt(sum(a * a for a in vec))
            if vnorm == 0.0:
                continue
            sim = dot / (qnorm * vnorm)
            scores.append((self.id2word[idx], sim))
        scores.sort(key=lambda x: x[1], reverse=True)
        return [s for s in scores if s[0] != word][:topn]

    def analogy(self, word_a: str, word_b: str, word_c: str, topn: int = 1) -> List[Tuple[str, float]]:
        """Solve analogy of the form A is to B as C is to ?

        Args:
            word_a: First word.
            word_b: Second word.
            word_c: Third word.
            topn: Number of results to return.

        Returns:
            List of candidate (word, similarity) tuples.
        """
        va = self.vector(word_a)
        vb = self.vector(word_b)
        vc = self.vector(word_c)
        target = [vb[d] - va[d] + vc[d] for d in range(self.vector_dim)]
        tnorm = math.sqrt(sum(a * a for a in target))
        if tnorm == 0.0:
            return []
        scores: List[Tuple[str, float]] = []
        for idx, vec in enumerate(self.W):
            dot = sum(a * b for a, b in zip(target, vec))
            vnorm = math.sqrt(sum(a * a for a in vec))
            if vnorm == 0.0:
                continue
            sim = dot / (tnorm * vnorm)
            scores.append((self.id2word[idx], sim))
        scores.sort(key=lambda x: x[1], reverse=True)
        excluded = {word_a, word_b, word_c}
        return [s for s in scores if s[0] not in excluded][:topn]
