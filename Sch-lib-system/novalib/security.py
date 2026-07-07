import base64
import hashlib
import hmac
import os


HASH_NAME = "sha256"
ITERATIONS = 240_000
SALT_BYTES = 16


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    salt = os.urandom(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), salt, ITERATIONS)
    payload = b"$".join(
        [
            HASH_NAME.encode("ascii"),
            str(ITERATIONS).encode("ascii"),
            base64.b64encode(salt),
            base64.b64encode(digest),
        ]
    )
    return payload.decode("ascii")


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        name, raw_iterations, raw_salt, raw_digest = stored_hash.encode("ascii").split(b"$")
        salt = base64.b64decode(raw_salt)
        expected = base64.b64decode(raw_digest)
        iterations = int(raw_iterations.decode("ascii"))
    except (ValueError, TypeError):
        return False

    actual = hashlib.pbkdf2_hmac(name.decode("ascii"), password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)

