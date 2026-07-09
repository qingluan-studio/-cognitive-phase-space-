"""CEE Cloud — Auto-configuration and cloud deployment management.

Environment-aware auto-configuration for:
- Service discovery and registration
- Health monitoring with auto-recovery
- Deployment orchestration
- Resource provisioning
"""

from __future__ import annotations

import json
import logging
import os
import platform
import socket
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class DeploymentTarget(Enum):
    LOCAL = "local"
    DOCKER = "docker"
    KUBERNETES = "kubernetes"
    CLOUD_RUN = "cloud_run"
    EC2 = "ec2"
    LAMBDA = "lambda"


class ServiceStatus(Enum):
    UNKNOWN = "unknown"
    STARTING = "starting"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STOPPING = "stopping"
    STOPPED = "stopped"


class ResourceType(Enum):
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    GPU = "gpu"


@dataclass
class EnvironmentInfo:
    os_name: str = field(default_factory=platform.system)
    os_version: str = field(default_factory=platform.release)
    python_version: str = field(default_factory=platform.python_version)
    hostname: str = field(default_factory=socket.gethostname)
    cpu_count: int = field(default_factory=lambda: os.cpu_count() or 1)
    total_memory_mb: float = 0.0
    available_disk_gb: float = 0.0
    env_vars: dict[str, str] = field(default_factory=dict)
    detected_services: list[str] = field(default_factory=list)
    network_interfaces: list[str] = field(default_factory=list)
    is_container: bool = False
    is_cloud: bool = False
    cloud_provider: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "os": f"{self.os_name} {self.os_version}",
            "python": self.python_version,
            "hostname": self.hostname,
            "cpu_count": self.cpu_count,
            "total_memory_mb": self.total_memory_mb,
            "available_disk_gb": self.available_disk_gb,
            "is_container": self.is_container,
            "is_cloud": self.is_cloud,
            "cloud_provider": self.cloud_provider,
            "detected_services": self.detected_services,
        }


@dataclass
class ServiceInstance:
    service_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    host: str = "localhost"
    port: int = 8080
    status: ServiceStatus = ServiceStatus.UNKNOWN
    health_endpoint: str = "/health"
    metadata: dict[str, Any] = field(default_factory=dict)
    last_heartbeat: str = ""
    failure_count: int = 0
    restart_count: int = 0

    @property
    def address(self) -> str:
        return f"{self.host}:{self.port}"


@dataclass
class DeploymentConfig:
    target: DeploymentTarget = DeploymentTarget.LOCAL
    name: str = "cee-service"
    version: str = "1.1.0"
    replicas: int = 1
    cpu_limit: float = 1.0
    memory_limit_mb: int = 512
    ports: list[int] = field(default_factory=lambda: [8899])
    env: dict[str, str] = field(default_factory=dict)
    health_check_path: str = "/health"
    readiness_path: str = "/ready"
    auto_restart: bool = True
    max_restarts: int = 5
    grace_period_seconds: int = 30

    def to_dict(self) -> dict[str, Any]:
        return {
            "target": self.target.value,
            "name": self.name,
            "version": self.version,
            "replicas": self.replicas,
            "cpu_limit": self.cpu_limit,
            "memory_limit_mb": self.memory_limit_mb,
            "ports": self.ports,
            "env": self.env,
            "health_check_path": self.health_check_path,
            "auto_restart": self.auto_restart,
        }


class EnvironmentDetector:
    """Detects and reports the current execution environment."""

    def detect(self) -> EnvironmentInfo:
        info = EnvironmentInfo()
        try:
            with open("/proc/meminfo") as f:
                for line in f:
                    if "MemTotal" in line:
                        info.total_memory_mb = int(line.split()[1]) / 1024
                        break
        except Exception:
            info.total_memory_mb = 0
        try:
            stat = os.statvfs("/")
            info.available_disk_gb = (stat.f_frsize * stat.f_bavail) / (1024 ** 3)
        except Exception:
            info.available_disk_gb = 0
        info.is_container = os.path.exists("/.dockerenv") or "container" in os.environ.get("ENVIRONMENT", "").lower()
        info.is_cloud = bool(
            os.environ.get("KUBERNETES_SERVICE_HOST")
            or os.environ.get("CLOUD_RUN_JOB")
            or os.environ.get("AWS_EXECUTION_ENV")
        )
        if info.is_cloud:
            if os.environ.get("KUBERNETES_SERVICE_HOST"):
                info.cloud_provider = "kubernetes"
            elif os.environ.get("CLOUD_RUN_JOB"):
                info.cloud_provider = "gcp_cloud_run"
            elif os.environ.get("AWS_EXECUTION_ENV"):
                info.cloud_provider = "aws"
        safe_env_vars = {
            k: v for k, v in os.environ.items()
            if not any(secret in k.lower() for secret in ["key", "secret", "token", "password", "credential"])
        }
        info.env_vars = safe_env_vars
        port_indicators = {
            6379: "redis", 5432: "postgresql", 3306: "mysql",
            27017: "mongodb", 9200: "elasticsearch", 5672: "rabbitmq",
            8080: "http_service", 8899: "cee_api", 8898: "cee_chat",
        }
        for port, name in port_indicators.items():
            try:
                s = socket.socket()
                s.settimeout(0.1)
                if s.connect_ex(("localhost", port)) == 0:
                    info.detected_services.append(name)
                s.close()
            except Exception:
                pass
        return info

    def recommend_deployment(self, info: EnvironmentInfo | None = None) -> DeploymentTarget:
        if info is None:
            info = self.detect()
        if info.is_container and info.cloud_provider == "kubernetes":
            return DeploymentTarget.KUBERNETES
        if info.is_container:
            return DeploymentTarget.DOCKER
        if info.cloud_provider == "aws":
            return DeploymentTarget.EC2
        if info.cloud_provider == "gcp_cloud_run":
            return DeploymentTarget.CLOUD_RUN
        return DeploymentTarget.LOCAL


class HealthMonitor:
    """Monitors service health with configurable check intervals and auto-recovery."""

    def __init__(self, check_interval: float = 10.0,
                 failure_threshold: int = 3,
                 recovery_cooldown: float = 30.0) -> None:
        self.check_interval = check_interval
        self.failure_threshold = failure_threshold
        self.recovery_cooldown = recovery_cooldown
        self._services: dict[str, ServiceInstance] = {}
        self._check_history: dict[str, list[bool]] = {}
        self._alerts: list[dict[str, Any]] = []

    def register(self, service: ServiceInstance) -> None:
        self._services[service.service_id] = service
        self._check_history[service.service_id] = []

    def unregister(self, service_id: str) -> ServiceInstance | None:
        self._check_history.pop(service_id, None)
        return self._services.pop(service_id, None)

    def check(self, service_id: str) -> bool:
        service = self._services.get(service_id)
        if not service:
            return False
        try:
            s = socket.socket()
            s.settimeout(2.0)
            result = s.connect_ex((service.host, service.port)) == 0
            s.close()
        except Exception:
            result = False
        self._check_history.setdefault(service_id, []).append(result)
        history = self._check_history[service_id]
        if len(history) > 20:
            history.pop(0)
        if result:
            service.status = ServiceStatus.HEALTHY
            service.failure_count = 0
            service.last_heartbeat = datetime.now(timezone.utc).isoformat()
        else:
            service.failure_count += 1
            if service.failure_count >= self.failure_threshold:
                service.status = ServiceStatus.UNHEALTHY
                self._alerts.append({
                    "service_id": service_id,
                    "name": service.name,
                    "status": "unhealthy",
                    "failure_count": service.failure_count,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            elif service.failure_count > 0:
                service.status = ServiceStatus.DEGRADED
        return result

    def check_all(self) -> dict[str, bool]:
        results: dict[str, bool] = {}
        for sid in self._services:
            results[sid] = self.check(sid)
        return results

    def get_healthy(self) -> list[ServiceInstance]:
        return [s for s in self._services.values() if s.status == ServiceStatus.HEALTHY]

    def get_unhealthy(self) -> list[ServiceInstance]:
        return [s for s in self._services.values() if s.status == ServiceStatus.UNHEALTHY]

    def get_alerts(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._alerts[-limit:]

    def get_status(self) -> dict[str, Any]:
        return {
            "total_services": len(self._services),
            "healthy": len(self.get_healthy()),
            "unhealthy": len(self.get_unhealthy()),
            "services": {sid: {"name": s.name, "status": s.status.value,
                                "address": s.address, "failure_count": s.failure_count}
                          for sid, s in self._services.items()},
        }

    def reset(self) -> None:
        self._services.clear()
        self._check_history.clear()
        self._alerts.clear()


class CloudAutoConfig:
    """Orchestrates cloud environment auto-detection and configuration."""

    def __init__(self) -> None:
        self._detector = EnvironmentDetector()
        self._monitor = HealthMonitor()
        self._config: DeploymentConfig | None = None
        self._env_info: EnvironmentInfo | None = None

    @property
    def environment(self) -> EnvironmentInfo | None:
        return self._env_info

    @property
    def monitor(self) -> HealthMonitor:
        return self._monitor

    def detect(self) -> EnvironmentInfo:
        self._env_info = self._detector.detect()
        return self._env_info

    def auto_configure(self) -> DeploymentConfig:
        info = self.detect()
        target = self._detector.recommend_deployment(info)
        config = DeploymentConfig(
            target=target,
            cpu_limit=min(1.0, info.cpu_count / 4),
            memory_limit_mb=int(info.total_memory_mb / 4) if info.total_memory_mb > 0 else 256,
        )
        self._config = config
        return config

    def generate_dockerfile(self, config: DeploymentConfig | None = None) -> str:
        cfg = config or self._config or self.auto_configure()
        return f"""FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
COPY src/ src/

RUN pip install --no-cache-dir -e .

EXPOSE {cfg.ports[0]}

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:{cfg.ports[0]}{cfg.health_check_path}')" || exit 1

CMD ["cee-serve"]
"""

    def generate_k8s_manifest(self, config: DeploymentConfig | None = None) -> str:
        cfg = config or self._config or self.auto_configure()
        return f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {cfg.name}
  labels:
    app: {cfg.name}
    version: "{cfg.version}"
spec:
  replicas: {cfg.replicas}
  selector:
    matchLabels:
      app: {cfg.name}
  template:
    metadata:
      labels:
        app: {cfg.name}
        version: "{cfg.version}"
    spec:
      containers:
      - name: {cfg.name}
        image: {cfg.name}:{cfg.version}
        ports:
        - containerPort: {cfg.ports[0]}
        resources:
          limits:
            cpu: "{cfg.cpu_limit}"
            memory: "{cfg.memory_limit_mb}Mi"
          requests:
            cpu: "{cfg.cpu_limit / 2}"
            memory: "{cfg.memory_limit_mb // 2}Mi"
        livenessProbe:
          httpGet:
            path: {cfg.health_check_path}
            port: {cfg.ports[0]}
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: {cfg.readiness_path}
            port: {cfg.ports[0]}
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: {cfg.name}
spec:
  selector:
    app: {cfg.name}
  ports:
  - port: {cfg.ports[0]}
    targetPort: {cfg.ports[0]}
  type: ClusterIP
"""

    def generate_docker_compose(self, services: list[DeploymentConfig] | None = None) -> str:
        svcs = services or ([self._config] if self._config else [self.auto_configure()])
        lines = ['version: "3.8"', "", "services:"]
        for cfg in svcs:
            lines.append(f"  {cfg.name}:")
            lines.append(f"    build: .")
            lines.append(f'    image: {cfg.name}:{cfg.version}')
            lines.append(f"    ports:")
            for p in cfg.ports:
                lines.append(f'      - "{p}:{p}"')
            if cfg.env:
                lines.append("    environment:")
                for k, v in cfg.env.items():
                    lines.append(f'      - {k}={v}')
            if cfg.auto_restart:
                lines.append('    restart: unless-stopped')
            lines.append("")
        return "\n".join(lines)

    def get_status(self) -> dict[str, Any]:
        return {
            "environment": self._env_info.to_dict() if self._env_info else {},
            "config": self._config.to_dict() if self._config else {},
            "monitor": self._monitor.get_status(),
        }
