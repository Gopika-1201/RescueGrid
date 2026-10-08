from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import missions, analytics, websocket, analysis
from app.db.session import init_db

app = FastAPI(
    title="RescueGrid API",
    description="AI-powered Disaster Search & Rescue Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(missions.router, prefix="/api/missions", tags=["missions"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(analysis.router, prefix="/api/ai", tags=["ai"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
