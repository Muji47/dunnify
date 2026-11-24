import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWhatsAppDunningMessage } from "@/lib/whatsapp";

// Default fallback verify token if not configured in env
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "dunnify_meta_verify_token_2026";

/**
 * GET Handler: Meta Webhook Verification Handshake
 * Meta sends hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[Meta WhatsApp Webhook] Challenge handshake verified successfully!");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      console.warn("[Meta WhatsApp Webhook] Verification token mismatch.");
      return new Response("Forbidden", { status: 403 });
    }
  }

  return NextResponse.json({ status: "whatsapp_webhook_active" });
}

/**
 * POST Handler: Inbound Message & Delivery Receipt Processing
 * Handles delivery receipts & "STOP" / opt-out compliance
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid webhook object" }, { status: 400 });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val) continue;

        // 1. Process Delivery Status Updates (sent, delivered, read, failed)
        if (val.statuses && Array.isArray(val.statuses)) {
          for (const statusObj of val.statuses) {
            const messageId = statusObj.id;
            const status = statusObj.status; // "sent" | "delivered" | "read" | "failed"
            console.log(`[Meta Status Receipt] Message ${messageId} -> ${status}`);

            // Update in DB if matched
            const allMessages = await db.listAllMessages();
            const matchedMsg = allMessages.find((m) => m.message_id === messageId);
            if (matchedMsg) {
              const mappedStatus =
                status === "read"
                  ? "read"
                  : status === "delivered"
                  ? "delivered"
                  : status === "failed"
                  ? "failed"
                  : "sent";
              await db.updateDunningMessage(matchedMsg.id, {
                status: mappedStatus,
              });
            }
          }
        }

        // 2. Process Inbound Messages (Customer replies, "STOP", etc.)
        if (val.messages && Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            const senderPhone = msg.from; // e.g. "15550192834"
            const messageBody =
              msg.text?.body ||
              msg.button?.text ||
              msg.interactive?.button_reply?.title ||
              "";
            const cleanText = messageBody.trim().toUpperCase();

            console.log(`[Meta Inbound Message] From ${senderPhone}: "${messageBody}"`);

            // OPT-OUT RULE: STOP, UNSUBSCRIBE, CANCEL, HALT, QUIT, END
            const optOutKeywords = ["STOP", "UNSUBSCRIBE", "CANCEL", "HALT", "QUIT", "END"];
            const isOptOut = optOutKeywords.includes(cleanText);

            if (isOptOut) {
              console.log(
                `[Compliance Action] Customer ${senderPhone} requested STOP. Executing opt-out...`
              );
              const optOutResult = await db.optOutCustomerByPhone(senderPhone);
              console.log(
                `[Compliance Action] Opted out ${optOutResult.optedOutCount} event(s), cancelled ${optOutResult.cancelledMessagesCount} pending message(s).`
              );

              // Send compliant acknowledgment message back via WhatsApp
              await sendWhatsAppDunningMessage({
                recipientPhone: senderPhone,
                customerName: "Subscriber",
                amount: 0,
                currency: "USD",
                planName: "Service",
                actionUrl: "https://dunnify.com",
                stage: 1,
                invoiceId: "opt_out_ack",
                customBody:
                  "You have unsubscribed from Dunnify billing updates. We will send any future invoice notices to your email. Reply START at any time to resume WhatsApp notifications.",
              });

              continue;
            }

            // OPT-IN RESUME RULE: START, UNSTOP, RESUBSCRIBE
            if (cleanText === "START" || cleanText === "RESUBSCRIBE" || cleanText === "UNSTOP") {
              const allEvents = await db.listRecoveryEvents();
              for (const ev of allEvents) {
                if (ev.customer_phone && ev.customer_phone.includes(senderPhone)) {
                  await db.updateRecoveryEvent(ev.id, {
                    whatsapp_opted_out: false,
                    status: ev.status === "OPTED_OUT" ? "PENDING" : ev.status,
                  });
                }
              }

              await sendWhatsAppDunningMessage({
                recipientPhone: senderPhone,
                customerName: "Subscriber",
                amount: 0,
                currency: "USD",
                planName: "Service",
                actionUrl: "https://dunnify.com",
                stage: 1,
                invoiceId: "opt_in_ack",
                customBody:
                  "Welcome back! You have re-subscribed to payment recovery updates via WhatsApp.",
              });

              continue;
            }

            // General customer query handler (e.g. "What is this bill for?")
            const allEvents = await db.listRecoveryEvents();
            const matchedEvent = allEvents.find(
              (ev) => ev.customer_phone && ev.customer_phone.includes(senderPhone) && ev.status === "PENDING"
            );

            if (matchedEvent) {
              await sendWhatsAppDunningMessage({
                recipientPhone: senderPhone,
                customerName: matchedEvent.customer_name,
                amount: matchedEvent.amount,
                currency: matchedEvent.currency,
                planName: matchedEvent.plan_name,
                actionUrl: `https://dunnify.com/pay/${matchedEvent.pay_token}`,
                stage: matchedEvent.current_stage,
                invoiceId: matchedEvent.stripe_invoice_id,
                customBody: `Hi ${matchedEvent.customer_name}, we received your message. You can review your subscription invoice and securely settle in 10 seconds via Apple Pay or Card here:\nhttps://dunnify.com/pay/${matchedEvent.pay_token}\n\nReply STOP to unsubscribe.`,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "received" });
  } catch (err: any) {
    console.error("[Meta WhatsApp Webhook Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
