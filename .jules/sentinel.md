## 2026-06-12 - Error Sanitization in Server Functions

**Vulnerability:** Raw error message re-throwing in server functions (`err instanceof Error ? err.message : ...`) leaking API keys, AI gateway internals, or infrastructure stack details to client applications.
**Learning:** Re-throwing `err.message` directly in server function catch handlers exposes external service messages and system details to end users. Server functions must catch errors, log full error details internally via `console.error`, and return/throw generic error messages to clients.
**Prevention:** Always return static, generic error strings in public server function exceptions while maintaining server-side logging for debugging.
