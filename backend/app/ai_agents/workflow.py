"""
LangGraph Workflow Orchestration for Civic AI Agents
Coordinates the 7-agent pipeline in a sequential flow
"""

import logging
from typing import Dict, Optional, TypedDict
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


# ==============================
# STATE DEFINITION
# ==============================

class AgentState(TypedDict):
    """The state shared between all agents in the graph"""
    citizen_input: Dict  # CitizenInput as dict
    raw_text: str
    english_text: str
    ocr_context: str
    final_text: str
    location_type: str
    place_name: Optional[str]
    urgency_found: bool
    ref_case: Optional[str]
    category: str
    base_priority: str
    final_priority: str
    insight: str
    status: str
    dispatch: Dict[str, str]


# ==============================
# WORKFLOW ORCHESTRATOR
# ==============================

class CivicWorkflowOrchestrator:
    """
    Orchestrates the 7-agent pipeline using LangGraph
    """
    
    def __init__(self, system_agents):
        """
        Initialize with agent instances
        
        Args:
            system_agents: CivicAIAgentSystem instance with all agents
        """
        self.input_agent = system_agents.input_agent
        self.feature_agent = system_agents.feature_agent
        self.reasoning_agent = system_agents.reasoning_agent
        self.priority_booster = system_agents.priority_booster
        self.policy_agent = system_agents.policy_agent
        self.routing_agent = system_agents.routing_agent
        self.kb = system_agents.kb
        
        # Build the workflow graph
        self.graph = self._build_graph()
    
    def _build_graph(self):
        """Build the LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # ==============================
        # NODE 1: TRANSCRIPTION
        # ==============================
        def transcription_node(state: AgentState):
            logger.info("--- AGENT 1: TRANSCRIPTION ---")
            inp = state["citizen_input"]
            
            # Extract voice path if present
            voice_path = inp.get("voice_path")
            text = inp.get("text", "")
            
            if voice_path:
                text = self.input_agent.speech_to_text(voice_path)
            
            return {"raw_text": text}
        
        # ==============================
        # NODE 2: TRANSLATION
        # ==============================
        def translation_node(state: AgentState):
            logger.info("--- AGENT 2: TRANSLATION ---")
            text = self.input_agent.translate_to_english(state["raw_text"])
            return {"english_text": text}
        
        # ==============================
        # NODE 3: VISION OCR
        # ==============================
        def vision_node(state: AgentState):
            logger.info("--- AGENT 3: VISION OCR ---")
            inp = state["citizen_input"]
            image_path = inp.get("image_path")
            
            ocr = ""
            if image_path:
                ocr = self.feature_agent.extract_image_text(image_path)
            
            final_text = state['english_text']
            if ocr:
                final_text = f"{final_text} [Image Context: {ocr}]"
            
            return {"ocr_context": ocr, "final_text": final_text}
        
        # ==============================
        # NODE 4: PROXIMITY DETECTION
        # ==============================
        def proximity_node(state: AgentState):
            logger.info("--- AGENT 4: PROXIMITY ---")
            inp = state["citizen_input"]
            gps = inp.get("gps_coordinates")
            
            loc_type, place = self.feature_agent.detect_location_type_from_gps(gps)
            urgency = self.feature_agent.detect_urgency_keywords(state["final_text"])
            
            return {
                "location_type": loc_type,
                "place_name": place,
                "urgency_found": urgency
            }
        
        # ==============================
        # NODE 5: RAG RETRIEVAL
        # ==============================
        def rag_node(state: AgentState):
            logger.info("--- AGENT 5: RAG RETRIEVAL ---")
            ref = self.kb.search(state["final_text"])
            return {"ref_case": ref}
        
        # ==============================
        # NODE 6: REASONING
        # ==============================
        def reasoning_node(state: AgentState):
            logger.info("--- AGENT 6: REASONING ---")
            text = state["final_text"]
            
            if state["ref_case"]:
                text += f" [Similar Case: {state['ref_case']}]"
            
            res = self.reasoning_agent.analyze(text)
            
            return {
                "category": res.get("Issue_Type", "Other"),
                "base_priority": res.get("Priority", "Medium")
            }
        
        # ==============================
        # NODE 7: BOOSTER & ROUTING
        # ==============================
        def routing_node(state: AgentState):
            logger.info("--- AGENT 7: BOOSTER & ROUTING ---")
            
            # Boost priority
            prio, reason = self.priority_booster.boost_priority(
                state["base_priority"],
                state["location_type"],
                state["urgency_found"]
            )
            
            # Add place name to insight
            insight = reason
            if state["place_name"]:
                insight = f"{reason} ({state['place_name']})"
            
            # Validate
            status = self.policy_agent.validate(state["category"])
            
            # Route to department
            inp = state["citizen_input"]
            area = inp.get("area")
            dispatch = self.routing_agent.route(state["category"], prio, area)
            
            return {
                "final_priority": prio,
                "insight": insight,
                "status": status,
                "dispatch": dispatch
            }
        
        # ==============================
        # BUILD GRAPH
        # ==============================
        
        # Add nodes
        workflow.add_node("transcription", transcription_node)
        workflow.add_node("translation", translation_node)
        workflow.add_node("vision", vision_node)
        workflow.add_node("proximity", proximity_node)
        workflow.add_node("rag", rag_node)
        workflow.add_node("reasoning", reasoning_node)
        workflow.add_node("routing", routing_node)
        
        # Set entry point
        workflow.set_entry_point("transcription")
        
        # Define edges (sequential flow)
        workflow.add_edge("transcription", "translation")
        workflow.add_edge("translation", "vision")
        workflow.add_edge("vision", "proximity")
        workflow.add_edge("proximity", "rag")
        workflow.add_edge("rag", "reasoning")
        workflow.add_edge("reasoning", "routing")
        workflow.add_edge("routing", END)
        
        return workflow.compile()
    
    def run(self, citizen_input: Dict) -> Dict:
        """
        Execute the workflow
        
        Args:
            citizen_input: Dictionary with keys: text, voice_path, image_path, gps_coordinates, area
        
        Returns:
            Final state dictionary with all analysis results
        """
        initial_state = {
            "citizen_input": citizen_input,
            "raw_text": "",
            "english_text": "",
            "ocr_context": "",
            "final_text": "",
            "location_type": "Residential",
            "place_name": None,
            "urgency_found": False,
            "ref_case": None,
            "category": "Other",
            "base_priority": "Medium",
            "final_priority": "Medium",
            "insight": "",
            "status": "Validated",
            "dispatch": {}
        }
        
        logger.info("Starting AI agent workflow...")
        final_state = self.graph.invoke(initial_state)
        logger.info("Workflow completed successfully")
        
        return final_state
