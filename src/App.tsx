import React, { useState } from 'react';
import {
  Shield,
  Terminal,
  Code,
  KeyRound,
  Network,
  Lock,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Play,
  Square,
  Flame,
  Trash2,
  FolderPlus,
  RefreshCw,
  Folder,
  Layers
} from 'lucide-react';

const ASCII_BANNER = `███████╗ ██████╗ ██╗  ██╗██████╗  █████╗ ████████╗
██╔════╝██╔═══██╗██║ ██╔╝██╔══██╗██╔══██╗╚══██╔══╝
███████╗██║   ██║█████╔╝ ██████╔╝███████║   ██║   
╚════██║██║   ██║██╔═██╗ ██╔══██╗██╔══██║   ██║   
███████║╚██████╔╝██║  ██╗██║  ██║██║  ██║   ██║   
╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   `;

// Embedded files content for viewer and export
const PROJECT_FILES: Record<string, { desc: string; code: string; lang: string }> = {
  'main.py': {
    desc: 'Главная точка входа: окно авторизации, главное окно, сайдбар, 3 вкладки и статус-бар',
    lang: 'python',
    code: `"""
Главная точка входа приложения SOKRAT.
Реализует красно-чёрный терминальный интерфейс CustomTkinter:
- Двухфакторная авторизация (два мастер-пароля, 3 попытки)
- Индикатор прав Администратора
- Сайдбар с навигацией: Veyoff, DNS, Шифрование
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
from bridges import crypt_bridge, dns_bridge, veyoff_bridge

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
        "veyoff_path": "veyoff\\\\veyoff-windows.exe",
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

        # ASCII Баннер
        banner_lbl = theme.banner(container, compact=True)
        banner_lbl.pack(pady=(16, 10))

        sub_lbl = ctk.CTkLabel(
            container,
            text="TERMINAL SECURITY SYSTEM // 2-PHASE AUTH",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
        )
        sub_lbl.pack(pady=(0, 16))

        # Поля паролей
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

        # Метка ошибки
        self.lbl_error = ctk.CTkLabel(
            container,
            text="",
            font=theme.FONT_MONO,
            text_color=theme.ACCENT,
        )
        self.lbl_error.pack(pady=(8, 4))

        # Кнопка входа
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
            text="Шифрование",
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
        self.txt_blacklist.insert("1.0", "\\n".join(bl_items))

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
        lines = [line.strip() for line in content.split("\\n") if line.strip()]
        self.config_data["blacklist"] = lines
        if save_config(self.config_data):
            theme.append_log(self.veyoff_log, "Blacklist успешно сохранен в config.json")
            theme.set_status(self.status_bar_lbl, "Blacklist сохранен.")
        else:
            theme.append_log(self.veyoff_log, "Ошибка записи в config.json")

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

    def create_crypt_screen(self) -> ctk.CTkFrame:
        frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        frame.grid_rowconfigure(4, weight=1)
        frame.grid_columnconfigure(0, weight=1)

        card = theme.card(frame, "Шифрование данных и папок")
        card.grid(row=0, column=0, sticky="ew", pady=(0, 10))

        list_hdr = ctk.CTkLabel(
            card,
            text="Директории в списке шифрования:",
            font=theme.FONT_UI,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        list_hdr.pack(fill="x", padx=16, pady=(0, 4))

        self.scroll_paths = ctk.CTkScrollableFrame(
            card,
            height=110,
            fg_color="#111111",
            border_color=theme.BORDER,
            border_width=1,
            corner_radius=6,
        )
        self.scroll_paths.pack(fill="x", padx=16, pady=4)

        self.refresh_paths_ui()

        path_btn_row = ctk.CTkFrame(card, fg_color="transparent")
        path_btn_row.pack(fill="x", padx=16, pady=6)

        btn_add_folder = ctk.CTkButton(
            path_btn_row,
            text="Добавить папку",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=140,
            command=self.crypt_add_folder,
        )
        btn_add_folder.pack(side="left", padx=(0, 8))

        btn_clear_folders = ctk.CTkButton(
            path_btn_row,
            text="Очистить список",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=140,
            command=self.crypt_clear_folders,
        )
        btn_clear_folders.pack(side="left")

        pwd_row = ctk.CTkFrame(card, fg_color="transparent")
        pwd_row.pack(fill="x", padx=16, pady=(10, 8))

        lbl_pwd = ctk.CTkLabel(
            pwd_row,
            text="Пароль шифрования:",
            font=theme.FONT_UI,
            text_color=theme.TEXT,
            width=150,
            anchor="w",
        )
        lbl_pwd.pack(side="left")

        self.entry_crypt_pwd = ctk.CTkEntry(
            pwd_row,
            show="*",
            placeholder_text="Мастер-ключ",
            font=theme.FONT_UI,
            fg_color="#111111",
            border_color=theme.BORDER,
            text_color=theme.TEXT,
            width=280,
        )
        self.entry_crypt_pwd.pack(side="left")

        action_row = ctk.CTkFrame(card, fg_color="transparent")
        action_row.pack(fill="x", padx=16, pady=(6, 14))

        btn_encrypt = ctk.CTkButton(
            action_row,
            text="Зашифровать",
            font=theme.FONT_UI,
            fg_color=theme.ACCENT,
            hover_color=theme.ACCENT_HOVER,
            width=140,
            command=self.crypt_encrypt,
        )
        btn_encrypt.pack(side="left", padx=(0, 8))

        btn_decrypt = ctk.CTkButton(
            action_row,
            text="Расшифровать",
            font=theme.FONT_UI,
            fg_color=theme.PANEL,
            border_color=theme.BORDER,
            border_width=1,
            hover_color=theme.BORDER,
            text_color=theme.TEXT,
            width=140,
            command=self.crypt_decrypt,
        )
        btn_decrypt.pack(side="left")

        prog_label = ctk.CTkLabel(
            frame,
            text="ПРОГРЕСС ОПЕРАЦИИ",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        prog_label.grid(row=1, column=0, sticky="w", pady=(2, 2))

        self.crypt_progress = ctk.CTkProgressBar(
            frame,
            progress_color=theme.ACCENT,
            fg_color="#111111",
            height=8,
            corner_radius=4,
        )
        self.crypt_progress.set(0.0)
        self.crypt_progress.grid(row=2, column=0, sticky="ew", pady=(0, 8))

        log_label = ctk.CTkLabel(
            frame,
            text="ЛОГ ОПЕРАЦИЙ ШИФРОВАНИЯ",
            font=theme.FONT_MONO,
            text_color=theme.TEXT_DIM,
            anchor="w",
        )
        log_label.grid(row=3, column=0, sticky="w", pady=(2, 2))

        self.crypt_log = theme.log_box(frame, height=120)
        self.crypt_log.grid(row=4, column=0, sticky="nsew")

        return frame

    def refresh_paths_ui(self):
        for widget in self.scroll_paths.winfo_children():
            widget.destroy()

        paths = self.config_data.get("encrypt_paths", [])
        if not paths:
            lbl_empty = ctk.CTkLabel(
                self.scroll_paths,
                text="Список пуст. Нажмите «Добавить папку».",
                font=theme.FONT_MONO,
                text_color=theme.TEXT_DIM,
            )
            lbl_empty.pack(anchor="w", padx=8, pady=4)
            return

        for p in paths:
            row = ctk.CTkFrame(self.scroll_paths, fg_color="transparent")
            row.pack(fill="x", padx=4, pady=2)

            lbl = ctk.CTkLabel(
                row,
                text=p,
                font=theme.FONT_MONO,
                text_color=theme.TEXT,
                anchor="w",
            )
            lbl.pack(side="left", fill="x", expand=True)

            btn_del = ctk.CTkButton(
                row,
                text="✖",
                width=28,
                height=22,
                font=theme.FONT_MONO,
                fg_color="transparent",
                hover_color=theme.BORDER,
                text_color=theme.ACCENT,
                command=lambda path_to_remove=p: self.crypt_remove_folder(path_to_remove),
            )
            btn_del.pack(side="right")

    def crypt_add_folder(self):
        path = filedialog.askdirectory(title="Выберите папку для шифрования")
        if path:
            paths = self.config_data.get("encrypt_paths", [])
            if path not in paths:
                paths.append(path)
                self.config_data["encrypt_paths"] = paths
                save_config(self.config_data)
                self.refresh_paths_ui()
                theme.append_log(self.crypt_log, f"Добавлен путь: {path}")
                theme.set_status(self.status_bar_lbl, f"Добавлен путь: {path}")

    def crypt_remove_folder(self, path: str):
        paths = self.config_data.get("encrypt_paths", [])
        if path in paths:
            paths.remove(path)
            self.config_data["encrypt_paths"] = paths
            save_config(self.config_data)
            self.refresh_paths_ui()
            theme.append_log(self.crypt_log, f"Удален путь: {path}")
            theme.set_status(self.status_bar_lbl, f"Удален путь: {path}")

    def crypt_clear_folders(self):
        self.config_data["encrypt_paths"] = []
        save_config(self.config_data)
        self.refresh_paths_ui()
        theme.append_log(self.crypt_log, "Список папок очищен")
        theme.set_status(self.status_bar_lbl, "Список папок шифрования очищен.")

    def crypt_encrypt(self):
        paths = crypt_bridge.list_paths()
        pwd = self.entry_crypt_pwd.get()
        self.crypt_progress.set(0.2)
        res = crypt_bridge.encrypt(paths, pwd)
        self.crypt_progress.set(1.0)
        theme.append_log(self.crypt_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"Шифрование: {res['msg']}")

    def crypt_decrypt(self):
        paths = crypt_bridge.list_paths()
        pwd = self.entry_crypt_pwd.get()
        self.crypt_progress.set(0.2)
        res = crypt_bridge.decrypt(paths, pwd)
        self.crypt_progress.set(1.0)
        theme.append_log(self.crypt_log, res["msg"])
        theme.set_status(self.status_bar_lbl, f"Дешифрование: {res['msg']}")

    def exit_app(self):
        self.root.destroy()
        sys.exit(0)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = SokratApp()
    app.run()
`,
  },
  'auth.py': {
    desc: 'Хэширование sha256 и проверка подлинности двух паролей',
    lang: 'python',
    code: `"""
Модуль аутентификации проекта SOKRAT.
Содержит SHA-256 хэши двух паролей и функцию проверки check(p1, p2) -> bool.
"""

import hashlib

# SHA-256 хэши мастер-паролей:
# Пароль 1 (admin):
#   "kR7_mQ2xP9@vN4tL6%wB1zC8hJ3dF5gA0Y_uEoIsWqS8eR2tY6uI0oP4aS9dF3gH7jK1lZ5xC9vB3nM7qW2eR6tY8uI0oP4aS1dF3gH6jK9lZ2xC5vB7nM1qW4eR8tY2uI6oP0aS3dF7gH1jK5lZ9xC3vB7nM2qW6eR0tY4uI8oP2aS6dF0gH4jK8lZ2xC6vB0nM4qW8eR2tY6uI0oP4aS8dF2gH6jK0lZ4xC8vB2nM6qW0eR4tY8uI2oP6aS0dF4gH8jK2lZ6xC0vB4nM8qW2eR6tY0uI4oP8aS2dF6gH0jK4lZ8xC2vB6nM0qW4eR8tY2uI6oP0aS4dF8gH2jK6lZ0xC4vB8nM2qW6eR0tY4uI8oP2aS6dF0gH4jK8lZ2xC6vB0nM4qW8eR2tY6uI0oP4aS8dF2gH6jK0lZ4xC8vB2nM6qW0eR4tY8uI2oP6aS0dF4gH8jK2lZ6xC0v"
# Пароль 2 (sokrat):
#   "SOKRAT"

HASH1 = "72960bd6cc479915c9297d61cb95ae39beaa948a3f5bfd1114da9426c0d8aaff"
HASH2 = "00c1a435dc5c74eed957fcdbc362dec0c548bcff9b73e8b904216d56920dc4d3"


def check(p1: str, p2: str) -> bool:
    """
    Проверяет, совпадают ли SHA-256 хэши введенных паролей с эталонными HASH1 и HASH2.
    Пустой ввод запрещен.
    """
    if not p1 or not p2:
        return False
    h1 = hashlib.sha256(p1.encode("utf-8")).hexdigest()
    h2 = hashlib.sha256(p2.encode("utf-8")).hexdigest()
    return h1 == HASH1 and h2 == HASH2
`,
  },
  'ui_theme.py': {
    desc: 'Константы красно-чёрной палитры, шрифты и фабрики виджетов CustomTkinter',
    lang: 'python',
    code: `"""
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
    "███████╗ ██████╗ ██╗  ██╗██████╗  █████╗ ████████╗\\n"
    "██╔════╝██╔═══██╗██║ ██╔╝██╔══██╗██╔══██╗╚══██╔══╝\\n"
    "███████╗██║   ██║█████╔╝ ██████╔╝███████║   ██║   \\n"
    "╚════██║██║   ██║██╔═██╗ ██╔══██╗██╔══██║   ██║   \\n"
    "███████║╚██████╔╝██║  ██╗██║  ██║██║  ██║   ██║   \\n"
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
    box.insert("end", f"> {text}\\n")
    box.see("end")
    box.configure(state="disabled")


def set_status(bar: ctk.CTkLabel, text: str) -> None:
    """Обновляет текст в статус-баре."""
    bar.configure(text=f"  {text}")
`,
  },
  'bridges/veyoff_bridge.py': {
    desc: 'Реализация управления Veyoff для Windows (status, start, stop через Ctrl+Alt+Q, selfdestruct)',
    lang: 'python',
    code: `"""
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
    path = "veyoff\\\\veyoff-windows.exe"
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                path = data.get("veyoff_path", path)
        except Exception:
            pass

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
        for vk in vk_list:
            user32.keybd_event(ctypes.wintypes.BYTE(vk), 0, 0, 0)
            time.sleep(0.02)

        time.sleep(0.05)

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
        _send_hotkey([0x11, 0x12, 0x51])
        time.sleep(1)

        st = status()
        data = st.get("data")
        veyoff_is_running = data.get("veyoff_running", False) if data else False

        if not veyoff_is_running:
            return {"ok": True, "msg": "veyoff stopped cleanly", "data": None}

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
`,
  },
  'bridges/dns_bridge.py': {
    desc: 'Реализация DNS для Windows через netsh и nslookup (list_adapters, set_dns, reset_dns, check_dns)',
    lang: 'python',
    code: `"""
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
                parts = re.split(r"\\s{2,}", line_clean)
                if len(parts) >= 4:
                    adapter_name = parts[-1].strip()
                    if adapter_name and adapter_name not in adapters:
                        adapters.append(adapter_name)
                else:
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
                if val and val.lower() != "unknown":
                    addr = val
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
`,
  },
  'bridges/crypt_bridge.py': {
    desc: 'Заглушки шифрования (encrypt, decrypt, list_paths с чтением config.json)',
    lang: 'python',
    code: `"""
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
`,
  },
  'bridges/license_bridge.py': {
    desc: 'Мост локальной привязки к оборудованию (HWID) и проверки лицензии',
    lang: 'python',
    code: `"""
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
`,
  },
  'config.json': {
    desc: 'Конфигурационный файл по умолчанию с полями DNS, адаптеров, путей и блэклиста',
    lang: 'json',
    code: `{
  "dns_preset": "cloudflare",
  "adapters": [
    "Ethernet"
  ],
  "encrypt_paths": [],
  "blacklist": [
    "Firefox",
    "Chrome",
    "Signal"
  ],
  "veyoff_path": "veyoff\\\\veyoff-windows.exe"
}
`,
  },
  'requirements.txt': {
    desc: 'Зависимость Python: единственный внешний пакет CustomTkinter',
    lang: 'text',
    code: `customtkinter>=5.2.0
`,
  },
};

export default function App() {
  const [activeView, setActiveView] = useState<'simulator' | 'code'>('simulator');
  const [selectedFile, setSelectedFile] = useState<string>('main.py');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulator state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [p1, setP1] = useState<string>('');
  const [p2, setP2] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'veyoff' | 'dns' | 'crypt'>('veyoff');
  const [statusBarText, setStatusBarText] = useState<string>('Готов к работе. Система инициализирована.');

  // Veyoff State
  const [veyoffLogs, setVeyoffLogs] = useState<string[]>([
    'Система SOKRAT v1.0 загружена.',
    'Модуль Veyoff подключен (заглушка).',
  ]);
  const [blacklistText, setBlacklistText] = useState<string>('Firefox\nChrome\nSignal');
  const [showSelfDestructModal, setShowSelfDestructModal] = useState<boolean>(false);

  // DNS State
  const [selectedAdapter, setSelectedAdapter] = useState<string>('Ethernet');
  const [selectedPreset, setSelectedPreset] = useState<string>('Cloudflare');
  const [customDns, setCustomDns] = useState<string>('');
  const [dnsLogs, setDnsLogs] = useState<string[]>([
    'Инициализация сетевого моста DNS.',
    'Обнаружены интерфейсы: Ethernet, Wi-Fi',
  ]);

  // Crypt State
  const [encryptPaths, setEncryptPaths] = useState<string[]>([
    'C:\\Users\\User\\Documents\\Vault',
    'D:\\Projects\\Confidential',
  ]);
  const [newFolderPath, setNewFolderPath] = useState<string>('');
  const [cryptPassword, setCryptPassword] = useState<string>('');
  const [cryptProgress, setCryptProgress] = useState<number>(0);
  const [cryptLogs, setCryptLogs] = useState<string[]>([
    'Подсистема шифрования готова.',
  ]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const P1_REQUIRED =
    'kR7_mQ2xP9@vN4tL6%wB1zC8hJ3dF5gA0Y_uEoIsWqS8eR2tY6uI0oP4aS9dF3gH7jK1lZ5xC9vB3nM7qW2eR6tY8uI0oP4aS1dF3gH6jK9lZ2xC5vB7nM1qW4eR8tY2uI6oP0aS3dF7gH1jK5lZ9xC3vB7nM2qW6eR0tY4uI8oP2aS6dF0gH4jK8lZ2xC6vB0nM4qW8eR2tY6uI0oP4aS8dF2gH6jK0lZ4xC8vB2nM6qW0eR4tY8uI2oP6aS0dF4gH8jK2lZ6xC0vB4nM8qW2eR6tY0uI4oP8aS2dF6gH0jK4lZ8xC2vB6nM0qW4eR8tY2uI6oP0aS4dF8gH2jK6lZ0xC4vB8nM2qW6eR0tY4uI8oP2aS6dF0gH4jK8lZ2xC6vB0nM4qW8eR2tY6uI0oP4aS8dF2gH6jK0lZ4xC8vB2nM6qW0eR4tY8uI2oP6aS0dF4gH8jK2lZ6xC0v';
  const P2_REQUIRED = 'SOKRAT';

  const handleSimulatedLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!p1.trim() || !p2.trim()) {
      setAuthError('Доступ запрещён. Введите оба пароля.');
      return;
    }

    const isSuccess = p1 === P1_REQUIRED && p2 === P2_REQUIRED;

    if (isSuccess) {
      setIsAuthenticated(true);
      setAuthError('');
      setStatusBarText('Авторизация успешна. Доступ разрешён.');
    } else {
      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);
      if (nextAttempts <= 0) {
        setAuthError('Доступ запрещён. Превышено количество попыток.');
      } else {
        setAuthError(`Доступ запрещён. Осталось попыток: ${nextAttempts}`);
      }
    }
  };

  const addVeyoffLog = (msg: string) => {
    setVeyoffLogs((prev) => [...prev, msg]);
    setStatusBarText(`Veyoff: ${msg}`);
  };

  const addDnsLog = (msg: string) => {
    setDnsLogs((prev) => [...prev, msg]);
    setStatusBarText(`DNS: ${msg}`);
  };

  const addCryptLog = (msg: string) => {
    setCryptLogs((prev) => [...prev, msg]);
    setStatusBarText(`Шифрование: ${msg}`);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E0E0E0] font-sans flex flex-col">
      {/* Top Navigation Bar of the Applet */}
      <header className="bg-[#141414] border-b border-[#2A2A2A] px-4 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#CC0000] flex items-center justify-center font-mono font-black text-black">
            S
          </div>
          <div>
            <div className="font-mono font-bold text-sm tracking-wider text-[#E0E0E0] flex items-center gap-2">
              <span>SOKRAT // CONTROL PANEL</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A2A] text-[#888888]">v1.0 Python CTk</span>
            </div>
            <p className="text-xs text-[#888888]">Каркас приложения на Python + CustomTkinter</p>
          </div>
        </div>

        {/* View Switcher: Simulator vs Code Generator */}
        <div className="flex items-center gap-2 bg-[#0D0D0D] p-1 rounded border border-[#2A2A2A]">
          <button
            onClick={() => setActiveView('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeView === 'simulator'
                ? 'bg-[#CC0000] text-white font-bold'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Интерактивный симулятор UI</span>
          </button>
          <button
            onClick={() => setActiveView('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeView === 'code'
                ? 'bg-[#CC0000] text-white font-bold'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Файлы проекта & Исходный код</span>
          </button>
        </div>

        {/* Quick run command badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-[#111111] border border-[#2A2A2A] px-3 py-1.5 rounded text-[#888888]">
          <span className="text-[#00CC66]">●</span>
          <span>python main.py</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-7xl w-full mx-auto">
        {activeView === 'simulator' ? (
          <div className="flex-1 flex flex-col">
            {/* Simulator Controls & Helper Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-2.5 rounded-lg text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[#888888] font-mono">Режим симуляции:</span>
                <button
                  onClick={() => {
                    const next = !isAdmin;
                    setIsAdmin(next);
                    if (!next && (activeTab === 'veyoff' || activeTab === 'dns')) {
                      setActiveTab('crypt');
                      setStatusBarText('Внимание: Запуск без прав Администратора. Veyoff и DNS отключены.');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono font-semibold transition-colors ${
                    isAdmin ? 'bg-[#00331A] text-[#00CC66] border border-[#006633]' : 'bg-[#330000] text-[#CC0000] border border-[#660000]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'ADMIN: ВКЛЮЧЁН' : 'NO ADMIN: ОТКЛЮЧЁН (кликнуть)'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsAuthenticated(false);
                    setAttemptsLeft(3);
                    setP1('');
                    setP2('');
                    setAuthError('');
                  }}
                  className="px-2.5 py-1 rounded bg-[#0D0D0D] border border-[#2A2A2A] hover:border-[#CC0000] text-[#888888] hover:text-[#E0E0E0] font-mono flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Перезапуск окна авторизации</span>
                </button>
              </div>
            </div>

            {/* CustomTkinter Window Box Replica */}
            <div className="flex-1 bg-[#0D0D0D] border-2 border-[#2A2A2A] rounded-lg shadow-2xl flex flex-col overflow-hidden min-h-[580px]">
              {/* Window Title Bar */}
              <div className="h-10 bg-[#141414] border-b border-[#2A2A2A] px-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#333333] border border-[#444444]" />
                  <div className="w-3 h-3 rounded-full bg-[#333333] border border-[#444444]" />
                  <div className="w-3 h-3 rounded-full bg-[#333333] border border-[#444444]" />
                  <span className="ml-2 font-mono text-xs text-[#888888]">
                    {isAuthenticated ? 'SOKRAT — Control Panel (980x640)' : 'SOKRAT — Авторизация (540x510)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#888888] hidden sm:inline">CustomTkinter 5.2.0</span>
                </div>
              </div>

              {/* Window Content */}
              {!isAuthenticated ? (
                /* AUTH MODAL SCREEN (CTk Toplevel) */
                <div className="flex-1 flex items-center justify-center p-6 bg-[#0D0D0D]">
                  <div className="w-full max-w-lg bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-xl text-center">
                    {/* ASCII Banner */}
                    <pre className="font-mono text-[#CC0000] text-[9px] sm:text-[11px] leading-tight select-none mb-3 overflow-x-auto text-left inline-block">
                      {ASCII_BANNER}
                    </pre>

                    <div className="font-mono text-xs text-[#888888] tracking-widest mb-6">
                      TERMINAL SECURITY SYSTEM // 2-PHASE AUTH
                    </div>

                    <form onSubmit={handleSimulatedLogin} className="space-y-3 max-w-sm mx-auto">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#888888] mb-1">
                          <span>Пароль 1 (admin)</span>
                          <button
                            type="button"
                            onClick={() => setP1(P1_REQUIRED)}
                            className="text-[#CC0000] hover:text-[#E60000] underline"
                          >
                            Вставить ключ
                          </button>
                        </div>
                        <input
                          type="password"
                          value={p1}
                          onChange={(e) => setP1(e.target.value)}
                          placeholder="Введите Пароль 1 (длинный ключ)"
                          className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#CC0000] rounded px-3 py-2 text-sm text-[#E0E0E0] outline-none font-mono"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#888888] mb-1">
                          <span>Пароль 2 (sokrat)</span>
                          <button
                            type="button"
                            onClick={() => setP2(P2_REQUIRED)}
                            className="text-[#CC0000] hover:text-[#E60000] underline"
                          >
                            Вставить &quot;SOKRAT&quot;
                          </button>
                        </div>
                        <input
                          type="password"
                          value={p2}
                          onChange={(e) => setP2(e.target.value)}
                          placeholder="Введите Пароль 2 (SOKRAT)"
                          className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#CC0000] rounded px-3 py-2 text-sm text-[#E0E0E0] outline-none font-mono"
                        />
                      </div>

                      {authError && (
                        <div className="text-xs font-mono text-[#CC0000] py-1 animate-pulse">
                          {authError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-[#CC0000] hover:bg-[#E60000] active:scale-[0.99] text-white font-mono font-bold py-2.5 px-4 rounded transition-colors text-sm uppercase tracking-wider"
                      >
                        Войти
                      </button>

                      <div className="pt-2 text-[11px] font-mono text-[#888888]">
                        Строгая валидация SHA-256 активна. Вход без паролей заблокирован.
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                /* MAIN APPLICATION WINDOW */
                <div className="flex-1 flex flex-col bg-[#0D0D0D]">
                  {/* Top Bar (56px) */}
                  <div className="h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] px-4 flex items-center justify-between">
                    <div className="font-mono font-bold text-sm text-[#CC0000] tracking-wider flex items-center gap-2">
                      <span>[ SOKRAT v1.0 // RED CONTROL PANEL ]</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`font-mono text-xs font-bold flex items-center gap-1.5 ${
                          isAdmin ? 'text-[#00CC66]' : 'text-[#CC0000]'
                        }`}
                      >
                        <span className="text-sm">●</span>
                        <span>{isAdmin ? 'ADMIN' : 'NO ADMIN'}</span>
                      </div>
                      <button
                        onClick={() => setStatusBarText('Окно свернуто (iconify заглушка).')}
                        title="Свернуть окно"
                        className="w-8 h-8 rounded bg-transparent hover:bg-[#2A2A2A] text-[#E0E0E0] font-mono text-sm flex items-center justify-center transition-colors"
                      >
                        —
                      </button>
                    </div>
                  </div>

                  {/* Body (Sidebar 200px + Content) */}
                  <div className="flex-1 flex min-h-0">
                    {/* Sidebar */}
                    <div className="w-52 bg-[#1A1A1A] border-r border-[#2A2A2A] p-3 flex flex-col justify-between select-none">
                      <div className="space-y-1.5">
                        <button
                          disabled={!isAdmin}
                          onClick={() => setActiveTab('veyoff')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded font-sans text-sm transition-colors text-left ${
                            activeTab === 'veyoff'
                              ? 'bg-[#CC0000] text-white font-medium'
                              : isAdmin
                              ? 'text-[#E0E0E0] hover:bg-[#2A2A2A]'
                              : 'text-[#444444] cursor-not-allowed bg-transparent'
                          }`}
                        >
                          <Terminal className="w-4 h-4 shrink-0" />
                          <span>Veyoff</span>
                        </button>

                        <button
                          disabled={!isAdmin}
                          onClick={() => setActiveTab('dns')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded font-sans text-sm transition-colors text-left ${
                            activeTab === 'dns'
                              ? 'bg-[#CC0000] text-white font-medium'
                              : isAdmin
                              ? 'text-[#E0E0E0] hover:bg-[#2A2A2A]'
                              : 'text-[#444444] cursor-not-allowed bg-transparent'
                          }`}
                        >
                          <Network className="w-4 h-4 shrink-0" />
                          <span>DNS</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('crypt')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded font-sans text-sm transition-colors text-left ${
                            activeTab === 'crypt'
                              ? 'bg-[#CC0000] text-white font-medium'
                              : 'text-[#E0E0E0] hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <Lock className="w-4 h-4 shrink-0" />
                          <span>Шифрование</span>
                        </button>
                      </div>

                      {/* Exit Button at bottom of sidebar */}
                      <button
                        onClick={() => {
                          setIsAuthenticated(false);
                          setStatusBarText('Выход выполнен.');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-[#CC0000] hover:bg-[#2A2A2A] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Выход</span>
                      </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-5 overflow-y-auto bg-[#0D0D0D] flex flex-col space-y-4">
                      {/* VEYOFF TAB */}
                      {activeTab === 'veyoff' && (
                        <div className="flex-1 flex flex-col space-y-4">
                          {/* Card 1: Veyoff service controls */}
                          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                            <h3 className="font-semibold text-[#E0E0E0] text-base mb-3">
                              Управление службой Veyoff
                            </h3>
                            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                              <span className="font-semibold text-[#CC0000] text-sm">
                                Статус: not connected
                              </span>
                              <span className="font-mono text-xs text-[#888888]">
                                VeyonService: unknown
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => addVeyoffLog('veyoff bridge not connected')}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#CC0000] hover:bg-[#E60000] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Запустить</span>
                                </button>
                                <button
                                  onClick={() => addVeyoffLog('veyoff bridge not connected')}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#E0E0E0] text-xs font-semibold uppercase tracking-wider transition-colors"
                                >
                                  <Square className="w-3.5 h-3.5" />
                                  <span>Остановить</span>
                                </button>
                              </div>

                              <button
                                onClick={() => setShowSelfDestructModal(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#330000] border border-[#CC0000] hover:bg-[#440000] text-[#CC0000] text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>Self-destruct</span>
                              </button>
                            </div>
                          </div>

                          {/* Card 2: Blacklist */}
                          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                            <h3 className="font-semibold text-[#E0E0E0] text-base mb-2">
                              Черный список процессов (Blacklist)
                            </h3>
                            <textarea
                              value={blacklistText}
                              onChange={(e) => setBlacklistText(e.target.value)}
                              rows={4}
                              className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#CC0000] rounded p-2.5 font-mono text-xs text-[#E0E0E0] outline-none"
                            />
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  addVeyoffLog('Blacklist успешно сохранен в config.json');
                                }}
                                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#E0E0E0] text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Сохранить blacklist
                              </button>
                            </div>
                          </div>

                          {/* Log box */}
                          <div className="flex-1 flex flex-col min-h-[140px]">
                            <div className="font-mono text-xs text-[#888888] mb-1">
                              ЛОГ СОБЫТИЙ VEYOFF
                            </div>
                            <div className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded p-3 font-mono text-xs text-[#E0E0E0] overflow-y-auto space-y-1">
                              {veyoffLogs.map((log, idx) => (
                                <div key={idx} className="leading-relaxed">
                                  <span className="text-[#CC0000] select-none">&gt; </span>
                                  <span>{log}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DNS TAB */}
                      {activeTab === 'dns' && (
                        <div className="flex-1 flex flex-col space-y-4">
                          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 space-y-4">
                            <h3 className="font-semibold text-[#E0E0E0] text-base">
                              Сетевая конфигурация DNS
                            </h3>

                            {/* Adapter row */}
                            <div className="flex items-center gap-4 text-xs">
                              <span className="w-24 text-[#E0E0E0]">Адаптер:</span>
                              <select
                                value={selectedAdapter}
                                onChange={(e) => setSelectedAdapter(e.target.value)}
                                className="bg-[#111111] border border-[#2A2A2A] text-[#E0E0E0] px-3 py-1.5 rounded outline-none w-56 font-mono"
                              >
                                <option value="Ethernet">Ethernet</option>
                                <option value="Wi-Fi">Wi-Fi</option>
                              </select>
                            </div>

                            {/* Preset row */}
                            <div className="flex items-center gap-4 text-xs">
                              <span className="w-24 text-[#E0E0E0]">DNS:</span>
                              <select
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value)}
                                className="bg-[#111111] border border-[#2A2A2A] text-[#E0E0E0] px-3 py-1.5 rounded outline-none w-56 font-mono"
                              >
                                <option value="Cloudflare">Cloudflare (1.1.1.1)</option>
                                <option value="Google">Google (8.8.8.8)</option>
                                <option value="Quad9">Quad9 (9.9.9.9)</option>
                                <option value="Свой">Свой</option>
                              </select>
                            </div>

                            {/* Custom DNS input */}
                            <div className="flex items-center gap-4 text-xs">
                              <span className="w-24 text-[#E0E0E0]">Свой DNS:</span>
                              <input
                                type="text"
                                disabled={selectedPreset !== 'Свой'}
                                value={customDns}
                                onChange={(e) => setCustomDns(e.target.value)}
                                placeholder="1.1.1.1, 1.0.0.1"
                                className={`px-3 py-1.5 rounded border font-mono text-xs w-72 outline-none ${
                                  selectedPreset === 'Свой'
                                    ? 'bg-[#111111] border-[#2A2A2A] text-[#E0E0E0] focus:border-[#CC0000]'
                                    : 'bg-[#0D0D0D] border-[#202020] text-[#555555] cursor-not-allowed'
                                }`}
                              />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => addDnsLog('dns bridge not implemented')}
                                className="px-4 py-2 rounded bg-[#CC0000] hover:bg-[#E60000] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Применить
                              </button>
                              <button
                                onClick={() => addDnsLog('dns bridge not implemented')}
                                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#E0E0E0] text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Сбросить
                              </button>
                              <button
                                onClick={() => addDnsLog('dns bridge not implemented')}
                                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#E0E0E0] text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Проверить
                              </button>
                            </div>
                          </div>

                          {/* Log box */}
                          <div className="flex-1 flex flex-col min-h-[140px]">
                            <div className="font-mono text-xs text-[#888888] mb-1">
                              ЛОГ СЕТЕВЫХ ОПЕРАЦИЙ DNS
                            </div>
                            <div className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded p-3 font-mono text-xs text-[#E0E0E0] overflow-y-auto space-y-1">
                              {dnsLogs.map((log, idx) => (
                                <div key={idx} className="leading-relaxed">
                                  <span className="text-[#CC0000] select-none">&gt; </span>
                                  <span>{log}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CRYPT TAB */}
                      {activeTab === 'crypt' && (
                        <div className="flex-1 flex flex-col space-y-4">
                          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-[#E0E0E0] text-base">
                              Шифрование данных и папок
                            </h3>

                            <div className="text-xs text-[#888888]">
                              Директории в списке шифрования:
                            </div>

                            <div className="bg-[#111111] border border-[#2A2A2A] rounded p-2 max-h-32 overflow-y-auto space-y-1.5">
                              {encryptPaths.length === 0 ? (
                                <div className="text-xs font-mono text-[#888888] p-1">
                                  Список пуст. Добавьте пути ниже.
                                </div>
                              ) : (
                                encryptPaths.map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between bg-[#181818] px-2 py-1 rounded text-xs font-mono text-[#E0E0E0]"
                                  >
                                    <span className="truncate">{p}</span>
                                    <button
                                      onClick={() => {
                                        setEncryptPaths((prev) => prev.filter((item) => item !== p));
                                        addCryptLog(`Удален путь: ${p}`);
                                      }}
                                      className="text-[#CC0000] hover:text-[#E60000] px-1 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add path input/button */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newFolderPath}
                                onChange={(e) => setNewFolderPath(e.target.value)}
                                placeholder="Путь к папке (например: C:\Data)"
                                className="flex-1 bg-[#111111] border border-[#2A2A2A] focus:border-[#CC0000] text-xs font-mono px-3 py-1.5 rounded outline-none text-[#E0E0E0]"
                              />
                              <button
                                onClick={() => {
                                  if (newFolderPath.trim()) {
                                    setEncryptPaths((prev) => [...prev, newFolderPath.trim()]);
                                    addCryptLog(`Добавлен путь: ${newFolderPath.trim()}`);
                                    setNewFolderPath('');
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs text-[#E0E0E0]"
                              >
                                <FolderPlus className="w-3.5 h-3.5" />
                                <span>Добавить</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEncryptPaths([]);
                                  addCryptLog('Список папок очищен');
                                }}
                                className="px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs text-[#E0E0E0]"
                              >
                                Очистить
                              </button>
                            </div>

                            {/* Password input */}
                            <div className="flex items-center gap-3 pt-2">
                              <span className="text-xs text-[#E0E0E0] w-36">Пароль шифрования:</span>
                              <input
                                type="password"
                                value={cryptPassword}
                                onChange={(e) => setCryptPassword(e.target.value)}
                                placeholder="Мастер-ключ"
                                className="bg-[#111111] border border-[#2A2A2A] focus:border-[#CC0000] text-xs font-mono px-3 py-1.5 rounded outline-none text-[#E0E0E0] w-60"
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => {
                                  setCryptProgress(100);
                                  addCryptLog('crypt bridge not implemented');
                                }}
                                className="px-4 py-2 rounded bg-[#CC0000] hover:bg-[#E60000] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Зашифровать
                              </button>
                              <button
                                onClick={() => {
                                  setCryptProgress(100);
                                  addCryptLog('crypt bridge not implemented');
                                }}
                                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#E0E0E0] text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Расшифровать
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="font-mono text-xs text-[#888888]">ПРОГРЕСС ОПЕРАЦИИ</div>
                            <div className="w-full bg-[#111111] h-2 rounded overflow-hidden">
                              <div
                                className="bg-[#CC0000] h-full transition-all duration-300"
                                style={{ width: `${cryptProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Log box */}
                          <div className="flex-1 flex flex-col min-h-[120px]">
                            <div className="font-mono text-xs text-[#888888] mb-1">
                              ЛОГ ОПЕРАЦИЙ ШИФРОВАНИЯ
                            </div>
                            <div className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded p-3 font-mono text-xs text-[#E0E0E0] overflow-y-auto space-y-1">
                              {cryptLogs.map((log, idx) => (
                                <div key={idx} className="leading-relaxed">
                                  <span className="text-[#CC0000] select-none">&gt; </span>
                                  <span>{log}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Bar (32px) */}
                  <div className="h-8 bg-[#1A1A1A] border-t border-[#2A2A2A] px-3 flex items-center select-none">
                    <span className="font-sans text-xs text-[#888888] truncate">
                      {statusBarText}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Self-destruct modal in simulator */}
            {showSelfDestructModal && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-[#1A1A1A] border border-[#CC0000] rounded-lg p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                  <AlertTriangle className="w-10 h-10 text-[#CC0000] mx-auto" />
                  <h4 className="font-semibold text-lg text-[#CC0000]">
                    Точно? Это сотрёт следы.
                  </h4>
                  <p className="text-xs text-[#888888]">
                    Подтверждение аварийного удаления следов работы подсистемы SOKRAT.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowSelfDestructModal(false);
                        addVeyoffLog('veyoff bridge not connected');
                      }}
                      className="px-4 py-2 rounded bg-[#CC0000] hover:bg-[#E60000] text-white text-xs font-semibold uppercase"
                    >
                      Да, стереть
                    </button>
                    <button
                      onClick={() => setShowSelfDestructModal(false)}
                      className="px-4 py-2 rounded bg-[#111111] border border-[#2A2A2A] text-[#E0E0E0] text-xs hover:bg-[#222222]"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CODE EXPLORER & PROJECT REPOSITORY VIEW */
          <div className="flex-1 flex flex-col min-h-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden">
            {/* Header / Instructions */}
            <div className="p-4 border-b border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3 bg-[#141414]">
              <div>
                <h2 className="font-mono text-sm font-bold text-[#E0E0E0] flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#CC0000]" />
                  <span>Структура файлов проекта SOKRAT</span>
                </h2>
                <p className="text-xs text-[#888888] mt-0.5">
                  Все 6 файлов сгенерированы на диске и готовы к запуску через Python 3.10+
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(selectedFile, PROJECT_FILES[selectedFile].code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111111] border border-[#2A2A2A] hover:border-[#CC0000] text-xs font-mono text-[#E0E0E0] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать {selectedFile}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(PROJECT_FILES[selectedFile].code, selectedFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#CC0000] hover:bg-[#E60000] text-xs font-mono font-bold text-white transition-colors"
                >
                  {copiedKey === selectedFile ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать код</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split layout: File sidebar + Code viewer */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* File list */}
              <div className="w-full md:w-64 bg-[#111111] border-r border-[#2A2A2A] p-2 space-y-1 overflow-y-auto">
                <div className="text-[11px] font-mono font-bold text-[#888888] px-2 py-1 uppercase tracking-wider">
                  Файлы проекта
                </div>
                {Object.keys(PROJECT_FILES).map((fileName) => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    className={`w-full text-left px-2.5 py-2 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                      selectedFile === fileName
                        ? 'bg-[#2A2A2A] text-white font-bold border-l-2 border-[#CC0000]'
                        : 'text-[#888888] hover:text-[#E0E0E0] hover:bg-[#181818]'
                    }`}
                  >
                    <span className="truncate">{fileName}</span>
                    <span className="text-[10px] text-[#555555]">
                      {fileName.endsWith('.py') ? 'py' : fileName.endsWith('.json') ? 'json' : 'txt'}
                    </span>
                  </button>
                ))}

                <div className="mt-4 pt-4 border-t border-[#2A2A2A] px-2 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">
                    Инструкция по запуску
                  </div>
                  <div className="bg-[#0D0D0D] p-2 rounded text-[11px] font-mono text-[#00CC66] border border-[#222222]">
                    pip install customtkinter
                    <br />
                    python main.py
                  </div>
                </div>
              </div>

              {/* Code viewer */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#0D0D0D]">
                <div className="px-4 py-2 bg-[#161616] border-b border-[#2A2A2A] flex items-center justify-between text-xs font-mono text-[#888888]">
                  <span>{PROJECT_FILES[selectedFile].desc}</span>
                  <span className="text-[#CC0000]">{selectedFile}</span>
                </div>
                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-[#E0E0E0]">
                  <pre className="leading-relaxed whitespace-pre font-mono">
                    {PROJECT_FILES[selectedFile].code}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
