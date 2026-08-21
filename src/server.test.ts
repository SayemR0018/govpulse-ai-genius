import { describe, test, expect } from "bun:test";
import serverExport from "./server";

describe("Server Security & Path Traversal Protections", () => {
  test("returns 403 Forbidden on path traversal attempts", async () => {
    const request = new Request("http://localhost:3000/assets/..%2f..%2f.env");
    const response = await serverExport.fetch(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  test("returns 400 Bad Request on malformed URI path", async () => {
    const request = new Request("http://localhost:3000/%ff%ff");
    const response = await serverExport.fetch(request);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad Request");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("attaches security headers on responses", async () => {
    const request = new Request("http://localhost:3000/");
    const response = await serverExport.fetch(request);

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});
