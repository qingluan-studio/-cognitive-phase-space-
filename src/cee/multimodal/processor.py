import base64
import hashlib
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class ModalityType(Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    CODE = "code"
    TABLE = "table"
    CHART = "chart"
    DIAGRAM = "diagram"


@dataclass
class ModalityContent:
    modality: ModalityType
    data: bytes
    mime_type: str = ""
    metadata: dict = field(default_factory=dict)

    @property
    def size_bytes(self) -> int:
        return len(self.data)

    @property
    def content_hash(self) -> str:
        return hashlib.sha256(self.data).hexdigest()[:16]

    def to_base64(self) -> str:
        return base64.b64encode(self.data).decode("utf-8")

    def to_dict(self) -> dict:
        return {
            "modality": self.modality.value,
            "size_bytes": self.size_bytes,
            "mime_type": self.mime_type,
            "hash": self.content_hash,
            "metadata": self.metadata,
        }


@dataclass
class MultimodalInput:
    contents: list[ModalityContent]
    prompt: str = ""
    context: dict = field(default_factory=dict)

    @property
    def modalities(self) -> list[ModalityType]:
        return [c.modality for c in self.contents]

    def get_by_type(self, modality: ModalityType) -> list[ModalityContent]:
        return [c for c in self.contents if c.modality == modality]


@dataclass
class MultimodalOutput:
    contents: list[ModalityContent]
    text_summary: str = ""
    confidence: float = 1.0
    processing_time_ms: float = 0.0

    @property
    def has_image(self) -> bool:
        return any(c.modality == ModalityType.IMAGE for c in self.contents)

    def to_dict(self) -> dict:
        return {
            "text_summary": self.text_summary,
            "content_count": len(self.contents),
            "modalities": [c.modality.value for c in self.contents],
            "confidence": self.confidence,
            "processing_time_ms": self.processing_time_ms,
        }


class ImageProcessor:
    SUPPORTED_FORMATS = {"png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"}

    @staticmethod
    def detect_format(data: bytes) -> str:
        if data[:4] == b"\x89PNG":
            return "png"
        if data[:2] == b"\xff\xd8":
            return "jpg"
        if data[:6] in (b"GIF87a", b"GIF89a"):
            return "gif"
        if data[:2] == b"BM":
            return "bmp"
        if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            return "webp"
        if data[:4] == b"<svg" or data[:5] == b"<?xml":
            return "svg"
        return "unknown"

    @staticmethod
    def extract_metadata(data: bytes) -> dict:
        fmt = ImageProcessor.detect_format(data)
        return {
            "format": fmt,
            "size_bytes": len(data),
            "width": 0,
            "height": 0,
        }


class AudioProcessor:
    SUPPORTED_FORMATS = {"mp3", "wav", "ogg", "flac", "aac", "m4a"}

    @staticmethod
    def detect_format(data: bytes) -> str:
        if data[:3] == b"ID3":
            return "mp3"
        if data[:4] == b"RIFF":
            return "wav"
        if data[:4] == b"OggS":
            return "ogg"
        if data[:4] == b"fLaC":
            return "flac"
        return "unknown"

    @staticmethod
    def extract_metadata(data: bytes) -> dict:
        fmt = AudioProcessor.detect_format(data)
        return {
            "format": fmt,
            "size_bytes": len(data),
            "duration_seconds": 0.0,
        }


class VideoProcessor:
    SUPPORTED_FORMATS = {"mp4", "avi", "mkv", "mov", "webm", "flv"}

    @staticmethod
    def detect_format(data: bytes) -> str:
        size = len(data)
        if data[4:8] == b"ftyp":
            return "mp4"
        if data[:4] == b"RIFF":
            return "avi"
        if data[:4] == b"\x1aE\xdf\xa3":
            return "webm"
        return "unknown"


class TableProcessor:
    @staticmethod
    def parse_csv(text: str) -> list[list[str]]:
        import csv
        import io
        reader = csv.reader(io.StringIO(text))
        return [row for row in reader]

    @staticmethod
    def parse_markdown_table(text: str) -> list[list[str]]:
        lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
        if len(lines) < 2:
            return []
        rows: list[list[str]] = []
        for line in lines:
            if line.startswith("|") and line.endswith("|"):
                cells = [c.strip() for c in line[1:-1].split("|")]
                if not all(c.replace("-", "").replace(":", "").strip() == "" for c in cells):
                    rows.append(cells)
        return rows

    @staticmethod
    def to_modality(data: list[list[str]]) -> ModalityContent:
        json_data = json.dumps({"rows": data}, ensure_ascii=False).encode("utf-8")
        return ModalityContent(
            modality=ModalityType.TABLE,
            data=json_data,
            mime_type="application/json",
            metadata={"rows": len(data), "cols": len(data[0]) if data else 0},
        )


class MultimodalRouter:
    def __init__(self):
        self._processors: dict[ModalityType, Any] = {
            ModalityType.IMAGE: ImageProcessor(),
            ModalityType.AUDIO: AudioProcessor(),
            ModalityType.VIDEO: VideoProcessor(),
            ModalityType.TABLE: TableProcessor(),
        }

    def route(self, content: ModalityContent) -> dict:
        processor = self._processors.get(content.modality)
        if processor is None:
            return {"modality": content.modality.value, "supported": False}
        metadata = {}
        if hasattr(processor, "extract_metadata"):
            metadata = processor.extract_metadata(content.data)
        elif hasattr(processor, "detect_format"):
            metadata = {"format": processor.detect_format(content.data)}
        return {
            "modality": content.modality.value,
            "supported": True,
            **metadata,
        }

    def analyze_input(self, multi_input: MultimodalInput) -> dict:
        results = []
        for content in multi_input.contents:
            results.append(self.route(content))
        return {
            "prompt": multi_input.prompt,
            "modalities": [m.value for m in multi_input.modalities],
            "analysis": results,
        }

    @property
    def supported_modalities(self) -> list[str]:
        return [m.value for m in self._processors.keys()]

    def stats(self) -> dict:
        return {
            "supported_modalities": self.supported_modalities,
            "processors": len(self._processors),
        }


class MultiModal:
    def __init__(self):
        self._router = MultimodalRouter()

    def process(self, multi_input: MultimodalInput) -> MultimodalOutput:
        start = __import__("time").time()
        analysis = self._router.analyze_input(multi_input)
        contents: list[ModalityContent] = []
        for inp in multi_input.contents:
            contents.append(ModalityContent(
                modality=inp.modality,
                data=inp.data,
                mime_type=inp.mime_type,
                metadata={"processed": True, **inp.metadata},
            ))
        elapsed = (__import__("time").time() - start) * 1000
        return MultimodalOutput(
            contents=contents,
            text_summary=f"Processed {len(contents)} modalit(y|ies): {analysis['modalities']}",
            confidence=0.95,
            processing_time_ms=elapsed,
        )

    @property
    def router(self) -> MultimodalRouter:
        return self._router
