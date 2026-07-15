"""Procedural story generation using grammars and plot templates.

Generates narrative text from structural templates, context-free story
grammars, and character-driven scene assembly.
"""

from __future__ import annotations

import random
from typing import Dict, List, Optional, Sequence, Tuple


class StoryGrammar:
    """Context-free grammar for narrative expansion.

    Rules map non-terminal symbols to weighted lists of expansions,
allowing stochastic generation of story fragments.
    """

    def __init__(self) -> None:
        """Initialize empty rule set."""
        self.rules: Dict[str, List[Tuple[str, float]]] = {}

    def add_rule(self, symbol: str, expansions: Sequence[Tuple[str, float]]) -> None:
        """Add weighted expansions for a non-terminal symbol.

        Args:
            symbol: Non-terminal identifier.
            expansions: List of (expansion_string, weight) tuples.
        """
        self.rules.setdefault(symbol, []).extend(expansions)

    def expand(self, symbol: str, max_depth: int = 10) -> str:
        """Recursively expand a symbol using grammar rules.

        Args:
            symbol: Starting symbol or terminal string.
            max_depth: Maximum recursion depth.

        Returns:
            Expanded string.
        """
        if max_depth <= 0 or symbol not in self.rules:
            return symbol
        options = self.rules[symbol]
        total = sum(w for _, w in options)
        r = random.uniform(0, total)
        cumulative = 0.0
        chosen = options[0][0]
        for expansion, weight in options:
            cumulative += weight
            if r <= cumulative:
                chosen = expansion
                break
        result_parts: List[str] = []
        for part in chosen.split():
            if part.startswith("<") and part.endswith(">"):
                result_parts.append(self.expand(part[1:-1], max_depth - 1))
            else:
                result_parts.append(part)
        return " ".join(result_parts)


class StoryGenerator:
    """Assemble stories from scenes, arcs, and structural templates.

    Combines plot templates with character motivations and world state
to generate coherent narrative sequences.
    """

    def __init__(self, grammar: Optional[StoryGrammar] = None) -> None:
        """Initialize with optional grammar.

        Args:
            grammar: StoryGrammar for text generation.
        """
        self.grammar = grammar or StoryGrammar()
        self.templates: Dict[str, List[str]] = {}
        self.characters: Dict[str, Dict[str, str]] = {}
        self.world_state: Dict[str, str] = {}

    def add_template(self, scene_type: str, text: str) -> None:
        """Register a scene template for a scene type.

        Args:
            scene_type: Category of scene.
            text: Template string with placeholders like {name}.
        """
        self.templates.setdefault(scene_type, []).append(text)

    def add_character(self, name: str, traits: Dict[str, str]) -> None:
        """Register a character with attributes.

        Args:
            name: Character identifier.
            traits: Key-value trait dictionary.
        """
        self.characters[name] = traits

    def set_world_state(self, state: Dict[str, str]) -> None:
        """Set global world state variables.

        Args:
            state: World state dictionary.
        """
        self.world_state = dict(state)

    def generate_scene(self, scene_type: str, participants: Sequence[str]) -> str:
        """Generate a scene narrative from template and state.

        Args:
            scene_type: Template category.
            participants: Character names involved.

        Returns:
            Rendered scene text.
        """
        if scene_type not in self.templates:
            return ""
        template = random.choice(self.templates[scene_type])
        context: Dict[str, str] = dict(self.world_state)
        for i, name in enumerate(participants):
            context[f"name{i + 1}"] = name
            for k, v in self.characters.get(name, {}).items():
                context[f"{k}{i + 1}"] = v
        try:
            return template.format(**context)
        except KeyError:
            return template

    def generate_story(self, outline: Sequence[Tuple[str, Sequence[str]]]) -> List[str]:
        """Generate a full story from an outline of scenes.

        Args:
            outline: Sequence of (scene_type, participants) tuples.

        Returns:
            List of scene texts.
        """
        story: List[str] = []
        for scene_type, participants in outline:
            scene = self.generate_scene(scene_type, participants)
            if scene:
                story.append(scene)
        return story

    def random_outline(self, length: int = 5, scene_types: Optional[Sequence[str]] = None) -> List[Tuple[str, List[str]]]:
        """Generate a random story outline.

        Args:
            length: Number of scenes.
            scene_types: Pool of scene type names.

        Returns:
            List of (scene_type, participants) tuples.
        """
        types = list(scene_types or self.templates.keys())
        names = list(self.characters.keys())
        outline: List[Tuple[str, List[str]]] = []
        for _ in range(length):
            st = random.choice(types)
            count = random.randint(1, min(3, len(names)))
            participants = random.sample(names, count) if names else []
            outline.append((st, participants))
        return outline

    def evaluate_coherence(self, story: Sequence[str]) -> float:
        """Compute a simple coherence score based on character consistency.

        Args:
            story: Sequence of scene texts.

        Returns:
            Coherence score in [0, 1].
        """
        if not story:
            return 0.0
        scores: List[float] = []
        for scene in story:
            present = [name for name in self.characters if name in scene]
            if present:
                scores.append(len(present) / len(self.characters))
        return sum(scores) / len(scores) if scores else 0.0

    def generate_conflict(self, protagonist: str, antagonist: str) -> str:
        """Generate a conflict scene between two characters.

        Args:
            protagonist: Protagonist name.
            antagonist: Antagonist name.

        Returns:
            Conflict scene text.
        """
        if self.grammar and "conflict" in self.grammar.rules:
            return self.grammar.expand("conflict")
        return f"{protagonist} confronted {antagonist} in a tense showdown."

    def generate_resolution(self, hero: str) -> str:
        """Generate a resolution scene for a character arc.

        Args:
            hero: Character name.

        Returns:
            Resolution text.
        """
        if self.grammar and "resolution" in self.grammar.rules:
            return self.grammar.expand("resolution")
        return f"{hero} found peace and the world was forever changed."
