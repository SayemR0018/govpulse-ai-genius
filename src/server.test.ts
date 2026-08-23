import { describe, expect, it, mock } from "bun:test";
import serverExport from "./server";

describe("serverExport fetch handler", () => {
  it("prevents path traversal outside of static client directory", async () => {
    // Attempt path traversal to reach package.json outside ./dist/client
    const req = new Request("http://localhost:3000/../../package.json");

    // serverExport.fetch should reject path traversal and attempt to pass through to getServerEntry/handler or fail safely
    // Rather than returning package.json file directly
    const res = await serverExport.fetch(req);

    // Check that we didn't return package.json content (which contains "name": "lovable-app" or similar package json keys)
    const text = await res.text();
    expect(text).not.toContain('"name": "lovable-app"');
  });
});
