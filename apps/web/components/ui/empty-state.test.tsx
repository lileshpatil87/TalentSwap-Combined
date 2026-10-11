import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(<EmptyState icon={Inbox} title="No exchanges yet" description="Browse Discover to find your first match." />);

    expect(screen.getByText("No exchanges yet")).toBeInTheDocument();
    expect(screen.getByText("Browse Discover to find your first match.")).toBeInTheDocument();
  });

  it("invokes the action callback when the action button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <EmptyState
        icon={Inbox}
        title="No exchanges yet"
        action={{ label: "Browse Discover", onClick }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Browse Discover" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("omits the action button when no action is provided", () => {
    render(<EmptyState icon={Inbox} title="No exchanges yet" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
