import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isDemo } = body;

    const cookieStore = await cookies();

    // 1-Click Founder Demo Login
    if (isDemo) {
      cookieStore.set("dunnify_demo_session", "true", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      const founder = await db.getMerchant("00000000-0000-0000-0000-000000000001");
      return NextResponse.json({
        success: true,
        isDemo: true,
        merchant: founder,
      });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Resolve or sync merchant record
    let merchant = await db.getMerchantByEmail(email);
    if (!merchant && data.user) {
      merchant = await db.createMerchant({
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.user_metadata?.name || email.split("@")[0],
        company_name: data.user.user_metadata?.company_name || "SaaS Company",
        plan_tier: data.user.user_metadata?.plan_tier || "growth",
      });
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      merchant,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
