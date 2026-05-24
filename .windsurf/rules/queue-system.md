---
trigger: glob
pattern: "backend/src/**/*.ts"
description: Queue, worker, retry, and background processing standards
---

# Queue System Rules

- Queue system uses **BullMQ** via `@nestjs/bullmq` — not plain Redis or custom queue logic
- Register queues with `BullModule.registerQueue()` inside `@Module()` imports
- Inject queues with `@InjectQueue('queue-name')` in service constructors
- Implement workers with `@Processor('queue-name')` and `@Process()` or `@OnWorkerEvent()`
- Use queues for slow, retryable, or bursty workloads
- Keep queue payloads small, serializable, and version-tolerant
- Include tenant, session, and correlation identifiers when relevant
- Make workers idempotent and safe to retry
- Use bounded retries with backoff and dead-letter handling where available
- Do not perform unbounded parallel processing inside a worker
- Validate payloads at worker boundaries before executing business logic
- Log job lifecycle transitions concisely with actionable context
- Avoid storing secrets, large media blobs, or raw message history in job payloads
- Separate enqueueing decisions from worker execution logic
