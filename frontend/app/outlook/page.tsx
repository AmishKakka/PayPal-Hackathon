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
  ArrowUpRight 
} from "lucide-react";

export default function OutlookPage() {
  const [forecast, setForecast] = useState<OutlookForecast | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchOutlook();
        setForecast(data);
      } catch (e) {
        console.error("Error loading outlook:", e);
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

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* 30d Forecast */}
        <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between text-[#4A5568] mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#4A5568]">30-Day Forward Runway</span>
            <Calendar className="h-4 w-4 text-[#008CFF]" />
          </div>
          <div className="text-3xl font-semibold text-[#000000] font-mono-num tracking-tight">
            {forecast ? formatCurrency(forecast.forecast_30d) : "$52,400.00"}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+8.6% expected growth in 30 days</span>
          </div>
        </div>

        {/* 90d Forecast */}
        <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between text-[#4A5568] mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#4A5568]">90-Day Q4 Projection</span>
            <TrendingUp className="h-4 w-4 text-[#002991]" />
          </div>
          <div className="text-3xl font-semibold text-[#000000] font-mono-num tracking-tight">
            {forecast ? formatCurrency(forecast.forecast_90d) : "$172,100.00"}
          </div>
          <div className="mt-2.5 text-xs text-[#4A5568]">
            One-time volume + recurring run-rate
          </div>
        </div>

        {/* Projected MRR Growth */}
        <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] hover:border-[#002991]/30 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between text-[#4A5568] mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#4A5568]">MRR Expansion Rate</span>
            <Sparkles className="h-4 w-4 text-[#008CFF]" />
          </div>
          <div className="text-3xl font-semibold text-[#002991] font-mono-num tracking-tight">
            {forecast ? formatPercent(forecast.projected_mrr_growth) : "0.0%"}
          </div>
          <div className="mt-2.5 text-xs text-[#4A5568]">
            Projected forward expansion
          </div>
        </div>

      </div>

      {/* Predictive Runway Chart */}
      <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#000000] tracking-tight">90-Day Revenue &amp; MRR Horizon</h3>
          <p className="text-xs text-[#4A5568] mt-1">Synthesized from live PayPal transaction velocity and active subscription plans</p>
        </div>
        <AGChartWrapper config={chartConfig} height={340} />
      </div>

      {/* Subscription Retention & Churn Risk */}
      <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,41,145,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-[#000000]">Subscription Retention &amp; Churn Vulnerability</h3>
          </div>
          <span className="text-xs text-amber-600 font-semibold">
            {forecast?.at_risk_tiers ? `${forecast.at_risk_tiers.length} Tiers Monitored` : "0 Tiers Monitored"}
          </span>
        </div>

        <div className="space-y-4 pt-2">
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
                className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] p-5 hover:border-[#CBD5E1] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-semibold text-[#000000]">{tier.tier_name}</h4>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          isHighRisk
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {(tier.churn_probability * 100).toFixed(0)}% Risk
                      </span>
                    </div>
                    <span className="text-xs text-[#4A5568] mt-0.5 block">
                      {tier.active_subscribers} active members •{" "}
                      <strong className="text-rose-600 font-mono-num">{formatCurrency(tier.monthly_revenue_at_risk)}</strong> MRR exposed
                    </span>
                  </div>
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

    </div>
  );
}