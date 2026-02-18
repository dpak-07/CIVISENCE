# FCM Setup (Node Backend)

The notification service works without FCM credentials (it will still persist notifications in MongoDB).  
To enable push delivery, configure one of the following:

## Option 1: Service Account JSON String (recommended for container deploys)

Set environment variable:

`FIREBASE_SERVICE_ACCOUNT_JSON`

Value should be the full Firebase service-account JSON object as a single line.

## Option 2: Service Account File Path

Set environment variable:

`FIREBASE_SERVICE_ACCOUNT_PATH`

Value should point to a JSON key file accessible by the backend process.

## Optional Client Requirement

User documents should store a valid FCM token in:

`deviceToken`

If `deviceToken` is missing, push is skipped and notification is still stored in MongoDB.

## Notification APIs

- `GET /api/notifications` (auth required)
- `PATCH /api/notifications/:id/read` (auth required)
