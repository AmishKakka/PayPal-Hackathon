"use client";

import React, { useState, useMemo } from "react";
import { 
  GLOSSARY_TERMS, 
  GLOSSARY_CATEGORIES, 
  GlossaryTerm 
} from "@/lib/glossaryData";
import { 
  ChevronDown, 
  ChevronRight, 
  Calculator, 
  HelpCircle, 
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Wallet,
  Users,
  Layers
} from "lucide-react";

export function GlossarySidebar() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [openTermIds, setOpenTermIds] = useState<Set<string>>(new Set(["mrr", "operating-margin"]));

  const toggleTerm = (id: string) => {
    setOpenTermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenTermIds(new Set(filteredTerms.map((t) => t.id)));
  };

  const collapseAll = () => {
    setOpenTermIds(new Set());
  };

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((term) => {
      return selectedCategory === "All" || term.category === selectedCategory;
    });
  }, [selectedCategory]);

  // Group filtered terms by category
  const groupedTerms = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const term of filteredTerms) {
      if (!map.has(term.category)) {
        map.set(term.category, []);
      }
      map.get(term.category)!.push(term);
    }
    return map;
  }, [filteredTerms]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Revenue & Top-Line":
        return <TrendingUp className="w-3.5 h-3.5 text-[#008CFF]" />;
      case "Profitability & Margins":
        return <Calculator className="w-3.5 h-3.5 text-emerald-600" />;
      case "Cash Flow & Runway":
        return <Wallet className="w-3.5 h-3.5 text-blue-600" />;
      case "Retention & Cohorts":
        return <Users className="w-3.5 h-3.5 text-purple-600" />;
      case "Payments & Risk":
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#002991]" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_2px_8px_rgba(0,41,145,0.04)] overflow-hidden">
      
      {/* Categories & Controls Bar */}
      <div className="p-3.5 sm:p-4 border-b border-[#E2E8F0] bg-white shrink-0 space-y-2.5">
        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {GLOSSARY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#002991] text-white shadow-2xs"
                  : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#000000]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Expand / Collapse */}
        <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1.5 border-t border-[#F1F5F9]">
          <span>Click any term to expand definition</span>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="hover:text-[#008CFF] transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span>•</span>
            <button
              onClick={collapseAll}
              className="hover:text-[#008CFF] transition-colors cursor-pointer"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Dropdowns List - Independent Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 scrollbar-thin">
        {filteredTerms.length === 0 ? (
          <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 mt-4">
            <HelpCircle className="w-6 h-6 text-[#94A3B8] mx-auto" />
            <p className="text-xs font-semibold text-[#000000]">No matching financial terms</p>
            <p className="text-[11px] text-[#64748B]">
              Select &quot;All&quot; or choose another category tab above.
            </p>
          </div>
        ) : (
          Array.from(groupedTerms.entries()).map(([category, terms]) => (
            <div key={category} className="space-y-2">
              {/* Category Subheader */}
              <div className="flex items-center gap-1.5 px-1 pt-1 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                {getCategoryIcon(category)}
                <span>{category}</span>
                <span className="text-[10px] font-normal text-[#94A3B8]">({terms.length})</span>
              </div>

              {/* Term Dropdown Accordions */}
              <div className="space-y-1.5">
                {terms.map((term) => {
                  const isOpen = openTermIds.has(term.id);

                  return (
                    <div
                      key={term.id}
                      className={`rounded-xl border transition-all ${
                        isOpen 
                          ? "border-[#008CFF]/40 bg-white shadow-xs" 
                          : "border-[#E2E8F0] bg-[#FAFCFF] hover:bg-[#F0F7FF] hover:border-[#CBD5E1]"
                      }`}
                    >
                      {/* Dropdown Header Trigger */}
                      <button
                        type="button"
                        onClick={() => toggleTerm(term.id)}
                        className="w-full flex items-center justify-between p-3 text-left cursor-pointer focus:outline-none"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="font-semibold text-xs text-[#000000] truncate">
                            {term.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-medium text-[#002991] px-1.5 py-0.5 rounded bg-[#E5F3FF] border border-[#008CFF]/20">
                            {term.shortLabel}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-[#008CFF] transition-transform" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#94A3B8] transition-transform" />
                          )}
                        </div>
                      </button>

                      {/* Dropdown Body Content */}
                      {isOpen && (
                        <div className="px-3 pb-3 pt-1 border-t border-[#E2E8F0]/80 text-xs space-y-2.5 animate-in fade-in duration-150">
                          
                          {/* Definition */}
                          <div>
                            <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block mb-0.5">
                              Definition
                            </span>
                            <p className="text-[#334155] leading-relaxed">
                              {term.definition}
                            </p>
                          </div>

                          {/* Formula (if available) */}
                          {term.formula && (
                            <div className="rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] p-2">
                              <span className="text-[10px] font-semibold text-[#002991] uppercase tracking-wider block mb-0.5">
                                Formula / Calculation
                              </span>
                              <code className="text-[11px] font-mono text-[#0F172A] font-medium block">
                                {term.formula}
                              </code>
                            </div>
                          )}

                          {/* Why it Matters */}
                          <div>
                            <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block mb-0.5">
                              Why It Matters For Your Business
                            </span>
                            <p className="text-[#334155] leading-relaxed">
                              {term.whyItMatters}
                            </p>
                          </div>

                          {/* Industry Benchmark */}
                          {term.benchmark && (
                            <div className="text-[11px] text-[#475569] flex items-start gap-1.5 pt-1 border-t border-[#F1F5F9]">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span><strong className="text-[#0F172A]">Benchmark:</strong> {term.benchmark}</span>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
