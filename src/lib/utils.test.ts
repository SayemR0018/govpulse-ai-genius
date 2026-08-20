import { expect, test } from "bun:test";
import { cn } from "./utils";

test("cn merges class names correctly", () => {
  expect(cn("px-2 py-1", "bg-blue-500")).toBe("px-2 py-1 bg-blue-500");
  expect(cn("px-2", "px-4")).toBe("px-4");
  expect(cn("text-red-500", false && "bg-blue-500", undefined, null, "text-sm")).toBe("text-red-500 text-sm");
  expect(cn({ "font-bold": true, "italic": false })).toBe("font-bold");
  expect(cn(["p-4", "m-2"])).toBe("p-4 m-2");
});
