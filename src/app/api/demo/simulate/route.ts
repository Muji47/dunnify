import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppDunningAlert } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const { customerName, amount, currency, phone, planName } = await req.json();

    const mockPayload = {
      invoiceId: `in_sim_${Math.random().toString(36).substring(2, 9)}`,
      customerId: `cus_sim_${Math.random().toString(36).substring(2, 9)}`,
      customerName: customerName || "Alex Sterling",
      customerEmail: "alex@sterlinggrowth.io",
      customerPhone: phone || "+1 (555) 438-9201",
      amount: amount || 149,
      currency: currency || "USD",
      hostedInvoiceUrl: `https://pay.stripe.com/invoice/mock_${Date.now()}`,
      attemptCount: 1,
      failureReason: "Card expired / Soft decline",
    };

    const dispatchResult = await sendWhatsAppDunningAlert(mockPayload);

    return NextResponse.json({
      success: true,
      event: "invoice.payment_failed",
      payload: mockPayload,
      dispatchResult,
      planName: planName || "SaaS Pro Monthly",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
