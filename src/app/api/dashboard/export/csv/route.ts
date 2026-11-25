import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const events = await db.listRecoveryEvents();

    const headers = [
      "Event ID",
      "Stripe Invoice ID",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Plan Tier",
      "Amount",
      "Currency",
      "Status",
      "Current Stage",
      "WhatsApp Opted Out",
      "Failure Reason",
      "Recovered At",
      "Created At",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = events.map((ev) => [
      escapeCsv(ev.id),
      escapeCsv(ev.stripe_invoice_id),
      escapeCsv(ev.customer_name),
      escapeCsv(ev.customer_email),
      escapeCsv(ev.customer_phone || ""),
      escapeCsv(ev.plan_name),
      escapeCsv(ev.amount),
      escapeCsv(ev.currency),
      escapeCsv(ev.status),
      escapeCsv(ev.current_stage),
      escapeCsv(Boolean(ev.whatsapp_opted_out)),
      escapeCsv(ev.failure_reason),
      escapeCsv(ev.recovered_at || ""),
      escapeCsv(ev.created_at),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dunnify-recovery-report-${dateStr}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
