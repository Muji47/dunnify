import { db, DunningStage, RecoveryEvent } from "./db";
import {
  sendWhatsAppDunningMessage,
  calculateDeliveryTime,
  WhatsAppMessageResult,
} from "./whatsapp";
import { sendEmergencyDunningEmail } from "./email";
import { scheduleDunningMessageWithQStash } from "./qstash";

export interface ScheduleSequenceParams {
  merchantId?: string;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  currency: string;
  failureReason?: string;
  hostedInvoiceUrl?: string;
  planName?: string;
}

export interface ScheduledSequenceResult {
  recoveryEvent: RecoveryEvent;
  stage1Dispatched: boolean;
  channelUsed: "whatsapp" | "email";
  dispatchResult: any;
  stagesScheduled: number;
}

/**
 * Initiates the 3-Stage Dunning Sequence (Day 0, Day 2, Day 4).
 * Handles quiet hours check, missing phone fallback, and idempotent duplicate prevention.
 */
export async function initiateDunningSequence(
  params: ScheduleSequenceParams
): Promise<ScheduledSequenceResult> {
  // 1. Idempotency Check: Don't schedule duplicate events for the same Stripe invoice
  const existingEvent = await db.getRecoveryEventByInvoiceId(params.stripeInvoiceId);
  if (existingEvent) {
    console.log(
      `[Dunnify Scheduler] Idempotent: Invoice ${params.stripeInvoiceId} already tracked (${existingEvent.status}).`
    );
    const messages = await db.getDunningMessagesForEvent(existingEvent.id);
    return {
      recoveryEvent: existingEvent,
      stage1Dispatched: messages.some((m) => m.stage === 1 && m.status !== "scheduled"),
      channelUsed: existingEvent.customer_phone ? "whatsapp" : "email",
      dispatchResult: { idempotent: true, eventId: existingEvent.id },
      stagesScheduled: messages.length,
    };
  }

  const merchant = await db.getMerchant(params.merchantId);
  const payToken = `tok_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
  const actionUrl = `https://dunnify.com/pay/${payToken}`;

  const isOptedOut = params.customerPhone ? await db.isCustomerOptedOut(params.customerPhone) : false;
  const hasPhone = Boolean(params.customerPhone && params.customerPhone.trim().length > 5 && !isOptedOut);

  // 2. Create the Recovery Event
  const recoveryEvent = await db.createRecoveryEvent({
    merchant_id: merchant.id,
    stripe_invoice_id: params.stripeInvoiceId,
    stripe_customer_id: params.stripeCustomerId,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
    whatsapp_opted_out: isOptedOut,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    status: isOptedOut ? "OPTED_OUT" : (hasPhone ? "PENDING" : "PHONE_MISSING"),
    failure_reason: params.failureReason || "Card declined / Soft decline",
    attempt_count: 1,
    hosted_invoice_url: params.hostedInvoiceUrl,
    pay_token: payToken,
    current_stage: 1,
    plan_name: params.planName || "Monthly Subscription",
  });

  // Edge Case 1: Missing Customer Phone Number or Opted-out -> Fallback to emergency email dunning
  if (!hasPhone) {
    console.warn(
      `[Dunnify Guard] ${isOptedOut ? "Customer opted out of WhatsApp" : "Phone missing"} for ${params.customerName}. Executing emergency email dunning fallback.`
    );

    const emailResult = await sendEmergencyDunningEmail({
      to: params.customerEmail,
      customerName: params.customerName,
      amount: params.amount,
      currency: params.currency,
      planName: recoveryEvent.plan_name,
      payUrl: actionUrl,
      invoiceId: params.stripeInvoiceId,
      reason: params.failureReason,
    });

    await db.createDunningMessage({
      recovery_event_id: recoveryEvent.id,
      stage: 1,
      channel: "email",
      recipient: params.customerEmail,
      status: emailResult.success ? "delivered" : "failed",
      message_id: emailResult.messageId,
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      body: emailResult.subject,
      action_url: actionUrl,
      error_message: emailResult.error,
    });

    return {
      recoveryEvent,
      stage1Dispatched: emailResult.success,
      channelUsed: "email",
      dispatchResult: emailResult,
      stagesScheduled: 1,
    };
  }

  // 3. Compute Quiet Hours compliance for Stage 1
  const now = new Date();
  const stage1Delivery = calculateDeliveryTime(
    merchant.quiet_hours_enabled,
    merchant.quiet_hours_start,
    merchant.quiet_hours_end,
    now
  );

  let stage1DispatchResult: WhatsAppMessageResult | null = null;
  let stage1Status: "delivered" | "scheduled" = "scheduled";
  let stage1SentAt: string | undefined = undefined;

  // If not currently in quiet hours, dispatch Stage 1 immediately (<60s)
  if (!stage1Delivery.isQuietHours) {
    stage1DispatchResult = await sendWhatsAppDunningMessage({
      recipientPhone: params.customerPhone!,
      customerName: params.customerName,
      amount: params.amount,
      currency: params.currency,
      planName: recoveryEvent.plan_name,
      actionUrl,
      stage: 1,
      invoiceId: params.stripeInvoiceId,
    });

    stage1Status = stage1DispatchResult.success ? "delivered" : "failed" as any;
    stage1SentAt = new Date().toISOString();
  }

  // Record Stage 1
  await db.createDunningMessage({
    recovery_event_id: recoveryEvent.id,
    stage: 1,
    channel: "whatsapp",
    recipient: params.customerPhone!,
    status: stage1Status,
    message_id: stage1DispatchResult?.messageId,
    scheduled_for: stage1Delivery.scheduledTime.toISOString(),
    sent_at: stage1SentAt,
    body: stage1DispatchResult?.body || `Stage 1 WhatsApp alert queued for ${stage1Delivery.scheduledTime.toISOString()}`,
    action_url: actionUrl,
    error_message: stage1DispatchResult?.error,
  });

  // 4. Schedule Stage 2: Gentle Reminder (Day 2 / +48h)
  const day2Base = new Date(now.getTime() + 48 * 3600 * 1000);
  const stage2Delivery = calculateDeliveryTime(
    merchant.quiet_hours_enabled,
    merchant.quiet_hours_start,
    merchant.quiet_hours_end,
    day2Base
  );

  const msg2 = await db.createDunningMessage({
    recovery_event_id: recoveryEvent.id,
    stage: 2,
    channel: "whatsapp",
    recipient: params.customerPhone!,
    status: "scheduled",
    scheduled_for: stage2Delivery.scheduledTime.toISOString(),
    body: `Hi ${params.customerName}, quick reminder: We're holding your ${recoveryEvent.plan_name} subscription active. Please update payment.`,
    action_url: actionUrl,
  });

  // 5. Schedule Stage 3: Final Urgent Notice (Day 4 / +96h)
  const day4Base = new Date(now.getTime() + 96 * 3600 * 1000);
  const stage3Delivery = calculateDeliveryTime(
    merchant.quiet_hours_enabled,
    merchant.quiet_hours_start,
    merchant.quiet_hours_end,
    day4Base
  );

  const msg3 = await db.createDunningMessage({
    recovery_event_id: recoveryEvent.id,
    stage: 3,
    channel: "whatsapp",
    recipient: params.customerPhone!,
    status: "scheduled",
    scheduled_for: stage3Delivery.scheduledTime.toISOString(),
    body: `FINAL NOTICE: Hi ${params.customerName}, your ${recoveryEvent.plan_name} subscription will cancel in 24 hours. Tap to settle.`,
    action_url: actionUrl,
  });

  // Schedule delayed serverless jobs in Upstash QStash queue (if configured)
  scheduleDunningMessageWithQStash({
    eventId: recoveryEvent.id,
    stage: 2,
    scheduledFor: stage2Delivery.scheduledTime,
    dunningMessageId: msg2.id,
  });
  scheduleDunningMessageWithQStash({
    eventId: recoveryEvent.id,
    stage: 3,
    scheduledFor: stage3Delivery.scheduledTime,
    dunningMessageId: msg3.id,
  });

  return {
    recoveryEvent,
    stage1Dispatched: stage1Status === "delivered",
    channelUsed: "whatsapp",
    dispatchResult: stage1DispatchResult,
    stagesScheduled: 3,
  };
}

/**
 * The Circuit Breaker:
 * Automatically called when Stripe fires `invoice.payment_succeeded`.
 * Cancels all remaining scheduled reminders (Stage 2, Stage 3).
 */
export async function triggerCircuitBreaker(stripeInvoiceId: string, recoveredAmount?: number) {
  const event = await db.getRecoveryEventByInvoiceId(stripeInvoiceId);
  if (!event) {
    console.warn(`[Circuit Breaker] No recovery event found for invoice ${stripeInvoiceId}`);
    return { success: false, reason: "event_not_found" };
  }

  // Cancel any scheduled messages
  const cancelledCount = await db.cancelPendingDunningMessages(event.id);

  // Update recovery event to RECOVERED
  const updatedEvent = await db.updateRecoveryEvent(event.id, {
    status: "RECOVERED",
    recovered_at: new Date().toISOString(),
    amount: recoveredAmount !== undefined ? recoveredAmount : event.amount,
  });

  console.log(
    `[Circuit Breaker Activated] Invoice ${stripeInvoiceId} RECOVERED! Cancelled ${cancelledCount} pending dunning message(s).`
  );

  return {
    success: true,
    cancelledMessagesCount: cancelledCount,
    recoveryEvent: updatedEvent,
  };
}

/**
 * Processes scheduled messages that are due for delivery.
 */
export async function processDueScheduledMessages(): Promise<{
  processedCount: number;
  results: any[];
}> {
  const allMessages = await db.listAllMessages();
  const now = new Date();
  const dueMessages = allMessages.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduled_for) <= now
  );

  const results: any[] = [];

  for (const msg of dueMessages) {
    const event = await db.getRecoveryEventById(msg.recovery_event_id);
    if (!event || event.status === "RECOVERED" || event.whatsapp_opted_out) {
      // Circuit breaker & opt-out safety: if already recovered or opted out, cancel
      await db.updateDunningMessage(msg.id, { status: "cancelled" });
      continue;
    }

    if (msg.channel === "whatsapp" && event.customer_phone) {
      const dispatchResult = await sendWhatsAppDunningMessage({
        recipientPhone: event.customer_phone,
        customerName: event.customer_name,
        amount: event.amount,
        currency: event.currency,
        planName: event.plan_name,
        actionUrl: msg.action_url,
        stage: msg.stage,
        invoiceId: event.stripe_invoice_id,
      });

      const sentStatus = dispatchResult.success ? "delivered" : "failed";
      await db.updateDunningMessage(msg.id, {
        status: sentStatus,
        sent_at: new Date().toISOString(),
        message_id: dispatchResult.messageId,
        error_message: dispatchResult.error,
      });

      // Update current stage on the event
      await db.updateRecoveryEvent(event.id, {
        current_stage: msg.stage,
      });

      results.push({ messageId: msg.id, result: dispatchResult });
    }
  }

  return {
    processedCount: results.length,
    results,
  };
}
