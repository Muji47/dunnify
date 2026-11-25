import { NextRequest, NextResponse } from "next/server";
import { sendSlackTestPing } from "@/lib/slack";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const merchant = await db.getMerchant();

    const webhookUrl =
      body.slackWebhookUrl ||
      merchant.slack_webhook_url ||
      process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "No Slack incoming webhook URL provided" },
        { status: 400 }
      );
    }

    const result = await sendSlackTestPing(webhookUrl);
    if (result.success) {
      if (body.saveUrl) {
        await db.updateMerchantSettings(merchant.id, {
          slack_webhook_url: webhookUrl,
        });
      }
      return NextResponse.json({
        success: true,
        message: "Test notification sent to Slack successfully!",
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
