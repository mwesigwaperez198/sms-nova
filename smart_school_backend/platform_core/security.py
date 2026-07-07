from __future__ import annotations

import base64
import hashlib
import hmac
import os
from dataclasses import dataclass

PBKDF2_ITERATIONS = 260_000
SALT_BYTES = 16


@dataclass(frozen=True)
class PasswordHash:
    algorithm: str
    iterations: int
    salt: str
    digest: str

    def encode(self) -> str:
        return f"{self.algorithm}${self.iterations}${self.salt}${self.digest}"


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    salt = os.urandom(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return PasswordHash("pbkdf2_sha256", PBKDF2_ITERATIONS, _b64(salt), _b64(digest)).encode()


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations, salt, digest = encoded_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        rounds = int(iterations)
        expected = _unb64(digest)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), _unb64(salt), rounds)
        return hmac.compare_digest(candidate, expected)
    except (ValueError, TypeError):
        return False
