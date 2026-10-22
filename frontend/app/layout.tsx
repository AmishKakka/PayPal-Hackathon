import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ClientProviders } from "@/components/providers/ClientProviders";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Uno - Understand and improve your business",
  description: "Understand and improve your business with AI-powered conversational analytics, AG Charts, and predictive forecasting for PayPal merchants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#F5F7FA] text-[#000000] font-body-md antialiased selection:bg-[#008CFF]/20 selection:text-[#002991] relative">
        
        {/* Subtle Clean Canvas Transitions */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[850px] h-[520px] bg-gradient-to-b from-[#EEF2F6] to-transparent opacity-80"></div>
          <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-[#008CFF]/[0.02] blur-[140px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-[550px] h-[550px] bg-[#002991]/[0.015] blur-[160px] rounded-full"></div>
        </div>

        <ClientProviders>
          <Header />
          <main className="flex-1 w-full relative z-10">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
