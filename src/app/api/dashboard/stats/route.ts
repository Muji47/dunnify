import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const kpis = await db.getDashboardKPIs();
    const events = await db.listRecoveryEvents();
    const merchant = await db.getMerchant();
    const allMessages = await db.listAllMessages();

    return NextResponse.json({
      kpis,
      events,
      merchant,
      scheduledMessagesCount: allMessages.filter((m) => m.status === "scheduled").length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
