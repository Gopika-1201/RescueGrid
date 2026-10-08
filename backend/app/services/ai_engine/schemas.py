from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class DetectionResult(BaseModel):
    detection_id: str
    class_name: str
    mapped_type: str = "survivor" # survivor, vehicle, hazard
    confidence: float
    bbox: BBox
    frame: int
    timestamp: float
    tracking_id: Optional[int] = None
    survivor_id: Optional[str] = None

class TrackedTarget(BaseModel):
    tracking_id: int
    target_id: str # e.g. "SURV-001" or "P-001"
    class_name: str
    confidence: float
    bbox: BBox
    frame: int
    timestamp: float
    first_seen_frame: int
    last_seen_frame: int
    detection_count: int

class SurvivorRisk(BaseModel):
    survivor_id: str # e.g. "SURV-001" or "P-007"
    tracking_id: int
    risk_score: int # 0 - 100
    priority: str # LOW, MODERATE, HIGH, CRITICAL
    status: str # DETECTED, VERIFIED, PRIORITY, RESCUED, LOST_TRACK, MONITORING
    reasons: List[str]
    confidence: float
    detection_count: int
    first_detected: Optional[str] = None
    last_detected: Optional[str] = None
    location: Optional[Dict[str, float]] = None # {"lat": ..., "lng": ...}
    has_gps: bool = False
    nearby_hazards: List[str] = Field(default_factory=list)

class HazardInfo(BaseModel):
    hazard_id: str
    hazard_type: str
    confidence: float
    severity: str # LOW, MODERATE, HIGH, CRITICAL
    bbox: Optional[BBox] = None
    location: Optional[Dict[str, float]] = None
    is_supported_by_model: bool = True

class AIProgressUpdate(BaseModel):
    type: str = "ai_progress"
    mission_id: str
    frame: int
    total_frames: int
    progress: float
    fps: float = 0.0
    detections_count: int
    survivors_count: int
    hazards_count: int
    tracked_count: int
    detections: List[DetectionResult]
    survivors: List[SurvivorRisk]
    hazards: List[HazardInfo] = Field(default_factory=list)
    is_real_ai: bool = True

class ModelHealthResponse(BaseModel):
    status: str
    model: str
    device: str
    inference_available: bool
    cuda_available: bool
    supported_classes: List[str]
    custom_disaster_classes: Dict[str, Dict[str, Any]]
