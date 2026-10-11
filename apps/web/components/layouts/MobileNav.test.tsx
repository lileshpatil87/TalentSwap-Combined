import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home, Wallet as WalletIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/layouts/MobileNav";
import type { NavItem } from "@/lib/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const mockedUsePathname = usePathname as jest.Mock;

const items: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: Home, module: "dashboard-shell" },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: WalletIcon, module: "wallet" },
];

describe("MobileNav", () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue("/dashboard");
  });

  it("is closed until the trigger is activated", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={items} homeHref="/dashboard" />);

    expect(screen.queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(await screen.findByRole("link", { name: "Wallet" })).toBeInTheDocument();
  });

  it("closes the drawer after a nav link is selected", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={items} homeHref="/dashboard" />);

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
    await user.click(await screen.findByRole("link", { name: "Wallet" }));

    expect(screen.queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
  });
});
