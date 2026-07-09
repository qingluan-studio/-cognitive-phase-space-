"""CEE Processing — Document processing, text analysis, and output formatting.

Provides:
- LongTextProcessor: Hierarchical chunking and summarization of arbitrarily long documents
- DataPipeline: Composable ETL pipeline with extract/transform/validate/enrich/load stages
- DocReader: Multi-format document parsing (plain text, markdown, HTML, JSON, CSV, XML)
- OutputFormatter: Multi-format output generation (plain, markdown, JSON, table, CSV, etc.)
- TextTransformer: Built-in text transformation utilities
- JsonProcessor: JSON data processing utilities
"""

from .data_pipeline import (
    DataPipeline,
    DataSource,
    JsonProcessor,
    PipelineStage,
    PipelineStep,
    PipelineResult,
    TextTransformer,
)
from .doc_reader import (
    DocReader,
    Document,
    DocumentFormat,
    OutputFormat,
    OutputFormatter,
)
from .long_text import (
    ChunkStrategy,
    LongTextProcessor,
    LongTextReport,
    TextChunk,
)

__all__ = [
    "LongTextProcessor",
    "LongTextReport",
    "TextChunk",
    "ChunkStrategy",
    "DataPipeline",
    "PipelineStage",
    "PipelineStep",
    "PipelineResult",
    "DataSource",
    "TextTransformer",
    "JsonProcessor",
    "DocReader",
    "Document",
    "DocumentFormat",
    "OutputFormatter",
    "OutputFormat",
]
