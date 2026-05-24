---
name: anti-ban
description: Use when changing WhatsApp sending behavior, rate limits, retries, warmup, or safety controls
---

# Anti Ban Skill

## Use this skill when

- A task changes outbound message sending
- A task touches rate limits, retry intervals, campaign sending, or bulk messaging
- A feature could increase message volume or automation intensity

## Approach

- Preserve existing safety checks and sending queues
- Prefer randomized bounded delays over fixed aggressive intervals
- Respect opt-out, blacklist, and contact eligibility checks
- Avoid parallel sends from the same session unless explicitly supported
- Track failures and pause unsafe sessions instead of retrying indefinitely

## Done criteria

- Sending behavior is rate-limited and recoverable
- Retries are bounded and do not create duplicate messages
- Safety checks run before each outbound message
