"use client";

import React, { ReactNode } from "react";
import { BusinessProfileProvider } from "@/context/BusinessProfileContext";
import { PayPalConnectModal } from "@/components/modals/PayPalConnectModal";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <BusinessProfileProvider>
      {children}
      <PayPalConnectModal />
    </BusinessProfileProvider>
  );
}