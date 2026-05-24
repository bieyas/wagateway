---
trigger: always_on
description: Global Node.js engineering standards for all projects
---

# Global Node.js Engineering Rules

## Project Stack

- Framework: **NestJS** (not plain Express or plain Node.js)
- ORM: TypeORM with `@InjectRepository()`
- Queue: BullMQ via `@nestjs/bullmq`
- Events: `@nestjs/event-emitter` with `@OnEvent()` decorator
- Realtime: Socket.IO via `@nestjs/websockets` and `@WebSocketGateway()`
- Scheduler: `@nestjs/schedule` with `@Cron()` decorator
- Config: `@nestjs/config` with `ConfigService`
- WhatsApp: `whatsapp-web.js` (wwebjs) wrapped in a custom engine layer

## Architecture

- Use NestJS module system: `@Module()`, `providers[]`, `imports[]`, `exports[]`
- Separate business logic from transport layer
- Keep files focused and single-purpose
- Prefer service-based structure with NestJS DI
- Avoid monolithic controllers and oversized service files
- Reuse existing modules before creating new ones
- Preserve backward compatibility
- Do not suggest Express/plain Node.js patterns when NestJS equivalents exist

## Code Style

- Use async/await consistently
- Prefer early return pattern
- Avoid deep nesting
- Use descriptive naming
- Keep functions single-purpose
- Avoid magic numbers and hardcoded values
- Use environment variables for configuration

## Performance

- Prioritize low memory usage
- Avoid blocking operations
- Avoid synchronous filesystem APIs
- Minimize unnecessary dependencies
- Prefer lightweight npm libraries
- Optimize for long-running processes

## Error Handling

- Use centralized error handling
- Always handle async errors
- Validate external input
- Prevent silent failures
- Log actionable errors only

## Security

- Never expose secrets
- Sanitize user input
- Validate API payloads
- Avoid eval and unsafe execution
- Use least-privilege principles

## Logging

- Use logger utility instead of console.log
- Keep logs structured and concise
- Avoid excessive logging in loops
- Log important state transitions

## Scalability

- Design for queue-based processing
- Prefer event-driven architecture
- Keep handlers idempotent
- Avoid tight coupling
- Separate realtime and heavy processing

## AI Coding Behavior

- Analyze existing structure before generating files
- Modify existing code when appropriate
- Avoid duplicate implementations
- Do not create unnecessary abstractions
- Focus on production-ready implementation
- Prioritize maintainability over cleverness

## Dependencies

- Prefer stable npm libraries
- Avoid abandoned packages
- Minimize dependency count
- Check compatibility before introducing new packages

## Documentation

- Add comments only for non-obvious logic
- Keep code self-explanatory
- Summarize important architectural decisions