"""
Message Queue Integration — 异步消息队列与事件驱动架构

支持进程内事件总线 (加强版) + Redis Pub/Sub + Kafka 适配。
提供多后端统一接口、死信队列、重试机制、消费组协调。
"""

from __future__ import annotations

import asyncio
import json
import threading
import time
import uuid
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Generic, Optional, TypeVar

T = TypeVar("T")


class MQBackend(Enum):
    MEMORY = "memory"
    REDIS = "redis"
    KAFKA = "kafka"
    RABBITMQ = "rabbitmq"


class DeliveryMode(Enum):
    AT_MOST_ONCE = auto()
    AT_LEAST_ONCE = auto()
    EXACTLY_ONCE = auto()


@dataclass
class Message:
    topic: str
    payload: Any
    key: str = ""
    message_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    timestamp: float = field(default_factory=time.time)
    headers: dict[str, str] = field(default_factory=dict)
    retry_count: int = 0
    partition: int = 0

    def to_json(self) -> str:
        return json.dumps({
            "topic": self.topic,
            "payload": self.payload,
            "key": self.key,
            "message_id": self.message_id,
            "timestamp": self.timestamp,
            "headers": self.headers,
            "retry_count": self.retry_count,
        }, default=str, ensure_ascii=False)

    @classmethod
    def from_json(cls, data: str) -> Message:
        d = json.loads(data)
        return cls(
            topic=d["topic"], payload=d["payload"], key=d.get("key", ""),
            message_id=d.get("message_id", uuid.uuid4().hex),
            timestamp=d.get("timestamp", time.time()),
            headers=d.get("headers", {}),
            retry_count=d.get("retry_count", 0),
        )


@dataclass
class ConsumerGroup:
    group_id: str
    topics: set[str] = field(default_factory=set)
    members: set[str] = field(default_factory=set)
    offset: dict[str, int] = field(default_factory=dict)


class DeadLetterQueue:
    def __init__(self, max_size: int = 10000) -> None:
        self._queue: deque[Message] = deque(maxlen=max_size)
        self._lock = threading.Lock()
        self._dead_count: dict[str, int] = {}

    def push(self, msg: Message, reason: str = "") -> None:
        msg.headers["dlq_reason"] = reason
        msg.headers["dlq_time"] = str(time.time())
        with self._lock:
            self._queue.append(msg)
            self._dead_count[msg.topic] = self._dead_count.get(msg.topic, 0) + 1

    def pull(self, topic: str | None = None, max_count: int = 10) -> list[Message]:
        with self._lock:
            if topic:
                msgs = [m for m in self._queue if m.topic == topic][:max_count]
            else:
                msgs = [self._queue.popleft() for _ in range(min(max_count, len(self._queue)))]
            return msgs

    def retry(self, publisher: MessagePublisher) -> int:
        count = 0
        with self._lock:
            while self._queue:
                msg = self._queue.popleft()
                msg.retry_count += 1
                publisher.publish(msg)
                count += 1
        return count

    @property
    def size(self) -> int:
        return len(self._queue)

    @property
    def stats(self) -> dict:
        return {"total_dead": len(self._queue), "by_topic": dict(self._dead_count)}


class RetryPolicy:
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, backoff: float = 2.0) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.backoff = backoff

    def delay_for(self, retry_count: int) -> float:
        return self.base_delay * (self.backoff ** min(retry_count, 10))

    def should_retry(self, msg: Message) -> bool:
        return msg.retry_count < self.max_retries


class BaseMQAdapter(ABC):
    @abstractmethod
    def connect(self) -> None: ...
    @abstractmethod
    def close(self) -> None: ...
    @abstractmethod
    def publish(self, msg: Message) -> bool: ...
    @abstractmethod
    def subscribe(self, topic: str, handler: Callable) -> str: ...
    @abstractmethod
    def unsubscribe(self, subscription_id: str) -> None: ...


class MemoryAdapter(BaseMQAdapter):
    """进程内内存消息队列"""

    def __init__(self) -> None:
        self._topics: dict[str, list[tuple[str, Callable]]] = {}
        self._lock = threading.Lock()
        self._pending: dict[str, deque[Message]] = {}

    def connect(self) -> None:
        pass

    def close(self) -> None:
        with self._lock:
            self._topics.clear()
            self._pending.clear()

    def publish(self, msg: Message) -> bool:
        with self._lock:
            handlers = self._topics.get(msg.topic, [])
        if not handlers:
            if msg.topic not in self._pending:
                self._pending[msg.topic] = deque()
            with self._lock:
                self._pending[msg.topic].append(msg)
            return True
        for _, handler in handlers:
            try:
                handler(msg)
            except Exception:
                pass
        return True

    def subscribe(self, topic: str, handler: Callable) -> str:
        sub_id = uuid.uuid4().hex
        with self._lock:
            if topic not in self._topics:
                self._topics[topic] = []
            self._topics[topic].append((sub_id, handler))
        if topic in self._pending:
            with self._lock:
                pending = list(self._pending.pop(topic, deque()))
            for msg in pending:
                try:
                    handler(msg)
                except Exception:
                    pass
        return sub_id

    def unsubscribe(self, subscription_id: str) -> None:
        with self._lock:
            for topic in list(self._topics.keys()):
                self._topics[topic] = [
                    (sid, h) for sid, h in self._topics[topic] if sid != subscription_id
                ]
                if not self._topics[topic]:
                    del self._topics[topic]

    @property
    def topic_list(self) -> list[str]:
        return list(self._topics.keys())


class RedisAdapter(BaseMQAdapter):
    """Redis Pub/Sub 适配器"""

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0) -> None:
        self.host = host
        self.port = port
        self.db = db
        self._client = None
        self._pubsub = None
        self._subscriptions: dict[str, str] = {}
        self._handlers: dict[str, Callable] = {}

    def connect(self) -> None:
        try:
            import redis
            self._client = redis.Redis(host=self.host, port=self.port, db=self.db)
            self._pubsub = self._client.pubsub()
        except ImportError:
            self._client = None

    def close(self) -> None:
        if self._pubsub:
            self._pubsub.close()
        if self._client:
            self._client.close()

    def publish(self, msg: Message) -> bool:
        if self._client:
            self._client.publish(msg.topic, msg.to_json())
            return True
        return False

    def subscribe(self, topic: str, handler: Callable) -> str:
        sub_id = uuid.uuid4().hex
        self._handlers[sub_id] = handler
        if self._pubsub:
            self._pubsub.subscribe(**{topic: lambda m: handler(Message.from_json(m["data"].decode()))})
        return sub_id

    def unsubscribe(self, subscription_id: str) -> None:
        self._handlers.pop(subscription_id, None)


class KafkaAdapter(BaseMQAdapter):
    """Kafka 适配器"""

    def __init__(self, bootstrap_servers: str = "localhost:9092", client_id: str = "cee") -> None:
        self.bootstrap = bootstrap_servers
        self.client_id = client_id
        self._producer = None
        self._consumer = None
        self._handlers: dict[str, Callable] = {}

    def connect(self) -> None:
        try:
            from kafka import KafkaProducer, KafkaConsumer
            self._producer = KafkaProducer(
                bootstrap_servers=self.bootstrap,
                value_serializer=lambda v: json.dumps(v).encode() if isinstance(v, dict) else str(v).encode(),
            )
            self._consumer = KafkaConsumer(
                bootstrap_servers=self.bootstrap,
                auto_offset_reset="earliest",
                group_id=self.client_id,
                value_deserializer=lambda v: json.loads(v.decode()),
            )
        except ImportError:
            pass

    def close(self) -> None:
        if self._producer:
            self._producer.close()
        if self._consumer:
            self._consumer.close()

    def publish(self, msg: Message) -> bool:
        if self._producer:
            self._producer.send(msg.topic, msg.payload)
            self._producer.flush()
            return True
        return False

    def subscribe(self, topic: str, handler: Callable) -> str:
        sub_id = uuid.uuid4().hex
        self._handlers[sub_id] = handler
        if self._consumer:
            self._consumer.subscribe([topic])
        return sub_id

    def unsubscribe(self, subscription_id: str) -> None:
        self._handlers.pop(subscription_id, None)


class MessagePublisher:
    def __init__(self, adapter: BaseMQAdapter, dlq: DeadLetterQueue | None = None, retry: RetryPolicy | None = None) -> None:
        self.adapter = adapter
        self.dlq = dlq or DeadLetterQueue()
        self.retry = retry or RetryPolicy()
        self._published: int = 0
        self._failed: int = 0

    def publish(self, msg: Message) -> bool:
        try:
            success = self.adapter.publish(msg)
            if success:
                self._published += 1
                return True
            self._failed += 1
            if self.retry.should_retry(msg):
                msg.retry_count += 1
                time.sleep(self.retry.delay_for(msg.retry_count))
                return self.publish(msg)
            self.dlq.push(msg, "publish_failed")
            return False
        except Exception as e:
            self._failed += 1
            self.dlq.push(msg, str(e))
            return False

    def publish_batch(self, messages: list[Message]) -> dict[str, int]:
        results = {"success": 0, "failed": 0}
        for msg in messages:
            if self.publish(msg):
                results["success"] += 1
            else:
                results["failed"] += 1
        return results

    def publish_json(self, topic: str, payload: Any, key: str = "") -> bool:
        return self.publish(Message(topic=topic, payload=payload, key=key))


class MessageSubscriber:
    def __init__(self, adapter: BaseMQAdapter) -> None:
        self.adapter = adapter
        self._subscriptions: dict[str, str] = {}
        self._handlers: dict[str, list[Callable]] = {}

    def on(self, topic: str):
        def decorator(fn: Callable):
            if topic not in self._handlers:
                self._handlers[topic] = []
            self._handlers[topic].append(fn)
            sub_id = self.adapter.subscribe(topic, fn)
            self._subscriptions[f"{topic}:{id(fn)}"] = sub_id
            return fn
        return decorator

    def subscribe(self, topic: str, handler: Callable) -> None:
        sub_id = self.adapter.subscribe(topic, handler)
        self._subscriptions[f"{topic}:{id(handler)}"] = sub_id

    def unsubscribe_all(self) -> None:
        for sub_id in self._subscriptions.values():
            self.adapter.unsubscribe(sub_id)
        self._subscriptions.clear()


class MessageQueue:
    """消息队列总控"""

    def __init__(
        self,
        backend: MQBackend = MQBackend.MEMORY,
        host: str = "localhost",
        port: int = 6379,
    ) -> None:
        match backend:
            case MQBackend.MEMORY:
                self.adapter = MemoryAdapter()
            case MQBackend.REDIS:
                self.adapter = RedisAdapter(host=host, port=port)
            case MQBackend.KAFKA:
                self.adapter = KafkaAdapter(bootstrap_servers=f"{host}:{port}")
            case _:
                self.adapter = MemoryAdapter()
        self.adapter.connect()
        self.dlq = DeadLetterQueue()
        self.publisher = MessagePublisher(self.adapter, self.dlq)
        self.subscriber = MessageSubscriber(self.adapter)

    def close(self) -> None:
        self.adapter.close()

    @property
    def stats(self) -> dict:
        return {
            "published": self.publisher._published,
            "failed": self.publisher._failed,
            "dlq_size": self.dlq.size,
            "dlq_stats": self.dlq.stats,
        }


__all__ = [
    "MessageQueue",
    "MessagePublisher",
    "MessageSubscriber",
    "DeadLetterQueue",
    "RetryPolicy",
    "MemoryAdapter",
    "RedisAdapter",
    "KafkaAdapter",
    "BaseMQAdapter",
    "Message",
    "ConsumerGroup",
    "MQBackend",
    "DeliveryMode",
]
