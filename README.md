# RescueGrid: Autonomous Aerial Search & Rescue Intelligence Platform

RescueGrid is a full-stack, mission-critical Disaster Search & Rescue (SAR) Intelligence Platform engineered for emergency response operations. It transforms raw aerial drone video feeds and imagery into real-time operational intelligence, survivor tracking, multi-factor risk scoring, hazard perimeter mapping, and autonomous evacuation route planning.

---

## 📑 Table of Contents

- [Overview & Operational Context](#overview--operational-context)
- [Key Features & System Capabilities](#key-features--system-capabilities)
- [Architecture & Data Pipeline](#architecture--data-pipeline)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Quickstart Guide](#installation--quickstart-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [API Reference & WebSocket Documentation](#api-reference--websocket-documentation)
  - [REST Endpoints](#rest-endpoints)
  - [WebSocket Channels](#websocket-channels)
- [AI Engine & Computer Vision Pipeline](#ai-engine--computer-vision-pipeline)
  - [YOLOv8 Detection](#1-yolov8-detection)
  - [ByteTrack Persistent Tracking](#2-bytetrack-persistent-tracking)
  - [Multi-Factor Risk Scoring Engine](#3-multi-factor-risk-scoring-engine)
  - [A* Risk-Aware Pathfinder](#4-a-risk-aware-pathfinder)
- [Safety & Algorithmic Accountability](#safety--algorithmic-accountability)
- [License](#license)

---

## 🎯 Overview & Operational Context

In large-scale natural disasters (floods, earthquakes, hurricanes, industrial fires), search-and-rescue teams face critical information bottlenecks. Manual drone footage analysis is slow, and emergency dispatchers often lack integrated spatial awareness to coordinate simultaneous ground and aerial assets.

RescueGrid bridges this gap with an end-to-end mission dashboard:
- **Instant Aerial Ingestion**: Streams and analyzes aerial drone footage using real-time computer vision.
- **Accurate Survivor Localization**: Identifies human survivors with persistent spatial IDs, avoiding duplicate counting.
- **Dynamic Hazard Zonation**: Detects fires, flood expanses, debris fields, and structural collapse zones.
- **Transparent Risk Engine**: Computes verifiable risk scores (0–100) based on physical exposure, duration, and proximity to danger.
- **Safe Evacuation Routing**: Computes obstacle-avoiding transit corridors for ground rescue teams.

---

## 🚀 Key Features & System Capabilities

### 1. Command Center (`/app`)
- Live mission status telemetry, elapsed mission clocks, and real-time survivor counts.
- Dynamic critical alert banners with instant triage actions.
- Interactive tactical overview map displaying survivors, hazard perimeters, and active rescue units.
- Real-time chronological intelligence feed populated via WebSocket events.

### 2. AI Vision Analysis (`/app/analysis`)
- Upload aerial video footage or static high-resolution drone imagery.
- Real-time frame-by-frame inference using Ultralytics YOLOv8.
- Dynamic bounding box rendering directly mapped to image/video aspect ratios.
- Live telemetry metrics: FPS, detected people, tracked entities, and detection confidence.
- Live raw detections feed synchronized with survivor state updates.

### 3. Survivor Intelligence Registry (`/app/survivors`)
- Persistent tracking registry powered by ByteTrack.
- Multi-factor risk breakdown detailing exactly *why* a survivor is classified as `CRITICAL`, `HIGH`, `MODERATE`, or `LOW`.
- Filters by status (`DETECTED`, `VERIFIED`, `PRIORITY`, `MONITORING`, `RESCUED`) and priority level.
- Direct handoff to route planning and GIS mapping.

### 4. Hazard & Perimeter Management (`/app/hazards`)
- Real-time perimeter tracking for flood zones, fires, structural hazards, and vehicle obstacles.
- Safety radius visualization in meters.
- Incident severity badges with dispatch broadcast trigger simulation.

### 5. Interactive Tactical Map (`/app/map`)
- High-performance Leaflet-based dark tactical map (free OpenStreetMap tiles, no external API keys required).
- Distinct color-coded markers for Survivors (pulsing green/red), Hazards (amber/red), and Rescue Teams (cyan).
- Search sector coverage polygons with customizable opacity.
- Entity inspection sidebars for deep-dive telemetry.

### 6. A* Safe Route Planning Engine (`/app/routes`)
- Risk-aware pathfinding between rescue units (e.g., `TEAM-ALPHA`, `TEAM-BRAVO`) and target survivors.
- Dynamic hazard perimeter evasion with configurable buffer radii.
- Real-time calculation of distance (km), estimated time of arrival (ETA), and alternative corridors.

### 7. Mission Control & Deployment Wizard (`/app/missions`)
- 4-step deployment wizard:
  1. **Disaster Classification** (Flood, Earthquake, Wildfire, Structural Collapse).
  2. **Operational Sector Boundary** definition.
  3. **Media Source** configuration (Local upload or live drone stream).
  4. **AI Engine & Model Selection**.

### 8. Situation Reports (`/app/reports`)
- Automated tactical debrief and summary generation.
- Formatted incident document preview with export options (PDF / JSON).

---

## 🏗️ Architecture & Data Pipeline

```
              ┌──────────────────────────────────────────────┐
              │          Drone / Aerial Video Stream          │
              └──────────────────────┬───────────────────────┘
                                     │ (MP4 / JPEG / RTMP)
                                     ▼
              ┌──────────────────────────────────────────────┐
              │             FastAPI Backend (8000)           │
              │                                              │
              │  ┌────────────────┐    ┌──────────────────┐  │
              │  │  YOLOv8 Engine │───►│ ByteTrack Filter │  │
              │  └────────────────┘    └────────┬─────────┘  │
              │                                 ▼            │
              │  ┌────────────────┐    ┌──────────────────┐  │
              │  │ A* Pathfinder  │◄───│   Risk Engine    │  │
              │  └────────────────┘    └────────┬─────────┘  │
              │                                 ▼            │
              │  ┌────────────────┐    ┌──────────────────┐  │
              │  │ SQLAlchemy DB  │◄───│ WebSocket Server │  │
              │  └────────────────┘    └────────┬─────────┘  │
              └─────────────────────────────────┼────────────┘
                                                │ WS + REST
                                                ▼
              ┌──────────────────────────────────────────────┐
              │          RescueGrid Frontend (Vite)          │
              │           http://localhost:5173/app          │
              │                                              │
              │  • Command Center Dashboard                  │
              │  • AI Vision Video Canvas                    │
              │  • Leaflet GIS Tactical Map                  │
              │  • Route Planning & Triage Controls          │
              └──────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS, PostCSS, Lucide React icons
- **UI Primitives**: Radix UI / custom shadcn components
- **Mapping**: Leaflet, React-Leaflet (OpenStreetMap raster tiles)
- **Routing**: React Router DOM v7 (direct navigation to `/app`)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn with auto-reload
- **Computer Vision**: Ultralytics YOLOv8, OpenCV (`cv2`)
- **Tracking Algorithm**: ByteTrack / IoU spatial persistence
- **ORM & Database**: SQLAlchemy 2.0 with SQLite (`rescuegrid.db`)
- **Validation**: Pydantic v2
- **Real-Time Communication**: Native WebSockets (`/ws/live`)

---

## 📁 Project Directory Structure

```
RescueGrid/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── analysis.py       # Inference and video processing endpoints
│   │   │       ├── analytics.py      # Telemetry statistics
│   │   │       ├── missions.py       # Mission management and creation
│   │   │       └── websocket.py      # Live streaming broadcast handler
│   │   ├── core/
│   │   │   └── config.py             # System settings and upload directories
│   │   ├── db/
│   │   │   └── session.py            # SQLite database engine & session maker
│   │   ├── models/
│   │   │   └── domain.py             # SQLAlchemy entities (Mission, Survivor, Hazard, etc.)
│   │   ├── schemas/
│   │   │   └── mission.py            # Pydantic schemas for requests and responses
│   │   ├── services/
│   │   │   ├── ai_engine/
│   │   │   │   ├── detector.py       # YOLOv8 object detection wrapper
│   │   │   │   ├── model_manager.py  # Model lifecycle and health monitoring
│   │   │   │   ├── risk_engine.py    # Multi-factor risk calculation logic
│   │   │   │   ├── tracker.py        # ByteTrack persistent survivor tracker
│   │   │   │   └── video_processor.py# Frame extraction and stream pipeline
│   │   │   └── pathfinder.py         # A* risk-aware evacuation route planner
│   │   └── main.py                   # FastAPI entrypoint, CORS, and route registration
│   ├── scripts/
│   │   └── seed.py                   # Database seeding with initial SAR scenarios
│   ├── uploads/                      # Stored video and drone image uploads
│   └── yolov8n.pt                    # Pretrained YOLOv8 neural network weights
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # Button, Card, Badge, and input components
│   │   │   └── LiveMap.tsx           # Reusable Leaflet map component
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx        # Command bar, navigation sidebar, and profile
│   │   ├── pages/
│   │   │   ├── CommandCenter.tsx     # Primary operations console (/app)
│   │   │   ├── AIAnalysis.tsx        # Drone vision video analysis (/app/analysis)
│   │   │   ├── IntelligenceMap.tsx   # Interactive tactical GIS map (/app/map)
│   │   │   ├── Survivors.tsx         # Tracked survivor registry (/app/survivors)
│   │   │   ├── Hazards.tsx           # Hazard perimeter management (/app/hazards)
│   │   │   ├── Routes.tsx            # Evacuation pathfinding (/app/routes)
│   │   │   ├── Alerts.tsx            # Alert notifications feed (/app/alerts)
│   │   │   ├── Missions.tsx          # Deployment wizard (/app/missions)
│   │   │   ├── Reports.tsx           # Incident report generator (/app/reports)
│   │   │   └── Settings.tsx          # AI confidence thresholds & settings (/app/settings)
│   │   ├── App.tsx                   # Main router (defaults directly to /app)
│   │   └── main.tsx                  # React DOM mount point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md                         # Project documentation
```

---

## 🛠️ Installation & Quickstart Guide

### Prerequisites
- **Python**: Version 3.10, 3.11, or 3.12 (virtual environment recommended)
- **Node.js**: Version 18+ and **npm**
- **Git**

---

### 1. Backend Setup

Open a terminal and navigate to the `backend` folder:

```bash
cd backend
```

Create and activate a virtual environment:

```powershell
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install fastapi uvicorn sqlalchemy pydantic-settings python-multipart pyjwt websockets opencv-python-headless ultralytics numpy
```

Initialize and seed the database with operational mission data:

```bash
python scripts/seed.py
```

Start the FastAPI application server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be live at:
- **API Server**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **WebSocket Endpoint**: `ws://localhost:8000/ws/live`

---

### 2. Frontend Setup

Open a separate terminal and navigate to the `frontend` folder:

```bash
cd frontend
```

Install npm packages:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Visit the application in your browser:
👉 **[http://localhost:5173](http://localhost:5173)** — *Automatically redirects directly to the Command Center at `http://localhost:5173/app`.*

---

## 📡 API Reference & WebSocket Documentation

### REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ai/health` | Health check for YOLOv8 model and hardware accelerator |
| `GET` | `/api/ai/{mission_id}/summary` | Aggregated mission statistics (survivors, critical count, coverage) |
| `GET` | `/api/ai/{mission_id}/survivors` | Full list of detected survivors and risk assessments |
| `GET` | `/api/ai/{mission_id}/hazards` | Active hazard coordinates, radii, and severity levels |
| `POST` | `/api/ai/{mission_id}/analyze` | Upload image/video file to trigger AI detection pipeline |
| `POST` | `/api/ai/{mission_id}/route` | Calculate A* risk-aware route between a team and survivor |
| `GET` | `/api/missions/` | List all historical and active mission deployments |
| `POST` | `/api/missions/` | Register a new autonomous mission |

### WebSocket Channels

- **Endpoint**: `ws://localhost:8000/ws/live`
- **Message Types**:
  - `ai_progress`: Real-time frame index, inference FPS, detections, and survivor telemetry.
  - `alert`: High-priority critical survivor or perimeter breach alerts.
  - `system_status`: Engine state and sensor health reports.

---

## 🧠 AI Engine & Computer Vision Pipeline

### 1. YOLOv8 Detection
The platform utilizes Ultralytics YOLOv8 for rapid inference on aerial drone streams. Detected bounding boxes are categorized into:
- `person` $\rightarrow$ Evaluated by the Survivor Pipeline.
- `hazard` / `vehicle` $\rightarrow$ Fed into the Hazard Perimeter Engine.

### 2. ByteTrack Persistent Tracking
Rather than treating each frame independently, ByteTrack maintains continuous object tracklets using spatial overlap (IoU) and motion estimation. This prevents:
- Identity flickering when survivors pass under temporary overhead obstacles.
- Inflated survivor counts across extended video flights.

### 3. Multi-Factor Risk Scoring Engine
The risk engine generates an explainable **Risk Score (0–100)**:
- **Base Disaster Exposure**: Baseline weight for open disaster zone (+20).
- **Sensor Certainty**: Confidence score from YOLOv8 (+5 to +15).
- **Temporal Persistence**: Continuous frames detected (+5 to +15).
- **Spatial Isolation**: Distance from neighboring rescue units or people (+5 to +15).
- **Perimeter Constraints**: Proximity to boundary escape barriers (+10).
- **Hazard Proximity**: Scaled proximity penalty to detected fires, floods, or structural collapses (+15 to +25).

### 4. A* Risk-Aware Pathfinder
Pathfinding operates on an obstacle grid where hazard perimeters act as high-cost repulsive potential fields:
- Computes shortest Euclidean path outside critical hazard envelopes.
- Returns step coordinates for map polyline rendering alongside estimated transit time (ETA).

---

## 🛡️ Safety & Algorithmic Accountability

- **No Medical Claims**: RescueGrid strictly assesses **physical and spatial risk** (hazard proximity, environmental isolation, and sensor persistence). It does not diagnose medical status or injuries from computer vision.
- **Human-in-the-Loop**: All AI suggestions, triage priority rankings, and evacuation routes are actionable advisories presented to qualified human incident commanders for final authorization.

---

## 📄 License

RescueGrid is distributed under the MIT License. See [LICENSE](LICENSE) for more details.
