import { describe, expect, it, afterEach, mock } from "bun:test";
import { createLovableAiGatewayProvider, DEFAULT_MODEL } from "./ai-gateway.server";

describe("createLovableAiGatewayProvider", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("exports DEFAULT_MODEL", () => {
    expect(DEFAULT_MODEL).toBe("google/gemini-3-flash-preview");
  });

  describe("initialRunId handling", () => {
    it("handles explicit initialRunId with whitespace trimming", async () => {
      const provider = createLovableAiGatewayProvider("test-key", "  run-xyz-123  ");
      expect(provider.getRunId()).toBe("run-xyz-123");
      const runId = await provider.waitForRunId();
      expect(runId).toBe("run-xyz-123");
    });

    it("handles whitespace-only initialRunId as undefined", () => {
      const provider = createLovableAiGatewayProvider("test-key", "   ");
      expect(provider.getRunId()).toBeUndefined();
    });

    it("handles undefined initialRunId", () => {
      const provider = createLovableAiGatewayProvider("test-key");
      expect(provider.getRunId()).toBeUndefined();
    });
  });

  describe("custom fetch integration via provider model execution", () => {
    it("attaches headers and executes custom fetch when model generates text", async () => {
      let capturedInput: RequestInfo | URL | undefined;
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedInput = input;
        capturedInit = init;
        return new Response(
          JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "google/gemini-3-flash-preview",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "Hello world!" },
                finish_reason: "stop",
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Lovable-AIG-Run-ID": "run-from-gateway-header",
            },
          }
        );
      }) as unknown as typeof fetch;

      const provider = createLovableAiGatewayProvider("my-test-api-key", "initial-run-id");
      expect(provider.getRunId()).toBe("initial-run-id");

      const model = provider(DEFAULT_MODEL);
      expect(model).toBeDefined();

      await model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      } as any);

      // Verify custom fetch options & headers passed to global fetch
      expect(capturedInput?.toString()).toContain("https://ai.gateway.lovable.dev/v1");

      const headers = new Headers(capturedInit?.headers);
      expect(headers.get("Lovable-API-Key")).toBe("my-test-api-key");
      expect(headers.get("X-Lovable-AIG-SDK")).toBe("vercel-ai-sdk");
      expect(headers.get("X-Lovable-AIG-Run-ID")).toBe("initial-run-id");

      // Verify runId returned / updated
      expect(provider.getRunId()).toBe("initial-run-id");
      expect(await provider.waitForRunId()).toBe("initial-run-id");
    });

    it("extracts and publishes runId from response header when initialRunId was undefined", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "google/gemini-3-flash-preview",
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
            headers: {
              "Content-Type": "application/json",
              "X-Lovable-AIG-Run-ID": "  run-response-456  ",
            },
          }
        );
      }) as unknown as typeof fetch;

      const provider = createLovableAiGatewayProvider("my-test-api-key");
      expect(provider.getRunId()).toBeUndefined();

      const waitForRunIdPromise = provider.waitForRunId();

      const model = provider(DEFAULT_MODEL);
      await model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      } as any);

      expect(provider.getRunId()).toBe("run-response-456");
      expect(await waitForRunIdPromise).toBe("run-response-456");
    });

    it("does not overwrite runId if response contains a different runId on subsequent requests", async () => {
      let requestCount = 0;
      globalThis.fetch = mock(async () => {
        requestCount++;
        return new Response(
          JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "google/gemini-3-flash-preview",
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
            headers: {
              "Content-Type": "application/json",
              "X-Lovable-AIG-Run-ID": requestCount === 1 ? "run-first" : "run-second",
            },
          }
        );
      }) as unknown as typeof fetch;

      const provider = createLovableAiGatewayProvider("my-test-api-key");
      const model = provider(DEFAULT_MODEL);

      await model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "Req 1" }] }],
      } as any);
      expect(provider.getRunId()).toBe("run-first");

      await model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "Req 2" }] }],
      } as any);
      expect(provider.getRunId()).toBe("run-first");
    });

    it("publishes undefined and resolves waitForRunId when fetch rejects with network error", async () => {
      globalThis.fetch = mock(async () => {
        throw new Error("Network connection lost");
      }) as unknown as typeof fetch;

      const provider = createLovableAiGatewayProvider("my-test-api-key");
      const waitForRunIdPromise = provider.waitForRunId();
      const model = provider(DEFAULT_MODEL);

      await expect(
        model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "Test error" }] }],
        } as any)
      ).rejects.toThrow("Network connection lost");

      expect(provider.getRunId()).toBeUndefined();
      expect(await waitForRunIdPromise).toBeUndefined();
    });

    it("publishes undefined and resolves waitForRunId when response header is missing", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "google/gemini-3-flash-preview",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "No header response" },
                finish_reason: "stop",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }) as unknown as typeof fetch;

      const provider = createLovableAiGatewayProvider("my-test-api-key");
      const waitForRunIdPromise = provider.waitForRunId();
      const model = provider(DEFAULT_MODEL);

      await model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "Test no header" }] }],
      } as any);

      expect(provider.getRunId()).toBeUndefined();
      expect(await waitForRunIdPromise).toBeUndefined();
    });

    it("does not overwrite header if request already includes X-Lovable-AIG-Run-ID header", async () => {
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedInit = init;
        return new Response(
          JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "google/gemini-3-flash-preview",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "Overridden header test" },
                finish_reason: "stop",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }) as unknown as typeof fetch;

      const provider = createLovableAiGatewayProvider("my-test-api-key", "initial-run");
      const model = provider(DEFAULT_MODEL);

      await model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "Custom header test" }] }],
        headers: {
          "X-Lovable-AIG-Run-ID": "custom-override-run",
        },
      } as any);

      const headers = new Headers(capturedInit?.headers);
      expect(headers.get("X-Lovable-AIG-Run-ID")).toBe("custom-override-run");
    });
  });
});
