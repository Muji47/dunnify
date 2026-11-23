"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import {
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planTier, setPlanTier] = useState<"starter" | "growth" | "scale">("growth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          companyName,
          email,
          password,
          planTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080F1C] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <div className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-emerald-400 font-bold hover:text-emerald-300 transition"
          >
            Sign in →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 z-10 my-4">
        <div className="w-full max-w-lg bg-[#111C2E]/90 border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <Zap className="w-3.5 h-3.5" />
              14-Day Free Merchant Trial
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">
              Start recovering Stripe ARR
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Setup takes 2 minutes. Eliminate involuntary churn with automated WhatsApp dunning sequences.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4 text-xs">
            {/* Name & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Founder / Admin Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Marcus Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Company / Product
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Vance Growth Media"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="marcus@vancegrowth.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Password (min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              </div>
            </div>

            {/* Plan Tier Selection */}
            <div className="pt-2">
              <label className="block text-slate-300 font-semibold mb-2">
                Select Your Plan Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "starter", name: "Starter", price: "$79/mo", limit: "Up to $10k/mo MRR" },
                  { id: "growth", name: "Growth", price: "$149/mo", limit: "Up to $50k/mo MRR", popular: true },
                  { id: "scale", name: "Scale", price: "$299/mo", limit: "Unlimited MRR" },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanTier(plan.id as any)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                      planTier === plan.id
                        ? "bg-emerald-500/15 border-emerald-400 text-slate-100 ring-1 ring-emerald-400"
                        : "bg-[#080F1C] border-white/[0.08] text-slate-400 hover:border-white/20"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-400 text-black uppercase">
                        Popular
                      </span>
                    )}
                    <div className="font-bold text-xs">{plan.name}</div>
                    <div className="font-mono text-emerald-400 text-xs font-semibold">{plan.price}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{plan.limit}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Provisioning Merchant Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Launch Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-slate-500 z-10">
        No credit card required upfront • Instant 14-day access to full WhatsApp dunning engine
      </footer>
    </div>
  );
}
