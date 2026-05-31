from cryptography.fernet import Fernet, InvalidToken
from django.core.exceptions import ImproperlyConfigured


def _load_encryption_key() -> str:
    """Load and validate the Fernet encryption key from settings.

    Raises ImproperlyConfigured if the key is missing or invalid.
    """
    from django.conf import settings

    key = settings.TOKEN_ENCRYPTION_KEY
    if not key:
        raise ImproperlyConfigured(
            "TOKEN_ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )
    try:
        Fernet(key.encode())
    except (ValueError, TypeError) as exc:
        raise ImproperlyConfigured(
            "TOKEN_ENCRYPTION_KEY is not a valid 32-byte URL-safe base64 Fernet key. "
            f"Error: {exc}"
        )
    return key


_ENCRYPTION_KEY = _load_encryption_key()


def get_fernet() -> Fernet:
    return Fernet(_ENCRYPTION_KEY.encode())


def encrypt_token(plain_text: str) -> bytes:
    return get_fernet().encrypt(plain_text.encode())


def decrypt_token(cipher_text: bytes) -> str:
    try:
        return get_fernet().decrypt(cipher_text).decode()
    except InvalidToken:
        raise ValueError("Decryption failed: invalid token or corrupted data")
