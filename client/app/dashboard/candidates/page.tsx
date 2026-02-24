"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardCandidatesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <p className="text-zinc-500 dark:text-zinc-400">Redirecting to dashboard…</p>
    </div>
  );
}
