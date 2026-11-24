import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const merchant = await db.getMerchant();

    const restrictedKey =
      body.stripeRestrictedKey ||
      merchant.stripe_restricted_key ||
      process.env.STRIPE_SECRET_KEY;

    if (!restrictedKey || restrictedKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a Stripe Restricted Key (rk_live_... or rk_test_...)",
        },
        { status: 400 }
      );
    }

    const trimmedKey = restrictedKey.trim();

    // Support simulated sandbox testing key
    if (trimmedKey === "rk_test_dunnify_demo" || trimmedKey.startsWith("rk_mock_")) {
      return NextResponse.json({
        success: true,
        status: "connected",
        mode: "test",
        message: "Stripe connection verified successfully (Sandbox Simulation Mode).",
        verifiedAt: new Date().toISOString(),
      });
    }

    // Live Stripe API Verification
    try {
      const stripe = new Stripe(trimmedKey, {
        apiVersion: "2025-02-24.acacia" as any,
      });

      // Test read-only permission for invoices
      const invoiceTest = await stripe.invoices.list({ limit: 1 });
      const isLiveMode = trimmedKey.startsWith("rk_live_") || trimmedKey.startsWith("sk_live_");

      // Save verified key to merchant if requested
      if (body.saveKey) {
        await db.updateMerchantSettings(merchant.id, {
          stripe_restricted_key: trimmedKey,
          stripe_webhook_secret: body.stripeWebhookSecret || merchant.stripe_webhook_secret,
        });
      }

      return NextResponse.json({
        success: true,
        status: "connected",
        mode: isLiveMode ? "live" : "test",
        message: `Stripe connection verified successfully! Read access confirmed for ${isLiveMode ? "Production (Live)" : "Sandbox (Test)"}.`,
        sampleInvoiceCount: invoiceTest.data.length,
        verifiedAt: new Date().toISOString(),
      });
    } catch (stripeErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: stripeErr.message || "Failed to authenticate with Stripe using provided key.",
          code: stripeErr.code,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
