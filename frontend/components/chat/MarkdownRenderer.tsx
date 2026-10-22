"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="max-w-none text-sm text-[#000000] space-y-3 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-xl font-bold text-[#000000] mt-3 mb-2 tracking-tight" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-lg font-bold text-[#000000] mt-3 mb-1.5 tracking-tight" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-base font-bold text-[#002991] mt-2.5 mb-1 tracking-tight flex items-center gap-1.5" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-2 leading-relaxed text-[#334155]" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-[#000000] bg-[#F5F7FA] px-1 py-0.5 rounded border border-[#E2E8F0]" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="text-[#4A5568] italic" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 mb-2.5 text-[#334155] marker:text-[#008CFF]" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 mb-2.5 text-[#334155] marker:text-[#002991]" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="leading-relaxed pl-1" {...props} />
          ),
          code: ({ ...props }) => (
            <code className="rounded bg-[#F5F7FA] px-1.5 py-0.5 font-mono text-xs text-[#002991] border border-[#E2E8F0]" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-2 border-[#008CFF] pl-3 italic text-[#4A5568] my-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
