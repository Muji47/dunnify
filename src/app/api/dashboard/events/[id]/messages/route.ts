import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await db.getDunningMessagesForEvent(id);
    const event = await db.getRecoveryEventById(id);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
