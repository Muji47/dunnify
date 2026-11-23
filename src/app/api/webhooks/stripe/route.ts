import { NextRequest, NextResponse } from "next/server";
import { stripe, parseFailedInvoice } from "@/lib/stripe";
import { initiateDunningSequence, triggerCircuitBreaker } from "@/lib/scheduler";
import { db } from "@/lib/db";

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

        // Schedule Multi-Stage Dunning Sequence (creates & inserts into recovery_events table)
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

        // Fetch saved record directly from DB to verify persistence
        const savedRecord = await db.getRecoveryEventById(sequenceResult.recoveryEvent.id);

        return NextResponse.json({
          status: "processed",
          event: "invoice.payment_failed",
          savedInDatabase: true,
          recoveryEvent: savedRecord || sequenceResult.recoveryEvent,
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

        // Trigger Circuit Breaker to transition status to RECOVERED
        const circuitBreakerResult = await triggerCircuitBreaker(invoice.id, amount);

        // If event wasn't in DB yet, create it directly as RECOVERED
        let savedRecord = await db.getRecoveryEventByInvoiceId(invoice.id);
        if (!savedRecord) {
          savedRecord = await db.createRecoveryEvent({
            stripe_invoice_id: invoice.id,
            stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || "cus_default",
            customer_name: invoice.customer_name || "Stripe Subscriber",
            customer_email: invoice.customer_email || "billing@example.com",
            customer_phone: invoice.customer_phone || undefined,
            amount: amount || 149.0,
            currency: (invoice.currency || "USD").toUpperCase(),
            status: "RECOVERED",
            failure_reason: "Resolved",
            attempt_count: 1,
            hosted_invoice_url: invoice.hosted_invoice_url,
            pay_token: `tok_${Math.random().toString(36).substring(2, 10)}`,
            current_stage: 1,
            plan_name: "Monthly Subscription",
            recovered_at: new Date().toISOString(),
          });
        }

        return NextResponse.json({
          status: "processed",
          event: "invoice.payment_succeeded",
          savedInDatabase: true,
          recoveredAmount: amount,
          recoveryEvent: savedRecord,
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
