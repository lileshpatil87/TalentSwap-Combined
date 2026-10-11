import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home, Wallet as WalletIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layouts/Sidebar";
import type { NavItem } from "@/lib/navigation";
import { useUiStore } from "@/store/uiStore";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const mockedUsePathname = usePathname as jest.Mock;

const items: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: Home, module: "dashboard-shell" },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: WalletIcon, module: "wallet", comingSoon: true },
];

describe("Sidebar", () => {
  beforeEach(() => {
    useUiStore.setState({ isSidebarCollapsed: false });
    mockedUsePathname.mockReturnValue("/wallet");
  });

  it("marks the nav item matching the current route as the current page", () => {
    render(<Sidebar items={items} homeHref="/dashboard" />);

    expect(screen.getByRole("link", { name: /wallet/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("shows a 'Soon' badge for items still marked comingSoon", () => {
    render(<Sidebar items={items} homeHref="/dashboard" />);

    expect(screen.getByText("Soon")).toBeInTheDocument();
  });

  it("toggles the collapsed state in the shared UI store when the collapse button is clicked", async () => {
    const user = userEvent.setup();
    render(<Sidebar items={items} homeHref="/dashboard" />);

    expect(useUiStore.getState().isSidebarCollapsed).toBe(false);

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));

    expect(useUiStore.getState().isSidebarCollapsed).toBe(true);
  });

  it("renders a back link when backHref is provided (admin usage)", () => {
    render(<Sidebar items={items} homeHref="/admin" backHref="/dashboard" backLabel="Back to Dashboard" />);

    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
