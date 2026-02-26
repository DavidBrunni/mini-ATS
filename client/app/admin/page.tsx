"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Navbar } from "../components/Navbar";

type Organization = { id: string; name: string };

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "customer">("customer");
  const [organizationId, setOrganizationId] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setAccessError(profileError?.message ?? "Profile not found");
        setAllowed(false);
      } else if (profile.role !== "admin") {
        setAccessError("Access denied. Admin only.");
        setAllowed(false);
      } else {
        setUserEmail(user.email ?? "");
        setUserRole(profile.role ?? "admin");
        setAllowed(true);
      }
      setLoading(false);
    }
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (!allowed) return;

    async function fetchOrganizations() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setOrganizationsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/organizations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setOrganizationsLoading(false);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setOrganizationId(data[0].id);
        }
      }
    }
    fetchOrganizations();
  }, [allowed]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSubmitError("Not signed in");
      setSubmitLoading(false);
      return;
    }

    const res = await fetch("/api/admin/createUser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        role,
        organization_id: organizationId.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSubmitLoading(false);

    if (!res.ok) {
      setSubmitError(data.error ?? res.statusText ?? "Request failed");
      return;
    }

    setSubmitSuccess(data.email ? `User created: ${data.email}` : "User created.");
    setEmail("");
    setPassword("");
    if (organizations.length > 0) {
      setOrganizationId(organizations[0].id);
    } else {
      setOrganizationId("");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            ← Back to home
          </Link>
          <p className="mt-4 text-red-600 dark:text-red-400">
            {accessError ?? "Access denied"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar email={userEmail} role={userRole} />
      <div className="mx-auto max-w-md p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Admin – Create user
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label
              htmlFor="admin-role"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Role
            </label>
            <select
              id="admin-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "customer")}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Organization
            </label>
            {organizationsLoading ? (
              <p className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                Loading…
              </p>
            ) : organizations.length > 0 ? (
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="text"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  required
                  placeholder="Organization UUID"
                  autoComplete="off"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  No organizations in database. Enter an organization ID (UUID).
                </p>
              </>
            )}
          </div>
          {submitError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {submitError}
            </p>
          )}
          {submitSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400" role="status">
              {submitSuccess}
            </p>
          )}
          <button
            type="submit"
            disabled={submitLoading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitLoading ? "Creating…" : "Create user"}
          </button>
        </form>
      </div>
    </div>
  );
}
