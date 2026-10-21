"""
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
