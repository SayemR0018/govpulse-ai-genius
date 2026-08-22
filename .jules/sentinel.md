## 2025-05-18 - Path Traversal in Production Custom Static Asset Server
**Vulnerability:** String concatenation of `url.pathname` in `src/server.ts` (`./dist/client${url.pathname}`) allowed relative path traversal outside the client build root.
**Learning:** Production custom Bun entrypoints in SSR frameworks (like TanStack Start) need explicit path resolution confinement.
**Prevention:** Always use `path.resolve` and verify `targetPath.startsWith(baseDir + path.sep)` before serving filesystem assets.
