"""
沙箱代码解释器 - 模拟 Kimi 的代码执行和编程辅助。

提供安全的代码执行环境，支持 Python/JavaScript 代码运行，
包含代码审查、错误诊断、代码生成等编程辅助功能。
"""

import ast
import hashlib
import json
import re
import subprocess
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Callable, Optional

import numpy as np


class ExecutionStatus(Enum):
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    FORBIDDEN = "forbidden"
    MEMORY_EXCEEDED = "memory_exceeded"
    OUTPUT_EXCEEDED = "output_exceeded"


@dataclass
class ExecutionResult:
    status: ExecutionStatus
    output: str = ""
    error: str = ""
    stdout: str = ""
    stderr: str = ""
    execution_time: float = 0.0
    line_count: int = 0
    memory_usage: int = 0
    cell_index: int = 0


@dataclass
class CodeReviewResult:
    issues: list[dict] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    style_score: float = 0.0
    complexity: int = 0
    security_issues: list[str] = field(default_factory=list)
    best_practices: list[str] = field(default_factory=list)


@dataclass
class ErrorDiagnosis:
    error_type: str = ""
    explanation: str = ""
    root_cause: str = ""
    fix_suggestions: list[str] = field(default_factory=list)
    code_example: str = ""
    severity: str = "medium"
    related_docs: list[str] = field(default_factory=list)


@dataclass
class GeneratedCode:
    language: str = "python"
    code: str = ""
    description: str = ""
    imports_needed: list[str] = field(default_factory=list)
    complexity: str = "simple"
    test_hints: list[str] = field(default_factory=list)


class CodeInterpreter:
    """沙箱代码解释器，提供安全的代码执行和编程辅助。"""

    FORBIDDEN_IMPORTS = {
        "os", "sys", "subprocess", "shutil", "importlib",
        "__builtins__", "builtins", "eval", "exec", "compile",
        "open", "globals", "locals", "vars",
        "ctypes", "socket", "requests", "urllib",
        "multiprocessing", "threading",
        "signal", "pty", "fcntl", "tty",
        "pickle", "marshal", "shelve",
        "tempfile", "io", "pathlib",
    }

    FORBIDDEN_MODULES = {
        "os", "sys", "subprocess", "shutil", "importlib",
        "ctypes", "socket", "http", "urllib", "requests",
        "multiprocessing", "threading", "concurrent.futures",
        "signal", "pty", "fcntl", "tty", "termios",
        "pickle", "marshal", "shelve",
        "pathlib", "glob", "fnmatch",
    }

    FORBIDDEN_FUNCTIONS = {
        "eval", "exec", "compile", "open", "__import__",
        "globals", "locals", "vars", "getattr",
        "setattr", "delattr", "breakpoint", "input",
    }

    SAFE_IMPORTS = {
        "math", "cmath", "decimal", "fractions", "statistics",
        "random", "itertools", "functools", "operator",
        "collections", "heapq", "bisect",
        "datetime", "calendar", "time",
        "json", "csv", "base64", "hashlib", "hmac",
        "re", "string", "textwrap", "unicodedata",
        "typing", "enum", "dataclasses",
        "copy", "pprint",
        "numpy",
    }

    _js_runtime_installed: bool | None = None

    def __init__(
        self,
        timeout: int = 30,
        max_output_lines: int = 500,
        max_memory_mb: int = 256,
        allow_safe_imports: bool = True,
    ):
        self.timeout = timeout
        self.max_output_lines = max_output_lines
        self.max_memory_mb = max_memory_mb
        self.allow_safe_imports = allow_safe_imports
        self._cell_outputs: dict[int, str] = {}
        self._variables: dict[str, Any] = {}
        self._cell_counter: int = 0

    def execute_python(self, code: str, cell_index: int | None = None) -> ExecutionResult:
        start_time = time.time()
        if cell_index is None:
            self._cell_counter += 1
            cell_index = self._cell_counter
        else:
            self._cell_counter = max(self._cell_counter, cell_index)

        safety_check = self._security_check(code, "python")
        if safety_check:
            return ExecutionResult(
                status=ExecutionStatus.FORBIDDEN,
                error=safety_check,
                execution_time=time.time() - start_time,
                cell_index=cell_index,
            )

        wrapped_code = self._wrap_python_code(code)

        try:
            proc = subprocess.run(
                ["python3", "-c", wrapped_code],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                env={"PYTHONPATH": "", "HOME": "/tmp"},
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                status=ExecutionStatus.TIMEOUT,
                error="代码执行超时 ({} 秒)".format(self.timeout),
                execution_time=time.time() - start_time,
                cell_index=cell_index,
            )

        elapsed = time.time() - start_time
        stdout = proc.stdout[: self.max_output_lines * 200]
        stderr = proc.stderr[: self.max_output_lines * 200]

        if proc.returncode != 0:
            trimmed = stderr.strip() if stderr.strip() else "执行失败，退出码: {}".format(proc.returncode)
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error=trimmed,
                stderr=stderr,
                stdout=stdout,
                execution_time=elapsed,
                cell_index=cell_index,
            )

        output_lines = stdout.split("\n")
        line_count = len(output_lines)

        if line_count > self.max_output_lines:
            stdout = "\n".join(output_lines[: self.max_output_lines])
            stdout += "\n... (输出被截断，共 {} 行)".format(line_count)
            status = ExecutionStatus.OUTPUT_EXCEEDED
        else:
            status = ExecutionStatus.SUCCESS

        result = ExecutionResult(
            status=status,
            output=stdout.strip(),
            stdout=stdout,
            execution_time=elapsed,
            line_count=line_count,
            cell_index=cell_index,
        )
        self._cell_outputs[cell_index] = stdout
        return result

    def execute_javascript(self, code: str, cell_index: int | None = None) -> ExecutionResult:
        start_time = time.time()
        if cell_index is None:
            self._cell_counter += 1
            cell_index = self._cell_counter
        else:
            self._cell_counter = max(self._cell_counter, cell_index)

        safety_check = self._security_check(code, "javascript")
        if safety_check:
            return ExecutionResult(
                status=ExecutionStatus.FORBIDDEN,
                error=safety_check,
                execution_time=time.time() - start_time,
                cell_index=cell_index,
            )

        try:
            proc = subprocess.run(
                ["node", "-e", code],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                env={"HOME": "/tmp"},
            )
        except FileNotFoundError:
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error="Node.js 运行时未安装，无法执行 JavaScript 代码",
                execution_time=time.time() - start_time,
                cell_index=cell_index,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                status=ExecutionStatus.TIMEOUT,
                error="代码执行超时 ({} 秒)".format(self.timeout),
                execution_time=time.time() - start_time,
                cell_index=cell_index,
            )

        elapsed = time.time() - start_time
        stdout = proc.stdout[: self.max_output_lines * 200]
        stderr = proc.stderr[: self.max_output_lines * 200]

        if proc.returncode != 0:
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error=stderr.strip() or "执行失败",
                stderr=stderr,
                stdout=stdout,
                execution_time=elapsed,
                cell_index=cell_index,
            )

        status = ExecutionStatus.SUCCESS
        line_count = len(stdout.split("\n"))
        if line_count > self.max_output_lines:
            status = ExecutionStatus.OUTPUT_EXCEEDED
            stdout = "\n".join(stdout.split("\n")[: self.max_output_lines])
            stdout += "\n... (输出被截断)"

        result = ExecutionResult(
            status=status,
            output=stdout.strip(),
            stdout=stdout,
            execution_time=elapsed,
            line_count=line_count,
            cell_index=cell_index,
        )
        self._cell_outputs[cell_index] = stdout
        return result

    def execute(self, code: str, language: str = "python",
                cell_index: int | None = None) -> ExecutionResult:
        if language == "python":
            return self.execute_python(code, cell_index)
        elif language == "javascript":
            return self.execute_javascript(code, cell_index)
        else:
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error="不支持的语言: {}".format(language),
                cell_index=cell_index or 0,
            )

    def _security_check(self, code: str, language: str) -> str:
        if language == "python":
            return self._check_python_security(code)
        elif language == "javascript":
            return self._check_javascript_security(code)
        return ""

    def _check_python_security(self, code: str) -> str:
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return ""

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                issues = self._check_forbidden_call(node)
                if issues:
                    return issues

            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in self.FORBIDDEN_MODULES:
                        return "禁止导入模块: {}".format(alias.name)
                    if not self.allow_safe_imports:
                        continue
                    if alias.name not in self.SAFE_IMPORTS:
                        return "不允许导入非安全模块: {}".format(alias.name)

            if isinstance(node, ast.ImportFrom):
                base = node.module or ""
                if base in self.FORBIDDEN_MODULES:
                    return "禁止从模块导入: {}".format(base)
                if self.allow_safe_imports and base not in self.SAFE_IMPORTS:
                    return "不允许从非安全模块导入: {}".format(base)

            if isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Name) and node.value.id == "os":
                    return "禁止使用 os 模块"
                if isinstance(node.value, ast.Name) and node.value.id == "sys":
                    return "禁止使用 sys 模块"

        return ""

    def _check_forbidden_call(self, node: ast.Call) -> str:
        if isinstance(node.func, ast.Name):
            if node.func.id in self.FORBIDDEN_FUNCTIONS:
                return "禁止调用函数: {}()".format(node.func.id)
        if isinstance(node.func, ast.Attribute):
            if node.func.attr in self.FORBIDDEN_FUNCTIONS:
                return "禁止调用函数: {}()".format(node.func.attr)
        return ""

    def _check_javascript_security(self, code: str) -> str:
        dangerous = ["require(", "process.", "child_process", "fs.",
                      "eval(", "Function(", "setTimeout(",
                      "setInterval(", "import(", "fetch("]
        for keyword in dangerous:
            if keyword in code:
                return "检测到潜在危险操作: {}".format(keyword)
        return ""

    def _wrap_python_code(self, code: str) -> str:
        wrapper = """
import sys
import builtins

_original_import = builtins.__import__

def _safe_import(name, *args, **kwargs):
    forbidden = {forbidden_set}
    safe = {safe_set}
    if name in forbidden:
        raise ImportError("Import of '{}' is not allowed".format(name))
    return _original_import(name, *args, **kwargs)

builtins.__import__ = _safe_import

class _OutputLimiter:
    def __init__(self, max_lines):
        self.max_lines = max_lines
        self.line_count = 0
    def write(self, data):
        self.line_count += data.count('\\n')
        if self.line_count > self.max_lines:
            return
        sys._stdout.write(data)
    def flush(self):
        sys._stdout.flush()

sys._stdout = sys.stdout
sys._stderr = sys.stderr
sys.stdout = _OutputLimiter({max_lines})
sys.stderr = _OutputLimiter({max_lines})

del builtins.open
del builtins.input

{user_code}
""".format(
            forbidden_set=repr(self.FORBIDDEN_IMPORTS),
            safe_set=repr(self.SAFE_IMPORTS),
            max_lines=self.max_output_lines,
            user_code=code,
        )
        return wrapper

    def get_cell_output(self, cell_index: int) -> str:
        return self._cell_outputs.get(cell_index, "")

    def clear_state(self):
        self._cell_outputs.clear()
        self._variables.clear()
        self._cell_counter = 0

    def review_code(self, code: str, language: str = "python") -> CodeReviewResult:
        result = CodeReviewResult()

        if language == "python":
            self._analyze_python(code, result)
        elif language == "javascript":
            self._analyze_javascript(code, result)
        else:
            result.issues.append({"type": "unsupported", "message": "不支持的语言: {}".format(language)})
            return result

        result.security_issues = self._check_security_patterns(code, language)
        result.best_practices = self._check_best_practices(code, language)
        return result

    def _analyze_python(self, code: str, result: CodeReviewResult):
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            result.issues.append({"type": "syntax", "message": "语法错误: {}".format(str(e))})
            return

        complexity = 0
        for node in ast.walk(tree):
            complexity += sum(1 for _ in ast.walk(node))

            if isinstance(node, ast.FunctionDef) and isinstance(node.body, list):
                if len(node.body) > 50:
                    result.suggestions.append(
                        "函数 '{}' 过长 ({} 行)，建议拆分为更小的函数".format(node.name, len(node.body))
                    )

            if isinstance(node, ast.ExceptHandler) and node.type is None:
                result.issues.append({
                    "type": "bare_except",
                    "message": "使用了裸 except 语句，应捕获具体异常类型",
                    "line": node.lineno,
                })

            if isinstance(node, ast.Try) and len(node.handlers) == 0:
                result.issues.append({
                    "type": "try_no_except",
                    "message": "try 语句没有 except 处理",
                    "line": node.lineno,
                })

            if isinstance(node, ast.Try) and all(
                isinstance(h, ast.ExceptHandler) and h.type is not None
                and isinstance(h.type, ast.Name) and h.type.id == "Exception"
                for h in node.handlers
            ) and len(node.handlers) > 0:
                result.suggestions.append("建议捕获更具体的异常类型")

        result.complexity = complexity
        result.style_score = min(1.0, max(0.0, 1.0 - complexity / 200.0))

    def _analyze_javascript(self, code: str, result: CodeReviewResult):
        if "var " in code:
            result.suggestions.append("建议使用 let 或 const 替代 var")
        if "console.log" in code:
            result.suggestions.append("生产代码中应移除 console.log 调试语句")
        if "==" in code and "===" not in code:
            result.suggestions.append("建议使用 === 进行严格相等比较")
        if "eval(" in code:
            result.issues.append({"type": "security", "message": "避免使用 eval()"})

    def _check_security_patterns(self, code: str, language: str) -> list[str]:
        issues = []
        patterns = {
            "python": [
                ("eval(", "使用 eval() 存在安全风险"),
                ("exec(", "使用 exec() 存在安全风险"),
                ("subprocess", "使用 subprocess 可能存在命令注入风险"),
                ("pickle", "使用 pickle 可能存在反序列化漏洞"),
                ("requests.get", "发送 HTTP 请求前请验证 URL"),
            ],
            "javascript": [
                ("eval(", "使用 eval() 存在安全风险"),
                ("document.write", "使用 document.write 可能存在 XSS 风险"),
                ("innerHTML", "直接设置 innerHTML 可能存在 XSS 风险"),
            ],
        }
        for pattern, msg in patterns.get(language, []):
            if pattern in code:
                issues.append("{}: {}".format(msg, pattern))
        return issues

    def _check_best_practices(self, code: str, language: str) -> list[str]:
        tips = []
        if language == "python":
            if "except:" in code:
                tips.append("避免使用裸 except，应指定具体异常类型")
            if "global " in code:
                tips.append("避免使用 global 关键字，考虑使用类或闭包")
            if "TODO" in code or "FIXME" in code:
                tips.append("存在未完成的 TODO/FIXME 标记")
        return tips

    def diagnose_error(self, error_message: str, code: str = "",
                       language: str = "python") -> ErrorDiagnosis:
        diagnosis = ErrorDiagnosis(error_type="unknown")
        error_msg_lower = error_message.lower()

        error_patterns = [
            ("NameError", r"name\s+['\"](\w+)['\"]", "变量或函数 '{}' 未定义"),
            ("TypeError", r"unsupported operand type", "操作数类型不匹配"),
            ("ValueError", r"invalid literal", "值转换错误，检查输入数据格式"),
            ("IndexError", r"list index out of range", "列表索引超出范围，检查索引值"),
            ("KeyError", r"KeyError", "字典键不存在，使用 .get() 或检查键是否存在"),
            ("AttributeError", r"has no attribute", "对象没有该属性，检查对象类型"),
            ("ImportError", r"No module named", "模块未安装或路径不正确"),
            ("SyntaxError", r"invalid syntax", "代码语法错误，检查括号匹配和缩进"),
            ("ZeroDivisionError", r"division by zero", "除数为零，添加零值检查"),
            ("IndentationError", r"unexpected indent", "缩进错误，检查空格和制表符混用"),
            ("FileNotFoundError", r"No such file", "文件不存在，检查文件路径"),
            ("TimeoutError", r"timeout|timed out", "操作超时，检查网络连接或增加超时时间"),
            ("MemoryError", r"memory", "内存不足，优化数据结构或分批处理"),
        ]

        for error_type, pattern, explanation_tpl in error_patterns:
            if re.search(error_type.lower(), error_msg_lower) or re.search(pattern, error_msg_lower):
                diagnosis.error_type = error_type
                match = re.search(r"['\"](\w+)['\"]", error_message)
                diagnosis.explanation = explanation_tpl.format(match.group(1) if match else "?")
                break

        if diagnosis.error_type == "unknown":
            diagnosis.explanation = "未知错误类型，请检查以下常见原因：语法错误、依赖缺失、类型错误"
            diagnosis.severity = "high"

        diagnosis.root_cause = self._trace_root_cause(error_message, code, language)
        diagnosis.fix_suggestions = self._generate_fixes(diagnosis.error_type, error_message, code)
        diagnosis.code_example = self._generate_fix_example(diagnosis.error_type, code)
        diagnosis.severity = self._classify_severity(diagnosis.error_type)
        diagnosis.related_docs = self._find_related_docs(diagnosis.error_type)

        return diagnosis

    def _trace_root_cause(self, error_message: str, code: str, language: str) -> str:
        error_map = {
            "NameError": "变量在使用前未定义或作用域错误",
            "TypeError": "对不兼容类型执行了不支持的操作",
            "ValueError": "函数接收到类型正确但值不合适的参数",
            "IndexError": "访问序列时索引超出了有效范围",
            "KeyError": "访问字典中不存在的键",
            "AttributeError": "对象不存在所请求的属性或方法",
            "ImportError": "导入的模块未安装或模块名称拼写错误",
            "SyntaxError": "代码不符合 Python 语法规则",
            "ZeroDivisionError": "除法运算中除数为零",
            "IndentationError": "缩进不一致，通常由 tab 和空格混用导致",
            "FileNotFoundError": "指定的文件路径不存在或权限不足",
        }
        return error_map.get(
            self._detect_error_type(error_message),
            "无法自动定位根因，建议逐步排查代码逻辑",
        )

    def _generate_fixes(self, error_type: str, error_message: str, code: str) -> list[str]:
        generic = [
            "在交互式环境中逐步执行代码以定位问题",
            "使用 print() 或日志记录变量的值和类型",
            "添加防御性检查（类型检查、空值检查、边界检查）",
        ]
        specific = {
            "NameError": [
                "检查变量名是否拼写正确",
                "确认变量在使用前已被赋值",
                "注意变量作用域，避免在函数外引用局部变量",
            ],
            "TypeError": [
                "使用 type() 检查操作数的实际类型",
                "使用 isinstance() 进行类型检查",
                "必要时进行显式类型转换",
            ],
            "ValueError": [
                "验证输入数据的格式和范围",
                "使用 try-except 捕获并处理异常值",
                "添加输入数据的验证逻辑",
            ],
            "IndexError": [
                "使用 len() 检查序列长度再访问索引",
                "使用切片操作避免索引越界",
                "遍历序列时优先使用 for-in 循环",
            ],
            "KeyError": [
                "使用 dict.get(key, default) 替代直接索引",
                "使用 key in dict 检查键是否存在",
                "考虑使用 collections.defaultdict",
            ],
            "AttributeError": [
                "使用 dir() 或 hasattr() 检查对象属性",
                "确认导入的模块版本和 API",
                "检查对象是否在被修改后类型发生了变化",
            ],
            "ImportError": [
                "确认模块已安装: pip install <module>",
                "检查模块名称是否拼写正确",
                "确认虚拟环境是否激活",
            ],
            "ZeroDivisionError": [
                "在除法运算前检查除数是否为零",
                "使用 try-except 捕获此异常并提供默认值",
                "用条件判断替代除法，避免零值出现",
            ],
        }
        return specific.get(error_type, generic)

    def _generate_fix_example(self, error_type: str, code: str) -> str:
        examples = {
            "NameError": "# 修复: 先定义变量再使用\nx = 10\nprint(x)",
            "TypeError": '# 修复: 类型转换\nnum = int("42")\nresult = num + 10',
            "KeyError": '# 修复: 使用 get()\nd = {"a": 1}\nvalue = d.get("b", 0)',
            "IndexError": "# 修复: 检查索引\nitems = [1, 2]\nif len(items) > 5:\n    print(items[5])",
            "ZeroDivisionError": "# 修复: 零值检查\ndenominator = 0\nresult = numerator / denominator if denominator != 0 else float('inf')",
            "AttributeError": "# 修复: 属性检查\nobj = MyClass()\nif hasattr(obj, 'method'):\n    obj.method()",
            "FileNotFoundError": "# 修复: 路径检查\nimport os\nif os.path.exists(filepath):\n    with open(filepath) as f:\n        data = f.read()",
            "ImportError": "# 修复: 使用 try-except 提供回退\ntry:\n    import numpy as np\nexcept ImportError:\n    print('请安装 numpy: pip install numpy')",
        }
        return examples.get(error_type, "# 使用 try-except 捕获异常\n" + code if "try" not in code else code)

    def _classify_severity(self, error_type: str) -> str:
        critical = {"SyntaxError", "ImportError", "MemoryError"}
        high = {"NameError", "TypeError", "AttributeError", "IndexError", "KeyError"}
        medium = {"ValueError", "ZeroDivisionError", "FileNotFoundError", "IndentationError"}
        if error_type in critical:
            return "critical"
        elif error_type in high:
            return "high"
        elif error_type in medium:
            return "medium"
        return "low"

    def _find_related_docs(self, error_type: str) -> list[str]:
        docs = {
            "NameError": ["https://docs.python.org/3/reference/executionmodel.html"],
            "TypeError": ["https://docs.python.org/3/library/exceptions.html#TypeError"],
            "ImportError": ["https://docs.python.org/3/reference/import.html"],
            "AttributeError": ["https://docs.python.org/3/library/exceptions.html#AttributeError"],
        }
        return docs.get(error_type, ["https://docs.python.org/3/library/exceptions.html"])

    def _detect_error_type(self, error_message: str) -> str:
        for etype in [
            "NameError", "TypeError", "ValueError", "IndexError", "KeyError",
            "AttributeError", "ImportError", "ModuleNotFoundError",
            "SyntaxError", "IndentationError", "ZeroDivisionError",
            "FileNotFoundError", "TimeoutError", "MemoryError",
        ]:
            if etype in error_message:
                return etype
        return "unknown"

    def generate_code(self, description: str, language: str = "python",
                      context: str = "") -> GeneratedCode:
        desc_lower = description.lower()
        result = GeneratedCode(language=language, description=description)

        if language == "python":
            generated = self._generate_python(desc_lower, context)
        elif language == "javascript":
            generated = self._generate_javascript(desc_lower, context)
        else:
            return result

        result.code = generated["code"]
        result.imports_needed = generated.get("imports", [])
        result.complexity = generated.get("complexity", "simple")
        result.test_hints = generated.get("tests", [])
        return result

    def _generate_python(self, description: str, context: str) -> dict:
        patterns = {
            "排序": {
                "code": "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\nresult = bubble_sort([64, 34, 25, 12, 22, 11, 90])\nprint(result)",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试空列表", "测试已排序列表", "测试包含重复元素的列表"],
            },
            "斐波那契": {
                "code": "def fibonacci(n: int) -> list[int]:\n    if n <= 0:\n        return []\n    if n == 1:\n        return [0]\n    seq = [0, 1]\n    for i in range(2, n):\n        seq.append(seq[i - 1] + seq[i - 2])\n    return seq\n\nprint(fibonacci(10))",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试 n=0", "测试 n=1", "测试 n=10"],
            },
            "素数": {
                "code": "def is_prime(n: int) -> bool:\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\ndef primes_up_to(limit: int) -> list[int]:\n    return [n for n in range(2, limit + 1) if is_prime(n)]\n\nprint(primes_up_to(100))",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试 0 和 1 不是素数", "测试 2 是素数", "测试 100 以内的素数个数"],
            },
            "二分查找": {
                "code": "def binary_search(arr: list, target: int) -> int:\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\narr = [1, 3, 5, 7, 9, 11]\nprint(binary_search(arr, 7))",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试找到目标", "测试未找到目标", "测试空数组"],
            },
            "爬虫": {
                "code": "# 模拟网页爬虫（受限环境）\n\ndef extract_links(html: str) -> list[str]:\n    import re\n    pattern = r'href=[\\\\'\"]?(https?://[^\\\\s\\\\'\">]+)'\n    return re.findall(pattern, html)\n\nhtml_sample = '<a href=\\\"https://example.com\\\">Link</a>'\nprint(extract_links(html_sample))",
                "imports": ["re"],
                "complexity": "medium",
                "tests": ["测试无链接的 HTML", "测试多个链接"],
            },
            "数据分析": {
                "code": "import math\n\ndef calculate_statistics(data: list[float]) -> dict:\n    n = len(data)\n    if n == 0:\n        return {}\n    mean = sum(data) / n\n    variance = sum((x - mean) ** 2 for x in data) / n\n    std_dev = math.sqrt(variance)\n    sorted_data = sorted(data)\n    median = sorted_data[n // 2] if n % 2 else (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2\n    return {\n        'mean': mean,\n        'median': median,\n        'std_dev': std_dev,\n        'min': min(data),\n        'max': max(data),\n    }\n\ndata = [1.2, 3.4, 5.6, 7.8, 9.0]\nstats = calculate_statistics(data)\nprint(stats)",
                "imports": ["math"],
                "complexity": "medium",
                "tests": ["测试正态分布数据", "测试空数据", "测试单元素数据"],
            },
            "文件读写": {
                "code": "def read_file_lines(filepath: str) -> list[str]:\n    try:\n        with open(filepath, 'r', encoding='utf-8') as f:\n            return [line.rstrip('\\\\n') for line in f]\n    except FileNotFoundError:\n        print(f'文件不存在: {filepath}')\n        return []\n    except Exception as e:\n        print(f'读取失败: {e}')\n        return []\n\n# 创建示例文件并读取\nwith open('/tmp/demo.txt', 'w') as f:\n    f.write('line1\\\\nline2\\\\nline3\\\\n')\nlines = read_file_lines('/tmp/demo.txt')\nprint(f'读取了 {len(lines)} 行')\nprint(lines)",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试存在的文件", "测试不存在的文件", "测试空文件"],
            },
            "json": {
                "code": "import json\n\ndata = {'name': 'Alice', 'age': 30, 'skills': ['Python', 'ML']}\njson_str = json.dumps(data, indent=2, ensure_ascii=False)\nprint('序列化:')\nprint(json_str)\nloaded = json.loads(json_str)\nprint(f'\\\\n反序列化: name={loaded[\\\"name\\\"]}, skills={len(loaded[\\\"skills\\\"])}个')",
                "imports": ["json"],
                "complexity": "simple",
                "tests": ["测试基本类型", "测试嵌套对象", "测试列表"],
            },
            "日期": {
                "code": "from datetime import datetime, timedelta\n\nnow = datetime.now()\nprint(f'当前时间: {now.strftime(\\\"%Y-%m-%d %H:%M:%S\\\")}')\nweek_ago = now - timedelta(days=7)\nprint(f'一周前: {week_ago.strftime(\\\"%Y-%m-%d\\\")}')\nfuture = now + timedelta(days=30, hours=2)\nprint(f'30天2小时后: {future.strftime(\\\"%Y-%m-%d %H:%M\\\")}')",
                "imports": ["datetime"],
                "complexity": "simple",
                "tests": ["测试当前时间", "测试时间差", "测试时区"],
            },
            "正则": {
                "code": "import re\n\ntext = '联系电话: 010-12345678, 手机: 13812345678, email: user@example.com'\nphones = re.findall(r'\\\\d{2,4}-\\\\d{6,8}', text)\nmobiles = re.findall(r'1[3-9]\\\\d{9}', text)\nemails = re.findall(r'[\\\\w.-]+@[\\\\w.-]+\\\\.\\\\w+', text)\nprint(f'座机: {phones}')\nprint(f'手机: {mobiles}')\nprint(f'邮箱: {emails}')",
                "imports": ["re"],
                "complexity": "medium",
                "tests": ["测试中文文本", "测试无匹配", "测试多种格式"],
            },
            "加密": {
                "code": "import hashlib\n\ndef hash_password(password: str) -> str:\n    return hashlib.sha256(password.encode()).hexdigest()\n\ndef verify_password(password: str, stored_hash: str) -> bool:\n    return hash_password(password) == stored_hash\n\npwd = 'my_secure_pass'\nhashed = hash_password(pwd)\nprint(f'SHA256: {hashed[:16]}...')\nprint(f'验证通过: {verify_password(pwd, hashed)}')\nprint(f'错误密码: {verify_password(\\\"wrong\\\", hashed)}')",
                "imports": ["hashlib"],
                "complexity": "simple",
                "tests": ["测试正常密码", "测试空密码", "测试长密码"],
            },
            "网络请求": {
                "code": "import urllib.request\nimport json\n\ntry:\n    req = urllib.request.Request('https://httpbin.org/get', headers={'User-Agent': 'Python'})\n    with urllib.request.urlopen(req, timeout=10) as resp:\n        data = json.loads(resp.read().decode('utf-8'))\n        print(f'状态码: {resp.status}')\n        print(f'原始地址: {data.get(\\\"origin\\\", \\\"unknown\\\")}')\nexcept Exception as e:\n    print(f'请求失败: {e}')",
                "imports": ["urllib.request", "json"],
                "complexity": "medium",
                "tests": ["测试正常请求", "测试超时", "测试无效URL"],
            },
            "命令行": {
                "code": "import subprocess\nimport sys\n\ncmd = ['echo', 'Hello from subprocess'] if sys.platform != 'win32' else ['cmd', '/c', 'echo Hello']\ntry:\n    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)\n    print(f'退出码: {result.returncode}')\n    print(f'输出: {result.stdout.strip()}')\nexcept subprocess.TimeoutExpired:\n    print('命令超时')\nexcept FileNotFoundError:\n    print('命令未找到')",
                "imports": ["subprocess", "sys"],
                "complexity": "medium",
                "tests": ["测试简单命令", "测试不存在的命令", "测试超时"],
            },
            "csv": {
                "code": "import csv\nimport io\n\ndata = [['Name', 'Age', 'City'], ['Alice', '30', 'Beijing'], ['Bob', '25', 'Shanghai']]\noutput = io.StringIO()\nwriter = csv.writer(output)\nwriter.writerows(data)\nprint('CSV 内容:')\nprint(output.getvalue().strip())\n\ninput_csv = io.StringIO(output.getvalue())\nreader = csv.DictReader(input_csv)\nfor row in reader:\n    print(f'{row[\\\"Name\\\"]}: {row[\\\"Age\\\"]}岁, {row[\\\"City\\\"]}')",
                "imports": ["csv", "io"],
                "complexity": "simple",
                "tests": ["测试写入", "测试读取", "测试空CSV"],
            },
            "随机": {
                "code": "import random\n\nrandom.seed(42)\nprint(f'整数: {random.randint(1, 100)}')\nprint(f'浮点: {random.uniform(0, 1):.4f}')\nitems = ['apple', 'banana', 'cherry', 'date']\nprint(f'随机选择: {random.choice(items)}')\nrandom.shuffle(items)\nprint(f'乱序列表: {items}')\nprint(f'按权重选择: {random.choices(items, weights=[1,2,3,4], k=3)}')",
                "imports": ["random"],
                "complexity": "simple",
                "tests": ["测试种子固定", "测试空列表", "测试权重"],
            },
            "数据库": {
                "code": "import sqlite3\nimport os\n\ndb_path = '/tmp/demo.db'\nconn = sqlite3.connect(db_path)\ncursor = conn.cursor()\ncursor.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)')\ncursor.execute('INSERT INTO users (name, age) VALUES (?, ?)', ('Alice', 30))\ncursor.execute('INSERT INTO users (name, age) VALUES (?, ?)', ('Bob', 25))\nconn.commit()\ncursor.execute('SELECT * FROM users')\nrows = cursor.fetchall()\nfor row in rows:\n    print(f'ID:{row[0]}, Name:{row[1]}, Age:{row[2]}')\nconn.close()\nprint(f'\\\\n数据库大小: {os.path.getsize(db_path)} bytes')",
                "imports": ["sqlite3", "os"],
                "complexity": "medium",
                "tests": ["测试创建表", "测试插入", "测试查询"],
            },
        }

        for keyword, template in patterns.items():
            if keyword in description:
                return template

        return {
            "code": "def solve():\n    \"\"\"根据描述自动生成的通用解法模板\"\"\"\n    # 输入处理\n    raw_input = input(\"请输入数据 (多个用逗号分隔): \").strip()\n    if not raw_input:\n        print(\"无输入数据\")\n        return None\n    items = [x.strip() for x in raw_input.split(',')]\n    # 主逻辑\n    result = process_items(items)\n    # 输出\n    print(f\"处理了 {len(items)} 个元素\")\n    print(f\"结果: {result}\")\n    return result\n\n\ndef process_items(items):\n    \"\"\"核心处理逻辑\"\"\"\n    return [item.upper() if isinstance(item, str) else item for item in items]\n\nprint(solve())",
            "imports": [],
            "complexity": "simple",
            "tests": ["测试基本用例", "测试空输入", "测试边界条件"],
        }

    def _generate_javascript(self, description: str, context: str) -> dict:
        patterns_js = {
            "排序": {
                "code": "function quickSort(arr) {\n    if (arr.length <= 1) return arr;\n    const pivot = arr[0];\n    const left = arr.slice(1).filter(x => x <= pivot);\n    const right = arr.slice(1).filter(x => x > pivot);\n    return [...quickSort(left), pivot, ...quickSort(right)];\n}\n\nconsole.log(quickSort([5, 3, 8, 4, 2]));",
                "imports": [],
                "complexity": "medium",
                "tests": ["测试空数组", "测试已排序数组"],
            },
            "数组去重": {
                "code": "function unique(arr) {\n    return [...new Set(arr)];\n}\n\nconst arr = [1, 2, 2, 3, 1, 5];\nconsole.log(unique(arr));",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试空数组", "测试无重复数组"],
            },
            "斐波那契": {
                "code": "function fibonacci(n) {\n    if (n <= 0) return [];\n    if (n === 1) return [0];\n    const seq = [0, 1];\n    for (let i = 2; i < n; i++) {\n        seq.push(seq[i - 1] + seq[i - 2]);\n    }\n    return seq;\n}\n\nconsole.log(fibonacci(10));",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试 n=0", "测试 n=1", "测试 n=10"],
            },
            "素数": {
                "code": "function isPrime(n) {\n    if (n < 2) return false;\n    for (let i = 2; i <= Math.sqrt(n); i++) {\n        if (n % i === 0) return false;\n    }\n    return true;\n}\n\nfunction primesUpTo(limit) {\n    const result = [];\n    for (let i = 2; i <= limit; i++) {\n        if (isPrime(i)) result.push(i);\n    }\n    return result;\n}\n\nconsole.log(primesUpTo(50));",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试 0 和 1", "测试 2 是素数", "测试 100 以内素数数"],
            },
            "字符串": {
                "code": "const text = 'Hello World JavaScript';\nconsole.log('大写:', text.toUpperCase());\nconsole.log('小写:', text.toLowerCase());\nconsole.log('分割:', text.split(' '));\nconsole.log('替换:', text.replace('World', 'Universe'));\nconsole.log('截取:', text.substring(0, 5));\nconsole.log('反转:', text.split('').reverse().join(''));\n\nconst data = ['apple', 'banana', 'cherry', 'date'];\nconsole.log('过滤:', data.filter(x => x.length > 5));\nconsole.log('映射:', data.map(x => x.toUpperCase()));\nconsole.log('排序:', data.sort());",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试空字符串", "测试中文字符", "测试特殊字符"],
            },
            "日期": {
                "code": "const now = new Date();\nconsole.log('当前:', now.toISOString());\nconsole.log('本地:', now.toLocaleString('zh-CN'));\nconst weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);\nconsole.log('一周前:', weekAgo.toLocaleDateString('zh-CN'));\nconst future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);\nconsole.log('30天后:', future.toLocaleDateString('zh-CN'));\nconsole.log('时间差(天):', Math.round((future - now) / (1000 * 60 * 60 * 24)));",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试当前时间", "测试闰年", "测试时区"],
            },
            "正则": {
                "code": "const text = '联系电话: 010-12345678, 手机: 13812345678, email: user@example.com';\nconst phones = text.match(/\\d{2,4}-\\d{6,8}/g) || [];\nconst mobiles = text.match(/1[3-9]\\d{9}/g) || [];\nconst emails = text.match(/[\\w.-]+@[\\w.-]+\\.\\w+/g) || [];\nconsole.log('座机:', phones);\nconsole.log('手机:', mobiles);\nconsole.log('邮箱:', emails);\n\nconst html = '<div class=\"main\"><p>Hello</p><p>World</p></div>';\nconst tagPattern = /<p>(.*?)<\\/p>/g;\nconsole.log('标签内容:', [...html.matchAll(tagPattern)].map(m => m[1]));",
                "imports": [],
                "complexity": "medium",
                "tests": ["测试中文文本", "测试无匹配", "测试多种格式"],
            },
            "json": {
                "code": "const data = { name: 'Alice', age: 30, skills: ['JS', 'React'] };\nconst jsonStr = JSON.stringify(data, null, 2);\nconsole.log('序列化:');\nconsole.log(jsonStr);\nconst parsed = JSON.parse(jsonStr);\nconsole.log('\\n反序列化:', `name=${parsed.name}, skills=${parsed.skills.length}个`);\n\nconst arr = [1, 2, 3, 4, 5];\nconsole.log('map+filter:', arr.map(x => x * 2).filter(x => x > 5));\nconsole.log('reduce:', arr.reduce((a, b) => a + b, 0));",
                "imports": [],
                "complexity": "simple",
                "tests": ["测试基本类型", "测试嵌套对象", "测试空对象"],
            },
            "异步": {
                "code": "async function fetchData(url) {\n    try {\n        const response = await fetch(url);\n        if (!response.ok) throw new Error(`HTTP ${response.status}`);\n        const data = await response.json();\n        return data;\n    } catch (error) {\n        console.error('请求失败:', error.message);\n        return null;\n    }\n}\n\n(async () => {\n    const p1 = Promise.resolve('Result 1');\n    const p2 = new Promise(resolve => setTimeout(() => resolve('Result 2'), 100));\n    const results = await Promise.all([p1, p2]);\n    console.log('并行结果:', results);\n})();",
                "imports": [],
                "complexity": "medium",
                "tests": ["测试成功响应", "测试失败响应", "测试超时"],
            },
            "加密": {
                "code": "async function sha256(message) {\n    const encoder = new TextEncoder();\n    const data = encoder.encode(message);\n    const hashBuffer = await crypto.subtle.digest('SHA-256', data);\n    const hashArray = Array.from(new Uint8Array(hashBuffer));\n    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');\n}\n\n(async () => {\n    const hash = await sha256('Hello World');\n    console.log('SHA256:', hash.substring(0, 16) + '...');\n})();",
                "imports": [],
                "complexity": "medium",
                "tests": ["测试正常文本", "测试空字符串", "测试长文本"],
            },
        }

        for keyword, template in patterns_js.items():
            if keyword in description:
                return template

        return {
            "code": "function solve() {\n    \"\"\"根据描述自动生成的通用解法模板\"\"\"\n    var input = prompt('请输入数据 (多个用逗号分隔):');\n    if (!input || input.trim() === '') {\n        console.log('无输入数据');\n        return null;\n    }\n    var items = input.split(',').map(function(s) { return s.trim(); });\n    var result = processItems(items);\n    console.log('处理了 ' + items.length + ' 个元素');\n    console.log('结果:', result);\n    return result;\n}\n\nfunction processItems(items) {\n    return items.map(function(item) {\n        return typeof item === 'string' ? item.toUpperCase() : item;\n    });\n}\n\nconsole.log(solve());",
            "imports": [],
            "complexity": "simple",
            "tests": ["测试基本用例", "测试空输入"],
        }

    def execute_cell(self, code: str, language: str = "python",
                     cell_index: int | None = None) -> ExecutionResult:
        return self.execute(code, language, cell_index)

    def execute_notebook(self, cells: list[dict]) -> list[ExecutionResult]:
        self.clear_state()
        results = []
        for i, cell in enumerate(cells):
            code = cell.get("code", "")
            language = cell.get("language", "python")
            result = self.execute(code, language, cell_index=i + 1)
            results.append(result)
        return results

    def format_result(self, result: ExecutionResult) -> str:
        if result.status == ExecutionStatus.SUCCESS:
            output = result.output or "(无输出)"
            return ">>> 执行成功 ({:.3f}s)\n{}".format(result.execution_time, output)
        elif result.status == ExecutionStatus.ERROR:
            return ">>> 执行错误 ({:.3f}s)\n错误: {}".format(result.execution_time, result.error)
        elif result.status == ExecutionStatus.TIMEOUT:
            return ">>> 执行超时 (>{:.0f}s)".format(self.timeout)
        elif result.status == ExecutionStatus.FORBIDDEN:
            return ">>> 禁止执行: {}".format(result.error)
        elif result.status == ExecutionStatus.OUTPUT_EXCEEDED:
            return ">>> 输出超限\n{}".format(result.output[:500])
        return ">>> 状态: {}".format(result.status.value)

    def get_supported_languages(self) -> list[str]:
        langs = ["python"]
        try:
            subprocess.run(["node", "--version"], capture_output=True, timeout=5)
            langs.append("javascript")
        except Exception:
            pass
        return langs

    def get_safe_modules(self) -> list[str]:
        return sorted(self.SAFE_IMPORTS)

    def get_forbidden_operations(self) -> dict:
        return {
            "forbidden_imports": sorted(self.FORBIDDEN_IMPORTS),
            "forbidden_modules": sorted(self.FORBIDDEN_MODULES),
            "forbidden_functions": sorted(self.FORBIDDEN_FUNCTIONS),
        }
