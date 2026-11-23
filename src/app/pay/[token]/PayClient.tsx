"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Building,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface PayClientProps {
  token: string;
}

export default function PayClient({ token }: PayClientProps) {
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"apple_pay" | "google_pay" | "card">("apple_pay");

  useEffect(() => {
    async function loadInvoice() {
      try {
        const res = await fetch(`/api/pay/${token}`);
        if (res.ok) {
          const data = await res.json();
          setEventData(data.event);
          setMerchantData(data.merchant);
          if (data.event?.status === "RECOVERED") {
            setPaymentSuccess(true);
          }
        }
      } catch (err) {
        console.error("Failed to load invoice:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [token]);

  const handle1ClickPay = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/pay/${token}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(true);
      }
    } catch (err) {
      console.error("Payment failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080F1C] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium">Securing 1-click checkout session...</p>
        </div>
      </div>
    );
  }

  const amount = eventData?.amount || 249;
  const currency = eventData?.currency || "USD";
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

  return (
    <div className="min-h-screen bg-[#080F1C] text-slate-50 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#080F1C]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            256-Bit Stripe Verified
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#111C2E] border border-white/[0.08] rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {!paymentSuccess ? (
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/[0.08]">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {merchantData?.company_name || "Dunnify Partner"}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-50 tracking-tight">
                    Update Payment Method
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Amount Due</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {formattedAmount}
                  </div>
                </div>
              </div>

              {/* Alert Box */}
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-300">
                  <span className="font-bold text-rose-300">Bank soft decline: </span>
                  Your recent subscription payment for{" "}
                  <strong className="text-white">{eventData?.plan_name || "Monthly Plan"}</strong>{" "}
                  was declined by the issuing card provider. Update your payment in 10 seconds to keep your account active.
                </div>
              </div>

              {/* Subscriber Details */}
              <div className="bg-[#080F1C]/70 border border-white/[0.06] rounded-2xl p-4 mb-6 space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Subscriber Name:</span>
                  <span className="font-semibold text-slate-200">{eventData?.customer_name || "Valued Subscriber"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Billing Email:</span>
                  <span className="font-semibold text-slate-200">{eventData?.customer_email || "billing@customer.com"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Subscription Plan:</span>
                  <span className="font-semibold text-emerald-400">{eventData?.plan_name || "Pro Plan"}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Fast Checkout:
                </div>

                {/* Apple Pay Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("apple_pay")}
                  className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-sm font-semibold transition cursor-pointer ${
                    selectedMethod === "apple_pay"
                      ? "bg-white/10 border-emerald-400 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-white/[0.02] border-white/[0.08] text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-white shrink-0">
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 170 170"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-label="Apple Pay"
                      >
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-6.19-9.57-11.04-20.73-14.54-33.48-3.5-12.75-5.25-24.36-5.25-34.82 0-14.53 3.69-26.69 11.07-36.48 7.37-9.79 16.9-14.81 28.59-15.06 4.02 0 8.92 1.07 14.69 3.19 5.77 2.13 9.4 3.26 10.9 3.4 2.24-.34 6.13-1.57 11.68-3.69 5.54-2.12 10.15-3.08 13.83-2.88 12.87.62 23.01 5.37 30.43 14.25-11.45 6.94-17.05 16.71-16.8 29.31.25 10.12 4.1 18.59 11.55 25.42 7.45 6.83 16.29 10.74 26.52 11.73-2.46 7.42-5.46 14.99-9.01 22.7zM119.22 31.84c0-7.39 2.66-14.4 7.98-21.03 5.33-6.64 11.87-10.45 19.63-11.45.13 1.01.2 1.95.2 2.82 0 7.27-2.73 14.37-8.2 21.31-5.46 6.93-12.01 10.76-19.61 11.47l0-3.12z" />
                      </svg>
                    </div>
                    <span>Apple Pay (Instant 1-Click)</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Recommended</span>
                </button>

                {/* Google Pay Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("google_pay")}
                  className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-sm font-semibold transition cursor-pointer ${
                    selectedMethod === "google_pay"
                      ? "bg-white/10 border-emerald-400 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-white/[0.02] border-white/[0.08] text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center font-bold text-xs">
                      GPay
                    </div>
                    <span>Google Pay</span>
                  </div>
                </button>

                {/* Credit Card Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("card")}
                  className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-sm font-semibold transition cursor-pointer ${
                    selectedMethod === "card"
                      ? "bg-white/10 border-emerald-400 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-white/[0.02] border-white/[0.08] text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span>New Credit or Debit Card</span>
                  </div>
                </button>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handle1ClickPay}
                disabled={processing}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Securing Authorization with Stripe...
                  </>
                ) : (
                  <>
                    Confirm & Settle {formattedAmount}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> End-to-End Encrypted
                </span>
                <span>•</span>
                <span>Zero Subscription Interruption</span>
              </div>
            </div>
          ) : (
            /* Celebration Screen */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight mb-2">
                Payment Successfully Cleared!
              </h2>

              <p className="text-sm text-slate-300 mb-6 max-w-sm mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{eventData?.customer_name || "Valued Subscriber"}</strong>.
                Your payment of <strong className="text-emerald-400">{formattedAmount}</strong> has cleared and your
                subscription is fully active.
              </p>

              <div className="bg-[#080F1C]/70 border border-white/[0.08] rounded-2xl p-4 mb-6 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-400">RECOVERED & ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Reference:</span>
                  <span className="font-mono text-slate-200">{eventData?.stripe_invoice_id || "in_live_recovered"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next Scheduled Renewal:</span>
                  <span className="text-slate-200">In 30 Days</span>
                </div>
              </div>

              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition"
              >
                Return to Dunnify Home
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-4 text-center text-xs text-slate-500">
        Secured by Dunnify.com WhatsApp Recovery Engine & Stripe Payments.
      </footer>
    </div>
  );
}
