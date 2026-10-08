import math
from typing import List, Dict, Any, Optional
from .schemas import DetectionResult, SurvivorRisk
from .tracker import SurvivorState

class RiskEngine:
    """
    Calculates a transparent, multi-factor risk score for survivors
    derived from real visual detections, spatial geometry, and persistence.
    Strictly avoids claiming medical conditions or injuries from visual data.
    """
    def __init__(self):
        pass

    def evaluate_survivors(
        self,
        survivors: List[SurvivorState],
        current_detections: List[DetectionResult],
        frame_width: int = 1920,
        frame_height: int = 1080
    ) -> List[SurvivorRisk]:
        results: List[SurvivorRisk] = []
        
        # Partition objects in the current frame
        active_hazards = [d for d in current_detections if d.mapped_type in ["hazard", "vehicle"]]
        active_people = [d for d in current_detections if d.class_name == "person"]

        for surv in survivors:
            score = 0
            reasons = []

            # 1. Base Environmental Exposure Risk
            score += 20
            reasons.append("Base disaster zone exposure (+20)")

            # 2. Detection Confidence & Sensor Certainty
            conf = surv.avg_confidence
            if conf >= 0.85:
                score += 15
                reasons.append(f"High detection certainty ({conf:.0%}) (+15)")
            elif conf >= 0.65:
                score += 10
                reasons.append(f"Moderate detection certainty ({conf:.0%}) (+10)")
            else:
                score += 5
                reasons.append(f"Preliminary visual match ({conf:.0%}) (+5)")

            # 3. Persistence (Duration in danger area)
            if surv.detection_count >= 15:
                score += 15
                reasons.append(f"Prolonged stationary exposure across {surv.detection_count} frames (+15)")
            elif surv.detection_count >= 5:
                score += 10
                reasons.append(f"Persistent presence verified over {surv.detection_count} frames (+10)")
            else:
                score += 5
                reasons.append("Initial detection window (+5)")

            # 4. Spatial Isolation (Distance from other people or units)
            s_bbox = surv.latest_bbox
            sx = (s_bbox.x1 + s_bbox.x2) / 2.0
            sy = (s_bbox.y1 + s_bbox.y2) / 2.0

            # Calculate distance to nearest other person in current frame
            min_dist_to_others = float("inf")
            for other in active_people:
                if other.survivor_id != surv.survivor_id:
                    ox = (other.bbox.x1 + other.bbox.x2) / 2.0
                    oy = (other.bbox.y1 + other.bbox.y2) / 2.0
                    dist = math.hypot(sx - ox, sy - oy)
                    if dist < min_dist_to_others:
                        min_dist_to_others = dist

            if min_dist_to_others == float("inf") or min_dist_to_others > (frame_width * 0.25):
                score += 15
                reasons.append("Isolated position, no nearby rescue units (+15)")
            elif min_dist_to_others < 100:
                score += 5
                reasons.append("Survivor cluster identified (+5)")

            # 5. Accessibility & Boundary Constraints
            # Distance from image border (indicates perimeter vs deep center)
            dist_to_border = min(sx, sy, frame_width - sx, frame_height - sy)
            if dist_to_border < 80:
                score += 10
                reasons.append("Constrained access corridor near zone perimeter (+10)")

            # 6. Hazard & Vehicle Proximity
            hazard_nearby_names = []
            for h in active_hazards:
                hx = (h.bbox.x1 + h.bbox.x2) / 2.0
                hy = (h.bbox.y1 + h.bbox.y2) / 2.0
                h_dist = math.hypot(sx - hx, sy - hy)
                
                if h_dist < 150: # Very close proximity
                    score += 25
                    hazard_nearby_names.append(f"Critical proximity to {h.class_name} ({h_dist:.0f}px) (+25)")
                elif h_dist < 350:
                    score += 15
                    hazard_nearby_names.append(f"Proximity to {h.class_name} ({h_dist:.0f}px) (+15)")

            if hazard_nearby_names:
                reasons.extend(hazard_nearby_names)
                surv.nearby_hazards = [h.class_name for h in active_hazards]

            # Normalize to 0 - 100
            final_score = min(100, max(0, score))
            surv.risk_score = final_score
            surv.risk_reasons = reasons

            # Priority classification
            if final_score >= 76:
                priority = "CRITICAL"
                if surv.status != "RESCUED":
                    surv.status = "PRIORITY"
            elif final_score >= 51:
                priority = "HIGH"
            elif final_score >= 26:
                priority = "MODERATE"
            else:
                priority = "LOW"
            surv.priority = priority

            location_dict = None
            if surv.has_gps and surv.lat is not None and surv.lng is not None:
                location_dict = {"lat": surv.lat, "lng": surv.lng}

            results.append(SurvivorRisk(
                survivor_id=surv.survivor_id,
                tracking_id=surv.tracking_id,
                risk_score=final_score,
                priority=priority,
                status=surv.status,
                reasons=reasons,
                confidence=surv.avg_confidence,
                detection_count=surv.detection_count,
                first_detected=f"Frame {surv.first_detected_frame} ({surv.first_detected_timestamp:.1f}s)",
                last_detected=f"Frame {surv.last_detected_frame} ({surv.last_detected_timestamp:.1f}s)",
                location=location_dict,
                has_gps=surv.has_gps,
                nearby_hazards=surv.nearby_hazards
            ))

        return results

    def create_critical_alert(self, survivor: SurvivorRisk) -> Dict[str, Any]:
        """
        Constructs an alert payload when a critical risk survivor is detected.
        """
        primary_reason = survivor.reasons[1] if len(survivor.reasons) > 1 else "Elevated multi-factor risk"
        return {
            "type": "alert",
            "alert_id": f"ALT-{survivor.survivor_id}",
            "level": "CRITICAL",
            "title": f"🚨 CRITICAL SURVIVOR DETECTED: {survivor.survivor_id}",
            "survivor_id": survivor.survivor_id,
            "confidence": f"{survivor.confidence:.0%}",
            "risk_score": survivor.risk_score,
            "status": survivor.status,
            "reason": primary_reason,
            "reasons": survivor.reasons,
            "location": survivor.location,
            "timestamp": datetime.utcnow().isoformat()
        }
