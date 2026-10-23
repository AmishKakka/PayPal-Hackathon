"use client";

import React, { useEffect, useState } from "react";
import { fetchOutlook, OutlookForecast, ChartConfig } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { AGChartWrapper } from "@/components/charts/AGChartWrapper";
import { 
  TrendingUp, 
  Calendar, 
  ShieldAlert, 
  Sparkles, 
  ArrowUpRight,
  Loader2
} from "lucide-react";

export default function OutlookPage() {
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<OutlookForecast | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchOutlook();
        setForecast(data);
      } catch (e) {
        console.error("Error loading outlook:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const hist = forecast?.historical_trend || [];
  const proj = forecast?.projected_trend || [];
  const allPoints = [...hist, ...proj];

  const chartConfig: ChartConfig = {
    id: "predictive-runway-chart",
    title: "Historical vs. Projected 90-Day Revenue Runway",
    type: "line",
    description: "Solid trajectory reflects live historical PayPal invoices; projected intervals show estimated forward run-rate.",
    categories: allPoints.map((p) => p.month),
    datasets: allPoints.length > 0 ? [
      {
        label: "Gross Revenue ($)",
        data: allPoints.map((p) => p.revenue),
        color: "#3b82f6"
      },
      {
        label: "Recurring MRR ($)",
        data: allPoints.map((p) => p.mrr),
        color: "#4cd7f6"
      }
    ] : [],
    metric_unit: "USD"
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-24 flex flex-col items-center justify-center min-h-[480px]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E5F3FF] border border-[#008CFF]/30 text-[#002991] shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[#008CFF]" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#000000] tracking-tight">Loading....</h3>
            <p className="text-xs text-[#4A5568] mt-1 font-medium">Simulating 90-day predictive runway &amp; churn telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-6">
      
      {/* 1. TOP HORIZONTAL SECTION: 70:30 ratio in a single container with defined height */}
      <div className="w-full h-[520px] xl:h-[540px]">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full h-full">
          
          {/* Left Side (70%): 90-Day Revenue & MRR Horizon Chart */}
          <div className="lg:col-span-7 h-full rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] flex flex-col justify-between overflow-hidden">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-[#000000] tracking-tight">90-Day Revenue &amp; MRR Horizon</h3>
              <p className="text-xs text-[#4A5568] mt-1">Synthesized from live PayPal transaction velocity and active subscription plans</p>
            </div>
            <div className="w-full flex-1 min-h-0 flex items-center">
              <AGChartWrapper config={chartConfig} height={400} />
            </div>
          </div>

          {/* Right Side (30%): The 3 projection tabs in vertical order, content centered */}
          <div className="lg:col-span-3 h-full flex flex-col justify-between gap-4">
            
            {/* 30d Forecast */}
            <div className="flex-1 rounded-2xl p-5 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_12px_24px_-6px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#4A5568] mb-1.5">
                <Calendar className="h-4 w-4 text-[#008CFF]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-[#4A5568]">30-Day Forward Runway</span>
              </div>
              <div className="text-3xl font-semibold text-[#000000] font-mono-num tracking-tight">
                {forecast ? formatCurrency(forecast.forecast_30d) : "$52,400.00"}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+8.6% expected growth in 30 days</span>
              </div>
            </div>

            {/* 90d Forecast */}
            <div className="flex-1 rounded-2xl p-5 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_12px_24px_-6px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#4A5568] mb-1.5">
                <TrendingUp className="h-4 w-4 text-[#002991]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-[#4A5568]">90-Day Q4 Projection</span>
              </div>
              <div className="text-3xl font-semibold text-[#000000] font-mono-num tracking-tight">
                {forecast ? formatCurrency(forecast.forecast_90d) : "$172,100.00"}
              </div>
              <div className="mt-2 text-xs text-[#4A5568]">
                One-time volume + recurring run-rate
              </div>
            </div>

            {/* Projected MRR Growth */}
            <div className="flex-1 rounded-2xl p-5 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_12px_24px_-6px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#4A5568] mb-1.5">
                <Sparkles className="h-4 w-4 text-[#008CFF]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-[#4A5568]">MRR Expansion Rate</span>
              </div>
              <div className="text-3xl font-semibold text-[#002991] font-mono-num tracking-tight">
                {forecast ? formatPercent(forecast.projected_mrr_growth) : "0.0%"}
              </div>
              <div className="mt-2 text-xs text-[#4A5568]">
                Projected forward expansion
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 2. BOTTOM HORIZONTAL SECTION: 30:70 ratio (Subscription churn on left, empty section on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full items-start">
        
        {/* Left Side (30%): Subscription Retention & Churn Vulnerability */}
        <div className="lg:col-span-3 rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] space-y-4">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                <h3 className="text-base font-semibold text-[#000000] tracking-tight">Subscription Retention &amp; Churn</h3>
              </div>
              <p className="text-xs text-[#4A5568] mt-1">Live account standing &amp; vulnerability analysis</p>
            </div>
            <span className="text-[11px] text-amber-600 font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 shrink-0">
              {forecast?.at_risk_tiers ? `${forecast.at_risk_tiers.length} Tiers` : "0 Tiers"}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {(!forecast?.at_risk_tiers || forecast.at_risk_tiers.length === 0) && (
              <div className="p-6 text-center text-xs text-[#4A5568] bg-[#F5F7FA] rounded-xl border border-[#E2E8F0]">
                No subscription plan churn risk detected. All live accounts are in good standing.
              </div>
            )}
            {forecast?.at_risk_tiers.map((tier) => {
              const isHighRisk = tier.churn_probability > 0.2;

              return (
                <div
                  key={tier.tier_name}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] p-4 sm:p-5 hover:border-[#CBD5E1] transition-all"
                >
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#000000]">{tier.tier_name}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold border shrink-0 ${
                          isHighRisk
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {(tier.churn_probability * 100).toFixed(0)}% Risk
                      </span>
                    </div>
                    <span className="text-xs text-[#4A5568] block">
                      {tier.active_subscribers} active members •{" "}
                      <strong className="text-rose-600 font-mono-num">{formatCurrency(tier.monthly_revenue_at_risk)}</strong> MRR exposed
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg bg-white p-3 border border-[#E2E8F0] text-xs">
                    <span className="text-[#4A5568] font-semibold block mb-1">Identified Factors:</span>
                    <ul className="list-disc list-inside space-y-1 text-[#334155]">
                      {tier.key_drivers.map((driver, idx) => (
                        <li key={idx}>{driver}</li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-[#E2E8F0] text-[#002991] font-medium">
                      Recommendation: {tier.recommended_action}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side (70%): Empty Section */}
        <div className="lg:col-span-7 rounded-2xl p-8 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] min-h-[380px] flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F7FA] border border-[#CBD5E1]/60 flex items-center justify-center text-[#94A3B8] mb-3">
            <Sparkles className="w-5 h-5 text-[#008CFF]" />
          </div>
          <h4 className="text-base font-semibold text-[#000000]">Scenario Planning &amp; Custom Modeling</h4>
          <p className="text-xs text-[#4A5568] max-w-md mt-1 leading-relaxed">
            Reserved section for future predictive metrics, scenario simulations, and merchant-defined runway models.
          </p>
        </div>

      </div>
    </div>
  );
}