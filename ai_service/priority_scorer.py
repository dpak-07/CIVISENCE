"""
Priority Scoring Service
Uses XGBoost model from models/training/
"""
import os
import joblib
import xgboost as xgb
import numpy as np
import pandas as pd
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class PriorityScorer:
    """XGBoost-based priority scorer"""
    
    def __init__(self):
        self.model = None
        self.feature_columns = None
        self._load_model()
    
    def _load_model(self):
        """Load XGBoost priority model"""
        try:
            model_path = os.path.join(
                os.path.dirname(__file__),
                '..',
                'models',
                'training',
                'calibrated_xgb.joblib'
            )
            
            feature_path = os.path.join(
                os.path.dirname(__file__),
                '..',
                'models',
                'training',
                'feature_columns.joblib'
            )
            
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                logger.info("Loaded XGBoost priority model")
            
            if os.path.exists(feature_path):
                self.feature_columns = joblib.load(feature_path)
                logger.info(f"Loaded feature columns: {self.feature_columns}")
                
        except Exception as e:
            logger.error(f"Failed to load priority model: {e}")
    
    def score(
        self,
        category: str,
        ward_number: int,
        description: str,
        image_count: int
    ) -> Dict[str, Any]:
        """
        Calculate priority score
        
        Args:
            category: Issue category
            ward_number: Ward number
            description: Issue description
            image_count: Number of attached images
        
        Returns:
            Dict with priority level and score
        """
        try:
            # Feature engineering
            features = self._create_features(
                category, ward_number, description, image_count
            )
            
            if self.model and self.feature_columns:
                # Create DataFrame with the feature columns
                df = pd.DataFrame([features], columns=self.feature_columns)
                
                # Predict
                score = self.model.predict_proba(df)[0][1]  # Probability of high priority
                
                # Map to priority level
                if score >= 0.75:
                    priority = "critical"
                elif score >= 0.6:
                    priority = "high"
                elif score >= 0.4:
                    priority = "medium"
                else:
                    priority = "low"
                
                return {
                    "priority": priority,
                    "score": float(score)
                }
            else:
                # Fallback rule-based
                return self._rule_based_priority(category, description, image_count)
                
        except Exception as e:
            logger.error(f"Priority scoring error: {e}")
            return self._rule_based_priority(category, description, image_count)
    
    def _create_features(self, category, ward_number, description, image_count):
        """Create feature vector for model"""
        # This should match the features used during training
        return [
            image_count,
            ward_number,
            len(description.split()),
            1 if category == "water_leakage" else 0,
            1 if category == "pothole" else 0,
            1 if category == "garbage" else 0,
            1 if category == "streetlight" else 0,
            1 if category == "road_damage" else 0,
            1 if category == "drainage" else 0
        ]
    
    def _rule_based_priority(self, category, description, image_count):
        """Fallback rule-based priority"""
        score = 0.5
        
        # Category weights
        urgent_categories = ["water_leakage", "road_damage"]
        if category in urgent_categories:
            score += 0.2
        
        # Description urgency keywords
        urgent_words = ["urgent", "emergency", "dangerous", "critical", "severe"]
        if any(word in description.lower() for word in urgent_words):
            score += 0.15
        
        # Image evidence
        if image_count > 0:
            score += 0.1
        
        score = min(score, 1.0)
        
        if score >= 0.75:
            priority = "critical"
        elif score >= 0.6:
            priority = "high"
        elif score >= 0.4:
            priority = "medium"
        else:
            priority = "low"
        
        return {
            "priority": priority,
            "score": score
        }
