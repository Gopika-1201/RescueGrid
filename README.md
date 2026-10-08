# RescueGrid Intelligence Platform

A production-grade, full-stack AI-powered Disaster Search & Rescue Intelligence Platform built for autonomous drone mission management.

## Features Implemented
1. **Landing Page**: High-impact modern dark theme intro page.
2. **Command Center**: Real-time telemetry, mock WebSocket integration, live analytics, priority lists.
3. **Live Intelligence Map**: Dark-themed React-Leaflet map with interactive survivor and hazard markers.
4. **Mission Control**: 4-step wizard to initialize a new autonomous drone deployment.
5. **Situation Reports**: Auto-generated detailed mission summary viewer (PDF / JSON simulation).

## Tech Stack
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Leaflet, Lucide React
- Backend: Python FastAPI, SQLAlchemy, Pydantic (simulated AI hooks)

## How to Run

1. **Frontend**:
```bash
cd frontend
npm install
npm run dev
```

2. **Backend**:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt (if extracted) OR pip install fastapi uvicorn sqlalchemy pydantic-settings python-multipart pyjwt
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```
