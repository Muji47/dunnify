import { NextRequest, NextResponse } from "next/server";
import { stripe, parseFailedInvoice } from "@/lib/stripe";
import { initiateDunningSequence, triggerCircuitBreaker } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (webhookSecret && signature && stripe) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error(`[Dunnify] Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // In development, testing, or simulation mode, parse the body directly
      try {
        event = JSON.parse(body);
      } catch (err) {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    }

    console.log(`[Dunnify Webhook Ingestion] Stripe Event: ${event.type}`);

    switch (event.type) {
      case "invoice.payment_failed": {
        const invoice = event.data?.object || event.invoice || event;
        const payload = parseFailedInvoice(invoice);

        console.log(
          `[Dunnify Alert] Payment failed for ${payload.customerName} (${payload.customerEmail}): ${payload.amount} ${payload.currency}`
        );

        // Schedule Multi-Stage Dunning Sequence (Stage 1 Instant / Quiet Hours + Stages 2 & 3)
        const sequenceResult = await initiateDunningSequence({
          stripeInvoiceId: payload.invoiceId,
          stripeCustomerId: payload.customerId,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone,
          amount: payload.amount,
          currency: payload.currency,
          failureReason: payload.failureReason,
          hostedInvoiceUrl: payload.hostedInvoiceUrl,
          planName: payload.planName,
        });

        // Respond with 200 OK within 2 seconds
        return NextResponse.json({
          status: "processed",
          event: "invoice.payment_failed",
          recoveryEventId: sequenceResult.recoveryEvent.id,
          recoveryStatus: sequenceResult.recoveryEvent.status,
          channelUsed: sequenceResult.channelUsed,
          stage1Dispatched: sequenceResult.stage1Dispatched,
          stagesScheduled: sequenceResult.stagesScheduled,
          dispatchResult: sequenceResult.dispatchResult,
        });
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data?.object || event.invoice || event;
        const amount = invoice.amount_paid
          ? invoice.amount_paid / 100
          : invoice.amount_due
          ? invoice.amount_due / 100
          : undefined;

        console.log(
          `[Dunnify Success] Payment succeeded for invoice ${invoice.id}: +$${amount || 0} RECOVERED!`
        );

        // Trigger Circuit Breaker to auto-cancel pending Stage 2 & 3 reminders
        const circuitBreakerResult = await triggerCircuitBreaker(invoice.id, amount);

        return NextResponse.json({
          status: "processed",
          event: "invoice.payment_succeeded",
          recoveredAmount: amount,
          circuitBreaker: circuitBreakerResult,
        });
      }

      default:
        return NextResponse.json({ status: "ignored", eventType: event.type });
    }
  } catch (error: any) {
    console.error("[Dunnify Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
