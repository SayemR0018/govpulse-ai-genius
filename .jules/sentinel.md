## 2025-05-18 - Path Traversal Prevention in Bun Custom Static File Server
**Vulnerability:** Static asset handling in `src/server.ts` concatenated raw `url.pathname` directly onto `./dist/client` without URI decoding or checking that the resolved path remained strictly inside `CLIENT_DIR`.
**Learning:** URL paths containing encoded slashes or dot segments (such as `%2f..%2f`) bypass naive URL normalizations. Resolving relative to the base asset path after `decodeURIComponent` is essential.
**Prevention:** Always use `path.resolve(BASE_DIR, "." + decodeURIComponent(url.pathname))` and verify `safePath.startsWith(BASE_DIR + path.sep) || safePath === BASE_DIR` before attempting file lookups.
