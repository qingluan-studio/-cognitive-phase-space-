"""
文件处理引擎 — 多格式文件解析、批量处理、内容提取

模拟 Kimi 的多文件解析能力，提供:
  - FileProcessor: 统一文件处理入口
  - PDFParser: 纯 Python PDF 文本提取
  - DocxParser: DOCX 文档解析
  - ImageParser: 图片信息提取 (尺寸、EXIF、OCR 占位)
  - CodeParser: 代码文件语言检测和结构分析
  - CSV/Excel 解析器
  - 文件类型自动检测 (MIME)
  - 批量文件处理 (最大 50 并发)
  - 文件摘要生成
"""

from __future__ import annotations

import base64
import concurrent.futures
import csv
import io
import json
import mimetypes
import os
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Union

_MAX_FILE_SIZE = 100 * 1024 * 1024
_MAX_WORKERS = 50
_DEFAULT_WORKERS = 10


# ============================================================
# Data Classes
# ============================================================

class FileCategory(Enum):
    DOCUMENT = auto()
    IMAGE = auto()
    CODE = auto()
    DATA = auto()
    ARCHIVE = auto()
    UNKNOWN = auto()


@dataclass
class FileParseResult:
    filepath: str
    filename: str
    category: FileCategory = FileCategory.UNKNOWN
    mime_type: str = ""
    file_size: int = 0
    text: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    summary: str = ""
    error: str = ""
    pages: int = 0
    language: str = ""
    structure: dict[str, Any] = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return not self.error and bool(self.text or self.metadata)


@dataclass
class FileBatchResult:
    total: int
    success: int
    failed: int
    results: list[FileParseResult] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    combined_summary: str = ""


# ============================================================
# MIME Type Detection
# ============================================================

_MIME_MAP: dict[str, str] = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
    ".json": "application/json",
    ".xml": "application/xml",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
    ".py": "text/x-python",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".jsx": "text/jsx",
    ".tsx": "text/tsx",
    ".java": "text/x-java",
    ".c": "text/x-c",
    ".cpp": "text/x-c++",
    ".h": "text/x-c-header",
    ".go": "text/x-go",
    ".rs": "text/x-rust",
    ".rb": "text/x-ruby",
    ".php": "text/x-php",
    ".swift": "text/x-swift",
    ".kt": "text/x-kotlin",
    ".scala": "text/x-scala",
    ".sql": "text/x-sql",
    ".sh": "text/x-shellscript",
    ".bat": "text/x-batch",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".zip": "application/zip",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    ".rar": "application/x-rar-compressed",
    ".7z": "application/x-7z-compressed",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
}


def detect_mime_type(filepath: str) -> str:
    """检测文件的 MIME 类型。"""
    ext = os.path.splitext(filepath.lower())[1]
    if ext in _MIME_MAP:
        return _MIME_MAP[ext]
    mime, _ = mimetypes.guess_type(filepath, strict=False)
    return mime or "application/octet-stream"


def detect_file_category(mime_type: str, filepath: str) -> FileCategory:
    """根据 MIME 类型和扩展名判断文件类别。"""
    ext = os.path.splitext(filepath.lower())[1]
    code_exts = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp",
        ".h", ".hpp", ".go", ".rs", ".rb", ".php", ".swift", ".kt",
        ".scala", ".sql", ".sh", ".bat", ".r", ".m", ".mm", ".lua",
        ".pl", ".dart", ".ex", ".exs", ".erl", ".hrl", ".clj",
    }
    data_exts = {".csv", ".xlsx", ".xls", ".json", ".xml", ".yaml", ".yml"}

    if ext in code_exts or "code" in mime_type or "script" in mime_type:
        return FileCategory.CODE
    if mime_type.startswith("image/"):
        return FileCategory.IMAGE
    if mime_type == "application/pdf":
        return FileCategory.DOCUMENT
    if "wordprocessing" in mime_type or "document" in mime_type:
        return FileCategory.DOCUMENT
    if ext in data_exts or "spreadsheet" in mime_type:
        return FileCategory.DATA
    if mime_type.startswith("text/") and ext not in code_exts:
        return FileCategory.DOCUMENT
    if any(
        x in mime_type
        for x in ("zip", "tar", "gzip", "rar", "7z", "archive")
    ):
        return FileCategory.ARCHIVE
    return FileCategory.UNKNOWN


# ============================================================
# PDF Parser (Pure Python)
# ============================================================

class PDFParser:
    """纯 Python PDF 文本提取器。

    无需外部库，解析 PDF 流中的文本对象。
    """

    def parse(self, filepath: str) -> FileParseResult:
        """解析 PDF 文件提取文本。"""
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=FileCategory.DOCUMENT,
            mime_type="application/pdf",
        )
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            result.file_size = len(data)

            text_content = self._extract_text(data)
            result.text = text_content

            pages = self._count_pages(data)
            result.pages = pages
            result.metadata = self._extract_metadata(data)
            result.summary = self._generate_summary(text_content, result)
        except Exception as e:
            result.error = f"PDF parse error: {e}"
        return result

    def _extract_text(self, data: bytes) -> str:
        text_parts: list[str] = []

        if data[:5] != b"%PDF-":
            return ""

        content_str = data.decode("latin-1", errors="replace")

        stream_pattern = re.compile(
            r"stream\r?\n(.*?)\r?\nendstream", re.DOTALL
        )
        for match in stream_pattern.finditer(content_str):
            stream_content = match.group(1)
            decoded = self._decode_stream(stream_content)
            if decoded:
                text_parts.append(decoded)

        bt_et_pattern = re.compile(
            r"BT(.*?)ET", re.DOTALL
        )
        tj_pattern = re.compile(
            r"\(([^)]*)\)\s*Tj"
        )
        tj_array_pattern = re.compile(
            r"\[(.*?)\]\s*TJ", re.DOTALL
        )

        for bt_match in bt_et_pattern.finditer(content_str):
            block = bt_match.group(1)
            for tj in tj_pattern.finditer(block):
                text_parts.append(tj.group(1))
            for tj_arr in tj_array_pattern.finditer(block):
                arr = tj_arr.group(1)
                for m in re.finditer(r"\(([^)]*)\)", arr):
                    text_parts.append(m.group(1))

        text = "\n".join(text_parts)
        text = re.sub(r"\\([nrt])", "", text)
        text = re.sub(r"\\\d{3}", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _decode_stream(self, stream_content: str) -> str:
        return stream_content[:2000] if len(stream_content) < 5000 else ""

    def _count_pages(self, data: bytes) -> int:
        content = data.decode("latin-1", errors="replace")
        pages = re.findall(
            r"/Type\s*/Pages?\b",
            content,
            re.IGNORECASE,
        )
        count = re.findall(r"/Page\b", content, re.IGNORECASE)
        return max(len(count), 1)

    def _extract_metadata(self, data: bytes) -> dict[str, Any]:
        content = data.decode("latin-1", errors="replace")
        meta: dict[str, Any] = {"format": f"PDF {data[5:8].decode('ascii', errors='replace')}"}

        title_m = re.search(r"/Title\s*\(([^)]*)\)", content)
        if title_m:
            meta["title"] = title_m.group(1)

        author_m = re.search(r"/Author\s*\(([^)]*)\)", content)
        if author_m:
            meta["author"] = author_m.group(1)

        creator_m = re.search(r"/Creator\s*\(([^)]*)\)", content)
        if creator_m:
            meta["creator"] = creator_m.group(1)

        return meta

    def _generate_summary(
        self, text: str, result: FileParseResult
    ) -> str:
        if not text:
            return f"PDF ({result.pages} pages, {self._format_size(result.file_size)}) — no extractable text"
        preview = text[:200].replace("\n", " ")
        return (
            f"PDF ({result.pages} pages, {self._format_size(result.file_size)}, "
            f"{len(text)} chars): {preview}"
        )

    @staticmethod
    def _format_size(size: int) -> str:
        if size >= 1024 * 1024:
            return f"{size / 1048576:.1f}MB"
        if size >= 1024:
            return f"{size / 1024:.1f}KB"
        return f"{size}B"


# ============================================================
# DOCX Parser
# ============================================================

class DocxParser:
    """DOCX 文档解析器。

    使用 zipfile 解压 .docx 并提取 XML 文本。
    """

    def parse(self, filepath: str) -> FileParseResult:
        """解析 .docx 文件提取文本和元数据。"""
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=FileCategory.DOCUMENT,
            mime_type=(
                "application/"
                "vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            result.file_size = len(data)

            with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
                names = zf.namelist()

                if "word/document.xml" in names:
                    xml_bytes = zf.read("word/document.xml")
                    result.text = self._extract_text_from_xml(xml_bytes)

                if "docProps/core.xml" in names:
                    core_xml = zf.read("docProps/core.xml")
                    result.metadata = self._parse_core_xml(core_xml)

            result.summary = self._generate_summary(result)
        except Exception as e:
            result.error = f"DOCX parse error: {e}"
        return result

    def _extract_text_from_xml(self, xml_bytes: bytes) -> str:
        try:
            root = ET.fromstring(xml_bytes.decode("utf-8"))
        except ET.ParseError:
            return ""

        nsmap = {
            "w": (
                "http://schemas.openxmlformats.org/"
                "wordprocessingml/2006/main"
            ),
        }
        paragraphs: list[str] = []
        for p in root.iter():
            tag = p.tag.split("}")[-1] if "}" in p.tag else p.tag
            if tag == "p":
                texts: list[str] = []
                for t in p.iter():
                    ttag = t.tag.split("}")[-1] if "}" in t.tag else t.tag
                    if ttag == "t" and t.text:
                        texts.append(t.text)
                if texts:
                    paragraphs.append("".join(texts))
        return "\n\n".join(paragraphs)

    def _parse_core_xml(self, xml_bytes: bytes) -> dict[str, Any]:
        try:
            root = ET.fromstring(xml_bytes.decode("utf-8"))
        except ET.ParseError:
            return {}
        meta: dict[str, Any] = {}
        nsmap = {
            "cp": (
                "http://schemas.openxmlformats.org/"
                "package/2006/metadata/core-properties"
            ),
            "dc": "http://purl.org/dc/elements/1.1/",
            "dcterms": "http://purl.org/dc/terms/",
        }
        tag_map = {
            "title": "dc:title",
            "creator": "dc:creator",
            "description": "dc:description",
            "subject": "dc:subject",
            "created": "dcterms:created",
            "modified": "dcterms:modified",
        }
        for key, tag in tag_map.items():
            el = root.find(tag, nsmap)
            if el is not None and el.text:
                meta[key] = el.text
        return meta

    def _generate_summary(self, result: FileParseResult) -> str:
        text_preview = result.text[:200].replace("\n", " ") if result.text else "(empty)"
        size = PDFParser._format_size(result.file_size)
        return (
            f"DOCX ({size}, {len(result.text)} chars): {text_preview}"
        )


# ============================================================
# Image Parser
# ============================================================

class ImageParser:
    """图片信息提取器。

    提取图片尺寸、EXIF 元数据、格式信息。
    """

    _PNG_SIG = b"\x89PNG\r\n\x1a\n"
    _JPEG_SIG = b"\xff\xd8\xff"
    _GIF87_SIG = b"GIF87a"
    _GIF89_SIG = b"GIF89a"
    _BMP_SIG = b"BM"
    _WEBP_SIG = b"RIFF"
    _TIFF_LE = b"II\x2a\x00"
    _TIFF_BE = b"MM\x00\x2a"

    def parse(self, filepath: str) -> FileParseResult:
        """解析图片文件提取信息和元数据。"""
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=FileCategory.IMAGE,
            mime_type=detect_mime_type(filepath),
        )
        try:
            with open(filepath, "rb") as f:
                data = f.read(10 * 1024 * 1024)
            result.file_size = len(data)

            fmt, width, height = self._detect_format_and_size(data)
            result.metadata = {
                "format": fmt,
                "width": width,
                "height": height,
                "area_pixels": width * height,
                "file_size_bytes": len(data),
            }
            result.metadata["aspect_ratio"] = (
                round(width / height, 3) if height else 0
            )

            if fmt.upper() == "JPEG":
                exif = self._extract_jpeg_exif(data)
                if exif:
                    result.metadata["exif"] = exif

            result.text = self._generate_text_description(result)
            result.summary = self._generate_summary(result)
        except Exception as e:
            result.error = f"Image parse error: {e}"
        return result

    def _detect_format_and_size(
        self, data: bytes
    ) -> tuple[str, int, int]:
        if data[:8] == self._PNG_SIG:
            w, h = struct.unpack(">II", data[16:24])
            return "PNG", w, h
        if data[:3] == self._JPEG_SIG:
            w, h = self._parse_jpeg_size(data)
            return "JPEG", w, h
        if data[:6] in (self._GIF87_SIG, self._GIF89_SIG):
            w, h = struct.unpack("<HH", data[6:10])
            return "GIF", w, h
        if data[:2] == self._BMP_SIG:
            size = struct.unpack("<I", data[2:6])[0]
            if size >= 40:
                w = struct.unpack("<i", data[18:22])[0]
                h = abs(struct.unpack("<i", data[22:26])[0])
                return "BMP", w, h
        if data[:4] == self._WEBP_SIG and data[8:12] == b"WEBP":
            if data[12:16] == b"VP8 ":
                w, h = struct.unpack("<HH", data[26:30])
                w &= 0x3FFF
                h &= 0x3FFF
                return "WEBP", w, h
            if data[12:16] == b"VP8L":
                bits = struct.unpack("<I", data[21:25])[0]
                w = (bits & 0x3FFF) + 1
                h = ((bits >> 14) & 0x3FFF) + 1
                return "WEBP", w, h
        if data[:4] == self._TIFF_LE:
            ifh = struct.unpack("<I", data[4:8])[0]
            entries = struct.unpack("<H", data[ifh : ifh + 2])[0]
            w, h = 0, 0
            for i in range(entries):
                off = ifh + 2 + i * 12
                tag, typ, cnt, val = struct.unpack(
                    "<HHII", data[off : off + 12]
                )
                if tag == 256:
                    w = val if cnt == 1 else cnt
                elif tag == 257:
                    h = val if cnt == 1 else cnt
            return "TIFF", w, h
        return "UNKNOWN", 0, 0

    def _parse_jpeg_size(self, data: bytes) -> tuple[int, int]:
        pos = 2
        while pos + 4 < len(data):
            if data[pos] != 0xFF:
                break
            marker = data[pos + 1]
            if marker in (0xD8, 0xD9):
                pos += 2
                continue
            if marker >= 0xC0 and marker <= 0xC3:
                h, w = struct.unpack(">HH", data[pos + 5 : pos + 9])
                return w, h
            length = struct.unpack(">H", data[pos + 2 : pos + 4])[0]
            pos += 2 + length
        return 0, 0

    def _extract_jpeg_exif(self, data: bytes) -> dict[str, Any]:
        exif: dict[str, Any] = {}
        if data[6:10] == b"Exif":
            try:
                tiff_data = data[10:]
                offset = struct.unpack(">I", tiff_data[:4])[0]
                ifh = offset + 4
                byte_order = tiff_data[offset : offset + 2]
                endian = ">" if byte_order == b"MM" else "<"
                entries = struct.unpack(
                    f"{endian}H", tiff_data[ifh : ifh + 2]
                )[0]

                tag_names: dict[int, str] = {
                    0x010F: "make",
                    0x0110: "model",
                    0x9003: "date_time_original",
                    0x0132: "date_time",
                    0x829A: "exposure_time",
                    0x829D: "f_number",
                    0x8827: "iso",
                    0x920A: "focal_length",
                }

                for i in range(min(entries, 50)):
                    off = ifh + 2 + i * 12
                    if off + 12 > len(tiff_data):
                        break
                    tag, typ, cnt, val = struct.unpack(
                        f"{endian}HHII", tiff_data[off : off + 12]
                    )
                    if tag in tag_names:
                        if typ == 2:
                            if cnt > 4:
                                vo = struct.unpack(
                                    f"{endian}I",
                                    tiff_data[off + 8 : off + 12],
                                )[0]
                                s = tiff_data[
                                    offset + vo : offset + vo + cnt
                                ]
                            else:
                                s = tiff_data[off + 8 : off + 8 + cnt]
                            val_str = s.split(b"\x00")[0].decode(
                                "ascii", errors="replace"
                            )
                        elif typ in (3, 4):
                            val_str = str(val)
                        else:
                            val_str = str(val)
                        exif[tag_names[tag]] = val_str
            except Exception:
                pass
        return exif

    def _generate_text_description(
        self, result: FileParseResult
    ) -> str:
        meta = result.metadata
        return (
            f"Image: {meta.get('format', 'Unknown')} format\n"
            f"Resolution: {meta.get('width', '?')}x{meta.get('height', '?')} "
            f"({meta.get('area_pixels', 0)} pixels)\n"
            f"Aspect Ratio: {meta.get('aspect_ratio', 'N/A')}\n"
            f"File Size: {PDFParser._format_size(result.file_size)}\n"
            f"[OCR processing available for text extraction]"
        )

    def _generate_summary(self, result: FileParseResult) -> str:
        meta = result.metadata
        return (
            f"{meta.get('format', 'Image')} "
            f"{meta.get('width', '?')}x{meta.get('height', '?')} "
            f"({PDFParser._format_size(result.file_size)})"
        )


# ============================================================
# Code Parser
# ============================================================

@dataclass
class _FunctionInfo:
    name: str = ""
    line_start: int = 0
    line_end: int = 0
    params: list[str] = field(default_factory=list)


@dataclass
class _ClassInfo:
    name: str = ""
    line_start: int = 0
    line_end: int = 0
    methods: list[_FunctionInfo] = field(default_factory=list)
    bases: list[str] = field(default_factory=list)


class CodeParser:
    """代码文件解析器。

    检测编程语言、提取结构信息（函数、类、导入）。
    """

    _LANGUAGE_MAP: dict[str, str] = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".jsx": "jsx",
        ".tsx": "tsx",
        ".java": "java",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "c",
        ".go": "go",
        ".rs": "rust",
        ".rb": "ruby",
        ".php": "php",
        ".sql": "sql",
        ".sh": "shell",
        ".bat": "batch",
    }

    def parse(self, filepath: str) -> FileParseResult:
        """解析代码文件并提取结构信息。"""
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=FileCategory.CODE,
            mime_type=detect_mime_type(filepath),
        )
        ext = os.path.splitext(filepath.lower())[1]
        result.language = self._LANGUAGE_MAP.get(ext, ext.lstrip("."))

        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            result.file_size = len(content.encode("utf-8"))
            result.text = content

            result.structure = self._analyze_structure(content, result.language)
            result.summary = self._generate_summary(result)
        except Exception as e:
            result.error = f"Code parse error: {e}"
        return result

    def _analyze_structure(
        self, code: str, language: str
    ) -> dict[str, Any]:
        lines = code.split("\n")
        structure: dict[str, Any] = {
            "total_lines": len(lines),
            "total_chars": len(code),
            "non_empty_lines": sum(1 for l in lines if l.strip()),
            "imports": self._extract_imports(code, language),
            "functions": [],
            "classes": [],
            "comments": self._count_comments(code, language),
        }

        try:
            funcs = self._extract_functions(code, language)
            structure["functions"] = [
                {"name": f.name, "line": f.line_start, "params": f.params}
                for f in funcs
            ]
            classes = self._extract_classes(code, language)
            structure["classes"] = [
                {
                    "name": c.name,
                    "line": c.line_start,
                    "methods": len(c.methods),
                    "bases": c.bases,
                }
                for c in classes
            ]
        except Exception:
            pass

        return structure

    def _extract_imports(
        self, code: str, language: str
    ) -> list[str]:
        imports: list[str] = []
        patterns: dict[str, str] = {
            "python": r"^(?:import\s+([\w.]+)|from\s+([\w.]+)\s+import)",
            "javascript": r"^(?:import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]|const\s+.*?=\s*require\(['\"]([^'\"]+)['\"]\))",
            "go": r"^import\s+\"([^\"]+)\"",
            "java": r"^import\s+([\w.]+);",
            "rust": r"^use\s+([\w:]+);",
        }
        pattern = patterns.get(language, r"^import\s+([\w.]+)")
        for match in re.finditer(pattern, code, re.MULTILINE):
            for g in match.groups():
                if g:
                    imports.append(g)
        return imports

    def _extract_functions(
        self, code: str, language: str
    ) -> list[_FunctionInfo]:
        funcs: list[_FunctionInfo] = []
        if language == "python":
            pattern = re.compile(
                r"^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)",
                re.MULTILINE,
            )
            for m in pattern.finditer(code):
                funcs.append(
                    _FunctionInfo(
                        name=m.group(1),
                        line_start=code[: m.start()].count("\n") + 1,
                        params=[
                            p.strip().split(":")[0].strip()
                            for p in m.group(2).split(",")
                            if p.strip()
                        ],
                    )
                )
        elif language in ("javascript", "typescript", "jsx", "tsx"):
            pattern = re.compile(
                r"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\()|(\w+)\s*=\s*(?:async\s*)?function)",
                re.MULTILINE,
            )
            for m in pattern.finditer(code):
                name = m.group(1) or m.group(2) or m.group(3)
                if name:
                    funcs.append(
                        _FunctionInfo(
                            name=name,
                            line_start=code[: m.start()].count("\n") + 1,
                        )
                    )
        return funcs

    def _extract_classes(
        self, code: str, language: str
    ) -> list[_ClassInfo]:
        classes: list[_ClassInfo] = []
        if language == "python":
            pattern = re.compile(
                r"^class\s+(\w+)\s*(?:\(([^)]*)\))?:",
                re.MULTILINE,
            )
            for m in pattern.finditer(code):
                bases = [
                    b.strip()
                    for b in m.group(2).split(",")
                    if b.strip()
                ] if m.group(2) else []
                classes.append(
                    _ClassInfo(
                        name=m.group(1),
                        line_start=code[: m.start()].count("\n") + 1,
                        bases=bases,
                    )
                )
        elif language in ("javascript", "typescript"):
            pattern = re.compile(
                r"class\s+(\w+)(?:\s+extends\s+(\w+))?",
                re.MULTILINE,
            )
            for m in pattern.finditer(code):
                bases = [m.group(2)] if m.group(2) else []
                classes.append(
                    _ClassInfo(
                        name=m.group(1),
                        line_start=code[: m.start()].count("\n") + 1,
                        bases=bases,
                    )
                )
        return classes

    def _count_comments(
        self, code: str, language: str
    ) -> int:
        count = 0
        if language in ("python", "shell", "ruby"):
            count += len(re.findall(r"^\s*#.*$", code, re.MULTILINE))
        elif language in ("javascript", "java", "go", "rust", "cpp", "c"):
            count += len(re.findall(r"^\s*//.*$", code, re.MULTILINE))
            count += len(
                re.findall(r"/\*.*?\*/", code, re.DOTALL)
            )
        elif language == "sql":
            count += len(re.findall(r"^\s*--.*$", code, re.MULTILINE))
        return count

    def _generate_summary(self, result: FileParseResult) -> str:
        s = result.structure
        parts = [
            f"{result.language.upper()} file",
            f"({s.get('total_lines', 0)} lines, "
            f"{s.get('total_chars', 0)} chars)",
        ]
        if s.get("functions"):
            parts.append(f"{len(s['functions'])} functions")
        if s.get("classes"):
            parts.append(f"{len(s['classes'])} classes")
        if s.get("imports"):
            parts.append(f"{len(s['imports'])} imports")
        return ", ".join(parts)


# ============================================================
# CSV / Excel Parsers
# ============================================================

class CSVParser:
    """CSV 文件解析器。"""

    def parse(self, filepath: str) -> FileParseResult:
        """解析 CSV 文件并提取摘要和元数据。"""
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=FileCategory.DATA,
            mime_type="text/csv",
        )
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            result.file_size = len(content.encode("utf-8"))

            reader = csv.reader(io.StringIO(content))
            rows = list(reader)
            if rows:
                result.metadata["headers"] = rows[0]
                result.metadata["row_count"] = len(rows) - 1
                result.metadata["col_count"] = len(rows[0])
                result.metadata["sample_rows"] = rows[
                    1 : min(6, len(rows))
                ]

            result.text = content[:10000]
            result.summary = self._generate_summary(result)
        except Exception as e:
            result.error = f"CSV parse error: {e}"
        return result

    def _generate_summary(self, result: FileParseResult) -> str:
        meta = result.metadata
        headers = meta.get("headers", [])
        return (
            f"CSV: {meta.get('row_count', 0)} rows, "
            f"{meta.get('col_count', 0)} columns "
            f"({', '.join(str(h) for h in headers[:5])}"
            f"{'...' if len(headers) > 5 else ''})"
        )


class ExcelParser:
    """Excel 文件解析器 — 纯 Python 实现 (XLSX)。"""

    def parse(self, filepath: str) -> FileParseResult:
        """解析 .xlsx 文件并提取工作表信息和样本数据。"""
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=FileCategory.DATA,
            mime_type=(
                "application/"
                "vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
        )
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            result.file_size = len(data)

            with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
                names = zf.namelist()
                sheet_names = [
                    n.replace("xl/worksheets/", "").replace(".xml", "")
                    for n in names
                    if n.startswith("xl/worksheets/")
                ]
                result.metadata["sheets"] = sheet_names

                shared_strings = self._parse_shared_strings(
                    zf, "xl/sharedStrings.xml"
                )

                if sheet_names:
                    sheet_data = self._parse_sheet(
                        zf,
                        f"xl/worksheets/{sheet_names[0]}.xml",
                        shared_strings,
                    )
                    result.metadata.update(sheet_data)

            if result.metadata.get("sample_rows"):
                rows = result.metadata["sample_rows"]
                result.text = "\n".join(
                    " | ".join(str(c) for c in row) for row in rows
                )
            result.summary = self._generate_summary(result)
        except Exception as e:
            result.error = f"Excel parse error: {e}"
        return result

    def _parse_shared_strings(
        self, zf: zipfile.ZipFile, path: str
    ) -> list[str]:
        if path not in zf.namelist():
            return []
        try:
            root = ET.fromstring(zf.read(path).decode("utf-8"))
        except ET.ParseError:
            return []
        strings: list[str] = []
        ns = (
            "http://schemas.openxmlformats.org/"
            "spreadsheetml/2006/main"
        )
        for si in root.findall(f"{{{ns}}}si"):
            t = si.find(f"{{{ns}}}t")
            if t is not None and t.text:
                strings.append(t.text)
            else:
                strings.append("")
        return strings

    def _parse_sheet(
        self,
        zf: zipfile.ZipFile,
        path: str,
        shared_strings: list[str],
    ) -> dict[str, Any]:
        if path not in zf.namelist():
            return {}
        try:
            root = ET.fromstring(zf.read(path).decode("utf-8"))
        except ET.ParseError:
            return {}
        ns = (
            "http://schemas.openxmlformats.org/"
            "spreadsheetml/2006/main"
        )
        data: dict[str, Any] = {"sample_rows": [], "row_count": 0, "col_count": 0}
        rows = root.findall(f".//{{{ns}}}row")
        data["row_count"] = len(rows)
        max_col = 0
        samples: list[list[str]] = []
        for row in rows[:min(10, len(rows))]:
            cells: list[str] = []
            for cell in row.findall(f"{{{ns}}}c"):
                val = cell.find(f"{{{ns}}}v")
                if val is not None and val.text:
                    if cell.get("t") == "s":
                        idx = int(val.text)
                        cells.append(
                            shared_strings[idx]
                            if idx < len(shared_strings)
                            else ""
                        )
                    else:
                        cells.append(val.text)
            if cells:
                samples.append(cells)
                max_col = max(max_col, len(cells))
        data["sample_rows"] = samples
        data["col_count"] = max_col
        return data

    def _generate_summary(self, result: FileParseResult) -> str:
        meta = result.metadata
        sheets = meta.get("sheets", [])
        return (
            f"Excel: {len(sheets)} sheet(s) ({', '.join(sheets[:5])}"
            f"{'...' if len(sheets) > 5 else ''}), "
            f"{meta.get('row_count', 0)} rows x "
            f"{meta.get('col_count', 0)} cols"
        )


# ============================================================
# File Processor (Main Class)
# ============================================================

class FileProcessor:
    """统一文件处理引擎。

    自动检测文件类型并路由到对应的解析器。

    Usage:
        fp = FileProcessor()
        result = fp.process("document.pdf")
        print(result.summary)

        results = fp.process_batch(["a.pdf", "b.py", "c.csv"])
        print(f"Processed {results.success}/{results.total} files")
    """

    def __init__(
        self,
        max_workers: int = _DEFAULT_WORKERS,
        max_file_size: int = _MAX_FILE_SIZE,
    ) -> None:
        if max_workers > _MAX_WORKERS:
            raise ValueError(
                f"max_workers cannot exceed {_MAX_WORKERS}"
            )
        self.max_workers = max_workers
        self.max_file_size = max_file_size

        self._parsers: dict[FileCategory, type] = {
            FileCategory.DOCUMENT: PDFParser,
            FileCategory.CODE: CodeParser,
            FileCategory.IMAGE: ImageParser,
            FileCategory.DATA: CSVParser,
        }

    # ----- Public API -----

    def process(self, filepath: str) -> FileParseResult:
        """处理单个文件。

        Args:
            filepath: 文件路径。

        Returns:
            解析结果。
        """
        if not os.path.isfile(filepath):
            return FileParseResult(
                filepath=filepath,
                filename=os.path.basename(filepath),
                error=f"File not found: {filepath}",
            )

        file_size = os.path.getsize(filepath)
        if file_size > self.max_file_size:
            return FileParseResult(
                filepath=filepath,
                filename=os.path.basename(filepath),
                file_size=file_size,
                error=f"File too large: {file_size} > {self.max_file_size}",
            )

        mime_type = detect_mime_type(filepath)
        category = detect_file_category(mime_type, filepath)
        ext = os.path.splitext(filepath.lower())[1]

        if ext == ".docx":
            return DocxParser().parse(filepath)
        if ext in (".xlsx", ".xls"):
            return ExcelParser().parse(filepath)

        parser_cls = self._parsers.get(category)
        if parser_cls is None:
            return self._parse_generic(filepath, category, mime_type)

        return parser_cls().parse(filepath)

    def process_batch(
        self,
        filepaths: list[str],
        max_workers: Optional[int] = None,
    ) -> FileBatchResult:
        """批量处理多个文件（最多 50 并发）。

        Args:
            filepaths: 文件路径列表。
            max_workers: 并发数，默认使用实例配置。

        Returns:
            批量处理结果。
        """
        workers = max_workers or self.max_workers
        if workers > _MAX_WORKERS:
            workers = _MAX_WORKERS

        count = min(len(filepaths), _MAX_WORKERS)
        batch = FileBatchResult(total=count, success=0, failed=0)

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=min(workers, count)
        ) as executor:
            futures = {
                executor.submit(self.process, fp): fp
                for fp in filepaths[:count]
            }
            for future in concurrent.futures.as_completed(futures):
                try:
                    r = future.result()
                    batch.results.append(r)
                    if r.success:
                        batch.success += 1
                    else:
                        batch.failed += 1
                        if r.error:
                            batch.errors.append(
                                f"{r.filename}: {r.error}"
                            )
                except Exception as e:
                    fp = futures[future]
                    batch.failed += 1
                    batch.errors.append(f"{fp}: {e}")

        batch.combined_summary = self._build_combined_summary(batch)
        return batch

    def _parse_generic(
        self,
        filepath: str,
        category: FileCategory,
        mime_type: str,
    ) -> FileParseResult:
        result = FileParseResult(
            filepath=filepath,
            filename=os.path.basename(filepath),
            category=category,
            mime_type=mime_type,
        )
        try:
            result.file_size = os.path.getsize(filepath)
            if mime_type.startswith("text/"):
                with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                    result.text = f.read(50000)
                result.summary = (
                    f"Text file ({len(result.text)} chars): "
                    f"{result.text[:100]}"
                )
            else:
                result.summary = (
                    f"{category.name} file "
                    f"({PDFParser._format_size(result.file_size)})"
                )
        except Exception as e:
            result.error = str(e)
        return result

    def _build_combined_summary(
        self, batch: FileBatchResult
    ) -> str:
        lines = [
            f"Batch Process Summary: "
            f"{batch.success}/{batch.total} succeeded",
        ]
        cat_counts = Counter(
            r.category.name for r in batch.results
        )
        lines.append(
            "Categories: "
            + ", ".join(
                f"{cat}={cnt}" for cat, cnt in cat_counts.items()
            )
        )
        total_size = sum(
            r.file_size for r in batch.results
        )
        lines.append(
            f"Total size: {PDFParser._format_size(total_size)}"
        )
        if batch.errors:
            lines.append(
                f"Errors ({len(batch.errors)}): "
                + "; ".join(batch.errors[:5])
            )
        return "\n".join(lines)
