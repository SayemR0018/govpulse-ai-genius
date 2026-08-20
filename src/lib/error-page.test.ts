import { describe, expect, it } from "bun:test";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("should return a non-empty string starting with <!doctype html>", () => {
    const html = renderErrorPage();
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("should contain fundamental HTML structure and title", () => {
    const html = renderErrorPage();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>This page didn't load</title>");
  });

  it("should match snapshot", () => {
    const html = renderErrorPage();
    expect(html).toMatchSnapshot();
  });
});
