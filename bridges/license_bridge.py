"""
Мост лицензирования и привязки к оборудованию (HWID) проекта SOKRAT.
Реализует стандартную локальную валидацию лицензии и рабочей директории в AppData.
"""

import hashlib
import json
import os
import subprocess
import sys
from typing import Any, Dict, List


def _get_hwid() -> str:
    """
    Получает идентификатор оборудования (UUID материнской платы и серийный номер системного диска).
    Возвращает первые 32 символа SHA-256 хэша.
    """
    if sys.platform != "win32":
        return hashlib.sha256(b"non-windows-dev-hwid").hexdigest()[:32]

    hwid_components = []

    # 1. UUID материнской платы через wmic
    try:
        proc_uuid = subprocess.run(
            ["wmic", "csproduct", "get", "uuid"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        lines = [line.strip() for line in proc_uuid.stdout.splitlines() if line.strip()]
        if len(lines) > 1:
            hwid_components.append(lines[1])
    except Exception:
        pass

    # 2. Серийный номер системного тома
    try:
        proc_disk = subprocess.run(
            ["wmic", "logicaldisk", "where", "DeviceID='C:'", "get", "VolumeSerialNumber"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        lines = [line.strip() for line in proc_disk.stdout.splitlines() if line.strip()]
        if len(lines) > 1:
            hwid_components.append(lines[1])
    except Exception:
        pass

    raw_id = ":".join(hwid_components) if hwid_components else "fallback_hwid_key"
    return hashlib.sha256(raw_id.encode("utf-8")).hexdigest()[:32]


def get_work_dir() -> str:
    """
    Возвращает путь к стандартной рабочей директории приложения в AppData.
    Создает директорию при отсутствии.
    """
    base_dir = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or os.path.expanduser("~")
    work_dir = os.path.join(base_dir, "Sokrat", "Config")
    os.makedirs(work_dir, exist_ok=True)
    return work_dir


def check_license() -> Dict[str, Any]:
    """
    Проверяет соответствие текущего HWID сохраненной лицензии в рабочей директории.
    """
    current_hwid = _get_hwid()
    config_file = os.path.join(get_work_dir(), "license.dat")

    if not os.path.exists(config_file):
        try:
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump({"hwid": current_hwid}, f, indent=2)
            return {"ok": True, "msg": "First run. HWID bound.", "data": {"hwid": current_hwid}}
        except Exception as e:
            return {"ok": False, "msg": f"Failed to initialize license: {e}", "data": None}

    try:
        with open(config_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            saved_hwid = data.get("hwid", "")

        if saved_hwid == current_hwid:
            return {"ok": True, "msg": "Valid HWID", "data": {"hwid": current_hwid}}
        else:
            return {"ok": False, "msg": "HWID mismatch.", "data": None}
    except Exception as e:
        return {"ok": False, "msg": f"Error reading license: {e}", "data": None}


def encrypt(paths: List[str], password: str) -> Dict[str, Any]:
    """Заглушка шифрования."""
    return {"ok": False, "msg": "Not implemented", "data": None}


def decrypt(paths: List[str], password: str) -> Dict[str, Any]:
    """Заглушка дешифрования."""
    return {"ok": False, "msg": "Not implemented", "data": None}
