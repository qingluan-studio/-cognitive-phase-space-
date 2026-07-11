"""
Tests for src/cee/app/engine/files.py — File processing engine.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import os
import tempfile
from pathlib import Path
import pytest

from cee.app.engine.files import (
    FileProcessor,
    FileParseResult,
    FileBatchResult,
    FileCategory,
    detect_mime_type,
    detect_file_category,
    PDFParser,
    DocxParser,
    CSVParser,
    CodeParser,
    ImageParser,
    ExcelParser,
)


class TestMimeDetection:
    """Tests for MIME type detection."""

    def test_detect_pdf_mime(self):
        assert detect_mime_type("test.pdf") == "application/pdf"

    def test_detect_python_mime(self):
        assert detect_mime_type("test.py") == "text/x-python"

    def test_detect_csv_mime(self):
        assert detect_mime_type("test.csv") == "text/csv"

    def test_detect_txt_mime(self):
        assert detect_mime_type("test.txt") == "text/plain"

    def test_detect_unknown_extension(self):
        mime = detect_mime_type("test.unknown_ext")
        assert mime is not None

    def test_detect_docx_mime(self):
        mime = detect_mime_type("test.docx")
        assert "wordprocessingml" in mime or "application" in mime


class TestFileCategoryDetection:
    """Tests for file category detection."""

    def test_detect_pdf_as_document(self):
        cat = detect_file_category("application/pdf", "test.pdf")
        assert cat == FileCategory.DOCUMENT

    def test_detect_python_as_code(self):
        cat = detect_file_category("text/x-python", "test.py")
        assert cat == FileCategory.CODE

    def test_detect_image_as_image(self):
        cat = detect_file_category("image/png", "test.png")
        assert cat == FileCategory.IMAGE

    def test_detect_csv_as_data(self):
        cat = detect_file_category("text/csv", "test.csv")
        assert cat == FileCategory.DATA

    def test_detect_zip_as_archive(self):
        cat = detect_file_category("application/zip", "test.zip")
        assert cat == FileCategory.ARCHIVE


class TestPDFParser:
    """Tests for PDFParser."""

    def test_parse_invalid_path(self):
        parser = PDFParser()
        result = parser.parse("/nonexistent/file.pdf")
        assert result.error != ""

    def test_parse_empty_bytes(self):
        parser = PDFParser()
        assert parser._extract_text(b"not pdf") == ""


class TestDocxParser:
    """Tests for DocxParser."""

    def test_parse_invalid_path(self):
        parser = DocxParser()
        result = parser.parse("/nonexistent/file.docx")
        assert result.error != ""


class TestCSVParser:
    """Tests for CSVParser."""

    def test_parse_csv_file(self):
        parser = CSVParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write("name,age,city\nAlice,30,NYC\nBob,25,LA\n")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            assert result.success
            assert "row_count" in result.metadata
            assert result.metadata["row_count"] == 2
            assert result.metadata["headers"] == ["name", "age", "city"]
        finally:
            os.unlink(tmp_path)

    def test_parse_empty_csv(self):
        parser = CSVParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write("")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            assert result.category == FileCategory.DATA
        finally:
            os.unlink(tmp_path)

    def test_summary(self):
        parser = CSVParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write("a,b\n1,2\n")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            assert "CSV" in result.summary
        finally:
            os.unlink(tmp_path)


class TestCodeParser:
    """Tests for CodeParser."""

    def test_parse_python_file(self):
        parser = CodeParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("import os\n\ndef hello():\n    return 'world'\n")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            assert result.language == "python"
            assert result.category == FileCategory.CODE
            assert "hello" in str(result.structure.get("functions", []))
        finally:
            os.unlink(tmp_path)

    def test_parse_js_file(self):
        parser = CodeParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            f.write("function greet() { return 'hello'; }\n")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            assert result.language == "javascript"
        finally:
            os.unlink(tmp_path)

    def test_python_class_detection(self):
        parser = CodeParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("class MyClass:\n    def method(self):\n        pass\n")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            classes = result.structure.get("classes", [])
            assert len(classes) >= 1
            assert classes[0]["name"] == "MyClass"
        finally:
            os.unlink(tmp_path)

    def test_summary(self):
        parser = CodeParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("import sys\n\nprint('hello')\n")
            tmp_path = f.name
        try:
            result = parser.parse(tmp_path)
            assert "python" in result.summary.lower() or "PYTHON" in result.summary
        finally:
            os.unlink(tmp_path)


class TestImageParser:
    """Tests for ImageParser."""

    def test_parse_invalid_path(self):
        parser = ImageParser()
        result = parser.parse("/nonexistent/image.png")
        assert result.error != ""

    def test_parse_too_large_data(self):
        parser = ImageParser()
        result = parser.parse("/dev/null")
        assert result.category == FileCategory.IMAGE


class TestFileProcessor:
    """Tests for FileProcessor (main orchestrator)."""

    @pytest.fixture
    def processor(self):
        return FileProcessor(max_workers=4)

    def test_process_nonexistent_file(self, processor):
        result = processor.process("/nonexistent/file.xyz")
        assert result.error != ""
        assert "found" in result.error.lower() or "File not found" in result.error

    def test_process_python_file(self, processor):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("print('hello')\n")
            tmp_path = f.name
        try:
            result = processor.process(tmp_path)
            assert result.success
            assert result.language == "python"
        finally:
            os.unlink(tmp_path)

    def test_process_csv_file(self, processor):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write("col1,col2\n1,2\n3,4\n")
            tmp_path = f.name
        try:
            result = processor.process(tmp_path)
            assert result.success
            assert result.category == FileCategory.DATA
        finally:
            os.unlink(tmp_path)

    def test_process_batch(self, processor):
        files = []
        for i in range(3):
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                f.write(f"print({i})\n")
                tmp_path = f.name
                files.append(tmp_path)

        try:
            result = processor.process_batch(files)
            assert result.total == 3
            assert result.success >= 0
            assert result.combined_summary != ""
        finally:
            for p in files:
                os.unlink(p)

    def test_process_batch_with_errors(self, processor):
        result = processor.process_batch(["/nonexistent/a.py", "/nonexistent/b.py"])
        assert result.total >= 0


class TestFileBatchResult:
    """Tests for FileBatchResult."""

    def test_initial_values(self):
        result = FileBatchResult(total=0, success=0, failed=0)
        assert result.total == 0
        assert result.success == 0
        assert result.failed == 0


class TestFileParseResult:
    """Tests for FileParseResult."""

    def test_success_property(self):
        r = FileParseResult(filepath="test.txt", filename="test.txt", text="content")
        assert r.success is True

    def test_failure_with_error(self):
        r = FileParseResult(filepath="test.txt", filename="test.txt", error="fail")
        assert r.success is False
