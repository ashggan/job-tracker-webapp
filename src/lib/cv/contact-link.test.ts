import { describe, it, expect } from "vitest";
import { classifyContactLink } from "./contact-link";

describe("classifyContactLink", () => {
  it("classifies an email as a mailto link", () => {
    expect(classifyContactLink("jane@example.com")).toEqual({
      href: "mailto:jane@example.com",
      text: "jane@example.com",
    });
  });

  it("classifies a bare domain path as an https link", () => {
    expect(classifyContactLink("github.com/janedoe")).toEqual({
      href: "https://github.com/janedoe",
      text: "github.com/janedoe",
    });
  });

  it("leaves a full https URL's href as-is", () => {
    expect(classifyContactLink("https://linkedin.com/in/janedoe")).toEqual({
      href: "https://linkedin.com/in/janedoe",
      text: "https://linkedin.com/in/janedoe",
    });
  });

  it("does not classify a location as a link", () => {
    expect(classifyContactLink("San Francisco, CA")).toBeNull();
  });

  it("does not classify a phone number as a link", () => {
    expect(classifyContactLink("+1 555 123 4567")).toBeNull();
  });
});
