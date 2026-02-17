"""
Open-Source AI Agents for Civic Issue Processing
Uses Whisper, Transformers, FAISS, and other open-source models
No external API dependencies
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from math import radians, sin, cos, sqrt, atan2
import os
import logging

logger = logging.getLogger(__name__)

# Import location database
from .locations_db import IMPORTANT_LOCATIONS

# ==============================
# OPTIONAL IMPORTS WITH FALLBACKS
# ==============================

# Whisper for speech-to-text
try:
    import whisper
    WHISPER_AVAILABLE = True
    logger.info("✓ Whisper loaded")
except ImportError:
    WHISPER_AVAILABLE = False
    logger.warning("Whisper not available. Voice processing will be limited.")

# Transformers for translation and classification
try:
    from transformers import MarianMTModel, MarianTokenizer, pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
    logger.info("✓ Transformers loaded")
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available. Translation and classification will use fallbacks.")

# Tesseract for OCR
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
    logger.info("✓ Tesseract OCR loaded")
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("Tesseract not available. Image OCR will be skipped.")

# spaCy for NLP
try:
    import spacy
    try:
        nlp_engine = spacy.load("en_core_web_sm")
        SPACY_AVAILABLE = True
        logger.info("✓ spaCy loaded")
    except OSError:
        SPACY_AVAILABLE = False
        nlp_engine = None
        logger.warning("spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm")
except ImportError:
    SPACY_AVAILABLE = False
    nlp_engine = None
    logger.warning("spaCy not available.")

# FAISS and sentence-transformers for RAG
try:
    import numpy as np
    import faiss
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
    logger.info("✓ FAISS and sentence-transformers loaded")
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("FAISS or sentence-transformers not available. RAG will be disabled.")

# Language detection
try:
    from langdetect import detect
    LANGDETECT_AVAILABLE = True
    logger.info("✓ langdetect loaded")
except ImportError:
    LANGDETECT_AVAILABLE = False
    logger.warning("langdetect not available. Language detection will be basic.")


# ==============================
# DATA CLASSES
# ==============================

@dataclass
class CitizenInput:
    """Input from citizen report"""
    text: Optional[str] = None
    voice_path: Optional[str] = None
    image_path: Optional[str] = None
    gps_coordinates: Optional[str] = None  # Format: "lat,lon"
    area: Optional[str] = None


@dataclass
class AnalysisOutput:
    """Final output from AI agent pipeline"""
    issue_type: str
    priority: str
    status: str
    reference_case: Optional[str]
    department: str
    sla: str
    eta: str
    location_insight: str
    confidence_score: float = 0.0


# ==============================
# AGENT 1: INPUT PROCESSING
# ==============================

class InputProcessingAgent:
    """
    Handles Voice → Text and Translation
    Uses Whisper for speech-to-text and MarianMT for translation
    """
    
    def __init__(self):
        self.whisper_model = None
        self.translator_model = None
        self.translator_tokenizer = None
        
        # Load Whisper model (lazy loading)
        if WHISPER_AVAILABLE:
            try:
                model_size = os.getenv("WHISPER_MODEL", "base")
                logger.info(f"Loading Whisper model: {model_size}")
                self.whisper_model = whisper.load_model(model_size)
                logger.info("✓ Whisper model loaded")
            except Exception as e:
                logger.error(f"Failed to load Whisper: {e}")
        
        # Load translation model (lazy loading)
        if TRANSFORMERS_AVAILABLE:
            try:
                model_name = "Helsinki-NLP/opus-mt-mul-en"
                logger.info(f"Loading translation model: {model_name}")
                self.translator_tokenizer = MarianTokenizer.from_pretrained(model_name)
                self.translator_model = MarianMTModel.from_pretrained(model_name)
                logger.info("✓ Translation model loaded")
            except Exception as e:
                logger.error(f"Failed to load translation model: {e}")
    
    def speech_to_text(self, voice_path: str) -> str:
        """
        Transcribe audio using Whisper
        """
        if not self.whisper_model:
            logger.warning("Whisper not available. Returning placeholder.")
            return "[Audio transcription unavailable]"
        
        try:
            logger.info(f"Transcribing audio: {voice_path}")
            result = self.whisper_model.transcribe(voice_path)
            text = result["text"].strip()
            logger.info(f"Transcription: '{text[:50]}...'")
            return text
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return "[Audio transcription failed]"
    
    def translate_to_english(self, text: str) -> str:
        """
        Translate Tamil/Hindi/other languages to English using MarianMT
        """
        if not text or not self.translator_model:
            return text
        
        try:
            # Detect language
            if LANGDETECT_AVAILABLE:
                try:
                    lang = detect(text)
                    if lang == 'en':
                        return text  # Already English
                except:
                    pass
            
            # Translate
            inputs = self.translator_tokenizer(text, return_tensors="pt", padding=True)
            outputs = self.translator_model.generate(**inputs)
            translated = self.translator_tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            logger.info(f"Translation: '{text[:30]}...' → '{translated[:30]}...'")
            return translated
            
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text  # Return original if translation fails
    
    def process(self, citizen_input: CitizenInput) -> str:
        """Process voice or text input"""
        if citizen_input.voice_path:
            text = self.speech_to_text(citizen_input.voice_path)
        else:
            text = citizen_input.text or ""
        
        return self.translate_to_english(text)


# ==============================
# AGENT 2: FEATURE EXTRACTION
# ==============================

class FeatureExtractionAgent:
    """
    Extracts features from text, images, and GPS
    Uses Tesseract for OCR, spaCy for NLP, and Haversine for GPS
    """
    
    def __init__(self):
        self.nlp = nlp_engine
        self.locations_db = IMPORTANT_LOCATIONS
    
    def extract_entities(self, text: str) -> Optional[str]:
        """Extract location entities using spaCy"""
        if not self.nlp:
            return None
        
        try:
            doc = self.nlp(text)
            locations = [ent.text for ent in doc.ents if ent.label_ in ["GPE", "LOC", "FAC"]]
            return locations[0] if locations else None
        except Exception as e:
            logger.error(f"Entity extraction error: {e}")
            return None
    
    def extract_image_text(self, image_path: str) -> str:
        """Extract text from image using Tesseract OCR"""
        if not TESSERACT_AVAILABLE:
            return ""
        
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            logger.info(f"OCR extracted: '{text[:50]}...'")
            return text.strip()
        except Exception as e:
            logger.error(f"OCR error: {e}")
            return ""
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate Haversine distance in kilometers"""
        R = 6371  # Earth radius in km
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    
    def detect_location_type_from_gps(self, gps_coordinates: str) -> tuple[str, Optional[str]]:
        """
        Detect if GPS is near any important location
        Returns: (location_type, place_name)
        """
        if not gps_coordinates:
            return "Residential", None
        
        try:
            coords = gps_coordinates.replace(" ", "").split(',')
            lat, lon = float(coords[0]), float(coords[1])
        except Exception as e:
            logger.error(f"GPS parsing error: {e}")
            return "Residential", None
        
        # Check proximity to important locations
        for category, places in self.locations_db.items():
            for place in places:
                dist = self.calculate_distance(lat, lon, place["lat"], place["lon"])
                if dist <= place["radius"]:
                    logger.info(f"GPS near {place['name']} ({dist:.2f}km)")
                    return place["type"], place["name"]
        
        return "Residential", None
    
    def detect_urgency_keywords(self, text: str) -> bool:
        """Detect urgency keywords in text"""
        keywords = ["emergency", "danger", "fire", "accident", "urgent", "blocked", "stuck", "critical"]
        return any(k in text.lower() for k in keywords)


# ==============================
# AGENT 3: ISSUE REASONING
# ==============================

class IssueReasoningAgent:
    """
    Classifies issue type and priority
    Uses zero-shot classification or keyword-based fallback
    """
    
    def __init__(self):
        self.classifier = None
        
        # Try to load zero-shot classifier
        if TRANSFORMERS_AVAILABLE:
            try:
                logger.info("Loading zero-shot classifier...")
                self.classifier = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli"
                )
                logger.info("✓ Classifier loaded")
            except Exception as e:
                logger.error(f"Failed to load classifier: {e}")
    
    def analyze(self, text: str) -> Dict[str, str]:
        """Classify issue type and priority"""
        
        # Try ML-based classification first
        if self.classifier:
            try:
                return self._analyze_with_ml(text)
            except Exception as e:
                logger.warning(f"ML classification failed: {e}. Using fallback.")
        
        # Fallback to keyword-based
        return self._analyze_with_keywords(text)
    
    def _analyze_with_ml(self, text: str) -> Dict[str, str]:
        """ML-based classification using zero-shot learning"""
        categories = [
            "Pothole", "Garbage", "Broken Garbage Bin", "Street Light",
            "Public Toilet", "Mosquito Menace", "Water Stagnation",
            "Storm Water Drain", "Stray Dogs", "Fallen Tree", "Other"
        ]
        
        result = self.classifier(text, categories)
        issue_type = result["labels"][0]
        confidence = result["scores"][0]
        
        # Determine priority based on keywords
        priority = self._determine_priority(text)
        
        logger.info(f"ML Classification: {issue_type} (confidence: {confidence:.2f})")
        return {"Issue_Type": issue_type, "Priority": priority}
    
    def _analyze_with_keywords(self, text: str) -> Dict[str, str]:
        """Keyword-based classification fallback"""
        text_lower = text.lower()
        
        keywords = {
            "Pothole": ["pothole", "pit", "hole", "crater", "road damage"],
            "Garbage": ["garbage", "waste", "trash", "litter", "dump"],
            "Street Light": ["street light", "lamp", "lighting", "bulb"],
            "Water Stagnation": ["water", "stagnation", "standing water", "puddle"],
            "Storm Water Drain": ["drain", "drainage", "sewer", "blocked"],
            "Stray Dogs": ["dog", "stray", "animal"],
            "Fallen Tree": ["tree", "fallen", "branch"],
        }
        
        scores = {}
        for category, words in keywords.items():
            score = sum(1 for word in words if word in text_lower)
            scores[category] = score
        
        issue_type = max(scores, key=scores.get) if max(scores.values()) > 0 else "Other"
        priority = self._determine_priority(text)
        
        logger.info(f"Keyword Classification: {issue_type}")
        return {"Issue_Type": issue_type, "Priority": priority}
    
    def _determine_priority(self, text: str) -> str:
        """Determine priority based on keywords"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ["emergency", "danger", "critical", "urgent"]):
            return "Critical"
        elif any(word in text_lower for word in ["large", "major", "serious", "bad"]):
            return "High"
        elif any(word in text_lower for word in ["small", "minor", "little"]):
            return "Low"
        else:
            return "Medium"


# ==============================
# AGENT 4: PRIORITY BOOSTER
# ==============================

class SmartPriorityBooster:
    """
    Boosts priority based on location type and urgency
    Rule-based system, no ML needed
    """
    
    def boost_priority(self, base_priority: str, location_type: str, urgency_found: bool) -> tuple[str, str]:
        """
        Boost priority based on context
        Returns: (final_priority, reasoning)
        """
        priority_levels = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        current_level = priority_levels.get(base_priority.title(), 2)
        
        reasons = []
        
        # Boost for location type
        if location_type == "Hospital":
            current_level = 4  # Force Critical
            reasons.append("Near Hospital")
        elif location_type == "School":
            current_level = min(current_level + 2, 4)
            reasons.append("Near School")
        elif location_type == "College":
            current_level = min(current_level + 1, 4)
            reasons.append("Near College")
        elif location_type == "Transport Hub":
            current_level = min(current_level + 1, 4)
            reasons.append("Near Transport Hub")
        elif location_type == "Market":
            current_level = min(current_level + 1, 4)
            reasons.append("Near Market")
        
        # Boost for urgency
        if urgency_found:
            current_level = 4
            reasons.append("Emergency Keywords Detected")
        
        # Convert back to priority string
        level_to_priority = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}
        final_priority = level_to_priority.get(current_level, "Medium")
        
        reason_str = ", ".join(reasons) if reasons else "Standard Assessment"
        logger.info(f"Priority: {base_priority} → {final_priority} ({reason_str})")
        
        return final_priority, reason_str


# ==============================
# AGENT 5: KNOWLEDGE BASE (RAG)
# ==============================

class VectorKnowledgeBase:
    """
    FAISS-based vector search for similar cases
    """
    
    def __init__(self):
        self.model = None
        self.index = None
        self.documents: List[str] = []
        self.ticket_ids: List[str] = []
        
        if FAISS_AVAILABLE:
            try:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("✓ Knowledge base initialized")
            except Exception as e:
                logger.error(f"Failed to initialize knowledge base: {e}")
    
    def add_documents(self, docs: List[str]):
        """Add documents to the knowledge base"""
        if not self.model or not FAISS_AVAILABLE:
            return
        
        try:
            embeddings = self.model.encode(docs)
            dimension = embeddings.shape[1]
            
            if self.index is None:
                self.index = faiss.IndexFlatL2(dimension)
            
            self.index.add(np.array(embeddings))
            self.documents.extend(docs)
            
            # Generate ticket IDs
            import uuid
            self.ticket_ids.extend([f"Ticket_{uuid.uuid4().hex[:6]}" for _ in docs])
            
            logger.info(f"Added {len(docs)} documents to knowledge base")
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
    
    def search(self, query: str, k: int = 1) -> Optional[str]:
        """Search for similar cases"""
        if self.index is None or not self.model:
            return None
        
        try:
            query_vector = self.model.encode([query])
            distances, indices = self.index.search(np.array(query_vector), k)
            
            if len(indices[0]) > 0:
                similar_case = self.ticket_ids[indices[0][0]]
                logger.info(f"Found similar case: {similar_case}")
                return similar_case
            
            return None
        except Exception as e:
            logger.error(f"Search error: {e}")
            return None


# ==============================
# AGENT 6: POLICY VALIDATION
# ==============================

class PolicyValidationAgent:
    """Validates issues against policy rules"""
    
    ALLOWED_ISSUES = [
        "Pothole", "Garbage", "Broken Garbage Bin", "Street Light",
        "Public Toilet", "Mosquito Menace", "Water Stagnation",
        "Storm Water Drain", "Stray Dogs", "Fallen Tree", "Other"
    ]
    
    def validate(self, issue_type: str) -> str:
        """Validate issue type"""
        if any(allowed.lower() in issue_type.lower() for allowed in self.ALLOWED_ISSUES):
            return "Validated"
        return "Needs_Review"


# ==============================
# AGENT 7: ROUTING
# ==============================

class RoutingAgent:
    """Routes issues to appropriate departments with SLA"""
    
    DEPARTMENT_MAP = {
        "Garbage": "Solid Waste Management Dept",
        "Broken Garbage Bin": "Solid Waste Management Dept",
        "Pothole": "Bridges & Roads Dept",
        "Street Light": "Electrical Dept",
        "Public Toilet": "Sanitation & Health Dept",
        "Mosquito Menace": "Health Dept (Vector Control)",
        "Water Stagnation": "Storm Water Drain Dept",
        "Storm Water Drain": "Storm Water Drain Dept",
        "Stray Dogs": "Veterinary Public Health Dept",
        "Fallen Tree": "Parks and Gardens Dept",
        "Other": "General Administration"
    }
    
    def route(self, issue_type: str, priority: str, area: Optional[str]) -> Dict[str, str]:
        """Route to department with SLA"""
        
        # Find department
        dept = "General Administration"
        for key, value in self.DEPARTMENT_MAP.items():
            if key.lower() in issue_type.lower():
                dept = value
                break
        
        if area:
            dept = f"{dept} ({area} Zone)"
        
        # Determine SLA and ETA based on priority
        if priority == "Critical":
            eta = "4 Hours"
            sla = "Immediate Action"
        elif priority == "High":
            eta = "24 Hours"
            sla = "High Priority"
        elif priority == "Medium":
            eta = "48 Hours"
            sla = "Standard"
        else:
            eta = "72 Hours"
            sla = "Low Priority"
        
        return {"Department": dept, "SLA": sla, "ETA": eta}
