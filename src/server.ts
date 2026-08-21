import "./lib/error-capture";
import path from "node:path";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

interface BunFile {
  exists(): Promise<boolean>;
}

interface BunGlobal {
  env?: Record<string, string>;
  file(path: string): BunFile;
  serve(options: {
    port: number;
    hostname: string;
    fetch: (request: Request, env?: unknown, ctx?: unknown) => Promise<Response>;
  }): {
    hostname: string;
    port: number;
    stop(closeActiveConnections?: boolean): void;
  };
}

declare const Bun: BunGlobal | undefined;

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const PORT = Number(process.env.PORT || (typeof Bun !== "undefined" && Bun?.env?.PORT) || 3000);
const HOST = "0.0.0.0";
const CLIENT_DIR = path.resolve(process.cwd(), "dist/client");

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const serverExport = {
  port: PORT,
  hostname: HOST,
  async fetch(request: Request, env?: unknown, ctx?: unknown): Promise<Response> {
    const url = new URL(request.url);

    // Serve static client assets in production if using Bun runtime
    if (typeof Bun !== "undefined" && Bun?.file) {
      let decodedPathname: string;
      try {
        decodedPathname = decodeURIComponent(url.pathname);
      } catch {
        return withSecurityHeaders(
          new Response("Bad Request", {
            status: 400,
            headers: { "content-type": "text/plain; charset=utf-8" },
          }),
        );
      }

      const safePath = path.resolve(CLIENT_DIR, "." + decodedPathname);
      const isWithinClientDir =
        safePath === CLIENT_DIR || safePath.startsWith(CLIENT_DIR + path.sep);

      if (!isWithinClientDir) {
        return withSecurityHeaders(
          new Response("Forbidden", {
            status: 403,
            headers: { "content-type": "text/plain; charset=utf-8" },
          }),
        );
      }

      const staticFile = Bun.file(safePath);
      if (await staticFile.exists()) {
        return withSecurityHeaders(new Response(staticFile as unknown as BodyInit));
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);

      // If TanStack Start SSR return 404 for a route, check if client static assets/index.html fallback exists
      if (response.status === 404 && typeof Bun !== "undefined" && Bun?.file) {
        const clientIndex = Bun.file(path.join(CLIENT_DIR, "index.html"));
        if (await clientIndex.exists()) {
          return withSecurityHeaders(
            new Response(clientIndex as unknown as BodyInit, {
              headers: { "content-type": "text/html; charset=utf-8" },
            }),
          );
        }
      }

      const normalized = await normalizeCatastrophicSsrResponse(response);
      return withSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};

// Start server and handle graceful shutdown if run directly under Bun
if (import.meta.main && typeof Bun !== "undefined") {
  const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch: serverExport.fetch,
  });

  console.log(`Server listening on http://${server.hostname}:${server.port}`);

  const shutdown = () => {
    console.log("Shutting down server gracefully...");
    server.stop(true);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export default serverExport;
