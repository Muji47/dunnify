import { db } from "../src/lib/db";

async function showEvents() {
  console.log("==============================================================");
  console.log("        DUNNIFY DATABASE: RECOVERY_EVENTS AUDIT TABLE         ");
  console.log("==============================================================");

  const events = await db.listRecoveryEvents();

  if (events.length === 0) {
    console.log("No recovery events found in database.");
    return;
  }

  const tableData = events.map((ev) => ({
    "Invoice ID": ev.stripe_invoice_id,
    Subscriber: ev.customer_name,
    Email: ev.customer_email,
    Phone: ev.customer_phone || "(None)",
    Amount: `$${ev.amount} ${ev.currency}`,
    Status: ev.status,
    Stage: `Stage ${ev.current_stage}`,
    "Created At": new Date(ev.created_at).toLocaleString(),
    "Recovered At": ev.recovered_at ? new Date(ev.recovered_at).toLocaleString() : "-",
  }));

  console.table(tableData);
  console.log(`\nTotal events tracked: ${events.length}`);
}

showEvents().catch((err) => {
  console.error(err);
  process.exit(1);
});
