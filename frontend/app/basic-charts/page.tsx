"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  fetchTransactions, 
  fetchStandardCharts,
  generateCustomChart,
  fetchExecutiveBriefing,
  TransactionItem, 
  ChartConfig,
  ExecutiveBriefing
} from "@/lib/api";
import { AGChartWrapper } from "@/components/charts/AGChartWrapper";
import { AGGridTransactions } from "@/components/charts/AGGridTransactions";
import { ExecutiveBriefingCard } from "@/components/briefing/ExecutiveBriefingCard";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Plus, Sparkles, X, Loader2, Pin, RefreshCw } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Chart showing which of my products sell the most",
  "Top 3 regions subscribed to me",
  "Invoice payment status breakdown (paid vs pending vs overdue)",
  "Revenue breakdown by subscription plan tier"
];

const dedupeCharts = (charts: ChartConfig[]): ChartConfig[] => {
  const seen = new Set<string>();
  const result: ChartConfig[] = [];
  for (const c of charts) {
    if (!c) continue;
    const id = c.id || `custom-${Math.random().toString(36).slice(2, 9)}`;
    if (!seen.has(id)) {
      seen.add(id);
      result.push({ ...c, id });
    }
  }
  return result;
};

export default function BasicChartsPage() {
  const { profile } = useBusinessProfile();
  const signal = profile.primary_signal || "subscriptions";

  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isRefreshingTxns, setIsRefreshingTxns] = useState(false);
  const [lastUpdatedTxns, setLastUpdatedTxns] = useState<Date | null>(null);
  const [standardCharts, setStandardCharts] = useState<ChartConfig[]>([]);
  const [customCharts, setCustomCharts] = useState<ChartConfig[]>([]);
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);

  const handleRefreshTransactions = async () => {
    if (isRefreshingTxns) return;
    setIsRefreshingTxns(true);
    try {
      const res = await fetchTransactions();
      setTransactions(res);
      setLastUpdatedTxns(new Date());
    } catch (e) {
      console.error("Error refreshing transactions:", e);
    } finally {
      setIsRefreshingTxns(false);
    }
  };

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [chartPrompt, setChartPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load custom charts from localStorage on client mount & listen for storage events
  useEffect(() => {
    const loadSaved = () => {
      try {
        const saved = localStorage.getItem("uno_custom_charts") || sessionStorage.getItem("uno_custom_charts");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const deduped = dedupeCharts(parsed);
            setCustomCharts(deduped);
            // Write back sanitized list to prevent corrupted/duplicate keys from persisting
            localStorage.setItem("uno_custom_charts", JSON.stringify(deduped));
            sessionStorage.setItem("uno_custom_charts", JSON.stringify(deduped));
          }
        }
      } catch (e) {
        console.error("Failed to load saved custom charts:", e);
      }
    };

    loadSaved();

    window.addEventListener("storage", loadSaved);
    window.addEventListener("uno_charts_updated", loadSaved);

    return () => {
      window.removeEventListener("storage", loadSaved);
      window.removeEventListener("uno_charts_updated", loadSaved);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      // 1. Fetch charts & transactions immediately
      fetchTransactions()
        .then(res => {
          setTransactions(res);
          setLastUpdatedTxns(new Date());
        })
        .catch(e => console.error("Error loading transactions:", e));

      fetchStandardCharts()
        .then(chartsRes => {
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
            setStandardCharts(dedupeCharts(orderedCharts));
          }
        })
        .catch(e => console.error("Error loading standard charts:", e));

      // 2. Fetch executive briefing in parallel
      fetchExecutiveBriefing()
        .then(res => {
          if (res) setBriefing(res);
        })
        .catch(() => null);
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
      // Guarantee distinct unique id for React keys
      const guaranteedId = newChart.id && !newChart.id.includes("<")
        ? `${newChart.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        : `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const uniqueNewChart: ChartConfig = { ...newChart, id: guaranteedId };

      setCustomCharts(prev => {
        const updated = dedupeCharts([...prev.filter(c => c.id !== uniqueNewChart.id), uniqueNewChart]);
        try {
          localStorage.setItem("uno_custom_charts", JSON.stringify(updated));
          sessionStorage.setItem("uno_custom_charts", JSON.stringify(updated));
          window.dispatchEvent(new Event("uno_charts_updated"));
        } catch {}
        return updated;
      });
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
    setCustomCharts(prev => {
      const updated = prev.filter(c => c.id !== chartId);
      try {
        localStorage.setItem("uno_custom_charts", JSON.stringify(updated));
        sessionStorage.setItem("uno_custom_charts", JSON.stringify(updated));
        window.dispatchEvent(new Event("uno_charts_updated"));
      } catch {}
      return updated;
    });
  };

  const allCharts = useMemo(() => {
    const seen = new Set<string>();
    const result: ChartConfig[] = [];
    for (const chart of [...standardCharts, ...customCharts]) {
      if (chart && chart.id) {
        if (!seen.has(chart.id)) {
          seen.add(chart.id);
          result.push(chart);
        }
      }
    }
    return result;
  }, [standardCharts, customCharts]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-6">

      {/* 70:30 Container Layout (Fixed Height with Independent Scroll) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full h-[680px] xl:h-[720px] overflow-hidden">

        {/* Left Section (70%): Only Charts, 2 Charts in a Row */}
        <div className="lg:col-span-7 h-full overflow-y-auto pr-2 pb-4 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-2">
            {allCharts.map((chart, idx) => {
              const isCustom = customCharts.some(c => c.id === chart.id);
              return (
                <div 
                  key={chart.id ? `${chart.id}-${idx}` : `chart-idx-${idx}`} 
                  className="rounded-2xl p-5 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_12px_24px_-6px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all relative group flex flex-col justify-between"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[#000000] tracking-tight truncate" title={chart.title}>
                          {chart.title}
                        </h3>
                        {isCustom && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E5F3FF] text-[#002991] border border-[#008CFF]/20 shrink-0">
                            <Pin className="w-2.5 h-2.5 text-[#008CFF]" />
                            <span>Pinned</span>
                          </span>
                        )}
                      </div>
                      {chart.description && (
                        <p className="text-xs text-[#4A5568] mt-0.5 line-clamp-1" title={chart.description}>
                          {chart.description}
                        </p>
                      )}
                    </div>

                    {isCustom && (
                      <button
                        onClick={() => handleRemoveCustomChart(chart.id)}
                        title="Remove custom chart"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="w-full overflow-hidden">
                    <AGChartWrapper config={chart} height={300} />
                  </div>
                </div>
              );
            })}

            {/* Add Custom Chart Card (fits 2-column grid) */}
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-2xl p-6 min-h-[380px] bg-[#F5F7FA]/70 border-2 border-dashed border-[#CBD5E1] hover:border-[#008CFF] hover:bg-[#E5F3FF]/40 transition-all duration-300 flex flex-col items-center justify-center text-center group cursor-pointer"
              aria-label="Add custom chart"
            >
              <div className="w-13 h-13 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#002991] group-hover:scale-110 group-hover:shadow-[0_4px_16px_rgba(0,140,255,0.2)] transition-all duration-300 mb-3.5">
                <Plus className="w-6 h-6 text-[#002991]" />
              </div>
              <h4 className="text-base font-semibold text-[#000000] group-hover:text-[#002991] transition-colors">
                Add Custom Chart
              </h4>
              <p className="text-xs text-[#4A5568] max-w-xs mt-1 leading-relaxed">
                Ask Agent Warren to synthesize custom AG Charts from live PayPal data
              </p>
              <div className="mt-3.5 flex items-center gap-1.5 text-[11px] font-mono font-medium px-3 py-1 rounded-full bg-white text-[#002991] border border-[#E2E8F0] shadow-xs group-hover:border-[#008CFF]/50 transition-colors">
                <Sparkles className="w-3 h-3 text-[#008CFF]" />
                <span>Warren Chart Synthesizer</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Section (30%): Morning Executive Briefing Info */}
        <div className="lg:col-span-3 h-full overflow-y-auto pr-1 pb-4 scrollbar-thin">
          {briefing ? (
            <ExecutiveBriefingCard briefing={briefing} />
          ) : (
            <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center gap-2 text-xs text-[#4A5568]">
              <span className="flex h-2 w-2 rounded-full bg-[#008CFF] animate-ping" />
              <span>Loading Executive Briefing telemetry...</span>
            </div>
          )}
        </div>

      </div>

      {/* Transaction Ledger at the bottom of Quick View tab */}
      <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] overflow-hidden">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#000000] tracking-tight">Recent Settlement Ledger</h3>
            <p className="text-xs text-[#4A5568] mt-0.5">Live PayPal money movement synchronized from sandbox API</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {lastUpdatedTxns && (
              <span className="text-[11px] font-mono text-[#64748B] hidden sm:inline-block">
                Updated {lastUpdatedTxns.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              id="refresh-transactions-btn"
              onClick={handleRefreshTransactions}
              disabled={isRefreshingTxns}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F7FA] border border-[#CBD5E1] hover:border-[#008CFF] text-xs font-semibold text-[#002991] transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Refresh transaction ledger from live PayPal sandbox"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#008CFF] ${isRefreshingTxns ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-300"}`} />
              <span>{isRefreshingTxns ? "Refreshing..." : "Refresh"}</span>
            </button>
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

