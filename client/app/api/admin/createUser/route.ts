import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user: caller },
    error: userError,
  } = await anon.auth.getUser(token);
  if (userError || !caller) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing service role key" },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    email?: string;
    password?: string;
    role?: string;
    organization_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, role, organization_id } = body;
  if (!email || !password || !role || !organization_id) {
    return NextResponse.json(
      { error: "Missing email, password, role, or organization_id" },
      { status: 400 }
    );
  }
  if (!["admin", "customer"].includes(role)) {
    return NextResponse.json(
      { error: "role must be admin or customer" },
      { status: 400 }
    );
  }

  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

  if (createError) {
    return NextResponse.json(
      { error: createError.message },
      { status: 400 }
    );
  }
  if (!newUser.user) {
    return NextResponse.json(
      { error: "User creation failed" },
      { status: 500 }
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUser.user.id,
    organization_id: organization_id.trim(),
    role,
  });

  if (profileError) {
    return NextResponse.json(
      {
        error:
          "User created but profile failed: " + profileError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    id: newUser.user.id,
    email: newUser.user.email,
  });
}
