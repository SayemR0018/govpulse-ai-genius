/// <reference types="bun-types" />
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { Folder } from "lucide-react";
import { EmptyState } from "./ui-kit";

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("renders the title correctly", () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText("No items found")).toBeDefined();
  });

  it("renders the default icon (Inbox) when no icon prop is provided", () => {
    const { container } = render(<EmptyState title="No items" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("lucide-inbox")).toBe(true);
  });

  it("renders a custom icon when specified", () => {
    const { container } = render(<EmptyState title="No files" icon={Folder} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("lucide-folder")).toBe(true);
  });

  it("renders hint text when provided", () => {
    render(<EmptyState title="No data" hint="Try adjusting your filters" />);
    expect(screen.getByText("Try adjusting your filters")).toBeDefined();
  });

  it("does not render hint element when hint is omitted", () => {
    const { container } = render(<EmptyState title="No data" />);
    const hintElement = container.querySelector(".text-xs.text-slate-500");
    expect(hintElement).toBeNull();
  });

  it("renders action React element when provided", () => {
    render(
      <EmptyState
        title="No items"
        action={<button data-testid="create-btn">Create New</button>}
      />
    );
    const button = screen.getByTestId("create-btn");
    expect(button).toBeDefined();
    expect(button.textContent).toBe("Create New");
  });

  it("does not render action node when action is omitted", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
