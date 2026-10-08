import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, SessionLocal, init_db
from app.models.domain import Mission, Survivor, Hazard, RiskLevel, HazardType

def seed_data():
    init_db()
    db = SessionLocal()
    
    # Check if we already have missions
    if db.query(Mission).first():
        print("Database already seeded.")
        db.close()
        return

    m1 = Mission(
        id="ALPHA-7",
        name="Flood Response - Sector 4",
        description="Severe flooding in residential area with autonomous drone reconnaissance.",
        status="ACTIVE",
        area_covered=64.0,
        is_real_ai=True
    )
    db.add(m1)
    
    # Add initial survivor records
    for i in range(5):
        s = Survivor(
            id=f"P-{i+1:03d}",
            mission_id=m1.id,
            tracking_id=i+1,
            lat=34.0522 + (i * 0.001),
            lng=-118.2437 + (i * 0.001),
            confidence=0.85 + (i * 0.02),
            risk_score=50 + (i * 8),
            priority="CRITICAL" if i >= 3 else ("HIGH" if i >= 2 else "MODERATE"),
            status="VERIFIED" if i > 0 else "DETECTED",
            risk_reasons="Base disaster zone exposure (+20); Proximity to flood perimeter (+15)",
            is_real_ai=True
        )
        db.add(s)
        
    # Add hazards
    for i in range(3):
        h = Hazard(
            id=f"H-{i+1:03d}",
            mission_id=m1.id,
            type=HazardType.FLOOD.value if i % 2 == 0 else HazardType.FIRE.value,
            lat=34.0522 + (i * 0.002),
            lng=-118.2437 - (i * 0.001),
            radius_meters=50.0 + (i * 10),
            severity="CRITICAL" if i == 0 else "HIGH",
            is_real_ai=True
        )
        db.add(h)
        
    m1.survivors_count = 5
    m1.hazards_count = 3
    db.commit()
    db.close()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_data()
