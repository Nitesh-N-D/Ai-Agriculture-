---
title: Smart Agriculture AI System
emoji: 🌾
colorFrom: green
colorTo: emerald
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">

  <h1>🌾 Smart Agriculture AI System</h1>
  <h3>AI-Based Crop Health &amp; Yield Prediction with Intelligent Advisory Support</h3>
  <p>An intelligent, ML-powered platform that empowers farmers with data-driven agronomic decisions — from disease diagnosis to harvest forecasting.</p>

  <br/>

  <!-- Tech Stack Badges -->
  <p>
    <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
    <img src="https://img.shields.io/badge/XGBoost-FF6600?style=for-the-badge&logo=xgboost&logoColor=white" alt="XGBoost" />
    <img src="https://img.shields.io/badge/Gemini_AI-1A73E8?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  </p>

  <!-- Status Badges -->
  <p>
    <img src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" alt="Status" />
    <img src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/platform-web-lightgrey?style=flat-square" alt="Platform" />
  </p>

</div>

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [System Architecture](#️-system-architecture)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Datasets](#️-datasets)
- [Installation & Setup](#-installation--setup)
- [API Reference](#-api-reference)
- [How to Use](#️-how-to-use)
- [User Authentication](#-user-authentication)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [Team Contributions](#-team-contributions)
- [License](#-license)

---

## 🌐 Project Overview

The **Smart Agriculture AI System** is a full-stack, AI-powered platform designed to modernize farming through data intelligence. By integrating deep learning computer vision, ensemble machine learning, and generative AI (Large Language Models), the system acts as an on-demand digital agronomist — helping farmers make precision-driven decisions in real time.

**Core problem it solves:** Farmers often lack timely, affordable access to agronomic expertise. Late disease diagnosis, incorrect crop selection, and yield uncertainty lead to severe losses. This system processes soil data, leaf images, and historical climate records to deliver actionable recommendations instantly.

**What makes it unique:**
- An end-to-end pipeline from raw farm data → AI inference → generative advisory.
- Three independent ML models (Vision CNN, Ensemble Classifier, XGBoost Regressor) unified behind a single REST API.
- **Explainable AI** with Grad-CAM heatmaps showing *why* the model made a diagnosis.
- Augmented with **Google Gemini** for human-readable, context-aware farming advice.
- A sleek, production-quality React dashboard with multi-language support (English, Hindi, Tamil) and a full authentication system.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔬 **AI Disease Detection** | Upload a leaf image → an EfficientNet/ResNet CNN ensemble identifies the disease (or "Healthy") with a Grad-CAM heatmap of the regions that influenced the diagnosis |
| 🧠 **Explainable AI (XAI)** | Grad-CAM heatmaps & confidence calibration make every diagnosis transparent and trustworthy |
| 🌱 **Crop Recommendation** | Input soil (N, P, K, pH) & climate data → a soft-voting ensemble (Random Forest + XGBoost + LightGBM) ranks the top 3 suitable crops with confidence scores |
| 📈 **Yield Forecasting** | Input area, crop, season & year → XGBoost regression predicts harvest density (hg/ha) with a Gemini risk assessment |
| 💬 **Farm AI Chatbot** | Conversational assistant powered by Gemini for open-ended agronomy, fertilizer, crop-rotation & organic-farming questions |
| 🧠 **Gemini Advisory** | LLM generates fertilizer dosing, biological prevention, and irrigation advice for each result |
| 🛡️ **Confidence Guards** | Flags low-confidence predictions to prevent risky agronomic decisions |
| 🔐 **User Authentication** | Register / login with secure PBKDF2-hashed credentials, token-based sessions & per-user history (SQLite) |
| 🌍 **Multi-Language UI** | Internationalization (i18n) via react-i18next — English, Hindi & Tamil |
| 📊 **Interactive Charts** | Recharts-powered visualizations of yield trends, recommendation scores & reports |
| 🗂️ **Unified Farm Report** | Combine a diagnosis + recommendations + yield forecast into one printable report |

---

## 🏗️ System Architecture

The application follows a clean, decoupled full-stack architecture designed for high performance and scalability. All machine-learning models are loaded as **singletons** at server startup and reused across requests for low latency.

```
┌────────────────────────────────────────────────────────────┐
│                 React Frontend (Port 3000)                  │
│    (Tailwind CSS · Framer Motion · Recharts · i18n)         │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTP / REST (JSON & FormData)
                           ▼
┌────────────────────────────────────────────────────────────┐
│              Python FastAPI ML Server (Port 8000)          │
│      (Pydantic Validation · Uvicorn · API Logging)          │
├───────────────┬──────────────────┬──────────────────────────┤
│  Disease      │  Crop Matrix     │   Yield Intelligence      │
│  Engine       │  (Soft-Voting    │   (XGBoost Regressor +    │
│  (EfficientNet│   Ensemble)      │    Gemini Risk Advisory)  │
│   + Grad-CAM  │                  │                           │
│   + CLIP)     │                  │                           │
└───────────────┴──────────────────┴──────────────────────────┘
        │                                   │
        ▼                                   ▼
  Plant Doctor                       Gemini AI (LLM)
  (Grad-CAM · SAM ·                 Farm Assistant
   FAISS · PlantNet)                & Advisory
```

**Data Flow:**
1. A user submits farm data (leaf image / soil values / area details) via the **React Dashboard**.
2. The dashboard calls the **FastAPI ML server** over REST.
3. The server validates the payload through Pydantic schemas and routes it to the appropriate engine in `smart_system/`.
4. Core predictions are augmented with **Google Gemini** advisory recommendations.
---

## 📂 Project Structure

```text
Smart-Agriculture-AI/
│
├── ai_api/                        # 🐍 FastAPI ML inference server
│   └── api.py                     #    All REST endpoints & Pydantic validation
│
├── smart_system/                  # 🧠 Core AI orchestration & inference engines
│   ├── config.py                  #    Centralized paths, thresholds & constants
│   ├── database.py                #    SQLite user store + PBKDF2 auth helpers
│   ├── disease_engine.py          #    EfficientNet/ResNet image classification
│   ├── crop_engine.py             #    Soil & climate ensemble predictor
│   ├── yield_engine.py            #    XGBoost regression forecaster
│   ├── ensemble_engine.py         #    Unified multi-model prediction pipeline
│   ├── gemini_advisor.py          #    Google Gemini LLM advisory integration
│   ├── farm_ai_assistant.py       #    Conversational chatbot handler
│   ├── recommendations.py         #    Rule-based agronomic advisory logic
│   ├── risk_analysis.py           #    Risk scoring & confidence evaluation
│   ├── smart_predict.py           #    End-to-end prediction orchestration
│   ├── report.py                  #    Unified farm report generation
│   ├── evaluation.py              #    Model evaluation utilities
│   ├── logger.py                  #    Structured request/error logging
│   │
│   ├── plant_doctor/              # 🔬 Advanced image diagnosis subsystem
│   │   ├── ensemble_predictor.py  #    CNN ensemble inference
│   │   ├── gradcam.py             #    Explainable heatmap generation
│   │   ├── sam_model.py           #    Semantic segmentation (SAM)
│   │   ├── clip_model.py          #    Visual-semantic features (CLIP)
│   │   ├── image_quality.py       #    Input quality checks
│   │   ├── severity.py            #    Disease severity estimation
│   │   ├── treatment_engine.py    #    Treatment recommendations
│   │   ├── plantnet_api.py        #    Optional PlantNet API fallback
│   │   └── ...                    #    (confidence calibrator, FAISS, etc.)
│   │
│   └── yield_predictor/           # 📈 Yield forecasting subsystem
│       ├── pipeline.py            #    Feature → model → risk pipeline
│       ├── intelligence.py        #    Aggregation & analytics
│       ├── weather.py             #    Weather context inputs
│       ├── schema.py              #    Request/response models
│       └── context.py             #    Crop/state context metadata
│
├── disease_model/                 # 🦠 Disease CNN training & evaluation
│   ├── data_prep/                 #    Dataset merging/cleaning scripts
│   ├── scripts/                   #    train / evaluate / predict scripts
│   ├── models/                    #    Trained weights (disease_model.pth)
│   └── reports/                   #    Metrics, confusion matrix, losses
│
├── crop_model/                    # 🌿 Crop recommendation training
│   ├── data_prep/                 #    Dataset cleaning scripts
│   ├── scripts/                   #    train / predict scripts
│   ├── models/                    #    label_encoder.pkl, model metadata
│   └── reports/                   #    Classification report & importance charts
│
├── yield_model/                   # 📊 Yield prediction training
│   ├── data_prep/                 #    Yield/rainfall/temp cleaning & merging
│   ├── scripts/                   #    train / predict scripts
│   ├── models/                    #    yield_model.pkl + encoders
│   └── reports/                   #    Regression report & feature importance
│
├── frontend/                      # ⚛️ React dashboard (Create React App)
│   └── src/
│       ├── pages/                 #    Dashboard, Disease, Crop, Yield, Chat, Report
│       ├── components/            #    Header, Sidebar, Modals, etc.
│       ├── context/               #    AuthContext (token & user state)
│       ├── locales/               #    i18n: en.json, hi.json, ta.json
│       └── App.js                 #    Router & app shell
│
├── documentation/                 # 📄 About, project notes, IEEE paper
├── users.db                       # 💾 SQLite auth database (auto-created)
├── requirements.txt               # 🐍 Python dependencies
└── README.md
```

---

## 🛠️ Tech Stack

### Backend & ML
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Core language |
| FastAPI / Uvicorn | ≥0.115 / ≥0.30 | REST API server |
| PyTorch / Torchvision | ≥2.3 / ≥0.18 | Deep learning (Disease CNN) |
| EfficientNet / ResNet | — | Image classification backbones |
| Random Forest / XGBoost / LightGBM | ≥2.0 / ≥4.3 | Crop ensemble & yield regression |
| scikit-learn | ≥1.5 | Classical ML & ensembles |
| CLIP (OpenAI) | git | Visual-semantic features |
| FAISS | ≥1.7 | Similarity search |
| SAM | — | Segmentation (Plant Doctor) |
| Google Gemini (`google-genai`) | ≥1.0 | Generative advisory & chatbot |
| OpenCV / Pillow | ≥4.8 / ≥10.0 | Image preprocessing |
| Pandas / NumPy | ≥2.2 / ≥2.0 | Data manipulation |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Tailwind CSS 3 | Styling |
| Framer Motion | Animations |
| Recharts | Interactive charts |
| react-i18next | Multi-language (EN/HI/TA) |
| Axios | HTTP client |

### Data persistence
| Technology | Purpose |
|---|---|
---

## 🗄️ Datasets

Training datasets are downloaded separately and placed in the target directories before running the training scripts.

| Module | Dataset | Target Directory |
|---|---|---|
| 🦠 Disease Detection | PlantVillage / PlantDoc / Cassava Leaf Disease | `disease_model/data/` |
| 🌿 Crop Recommendation | Crop Recommendation Dataset | `crop_model/data/` |
| 📊 Yield Prediction | Crop Yield / Rainfall India / Temperature datasets | `yield_model/data/` |

> **Note:** Pre-trained model weights ship in each module's `models/` directory. If weights are present, you can **skip training and run inference directly** — simply start the API server.

---

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm 8+**
- A **Google Gemini API key** — [Get one free here](https://aistudio.google.com/app/apikey)

---

### Step 1 — Clone the Repository
```bash
git clone <your-repo-url>
cd Smart-Agriculture-AI
```

### Step 2 — Configure Environment Variables
Create a `.env` file inside the `ai_api/` directory:

```bash
# ai_api/.env
GEMINI_API_KEY=your_google_gemini_api_key_here
# Optional — PlantNet API fallback for image diagnosis
PLANTNET_API_KEY=your_plantnet_api_key_here
```

> Without `GEMINI_API_KEY`, the core ML predictions still work, but the Gemini advisory and chatbot will return a "temporarily unavailable" fallback message.

### Step 3 — Start the Python FastAPI ML Server

> It is strongly recommended to use a Python virtual environment.

```bash
# Create & activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt

# Launch the FastAPI server from the ai_api directory
cd ai_api
uvicorn api:app --reload --port 8000
```

✅ The AI API will be live at **`http://localhost:8000`**  
📖 Interactive API docs (Swagger UI) at **`http://localhost:8000/docs`**

### Step 4 — Start the React Frontend Dashboard
```bash
# In a new terminal, from the project root
cd frontend
npm install
npm start
```

✅ The dashboard will open automatically at **`http://localhost:3000`**

### Step 5 — (Optional) Retrain Models
Each model module ships with its own training scripts:

```bash
# Disease detection (PyTorch CNN)
python disease_model/scripts/train_disease_model.py

# Crop recommendation (soft-voting ensemble)
python crop_model/scripts/train_crop_model.py

# Yield prediction (XGBoost regressor)
python yield_model/scripts/train_yield_model.py
```

---

## 🔌 API Reference

The backend exposes a REST API at `http://localhost:8000`. Interactive docs are available at `/docs`. Unless noted otherwise, all endpoints accept **JSON** and return a unified JSON response.

> **Tip:** To use endpoints from a custom client, first authenticate via `/auth/login`, then send the returned token in the `Authorization` header as `Bearer <token>` (required by some prediction endpoints).

---

### 1. 💾 System & Authentication

**Register a new user**
- `POST /auth/register`
```json
{ "username": "farmer", "password": "secret", "full_name": "Ravi Kumar" }
```

**Log in**
- `POST /auth/login`
```json
{ "username": "farmer", "password": "secret" }
```
- **Returns:** `{ "token": "sfa_...", "username": "farmer", "full_name": "..." }`

**Get current user profile**
- `GET /auth/me?username=farmer`

**Health check**
- `GET /health`
- **Returns:** API status, version, loaded models & dependency versions.

---

### 2. 🔬 Disease Detection

**Predict disease (simplified)**
- `POST /predict-disease` — `multipart/form-data` with an image `file`.

**Detect disease (full pipeline)**
- `POST /detect-disease` — `multipart/form-data` with an image `file`.
- **Returns:** prediction label, confidence, Grad-CAM heatmap, severity & treatment suggestions.

**Advanced Plant Doctor diagnosis**
- `POST /plant-doctor` — `multipart/form-data` with an image `file`.
- **Returns:** the full explainable diagnosis (Grad-CAM, SAM segmentation, severity, treatments).

---

### 3. 🌱 Crop Recommendation

- `POST /predict-crop`
```json
{
  "Nitrogen": 90.0,
  "Phosphorus": 42.0,
  "Potassium": 43.0,
  "Temperature": 20.87,
  "Humidity": 82.0,
  "pH": 6.5,
  "Rainfall": 202.93
}
```
- **Returns:** the top 3 most suitable crops with confidence percentages and Gemini advisory notes.

**View / update ensemble voting weights**
- `GET /ensemble-weights` — returns current soft-voting weights.
- `POST /ensemble-weights` — customize the model weighting:
```json
{ "RandomForest": 0.4, "XGBoost": 0.3, "LightGBM": 0.3 }
```

---

### 4. 📈 Yield Prediction & Intelligence

**Basic yield prediction**
- `POST /predict-yield`
```json
{ "crop": "Rice", "state": "Uttar Pradesh", "season": "Kharif", "year": 2024 }
```
- **Returns:** predicted yield in hg/ha.

**Yield with risk assessment v1**
- `POST /predict-yield-v2`

**Full yield forecasting**
- `POST /predict-yield-v2/full`
```json
{ "crop": "Rice", "state": "Uttar Pradesh", "season": "Kharif", "year": 2024 }
```
- **Returns:** expected yield (hg/ha), yield level, and a Gemini-generated risk assessment with agricultural suggestions.

**Historical yield trends**
- `POST /yield-trends`
```json
{ "Area": "India", "Crop": "Wheat" }
```
- **Returns:** historical yield records used to plot trends on the dashboard.

---

### 5. 💬 Farm AI Assistant & Reports

**Conversational agronomy AI**
- `POST /farm-assistant`
```json
{ "question": "What is the best fertilizer timing for wheat?" }
```
- **Returns:** a real-time AI-generated answer.

**Unified smart report**
- `POST /smart-report` — returns a comprehensive farm report combining diagnostics, recommendations & yield forecast.

---

## 🛠️ How to Use

### 1. 🔬 Diagnose a Crop Disease
Open the **Diagnostics** tab, upload a clear, well-lit photo of a crop leaf, and:
- The AI processes the image through the CNN ensemble.
- View the identified disease (or "Healthy"), confidence score, and treatment recommendations.
- A **Grad-CAM heatmap** shows which leaf regions influenced the diagnosis.

### 2. 🌱 Get a Crop Recommendation
In the **Crop Matrix** tab, enter your soil & climate values — **Nitrogen (N), Phosphorus (P), Potassium (K), pH**, temperature, humidity, and rainfall. The ensemble model returns the **top 3 most suitable crops**, and Gemini provides tailored fertilizer & cultivation advice for each.

### 3. 📈 Forecast Your Harvest Yield
In the **Yield Intelligence** tab, select your **geographic area**, **target crop**, **season**, and **planting year**. The XGBoost regressor predicts the expected **harvest density (hg/ha)**, and Gemini generates a structured risk assessment (soil, pest, weather, market).

### 4. 💬 Ask the Farm AI Assistant
Open the **Farm Assistant** chat and ask open-ended questions in natural language — from fertilizer dosages to organic farming techniques.

### 5. 🗂️ Generate a Unified Report
After running a diagnosis, recommendation, or yield forecast, generate a **Farm Report** that combines everything into a single printable layout.

---

## 🔐 User Authentication

The system includes a built-in user account system:
- Credentials are stored in a **SQLite database** (`users.db`, auto-created at startup).
- Passwords are hashed with **PBKDF2-HMAC-SHA256** (100,000 iterations, per-user random salt) — never stored in plain text.
- Logging in returns a **bearer token** (`sfa_...`) used to authenticate API requests and tie predictions to a user profile & dashboard history.

Endpoints: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.

---

## 🔮 Future Improvements

- [ ] **🛰️ Satellite Data Integration** — Auto-map farm areas for real-time NDVI & soil moisture data.
- [ ] **⛅ Live Weather API** — Connect to OpenWeatherMap to auto-fill climatic inputs.
- [ ] **📱 Mobile App** — React Native port for in-field use on smartphones.
- [ ] **📡 IoT Sensor Integration** — Consume live telemetry from on-farm NPK & moisture sensors.
- [ ] **🗺️ Farm Mapping** — Geospatial visualization of field health zones and yield maps.
- [ ] **📊 Expanded Crop & Language Coverage** — More crop classes, regions, and regional languages.

---

## 🤝 Contributing

Contributions are welcome! To get started:
1. **Fork** the repository and create a feature branch.
2. Make your changes, following the existing code style and structure.
3. Test against the running API (`/docs`) and dashboard.
4. Open a **Pull Request** describing your changes.

---

## 👨‍💻 Team Contributions

This project was developed collaboratively by a five-member team, with each member owning one complete module from data preparation through integration.

| # | Role | Module | Key Responsibilities |
|---|---|---|---|
| 1 | **Deep Learning & Diagnostics Lead** | Disease Detection | EfficientNet/ResNet CNN training, data augmentation, Grad-CAM integration, evaluation |
| 2 | **Predictive Soil Modeling & Feature Engineer** | Crop Recommendation | Feature-engineering pipeline, soft-voting ensemble (RF + XGBoost + LightGBM), validation guards |
| 3 | **Yield Forecasting & Analytics Lead** | Yield Prediction | Historical data aggregation, XGBoost regressor, 5-fold CV, R²/MAE/RMSE reporting & charts |
| 4 | **Backend Systems & API Architect** | Backend API | FastAPI server, RESTful endpoints, Gemini integration, pipeline orchestration, auth system |
| 5 | **Frontend Developer & UI/UX Designer** | Dashboard UI | React dashboard, Tailwind CSS, Recharts, i18n support, API integration |

> Each member contributed equally to the final integrated system through parallel development of independent, interconnected modules.

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">
  <p>Built with ❤️ for the future of farming.</p>
  <p><i>Smart Agriculture AI System — Empowering farmers with the power of artificial intelligence.</i></p>
</div>