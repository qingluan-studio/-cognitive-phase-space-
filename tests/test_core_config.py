"""
Tests for src/cee/app/core/config.py — ConfigLoader and related utilities.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import json
import os
import tempfile
from pathlib import Path

import pytest

from cee.app.core.config import (
    ConfigLoader,
    ConfigError,
    ConfigValidationError,
    DEFAULT_CONFIG,
    create_default_loader,
    get_config_loader,
    reset_config_loader,
)


class TestDefaultConfig:
    """Tests for default configuration."""

    def test_loads_default_config_on_init(self):
        loader = ConfigLoader()
        assert loader.get("engine.search.timeout") == 30
        assert loader.get("engine.generation.model") == "gpt-4"
        assert loader.get("server.host") == "0.0.0.0"
        assert loader.get("server.port") == 8000

    def test_default_has_expected_sections(self):
        loader = ConfigLoader()
        assert loader.get("engine") is not None
        assert loader.get("models") is not None
        assert loader.get("cache") is not None
        assert loader.get("database") is not None
        assert loader.get("rate_limit") is not None
        assert loader.get("logging") is not None
        assert loader.get("server") is not None
        assert loader.get("session") is not None
        assert loader.get("knowledge") is not None
        assert loader.get("analytics") is not None

    def test_custom_defaults_override_builtin(self):
        custom = {"engine": {"search": {"timeout": 99}}}
        loader = ConfigLoader(defaults=custom)
        assert loader.get("engine.search.timeout") == 99
        assert loader.get("engine.generation.model") is None


class TestJSONConfig:
    """Tests for JSON configuration loading."""

    def test_loads_json_file(self):
        loader = ConfigLoader(defaults={})
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({"engine": {"search": {"timeout": 42}}}, f)
            tmp_path = f.name
        try:
            loader.load_json(tmp_path)
            assert loader.get("engine.search.timeout") == 42
        finally:
            os.unlink(tmp_path)

    def test_load_json_merges_deeply(self):
        loader = ConfigLoader(defaults={"a": {"b": 1, "c": 2}})
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({"a": {"b": 10}}, f)
            tmp_path = f.name
        try:
            loader.load_json(tmp_path)
            assert loader.get("a.b") == 10
            assert loader.get("a.c") == 2
        finally:
            os.unlink(tmp_path)

    def test_load_json_raises_for_missing_file(self):
        loader = ConfigLoader()
        with pytest.raises(ConfigError, match="不存在"):
            loader.load_json("/nonexistent/file.json")

    def test_json_source_is_tracked(self):
        loader = ConfigLoader()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({}, f)
            tmp_path = f.name
        try:
            loader.load_json(tmp_path)
            assert any("json" in s for s in loader.sources)
        finally:
            os.unlink(tmp_path)


class TestYAMLConfig:
    """Tests for YAML configuration loading."""

    def test_loads_yaml_file(self):
        loader = ConfigLoader(defaults={})
        try:
            import yaml
        except ImportError:
            pytest.skip("pyyaml not installed")
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("engine:\n  search:\n    timeout: 55\n")
            tmp_path = f.name
        try:
            loader.load_yaml(tmp_path)
            assert loader.get("engine.search.timeout") == 55
        finally:
            os.unlink(tmp_path)

    def test_load_yaml_raises_if_no_pyyaml(self):
        loader = ConfigLoader()
        import cee.app.core.config as cfg
        old_has_yaml = cfg.HAS_YAML
        cfg.HAS_YAML = False
        try:
            with pytest.raises(ConfigError):
                loader.load_yaml("/fake.yaml")
        finally:
            cfg.HAS_YAML = old_has_yaml


class TestEnvConfig:
    """Tests for environment variable configuration loading."""

    def test_loads_env_variables(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_ENGINE__SEARCH__TIMEOUT"] = "99"
        try:
            loader.load_env("CEE_")
            assert loader.get("engine.search.timeout") == 99
        finally:
            del os.environ["CEE_ENGINE__SEARCH__TIMEOUT"]

    def test_env_parses_int_values(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_INT"] = "42"
        try:
            loader.load_env("CEE_")
            assert loader.get("test_int") == 42
        finally:
            del os.environ["CEE_TEST_INT"]

    def test_env_parses_float_values(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_FLOAT"] = "3.14"
        try:
            loader.load_env("CEE_")
            assert loader.get("test_float") == 3.14
        finally:
            del os.environ["CEE_TEST_FLOAT"]

    def test_env_parses_bool_true(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_BOOL_T"] = "true"
        try:
            loader.load_env("CEE_")
            assert loader.get("test_bool_t") is True
        finally:
            del os.environ["CEE_TEST_BOOL_T"]

    def test_env_parses_bool_false(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_BOOL_F"] = "false"
        try:
            loader.load_env("CEE_")
            assert loader.get("test_bool_f") is False
        finally:
            del os.environ["CEE_TEST_BOOL_F"]

    def test_env_parses_none_value(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_NULL"] = "null"
        try:
            loader.load_env("CEE_")
            assert loader.get("test_null") is None
        finally:
            del os.environ["CEE_TEST_NULL"]

    def test_env_parses_json_array(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_ARR"] = '[1, 2, 3]'
        try:
            loader.load_env("CEE_")
            assert loader.get("test_arr") == [1, 2, 3]
        finally:
            del os.environ["CEE_TEST_ARR"]

    def test_env_parses_json_object(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_TEST_OBJ"] = '{"key": "val"}'
        try:
            loader.load_env("CEE_")
            assert loader.get("test_obj") == {"key": "val"}
        finally:
            del os.environ["CEE_TEST_OBJ"]

    def test_env_double_underscore_nesting(self):
        loader = ConfigLoader(defaults={})
        os.environ["CEE_A__B__C"] = "hello"
        try:
            loader.load_env("CEE_")
            assert loader.get("a.b.c") == "hello"
        finally:
            del os.environ["CEE_A__B__C"]

    def test_env_non_matching_prefix_ignored(self):
        loader = ConfigLoader(defaults={})
        os.environ["OTHER_VAR"] = "ignored"
        try:
            loader.load_env("CEE_")
            assert loader.get("other_var") is None
        finally:
            del os.environ["OTHER_VAR"]


class TestDictConfig:
    """Tests for dictionary configuration loading."""

    def test_load_dict_merges(self):
        loader = ConfigLoader(defaults={})
        loader.load_dict({"a": {"b": 1}})
        assert loader.get("a.b") == 1

    def test_load_dict_deep_merge(self):
        loader = ConfigLoader(defaults={"a": {"b": 1, "c": 2}})
        loader.load_dict({"a": {"b": 10}})
        assert loader.get("a.b") == 10
        assert loader.get("a.c") == 2


class TestNestedKeyAccess:
    """Tests for nested key get/set operations."""

    def test_get_nested_key_returns_value(self):
        loader = ConfigLoader(defaults={"x": {"y": {"z": "deep"}}})
        assert loader.get("x.y.z") == "deep"

    def test_get_nested_key_returns_default_when_missing(self):
        loader = ConfigLoader()
        assert loader.get("nonexistent.key", "fallback") == "fallback"
        assert loader.get("nonexistent.key") is None

    def test_set_nested_key_creates_path(self):
        loader = ConfigLoader(defaults={})
        loader.set("a.b.c", 123)
        assert loader.get("a.b.c") == 123

    def test_set_updates_existing_value(self):
        loader = ConfigLoader(defaults={"a": 1})
        loader.set("a", 2)
        assert loader.get("a") == 2

    def test_get_all_returns_deep_copy(self):
        loader = ConfigLoader()
        data = loader.get_all()
        data["engine"]["search"]["timeout"] = 999
        assert loader.get("engine.search.timeout") == 30

    def test_get_section_returns_subsection(self):
        loader = ConfigLoader()
        sec = loader.get_section("engine")
        assert "search" in sec
        assert "generation" in sec

    def test_get_section_raises_for_non_dict(self):
        loader = ConfigLoader()
        loader.set("flat", "not a dict")
        with pytest.raises(ConfigError, match="不是字典类型"):
            loader.get_section("flat")

    def test_contains_operator(self):
        loader = ConfigLoader()
        assert ("engine.search.timeout" in loader) is True
        assert ("nonexistent.key" in loader) is False

    def test_repr_shows_sources(self):
        loader = ConfigLoader()
        assert "defaults" in repr(loader)


class TestConfigValidation:
    """Tests for configuration validation."""

    def test_required_keys_validation(self):
        loader = ConfigLoader(defaults={})
        loader.require_keys("foo.bar")
        errors = loader.validate()
        assert any("foo.bar" in e for e in errors)

    def test_required_keys_passes_when_present(self):
        loader = ConfigLoader(defaults={"foo": {"bar": 1}})
        loader.require_keys("foo.bar")
        errors = loader.validate()
        assert len(errors) == 0

    def test_custom_validator_runs(self):
        loader = ConfigLoader()
        def validate_nope(_config):
            raise ConfigValidationError("always fails")
        loader.add_validator(validate_nope)
        errors = loader.validate()
        assert "always fails" in errors

    def test_validate_or_raise_throws(self):
        loader = ConfigLoader(defaults={})
        loader.require_keys("nonexistent")
        with pytest.raises(ConfigValidationError):
            loader.validate_or_raise()

    def test_create_default_loader_validates_port(self):
        loader = create_default_loader()
        loader.set("server.port", 99999)
        errors = loader.validate()
        assert any("port" in e.lower() for e in errors)

    def test_create_default_loader_validates_invariant_weights(self):
        loader = create_default_loader()
        loader.set("engine.invariant.itc_weight", 0.0)
        errors = loader.validate()
        assert any("权重" in e for e in errors)


class TestConfigExport:
    """Tests for configuration export functionality."""

    def test_export_json(self):
        loader = ConfigLoader(defaults={"a": 1})
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / "out.json"
            loader.export_json(out)
            assert out.exists()
            data = json.loads(out.read_text())
            assert data["a"] == 1

    def test_export_yaml(self):
        try:
            import yaml
        except ImportError:
            pytest.skip("pyyaml not installed")
        loader = ConfigLoader(defaults={"a": 1})
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / "out.yaml"
            loader.export_yaml(out)
            assert out.exists()

    def test_export_env_format(self):
        loader = ConfigLoader(defaults={"engine": {"search": {"timeout": 30}}})
        env_str = loader.export_env("CEE_")
        assert "CEE_ENGINE__SEARCH__TIMEOUT=30" in env_str


class TestReload:
    """Tests for hot-reload functionality."""

    def test_watch_callback_fires_on_set(self):
        loader = ConfigLoader(defaults={})
        calls = []
        loader.watch(lambda key, old, new: calls.append((key, old, new)))
        loader.set("a", 100)
        assert len(calls) == 1
        assert calls[0] == ("a", None, 100)

    def test_reload_returns_empty_when_no_files(self):
        loader = ConfigLoader()
        result = loader.reload()
        assert result == []


class TestSingleton:
    """Tests for the global singleton ConfigLoader."""

    def test_get_config_loader_returns_singleton(self):
        reset_config_loader()
        loader1 = get_config_loader()
        loader2 = get_config_loader()
        assert loader1 is loader2

    def test_reset_config_loader_creates_new_instance(self):
        reset_config_loader()
        loader1 = get_config_loader()
        reset_config_loader()
        loader2 = get_config_loader()
        assert loader1 is not loader2


class TestEdgeCases:
    """Edge case tests."""

    def test_empty_key_returns_none(self):
        loader = ConfigLoader()
        assert loader.get("") is None

    def test_partial_match_returns_default(self):
        loader = ConfigLoader(defaults={"a": {"b": 1}})
        assert loader.get("a.b.c", "missing") == "missing"

    def test_set_on_non_dict_path_replaces(self):
        loader = ConfigLoader(defaults={"a": "string"})
        loader.set("a.b", 1)
        assert loader.get("a.b") == 1

    def test_load_dict_empty_data(self):
        loader = ConfigLoader()
        loader.load_dict({})
        assert "dict" in loader.sources
