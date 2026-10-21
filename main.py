"""
Главная точка входа приложения SOKRAT.
Реализует красно-чёрный терминальный интерфейс CustomTkinter:
- Двухфакторная авторизация (два мастер-пароля, 3 попытки)
- Индикатор прав Администратора
- Сайдбар с навигацией: Veyoff, DNS, Лицензия (HWID)
- Подключение мостов подсистем и отображение логов
"""

import ctypes
import json
import os
import sys
from typing import Any, Dict, List

import customtkinter as ctk
from tkinter import filedialog, messagebox

import auth
import ui_theme as theme
from bridges import dns_bridge, veyoff_bridge, license_bridge

# Настройка глобального режима CustomTkinter
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")


def load_config() -> Dict[str, Any]:
    """Загрузка конфигурации из файла config.json."""
    default_config = {
        "dns_preset": "cloudflare",
        "adapters": ["Ethernet"],
        "encrypt_paths": [],
        "blacklist": ["Firefox", "Chrome", "Signal"],
        "veyoff_path": "veyoff\\veyoff-windows.exe",
    }
    if not os.path.exists(CONFIG_PATH):
        return default_config
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default_config


def save_config(data: Dict[str, Any]) -> bool:
    """Сохранение конфигурации в файл config.json."""
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def is_admin() -> bool:
    """Проверка наличия прав Администратора."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


class SokratApp:
    def __init__(self):
        # Корневое окно
        self.root = ctk.CTk()
        self.root.title("SOKRAT — Control Panel")
        self.root.geometry("980x640")
        self.root.minsize(800, 520)
        self.root.configure(fg_color=theme.BG)
        self.root.withdraw()  # Скрыто до успешной авторизации

        # --- ПРОВЕРКА ЛИЦЕНЗИИ (HWID) ---
        lic = license_bridge.check_license()
        if not lic["ok"]:
            messagebox.showerror(
                "SOKRAT // System Error", 
                f"Ошибка привязки к оборудованию:\n\n{lic['msg']}\n\nПрограмма будет закрыта."
            )
            sys.exit(1)

        self.config_data = load_config()
        self.admin_status = is_admin()
        self.auth_attempts = 3

        # Окно аутентификации
        self.show_auth_window()

    # =========================================================================
    # ОКНО АУТЕНТИФИКАЦИИ
    # =========================================================================
    def show_auth_window(self):
        self.auth_win = ctk.CTkToplevel(self.root)
        self.auth_win.title("SOKRAT — Авторизация")
        self.auth_win.geometry("540x510")
        self.auth_win.resizable(False, False)
        self.auth_win.configure(fg_color=theme.BG)
        self.auth_win.transient(self.root)
        self.auth_win.grab_set()

        def on_close():
            self.root.destroy()
            sys.exit(0)

        self.auth_win.protocol("WM_DELETE_WINDOW", on_close)

        container = ctk.CTkFrame(
            self.auth_win,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            corner_radius=8,
        )
        container.pack(fill="both", expand=True, padx=20, pady=20)

        banner_lbl = theme.banner(container, compact=True)
        banner_lbl.pack(pady=(16, 10))

        sub_lbl = ctk.CTkLabel(
            container,
            text="TERMINAL SECURITY SYSTEM // 2-PHASE AUTH",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
        )
        sub_lbl.pack(pady=(0, 16))

        self.entry_p1 = ctk.CTkEntry(
            container,
            placeholder_text="Пароль 1",
            show="*",
            width=360,
            height=38,
            font=theme.FONT_UI,
            fg_color="#111111",
            border_color=theme.BORDER,
            text_color=theme.TEXT,
        )
        self.entry_p1.pack(pady=6)

        self.entry_p2 = ctk.CTkEntry(
            container,
            placeholder_text="Пароль 2",
            show="*",
            width=360,
            height=38,
            font=theme.FONT_UI,
            fg_color="#111111",
            border_color=theme.BORDER,
            text_color=theme.TEXT,
        )
        self.entry_p2.pack(pady=6)

        self.lbl_error = ctk.CTkLabel(
            container,
            text="",
            font=theme.FONT_MONO,
            text_color=theme.ACCENT,
        )
        self.lbl_error.pack(pady=(8, 4))

        self.btn_login = ctk.CTkButton(
            container,
            text="Войти",
            font=theme.FONT_MONO_BIG,
            fg_color=theme.ACCENT,
            hover_color=theme.ACCENT_HOVER,
            text_color="#FFFFFF",
            width=360,
            height=42,
            corner_radius=6,
            command=self.process_login,
        )
        self.btn_login.pack(pady=(8, 16))

        self.entry_p1.bind("<Return>", lambda e: self.entry_p2.focus())
        self.entry_p2.bind("<Return>", lambda e: self.process_login())
        self.entry_p1.focus()

    def process_login(self):
        p1 = self.entry_p1.get()
        p2 = self.entry_p2.get()

        if auth.check(p1, p2):
            self.auth_win.destroy()
            self.init_main_window()
            self.root.deiconify()
        else:
            self.auth_attempts -= 1
            if self.auth_attempts <= 0:
                self.root.destroy()
                sys.exit(1)
            else:
                self.lbl_error.configure(
                    text=f"Доступ запрещён. Осталось попыток: {self.auth_attempts}"
                )
                self.entry_p1.delete(0, "end")
                self.entry_p2.delete(0, "end")
                self.entry_p1.focus()

    # =========================================================================
    # ГЛАВНОЕ ОКНО
    # =========================================================================
    def init_main_window(self):
        self.root.grid_rowconfigure(0, weight=0, minsize=56)
        self.root.grid_rowconfigure(1, weight=1)
        self.root.grid_rowconfigure(2, weight=0, minsize=32)
        self.root.grid_columnconfigure(0, weight=1)

        self.build_top_bar()
        self.build_body()
        self.build_status_bar()

        if self.admin_status:
            self.switch_tab("veyoff")
        else:
            self.switch_tab("crypt")
            theme.set_status(
                self.status_bar_lbl,
                "Внимание: Запуск без прав Администратора. Veyoff и DNS отключены.",
            )

    # ------------------ TOP BAR ------------------
    def build_top_bar(self):
        top_bar = ctk.CTkFrame(
            self.root,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            corner_radius=0,
            height=56,
        )
        top_bar.grid(row=0, column=0, sticky="nsew")
        top_bar.grid_columnconfigure(1, weight=1)

        logo_lbl = ctk.CTkLabel(
            top_bar,
            text="[ SOKRAT v1.0 // RED CONTROL PANEL ]",
            font=theme.FONT_MONO_BIG,
            text_color=theme.ACCENT,
        )
        logo_lbl.grid(row=0, column=0, padx=16, pady=12, sticky="w")

        right_panel = ctk.CTkFrame(top_bar, fg_color="transparent")
        right_panel.grid(row=0, column=2, padx=16, pady=8, sticky="e")

        admin_text = "● ADMIN" if self.admin_status else "● NO ADMIN"
        admin_color = theme.SUCCESS if self.admin_status else theme.ACCENT

        lbl_admin = ctk.CTkLabel(
            right_panel,
            text=admin_text,
            font=theme.FONT_MONO_BIG,
            text_color=admin_color,
        )
        lbl_admin.pack(side="left", padx=(0, 16))

        btn_minimize = ctk.CTkButton(
            right_panel,
            text="—",
            width=36,
            height=32,
            font=theme.FONT_MONO_BIG,
            fg_color="transparent",
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            command=self.root.iconify,
        )
        btn_minimize.pack(side="left")

    # ------------------ BODY (SIDEBAR + CONTENT) ------------------
    def build_body(self):
        body = ctk.CTkFrame(self.root, fg_color=theme.BG, corner_radius=0)
        body.grid(row=1, column=0, sticky="nsew")
        body.grid_rowconfigure(0, weight=1)
        body.grid_columnconfigure(0, weight=0, minsize=200)
        body.grid_columnconfigure(1, weight=1)

        sidebar = ctk.CTkFrame(
            body,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            corner_radius=0,
            width=200,
        )
        sidebar.grid(row=0, column=0, sticky="nsew")
        sidebar.grid_propagate(False)

        btn_state = "normal" if self.admin_status else "disabled"
        self.nav_buttons = {}

        self.btn_tab_veyoff = ctk.CTkButton(
            sidebar,
            text="Veyoff",
            font=theme.FONT_UI,
            anchor="w",
            height=40,
            state=btn_state,
            command=lambda: self.switch_tab("veyoff"),
        )
        self.btn_tab_veyoff.pack(fill="x", padx=12, pady=(16, 6))
        self.nav_buttons["veyoff"] = self.btn_tab_veyoff

        self.btn_tab_dns = ctk.CTkButton(
            sidebar,
            text="DNS",
            font=theme.FONT_UI,
            anchor="w",
            height=40,
            state=btn_state,
            command=lambda: self.switch_tab("dns"),
        )
        self.btn_tab_dns.pack(fill="x", padx=12, pady=6)
        self.nav_buttons["dns"] = self.btn_tab_dns

        self.btn_tab_crypt = ctk.CTkButton(
            sidebar,
            text="Лицензия",
            font=theme.FONT_UI,
            anchor="w",
            height=40,
            command=lambda: self.switch_tab("crypt"),
        )
        self.btn_tab_crypt.pack(fill="x", padx=12, pady=6)
        self.nav_buttons["crypt"] = self.btn_tab_crypt

        btn_exit = ctk.CTkButton(
            sidebar,
            text="Выход",
            font=theme.FONT_UI,
            fg_color="transparent",
            hover_color=theme.BORDER,
            text_color=theme.ACCENT,
            anchor="w",
            height=40,
            command=self.exit_app,
        )
        btn_exit.pack(side="bottom", fill="x", padx=12, pady=16)

        self.content_area = ctk.CTkFrame(body, fg_color=theme.BG, corner_radius=0)
        self.content_area.grid(row=0, column=1, sticky="nsew", padx=16, pady=16)
        self.content_area.grid_rowconfigure(0, weight=1)
        self.content_area.grid_columnconfigure(0, weight=1)

        self.tab_frames = {
            "veyoff": self.create_veyoff_screen(),
            "dns": self.create_dns_screen(),
            "crypt": self.create_crypt_screen(),
        }

    # ------------------ STATUS BAR ------------------
    def build_status_bar(self):
        status_frame = ctk.CTkFrame(
            self.root,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            corner_radius=0,
            height=32,
        )
        status_frame.grid(row=2, column=0, sticky="nsew")

        self.status_bar_lbl = ctk.CTkLabel(
            status_frame,
            text="  Готов к работе. Система инициализирована.",
            font=theme.FONT_UI,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        self.status_bar_lbl.pack(fill="both", expand=True, padx=8)

    # ------------------ ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ------------------
    def switch_tab(self, tab_key: str):
        for key, frame in self.tab_frames.items():
            if key == tab_key:
                frame.grid(row=0, column=0, sticky="nsew")
            else:
                frame.grid_remove()

        for key, btn in self.nav_buttons.items():
            if key == tab_key:
                btn.configure(
                    fg_color=theme.ACCENT,
                    hover_color=theme.ACCENT_HOVER,
                    text_color="#FFFFFF",
                )
            else:
                btn.configure(
                    fg_color="transparent",
                    hover_color=theme.BORDER,
                    text_color=theme.TEXT,
                )

    # =========================================================================
    # ЭКРАН 1: VEYOFF
    # =========================================================================
    def create_veyoff_screen(self) -> ctk.CTkFrame:
        frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        frame.grid_rowconfigure(3, weight=1)
        frame.grid_columnconfigure(0, weight=1)

        service_card = theme.card(frame, "Управление службой Veyoff")
        service_card.grid(row=0, column=0, sticky="ew", pady=(0, 12))

        status_row = ctk.CTkFrame(service_card, fg_color="transparent")
        status_row.pack(fill="x", padx=16, pady=4)

        self.lbl_veyoff_status = ctk.CTkLabel(
            status_row,
            text="Статус: not connected",
            font=theme.FONT_TITLE,
            text_color=theme.ACCENT,
            anchor="w",
        )
        self.lbl_veyoff_status.pack(side="left")

        self.lbl_veyon_service = ctk.CTkLabel(
            status_row,
            text="VeyonService: unknown",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
            anchor="e",
        )
        self.lbl_veyon_service.pack(side="right")

        btn_row = ctk.CTkFrame(service_card, fg_color="transparent")
        btn_row.pack(fill="x", padx=16, pady=(10, 14))

        btn_start = ctk.CTkButton(
            btn_row,
            text="Запустить",
            font=theme.FONT_UI,
            fg_color=theme.ACCENT,
            hover_color=theme.ACCENT_HOVER,
            width=120,
            command=self.veyoff_start,
        )
        btn_start.pack(side="left", padx=(0, 8))

        btn_stop = ctk.CTkButton(
            btn_row,
            text="Остановить",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=120,
            command=self.veyoff_stop,
        )
        btn_stop.pack(side="left", padx=8)

        btn_selfdestruct = ctk.CTkButton(
            btn_row,
            text="Self-destruct",
            font=theme.FONT_UI,
            fg_color="#330000",
            hover_color="#550000",
            border_color=theme.ACCENT,
            border_width=1,
            text_color=theme.ACCENT,
            width=140,
            command=self.veyoff_selfdestruct_confirm,
        )
        btn_selfdestruct.pack(side="right")

        blacklist_card = theme.card(frame, "Черный список процессов (Blacklist)")
        blacklist_card.grid(row=1, column=0, sticky="ew", pady=(0, 12))

        self.txt_blacklist = ctk.CTkTextbox(
            blacklist_card,
            height=120,
            font=theme.FONT_MONO,
            fg_color="#111111",
            text_color=theme.TEXT,
            border_color=theme.BORDER,
            border_width=1,
            corner_radius=6,
        )
        self.txt_blacklist.pack(fill="x", padx=16, pady=8)

        bl_items = self.config_data.get("blacklist", [])
        self.txt_blacklist.insert("1.0", "\n".join(bl_items))

        btn_save_bl = ctk.CTkButton(
            blacklist_card,
            text="Сохранить blacklist",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=180,
            command=self.save_blacklist,
        )
        btn_save_bl.pack(anchor="w", padx=16, pady=(4, 14))

        log_label = ctk.CTkLabel(
            frame,
            text="ЛОГ СОБЫТИЙ VEYOFF",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        log_label.grid(row=2, column=0, sticky="w", pady=(4, 2))

        self.veyoff_log = theme.log_box(frame, height=130)
        self.veyoff_log.grid(row=3, column=0, sticky="nsew")

        return frame

    def veyoff_start(self):
        res = veyoff_bridge.start()
        theme.append_log(self.veyoff_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"Veyoff: {res['msg']}")

    def veyoff_stop(self):
        res = veyoff_bridge.stop()
        theme.append_log(self.veyoff_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"Veyoff: {res['msg']}")

    def veyoff_selfdestruct_confirm(self):
        confirm_win = ctk.CTkToplevel(self.root)
        confirm_win.title("Подтверждение Self-destruct")
        confirm_win.geometry("380x180")
        confirm_win.resizable(False, False)
        confirm_win.configure(fg_color=theme.BG)
        confirm_win.transient(self.root)
        confirm_win.grab_set()

        msg = ctk.CTkLabel(
            confirm_win,
            text="Точно? Это сотрёт следы работы системы.",
            font=theme.FONT_TITLE,
            text_color=theme.ACCENT,
            wraplength=340,
        )
        msg.pack(pady=(24, 20))

        btn_box = ctk.CTkFrame(confirm_win, fg_color="transparent")
        btn_box.pack(pady=10)

        def do_destroy():
            confirm_win.destroy()
            res = veyoff_bridge.selfdestruct()
            theme.append_log(self.veyoff_log, res["msg"])
            theme.set_status(self.status_bar_lbl, f"Self-destruct: {res['msg']}")

        btn_yes = ctk.CTkButton(
            btn_box,
            text="Да, стереть",
            font=theme.FONT_UI,
            fg_color=theme.ACCENT,
            hover_color=theme.ACCENT_HOVER,
            width=120,
            command=do_destroy,
        )
        btn_yes.pack(side="left", padx=10)

        btn_no = ctk.CTkButton(
            btn_box,
            text="Отмена",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            width=120,
            command=confirm_win.destroy,
        )
        btn_no.pack(side="left", padx=10)

    def save_blacklist(self):
        content = self.txt_blacklist.get("1.0", "end-1c").strip()
        lines = [line.strip() for line in content.split("\n") if line.strip()]
        self.config_data["blacklist"] = lines
        if save_config(self.config_data):
            theme.append_log(self.veyoff_log, "Blacklist успешно сохранен в config.json")
            theme.set_status(self.status_bar_lbl, "Blacklist сохранен.")
        else:
            theme.append_log(self.veyoff_log, "Ошибка записи в config.json")

    # =========================================================================
    # ЭКРАН 2: DNS
    # =========================================================================
    def create_dns_screen(self) -> ctk.CTkFrame:
        frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        frame.grid_rowconfigure(2, weight=1)
        frame.grid_columnconfigure(0, weight=1)

        card = theme.card(frame, "Сетевая конфигурация DNS")
        card.grid(row=0, column=0, sticky="ew", pady=(0, 16))

        adapters = dns_bridge.list_adapters()
        row_adapter = ctk.CTkFrame(card, fg_color="transparent")
        row_adapter.pack(fill="x", padx=16, pady=8)

        lbl_adapter = ctk.CTkLabel(
            row_adapter,
            text="Адаптер:",
            font=theme.FONT_UI,
            text_color=theme.TEXT,
            width=100,
            anchor="w",
        )
        lbl_adapter.pack(side="left")

        self.opt_adapter = ctk.CTkOptionMenu(
            row_adapter,
            values=adapters,
            font=theme.FONT_UI,
            fg_color="#111111",
            button_color=theme.PANEL,
            button_hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=220,
        )
        self.opt_adapter.pack(side="left")

        row_preset = ctk.CTkFrame(card, fg_color="transparent")
        row_preset.pack(fill="x", padx=16, pady=8)

        lbl_dns = ctk.CTkLabel(
            row_preset,
            text="DNS:",
            font=theme.FONT_UI,
            text_color=theme.TEXT,
            width=100,
            anchor="w",
        )
        lbl_dns.pack(side="left")

        self.opt_dns = ctk.CTkOptionMenu(
            row_preset,
            values=["Cloudflare", "Google", "Quad9", "Свой"],
            font=theme.FONT_UI,
            fg_color="#111111",
            button_color=theme.PANEL,
            button_hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=220,
            command=self.on_dns_preset_change,
        )
        self.opt_dns.pack(side="left")

        row_custom = ctk.CTkFrame(card, fg_color="transparent")
        row_custom.pack(fill="x", padx=16, pady=8)

        lbl_custom = ctk.CTkLabel(
            row_custom,
            text="Свой DNS:",
            font=theme.FONT_UI,
            text_color=theme.TEXT,
            width=100,
            anchor="w",
        )
        lbl_custom.pack(side="left")

        self.entry_custom_dns = ctk.CTkEntry(
            row_custom,
            placeholder_text="Например: 1.1.1.1, 1.0.0.1",
            font=theme.FONT_UI,
            fg_color="#111111",
            border_color=theme.BORDER,
            text_color=theme.TEXT,
            width=320,
            state="disabled",
        )
        self.entry_custom_dns.pack(side="left")

        btn_row = ctk.CTkFrame(card, fg_color="transparent")
        btn_row.pack(fill="x", padx=16, pady=(14, 16))

        btn_apply = ctk.CTkButton(
            btn_row,
            text="Применить",
            font=theme.FONT_UI,
            fg_color=theme.ACCENT,
            hover_color=theme.ACCENT_HOVER,
            width=120,
            command=self.dns_apply,
        )
        btn_apply.pack(side="left", padx=(0, 8))

        btn_reset = ctk.CTkButton(
            btn_row,
            text="Сбросить",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=120,
            command=self.dns_reset,
        )
        btn_reset.pack(side="left", padx=8)

        btn_check = ctk.CTkButton(
            btn_row,
            text="Проверить",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=120,
            command=self.dns_check,
        )
        btn_check.pack(side="left", padx=8)

        log_label = ctk.CTkLabel(
            frame,
            text="ЛОГ СЕТЕВЫХ ОПЕРАЦИЙ DNS",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        log_label.grid(row=1, column=0, sticky="w", pady=(4, 2))

        self.dns_log = theme.log_box(frame, height=180)
        self.dns_log.grid(row=2, column=0, sticky="nsew")

        return frame

    def on_dns_preset_change(self, value: str):
        if value == "Свой":
            self.entry_custom_dns.configure(state="normal")
            self.entry_custom_dns.focus()
        else:
            self.entry_custom_dns.configure(state="disabled")

    def dns_apply(self):
        adapter = self.opt_adapter.get()
        preset = self.opt_dns.get()
        p, s = "", ""
        if preset == "Cloudflare":
            p, s = "1.1.1.1", "1.0.0.1"
        elif preset == "Google":
            p, s = "8.8.8.8", "8.8.4.4"
        elif preset == "Quad9":
            p, s = "9.9.9.9", "149.112.112.112"
        elif preset == "Свой":
            custom_text = self.entry_custom_dns.get().strip()
            parts = [x.strip() for x in custom_text.split(",") if x.strip()]
            p = parts[0] if len(parts) > 0 else ""
            s = parts[1] if len(parts) > 1 else ""

        res = dns_bridge.set_dns(adapter, p, s)
        theme.append_log(self.dns_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"DNS: {res['msg']}")

    def dns_reset(self):
        adapter = self.opt_adapter.get()
        res = dns_bridge.reset_dns(adapter)
        theme.append_log(self.dns_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"DNS Reset: {res['msg']}")

    def dns_check(self):
        res = dns_bridge.check_dns()
        theme.append_log(self.dns_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"DNS Check: {res['msg']}")

    # =========================================================================
    # ЭКРАН 3: ЛИЦЕНЗИЯ (HWID)
    # =========================================================================
    def create_crypt_screen(self) -> ctk.CTkFrame:
        frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        frame.grid_rowconfigure(1, weight=1)
        frame.grid_columnconfigure(0, weight=1)

        card = theme.card(frame, "Статус лицензии и привязки (HWID)")
        card.grid(row=0, column=0, sticky="ew", pady=(0, 10))

        lbl_info = ctk.CTkLabel(
            card,
            text="Программа успешно привязана к текущему оборудованию.\nПри попытке переноса на другой ПК запуск будет заблокирован.",
            font=theme.FONT_UI,
            text_color=theme.TEXT,
            justify="left",
            anchor="w"
        )
        lbl_info.pack(fill="x", padx=16, pady=16)

        log_label = ctk.CTkLabel(
            frame,
            text="ЛОГ ПРОВЕРКИ ЛИЦЕНЗИИ",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        log_label.grid(row=1, column=0, sticky="w", pady=(2, 2))

        self.crypt_log = theme.log_box(frame, height=120)
        self.crypt_log.grid(row=2, column=0, sticky="nsew")

        return frame

    # ------------------ ВЫХОД ------------------
    def exit_app(self):
        self.root.destroy()
        sys.exit(0)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = SokratApp()
    app.run()