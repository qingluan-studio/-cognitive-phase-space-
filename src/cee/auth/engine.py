"""
Authentication & Authorization Module — JWT/OAuth2 认证引擎

支持多认证策略、RBAC 角色控制、会话管理、API Key 体系、
请求限流签名验证。
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
from typing import Any, Callable, Optional

import jwt as pyjwt


class AuthStrategy(Enum):
    JWT = "jwt"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    HMAC = "hmac"
    BASIC = "basic"
    CUSTOM = "custom"


class Permission(Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    EXECUTE = "execute"
    DELETE = "delete"
    MANAGE_USERS = "manage_users"
    MANAGE_MODELS = "manage_models"
    VIEW_LOGS = "view_logs"
    SYSTEM_CONFIG = "system_config"


class Role(Enum):
    ADMIN = ("admin", {Permission.ADMIN})
    EDITOR = ("editor", {Permission.READ, Permission.WRITE, Permission.EXECUTE})
    VIEWER = ("viewer", {Permission.READ})
    AGENT = ("agent", {Permission.READ, Permission.WRITE, Permission.EXECUTE})

    def __init__(self, label: str, perms: set[Permission]):
        self.label = label
        self.permissions = perms

    def has_permission(self, permission: Permission) -> bool:
        return Permission.ADMIN in self.permissions or permission in self.permissions


@dataclass
class UserIdentity:
    user_id: str
    username: str = ""
    email: str = ""
    roles: list[Role] = field(default_factory=lambda: [Role.VIEWER])
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)

    def has_permission(self, permission: Permission) -> bool:
        return any(role.has_permission(permission) for role in self.roles)

    def to_claims(self) -> dict:
        return {
            "sub": self.user_id,
            "username": self.username,
            "email": self.email,
            "roles": [r.label for r in self.roles],
            "metadata": self.metadata,
            "iat": int(self.created_at),
        }


@dataclass
class AuthToken:
    access_token: str
    refresh_token: str = ""
    token_type: str = "Bearer"
    expires_in: int = 3600
    scope: str = ""
    issued_at: float = field(default_factory=time.time)

    @property
    def is_expired(self) -> bool:
        return time.time() > self.issued_at + self.expires_in

    def to_response(self) -> dict:
        return {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "token_type": self.token_type,
            "expires_in": self.expires_in,
            "scope": self.scope,
        }


class APIKeyManager:
    """API Key 生成、验证、轮换管理"""

    PREFIX_LENGTH = 8
    KEY_LENGTH = 48

    def __init__(self) -> None:
        self._keys: dict[str, tuple[str, UserIdentity]] = {}
        self._revoked: set[str] = set()

    def create_key(self, user: UserIdentity, prefix: str = "cee") -> dict:
        raw = secrets.token_urlsafe(self.KEY_LENGTH)
        key_id = f"{prefix}_{raw[:self.PREFIX_LENGTH]}"
        hashed = hashlib.sha256(raw.encode()).hexdigest()
        self._keys[key_id] = (hashed, user)
        return {
            "key_id": key_id,
            "api_key": f"{key_id}.{raw}",
            "prefix": prefix,
            "created_at": time.time(),
        }

    def validate_key(self, api_key: str) -> UserIdentity | None:
        if api_key in self._revoked:
            return None
        try:
            key_id, raw = api_key.split(".", 1)
        except ValueError:
            return None
        stored = self._keys.get(key_id)
        if not stored:
            return None
        hashed_stored, user = stored
        if hmac.compare_digest(hashlib.sha256(raw.encode()).hexdigest(), hashed_stored):
            return user
        return None

    def revoke_key(self, key_id: str) -> bool:
        if key_id in self._keys:
            self._revoked.add(key_id)
            del self._keys[key_id]
            return True
        return False

    def rotate_key(self, key_id: str, user: UserIdentity) -> dict | None:
        if key_id not in self._keys:
            return None
        self.revoke_key(key_id)
        return self.create_key(user)


class JWTEngine:
    """JWT 颁发、验证、刷新引擎"""

    def __init__(
        self,
        secret_key: str | None = None,
        algorithm: str = "HS256",
        access_ttl: int = 3600,
        refresh_ttl: int = 86400 * 7,
    ) -> None:
        self.secret = secret_key or secrets.token_hex(32)
        self.algorithm = algorithm
        self.access_ttl = access_ttl
        self.refresh_ttl = refresh_ttl
        self._blacklist: set[str] = set()
        self._refresh_tokens: dict[str, dict] = {}

    def create_access_token(self, user: UserIdentity, extra_claims: dict | None = None) -> AuthToken:
        now = int(time.time())
        claims = {
            **user.to_claims(),
            "exp": now + self.access_ttl,
            "jti": uuid.uuid4().hex,
            "type": "access",
        }
        if extra_claims:
            claims.update(extra_claims)
        token = pyjwt.encode(claims, self.secret, algorithm=self.algorithm)
        return AuthToken(
            access_token=token if isinstance(token, str) else token.decode(),
            expires_in=self.access_ttl,
            token_type="Bearer",
            issued_at=now,
        )

    def create_refresh_token(self, user: UserIdentity) -> str:
        now = int(time.time())
        jti = uuid.uuid4().hex
        claims = {
            "sub": user.user_id,
            "exp": now + self.refresh_ttl,
            "jti": jti,
            "type": "refresh",
        }
        token = pyjwt.encode(claims, self.secret, algorithm=self.algorithm)
        token_str = token if isinstance(token, str) else token.decode()
        self._refresh_tokens[jti] = {
            "user_id": user.user_id,
            "token": token_str,
            "created": now,
            "used": False,
        }
        return token_str

    def verify_token(self, token: str) -> UserIdentity | None:
        if token in self._blacklist:
            return None
        try:
            payload = pyjwt.decode(token, self.secret, algorithms=[self.algorithm])
            if payload.get("type") != "access":
                return None
            return UserIdentity(
                user_id=payload["sub"],
                username=payload.get("username", ""),
                email=payload.get("email", ""),
                roles=[Role(r) for r in payload.get("roles", ["viewer"]) if r in [role.value for role in Role]],
                metadata=payload.get("metadata", {}),
            )
        except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
            return None

    def refresh_access_token(self, refresh_token: str) -> AuthToken | None:
        try:
            payload = pyjwt.decode(refresh_token, self.secret, algorithms=[self.algorithm])
            if payload.get("type") != "refresh":
                return None
            jti = payload["jti"]
            stored = self._refresh_tokens.get(jti)
            if not stored or stored["used"]:
                return None
            stored["used"] = True
            user = UserIdentity(
                user_id=payload["sub"],
                username=payload.get("username", ""),
            )
            return self.create_access_token(user)
        except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
            return None

    def revoke_all_user_tokens(self, user_id: str) -> int:
        count = 0
        for jti, data in list(self._refresh_tokens.items()):
            if data["user_id"] == user_id:
                self._blacklist.add(data["token"])
                del self._refresh_tokens[jti]
                count += 1
        return count

    def revoke_token(self, token: str) -> None:
        self._blacklist.add(token)


class HMACSigner:
    """请求签名验证，防重放攻击"""

    def __init__(self, secret_key: str | None = None) -> None:
        self.secret = (secret_key or secrets.token_hex(32)).encode()

    def sign(self, payload: dict) -> str:
        canonical = "&".join(f"{k}={v}" for k, v in sorted(payload.items()))
        return hmac.new(self.secret, canonical.encode(), hashlib.sha256).hexdigest()

    def verify(self, payload: dict, signature: str) -> bool:
        expected = self.sign(payload)
        return hmac.compare_digest(expected, signature)

    def create_signed_request(self, payload: dict) -> dict:
        payload["nonce"] = uuid.uuid4().hex
        payload["timestamp"] = int(time.time())
        payload["signature"] = self.sign(payload)
        return payload

    def verify_signed_request(self, payload: dict, max_age: int = 300) -> bool:
        payload = dict(payload)
        signature = payload.pop("signature", None)
        timestamp = payload.pop("timestamp", None)
        if not signature or not timestamp:
            return False
        if abs(time.time() - int(timestamp)) > max_age:
            return False
        nonce = payload.get("nonce")
        if not nonce:
            return False
        payload["timestamp"] = timestamp
        return self.verify(payload, signature)


class SessionManager:
    """会话管理器"""

    def __init__(self, ttl: int = 3600) -> None:
        self._sessions: dict[str, dict] = {}
        self.ttl = ttl

    def create(self, user: UserIdentity, metadata: dict | None = None) -> str:
        session_id = uuid.uuid4().hex
        self._sessions[session_id] = {
            "user": user,
            "created_at": time.time(),
            "last_active": time.time(),
            "metadata": metadata or {},
        }
        return session_id

    def get(self, session_id: str) -> tuple[UserIdentity, dict] | None:
        self._gc()
        session = self._sessions.get(session_id)
        if not session:
            return None
        if time.time() - session["created_at"] > self.ttl:
            del self._sessions[session_id]
            return None
        session["last_active"] = time.time()
        return session["user"], session["metadata"]

    def invalidate(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def _gc(self) -> None:
        now = time.time()
        expired = [sid for sid, s in self._sessions.items() if now - s["created_at"] > self.ttl]
        for sid in expired:
            del self._sessions[sid]

    @property
    def active_count(self) -> int:
        return len(self._sessions)


class AuthGuard:
    """认证守卫：多策略验证、声明检查、RBAC"""

    def __init__(
        self,
        jwt_engine: JWTEngine | None = None,
        api_key_mgr: APIKeyManager | None = None,
        session_mgr: SessionManager | None = None,
    ) -> None:
        self.jwt = jwt_engine or JWTEngine()
        self.api_keys = api_key_mgr or APIKeyManager()
        self.sessions = session_mgr or SessionManager()

    def authenticate(self, token: str | None = None, api_key: str | None = None, session_id: str | None = None) -> UserIdentity | None:
        if token:
            user = self.jwt.verify_token(token)
            if user:
                return user
        if api_key:
            user = self.api_keys.validate_key(api_key)
            if user:
                return user
        if session_id:
            result = self.sessions.get(session_id)
            if result:
                return result[0]
        return None

    def require_permission(self, *permissions: Permission):
        def decorator(fn: Callable):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                token = kwargs.pop("_auth_token", None)
                api_key = kwargs.pop("_api_key", None)
                user = self.authenticate(token=token, api_key=api_key)
                if not user:
                    raise PermissionError("Authentication required")
                for perm in permissions:
                    if not user.has_permission(perm):
                        raise PermissionError(f"Missing permission: {perm.value}")
                kwargs["_auth_user"] = user
                return fn(*args, **kwargs)
            return wrapper
        return decorator

    def create_user_token(self, user: UserIdentity) -> AuthToken:
        access = self.jwt.create_access_token(user)
        refresh = self.jwt.create_refresh_token(user)
        access.refresh_token = refresh
        return access

    def login(self, user: UserIdentity) -> dict:
        token = self.create_user_token(user)
        session_id = self.sessions.create(user)
        return {
            **token.to_response(),
            "session_id": session_id,
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "roles": [r.label for r in user.roles],
            },
        }

    def logout(self, session_id: str, token: str) -> None:
        self.sessions.invalidate(session_id)
        self.jwt.revoke_token(token)


__all__ = [
    "AuthGuard",
    "JWTEngine",
    "APIKeyManager",
    "HMACSigner",
    "SessionManager",
    "UserIdentity",
    "AuthToken",
    "AuthStrategy",
    "Permission",
    "Role",
]
