"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  sendChatMessage, 
  ChatResponse, 
  ChartConfig,
  FollowUpAction 
} from "@/lib/api";
import { AGChartWrapper } from "@/components/charts/AGChartWrapper";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { GlossarySidebar } from "@/components/chat/GlossarySidebar";
import { NeuralNetworkIcon } from "@/components/icons/NeuralNetworkIcon";
import { 
  User, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  Pin, 
  Check, 
  Zap, 
  ArrowRight 
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  chart?: ChartConfig;
  kpis?: Record<string, unknown>;
  followUpSuggestions?: FollowUpAction[];
  agentTrace?: string[];
  timestamp: string;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);
  const processedQueryRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "### Autonomous Financial Copilot Initialized\n\nI analyze your live PayPal transactions, subscription cohorts, receivables, and predictive cash trajectory. What would you like to investigate?",
      timestamp: "Ready"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem("uno_custom_charts") || sessionStorage.getItem("uno_custom_charts");
      if (savedStr) {
        const saved: ChartConfig[] = JSON.parse(savedStr);
        if (Array.isArray(saved)) {
          setPinnedIds(saved.map(c => c.id));
        }
      }
    } catch {}
  }, []);

  const handlePinChart = (chart: ChartConfig) => {
    try {
      const savedStr = localStorage.getItem("uno_custom_charts") || sessionStorage.getItem("uno_custom_charts");
      const saved: ChartConfig[] = savedStr ? JSON.parse(savedStr) : [];
      
      const chartId = chart.id || `custom-pinned-${Date.now()}`;
      const uniqueId = chartId.startsWith("pinned-") ? chartId : `pinned-${chartId}`;
      
      const chartToSave: ChartConfig = {
        ...chart,
        id: uniqueId,
        title: chart.title
      };

      const exists = saved.some(c => c.id === uniqueId || c.id === chart.id || (c.title === chartToSave.title && c.type === chartToSave.type));
      if (!exists) {
        saved.push(chartToSave);
        localStorage.setItem("uno_custom_charts", JSON.stringify(saved));
        sessionStorage.setItem("uno_custom_charts", JSON.stringify(saved));
        window.dispatchEvent(new Event("uno_charts_updated"));
      }
      setPinnedIds(prev => [...prev, chart.id, uniqueId]);
    } catch (e) {
      console.error("Failed to pin chart:", e);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : input).trim();
    if (!query || loading || inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setInput("");

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response: ChatResponse = await sendChatMessage(query);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "assistant",
        text: response.answer,
        chart: response.chart,
        kpis: response.kpis,
        followUpSuggestions: response.follow_up_suggestions,
        agentTrace: response.agent_trace,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        text: "Could not reach the analysis engine. Please verify the backend server is reachable.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery && processedQueryRef.current !== initialQuery) {
      processedQueryRef.current = initialQuery;
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/chat");
      }
      handleSend(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 h-[calc(100vh-5.5rem)] overflow-hidden">
      
      {/* 70:30 Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-full w-full items-start">
        <div className="lg:col-span-7 h-full flex flex-col justify-between overflow-hidden">

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Assistant Avatar */}
                {msg.sender === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E5F3FF] border border-[#008CFF]/30 text-[#002991] mt-1 shadow-xs">
                    <NeuralNetworkIcon className="h-4 w-4" />
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-5 text-sm ${
                    msg.sender === "user"
                      ? "bg-[#E5F3FF] border border-[#008CFF]/30 text-[#002991] font-medium shadow-xs ml-auto"
                      : "bg-white border border-[#E2E8F0] text-[#000000] shadow-[0_2px_8px_rgba(0,41,145,0.04)]"
                  }`}
                >
                  {msg.agentTrace && msg.agentTrace.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3 pb-2.5 border-b border-[#E2E8F0]">
                      <Layers className="h-3 w-3 text-[#008CFF]" />
                      <span className="text-[10px] text-[#4A5568] font-semibold uppercase tracking-wider">Router:</span>
                      {msg.agentTrace.map((trace, idx) => {
                        const isAction = trace.includes("Action Executed") || trace.startsWith("⚡");
                        return (
                          <span 
                            key={idx}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border flex items-center gap-1 ${
                              isAction 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs" 
                                : "bg-[#F5F7FA] text-[#002991] border-[#E2E8F0]"
                            }`}
                          >
                            {isAction && <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600 shrink-0" />}
                            <span>{trace}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <MarkdownRenderer content={msg.text} />
                  {msg.chart && (
                    <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-[#000000] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#008CFF]" />
                          Synthesized Chart
                        </span>
                        <div className="flex items-center gap-2">
                          {pinnedIds.includes(msg.chart.id) || pinnedIds.includes(`pinned-${msg.chart.id}`) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Pinned to Quick View</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePinChart(msg.chart!)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F7FA] text-[#002991] hover:text-[#008CFF] border border-[#E2E8F0] hover:border-[#008CFF]/40 text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
                              title="Pin this chart to your Quick View dashboard"
                            >
                              <Pin className="w-3 h-3 text-[#008CFF]" />
                              <span>Pin to Quick View</span>
                            </button>
                          )}
                          <span className="text-[10px] text-[#4A5568]">
                            Live PayPal Sandbox
                          </span>
                        </div>
                      </div>
                      <div className="w-full overflow-x-auto overflow-y-auto max-h-[460px] rounded-xl border border-[#E2E8F0] bg-[#F5F7FA]/40 p-4 scrollbar-thin">
                        <div className="mb-2">
                          <h4 className="text-sm font-semibold text-[#000000]">{msg.chart.title}</h4>
                          {msg.chart.description && (
                            <p className="text-xs text-[#4A5568] mt-0.5">{msg.chart.description}</p>
                          )}
                        </div>
                        <div className="min-w-[480px]">
                          <AGChartWrapper config={msg.chart} height={340} />
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-[#E2E8F0]">
                      <div className="text-[11px] font-semibold text-[#4A5568] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>Suggested Agent Actions</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.followUpSuggestions.map((action, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={loading}
                            onClick={() => handleSend(action.payload)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#E5F3FF] border border-[#CBD5E1] hover:border-[#008CFF] text-xs font-medium text-[#002991] transition-all shadow-2xs hover:shadow-xs cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowRight className="h-3 w-3 text-[#008CFF] group-hover:translate-x-0.5 transition-transform shrink-0" />
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-[#94A3B8] text-right">
                    {msg.timestamp}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-[#4A5568] mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3.5 justify-start items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5F3FF] border border-[#008CFF]/30 text-[#002991]">
                  <NeuralNetworkIcon className="h-4 w-4 animate-pulse" />
                </div>
                <div className="rounded-2xl bg-white border border-[#E2E8F0] px-4 py-3 text-xs text-[#4A5568] flex items-center gap-2 shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-[#008CFF] animate-ping"></span>
                  <span>Agent Warren is analyzing PayPal records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="pt-3 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                placeholder="Ask Agent Warren..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-5 pr-14 py-3.5 text-sm text-[#000000] placeholder-[#94A3B8] focus:border-[#008CFF] focus:outline-none focus:ring-1 focus:ring-[#008CFF] transition-all shadow-xs"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-3.5 p-1.5 text-[#008CFF] hover:text-[#002991] disabled:text-[#CBD5E1] disabled:cursor-not-allowed transition-colors bg-transparent border-0 cursor-pointer focus:outline-none"
                title="Send query"
              >
                <Send className="h-5 w-5 fill-current" />
              </button>
            </form>

            {/* Reset button at the bottom of the text input box */}
            <div className="flex justify-end pt-2 pr-1">
              <button
                type="button"
                onClick={() => setMessages([messages[0]])}
                className="flex items-center gap-1.5 text-xs text-[#4A5568] hover:text-[#000000] transition-colors cursor-pointer py-1 px-2.5 rounded-md hover:bg-[#F5F7FA] border border-[#E2E8F0] bg-white shadow-xs"
                title="Reset conversation"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

        </div>
        <div className="lg:col-span-3 h-full overflow-hidden">
          <GlossarySidebar />
        </div>

      </div>

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Agent Warren...</div>}>
      <ChatContent />
    </Suspense>
  );
}
