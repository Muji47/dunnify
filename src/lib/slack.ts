import { db } from "./db";

export interface SlackRecoveryPayload {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  planName?: string;
  paymentMethod?: string;
  payToken?: string;
  merchantId?: string;
  recoveredAt?: string;
}

export interface SlackFailedPayload {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  planName?: string;
  failureReason?: string;
  channelUsed: "whatsapp" | "email";
  stage: number;
  payToken?: string;
  merchantId?: string;
}

async function getSlackWebhookUrl(merchantId?: string): Promise<string | null> {
  if (merchantId) {
    const merchant = await db.getMerchant(merchantId);
    if (merchant.slack_webhook_url) return merchant.slack_webhook_url;
  }
  const defaultMerchant = await db.getMerchant();
  return (
    defaultMerchant.slack_webhook_url ||
    process.env.SLACK_WEBHOOK_URL ||
    null
  );
}

/**
 * Fires a celebration alert into the merchant's Slack channel upon payment recovery.
 */
export async function notifySlackPaymentRecovered(
  payload: SlackRecoveryPayload
): Promise<boolean> {
  const webhookUrl = await getSlackWebhookUrl(payload.merchantId);
  if (!webhookUrl) return false;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payload.currency || "USD",
  }).format(payload.amount);

  const retainedARR = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payload.currency || "USD",
  }).format(payload.amount * 12);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dunnify.vercel.app";
  const method = payload.paymentMethod === "apple_pay" ? " Apple Pay" : payload.paymentMethod === "google_pay" ? "Google Pay" : "Card Checkout";

  const message = {
    text: `🎉 *Payment Recovered!* ${formattedAmount} from ${payload.customerName} via ${method}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🎉 Payment Recovered: ${formattedAmount}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Customer:*\n${payload.customerName} (${payload.customerEmail})`,
          },
          {
            type: "mrkdwn",
            text: `*Plan:*\n${payload.planName || "Subscription"}`,
          },
          {
            type: "mrkdwn",
            text: `*Payment Method:*\n1-Click ${method}`,
          },
          {
            type: "mrkdwn",
            text: `*Retained Annual ARR:*\n*+${retainedARR}/yr* 🚀`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Live Dashboard ↗",
              emoji: true,
            },
            url: `${appUrl}/dashboard`,
            style: "primary",
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch (err) {
    console.warn("[Slack Webhook Error]", err);
    return false;
  }
}

/**
 * Fires an alert into Slack when an invoice declines and dunning starts.
 */
export async function notifySlackPaymentFailed(
  payload: SlackFailedPayload
): Promise<boolean> {
  const webhookUrl = await getSlackWebhookUrl(payload.merchantId);
  if (!webhookUrl) return false;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payload.currency || "USD",
  }).format(payload.amount);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dunnify.vercel.app";
  const payUrl = payload.payToken ? `${appUrl}/pay/${payload.payToken}` : appUrl;

  const message = {
    text: `⚠️ *Payment Declined:* ${formattedAmount} for ${payload.customerName}. Dunning sequence initiated.`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `⚠️ Invoice Declined: ${formattedAmount}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Customer:*\n${payload.customerName}`,
          },
          {
            type: "mrkdwn",
            text: `*Plan:*\n${payload.planName || "Monthly Subscription"}`,
          },
          {
            type: "mrkdwn",
            text: `*Reason:*\n${payload.failureReason || "Soft decline"}`,
          },
          {
            type: "mrkdwn",
            text: `*Immediate Action:*\n${payload.channelUsed === "whatsapp" ? "📱 WhatsApp Nudge (<60s)" : "✉️ Emergency Email Nudge"}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Preview 1-Click Pay Page ↗",
              emoji: true,
            },
            url: payUrl,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch (err) {
    console.warn("[Slack Webhook Error]", err);
    return false;
  }
}

/**
 * Test handshake ping for Settings modal
 */
export async function sendSlackTestPing(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "⚡ *Dunnify Slack Integration Active!* Your payment recovery channel is connected and ready to receive real-time recovery alerts.",
      }),
    });
    if (res.ok) {
      return { success: true };
    }
    const text = await res.text();
    return { success: false, error: text || "Slack returned an error status." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
