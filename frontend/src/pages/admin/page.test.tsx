import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AdminPage from "./page";

describe("AdminPage", () => {
  it("renderiza a página do Admin sem quebrar", () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    // smoke test: se renderizou sem erro, já conta para coverage
    expect(container).toBeTruthy();
  });
});
