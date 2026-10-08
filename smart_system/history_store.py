"""
Sessions + Prediction History Store — Smart-Farm-Ai
=====================================================
Adds two tables to the existing ``users.db`` (SQLite, same file as the user
accounts; existing tables/data are untouched):

    sessions     bearer-token (SHA-256 hashed) -> user_id
    predictions  one row per ML prediction a signed-in user makes

Every query is scoped by ``user_id`` so one account can never read another
account's history.  The user is always derived from the bearer token, never
from a client-supplied id.
"""

from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from .database import get_connection

SESSION_TTL_DAYS = 30


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def init_store() -> None:
    with get_connection() as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id    INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                type        TEXT NOT NULL,          -- disease | crop | yield | report
                label       TEXT NOT NULL,          -- predicted class / crop / "crop - state"
                confidence  REAL,                   -- percent 0-100, NULL if the model gives none
                value       REAL,                   -- numeric result (yield)
                unit        TEXT,                   -- unit of `value`
                model       TEXT,
                inputs_json TEXT,
                result_json TEXT,
                created_at  TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_pred_user_type_time "
                  "ON predictions (user_id, type, created_at DESC)")
        conn.commit()


# ── Sessions ────────────────────────────────────────────────────────────────

def create_session(user_id: int) -> str:
    token = f"sfa_{secrets.token_urlsafe(32)}"
    now = datetime.now(timezone.utc)
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)",
            (_hash(token), user_id, now.strftime("%Y-%m-%dT%H:%M:%SZ"),
             (now + timedelta(days=SESSION_TTL_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")),
        )
        conn.commit()
    return token


def resolve_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Return the user row for a valid, unexpired token, else None."""
    if not token:
        return None
    with get_connection() as conn:
        row = conn.execute(
            """SELECT u.id, u.username, u.full_name, u.farm_location, u.settings_json,
                      s.expires_at
               FROM sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ?""",
            (_hash(token),),
        ).fetchone()
    if not row or row["expires_at"] < _now():
        return None
    try:
        settings = json.loads(row["settings_json"] or "{}")
    except Exception:
        settings = {}
    return {
        "id": row["id"], "username": row["username"], "full_name": row["full_name"],
        "farm_location": row["farm_location"] or "", "settings": settings,
    }


def revoke_session(token: Optional[str]) -> None:
    if not token:
        return
    with get_connection() as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash(token),))
        conn.commit()


# ── Predictions ─────────────────────────────────────────────────────────────

def record_prediction(
    user_id: int, ptype: str, label: str, *,
    confidence: Optional[float] = None, value: Optional[float] = None,
    unit: Optional[str] = None, model: Optional[str] = None,
    inputs: Optional[Dict] = None, result: Optional[Dict] = None,
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO predictions
               (user_id, type, label, confidence, value, unit, model,
                inputs_json, result_json, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (user_id, ptype, str(label), confidence, value, unit, model,
             json.dumps(inputs or {}, default=str),
             json.dumps(result or {}, default=str), _now()),
        )
        conn.commit()
        return cur.lastrowid


def _row(r, with_result: bool) -> Dict[str, Any]:
    d = {
        "id": r["id"], "type": r["type"], "label": r["label"],
        "confidence": r["confidence"], "value": r["value"], "unit": r["unit"],
        "model": r["model"], "timestamp": r["created_at"],
        "inputs": json.loads(r["inputs_json"] or "{}"),
    }
    if with_result:
        d["result"] = json.loads(r["result_json"] or "{}")
    return d


def list_history(user_id: int, ptype: Optional[str] = None, limit: int = 20,
                 offset: int = 0, with_result: bool = False) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit), 200))
    sql = "SELECT * FROM predictions WHERE user_id = ?"
    args: List[Any] = [user_id]
    if ptype:
        sql += " AND type = ?"
        args.append(ptype)
    sql += " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
    args += [limit, max(0, int(offset))]
    with get_connection() as conn:
        rows = conn.execute(sql, args).fetchall()
    return [_row(r, with_result) for r in rows]


def latest(user_id: int, ptype: str) -> Optional[Dict[str, Any]]:
    rows = list_history(user_id, ptype, limit=1, with_result=True)
    return rows[0] if rows else None


def stats(user_id: int) -> Dict[str, Any]:
    """Counts, disease distribution and yield series, all computed from rows."""
    with get_connection() as conn:
        counts = {r["type"]: r["n"] for r in conn.execute(
            "SELECT type, COUNT(*) n FROM predictions WHERE user_id=? GROUP BY type",
            (user_id,))}
        dist = conn.execute(
            """SELECT label, COUNT(*) n, AVG(confidence) avg_conf FROM predictions
               WHERE user_id=? AND type='disease' GROUP BY label ORDER BY n DESC""",
            (user_id,)).fetchall()
        yields = conn.execute(
            """SELECT value, unit, label, created_at, inputs_json FROM predictions
               WHERE user_id=? AND type='yield' AND value IS NOT NULL
               ORDER BY created_at ASC, id ASC""",
            (user_id,)).fetchall()
        avg_dis = conn.execute(
            "SELECT AVG(confidence) FROM predictions WHERE user_id=? AND type='disease'",
            (user_id,)).fetchone()[0]
        top_crop = conn.execute(
            """SELECT label, COUNT(*) n FROM predictions WHERE user_id=? AND type='crop'
               GROUP BY label ORDER BY n DESC LIMIT 1""", (user_id,)).fetchone()

    total_dis = counts.get("disease", 0)
    distribution = [{
        "disease": r["label"], "count": r["n"],
        "percentage": round(100.0 * r["n"] / total_dis, 1) if total_dis else 0.0,
        "avg_confidence": round(r["avg_conf"], 1) if r["avg_conf"] is not None else None,
    } for r in dist]

    yield_rows = []
    for r in yields:
        inp = json.loads(r["inputs_json"] or "{}")
        yield_rows.append({
            "timestamp": r["created_at"], "value": r["value"], "unit": r["unit"],
            "label": r["label"], "crop": inp.get("crop"), "state": inp.get("state"),
            "season": inp.get("season"), "year": inp.get("year"),
        })
    avg_yield = (sum(y["value"] for y in yield_rows) / len(yield_rows)) if yield_rows else None

    return {
        "counts": {
            "total": sum(counts.get(k, 0) for k in ("disease", "crop", "yield", "report")),
            "disease": counts.get("disease", 0), "crop": counts.get("crop", 0),
            "yield": counts.get("yield", 0), "report": counts.get("report", 0),
        },
        "disease_distribution": distribution,
        "yield_rows": yield_rows,
        "averages": {
            "disease_confidence": round(avg_dis, 1) if avg_dis is not None else None,
            "yield_hg_ha": round(avg_yield, 1) if avg_yield is not None else None,
        },
        "most_recommended_crop": ({"crop": top_crop["label"], "count": top_crop["n"]}
                                  if top_crop else None),
        "most_detected_disease": distribution[0]["disease"] if distribution else None,
    }


init_store()
