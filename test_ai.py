"""
Quick test script to verify AI backend functionality
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

async def test_ai_services():
    """Test all AI services"""
    print("=== Testing CiviSense AI Services ===\n")
    
    # Test 1: Text Classification
    print("1. Testing Text Classification...")
    try:
        from ai_service.nlp_service import get_nlp_classifier
        
        classifier = get_nlp_classifier()
        result = classifier.classify(
            title="Large pothole",
            description="Dangerous pothole on Main Street causing traffic issues"
        )
        
        print(f"   ✓ Category: {result['category']}")
        print(f"   ✓ Confidence: {result['confidence']:.2%}")
        print(f"   ✓ Model: {result.get('model_version', 'N/A')}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    # Test 2: Priority Scoring
    print("2. Testing Priority Scoring...")
    try:
        from ai_service.priority_scorer import get_priority_scorer
        
        scorer = get_priority_scorer()
        result = await scorer.score(
            category="pothole",
            ward_number=42,
            description="Urgent: dangerous pothole",
            image_count=1
        )
        
        print(f"   ✓ Priority: {result['priority']}")
        print(f"   ✓ Score: {result['score']:.3f}")
        print(f"   ✓ Components: {result.get('components', {})}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    # Test 3: Department Routing
    print("3. Testing Department Routing...")
    try:
        from ai_service.department_router import get_department_router
        
        router = get_department_router()
        result = router.route("pothole")
        
        print(f"   ✓ Department: {result['department']}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    # Test 4: Model Status
    print("4. Checking Model Status...")
    try:
        from backend.app.services.model_loader import get_model_loader
        
        loader = get_model_loader()
        status = loader.get_model_status()
        
        print(f"   Image Model: {'✓ Available' if status['image_model']['exists'] else '❌ Missing'}")
        print(f"   Text Model: {'✓ Available' if status['text_model']['exists'] else '❌ Missing'}")
        print(f"   Models Directory: {status['models_directory']}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    print("=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(test_ai_services())
