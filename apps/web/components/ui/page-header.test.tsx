import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/ui/page-header";

describe("PageHeader", () => {
  it("renders the title as a heading", () => {
    render(<PageHeader title="Wallet" />);

    expect(screen.getByRole("heading", { name: "Wallet" })).toBeInTheDocument();
  });

  it("omits the description paragraph when none is provided", () => {
    const { container } = render(<PageHeader title="Wallet" />);

    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Wallet" description="Your balance and history." />);

    expect(screen.getByText("Your balance and history.")).toBeInTheDocument();
  });

  it("renders actions content when provided", () => {
    render(<PageHeader title="Wallet" actions={<button type="button">Add funds</button>} />);

    expect(screen.getByRole("button", { name: "Add funds" })).toBeInTheDocument();
  });
});
