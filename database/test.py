import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    from bson import ObjectId
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError
except ModuleNotFoundError:  # pragma: no cover - environment-specific
    ObjectId = None
    MongoClient = None

    class PyMongoError(Exception):
        pass


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value

    return values


def load_environment(script_dir: Path) -> None:
    candidates = [
        script_dir / ".env",
        script_dir.parent / "backend" / ".env",
        script_dir.parent / ".env",
    ]

    for env_path in candidates:
        for key, value in parse_env_file(env_path).items():
            os.environ.setdefault(key, value)


def resolve_database_name(mongo_uri: str) -> str:
    env_name = os.getenv("MONGO_DB_NAME")
    if env_name and env_name.strip():
        return env_name.strip()

    parsed = urlparse(mongo_uri)
    path_db = parsed.path.lstrip("/")
    if path_db:
        return path_db

    return "civisense"


def normalize_datetime(value):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, str) and value.strip():
        text = value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(text)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def normalize_object_id(value):
    if ObjectId is None:
        return value
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str) and len(value) == 24:
        try:
            return ObjectId(value)
        except Exception:
            return None
    return None


def normalize_document(raw: dict) -> dict:
    now = datetime.now(timezone.utc)

    created_at = normalize_datetime(raw.get("createdAt")) if raw.get("createdAt") else now
    updated_at = normalize_datetime(raw.get("updatedAt")) if raw.get("updatedAt") else now

    images = raw.get("images")
    normalized_images = []
    if isinstance(images, list):
        for image in images:
            if isinstance(image, dict):
                normalized_images.append(
                    {
                        "url": str(image.get("url", "")),
                        "uploadedAt": normalize_datetime(image.get("uploadedAt")) if image.get("uploadedAt") else now,
                    }
                )
    if not normalized_images:
        normalized_images = [{"url": "", "uploadedAt": now}]

    duplicate_info = raw.get("duplicateInfo") if isinstance(raw.get("duplicateInfo"), dict) else {}

    return {
        "title": str(raw.get("title", "")).strip(),
        "description": str(raw.get("description", "")).strip(),
        "category": str(raw.get("category", "")).strip(),
        "location": raw.get("location"),
        "status": "reported",
        "severityScore": 0,
        "priority": {
            "score": 0,
            "level": "low",
            "reason": "",
            "aiProcessed": False,
            "aiProcessingStatus": "pending",
        },
        "duplicateInfo": {
            "isDuplicate": bool(duplicate_info.get("isDuplicate", False)),
            "masterComplaintId": normalize_object_id(duplicate_info.get("masterComplaintId")),
            "duplicateCount": int(duplicate_info.get("duplicateCount", 0)),
        },
        "assignedMunicipalOffice": normalize_object_id(raw.get("assignedMunicipalOffice")),
        "assignedOfficeType": raw.get("assignedOfficeType"),
        "routingDistanceMeters": raw.get("routingDistanceMeters"),
        "routingReason": raw.get("routingReason"),
        "reportedBy": normalize_object_id(raw.get("reportedBy")),
        "images": normalized_images,
        "createdAt": created_at,
        "updatedAt": updated_at,
    }


def validate_document(doc: dict) -> None:
    if not doc["title"]:
        raise ValueError("Complaint title cannot be empty")
    if not doc["description"]:
        raise ValueError(f"Complaint '{doc['title']}' has empty description")
    if doc["category"] not in {"pothole", "garbage", "drainage", "streetlight", "water_leak"}:
        raise ValueError(f"Complaint '{doc['title']}' has invalid category: {doc['category']}")

    location = doc.get("location")
    if not isinstance(location, dict) or location.get("type") != "Point":
        raise ValueError(f"Complaint '{doc['title']}' has invalid GeoJSON type")

    coordinates = location.get("coordinates")
    if not (isinstance(coordinates, list) and len(coordinates) == 2):
        raise ValueError(f"Complaint '{doc['title']}' coordinates must be [lng, lat]")

    lng, lat = coordinates
    if not isinstance(lng, (float, int)) or not isinstance(lat, (float, int)):
        raise ValueError(f"Complaint '{doc['title']}' coordinates must be numeric")


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    data_file = script_dir / "complaints_test_chennai.json"

    try:
        if MongoClient is None:
            raise ValueError("Missing dependency 'pymongo'. Install with: pip install pymongo")

        load_environment(script_dir)

        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            raise ValueError("MONGO_URI is required (set in shell or in database/.env)")

        with data_file.open("r", encoding="utf-8-sig") as file:
            records = json.load(file)

        if not isinstance(records, list):
            raise ValueError("complaints_test_chennai.json must contain an array")

        db_name = resolve_database_name(mongo_uri)
        client = MongoClient(mongo_uri)
        db = client[db_name]
        complaints = db["complaints"]

        inserted = 0
        skipped = 0

        for raw in records:
            if not isinstance(raw, dict):
                raise ValueError("Each complaint record must be an object")

            doc = normalize_document(raw)
            validate_document(doc)

            lng, lat = doc["location"]["coordinates"]
            duplicate = complaints.find_one(
                {
                    "title": doc["title"],
                    "location.type": "Point",
                    "location.coordinates": [lng, lat],
                },
                projection={"_id": 1},
            )

            if duplicate:
                skipped += 1
                continue

            complaints.insert_one(doc)
            inserted += 1

        print("Complaint test data import completed")
        print(f"total inserted: {inserted}")
        print(f"duplicates skipped: {skipped}")

        client.close()
        return 0
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"Test data error: {exc}", file=sys.stderr)
        return 1
    except PyMongoError as exc:
        print(f"MongoDB error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
