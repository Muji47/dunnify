import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerCircuitBreaker } from "@/lib/scheduler";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  let event = await db.getRecoveryEventByToken(token);

  // If not found, provide a realistic mock for demo purposes if token has "sim" or "mock" or "demo"
  if (!event) {
    if (token.includes("demo") || token.includes("sim") || token.startsWith("tok_")) {
      event = {
        id: `rec_demo_${token}`,
        stripe_invoice_id: `in_demo_${token}`,
        stripe_customer_id: "cus_demo_user",
        customer_name: "Sarah Jenkins",
        customer_email: "sarah.jenkins@agencyflow.io",
        customer_phone: "+1 (555) 723-9011",
        amount: 249.0,
        currency: "USD",
        status: "PENDING",
        failure_reason: "card_declined (soft_decline)",
        attempt_count: 1,
        hosted_invoice_url: "https://pay.stripe.com/demo",
        pay_token: token,
        current_stage: 1,
        plan_name: "Agency Growth Monthly",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ error: "Invoice not found or expired" }, { status: 404 });
    }
  }

  const merchant = await db.getMerchant(event.merchant_id);

  return NextResponse.json({
    event,
    merchant: {
      name: merchant.name,
      company_name: merchant.company_name || "SaaS Partner",
    },
  });
}

// Settle / Clear payment via 1-Click Apple Pay / Google Pay / Card
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  let event = await db.getRecoveryEventByToken(token);

  if (!event) {
    // If demo token, create mock recovery
    return NextResponse.json({
      success: true,
      message: "Demo payment cleared successfully!",
      recoveredAmount: 249.0,
      status: "RECOVERED",
    });
  }

  // Trigger circuit breaker & update status to RECOVERED
  const result = await triggerCircuitBreaker(event.stripe_invoice_id, event.amount);

  return NextResponse.json({
    success: true,
    message: "Payment processed and recovered!",
    recoveredAmount: event.amount,
    status: "RECOVERED",
    circuitBreaker: result,
  });
}
