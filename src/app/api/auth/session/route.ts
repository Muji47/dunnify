import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const isDemo = cookieStore.get("dunnify_demo_session")?.value === "true";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let merchant = await db.getMerchantByEmail(user.email || "");
      if (!merchant) {
        merchant = await db.getMerchant("00000000-0000-0000-0000-000000000001");
      }
      return NextResponse.json({
        authenticated: true,
        user,
        merchant,
        isDemo: false,
      });
    }

    if (isDemo) {
      const defaultMerchant = await db.getMerchant("00000000-0000-0000-0000-000000000001");
      return NextResponse.json({
        authenticated: true,
        user: {
          id: defaultMerchant.id,
          email: defaultMerchant.email,
          user_metadata: {
            name: defaultMerchant.name,
            company_name: defaultMerchant.company_name,
            plan_tier: defaultMerchant.plan_tier,
          },
        },
        merchant: defaultMerchant,
        isDemo: true,
      });
    }

    return NextResponse.json({ authenticated: false, user: null, merchant: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
