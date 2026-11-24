import { db } from "../src/lib/db";
import { initiateDunningSequence } from "../src/lib/scheduler";

async function verifyWhatsAppWebhookAndCompliance() {
  console.log("=================================================================");
  console.log("  DUNNIFY: META WHATSAPP WEBHOOK & 'STOP' COMPLIANCE TEST SUITE  ");
  console.log("=================================================================\n");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "dunnify_meta_verify_token_2026";

  // Step 1: Test Meta GET Webhook Handshake Verification
  console.log("[Step 1] Testing Meta GET verification challenge handshake...");
  const challengeCode = `challenge_${Math.random().toString(36).substring(2, 9)}`;

  // Test with valid token
  const validRes = await fetch(
    `${appUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challengeCode}`
  );
  const challengeReturned = await validRes.text();

  if (validRes.status !== 200 || challengeReturned !== challengeCode) {
    throw new Error(
      `Handshake failed with valid token: Status ${validRes.status}, returned "${challengeReturned}" vs expected "${challengeCode}"`
    );
  }
  console.log("  -> Valid Token Handshake: 200 OK (Challenge echoed correctly)");

  // Test with invalid token
  const invalidRes = await fetch(
    `${appUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${challengeCode}`
  );
  if (invalidRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden with invalid token, got ${invalidRes.status}`);
  }
  console.log("  -> Invalid Token Handshake: 403 Forbidden (Secured properly)");
  console.log("  [PASS] Meta Webhook verification handshake verified.\n");

  // Step 2: Ingest a failed payment for a customer
  console.log("[Step 2] Ingesting test failed payment for subscriber Alex Rivers...");
  const testPhone = "+15552345678";
  const testEmail = `alex.rivers.${Date.now()}@example.com`;
  const invoiceId = `in_optout_test_${Date.now()}`;

  const seq = await initiateDunningSequence({
    stripeInvoiceId: invoiceId,
    stripeCustomerId: `cus_optout_${Date.now()}`,
    customerName: "Alex Rivers",
    customerEmail: testEmail,
    customerPhone: testPhone,
    amount: 149,
    currency: "USD",
    planName: "Scale Tier",
    failureReason: "Card declined",
  });

  const eventId = seq.recoveryEvent.id;
  console.log(`  -> Recovery event created: ${eventId} (Initial status: ${seq.recoveryEvent.status})`);

  let messages = await db.getDunningMessagesForEvent(eventId);
  const scheduledCount = messages.filter((m) => m.status === "scheduled").length;
  console.log(`  -> Initial pending/scheduled dunning messages: ${scheduledCount}`);

  // Step 3: Simulate Meta Webhook Inbound "STOP" Message
  console.log("\n[Step 3] Simulating subscriber replying 'STOP' via WhatsApp...");
  const stopPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_TEST_12345",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550192834",
                phone_number_id: "PHONE_ID_12345",
              },
              messages: [
                {
                  from: testPhone.replace(/[^0-9]/g, ""),
                  id: `wamid.test_${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: "STOP" },
                  type: "text",
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const postRes = await fetch(`${appUrl}/api/webhooks/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stopPayload),
  });

  if (!postRes.ok) {
    throw new Error(`Inbound webhook failed: ${postRes.statusText}`);
  }
  const postData = await postRes.json();
  console.log("  -> Inbound webhook response:", JSON.stringify(postData));

  // Verify event is now marked opted-out and pending messages cancelled
  const updatedEvent = await db.getRecoveryEventById(eventId);
  console.log("DEBUG updatedEvent:", updatedEvent);
  if (!updatedEvent || !updatedEvent.whatsapp_opted_out) {
    throw new Error("Failed: Recovery event whatsapp_opted_out was not set to true.");
  }
  console.log(`  -> Recovery Event whatsapp_opted_out: ${updatedEvent.whatsapp_opted_out}`);
  console.log(`  -> Recovery Event Status: ${updatedEvent.status}`);

  messages = await db.getDunningMessagesForEvent(eventId);
  const remainingScheduled = messages.filter((m) => m.status === "scheduled").length;
  if (remainingScheduled > 0) {
    throw new Error(`Failed: Expected 0 scheduled messages after STOP, but found ${remainingScheduled}`);
  }
  console.log("  -> Pending scheduled reminders successfully cancelled: 0 remaining.");
  console.log("  [PASS] 'STOP' opt-out and auto-silencing verified.\n");

  // Step 4: Verify Next Dunning Automatically Diverts to Email
  console.log("[Step 4] Ingesting second invoice failure for the opted-out customer...");
  const secondSeq = await initiateDunningSequence({
    stripeInvoiceId: `in_second_${Date.now()}`,
    stripeCustomerId: `cus_optout_${Date.now()}`,
    customerName: "Alex Rivers",
    customerEmail: testEmail,
    customerPhone: testPhone, // Same phone number that opted out
    amount: 149,
    currency: "USD",
    planName: "Scale Tier",
  });

  console.log(`  -> Channel used for opted-out user: ${secondSeq.channelUsed}`);
  if (secondSeq.channelUsed !== "email") {
    throw new Error(`Failed: Expected fallback channel to be "email", got "${secondSeq.channelUsed}"`);
  }
  console.log("  [PASS] Automatic emergency email fallback verified for opted-out subscriber.\n");

  console.log("=================================================================");
  console.log("  ALL META WHATSAPP WEBHOOK TESTS PASSED (100% COMPLIANT)        ");
  console.log("=================================================================");
}

verifyWhatsAppWebhookAndCompliance().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
