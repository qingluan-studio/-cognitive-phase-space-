"""Tests for CEE v2.1.0 — Performance, Multimodal, Models, Knowledge, Output."""

import json
import os
import sys
import tempfile
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


class TestFastResponse:
    def test_create(self):
        from cee.performance import FastResponse
        fr = FastResponse()
        assert fr is not None

    def test_respond_cached(self):
        from cee.performance import FastResponse
        fr = FastResponse()
        call_count = [0]

        def gen():
            call_count[0] += 1
            return "result"

        r1 = fr.respond("hello", gen)
        r2 = fr.respond("hello", gen)
        assert r1 == r2 == "result"
        assert call_count[0] == 1

    def test_stats(self):
        from cee.performance import FastResponse
        fr = FastResponse()
        stats = fr.stats()
        assert "cache" in stats
        assert "output_speed" in stats
        assert "profiling" in stats


class TestResponseCache:
    def test_get_and_set(self):
        from cee.performance import LRUCacheStore
        store = LRUCacheStore(max_size=5, ttl_seconds=60)
        store.set("k1", "v1")
        assert store.get("k1") == "v1"
        assert store.get("missing") is None

    def test_lru_eviction(self):
        from cee.performance import LRUCacheStore
        store = LRUCacheStore(max_size=3, ttl_seconds=60)
        for i in range(5):
            store.set(f"k{i}", f"v{i}")
        assert store.stats()["size"] == 3

    def test_expiry(self):
        from cee.performance import LRUCacheStore
        store = LRUCacheStore(max_size=5, ttl_seconds=0.01)
        store.set("k", "v")
        time.sleep(0.02)
        assert store.get("k") is None

    def test_cache_stats(self):
        from cee.performance import LRUCacheStore
        store = LRUCacheStore(max_size=5)
        store.set("k1", "v1")
        store.get("k1")
        store.get("k1")
        stats = store.stats()
        assert stats["size"] == 1
        assert stats["total_hits"] == 2


class TestQuickComprehension:
    def test_comprehend(self):
        from cee.performance import QuickComprehension
        qc = QuickComprehension()
        result = qc.comprehend("How do I fix this error in my code?")
        assert result.topic in ("question", "general")
        assert result.sentiment in ("positive", "negative", "neutral")

    def test_urgent_detection(self):
        from cee.performance import QuickComprehension
        qc = QuickComprehension()
        result = qc.comprehend("This is urgent! Fix it now!")
        assert result.topic == "urgent"

    def test_complexity(self):
        from cee.performance import QuickComprehension
        qc = QuickComprehension()
        simple = qc.comprehend("hi")
        assert simple.complexity == "simple"
        long_text = "x" * 600
        complex_r = qc.comprehend(long_text)
        assert complex_r.complexity == "complex"


class TestSpeedOutput:
    def test_record(self):
        from cee.performance import SpeedOutput
        so = SpeedOutput(target_cps=200)
        timing = so.record("test", 100.0, 500)
        assert timing.phase == "test"
        assert timing.duration_ms == 100.0

    def test_average_speed(self):
        from cee.performance import SpeedOutput
        so = SpeedOutput()
        so.record("t1", 1000, 500)
        so.record("t2", 500, 1000)
        assert so.average_speed() > 0

    def test_stats(self):
        from cee.performance import SpeedOutput
        so = SpeedOutput()
        stats = so.stats()
        assert "target_cps" in stats


class TestPerformanceProfiler:
    def test_start_stop(self):
        from cee.performance import PerformanceProfiler
        pp = PerformanceProfiler()
        pp.start("op1")
        time.sleep(0.01)
        elapsed = pp.stop("op1")
        assert elapsed > 0

    def test_get_stats(self):
        from cee.performance import PerformanceProfiler
        pp = PerformanceProfiler()
        pp.start("op")
        pp.stop("op")
        stats = pp.get_stats("op")
        assert stats["count"] == 1

    def test_unknown_stats(self):
        from cee.performance import PerformanceProfiler
        pp = PerformanceProfiler()
        stats = pp.get_stats("unknown")
        assert stats["count"] == 0


class TestModalityTypes:
    def test_enum_values(self):
        from cee.multimodal import ModalityType
        assert ModalityType.TEXT.value == "text"
        assert ModalityType.IMAGE.value == "image"
        assert ModalityType.AUDIO.value == "audio"


class TestModalityContent:
    def test_create(self):
        from cee.multimodal import ModalityContent, ModalityType
        mc = ModalityContent(
            modality=ModalityType.TEXT,
            data=b"hello",
            mime_type="text/plain",
        )
        assert mc.modality == ModalityType.TEXT
        assert mc.size_bytes == 5
        assert len(mc.content_hash) == 16

    def test_to_base64(self):
        from cee.multimodal import ModalityContent, ModalityType
        mc = ModalityContent(modality=ModalityType.TEXT, data=b"hello")
        b64 = mc.to_base64()
        assert isinstance(b64, str)
        assert len(b64) > 0

    def test_to_dict(self):
        from cee.multimodal import ModalityContent, ModalityType
        mc = ModalityContent(modality=ModalityType.IMAGE, data=b"\xff\xd8\xff", mime_type="image/jpeg")
        d = mc.to_dict()
        assert d["modality"] == "image"
        assert d["mime_type"] == "image/jpeg"


class TestMultimodalInput:
    def test_create(self):
        from cee.multimodal import MultimodalInput, ModalityContent, ModalityType
        contents = [
            ModalityContent(modality=ModalityType.TEXT, data=b"prompt"),
            ModalityContent(modality=ModalityType.IMAGE, data=b"\x89PNG"),
        ]
        mi = MultimodalInput(contents=contents, prompt="analyze this")
        assert len(mi.contents) == 2
        assert mi.prompt == "analyze this"
        assert len(mi.modalities) == 2

    def test_get_by_type(self):
        from cee.multimodal import MultimodalInput, ModalityContent, ModalityType
        image = ModalityContent(modality=ModalityType.IMAGE, data=b"\x89PNG")
        mi = MultimodalInput(contents=[image])
        imgs = mi.get_by_type(ModalityType.IMAGE)
        assert len(imgs) == 1


class TestImageProcessor:
    def test_detect_png(self):
        from cee.multimodal import ImageProcessor
        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
        assert ImageProcessor.detect_format(png) == "png"

    def test_detect_jpg(self):
        from cee.multimodal import ImageProcessor
        jpg = b"\xff\xd8\xff\xe0" + b"\x00" * 20
        assert ImageProcessor.detect_format(jpg) == "jpg"

    def test_detect_gif(self):
        from cee.multimodal import ImageProcessor
        gif = b"GIF89a" + b"\x00" * 20
        assert ImageProcessor.detect_format(gif) == "gif"

    def test_detect_unknown(self):
        from cee.multimodal import ImageProcessor
        assert ImageProcessor.detect_format(b"random data") == "unknown"


class TestAudioProcessor:
    def test_detect_mp3(self):
        from cee.multimodal import AudioProcessor
        mp3 = b"ID3\x03\x00\x00" + b"\x00" * 20
        assert AudioProcessor.detect_format(mp3) == "mp3"

    def test_detect_wav(self):
        from cee.multimodal import AudioProcessor
        wav = b"RIFF\x00\x00\x00\x00WAVE" + b"\x00" * 20
        assert AudioProcessor.detect_format(wav) == "wav"

    def test_detect_unknown(self):
        from cee.multimodal import AudioProcessor
        assert AudioProcessor.detect_format(b"unknown") == "unknown"


class TestVideoProcessor:
    def test_detect_mp4(self):
        from cee.multimodal import VideoProcessor
        mp4 = b"\x00\x00\x00\x00ftyp" + b"\x00" * 20
        assert VideoProcessor.detect_format(mp4) == "mp4"

    def test_detect_unknown(self):
        from cee.multimodal import VideoProcessor
        assert VideoProcessor.detect_format(b"random") == "unknown"


class TestTableProcessor:
    def test_parse_csv(self):
        from cee.multimodal import TableProcessor
        rows = TableProcessor.parse_csv("a,b,c\n1,2,3")
        assert len(rows) == 2
        assert rows[0] == ["a", "b", "c"]

    def test_parse_markdown_table(self):
        from cee.multimodal import TableProcessor
        md = "| Name | Age |\n|------|-----|\n| Bob  | 30  |"
        rows = TableProcessor.parse_markdown_table(md)
        assert len(rows) == 2
        assert rows[0] == ["Name", "Age"]

    def test_to_modality(self):
        from cee.multimodal import TableProcessor, ModalityType
        mc = TableProcessor.to_modality([["a", "b"], ["1", "2"]])
        assert mc.modality == ModalityType.TABLE


class TestMultimodalRouter:
    def test_route_image(self):
        from cee.multimodal import MultimodalRouter, ModalityContent, ModalityType
        router = MultimodalRouter()
        mc = ModalityContent(modality=ModalityType.IMAGE, data=b"\x89PNG\r\n\x1a\n")
        result = router.route(mc)
        assert result["supported"] is True
        assert result["modality"] == "image"

    def test_analyze_input(self):
        from cee.multimodal import MultimodalRouter, MultimodalInput, ModalityContent, ModalityType
        router = MultimodalRouter()
        mi = MultimodalInput(
            contents=[
                ModalityContent(modality=ModalityType.TEXT, data=b"hello"),
                ModalityContent(modality=ModalityType.IMAGE, data=b"\x89PNG\r\n\x1a\n"),
            ],
            prompt="analyze",
        )
        analysis = router.analyze_input(mi)
        assert len(analysis["analysis"]) == 2
        assert analysis["prompt"] == "analyze"

    def test_supported_modalities(self):
        from cee.multimodal import MultimodalRouter
        router = MultimodalRouter()
        mods = router.supported_modalities
        assert "image" in mods
        assert "audio" in mods


class TestMultiModal:
    def test_process(self):
        from cee.multimodal import MultiModal, ModalityContent, ModalityType, MultimodalInput
        mm = MultiModal()
        mi = MultimodalInput(
            contents=[ModalityContent(modality=ModalityType.TEXT, data=b"test")],
            prompt="test",
        )
        output = mm.process(mi)
        assert output.confidence > 0
        assert len(output.contents) == 1


class TestModelProvider:
    def test_enum(self):
        from cee.models import ModelProvider
        assert ModelProvider.KIMI.value == "kimi"
        assert ModelProvider.OPENAI.value == "openai"


class TestKimiProvider:
    def test_default_config(self):
        from cee.models import KimiProvider
        kimi = KimiProvider()
        assert kimi.config.provider.value == "kimi"

    def test_chat_mock(self):
        from cee.models import KimiProvider
        kimi = KimiProvider()
        resp = kimi.chat([{"role": "user", "content": "Hello"}])
        assert "content" in resp
        assert "Kimi" in resp["content"] or "kimi" in resp["content"].lower()

    def test_from_env(self):
        from cee.models import KimiProvider
        kimi = KimiProvider.from_env()
        assert kimi is not None

    def test_stats(self):
        from cee.models import KimiProvider
        kimi = KimiProvider()
        stats = kimi.stats()
        assert stats["provider"] == "kimi"


class TestModelRegistry:
    def test_preloaded_models(self):
        from cee.models import ModelRegistry
        registry = ModelRegistry()
        all_models = registry.list_all()
        assert len(all_models) >= 4

    def test_list_by_provider(self):
        from cee.models import ModelRegistry, ModelProvider
        registry = ModelRegistry()
        kimi_models = registry.list_by_provider(ModelProvider.KIMI)
        assert len(kimi_models) >= 3

    def test_kimi_models_property(self):
        from cee.models import ModelRegistry
        registry = ModelRegistry()
        km = registry.kimi_models
        assert len(km) >= 3
        assert all("moonshot" in m.model_name for m in km)

    def test_find_by_capability(self):
        from cee.models import ModelRegistry
        registry = ModelRegistry()
        results = registry.find_by_capability("chinese-expert")
        assert len(results) > 0

    def test_get_model(self):
        from cee.models import ModelRegistry, ModelProvider
        registry = ModelRegistry()
        entry = registry.get(ModelProvider.KIMI, "moonshot-v1-8k")
        assert entry is not None
        assert entry.provider == ModelProvider.KIMI

    def test_get_missing(self):
        from cee.models import ModelRegistry, ModelProvider
        registry = ModelRegistry()
        assert registry.get(ModelProvider.KIMI, "nonexistent") is None

    def test_stats(self):
        from cee.models import ModelRegistry
        registry = ModelRegistry()
        stats = registry.stats()
        assert stats["total_models"] >= 4

    def test_model_names(self):
        from cee.models import ModelRegistry
        registry = ModelRegistry()
        names = registry.model_names()
        assert len(names) >= 4


class TestLLMConfig:
    def test_default_config(self):
        from cee.models import LLMConfig, ModelProvider
        config = LLMConfig(provider=ModelProvider.KIMI)
        assert not config.is_configured

    def test_configured(self):
        from cee.models import LLMConfig, ModelProvider
        config = LLMConfig(provider=ModelProvider.KIMI, api_key="sk-test")
        assert config.is_configured


class TestKnowledgeNode:
    def test_create(self):
        from cee.knowledge import KnowledgeNode
        node = KnowledgeNode(node_id="n1", content="AI is transforming science")
        assert node.node_id == "n1"
        assert node.content == "AI is transforming science"
        assert node.confidence == 1.0

    def test_tags(self):
        from cee.knowledge import KnowledgeNode
        node = KnowledgeNode(node_id="n1", content="test", tags=["ai", "science"])
        assert "ai" in node.tags


class TestKnowledgeGraph:
    def test_add_node(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph("test")
        node = kg.add_node("fact A")
        assert node.node_id is not None
        assert node.content == "fact A"

    def test_add_duplicate_node(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph()
        n1 = kg.add_node("fact A")
        n2 = kg.add_node("fact A")
        assert n1.node_id == n2.node_id

    def test_add_edge(self):
        from cee.knowledge import KnowledgeGraph, RelationType
        kg = KnowledgeGraph()
        n1 = kg.add_node("A")
        n2 = kg.add_node("B")
        edge = kg.add_edge(n1.node_id, n2.node_id, RelationType.CAUSES)
        assert edge is not None
        assert edge.relation == RelationType.CAUSES

    def test_add_edge_missing_node(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph()
        kg.add_node("A")
        edge = kg.add_edge("nonexistent", kg.generate_id("A"), None)
        assert edge is None  # type: ignore

    def test_query(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph()
        kg.add_node("Python is a programming language")
        kg.add_node("Java is a programming language")
        kg.add_node("Apple is a fruit")
        results = kg.query("programming")
        assert len(results) == 2

    def test_get_node(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph()
        node = kg.add_node("test")
        found = kg.get_node(node.node_id)
        assert found is not None
        assert found.content == "test"

    def test_get_neighbors(self):
        from cee.knowledge import KnowledgeGraph, RelationType
        kg = KnowledgeGraph()
        a = kg.add_node("A")
        b = kg.add_node("B")
        c = kg.add_node("C")
        kg.add_edge(a.node_id, b.node_id, RelationType.RELATED)
        kg.add_edge(a.node_id, c.node_id, RelationType.DEPENDS_ON)
        neighbors = kg.get_neighbors(a.node_id)
        assert len(neighbors) == 2

    def test_find_paths(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph()
        a = kg.add_node("A")
        b = kg.add_node("B")
        c = kg.add_node("C")
        kg.add_edge(a.node_id, b.node_id)
        kg.add_edge(b.node_id, c.node_id)
        paths = kg.find_paths(a.node_id, c.node_id)
        assert len(paths) >= 1

    def test_to_dict(self):
        from cee.knowledge import KnowledgeGraph
        kg = KnowledgeGraph("test")
        kg.add_node("A")
        kg.add_node("B")
        d = kg.to_dict()
        assert d["name"] == "test"
        assert d["nodes"] == 2


class TestKnowledgeSynthesizer:
    def test_synthesize(self):
        from cee.knowledge import KnowledgeSynthesizer
        synth = KnowledgeSynthesizer()
        result = synth.synthesize(
            "AI impact",
            ["AI leads to better automation", "when AI is used, then productivity increases"],
        )
        assert result.topic == "AI impact"
        assert result.confidence > 0
        assert len(result.insight) > 0

    def test_empty_synthesis(self):
        from cee.knowledge import KnowledgeSynthesizer
        synth = KnowledgeSynthesizer()
        result = synth.synthesize("test", ["simple fact"])
        assert result.topic == "test"

    def test_pattern_detection(self):
        from cee.knowledge import KnowledgeSynthesizer
        synth = KnowledgeSynthesizer()
        result = synth.synthesize(
            "patterns",
            ["first step one, then step two", "A leads to B", "when condition, then result"],
        )
        assert result.insight  # should have content


class TestMassiveBrain:
    def test_create(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        assert brain is not None

    def test_learn(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        node = brain.learn("AI can learn from data", domain="ai")
        assert node is not None
        assert node.content == "AI can learn from data"

    def test_query_all(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        brain.learn("Python for data science", "programming")
        brain.learn("Python for web development", "programming")
        brain.learn("Java for enterprise", "programming")
        results = brain.query_all("Python")
        assert len(results) >= 1

    def test_create_new_knowledge(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        result = brain.create_new_knowledge(
            "AI progress",
            ["deep learning advances", "neural networks improve", "data quality matters"],
        )
        assert result.insight
        assert result.confidence > 0

    def test_to_dict(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        brain.learn("fact 1", "general")
        d = brain.to_dict()
        assert d["total_nodes"] == 1

    def test_save(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        brain.learn("test fact")
        path = brain.save()
        assert os.path.exists(path)
        with open(path) as f:
            data = json.load(f)
        assert "nodes" in data
        os.remove(path)

    def test_reset(self):
        from cee.knowledge import MassiveBrain
        brain = MassiveBrain()
        brain.learn("fact")
        brain.reset()
        assert brain.to_dict()["total_nodes"] == 0


class TestResponseStyle:
    def test_enum(self):
        from cee.output import ResponseStyle
        assert ResponseStyle.CONCISE.value == "concise"
        assert ResponseStyle.DETAILED.value == "detailed"
        assert ResponseStyle.AUTO.value == "auto"


class TestFlexibleFormatter:
    def test_format(self):
        from cee.output import FlexibleFormatter
        ff = FlexibleFormatter()
        result = ff.format("Hello world")
        assert "Hello world" in result

    def test_format_list(self):
        from cee.output import FlexibleFormatter
        ff = FlexibleFormatter()
        result = ff.format_list(["a", "b", "c"])
        assert "- a" in result
        assert "- b" in result

    def test_format_list_numbered(self):
        from cee.output import FlexibleFormatter
        ff = FlexibleFormatter()
        result = ff.format_list(["a", "b"], numbered=True)
        assert "1. a" in result

    def test_format_table(self):
        from cee.output import FlexibleFormatter
        ff = FlexibleFormatter()
        result = ff.format_table(["Name", "Age"], [["Bob", "30"], ["Alice", "25"]])
        assert "Name" in result
        assert "Bob" in result


class TestFileSaver:
    def test_save_text(self):
        from cee.output import FileSaver
        saver = FileSaver(base_dir=tempfile.gettempdir())
        path = saver.save_text("test_output.txt", "hello file")
        assert os.path.exists(path)
        with open(path) as f:
            assert f.read() == "hello file"
        os.remove(path)

    def test_save_json(self):
        from cee.output import FileSaver
        saver = FileSaver(base_dir=tempfile.gettempdir())
        path = saver.save_json("test_data.json", {"key": "value"})
        assert os.path.exists(path)
        with open(path) as f:
            data = json.load(f)
        assert data["key"] == "value"
        os.remove(path)

    def test_save_csv(self):
        from cee.output import FileSaver
        saver = FileSaver(base_dir=tempfile.gettempdir())
        path = saver.save_csv("test_data.csv", [["a", "1"], ["b", "2"]], headers=["col1", "col2"])
        assert os.path.exists(path)
        os.remove(path)

    def test_list_saved(self):
        from cee.output import FileSaver
        saver = FileSaver(base_dir=tempfile.gettempdir())
        p1 = saver.save_text("t1.txt", "a")
        p2 = saver.save_text("t2.txt", "b")
        saved = saver.list_saved()
        assert len(saved) == 2
        os.remove(p1)
        os.remove(p2)

    def test_stats(self):
        from cee.output import FileSaver
        saver = FileSaver()
        stats = saver.stats()
        assert "saved_count" in stats


class TestCopyableFormatter:
    def test_as_plain_text(self):
        from cee.output import CopyableFormatter
        cf = CopyableFormatter()
        result = cf.as_plain_text("# Title\n**bold** text `code`")
        assert "#" not in result
        assert "**" not in result

    def test_as_code_block(self):
        from cee.output import CopyableFormatter
        cf = CopyableFormatter()
        result = cf.as_code_block("print('hello')", "python")
        assert "```python" in result
        assert "print('hello')" in result

    def test_wrap_text(self):
        from cee.output import CopyableFormatter
        cf = CopyableFormatter()
        result = cf.wrap_text("a" * 100, width=40)
        lines = result.split("\n")
        assert len(lines) > 1


class TestAdaptiveResponder:
    def test_respond(self):
        from cee.output import AdaptiveResponder, ResponseStyle
        ar = AdaptiveResponder()
        result = ar.respond("Hello, tell me about Python", style=ResponseStyle.CONCISE)
        assert "formatted" in result
        assert "plain_text" in result
        assert result["copyable"] is True

    def test_respond_auto_style(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        result = ar.respond("Implement a function that...")
        assert "style" in result

    def test_respond_with_save(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        result = ar.respond("test", save_to="temp_out.txt")
        assert "saved_to" in result
        assert os.path.exists(result["saved_to"])
        os.remove(result["saved_to"])

    def test_history(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        ar.respond("msg1")
        ar.respond("msg2")
        assert len(ar.history) == 2

    def test_stats(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        ar.respond("test")
        stats = ar.stats()
        assert stats["total_responses"] == 1

    def test_reset(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        ar.respond("test")
        ar.reset()
        assert len(ar.history) == 0

    def test_copier_integration(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        plain = ar.copier.as_plain_text("**bold** `code`")
        assert "**" not in plain

    def test_saver_integration(self):
        from cee.output import AdaptiveResponder
        ar = AdaptiveResponder()
        path = ar.saver.save_text("integration.txt", "test")
        assert os.path.exists(path)
        os.remove(path)


class TestOutputConfig:
    def test_default(self):
        from cee.output import OutputConfig
        config = OutputConfig()
        assert config.max_length == 8192
        assert config.enable_markdown is True
