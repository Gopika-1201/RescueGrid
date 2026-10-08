from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class HazardType(str, enum.Enum):
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    DEBRIS = "DEBRIS"
    STRUCTURAL_DAMAGE = "STRUCTURAL_DAMAGE"
    ELECTRICAL = "ELECTRICAL"
    VEHICLE = "VEHICLE"
    OBSTACLE = "OBSTACLE"

class SurvivorStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    VERIFIED = "VERIFIED"
    PRIORITY = "PRIORITY"
    RESCUED = "RESCUED"
    LOST_TRACK = "LOST_TRACK"
    MONITORING = "MONITORING"

class Mission(Base):
    __tablename__ = "missions"
    
    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), index=True)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="ACTIVE", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    area_covered = Column(Float, default=0.0) # percentage
    
    media_path = Column(String(512), nullable=True)
    media_type = Column(String(32), nullable=True) # video, image
    total_frames = Column(Integer, default=0)
    processed_frames = Column(Integer, default=0)
    is_real_ai = Column(Boolean, default=True)
    
    # Counts cache
    survivors_count = Column(Integer, default=0)
    hazards_count = Column(Integer, default=0)
    
    survivors = relationship("Survivor", back_populates="mission", cascade="all, delete-orphan")
    hazards = relationship("Hazard", back_populates="mission", cascade="all, delete-orphan")
    frames = relationship("DetectionFrame", back_populates="mission", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="mission", cascade="all, delete-orphan")

class DetectionFrame(Base):
    __tablename__ = "detection_frames"
    
    id = Column(String(64), primary_key=True, index=True)
    mission_id = Column(String(64), ForeignKey("missions.id"), nullable=False, index=True)
    frame_number = Column(Integer, nullable=False, index=True)
    timestamp = Column(Float, default=0.0) # seconds into video
    detection_count = Column(Integer, default=0)
    processed_at = Column(DateTime, default=datetime.utcnow)
    
    mission = relationship("Mission", back_populates="frames")
    detections = relationship("Detection", back_populates="frame_rel", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_frame_mission_number", "mission_id", "frame_number"),
    )

class Survivor(Base):
    __tablename__ = "survivors"
    
    id = Column(String(64), primary_key=True, index=True) # e.g. "SURV-001" or "P-007"
    mission_id = Column(String(64), ForeignKey("missions.id"), nullable=False, index=True)
    tracking_id = Column(Integer, index=True)
    confidence = Column(Float, default=0.0)
    
    first_detected_frame = Column(Integer, default=1)
    last_detected_frame = Column(Integer, default=1)
    first_detected_at = Column(DateTime, default=datetime.utcnow)
    last_detected_at = Column(DateTime, default=datetime.utcnow)
    detection_count = Column(Integer, default=1)
    
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    has_gps = Column(Boolean, default=False)
    
    nearby_hazards = Column(String(256), nullable=True)
    risk_score = Column(Integer, default=0) # 0 - 100
    priority = Column(String(32), default="LOW", index=True) # LOW, MODERATE, HIGH, CRITICAL
    risk_reasons = Column(Text, nullable=True) # JSON or bullet reasons
    status = Column(String(32), default="DETECTED", index=True) # DETECTED, VERIFIED, PRIORITY, RESCUED, LOST_TRACK, MONITORING
    is_real_ai = Column(Boolean, default=True)
    
    mission = relationship("Mission", back_populates="survivors")
    detections = relationship("Detection", back_populates="survivor_rel")

class Hazard(Base):
    __tablename__ = "hazards"
    
    id = Column(String(64), primary_key=True, index=True) # e.g. "HAZ-001"
    mission_id = Column(String(64), ForeignKey("missions.id"), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)
    confidence = Column(Float, default=0.0)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    radius_meters = Column(Float, default=50.0)
    severity = Column(String(32), default="HIGH", index=True) # LOW, MODERATE, HIGH, CRITICAL
    status = Column(String(32), default="ACTIVE", index=True) # ACTIVE, CONTAINED, RESOLVED
    description = Column(String(256), nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    is_real_ai = Column(Boolean, default=True)
    
    mission = relationship("Mission", back_populates="hazards")
    detections = relationship("Detection", back_populates="hazard_rel")

class Detection(Base):
    __tablename__ = "detections"
    
    id = Column(String(64), primary_key=True, index=True) # e.g. "DET-00124"
    mission_id = Column(String(64), ForeignKey("missions.id"), nullable=False, index=True)
    frame_id = Column(String(64), ForeignKey("detection_frames.id"), nullable=True, index=True)
    frame_number = Column(Integer, nullable=False, index=True)
    timestamp = Column(Float, default=0.0)
    
    class_name = Column(String(64), nullable=False, index=True) # person, car, etc.
    mapped_type = Column(String(64), default="survivor", index=True) # survivor, vehicle, hazard
    confidence = Column(Float, nullable=False)
    
    # Bounding Box Coordinates (pixels)
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)
    
    tracking_id = Column(Integer, nullable=True, index=True)
    survivor_id = Column(String(64), ForeignKey("survivors.id"), nullable=True, index=True)
    hazard_id = Column(String(64), ForeignKey("hazards.id"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    mission = relationship("Mission", back_populates="detections")
    frame_rel = relationship("DetectionFrame", back_populates="detections")
    survivor_rel = relationship("Survivor", back_populates="detections")
    hazard_rel = relationship("Hazard", back_populates="detections")
    
    __table_args__ = (
        Index("idx_det_mission_frame", "mission_id", "frame_number"),
        Index("idx_det_tracking", "mission_id", "tracking_id"),
    )
