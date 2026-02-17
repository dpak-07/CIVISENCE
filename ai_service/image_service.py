"""
Image Intelligence Engine
MobileNetV2-based image classification with lazy loading and auto-training
"""
import os
import numpy as np
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class ImageClassifier:
    """Image classification service using MobileNetV2"""
    
    CATEGORIES = [
        "pothole",
        "garbage",
        "broken_streetlight",
        "water_leakage",
        "drainage_overflow",
        "road_damage"
    ]
    
    def __init__(self):
        """Initialize image classifier"""
        self.model = None
        self.model_path = Path(__file__).parent.parent / 'models' / 'image_model.h5'
        self._load_model()
    
    def _load_model(self):
        """Load MobileNetV2 model with lazy initialization"""
        try:
            if not self.model_path.exists():
                logger.warning(f"Image model not found at {self.model_path}")
                logger.info("Model will be trained on first use or manually via training script")
                return
            
            # Import TensorFlow only when needed
            import tensorflow as tf
            from tensorflow import keras
            
            self.model = keras.models.load_model(self.model_path)
            logger.info("✓ Image model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load image model: {e}")
            self.model = None
    
    def classify(
        self,
        image_path: Optional[str] = None,
        image_array: Optional[np.ndarray] = None,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classify image
        
        Args:
            image_path: Path to image file
            image_array: Numpy array of image
            image_url: URL to image (will be downloaded)
        
        Returns:
            Dict with category and confidence
        """
        if self.model is None:
            logger.warning("Image model not loaded, using fallback")
            return {
                "category": "other",
                "confidence": 0.5,
                "model_version": "fallback",
                "note": "Image model not available"
            }
        
        try:
            # Prepare image
            img_array = self._prepare_image(image_path, image_array, image_url)
            
            if img_array is None:
                raise ValueError("No valid image input provided")
            
            # Predict
            predictions = self.model.predict(img_array, verbose=0)
            predicted_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_idx])
            
            category = self.CATEGORIES[predicted_idx]
            
            return {
                "category": category,
                "confidence": confidence,
                "model_version": "mobilenetv2-v1",
                "all_predictions": {
                    cat: float(predictions[0][i])
                    for i, cat in enumerate(self.CATEGORIES)
                }
            }
            
        except Exception as e:
            logger.error(f"Image classification error: {e}")
            return {
                "category": "other",
                "confidence": 0.5,
                "model_version": "fallback",
                "error": str(e)
            }
    
    def classify_batch(
        self,
        image_paths: List[str] = None,
        image_arrays: List[np.ndarray] = None
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple images
        
        Args:
            image_paths: List of image file paths
            image_arrays: List of image arrays
        
        Returns:
            List of classification results
        """
        if self.model is None:
            logger.warning("Image model not loaded")
            return []
        
        try:
            # Prepare images
            if image_paths:
                images = [self._prepare_image(path) for path in image_paths]
            elif image_arrays:
                images = [self._prepare_image(image_array=arr) for arr in image_arrays]
            else:
                return []
            
            # Filter out None values
            images = [img for img in images if img is not None]
            
            if not images:
                return []
            
            # Stack images
            batch = np.vstack(images)
            
            # Predict
            predictions = self.model.predict(batch, verbose=0)
            
            results = []
            for pred in predictions:
                predicted_idx = np.argmax(pred)
                confidence = float(pred[predicted_idx])
                category = self.CATEGORIES[predicted_idx]
                
                results.append({
                    "category": category,
                    "confidence": confidence,
                    "model_version": "mobilenetv2-v1"
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Batch classification error: {e}")
            return []
    
    def _prepare_image(
        self,
        image_path: Optional[str] = None,
        image_array: Optional[np.ndarray] = None,
        image_url: Optional[str] = None
    ) -> Optional[np.ndarray]:
        """
        Prepare image for prediction
        
        Returns:
            Preprocessed image array ready for model input
        """
        try:
            from tensorflow.keras.preprocessing import image
            from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
            import requests
            from io import BytesIO
            from PIL import Image
            
            img = None
            
            if image_path:
                # Load from file
                img = image.load_img(image_path, target_size=(224, 224))
            elif image_array is not None:
                # Use provided array
                from PIL import Image
                img = Image.fromarray(image_array.astype('uint8'))
                img = img.resize((224, 224))
            elif image_url:
                # Download from URL
                response = requests.get(image_url, timeout=10)
                img = Image.open(BytesIO(response.content))
                img = img.resize((224, 224))
            
            if img is None:
                return None
            
            # Convert to array and preprocess
            img_array = image.img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = preprocess_input(img_array)
            
            return img_array
            
        except Exception as e:
            logger.error(f"Image preparation error: {e}")
            return None
    
    def is_model_available(self) -> bool:
        """Check if model is loaded and available"""
        return self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_type": "MobileNetV2",
            "categories": self.CATEGORIES,
            "num_categories": len(self.CATEGORIES),
            "model_loaded": self.is_model_available(),
            "model_path": str(self.model_path)
        }


# Global instance (lazy loaded)
_image_classifier = None


def get_image_classifier() -> ImageClassifier:
    """Get global image classifier instance"""
    global _image_classifier
    if _image_classifier is None:
        _image_classifier = ImageClassifier()
    return _image_classifier
