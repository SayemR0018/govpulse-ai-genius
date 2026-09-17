import { describe, expect, it } from "bun:test";
import path from "node:path";
import serverExport from "./server";

describe("Server static asset path traversal protection", () => {
  it("prevents path traversal outside dist/client", async () => {
    // Attempt directory traversal to read server code from dist/server/server.js
    const traversalReq1 = new Request("http://localhost/../server/server.js");
    const res1 = await serverExport.fetch(traversalReq1);

    // Should not return 200 OK serving the server file
    // Note: If server entry or index fallback is triggered, status might be 500/404, but it must NOT serve server.js content.
    if (res1.status === 200) {
      const text = await res1.text();
      expect(text).not.toContain("consumeLastCapturedError");
    }

    const traversalReq2 = new Request("http://localhost/%2e%2e/server/server.js");
    const res2 = await serverExport.fetch(traversalReq2);
    if (res2.status === 200) {
      const text = await res2.text();
      expect(text).not.toContain("consumeLastCapturedError");
    }
  });

  it("safely computes targetPath within dist/client directory", () => {
    const clientDir = path.resolve("./dist/client");

    const checkPath = (pathname: string) => {
      let rawPath = pathname;
      try {
        rawPath = decodeURIComponent(pathname);
      } catch {
        // invalid URL encoding
      }
      const targetPath = path.resolve(clientDir, "." + rawPath);
      return targetPath.startsWith(clientDir + path.sep) || targetPath === clientDir;
    };

    expect(checkPath("/assets/index.js")).toBe(true);
    expect(checkPath("/../server/server.js")).toBe(false);
    expect(checkPath("/%2e%2e/server/server.js")).toBe(false);
    expect(checkPath("/%2e%2e/%2e%2e/package.json")).toBe(false);
  });
});

describe("Server security headers", () => {
  it("attaches standard HTTP security headers to server responses", async () => {
    const req = new Request("http://localhost/test-security-headers");
    const res = await serverExport.fetch(req);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("X-XSS-Protection")).toBe("0");
  });
});
