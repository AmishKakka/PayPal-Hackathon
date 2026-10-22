"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  sendChatMessage, 
  ChatResponse, 
  ChartConfig 
} from "@/lib/api";
import { AGChartWrapper } from "@/components/charts/AGChartWrapper";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Layers 
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  chart?: ChartConfig;
  kpis?: Record<string, unknown>;
  agentTrace?: string[];
  timestamp: string;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response: ChatResponse = await sendChatMessage(query);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.answer,
        chart: response.chart,
        kpis: response.kpis,
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
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-6 h-[calc(100vh-5rem)] flex flex-col justify-between">

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Assistant Avatar */}
            {msg.sender === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E5F3FF] border border-[#008CFF]/30 text-[#002991] mt-1 shadow-xs">
                <Bot className="h-4 w-4" />
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
              {/* Agent Trace Pills */}
              {msg.agentTrace && msg.agentTrace.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3 pb-2.5 border-b border-[#E2E8F0]">
                  <Layers className="h-3 w-3 text-[#008CFF]" />
                  <span className="text-[10px] text-[#4A5568] font-semibold uppercase tracking-wider">Router:</span>
                  {msg.agentTrace.map((trace, idx) => (
                    <span 
                      key={idx}
                      className="rounded-full bg-[#F5F7FA] px-2.5 py-0.5 text-[10px] text-[#002991] border border-[#E2E8F0] font-medium"
                    >
                      {trace}
                    </span>
                  ))}
                </div>
              )}

              {/* Text Body */}
              <MarkdownRenderer content={msg.text} />

              {/* Inline Embedded AG Chart (Scrollable Area to prevent cutoff) */}
              {msg.chart && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#000000] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#008CFF]" />
                      Synthesized Chart
                    </span>
                    <span className="text-[10px] text-[#4A5568]">
                      Live PayPal Sandbox data
                    </span>
                  </div>
                  <div className="w-full overflow-x-auto overflow-y-auto max-h-[460px] rounded-xl border border-[#E2E8F0] bg-[#F5F7FA]/40 p-2 scrollbar-thin">
                    <div className="min-w-[480px]">
                      <AGChartWrapper config={msg.chart} height={360} />
                    </div>
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
              <Bot className="h-4 w-4 animate-pulse" />
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
      <div className="pt-3">
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
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Agent Warren...</div>}>
      <ChatContent />
    </Suspense>
  );
}
