"""
Мост подсистемы Veyoff проекта SOKRAT.
Реализация управления процессом veyoff-windows.exe и службой VeyonService для Windows:
- status: опрос VeyonService через sc query и процесса через tasklist
- start: фоновый запуск без создания консольного окна
- stop: "мягкая" остановка через хоткей Ctrl+Alt+Q с фоллбэком на taskkill
- selfdestruct: посылка последовательности аварийного уничтожения Ctrl+Alt+X
"""

import ctypes
import ctypes.wintypes
import json
import os
import subprocess
import sys
import time
from typing import Any, Dict

CONFIG_FILE = "config.json"
KEYEVENTF_KEYUP = 0x0002


def is_admin() -> bool:
    """Проверка наличия прав Администратора в Windows."""
    if sys.platform != "win32":
        return False
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def _get_veyoff_path() -> str:
    """
    Читает путь к бинарнику veyoff из config.json ("veyoff_path").
    Проверяет существование файла и возвращает абсолютный путь либо пустую строку.
    """
    path = "veyoff\\veyoff-windows.exe"
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                path = data.get("veyoff_path", path)
        except Exception:
            pass

    # Проверка пути как относительно текущей папки, так и абсолютно
    if os.path.isabs(path) and os.path.exists(path):
        return path

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_path = os.path.join(base_dir, path)
    if os.path.exists(full_path):
        return full_path

    if os.path.exists(path):
        return os.path.abspath(path)

    return ""


def _send_hotkey(vk_list: list) -> None:
    """
    Эмулирует нажатие комбинации клавиш через user32.keybd_event.
    Нажимает клавиши по порядку, затем отпускает в обратном порядке.
    """
    if sys.platform != "win32":
        return

    try:
        user32 = ctypes.windll.user32
        # Нажатие всех клавиш
        for vk in vk_list:
            user32.keybd_event(ctypes.wintypes.BYTE(vk), 0, 0, 0)
            time.sleep(0.02)

        time.sleep(0.05)

        # Отпускание в обратном порядке
        for vk in reversed(vk_list):
            user32.keybd_event(ctypes.wintypes.BYTE(vk), 0, KEYEVENTF_KEYUP, 0)
            time.sleep(0.02)
    except Exception:
        pass


def status() -> Dict[str, Any]:
    """
    Проверяет статус службы VeyonService и процесса veyoff-windows.exe.
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    # 1. Проверка службы VeyonService
    try:
        proc_sc = subprocess.run(
            ["sc", "query", "VeyonService"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        sc_out = (proc_sc.stdout + " " + proc_sc.stderr).upper()

        if proc_sc.returncode != 0 and ("1060" in sc_out or "НЕ УСТАНОВЛЕНА" in sc_out or "DOES NOT EXIST" in sc_out):
            return {"ok": False, "msg": "VeyonService not found", "data": None}

        veyon_running = "RUNNING" in sc_out or "РАБОТАЕТ" in sc_out
        status_text = "RUNNING" if veyon_running else "STOPPED"
    except Exception as e:
        return {"ok": False, "msg": f"error querying VeyonService: {e}", "data": None}

    # 2. Проверка процесса veyoff-windows.exe через tasklist
    try:
        proc_task = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq veyoff-windows.exe"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        veyoff_running = "veyoff-windows.exe" in proc_task.stdout.lower()
        proxy_status = "RUNNING" if veyoff_running else "STOPPED"
    except Exception:
        veyoff_running = False
        proxy_status = "UNKNOWN"

    return {
        "ok": True,
        "msg": f"Veyon: {status_text}, Veyoff: {proxy_status}",
        "data": {
            "veyon_running": veyon_running,
            "veyoff_running": veyoff_running
        }
    }


def start() -> Dict[str, Any]:
    """
    Запуск veyoff-windows.exe в фоне без создания консольного окна.
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    if not is_admin():
        return {"ok": False, "msg": "admin required", "data": None}

    path = _get_veyoff_path()
    if not path:
        return {"ok": False, "msg": "veyoff-windows.exe not found", "data": None}

    try:
        creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        work_dir = os.path.dirname(os.path.abspath(path))
        subprocess.Popen([path], creationflags=creation_flags, cwd=work_dir)
        time.sleep(2)

        st = status()
        data = st.get("data")
        if data and data.get("veyoff_running") is True:
            return {"ok": True, "msg": "veyoff started successfully", "data": None}
        else:
            return {"ok": False, "msg": "veyoff failed to start", "data": None}
    except Exception as e:
        return {"ok": False, "msg": f"start error: {e}", "data": None}


def stop() -> Dict[str, Any]:
    """
    Остановка veyoff через хоткей Ctrl+Alt+Q (0x11, 0x12, 0x51).
    При необходимости принудительно завершает процесс через taskkill.
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    if not is_admin():
        return {"ok": False, "msg": "admin required", "data": None}

    try:
        # Посылка хоткея Ctrl + Alt + Q
        _send_hotkey([0x11, 0x12, 0x51])
        time.sleep(1)

        # Проверка завершения процесса
        st = status()
        data = st.get("data")
        veyoff_is_running = data.get("veyoff_running", False) if data else False

        if not veyoff_is_running:
            return {"ok": True, "msg": "veyoff stopped cleanly", "data": None}

        # Принудительное завершение, если процесс еще работает
        subprocess.run(
            ["taskkill", "/F", "/IM", "veyoff-windows.exe"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        return {"ok": True, "msg": "veyoff force killed", "data": None}
    except Exception as e:
        return {"ok": False, "msg": f"stop error: {e}", "data": None}


def selfdestruct() -> Dict[str, Any]:
    """
    Аварийное самоуничтожение: 5 раз посылает хоткей Ctrl+Alt+X (0x11, 0x12, 0x58).
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    if not is_admin():
        return {"ok": False, "msg": "admin required", "data": None}

    try:
        for _ in range(5):
            _send_hotkey([0x11, 0x12, 0x58])
            time.sleep(0.2)

        time.sleep(3)
        return {"ok": True, "msg": "self-destruct sequence sent. check process status.", "data": None}
    except Exception as e:
        return {"ok": False, "msg": f"selfdestruct error: {e}", "data": None}
