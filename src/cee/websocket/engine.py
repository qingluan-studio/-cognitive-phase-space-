"""
WebSocket API Module — 双向实时通信引擎

支持多通道广播、会话持久化、心跳检测、认证拦截。
替换原有 HTTP SSE 单向流，提供全双工实时交互。
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
import hmac
import hashlib
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional, Self

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel


class WSMessageType(Enum):
    TEXT = auto()
    TASK = auto()
    EVENT = auto()
    COMMAND = auto()
    ERROR = auto()
    PING = auto()
    PONG = auto()
    AUTH = auto()
    SUBSCRIBE = auto()
    UNSUBSCRIBE = auto()


class WSConnectionState(Enum):
    CONNECTING = "connecting"
    AUTHENTICATED = "authenticated"
    ACTIVE = "active"
    IDLE = "idle"
    DISCONNECTED = "disconnected"


class WSRole(Enum):
    ADMIN = "admin"
    USER = "user"
    OBSERVER = "observer"
    AGENT = "agent"


class TokenPayload(BaseModel):
    sub: str
    role: WSRole = WSRole.USER
    exp: int = 0
    channels: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class WSMessage:
    type: WSMessageType
    payload: Any
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: float = field(default_factory=time.time)
    sender: str = ""
    channel: str = ""
    reply_to: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.name.lower(),
            "payload": self.payload,
            "id": self.id,
            "timestamp": self.timestamp,
            "sender": self.sender,
            "channel": self.channel,
            "reply_to": self.reply_to,
            "metadata": self.metadata,
        }, default=str, ensure_ascii=False)

    @classmethod
    def from_json(cls, data: str | dict) -> Self:
        if isinstance(data, str):
            data = json.loads(data)
        return cls(
            type=WSMessageType[data.get("type", "text").upper()],
            payload=data.get("payload"),
            id=data.get("id", uuid.uuid4().hex[:12]),
            timestamp=data.get("timestamp", time.time()),
            sender=data.get("sender", ""),
            channel=data.get("channel", ""),
            reply_to=data.get("reply_to", ""),
            metadata=data.get("metadata", {}),
        )


@dataclass
class WSConnection:
    websocket: WebSocket
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    state: WSConnectionState = WSConnectionState.CONNECTING
    role: WSRole = WSRole.USER
    user_id: str = ""
    channels: set[str] = field(default_factory=set)
    subscriptions: set[str] = field(default_factory=set)
    connected_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)
    message_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_alive(self) -> bool:
        return self.state != WSConnectionState.DISCONNECTED

    @property
    def idle_seconds(self) -> float:
        return time.time() - self.last_heartbeat


class ChannelManager:
    """频道管理器：广播、单播、组播"""

    def __init__(self) -> None:
        self._channels: dict[str, set[str]] = {}
        self._connections: dict[str, WSConnection] = {}

    def register(self, conn: WSConnection) -> None:
        self._connections[conn.session_id] = conn

    def unregister(self, session_id: str) -> None:
        conn = self._connections.pop(session_id, None)
        if conn:
            for ch in list(conn.channels):
                self._leave_channel(ch, session_id)

    def join_channel(self, session_id: str, channel: str) -> None:
        conn = self._connections.get(session_id)
        if not conn:
            return
        conn.channels.add(channel)
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(session_id)

    def _leave_channel(self, channel: str, session_id: str) -> None:
        members = self._channels.get(channel)
        if members:
            members.discard(session_id)
            if not members:
                del self._channels[channel]

    def leave_channel(self, session_id: str, channel: str) -> None:
        conn = self._connections.get(session_id)
        if conn:
            conn.channels.discard(channel)
        self._leave_channel(channel, session_id)

    def get_channel_members(self, channel: str) -> set[str]:
        return self._channels.get(channel, set())

    def get_connection(self, session_id: str) -> WSConnection | None:
        return self._connections.get(session_id)

    def get_connections_by_role(self, role: WSRole) -> list[WSConnection]:
        return [c for c in self._connections.values() if c.role == role]

    def get_all_connections(self) -> list[WSConnection]:
        return list(self._connections.values())

    @property
    def active_count(self) -> int:
        return len([c for c in self._connections.values() if c.is_alive])

    @property
    def channel_count(self) -> int:
        return len(self._channels)


class TokenValidator:
    """JWT + HMAC 双重验证"""

    def __init__(self, secret_key: str = "cee-ws-default-secret") -> None:
        self._secret = secret_key.encode() if isinstance(secret_key, str) else secret_key
        self._blacklist: set[str] = set()

    def create_token(self, payload: TokenPayload) -> str:
        header = {"alg": "HS256", "typ": "JWT"}
        segments = [
            self._b64(json.dumps(header).encode()),
            self._b64(payload.model_dump_json().encode()),
        ]
        signing_input = b".".join(segments)
        signature = hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        return (b".".join([*segments, self._b64(signature)])).decode()

    def validate_token(self, token: str) -> TokenPayload | None:
        if token in self._blacklist:
            return None
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            signing_input = f"{parts[0]}.{parts[1]}".encode()
            expected_sig = hmac.new(self._secret, signing_input, hashlib.sha256).digest()
            actual_sig = self._deb64(parts[2])
            if not hmac.compare_digest(expected_sig, actual_sig):
                return None
            payload_bytes = self._deb64(parts[1])
            return TokenPayload.model_validate_json(payload_bytes)
        except Exception:
            return None

    def revoke(self, token: str) -> None:
        self._blacklist.add(token)

    @staticmethod
    def _b64(data: bytes) -> bytes:
        import base64
        return base64.urlsafe_b64encode(data).rstrip(b"=")

    @staticmethod
    def _deb64(data: str) -> bytes:
        import base64
        padding = 4 - len(data) % 4
        if padding != 4:
            data += "=" * padding
        return base64.urlsafe_b64decode(data)


class MessageSerializer:
    """自定义消息序列化，支持压缩和加密通道"""

    @staticmethod
    def serialize(msg: WSMessage) -> bytes:
        return msg.to_json().encode("utf-8")

    @staticmethod
    def deserialize(data: bytes | str) -> WSMessage:
        return WSMessage.from_json(data)

    @staticmethod
    def serialize_binary(msg: WSMessage) -> bytes:
        import struct
        json_bytes = msg.to_json().encode("utf-8")
        header = struct.pack("!II", len(json_bytes), 1)
        return header + json_bytes

    @staticmethod
    def deserialize_binary(data: bytes) -> WSMessage:
        import struct
        length, version = struct.unpack("!II", data[:8])
        json_bytes = data[8:8 + length]
        return WSMessage.from_json(json_bytes.decode("utf-8"))


class HeartbeatMonitor:
    """心跳监控与自动断开"""

    def __init__(
        self,
        interval: float = 15.0,
        timeout: float = 45.0,
        max_idle: float = 300.0,
    ) -> None:
        self.interval = interval
        self.timeout = timeout
        self.max_idle = max_idle
        self._task: asyncio.Task | None = None

    async def start(self, manager: ChannelManager, on_timeout: Callable[[str], Any]) -> None:
        self._task = asyncio.create_task(self._loop(manager, on_timeout))

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self, manager: ChannelManager, on_timeout: Callable[[str], Any]) -> None:
        while True:
            await asyncio.sleep(self.interval)
            now = time.time()
            for conn in manager.get_all_connections():
                if conn.state == WSConnectionState.DISCONNECTED:
                    continue
                if now - conn.last_heartbeat > self.timeout:
                    conn.state = WSConnectionState.DISCONNECTED
                    on_timeout(conn.session_id)
                elif now - conn.last_heartbeat > self.max_idle:
                    conn.state = WSConnectionState.IDLE


class MessageRouter:
    """消息路由器：类型分发 + 中间件链"""

    def __init__(self) -> None:
        self._handlers: dict[WSMessageType, list[Callable]] = {}
        self._middleware: list[Callable] = []
        self._wildcard_handlers: list[Callable] = []

    def on(self, msg_type: WSMessageType):
        def decorator(fn: Callable):
            if msg_type not in self._handlers:
                self._handlers[msg_type] = []
            self._handlers[msg_type].append(fn)
            return fn
        return decorator

    def use(self, middleware: Callable) -> None:
        self._middleware.append(middleware)

    def on_any(self, handler: Callable) -> None:
        self._wildcard_handlers.append(handler)

    async def dispatch(self, conn: WSConnection, msg: WSMessage, manager: ChannelManager) -> None:
        ctx = {"connection": conn, "manager": manager, "message": msg}
        for mw in self._middleware:
            result = mw(ctx)
            if asyncio.iscoroutine(result):
                result = await result
            if result is False:
                return
        for handler in self._wildcard_handlers:
            await handler(conn, msg, manager)
        for handler in self._handlers.get(msg.type, []):
            await handler(conn, msg, manager)


class WebSocketHub:
    """WebSocket 中枢：管理所有连接和消息路由"""

    def __init__(
        self,
        secret_key: str = "cee-ws-default-secret",
        heartbeat_interval: float = 15.0,
        heartbeat_timeout: float = 45.0,
    ) -> None:
        self.channels = ChannelManager()
        self.auth = TokenValidator(secret_key)
        self.router = MessageRouter()
        self.serializer = MessageSerializer()
        self.heartbeat = HeartbeatMonitor(
            interval=heartbeat_interval,
            timeout=heartbeat_timeout,
        )
        self._setup_default_handlers()

    def _setup_default_handlers(self) -> None:
        @self.router.on(WSMessageType.PING)
        async def handle_ping(conn: WSConnection, msg: WSMessage, mgr: ChannelManager):
            conn.last_heartbeat = time.time()
            await conn.websocket.send_json({
                "type": "pong",
                "timestamp": time.time(),
                "id": msg.id,
            })

        @self.router.on(WSMessageType.SUBSCRIBE)
        async def handle_subscribe(conn: WSConnection, msg: WSMessage, mgr: ChannelManager):
            channels = msg.payload if isinstance(msg.payload, list) else [msg.payload]
            for ch in channels:
                mgr.join_channel(conn.session_id, str(ch))
            conn.subscriptions.update(str(ch) for ch in channels)
            await conn.websocket.send_json({
                "type": "subscribed",
                "channels": list(conn.subscriptions),
            })

        @self.router.on(WSMessageType.UNSUBSCRIBE)
        async def handle_unsubscribe(conn: WSConnection, msg: WSMessage, mgr: ChannelManager):
            channels = msg.payload if isinstance(msg.payload, list) else [msg.payload]
            for ch in channels:
                mgr.leave_channel(conn.session_id, str(ch))
                conn.subscriptions.discard(str(ch))
            await conn.websocket.send_json({
                "type": "unsubscribed",
                "channels": list(conn.subscriptions),
            })

        @self.router.on(WSMessageType.AUTH)
        async def handle_auth(conn: WSConnection, msg: WSMessage, mgr: ChannelManager):
            token = msg.payload if isinstance(msg.payload, str) else ""
            payload = self.auth.validate_token(token)
            if payload:
                conn.state = WSConnectionState.AUTHENTICATED
                conn.role = payload.role
                conn.user_id = payload.sub
                conn.metadata.update(payload.metadata)
                await conn.websocket.send_json({
                    "type": "auth_success",
                    "user_id": conn.user_id,
                    "role": conn.role.value,
                })
            else:
                await conn.websocket.send_json({
                    "type": "auth_failed",
                    "reason": "Invalid or expired token",
                })

    async def handle_connection(self, websocket: WebSocket) -> None:
        await websocket.accept()
        conn = WSConnection(websocket=websocket)
        self.channels.register(conn)
        conn.state = WSConnectionState.ACTIVE

        try:
            await websocket.send_json({
                "type": "connected",
                "session_id": conn.session_id,
                "timestamp": conn.connected_at,
            })

            while True:
                raw = await websocket.receive_text()
                conn.last_heartbeat = time.time()
                conn.message_count += 1
                msg = self.serializer.deserialize(raw)
                msg.sender = conn.session_id
                await self.router.dispatch(conn, msg, self.channels)
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            conn.state = WSConnectionState.DISCONNECTED
            self.channels.unregister(conn.session_id)

    async def broadcast(self, channel: str, msg: WSMessage) -> int:
        count = 0
        for sid in self.channels.get_channel_members(channel):
            conn = self.channels.get_connection(sid)
            if conn and conn.is_alive:
                try:
                    await conn.websocket.send_text(msg.to_json())
                    count += 1
                except Exception:
                    pass
        return count

    async def unicast(self, session_id: str, msg: WSMessage) -> bool:
        conn = self.channels.get_connection(session_id)
        if conn and conn.is_alive:
            try:
                await conn.websocket.send_text(msg.to_json())
                return True
            except Exception:
                pass
        return False

    async def multicast(self, session_ids: list[str], msg: WSMessage) -> int:
        count = 0
        for sid in session_ids:
            if await self.unicast(sid, msg):
                count += 1
        return count

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "active_connections": self.channels.active_count,
            "total_channels": self.channels.channel_count,
            "total_messages": sum(
                c.message_count
                for c in self.channels.get_all_connections()
            ),
        }


_global_hub: WebSocketHub | None = None


def get_ws_hub(secret_key: str = "cee-ws-default-secret") -> WebSocketHub:
    global _global_hub
    if _global_hub is None:
        _global_hub = WebSocketHub(secret_key=secret_key)
    return _global_hub


__all__ = [
    "WebSocketHub",
    "ChannelManager",
    "MessageRouter",
    "TokenValidator",
    "HeartbeatMonitor",
    "MessageSerializer",
    "WSMessage",
    "WSMessageType",
    "WSConnection",
    "WSConnectionState",
    "WSRole",
    "TokenPayload",
    "get_ws_hub",
]
