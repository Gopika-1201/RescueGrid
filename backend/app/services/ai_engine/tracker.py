import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from .schemas import DetectionResult, BBox, TrackedTarget
from .model_manager import model_manager

class SurvivorState:
    def __init__(
        self,
        tracking_id: int,
        survivor_id: str,
        first_frame: int,
        first_timestamp: float,
        bbox: BBox,
        confidence: float,
        class_name: str = "person"
    ):
        self.tracking_id = tracking_id
        self.survivor_id = survivor_id
        self.class_name = class_name
        self.first_detected_frame = first_frame
        self.last_detected_frame = first_frame
        self.first_detected_timestamp = first_timestamp
        self.last_detected_timestamp = first_timestamp
        self.detection_count = 1
        self.confidences = [confidence]
        self.best_confidence = confidence
        self.latest_bbox = bbox
        self.status = "DETECTED" # DETECTED, VERIFIED, PRIORITY, RESCUED, LOST_TRACK, MONITORING
        self.risk_score = 0
        self.priority = "LOW"
        self.risk_reasons: List[str] = []
        self.lat: Optional[float] = None
        self.lng: Optional[float] = None
        self.has_gps = False
        self.nearby_hazards: List[str] = []

    def update(self, frame: int, timestamp: float, bbox: BBox, confidence: float):
        self.last_detected_frame = frame
        self.last_detected_timestamp = timestamp
        self.detection_count += 1
        self.confidences.append(confidence)
        if confidence > self.best_confidence:
            self.best_confidence = confidence
        self.latest_bbox = bbox

        # Status progression
        if self.detection_count >= 3 and self.status == "DETECTED":
            self.status = "VERIFIED"
        elif self.status not in ["PRIORITY", "RESCUED"]:
            self.status = "MONITORING"

    @property
    def avg_confidence(self) -> float:
        if not self.confidences:
            return 0.0
        return round(float(np.mean(self.confidences[-10:])), 4)

class ObjectTracker:
    """
    Manages multi-frame object tracking using ByteTrack/BoT-SORT from YOLO,
    mapping raw tracker IDs to stable human-readable survivor identifiers (e.g., P-001, P-002).
    Ensures that a person detected across 100 frames is counted as ONE survivor, not 100.
    """
    def __init__(self, tracker_type: str = "bytetrack.yaml"):
        self.tracker_type = tracker_type
        self.model_manager = model_manager
        # Mapping from tracker ID (int) -> SurvivorState
        self.survivors: Dict[int, SurvivorState] = {}
        # Unassigned fallback counter for frames where tracker ID wasn't assigned
        self._next_survivor_num = 1
        self._id_mapping: Dict[int, str] = {}

    def get_or_assign_survivor_id(self, tracking_id: Optional[int]) -> str:
        if tracking_id is not None:
            if tracking_id not in self._id_mapping:
                self._id_mapping[tracking_id] = f"P-{tracking_id:03d}"
            return self._id_mapping[tracking_id]
        else:
            # Fallback for untracked single detections
            surv_id = f"P-TMP{self._next_survivor_num:03d}"
            self._next_survivor_num += 1
            return surv_id

    def track_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        timestamp: float,
        conf_threshold: float = 0.40,
        iou_threshold: float = 0.45
    ):
        """
        Executes YOLO tracking on the frame using ByteTrack.
        Returns the raw Ultralytics track results.
        """
        base_model = self.model_manager.get_base_model()
        if base_model is None:
            return None

        # model.track maintains tracker state across consecutive frames
        results = base_model.track(
            source=frame,
            conf=conf_threshold,
            iou=iou_threshold,
            persist=True,
            tracker=self.tracker_type,
            verbose=False,
            device=self.model_manager.device
        )
        return results

    def update_tracks(
        self,
        detections: List[DetectionResult],
        frame_number: int,
        timestamp: float,
        gps_reference: Optional[Dict[str, float]] = None
    ):
        """
        Updates the internal survivor intelligence registry from detections in the current frame.
        """
        active_ids_in_frame = set()

        for det in detections:
            if det.class_name == "person":
                track_id = det.tracking_id
                # If tracker assigned an ID, use it; otherwise assign deterministic ID
                survivor_id = self.get_or_assign_survivor_id(track_id)
                det.survivor_id = survivor_id

                track_key = track_id if track_id is not None else hash(det.detection_id)
                active_ids_in_frame.add(track_key)

                if track_key in self.survivors:
                    self.survivors[track_key].update(
                        frame=frame_number,
                        timestamp=timestamp,
                        bbox=det.bbox,
                        confidence=det.confidence
                    )
                else:
                    new_state = SurvivorState(
                        tracking_id=track_id or 0,
                        survivor_id=survivor_id,
                        first_frame=frame_number,
                        first_timestamp=timestamp,
                        bbox=det.bbox,
                        confidence=det.confidence,
                        class_name=det.class_name
                    )
                    # Assign GPS if available
                    if gps_reference and "lat" in gps_reference and "lng" in gps_reference:
                        # Slight deterministic offset based on bbox center so multiple survivors don't overlap completely
                        cx = (det.bbox.x1 + det.bbox.x2) / 2.0
                        cy = (det.bbox.y1 + det.bbox.y2) / 2.0
                        new_state.lat = round(gps_reference["lat"] + (cy - 500) * 0.00002, 6)
                        new_state.lng = round(gps_reference["lng"] + (cx - 500) * 0.00002, 6)
                        new_state.has_gps = True
                    self.survivors[track_key] = new_state

        # Update lost tracking for survivors not seen for > 30 frames
        for key, surv in self.survivors.items():
            if key not in active_ids_in_frame:
                if frame_number - surv.last_detected_frame > 30:
                    if surv.status != "RESCUED":
                        surv.status = "LOST_TRACK"

    def get_survivor_count(self) -> int:
        """Counts unique survivors detected so far."""
        return len(self.survivors)

    def get_all_survivors(self) -> List[SurvivorState]:
        return list(self.survivors.values())

    def reset(self):
        """Reset tracking state for a new mission or video."""
        self.survivors.clear()
        self._id_mapping.clear()
        self._next_survivor_num = 1
