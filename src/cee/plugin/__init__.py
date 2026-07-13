"""CEE Plugin System — Dynamic extensibility with hooks and lifecycle.

Provides:
- BasePlugin: Abstract plugin with full lifecycle
- PluginManager: Registration, dependency resolution, enable/disable
- Hooks: System-wide extension points for intercepting operations
- PluginMetadata: Structured metadata with versioning and schemas
- Plugin discovery from directories with auto-import
"""

from .plugin_manager import (
    BasePlugin,
    Hooks,
    PluginCategory,
    PluginManager,
    PluginMetadata,
    PluginState,
)

from .builtin_plugins import (
    CachingPlugin,
    ResponseValidatorPlugin,
    SentimentPlugin,
    TextPreprocessorPlugin,
)

__all__ = [
    "BasePlugin",
    "PluginManager",
    "Hooks",
    "PluginCategory",
    "PluginState",
    "PluginMetadata",
    "TextPreprocessorPlugin",
    "ResponseValidatorPlugin",
    "SentimentPlugin",
    "CachingPlugin",
]
