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
    """Initialize SQLite database tables if they do not already exist and run column migrations."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                full_name TEXT,
                farm_location TEXT DEFAULT '',
                settings_json TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Migrations for existing tables
        for col_name, col_type in [("farm_location", "TEXT DEFAULT ''"), ("settings_json", "TEXT DEFAULT '{}'")]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass  # Column already exists
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


def create_user(username: str, password: str, full_name: Optional[str] = None, farm_location: Optional[str] = "") -> Dict[str, Any]:
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
    clean_farm_location = (farm_location or "").strip()

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (username, password_hash, salt, full_name, farm_location, settings_json)
                VALUES (?, ?, ?, ?, ?, '{}')
                """,
                (clean_username, pwd_hash, salt, clean_full_name, clean_farm_location)
            )
            user_id = cursor.lastrowid
            conn.commit()

        return {
            "id": user_id,
            "username": clean_username,
            "full_name": clean_full_name,
            "farm_location": clean_farm_location,
            "settings": {}
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
            "SELECT id, username, password_hash, salt, full_name, farm_location, settings_json FROM users WHERE username = ?",
            (clean_username,)
        )
        row = cursor.fetchone()

    if not row:
        return None

    stored_hash = row["password_hash"]
    salt = row["salt"]

    test_hash, _ = hash_password(password, salt=salt)
    if secrets.compare_digest(stored_hash, test_hash):
        import json
        settings = {}
        if row["settings_json"]:
            try:
                settings = json.loads(row["settings_json"])
            except Exception:
                settings = {}
        return {
            "id": row["id"],
            "username": row["username"],
            "full_name": row["full_name"],
            "farm_location": row["farm_location"] or "",
            "settings": settings
        }

    return None


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user profile without password data."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, full_name, farm_location, settings_json, created_at FROM users WHERE username = ?",
            (username.strip(),)
        )
        row = cursor.fetchone()

    if not row:
        return None

    import json
    settings = {}
    if row["settings_json"]:
        try:
            settings = json.loads(row["settings_json"])
        except Exception:
            settings = {}

    return {
        "id": row["id"],
        "username": row["username"],
        "full_name": row["full_name"],
        "farm_location": row["farm_location"] or "",
        "settings": settings,
        "created_at": row["created_at"]
    }


def update_user_settings(
    user_id_or_username: Any,
    farm_location: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """Update user settings and/or farm location."""
    import json
    with get_connection() as conn:
        cursor = conn.cursor()
        if isinstance(user_id_or_username, int) or (isinstance(user_id_or_username, str) and user_id_or_username.isdigit()):
            cursor.execute(
                "SELECT id, username, full_name, farm_location, settings_json, created_at FROM users WHERE id = ?",
                (int(user_id_or_username),)
            )
        else:
            cursor.execute(
                "SELECT id, username, full_name, farm_location, settings_json, created_at FROM users WHERE username = ?",
                (str(user_id_or_username).strip(),)
            )
        row = cursor.fetchone()
        if not row:
            return None

        user_id = row["id"]
        current_loc = row["farm_location"] or ""
        new_loc = farm_location.strip() if farm_location is not None else current_loc

        current_settings = {}
        if row["settings_json"]:
            try:
                current_settings = json.loads(row["settings_json"])
            except Exception:
                current_settings = {}

        if settings:
            current_settings.update(settings)

        cursor.execute(
            "UPDATE users SET farm_location = ?, settings_json = ? WHERE id = ?",
            (new_loc, json.dumps(current_settings), user_id)
        )
        conn.commit()

        return {
            "id": user_id,
            "username": row["username"],
            "full_name": row["full_name"],
            "farm_location": new_loc,
            "settings": current_settings,
            "created_at": row["created_at"]
        }


# Ensure database is initialized on import
init_db()
