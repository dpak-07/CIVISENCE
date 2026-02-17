"""
Text Intelligence Engine
DistilBERT-based text classification with lazy loading and auto-training
"""
import os
import numpy as np
import logging
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class NLPClassifier:
    """Text classification service using DistilBERT"""
    
    CATEGORIES = [
        "pothole",
        "garbage",
        "broken_streetlight",
        "water_leakage",
        "drainage_overflow",
        "road_damage"
    ]
    
    def __init__(self):
        """Initialize NLP classifier"""
        self.model = None
        self.tokenizer = None
        self.device = None
        self.model_path = Path(__file__).parent.parent / 'models' / 'text_model'
        self._load_model()
    
    def _load_model(self):
        """Load DistilBERT model with lazy initialization"""
        try:
            if not self.model_path.exists():
                logger.warning(f"Text model not found at {self.model_path}")
                logger.info("Model will be trained on first use or manually via training script")
                return
            
            # Import transformers only when needed
            import torch
            from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
            
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            self.tokenizer = DistilBertTokenizer.from_pretrained(self.model_path)
            self.model = DistilBertForSequenceClassification.from_pretrained(self.model_path)
            self.model.to(self.device)
            self.model.eval()
            
            logger.info(f"✓ Text model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load text model: {e}")
            self.model = None
            self.tokenizer = None
    
    def classify(self, title: str, description: str) -> Dict[str, Any]:
        """
        Classify issue text
        
        Args:
            title: Issue title
            description: Issue description
        
        Returns:
            Dict with category and confidence
        """
        if self.model is None or self.tokenizer is None:
            logger.warning("Text model not loaded, using fallback")
            return self._rule_based_classification(title, description)
        
        try:
            import torch
            
            # Combine title and description
            text = f"{title}. {description}"
            
            # Tokenize
            inputs = self.tokenizer(
                text,
                add_special_tokens=True,
                max_length=128,
                padding='max_length',
                truncation=True,
                return_attention_mask=True,
                return_tensors='pt'
            )
            
            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Predict
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.nn.functional.softmax(logits, dim=1)
            
            # Get prediction
            predicted_idx = torch.argmax(probs, dim=1).item()
            confidence = probs[0][predicted_idx].item()
            category = self.CATEGORIES[predicted_idx]
            
            return {
                "category": category,
                "confidence": float(confidence),
                "model_version": "distilbert-v1",
                "all_predictions": {
                    cat: float(probs[0][i].item())
                    for i, cat in enumerate(self.CATEGORIES)
                }
            }
            
        except Exception as e:
            logger.error(f"Text classification error: {e}")
            return self._rule_based_classification(title, description)
    
    def _rule_based_classification(self, title: str, description: str) -> Dict[str, Any]:
        """Fallback rule-based classification"""
        text = f"{title} {description}".lower()
        
        keywords = {
            "pothole": ["pothole", "pit", "hole", "crater"],
            "garbage": ["garbage", "waste", "trash", "litter", "dump"],
            "broken_streetlight": ["streetlight", "street light", "lamp", "lighting", "bulb", "broken"],
            "water_leakage": ["water", "leak", "pipe", "burst", "overflow", "tap"],
            "road_damage": ["road", "pavement", "crack", "broken", "damage"],
            "drainage_overflow": ["drain", "drainage", "sewer", "blocked", "clog", "gutter", "overflow"]
        }
        
        scores = {}
        for category, words in keywords.items():
            score = sum(1 for word in words if word in text)
            scores[category] = score
        
        if max(scores.values()) > 0:
            category = max(scores, key=scores.get)
            confidence = min(0.7 + (scores[category] * 0.1), 0.95)
        else:
            category = "road_damage"  # Default fallback
            confidence = 0.5
        
        return {
            "category": category,
            "confidence": confidence,
            "model_version": "fallback-v1",
            "note": "Text model not available, using rule-based classification"
        }
    
    def is_model_available(self) -> bool:
        """Check if model is loaded and available"""
        return self.model is not None and self.tokenizer is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_type": "DistilBERT",
            "categories": self.CATEGORIES,
            "num_categories": len(self.CATEGORIES),
            "model_loaded": self.is_model_available(),
            "model_path": str(self.model_path),
            "device": str(self.device) if self.device else "N/A"
        }


# Global instance (lazy loaded)
_nlp_classifier = None


def get_nlp_classifier() -> NLPClassifier:
    """Get global NLP classifier instance"""
    global _nlp_classifier
    if _nlp_classifier is None:
        _nlp_classifier = NLPClassifier()
    return _nlp_classifier
