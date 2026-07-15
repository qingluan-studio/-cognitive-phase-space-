"""Plot structure analysis and generation.

Models classical narrative structures including Freytag's pyramid,
Hero's Journey stages, three-act structure, and dramatic arc analysis.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple


class PlotPoint:
    """Represents a single plot point in a narrative arc.

    Maintains position, intensity, and causal linkage to other points.
    """

    def __init__(
        self,
        name: str,
        position: float,
        intensity: float = 0.5,
        point_type: str = "beat",
    ) -> None:
        """Initialize a plot point.

        Args:
            name: Plot point label.
            position: Normalized position in narrative [0, 1].
            intensity: Emotional intensity [0, 1].
            point_type: Category (beat, incident, climax, etc.).
        """
        self.name = name
        self.position = position
        self.intensity = intensity
        self.point_type = point_type
        self.next_points: List[str] = []
        self.prev_points: List[str] = []

    def link_next(self, point_name: str) -> None:
        """Add a forward causal link.

        Args:
            point_name: Name of the subsequent plot point.
        """
        self.next_points.append(point_name)

    def link_prev(self, point_name: str) -> None:
        """Add a backward causal link.

        Args:
            point_name: Name of the preceding plot point.
        """
        self.prev_points.append(point_name)


class PlotStructure:
    """Manage and analyze narrative plot structures.

    Supports Freytag's pyramid, three-act structure, and custom
plot graphs with intensity curves.
    """

    def __init__(self) -> None:
        """Initialize empty plot point registry."""
        self.points: Dict[str, PlotPoint] = {}
        self.structure_type: str = "custom"

    def add_point(self, point: PlotPoint) -> None:
        """Register a plot point.

        Args:
            point: PlotPoint instance.
        """
        self.points[point.name] = point

    def build_freytag(self) -> None:
        """Construct Freytag's pyramid structure."""
        self.structure_type = "freytag"
        stages = [
            ("exposition", 0.0, 0.2),
            ("rising_action", 0.2, 0.5),
            ("climax", 0.5, 1.0),
            ("falling_action", 0.7, 0.5),
            ("denouement", 0.9, 0.2),
        ]
        prev = None
        for name, pos, intensity in stages:
            p = PlotPoint(name, pos, intensity, "stage")
            if prev:
                p.link_prev(prev)
                self.points[prev].link_next(name)
            self.add_point(p)
            prev = name

    def build_three_act(self) -> None:
        """Construct three-act structure."""
        self.structure_type = "three_act"
        acts = [
            ("act1_setup", 0.15, 0.3),
            ("act1_inciting", 0.25, 0.6),
            ("act2_confrontation", 0.5, 0.5),
            ("act2_midpoint", 0.5, 0.7),
            ("act3_resolution", 0.8, 0.4),
            ("act3_climax", 0.9, 1.0),
        ]
        prev = None
        for name, pos, intensity in acts:
            p = PlotPoint(name, pos, intensity, "act_beat")
            if prev:
                p.link_prev(prev)
                self.points[prev].link_next(name)
            self.add_point(p)
            prev = name

    def build_heros_journey(self) -> None:
        """Construct Hero's Journey 12-stage structure."""
        self.structure_type = "heros_journey"
        stages = [
            ("ordinary_world", 0.05, 0.2),
            ("call_to_adventure", 0.1, 0.4),
            ("refusal", 0.15, 0.3),
            ("meeting_mentor", 0.2, 0.4),
            ("crossing_threshold", 0.25, 0.6),
            ("tests_allies_enemies", 0.4, 0.5),
            ("approach_inmost_cave", 0.55, 0.6),
            ("ordeal", 0.65, 1.0),
            ("reward", 0.7, 0.8),
            ("road_back", 0.8, 0.5),
            ("resurrection", 0.9, 0.9),
            ("return_with_elixir", 0.95, 0.4),
        ]
        prev = None
        for name, pos, intensity in stages:
            p = PlotPoint(name, pos, intensity, "journey_stage")
            if prev:
                p.link_prev(prev)
                self.points[prev].link_next(name)
            self.add_point(p)
            prev = name

    def intensity_curve(self, resolution: int = 100) -> List[Tuple[float, float]]:
        """Generate a smooth intensity curve over the narrative timeline.

        Args:
            resolution: Number of sample points.

        Returns:
            List of (position, intensity) tuples.
        """
        if not self.points:
            return []
        sorted_points = sorted(self.points.values(), key=lambda p: p.position)
        curve: List[Tuple[float, float]] = []
        for i in range(resolution):
            t = i / (resolution - 1) if resolution > 1 else 0.0
            intensity = 0.0
            weight_sum = 0.0
            for sp in sorted_points:
                dist = abs(t - sp.position)
                w = math.exp(-dist * 10.0)
                intensity += w * sp.intensity
                weight_sum += w
            if weight_sum > 0:
                intensity /= weight_sum
            curve.append((t, intensity))
        return curve

    def find_pacing_issues(self, threshold: float = 0.1) -> List[Tuple[str, str]]:
        """Detect consecutive plot points with large spacing gaps.

        Args:
            threshold: Maximum allowed normalized gap.

        Returns:
            List of (earlier_point, later_point) tuples with large gaps.
        """
        sorted_points = sorted(self.points.values(), key=lambda p: p.position)
        issues: List[Tuple[str, str]] = []
        for i in range(len(sorted_points) - 1):
            gap = sorted_points[i + 1].position - sorted_points[i].position
            if gap > threshold:
                issues.append((sorted_points[i].name, sorted_points[i + 1].name))
        return issues

    def critical_path(self) -> List[str]:
        """Compute the longest causal chain through the plot graph.

        Returns:
            Ordered list of plot point names on the critical path.
        """
        if not self.points:
            return []
        dist: Dict[str, int] = {name: 0 for name in self.points}
        prev: Dict[str, Optional[str]] = {name: None for name in self.points}
        sorted_names = sorted(self.points.keys(), key=lambda n: self.points[n].position)
        for name in sorted_names:
            for nxt in self.points[name].next_points:
                if dist[nxt] < dist[name] + 1:
                    dist[nxt] = dist[name] + 1
                    prev[nxt] = name
        end = max(dist, key=lambda k: dist[k])
        path: List[str] = []
        cur: Optional[str] = end
        while cur is not None:
            path.append(cur)
            cur = prev[cur]
        return list(reversed(path))

    def balance_score(self) -> float:
        """Compute structural balance as variance of point spacing.

        Returns:
            Balance score in [0, 1] where higher is more evenly spaced.
        """
        if len(self.points) < 2:
            return 1.0
        positions = sorted(p.position for p in self.points.values())
        gaps = [positions[i + 1] - positions[i] for i in range(len(positions) - 1)]
        mean_gap = sum(gaps) / len(gaps)
        variance = sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)
        return math.exp(-variance * 10.0)

    def dramatic_arc_profile(self) -> Dict[str, float]:
        """Classify the plot structure by arc type.

        Returns:
            Dictionary of arc type probabilities (rags_to_riches, etc.).
        """
        curve = self.intensity_curve(resolution=20)
        intensities = [i for _, i in curve]
        first_third = sum(intensities[:7]) / 7 if len(intensities) >= 7 else 0.0
        last_third = sum(intensities[-7:]) / 7 if len(intensities) >= 7 else 0.0
        peak = max(intensities) if intensities else 0.0
        profile = {
            "tragedy": 1.0 - last_third,
            "comedy": last_third,
            "rags_to_riches": last_third - first_third,
            "man_in_hole": peak - first_third,
        }
        total = sum(max(0, v) for v in profile.values())
        if total > 0:
            profile = {k: max(0, v) / total for k, v in profile.items()}
        return profile
