"""
Мост подсистемы шифрования.
Заглушки для шифрования и дешифрования директорий и файлов.
"""

import json
import os
from typing import Any, Dict, List

CONFIG_FILE = "config.json"


def list_paths() -> List[str]:
    """
    Читает пути из config.json (поле encrypt_paths).
    Возвращает список путей или пустой список при отсутствии.
    """
    if not os.path.exists(CONFIG_FILE):
        return []
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("encrypt_paths", [])
    except Exception:
        return []


def encrypt(paths: List[str], password: str) -> Dict[str, Any]:
    """Шифрование указанных путей мастер-паролем."""
    return {
        "ok": False,
        "msg": "crypt bridge not implemented",
        "data": None
    }


def decrypt(paths: List[str], password: str) -> Dict[str, Any]:
    """Дешифрование указанных путей мастер-паролем."""
    return {
        "ok": False,
        "msg": "crypt bridge not implemented",
        "data": None
    }
