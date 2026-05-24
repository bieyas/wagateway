---
name: whatsapp-session
description: Use when creating, debugging, or refactoring WhatsApp session lifecycle logic
---

# WhatsApp Session Skill

## Use this skill when

- A task touches QR generation, authentication, ready/disconnected states, or reconnect logic
- A bug involves duplicate clients, stale sessions, zombie browsers, or missing cleanup
- A feature requires session isolation per user, tenant, or device

## Approach

- Locate the existing session manager, gateway, and persistence boundaries first
- Map the session state transition before changing logic
- Check whether operations are concurrent for the same session id
- Prefer guarded reconnects with backoff over immediate recreation
- Ensure listeners, timers, browser pages, and clients are cleaned up on teardown

## Done criteria

- Session state is deterministic and observable
- Reconnect behavior is bounded and safe
- No duplicate runtime instance can be created for the same session unintentionally
