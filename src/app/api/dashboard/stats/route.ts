import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let merchant = null;
    if (user?.email) {
      merchant = await db.getMerchantByEmail(user.email);
    }
    if (!merchant) {
      merchant = await db.getMerchant();
    }

    const kpis = await db.getDashboardKPIs();
    const events = await db.listRecoveryEvents();
    const allMessages = await db.listAllMessages();

    return NextResponse.json({
      kpis,
      events,
      merchant,
      user: user || null,
      scheduledMessagesCount: allMessages.filter((m) => m.status === "scheduled").length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
