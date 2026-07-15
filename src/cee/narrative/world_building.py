"""World building utilities for narrative environments.

Generates and manages fictional world elements including geography,
cultures, histories, factions, and economic systems using procedural
methods and consistency constraints.
"""

from __future__ import annotations

import math
import random
from typing import Dict, List, Optional, Sequence, Set, Tuple


class WorldRegion:
    """Represents a geographic or political region in a fictional world.

    Tracks neighbors, resources, population, and cultural traits.
    """

    def __init__(self, name: str, region_type: str = "territory") -> None:
        """Initialize a world region.

        Args:
            name: Region identifier.
            region_type: Category (city, forest, kingdom, etc.).
        """
        self.name = name
        self.region_type = region_type
        self.neighbors: Set[str] = set()
        self.resources: Dict[str, float] = {}
        self.population: int = 0
        self.culture: Dict[str, float] = {}
        self.history: List[str] = []

    def add_neighbor(self, region_name: str) -> None:
        """Add a neighboring region.

        Args:
            region_name: Neighbor identifier.
        """
        self.neighbors.add(region_name)

    def add_resource(self, resource: str, abundance: float) -> None:
        """Register a regional resource.

        Args:
            resource: Resource name.
            abundance: Abundance level [0, 1].
        """
        self.resources[resource] = abundance

    def set_culture(self, traits: Dict[str, float]) -> None:
        """Set cultural trait values.

        Args:
            traits: Cultural dimension values.
        """
        self.culture = dict(traits)


class WorldBuilder:
    """Procedural world generator and consistency manager.

    Creates regions, cultures, factions, and histories while
enforcing geographic and economic consistency.
    """

    def __init__(self, seed: Optional[int] = None) -> None:
        """Initialize world builder.

        Args:
            seed: Random seed for reproducibility.
        """
        if seed is not None:
            random.seed(seed)
        self.regions: Dict[str, WorldRegion] = {}
        self.factions: Dict[str, Dict[str, any]] = {}
        self.history: List[Tuple[float, str]] = []
        self.economy: Dict[str, float] = {}

    def add_region(self, region: WorldRegion) -> None:
        """Register a world region.

        Args:
            region: WorldRegion instance.
        """
        self.regions[region.name] = region

    def generate_random_region(self, name: str) -> WorldRegion:
        """Create a region with random attributes.

        Args:
            name: Region identifier.

        Returns:
            Generated WorldRegion.
        """
        types = ["city", "village", "forest", "mountain", "desert", "coast", "island"]
        region = WorldRegion(name, random.choice(types))
        region.population = random.randint(1000, 1000000)
        resources = ["gold", "iron", "wood", "food", "magic", "oil", "stone"]
        for r in random.sample(resources, k=random.randint(1, 3)):
            region.add_resource(r, random.random())
        culture_traits = {
            "individualism": random.uniform(-1.0, 1.0),
            "tradition": random.uniform(-1.0, 1.0),
            "aggression": random.uniform(-1.0, 1.0),
            "spirituality": random.uniform(-1.0, 1.0),
        }
        region.set_culture(culture_traits)
        return region

    def connect_regions(self, region1: str, region2: str) -> None:
        """Bidirectionally connect two regions.

        Args:
            region1: First region name.
            region2: Second region name.
        """
        if region1 in self.regions and region2 in self.regions:
            self.regions[region1].add_neighbor(region2)
            self.regions[region2].add_neighbor(region1)

    def generate_network(self, connection_prob: float = 0.3) -> None:
        """Randomly connect regions into a geographic network.

        Args:
            connection_prob: Probability of edge between any pair.
        """
        names = list(self.regions.keys())
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                if random.random() < connection_prob:
                    self.connect_regions(names[i], names[j])

    def add_faction(self, name: str, home_region: str, power: float = 0.5) -> None:
        """Register a political or social faction.

        Args:
            name: Faction identifier.
            home_region: Primary region name.
            power: Relative power [0, 1].
        """
        self.factions[name] = {
            "home": home_region,
            "power": power,
            "alliances": set(),
            "enemies": set(),
        }

    def set_relation(self, faction1: str, faction2: str, relation: str) -> None:
        """Set diplomatic relation between factions.

        Args:
            faction1: First faction.
            faction2: Second faction.
            relation: 'alliance' or 'enemy'.
        """
        if faction1 not in self.factions or faction2 not in self.factions:
            return
        if relation == "alliance":
            self.factions[faction1]["alliances"].add(faction2)
            self.factions[faction2]["alliances"].add(faction1)
            self.factions[faction1]["enemies"].discard(faction2)
            self.factions[faction2]["enemies"].discard(faction1)
        elif relation == "enemy":
            self.factions[faction1]["enemies"].add(faction2)
            self.factions[faction2]["enemies"].add(faction1)
            self.factions[faction1]["alliances"].discard(faction2)
            self.factions[faction2]["alliances"].discard(faction1)

    def add_historical_event(self, year: float, description: str) -> None:
        """Add a world history event.

        Args:
            year: Temporal position.
            description: Event description.
        """
        self.history.append((year, description))
        self.history.sort(key=lambda x: x[0])

    def economic_balance(self) -> float:
        """Compute global economic balance as resource distribution entropy.

        Returns:
            Balance score in [0, 1] where higher is more balanced.
        """
        if not self.regions:
            return 1.0
        totals: Dict[str, float] = {}
        for region in self.regions.values():
            for r, a in region.resources.items():
                totals[r] = totals.get(r, 0.0) + a
        if not totals:
            return 1.0
        total = sum(totals.values())
        entropy = -sum((v / total) * math.log(v / total) for v in totals.values() if v > 0)
        max_entropy = math.log(len(totals)) if totals else 1.0
        return entropy / max_entropy if max_entropy > 0 else 1.0

    def cultural_distance(self, region1: str, region2: str) -> float:
        """Compute Euclidean distance between regional cultures.

        Args:
            region1: First region name.
            region2: Second region name.

        Returns:
            Cultural distance.
        """
        r1 = self.regions.get(region1)
        r2 = self.regions.get(region2)
        if r1 is None or r2 is None:
            return 0.0
        keys = set(r1.culture) | set(r2.culture)
        return math.sqrt(sum((r1.culture.get(k, 0.0) - r2.culture.get(k, 0.0)) ** 2 for k in keys))

    def find_trade_routes(self, resource: str) -> List[Tuple[str, str, float]]:
        """Identify potential trade routes for a resource between regions.

        Args:
            resource: Resource name.

        Returns:
            List of (exporter, importer, surplus) tuples.
        """
        exporters: List[Tuple[str, float]] = []
        importers: List[Tuple[str, float]] = []
        for name, region in self.regions.items():
            if resource in region.resources:
                exporters.append((name, region.resources[resource]))
            else:
                importers.append((name, 0.0))
        routes: List[Tuple[str, str, float]] = []
        for ex, abundance in exporters:
            for im, _ in importers:
                if im in self.regions[ex].neighbors:
                    routes.append((ex, im, abundance))
        return routes

    def world_summary(self) -> Dict[str, any]:
        """Generate a summary dictionary of the world state.

        Returns:
            Summary with counts, balance, and key metrics.
        """
        return {
            "region_count": len(self.regions),
            "faction_count": len(self.factions),
            "event_count": len(self.history),
            "economic_balance": self.economic_balance(),
            "total_population": sum(r.population for r in self.regions.values()),
        }
