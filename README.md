# 💧 Barangay Water System — IoT Monitoring & Control App

Full-stack IoT application for monitoring and controlling a 3-tank gravity-fed water
filtration system. Runs **offline on a Raspberry Pi** at the water station and optionally
syncs to a **cloud VPS** for remote access by barangay officials.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend API | **Python + FastAPI** | Async, fast, runs on Pi, built-in WebSocket |
| Database | **SQLite → PostgreSQL** | SQLite locally (zero setup), Postgres on cloud |
| ORM | **SQLAlchemy async** | Swap DB with one config line |
| Frontend | **React + Vite** | Real-time WebSocket dashboard |
| Arduino Bridge | **pyserial-asyncio** | Reads sensor JSON from Arduino over USB |
| Auth | **JWT (PyJWT)** | Role-based: admin / operator / official |
| Deployment | **Docker Compose** | Same stack local and cloud |

---

## Architecture

```
[Arduino Mega] ──USB Serial──► [Raspberry Pi]
                                    │
                               [FastAPI Backend]
                               ├─ SQLite DB (local)
                               ├─ WebSocket server
                               └─ REST API
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
             [Local Browser]               [Cloud VPS / Internet]
             (operator LCD panel          (barangay officials
              on Pi's local network)       remote dashboard)
```

---

## Quick Start — Local (Raspberry Pi)

### 1. Clone and configure
```bash
git clone <your-repo> water-system
cd water-system/backend
cp .env.example .env
# Edit .env — change SECRET_KEY at minimum
```

### 2. Install backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Install frontend
```bash
cd ../frontend
npm install
npm run build          # Builds into backend/static/
```

### 4. Run
```bash
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Dashboard: `http://<pi-ip>:8000`
Default login: `admin` / `admin123` ← **change this!**

### 5. Arduino
- Upload `arduino/water_system.ino` using Arduino IDE
- Connect Arduino to Pi via USB
- Set `SERIAL_PORT=/dev/ttyUSB0` (or `/dev/ttyACM0`) in `.env`

---

## Docker Deploy

### Local Pi (development mode with frontend dev server)
```bash
docker compose --profile dev up
```

### Cloud VPS (production with Nginx)
```bash
# 1. Build frontend first
cd frontend && npm run build

# 2. Start production stack
docker compose --profile prod up -d
```

---

## Cloud Deployment (Render / Railway / VPS)

### Option A — Render.com (free tier)
1. Push to GitHub
2. New Web Service → connect repo → Runtime: Docker
3. Set environment variables:
   - `DATABASE_URL` → your PostgreSQL URL
   - `SECRET_KEY` → random 32-char string
   - `ENVIRONMENT=production`

### Option B — VPS (DigitalOcean / Hetzner)
```bash
# On server
git clone <repo> && cd water-system
cp backend/.env.example backend/.env
# Edit .env with production values
docker compose --profile prod up -d
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | SQLite local | Swap to PostgreSQL for cloud |
| `SECRET_KEY` | weak default | **Must change in production** |
| `SERIAL_PORT` | `/dev/ttyUSB0` | Arduino USB port on Pi |
| `BAUD_RATE` | `9600` | Must match Arduino sketch |
| `SMTP_*` | — | Email alerts (optional) |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/dashboard` | Full dashboard data |
| POST | `/api/sensors/reading` | Arduino posts data here |
| GET | `/api/sensors/history` | Historical readings |
| POST | `/api/valves/command` | Manual valve override |
| GET/POST | `/api/schedules` | View/edit tap schedules |
| GET | `/api/alerts` | View alerts |
| POST | `/api/alerts/{id}/acknowledge` | Acknowledge alert |
| WS | `/ws/{client_id}` | Real-time WebSocket |
| GET | `/api/health` | System health check |

Interactive API docs: `http://localhost:8000/docs`

---

## Default Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin` | `admin123` | Full access + user management |
| Operator | `operator` | `operator123` | Control + schedules |
| Official | `official` | `official123` | View only |

⚠️ **Change all passwords after first login!**

---

## Scalability Notes

- **More tanks**: Add columns to `SensorReading` model + migration
- **More tap stands**: Increase valve count in models + Arduino sketch
- **Multiple barangays**: Add `barangay_id` FK to all tables + multi-tenant auth
- **LoRa nodes**: Replace serial bridge with LoRa gateway module
- **Cloud sync**: Add background task to periodically POST Pi readings to cloud API

---

## Arduino Libraries Required

Install via Arduino IDE Library Manager:
- `ArduinoJson` by Benoit Blanchon
- `RTClib` by Adafruit
- `LiquidCrystal_I2C` by Frank de Brabander
- `Keypad` by Mark Stanley

---

## Project Structure

```
water-system/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy DB models
│   ├── database.py          # DB init + session
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── websocket_manager.py # WebSocket connection manager
│   ├── serial_bridge.py     # Arduino ↔ API bridge
│   ├── services/            # Business logic services
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React app (login + dashboard)
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── arduino/
│   └── water_system.ino    # Arduino Mega firmware
├── docker-compose.yml
└── README.md
```
