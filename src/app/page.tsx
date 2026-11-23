"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import {
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Smartphone,
  ExternalLink,
  Lock,
  ChevronRight,
  Sparkles,
  CreditCard,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  // ROI Calculator State
  const [mrr, setMrr] = useState<number>(25000);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulatedPayToken, setSimulatedPayToken] = useState("tok_sarah_249");
  const [recoveredAmount, setRecoveredAmount] = useState(3840);
  const [paymentRecovered, setPaymentRecovered] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState<any[]>([
    {
      id: "ev_1",
      customer: "Marcus Vance",
      amount: 199,
      status: "RECOVERED",
      channel: "WhatsApp",
      time: "12m ago",
    },
    {
      id: "ev_2",
      customer: "Elena Rostova",
      amount: 450,
      status: "RECOVERED",
      channel: "WhatsApp",
      time: "1h ago",
    },
    {
      id: "ev_3",
      customer: "Devin Thorne",
      amount: 89,
      status: "RECOVERED",
      channel: "WhatsApp",
      time: "3h ago",
    },
  ]);

  // Derived ROI calculations
  const monthlyFailedVolume = Math.round(mrr * 0.08); // avg 8% card failure rate
  const emailRecovery = Math.round(monthlyFailedVolume * 0.18); // 18% avg email recovery
  const dunnifyRecovery = Math.round(monthlyFailedVolume * 0.65); // 65% WhatsApp recovery
  const netGainedRevenue = dunnifyRecovery - emailRecovery;

  // Handle Live Simulation
  const runSimulation = async () => {
    setIsSimulating(true);
    setPaymentRecovered(false);

    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "Sarah Jenkins",
          amount: 249,
          currency: "USD",
          phone: "+1 (555) 723-9011",
          planName: "Agency Tier Subscription",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimulationActive(true);
        if (data.payload?.invoiceId) {
          setSimulatedPayToken(data.payload.invoiceId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const completeCustomerPayment = () => {
    setPaymentRecovered(true);
    setRecoveredAmount((prev) => prev + 249);
    setSimulatedLogs((prev) => [
      {
        id: `ev_${Date.now()}`,
        customer: "Sarah Jenkins",
        amount: 249,
        status: "RECOVERED",
        channel: "WhatsApp",
        time: "Just now",
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-[#080F1C] text-[#F8FAFC] font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-2 text-center text-xs sm:text-sm font-semibold tracking-wide text-white flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-200" />
        <span>Dunnify.com Launch: Connect your Stripe account in 60 seconds. Zero code required.</span>
      </div>

      {/* Navigation */}
      <header className="border-b border-white/[0.08] backdrop-blur-md sticky top-0 z-50 bg-[#080F1C]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <Logo size="md" />
            <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full hidden sm:inline-block">
              For Stripe
            </span>
          </div>

          <nav className="hidden lg:flex items-center space-x-8 text-sm text-slate-400 font-medium">
            <a href="#pipeline" className="hover:text-white transition">4-Step Engine</a>
            <a href="#demo" className="hover:text-white transition">Interactive Demo</a>
            <a href="#roi-calculator" className="hover:text-white transition">ROI Calculator</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 font-semibold transition">
              Live Dashboard
            </Link>
          </nav>

          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-lg shadow-emerald-500/20"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        {/* Subtle mesh background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            95% Open Rate vs 18% for Dunning Emails
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-50 leading-[1.12] mb-6">
            Recover Lost Stripe Revenue on{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              WhatsApp
            </span>{" "}
            Before It Turns Into Churn.
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            When cards expire or soft declines happen, automated billing emails get buried in spam.
            Dunnify sends an instant, branded WhatsApp notification with a 1-click Apple Pay link
            to claw back lost dollars on autopilot.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              Simulate a Failed Payment
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Open Merchant Dashboard
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Official Stripe Webhooks
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" /> Meta WhatsApp Cloud API
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 60-Second Setup
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. The 4-Step Hero Visual Pipeline (Conversion Engine)        */}
      {/* ------------------------------------------------------------- */}
      <section id="pipeline" className="py-12 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            The Dunnify Recovery Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-2">
            From Card Failure to Cleared Cash in 60 Seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Step 1: Stripe Payment Failed */}
          <div className="bg-[#1A121E] border border-rose-500/30 rounded-2xl p-5 shadow-lg relative group">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center mb-3 text-xs">
              01
            </div>
            <div className="text-xs uppercase font-mono font-bold text-rose-400 mb-1">
              Payment Failed
            </div>
            <div className="text-base font-bold text-slate-100 mb-2">
              Stripe Webhook Fires
            </div>
            <p className="text-xs text-rose-200/70 leading-relaxed">
              Card expired, insufficient funds, or soft decline ($149 – $890).
            </p>
            <div className="mt-4 pt-3 border-t border-rose-500/20 text-[11px] text-rose-300 font-mono">
              invoice.payment_failed
            </div>
          </div>

          {/* Step 2: Dunnify Ingestion */}
          <div className="bg-[#111C2E] border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative group">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center mb-3 text-xs">
              02
            </div>
            <div className="text-xs uppercase font-mono font-bold text-cyan-400 mb-1">
              Automated Queue
            </div>
            <div className="text-base font-bold text-slate-100 mb-2">
              Dunnify Brain Queues
            </div>
            <p className="text-xs text-cyan-200/70 leading-relaxed">
              Cryptographic signature verified, quiet hours audited, sequence scheduled.
            </p>
            <div className="mt-4 pt-3 border-t border-cyan-500/20 text-[11px] text-cyan-300 font-mono">
              3-Stage Multi-Dunning
            </div>
          </div>

          {/* Step 3: WhatsApp 1-Click Pay */}
          <div className="bg-[#0A251E] border border-emerald-500/40 rounded-2xl p-5 shadow-lg relative group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mb-3 text-xs">
              03
            </div>
            <div className="text-xs uppercase font-mono font-bold text-emerald-400 mb-1">
              Direct Phone Ping
            </div>
            <div className="text-base font-bold text-slate-100 mb-2">
              WhatsApp 1-Click Pay
            </div>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Subscriber receives branded WhatsApp ping with 1-click Apple Pay link.
            </p>
            <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-300 font-mono">
              95% Open Rate in &lt;15m
            </div>
          </div>

          {/* Step 4: Payment Recovered */}
          <div className="bg-[#064E3B] border border-emerald-400/60 rounded-2xl p-5 shadow-xl relative group shadow-emerald-500/10">
            <div className="w-8 h-8 rounded-xl bg-emerald-400 text-black font-extrabold flex items-center justify-center mb-3 text-xs">
              04
            </div>
            <div className="text-xs uppercase font-mono font-bold text-emerald-200 mb-1">
              Cash Recovered
            </div>
            <div className="text-base font-bold text-white mb-2">
              Payment Cleared
            </div>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              Subscriber taps Apple Pay in 10s. Circuit breaker cancels follow-up nudges.
            </p>
            <div className="mt-4 pt-3 border-t border-emerald-400/30 text-[11px] text-emerald-200 font-mono font-bold">
              +$ Cash Back in Stripe
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* Interactive Simulation Hub                                    */}
      {/* ------------------------------------------------------------- */}
      <section id="demo" className="py-16 border-t border-white/[0.08] bg-[#0B1528]/50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mb-3">
              Experience the Recovery Pipeline Live
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Click below to simulate an involuntary card failure on Stripe and watch how Dunnify
              recovers the subscriber within seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Control Panel (4 cols) */}
            <div className="lg:col-span-4 bg-[#111C2E] border border-white/[0.08] rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-50 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Step 1: The Decline
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Simulate what happens when Stripe fires an <code>invoice.payment_failed</code> event
                for an agency or SaaS subscriber.
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-[#080F1C] border border-white/[0.06] rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Subscriber Name</div>
                  <div className="font-semibold text-slate-100">Sarah Jenkins</div>
                </div>
                <div className="bg-[#080F1C] border border-white/[0.06] rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Plan / Ticket Size</div>
                  <div className="font-semibold text-emerald-400">$249.00 / month</div>
                </div>
                <div className="bg-[#080F1C] border border-white/[0.06] rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Stripe Decline Code</div>
                  <div className="font-mono text-xs text-rose-400 font-semibold">
                    do_not_honor (soft decline)
                  </div>
                </div>
              </div>

              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                    Firing Stripe Webhook...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-rose-400" /> Trigger Failed $249 Charge
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp Phone Mockup (4 cols) */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="w-full max-w-[340px] bg-neutral-900 border-[6px] border-neutral-800 rounded-[44px] p-4 shadow-2xl shadow-emerald-500/10 relative">
                {/* Speaker notch */}
                <div className="w-24 h-4 bg-neutral-800 rounded-full mx-auto mb-4" />

                {/* WhatsApp Header */}
                <div className="bg-[#1f2c34] text-white p-3 rounded-t-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#080F1C] border border-emerald-500/30 flex items-center justify-center overflow-hidden p-1 shadow">
                    <img
                      src="/brand/dunnify-icon.png"
                      alt="Dunnify Avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1">
                      Dunnify Billing Guard
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-[10px] text-neutral-400">Official Business Account</div>
                  </div>
                </div>

                {/* WhatsApp Chat Area */}
                <div className="bg-[#0b141a] p-3 rounded-b-2xl min-h-[360px] flex flex-col justify-end">
                  {simulationActive ? (
                    <div className="space-y-3">
                      <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tr-none text-xs leading-relaxed shadow">
                        <p className="font-semibold mb-1 text-emerald-200">Payment Notice</p>
                        <p className="text-neutral-200 mb-2">
                          Hi Sarah, your monthly payment of <strong className="text-white">$249.00</strong> for your Agency Tier subscription couldn’t be processed due to a temporary bank decline.
                        </p>
                        <p className="text-neutral-300 text-[11px]">
                          Tap below to update your payment details via Apple Pay or credit card to keep your subscription uninterrupted.
                        </p>
                      </div>

                      {/* 1-Click Action Button */}
                      {!paymentRecovered ? (
                        <div className="space-y-2">
                          <button
                            onClick={completeCustomerPayment}
                            className="w-full py-2.5 px-3 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-black" />
                            Update via 1-Click Apple Pay
                          </button>
                          <a
                            href={`/pay/${simulatedPayToken}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-1.5 text-center text-[10px] text-emerald-300 hover:text-white flex items-center justify-center gap-1"
                          >
                            Open in Standalone Pay Window
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-lg text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Payment Method Updated!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-neutral-500 text-xs py-20">
                      Waiting for failed payment webhook...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Merchant Real-time Dashboard (4 cols) */}
            <div className="lg:col-span-4 bg-[#111C2E] border border-white/[0.08] rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-50 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Step 2: Instant Recovery
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Your Stripe dashboard logs <code>invoice.payment_succeeded</code> and your Dunnify
                metrics update automatically.
              </p>

              <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/25 rounded-2xl p-5 mb-6 text-center">
                <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">
                  Total Recovered Cash
                </div>
                <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
                  ${recoveredAmount.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Recovery rate: <strong className="text-emerald-400 font-semibold">68.4%</strong>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Live Audit Feed</span>
                  <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold">
                    View Full Feed →
                  </Link>
                </div>
                <div className="space-y-2">
                  {simulatedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#080F1C] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-100">{log.customer}</div>
                        <div className="text-slate-400 text-[10px]">{log.time} • via {log.channel}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400 font-mono">+${log.amount}</div>
                        <div className="text-[10px] text-emerald-500/80 font-mono font-medium">{log.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ROI Calculator Section                                        */}
      {/* ------------------------------------------------------------- */}
      <section id="roi-calculator" className="py-20 border-t border-white/[0.08]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Hard Economics
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mt-3 mb-4">
              Calculate What Involuntary Churn Is Costing You
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Roughly 5% to 9% of all recurring B2B subscriptions fail every month due to expired cards, bank freezes, and soft declines.
            </p>
          </div>

          <div className="bg-[#111C2E] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <label className="text-sm font-semibold text-slate-300">
                  Your Monthly Recurring Revenue (MRR):
                </label>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ${mrr.toLocaleString()} / mo
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="150000"
                step="5000"
                value={mrr}
                onChange={(e) => setMrr(Number(e.target.value))}
                className="w-full h-2 bg-[#080F1C] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                <span>$5,000</span>
                <span>$75,000</span>
                <span>$150,000+</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-[#080F1C] border border-white/[0.06] rounded-2xl p-5">
                <div className="text-xs text-slate-400 mb-1">Failed Charges / Mo (~8%)</div>
                <div className="text-2xl font-bold text-rose-400 font-mono">
                  ${monthlyFailedVolume.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Lost to expired cards</div>
              </div>

              <div className="bg-[#080F1C] border border-white/[0.06] rounded-2xl p-5">
                <div className="text-xs text-slate-400 mb-1">Stripe Email Dunning (~18%)</div>
                <div className="text-2xl font-bold text-slate-300 font-mono">
                  ${emailRecovery.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Most emails go to spam</div>
              </div>

              <div className="bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-5">
                <div className="text-xs text-emerald-300 font-semibold mb-1">With Dunnify WhatsApp (~65%)</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  ${dunnifyRecovery.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-300/80 mt-1">Instant 95% open rate</div>
              </div>
            </div>

            <div className="mt-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Net New Cash Dunnify Puts in Your Bank:
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  +${netGainedRevenue.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-slate-400 font-sans">every single month</span>
                </div>
              </div>
              <a
                href="#pricing"
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition shadow-lg shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
              >
                Claim This Revenue
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* Pricing Section                                               */}
      {/* ------------------------------------------------------------- */}
      <section id="pricing" className="py-20 border-t border-white/[0.08] bg-[#0B1528]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-50 tracking-tight mt-3 mb-4">
              Pays For Itself With 1 Saved Customer
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              No per-seat fees. No locked enterprise contracts. 30-day money-back guarantee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Starter */}
            <div className="bg-[#111C2E] border border-white/[0.08] rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-50 mb-2">Starter</h3>
                <p className="text-xs text-slate-400 mb-6">
                  For indie SaaS and boutique agencies getting started with Stripe.
                </p>
                <div className="text-4xl font-extrabold text-slate-50 mb-6 font-mono">
                  $79 <span className="text-sm font-normal text-slate-400 font-sans">/ mo</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to $5,000 monthly recovered
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant WhatsApp Dunning
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1-Click Apple Pay Links
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Recovered Analytics
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white transition text-center"
              >
                Get Started
              </Link>
            </div>

            {/* Growth (Featured) */}
            <div className="bg-gradient-to-b from-emerald-500/15 via-[#111C2E] to-[#080F1C] border-2 border-emerald-500/50 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-50 mb-2">Growth</h3>
                <p className="text-xs text-slate-400 mb-6">
                  For scaling SaaS and agencies doing $15k–$75k MRR.
                </p>
                <div className="text-4xl font-extrabold text-slate-50 mb-6 font-mono">
                  $149 <span className="text-sm font-normal text-slate-400 font-sans">/ mo</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to $20,000 monthly recovered
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3-Stage Dunning Sequence
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Quiet Hours & Email Fallback
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Priority Webhook Processing
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-lg shadow-emerald-500/25 text-center"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Scale */}
            <div className="bg-[#111C2E] border border-white/[0.08] rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-50 mb-2">Scale</h3>
                <p className="text-xs text-slate-400 mb-6">
                  For high-volume merchants, masterminds, and enterprise teams.
                </p>
                <div className="text-4xl font-extrabold text-slate-50 mb-6 font-mono">
                  $299 <span className="text-sm font-normal text-slate-400 font-sans">/ mo</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited monthly recovery
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dedicated WhatsApp Phone Number
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Custom SMS Fallback Delivery
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 24/7 Priority Founder Support
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white transition text-center"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-slate-400 font-medium">— The WhatsApp-First Dunning Engine</span>
          </div>
          <div>© 2026 Dunnify Technologies. All rights reserved. Built for Stripe merchants worldwide.</div>
        </div>
      </footer>
    </div>
  );
}
