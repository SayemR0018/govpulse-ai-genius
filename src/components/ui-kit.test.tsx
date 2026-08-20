import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow({
  url: "http://localhost:3000",
});

Object.assign(globalThis, {
  window,
  document: window.document,
  Document: window.Document,
  HTMLElement: window.HTMLElement,
  HTMLAnchorElement: window.HTMLAnchorElement,
  HTMLButtonElement: window.HTMLButtonElement,
  HTMLDivElement: window.HTMLDivElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLSpanElement: window.HTMLSpanElement,
  Node: window.Node,
  Text: window.Text,
  Element: window.Element,
  SVGElement: window.SVGElement,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  navigator: window.navigator,
  getComputedStyle: window.getComputedStyle.bind(window),
});

// Import testing-library after setting up DOM globals
const { render, screen, cleanup } = await import("@testing-library/react");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - bun:test module is provided by Bun runtime
const { describe, expect, it, afterEach } = await import("bun:test");
const { Avatar } = await import("./ui-kit");

describe("Avatar component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the uppercase initial of a simple name", () => {
    render(<Avatar name="john" />);
    expect(screen.getByText("J")).toBeTruthy();
  });

  it("renders the uppercase initial of a multi-word name", () => {
    render(<Avatar name="Alice Smith" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("handles single-character names correctly", () => {
    render(<Avatar name="z" />);
    expect(screen.getByText("Z")).toBeTruthy();
  });

  it("handles names with leading and trailing whitespace", () => {
    render(<Avatar name="   bob   " />);
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("renders fallback character '?' when name is an empty string", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("renders fallback character '?' when name contains only whitespace", () => {
    render(<Avatar name="   " />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("renders fallback character '?' when name is null or undefined", () => {
    // @ts-expect-error testing runtime robustness with null/undefined
    const { unmount } = render(<Avatar name={null} />);
    expect(screen.getByText("?")).toBeTruthy();
    unmount();

    // @ts-expect-error testing runtime robustness with null/undefined
    render(<Avatar name={undefined} />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("handles special characters and numbers correctly", () => {
    render(<Avatar name="123" />);
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("handles symbols in name", () => {
    render(<Avatar name="@user" />);
    expect(screen.getByText("@")).toBeTruthy();
  });

  it("applies the expected CSS styling classes", () => {
    render(<Avatar name="Test User" />);
    const avatarSpan = screen.getByText("T");
    expect(avatarSpan.className).toContain("flex");
    expect(avatarSpan.className).toContain("h-6");
    expect(avatarSpan.className).toContain("w-6");
    expect(avatarSpan.className).toContain("rounded-full");
    expect(avatarSpan.className).toContain("bg-indigo-600/30");
    expect(avatarSpan.className).toContain("text-indigo-300");
  });
});
