"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NavbarProps = {
  email: string;
  role: string;
};

export function Navbar({ email, role }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/"
          className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Mini-ATS
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>|</span>
        <Link
          href="/dashboard"
          className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Dashboard
        </Link>
        {role === "admin" && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>|</span>
            <Link
              href="/admin"
              className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Admin
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          {email}
        </span>
        <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
          {role}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
