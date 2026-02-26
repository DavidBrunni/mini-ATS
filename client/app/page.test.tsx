import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  },
}));

describe("Home", () => {
  it("shows Mini-ATS title", async () => {
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "Mini-ATS" })).toBeInTheDocument();
  });

  it("shows Login and Admin links when not logged in", async () => {
    render(<Home />);
    await screen.findByRole("heading", { name: "Mini-ATS" });
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("shows tagline", async () => {
    render(<Home />);
    await screen.findByRole("heading", { name: "Mini-ATS" });
    expect(screen.getByText(/Track and manage candidates easily/i)).toBeInTheDocument();
  });
});
