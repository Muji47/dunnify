import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledMessages } from "@/lib/scheduler";
import { db, DunningStage } from "@/lib/db";
import { sendWhatsAppDunningMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId, stage } = body as { eventId?: string; stage?: DunningStage };

    // If specific event and stage passed (e.g. from QStash delivery)
    if (eventId && stage) {
      const event = await db.getRecoveryEventById(eventId);
      if (!event) {
        return NextResponse.json({ error: "Recovery event not found" }, { status: 404 });
      }

      // Circuit Breaker check: don't dispatch if already recovered
      if (event.status === "RECOVERED") {
        return NextResponse.json({
          status: "circuit_breaker_active",
          message: "Event already recovered. Message cancelled.",
        });
      }

      const actionUrl = `https://dunnify.com/pay/${event.pay_token}`;
      const dispatchResult = await sendWhatsAppDunningMessage({
        recipientPhone: event.customer_phone || "+1 (555) 019-2834",
        customerName: event.customer_name,
        amount: event.amount,
        currency: event.currency,
        planName: event.plan_name,
        actionUrl,
        stage,
        invoiceId: event.stripe_invoice_id,
      });

      await db.createDunningMessage({
        recovery_event_id: event.id,
        stage,
        channel: "whatsapp",
        recipient: event.customer_phone || "Customer",
        status: dispatchResult.success ? "delivered" : "failed",
        message_id: dispatchResult.messageId,
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        body: dispatchResult.body,
        action_url: actionUrl,
        error_message: dispatchResult.error,
      });

      await db.updateRecoveryEvent(event.id, { current_stage: stage });

      return NextResponse.json({
        status: "dispatched",
        eventId,
        stage,
        dispatchResult,
      });
    }

    // Otherwise, process all pending messages that are due
    const result = await processDueScheduledMessages();
    return NextResponse.json({
      status: "batch_processed",
      processedCount: result.processedCount,
      results: result.results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const allMessages = await db.listAllMessages();
  const scheduled = allMessages.filter((m) => m.status === "scheduled");
  return NextResponse.json({
    status: "ok",
    scheduledMessagesCount: scheduled.length,
    scheduled,
  });
}
