"use client";

import { CheckCircle2, AlertTriangle, ShieldCheck, X, ExternalLink } from "lucide-react";

export interface DashboardToast {
  id: string;
  type: "failed_payment" | "recovered" | "circuit_breaker" | "info";
  title: string;
  message: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  onAction?: () => void;
  actionLabel?: string;
}

interface RealtimeToastsProps {
  toasts: DashboardToast[];
  onDismiss: (id: string) => void;
}

export function RealtimeToasts({ toasts, onDismiss }: RealtimeToastsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isRecovered = toast.type === "recovered";
        const isFailed = toast.type === "failed_payment";
        const isCircuitBreaker = toast.type === "circuit_breaker";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
              isRecovered
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-500/20"
                : isFailed
                ? "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-500/20"
                : isCircuitBreaker
                ? "bg-cyan-950/90 border-cyan-500/40 text-cyan-100 shadow-cyan-500/20"
                : "bg-slate-900/90 border-white/10 text-slate-100 shadow-black/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl mt-0.5 ${
                    isRecovered
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isFailed
                      ? "bg-rose-500/20 text-rose-400"
                      : isCircuitBreaker
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {isRecovered && <CheckCircle2 className="w-5 h-5" />}
                  {isFailed && <AlertTriangle className="w-5 h-5" />}
                  {isCircuitBreaker && <ShieldCheck className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {toast.title}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  </div>
                  <p className="text-xs mt-1 text-slate-300 font-medium leading-relaxed">
                    {toast.message}
                  </p>

                  {toast.amount && (
                    <div className="mt-2 font-mono font-bold text-sm">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: toast.currency || "USD",
                      }).format(toast.amount)}
                    </div>
                  )}

                  {toast.onAction && (
                    <button
                      onClick={toast.onAction}
                      className="mt-2.5 px-3 py-1 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 transition flex items-center gap-1 cursor-pointer"
                    >
                      {toast.actionLabel || "Inspect Timeline"}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
