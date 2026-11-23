import { db } from "./src/lib/db";
import {
  initiateDunningSequence,
  triggerCircuitBreaker,
  processDueScheduledMessages,
} from "./src/lib/scheduler";
import { calculateDeliveryTime, sendWhatsAppDunningMessage } from "./src/lib/whatsapp";
import { sendEmergencyDunningEmail } from "./src/lib/email";

async function runTests() {
  console.log("==================================================");
  console.log("       DUNNIFY (dunnify.com) VERIFICATION SUITE   ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Quiet Hours Compliance Engine
  // ----------------------------------------------------
  console.log("--- 1. Quiet Hours Compliance Tests ---");
  const nightTime = new Date("2026-11-23T23:30:00"); // 11:30 PM
  const daytimeTime = new Date("2026-11-23T14:00:00"); // 2:00 PM

  const nightResult = calculateDeliveryTime(true, "22:00", "08:00", nightTime);
  assert(nightResult.isQuietHours === true, "Identifies 11:30 PM as Quiet Hours");
  assert(
    nightResult.scheduledTime.getHours() === 8 && nightResult.scheduledTime.getMinutes() === 30,
    "Queues nighttime message for 8:30 AM"
  );

  const daytimeResult = calculateDeliveryTime(true, "22:00", "08:00", daytimeTime);
  assert(daytimeResult.isQuietHours === false, "Identifies 2:00 PM as non-quiet hours");

  // ----------------------------------------------------
  // Test 2: Multi-Stage Dunning Scheduling & Idempotency
  // ----------------------------------------------------
  console.log("\n--- 2. Multi-Stage Dunning Sequence Tests ---");
  const testInvoiceId = `in_test_verif_${Date.now()}`;
  const testCustomerId = `cus_test_verif_01`;

  const seqResult = await initiateDunningSequence({
    stripeInvoiceId: testInvoiceId,
    stripeCustomerId: testCustomerId,
    customerName: "Jessica Alba",
    customerEmail: "jessica@honestsaas.com",
    customerPhone: "+1 (555) 302-9981",
    amount: 199.0,
    currency: "USD",
    planName: "Scale Tier Annual",
    failureReason: "do_not_honor",
  });

  assert(seqResult.recoveryEvent.status === "PENDING", "Creates Recovery Event in PENDING status");
  assert(seqResult.stagesScheduled === 3, "Schedules 3 stages (Day 0, Day 2, Day 4)");
  assert(seqResult.channelUsed === "whatsapp", "Uses WhatsApp channel when phone number is present");

  const messages = await db.getDunningMessagesForEvent(seqResult.recoveryEvent.id);
  assert(messages.length === 3, "Database holds exactly 3 stage messages for this event");
  assert(messages[0].stage === 1, "First message is Stage 1 (Day 0)");
  assert(messages[1].stage === 2, "Second message is Stage 2 (Day 2)");
  assert(messages[2].stage === 3, "Third message is Stage 3 (Day 4)");

  // Test Idempotency
  console.log("\n--- 3. Webhook Idempotency Test ---");
  const dupResult = await initiateDunningSequence({
    stripeInvoiceId: testInvoiceId,
    stripeCustomerId: testCustomerId,
    customerName: "Jessica Alba",
    customerEmail: "jessica@honestsaas.com",
    customerPhone: "+1 (555) 302-9981",
    amount: 199.0,
    currency: "USD",
  });
  assert(dupResult.dispatchResult?.idempotent === true, "Detects duplicate Stripe invoice and skips resend");

  // ----------------------------------------------------
  // Test 4: Missing Phone Number Fallback (Edge Case 1)
  // ----------------------------------------------------
  console.log("\n--- 4. Missing Phone Fallback Test ---");
  const missingPhoneInvoice = `in_no_phone_${Date.now()}`;
  const fallbackResult = await initiateDunningSequence({
    stripeInvoiceId: missingPhoneInvoice,
    stripeCustomerId: "cus_no_phone_99",
    customerName: "Robert Thorne",
    customerEmail: "robert@thornecorp.org",
    customerPhone: "", // Missing
    amount: 349.0,
    currency: "USD",
    planName: "Pro Tier",
  });

  assert(fallbackResult.recoveryEvent.status === "PHONE_MISSING", "Flags event as PHONE_MISSING");
  assert(fallbackResult.channelUsed === "email", "Dispatches emergency fallback email dunning");

  const emailMessages = await db.getDunningMessagesForEvent(fallbackResult.recoveryEvent.id);
  assert(
    emailMessages.some((m) => m.channel === "email"),
    "Records emergency email dispatch in message audit log"
  );

  // ----------------------------------------------------
  // Test 5: Circuit Breaker on Payment Succeeded
  // ----------------------------------------------------
  console.log("\n--- 5. Circuit Breaker Test ---");
  const circuitBreakerResult = await triggerCircuitBreaker(testInvoiceId, 199.0);
  assert(circuitBreakerResult.success === true, "Circuit breaker executes successfully");
  assert(circuitBreakerResult.recoveryEvent?.status === "RECOVERED", "Event status transitions to RECOVERED");

  const updatedMessages = await db.getDunningMessagesForEvent(seqResult.recoveryEvent.id);
  const pendingScheduled = updatedMessages.filter((m) => m.status === "scheduled");
  assert(
    pendingScheduled.length === 0,
    "Circuit breaker auto-cancels all pending Day 2 & Day 4 reminders"
  );

  // ----------------------------------------------------
  // Test 6: 1-Click Pay Resolution
  // ----------------------------------------------------
  console.log("\n--- 6. 1-Click Pay Resolution Test ---");
  const payEvent = await db.getRecoveryEventByToken(seqResult.recoveryEvent.pay_token);
  assert(payEvent !== null, "Resolves recovery event by unique token");
  assert(payEvent?.status === "RECOVERED", "Reflects updated recovered state to customer");

  // ----------------------------------------------------
  // Test 7: Merchant Dashboard KPIs
  // ----------------------------------------------------
  console.log("\n--- 7. Merchant Dashboard KPIs Test ---");
  const kpis = await db.getDashboardKPIs();
  assert(kpis.totalRecoveredCash > 0, "Calculates positive Total Recovered Cash");
  assert(kpis.retainedARR === kpis.totalRecoveredCash * 12, "Retained ARR is 12x Recovered Monthly Cash");
  assert(kpis.recoveryRate > 0, "Calculates accurate Recovery Rate %");

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
