import uuid
import numpy as np
from typing import List, Dict, Any, Optional
from .schemas import DetectionResult, BBox
from .model_manager import model_manager

# Configurable mapping from COCO classes to search and rescue domain entities
CLASS_MAPPING: Dict[str, str] = {
    "person": "survivor",
    "car": "vehicle",
    "truck": "vehicle",
    "bus": "vehicle",
    "motorcycle": "vehicle",
    "boat": "boat",
    "bicycle": "vehicle",
    "backpack": "equipment",
    "suitcase": "equipment"
}

class YOLODetector:
    def __init__(
        self,
        conf_threshold: float = 0.40,
        iou_threshold: float = 0.45,
        target_classes: Optional[List[str]] = None
    ):
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model_manager = model_manager
        # Target classes to process; default focuses on survivor & operational vehicles/boats
        self.target_classes = target_classes or ["person", "car", "truck", "bus", "boat", "motorcycle"]
        self.class_mapping = dict(CLASS_MAPPING)

    def detect_frame(
        self,
        frame: np.ndarray,
        frame_number: int = 1,
        timestamp: float = 0.0,
        conf_override: Optional[float] = None,
        iou_override: Optional[float] = None,
        track_results = None
    ) -> List[DetectionResult]:
        """
        Runs real YOLO inference on a single frame.
        If track_results is passed from the tracker, uses its boxes & IDs directly.
        Otherwise performs fresh prediction using the base model.
        """
        conf = conf_override if conf_override is not None else self.conf_threshold
        iou = iou_override if iou_override is not None else self.iou_threshold
        
        detections: List[DetectionResult] = []

        # 1. Base YOLO Inference
        if track_results is not None:
            # We already have tracking results from model.track()
            results = track_results
        else:
            base_model = self.model_manager.get_base_model()
            if base_model is None:
                return []
            results = base_model.predict(
                source=frame,
                conf=conf,
                iou=iou,
                verbose=False,
                device=self.model_manager.device
            )

        if not results or len(results) == 0:
            return []

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return []

        # Extract tracking IDs if present
        track_ids = None
        if hasattr(boxes, "id") and boxes.id is not None:
            track_ids = boxes.id.cpu().numpy()

        for idx, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            
            # Confidence filtering
            if confidence < conf:
                continue

            class_name = result.names.get(cls_id, f"class_{cls_id}")

            # Filter for relevant classes in the search & rescue context
            if self.target_classes and class_name not in self.target_classes:
                continue

            xyxy = box.xyxy[0].cpu().numpy()
            track_id = int(track_ids[idx]) if track_ids is not None and track_ids[idx] is not None else None

            mapped_type = self.class_mapping.get(class_name, "general_object")
            
            # Form clean ID format: DET-XXXXX
            det_uuid = uuid.uuid4().hex[:5].upper()
            det_id = f"DET-{frame_number:04d}-{det_uuid}"

            det = DetectionResult(
                detection_id=det_id,
                class_name=class_name,
                mapped_type=mapped_type,
                confidence=round(confidence, 4),
                bbox=BBox(
                    x1=round(float(xyxy[0]), 1),
                    y1=round(float(xyxy[1]), 1),
                    x2=round(float(xyxy[2]), 1),
                    y2=round(float(xyxy[3]), 1)
                ),
                frame=frame_number,
                timestamp=round(timestamp, 2),
                tracking_id=track_id
            )
            detections.append(det)

        # 2. Custom Disaster Model (if loaded)
        custom_model = self.model_manager.get_custom_disaster_model()
        if custom_model is not None:
            try:
                custom_results = custom_model.predict(
                    source=frame,
                    conf=conf,
                    iou=iou,
                    verbose=False,
                    device=self.model_manager.device
                )
                if custom_results and len(custom_results) > 0:
                    c_boxes = custom_results[0].boxes
                    if c_boxes:
                        for c_box in c_boxes:
                            c_cls_id = int(c_box.cls[0].item())
                            c_conf = float(c_box.conf[0].item())
                            c_name = custom_results[0].names.get(c_cls_id, f"disaster_{c_cls_id}")
                            c_xyxy = c_box.xyxy[0].cpu().numpy()
                            c_uuid = uuid.uuid4().hex[:5].upper()
                            
                            detections.append(DetectionResult(
                                detection_id=f"HAZ-{frame_number:04d}-{c_uuid}",
                                class_name=c_name,
                                mapped_type="hazard",
                                confidence=round(c_conf, 4),
                                bbox=BBox(
                                    x1=round(float(c_xyxy[0]), 1),
                                    y1=round(float(c_xyxy[1]), 1),
                                    x2=round(float(c_xyxy[2]), 1),
                                    y2=round(float(c_xyxy[3]), 1)
                                ),
                                frame=frame_number,
                                timestamp=round(timestamp, 2),
                                tracking_id=None
                            ))
            except Exception as e:
                # Custom model inference error handled without failing the main pipeline
                pass

        return detections
