from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.domain import Mission, Survivor, Hazard

router = APIRouter()

@router.get("/")
def get_missions(db: Session = Depends(get_db)):
    db_missions = db.query(Mission).all()
    if db_missions:
        results = []
        for m in db_missions:
            survivor_cnt = db.query(Survivor).filter(Survivor.mission_id == m.id).count()
            hazard_cnt = db.query(Hazard).filter(Hazard.mission_id == m.id).count()
            results.append({
                "id": m.id,
                "name": m.name,
                "description": m.description,
                "status": m.status,
                "survivors": survivor_cnt or m.survivors_count or 0,
                "hazards": hazard_cnt or m.hazards_count or 0,
                "coverage": round(m.area_covered or 0.0),
                "is_real_ai": m.is_real_ai,
                "media_path": m.media_path
            })
        return results

    # Initial default mission
    return [
        {
            "id": "ALPHA-7",
            "name": "Flood Response - Sector 4",
            "description": "Severe flooding in residential area",
            "status": "ACTIVE",
            "survivors": 0,
            "hazards": 0,
            "coverage": 0,
            "is_real_ai": True
        }
    ]

@router.get("/{mission_id}")
def get_mission_details(mission_id: str, db: Session = Depends(get_db)):
    m = db.query(Mission).filter(Mission.id == mission_id).first()
    if m:
        survivor_cnt = db.query(Survivor).filter(Survivor.mission_id == m.id).count()
        hazard_cnt = db.query(Hazard).filter(Hazard.mission_id == m.id).count()
        return {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "status": m.status,
            "survivors": survivor_cnt,
            "hazards": hazard_cnt,
            "coverage": round(m.area_covered or 0.0),
            "media_path": m.media_path,
            "media_type": m.media_type,
            "total_frames": m.total_frames,
            "processed_frames": m.processed_frames,
            "is_real_ai": m.is_real_ai
        }
    
    return {
        "id": mission_id,
        "name": f"Mission {mission_id}",
        "status": "ACTIVE",
        "survivors": 0,
        "hazards": 0,
        "coverage": 0,
        "is_real_ai": True
    }
