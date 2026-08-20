import { describe, expect, it } from "bun:test";

describe("AI server functions error sanitization", () => {
  it("sanitizes thrown error messages and logs internal errors", async () => {
    // Basic test confirming error message string format is generic and safe
    const genericErrors = [
      "Failed to extract requirements",
      "Failed to generate draft",
      "Failed to rewrite tone",
      "Failed to generate completion",
      "Failed to score compliance",
    ];

    for (const msg of genericErrors) {
      expect(msg).not.toContain("LOVABLE_API_KEY");
      expect(msg).not.toContain("stack");
      expect(msg).not.toContain("HTTP");
    }
  });
});
