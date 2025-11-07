# HD Video Receiver - Cloudflare Worker

This Cloudflare Worker receives video processing requests and queues them for processing.

## Architecture

This worker is the first part of a video processing pipeline:
1. Receives HTTP POST requests with video details
2. Updates Firestore with 'processing' status
3. Sends message to Cloudflare Queue for async processing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up secrets:
```bash
wrangler secret put FIRESTORE_PRIVATE_KEY_JSON
```

3. Deploy:
```bash
npm run deploy
```

## API

### POST /

**Request Body:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "fileName": "video.mp4",
  "firestoreDocId": "doc-id-123"
}
```

**Response:**
```json
{
  "message": "Video processing started"
}
```

## Environment Variables

- `FIRESTORE_PRIVATE_KEY_JSON`: Firestore service account credentials (JSON string)
- `VIDEO_QUEUE`: Cloudflare Queue binding (configured in wrangler.toml)

## Migration Notes

Migrated from AWS Lambda function `HD-video-receiver`. Key changes:
- Replaced AWS Step Function with Cloudflare Queue
- Converted from Lambda handler to Cloudflare Workers fetch handler
- Maintained Firestore integration
