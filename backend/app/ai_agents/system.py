"""
Main AI Agent System
Coordinates all agents and provides the primary interface
"""

import logging
from typing import Optional
from .agents import (
    InputProcessingAgent,
    FeatureExtractionAgent,
    IssueReasoningAgent,
    SmartPriorityBooster,
    VectorKnowledgeBase,
    PolicyValidationAgent,
    RoutingAgent,
    CitizenInput,
    AnalysisOutput
)
from .workflow import CivicWorkflowOrchestrator

logger = logging.getLogger(__name__)


class CivicAIAgentSystem:
    """
    Main AI Agent System
    Coordinates all 7 agents through the LangGraph workflow
    """
    
    def __init__(self):
        """Initialize all agents"""
        logger.info("Initializing Civic AI Agent System...")
        
        # Initialize individual agents
        self.input_agent = InputProcessingAgent()
        self.feature_agent = FeatureExtractionAgent()
        self.reasoning_agent = IssueReasoningAgent()
        self.priority_booster = SmartPriorityBooster()
        self.policy_agent = PolicyValidationAgent()
        self.routing_agent = RoutingAgent()
        self.kb = VectorKnowledgeBase()
        
        # Seed knowledge base with sample data
        self._seed_knowledge_base()
        
        # Initialize workflow orchestrator
        self.orchestrator = CivicWorkflowOrchestrator(self)
        
        logger.info("✓ Civic AI Agent System initialized successfully")
    
    def _seed_knowledge_base(self):
        """Seed the knowledge base with sample resolved cases"""
        sample_cases = [
            "Garbage overflow near public park resolved in 2 days",
            "Water leakage near main road fixed by municipal team",
            "Pothole on Main Street repaired within 24 hours",
            "Street light not working replaced by electrical department",
            "Stray dogs issue addressed by animal control",
            "Fallen tree removed from residential area",
            "Drainage blockage cleared in commercial zone"
        ]
        
        self.kb.add_documents(sample_cases)
        logger.info(f"Knowledge base seeded with {len(sample_cases)} cases")
    
    def process_issue(
        self,
        text: Optional[str] = None,
        voice_path: Optional[str] = None,
        image_path: Optional[str] = None,
        gps_coordinates: Optional[str] = None,
        area: Optional[str] = None
    ) -> AnalysisOutput:
        """
        Process a civic issue through the AI pipeline
        
        Args:
            text: Text description of the issue
            voice_path: Path to voice recording file
            image_path: Path to image file
            gps_coordinates: GPS coordinates as "latitude,longitude"
            area: Area/zone name
        
        Returns:
            AnalysisOutput with classification, priority, routing, etc.
        """
        
        # Create citizen input
        citizen_input = {
            "text": text,
            "voice_path": voice_path,
            "image_path": image_path,
            "gps_coordinates": gps_coordinates,
            "area": area
        }
        
        # Run through workflow
        final_state = self.orchestrator.run(citizen_input)
        
        # Extract results
        return AnalysisOutput(
            issue_type=final_state["category"],
            priority=final_state["final_priority"],
            status=final_state["status"],
            reference_case=final_state["ref_case"],
            department=final_state["dispatch"]["Department"],
            sla=final_state["dispatch"]["SLA"],
            eta=final_state["dispatch"]["ETA"],
            location_insight=final_state["insight"],
            confidence_score=0.85  # Placeholder, can be calculated from classifier
        )
    
    def get_system_status(self) -> dict:
        """Get status of all AI components"""
        from .agents import (
            WHISPER_AVAILABLE,
            TRANSFORMERS_AVAILABLE,
            TESSERACT_AVAILABLE,
            SPACY_AVAILABLE,
            FAISS_AVAILABLE,
            LANGDETECT_AVAILABLE
        )
        
        return {
            "whisper": WHISPER_AVAILABLE,
            "transformers": TRANSFORMERS_AVAILABLE,
            "tesseract": TESSERACT_AVAILABLE,
            "spacy": SPACY_AVAILABLE,
            "faiss": FAISS_AVAILABLE,
            "langdetect": LANGDETECT_AVAILABLE,
            "knowledge_base_size": len(self.kb.documents) if self.kb.documents else 0
        }


# Singleton instance
_agent_system = None


def get_agent_system() -> CivicAIAgentSystem:
    """Get or create the singleton agent system instance"""
    global _agent_system
    if _agent_system is None:
        _agent_system = CivicAIAgentSystem()
    return _agent_system
