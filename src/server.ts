import "./lib/error-capture";
import path from "node:path";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

declare const Bun: {
  env: Record<string, string | undefined>;
  file: (path: string) => { exists: () => Promise<boolean> };
  serve: (options: {
    port: number;
    hostname: string;
    fetch: (req: Request, env?: unknown, ctx?: unknown) => Promise<Response> | Response;
  }) => { hostname: string; port: number; stop: (force?: boolean) => void };
};

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

// Attach standard HTTP security headers to protect against MIME sniffing, clickjacking, and cross-site leaks
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-XSS-Protection", "0");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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

const PORT = Number(process.env.PORT || (typeof Bun !== "undefined" && Bun.env.PORT) || 3000);
const HOST = "0.0.0.0";

async function handleFetch(request: Request, env?: unknown, ctx?: unknown): Promise<Response> {
  const url = new URL(request.url);

  // Serve static client assets in production if using Bun runtime safely against path traversal
  if (typeof Bun !== "undefined") {
    let rawPath = url.pathname;
    try {
      rawPath = decodeURIComponent(url.pathname);
    } catch {
      // invalid URL encoding, default to url.pathname
    }
    const clientDir = path.resolve("./dist/client");
    const targetPath = path.resolve(clientDir, "." + rawPath);

    // Enforce path containment within ./dist/client to prevent directory traversal attacks
    if (targetPath.startsWith(clientDir + path.sep) || targetPath === clientDir) {
      const staticFile = Bun.file(targetPath);
      if (await staticFile.exists()) {
        return new Response(staticFile);
      }
    }
  }

  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);

    // If TanStack Start SSR return 404 for a route, check if client static assets/index.html fallback exists
    if (response.status === 404 && typeof Bun !== "undefined") {
      const clientIndex = Bun.file("./dist/client/index.html");
      if (await clientIndex.exists()) {
        return new Response(clientIndex, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    }

    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

const serverExport = {
  port: PORT,
  hostname: HOST,
  async fetch(request: Request, env?: unknown, ctx?: unknown) {
    const response = await handleFetch(request, env, ctx);
    return withSecurityHeaders(response);
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

export default import.meta.main ? {} : serverExport;
