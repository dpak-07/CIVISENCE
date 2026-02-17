"""
Seed data script - populates database with demo data
Run: python -m app.scripts.seed_data
"""
import asyncio
from datetime import datetime, timedelta
import random
from app.database import connect_to_mongo
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.issue import Issue, IssueCategory, IssueStatus, IssuePriority
from app.utils.security import hash_password

# Sample coordinates for Bangalore
BANGALORE_COORDS = [
    [77.5946, 12.9716],  # City center
    [77.6408, 12.9698],  # Whitefield
    [77.5385, 13.0189],  # Yelahanka
    [77.6033, 12.9141],  # Koramangala
    [77.5773, 12.9082],  # Jayanagar
]


async def seed_departments():
    """Create departments"""
    departments = [
        {
            "name": "Road Maintenance Department",
            "description": "Handles road repairs, pothole fixing, and street maintenance",
            "category_assignments": ["pothole", "road_damage"],
            "head_name": "Mr. Kumar",
            "contact_email": "roads@bangalore.gov.in",
            "contact_phone": "+919876543210",
            "sla_hours": 48
        },
        {
            "name": "Waste Management Department",
            "description": "Manages garbage collection and waste disposal",
            "category_assignments": ["garbage"],
            "head_name": "Ms. Sharma",
            "contact_email": "waste@bangalore.gov.in",
            "contact_phone": "+919876543211",
            "sla_hours": 24
        },
        {
            "name": "Street Lighting Department",
            "description": "Maintains street lights and public lighting",
            "category_assignments": ["streetlight"],
            "head_name": "Mr. Patil",
            "contact_email": "lighting@bangalore.gov.in",
            "contact_phone": "+919876543212",
            "sla_hours": 36
        },
        {
            "name": "Water Supply Department",
            "description": "Manages water supply and fixes leakages",
            "category_assignments": ["water_leakage"],
            "head_name": "Dr. Reddy",
            "contact_email": "water@bangalore.gov.in",
            "contact_phone": "+919876543213",
            "sla_hours": 12
        },
        {
            "name": "Drainage Department",
            "description": "Maintains drainage systems and sewers",
            "category_assignments": ["drainage"],
            "head_name": "Mr. Singh",
            "contact_email": "drainage@bangalore.gov.in",
            "contact_phone": "+919876543214",
            "sla_hours": 24
        }
    ]
    
    created_depts = []
    for dept_data in departments:
        dept = Department(**dept_data)
        await dept.insert()
        created_depts.append(dept)
        print(f"Created department: {dept.name}")
    
    return created_depts


async def seed_users(departments):
    """Create demo users"""
    users = []
    
    # Create admin
    admin = User(
        email="admin@civisense.gov.in",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        full_name="Admin User",
        phone="+919876543200"
    )
    await admin.insert()
    users.append(admin)
    print(f"Created admin: {admin.email}")
    
    # Create municipal staff for each department
    for dept in departments:
        staff = User(
            email=f"staff.{dept.name.split()[0].lower()}@civisense.gov.in",
            password_hash=hash_password("staff123"),
            role=UserRole.MUNICIPAL_STAFF,
            full_name=f"{dept.name} Staff",
            phone=f"+91987654{random.randint(3300, 3399)}",
            department_id=str(dept.id),
            ward_number=random.randint(1, 100)
        )
        await staff.insert()
        users.append(staff)
        print(f"Created staff: {staff.email}")
    
    # Create citizens
    citizen_names = ["John Doe", "Jane Smith", "Raj Kumar", "Priya Sharma", "Alex Johnson"]
    for i, name in enumerate(citizen_names):
        citizen = User(
            email=f"citizen{i+1}@example.com",
            password_hash=hash_password("citizen123"),
            role=UserRole.CITIZEN,
            full_name=name,
            phone=f"+91987654{random.randint(3200, 3299)}"
        )
        await citizen.insert()
        users.append(citizen)
        print(f"Created citizen: {citizen.email}")
    
    return users


async def seed_issues(users, departments):
    """Create demo issues"""
    categories = list(IssueCategory)
    statuses = [IssueStatus.REPORTED, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED]
    priorities = list(IssuePriority)
    
    issue_templates = [
        {"title": "Large pothole on Main Street", "desc": "Deep pothole causing traffic issues", "cat": IssueCategory.POTHOLE},
        {"title": "Overflowing garbage bin", "desc": "Garbage bin overflowing for 3 days", "cat": IssueCategory.GARBAGE},
        {"title": "Street light not working", "desc": "Street light has been off for a week", "cat": IssueCategory.STREETLIGHT},
        {"title": "Water pipe burst", "desc": "Water leaking from underground pipe", "cat": IssueCategory.WATER_LEAKAGE},
        {"title": "Damaged road surface", "desc": "Road cracked and uneven", "cat": IssueCategory.ROAD_DAMAGE},
        {"title": "Blocked drainage", "desc": "Drain clogged causing flooding", "cat": IssueCategory.DRAINAGE},
    ]
    
    citizens = [u for u in users if u.role == UserRole.CITIZEN]
    
    for i in range(30):  # Create 30 demo issues
        template = random.choice(issue_templates)
        coords = random.choice(BANGALORE_COORDS)
        
        # Find department for this category
        dept = next((d for d in departments if template["cat"] in d.category_assignments), None)
        
        # Random dates
        days_ago = random.randint(0, 30)
        created_at = datetime.utcnow() - timedelta(days=days_ago)
        
        status = random.choice(statuses)
        resolved_at = None
        if status == IssueStatus.RESOLVED:
            resolved_at = created_at + timedelta(hours=random.randint(6, 72))
        
        issue = Issue(
            title=f"{template['title']} - Ward {random.randint(1, 100)}",
            description=template["desc"],
            category=template["cat"],
            status=status,
            priority=random.choice(priorities),
            priority_score=random.uniform(0.3, 0.9),
            location={"type": "Point", "coordinates": coords},
            address=f"{random.randint(1, 500)} MG Road, Bangalore, Karnataka",
            ward_number=random.randint(1, 100),
            reporter_id=str(random.choice(citizens).id),
            department_id=str(dept.id) if dept else None,
            created_at=created_at,
            updated_at=created_at,
            resolved_at=resolved_at,
            status_history=[
                {
                    "status": "reported",
                    "updated_by": str(random.choice(citizens).id),
                    "timestamp": created_at,
                    "note": "Issue reported"
                }
            ]
        )
        
        # Add SLA deadline if department assigned
        if dept:
            issue.sla_deadline = created_at + timedelta(hours=dept.sla_hours)
        
        await issue.insert()
    
    print("Created 30 demo issues")


async def main():
    """Main seed function"""
    print("Connecting to MongoDB...")
    await connect_to_mongo()
    
    print("\nSeeding departments...")
    departments = await seed_departments()
    
    print("\nSeeding users...")
    users = await seed_users(departments)
    
    print("\nSeeding issues...")
    await seed_issues(users, departments)
    
    print("\n✅ Seed data created successfully!")
    print("\nDemo credentials:")
    print("  Admin: admin@civisense.gov.in / admin123")
    print("  Staff: staff.road@civisense.gov.in / staff123")
    print("  Citizen: citizen1@example.com / citizen123")


if __name__ == "__main__":
    asyncio.run(main())
