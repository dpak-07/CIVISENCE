import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import PyMongoError
except ModuleNotFoundError:  # pragma: no cover - environment-specific
    MongoClient = None
    UpdateOne = None

    class PyMongoError(Exception):
        pass


@dataclass
class SeedSummary:
    collection: str
    existing_before: int
    inserted: int
    matched_existing: int
    skipped: bool
    total_after: int


def parse_env_file(path: Path) -> dict[str, str]:
    parsed: dict[str, str] = {}
    if not path.exists():
        return parsed

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key:
            parsed[key] = value

    return parsed


def load_seed_environment(script_dir: Path) -> None:
    # Environment variables already exported in shell always take precedence.
    env_candidates = [
        script_dir / ".env",
        script_dir.parent / "backend" / ".env",
        script_dir.parent / ".env",
    ]

    for env_path in env_candidates:
        for key, value in parse_env_file(env_path).items():
            os.environ.setdefault(key, value)


def load_json_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError(f"{path.name} must contain a JSON array")

    for index, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"{path.name} item at index {index} is not an object")

    return data


def resolve_database_name(mongo_uri: str) -> str:
    env_name = os.getenv("MONGO_DB_NAME")
    if env_name and env_name.strip():
        return env_name.strip()

    parsed = urlparse(mongo_uri)
    db_name = parsed.path.lstrip("/")
    if db_name:
        return db_name

    return "civisense"


def seed_collection(
    collection,
    documents: list[dict[str, Any]],
    unique_fields: tuple[str, ...],
) -> SeedSummary:
    existing_before = collection.count_documents({})
    collection.create_index([("location", "2dsphere")], name="location_2dsphere")

    if existing_before > 0:
        return SeedSummary(
            collection=collection.name,
            existing_before=existing_before,
            inserted=0,
            matched_existing=0,
            skipped=True,
            total_after=existing_before,
        )

    operations: list[Any] = []
    for document in documents:
        selector = {field: document[field] for field in unique_fields}
        operations.append(UpdateOne(selector, {"$setOnInsert": document}, upsert=True))

    inserted = 0
    matched_existing = 0
    if operations:
        result = collection.bulk_write(operations, ordered=False)
        inserted = result.upserted_count
        matched_existing = result.matched_count

    total_after = collection.count_documents({})
    return SeedSummary(
        collection=collection.name,
        existing_before=existing_before,
        inserted=inserted,
        matched_existing=matched_existing,
        skipped=False,
        total_after=total_after,
    )


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    municipal_file = script_dir / "municipal_offices_chennai.json"
    sensitive_file = script_dir / "sensitive_locations_chennai.json"

    try:
        if MongoClient is None or UpdateOne is None:
            raise ValueError(
                "Missing dependency 'pymongo'. Install it in current environment: pip install pymongo"
            )

        load_seed_environment(script_dir)

        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            raise ValueError("MONGO_URI is required (set in shell or in database/.env)")

        municipal_docs = load_json_file(municipal_file)
        sensitive_docs = load_json_file(sensitive_file)

        database_name = resolve_database_name(mongo_uri)
        client = MongoClient(mongo_uri)
        db = client[database_name]

        municipal_collection = db["municipaloffices"]
        sensitive_collection = db["sensitive_locations"]

        municipal_summary = seed_collection(
            collection=municipal_collection,
            documents=municipal_docs,
            unique_fields=("name", "zone", "type"),
        )
        sensitive_summary = seed_collection(
            collection=sensitive_collection,
            documents=sensitive_docs,
            unique_fields=("name", "type"),
        )

        print("Seed run completed")
        for summary in (municipal_summary, sensitive_summary):
            print(f"- Collection: {summary.collection}")
            print(f"  Existing before: {summary.existing_before}")
            print(f"  Inserted: {summary.inserted}")
            print(f"  Matched existing during upsert: {summary.matched_existing}")
            print(f"  Skipped due to non-empty: {summary.skipped}")
            print(f"  Total after: {summary.total_after}")

        client.close()
        return 0
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"Seed data error: {exc}", file=sys.stderr)
        return 1
    except PyMongoError as exc:
        print(f"MongoDB error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
