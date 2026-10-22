"use client";

import React, { useState, useEffect } from "react";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Edit3, 
  Sliders,
  DollarSign,
  Receipt,
  AlertTriangle,
  Check
} from "lucide-react";

export function PayPalConnectModal() {
  const {
    showModal,
    setShowModal,
    modalStep,
    setModalStep,
    profile,
    probeResult,
    isConnecting,
    statusMsg,
    connectAndProbe,
    confirmProfile,
    runProbe
  } = useBusinessProfile();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  // Customization editable state
  const [customSubs, setCustomSubs] = useState(true);
  const [customInvs, setCustomInvs] = useState(true);
  const [customDisputes, setCustomDisputes] = useState(false);
  const [customPayouts, setCustomPayouts] = useState(true);
  const [customSignal, setCustomSignal] = useState<"subscriptions" | "invoices" | "disputes" | "payouts">("subscriptions");

  // Sync customize state when probeResult or profile changes
  useEffect(() => {
    const active = probeResult || profile;
    setCustomSubs(active.has_subscriptions);
    setCustomInvs(active.has_invoices);
    setCustomDisputes(active.has_disputes);
    setCustomPayouts(active.has_payouts);
    setCustomSignal(active.primary_signal || "subscriptions");
  }, [probeResult, profile]);

  if (!showModal) return null;

  const activeData = probeResult || profile;

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;
    await connectAndProbe(clientId, clientSecret);
  };

  const handleQuickProbe = async () => {
    setModalStep("probing");
    await runProbe();
    await new Promise((r) => setTimeout(r, 600));
    setModalStep("confirmation");
  };

  const handleConfirmLooksGood = async () => {
    await confirmProfile({
      has_subscriptions: activeData.has_subscriptions,
      has_invoices: activeData.has_invoices,
      has_disputes: activeData.has_disputes,
      has_payouts: activeData.has_payouts,
      primary_signal: activeData.primary_signal
    });
  };

  const handleSaveCustom = async () => {
    await confirmProfile({
      has_subscriptions: customSubs,
      has_invoices: customInvs,
      has_disputes: customDisputes,
      has_payouts: customPayouts,
      primary_signal: customSignal
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-7 shadow-2xl relative overflow-hidden text-[#000000]">        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#002991] via-[#008CFF] to-[#002991]" />
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-5 right-5 text-[#4A5568] hover:text-[#000000] transition-colors p-1 rounded-lg hover:bg-[#F5F7FA]"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* ================= STEP 1: CREDENTIALS ================= */}
        {modalStep === "credentials" && (
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5F3FF] text-[#002991] border border-[#008CFF]/30">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#000000]">Connect with PayPal</h3>
                <p className="text-xs text-[#4A5568]">Sandbox API Integration</p>
              </div>
            </div>

            <p className="text-xs text-[#4A5568] my-4 leading-relaxed bg-[#F5F7FA] p-3 rounded-xl border border-[#E2E8F0]">
              When connected, Warren quietly probes your PayPal account in parallel across{" "}
              <strong className="text-[#002991]">Subscriptions</strong>,{" "}
              <strong className="text-[#002991]">Invoices</strong>,{" "}
              <strong className="text-[#002991]">Disputes</strong>, and{" "}
              <strong className="text-[#002991]">Payouts</strong> to tailor your intelligence dashboard.
            </p>

            <form onSubmit={handleConnectSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#000000] mb-1">
                  PayPal Client ID
                </label>
                <input
                  type="text"
                  placeholder="Sandbox App Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs text-[#000000] placeholder-[#94A3B8] focus:border-[#008CFF] focus:outline-none transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#000000] mb-1">
                  PayPal Secret Key
                </label>
                <input
                  type="password"
                  placeholder="Sandbox Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs text-[#000000] placeholder-[#94A3B8] focus:border-[#008CFF] focus:outline-none transition-colors shadow-xs"
                />
              </div>

              {statusMsg && (
                <div
                  className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                    statusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {statusMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleQuickProbe}
                  className="text-xs text-[#008CFF] hover:text-[#002991] underline font-semibold cursor-pointer"
                >
                  Probe active environment credentials →
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#4A5568] hover:text-[#000000] hover:bg-[#F5F7FA] transition-colors shadow-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting || !clientId.trim() || !clientSecret.trim()}
                    className="rounded-xl bg-[#002991] hover:bg-[#008CFF] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect &amp; Probe</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 2: PARALLEL ENDPOINT CALLS ================= */}
        {modalStep === "probing" && (
          <div className="py-6 flex flex-col items-center text-center space-y-5">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5F3FF] border border-[#008CFF]/30 text-[#008CFF] shadow-lg shadow-blue-500/10">
              <RefreshCw className="h-8 w-8 animate-spin text-[#008CFF]" />
              <div className="absolute inset-0 rounded-2xl ring-2 ring-[#008CFF]/50 animate-ping opacity-25" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#000000]">Probing your PayPal account...</h3>
              <p className="text-xs text-[#4A5568] mt-1 max-w-sm mx-auto">
                Calling core PayPal endpoints in parallel to discover your live business footprint.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2 text-left bg-[#F5F7FA] p-4 rounded-xl border border-[#E2E8F0] text-xs">
              <div className="flex items-center justify-between text-[#000000]">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Subscriptions &amp; Recurring Plans
                </span>
                <span className="text-[10px] text-[#002991] font-mono font-semibold">/v1/billing/plans</span>
              </div>
              <div className="flex items-center justify-between text-[#000000]">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Invoicing &amp; Receivables
                </span>
                <span className="text-[10px] text-[#002991] font-mono font-semibold">/v2/invoicing</span>
              </div>
              <div className="flex items-center justify-between text-[#000000]">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Customer Disputes &amp; Claims
                </span>
                <span className="text-[10px] text-[#002991] font-mono font-semibold">/v1/customer/disputes</span>
              </div>
              <div className="flex items-center justify-between text-[#000000]">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Payouts &amp; Transaction History
                </span>
                <span className="text-[10px] text-[#002991] font-mono font-semibold">/v1/reporting</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CONFIRMATION SCREEN ================= */}
        {modalStep === "confirmation" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E5F3FF] border border-[#008CFF]/30 text-[11px] font-semibold text-[#002991] mb-2.5">
                <Sparkles className="h-3 w-3 text-[#008CFF]" />
                <span>Account Discovery Complete</span>
              </div>
              <h3 className="text-xl font-bold text-[#000000] tracking-tight">
                We looked at your PayPal account. Here’s what we found:
              </h3>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] divide-y divide-[#E2E8F0] overflow-hidden">
              
              {/* Item 1: Subscriptions */}
              <div className="p-3.5 flex items-start gap-3 hover:bg-white/80 transition-colors">
                <div className="mt-0.5">
                  {activeData.has_subscriptions ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] border border-[#CBD5E1] text-xs font-medium">
                      ○
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#000000]">
                      Subscriptions &amp; recurring billing
                    </span>
                    {!activeData.has_subscriptions && (
                      <span className="text-[11px] text-[#4A5568] italic">
                        (none or very few found)
                      </span>
                    )}
                  </div>
                  {activeData.summary?.subscriptions && (
                    <p className="text-xs text-[#4A5568] mt-0.5">
                      {activeData.summary.subscriptions}
                    </p>
                  )}
                </div>
              </div>

              {/* Item 2: Invoices */}
              <div className="p-3.5 flex items-start gap-3 hover:bg-white/80 transition-colors">
                <div className="mt-0.5">
                  {activeData.has_invoices ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] border border-[#CBD5E1] text-xs font-medium">
                      ○
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#000000]">
                      Invoices
                    </span>
                    {!activeData.has_invoices && (
                      <span className="text-[11px] text-[#4A5568] italic">
                        (none or very few found)
                      </span>
                    )}
                  </div>
                  {activeData.summary?.invoices && (
                    <p className="text-xs text-[#4A5568] mt-0.5">
                      {activeData.summary.invoices}
                    </p>
                  )}
                </div>
              </div>

              {/* Item 3: Disputes */}
              <div className="p-3.5 flex items-start gap-3 hover:bg-white/80 transition-colors">
                <div className="mt-0.5">
                  {activeData.has_disputes ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 border border-amber-300 text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] border border-[#CBD5E1] text-xs font-medium">
                      ○
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#000000]">
                      Disputes
                    </span>
                    {!activeData.has_disputes && (
                      <span className="text-[11px] text-[#4A5568] italic">
                        (none or very few found)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4A5568] mt-0.5">
                    {activeData.summary?.disputes || "Clean dispute record (0 open claims, 100% healthy seller rating)"}
                  </p>
                </div>
              </div>

              {/* Item 4: Payouts */}
              <div className="p-3.5 flex items-start gap-3 hover:bg-white/80 transition-colors">
                <div className="mt-0.5">
                  {activeData.has_payouts ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] border border-[#CBD5E1] text-xs font-medium">
                      ○
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#000000]">
                      Payouts / recent transactions
                    </span>
                    {!activeData.has_payouts && (
                      <span className="text-[11px] text-[#4A5568] italic">
                        (none or very few found)
                      </span>
                    )}
                  </div>
                  {activeData.summary?.payouts && (
                    <p className="text-xs text-[#4A5568] mt-0.5">
                      {activeData.summary.payouts}
                    </p>
                  )}
                </div>
              </div>

            </div>

            <div className="text-center pt-1">
              <p className="text-sm font-bold text-[#000000]">
                Does this look right?
              </p>
            </div>

            {/* 2 User Action Buttons in PayPal Functional Blue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleConfirmLooksGood}
                className="w-full rounded-xl bg-[#002991] hover:bg-[#008CFF] p-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Looks good — continue</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setModalStep("customizing")}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F5F7FA] hover:border-[#002991]/30 p-3 text-xs sm:text-sm font-semibold text-[#000000] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Edit3 className="h-4 w-4 text-[#4A5568]" />
                <span>Something’s missing</span>
              </button>
            </div>

          </div>
        )}

        {/* ================= STEP 4: CUSTOMIZING ================= */}
        {modalStep === "customizing" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-[#002991]" />
              <div>
                <h3 className="text-lg font-bold text-[#000000]">Customize Business Model</h3>
                <p className="text-xs text-[#4A5568]">Select what Warren should monitor for your store</p>
              </div>
            </div>

            <p className="text-xs text-[#4A5568] bg-[#F5F7FA] p-3 rounded-xl border border-[#E2E8F0]">
              Adjust which PayPal services are active for your business. This configures the default AI system prompt and dashboard priority.
            </p>

            <div className="space-y-2.5">
              
              {/* Toggle 1: Subscriptions */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] hover:bg-white hover:border-[#002991]/30 cursor-pointer transition-colors shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${customSubs ? "bg-[#E5F3FF] text-[#002991]" : "bg-slate-200 text-slate-500"}`}>
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#000000] block">Subscriptions &amp; recurring billing</span>
                    <span className="text-[11px] text-[#4A5568]">Recurring plans, MRR tracking, churn vulnerability</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={customSubs}
                  onChange={(e) => setCustomSubs(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#002991] cursor-pointer"
                />
              </label>

              {/* Toggle 2: Invoices */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] hover:bg-white hover:border-[#002991]/30 cursor-pointer transition-colors shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${customInvs ? "bg-[#E5F3FF] text-[#002991]" : "bg-slate-200 text-slate-500"}`}>
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#000000] block">Invoices</span>
                    <span className="text-[11px] text-[#4A5568]">B2B client invoices, overdue reminders, payment aging</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={customInvs}
                  onChange={(e) => setCustomInvs(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#002991] cursor-pointer"
                />
              </label>

              {/* Toggle 3: Disputes */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] hover:bg-white hover:border-[#002991]/30 cursor-pointer transition-colors shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${customDisputes ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-500"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#000000] block">Disputes &amp; chargebacks</span>
                    <span className="text-[11px] text-[#4A5568]">Customer claims, seller protection ratio, chargeback alerts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={customDisputes}
                  onChange={(e) => setCustomDisputes(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#002991] cursor-pointer"
                />
              </label>

              {/* Toggle 4: Payouts */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] hover:bg-white hover:border-[#002991]/30 cursor-pointer transition-colors shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${customPayouts ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#000000] block">Payouts / recent transactions</span>
                    <span className="text-[11px] text-[#4A5568]">Checkout volumes, settlement speed, global territories</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={customPayouts}
                  onChange={(e) => setCustomPayouts(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#002991] cursor-pointer"
                />
              </label>

              {/* Primary Signal Selector */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-[#000000] mb-1">
                  Primary Focus for AI Assistant:
                </label>
                <select
                  value={customSignal}
                  onChange={(e) => setCustomSignal(e.target.value as "subscriptions" | "invoices" | "disputes" | "payouts")}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#000000] focus:border-[#008CFF] focus:outline-none cursor-pointer shadow-xs"
                >
                  <option value="subscriptions">Subscriptions (Prioritize MRR, Retention, Churn)</option>
                  <option value="invoices">Invoices (Prioritize Collection, Overdue Reminders)</option>
                  <option value="disputes">Disputes (Prioritize Claims, Seller Protection)</option>
                  <option value="payouts">Payouts (Prioritize High-Velocity Checkout &amp; Settlement)</option>
                </select>
              </div>

            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setModalStep("confirmation")}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#4A5568] hover:bg-[#F5F7FA] hover:text-[#000000] transition-colors shadow-xs cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleSaveCustom}
                className="rounded-xl bg-[#002991] hover:bg-[#008CFF] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Save Profile &amp; Continue</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
