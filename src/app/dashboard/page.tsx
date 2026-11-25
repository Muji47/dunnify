"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Logo } from "@/components/brand/Logo";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { RealtimeToasts, DashboardToast } from "@/components/dashboard/RealtimeToasts";
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Mail,
  Zap,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Settings,
  ChevronRight,
  PhoneCall,
  X,
  Play,
  Calendar,
  Radio,
  Sparkles,
  LogOut,
  User,
  FastForward,
  Copy,
  Check,
  Download,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({
    totalRecoveredCash: 0,
    recoveryRate: 0,
    retainedARR: 0,
    activePipelines: 0,
    totalFailedVolume: 0,
  });
  const [events, setEvents] = useState<any[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Realtime WebSocket state
  const [realtimeStatus, setRealtimeStatus] = useState<"SUBSCRIBED" | "CONNECTING" | "DISCONNECTED">("CONNECTING");
  const [realtimeEventCount, setRealtimeEventCount] = useState<number>(0);
  const [toasts, setToasts] = useState<DashboardToast[]>([]);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Modals state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedEventForTimeline, setSelectedEventForTimeline] = useState<any | null>(null);
  const [timelineMessages, setTimelineMessages] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Test simulation form state
  const [testForm, setTestForm] = useState({
    customerName: "Julian Hayes",
    customerEmail: "julian@hayesgrowth.com",
    customerPhone: "+1 (555) 849-2041",
    amount: "249.00",
    planName: "SaaS Enterprise Monthly",
    isMissingPhone: false,
  });
  const [triggeringTest, setTriggeringTest] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    quiet_hours_enabled: true,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
    stripe_webhook_secret: "",
    stripe_restricted_key: "",
    meta_whatsapp_phone_number_id: "",
    meta_whatsapp_token: "",
    slack_webhook_url: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState("");
  const [timeMachineLoading, setTimeMachineLoading] = useState(false);
  const [timeMachineFeedback, setTimeMachineFeedback] = useState<string | null>(null);
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    mode?: string;
    verifiedAt?: string;
  } | null>(null);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setEvents(data.events);
        setMerchant(data.merchant);
        if (data.merchant) {
          setSettingsForm({
            quiet_hours_enabled: data.merchant.quiet_hours_enabled ?? true,
            quiet_hours_start: data.merchant.quiet_hours_start || "22:00",
            quiet_hours_end: data.merchant.quiet_hours_end || "08:00",
            stripe_webhook_secret: data.merchant.stripe_webhook_secret || "",
            stripe_restricted_key: data.merchant.stripe_restricted_key || "",
            meta_whatsapp_phone_number_id: data.merchant.meta_whatsapp_phone_number_id || "",
            meta_whatsapp_token: data.merchant.meta_whatsapp_token || "",
            slack_webhook_url: data.merchant.slack_webhook_url || "",
          });
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const openTimeline = useCallback(async (event: any) => {
    setSelectedEventForTimeline(event);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/dashboard/events/${event.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setTimelineMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  // Initial fetch and Realtime WebSocket Subscription
  useEffect(() => {
    fetchData();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRealtimeStatus("DISCONNECTED");
      return;
    }

    const channel = supabase
      .channel("dunnify-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recovery_events" },
        (payload) => {
          console.log("[Supabase Realtime recovery_events]", payload.eventType, payload);
          setRealtimeEventCount((prev) => prev + 1);

          if (payload.eventType === "INSERT") {
            const newEvent = payload.new as any;
            setEvents((prev) => {
              if (prev.some((e) => e.id === newEvent.id || e.stripe_invoice_id === newEvent.stripe_invoice_id)) {
                return prev;
              }
              return [newEvent, ...prev];
            });

            setHighlightedRowId(newEvent.id);
            setTimeout(() => setHighlightedRowId(null), 6000);

            // Add Toast
            const toastId = `toast_${Date.now()}`;
            setToasts((prev) => [
              {
                id: toastId,
                type: "failed_payment",
                title: "Failed Payment Ingested",
                message: `Stripe invoice failed for ${newEvent.customer_name}. WhatsApp Stage 1 sequence initiated!`,
                amount: newEvent.amount,
                currency: newEvent.currency,
                timestamp: new Date().toISOString(),
                onAction: () => openTimeline(newEvent),
                actionLabel: "Inspect Dunning Nudge",
              },
              ...prev.slice(0, 2),
            ]);
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 8000);

            fetchData();
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            setEvents((prev) =>
              prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
            );

            setHighlightedRowId(updated.id);
            setTimeout(() => setHighlightedRowId(null), 6000);

            if (updated.status === "RECOVERED") {
              // Confetti burst for recovered revenue!
              try {
                confetti({
                  particleCount: 100,
                  spread: 80,
                  origin: { y: 0.6 },
                  colors: ["#10B981", "#34D399", "#059669", "#6EE7B7", "#F8FAFC"],
                });
              } catch (e) {
                // ignore
              }

              const toastId = `toast_${Date.now()}`;
              setToasts((prev) => [
                {
                  id: toastId,
                  type: "recovered",
                  title: "Payment Successfully Recovered!",
                  message: `1-Click recovery cleared for ${updated.customer_name}. Circuit Breaker cancelled subsequent nudges!`,
                  amount: updated.amount,
                  currency: updated.currency,
                  timestamp: new Date().toISOString(),
                  onAction: () => openTimeline(updated),
                  actionLabel: "View Receipt",
                },
                ...prev.slice(0, 2),
              ]);
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toastId));
              }, 8000);
            }

            setSelectedEventForTimeline((prev: any) => {
              if (prev && prev.id === updated.id) {
                return { ...prev, ...updated };
              }
              return prev;
            });

            fetchData();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dunning_messages" },
        (payload) => {
          console.log("[Supabase Realtime dunning_messages]", payload.eventType, payload);
          setRealtimeEventCount((prev) => prev + 1);

          const msg = payload.new as any;
          setSelectedEventForTimeline((prev: any) => {
            if (prev && prev.id === msg.recovery_event_id) {
              openTimeline(prev);
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log("[Supabase Realtime Subscription Status]:", status);
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("SUBSCRIBED");
        } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeStatus("DISCONNECTED");
        } else {
          setRealtimeStatus("CONNECTING");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, openTimeline]);

  const handleTriggerTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggeringTest(true);
    try {
      const res = await fetch("/api/dashboard/trigger-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: testForm.customerName,
          customerEmail: testForm.customerEmail,
          customerPhone: testForm.isMissingPhone ? "" : testForm.customerPhone,
          amount: parseFloat(testForm.amount),
          planName: testForm.planName,
        }),
      });
      if (res.ok) {
        setIsTestModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringTest(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        setSettingsSuccessMessage("Settings saved successfully!");
        setTimeout(() => setSettingsSuccessMessage(""), 3000);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestStripeConnection = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);
    try {
      const res = await fetch("/api/dashboard/stripe/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeRestrictedKey: settingsForm.stripe_restricted_key,
          stripeWebhookSecret: settingsForm.stripe_webhook_secret,
          saveKey: true,
        }),
      });
      const data = await res.json();
      setStripeTestResult(data);
      if (data.success) {
        await fetchData();
      }
    } catch (err: any) {
      setStripeTestResult({
        success: false,
        error: err.message || "Failed to reach test connection endpoint.",
      });
    } finally {
      setTestingStripe(false);
    }
  };

  const handleTestSlackConnection = async () => {
    setTestingSlack(true);
    setSlackTestResult(null);
    try {
      const res = await fetch("/api/dashboard/slack/test-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slackWebhookUrl: settingsForm.slack_webhook_url,
          saveUrl: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSlackTestResult({
          success: true,
          message: "Test celebration message posted to Slack successfully!",
        });
        await fetchData();
      } else {
        setSlackTestResult({
          success: false,
          error: data.error || "Failed to deliver message to Slack.",
        });
      }
    } catch (err: any) {
      setSlackTestResult({
        success: false,
        error: err.message || "Network error pinging Slack.",
      });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleProcessDueMessages = async () => {
    try {
      await fetch("/api/scheduler/dunning", { method: "POST" });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeMachineAdvance = async (hours: number) => {
    setTimeMachineLoading(true);
    setTimeMachineFeedback(null);
    try {
      const res = await fetch("/api/scheduler/dunning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advanceHours: hours }),
      });
      const data = await res.json();
      setTimeMachineFeedback(
        `Time-Machine advanced +${hours}h: ${data.acceleratedCount ?? 0} scheduled message(s) accelerated, ${data.processedCount ?? 0} dispatched.`
      );
      await fetchData();
      if (selectedEventForTimeline) {
        await openTimeline(selectedEventForTimeline);
      }
      setTimeout(() => setTimeMachineFeedback(null), 6000);
    } catch (err) {
      console.error("Time Machine error:", err);
      setTimeMachineFeedback("Failed to trigger Time-Machine advance.");
      setTimeout(() => setTimeMachineFeedback(null), 5000);
    } finally {
      setTimeMachineLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleSimulatePaymentClearance = async (token: string) => {
    try {
      await fetch(`/api/pay/${token}`, { method: "POST" });
      await fetchData();
      if (selectedEventForTimeline) {
        await openTimeline(selectedEventForTimeline);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const matchesStatus =
      statusFilter === "ALL" ? true : ev.status === statusFilter;
    const matchesSearch =
      ev.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.stripe_invoice_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#080F1C] text-slate-50 selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#080F1C]/90 backdrop-blur-md sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{merchant?.company_name || "Stripe Production Guard"}</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-semibold uppercase text-[10px] tracking-wider">
              {merchant?.plan_tier || "Growth"} Tier
            </span>
          </div>

          {/* Realtime WebSocket Stream Badge */}
          <div className="flex items-center gap-2">
            {realtimeStatus === "SUBSCRIBED" ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="font-bold text-[11px] tracking-wide">LIVE WEBSOCKET</span>
                <span className="text-emerald-400/60 font-mono text-[10px]">({realtimeEventCount} synced)</span>
              </div>
            ) : realtimeStatus === "CONNECTING" ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span className="font-bold text-[11px]">CONNECTING STREAM...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="font-medium text-[11px]">POLLING BACKUP</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Stripe Decline</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition cursor-pointer"
            title="Settings & Webhook Setup"
          >
            <Settings className="w-4 h-4" />
          </button>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition px-2 py-1 hidden md:block"
          >
            Landing
          </Link>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black font-bold text-xs flex items-center justify-center shadow-md">
                {merchant?.name ? merchant.name.substring(0, 2).toUpperCase() : "FM"}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-200 leading-tight">
                  {merchant?.name || "Founder Merchant"}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                  {merchant?.email || "founder@dunnify.com"}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/[0.04] border border-white/[0.08] hover:bg-rose-500/10 hover:border-rose-500/20 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome & Live Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">
              Payment Recovery Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time audit log of WhatsApp dunning dispatches, Apple Pay conversions, and recovered ARR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/api/dashboard/export/csv"
              download
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
              title="Download accounting CSV report of all failed and recovered payments"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </a>
            <button
              onClick={fetchData}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => handleTimeMachineAdvance(48)}
              disabled={timeMachineLoading}
              title="Time-Machine: Advance scheduled dunning queue by 48h to trigger Stage 2 (Gentle Reminder) immediately"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5"
            >
              <FastForward className={`w-3.5 h-3.5 text-indigo-400 ${timeMachineLoading ? "animate-pulse" : ""}`} />
              <span>Time-Machine (+48h)</span>
            </button>
            <button
              onClick={() => handleTimeMachineAdvance(96)}
              disabled={timeMachineLoading}
              title="Time-Machine: Advance scheduled dunning queue by 96h to trigger Stage 3 (Final Notice) immediately"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5"
            >
              <FastForward className={`w-3.5 h-3.5 text-amber-400 ${timeMachineLoading ? "animate-pulse" : ""}`} />
              <span>Time-Machine (+96h)</span>
            </button>
            <button
              onClick={handleProcessDueMessages}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-black fill-black" />
              Process Due Reminders
            </button>
          </div>
        </div>

        {/* Time-Machine Notification Banner */}
        {timeMachineFeedback && (
          <div className="mb-6 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FastForward className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{timeMachineFeedback}</span>
            </div>
            <button
              onClick={() => setTimeMachineFeedback(null)}
              className="text-indigo-400 hover:text-indigo-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Recovered Cash */}
          <div className="bg-[#111C2E] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">
              <span>Total Recovered Cash</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-50 font-mono tracking-tight mb-2">
              ${kpis.totalRecoveredCash.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Direct to Merchant Stripe
            </div>
          </div>

          {/* Recovery Rate */}
          <div className="bg-[#111C2E] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">
              <span>Recovery Rate</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-50 font-mono tracking-tight mb-2">
              {kpis.recoveryRate}%
            </div>
            <div className="text-xs text-slate-400">
              <strong className="text-teal-400 font-semibold">3.8x higher</strong> than email-only dunning
            </div>
          </div>

          {/* Retained ARR */}
          <div className="bg-[#111C2E] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">
              <span>Retained Annual ARR</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight mb-2">
              +${kpis.retainedARR.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">
              Annualized recurring savings
            </div>
          </div>

          {/* Active Pipelines */}
          <div className="bg-[#111C2E] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">
              <span>Active Pipelines</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-50 font-mono tracking-tight mb-2">
              {kpis.activePipelines}
            </div>
            <div className="text-xs text-slate-400">
              Involuntarily churned accounts in grace
            </div>
          </div>
        </div>

        {/* Live Recovery Table Container */}
        <div className="bg-[#111C2E] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                Live Dunning Audit Feed
                <span className="text-[10px] font-mono bg-white/[0.06] text-slate-300 px-2 py-0.5 rounded-full">
                  {filteredEvents.length} events
                </span>
              </h2>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-48 sm:w-56"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-[#080F1C] p-0.5 rounded-xl border border-white/[0.08] text-xs">
                {(["ALL", "RECOVERED", "PENDING", "PHONE_MISSING"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === status
                        ? "bg-white/10 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {status === "ALL"
                      ? "All"
                      : status === "RECOVERED"
                      ? "Recovered"
                      : status === "PENDING"
                      ? "Pending"
                      : "Missing Phone"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080F1C]/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-5">Subscriber</th>
                  <th className="py-3 px-5">Plan & Amount</th>
                  <th className="py-3 px-5">Channel</th>
                  <th className="py-3 px-5">Stage</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Created</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredEvents.map((ev) => {
                  const formattedAmt = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: ev.currency || "USD",
                  }).format(ev.amount);

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-white/[0.02] transition-all duration-500 group ${
                        ev.id === highlightedRowId
                          ? "bg-emerald-500/15 ring-2 ring-emerald-400 shadow-xl shadow-emerald-500/20"
                          : ""
                      }`}
                    >
                      {/* Subscriber */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          {ev.customer_name}
                          {ev.id === highlightedRowId && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{ev.customer_email}</div>
                        {ev.customer_phone ? (
                          <div className="text-[10px] text-slate-500">{ev.customer_phone}</div>
                        ) : (
                          <div className="text-[10px] text-rose-400 font-medium">No Phone Number</div>
                        )}
                      </td>

                      {/* Plan & Amount */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-200">{ev.plan_name || "Subscription"}</div>
                        <div className="font-mono font-bold text-emerald-400 text-sm">
                          {formattedAmt}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-4 px-5">
                        {ev.customer_phone ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            <Mail className="w-3 h-3 text-blue-400" />
                            Email Fallback
                          </span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-300">
                          Stage {ev.current_stage || 1}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {ev.current_stage === 1
                            ? "Day 0 Instant"
                            : ev.current_stage === 2
                            ? "Day 2 Reminder"
                            : "Day 4 Final Notice"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {ev.status === "RECOVERED" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            RECOVERED
                          </span>
                        )}
                        {ev.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-400" />
                            PENDING
                          </span>
                        )}
                        {ev.status === "PHONE_MISSING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            PHONE MISSING
                          </span>
                        )}
                        {ev.status === "CHURNED" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            CHURNED
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="py-4 px-5 text-slate-400 text-[11px]">
                        {new Date(ev.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-2">
                        {ev.status === "PENDING" && (
                          <button
                            onClick={() => handleSimulatePaymentClearance(ev.pay_token)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 font-bold transition text-[11px] cursor-pointer"
                            title="Simulate subscriber paying via 1-Click Apple Pay"
                          >
                            Settle
                          </button>
                        )}

                        <button
                          onClick={() => openTimeline(ev)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition text-[11px] font-medium cursor-pointer"
                        >
                          Timeline
                        </button>

                        <a
                          href={`/pay/${ev.pay_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition text-[11px] font-medium cursor-pointer"
                        >
                          Pay Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No recovery events found matching the criteria.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Timeline / Sequence Inspector Modal */}
      {/* ------------------------------------------------------------------ */}
      {selectedEventForTimeline && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/[0.1] rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedEventForTimeline(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/[0.04]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Multi-Stage Dunning Pipeline
              </span>
              <h3 className="text-xl font-bold text-slate-50 mt-3">
                {selectedEventForTimeline.customer_name} ({selectedEventForTimeline.stripe_invoice_id})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Amount: ${selectedEventForTimeline.amount} {selectedEventForTimeline.currency} • Status:{" "}
                <span className="text-emerald-400 font-semibold">{selectedEventForTimeline.status}</span>
              </p>
            </div>

            {loadingTimeline ? (
              <div className="py-12 flex justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {timelineMessages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className="bg-[#080F1C] border border-white/[0.08] rounded-2xl p-4 text-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">
                          Stage {msg.stage}:{" "}
                          {msg.stage === 1
                            ? "Day 0 Instant Nudge"
                            : msg.stage === 2
                            ? "Day 2 Reminder (+48h)"
                            : "Day 4 Final Notice (+96h)"}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400">
                          {msg.channel}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          msg.status === "delivered" || msg.status === "sent"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : msg.status === "cancelled"
                            ? "bg-slate-500/10 text-slate-400"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed mb-2 font-mono text-[11px] bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
                      {msg.body}
                    </p>

                    <div className="flex flex-wrap justify-between text-[10px] text-slate-500">
                      <span>Scheduled: {new Date(msg.scheduled_for).toLocaleString()}</span>
                      {msg.sent_at && <span>Dispatched: {new Date(msg.sent_at).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Circuit Breaker Demo Action */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <a
                href={`/pay/${selectedEventForTimeline.pay_token}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
              >
                Open 1-Click Pay View
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {selectedEventForTimeline.status !== "RECOVERED" && (
                <button
                  onClick={() => handleSimulatePaymentClearance(selectedEventForTimeline.pay_token)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer"
                >
                  Simulate Customer 1-Click Settle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Trigger Test Payment Failure Modal */}
      {/* ------------------------------------------------------------------ */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/[0.1] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/[0.04]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-slate-50">
                Trigger Mock Stripe Payment Failure
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Simulates an <code>invoice.payment_failed</code> event to test the 3-stage sequence,
              quiet hours compliance, and emergency fallback.
            </p>

            <form onSubmit={handleTriggerTest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subscriber Name</label>
                <input
                  type="text"
                  required
                  value={testForm.customerName}
                  onChange={(e) => setTestForm({ ...testForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Billing Email</label>
                <input
                  type="email"
                  required
                  value={testForm.customerEmail}
                  onChange={(e) => setTestForm({ ...testForm, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">WhatsApp Phone Number</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testForm.isMissingPhone}
                      onChange={(e) => setTestForm({ ...testForm, isMissingPhone: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    Test Missing Phone Fallback
                  </label>
                </div>
                <input
                  type="text"
                  disabled={testForm.isMissingPhone}
                  value={testForm.customerPhone}
                  onChange={(e) => setTestForm({ ...testForm, customerPhone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100 disabled:opacity-40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={testForm.amount}
                    onChange={(e) => setTestForm({ ...testForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={testForm.planName}
                    onChange={(e) => setTestForm({ ...testForm, planName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080F1C] border border-white/[0.08] rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={triggeringTest}
                  className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  {triggeringTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting Webhook...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Fire Payment Failed Webhook
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Settings Modal (60-Second Stripe Setup Wizard + Meta WhatsApp)     */}
      {/* ------------------------------------------------------------------ */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/[0.1] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/[0.04]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-50 mb-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              Settings & Integrations
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Connect your Stripe account via restricted read-only credentials (no OAuth review required) and Meta WhatsApp API.
            </p>

            {settingsSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {settingsSuccessMessage}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
              {/* -------------------------------------------------------- */}
              {/* 60-SECOND STRIPE SETUP WIZARD                            */}
              {/* -------------------------------------------------------- */}
              <div className="bg-[#080F1C] border border-emerald-500/20 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-slate-100 text-sm">60-Second Stripe Setup</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    No OAuth Required
                  </span>
                </div>

                {/* Step 1: Webhook URL */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-300 font-semibold flex items-center justify-between">
                    <span>1. Your Webhook Destination URL:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : "https://dunnify.vercel.app"}/api/webhooks/stripe?merchant_id=${merchant?.id || "default"}`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-1 font-mono transition"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedWebhook ? "Copied!" : "Copy URL"}
                    </button>
                  </div>
                  <div className="p-2.5 bg-[#111C2E] border border-white/[0.06] rounded-xl font-mono text-[11px] text-emerald-400 break-all select-all">
                    {typeof window !== "undefined" ? window.location.origin : "https://dunnify.vercel.app"}/api/webhooks/stripe?merchant_id={merchant?.id || "default"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    In Stripe Dashboard → <strong>Developers</strong> → <strong>Webhooks</strong>, add this URL and listen for: <code className="text-slate-300">invoice.payment_failed</code> & <code className="text-slate-300">invoice.payment_succeeded</code>.
                  </div>
                </div>

                {/* Step 2: Webhook Signing Secret */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    2. Stripe Webhook Signing Secret (whsec_...)
                  </label>
                  <input
                    type="password"
                    placeholder="whsec_..."
                    value={settingsForm.stripe_webhook_secret}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, stripe_webhook_secret: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111C2E] border border-white/[0.08] rounded-xl text-slate-100 font-mono text-xs focus:border-emerald-500/50 outline-none"
                  />
                </div>

                {/* Step 3: Restricted API Key */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold text-[11px]">
                      3. Stripe Restricted API Key (rk_live_... / rk_test_...)
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium">Read-Only Scoped</span>
                  </div>
                  <input
                    type="password"
                    placeholder="rk_live_... or rk_test_..."
                    value={settingsForm.stripe_restricted_key}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, stripe_restricted_key: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111C2E] border border-white/[0.08] rounded-xl text-slate-100 font-mono text-xs focus:border-emerald-500/50 outline-none"
                  />
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Create in Stripe → <strong>API Keys</strong> → <strong>Restricted Keys</strong> with Read access for <strong className="text-slate-300">Invoices</strong> & <strong className="text-slate-300">Customers</strong>. Zero risk: never share master secret keys.
                  </div>
                </div>

                {/* Step 4: Test Connection Button & Result */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTestStripeConnection}
                    disabled={testingStripe || !settingsForm.stripe_restricted_key}
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-400 ${testingStripe ? "animate-spin" : ""}`} />
                    {testingStripe ? "Testing Stripe Connection..." : "Test Stripe Connection ⚡"}
                  </button>

                  {stripeTestResult && (
                    <div
                      className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        stripeTestResult.success
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {stripeTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {stripeTestResult.success ? "Connection Verified!" : "Connection Test Failed"}
                        </div>
                        <div className="text-[11px] mt-0.5 text-slate-300">
                          {stripeTestResult.message || stripeTestResult.error}
                        </div>
                        {stripeTestResult.verifiedAt && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            Verified at: {new Date(stripeTestResult.verifiedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* META WHATSAPP CLOUD API                                 */}
              {/* -------------------------------------------------------- */}
              <div className="bg-[#080F1C] border border-white/[0.08] rounded-2xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm">Meta WhatsApp Cloud API</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                    Webhook & Sending
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Meta Inbound Webhook Callback URL:
                  </label>
                  <div className="p-2 bg-[#111C2E] border border-white/[0.06] rounded-xl font-mono text-[10px] text-indigo-300 break-all select-all">
                    {typeof window !== "undefined" ? window.location.origin : "https://dunnify.vercel.app"}/api/webhooks/whatsapp
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Verify Token: <code className="text-slate-300 font-mono">dunnify_meta_verify_token_2026</code>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Meta WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100654321098765"
                    value={settingsForm.meta_whatsapp_phone_number_id}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        meta_whatsapp_phone_number_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#111C2E] border border-white/[0.08] rounded-xl text-slate-100 font-mono text-xs focus:border-indigo-500/50 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Meta System User Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="EAAG..."
                    value={settingsForm.meta_whatsapp_token}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, meta_whatsapp_token: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111C2E] border border-white/[0.08] rounded-xl text-slate-100 font-mono text-xs focus:border-indigo-500/50 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    Leave empty to operate in Sandbox Simulation mode for zero-token testing.
                  </p>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* SLACK & DISCORD RECOVERY NOTIFICATIONS                  */}
              {/* -------------------------------------------------------- */}
              <div className="bg-[#080F1C] border border-white/[0.08] rounded-2xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm">Slack & Discord Real-Time Alerts</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Live Webhook
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Slack Incoming Webhook URL:
                  </label>
                  <input
                    type="password"
                    placeholder="https://hooks.slack.com/services/..."
                    value={settingsForm.slack_webhook_url}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, slack_webhook_url: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111C2E] border border-white/[0.08] rounded-xl text-slate-100 font-mono text-xs focus:border-emerald-500/50 outline-none"
                  />
                  <div className="text-[10px] text-slate-400">
                    Automatically broadcasts recovered cash, retained ARR, and declined invoices directly into your Slack channel.
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTestSlackConnection}
                    disabled={testingSlack || !settingsForm.slack_webhook_url}
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    <Zap className={`w-3.5 h-3.5 text-emerald-400 ${testingSlack ? "animate-spin" : ""}`} />
                    {testingSlack ? "Sending Test Message..." : "Send Test Slack Notification ⚡"}
                  </button>

                  {slackTestResult && (
                    <div
                      className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        slackTestResult.success
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {slackTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {slackTestResult.success ? "Slack Connected!" : "Slack Test Failed"}
                        </div>
                        <div className="text-[11px] mt-0.5 text-slate-300">
                          {slackTestResult.message || slackTestResult.error}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* QUIET HOURS & COMPLIANCE SETTINGS                       */}
              {/* -------------------------------------------------------- */}
              <div className="bg-[#080F1C] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Quiet Hours Compliance</div>
                    <div className="text-[10px] text-slate-400">
                      Queue messages overnight to prevent disturbing subscribers at night.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.quiet_hours_enabled}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, quiet_hours_enabled: e.target.checked })
                    }
                    className="accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                {settingsForm.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400">Quiet Start (Night):</span>
                      <input
                        type="time"
                        value={settingsForm.quiet_hours_start}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, quiet_hours_start: e.target.value })
                        }
                        className="w-full px-2 py-1.5 bg-[#111C2E] border border-white/[0.08] rounded-lg text-slate-200 mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Resume Send (Morning):</span>
                      <input
                        type="time"
                        value={settingsForm.quiet_hours_end}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, quiet_hours_end: e.target.value })
                        }
                        className="w-full px-2 py-1.5 bg-[#111C2E] border border-white/[0.08] rounded-lg text-slate-200 mt-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 text-xs"
                >
                  {savingSettings ? "Saving Settings..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Realtime Floating Toast Stack */}
      <RealtimeToasts
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
