"""
MongoDB database connection and configuration using Motor (async driver)
"""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from typing import Optional
import logging

from app.config import settings
from app.models.user import User
from app.models.issue import Issue
from app.models.department import Department
from app.models.status_log import StatusLog

logger = logging.getLogger(__name__)

# Global database client
db_client: Optional[AsyncIOMotorClient] = None


async def connect_to_mongo():
    """Initialize MongoDB connection"""
    global db_client
    
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
        db_client = AsyncIOMotorClient(settings.MONGODB_URL)
        
        # Initialize Beanie with document models
        await init_beanie(
            database=db_client[settings.MONGODB_DB_NAME],
            document_models=[
                User,
                Issue,
                Department,
                StatusLog
            ]
        )
        
        logger.info("Successfully connected to MongoDB")
        
        # Create indexes for better performance
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    global db_client
    
    if db_client:
        db_client.close()
        logger.info("Closed MongoDB connection")


async def create_indexes():
    """Create database indexes for optimized queries"""
    try:
        # Issue indexes
        await Issue.find().create_index([("location", "2dsphere")])  # Geospatial index
        await Issue.find().create_index("status")
        await Issue.find().create_index("category")
        await Issue.find().create_index("ward_number")
        await Issue.find().create_index("created_at")
        await Issue.find().create_index("reporter")
        await Issue.find().create_index("assigned_to")
        
        # User indexes
        await User.find().create_index("email", unique=True)
        await User.find().create_index("role")
        
        # Department indexes
        await Department.find().create_index("name", unique=True)
        
        # Status log indexes
        await StatusLog.find().create_index("issue_id")
        await StatusLog.find().create_index("timestamp")
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.warning(f"Failed to create indexes: {e}")


async def get_database():
    """Get database instance (dependency injection)"""
    return db_client[settings.MONGODB_DB_NAME]
