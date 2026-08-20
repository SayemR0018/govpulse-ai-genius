import { describe, test, expect, afterEach, mock } from "bun:test";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

describe("createLovableAiGatewayProvider", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("initializes with initialRunId and resolves getRunId and waitForRunId", async () => {
    const provider = createLovableAiGatewayProvider("test-api-key", "initial-run-123");

    expect(provider.getRunId()).toBe("initial-run-123");
    expect(await provider.waitForRunId()).toBe("initial-run-123");
  });

  test("handles fetch error, executes catch block publishing undefined and rethrows error", async () => {
    const fetchError = new Error("Network request failed");
    const mockFetch = mock(async () => {
      throw fetchError;
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const provider = createLovableAiGatewayProvider("test-api-key");
    const model = provider("google/gemini-3-flash-preview");

    // Invoke language model call which triggers the provider's fetch wrapper
    const doGeneratePromise = model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
    });

    await expect(doGeneratePromise).rejects.toThrow("Network request failed");

    // Verify that publishRunId(undefined) was called in the catch block,
    // resolving waitForRunId() to undefined
    expect(await provider.waitForRunId()).toBeUndefined();
    expect(provider.getRunId()).toBeUndefined();
  });

  test("extracts X-Lovable-AIG-Run-ID from response headers on fetch success", async () => {
    const mockFetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Lovable-API-Key")).toBe("test-api-key");
      expect(headers.get("X-Lovable-AIG-SDK")).toBe("vercel-ai-sdk");

      return new Response(
        JSON.stringify({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: 1234567890,
          model: "google/gemini-3-flash-preview",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Hello back!" },
              finish_reason: "stop",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Lovable-AIG-Run-ID": "run-header-789",
          },
        },
      );
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const provider = createLovableAiGatewayProvider("test-api-key");
    const model = provider("google/gemini-3-flash-preview");

    await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
    });

    expect(provider.getRunId()).toBe("run-header-789");
    expect(await provider.waitForRunId()).toBe("run-header-789");
  });

  test("includes existing runId in request headers when fetch is called", async () => {
    let capturedHeaders: Headers | undefined;

    const mockFetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(
        JSON.stringify({
          id: "chatcmpl-123",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Hi" },
              finish_reason: "stop",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const provider = createLovableAiGatewayProvider("test-api-key", "existing-run-abc");
    const model = provider("google/gemini-3-flash-preview");

    await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
    });

    expect(capturedHeaders?.get("X-Lovable-AIG-Run-ID")).toBe("existing-run-abc");
  });
});
