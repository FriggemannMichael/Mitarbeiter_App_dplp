"""
Crypto-Service: AES-256-CBC PHP-kompatibel.

PHP-Algorithmus (ConfigRepository.php):
  key  = hash('sha256', ENCRYPTION_KEY, true)   → 32 raw bytes
  iv   = openssl_random_pseudo_bytes(16)
  enc  = openssl_encrypt(plain, 'AES-256-CBC', key, 0, iv)
  out  = base64_encode(iv . enc)                ← iv + base64-encrypted concateniert

Python muss exakt diesen Ablauf replizieren.
"""
import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', 'mitarbeiterapp_secret_key_change_in_production_2024')


def _get_key() -> bytes:
    """SHA-256 Hash des Encryption Keys → 32 raw bytes (wie PHP hash('sha256', key, true))."""
    return hashlib.sha256(ENCRYPTION_KEY.encode('utf-8')).digest()


def encrypt(plaintext: str) -> str:
    """Verschlüsselt einen String – kompatibel mit PHP openssl_encrypt."""
    key = _get_key()
    iv = os.urandom(16)

    # PKCS7-Padding
    padder = padding.PKCS7(128).padder()
    padded = padder.update(plaintext.encode('utf-8')) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted = encryptor.update(padded) + encryptor.finalize()

    # PHP: base64_encode(iv . openssl_encrypt(...))
    # openssl_encrypt gibt selbst base64 zurück, deshalb:
    # Wir imitieren: base64(iv + base64(encrypted))
    encrypted_b64 = base64.b64encode(encrypted).decode('utf-8')
    combined = iv + encrypted_b64.encode('utf-8')
    return base64.b64encode(combined).decode('utf-8')


def decrypt(encrypted_str: str) -> str:
    """Entschlüsselt einen PHP-verschlüsselten String."""
    if not encrypted_str:
        return ''
    try:
        key = _get_key()
        data = base64.b64decode(encrypted_str)

        if len(data) <= 16:
            return ''

        iv = data[:16]
        encrypted_b64 = data[16:].decode('utf-8')
        encrypted = base64.b64decode(encrypted_b64)

        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(encrypted) + decryptor.finalize()

        # PKCS7-Unpadding
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded) + unpadder.finalize()
        return plaintext.decode('utf-8')
    except Exception:
        return ''
