# Microservice Architecture Blueprint

This document captures the service boundaries, data ownership, and integration patterns required to evolve the Social Media Scheduler into a microservice-based system that satisfies the college DevOps rubric.

## Services Overview

| Service | Responsibility | Exposed API | Data Store |
| --- | --- | --- | --- |
| scheduler-service | Accept schedule requests, validate payloads, persist metadata, enqueue jobs. | REST `/api/v1/schedules` | DynamoDB table `Schedules` (PK `scheduleId`) |
| media-service | Handle uploads, optimize images/video, serve signed URLs to other services. | REST `/api/v1/media`, pre-signed S3 URLs | S3 bucket `sms-media` + DynamoDB table `MediaObjects` |
| notifier-service | Worker consuming schedule events, publishing to social APIs, updating status, sending notifications. | Event-driven via SQS/SNS | DynamoDB table `ScheduleStatuses` |

## Communication Flow

1. `scheduler-service` receives a request from the React UI, stores metadata, and pushes a message into SQS (`schedules-queue`).
2. `media-service` is called separately to upload media; it returns a mediaId referenced inside the schedule payload.
3. `notifier-service` polls SQS, fetches the media asset via pre-signed URL, publishes to the social platform, then updates the schedule status through a direct REST call back to `scheduler-service` or via another queue.

```
React UI -> scheduler-service -> SQS -> notifier-service -> Social API
             |                               |
             +--> media-service (pre-upload) --+
```

## Data Contracts

- **Schedule Payload**
  ```json
  {
    "scheduleId": "uuid",
    "text": "string",
    "mediaId": "uuid",
    "platform": "instagram|twitter",
    "scheduledAt": "ISO8601",
    "status": "pending|sent|failed"
  }
  ```
- **Media Metadata**
  ```json
  {
    "mediaId": "uuid",
    "bucket": "sms-media",
    "key": "uploads/2025/11/img.png",
    "contentType": "image/png",
    "size": 123456
  }
  ```

## Deployment Units

Each service is packaged as an independent Node.js project with its own `package.json`, Dockerfile, and Helm chart component. Shared utilities (logging, validation) live in a separate npm workspace package (`packages/common`).

```
services/
  scheduler-service/
  media-service/
  notifier-service/
packages/
  common/
```

## Observability & Security

- OpenTelemetry instrumentation exports traces to AWS X-Ray.
- CloudWatch metrics capture queue depth, API latency, and worker throughput.
- API Gateway handles rate limiting and JWT-based authentication before requests hit `scheduler-service` or `media-service`.

## Next Steps

1. Scaffold the service directories with Express routers and individual package manifests.
2. Implement message schemas in the `common` package and share via npm workspaces.
3. Configure CI workflows to test and build each service independently prior to Dockerizing.
