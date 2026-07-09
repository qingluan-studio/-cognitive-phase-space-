import json
import os
import re
import textwrap
import threading
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class ResponseStyle(Enum):
    CONCISE = "concise"
    DETAILED = "detailed"
    CREATIVE = "creative"
    TECHNICAL = "technical"
    CONVERSATIONAL = "conversational"
    EDUCATIONAL = "educational"
    AUTO = "auto"


@dataclass
class OutputConfig:
    style: ResponseStyle = ResponseStyle.AUTO
    max_length: int = 8192
    include_timestamp: bool = False
    include_source: bool = False
    include_metadata: bool = False
    code_fence_language: str = "python"
    enable_markdown: bool = True
    template: Optional[str] = None


class FlexibleFormatter:
    STYLE_PATTERNS: dict[ResponseStyle, dict] = {
        ResponseStyle.CONCISE: {"max_lines": 5, "bullet_style": "compact", "intro": False},
        ResponseStyle.DETAILED: {"max_lines": 50, "bullet_style": "expanded", "intro": True},
        ResponseStyle.CREATIVE: {"max_lines": 30, "bullet_style": "narrative", "intro": True},
        ResponseStyle.TECHNICAL: {"max_lines": 40, "bullet_style": "hierarchical", "intro": False},
        ResponseStyle.CONVERSATIONAL: {"max_lines": 20, "bullet_style": "smooth", "intro": True},
        ResponseStyle.EDUCATIONAL: {"max_lines": 30, "bullet_style": "stepwise", "intro": True},
    }

    def __init__(self, config: Optional[OutputConfig] = None):
        self._config = config or OutputConfig()

    @property
    def config(self) -> OutputConfig:
        return self._config

    def format(self, content: str, style: Optional[ResponseStyle] = None,
               context: Optional[dict] = None) -> str:
        actual_style = style or self._config.style
        if actual_style == ResponseStyle.AUTO:
            actual_style = self._infer_style(content)
        pattern = self.STYLE_PATTERNS.get(actual_style, {})
        result_parts: list[str] = []

        if self._config.include_timestamp:
            result_parts.append(f"--- {datetime.now().isoformat()} ---")

        if pattern.get("intro", False):
            result_parts.append(self._generate_intro(content, actual_style))

        result_parts.append(content)

        if self._config.include_metadata and context:
            result_parts.append(f"\n```metadata\n{json.dumps(context, ensure_ascii=False, indent=2)}\n```")

        result = "\n\n".join(result_parts)
        if len(result) > self._config.max_length:
            result = result[:self._config.max_length] + "\n... [truncated]"

        return result

    @staticmethod
    def _infer_style(content: str) -> ResponseStyle:
        if re.search(r'```\w+', content):
            return ResponseStyle.TECHNICAL
        if len(content) < 200:
            return ResponseStyle.CONCISE
        if any(w in content.lower() for w in ["imagine", "create", "story", "design"]):
            return ResponseStyle.CREATIVE
        if any(w in content.lower() for w in ["explain", "learn", "concept", "understand"]):
            return ResponseStyle.EDUCATIONAL
        return ResponseStyle.CONVERSATIONAL

    @staticmethod
    def _generate_intro(content: str, style: ResponseStyle) -> str:
        intros = {
            ResponseStyle.DETAILED: "以下是详细分析:",
            ResponseStyle.CREATIVE: "让我从独特的角度为你呈现:",
            ResponseStyle.CONVERSATIONAL: "关于你的问题，我的看法是:",
            ResponseStyle.EDUCATIONAL: "让我们一步步来理解:",
        }
        return intros.get(style, "")

    def format_list(self, items: list[str], numbered: bool = False) -> str:
        if not items:
            return ""
        if numbered:
            return "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))
        return "\n".join(f"- {item}" for item in items)

    def format_table(self, headers: list[str], rows: list[list[str]]) -> str:
        if not headers or not rows:
            return ""
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                col_widths[i] = max(col_widths[i], len(str(cell)))
        lines: list[str] = []
        lines.append("| " + " | ".join(h.ljust(w) for h, w in zip(headers, col_widths)) + " |")
        lines.append("|" + "|".join("-" * (w + 2) for w in col_widths) + "|")
        for row in rows:
            lines.append("| " + " | ".join(str(c).ljust(w) for c, w in zip(row, col_widths)) + " |")
        return "\n".join(lines)


class FileSaver:
    def __init__(self, base_dir: str = ""):
        self._base_dir = base_dir or os.getcwd()
        self._saved_files: list[str] = []
        self._lock = threading.RLock()

    def save_text(self, filename: str, content: str, encoding: str = "utf-8") -> str:
        path = os.path.join(self._base_dir, filename)
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w", encoding=encoding) as f:
            f.write(content)
        with self._lock:
            self._saved_files.append(path)
        return path

    def save_json(self, filename: str, data: Any) -> str:
        path = os.path.join(self._base_dir, filename)
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        with self._lock:
            self._saved_files.append(path)
        return path

    def save_csv(self, filename: str, rows: list[list[str]],
                 headers: Optional[list[str]] = None) -> str:
        import csv
        path = os.path.join(self._base_dir, filename)
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if headers:
                writer.writerow(headers)
            writer.writerows(rows)
        with self._lock:
            self._saved_files.append(path)
        return path

    def list_saved(self) -> list[str]:
        with self._lock:
            return list(self._saved_files)

    @property
    def last_saved(self) -> Optional[str]:
        with self._lock:
            return self._saved_files[-1] if self._saved_files else None

    def stats(self) -> dict:
        with self._lock:
            return {
                "base_dir": self._base_dir,
                "saved_count": len(self._saved_files),
                "last_saved": self.last_saved,
            }

    def reset(self) -> None:
        with self._lock:
            self._saved_files.clear()


class CopyableFormatter:
    @staticmethod
    def as_plain_text(content: str) -> str:
        content = re.sub(r'```\w*\n?', '', content)
        content = re.sub(r'`([^`]+)`', r'\1', content)
        content = re.sub(r'\*\*([^*]+)\*\*', r'\1', content)
        content = re.sub(r'\*([^*]+)\*', r'\1', content)
        content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
        content = re.sub(r'^#{1,6}\s+', '', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*[-*+]\s+', '  ', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*\d+\.\s+', '  ', content, flags=re.MULTILINE)
        content = re.sub(r'\n{3,}', '\n\n', content)
        return content.strip()

    @staticmethod
    def as_code_block(content: str, language: str = "") -> str:
        lang = language or ""
        return f"```{lang}\n{content}\n```"

    @staticmethod
    def as_quote(content: str) -> str:
        return "\n".join(f"> {line}" for line in content.split("\n"))

    @staticmethod
    def wrap_text(content: str, width: int = 80) -> str:
        return "\n".join(
            textwrap.fill(paragraph, width=width)
            for paragraph in content.split("\n")
        )


class AdaptiveResponder:
    def __init__(self, config: Optional[OutputConfig] = None):
        self._config = config or OutputConfig()
        self._formatter = FlexibleFormatter(self._config)
        self._saver = FileSaver()
        self._copier = CopyableFormatter()
        self._history: list[dict] = []
        self._lock = threading.RLock()

    def respond(self, content: str, style: Optional[ResponseStyle] = None,
                context: Optional[dict] = None,
                save_to: Optional[str] = None) -> dict:
        actual_style = self._adapt_style(content, style)
        formatted = self._formatter.format(content, actual_style, context)
        plain = self._copier.as_plain_text(formatted)
        result: dict = {
            "formatted": formatted,
            "plain_text": plain,
            "copyable": True,
            "style": actual_style.value,
            "length": len(formatted),
        }
        if save_to:
            saved_path = self._saver.save_text(save_to, formatted)
            result["saved_to"] = saved_path

        with self._lock:
            self._history.append(
                {"content": content[:100], "style": actual_style.value, "at": datetime.now().isoformat()}
            )
            if len(self._history) > 100:
                self._history = self._history[-100:]

        return result

    def _adapt_style(self, content: str,
                     style: Optional[ResponseStyle] = None) -> ResponseStyle:
        if style:
            return style
        with self._lock:
            recent_styles = [h.get("style", "") for h in self._history[-5:]]
        if recent_styles and len(set(recent_styles[-3:])) == 1:
            return ResponseStyle(recent_styles[-1])
        if len(content) < 100:
            return ResponseStyle.CONCISE
        if any(kw in content.lower() for kw in ["code", "function", "api", "config"]):
            return ResponseStyle.TECHNICAL
        return ResponseStyle.CONVERSATIONAL

    @property
    def formatter(self) -> FlexibleFormatter:
        return self._formatter

    @property
    def saver(self) -> FileSaver:
        return self._saver

    @property
    def copier(self) -> CopyableFormatter:
        return self._copier

    @property
    def history(self) -> list[dict]:
        with self._lock:
            return list(self._history)

    def stats(self) -> dict:
        with self._lock:
            return {
                "total_responses": len(self._history),
                "styles_used": list(set(h.get("style", "") for h in self._history)),
                "saver": self._saver.stats(),
                "config": {
                    "max_length": self._config.max_length,
                    "enable_markdown": self._config.enable_markdown,
                },
            }

    def reset(self) -> None:
        with self._lock:
            self._history.clear()
            self._saver.reset()
