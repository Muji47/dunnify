import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const updates = await req.json();
    const merchant = await db.getMerchant();
    const updated = await db.updateMerchantSettings(merchant.id, updates);
    return NextResponse.json({ success: true, merchant: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
