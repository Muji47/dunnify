import { initiateDunningSequence } from "../src/lib/scheduler";
import { db } from "../src/lib/db";

async function runPhase4Verification() {
  console.log("===============================================================");
  console.log("  DUNNIFY PHASE 4: MULTI-STAGE QUEUE & SCHEDULER VERIFICATION  ");
  console.log("===============================================================\n");

  const testMerchant = await db.createMerchant({
    name: "Phase 4 Test Corp",
    email: `phase4.tester.${Date.now()}@dunnify.com`,
    quiet_hours_enabled: false, // ensure immediate dispatch for daytime test
  });
  console.log(`[Setup] Created test merchant: ${testMerchant.id} (quiet_hours_enabled: false)`);

  const testInvoiceId = `in_test_phase4_${Date.now()}`;
  const testPhone = "+15559876543";
  const testEmail = `sarah.phase4.${Date.now()}@example.com`;

  console.log(`[Step 1] Ingesting invoice failure for ${testInvoiceId}...`);
  const sequenceResult = await initiateDunningSequence({
    merchantId: testMerchant.id,
    stripeInvoiceId: testInvoiceId,
    stripeCustomerId: `cus_test_${Date.now()}`,
    customerName: "Sarah Jenkins",
    customerEmail: testEmail,
    customerPhone: testPhone,
    amount: 149.0,
    currency: "USD",
    planName: "Pro Tier Plan",
    failureReason: "Insufficient funds (soft decline)",
  });

  const eventId = sequenceResult.recoveryEvent.id;
  const payToken = sequenceResult.recoveryEvent.pay_token;
  console.log(`  -> Event created: ${eventId} (pay_token: ${payToken})`);
  console.log(`  -> Stage 1 Dispatched: ${sequenceResult.stage1Dispatched}`);

  if (!sequenceResult.stage1Dispatched) {
    throw new Error("Failed: Stage 1 was expected to dispatch immediately with quiet hours disabled.");
  }

  // Check messages for event
  let messages = await db.getDunningMessagesForEvent(eventId);
  console.log(`  -> Total sequence messages registered: ${messages.length}`);
  const stage1 = messages.find((m) => m.stage === 1);
  const stage2 = messages.find((m) => m.stage === 2);
  const stage3 = messages.find((m) => m.stage === 3);

  if (!stage1 || stage1.status !== "delivered") {
    throw new Error(`Failed: Stage 1 message missing or not delivered (${stage1?.status})`);
  }
  if (!stage2 || stage2.status !== "scheduled") {
    throw new Error(`Failed: Stage 2 message missing or not scheduled (${stage2?.status})`);
  }
  if (!stage3 || stage3.status !== "scheduled") {
    throw new Error(`Failed: Stage 3 message missing or not scheduled (${stage3?.status})`);
  }

  console.log("  -> Stage 1: Delivered (Immediate WhatsApp alert)");
  console.log(`  -> Stage 2: Scheduled for ${stage2.scheduled_for} (+48h)`);
  console.log(`  -> Stage 3: Scheduled for ${stage3.scheduled_for} (+96h)`);
  console.log("  [PASS] Multi-stage sequence generation verified.\n");

  // Step 2: Time-Machine Advance +48h
  console.log("[Step 2] Testing Time-Machine: Advancing queue by +48 hours...");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const advanceRes = await fetch(`${appUrl}/api/scheduler/dunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ advanceHours: 48 }),
  });

  if (!advanceRes.ok) {
    throw new Error(`Time-Machine API returned error: ${advanceRes.statusText}`);
  }
  const advanceData = await advanceRes.json();
  console.log("  -> Time-Machine response:", JSON.stringify(advanceData));

  // Verify Stage 2 was dispatched and marked delivered
  messages = await db.getDunningMessagesForEvent(eventId);
  const stage2After = messages.find((m) => m.stage === 2);
  const stage3After = messages.find((m) => m.stage === 3);

  if (!stage2After || stage2After.status !== "delivered") {
    throw new Error(`Failed: Stage 2 was expected to be delivered after +48h advance, got: ${stage2After?.status}`);
  }
  if (!stage3After || stage3After.status !== "scheduled") {
    throw new Error(`Failed: Stage 3 was expected to remain scheduled after +48h advance, got: ${stage3After?.status}`);
  }
  console.log("  -> Stage 2 Status:", stage2After.status, "(Sent at:", stage2After.sent_at, ")");
  console.log("  -> Stage 3 Status:", stage3After.status, "(Still scheduled for Day 4)");
  console.log("  [PASS] Time-Machine +48h advance verified.\n");

  // Step 3: Circuit Breaker on Payment Recovery
  console.log("[Step 3] Testing Circuit Breaker: Subscriber completes 1-click checkout...");
  const payRes = await fetch(`${appUrl}/api/pay/${payToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentMethod: "apple_pay" }),
  });

  if (!payRes.ok) {
    throw new Error(`Payment clearance API failed: ${payRes.statusText}`);
  }
  const payData = await payRes.json();
  console.log("  -> 1-Click Pay response:", JSON.stringify(payData));

  // Verify event status is RECOVERED
  const updatedEvent = await db.getRecoveryEventById(eventId);
  if (!updatedEvent || updatedEvent.status !== "RECOVERED") {
    throw new Error(`Failed: Recovery event status is ${updatedEvent?.status}, expected RECOVERED`);
  }
  console.log(`  -> Recovery Event Status: ${updatedEvent.status} (Recovered at: ${updatedEvent.recovered_at})`);

  // Verify Stage 3 was cancelled by Circuit Breaker
  messages = await db.getDunningMessagesForEvent(eventId);
  const stage3Final = messages.find((m) => m.stage === 3);
  if (!stage3Final || stage3Final.status !== "cancelled") {
    throw new Error(`Failed: Stage 3 was expected to be cancelled by Circuit Breaker, got: ${stage3Final?.status}`);
  }
  console.log(`  -> Stage 3 Status: ${stage3Final.status} (Circuit Breaker successfully silenced pending notice)`);
  console.log("  [PASS] Circuit Breaker safety verified.\n");

  // Step 4: Verify Vercel Cron Sweeper Endpoint
  console.log("[Step 4] Testing Vercel Cron Sweeper via GET /api/scheduler/dunning...");
  const cronRes = await fetch(`${appUrl}/api/scheduler/dunning`);
  if (!cronRes.ok) {
    throw new Error(`Cron endpoint failed: ${cronRes.statusText}`);
  }
  const cronData = await cronRes.json();
  console.log("  -> Cron Sweeper response:", JSON.stringify(cronData));

  const statusRes = await fetch(`${appUrl}/api/scheduler/dunning?action=status`);
  const statusData = await statusRes.json();
  console.log(`  -> Scheduled queue query: ${statusData.scheduledMessagesCount} active scheduled messages in queue.`);
  console.log("  [PASS] Vercel Cron sweeper endpoint verified.\n");

  console.log("===============================================================");
  console.log("  ALL PHASE 4 CRITERIA FULLY TESTED & VERIFIED (100% PASSING)  ");
  console.log("===============================================================");
}

runPhase4Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
