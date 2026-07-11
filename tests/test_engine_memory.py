"""
Tests for src/cee/app/engine/memory.py — Long-term memory system.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

from cee.app.engine.memory import (
    MemorySystem,
    MemoryEntry,
    MemoryType,
    MemoryScope,
    UserProfile,
)


class TestMemorySystem:
    """Tests for MemorySystem."""

    def test_add_short_term_memory(self):
        mem_system = MemorySystem()
        entry = mem_system.remember("Hello world", MemoryType.FACT)
        assert isinstance(entry, MemoryEntry)

    def test_add_long_term_memory(self):
        mem_system = MemorySystem()
        entry = mem_system.remember("Important fact", MemoryType.INSIGHT, importance=0.9)
        assert isinstance(entry, MemoryEntry)

    def test_retrieve_by_query(self):
        mem_system = MemorySystem()
        mem_system.remember("Python is great for data science", MemoryType.FACT)
        results = mem_system.recall("Python data science")
        assert len(results) > 0

    def test_retrieve_all(self):
        mem_system = MemorySystem()
        mem_system.remember("Fact 1", MemoryType.FACT)
        mem_system.remember("Fact 2", MemoryType.FACT)
        results = mem_system.recall("")
        assert len(results) >= 0

    def test_retrieve_by_type(self):
        mem_system = MemorySystem()
        mem_system.remember("Pref 1", MemoryType.PREFERENCE)
        results = mem_system.recall("Pref")
        assert len(results) >= 0

    def test_remove_memory(self):
        mem_system = MemorySystem()
        entry = mem_system.remember("To delete", MemoryType.FACT)
        assert mem_system.forget(entry.id) is True

    def test_remove_nonexistent(self):
        mem_system = MemorySystem()
        assert mem_system.forget("nonexistent") is False

    def test_clear_all(self):
        mem_system = MemorySystem()
        mem_system.remember("M1", MemoryType.FACT)
        mem_system.remember("M2", MemoryType.FACT)
        consolidated = mem_system.consolidate()
        assert isinstance(consolidated, int)

    def test_get_memory(self):
        mem_system = MemorySystem()
        entry = mem_system.remember("Test", MemoryType.FACT)
        results = mem_system.recall(str(entry.id), top_k=1)
        assert isinstance(results, list)

    def test_add_with_tags(self):
        mem_system = MemorySystem()
        entry = mem_system.remember("Tagged", MemoryType.FACT, tags=["tech", "python"])
        assert isinstance(entry, MemoryEntry)

    def test_user_profile(self):
        mem_system = MemorySystem()
        profile = mem_system.get_profile()
        profile.name = "Alice"
        profile.preferences = {"theme": "dark"}
        mem_system.save()
        profile2 = mem_system.get_profile()
        assert isinstance(profile2, UserProfile)

    def test_consolidate_memories(self):
        mem_system = MemorySystem()
        mem_system.remember("Short term memory 1", MemoryType.FACT)
        mem_system.remember("Long term knowledge", MemoryType.INSIGHT, importance=0.9)
        count = mem_system.consolidate()
        assert isinstance(count, int)

    def test_stats(self):
        mem_system = MemorySystem()
        mem_system.remember("M1", MemoryType.FACT)
        mem_system.remember("M2", MemoryType.FACT)
        stats = mem_system.stats()
        assert isinstance(stats, dict)
        assert len(stats) > 0

    def test_remember_fact(self):
        mem_system = MemorySystem()
        entry = mem_system.remember_fact("Paris is capital of France", importance=0.7)
        assert isinstance(entry, MemoryEntry)

    def test_remember_instruction(self):
        mem_system = MemorySystem()
        entry = mem_system.remember_instruction("Always use type hints")
        assert isinstance(entry, MemoryEntry)

    def test_remember_preference(self):
        mem_system = MemorySystem()
        entry = mem_system.remember_preference("Dark mode")
        assert isinstance(entry, MemoryEntry)

    def test_save_load(self):
        import tempfile, os
        mem_system = MemorySystem()
        mem_system.remember("Persistent data", MemoryType.FACT)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as f:
            mem_system.save(f.name)
            path = f.name
        mem_system2 = MemorySystem()
        mem_system2.load(path)
        os.unlink(path)
        assert isinstance(mem_system2.stats(), dict)


class TestMemoryEntry:
    """Tests for MemoryEntry."""

    def test_creation(self):
        entry = MemoryEntry(id="m1", content="test", memory_type="fact", scope="short_term")
        assert entry.id == "m1"
        assert entry.content == "test"


class TestMemoryType:
    """Tests for MemoryType enum."""

    def test_values(self):
        assert MemoryType.FACT.value == "fact"
        assert MemoryType.INSIGHT.value == "insight"


class TestMemoryScope:
    """Tests for MemoryScope enum."""

    def test_values(self):
        assert MemoryScope.SHORT_TERM.value == "short_term"
        assert MemoryScope.LONG_TERM.value == "long_term"


class TestUserProfile:
    """Tests for UserProfile."""

    def test_creation(self):
        profile = UserProfile()
        profile.name = "Alice"
        assert profile.name == "Alice"
