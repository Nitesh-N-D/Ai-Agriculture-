# Dynamic Data Architecture

Every number on the dashboard, in history and in alerts comes from the
backend: the trained models, the SQLite database, or the weather service.
The React app only formats and draws it.

```
React page ──► api/apiClient.js (base URL + Bearer token + error mapping)
                     │
                     ▼
              FastAPI (ai_api/api.py)
        ┌────────────┼──────────────────────────────┐
        ▼            ▼                              ▼
  ML engines     history_store.py              weather (Open-Meteo / WeatherAPI)
  (CNN, RF+XGB+  users.db: users, sessions,    via GET /weather
   LGBM, XGBoost) predictions                         │
        │            │                              ▼
        └──► prediction JSON ─► saved per user    alerts_engine.py (rules)
                     │                              │
                     └──────────► GET /dashboard ◄──┘
                                       │
                                React DataContext ─► Dashboard / History / Alerts / badge
```

## Authentication and user isolation

* `POST /auth/register|login` create a **server-side session** (`sessions` table,
  token stored as SHA-256, 30-day expiry). Previously the token was a random
  string that was never stored or checked.
* Every user-specific endpoint derives the user **from the bearer token**; no
  endpoint trusts a `user_id`/`username` from the client, and every query is
  filtered by that user's id. `/auth/settings` and `/auth/me` were changed to work this way.
* `401` → the API client fires `sfa:unauthorized` and `AuthContext` signs the user out.
  (Tokens issued before this change are invalid, so existing browsers sign in again once.)
* Prediction endpoints still work for signed-out users, but nothing is stored for them.

## Database (existing `users.db`, additive only)

| Table | Purpose |
|---|---|
| `users` | unchanged (`farm_location`, `settings_json` also hold the unit prefs and the list of already-read alert ids) |
| `sessions` | `token_hash`, `user_id`, `created_at`, `expires_at` |
| `predictions` | `user_id`, `type` (disease/crop/yield/report), `label`, `confidence` (percent, NULL if the model gives none), `value`+`unit` (yield, hg/ha), `model`, `inputs_json`, `result_json`, `created_at` (UTC) |

Created with `CREATE TABLE IF NOT EXISTS` on import; no data is dropped.

**What is stored per prediction**

* Disease (`/plant-doctor`, `/detect-disease`, `/predict-disease`): predicted class (CNN raw label), confidence,
  model, severity/risk, treatment advice, top-3, and a 256 px JPEG thumbnail of the **real Grad-CAM** overlay.
* Crop (`/predict-crop`): N, P, K, temperature, humidity, pH, rainfall, recommended crop, ensemble
  probability, top-3, ensemble weights, Gemini text that explained the result.
* Yield (`/predict-yield`, `/predict-yield-v2[/full]`): crop, state, season, year, yield in hg/ha
  (the model's t/ha output ×10,000), yield level, risk and recommendations.
* Report (`/smart-report`): the whole report plus inputs.

## Endpoints added or changed

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/dashboard` | GET | required | latest prediction per type, statistics, disease distribution, yield history / by year / by season, recent activity, advisory text, alerts + unread count, weather, model status, model evaluation metrics |
| `/history?type=&limit=&offset=` | GET | required | the user's predictions, newest first (`limit` ≤ 200) |
| `/history/{id}` | GET | required | one record with its full stored result |
| `/alerts` | GET | required | alerts built from live weather + latest stored predictions + model status; `unread_count` |
| `/alerts/seen` | POST | required | marks the current alerts as read |
| `/metadata` | GET | public | crops, states, seasons the models support (+ crop-recommendation and disease classes, units, model status) |
| `/ml/status`, `/health` | GET | public | real model-loaded state (added earlier) |
| `/auth/logout` | POST | token | revokes the session |
| `/auth/me`, `/auth/settings` | GET / PUT | required | now identify the user from the token |
| prediction endpoints | POST | optional | add `history_id` to the response when saved |
| `/farm-assistant` | POST | optional | when signed in, Gemini is given the user's latest *stored ML results* as context |

Existing endpoints were reused; no duplicates (e.g. weather still comes from `/weather`).

## Alert rules (`smart_system/alerts_engine.py`)

Alerts exist only when a rule fires on real data. Severity is the rule's threshold, not a guess.

| Source | Rule |
|---|---|
| Weather | temp ≥33 medium / ≥36 high / ≥40 critical; humidity ≥85 (≥90 high) at 20-32 °C (fungal conditions); humidity ≤30 and temp ≥33 (dry); rain ≥7.5 mm (≥15 high); wind ≥35 km/h (≥50 high) |
| Disease | latest prediction ≤14 days old, not healthy/unknown, confidence ≥70 medium / ≥85 high |
| Yield | latest ≤60 days old: risk HIGH/CRITICAL, or yield level LOW → medium |
| Models | any ML model not loaded → critical |

## Frontend

| Component | Data source |
|---|---|
| `api/config.js`, `api/apiClient.js` | the only place with the backend URL (`REACT_APP_API_BASE_URL`, default `http://127.0.0.1:8000`) |
| `context/DataContext.js` | one `/dashboard` load per login / location change / new prediction / 5 min; no polling beyond that |
| `pages/Dashboard.js` | all cards and charts from `/dashboard`; empty, loading, error and sign-in states |
| `components/AlertsModal.js`, header bell + dropdown, sidebar badge | `alerts` / `unread_alerts` |
| `components/HistoryModal.js` | `/history` (refetched when a new prediction is stored) |
| `pages/Yield.js` | crop/state/season dropdowns from `/metadata` (56 crops, 36 states, 6 seasons) |
| `context/SettingsContext.js` | server profile when signed in; no hard-coded default city. The preset list in Settings is only a list of suggestions |

After Crop / Disease / Yield / Report succeed, the page calls `refresh()` and the dashboard, history and badge update.

## Confidence vs. model accuracy

The dashboard shows **prediction confidence** (from the individual prediction; the yield regressor has none, so none is shown)
separately from **held-out evaluation** read from each model's `model_metadata.json`
(disease validation accuracy, crop test accuracy, yield R²).

## Not dynamic (on purpose)

Translations, labels, icons, navigation, chart colours, the weather icon map and the Settings preset list.
