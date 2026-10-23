import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto px-8 lg:px-12 pb-16 pt-2">
      
      <section className="flex flex-col items-center justify-center text-center mb-16 select-none relative">
        <h1 className="text-5xl md:text-6xl lg:text-[4.25rem] font-bold tracking-tight text-[#000000] leading-none relative">
          Uno
        </h1>
        <p className="text-base md:text-lg text-[#4A5568] max-w-md mt-3 tracking-normal font-normal">
          Understand and improve your business
        </p>

        <Link 
          href="/basic-charts"
          className="mt-6 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-[#CBD5E1] shadow-xs hover:border-[#008CFF] hover:shadow-md transition-all group cursor-pointer"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#10b981] animate-ping" />
          <span className="text-xs font-semibold text-[#002991] group-hover:text-[#008CFF] transition-colors">
            Morning Executive Briefing Ready
          </span>
          <span className="text-xs text-[#CBD5E1]">&bull;</span>
          <span className="text-xs text-[#4A5568]">
            View today&apos;s business pulse &rarr;
          </span>
        </Link>
      </section>

      {/* 3 clickable cards */}
      <section 
        aria-label="Uno Core Capabilities" 
        className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch"
      >
        
        {/* Quick View */}
        <Link 
          aria-label="Quick View - Real-time cashflow, sales pulse & live margin overview" 
          href="/basic-charts"
          className="group relative rounded-2xl p-8 lg:p-9 flex flex-col justify-end min-h-[360px] bg-white border border-[#E2E8F0] hover:border-[#002991] hover:ring-1 hover:ring-[#002991]/20 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] overflow-hidden cursor-pointer"
        >
          {/* Subtle Telemetry Grid and Financial Pulse Wave Graphics */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F5F7FA]/70 via-transparent to-white"></div>
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#008CFF]/[0.04] rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            
            {/* Telemetry Grid & Delicate Azure Line */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" 
              fill="none" 
              preserveAspectRatio="none" 
              viewBox="0 0 400 360" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="qv-fill" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#008CFF" stopOpacity="0.12"></stop>
                  <stop offset="70%" stopColor="#002991" stopOpacity="0.03"></stop>
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"></stop>
                </linearGradient>
                <linearGradient id="qv-stroke" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#008CFF" stopOpacity="0.85"></stop>
                  <stop offset="60%" stopColor="#002991" stopOpacity="0.75"></stop>
                  <stop offset="100%" stopColor="#008CFF" stopOpacity="0.5"></stop>
                </linearGradient>
                <pattern height="24" id="qv-grid" patternUnits="userSpaceOnUse" width="24">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2E8F0" strokeWidth="0.75"></path>
                </pattern>
              </defs>
              <rect fill="url(#qv-grid)" height="360" width="400"></rect>
              {/* Area Fill */}
              <path d="M 0 170 Q 70 120 130 150 T 250 80 T 340 110 T 400 60 L 400 240 L 0 240 Z" fill="url(#qv-fill)"></path>
              {/* Main Pulse Line */}
              <path className="group-hover:stroke-[2.5] transition-all duration-300" d="M 0 170 Q 70 120 130 150 T 250 80 T 340 110 T 400 60" stroke="url(#qv-stroke)" strokeLinecap="round" strokeWidth="2"></path>
              {/* Secondary Baseline Guide */}
              <path d="M 0 195 Q 80 180 160 140 T 280 130 T 400 95" stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1.2"></path>
              {/* Nodes */}
              <circle cx="250" cy="80" fill="#008CFF" r="4"></circle>
              <circle cx="250" cy="80" r="8" stroke="#008CFF" strokeOpacity="0.3" strokeWidth="1.5"></circle>
              <circle cx="340" cy="110" fill="#002991" r="3.5"></circle>
              <circle cx="130" cy="150" fill="#008CFF" r="3"></circle>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
          </div>

          <div className="relative z-10 mt-auto pt-28">
            <h2 className="text-2xl lg:text-[1.65rem] text-[#000000] font-semibold tracking-tight transition-colors duration-300 group-hover:text-[#002991]">
              Quick View
            </h2>
            <p className="text-sm lg:text-[0.9375rem] text-[#4A5568] mt-2.5 leading-relaxed font-normal">
              Real-time cashflow, sales pulse &amp; live margin overview.
            </p>
          </div>
        </Link>

        {/* Agent Warren */}
        <Link 
          aria-label="Agent Warren - Autonomous AI financial advisor" 
          href="/chat"
          className="group relative rounded-2xl p-8 lg:p-9 flex flex-col justify-end min-h-[360px] bg-white border border-[#E2E8F0] hover:border-[#002991] hover:ring-1 hover:ring-[#002991]/20 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] overflow-hidden cursor-pointer"
        >
          {/* Concentric Orbital AI Rings & Synapse Nodes Graphics */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F5F7FA]/70 via-transparent to-white"></div>
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#002991]/[0.04] rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            
            {/* Orbital Rings & Synapse Nodes SVG */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" 
              fill="none" 
              viewBox="0 0 400 360" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient cx="68%" cy="35%" id="warren-core" r="45%">
                  <stop offset="0%" stopColor="#008CFF" stopOpacity="0.18"></stop>
                  <stop offset="60%" stopColor="#002991" stopOpacity="0.06"></stop>
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"></stop>
                </radialGradient>
              </defs>
              {/* Orbital Rings */}
              <circle cx="270" cy="120" r="35" stroke="#008CFF" strokeDasharray="3 3" strokeOpacity="0.5" strokeWidth="1.2"></circle>
              <circle cx="270" cy="120" r="65" stroke="#CBD5E1" strokeOpacity="0.75" strokeWidth="1"></circle>
              <circle cx="270" cy="120" r="95" stroke="#002991" strokeDasharray="5 5" strokeOpacity="0.3" strokeWidth="1"></circle>
              <circle cx="270" cy="120" r="130" stroke="#E2E8F0" strokeWidth="1"></circle>
              {/* Core Glow */}
              <circle cx="270" cy="120" fill="url(#warren-core)" r="55"></circle>
              <circle className="animate-pulse" cx="270" cy="120" fill="#008CFF" r="5"></circle>
              <circle cx="270" cy="120" r="10" stroke="#008CFF" strokeOpacity="0.3" strokeWidth="1.5"></circle>
              {/* Synaptic Light Paths */}
              <path d="M 70 80 L 160 110 L 270 120 L 350 70 M 160 110 L 220 180 L 270 120 M 120 180 L 220 180 L 330 200" stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1"></path>
              {/* Synaptic Nodes */}
              <circle cx="160" cy="110" fill="#002991" r="3"></circle>
              <circle cx="70" cy="80" fill="#64748B" r="2"></circle>
              <circle cx="220" cy="180" fill="#008CFF" r="3.5"></circle>
              <circle cx="350" cy="70" fill="#002991" r="2.5"></circle>
              <circle cx="120" cy="180" fill="#94A3B8" r="2"></circle>
              <circle cx="330" cy="200" fill="#008CFF" r="2.5"></circle>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
          </div>

          <div className="relative z-10 mt-auto pt-28">
            <h2 className="text-2xl lg:text-[1.65rem] text-[#000000] font-semibold tracking-tight transition-colors duration-300 group-hover:text-[#002991]">
              Agent Warren
            </h2>
            <p className="text-sm lg:text-[0.9375rem] text-[#4A5568] mt-2.5 leading-relaxed font-normal">
              Autonomous AI financial advisor &amp; treasury intelligence.
            </p>
          </div>
        </Link>

        {/* Future Outlook */}
        <Link 
          aria-label="Future Outlook - 30-90 day runway forecast & predictive inventory demand" 
          href="/outlook"
          className="group relative rounded-2xl p-8 lg:p-9 flex flex-col justify-end min-h-[360px] bg-white border border-[#E2E8F0] hover:border-[#002991] hover:ring-1 hover:ring-[#002991]/20 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_32px_-8px_rgba(0,41,145,0.08)] overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F5F7FA]/70 via-transparent to-white"></div>
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#008CFF]/[0.04] rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            
            <svg 
              className="absolute inset-0 w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" 
              fill="none" 
              preserveAspectRatio="none" 
              viewBox="0 0 400 360" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="fo-cone" x1="0%" x2="100%" y1="100%" y2="0%">
                  <stop offset="0%" stopColor="#008CFF" stopOpacity="0.03"></stop>
                  <stop offset="60%" stopColor="#008CFF" stopOpacity="0.08"></stop>
                  <stop offset="100%" stopColor="#002991" stopOpacity="0.12"></stop>
                </linearGradient>
                <linearGradient id="fo-beam" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#008CFF" stopOpacity="0.7"></stop>
                  <stop offset="100%" stopColor="#002991" stopOpacity="0.9"></stop>
                </linearGradient>
              </defs>
              {/* Confidence Cone */}
              <path d="M 0 200 L 400 50 L 400 130 L 0 200 Z" fill="url(#fo-cone)"></path>
              {/* Main Predictive Trajectory Curve */}
              <path className="group-hover:stroke-[2.5] transition-all duration-300" d="M 0 200 Q 140 180 260 120 T 400 65" stroke="url(#fo-beam)" strokeLinecap="round" strokeWidth="2"></path>
              {/* Upper & Lower Bound Trajectories */}
              <path d="M 0 200 Q 150 150 270 90 T 400 40" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="1.2"></path>
              <path d="M 0 200 Q 150 200 270 150 T 400 110" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="1.2"></path>
              {/* Milestones */}
              <line stroke="#E2E8F0" strokeDasharray="2 2" strokeWidth="1" x1="160" x2="160" y1="120" y2="220"></line>
              <line stroke="#CBD5E1" strokeDasharray="2 2" strokeWidth="1" x1="270" x2="270" y1="70" y2="180"></line>
              <circle cx="260" cy="120" fill="#008CFF" r="4"></circle>
              <circle cx="260" cy="120" r="8" stroke="#008CFF" strokeOpacity="0.3" strokeWidth="1.5"></circle>
              <circle cx="400" cy="65" fill="#002991" r="4"></circle>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
          </div>

          <div className="relative z-10 mt-auto pt-28">
            <h2 className="text-2xl lg:text-[1.65rem] text-[#000000] font-semibold tracking-tight transition-colors duration-300 group-hover:text-[#002991]">
              Future Outlook
            </h2>
            <p className="text-sm lg:text-[0.9375rem] text-[#4A5568] mt-2.5 leading-relaxed font-normal">
              30-90 day runway forecast &amp; predictive inventory demand.
            </p>
          </div>
        </Link>

      </section>
    </main>
  );
}
