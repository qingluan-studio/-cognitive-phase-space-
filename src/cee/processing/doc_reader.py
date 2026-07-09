"""CEE Processing — Document reading and output formatting engines."""

from __future__ import annotations

import csv
import io
import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DocumentFormat(Enum):
    PLAIN_TEXT = "plain_text"
    MARKDOWN = "markdown"
    HTML = "html"
    JSON = "json"
    CSV = "csv"
    YAML = "yaml"
    XML = "xml"


class OutputFormat(Enum):
    PLAIN = "plain"
    MARKDOWN = "markdown"
    JSON = "json"
    JSON_SCHEMA = "json_schema"
    TABLE = "table"
    CSV = "csv"
    YAML = "yaml"
    SUMMARY = "summary"
    BULLET_LIST = "bullet_list"
    NUMBERED_LIST = "numbered_list"


@dataclass
class Document:
    title: str = ""
    content: str = ""
    format: DocumentFormat = DocumentFormat.PLAIN_TEXT
    metadata: dict[str, Any] = field(default_factory=dict)
    sections: list["Document"] = field(default_factory=list)
    tables: list[list[list[str]]] = field(default_factory=list)

    @property
    def word_count(self) -> int:
        return len(self.content.split())

    @property
    def char_count(self) -> int:
        return len(self.content)

    @property
    def reading_time_minutes(self) -> float:
        return self.word_count / 250


class DocReader:
    """Reads and parses documents from various formats into a unified Document."""

    def read(self, content: str, fmt: DocumentFormat) -> Document:
        parsers = {
            DocumentFormat.PLAIN_TEXT: self._read_plain,
            DocumentFormat.MARKDOWN: self._read_markdown,
            DocumentFormat.HTML: self._read_html,
            DocumentFormat.JSON: self._read_json,
            DocumentFormat.CSV: self._read_csv,
            DocumentFormat.XML: self._read_xml,
        }
        parser = parsers.get(fmt, self._read_plain)
        return parser(content)

    def read_auto(self, content: str) -> Document:
        if content.strip().startswith("<"):
            return self._read_html(content)
        if content.strip().startswith("{") or content.strip().startswith("["):
            return self._read_json(content)
        if content.strip().startswith("#") or "##" in content[:500]:
            return self._read_markdown(content)
        return self._read_plain(content)

    def _read_plain(self, content: str) -> Document:
        doc = Document(content=content, format=DocumentFormat.PLAIN_TEXT)
        paragraphs = content.strip().split("\n\n")
        first_line = content.strip().split("\n")[0]
        doc.title = first_line[:100] if len(first_line) < 100 else first_line[:97] + "..."
        doc.metadata["paragraph_count"] = len(paragraphs)
        doc.metadata["line_count"] = len(content.split("\n"))
        return doc

    def _read_markdown(self, content: str) -> Document:
        doc = Document(content=content, format=DocumentFormat.MARKDOWN)
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if title_match:
            doc.title = title_match.group(1).strip()
        headings = re.findall(r'^(#{1,6})\s+(.+)$', content, re.MULTILINE)
        sections: list[Document] = []
        current_content: list[str] = []
        current_title = ""
        for line in content.split("\n"):
            heading_match = re.match(r'^(#{1,6})\s+(.+)', line)
            if heading_match and current_content:
                sections.append(Document(
                    title=current_title,
                    content="\n".join(current_content).strip(),
                    format=DocumentFormat.MARKDOWN,
                ))
                current_content = []
                current_title = heading_match.group(2)
            elif heading_match:
                current_title = heading_match.group(2)
            else:
                current_content.append(line)
        if current_content:
            sections.append(Document(
                title=current_title,
                content="\n".join(current_content).strip(),
                format=DocumentFormat.MARKDOWN,
            ))
        doc.sections = sections
        doc.metadata["heading_count"] = len(headings)
        doc.metadata["section_count"] = len(sections)
        code_blocks = re.findall(r'```[\s\S]*?```', content)
        doc.metadata["code_block_count"] = len(code_blocks)
        tables = self._extract_markdown_tables(content)
        doc.tables = tables
        return doc

    def _read_html(self, content: str) -> Document:
        title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
        text = re.sub(r'<head>.*?</head>', '', content, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return Document(
            title=title_match.group(1).strip() if title_match else "HTML Document",
            content=text,
            format=DocumentFormat.HTML,
        )

    def _read_json(self, content: str) -> Document:
        data = json.loads(content)
        if isinstance(data, dict):
            title = data.get("title", data.get("name", "JSON Document"))
            if "content" in data:
                return Document(
                    title=title,
                    content=str(data["content"]),
                    format=DocumentFormat.JSON,
                    metadata={k: v for k, v in data.items() if k not in ("title", "content", "name")},
                )
            return Document(
                title=title,
                content=json.dumps(data, indent=2, ensure_ascii=False),
                format=DocumentFormat.JSON,
                metadata=data,
            )
        return Document(
            title="JSON Array",
            content=json.dumps(data, indent=2, ensure_ascii=False),
            format=DocumentFormat.JSON,
            metadata={"item_count": len(data)},
        )

    def _read_csv(self, content: str) -> Document:
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        title = f"CSV ({len(rows)} rows)"
        return Document(
            title=title,
            content=content,
            format=DocumentFormat.CSV,
            metadata={"row_count": len(rows), "column_count": len(rows[0]) if rows else 0},
            tables=[rows] if rows else [],
        )

    def _read_xml(self, content: str) -> Document:
        title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', content)
        text = re.sub(r'\s+', ' ', text).strip()
        return Document(
            title=title_match.group(1) if title_match else "XML Document",
            content=text,
            format=DocumentFormat.XML,
        )

    def _extract_markdown_tables(self, content: str) -> list[list[list[str]]]:
        tables: list[list[list[str]]] = []
        pattern = r'\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)'
        for match in re.finditer(pattern, content):
            header = [c.strip() for c in match.group(1).split("|")]
            rows = [[c.strip() for c in row.split("|")] for row in match.group(2).strip().split("\n")]
            tables.append([header] + rows)
        return tables


class OutputFormatter:
    """Formats structured data into various output formats for consumption."""

    def format(self, data: Any, fmt: OutputFormat = OutputFormat.PLAIN,
               **options: Any) -> str:
        formatters = {
            OutputFormat.PLAIN: self._format_plain,
            OutputFormat.MARKDOWN: self._format_markdown,
            OutputFormat.JSON: self._format_json,
            OutputFormat.JSON_SCHEMA: self._format_json_schema,
            OutputFormat.TABLE: self._format_table,
            OutputFormat.CSV: self._format_csv,
            OutputFormat.SUMMARY: self._format_summary,
            OutputFormat.BULLET_LIST: self._format_bullet_list,
            OutputFormat.NUMBERED_LIST: self._format_numbered_list,
        }
        formatter = formatters.get(fmt, self._format_plain)
        return formatter(data, **options)

    def _format_plain(self, data: Any, **_: Any) -> str:
        if isinstance(data, str):
            return data
        if isinstance(data, dict):
            return "\n".join(f"{k}: {v}" for k, v in data.items())
        if isinstance(data, (list, tuple)):
            return "\n".join(f"- {item}" for item in data)
        return str(data)

    def _format_markdown(self, data: Any, title: str = "", **_: Any) -> str:
        lines: list[str] = []
        if title:
            lines.append(f"# {title}\n")
        if isinstance(data, str):
            lines.append(data)
        elif isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    lines.append(f"## {k}\n")
                    lines.append(self._format_markdown(v))
                else:
                    lines.append(f"- **{k}**: {v}")
        elif isinstance(data, (list, tuple)):
            for item in data:
                if isinstance(item, dict):
                    for k, v in item.items():
                        lines.append(f"- **{k}**: {v}")
                    lines.append("")
                else:
                    lines.append(f"- {item}")
        return "\n".join(lines)

    def _format_json(self, data: Any, pretty: bool = True, **_: Any) -> str:
        return json.dumps(data, indent=2 if pretty else None, ensure_ascii=False, default=str)

    def _format_json_schema(self, data: Any, **_: Any) -> str:
        schema = self._infer_schema(data)
        return json.dumps(schema, indent=2, ensure_ascii=False)

    def _infer_schema(self, data: Any) -> dict[str, Any]:
        if data is None:
            return {"type": "null"}
        if isinstance(data, bool):
            return {"type": "boolean"}
        if isinstance(data, int):
            return {"type": "integer"}
        if isinstance(data, float):
            return {"type": "number"}
        if isinstance(data, str):
            return {"type": "string"}
        if isinstance(data, list):
            item_schemas = [self._infer_schema(item) for item in data[:5]]
            return {"type": "array", "items": item_schemas[0] if item_schemas else {}}
        if isinstance(data, dict):
            return {
                "type": "object",
                "properties": {k: self._infer_schema(v) for k, v in data.items()},
            }
        return {"type": "string"}

    def _format_table(self, data: list[dict] | list[list], headers: list[str] | None = None,
                      **_: Any) -> str:
        if not data:
            return "(empty table)"
        if isinstance(data[0], dict):
            headers = headers or list(data[0].keys())
            rows = [[str(row.get(h, "")) for h in headers] for row in data]
        else:
            rows = [[str(c) for c in row] for row in data]
            headers = headers or [f"Col{i}" for i in range(len(rows[0]))]
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                if i < len(col_widths):
                    col_widths[i] = max(col_widths[i], len(cell))
        lines: list[str] = []
        header_line = "| " + " | ".join(h.ljust(w) for h, w in zip(headers, col_widths)) + " |"
        separator = "|" + "|".join("-" * (w + 2) for w in col_widths) + "|"
        lines.extend([header_line, separator])
        for row in rows:
            line = "| " + " | ".join(
                c.ljust(col_widths[i]) if i < len(col_widths) else c
                for i, c in enumerate(row)
            ) + " |"
            lines.append(line)
        return "\n".join(lines)

    def _format_csv(self, data: list[dict] | list[list], **_: Any) -> str:
        output = io.StringIO()
        if not data:
            return ""
        if isinstance(data[0], dict):
            headers = list(data[0].keys())
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            writer.writerows(data)
        else:
            writer = csv.writer(output)
            writer.writerows(data)
        return output.getvalue()

    def _format_summary(self, data: Any, max_length: int = 500, **_: Any) -> str:
        text = self._format_plain(data)
        if len(text) <= max_length:
            return text
        sentences = re.split(r'(?<=[.!?])\s+', text)
        summary: list[str] = []
        total = 0
        for sent in sentences:
            if total + len(sent) > max_length:
                break
            summary.append(sent)
            total += len(sent)
        return " ".join(summary) + "..."

    def _format_bullet_list(self, data: Any, **_: Any) -> str:
        items = data if isinstance(data, (list, tuple)) else [data]
        return "\n".join(f"- {item}" for item in items)

    def _format_numbered_list(self, data: Any, **_: Any) -> str:
        items = data if isinstance(data, (list, tuple)) else [data]
        return "\n".join(f"{i + 1}. {item}" for i, item in enumerate(items))
