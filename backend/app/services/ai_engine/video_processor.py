import cv2
import asyncio
import os
import uuid
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime
from PIL import Image, ExifTags

from .detector import YOLODetector
from .tracker import ObjectTracker
from .risk_engine import RiskEngine
from .schemas import DetectionResult, SurvivorRisk, AIProgressUpdate, BBox
from app.db.session import SessionLocal
from app.models.domain import Mission, DetectionFrame, Detection, Survivor, Hazard, RiskLevel

logger = logging.getLogger("rescuegrid.ai.video_processor")

def extract_exif_gps(image_path: str) -> Optional[Dict[str, float]]:
    """Extracts GPS coordinates from image EXIF metadata if present."""
    try:
        image = Image.open(image_path)
        exif = image._getexif()
        if not exif:
            return None

        gps_info = {}
        for key, val in exif.items():
            tag_name = ExifTags.TAGS.get(key, key)
            if tag_name == "GPSInfo":
                for t in val:
                    sub_tag = ExifTags.GPSTAGS.get(t, t)
                    gps_info[sub_tag] = val[t]

        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            lat_dms = gps_info["GPSLatitude"]
            lng_dms = gps_info["GPSLongitude"]
            
            lat = float(lat_dms[0]) + float(lat_dms[1]) / 60.0 + float(lat_dms[2]) / 3600.0
            lng = float(lng_dms[0]) + float(lng_dms[1]) / 60.0 + float(lng_dms[2]) / 3600.0
            
            if gps_info.get("GPSLatitudeRef") == "S":
                lat = -lat
            if gps_info.get("GPSLongitudeRef") == "W":
                lng = -lng
                
            return {"lat": round(lat, 6), "lng": round(lng, 6)}
    except Exception as e:
        logger.debug(f"No EXIF GPS extracted: {e}")
    return None

class VideoProcessor:
    def __init__(
        self,
        conf_threshold: float = 0.40,
        iou_threshold: float = 0.45,
        target_fps: int = 8
    ):
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.target_fps = target_fps
        self.detector = YOLODetector(conf_threshold=conf_threshold, iou_threshold=iou_threshold)
        self.tracker = ObjectTracker(tracker_type="bytetrack.yaml")
        self.risk_engine = RiskEngine()

    async def process_media(
        self,
        file_path: str,
        mission_id: str,
        ws_manager = None,
        gps_reference: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Processes image or video file asynchronously.
        Saves results to the database and broadcasts live updates through WebSocket.
        """
        ext = os.path.splitext(file_path)[1].lower()
        is_image = ext in [".jpg", ".jpeg", ".png"]

        # Reset tracker state for clean tracking in new processing run
        self.tracker.reset()

        # Database session
        db = SessionLocal()
        try:
            # Ensure mission exists in DB
            mission = db.query(Mission).filter(Mission.id == mission_id).first()
            if not mission:
                mission = Mission(
                    id=mission_id,
                    name=f"Mission {mission_id}",
                    description="Autonomous search and rescue analysis",
                    status="ACTIVE",
                    media_path=file_path,
                    media_type="image" if is_image else "video",
                    is_real_ai=True
                )
                db.add(mission)
                db.commit()
                db.refresh(mission)
            else:
                mission.media_path = file_path
                mission.media_type = "image" if is_image else "video"
                mission.is_real_ai = True
                db.commit()

            if is_image:
                return await self._process_image(file_path, mission_id, db, ws_manager, gps_reference)
            else:
                return await self._process_video(file_path, mission_id, db, ws_manager, gps_reference)

        except Exception as e:
            logger.error(f"Error processing media for mission {mission_id}: {e}", exc_info=True)
            if ws_manager:
                await ws_manager.broadcast({
                    "type": "ai_error",
                    "mission_id": mission_id,
                    "error": str(e)
                })
            return {"status": "error", "error": str(e)}
        finally:
            db.close()

    async def _process_image(
        self,
        image_path: str,
        mission_id: str,
        db,
        ws_manager,
        gps_reference: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError(f"Could not load image: {image_path}")

        height, width = frame.shape[:2]
        
        # Check image EXIF for real GPS
        exif_gps = extract_exif_gps(image_path)
        effective_gps = exif_gps or gps_reference or {"lat": 34.0522, "lng": -118.2437}

        # Real YOLO inference
        detections = self.detector.detect_frame(
            frame=frame,
            frame_number=1,
            timestamp=0.0
        )

        # Update tracker & survivor layer
        self.tracker.update_tracks(
            detections=detections,
            frame_number=1,
            timestamp=0.0,
            gps_reference=effective_gps
        )

        # Evaluate risk
        survivors = self.tracker.get_all_survivors()
        risk_results = self.risk_engine.evaluate_survivors(
            survivors=survivors,
            current_detections=detections,
            frame_width=width,
            frame_height=height
        )

        # Persist to Database
        frame_uid = uuid.uuid4().hex[:6]
        db_frame = DetectionFrame(
            id=f"FRM-{mission_id}-{frame_uid}-0001",
            mission_id=mission_id,
            frame_number=1,
            timestamp=0.0,
            detection_count=len(detections)
        )
        db.add(db_frame)

        # Store survivors and detections
        for s in risk_results:
            surv_db_id = f"{mission_id}_{s.survivor_id}"
            db_surv = db.query(Survivor).filter(Survivor.id == surv_db_id).first()
            if not db_surv:
                db_surv = Survivor(
                    id=surv_db_id,
                    mission_id=mission_id,
                    tracking_id=s.tracking_id,
                    confidence=s.confidence,
                    first_detected_frame=1,
                    last_detected_frame=1,
                    detection_count=s.detection_count,
                    lat=s.location["lat"] if s.location else None,
                    lng=s.location["lng"] if s.location else None,
                    has_gps=s.has_gps,
                    risk_score=s.risk_score,
                    priority=s.priority,
                    risk_reasons="; ".join(s.reasons),
                    status=s.status,
                    is_real_ai=True
                )
                db.add(db_surv)
            else:
                db_surv.last_detected_frame = 1
                db_surv.detection_count = s.detection_count
                db_surv.confidence = s.confidence
                db_surv.risk_score = s.risk_score
                db_surv.priority = s.priority
                db_surv.status = s.status

        for det in detections:
            surv_db_id = f"{mission_id}_{det.survivor_id}" if det.survivor_id else None
            det_db_id = f"{mission_id}_{det.detection_id}_{uuid.uuid4().hex[:4]}"
            db_det = Detection(
                id=det_db_id,
                mission_id=mission_id,
                frame_id=db_frame.id,
                frame_number=1,
                timestamp=0.0,
                class_name=det.class_name,
                mapped_type=det.mapped_type,
                confidence=det.confidence,
                bbox_x1=det.bbox.x1,
                bbox_y1=det.bbox.y1,
                bbox_x2=det.bbox.x2,
                bbox_y2=det.bbox.y2,
                tracking_id=det.tracking_id,
                survivor_id=surv_db_id
            )
            db.add(db_det)

        # Update Mission stats
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        if mission:
            mission.total_frames = 1
            mission.processed_frames = 1
            mission.survivors_count = len(survivors)
            mission.hazards_count = len([d for d in detections if d.mapped_type == "hazard"])
            mission.area_covered = 100.0

        db.commit()

        # Build payload
        progress_payload = {
            "type": "ai_progress",
            "mode": "REAL_AI",
            "is_real_ai": True,
            "mission_id": mission_id,
            "frame": 1,
            "total_frames": 1,
            "progress": 100.0,
            "fps": 0.0,
            "detections_count": len(detections),
            "survivors_count": len(survivors),
            "hazards_count": len([d for d in detections if d.mapped_type == "hazard"]),
            "tracked_count": len(survivors),
            "detections": [d.model_dump() for d in detections],
            "survivors": [r.model_dump() for r in risk_results]
        }

        if ws_manager:
            await ws_manager.broadcast(progress_payload)

            # Check critical alerts
            for r in risk_results:
                if r.priority == "CRITICAL":
                    alert_payload = self.risk_engine.create_critical_alert(r)
                    alert_payload["mission_id"] = mission_id
                    alert_payload["mode"] = "REAL_AI"
                    await ws_manager.broadcast(alert_payload)

            # Broadcast completion
            await ws_manager.broadcast({
                "type": "ai_complete",
                "mode": "REAL_AI",
                "mission_id": mission_id,
                "total_frames": 1,
                "survivors_detected": len(survivors),
                "detections_count": len(detections)
            })

        return progress_payload

    async def _process_video(
        self,
        video_path: str,
        mission_id: str,
        db,
        ws_manager,
        gps_reference: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video file: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080

        # Frame skipping: Aim for target inference FPS to keep CPU laptop processing responsive
        # E.g., if video is 30 FPS and target is 8 FPS, skip every ~4 frames
        frame_skip = max(1, round(video_fps / self.target_fps))

        effective_gps = gps_reference or {"lat": 34.0522, "lng": -118.2437}

        # Update mission with total frames
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        if mission:
            mission.total_frames = total_frames
            db.commit()

        frame_index = 0
        processed_count = 0
        start_time = asyncio.get_event_loop().time()
        previously_alerted_survivors = set()
        frame_uid = uuid.uuid4().hex[:6]
        existing_survivors: Dict[str, Any] = {}

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_index += 1

                # Frame skipping
                if frame_index % frame_skip != 0 and frame_index != 1 and frame_index != total_frames:
                    continue

                timestamp = frame_index / video_fps
                processed_count += 1

                # 1. Object tracking & YOLO Inference
                track_results = self.tracker.track_frame(
                    frame=frame,
                    frame_number=frame_index,
                    timestamp=timestamp,
                    conf_threshold=self.conf_threshold,
                    iou_threshold=self.iou_threshold
                )

                # 2. Extract structured detection results
                detections = self.detector.detect_frame(
                    frame=frame,
                    frame_number=frame_index,
                    timestamp=timestamp,
                    track_results=track_results
                )

                # 3. Update multi-frame survivor intelligence
                self.tracker.update_tracks(
                    detections=detections,
                    frame_number=frame_index,
                    timestamp=timestamp,
                    gps_reference=effective_gps
                )

                # 4. Multi-factor Risk Analysis
                survivors = self.tracker.get_all_survivors()
                risk_results = self.risk_engine.evaluate_survivors(
                    survivors=survivors,
                    current_detections=detections,
                    frame_width=width,
                    frame_height=height
                )

                # 5. Persist to Database every batch of frames
                db_frame = DetectionFrame(
                    id=f"FRM-{mission_id}-{frame_uid}-{frame_index:05d}",
                    mission_id=mission_id,
                    frame_number=frame_index,
                    timestamp=round(timestamp, 2),
                    detection_count=len(detections)
                )
                db.add(db_frame)

                # Store/update survivors
                for s in risk_results:
                    surv_db_id = f"{mission_id}_{s.survivor_id}"
                    db_surv = existing_survivors.get(surv_db_id) or db.query(Survivor).filter(Survivor.id == surv_db_id).first()
                    if not db_surv:
                        db_surv = Survivor(
                            id=surv_db_id,
                            mission_id=mission_id,
                            tracking_id=s.tracking_id,
                            confidence=s.confidence,
                            first_detected_frame=frame_index,
                            last_detected_frame=frame_index,
                            detection_count=s.detection_count,
                            lat=s.location["lat"] if s.location else None,
                            lng=s.location["lng"] if s.location else None,
                            has_gps=s.has_gps,
                            risk_score=s.risk_score,
                            priority=s.priority,
                            risk_reasons="; ".join(s.reasons),
                            status=s.status,
                            is_real_ai=True
                        )
                        db.add(db_surv)
                        existing_survivors[surv_db_id] = db_surv
                    else:
                        existing_survivors[surv_db_id] = db_surv
                        db_surv.last_detected_frame = frame_index
                        db_surv.last_detected_at = datetime.utcnow()
                        db_surv.detection_count = s.detection_count
                        db_surv.confidence = s.confidence
                        db_surv.risk_score = s.risk_score
                        db_surv.priority = s.priority
                        db_surv.risk_reasons = "; ".join(s.reasons)
                        db_surv.status = s.status

                for det in detections:
                    surv_db_id = f"{mission_id}_{det.survivor_id}" if det.survivor_id else None
                    det_db_id = f"{mission_id}_{det.detection_id}_{uuid.uuid4().hex[:4]}"
                    db_det = Detection(
                        id=det_db_id,
                        mission_id=mission_id,
                        frame_id=db_frame.id,
                        frame_number=frame_index,
                        timestamp=round(timestamp, 2),
                        class_name=det.class_name,
                        mapped_type=det.mapped_type,
                        confidence=det.confidence,
                        bbox_x1=det.bbox.x1,
                        bbox_y1=det.bbox.y1,
                        bbox_x2=det.bbox.x2,
                        bbox_y2=det.bbox.y2,
                        tracking_id=det.tracking_id,
                        survivor_id=surv_db_id
                    )
                    db.add(db_det)

                # Commit occasionally
                if processed_count % 5 == 0 or frame_index >= total_frames:
                    db.commit()

                # Calculate progress and performance
                now = asyncio.get_event_loop().time()
                elapsed = max(0.001, now - start_time)
                current_fps = round(processed_count / elapsed, 1)
                progress_pct = min(100.0, round((frame_index / max(1, total_frames)) * 100.0, 1))

                progress_payload = {
                    "type": "ai_progress",
                    "mode": "REAL_AI",
                    "is_real_ai": True,
                    "mission_id": mission_id,
                    "frame": frame_index,
                    "total_frames": total_frames,
                    "progress": progress_pct,
                    "fps": current_fps,
                    "detections_count": len(detections),
                    "survivors_count": len(survivors),
                    "hazards_count": len([d for d in detections if d.mapped_type == "hazard"]),
                    "tracked_count": len(survivors),
                    "detections": [d.model_dump() for d in detections],
                    "survivors": [r.model_dump() for r in risk_results]
                }

                if ws_manager:
                    await ws_manager.broadcast(progress_payload)

                    # Trigger critical alert if new critical survivor
                    for r in risk_results:
                        if r.priority == "CRITICAL" and r.survivor_id not in previously_alerted_survivors:
                            previously_alerted_survivors.add(r.survivor_id)
                            alert_payload = self.risk_engine.create_critical_alert(r)
                            alert_payload["mission_id"] = mission_id
                            alert_payload["mode"] = "REAL_AI"
                            await ws_manager.broadcast(alert_payload)

                # Cooperative yielding for async loop
                await asyncio.sleep(0.005)

        finally:
            cap.release()

        # Update final mission summary
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        if mission:
            mission.processed_frames = frame_index
            mission.survivors_count = self.tracker.get_survivor_count()
            mission.area_covered = 100.0
            db.commit()

        completion_payload = {
            "type": "ai_complete",
            "mode": "REAL_AI",
            "mission_id": mission_id,
            "total_frames": total_frames,
            "processed_frames": frame_index,
            "survivors_detected": self.tracker.get_survivor_count(),
            "status": "COMPLETED"
        }

        if ws_manager:
            await ws_manager.broadcast(completion_payload)

        return completion_payload
