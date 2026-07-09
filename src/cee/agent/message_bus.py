"""CEE Agent Framework — Inter-agent message bus for asynchronous communication."""

from __future__ import annotations

import logging
import threading
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Callable

from .types import AgentMessage, MessageType

logger = logging.getLogger(__name__)


class MessageBus:
    """Pub-sub message bus for inter-agent communication.

    Supports direct messages, broadcasts, topic subscriptions,
    message filtering, and message history with time-to-live.
    """

    def __init__(self, max_history: int = 10000, ttl_seconds: int = 3600) -> None:
        self._subscribers: dict[str, list[Callable[[AgentMessage], Any]]] = defaultdict(list)
        self._history: list[AgentMessage] = []
        self._max_history = max_history
        self._ttl_seconds = ttl_seconds
        self._lock = threading.RLock()
        self._message_count: int = 0
        self._error_count: int = 0
        self._topics: dict[str, set[str]] = defaultdict(set)

    @property
    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "subscriber_count": len(self._subscribers),
                "history_size": len(self._history),
                "message_count": self._message_count,
                "error_count": self._error_count,
                "topic_count": len(self._topics),
            }

    def subscribe(self, agent_id: str, callback: Callable[[AgentMessage], Any]) -> None:
        with self._lock:
            self._subscribers[agent_id].append(callback)

    def unsubscribe(self, agent_id: str, callback: Callable[[AgentMessage], Any] | None = None) -> None:
        with self._lock:
            if callback is None:
                self._subscribers.pop(agent_id, None)
            else:
                callbacks = self._subscribers.get(agent_id, [])
                if callback in callbacks:
                    callbacks.remove(callback)

    def subscribe_topic(self, agent_id: str, topic: str) -> None:
        with self._lock:
            self._topics[topic].add(agent_id)

    def unsubscribe_topic(self, agent_id: str, topic: str) -> None:
        with self._lock:
            self._topics.get(topic, set()).discard(agent_id)

    def send(self, message: AgentMessage) -> None:
        with self._lock:
            self._history.append(message)
            self._message_count += 1
            if len(self._history) > self._max_history:
                self._history = self._history[-self._max_history // 2:]
        dispatched = False
        if message.receiver_id and message.receiver_id in self._subscribers:
            for cb in self._subscribers[message.receiver_id]:
                try:
                    cb(message)
                    dispatched = True
                except Exception as e:
                    self._error_count += 1
                    logger.error(f"Message dispatch error to {message.receiver_id}: {e}")
        if not dispatched and message.msg_type == MessageType.BROADCAST:
            for agent_id, callbacks in self._subscribers.items():
                if agent_id == message.sender_id:
                    continue
                for cb in callbacks:
                    try:
                        cb(message)
                    except Exception as e:
                        self._error_count += 1
                        logger.error(f"Broadcast dispatch error to {agent_id}: {e}")

    def publish(self, topic: str, message: AgentMessage) -> None:
        with self._lock:
            subs = set(self._topics[topic])
            for agent_id in subs:
                if agent_id == message.sender_id:
                    continue
                if agent_id in self._subscribers:
                    for cb in self._subscribers[agent_id]:
                        try:
                            cb(message)
                        except Exception:
                            self._error_count += 1

    def send_and_wait(self, message: AgentMessage, timeout: float = 30.0) -> Any | None:
        result_event = threading.Event()
        result_container: dict[str, Any] = {}

        def _reply_callback(reply: AgentMessage) -> None:
            if reply.correlation_id == message.msg_id:
                result_container["result"] = reply.content
                result_event.set()

        self.subscribe(message.sender_id, _reply_callback)
        self.send(message)
        if result_event.wait(timeout):
            if _reply_callback in self._subscribers.get(message.sender_id, []):
                self._subscribers[message.sender_id].remove(_reply_callback)
            return result_container.get("result")
        if _reply_callback in self._subscribers.get(message.sender_id, []):
            self._subscribers[message.sender_id].remove(_reply_callback)
        return None

    def get_history(self, agent_id: str | None = None, msg_type: MessageType | None = None,
                    limit: int = 100) -> list[AgentMessage]:
        with self._lock:
            results = self._history
            if agent_id:
                results = [m for m in results if m.sender_id == agent_id or m.receiver_id == agent_id]
            if msg_type:
                results = [m for m in results if m.msg_type == msg_type]
            return results[-limit:]

    def clear_history(self) -> None:
        with self._lock:
            self._history.clear()

    def reset(self) -> None:
        with self._lock:
            self._subscribers.clear()
            self._history.clear()
            self._topics.clear()
            self._message_count = 0
            self._error_count = 0

    def create_agent_mailbox(self, agent_id: str) -> "_AgentMailbox":
        return _AgentMailbox(agent_id, self)


class _AgentMailbox:
    """A private mailbox abstraction for an individual agent."""

    def __init__(self, agent_id: str, bus: MessageBus) -> None:
        self.agent_id = agent_id
        self._bus = bus
        self._inbox: list[AgentMessage] = []
        self._lock = threading.RLock()
        self._bus.subscribe(agent_id, self._receive)

    def _receive(self, message: AgentMessage) -> None:
        with self._lock:
            self._inbox.append(message)

    def fetch(self, limit: int = 50) -> list[AgentMessage]:
        with self._lock:
            msgs = self._inbox[:limit]
            self._inbox = self._inbox[limit:]
            return msgs

    def fetch_by_type(self, msg_type: MessageType) -> list[AgentMessage]:
        with self._lock:
            msgs = [m for m in self._inbox if m.msg_type == msg_type]
            for m in msgs:
                self._inbox.remove(m)
            return msgs

    def send(self, message: AgentMessage) -> None:
        message.sender_id = self.agent_id
        self._bus.send(message)

    def count(self) -> int:
        with self._lock:
            return len(self._inbox)
