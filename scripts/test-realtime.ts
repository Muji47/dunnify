import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ytleanepebzqmunjpwnt.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGVhbmVwZWJ6cW11bmpwd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDg2MzksImV4cCI6MjExMTAyNDYzOX0.9_ZESBbzs50_0mAa5P9Akuz76HLUiEXJc5PRGmmC2J0";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGVhbmVwZWJ6cW11bmpwd250Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NTQ0ODYzOSwiZXhwIjoyMTExMDI0NjM5fQ.rsjkaKhSq2c07q4BW04Xn6-qCmFaXRYae7b42KNdnb8";

const client = createClient(url, anonKey);
const admin = createClient(url, serviceKey);

console.log("Listening for postgres_changes on recovery_events...");

let received = false;

const channel = client
  .channel("realtime-delivery-test")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "recovery_events" },
    (payload) => {
      console.log("🔥 REALTIME EVENT DELIVERED SUCCESSFULLY:", payload.eventType, (payload.new as any)?.stripe_invoice_id);
      received = true;
      process.exit(0);
    }
  )
  .subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      console.log("Channel subscribed! Inserting test event to verify replication...");
      const testInvoice = `in_rt_${Date.now()}`;
      const { data, error } = await admin.from("recovery_events").insert({
        stripe_invoice_id: testInvoice,
        stripe_customer_id: "cus_rt_test",
        customer_name: "Realtime Tester",
        customer_email: "rt@test.com",
        amount: 88,
        pay_token: `tok_rt_${Date.now()}`,
      }).select().single();

      if (error) {
        console.error("Admin insert error:", error);
      } else {
        console.log("Inserted test row:", data.stripe_invoice_id);
      }
    }
  });

setTimeout(() => {
  if (!received) {
    console.log("⚠️ Realtime event not received within 6 seconds. Table may need replication publication enabled in Supabase.");
    console.log("Run: ALTER PUBLICATION supabase_realtime ADD TABLE recovery_events;");
  }
  process.exit(received ? 0 : 1);
}, 6000);
