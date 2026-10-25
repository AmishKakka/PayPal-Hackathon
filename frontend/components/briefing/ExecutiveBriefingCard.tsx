"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ExecutiveBriefing } from "@/lib/api";
import { 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react";

interface ExecutiveBriefingCardProps {
  briefing: ExecutiveBriefing;
}

export function ExecutiveBriefingCard({ briefing }: ExecutiveBriefingCardProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const handleActionClick = (queryText: string) => {
    if (navigating) return;
    setNavigating(true);
    router.push(`/chat?q=${encodeURIComponent(queryText)}`);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] border border-[#CBD5E1] shadow-[0_4px_20px_-4px_rgba(0,41,145,0.07)] overflow-hidden transition-all duration-300">
      {/* Top Accent Gradient Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#002991] via-[#008CFF] to-[#10b981]" />

      <div className="p-5 sm:p-6 space-y-5">
        <div className="pb-3 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-[#000000] tracking-tight">
            {briefing.date}
          </h2>
        </div>

        {/* AI Headline Banner if available */}
        {briefing.headline && (
          <div className="rounded-xl bg-[#E5F3FF]/60 border border-[#008CFF]/25 p-3 text-xs text-[#002991] font-medium leading-relaxed flex items-start gap-2 shadow-2xs">
            <span className="text-sm">💡</span>
            <span className="flex-1">{briefing.headline}</span>
          </div>
        )}

        {/* 4 Metric Telemetry Cards (2x2 Grid) */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#4A5568] mb-2.5">
            Daily Business Pulse
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {briefing.highlights.map((item, idx) => {
              let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
              if (item.type === "warning") {
                badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
              }

              return (
                <div
                  key={idx}
                  className="rounded-xl bg-white p-3 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:border-[#008CFF]/40 transition-colors"
                >
                  <span className="text-[10px] font-medium text-[#4A5568] truncate" title={item.label}>
                    {item.label}
                  </span>
                  <div className="my-1">
                    <span className="text-lg font-bold text-[#000000] font-mono-num tracking-tight">
                      {item.value}
                    </span>
                  </div>
                  <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border w-fit ${badgeClass}`}>
                    {item.change}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Action Items for Today as Vertical Action Buttons */}
        {briefing.action_items && briefing.action_items.length > 0 && (
          <div className="pt-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4A5568] mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Recommended Focus for Today (Ask Agent Warren)</span>
            </h4>
            <div className="flex flex-col gap-2.5">
              {briefing.action_items.map((act, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={navigating}
                  onClick={() => handleActionClick(act)}
                  className="w-full rounded-xl bg-white border border-[#E2E8F0] hover:border-[#008CFF] hover:bg-[#E5F3FF]/40 p-3 text-xs text-[#000000] hover:text-[#002991] flex items-start gap-2.5 shadow-2xs transition-all text-left group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Ask Agent Warren this question"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#008CFF] group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
                  <span className="leading-snug font-medium flex-1">{act}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
