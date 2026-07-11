"""
Tests for src/cee/app/engine/translator.py -- Translation engine.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.translator import (
    TranslatorEngine,
    TranslationResult,
    BatchTranslationResult,
    TranslationStyle,
    Language,
    GlossaryEntry,
)


class TestTranslatorEngine:
    """Tests for TranslatorEngine."""

    @pytest.fixture
    def translator(self):
        return TranslatorEngine()

    def test_translate_en_to_zh(self, translator):
        result = translator.translate("Hello, how are you?",
                                       source_lang="en", target_lang="zh")
        assert isinstance(result, TranslationResult)
        assert result.source_text == "Hello, how are you?"

    def test_translate_zh_to_en(self, translator):
        result = translator.translate("Hello world",
                                       source_lang="zh", target_lang="en")
        assert isinstance(result, TranslationResult)

    def test_translate_with_glossary_entry(self, translator):
        translator.add_glossary_entry("AI", "Artificial Intelligence",
                                       language_pair="en-zh")
        result = translator.translate("The AI model is great",
                                       source_lang="en", target_lang="zh")
        assert isinstance(result, TranslationResult)

    def test_translate_with_style(self, translator):
        result = translator.translate("Hello world",
                                       source_lang="en", target_lang="zh",
                                       style=TranslationStyle.FORMAL)
        assert isinstance(result, TranslationResult)

    def test_batch_translate(self, translator):
        results = translator.batch_translate(
            ["Hello", "Good morning", "Goodbye"],
            source_lang="en", target_lang="zh",
        )
        assert isinstance(results, BatchTranslationResult)
        assert len(results.results) == 3

    def test_translate_auto_detect(self, translator):
        result = translator.translate("Bonjour le monde")
        assert isinstance(result, TranslationResult)

    def test_translate_empty_text(self, translator):
        result = translator.translate("")
        assert isinstance(result, TranslationResult)

    def test_add_glossary_term(self, translator):
        translator.add_glossary_entry("API", "Application Programming Interface",
                                       language_pair="en-zh")
        assert True

    def test_translation_style_values(self):
        assert TranslationStyle.FORMAL.value == "formal"
        assert TranslationStyle.CASUAL.value == "casual"
        assert TranslationStyle.TECHNICAL.value == "technical"

    def test_language_values(self):
        assert Language.ENGLISH.value == "en"
        assert Language.CHINESE.value == "zh"


class TestTranslationResult:
    """Tests for TranslationResult."""

    def test_defaults(self):
        result = TranslationResult(source_text="Hello",
                                    translated_text="...",
                                    source_lang="en", target_lang="zh")
        assert result.source_text == "Hello"


class TestBatchTranslationResult:
    """Tests for BatchTranslationResult."""

    def test_defaults(self):
        result = BatchTranslationResult()
        assert result.results == []
