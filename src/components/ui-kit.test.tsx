import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";
import { Skeleton } from "./ui-kit";

describe("Skeleton component", () => {
  test("renders default skeleton element with base classes", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstElementChild;
    expect(div).not.toBeNull();
    expect(div?.className).toContain("animate-pulse");
    expect(div?.className).toContain("rounded-md");
    expect(div?.className).toContain("bg-slate-800");
  });

  test("applies additional custom className props", () => {
    const { container } = render(<Skeleton className="h-4 w-32 my-2" />);
    const div = container.firstElementChild;
    expect(div?.className).toContain("animate-pulse");
    expect(div?.className).toContain("rounded-md");
    expect(div?.className).toContain("bg-slate-800");
    expect(div?.className).toContain("h-4");
    expect(div?.className).toContain("w-32");
    expect(div?.className).toContain("my-2");
  });
});
