import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, companyName, planTier } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and founder name are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          company_name: companyName || `${name}'s Company`,
          plan_tier: planTier || "growth",
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Provision multi-tenant merchant record in database
    const merchant = await db.createMerchant({
      id: data.user?.id,
      email,
      name,
      company_name: companyName || `${name}'s Company`,
      plan_tier: planTier || "growth",
    });

    // Automatically set active demo cookie if email confirmation is enabled on Supabase project
    const cookieStore = await cookies();
    cookieStore.set("dunnify_demo_session", "true", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      user: data.user,
      merchant,
      session: data.session,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Signup failed" },
      { status: 500 }
    );
  }
}
