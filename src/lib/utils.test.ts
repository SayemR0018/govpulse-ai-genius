import { describe, expect, test } from "bun:test";
import { cn } from "./utils";

describe("cn utility function", () => {
  test("merges single and multiple class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
    expect(cn("text-red-500", "font-bold", "bg-white")).toBe(
      "text-red-500 font-bold bg-white"
    );
  });

  test("handles conditional and falsy values correctly", () => {
    expect(cn("px-2", null, undefined, false, 0, "")).toBe("px-2");
    expect(cn("px-2", false && "py-1", true && "mt-4")).toBe("px-2 mt-4");
  });

  test("handles array and object syntax from clsx", () => {
    expect(cn(["px-2", "py-1"], { "text-red-500": true, "bg-blue-500": false })).toBe(
      "px-2 py-1 text-red-500"
    );
  });

  test("overrides conflicting Tailwind CSS classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-4", "px-2")).toBe("p-4 px-2");
  });
});
