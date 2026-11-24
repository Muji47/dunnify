import { DunningStage } from "./db";

export interface SendWhatsAppOptions {
  recipientPhone: string;
  customerName: string;
  amount: number;
  currency: string;
  planName?: string;
  actionUrl: string;
  stage: DunningStage;
  invoiceId: string;
  customBody?: string;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: "production" | "sandbox_simulation";
  recipient: string;
  body: string;
  actionUrl: string;
  stage: DunningStage;
  scheduledDispatchTime?: string;
}

/**
 * Checks if the current or target time falls within quiet hours (default: 10:00 PM - 8:00 AM).
 * If in quiet hours, returns the next allowed 8:30 AM delivery timestamp.
 */
export function calculateDeliveryTime(
  quietHoursEnabled: boolean = true,
  startHourStr: string = "22:00",
  endHourStr: string = "08:00",
  baseDate: Date = new Date()
): { isQuietHours: boolean; scheduledTime: Date } {
  if (!quietHoursEnabled) {
    return { isQuietHours: false, scheduledTime: baseDate };
  }

  const currentHour = baseDate.getHours();
  const currentMinute = baseDate.getMinutes();
  const currentDecimalTime = currentHour + currentMinute / 60;

  const [startH] = startHourStr.split(":").map(Number);
  const [endH] = endHourStr.split(":").map(Number);

  // Quiet hours cross midnight: e.g. 22:00 to 08:00
  const inQuietHours =
    startH > endH
      ? currentDecimalTime >= startH || currentDecimalTime < endH
      : currentDecimalTime >= startH && currentDecimalTime < endH;

  if (inQuietHours) {
    const scheduled = new Date(baseDate);
    // If before endH (e.g. 3 AM), deliver today at 8:30 AM
    // If after startH (e.g. 11 PM), deliver tomorrow at 8:30 AM
    if (currentDecimalTime >= startH) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    scheduled.setHours(endH, 30, 0, 0); // 8:30 AM
    return { isQuietHours: true, scheduledTime: scheduled };
  }

  return { isQuietHours: false, scheduledTime: baseDate };
}

/**
 * Generates the official compliant text body based on the dunning stage.
 */
export function getDunningMessageCopy(
  stage: DunningStage,
  customerName: string,
  formattedAmount: string,
  planName: string = "your subscription",
  actionUrl: string
): string {
  switch (stage) {
    case 1:
      // Stage 1: Instant Nudge (Day 0 / <60s)
      return `Hi ${customerName}, your recent payment of ${formattedAmount} for ${planName} couldn't be processed due to a temporary bank decline.\n\nTap below to securely update your card in 10 seconds with Apple Pay or credit card to keep your subscription uninterrupted:\n${actionUrl}\n\nReply STOP to unsubscribe.`;

    case 2:
      // Stage 2: Gentle Reminder (Day 2 / +48h)
      return `Hi ${customerName}, quick reminder: We're holding your ${planName} subscription active for you. Please update your payment method to avoid any service disruption.\n\n1-Click Update: ${actionUrl}\n\nReply STOP to unsubscribe.`;

    case 3:
      // Stage 3: Final Urgent Notice (Day 4 / +96h)
      return `FINAL NOTICE: Hi ${customerName}, your ${planName} subscription is scheduled for cancellation in 24 hours. Tap below to keep your active workspace and benefits:\n\nSettle in 1-Click: ${actionUrl}\n\nReply STOP to unsubscribe.`;
  }
}

/**
 * Dispatches an automated WhatsApp dunning message using Meta WhatsApp Cloud API.
 * Uses official template `dunnify_payment_failed_alert` with dynamic button action URL.
 */
export async function sendWhatsAppDunningMessage(
  options: SendWhatsAppOptions
): Promise<WhatsAppMessageResult> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  const targetPhone = options.recipientPhone || "+1 (555) 019-2834";
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency,
  }).format(options.amount);

  const planName = options.planName || "Subscription";
  const messageBody =
    options.customBody ||
    getDunningMessageCopy(
      options.stage,
      options.customerName,
      formattedAmount,
      planName,
      options.actionUrl
    );

  // If live Meta Cloud API credentials are provided
  if (token && phoneNumberId) {
    try {
      // Clean phone number to digits only (E.164 without '+')
      const cleanPhone = targetPhone.replace(/[^0-9]/g, "");

      const templatePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "template",
        template: {
          name: "dunnify_payment_failed_alert",
          language: { code: "en_US" },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "text",
                  text: options.stage === 3 ? "Action Required: Final Notice" : "Payment Update Needed",
                },
              ],
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: options.customerName },
                { type: "text", text: formattedAmount },
                { type: "text", text: planName },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: options.actionUrl.replace(/^https?:\/\/[^\/]+\//, ""),
                },
              ],
            },
          ],
        },
      };

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        // Fallback: If custom template is still in review with Meta, attempt direct text message
        const textPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { body: messageBody },
        };

        const textResponse = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(textPayload),
          }
        );

        const textData = await textResponse.json();
        if (textResponse.ok) {
          console.log(`[Meta Cloud API] Message delivered via direct text fallback (template in review).`);
          return {
            success: true,
            messageId: textData.messages?.[0]?.id,
            mode: "production",
            recipient: targetPhone,
            body: messageBody,
            actionUrl: options.actionUrl,
            stage: options.stage,
          };
        }

        return {
          success: false,
          error: data.error?.message || textData.error?.message || "WhatsApp API error",
          mode: "production",
          recipient: targetPhone,
          body: messageBody,
          actionUrl: options.actionUrl,
          stage: options.stage,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        mode: "production",
        recipient: targetPhone,
        body: messageBody,
        actionUrl: options.actionUrl,
        stage: options.stage,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        mode: "production",
        recipient: targetPhone,
        body: messageBody,
        actionUrl: options.actionUrl,
        stage: options.stage,
      };
    }
  }

  // Developer / Sandbox Simulation Mode (Runs without requiring live Meta tokens)
  console.log(
    `[Dunnify WhatsApp Meta API Simulator] Stage ${options.stage} -> To: ${targetPhone}`
  );
  console.log(`Body:\n${messageBody}`);
  console.log(`1-Click Link: ${options.actionUrl}`);

  return {
    success: true,
    messageId: `wamid.sim_${Date.now()}_stage${options.stage}`,
    mode: "sandbox_simulation",
    recipient: targetPhone,
    body: messageBody,
    actionUrl: options.actionUrl,
    stage: options.stage,
  };
}

// Backward-compatible helper for initial endpoint
export async function sendWhatsAppDunningAlert(payload: any): Promise<WhatsAppMessageResult> {
  const actionUrl = payload.hostedInvoiceUrl || `https://dunnify.com/pay/${payload.pay_token || payload.invoiceId}`;
  return sendWhatsAppDunningMessage({
    recipientPhone: payload.customerPhone || "+1 (555) 019-2834",
    customerName: payload.customerName || "Customer",
    amount: payload.amount || 149,
    currency: payload.currency || "USD",
    planName: payload.planName || "Monthly Subscription",
    actionUrl,
    stage: 1,
    invoiceId: payload.invoiceId,
  });
}
