## 2025-05-20 - Verify Affected Row Count on Supabase RLS Updates

**Vulnerability:** Supabase `.update()` calls without `.select()` return `{ error: null }` even when RLS blocks the operation and updates 0 rows, leading server handlers to falsely report success when authorization fails.
**Learning:** Supabase JavaScript client does not return affected row counts or throw errors on RLS access denial unless `.select(...)` is chained to the mutation query.
**Prevention:** Always chain `.select("id")` (or relevant columns) to `.update()` calls and verify `!updatedRows || updatedRows.length === 0` to throw an explicit authorization/not-found error when zero rows are affected.
