"""
Модуль оформления и вспомогательных компонентов интерфейса SOKRAT.
Содержит цветовую палитру, шрифты и функции генерации виджетов CustomTkinter.
"""

import customtkinter as ctk

# ==================== ЦВЕТОВАЯ ПАЛИТРА ====================
BG = "#0D0D0D"
PANEL = "#1A1A1A"
BORDER = "#2A2A2A"
ACCENT = "#CC0000"
ACCENT_HOVER = "#E60000"
TEXT = "#E0E0E0"
TEXT_DIM = "#888888"
SUCCESS = "#00CC66"

# ==================== ТИПОГРАФИКА ====================
FONT_MONO = ("Consolas", 12)
FONT_MONO_BIG = ("Consolas", 14, "bold")
FONT_UI = ("Segoe UI", 13)
FONT_TITLE = ("Segoe UI Semibold", 16)

# ==================== ASCII БАННЕР ====================
ASCII_BANNER = (
    "███████╗ ██████╗ ██╗  ██╗██████╗  █████╗ ████████╗\n"
    "██╔════╝██╔═══██╗██║ ██╔╝██╔══██╗██╔══██╗╚══██╔══╝\n"
    "███████╗██║   ██║█████╔╝ ██████╔╝███████║   ██║   \n"
    "╚════██║██║   ██║██╔═██╗ ██╔══██╗██╔══██║   ██║   \n"
    "███████║╚██████╔╝██║  ██╗██║  ██║██║  ██║   ██║   \n"
    "╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   "
)


def banner(parent, compact: bool = False) -> ctk.CTkLabel:
    """Создает метку с ASCII-логотипом SOKRAT."""
    font = FONT_MONO if compact else FONT_MONO_BIG
    lbl = ctk.CTkLabel(
        parent,
        text=ASCII_BANNER,
        text_color=ACCENT,
        font=font,
        justify="left"
    )
    return lbl


def card(parent, title: str) -> ctk.CTkFrame:
    """
    Создает контейнер-панель с заголовком:
    fg_color=PANEL, border_color=BORDER, border_width=1, corner_radius=8.
    """
    frame = ctk.CTkFrame(
        parent,
        fg_color=PANEL,
        border_color=BORDER,
        border_width=1,
        corner_radius=8
    )
    if title:
        header = ctk.CTkLabel(
            frame,
            text=title,
            font=FONT_TITLE,
            text_color=TEXT,
            anchor="w"
        )
        header.pack(fill="x", padx=16, pady=(12, 8))
    return frame


def log_box(parent, height: int = 140) -> ctk.CTkTextbox:
    """
    Создает моноширинный терминальный блок логов:
    fg_color="#111111", text_color=TEXT, state="disabled".
    """
    box = ctk.CTkTextbox(
        parent,
        height=height,
        font=FONT_MONO,
        fg_color="#111111",
        text_color=TEXT,
        border_color=BORDER,
        border_width=1,
        corner_radius=6,
        wrap="char"
    )
    box.configure(state="disabled")
    return box


def append_log(box: ctk.CTkTextbox, text: str, color: str = None) -> None:
    """
    Добавляет строку в окно логов и прокручивает в конец.
    """
    box.configure(state="normal")
    box.insert("end", f"> {text}\n")
    box.see("end")
    box.configure(state="disabled")


def set_status(bar: ctk.CTkLabel, text: str) -> None:
    """Обновляет текст в статус-баре."""
    bar.configure(text=f"  {text}")
