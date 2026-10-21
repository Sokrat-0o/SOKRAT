"""
Мост подсистемы DNS проекта SOKRAT.
Реализация сетевого управления DNS для ОС Windows через netsh и nslookup.
"""

import ctypes
import re
import subprocess
import sys
from typing import Any, Dict, List


def is_admin() -> bool:
    """Проверка прав Администратора в Windows."""
    if sys.platform != "win32":
        return False
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def list_adapters() -> List[str]:
    """
    Возвращает список подключенных сетевых адаптеров.
    Выполняет netsh interface show interface и парсит последний столбец.
    """
    if sys.platform != "win32":
        return ["Ethernet", "Wi-Fi"]

    try:
        proc = subprocess.run(
            ["netsh", "interface", "show", "interface"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        if proc.returncode != 0:
            return ["Ethernet", "Wi-Fi"]

        adapters: List[str] = []
        for line in proc.stdout.splitlines():
            line_clean = line.strip()
            if not line_clean:
                continue
            if "Connected" in line_clean or "Подключен" in line_clean:
                # Столбцы разделены 2+ пробелами, последний столбец — имя адаптера
                parts = re.split(r"\s{2,}", line_clean)
                if len(parts) >= 4:
                    adapter_name = parts[-1].strip()
                    if adapter_name and adapter_name not in adapters:
                        adapters.append(adapter_name)
                else:
                    # Fallback разбивка по пробелам (первые 3 поля служебные)
                    parts_ws = line_clean.split(None, 3)
                    if len(parts_ws) == 4:
                        adapter_name = parts_ws[3].strip()
                        if adapter_name and adapter_name not in adapters:
                            adapters.append(adapter_name)

        return adapters if adapters else ["Ethernet", "Wi-Fi"]
    except Exception:
        return ["Ethernet", "Wi-Fi"]


def set_dns(adapter: str, primary: str, secondary: str = "") -> Dict[str, Any]:
    """
    Установка DNS-серверов для указанного адаптера.
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    if not is_admin():
        return {"ok": False, "msg": "admin required", "data": None}

    try:
        # Установка основного DNS-сервера
        cmd1 = [
            "netsh", "dnsclient", "set", "dnsserver",
            f'name={adapter}',
            "source=static",
            f'address={primary}',
            "register=primary"
        ]
        proc1 = subprocess.run(cmd1, capture_output=True, text=True, encoding="cp866", errors="replace")
        if proc1.returncode != 0:
            err_msg = proc1.stderr.strip() or proc1.stdout.strip() or "error setting primary DNS"
            return {"ok": False, "msg": err_msg, "data": None}

        # Добавление дополнительного DNS-сервера при наличии
        if secondary:
            cmd2 = [
                "netsh", "dnsclient", "add", "dnsserver",
                f'name={adapter}',
                f'address={secondary}',
                "index=2"
            ]
            proc2 = subprocess.run(cmd2, capture_output=True, text=True, encoding="cp866", errors="replace")
            if proc2.returncode != 0:
                err_msg = proc2.stderr.strip() or proc2.stdout.strip() or "error setting secondary DNS"
                return {"ok": False, "msg": err_msg, "data": None}

        msg = f"DNS set: {primary}, {secondary}" if secondary else f"DNS set: {primary}"
        return {"ok": True, "msg": msg, "data": {"adapter": adapter}}
    except Exception as e:
        return {"ok": False, "msg": str(e), "data": None}


def reset_dns(adapter: str) -> Dict[str, Any]:
    """
    Сброс настроек DNS адаптера к получению по DHCP.
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    if not is_admin():
        return {"ok": False, "msg": "admin required", "data": None}

    try:
        cmd = [
            "netsh", "dnsclient", "set", "dnsserver",
            f'name={adapter}',
            "source=dhcp"
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="cp866", errors="replace")
        if proc.returncode != 0:
            err_msg = proc.stderr.strip() or proc.stdout.strip() or "error resetting DNS to DHCP"
            return {"ok": False, "msg": err_msg, "data": None}

        return {"ok": True, "msg": f"DNS reset to DHCP: {adapter}", "data": None}
    except Exception as e:
        return {"ok": False, "msg": str(e), "data": None}


def check_dns() -> Dict[str, Any]:
    """
    Проверка резолвера через nslookup example.com.
    Находит строку Server: или Сервер: и извлекает адрес.
    """
    if sys.platform != "win32":
        return {"ok": False, "msg": "windows only", "data": None}

    if not is_admin():
        return {"ok": False, "msg": "admin required", "data": None}

    try:
        proc = subprocess.run(
            ["nslookup", "example.com"],
            capture_output=True,
            text=True,
            encoding="cp866",
            errors="replace"
        )
        addr = None
        lines = proc.stdout.splitlines()

        for idx, line in enumerate(lines):
            line_str = line.strip()
            if "Server:" in line_str or "Сервер:" in line_str:
                val = line_str.split(":", 1)[1].strip()
                # Если в этой же строке адрес или имя:
                if val and val.lower() != "unknown":
                    addr = val
                # Либо проверяем следующую строку Address: / Адрес:
                elif idx + 1 < len(lines):
                    next_line = lines[idx + 1].strip()
                    if "Address:" in next_line or "Адрес:" in next_line:
                        addr = next_line.split(":", 1)[1].strip()
                    else:
                        addr = val or "unknown"
                else:
                    addr = val or "unknown"
                break

        if addr:
            return {"ok": True, "msg": f"resolver: {addr}", "data": {"server": addr}}
        else:
            err_msg = proc.stderr.strip() or proc.stdout.strip() or "resolver not found"
            return {"ok": False, "msg": err_msg, "data": None}
    except Exception as e:
        return {"ok": False, "msg": str(e), "data": None}
