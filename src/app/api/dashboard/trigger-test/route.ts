import { NextRequest, NextResponse } from "next/server";
import { initiateDunningSequence } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      amount,
      planName,
      failureReason,
    } = body;

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const invoiceId = `in_test_${randomSuffix}`;
    const customerId = `cus_test_${randomSuffix}`;

    const sequenceResult = await initiateDunningSequence({
      stripeInvoiceId: invoiceId,
      stripeCustomerId: customerId,
      customerName: customerName || "Alex Sterling",
      customerEmail: customerEmail || "alex@sterlinggrowth.io",
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      amount: Number(amount) || 249.0,
      currency: "USD",
      planName: planName || "SaaS Growth Monthly",
      failureReason: failureReason || "Card expired / soft decline",
      hostedInvoiceUrl: `https://pay.stripe.com/invoice/${invoiceId}`,
    });

    return NextResponse.json({
      success: true,
      event: sequenceResult.recoveryEvent,
      channelUsed: sequenceResult.channelUsed,
      stage1Dispatched: sequenceResult.stage1Dispatched,
      stagesScheduled: sequenceResult.stagesScheduled,
      dispatchResult: sequenceResult.dispatchResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
