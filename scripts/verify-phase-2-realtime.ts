import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ytleanepebzqmunjpwnt.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGVhbmVwZWJ6cW11bmpwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDg2MzksImV4cCI6MjExMTAyNDYzOX0.9_ZESBbzs50_0mAa5P9Akuz76HLUiEXJc5PRGmmC2J0";

console.log("==================================================================");
console.log("   PHASE 2 VERIFICATION: SUPABASE REALTIME WEBSOCKET STREAMING    ");
console.log("==================================================================\n");

const supabase = createClient(supabaseUrl, anonKey);

async function runTest() {
  console.log(`[Step 1] Connecting to Supabase Realtime at ${supabaseUrl}...`);

  let insertReceived = false;
  let updateReceived = false;
  let createdEventId = "";
  let createdPayToken = "";

  const channel = supabase
    .channel("verify-phase-2-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "recovery_events" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const ev = payload.new as any;
          if (ev.customer_name === "Realtime Test Customer") {
            console.log("\n⚡ [WEBSOCKET INSERT RECEIVED IN REAL TIME]");
            console.log("Event ID:", ev.id);
            console.log("Customer:", ev.customer_name);
            console.log("Amount:", `$${ev.amount} ${ev.currency}`);
            console.log("Status:", ev.status);
            insertReceived = true;
          }
        } else if (payload.eventType === "UPDATE") {
          const ev = payload.new as any;
          if (ev.customer_name === "Realtime Test Customer" && ev.status === "RECOVERED") {
            console.log("\n🎉 [WEBSOCKET UPDATE 'RECOVERED' RECEIVED IN REAL TIME]");
            console.log("Event ID:", ev.id);
            console.log("Customer:", ev.customer_name);
            console.log("New Status:", ev.status);
            console.log("Recovered At:", ev.recovered_at);
            updateReceived = true;
          }
        }
      }
    )
    .subscribe(async (status) => {
      console.log(`Channel Status: ${status}`);

      if (status === "SUBSCRIBED") {
        console.log("✓ Subscribed to WebSocket feed successfully!\n");

        // Step 2: Trigger Stripe decline via Next.js API
        console.log("[Step 2] Sending POST to /api/dashboard/trigger-test...");
        const res = await fetch(`${appUrl}/api/dashboard/trigger-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: "Realtime Test Customer",
            customerEmail: "realtime@dunnify-test.com",
            customerPhone: "+1 (555) 901-2244",
            amount: 299.0,
            planName: "Scale Tier Annual",
          }),
        });

        if (!res.ok) {
          console.error("Trigger test failed:", await res.text());
          process.exit(1);
        }

        const data = await res.json();
        const event = data.event || data.recoveryEvent;
        createdEventId = event.id;
        createdPayToken = event.pay_token;
        console.log(`✓ Trigger response OK! Created Event ID: ${createdEventId}`);
        console.log(`✓ Pay Token: ${createdPayToken}`);

        // Wait a moment for insert websocket to register, then trigger 1-click settlement
        setTimeout(async () => {
          console.log("\n[Step 3] Simulating subscriber 1-Click Apple Pay settlement...");
          const payRes = await fetch(`${appUrl}/api/pay/${createdPayToken}`, {
            method: "POST",
          });

          if (!payRes.ok) {
            console.error("Pay clearance failed:", await payRes.text());
            process.exit(1);
          }

          console.log("✓ Payment clearance POST returned 200 OK!");
        }, 1500);
      }
    });

  // Watchdog
  setTimeout(() => {
    if (insertReceived && updateReceived) {
      console.log("\n==================================================================");
      console.log("   ✓ PHASE 2 COMPLETE: SUPABASE REALTIME WEBSOCKETS 100% OPERATIONAL!");
      console.log("==================================================================\n");
      process.exit(0);
    } else {
      console.error("\n❌ Test timed out waiting for realtime events.");
      console.log(`Insert received: ${insertReceived}, Update received: ${updateReceived}`);
      process.exit(1);
    }
  }, 7000);
}

runTest();
