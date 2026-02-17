"""
Duplicate Intelligence Engine
Hybrid detection using geo-proximity, time window, and text similarity
"""
import os
import numpy as np
import logging
from typing import List, Dict, Any
from math import radians, cos, sin, asin, sqrt
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """Hybrid duplicate detection using geo + time + text similarity"""
    
    def __init__(self):
        """Initialize duplicate detector"""
        self.tfidf_vectorizer = None
        self._initialize_tfidf()
    
    def _initialize_tfidf(self):
        """Initialize TF-IDF vectorizer for text similarity"""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            logger.info("✓ TF-IDF vectorizer initialized")
        except ImportError:
            logger.warning("scikit-learn not available, text similarity disabled")
            self.tfidf_vectorizer = None
    
    async def find_duplicates(
        self,
        text: str,
        longitude: float,
        latitude: float,
        category: str,
        created_at: datetime = None,
        geo_radius_meters: float = 100,
        time_window_hours: int = 48,
        similarity_threshold: float = 0.85
    ) -> List[Dict[str, Any]]:
        """
        Find potential duplicate issues using hybrid approach
        
        Args:
            text: Issue text (title + description)
            longitude: Issue longitude
            latitude: Issue latitude
            category: Issue category
            created_at: Issue creation time (defaults to now)
            geo_radius_meters: Geospatial radius in meters
            time_window_hours: Time window in hours
            similarity_threshold: Text similarity threshold (0-1)
        
        Returns:
            List of potential duplicates with similarity scores
        """
        if created_at is None:
            created_at = datetime.utcnow()
        
        duplicates = []
        
        try:
            # Import Issue model
            from app.models.issue import Issue
            
            # Step 1: Geo-proximity filter
            # Find issues within geo radius and time window
            time_cutoff = created_at - timedelta(hours=time_window_hours)
            
            # Query MongoDB for nearby issues in same category
            # Using geospatial query with $geoWithin
            nearby_issues = await Issue.find(
                {
                    "category": category,
                    "created_at": {"$gte": time_cutoff},
                    "location": {
                        "$geoWithin": {
                            "$centerSphere": [
                                [longitude, latitude],
                                geo_radius_meters / 6371000  # Convert meters to radians
                            ]
                        }
                    }
                }
            ).to_list()
            
            if not nearby_issues:
                return []
            
            logger.info(f"Found {len(nearby_issues)} nearby issues in time window")
            
            # Step 2: Calculate precise distance and time difference
            candidates = []
            for issue in nearby_issues:
                # Calculate Haversine distance
                issue_coords = issue.location['coordinates']
                distance = self._haversine_distance(
                    longitude, latitude,
                    issue_coords[0], issue_coords[1]
                )
                
                # Calculate time difference in hours
                time_diff = (created_at - issue.created_at).total_seconds() / 3600
                
                # Check geo and time criteria
                if distance <= geo_radius_meters and time_diff <= time_window_hours:
                    candidates.append({
                        'issue': issue,
                        'distance': distance,
                        'time_diff': time_diff
                    })
            
            if not candidates:
                return []
            
            logger.info(f"{len(candidates)} candidates passed geo+time filter")
            
            # Step 3: Text similarity check
            if self.tfidf_vectorizer is not None:
                # Prepare texts
                texts = [text] + [f"{c['issue'].title} {c['issue'].description}" for c in candidates]
                
                # Calculate TF-IDF vectors
                tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)
                
                # Calculate cosine similarity
                from sklearn.metrics.pairwise import cosine_similarity
                similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
                
                # Filter by similarity threshold
                for idx, candidate in enumerate(candidates):
                    similarity = similarities[idx]
                    
                    if similarity >= similarity_threshold:
                        duplicates.append({
                            'issue_id': str(candidate['issue'].id),
                            'complaint_id': getattr(candidate['issue'], 'complaint_id', None),
                            'distance_meters': round(candidate['distance'], 2),
                            'time_diff_hours': round(candidate['time_diff'], 2),
                            'text_similarity': round(float(similarity), 3),
                            'is_duplicate': True
                        })
                
                logger.info(f"Found {len(duplicates)} duplicates with similarity >= {similarity_threshold}")
            else:
                # Fallback: use simple keyword matching
                logger.warning("Using fallback keyword matching for text similarity")
                for candidate in candidates:
                    # Simple keyword overlap
                    text_lower = text.lower()
                    candidate_text = f"{candidate['issue'].title} {candidate['issue'].description}".lower()
                    
                    # Count common words
                    words1 = set(text_lower.split())
                    words2 = set(candidate_text.split())
                    common = len(words1 & words2)
                    total = len(words1 | words2)
                    
                    if total > 0:
                        similarity = common / total
                        if similarity >= similarity_threshold:
                            duplicates.append({
                                'issue_id': str(candidate['issue'].id),
                                'complaint_id': getattr(candidate['issue'], 'complaint_id', None),
                                'distance_meters': round(candidate['distance'], 2),
                                'time_diff_hours': round(candidate['time_diff'], 2),
                                'text_similarity': round(similarity, 3),
                                'is_duplicate': True
                            })
            
            # Sort by similarity score (descending)
            duplicates.sort(key=lambda x: x['text_similarity'], reverse=True)
            
            return duplicates[:5]  # Return top 5 duplicates
            
        except Exception as e:
            logger.error(f"Duplicate detection error: {e}")
            return []
    
    def _haversine_distance(
        self,
        lon1: float,
        lat1: float,
        lon2: float,
        lat2: float
    ) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        
        Args:
            lon1, lat1: First coordinate
            lon2, lat2: Second coordinate
        
        Returns:
            Distance in meters
        """
        # Convert to radians
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        
        # Earth radius in meters
        r = 6371000
        
        return c * r


# Global instance
_duplicate_detector = None


def get_duplicate_detector() -> DuplicateDetector:
    """Get global duplicate detector instance"""
    global _duplicate_detector
    if _duplicate_detector is None:
        _duplicate_detector = DuplicateDetector()
    return _duplicate_detector
