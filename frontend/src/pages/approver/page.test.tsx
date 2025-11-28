import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ApproverPage from "./page";

describe("ApproverPage", () => {
  it("renderiza a página do Approver sem quebrar", () => {
    const { container } = render(
      <MemoryRouter>
        <ApproverPage />
      </MemoryRouter>
    );

    expect(container).toBeTruthy();
  });
});
