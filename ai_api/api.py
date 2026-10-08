"""
Smart Agriculture AI API — Production Grade
=============================================
Author  : Smart Agriculture AI Team
Version : 3.0.0

Features
--------
  • Safe model loading with per-model fallback
  • Startup diagnostics banner
  • Structured input validation (all endpoints)
  • Comprehensive try/except error handling
  • File-based rotating API logger
  • Singleton model globals (load once, reuse always)
  • /health endpoint
  • CORS enabled for all origins
"""

import warnings
warnings.filterwarnings("ignore")

import os
import sys
import shutil
import logging
import platform

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Add project root to sys.path ──────────────────────────────
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, validator
import uvicorn
import secrets

import requests
from smart_system.recommendations import RecommendationEngine
from smart_system.farm_ai_assistant import generate_farming_response
from smart_system.database import create_user, authenticate_user, get_user_by_username, update_user_settings
from smart_system.yield_predictor.weather import get_state_coordinates
from smart_system import history_store, alerts_engine

# ══════════════════════════════════════════════════════════════
# PART 6 — LOGGING SYSTEM
# ══════════════════════════════════════════════════════════════

LOG_DIR  = os.path.join(PROJECT_ROOT, "logs")
LOG_FILE = os.path.join(LOG_DIR, "api_log.txt")
os.makedirs(LOG_DIR, exist_ok=True)

# Create a dual logger — writes to file AND console
logger = logging.getLogger("agri_api")
logger.setLevel(logging.DEBUG)

# File handler
fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
fh.setLevel(logging.DEBUG)

# Console handler
ch = logging.StreamHandler(sys.stdout)
ch.setLevel(logging.INFO)

fmt = logging.Formatter("[%(levelname)s] %(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
fh.setFormatter(fmt)
ch.setFormatter(fmt)

if not logger.handlers:
    logger.addHandler(fh)
    logger.addHandler(ch)


def log_info(msg: str):
    logger.info(msg)

def log_error(msg: str):
    logger.error(msg)

def log_request(endpoint: str, payload: dict = None):
    logger.info(f"REQUEST  {endpoint} - {payload or ''}")

def log_prediction(model: str, result: str):
    logger.info(f"PREDICT  [{model}] -> {result}")


# ══════════════════════════════════════════════════════════════
# PART 7 — SINGLETON MODEL GLOBALS (load once, reuse always)
# ══════════════════════════════════════════════════════════════

disease_engine = None
crop_engine    = None
yield_engine   = None
plant_doctor_pipeline = None
yield_pipeline = None          # Phase-1 Yield Prediction Pipeline
ensemble_engine = None         # Ensemble: EfficientNet-B0 + ResNet-50 + EfficientNet-B1

_disease_loaded   = False
_crop_loaded      = False
_yield_loaded     = False
_ensemble_loaded  = False      # True when secondary ensemble models are ready
yield_trends_df = None


# ══════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════

app = FastAPI(
    title="Smart-Farm-Ai API",
    version="3.1.0",
    description="Production-grade AI inference & authentication API for Smart-Farm-Ai."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Part 3.5: Serve Heatmap Outputs to Frontend ──────────────
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "tmp", "plant_doctor_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

def cleanup_outputs(max_files: int = 20):
    """Keep only the latest N images in the output directory."""
    try:
        files = [os.path.join(OUTPUT_DIR, f) for f in os.listdir(OUTPUT_DIR) if f.endswith('.jpg')]
        if len(files) <= max_files:
            return
        # Sort by modification time
        files.sort(key=os.path.getmtime)
        # Delete oldest
        for f in files[:-max_files]:
            try:
                os.remove(f)
            except Exception:
                pass
        log_info(f"Cleaned up {len(files) - max_files} old heatmap images.")
    except Exception as e:
        log_error(f"Cleanup failed: {e}")


# ══════════════════════════════════════════════════════════════
# PART 2 + 3 — SAFE STARTUP MODEL LOADING + DIAGNOSTICS BANNER
# ══════════════════════════════════════════════════════════════

@app.on_event("startup")
def startup():
    global disease_engine, crop_engine, yield_engine, yield_pipeline
    global _disease_loaded, _crop_loaded, _yield_loaded
    global ensemble_engine, _ensemble_loaded

    # ── Version probing ───────────────────────────────────────
    py_ver    = platform.python_version()
    np_ver    = _safe_import_version("numpy")
    torch_ver = _safe_import_version("torch")

    # ── Fix Joblib unpickling for models saved with 'config' ──
    import smart_system.config
    sys.modules['config'] = smart_system.config

    # ── Load models safely ────────────────────────────────────
    disease_status = _load_disease()
    crop_status    = _load_crop()
    yield_status   = _load_yield()

    # ── Load Yield Trends ─────────────────────────────────────
    global yield_trends_df
    try:
        import pandas as pd
        from smart_system.config import YIELD_MODEL_DIR
        trends_path = os.path.join(YIELD_MODEL_DIR, "yield_trends.csv")
        if os.path.exists(trends_path):
            yield_trends_df = pd.read_csv(trends_path)
            log_info(f"Loaded Yield Trends: {len(yield_trends_df)} rows")
    except Exception as e:
        log_error(f"Failed to load Yield Trends: {e}")

    # ── Initialize Ensemble Engine ───────────────────────
    # Load ResNet-50 + EfficientNet-B1 as secondary ensemble models.
    # If this fails, the system falls back to EfficientNet-B0 only.
    if disease_status and disease_engine is not None:
        try:
            from smart_system.ensemble_engine import EnsembleEngine
            ensemble_engine = EnsembleEngine(
                disease_engine=disease_engine,
                num_classes=len(disease_engine.class_names),
                enable_early_exit=True,
            )
            ok = ensemble_engine.load_secondary_models()
            if ok:
                _ensemble_loaded = True
                log_info("Ensemble Engine (ResNet-50 + EfficientNet-B1) loaded [OK]")
            else:
                log_info("Secondary ensemble not available - using EfficientNet-B0 only")
                ensemble_engine = None
        except Exception as e:
            log_error(f"Ensemble Engine init failed: {e}")
            ensemble_engine = None

    # ── Initialize Plant Doctor Pipeline (now with Ensemble) ───
    global plant_doctor_pipeline
    if disease_status and disease_engine is not None:
        try:
            from smart_system.plant_doctor import PlantDoctorPipeline
            plant_doctor_pipeline = PlantDoctorPipeline(
                disease_engine=disease_engine,
                output_dir=os.path.join(PROJECT_ROOT, "tmp", "plant_doctor_output"),
                enable_gradcam=True,
                enable_similarity=True,
                unknown_threshold=60.0,
                ensemble_engine=ensemble_engine,   # Pass ensemble (None if not loaded)
            )
            log_info("Plant Doctor Pipeline initialized [OK]")
        except Exception as e:
            log_error(f"Plant Doctor Pipeline init failed: {e}")

    # ── Initialize Phase-1 Yield Prediction Pipeline ──────────
    if yield_status and yield_engine is not None and yield_engine._use_encoders:
        try:
            from smart_system.yield_predictor.pipeline import YieldPipeline
            yield_pipeline = YieldPipeline()
            yield_pipeline.load(
                model         = yield_engine.model,
                area_encoder  = yield_engine.area_encoder,
                crop_encoder  = yield_engine.crop_encoder,
            )
            log_info("Yield Prediction Pipeline (Phase-1) initialized [OK]")
        except Exception as e:
            log_error(f"Yield Pipeline init failed: {e}")

    disease_icon  = "[OK]" if disease_status       else "[MISSING]"
    crop_icon     = "[OK]" if crop_status           else "[MISSING]"
    yield_icon    = "[OK]" if yield_status          else "[MISSING]"
    doctor_icon   = "[OK]" if plant_doctor_pipeline else "[MISSING]"
    ensemble_icon = "[OK]" if _ensemble_loaded       else "[NOT TRAINED]"

    banner = f"""
================================
  SMART AGRICULTURE AI API
================================
  Python  : {py_ver}
  NumPy   : {np_ver}
  Torch   : {torch_ver}
  Port    : 8000
  Started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
--------------------------------
  Models Status:
    Disease Model    {disease_icon}
    Crop Model       {crop_icon}
    Yield Model      {yield_icon}
    Plant Doctor AI  {doctor_icon}
    Ensemble Models  {ensemble_icon}
================================
"""
    print(banner)
    log_info(f"Server started | disease={disease_status} | crop={crop_status} | yield={yield_status} | plant_doctor={'OK' if plant_doctor_pipeline else 'FAIL'}")


def _safe_import_version(pkg: str) -> str:
    try:
        import importlib.metadata
        return importlib.metadata.version(pkg)
    except Exception:
        return "unknown"


def _load_disease() -> bool:
    global disease_engine, _disease_loaded
    try:
        from smart_system.disease_engine import DiseaseEngine
        engine = DiseaseEngine()
        ok = engine.load()
        if ok:
            disease_engine = engine
            _disease_loaded = True
            log_info("Disease Model Loaded [OK]")
        else:
            log_error("Disease Model load() returned False ⚠️")
        return ok
    except Exception as e:
        log_error(f"Disease Model load exception: {e}")
        return False


def _load_crop() -> bool:
    global crop_engine, _crop_loaded
    try:
        from smart_system.crop_engine import CropEngine
        engine = CropEngine()
        ok = engine.load()
        if ok:
            crop_engine = engine
            _crop_loaded = True
            log_info("Crop Model Loaded [OK]")
        else:
            log_error("Crop Model load() returned False ⚠️")
        return ok
    except Exception as e:
        log_error(f"Crop Model load exception: {e}")
        return False


def _load_yield() -> bool:
    global yield_engine, _yield_loaded
    try:
        from smart_system.yield_engine import YieldEngine
        engine = YieldEngine()
        ok = engine.load()
        if ok:
            yield_engine = engine
            _yield_loaded = True
            log_info("Yield Model Loaded [OK]")
        else:
            log_error("Yield Model load() returned False ⚠️")
        return ok
    except Exception as e:
        log_error(f"Yield Model load exception: {e}")
        return False


# ══════════════════════════════════════════════════════════════
# PART 4 — INPUT VALIDATION MODELS
# ══════════════════════════════════════════════════════════════

VALID_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp", ".gif"}

class CropRequest(BaseModel):
    Nitrogen:    float
    Phosphorus:  float
    Potassium:   float
    Temperature: float
    Humidity:    float
    pH:          float
    Rainfall:    float

    @validator("Nitrogen")
    def val_nitrogen(cls, v):
        if not (0 <= v <= 300):
            raise ValueError("Nitrogen must be 0–300 kg/ha")
        return v

    @validator("Phosphorus")
    def val_phosphorus(cls, v):
        if not (0 <= v <= 200):
            raise ValueError("Phosphorus must be 0–200 kg/ha")
        return v

    @validator("Potassium")
    def val_potassium(cls, v):
        if not (0 <= v <= 300):
            raise ValueError("Potassium must be 0–300 kg/ha")
        return v

    @validator("Temperature")
    def val_temperature(cls, v):
        if not (-10 <= v <= 60):
            raise ValueError("Temperature must be -10–60 °C")
        return v

    @validator("Humidity")
    def val_humidity(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("Humidity must be 0–100 %")
        return v

    @validator("pH")
    def val_ph(cls, v):
        if not (0 <= v <= 14):
            raise ValueError("pH must be 0–14")
        return v

    @validator("Rainfall")
    def val_rainfall(cls, v):
        if not (0 <= v <= 5000):
            raise ValueError("Rainfall must be 0–5000 mm")
        return v


class YieldRequest(BaseModel):
    Area: str
    Crop: str
    Year: int
    Season: str = None

    @validator("Area")
    def val_area(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Area cannot be empty")
        return v

    @validator("Crop")
    def val_crop(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Crop cannot be empty")
        return v

    @validator("Year")
    def val_year(cls, v):
        if not (1990 <= v <= 2035):
            raise ValueError("Year must be between 1990 and 2035")
        return v


class YieldTrendRequest(BaseModel):
    Area: str
    Crop: str

class FarmAssistantRequest(BaseModel):
    question: str


# ── Auth Request Models ───────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserSettingsRequest(BaseModel):
    username: Optional[str] = None   # ignored; identity comes from the bearer token
    farm_location: Optional[str] = None
    settings: Optional[dict] = None


# ══════════════════════════════════════════════════════════════
# PART 5 — STRUCTURED ERROR RESPONSE HELPER
# ══════════════════════════════════════════════════════════════

def error_response(message: str, status_code: int = 500):
    log_error(message)
    raise HTTPException(
        status_code=status_code,
        detail={"status": "error", "message": message}
    )


# ══════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/auth/register")
def register_user(req: RegisterRequest):
    """Register a new user account and save credentials to SQLite database."""
    log_request("/auth/register", {"username": req.username})
    try:
        user = create_user(
            username=req.username,
            password=req.password,
            full_name=req.full_name
        )
        token = history_store.create_session(user["id"])
        return {
            "status": "success",
            "message": "Account created successfully!",
            "user": user,
            "token": token
        }
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"status": "error", "message": str(e)}
        )
    except Exception as e:
        log_error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": "error", "message": f"Server error: {str(e)}"}
        )


@app.post("/auth/login")
def login_user(req: LoginRequest):
    """Authenticate existing user credentials against SQLite database."""
    log_request("/auth/login", {"username": req.username})
    user = authenticate_user(username=req.username, password=req.password)
    if not user:
        existing = get_user_by_username(req.username)
        if not existing:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": f"User '{req.username}' does not exist. Please sign up first!"}
            )
        else:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Incorrect password. Please try again."}
            )

    token = history_store.create_session(user["id"])
    return {
        "status": "success",
        "message": "Login successful!",
        "user": user,
        "token": token
    }


@app.get("/auth/me")
def get_user_profile(request: Request):
    """Profile of the user identified by the bearer token."""
    user = _require_user(request)
    return {"status": "success", "user": user}


@app.put("/auth/settings")
def save_user_settings(req: UserSettingsRequest, request: Request):
    """Save farm location / preferences for the authenticated user (token, not client-sent id)."""
    user = _require_user(request)
    log_request("/auth/settings", {"user_id": user["id"], "farm_location": req.farm_location})
    updated = update_user_settings(user["id"], farm_location=req.farm_location, settings=req.settings)
    if not updated:
        raise HTTPException(status_code=404, detail={"status": "error", "message": "User not found"})
    return {"status": "success", "message": "Settings updated successfully", "user": updated}


@app.post("/auth/logout")
def logout_user(request: Request):
    history_store.revoke_session(_bearer(request))
    return {"status": "success"}


# ══════════════════════════════════════════════════════════════
# PART 8 — HEALTH CHECK ENDPOINT
# ══════════════════════════════════════════════════════════════

def _model_status() -> dict:
    """
    Truthful per-model status.  'loaded' is True only if the model object
    exists in memory right now; otherwise a reason is given.
    """
    disease_ok = bool(_disease_loaded and disease_engine is not None)
    crop_ok    = bool(_crop_loaded and crop_engine is not None)
    yield_ok   = bool(_yield_loaded and yield_engine is not None
                      and getattr(yield_engine, "model", None) is not None)

    disease = {"loaded": disease_ok}
    if disease_ok:
        disease.update({
            "type":         disease_engine._architecture,
            "num_classes":  disease_engine.num_classes,
            "input_size":   "224 x 224",
            "device":       str(disease_engine.device),
            "gradcam":      bool(plant_doctor_pipeline is not None),
            "secondary_ensemble": {
                "loaded": bool(_ensemble_loaded),
                "note": ("ResNet-50 + EfficientNet-B1 fine-tuned checkpoints loaded"
                         if _ensemble_loaded else
                         "No fine-tuned ResNet-50/EfficientNet-B1 checkpoints found - "
                         "predictions use EfficientNet-B0 only"),
            },
        })
    else:
        disease["reason"] = "Disease model failed to load - see logs/api_log.txt"

    crop = {"loaded": crop_ok}
    if crop_ok:
        d = crop_engine.describe()
        crop.update({
            "type":         d["type"],
            "members":      d["members"],
            "weights":      d["weights"],
            "num_classes":  d["n_classes"],
            "num_features": d["n_features"],
        })
    else:
        crop["reason"] = "Crop model failed to load - see logs/api_log.txt"

    yld = {"loaded": yield_ok}
    if yield_ok:
        yld.update({
            "type":        "XGBoost Regressor",
            "features":    yield_engine.features,
            "native_unit": "t/ha",
            "api_unit":    "hg/ha",
            "num_areas":   len(yield_engine.known_areas),
            "num_crops":   len(yield_engine.known_crops),
        })
    else:
        yld["reason"] = "Yield model failed to load - see logs/api_log.txt"

    gemini_key = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "disease": disease,
        "crop":    crop,
        "yield":   yld,
        "gemini":  {
            "configured": gemini_key,
            "role": "advisory/explanation only - never produces predictions",
            **({} if gemini_key else {"reason": "GEMINI_API_KEY not set"}),
        },
    }


@app.get("/health")
async def health_check():
    models = _model_status()
    return {
        "status":          "running",
        "models":          models,
        # legacy flat flags (kept for existing clients)
        "disease_model":   models["disease"]["loaded"],
        "ensemble_models": _ensemble_loaded,
        "crop_model":      models["crop"]["loaded"],
        "yield_model":     models["yield"]["loaded"],
        "timestamp":       datetime.now().isoformat()
    }


@app.get("/ml/status")
async def ml_status():
    """ML pipeline status page data (used by the Model Status UI)."""
    return {"models": _model_status(), "timestamp": datetime.now().isoformat()}


# ── Admin/debug access ────────────────────────────────────────
def _require_admin(request: Request) -> None:
    """Admin endpoints need ADMIN_TOKEN in the env and X-Admin-Token header."""
    token = os.getenv("ADMIN_TOKEN")
    if not token:
        raise HTTPException(status_code=403, detail="Admin endpoints are disabled (ADMIN_TOKEN not set).")
    supplied = request.headers.get("x-admin-token", "")
    if not secrets.compare_digest(supplied, token):
        raise HTTPException(status_code=403, detail="Invalid admin token.")


# ── User identity (bearer token -> sessions table) ────────────
def _bearer(request: Request):
    h = request.headers.get("authorization", "")
    return h[7:].strip() if h.lower().startswith("bearer ") else None


def _optional_user(request: Request):
    return history_store.resolve_token(_bearer(request))


def _require_user(request: Request) -> dict:
    user = _optional_user(request)
    if not user:
        raise HTTPException(status_code=401,
                            detail={"status": "error", "message": "Authentication required. Please sign in."})
    return user


def _save(user, ptype: str, label: str, **kw):
    """Persist a prediction for a signed-in user. Never breaks the prediction itself."""
    if not user:
        return None
    try:
        hid = history_store.record_prediction(user["id"], ptype, label, **kw)
        log_info(f"HISTORY  saved {ptype} #{hid} for user {user['id']}")
        return hid
    except Exception as e:
        log_error(f"History save failed ({ptype}): {e}")
        return None


def _thumb_b64(path: str, size: int = 256):
    """Small JPEG (base64) of a real Grad-CAM overlay, stored with the prediction."""
    try:
        import base64, io
        from PIL import Image
        im = Image.open(path).convert("RGB")
        im.thumbnail((size, size))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=70)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return None


def _save_plant_doctor(user, result: dict, model_label: str):
    if not user:
        return None
    tops = [t for t in (result.get("top_predictions") or []) if isinstance(t, dict)]
    raw = tops[0].get("raw_label") if tops else None
    unknown = str(result.get("status", "")).lower() == "unknown"
    label = "Unknown" if unknown else (raw or f"{result.get('plant', 'Unknown')}___{result.get('disease', 'Unknown')}")
    hp = result.get("heatmap_path")
    return _save(
        user, "disease", label,
        confidence=result.get("confidence"), model=model_label,
        inputs={"source": "leaf image upload"},
        result={
            "plant": result.get("plant"), "disease": result.get("disease"),
            "status": result.get("status"), "severity": result.get("severity"),
            "risk": result.get("risk"), "summary": result.get("summary"),
            "final_advice": result.get("final_advice"),
            "top_predictions": [{"name": t.get("name"), "raw_label": t.get("raw_label"),
                                 "confidence": t.get("confidence")} for t in tops[:3]],
            "gradcam_available": bool(hp),
            "thumbnail": _thumb_b64(hp) if hp and os.path.isfile(hp) else None,
        },
    )


def _save_yield(user, result: dict, inputs: dict):
    intel = result.get("intelligence") or {}
    risk = intel.get("risk") or {}
    return _save(
        user, "yield", f"{result.get('crop')} - {result.get('area')}",
        value=result.get("predicted_yield"), unit=result.get("yield_unit", "hg/ha"),
        model=result.get("model") or "XGBoost Regressor", inputs=inputs,
        result={
            "area": result.get("area"), "crop": result.get("crop"),
            "season": result.get("season", inputs.get("season")), "year": result.get("year"),
            "yield_level": result.get("yield_level"),
            "raw_model_output": result.get("raw_model_output"),
            "raw_model_unit": result.get("raw_model_unit"),
            "inference_ms": result.get("inference_ms"),
            "overall_risk": risk.get("overall_risk"),
            "risk": risk, "recommendations": intel.get("recommendations"),
            "explanation": intel.get("explanation"),
        },
    )


# ══════════════════════════════════════════════════════════════
# WEATHER ENDPOINT (WeatherAPI with Open-Meteo High Reliability Fallback)
# ══════════════════════════════════════════════════════════════

# WMO Weather code mapping for Open-Meteo
WMO_WEATHER_MAP = {
    0: ("Clear Sky", "sun"),
    1: ("Mainly Clear", "sun"),
    2: ("Partly Cloudy", "cloud-sun"),
    3: ("Overcast", "cloud"),
    45: ("Foggy", "cloud-fog"),
    48: ("Depositing Rime Fog", "cloud-fog"),
    51: ("Light Drizzle", "cloud-drizzle"),
    53: ("Moderate Drizzle", "cloud-drizzle"),
    55: ("Dense Drizzle", "cloud-drizzle"),
    56: ("Light Freezing Drizzle", "cloud-drizzle"),
    57: ("Dense Freezing Drizzle", "cloud-drizzle"),
    61: ("Slight Rain", "cloud-rain"),
    62: ("Light Rain", "cloud-rain"),
    63: ("Moderate Rain", "cloud-rain"),
    65: ("Heavy Rain", "cloud-rain"),
    66: ("Light Freezing Rain", "cloud-rain"),
    67: ("Heavy Freezing Rain", "cloud-rain"),
    71: ("Slight Snow", "cloud-snow"),
    73: ("Moderate Snow", "cloud-snow"),
    75: ("Heavy Snow", "cloud-snow"),
    77: ("Snow Grains", "cloud-snow"),
    80: ("Slight Rain Showers", "cloud-rain"),
    81: ("Moderate Rain Showers", "cloud-rain"),
    82: ("Violent Rain Showers", "cloud-rain"),
    85: ("Slight Snow Showers", "cloud-snow"),
    86: ("Heavy Snow Showers", "cloud-snow"),
    95: ("Thunderstorm", "cloud-lightning"),
    96: ("Thunderstorm with Slight Hail", "cloud-lightning"),
    99: ("Thunderstorm with Heavy Hail", "cloud-lightning"),
}

@app.get("/weather")
async def get_live_weather(
    location: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None
):
    """
    Fetch live weather for a given location or city/state.
    Supports WeatherAPI (if WEATHER_API_KEY/WEATHERAPI_KEY set) and Open-Meteo (zero key needed).
    Returns real temperature (°C), weather condition, condition icon, humidity (%), wind speed (km/h), and precipitation (mm).
    """
    query = (location or "").strip()
    if not query:
        if city:
            query = f"{city.strip()}, {state.strip()}" if state else city.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail={"status": "error", "message": "Location parameter is required."}
        )

    log_request("/weather", {"query": query})

    # Parse city and state hints
    parts = [p.strip() for p in query.split(",") if p.strip()]
    city_name = parts[0] if parts else query
    state_name = parts[1] if len(parts) > 1 else ""

    # 0. OpenWeatherMap (primary when OPENWEATHER_API_KEY is set): geocode, then current weather
    owm_key = os.getenv("OPENWEATHER_API_KEY")
    if owm_key:
        try:
            geo = requests.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={"q": ",".join([p for p in (city_name, state_name, "IN") if p]), "limit": 5, "appid": owm_key},
                timeout=6,
            )
            places = geo.json() if geo.status_code == 200 else []
            if not places and state_name:       # retry city alone (India)
                geo = requests.get("https://api.openweathermap.org/geo/1.0/direct",
                                   params={"q": f"{city_name},IN", "limit": 5, "appid": owm_key}, timeout=6)
                places = geo.json() if geo.status_code == 200 else []
            if places:
                pick = next((x for x in places
                             if state_name and state_name.lower() in (x.get("state") or "").lower()), places[0])
                wr = requests.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": pick["lat"], "lon": pick["lon"], "units": "metric", "appid": owm_key},
                    timeout=6,
                )
                if wr.status_code == 200:
                    w = wr.json()
                    main = w.get("main") or {}
                    if main.get("temp") is None:
                        raise ValueError("OpenWeatherMap response has no temperature")
                    wx = (w.get("weather") or [{}])[0]
                    group = (wx.get("main") or "").lower()
                    icon_type = {
                        "thunderstorm": "cloud-lightning", "drizzle": "cloud-drizzle", "rain": "cloud-rain",
                        "snow": "cloud-snow", "clear": "sun", "clouds": "cloud",
                        "mist": "cloud-fog", "fog": "cloud-fog", "haze": "cloud-fog", "smoke": "cloud-fog",
                        "dust": "cloud-fog", "sand": "cloud-fog",
                    }.get(group, "cloud-sun")
                    if group == "clouds" and (w.get("clouds") or {}).get("all", 100) < 60:
                        icon_type = "cloud-sun"
                    rain = w.get("rain") or {}
                    res_city = pick.get("name") or city_name
                    res_state = pick.get("state") or state_name
                    return {
                        "status": "success",
                        "data": {
                            "location": f"{res_city}, {res_state}".strip(", ") or query,
                            "city": res_city, "state": res_state,
                            "country": pick.get("country", "IN"),
                            "temperature": float(main["temp"]),
                            "condition": (wx.get("description") or "").title() or "Unknown",
                            "condition_code": icon_type,
                            "humidity": float(main["humidity"]) if main.get("humidity") is not None else None,
                            "wind_speed": round(float((w.get("wind") or {}).get("speed", 0.0)) * 3.6, 1),
                            "rainfall": float(rain.get("1h", 0.0)),
                            "source": "openweathermap",
                        },
                    }
                logger.warning(f"OpenWeatherMap weather returned {wr.status_code} for '{query}'")
            else:
                logger.warning(f"OpenWeatherMap could not geocode '{query}'")
        except Exception as e:
            logger.warning(f"OpenWeatherMap failed: {e}. Falling back.")

    # 1. Attempt WeatherAPI if key configured in environment
    weather_api_key = os.getenv("WEATHER_API_KEY") or os.getenv("WEATHERAPI_KEY")
    if weather_api_key:
        try:
            resp = requests.get(
                "https://api.weatherapi.com/v1/current.json",
                params={"key": weather_api_key, "q": query, "aqi": "no"},
                timeout=6
            )
            if resp.status_code == 200:
                data = resp.json()
                curr = data.get("current", {})
                if curr.get("temp_c") is None:
                    raise ValueError("WeatherAPI response has no current temperature")
                loc = data.get("location", {})
                cond = curr.get("condition", {})
                cond_text = cond.get("text", "Clear")
                
                cond_lower = cond_text.lower()
                icon_type = "sun"
                if "thunder" in cond_lower:
                    icon_type = "cloud-lightning"
                elif "rain" in cond_lower or "shower" in cond_lower:
                    icon_type = "cloud-rain"
                elif "drizzle" in cond_lower:
                    icon_type = "cloud-drizzle"
                elif "cloud" in cond_lower or "overcast" in cond_lower:
                    icon_type = "cloud-sun" if "part" in cond_lower else "cloud"
                elif "snow" in cond_lower:
                    icon_type = "cloud-snow"
                elif "fog" in cond_lower or "mist" in cond_lower:
                    icon_type = "cloud-fog"

                display_loc = f"{loc.get('name', city_name)}, {loc.get('region', state_name)}".strip(", ")
                return {
                    "status": "success",
                    "data": {
                        "location": display_loc or query,
                        "city": loc.get("name", city_name),
                        "state": loc.get("region", state_name),
                        "country": loc.get("country", "India"),
                        "temperature": float(curr.get("temp_c", 25.0)),
                        "condition": cond_text,
                        "condition_code": icon_type,
                        "humidity": float(curr.get("humidity", 60.0)),
                        "wind_speed": float(curr.get("wind_kph", 10.0)),
                        "rainfall": float(curr.get("precip_mm", 0.0)),
                        "icon_url": cond.get("icon"),
                        "source": "weatherapi"
                    }
                }
            elif resp.status_code == 400:
                logger.warning(f"WeatherAPI reported 400 for '{query}'")
        except Exception as e:
            logger.warning(f"WeatherAPI request failed: {e}. Falling back to Open-Meteo.")

    # 2. Open-Meteo Geocoding + Current Forecast (no API key required)
    lat = None
    lon = None
    resolved_city = city_name
    resolved_state = state_name
    resolved_country = "India"

    # Try state coordinate lookup from existing smart_system weather table first if state is given
    if state_name:
        coords = get_state_coordinates(state_name)
        if coords:
            lat, lon = coords

    # Geocode city via Open-Meteo Geocoding API
    try:
        geo_resp = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city_name, "count": 5, "language": "en", "format": "json"},
            timeout=6
        )
        if geo_resp.status_code == 200:
            geo_data = geo_resp.json()
            results = geo_data.get("results", [])
            if results:
                matched = results[0]
                for r in results:
                    r_admin = (r.get("admin1") or "").lower()
                    r_country = (r.get("country") or "").lower()
                    if state_name and state_name.lower() in r_admin:
                        matched = r
                        break
                    if r_country == "india":
                        matched = r

                lat = matched.get("latitude")
                lon = matched.get("longitude")
                resolved_city = matched.get("name", city_name)
                resolved_state = matched.get("admin1") or state_name
                resolved_country = matched.get("country") or "India"
    except Exception as e:
        logger.warning(f"Open-Meteo geocoding error: {e}")

    # Fallback to state coordinates if geocoding didn't resolve lat/lon
    if (lat is None or lon is None) and (state_name or city_name):
        coords = get_state_coordinates(state_name or city_name)
        if coords:
            lat, lon = coords
            resolved_state = state_name or city_name

    if lat is None or lon is None:
        raise HTTPException(
            status_code=404,
            detail={"status": "error", "message": f"Could not find geographic coordinates for '{query}'."}
        )

    # Fetch current weather from Open-Meteo
    try:
        forecast_resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
                "timezone": "auto"
            },
            timeout=6
        )
        if forecast_resp.status_code != 200:
            raise HTTPException(
                status_code=503,
                detail={"status": "error", "message": "Weather service returned an error."}
            )

        f_data = forecast_resp.json()
        current = f_data.get("current", {})

        wmo_code = current.get("weather_code", 0)
        cond_text, cond_icon = WMO_WEATHER_MAP.get(wmo_code, ("Fair", "cloud-sun"))

        display_location = f"{resolved_city}, {resolved_state}".strip(", ") if resolved_state else resolved_city

        return {
            "status": "success",
            "data": {
                "location": display_location or query,
                "city": resolved_city,
                "state": resolved_state,
                "country": resolved_country,
                "temperature": float(current.get("temperature_2m", 25.0)),
                "condition": cond_text,
                "condition_code": cond_icon,
                "humidity": float(current.get("relative_humidity_2m", 60.0)),
                "wind_speed": float(current.get("wind_speed_10m", 10.0)),
                "rainfall": float(current.get("precipitation", 0.0)),
                "source": "open-meteo"
            }
        }
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail={"status": "error", "message": "Weather service request timed out."}
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Weather fetch failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "message": f"Failed to fetch weather: {str(e)}"}
        )


# ══════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/predict-disease")
async def predict_disease(request: Request, file: UploadFile = File(...)):
    _user = _optional_user(request)
    log_request("/predict-disease", {"filename": file.filename})
    try:
        if not _disease_loaded or disease_engine is None:
            error_response("Disease model is not loaded", 503)

        # ── PART 4: Validate image extension ──────────────────
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in VALID_IMAGE_EXTENSIONS:
            log_error(f"Invalid file type: {ext}")
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Invalid image file. Supported: jpg, jpeg, png, bmp, tiff, webp"}
            )

        # Save temp file
        temp_dir  = os.path.join(PROJECT_ROOT, "tmp")
        os.makedirs(temp_dir, exist_ok=True)
        safe_name = f"upload_{datetime.now().strftime('%H%M%S%f')}{ext}"
        file_path = os.path.join(temp_dir, safe_name)

        try:
            with open(file_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

            result = disease_engine.predict(file_path)

            if result.get("success"):
                disease_name = result["disease_name"]
                confidence   = result["confidence"]
                log_prediction("DISEASE", f"{disease_name} ({confidence:.1f}%)")

                # D3 — Guard for LOW confidence predictions
                if confidence < 40.0:
                    return {
                        "status":           "uncertain",
                        "message":          "Confidence too low. Please retake with a clearer, well-lit leaf photo.",
                        "confidence":       round(confidence, 1),
                        "confidence_level": "LOW",
                        "top_predictions": [
                            {"disease": name, "confidence": round(conf, 1)}
                            for name, conf in result.get("top_predictions", [])[:3]
                        ],
                    }

                _hid = _save(_user, "disease", disease_name, confidence=confidence,
                             model=result.get("model"), inputs={"source": "leaf image upload"},
                             result={"plant": result.get("plant"), "condition": result.get("condition"),
                                     "confidence_level": result.get("confidence_level"),
                                     "top_predictions": [{"name": n, "confidence": round(c, 1)}
                                                         for n, c in result.get("top_predictions", [])[:3]]})
                return {
                    "status":           "success",
                    "history_id":       _hid,
                    "disease":          disease_name,
                    "confidence":       round(confidence, 1),
                    "plant":            result.get("plant", "Unknown"),
                    "condition":        result.get("condition", "Unknown"),
                    "confidence_level": result.get("confidence_level", "LOW"),
                    "model":            result.get("model"),
                    "inference_ms":     result.get("inference_ms"),
                    # D2 — Top-3 alternative diagnoses
                    "top_predictions": [
                        {"disease": name, "confidence": round(conf, 1)}
                        for name, conf in result.get("top_predictions", [])[:3]
                    ],
                }
            else:
                error_response(result.get("error", "Disease prediction failed"))

        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Disease prediction exception: {e}")


# ══════════════════════════════════════════════════════════════
# DETECT-DISEASE — ENSEMBLE + GRAD-CAM ENDPOINT (v3.1)
# ══════════════════════════════════════════════════════════════

def _detect_model_label() -> str:
    if _ensemble_loaded:
        return "Ensemble: EfficientNet-B0 + ResNet-50 + EfficientNet-B1"
    return disease_engine._architecture if disease_engine else "unavailable"


@app.post("/detect-disease")
async def detect_disease(request: Request, file: UploadFile = File(...)):
    """
    Ensemble-based disease detection (EfficientNet-B0 + ResNet-50 + EfficientNet-B1).

    Output JSON (v3.1)
    -------------------
    {
        "prediction":            str,
        "confidence":            float,
        "heatmap":               str  (base64 JPEG),
        "heatmap_url":           str,
        "is_unknown":            bool,
        "unknown_reason":        str,
        "used_ensemble":         bool,
        "early_exit_triggered":  bool,
        "ensemble_weights":      dict,
        "model_confidences":     {"EfficientNet-B0": float, ...},
        "disagreement_detected": bool,
        "entropy":               float,
        "top_predictions":       [{"label": str, "confidence": float}, ...]
    }
    """
    log_request("/detect-disease", {"filename": file.filename})
    _user = _optional_user(request)

    try:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in VALID_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Invalid image. Supported: jpg, jpeg, png, bmp, tiff, webp"}
            )

        temp_dir  = os.path.join(PROJECT_ROOT, "tmp")
        os.makedirs(temp_dir, exist_ok=True)
        safe_name = f"ensemble_{datetime.now().strftime('%H%M%S%f')}{ext}"
        file_path = os.path.join(temp_dir, safe_name)

        try:
            with open(file_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

            # ── OPTION A: Full pipeline (Ensemble + Grad-CAM) ─
            if plant_doctor_pipeline is not None:
                diagnosis = plant_doctor_pipeline.diagnose(file_path, top_k=5)

                heatmap_b64  = ""
                heatmap_url  = ""
                heatmap_path = diagnosis.get("heatmap_path", "")
                if heatmap_path and os.path.isfile(heatmap_path):
                    try:
                        import base64
                        with open(heatmap_path, "rb") as hf:
                            heatmap_b64 = base64.b64encode(hf.read()).decode("utf-8")
                        cleanup_outputs(max_files=20)
                        heatmap_url = (
                            f"{str(request.base_url).rstrip('/')}"
                            f"/outputs/{os.path.basename(heatmap_path)}"
                        )
                    except Exception as b64_err:
                        log_error(f"Heatmap base64 failed: {b64_err}")

                em = diagnosis.get("ensemble_meta", {})
                is_unknown = em.get("is_unknown", diagnosis.get("status") == "Unknown")
                pred_str   = (
                    "Unknown Disease"
                    if is_unknown
                    else f"{diagnosis['plant']} - {diagnosis['disease']}"
                )

                log_prediction(
                    "DETECT-DISEASE",
                    f"{pred_str} ({diagnosis['confidence']:.1f}%) "
                    f"ensemble={em.get('used_ensemble')} "
                    f"early_exit={em.get('early_exit_triggered')} "
                    f"unknown={is_unknown} "
                    f"disagreement={em.get('disagreement_detected')} "
                    f"entropy={em.get('entropy', 0):.3f}"
                )

                # v3.1 top_predictions: prefer list-of-dicts, fall back to tuples
                raw_top = em.get("top_predictions_dict") or []
                if raw_top:
                    top_out = [
                        {"label": d["label"], "confidence": d["confidence_pct"]}
                        for d in raw_top[:5]
                    ]
                else:
                    # Single-model path: pipeline emits dicts
                    # {"name", "raw_label", "confidence", ...}
                    top_out = [
                        {"label": t["name"], "confidence": round(t["confidence"], 1)}
                        if isinstance(t, dict) else
                        {"label": t[0], "confidence": round(t[1], 1)}
                        for t in diagnosis.get("top_predictions", [])[:5]
                    ]

                return {
                    "status":                "success",
                    "model":                 _detect_model_label(),
                    "prediction":            pred_str,
                    "history_id":            _save_plant_doctor(_user, diagnosis, _detect_model_label()),
                    "confidence":            round(diagnosis["confidence"], 2),
                    "heatmap":               heatmap_b64,
                    "heatmap_url":           heatmap_url,
                    # open-set
                    "is_unknown":            is_unknown,
                    "unknown_detected":      is_unknown,
                    "unknown_reason":        em.get("unknown_reason", ""),
                    # ensemble meta
                    "used_ensemble":         em.get("used_ensemble", False),
                    "early_exit_triggered":  em.get("early_exit_triggered", False),
                    "ensemble_weights":      em.get("ensemble_weights", {}),
                    # quality signals
                    "model_confidences":     em.get("model_confidences", {}),
                    "disagreement_detected": em.get("disagreement_detected", False),
                    "entropy":               em.get("entropy", 0.0),
                    # predictions
                    "top_predictions":       top_out,
                    "plant":                 diagnosis.get("plant", "Unknown"),
                    "disease":               diagnosis.get("disease", "Unknown"),
                    "severity":              diagnosis.get("severity", {}),
                }

            # ── OPTION B: Ensemble only (no Grad-CAM) ─────────
            elif ensemble_engine is not None:
                result = ensemble_engine.predict(file_path, top_k=5)
                if not result.get("success"):
                    error_response(result.get("error", "Ensemble prediction failed"))

                top_out = [
                    {"label": d["label"], "confidence": d["confidence_pct"]}
                    for d in result.get("top_predictions", [])[:5]
                ]
                log_prediction(
                    "DETECT-DISEASE",
                    f"{result['prediction']} ({result['confidence']:.1f}%) "
                    f"ensemble={result.get('used_ensemble')} "
                    f"unknown={result.get('is_unknown')}"
                )
                return {
                    "status":                "success",
                    "model":                 _detect_model_label(),
                    "prediction":            result["prediction"],
                    "confidence":            round(result["confidence"], 2),
                    "heatmap":               "",
                    "heatmap_url":           "",
                    "is_unknown":            result.get("is_unknown", False),
                    "unknown_detected":      result.get("unknown_detected", False),
                    "unknown_reason":        result.get("unknown_reason", ""),
                    "used_ensemble":         result.get("used_ensemble", False),
                    "early_exit_triggered":  result.get("early_exit_triggered", False),
                    "ensemble_weights":      result.get("ensemble_weights", {}),
                    "model_confidences":     result.get("model_confidences", {}),
                    "disagreement_detected": result.get("disagreement_detected", False),
                    "entropy":               result.get("entropy", 0.0),
                    "top_predictions":       top_out,
                }

            # ── OPTION C: Single B0 fallback ───────────────────
            elif _disease_loaded and disease_engine is not None:
                result = disease_engine.predict(file_path, top_k=5)
                if not result.get("success"):
                    error_response(result.get("error", "Disease prediction failed"))
                top_out = [
                    {"label": name, "confidence": round(conf, 1)}
                    for name, conf in result.get("top_predictions", [])[:5]
                ]
                return {
                    "status":                "success",
                    "model":                 _detect_model_label(),
                    "prediction":            result["disease_name"],
                    "history_id":            _save(_user, "disease", result["disease_name"],
                                                   confidence=result["confidence"], model=result.get("model"),
                                                   inputs={"source": "leaf image upload"}),
                    "confidence":            round(result["confidence"], 2),
                    "heatmap":               "",
                    "heatmap_url":           "",
                    "is_unknown":            result["confidence"] < 70.0,
                    "unknown_detected":      result["confidence"] < 70.0,
                    "unknown_reason":        "low_confidence(single_model)" if result["confidence"] < 70.0 else "",
                    "used_ensemble":         False,
                    "early_exit_triggered":  False,
                    "ensemble_weights":      {},
                    "model_confidences":     {"efficientnet_b0": round(result["confidence"], 2)},
                    "disagreement_detected": False,
                    "entropy":               0.0,
                    "top_predictions":       top_out,
                }
            else:
                error_response("No disease models are loaded", 503)

        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Detect-disease exception: {e}")


# ══════════════════════════════════════════════════════════════
# ENSEMBLE WEIGHT MANAGEMENT ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.get("/ensemble-weights")
async def get_ensemble_weights():
    """
    Return current ensemble model weights.

    Response
    --------
    {
        "weights": {"efficientnet_b0": 0.4, "resnet50": 0.3, "efficientnet_b1": 0.3},
        "ensemble_loaded": bool
    }
    """
    if ensemble_engine is None:
        return {"weights": {}, "ensemble_loaded": False}
    return {"weights": ensemble_engine.weights, "ensemble_loaded": _ensemble_loaded}


@app.post("/ensemble-weights")
async def update_ensemble_weights(request: Request, payload: dict):
    _require_admin(request)
    """
    Dynamically update ensemble weights at runtime.

    Accepts two modes:

    Mode 1 — Direct weights:
        { "weights": {"efficientnet_b0": 0.5, "resnet50": 0.25, "efficientnet_b1": 0.25} }

    Mode 2 — Accuracy-based (auto-normalized):
        { "accuracies": {"efficientnet_b0": 0.946, "resnet50": 0.921, "efficientnet_b1": 0.934} }

    Response
    --------
    { "status": "updated", "new_weights": { ... } }
    """
    if ensemble_engine is None:
        raise HTTPException(status_code=503, detail="Ensemble engine not loaded.")

    try:
        from smart_system.ensemble_engine import compute_weights_from_accuracy

        if "accuracies" in payload:
            accs = payload["accuracies"]
            if not isinstance(accs, dict) or len(accs) == 0:
                raise HTTPException(status_code=422, detail="'accuracies' must be a non-empty dict.")
            ensemble_engine.set_weights_from_accuracy(accs)
            log_info(f"Ensemble weights updated from accuracies: {accs}")

        elif "weights" in payload:
            w = payload["weights"]
            if not isinstance(w, dict) or len(w) == 0:
                raise HTTPException(status_code=422, detail="'weights' must be a non-empty dict.")
            ensemble_engine.set_weights(w)
            log_info(f"Ensemble weights manually updated: {w}")

        else:
            raise HTTPException(
                status_code=422,
                detail="Payload must contain 'weights' or 'accuracies' key."
            )

        return {"status": "updated", "new_weights": ensemble_engine.weights}

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Weight update failed: {e}")


@app.post("/predict-crop")
async def predict_crop(request: CropRequest, http_request: Request):
    log_request("/predict-crop", request.dict())
    try:
        if not _crop_loaded or crop_engine is None:
            error_response("Crop model is not loaded", 503)

        result = crop_engine.predict(
            N=request.Nitrogen,
            P=request.Phosphorus,
            K=request.Potassium,
            temperature=request.Temperature,
            humidity=request.Humidity,
            ph=request.pH,
            rainfall=request.Rainfall,
        )

        if result.get("success"):
            crop_name  = result["crop_name"]
            confidence = result.get("confidence", 0.0)
            log_prediction("CROP", f"{crop_name} ({confidence:.1f}%)")
            
            # C5 — Agronomic advice based on soil/weather
            advice = RecommendationEngine.get_crop_advice(
                crop_name=crop_name,
                N=request.Nitrogen,
                P=request.Phosphorus,
                K=request.Potassium,
                temperature=request.Temperature,
                humidity=request.Humidity,
                ph=request.pH,
                rainfall=request.Rainfall,
            )
            
            _hid = _save(
                _optional_user(http_request), "crop", crop_name, confidence=confidence,
                model="Random Forest + XGBoost + LightGBM (weighted soft voting)",
                inputs={"N": request.Nitrogen, "P": request.Phosphorus, "K": request.Potassium,
                        "temperature": request.Temperature, "humidity": request.Humidity,
                        "ph": request.pH, "rainfall": request.Rainfall},
                result={"top_recommendations": [{"crop": c, "confidence": round(v, 1)}
                                                for c, v in result.get("top_predictions", [])[:3]],
                        "ensemble": result.get("ensemble"), "ai_advice": result.get("ai_advice"),
                        "agronomic_advice": advice, "inference_ms": result.get("inference_ms")})
            return {
                "status":           "success",
                "history_id":       _hid,
                "recommended_crop": crop_name,
                "confidence":       round(confidence, 1),
                "agronomic_advice": advice,
                "ai_advice":        result.get("ai_advice", "AI advice temporally unavailable."),
                # C1 — Top-3 alternative crop recommendations
                "top_recommendations": [
                    {"crop": crop, "confidence": round(conf, 1)}
                    for crop, conf in result.get("top_predictions", [])[:3]
                ],
                "model":            "Random Forest + XGBoost + LightGBM (weighted soft voting)",
                "ensemble":         result.get("ensemble"),
                "inference_ms":     result.get("inference_ms"),
            }
        else:
            error_response(result.get("error", "Crop prediction failed"))

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Crop prediction exception: {e}")


@app.post("/debug/crop-models")
async def debug_crop_models(request: Request, body: CropRequest):
    """Admin: per-model (RF / XGBoost / LightGBM) probabilities + ensemble."""
    _require_admin(request)
    if not _crop_loaded or crop_engine is None:
        error_response("Crop model is not loaded", 503)
    r = crop_engine.predict(
        N=body.Nitrogen, P=body.Phosphorus, K=body.Potassium,
        temperature=body.Temperature, humidity=body.Humidity,
        ph=body.pH, rainfall=body.Rainfall)
    if not r.get("success"):
        error_response(r.get("error", "Crop prediction failed"))
    return {"models": r["models"], "ensemble": r["ensemble"], "inference_ms": r["inference_ms"]}


@app.get("/crop-ensemble-weights")
async def get_crop_ensemble_weights():
    if crop_engine is None:
        return {"weights": {}, "loaded": False}
    return {"weights": crop_engine.weights, "loaded": True}


@app.post("/crop-ensemble-weights")
async def set_crop_ensemble_weights(request: Request, payload: dict):
    """Admin: {"weights": {"rf": 0.4, "xgb": 0.3, "lgb": 0.3}} - applied to every later prediction."""
    _require_admin(request)
    if crop_engine is None:
        error_response("Crop model is not loaded", 503)
    try:
        new = crop_engine.set_weights(payload.get("weights", {}))
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    return {"status": "updated", "weights": new}


@app.post("/predict-yield")
async def predict_yield(request: YieldRequest, http_request: Request):
    log_request("/predict-yield", request.dict())
    try:
        if not _yield_loaded or yield_engine is None:
            error_response("Yield model is not loaded", 503)

        result = yield_engine.predict(
            area=request.Area,
            crop=request.Crop,
            year=request.Year,
            season=request.Season,
        )

        if result.get("success"):
            pred_yield  = result["predicted_yield"]
            yield_level = result.get("yield_level", "UNKNOWN")
            uncertainty = result.get("yield_uncertainty")
            log_prediction("YIELD", f"{pred_yield:,.0f} hg/ha ({yield_level})")
            _hid = _save_yield(_optional_user(http_request), result,
                               {"crop": request.Crop, "state": request.Area,
                                "season": request.Season, "year": request.Year})
            return {
                "status":            "success",
                "history_id":        _hid,
                "predicted_yield":   pred_yield,
                "yield_level":       yield_level,
                "yield_uncertainty": uncertainty,
                "yield_unit":        result.get("yield_unit", "hg/ha"),
                "raw_model_output":  result.get("raw_model_output"),
                "raw_model_unit":    result.get("raw_model_unit"),
                "model":             result.get("model"),
                "inference_ms":      result.get("inference_ms"),
            }
        else:
            detail_msg = result.get("error", "Yield prediction failed")
            suggestions = result.get("suggestions")
            if suggestions:
                detail_msg += f" — Did you mean: {suggestions[:5]}"
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": detail_msg}
            )

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Yield prediction exception: {e}")


# ══════════════════════════════════════════════════════════════
# PHASE 1 — NEW YIELD PREDICTION PIPELINE
# ══════════════════════════════════════════════════════════════

@app.post("/predict-yield-v2")
async def predict_yield_v2(payload: dict, http_request: Request):
    """
    Phase-1 Yield Prediction Pipeline.

    Input  : { "crop": str, "state": str, "season": str, "year": int }
    Output : predicted_yield (hg/ha), yield_level, weather data used
    """
    from smart_system.yield_predictor.schema import YieldInput
    from pydantic import ValidationError

    log_request("/predict-yield-v2", payload)

    # Validate input with Pydantic
    try:
        yield_input = YieldInput(**payload)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"status": "error", "message": ve.errors()}
        )

    if yield_pipeline is None:
        error_response("Yield Prediction Pipeline is not loaded", 503)

    try:
        result = yield_pipeline.predict(yield_input)

        if result.get("success"):
            log_prediction(
                "YIELD-V2",
                f"{result['area']} | {result['crop']} | {result['year']} "
                f"-> {result['predicted_yield']:,.0f} hg/ha ({result['yield_level']})"
            )
            hid = _save_yield(_optional_user(http_request), result, dict(payload))
            return {"status": "success", "history_id": hid, **result}
        else:
            detail_msg = result.get("error", "Yield prediction failed")
            suggestions = result.get("suggestions")
            if suggestions:
                detail_msg += f" - Did you mean: {suggestions[:5]}"
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": detail_msg}
            )

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Yield-v2 prediction exception: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — INTELLIGENCE LAYER ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/predict-yield-v2/full")
async def predict_yield_full(payload: dict, http_request: Request):
    """
    Phase-2 Yield Prediction + Intelligence Pipeline.

    Runs Phase-1 (prediction) and augments the result with:
      - explanation  : WHY the model predicted this yield
      - recommendations : fertilizer, irrigation, pest watch, best practices
      - risk         : overall risk score + factor breakdown + mitigations

    Input  : { "crop": str, "state": str, "season": str, "year": int }
    Output : Phase-1 result + 'intelligence' block (structured JSON)
    """
    from smart_system.yield_predictor.schema import YieldInput
    from pydantic import ValidationError

    log_request("/predict-yield-v2/full", payload)

    # Validate input
    try:
        yield_input = YieldInput(**payload)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"status": "error", "message": ve.errors()}
        )

    if yield_pipeline is None:
        error_response("Yield Prediction Pipeline is not loaded", 503)

    try:
        result = yield_pipeline.predict_full(yield_input)

        if result.get("success"):
            intel   = result.get("intelligence", {})
            risk    = intel.get("risk", {})
            log_prediction(
                "YIELD-FULL",
                f"{result['area']} | {result['crop']} | {result['year']} "
                f"-> {result['predicted_yield']:,.0f} hg/ha "
                f"({result['yield_level']}) | Risk: {risk.get('overall_risk', '?')}"
            )
            hid = _save_yield(_optional_user(http_request), result, dict(payload))
            return {"status": "success", "history_id": hid, **result}
        else:
            detail_msg  = result.get("error", "Yield prediction failed")
            suggestions = result.get("suggestions")
            if suggestions:
                detail_msg += f" - Did you mean: {suggestions[:5]}"
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": detail_msg}
            )

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Yield-full prediction exception: {e}")


@app.post("/farm-assistant")
async def farm_assistant(request: FarmAssistantRequest, http_request: Request):
    log_request("/farm-assistant", request.dict())
    try:
        question = request.question
        context = _assistant_context(_optional_user(http_request))
        answer = generate_farming_response(question, context)
        
        # We don't log the full answer to keep logs clean, but log the query
        logger.info(f"Farm Assistant Query: '{question}'")
        
        return {
            "status": "success",
            "question": question,
            "answer": answer
        }
    except Exception as e:
        error_response(f"Farm assistant exception: {e}")


# ══════════════════════════════════════════════════════════════
# PLANT DOCTOR — AI DIAGNOSIS PIPELINE
# ══════════════════════════════════════════════════════════════

@app.post("/plant-doctor")
async def plant_doctor_diagnose(request: Request, file: UploadFile = File(...)):
    """Full AI Plant Doctor diagnosis with explainability."""
    log_request("/plant-doctor", {"filename": file.filename})
    try:
        if plant_doctor_pipeline is None:
            error_response("Plant Doctor pipeline is not loaded", 503)

        # Validate image extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in VALID_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Invalid image file. Supported: jpg, jpeg, png, bmp, tiff, webp"}
            )

        # Save temp file
        temp_dir = os.path.join(PROJECT_ROOT, "tmp")
        os.makedirs(temp_dir, exist_ok=True)
        safe_name = f"doctor_{datetime.now().strftime('%H%M%S%f')}{ext}"
        file_path = os.path.join(temp_dir, safe_name)

        try:
            with open(file_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

            # Run the full diagnostic pipeline
            result = plant_doctor_pipeline.diagnose(file_path)

            # ── Construct Visual Output URL (Improvement #4) ─────
            # Return a full URL instead of a local file path
            if result.get("heatmap_path"):
                base_url = str(request.base_url).rstrip("/")
                filename = os.path.basename(result["heatmap_path"])
                result["visual_output"] = f"{base_url}/outputs/{filename}"
                
                # Dynamic cleanup (Improvement #7)
                cleanup_outputs(max_files=20)
            else:
                result["visual_output"] = ""

            log_prediction("PLANT_DOCTOR",
                f"{result['plant']} — {result['disease']} "
                f"({result['confidence']:.1f}%) "
                f"[{result['status']}] "
                f"Severity: {result['severity']['level']}"
            )

            hid = _save_plant_doctor(_optional_user(request), result, _detect_model_label())
            return {
                "status": "success",
                "history_id": hid,
                # Which trained network produced the class probabilities
                "model": _detect_model_label(),
                "gradcam_available": bool(result.get("heatmap_path")),
                **result,
            }

        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    except HTTPException:
        raise
    except Exception as e:
        error_response(f"Plant Doctor exception: {e}")


@app.post("/yield-trends")
async def get_yield_trends(request: YieldTrendRequest):
    log_request("/yield-trends", request.dict())
    if yield_trends_df is not None:
        try:
            filtered = yield_trends_df[
                (yield_trends_df['Area'].str.lower() == request.Area.lower()) &
                (yield_trends_df['Item'].str.lower() == request.Crop.lower())
            ]
            if not filtered.empty:
                filtered = filtered.sort_values(by='Year')
                trends = [{"Year": int(row['Year']), "Yield": float(row['Yield'])} for _, row in filtered.iterrows()]
                return {"status": "success", "success": True, "area": request.Area, "crop": request.Crop, "trends": trends}
        except Exception as e:
            log_error(f"Yield trends df query error: {e}")

    # Fallback to embedded trend knowledge base
    try:
        from smart_system.yield_predictor.context import get_trend_data
        t_data = get_trend_data(request.Crop, request.Area)
        trends = [{"Year": y, "Yield": round(val, 2)} for y, val in zip(t_data.get("years", []), t_data.get("yields", []))]
        return {
            "status": "success",
            "success": True,
            "area": request.Area,
            "crop": request.Crop,
            "trends": trends
        }
    except Exception as e:
        log_error(f"Yield trends error: {e}")
        error_response(f"Failed to fetch trends: {e}")


@app.post("/smart-report")
async def smart_report(
    http_request: Request,
    file:        UploadFile = File(None),
    Nitrogen:    float      = Form(...),
    Phosphorus:  float      = Form(...),
    Potassium:   float      = Form(...),
    Temperature: float      = Form(...),
    Humidity:    float      = Form(...),
    pH:          float      = Form(...),
    Rainfall:    float      = Form(...),
    Area:        str        = Form(...),
    Crop:        str        = Form(...),
    Year:        int        = Form(...),
    Season:      str        = Form(None),
):
    _user = _optional_user(http_request)
    log_request("/smart-report", {"Area": Area, "Crop": Crop, "Year": Year})
    report = {
        "disease_prediction":   None,
        "crop_recommendation":  None,
        "yield_prediction":     None,
        "summary":              "Smart Farm Report generated.",
    }

    # 1. Disease —————————————————————————————————————————
    if file and file.filename:
        try:
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in VALID_IMAGE_EXTENSIONS:
                report["disease_prediction"] = {"error": "Invalid image file type"}
            elif not _disease_loaded or disease_engine is None:
                report["disease_prediction"] = {"error": "Disease model not loaded"}
            else:
                temp_dir  = os.path.join(PROJECT_ROOT, "tmp")
                os.makedirs(temp_dir, exist_ok=True)
                safe_name = f"report_{datetime.now().strftime('%H%M%S%f')}{ext}"
                file_path = os.path.join(temp_dir, safe_name)
                try:
                    with open(file_path, "wb") as buf:
                        shutil.copyfileobj(file.file, buf)
                    d_res = disease_engine.predict(file_path)
                    if d_res.get("success"):
                        report["disease_prediction"] = {
                            "disease":    d_res["disease_name"],
                            "confidence": d_res["confidence"],
                        }
                        log_prediction("DISEASE", d_res["disease_name"])
                    else:
                        report["disease_prediction"] = {"error": d_res.get("error")}
                finally:
                    if os.path.exists(file_path):
                        os.remove(file_path)
        except Exception as e:
            report["disease_prediction"] = {"error": str(e)}
            log_error(f"Smart-report disease error: {e}")

    # 2. Crop ─────────────────────────────────────────────
    try:
        if not _crop_loaded or crop_engine is None:
            report["crop_recommendation"] = {"error": "Crop model not loaded"}
        else:
            c_res = crop_engine.predict(
                N=Nitrogen, P=Phosphorus, K=Potassium,
                temperature=Temperature, humidity=Humidity,
                ph=pH, rainfall=Rainfall,
            )
            if c_res.get("success"):
                report["crop_recommendation"] = {
                    "recommended_crop": c_res["crop_name"],
                    "confidence":       c_res.get("confidence"),
                }
                log_prediction("CROP", c_res["crop_name"])
            else:
                report["crop_recommendation"] = {"error": c_res.get("error")}
    except Exception as e:
        report["crop_recommendation"] = {"error": str(e)}
        log_error(f"Smart-report crop error: {e}")

    # 3. Yield ────────────────────────────────────────────
    try:
        if not _yield_loaded or yield_engine is None:
            report["yield_prediction"] = {"error": "Yield model not loaded"}
        else:
            y_res = yield_engine.predict(area=Area, crop=Crop, year=Year, season=Season)
            if y_res.get("success"):
                report["yield_prediction"] = {
                    "predicted_yield":   y_res["predicted_yield"],
                    "yield_level":       y_res.get("yield_level"),
                    "yield_uncertainty": y_res.get("yield_uncertainty"),
                    "yield_unit":        y_res.get("yield_unit", "hg/ha"),
                }
                log_prediction("YIELD", f"{y_res['predicted_yield']:,.0f} hg/ha")
            else:
                report["yield_prediction"] = {"error": y_res.get("error")}
    except Exception as e:
        report["yield_prediction"] = {"error": str(e)}
        log_error(f"Smart-report yield error: {e}")

    if _user:
        yp = report.get("yield_prediction") or {}
        cp = report.get("crop_recommendation") or {}
        report["history_id"] = _save(
            _user, "report", f"{Crop} - {Area} {Year}",
            value=yp.get("predicted_yield"), unit=yp.get("yield_unit"),
            confidence=cp.get("confidence"), model="Disease CNN + Crop ensemble + XGBoost",
            inputs={"N": Nitrogen, "P": Phosphorus, "K": Potassium, "temperature": Temperature,
                    "humidity": Humidity, "ph": pH, "rainfall": Rainfall,
                    "area": Area, "crop": Crop, "year": Year, "season": Season},
            result=report)
        # Real stored context so the report is consistent with the dashboard/history
        stats = history_store.stats(_user["id"])
        report["history_summary"] = {
            "counts": stats["counts"],
            "latest": {t: (lambda r: {"label": r["label"], "confidence": r["confidence"],
                                      "value": r["value"], "unit": r["unit"],
                                      "timestamp": r["timestamp"]} if r else None)(
                            history_store.latest(_user["id"], t))
                       for t in ("disease", "crop", "yield")},
        }
    return {"smart_report": report}


# ══════════════════════════════════════════════════════════════
# DYNAMIC DATA: DASHBOARD / HISTORY / ALERTS / METADATA
# ══════════════════════════════════════════════════════════════

def _assistant_context(user) -> str:
    """Real ML results + farm context handed to Gemini (it only explains them)."""
    if not user:
        return ""
    lines = []
    if user.get("farm_location"):
        lines.append(f"Farm location: {user['farm_location']}")
    for t in ("disease", "crop", "yield"):
        r = history_store.latest(user["id"], t)
        if not r:
            continue
        if t == "disease":
            lines.append(f"Latest disease model result: {r['label']} ({r['confidence']:.1f}% confidence, {r['model']})")
        elif t == "crop":
            lines.append(f"Latest crop model recommendation: {r['label']} ({(r['confidence'] or 0):.1f}%)")
        else:
            lines.append(f"Latest XGBoost yield forecast: {r['label']} = {r['value']:,.0f} {r['unit']}")
    return "\n".join(lines)


async def _weather_for(user):
    """(weather_dict | None, error_message | None) for the user's saved farm location."""
    loc = (user.get("farm_location") or "").strip()
    if not loc:
        return None, "No farm location set. Choose one in Settings."
    try:
        return (await get_live_weather(location=loc))["data"], None
    except HTTPException as he:
        d = he.detail
        return None, (d.get("message") if isinstance(d, dict) else str(d))
    except Exception as e:
        return None, f"Weather unavailable: {e}"


async def _compute_alerts(user):
    weather, weather_err = await _weather_for(user)
    alerts = alerts_engine.build_alerts(
        weather=weather,
        latest_disease=history_store.latest(user["id"], "disease"),
        latest_yield=history_store.latest(user["id"], "yield"),
        models=_model_status(),
    )
    seen = set(user["settings"].get("alerts_seen", []))
    current_ids = {a["id"] for a in alerts}
    if seen - current_ids:                      # prune cleared alerts so they can re-fire later
        seen &= current_ids
        update_user_settings(user["id"], settings={"alerts_seen": sorted(seen)})
        user["settings"]["alerts_seen"] = sorted(seen)
    for a in alerts:
        a["unread"] = a["id"] not in seen
    return alerts, weather, weather_err


def _evaluation_metrics() -> dict:
    """Held-out EVALUATION metrics from the models' own metadata (not prediction confidence)."""
    import json as _json
    from smart_system import config as _cfg
    out = {}
    for key, folder, field, label in (
        ("disease", _cfg.DISEASE_MODEL_DIR, "best_val_accuracy", "validation accuracy"),
        ("crop",    _cfg.CROP_MODEL_DIR,    "test_accuracy",      "hold-out test accuracy"),
        ("yield",   _cfg.YIELD_MODEL_DIR,   "test_r2",            "hold-out R²"),
    ):
        try:
            with open(os.path.join(folder, "model_metadata.json"), encoding="utf-8") as f:
                m = _json.load(f)
            if m.get(field) is not None:
                out[key] = {"metric": label, "value": m[field]}
        except Exception:
            pass
    return out


def _advisory_items(latest: dict) -> list:
    """Advice text that was generated for the user's real, stored ML results."""
    items = []
    c = latest.get("crop")
    if c and (c["result"].get("ai_advice") or c["result"].get("agronomic_advice")):
        text = c["result"].get("ai_advice") or "; ".join(c["result"]["agronomic_advice"][:2])
        items.append({"kind": "crop", "title": f"Crop: {c['label']}", "text": text,
                      "source": "Gemini explaining the crop ensemble result" if c["result"].get("ai_advice") else "Agronomic rules",
                      "timestamp": c["timestamp"]})
    d = latest.get("disease")
    if d and (d["result"].get("final_advice") or d["result"].get("summary")):
        fa = d["result"].get("final_advice")
        text = fa if isinstance(fa, str) else (d["result"].get("summary") or "")
        if text:
            items.append({"kind": "disease", "title": f"Disease: {d['label']}", "text": text,
                          "source": "Plant Doctor treatment advisory", "timestamp": d["timestamp"]})
    y = latest.get("yield")
    if y:
        rec = y["result"].get("recommendations")
        text = None
        if isinstance(rec, dict):
            for v in rec.values():
                if isinstance(v, str) and v:
                    text = v
                    break
                if isinstance(v, list) and v and isinstance(v[0], str):
                    text = v[0]
                    break
        if text:
            items.append({"kind": "yield", "title": f"Yield: {y['label']}", "text": text,
                          "source": "Yield intelligence layer", "timestamp": y["timestamp"]})
    return items


@app.get("/dashboard")
async def dashboard(request: Request):
    """Everything the dashboard shows, computed from the signed-in user's stored predictions."""
    user = _require_user(request)
    uid = user["id"]
    st = history_store.stats(uid)
    latest = {t: history_store.latest(uid, t) for t in ("disease", "crop", "yield")}

    alerts, weather, weather_err = await _compute_alerts(user)

    rows = st["yield_rows"]
    to_t = lambda r: round(r["value"] / 10000.0, 3) if r["unit"] == "hg/ha" else r["value"]
    yield_history = [{"timestamp": r["timestamp"], "label": r["label"], "crop": r["crop"],
                      "state": r["state"], "season": r["season"], "year": r["year"],
                      "yield_hg_ha": r["value"], "yield_t_ha": to_t(r)} for r in rows[-12:]]

    def _group(key):
        g = {}
        for r in rows:
            if r.get(key) is not None:
                g.setdefault(r[key], []).append(to_t(r))
        return g

    yield_by_year = [{"year": k, "avg_yield_t_ha": round(sum(v) / len(v), 3), "count": len(v)}
                     for k, v in sorted(_group("year").items(), key=lambda kv: str(kv[0]))]
    yield_by_season = [{"season": k, "avg_yield_t_ha": round(sum(v) / len(v), 3), "count": len(v)}
                       for k, v in _group("season").items()]

    ly = latest["yield"]
    if ly:
        ly = {**ly, "yield_t_ha": to_t({"value": ly["value"], "unit": ly["unit"]})}

    return {
        "status": "success",
        "user": {"username": user["username"], "full_name": user["full_name"],
                 "farm_location": user["farm_location"]},
        "latest_predictions": {"disease": latest["disease"], "crop": latest["crop"], "yield": ly},
        "statistics": {**st["counts"], "averages": st["averages"],
                       "most_recommended_crop": st["most_recommended_crop"],
                       "most_detected_disease": st["most_detected_disease"]},
        "disease_distribution": st["disease_distribution"],
        "yield_history": yield_history,
        "yield_by_year": yield_by_year,
        "seasonal_yield": yield_by_season,
        "recent_activity": history_store.list_history(uid, limit=6),
        "advisory": _advisory_items(latest),
        "alerts": alerts,
        "unread_alerts": sum(1 for a in alerts if a["unread"]),
        "weather": weather, "weather_error": weather_err,
        "model_status": _model_status(),
        "model_evaluation": _evaluation_metrics(),
        "last_updated": datetime.now().astimezone().isoformat(timespec="seconds"),
    }


@app.get("/history")
async def get_history(request: Request, limit: int = 20, offset: int = 0, type: Optional[str] = None):
    """The signed-in user's prediction history (newest first). type=disease|crop|yield|report."""
    user = _require_user(request)
    if type and type not in ("disease", "crop", "yield", "report"):
        raise HTTPException(status_code=422, detail={"status": "error", "message": "Unknown type"})
    items = history_store.list_history(user["id"], type, limit=limit, offset=offset)
    return {"status": "success", "items": items, "limit": limit, "offset": offset}


@app.get("/history/{history_id}")
async def get_history_item(history_id: int, request: Request):
    user = _require_user(request)
    for r in history_store.list_history(user["id"], limit=200, with_result=True):
        if r["id"] == history_id:
            return {"status": "success", "item": r}
    raise HTTPException(status_code=404, detail={"status": "error", "message": "Not found"})


@app.get("/alerts")
async def get_alerts(request: Request):
    user = _require_user(request)
    alerts, weather, weather_err = await _compute_alerts(user)
    return {"status": "success", "alerts": alerts,
            "unread_count": sum(1 for a in alerts if a["unread"]),
            "weather_error": weather_err, "updated": datetime.now().astimezone().isoformat(timespec="seconds")}


@app.post("/alerts/seen")
async def mark_alerts_seen(request: Request):
    user = _require_user(request)
    alerts, _, _ = await _compute_alerts(user)
    update_user_settings(user["id"], settings={"alerts_seen": sorted(a["id"] for a in alerts)})
    return {"status": "success", "unread_count": 0}


@app.get("/metadata")
async def model_metadata():
    """Options the models actually support (so the UI cannot drift from the models)."""
    from smart_system.config import SEASON_MAP
    ye = yield_engine
    return {
        "status": "success",
        "supported_crops":  ye.known_crops if ye else [],
        "supported_states": ye.known_areas if ye else [],
        "supported_seasons": list(SEASON_MAP.keys()),
        "crop_recommendation_classes": (crop_engine.label_encoder.classes_.tolist()
                                        if crop_engine and crop_engine.label_encoder is not None else []),
        "disease_classes": disease_engine.class_names if disease_engine else [],
        "yield_units": {"api": "hg/ha", "model_native": "t/ha", "display": ["tons/ha", "hg/ha", "kg/ha"]},
        "models": _model_status(),
    }


# ══════════════════════════════════════════════════════════════
# GLOBAL EXCEPTION HANDLER — never crash
# ══════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log_error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal server error"}
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
