"use client";

import React, { useEffect, useState } from "react";
import { 
  fetchTransactions, 
  fetchStandardCharts,
  generateCustomChart,
  TransactionItem, 
  ChartConfig 
} from "@/lib/api";
import { AGChartWrapper } from "@/components/charts/AGChartWrapper";
import { AGGridTransactions } from "@/components/charts/AGGridTransactions";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Plus, Sparkles, X, Loader2 } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Chart showing which of my products sell the most",
  "Top 3 regions subscribed to me",
  "Invoice payment status breakdown (paid vs pending vs overdue)",
  "Revenue breakdown by subscription plan tier"
];

export default function BasicChartsPage() {
  const { profile } = useBusinessProfile();
  const signal = profile.primary_signal || "subscriptions";

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [standardCharts, setStandardCharts] = useState<ChartConfig[]>([]);
  const [customCharts, setCustomCharts] = useState<ChartConfig[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem("uno_custom_charts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [chartPrompt, setChartPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync custom charts to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("uno_custom_charts", JSON.stringify(customCharts));
    } catch {
      // ignore
    }
  }, [customCharts]);

  useEffect(() => {
    async function loadData() {
      try {
        const [txnRes, chartsRes] = await Promise.all([
          fetchTransactions(),
          fetchStandardCharts()
        ]);
        setTransactions(txnRes);
        if (chartsRes && chartsRes.length > 0) {
          let orderedCharts = [...chartsRes];
          if (signal === "subscriptions") {
            const subChart = chartsRes.find(c => c.id === "subscription-tiers");
            const otherCharts = chartsRes.filter(c => c.id !== "subscription-tiers");
            if (subChart) orderedCharts = [subChart, ...otherCharts];
          } else if (signal === "payouts") {
            const regChart = chartsRes.find(c => c.id === "regional-distribution");
            const otherCharts = chartsRes.filter(c => c.id !== "regional-distribution");
            if (regChart) orderedCharts = [regChart, ...otherCharts];
          }
          setStandardCharts(orderedCharts);
        }
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      }
    }
    loadData();
  }, [signal]);

  const handleGenerateChart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chartPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const newChart = await generateCustomChart(chartPrompt.trim());
      setCustomCharts(prev => [...prev, newChart]);
      setChartPrompt("");
      setShowAddModal(false);
    } catch (err: unknown) {
      console.error("Error generating custom chart:", err);
      const msg = err instanceof Error ? err.message : "Failed to generate chart. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveCustomChart = (chartId: string) => {
    setCustomCharts(prev => prev.filter(c => c.id !== chartId));
  };

  const allCharts = [...standardCharts, ...customCharts];

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-6 space-y-6">

      {/* Interactive AG Charts Grid (PayPal Functional Blue Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allCharts.map((chart) => {
          const isCustom = customCharts.some(c => c.id === chart.id);
          return (
            <div 
              key={chart.id} 
              className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] hover:border-[#002991]/40 transition-all relative group"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#000000] tracking-tight">{chart.title}</h3>
                    {isCustom && (
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#E5F3FF] text-[#002991] border border-[#008CFF]/30">
                        AI Generated
                      </span>
                    )}
                  </div>
                  {chart.description && (
                    <p className="text-xs text-[#4A5568] mt-1">{chart.description}</p>
                  )}
                </div>

                {isCustom && (
                  <button
                    onClick={() => handleRemoveCustomChart(chart.id)}
                    title="Remove custom chart"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <AGChartWrapper config={chart} height={320} />
            </div>
          );
        })}

        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-2xl p-6 min-h-[416px] bg-[#F5F7FA]/70 border-2 border-dashed border-[#CBD5E1] hover:border-[#008CFF] hover:bg-[#E5F3FF]/40 transition-all duration-300 flex flex-col items-center justify-center text-center group cursor-pointer"
          aria-label="Add custom chart"
        >
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#002991] group-hover:scale-110 group-hover:shadow-[0_4px_16px_rgba(0,140,255,0.2)] transition-all duration-300 mb-4">
            <Plus className="w-7 h-7 text-[#002991]" />
          </div>
          <h4 className="text-base font-semibold text-[#000000] group-hover:text-[#002991] transition-colors">
            Add Custom Chart
          </h4>
          <p className="text-xs text-[#4A5568] max-w-xs mt-1.5 leading-relaxed">
            Ask AG Studio AI to generate a custom chart from your live PayPal data
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] font-mono font-medium px-3 py-1 rounded-full bg-white text-[#002991] border border-[#E2E8F0] shadow-xs group-hover:border-[#008CFF]/50 transition-colors">
            <Sparkles className="w-3 h-3 text-[#008CFF]" />
            <span>AG Studio AI</span>
          </div>
        </button>
      </div>

      {/* Interactive Transaction Ledger */}
      <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#000000] tracking-tight">Recent Settlement Ledger</h3>
            <p className="text-xs text-[#4A5568] mt-0.5">Live PayPal money movement synchronized from sandbox API</p>
          </div>
        </div>
        <AGGridTransactions transactions={transactions} />
      </div>

      {/* Modal: What kind of chart do you want to add? */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => {
                if (!isGenerating) {
                  setShowAddModal(false);
                  setErrorMsg(null);
                }
              }}
              disabled={isGenerating}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#4A5568] hover:text-[#000000] hover:bg-[#F5F7FA] transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-5 pr-8">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#E5F3FF] text-[#002991] border border-[#008CFF]/30 mb-2">
                <Sparkles className="w-3 h-3 text-[#008CFF]" />
                <span>AG Studio AI</span>
              </div>
              <h3 className="text-xl font-semibold text-[#000000] tracking-tight">
                What kind of chart do you want to add?
              </h3>
              <p className="text-xs text-[#4A5568] mt-1 leading-relaxed">
                Describe what you want to visualize. Uno will analyze your live PayPal transactions, subscription tiers, and invoices to generate an interactive AG Chart.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerateChart} className="space-y-4">
              <div>
                <label htmlFor="chart-query" className="block text-xs font-semibold text-[#000000] mb-1.5">
                  Chart Description or Query
                </label>
                <textarea
                  id="chart-query"
                  rows={3}
                  value={chartPrompt}
                  onChange={(e) => setChartPrompt(e.target.value)}
                  placeholder="e.g., chart showing which of my products sell the most, or top 3 regions subscribed to me..."
                  disabled={isGenerating}
                  className="w-full rounded-xl bg-white border border-[#E2E8F0] p-3.5 text-sm text-[#000000] placeholder-[#94A3B8] focus:outline-none focus:border-[#008CFF] focus:ring-1 focus:ring-[#008CFF] transition-all resize-none disabled:opacity-50 shadow-xs"
                  autoFocus
                />
              </div>

              {/* Clickable Quick Suggestions */}
              <div>
                <span className="block text-[11px] font-semibold text-[#4A5568] mb-2">
                  Or pick a suggestion:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setChartPrompt(suggestion)}
                      className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-[#E5F3FF] text-[#4A5568] hover:text-[#002991] border border-[#E2E8F0] hover:border-[#008CFF]/40 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    setShowAddModal(false);
                    setErrorMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#4A5568] hover:text-[#000000] hover:bg-[#F5F7FA] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !chartPrompt.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#002991] hover:bg-[#008CFF] text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Generating with AG Studio AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Generate Chart</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

