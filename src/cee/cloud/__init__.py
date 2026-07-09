"""CEE Cloud — Auto-configuration, environment detection, and deployment management.

Provides:
- EnvironmentDetector: Automatic environment detection (local, container, cloud)
- HealthMonitor: Service health checking with auto-recovery
- CloudAutoConfig: Orchestrated cloud auto-configuration
- DeploymentConfig: Structured deployment configuration
- Docker/K8s manifest generation
"""

from .auto_config import (
    CloudAutoConfig,
    DeploymentConfig,
    DeploymentTarget,
    EnvironmentDetector,
    EnvironmentInfo,
    HealthMonitor,
    ResourceType,
    ServiceInstance,
    ServiceStatus,
)

__all__ = [
    "CloudAutoConfig",
    "DeploymentConfig",
    "DeploymentTarget",
    "EnvironmentDetector",
    "EnvironmentInfo",
    "HealthMonitor",
    "ResourceType",
    "ServiceInstance",
    "ServiceStatus",
]
