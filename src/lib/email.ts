export interface EmailDispatchOptions {
  to: string;
  customerName: string;
  amount: number;
  currency: string;
  planName: string;
  payUrl: string;
  invoiceId: string;
  reason?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  mode: "production" | "sandbox_simulation";
  error?: string;
  subject: string;
  html: string;
}

/**
 * Emergency Fallback Dunning Email Dispatcher
 * Triggered automatically when customer has no phone number on file.
 */
export async function sendEmergencyDunningEmail(
  options: EmailDispatchOptions
): Promise<EmailDispatchResult> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency,
  }).format(options.amount);

  const subject = `Action Required: Payment issue for your ${options.planName} subscription (${formattedAmount})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080F1C; color: #F8FAFC; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background-color: #111C2E; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; }
          .logo { font-size: 20px; font-weight: 800; color: #10B981; margin-bottom: 24px; letter-spacing: -0.5px; }
          .title { font-size: 22px; font-weight: 700; margin-bottom: 16px; color: #F8FAFC; }
          .amount-box { background-color: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 12px; padding: 16px; margin: 20px 0; }
          .amount-text { font-size: 28px; font-weight: 800; color: #FB7185; }
          .desc { font-size: 15px; color: #94A3B8; line-height: 1.6; margin-bottom: 28px; }
          .cta-btn { display: inline-block; background-color: #10B981; color: #080F1C; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; }
          .footer { margin-top: 32px; font-size: 12px; color: #64748B; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Dunnify Billing Guard</div>
          <div class="title">Your Subscription Payment Needs Attention</div>
          <p class="desc">
            Hi ${options.customerName},<br><br>
            Your scheduled renewal payment for <strong>${options.planName}</strong> was temporarily declined by your bank card issuer (${options.reason || "Soft decline / Card update required"}).
          </p>
          <div class="amount-box">
            <div style="font-size: 12px; text-transform: uppercase; color: #94A3B8; margin-bottom: 4px;">Declined Amount</div>
            <div class="amount-text">${formattedAmount}</div>
          </div>
          <p class="desc">
            To prevent any interruption to your service, please tap below to update your payment method in under 10 seconds via Apple Pay, Google Pay, or card.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${options.payUrl}" class="cta-btn">Update Payment Method (1-Click)</a>
          </div>
          <div class="footer">
            Invoice reference: ${options.invoiceId} • Protected by 256-bit bank encryption via Stripe
          </div>
        </div>
      </body>
    </html>
  `;

  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Dunnify Billing <billing@dunnify.com>",
          to: [options.to],
          subject,
          html,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          messageId: data.id,
          recipient: options.to,
          mode: "production",
          subject,
          html,
        };
      }
    } catch (err: any) {
      console.error("[Dunnify Emergency Email] Resend API error:", err);
    }
  }

  // Sandbox simulation mode
  console.log(`[Dunnify Emergency Email Fallback] To: ${options.to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Action Link: ${options.payUrl}`);

  return {
    success: true,
    messageId: `email_sim_${Date.now()}`,
    recipient: options.to,
    mode: "sandbox_simulation",
    subject,
    html,
  };
}
