"""Fernet-based token encryption for YouTube OAuth tokens.

Never log plaintext or ciphertext values.  The encryption key must be
configured through ``settings.YOUTUBE_TOKEN_ENCRYPTION_KEY``.
"""

from django.conf import settings
from cryptography.fernet import Fernet


class TokenEncryptionError(Exception):
    """Raised when the encryption key is missing, invalid, or a token
    cannot be encrypted / decrypted."""


def _get_fernet() -> Fernet:
    key = settings.YOUTUBE_TOKEN_ENCRYPTION_KEY
    if not key:
        raise TokenEncryptionError(
            "YouTube token encryption key is not configured."
        )
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as exc:
        raise TokenEncryptionError(
            "YouTube token encryption key is not a valid Fernet key."
        ) from exc


def is_token_encryption_configured() -> bool:
    """Return ``True`` when the encryption key is present and a valid Fernet key."""
    try:
        _get_fernet()
    except TokenEncryptionError:
        return False
    return True


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext OAuth token string.

    Empty plaintext is preserved as an empty string so that callers can
    use it for optional fields (e.g. a missing refresh token).
    """
    if not plaintext:
        return ""
    f = _get_fernet()
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a Fernet-encrypted token string.

    Empty ciphertext is returned as-is.
    """
    if not ciphertext:
        return ""
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception as exc:
        raise TokenEncryptionError(
            "Failed to decrypt token — the encrypted value may be "
            "corrupt or was encrypted with a different key."
        ) from exc
