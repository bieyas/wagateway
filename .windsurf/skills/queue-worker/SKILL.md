---
name: queue-worker
description: Use when creating, debugging, or optimizing background jobs and workers
---

# Queue Worker Skill

## Use this skill when

- A task introduces async processing or background jobs
- A bug involves retries, stalled jobs, duplicate processing, or missing completion events
- A performance issue is caused by heavy work inside request or event handlers

## Approach

- Keep job payloads compact and validate them at worker boundaries
- Make worker handlers idempotent before enabling retries
- Use bounded concurrency and avoid unbounded in-memory batching
- Separate enqueue logic, worker execution, and failure handling
- Add concise lifecycle logs for started, completed, retried, and failed jobs

## Done criteria

- Jobs are retry-safe and observable
- Worker concurrency is controlled
- Failure behavior is explicit and actionable
