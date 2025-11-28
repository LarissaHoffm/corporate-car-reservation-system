import { describe, it, expect, beforeEach } from "vitest";
import { readCookie, cn } from "./utils";

describe("auth utils", () => {
  beforeEach(() => {
    // garante que podemos sobrescrever document.cookie em cada teste
    Object.defineProperty(document, "cookie", {
      value: "",
      writable: true,
      configurable: true,
    });
  });

  it("readCookie retorna valor quando o cookie existe", () => {
    document.cookie = "foo=bar; token=12345";

    expect(readCookie("token")).toBe("12345");
    expect(readCookie("foo")).toBe("bar");
  });

  it("readCookie retorna null quando o cookie não existe", () => {
    document.cookie = "foo=bar";

    expect(readCookie("inexistente")).toBeNull();
  });

  it("cn combina classes corretamente", () => {
    const result = cn("btn", "btn-primary", { disabled: true, hidden: false });

    const parts = result.split(/\s+/);

    expect(parts).toContain("btn");
    expect(parts).toContain("btn-primary");
    expect(parts).toContain("disabled");
    expect(parts).not.toContain("hidden");
  });
});
