"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  User, 
  Home, 
  Settings, 
  LogOut, 
  BarChart3, 
  Bot, 
  TrendingUp 
} from "lucide-react";
import { useBusinessProfile } from "@/context/BusinessProfileContext";

export function Header() {
  const pathname = usePathname();
  const { openConnectModal } = useBusinessProfile();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";

  const navItems = [
    { name: "Quick View", href: "/basic-charts", icon: BarChart3 },
    { name: "Agent Warren", href: "/chat", icon: Bot },
    { name: "Future Outlook", href: "/outlook", icon: TrendingUp },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSettingsClick = () => {
    setDropdownOpen(false);
    openConnectModal("confirmation");
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    openConnectModal("credentials");
  };

  const renderAccountButton = (size: "large" | "standard") => {
    const isLarge = size === "large";

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          aria-label="Account Menu"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={`relative group p-2 text-[#4A5568] hover:text-[#002991] transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center`}
          id="accountBtn"
          title="Account Menu"
        >
          <User className={`${isLarge ? "h-6 w-6" : "h-5 w-5"} text-[#000000] group-hover:text-[#002991] transition-colors duration-200`} />
          {/* Bright Blue Status Dot */}
          <span
            className={`absolute rounded-full bg-[#008CFF] ring-2 ring-white shadow-[0_0_8px_rgba(0,140,255,0.55)] ${
              isLarge ? "top-1 right-1 w-2.5 h-2.5" : "top-1 right-1 w-2 h-2"
            }`}
          ></span>
        </button>

        {/* Dropdown Menu directly below button */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2.5 w-52 rounded-2xl border border-[#E2E8F0] bg-white shadow-xl z-50 overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-[#E2E8F0] mb-1">
              <span className="text-[11px] font-semibold text-[#4A5568] uppercase tracking-wider block">
                PayPal Account
              </span>
              <span className="text-xs text-[#000000] font-medium">
                Sandbox Mode
              </span>
            </div>

            {/* Settings */}
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#4A5568] hover:text-[#002991] hover:bg-[#F5F7FA] transition-colors text-left cursor-pointer"
            >
              <Settings className="h-4 w-4 text-[#008CFF]" />
              <div>
                <span className="block font-semibold text-[#000000]">Settings</span>
                <span className="text-[10px] text-[#4A5568] block -mt-0.5">Account profile &amp; signals</span>
              </div>
            </button>

            {/* Log Out */}
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer mt-0.5 border-t border-[#E2E8F0] pt-2"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <div>
                <span className="block font-semibold">Log Out</span>
                <span className="text-[10px] text-rose-500 block -mt-0.5">Reconnect credentials</span>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Home screen
  if (isHome) {
    return (
      <header className="relative z-20 w-full max-w-[1440px] mx-auto px-6 sm:px-10 pt-6 sm:pt-8 flex justify-end">
        {renderAccountButton("large")}
      </header>
    );
  }

  // subpages
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-[#F5F7FA]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 sm:px-10">
        
        <Link
          href="/"
          aria-label="Return to Home"
          className="relative group p-2 text-[#4A5568] hover:text-[#002991] transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Return to Home"
        >
          <Home className="h-5 w-5 text-[#000000] group-hover:text-[#002991] transition-colors duration-200" />
        </Link>

        {/* navigation bar*/}
        <nav className="flex items-center gap-1.5 bg-[#F5F7FA] p-1 rounded-full border border-[#E2E8F0]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#002991] text-white shadow-sm font-semibold"
                    : "text-[#4A5568] hover:text-[#000000] hover:bg-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Account button */}
        {renderAccountButton("standard")}

      </div>
    </header>
  );
}
