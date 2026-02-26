import { render, screen } from "@testing-library/react";
import { Navbar } from "@/app/components/Navbar";

jest.mock("@/app/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light" as const, toggleTheme: jest.fn() }),
}));

jest.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));

describe("Navbar", () => {
  it("renders Mini-ATS and Dashboard links", () => {
    render(<Navbar email="user@test.com" role="customer" />);
    expect(screen.getByRole("link", { name: "Mini-ATS" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("shows email and role", () => {
    render(<Navbar email="admin@test.com" role="admin" />);
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows Admin link when role is admin", () => {
    render(<Navbar email="a@b.com" role="admin" />);
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("does not show Admin link when role is customer", () => {
    render(<Navbar email="a@b.com" role="customer" />);
    const links = screen.getAllByRole("link");
    const adminLinks = links.filter((l) => l.textContent === "Admin");
    expect(adminLinks).toHaveLength(0);
  });

  it("has Log out button", () => {
    render(<Navbar email="x@y.com" role="customer" />);
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });
});
