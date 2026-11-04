"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  BusinessProfile, 
  fetchBusinessProfile, 
  probeBusinessAccount, 
  confirmBusinessProfile,
  getApiBase
} from "@/lib/api";

export type ModalStep = "credentials" | "probing" | "confirmation" | "customizing";

interface BusinessProfileContextType {
  profile: BusinessProfile;
  isLoading: boolean;
  isProbing: boolean;
  isConnecting: boolean;
  showModal: boolean;
  modalStep: ModalStep;
  probeResult: BusinessProfile | null;
  statusMsg: { type: "success" | "error"; text: string } | null;
  setShowModal: (open: boolean) => void;
  setModalStep: (step: ModalStep) => void;
  setStatusMsg: (msg: { type: "success" | "error"; text: string } | null) => void;
  runProbe: () => Promise<BusinessProfile>;
  connectAndProbe: (clientId: string, clientSecret: string) => Promise<boolean>;
  confirmProfile: (customProfile?: Partial<BusinessProfile>) => Promise<void>;
  openConnectModal: (step?: ModalStep) => void;
}

const defaultProfile: BusinessProfile = {
  has_subscriptions: false,
  has_invoices: false,
  has_disputes: false,
  has_payouts: false,
  primary_signal: "payouts",
  summary: {
    subscriptions: "Scanning account...",
    invoices: "Scanning account...",
    disputes: "Scanning account...",
    payouts: "Scanning account..."
  },
  stats: {
    plans_count: 0,
    invoices_count: 0,
    disputes_count: 0,
    transactions_count: 0,
    gross_settled: 0.0
  }
};

const BusinessProfileContext = createContext<BusinessProfileContextType | undefined>(undefined);

export function BusinessProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<BusinessProfile>(defaultProfile);
  const [probeResult, setProbeResult] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProbing, setIsProbing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("credentials");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initial load of profile from backend
  useEffect(() => {
    async function initProfile() {
      try {
        const loaded = await fetchBusinessProfile();
        if (loaded) {
          setProfile(loaded);
        }
      } catch (e) {
        console.warn("Failed to load business profile:", e);
      } finally {
        setIsLoading(false);
      }
    }
    initProfile();
  }, []);

  const openConnectModal = (step: ModalStep = "credentials") => {
    setStatusMsg(null);
    setModalStep(step);
    setShowModal(true);
  };

  const runProbe = async (): Promise<BusinessProfile> => {
    setIsProbing(true);
    try {
      const res = await probeBusinessAccount();
      setProbeResult(res);
      return res;
    } finally {
      setIsProbing(false);
    }
  };

  const connectAndProbe = async (clientId: string, clientSecret: string): Promise<boolean> => {
    setIsConnecting(true);
    setStatusMsg(null);
    setModalStep("probing");

    try {
      // 1. Authenticate with backend
      const res = await fetch(`${getApiBase()}/api/paypal/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          mode: "sandbox",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setStatusMsg({ type: "error", text: data.message || "PayPal authentication failed." });
        setModalStep("credentials");
        return false;
      }

      // 2. Quietly probe endpoints in parallel (backend already gathers in /api/paypal/connect or /api/business/probe)
      const probeData = data.probe || await probeBusinessAccount();
      setProbeResult(probeData);
      
      // Artificial slight smooth delay for probe visualization
      await new Promise((r) => setTimeout(r, 600));

      // 3. Transition to confirmation screen
      setModalStep("confirmation");
      return true;
    } catch {
      setStatusMsg({ type: "error", text: "Could not reach backend API server." });
      setModalStep("credentials");
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const confirmProfile = async (customProfile?: Partial<BusinessProfile>) => {
    const toSave: BusinessProfile = {
      ...(probeResult || profile),
      ...(customProfile || {}),
    };

    try {
      const res = await confirmBusinessProfile(toSave);
      if (res && res.profile) {
        setProfile(res.profile);
      } else {
        setProfile(toSave);
      }
      setShowModal(false);
      setStatusMsg({ type: "success", text: "Merchant profile confirmed and active!" });
    } catch (e) {
      console.error("Error saving profile:", e);
    }
  };

  return (
    <BusinessProfileContext.Provider
      value={{
        profile,
        isLoading,
        isProbing,
        isConnecting,
        showModal,
        modalStep,
        probeResult,
        statusMsg,
        setShowModal,
        setModalStep,
        setStatusMsg,
        runProbe,
        connectAndProbe,
        confirmProfile,
        openConnectModal,
      }}
    >
      {children}
    </BusinessProfileContext.Provider>
  );
}

export function useBusinessProfile() {
  const context = useContext(BusinessProfileContext);
  if (!context) {
    throw new Error("useBusinessProfile must be used within a BusinessProfileProvider");
  }
  return context;
}
