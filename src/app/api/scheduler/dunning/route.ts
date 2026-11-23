import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledMessages } from "@/lib/scheduler";
import { db, DunningStage } from "@/lib/db";
import { sendWhatsAppDunningMessage } from "@/lib/whatsapp";
import { qstashReceiver } from "@/lib/qstash";

export async function POST(req: NextRequest) {
  try {
    // 1. Signature Verification for Upstash QStash (if configured)
    const signature = req.headers.get("upstash-signature");
    const rawBodyText = await req.text();

    if (signature && qstashReceiver) {
      try {
        const url = req.url;
        await qstashReceiver.verify({
          signature,
          body: rawBodyText,
          url,
        });
        console.log("[QStash Inbound] Verified signature successfully.");
      } catch (err: any) {
        console.error("[QStash Signature Error] Invalid signature:", err.message);
        return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
      }
    }

    // 2. Cron Secret Check (for Vercel Cron jobs)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader && !authHeader.includes(cronSecret) && !signature) {
      console.warn("[Scheduler Inbound] Unauthorized cron request attempt.");
    }

    // Parse payload
    let body: any = {};
    if (rawBodyText) {
      try {
        body = JSON.parse(rawBodyText);
      } catch {
        // empty body
      }
    }

    const { eventId, stage, dunningMessageId, advanceHours } = body as {
      eventId?: string;
      stage?: DunningStage;
      dunningMessageId?: string;
      advanceHours?: number;
    };

    // Mode A: Time-Machine Simulation (Advances scheduled messages by X hours for instant testing)
    if (advanceHours && advanceHours > 0) {
      const allMessages = await db.listAllMessages();
      const cutoffTime = new Date(Date.now() + advanceHours * 3600 * 1000);
      let acceleratedCount = 0;

      for (const msg of allMessages) {
        if (msg.status === "scheduled" && new Date(msg.scheduled_for) <= cutoffTime) {
          await db.updateDunningMessage(msg.id, {
            scheduled_for: new Date(Date.now() - 1000).toISOString(),
          });
          acceleratedCount++;
        }
      }

      const processResult = await processDueScheduledMessages();
      return NextResponse.json({
        status: "time_machine_advanced",
        advanceHours,
        acceleratedCount,
        processedCount: processResult.processedCount,
        results: processResult.results,
      });
    }

    // Mode B: Targeted Single Message Dispatch (from QStash delayed job)
    if (eventId && stage) {
      const event = await db.getRecoveryEventById(eventId);
      if (!event) {
        return NextResponse.json({ error: "Recovery event not found" }, { status: 404 });
      }

      // Circuit Breaker check: don't dispatch if already recovered
      if (event.status === "RECOVERED") {
        if (dunningMessageId) {
          await db.updateDunningMessage(dunningMessageId, { status: "cancelled" });
        }
        return NextResponse.json({
          status: "circuit_breaker_active",
          message: "Event already recovered. Message cancelled via Circuit Breaker.",
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

      const messageStatus = dispatchResult.success ? "delivered" : "failed";

      if (dunningMessageId) {
        await db.updateDunningMessage(dunningMessageId, {
          status: messageStatus,
          sent_at: new Date().toISOString(),
          message_id: dispatchResult.messageId,
          error_message: dispatchResult.error,
        });
      } else {
        await db.createDunningMessage({
          recovery_event_id: event.id,
          stage,
          channel: "whatsapp",
          recipient: event.customer_phone || "Customer",
          status: messageStatus,
          message_id: dispatchResult.messageId,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          body: dispatchResult.body,
          action_url: actionUrl,
          error_message: dispatchResult.error,
        });
      }

      await db.updateRecoveryEvent(event.id, { current_stage: stage });

      return NextResponse.json({
        status: "dispatched",
        eventId,
        stage,
        dispatchResult,
      });
    }

    // Mode C: General Sweeper (Processes all due scheduled messages)
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "status") {
    const allMessages = await db.listAllMessages();
    const scheduled = allMessages.filter((m) => m.status === "scheduled");
    return NextResponse.json({
      status: "ok",
      scheduledMessagesCount: scheduled.length,
      scheduled,
    });
  }

  // Cron authorization check (if CRON_SECRET configured)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Scheduler GET Cron] Unauthorized cron request attempt.");
  }

  try {
    const result = await processDueScheduledMessages();
    return NextResponse.json({
      status: "batch_processed_via_cron",
      processedCount: result.processedCount,
      results: result.results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
