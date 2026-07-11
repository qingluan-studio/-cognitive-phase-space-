"""
基于 SQLite + aiosqlite 的异步数据库层

提供连接管理、自动建表、迁移、CRUD 操作、分页等功能。

表结构:
    sessions         - 会话
    messages         - 消息
    knowledge_items  - 知识条目
    user_preferences - 用户偏好
    analytics_events - 分析事件
    cache_entries    - 缓存条目
    file_records     - 文件记录
    search_logs      - 搜索日志

使用示例:
    db = AsyncDatabase("cee.db")
    await db.initialize()
    sessions = await db.list_sessions(limit=10, offset=0)
"""

from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, AsyncIterator, Optional

try:
    import aiosqlite

    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False
    import sqlite3 as aiosqlite_fallback

    class _FakeAiosqlite:
        """aiosqlite 不可用时的同步回退"""

        def __init__(self):
            self._conn: sqlite3.Connection | None = None

        async def connect(self, path: str, **kwargs: Any) -> "sqlite3.Connection":
            self._conn = sqlite3.connect(path, **kwargs)
            return self._conn

        async def close(self) -> None:
            if self._conn:
                self._conn.close()

    aiosqlite = _FakeAiosqlite()


# ── SQL 建表语句 ──────────────────────────────────────────────────────

SCHEMA_VERSION = 1

CREATE_TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS _schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT DEFAULT '{}',
        message_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at)
    """,
    """
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        metadata TEXT DEFAULT '{}',
        token_count INTEGER DEFAULT 0,
        engine_results TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)
    """,
    """
    CREATE TABLE IF NOT EXISTS knowledge_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        category TEXT DEFAULT 'general',
        tags TEXT DEFAULT '[]',
        source TEXT,
        embedding BLOB,
        metadata TEXT DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_items(category)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_knowledge_is_active ON knowledge_items(is_active)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge_items(title)
    """,
    """
    CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, preference_key)
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        data TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at)
    """,
    """
    CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache_entries(expires_at)
    """,
    """
    CREATE TABLE IF NOT EXISTS file_records (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT DEFAULT 'application/octet-stream',
        size_bytes INTEGER NOT NULL DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        session_id TEXT,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_file_records_session_id ON file_records(session_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS search_logs (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        results_count INTEGER NOT NULL DEFAULT 0,
        elapsed_ms REAL NOT NULL DEFAULT 0,
        engine_name TEXT,
        session_id TEXT,
        user_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_search_logs_engine ON search_logs(engine_name)
    """,
]


class PageInfo:
    """分页信息"""

    def __init__(
        self,
        total: int,
        offset: int,
        limit: int,
        items: list[dict[str, Any]],
    ):
        self.total = total
        self.offset = offset
        self.limit = limit
        self.items = items

    @property
    def has_next(self) -> bool:
        return self.offset + self.limit < self.total

    @property
    def has_prev(self) -> bool:
        return self.offset > 0

    @property
    def page(self) -> int:
        if self.limit <= 0:
            return 1
        return (self.offset // self.limit) + 1

    @property
    def total_pages(self) -> int:
        if self.limit <= 0:
            return 1
        return max(1, (self.total + self.limit - 1) // self.limit)

    def to_dict(self) -> dict[str, Any]:
        return {
            "total": self.total,
            "offset": self.offset,
            "limit": self.limit,
            "page": self.page,
            "total_pages": self.total_pages,
            "has_next": self.has_next,
            "has_prev": self.has_prev,
            "items": self.items,
        }


class AsyncDatabase:
    """异步数据库管理器

    基于 aiosqlite（或 sqlite3 回退）提供异步 CRUD 操作。

    Attributes:
        db_path: 数据库文件路径
        pool_size: 连接数限制
    """

    def __init__(
        self,
        db_path: str | Path = "/tmp/cee_data/cee.db",
        pool_size: int = 5,
        timeout: float = 30.0,
    ):
        self.db_path = str(db_path)
        self.pool_size = pool_size
        self.timeout = timeout
        self._conn: Any = None
        self._semaphore = asyncio.Semaphore(pool_size)
        self._initialized = False
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        """初始化数据库：创建目录、连接、建表"""
        if self._initialized:
            return

        async with self._lock:
            if self._initialized:
                return

            db_dir = Path(self.db_path).parent
            db_dir.mkdir(parents=True, exist_ok=True)

            if HAS_AIOSQLITE:
                self._conn = await aiosqlite.connect(
                    self.db_path,
                    timeout=self.timeout,
                )
                self._conn.row_factory = aiosqlite.Row
                await self._conn.execute("PRAGMA journal_mode=WAL")
                await self._conn.execute("PRAGMA foreign_keys=ON")
            else:
                self._conn = sqlite3.connect(
                    self.db_path,
                    timeout=self.timeout,
                )
                self._conn.row_factory = sqlite3.Row
                self._conn.execute("PRAGMA journal_mode=WAL")
                self._conn.execute("PRAGMA foreign_keys=ON")

            await self._apply_schema()

            self._initialized = True

    async def close(self) -> None:
        """关闭数据库连接"""
        if self._conn:
            if HAS_AIOSQLITE:
                await self._conn.close()
            else:
                self._conn.close()
            self._conn = None
            self._initialized = False

    async def _apply_schema(self) -> None:
        """应用数据库 schema"""
        current_version = await self._get_schema_version()

        for sql in CREATE_TABLES_SQL:
            if HAS_AIOSQLITE:
                await self._conn.execute(sql)
            else:
                self._conn.execute(sql)

        if current_version == 0:
            if HAS_AIOSQLITE:
                await self._conn.execute(
                    "INSERT INTO _schema_version (version) VALUES (?)",
                    (SCHEMA_VERSION,),
                )
            else:
                self._conn.execute(
                    "INSERT INTO _schema_version (version) VALUES (?)",
                    (SCHEMA_VERSION,),
                )

        if HAS_AIOSQLITE:
            await self._conn.commit()
        else:
            self._conn.commit()

    async def _get_schema_version(self) -> int:
        try:
            if HAS_AIOSQLITE:
                cursor = await self._conn.execute(
                    "SELECT version FROM _schema_version ORDER BY version DESC LIMIT 1"
                )
                row = await cursor.fetchone()
            else:
                cursor = self._conn.execute(
                    "SELECT version FROM _schema_version ORDER BY version DESC LIMIT 1"
                )
                row = cursor.fetchone()
            return row[0] if row else 0
        except Exception:
            return 0

    async def _execute(
        self, sql: str, params: tuple[Any, ...] | None = None
    ) -> Any:
        """执行 SQL 并返回 cursor"""
        if not self._initialized:
            await self.initialize()

        async with self._semaphore:
            if HAS_AIOSQLITE:
                cursor = await self._conn.execute(sql, params or ())
            else:
                cursor = self._conn.execute(sql, params or ())
            return cursor

    async def _fetchone(
        self, sql: str, params: tuple[Any, ...] | None = None
    ) -> dict[str, Any] | None:
        cursor = await self._execute(sql, params)
        if HAS_AIOSQLITE:
            row = await cursor.fetchone()
        else:
            row = cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def _fetchall(
        self, sql: str, params: tuple[Any, ...] | None = None
    ) -> list[dict[str, Any]]:
        cursor = await self._execute(sql, params)
        if HAS_AIOSQLITE:
            rows = await cursor.fetchall()
        else:
            rows = cursor.fetchall()
        return [dict(r) for r in rows]

    async def _commit(self) -> None:
        if HAS_AIOSQLITE:
            await self._conn.commit()
        else:
            self._conn.commit()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    @staticmethod
    def _new_id() -> str:
        return uuid.uuid4().hex

    # ── Sessions CRUD ──────────────────────────────────────────────

    async def create_session(
        self,
        user_id: str | None = None,
        title: str = "",
        metadata: dict[str, Any] | None = None,
        expires_in: int | None = 3600,
    ) -> dict[str, Any]:
        now = self._now()
        session = {
            "id": self._new_id(),
            "user_id": user_id,
            "title": title,
            "status": "active",
            "metadata": json.dumps(metadata or {}),
            "message_count": 0,
            "created_at": now,
            "updated_at": now,
            "expires_at": (
                datetime.now(timezone.utc).timestamp() + expires_in
                if expires_in
                else None
            ),
        }

        await self._execute(
            """INSERT INTO sessions (id, user_id, title, status, metadata,
               message_count, created_at, updated_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session["id"], session["user_id"], session["title"],
                session["status"], session["metadata"], session["message_count"],
                session["created_at"], session["updated_at"],
                datetime.fromtimestamp(session["expires_at"]).strftime("%Y-%m-%d %H:%M:%S")
                if session["expires_at"] else None,
            ),
        )
        await self._commit()
        return session

    async def get_session(self, session_id: str) -> dict[str, Any] | None:
        return await self._fetchone(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        )

    async def update_session(
        self, session_id: str, **fields: Any
    ) -> dict[str, Any] | None:
        if not fields:
            return await self.get_session(session_id)

        fields["updated_at"] = self._now()
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [session_id]

        await self._execute(
            f"UPDATE sessions SET {set_clause} WHERE id = ?",
            tuple(values),
        )
        await self._commit()
        return await self.get_session(session_id)

    async def delete_session(self, session_id: str) -> bool:
        await self._execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await self._execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await self._commit()
        return True

    async def list_sessions(
        self,
        user_id: str | None = None,
        status: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> PageInfo:
        conditions: list[str] = []
        params: list[Any] = []

        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""

        total_row = await self._fetchone(
            f"SELECT COUNT(*) as cnt FROM sessions{where}",
            tuple(params),
        )
        total = total_row["cnt"] if total_row else 0

        items = await self._fetchall(
            f"SELECT * FROM sessions{where} ORDER BY updated_at DESC LIMIT ? OFFSET ?",
            tuple(params + [limit, offset]),
        )

        return PageInfo(total=total, offset=offset, limit=limit, items=items)

    # ── Messages CRUD ──────────────────────────────────────────────

    async def create_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
        token_count: int = 0,
        engine_results: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        message = {
            "id": self._new_id(),
            "session_id": session_id,
            "role": role,
            "content": content,
            "metadata": json.dumps(metadata or {}),
            "token_count": token_count,
            "engine_results": json.dumps(engine_results or {}),
            "created_at": self._now(),
        }

        await self._execute(
            """INSERT INTO messages (id, session_id, role, content,
               metadata, token_count, engine_results, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                message["id"], message["session_id"], message["role"],
                message["content"], message["metadata"], message["token_count"],
                message["engine_results"], message["created_at"],
            ),
        )

        await self._execute(
            "UPDATE sessions SET message_count = message_count + 1, updated_at = ? WHERE id = ?",
            (self._now(), session_id),
        )

        await self._commit()
        return message

    async def get_message(self, message_id: str) -> dict[str, Any] | None:
        return await self._fetchone(
            "SELECT * FROM messages WHERE id = ?", (message_id,)
        )

    async def update_message(
        self, message_id: str, **fields: Any
    ) -> dict[str, Any] | None:
        if not fields:
            return await self.get_message(message_id)

        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [message_id]

        await self._execute(
            f"UPDATE messages SET {set_clause} WHERE id = ?",
            tuple(values),
        )
        await self._commit()
        return await self.get_message(message_id)

    async def delete_message(self, message_id: str) -> bool:
        row = await self._fetchone("SELECT session_id FROM messages WHERE id = ?", (message_id,))
        await self._execute("DELETE FROM messages WHERE id = ?", (message_id,))
        if row:
            await self._execute(
                "UPDATE sessions SET message_count = MAX(0, message_count - 1), updated_at = ? WHERE id = ?",
                (self._now(), row["session_id"]),
            )
        await self._commit()
        return True

    async def list_messages(
        self,
        session_id: str | None = None,
        role: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> PageInfo:
        conditions: list[str] = []
        params: list[Any] = []

        if session_id:
            conditions.append("session_id = ?")
            params.append(session_id)
        if role:
            conditions.append("role = ?")
            params.append(role)

        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""

        total_row = await self._fetchone(
            f"SELECT COUNT(*) as cnt FROM messages{where}",
            tuple(params),
        )
        total = total_row["cnt"] if total_row else 0

        items = await self._fetchall(
            f"SELECT * FROM messages{where} ORDER BY created_at ASC LIMIT ? OFFSET ?",
            tuple(params + [limit, offset]),
        )

        return PageInfo(total=total, offset=offset, limit=limit, items=items)

    # ── Knowledge Items CRUD ───────────────────────────────────────

    async def create_knowledge_item(
        self,
        title: str,
        content: str,
        category: str = "general",
        tags: list[str] | None = None,
        source: str | None = None,
        embedding: bytes | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        item = {
            "id": self._new_id(),
            "title": title,
            "content": content,
            "category": category,
            "tags": json.dumps(tags or []),
            "source": source,
            "embedding": embedding,
            "metadata": json.dumps(metadata or {}),
            "version": 1,
            "is_active": 1,
            "created_at": self._now(),
            "updated_at": self._now(),
        }

        await self._execute(
            """INSERT INTO knowledge_items (id, title, content, category, tags,
               source, embedding, metadata, version, is_active, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item["id"], item["title"], item["content"], item["category"],
                item["tags"], item["source"], item["embedding"], item["metadata"],
                item["version"], item["is_active"], item["created_at"], item["updated_at"],
            ),
        )
        await self._commit()
        return item

    async def get_knowledge_item(self, item_id: str) -> dict[str, Any] | None:
        return await self._fetchone(
            "SELECT * FROM knowledge_items WHERE id = ?", (item_id,)
        )

    async def update_knowledge_item(
        self, item_id: str, **fields: Any
    ) -> dict[str, Any] | None:
        if not fields:
            return await self.get_knowledge_item(item_id)

        fields["updated_at"] = self._now()
        fields["version"] = (await self._fetchone(
            "SELECT version FROM knowledge_items WHERE id = ?", (item_id,)
        ) or {}).get("version", 0) + 1

        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [item_id]

        await self._execute(
            f"UPDATE knowledge_items SET {set_clause} WHERE id = ?",
            tuple(values),
        )
        await self._commit()
        return await self.get_knowledge_item(item_id)

    async def delete_knowledge_item(self, item_id: str) -> bool:
        await self._execute("DELETE FROM knowledge_items WHERE id = ?", (item_id,))
        await self._commit()
        return True

    async def list_knowledge_items(
        self,
        category: str | None = None,
        is_active: bool | None = True,
        query: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> PageInfo:
        conditions: list[str] = []
        params: list[Any] = []

        if category:
            conditions.append("category = ?")
            params.append(category)
        if is_active is not None:
            conditions.append("is_active = ?")
            params.append(1 if is_active else 0)
        if query:
            conditions.append("(title LIKE ? OR content LIKE ?)")
            like = f"%{query}%"
            params.extend([like, like])

        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""

        total_row = await self._fetchone(
            f"SELECT COUNT(*) as cnt FROM knowledge_items{where}",
            tuple(params),
        )
        total = total_row["cnt"] if total_row else 0

        items = await self._fetchall(
            f"SELECT * FROM knowledge_items{where} ORDER BY updated_at DESC LIMIT ? OFFSET ?",
            tuple(params + [limit, offset]),
        )

        return PageInfo(total=total, offset=offset, limit=limit, items=items)

    # ── User Preferences CRUD ──────────────────────────────────────

    async def set_preference(self, user_id: str, key: str, value: Any) -> dict[str, Any]:
        pref_id = f"{user_id}:{key}"
        value_str = json.dumps(value) if not isinstance(value, str) else value
        now = self._now()

        existing = await self._fetchone(
            "SELECT id FROM user_preferences WHERE user_id = ? AND preference_key = ?",
            (user_id, key),
        )

        if existing:
            await self._execute(
                "UPDATE user_preferences SET preference_value = ?, updated_at = ? WHERE id = ?",
                (value_str, now, existing["id"]),
            )
        else:
            await self._execute(
                "INSERT INTO user_preferences (id, user_id, preference_key, preference_value, updated_at) VALUES (?, ?, ?, ?, ?)",
                (pref_id, user_id, key, value_str, now),
            )

        await self._commit()
        return {"user_id": user_id, "key": key, "value": value}

    async def get_preference(self, user_id: str, key: str) -> Any | None:
        row = await self._fetchone(
            "SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_key = ?",
            (user_id, key),
        )
        if row is None:
            return None
        value = row["preference_value"]
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    async def delete_preference(self, user_id: str, key: str) -> bool:
        await self._execute(
            "DELETE FROM user_preferences WHERE user_id = ? AND preference_key = ?",
            (user_id, key),
        )
        await self._commit()
        return True

    async def list_preferences(self, user_id: str) -> dict[str, Any]:
        rows = await self._fetchall(
            "SELECT preference_key, preference_value FROM user_preferences WHERE user_id = ?",
            (user_id,),
        )
        result: dict[str, Any] = {}
        for row in rows:
            value = row["preference_value"]
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                pass
            result[row["preference_key"]] = value
        return result

    # ── Analytics Events CRUD ──────────────────────────────────────

    async def track_event(
        self,
        event_type: str,
        user_id: str | None = None,
        session_id: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        event = {
            "id": self._new_id(),
            "event_type": event_type,
            "user_id": user_id,
            "session_id": session_id,
            "data": json.dumps(data or {}),
            "created_at": self._now(),
        }

        await self._execute(
            """INSERT INTO analytics_events (id, event_type, user_id, session_id, data, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                event["id"], event["event_type"], event["user_id"],
                event["session_id"], event["data"], event["created_at"],
            ),
        )
        await self._commit()
        return event

    async def list_events(
        self,
        event_type: str | None = None,
        user_id: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PageInfo:
        conditions: list[str] = []
        params: list[Any] = []

        if event_type:
            conditions.append("event_type = ?")
            params.append(event_type)
        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)

        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""

        total_row = await self._fetchone(
            f"SELECT COUNT(*) as cnt FROM analytics_events{where}",
            tuple(params),
        )
        total = total_row["cnt"] if total_row else 0

        items = await self._fetchall(
            f"SELECT * FROM analytics_events{where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            tuple(params + [limit, offset]),
        )

        return PageInfo(total=total, offset=offset, limit=limit, items=items)

    # ── Cache Entries CRUD ────────────────────────────────────────

    async def set_cache(
        self, key: str, value: Any, ttl: int | None = 300, metadata: dict[str, Any] | None = None
    ) -> None:
        value_str = json.dumps(value)
        expires_at = None
        if ttl is not None:
            expires_at = datetime.fromtimestamp(
                time.time() + ttl
            ).strftime("%Y-%m-%d %H:%M:%S")

        await self._execute(
            """INSERT OR REPLACE INTO cache_entries (key, value, metadata, expires_at, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (
                key, value_str, json.dumps(metadata or {}),
                expires_at, self._now(),
            ),
        )
        await self._commit()

    async def get_cache(self, key: str) -> Any | None:
        row = await self._fetchone(
            """SELECT value, expires_at FROM cache_entries WHERE key = ?
               AND (expires_at IS NULL OR expires_at > datetime('now'))""",
            (key,),
        )
        if row is None:
            return None
        try:
            return json.loads(row["value"])
        except (json.JSONDecodeError, TypeError):
            return row["value"]

    async def delete_cache(self, key: str) -> bool:
        await self._execute("DELETE FROM cache_entries WHERE key = ?", (key,))
        await self._commit()
        return True

    async def cleanup_expired_cache(self) -> int:
        cursor = await self._execute(
            "DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')"
        )
        if HAS_AIOSQLITE:
            count = cursor.rowcount
        else:
            count = cursor.rowcount
        await self._commit()
        return count if count is not None else 0

    # ── File Records CRUD ─────────────────────────────────────────

    async def create_file_record(
        self,
        filename: str,
        original_name: str,
        file_path: str,
        mime_type: str = "application/octet-stream",
        size_bytes: int = 0,
        metadata: dict[str, Any] | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        record = {
            "id": self._new_id(),
            "filename": filename,
            "original_name": original_name,
            "file_path": file_path,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "metadata": json.dumps(metadata or {}),
            "session_id": session_id,
            "uploaded_at": self._now(),
        }

        await self._execute(
            """INSERT INTO file_records (id, filename, original_name, file_path,
               mime_type, size_bytes, metadata, session_id, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                record["id"], record["filename"], record["original_name"],
                record["file_path"], record["mime_type"], record["size_bytes"],
                record["metadata"], record["session_id"], record["uploaded_at"],
            ),
        )
        await self._commit()
        return record

    async def get_file_record(self, record_id: str) -> dict[str, Any] | None:
        return await self._fetchone(
            "SELECT * FROM file_records WHERE id = ?", (record_id,)
        )

    async def delete_file_record(self, record_id: str) -> bool:
        await self._execute("DELETE FROM file_records WHERE id = ?", (record_id,))
        await self._commit()
        return True

    async def list_file_records(
        self,
        session_id: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> PageInfo:
        if session_id:
            where = " WHERE session_id = ?"
            params: tuple[Any, ...] = (session_id,)
        else:
            where = ""
            params = ()

        total_row = await self._fetchone(
            f"SELECT COUNT(*) as cnt FROM file_records{where}", params,
        )
        total = total_row["cnt"] if total_row else 0

        items = await self._fetchall(
            f"SELECT * FROM file_records{where} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?",
            params + (limit, offset),
        )

        return PageInfo(total=total, offset=offset, limit=limit, items=items)

    # ── Search Logs CRUD ───────────────────────────────────────────

    async def log_search(
        self,
        query: str,
        results_count: int = 0,
        elapsed_ms: float = 0.0,
        engine_name: str | None = None,
        session_id: str | None = None,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        entry = {
            "id": self._new_id(),
            "query": query,
            "results_count": results_count,
            "elapsed_ms": elapsed_ms,
            "engine_name": engine_name,
            "session_id": session_id,
            "user_id": user_id,
            "metadata": json.dumps(metadata or {}),
            "created_at": self._now(),
        }

        await self._execute(
            """INSERT INTO search_logs (id, query, results_count, elapsed_ms,
               engine_name, session_id, user_id, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                entry["id"], entry["query"], entry["results_count"],
                entry["elapsed_ms"], entry["engine_name"], entry["session_id"],
                entry["user_id"], entry["metadata"], entry["created_at"],
            ),
        )
        await self._commit()
        return entry

    async def list_search_logs(
        self,
        engine_name: str | None = None,
        user_id: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> PageInfo:
        conditions: list[str] = []
        params: list[Any] = []

        if engine_name:
            conditions.append("engine_name = ?")
            params.append(engine_name)
        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)

        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""

        total_row = await self._fetchone(
            f"SELECT COUNT(*) as cnt FROM search_logs{where}",
            tuple(params),
        )
        total = total_row["cnt"] if total_row else 0

        items = await self._fetchall(
            f"SELECT * FROM search_logs{where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            tuple(params + [limit, offset]),
        )

        return PageInfo(total=total, offset=offset, limit=limit, items=items)

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[Any]:
        """获取数据库连接的上下文管理器"""
        if not self._initialized:
            await self.initialize()

        async with self._semaphore:
            if HAS_AIOSQLITE:
                try:
                    yield self._conn
                finally:
                    pass

    # ── 健康检查 ───────────────────────────────────────────────────

    async def health_check(self) -> dict[str, Any]:
        """数据库健康检查"""
        try:
            row = await self._fetchone("SELECT 1 as ok")
            return {
                "status": "healthy",
                "connected": row is not None,
                "path": self.db_path,
                "initialized": self._initialized,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "path": self.db_path,
                "initialized": self._initialized,
            }


# ── 单例 ──────────────────────────────────────────────────────────────

_db_instance: AsyncDatabase | None = None
_db_lock = asyncio.Lock()


async def get_database(db_path: str | None = None) -> AsyncDatabase:
    """获取全局单例 AsyncDatabase"""
    global _db_instance
    if _db_instance is None:
        async with _db_lock:
            if _db_instance is None:
                _db_instance = AsyncDatabase(db_path or "/tmp/cee_data/cee.db")
                await _db_instance.initialize()
    return _db_instance


async def close_database() -> None:
    """关闭全局数据库实例"""
    global _db_instance
    if _db_instance:
        await _db_instance.close()
        _db_instance = None
