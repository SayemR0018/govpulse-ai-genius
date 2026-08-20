import { describe, test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AiSpinner } from "./ui-kit";

describe("AiSpinner", () => {
  test("renders with default size of 16px and correct accessible label", () => {
    render(<AiSpinner />);

    const spinner = screen.getByLabelText("AI working");
    expect(spinner).not.toBeNull();
    expect(spinner.tagName).toBe("SPAN");
    expect(spinner.getAttribute("aria-label")).toBe("AI working");

    // CSS classes
    expect(spinner.className).toBe("inline-block animate-spin rounded-full");

    // Default size styles (16px)
    expect(spinner.style.width).toBe("16px");
    expect(spinner.style.height).toBe("16px");

    // Style properties
    expect(spinner.style.background).toBe("conic-gradient(from 0deg, transparent, #6366f1)");
    expect(spinner.style.mask).toBe("radial-gradient(circle, transparent 55%, black 56%)");
  });

  test("renders with custom size prop when provided", () => {
    render(<AiSpinner size={32} />);

    const spinner = screen.getByLabelText("AI working");
    expect(spinner).not.toBeNull();
    expect(spinner.style.width).toBe("32px");
    expect(spinner.style.height).toBe("32px");
  });

  test("renders correctly with edge case size 0", () => {
    render(<AiSpinner size={0} />);

    const spinner = screen.getByLabelText("AI working");
    expect(spinner).not.toBeNull();
    expect(spinner.style.width).toBe("0px");
    expect(spinner.style.height).toBe("0px");
  });
});
