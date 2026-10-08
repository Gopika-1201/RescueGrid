import os
import torch
import logging
from typing import Optional, Dict, Any, List
from ultralytics import YOLO

logger = logging.getLogger("rescuegrid.ai.model_manager")

CUSTOM_DISASTER_CLASSES_SPEC = {
    "fire": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"},
    "smoke": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"},
    "flood": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"},
    "debris": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"},
    "damaged_building": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"},
    "landslide": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"},
    "electrical_hazard": {"supported": False, "weights": None, "note": "Requires custom disaster dataset weights"}
}

class ModelStatus:
    UNINITIALIZED = "uninitialized"
    LOADING = "loading"
    READY = "ready"
    UNAVAILABLE = "unavailable"
    ERROR = "error"

class ModelManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "yolov8n.pt"):
        if getattr(self, "_initialized", False):
            return
        self.model_name = model_name
        self.status = ModelStatus.UNINITIALIZED
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.base_model: Optional[YOLO] = None
        self.custom_disaster_model: Optional[YOLO] = None
        self.error_message: Optional[str] = None
        self.custom_disaster_spec = dict(CUSTOM_DISASTER_CLASSES_SPEC)
        
        # Automatically load model upon initialization
        self.load_models()
        self._initialized = True

    def load_models(self):
        self.status = ModelStatus.LOADING
        try:
            logger.info(f"Loading Base YOLO model ({self.model_name}) on device: {self.device}")
            # Locate or download model
            self.base_model = YOLO(self.model_name)
            
            # Check for custom disaster weights if present in models/ directory
            custom_weights_path = os.path.join(os.path.dirname(__file__), "weights", "disaster_yolov8.pt")
            if os.path.exists(custom_weights_path):
                try:
                    logger.info(f"Loading Custom Disaster YOLO model from {custom_weights_path}")
                    self.custom_disaster_model = YOLO(custom_weights_path)
                    for k in self.custom_disaster_spec:
                        self.custom_disaster_spec[k]["supported"] = True
                        self.custom_disaster_spec[k]["weights"] = custom_weights_path
                        self.custom_disaster_spec[k]["note"] = "Custom weights loaded"
                except Exception as c_err:
                    logger.warning(f"Could not load custom disaster weights: {c_err}")
                    self.custom_disaster_model = None
            else:
                logger.info("Custom disaster model weights not present - marking disaster classes as unavailable without fabrication.")
                
            self.status = ModelStatus.READY
            logger.info("YOLO Model loaded successfully. Status: READY")
        except Exception as e:
            self.status = ModelStatus.ERROR
            self.error_message = str(e)
            logger.error(f"Failed to load YOLO model: {e}")

    def get_base_model(self) -> Optional[YOLO]:
        if self.status != ModelStatus.READY or self.base_model is None:
            self.load_models()
        return self.base_model

    def get_custom_disaster_model(self) -> Optional[YOLO]:
        return self.custom_disaster_model

    def get_health(self) -> Dict[str, Any]:
        supported_base = []
        if self.base_model and hasattr(self.base_model, "names"):
            supported_base = list(self.base_model.names.values())

        return {
            "status": self.status,
            "model": self.model_name,
            "device": self.device,
            "inference_available": self.status == ModelStatus.READY and self.base_model is not None,
            "cuda_available": torch.cuda.is_available(),
            "supported_classes": supported_base,
            "custom_disaster_classes": self.custom_disaster_spec,
            "error": self.error_message
        }

# Global singleton instance
model_manager = ModelManager()
