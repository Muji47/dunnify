import Stripe from "stripe";

// Lazily initialize Stripe client
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    })
  : (null as unknown as Stripe);

export interface FailedPaymentPayload {
  invoiceId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  currency: string;
  hostedInvoiceUrl?: string;
  attemptCount: number;
  failureReason?: string;
  planName?: string;
}

export function parseFailedInvoice(invoice: Stripe.Invoice): FailedPaymentPayload {
  const amount = invoice.amount_due
    ? invoice.amount_due / 100
    : (invoice as any).total
    ? (invoice as any).total / 100
    : 149.0;

  const currency = (invoice.currency || "usd").toUpperCase();
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id || "cus_stripe_cli";

  const customerName =
    invoice.customer_name ||
    (invoice.customer_email ? invoice.customer_email.split("@")[0] : null) ||
    "Stripe Subscriber";

  const customerEmail =
    invoice.customer_email ||
    (invoice.metadata && invoice.metadata.email) ||
    `${customerId}@billing.example.com`;

  const hostedInvoiceUrl =
    invoice.hosted_invoice_url || `https://pay.stripe.com/invoice/${invoice.id}`;

  // Plan name extraction
  const lineItem = invoice.lines?.data?.[0];
  const planName =
    lineItem?.description ||
    (lineItem as any)?.plan?.nickname ||
    invoice.metadata?.plan_name ||
    "Pro SaaS Subscription";

  // Phone might be in invoice metadata, customer metadata, or customer_phone
  const customerPhone =
    (invoice.metadata && invoice.metadata.phone) ||
    invoice.customer_phone ||
    undefined;

  return {
    invoiceId: invoice.id || `in_cli_${Date.now()}`,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    amount,
    currency,
    hostedInvoiceUrl,
    attemptCount: invoice.attempt_count || 1,
    failureReason: (invoice as any).last_finalization_error?.message || "card_declined (soft_decline)",
    planName,
  };
}
