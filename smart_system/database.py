"""
Database & Authentication Module — Smart-Farm-Ai
==================================================
Provides SQLite database persistence for user credentials,
profile information, and secure password hashing with salt.

Author  : Smart-Farm-Ai Team
Version : 1.0.0
"""

import os
import sqlite3
import hashlib
import secrets
from typing import Optional, Dict, Any

from . import config

DB_PATH = os.path.join(config.PROJECT_ROOT, "users.db")


def get_connection() -> sqlite3.Connection:
    """Create and return a database connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite database tables if they do not already exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                full_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hash a password securely using PBKDF2-HMAC-SHA256 with 100,000 iterations.
    
    Returns:
        (hex_digest, salt)
    """
    if salt is None:
        salt = secrets.token_hex(16)
    
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return hash_bytes.hex(), salt


def create_user(username: str, password: str, full_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new user in the database.
    
    Raises:
        ValueError if username is invalid or already taken.
    """
    clean_username = username.strip()
    if not clean_username or len(clean_username) < 3:
        raise ValueError("Username must be at least 3 characters long.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")

    pwd_hash, salt = hash_password(password)
    clean_full_name = (full_name or "").strip() or clean_username

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (username, password_hash, salt, full_name)
                VALUES (?, ?, ?, ?)
                """,
                (clean_username, pwd_hash, salt, clean_full_name)
            )
            user_id = cursor.lastrowid
            conn.commit()

        return {
            "id": user_id,
            "username": clean_username,
            "full_name": clean_full_name
        }
    except sqlite3.IntegrityError:
        raise ValueError(f"Username '{clean_username}' is already taken. Please choose another or sign in.")


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticate a user by username and password.
    
    Returns:
        User dict if credentials are valid, None otherwise.
    """
    clean_username = username.strip()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, password_hash, salt, full_name FROM users WHERE username = ?",
            (clean_username,)
        )
        row = cursor.fetchone()

    if not row:
        return None

    stored_hash = row["password_hash"]
    salt = row["salt"]

    test_hash, _ = hash_password(password, salt=salt)
    if secrets.compare_digest(stored_hash, test_hash):
        return {
            "id": row["id"],
            "username": row["username"],
            "full_name": row["full_name"]
        }

    return None


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user profile without password data."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, full_name, created_at FROM users WHERE username = ?",
            (username.strip(),)
        )
        row = cursor.fetchone()

    if not row:
        return None

    return {
        "id": row["id"],
        "username": row["username"],
        "full_name": row["full_name"],
        "created_at": row["created_at"]
    }

# Ensure database is initialized on import
init_db()
