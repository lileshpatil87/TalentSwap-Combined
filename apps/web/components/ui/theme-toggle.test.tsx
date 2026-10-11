import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";

import { ThemeToggle } from "@/components/ui/theme-toggle";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.Mock;

describe("ThemeToggle", () => {
  it("calls setTheme with the selected option", async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ theme: "system", setTheme });
    const user = userEvent.setup();

    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: /toggle theme/i }));
    await user.click(await screen.findByRole("menuitem", { name: /dark/i }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
