## 2025-05-20 - Verify Affected Row Count on Supabase RLS Updates

**Vulnerability:** Supabase `.update()` calls without `.select()` return `{ error: null }` even when RLS blocks the operation and updates 0 rows, leading server handlers to falsely report success when authorization fails.
**Learning:** Supabase JavaScript client does not return affected row counts or throw errors on RLS access denial unless `.select(...)` is chained to the mutation query.
**Prevention:** Always chain `.select("id")` (or relevant columns) to `.update()` calls and verify `!updatedRows || updatedRows.length === 0` to throw an explicit authorization/not-found error when zero rows are affected.

## 2025-05-20 - Sanitize Static Asset Path Resolution in Bun Custom Servers

**Vulnerability:** Constructing static file paths via string concatenation (`./dist/client${url.pathname}`) in `Bun.file()` allows path traversal attacks (e.g., `/%2e%2e/server/server.js`) to read arbitrary files outside the client assets root directory.
**Learning:** `Bun.file()` automatically resolves `..` relative path components. Unless `url.pathname` is URL-decoded and checked via `path.resolve(...)` against the base directory root (`.startsWith(baseDir + path.sep)`), relative traversal paths can escape `dist/client`.
**Prevention:** Always decode URI components and resolve target paths using `path.resolve(baseDir, "." + decodedPath)` and verify `targetPath.startsWith(baseDir + path.sep) || targetPath === baseDir` before passing to `Bun.file()`.
