import { describe, expect, test } from "bun:test";
import path from "node:path";
import { getSafeStaticFilePath } from "../server";

describe("getSafeStaticFilePath security tests", () => {
  const baseDir = "./dist/client";
  const resolvedBase = path.resolve(baseDir);

  test("allows legitimate client static asset paths", () => {
    const safePath = getSafeStaticFilePath("/assets/index.js", baseDir);
    expect(safePath).toBe(path.resolve(resolvedBase, "assets/index.js"));

    const safeIndex = getSafeStaticFilePath("/index.html", baseDir);
    expect(safeIndex).toBe(path.resolve(resolvedBase, "index.html"));
  });

  test("blocks path traversal attempts attempting to exit base directory", () => {
    expect(getSafeStaticFilePath("/../package.json", baseDir)).toBeNull();
    expect(getSafeStaticFilePath("/../../.env", baseDir)).toBeNull();
    expect(getSafeStaticFilePath("/../../../etc/passwd", baseDir)).toBeNull();
  });

  test("blocks multiple leading slashes path traversal vectors", () => {
    expect(getSafeStaticFilePath("///../../package.json", baseDir)).toBeNull();
  });
});
