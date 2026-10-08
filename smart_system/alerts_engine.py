"""
Alerts Engine — rule-based alerts derived from REAL data only
===============================================================
Inputs are the user's live weather (backend weather service), their latest
stored ML predictions, and the live model-load status.  Nothing is invented:
if an input is missing, the corresponding rules simply do not fire.

Severity is assigned by the explicit thresholds below.

Weather (current observation)
    temperature  >=40 critical | >=36 high | >=33 medium     (crop heat stress, config: >32 C)
    humidity     >=90 high | >=85 medium, when 20 <= T <= 32 (fungal-disease conditions)
    humidity     <=30 and T >=33 -> medium                    (dry/hot: irrigation need)
    rainfall     >=15 mm high | >=7.5 mm medium               (heavy rain, mm in current hour)
    wind         >=50 km/h high | >=35 km/h medium

Disease (latest disease prediction, <=14 days old, not "healthy")
    confidence >=85 high | >=70 medium | else no alert (too uncertain)

Yield (latest yield prediction, <=60 days old)
    yield_level LOW -> medium;  intelligence risk HIGH -> high, CRITICAL -> critical

Models
    any ML model not loaded -> critical
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _age_days(ts: Optional[str]) -> float:
    try:
        t = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 86400.0
    except Exception:
        return 1e9


def _alert(aid, atype, severity, title, message, timestamp, source) -> Dict[str, Any]:
    return {"id": aid, "type": atype, "severity": severity, "title": title,
            "message": message, "timestamp": timestamp, "source": source}


def weather_alerts(w: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not w:
        return []
    out, ts = [], _now_iso()
    loc = w.get("location") or "your farm"
    t, h = w.get("temperature"), w.get("humidity")
    r, ws = w.get("rainfall"), w.get("wind_speed")

    if t is not None and t >= 33:
        sev = "critical" if t >= 40 else "high" if t >= 36 else "medium"
        out.append(_alert("weather:heat", "weather", sev, "Heat stress risk",
                          f"Current temperature at {loc} is {t:.0f}°C. Irrigate in the early "
                          f"morning or evening and avoid midday field work.", ts, "weather"))
    if t is not None and h is not None and 20 <= t <= 32 and h >= 85:
        sev = "high" if h >= 90 else "medium"
        out.append(_alert("weather:fungal", "weather", sev, "Fungal disease conditions",
                          f"Humidity is {h:.0f}% at {t:.0f}°C at {loc}, favourable for fungal "
                          f"leaf diseases. Scout crops and consider preventive spraying.", ts, "weather"))
    if t is not None and h is not None and h <= 30 and t >= 33:
        out.append(_alert("weather:dry", "weather", "medium", "Hot and dry conditions",
                          f"Humidity is only {h:.0f}% with {t:.0f}°C at {loc}. Check soil moisture "
                          f"and plan irrigation.", ts, "weather"))
    if r is not None and r >= 7.5:
        out.append(_alert("weather:rain", "weather", "high" if r >= 15 else "medium",
                          "Heavy rainfall", f"{r:.1f} mm of rain in the current hour at {loc}. "
                          f"Check drainage and delay fertiliser/pesticide application.", ts, "weather"))
    if ws is not None and ws >= 35:
        out.append(_alert("weather:wind", "weather", "high" if ws >= 50 else "medium",
                          "Strong winds", f"Wind speed is {ws:.0f} km/h at {loc}. Avoid spraying "
                          f"and secure tall or staked crops.", ts, "weather"))
    return out


def disease_alerts(latest: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not latest or _age_days(latest.get("timestamp")) > 14:
        return []
    label, conf = latest.get("label", ""), latest.get("confidence")
    if "healthy" in label.lower() or label.lower().startswith("unknown") or conf is None or conf < 70:
        return []
    sev = "high" if conf >= 85 else "medium"
    name = label.replace("___", " - ").replace("_", " ")
    sev_info = (latest.get("result") or {}).get("severity") or {}
    extra = f" Estimated severity: {sev_info['level']}." if sev_info.get("level") else ""
    return [_alert(f"disease:{latest['id']}", "disease", sev, f"Disease detected: {name}",
                   f"{latest.get('model') or 'The disease model'} identified {name} with "
                   f"{conf:.1f}% confidence.{extra} Review the treatment advice.",
                   latest["timestamp"], "disease_model")]


def yield_alerts(latest: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not latest or _age_days(latest.get("timestamp")) > 60:
        return []
    res = latest.get("result") or {}
    out = []
    risk = str(res.get("overall_risk") or "").upper()
    if risk in ("HIGH", "CRITICAL"):
        out.append(_alert(f"yield-risk:{latest['id']}", "yield",
                          "critical" if risk == "CRITICAL" else "high",
                          "High yield risk", f"Risk analysis for {latest['label']} "
                          f"({res.get('season')} {res.get('year')}) is {risk}.",
                          latest["timestamp"], "risk_analysis"))
    if str(res.get("yield_level") or "").upper() == "LOW":
        out.append(_alert(f"yield-low:{latest['id']}", "yield", "medium", "Low yield forecast",
                          f"The XGBoost model forecasts a LOW yield for {latest['label']} "
                          f"({res.get('season')} {res.get('year')}).",
                          latest["timestamp"], "yield_model"))
    return out


def model_alerts(models: Dict[str, Any]) -> List[Dict[str, Any]]:
    out, ts = [], _now_iso()
    for key, name in (("disease", "Disease"), ("crop", "Crop"), ("yield", "Yield")):
        m = models.get(key, {})
        if not m.get("loaded"):
            out.append(_alert(f"model:{key}", "system", "critical", f"{name} model unavailable",
                              m.get("reason") or f"The {name.lower()} model is not loaded.",
                              ts, "model_status"))
    return out


def build_alerts(*, weather, latest_disease, latest_yield, models) -> List[Dict[str, Any]]:
    alerts = (model_alerts(models) + weather_alerts(weather)
              + disease_alerts(latest_disease) + yield_alerts(latest_yield))
    alerts.sort(key=lambda a: (SEVERITY_ORDER.get(a["severity"], 9), a["timestamp"]), reverse=False)
    return alerts
