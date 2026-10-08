from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.domain import RiskLevel, HazardType

class SurvivorBase(BaseModel):
    id: str
    lat: float
    lng: float
    detection_confidence: float
    priority_score: int
    risk_level: RiskLevel

class Survivor(SurvivorBase):
    mission_id: str
    detected_at: datetime
    
    class Config:
        from_attributes = True

class HazardBase(BaseModel):
    id: str
    type: HazardType
    lat: float
    lng: float
    radius_meters: float
    severity: RiskLevel

class Hazard(HazardBase):
    mission_id: str
    detected_at: datetime
    
    class Config:
        from_attributes = True

class MissionBase(BaseModel):
    id: str
    name: str
    description: str
    status: str
    area_covered: float

class Mission(MissionBase):
    created_at: datetime
    survivors: List[Survivor] = []
    hazards: List[Hazard] = []
    
    class Config:
        from_attributes = True
