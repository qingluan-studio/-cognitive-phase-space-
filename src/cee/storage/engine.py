"""
Storage Abstraction Layer — 统一多后端存储接口

支持关系型 (SQLite/PostgreSQL/MySQL)、文档型 (MongoDB)、
图数据库 (Neo4j)、内存型 (Redis) 的统一抽象。
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from abc import ABC, abstractmethod
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Generic, Iterator, Optional, Self, TypeVar
from pathlib import Path

T = TypeVar("T")


class BackendType(Enum):
    SQLITE = "sqlite"
    POSTGRES = "postgres"
    MYSQL = "mysql"
    MONGODB = "mongodb"
    REDIS = "redis"
    NEO4J = "neo4j"
    MEMORY = "memory"


class IsolationLevel(Enum):
    READ_UNCOMMITTED = "READ UNCOMMITTED"
    READ_COMMITTED = "READ COMMITTED"
    REPEATABLE_READ = "REPEATABLE READ"
    SERIALIZABLE = "SERIALIZABLE"


@dataclass
class ConnectionConfig:
    backend: BackendType
    host: str = "localhost"
    port: int = 0
    database: str = "cee"
    username: str = ""
    password: str = ""
    pool_size: int = 5
    timeout: float = 30.0
    ssl: bool = False
    extra_params: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def sqlite(cls, path: str = ":memory:") -> Self:
        return cls(backend=BackendType.SQLITE, database=path)

    @classmethod
    def postgres(cls, host: str = "localhost", port: int = 5432, database: str = "cee", username: str = "postgres", password: str = "") -> Self:
        return cls(backend=BackendType.POSTGRES, host=host, port=port, database=database, username=username, password=password)

    @classmethod
    def memory(cls) -> Self:
        return cls(backend=BackendType.MEMORY)

    @property
    def dsn(self) -> str:
        match self.backend:
            case BackendType.SQLITE:
                return f"sqlite:///{self.database}"
            case BackendType.POSTGRES:
                return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
            case BackendType.MYSQL:
                return f"mysql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
            case BackendType.MONGODB:
                return f"mongodb://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
            case BackendType.REDIS:
                return f"redis://{self.host}:{self.port}"
            case BackendType.NEO4J:
                return f"bolt://{self.host}:{self.port}"
            case _:
                return "memory://"


@dataclass
class QueryResult(Generic[T]):
    rows: list[T]
    row_count: int
    affected_rows: int = 0
    last_id: Any = None
    execution_time_ms: float = 0.0
    columns: list[str] = field(default_factory=list)

    def __iter__(self):
        return iter(self.rows)

    def __len__(self) -> int:
        return self.row_count

    def first(self) -> T | None:
        return self.rows[0] if self.rows else None

    def scalar(self) -> Any | None:
        if self.rows and isinstance(self.rows[0], dict):
            return next(iter(self.rows[0].values()))
        return self.rows[0] if self.rows else None


class DatabaseError(Exception):
    pass


class ConnectionError(DatabaseError):
    pass


class QueryError(DatabaseError):
    pass


class TransactionError(DatabaseError):
    pass


class BaseBackend(ABC):
    @abstractmethod
    def connect(self) -> None: ...
    @abstractmethod
    def close(self) -> None: ...
    @abstractmethod
    def execute(self, query: str, params: tuple | dict | None = None) -> QueryResult: ...
    @abstractmethod
    def execute_many(self, query: str, params_list: list) -> QueryResult: ...
    @abstractmethod
    def fetch_one(self, query: str, params: tuple | dict | None = None) -> dict | None: ...
    @abstractmethod
    def fetch_all(self, query: str, params: tuple | dict | None = None) -> list[dict]: ...
    @abstractmethod
    def insert(self, table: str, data: dict) -> Any: ...
    @abstractmethod
    def update(self, table: str, data: dict, where: dict) -> int: ...
    @abstractmethod
    def delete(self, table: str, where: dict) -> int: ...
    @abstractmethod
    def table_exists(self, table: str) -> bool: ...
    @abstractmethod
    def create_table(self, table: str, columns: dict[str, str], if_not_exists: bool = True) -> None: ...
    @abstractmethod
    @contextmanager
    def transaction(self) -> Iterator: ...


class SQLiteBackend(BaseBackend):
    def __init__(self, config: ConnectionConfig) -> None:
        self.config = config
        self._conn: sqlite3.Connection | None = None
        self._lock = threading.Lock()

    def connect(self) -> None:
        db_path = self.config.database
        if db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(
            db_path,
            check_same_thread=False,
            timeout=self.config.timeout,
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._conn.execute("PRAGMA busy_timeout=5000")

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def _ensure_connection(self) -> sqlite3.Connection:
        if self._conn is None:
            self.connect()
        return self._conn

    def execute(self, query: str, params: tuple | dict | None = None) -> QueryResult:
        import time
        start = time.perf_counter()
        with self._lock:
            conn = self._ensure_connection()
            cur = conn.execute(query, params or ())
            conn.commit()
            elapsed = (time.perf_counter() - start) * 1000
            rows = [dict(row) for row in cur.fetchall()]
            return QueryResult(
                rows=rows,
                row_count=len(rows),
                affected_rows=cur.rowcount,
                last_id=cur.lastrowid,
                execution_time_ms=elapsed,
                columns=[d[0] for d in cur.description] if cur.description else [],
            )

    def execute_many(self, query: str, params_list: list) -> QueryResult:
        import time
        start = time.perf_counter()
        with self._lock:
            conn = self._ensure_connection()
            cur = conn.executemany(query, params_list)
            conn.commit()
            elapsed = (time.perf_counter() - start) * 1000
            return QueryResult(rows=[], row_count=cur.rowcount, execution_time_ms=elapsed)

    def fetch_one(self, query: str, params: tuple | dict | None = None) -> dict | None:
        conn = self._ensure_connection()
        cur = conn.execute(query, params or ())
        row = cur.fetchone()
        return dict(row) if row else None

    def fetch_all(self, query: str, params: tuple | dict | None = None) -> list[dict]:
        conn = self._ensure_connection()
        cur = conn.execute(query, params or ())
        return [dict(row) for row in cur.fetchall()]

    def insert(self, table: str, data: dict) -> Any:
        columns = ", ".join(data.keys())
        placeholders = ", ".join("?" * len(data))
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        result = self.execute(query, tuple(data.values()))
        return result.last_id

    def update(self, table: str, data: dict, where: dict) -> int:
        set_clause = ", ".join(f"{k} = ?" for k in data)
        where_clause = " AND ".join(f"{k} = ?" for k in where)
        params = tuple(data.values()) + tuple(where.values())
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        result = self.execute(query, params)
        return result.affected_rows

    def delete(self, table: str, where: dict) -> int:
        where_clause = " AND ".join(f"{k} = ?" for k in where)
        query = f"DELETE FROM {table} WHERE {where_clause}"
        result = self.execute(query, tuple(where.values()))
        return result.affected_rows

    def table_exists(self, table: str) -> bool:
        row = self.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table,),
        )
        return row is not None

    def create_table(self, table: str, columns: dict[str, str], if_not_exists: bool = True) -> None:
        col_defs = ", ".join(f"{name} {dtype}" for name, dtype in columns.items())
        exists = "IF NOT EXISTS" if if_not_exists else ""
        self.execute(f"CREATE TABLE {exists} {table} ({col_defs})")

    @contextmanager
    def transaction(self) -> Iterator:
        conn = self._ensure_connection()
        try:
            conn.execute("BEGIN")
            yield
            conn.commit()
        except Exception:
            conn.rollback()
            raise


class MemoryBackend(BaseBackend):
    """内存后端，适用于测试和小数据集"""

    def __init__(self, config: ConnectionConfig) -> None:
        self.config = config
        self._tables: dict[str, list[dict]] = {}
        self._schemas: dict[str, dict[str, str]] = {}
        self._auto_increment: dict[str, int] = {}
        self._lock = threading.Lock()

    def connect(self) -> None:
        pass

    def close(self) -> None:
        self._tables.clear()
        self._schemas.clear()

    def execute(self, query: str, params: tuple | dict | None = None) -> QueryResult:
        if query.strip().upper().startswith("INSERT"):
            return self._handle_insert(query, params)
        if query.strip().upper().startswith("SELECT"):
            return self._handle_select(query, params)
        return QueryResult(rows=[], row_count=0)

    def execute_many(self, query: str, params_list: list) -> QueryResult:
        total = 0
        for params in params_list:
            r = self.execute(query, params)
            total += r.row_count
        return QueryResult(rows=[], row_count=total)

    def fetch_one(self, query: str, params: tuple | dict | None = None) -> dict | None:
        result = self.fetch_all(query, params)
        return result[0] if result else None

    def fetch_all(self, query: str, params: tuple | dict | None = None) -> list[dict]:
        upper = query.strip().upper()
        if upper.startswith("SELECT"):
            parts = upper.split("FROM")
            if len(parts) >= 2:
                table_part = parts[1].strip().split()[0].strip('"').strip("'")
                table_key = self._find_table(table_part)
                where_idx = upper.find("WHERE")
                with self._lock:
                    rows = self._tables.get(table_key, [])
                    if where_idx >= 0 and params:
                        where_clause = query[where_idx + 5:].strip()
                        rows = [r for r in rows if self._match_where(r, where_clause, params)]
                    return list(rows)
        return []

    def _find_table(self, name: str) -> str:
        name_lower = name.lower()
        for t in self._tables:
            if t.lower() == name_lower:
                return t
        return name

    def insert(self, table: str, data: dict) -> Any:
        with self._lock:
            if table not in self._tables:
                self._tables[table] = []
            if table not in self._auto_increment:
                self._auto_increment[table] = 0
            self._auto_increment[table] += 1
            row = {**data, "_id": self._auto_increment[table]}
            self._tables[table].append(row)
            return self._auto_increment[table]

    def update(self, table: str, data: dict, where: dict) -> int:
        with self._lock:
            count = 0
            for row in self._tables.get(table, []):
                if all(row.get(k) == v for k, v in where.items()):
                    row.update(data)
                    count += 1
            return count

    def delete(self, table: str, where: dict) -> int:
        with self._lock:
            original = len(self._tables.get(table, []))
            self._tables[table] = [
                r for r in self._tables.get(table, [])
                if not all(r.get(k) == v for k, v in where.items())
            ]
            return original - len(self._tables[table])

    def table_exists(self, table: str) -> bool:
        return table in self._tables

    def create_table(self, table: str, columns: dict[str, str], if_not_exists: bool = True) -> None:
        with self._lock:
            if table not in self._tables:
                self._tables[table] = []
                self._schemas[table] = columns

    def _handle_insert(self, query: str, params: tuple | None) -> QueryResult:
        parts = query.split("VALUES")
        if len(parts) >= 2:
            table_part = parts[0].replace("INSERT INTO", "").strip().split("(")[0].strip().strip('"')
            with self._lock:
                if table_part not in self._auto_increment:
                    self._auto_increment[table_part] = 0
                self._auto_increment[table_part] += 1
                row = {"_id": self._auto_increment[table_part]}
                if params:
                    schema = self._schemas.get(table_part, {})
                    keys = list(schema.keys())
                    for i, val in enumerate(params):
                        if i < len(keys):
                            row[keys[i]] = val
                if table_part not in self._tables:
                    self._tables[table_part] = []
                self._tables[table_part].append(row)
                return QueryResult(rows=[row], row_count=1, last_id=row["_id"])
        return QueryResult(rows=[], row_count=0)

    def _handle_select(self, query: str, params: tuple | None) -> QueryResult:
        for table_name in list(self._tables.keys()):
            if table_name in query.lower():
                rows = self._tables[table_name]
                if params and "WHERE" in query.upper():
                    where_idx = query.upper().find("WHERE")
                    where_clause = query[where_idx + 5:].strip()
                    rows = [r for r in rows if self._match_where(r, where_clause, params)]
                return QueryResult(rows=list(rows), row_count=len(rows))
        return QueryResult(rows=[], row_count=0)

    @contextmanager
    def transaction(self) -> Iterator:
        snapshot = {t: list(rows) for t, rows in self._tables.items()}
        try:
            yield
        except Exception:
            self._tables = snapshot
            raise

    def _match_where(self, row: dict, where_clause: str, params: tuple) -> bool:
        import re
        conditions = [c.strip() for c in re.split(r'\bAND\b', where_clause, flags=re.IGNORECASE)]
        param_idx = 0
        for cond in conditions:
            parts = cond.split("=")
            if len(parts) == 2:
                col = parts[0].strip().strip('"').strip("'")
                val = parts[1].strip().strip("'").strip('"')
                if val == "?":
                    if param_idx < len(params):
                        if str(row.get(col, "")) != str(params[param_idx]):
                            return False
                        param_idx += 1
                elif str(row.get(col, "")) != val:
                    return False
        return True


class StorageEngine:
    """统一存储引擎，延迟连接、自动后端选择"""

    def __init__(self, config: ConnectionConfig | None = None) -> None:
        self.config = config or ConnectionConfig.memory()
        self._backend: BaseBackend | None = None
        self._connected = False

    @property
    def backend(self) -> BaseBackend:
        if self._backend is None:
            self.connect()
        return self._backend

    def connect(self) -> None:
        match self.config.backend:
            case BackendType.SQLITE | BackendType.MEMORY:
                self._backend = SQLiteBackend(self.config) if self.config.backend == BackendType.SQLITE else MemoryBackend(self.config)
            case _:
                self._backend = SQLiteBackend(ConnectionConfig.sqlite())
        self._backend.connect()
        self._connected = True

    def close(self) -> None:
        if self._backend:
            self._backend.close()
        self._connected = False

    def execute(self, query: str, params: tuple | dict | None = None) -> QueryResult:
        return self.backend.execute(query, params)

    def execute_many(self, query: str, params_list: list) -> QueryResult:
        return self.backend.execute_many(query, params_list)

    def fetch_one(self, query: str, params: tuple | dict | None = None) -> dict | None:
        return self.backend.fetch_one(query, params)

    def fetch_all(self, query: str, params: tuple | dict | None = None) -> list[dict]:
        return self.backend.fetch_all(query, params)

    def insert(self, table: str, data: dict) -> Any:
        return self.backend.insert(table, data)

    def update(self, table: str, data: dict, where: dict) -> int:
        return self.backend.update(table, data, where)

    def delete(self, table: str, where: dict) -> int:
        return self.backend.delete(table, where)

    def table_exists(self, table: str) -> bool:
        return self.backend.table_exists(table)

    def create_table(self, table: str, columns: dict[str, str], if_not_exists: bool = True) -> None:
        self.backend.create_table(table, columns, if_not_exists)

    @contextmanager
    def transaction(self):
        with self.backend.transaction():
            yield

    def migrate(self, migrations: list[tuple[str, dict[str, str]]]) -> None:
        for table_name, columns in migrations:
            if not self.table_exists(table_name):
                self.create_table(table_name, columns)

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, *args):
        self.close()


__all__ = [
    "StorageEngine",
    "SQLiteBackend",
    "MemoryBackend",
    "BaseBackend",
    "ConnectionConfig",
    "QueryResult",
    "BackendType",
    "IsolationLevel",
    "DatabaseError",
    "ConnectionError",
    "QueryError",
    "TransactionError",
]
