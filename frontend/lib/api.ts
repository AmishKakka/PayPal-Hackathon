const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: string;
  description?: string;
  categories: string[];
  datasets: ChartDataset[];
  metric_unit: string;
}

export interface TransactionItem {
  id: string;
  date: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  region: string;
  product_tier?: string;
}

export interface ChurnRiskItem {
  tier_name: string;
  active_subscribers: number;
  churn_probability: number;
  monthly_revenue_at_risk: number;
  key_drivers: string[];
  recommended_action: string;
}

export interface OutlookForecast {
  forecast_30d: number;
  forecast_90d: number;
  confidence_score: number;
  projected_mrr_growth: number;
  historical_trend: Array<{ month: string; revenue: number; mrr: number }>;
  projected_trend: Array<{ month: string; revenue: number; mrr: number; low: number; high: number }>;
  at_risk_tiers: ChurnRiskItem[];
  proactive_tips: string[];
}

export interface BusinessProfile {
  has_subscriptions: boolean;
  has_invoices: boolean;
  has_disputes: boolean;
  has_payouts: boolean;
  primary_signal: "subscriptions" | "invoices" | "disputes" | "payouts";
  summary?: {
    subscriptions?: string;
    invoices?: string;
    disputes?: string;
    payouts?: string;
  };
  stats?: {
    plans_count?: number;
    invoices_count?: number;
    disputes_count?: number;
    transactions_count?: number;
    gross_settled?: number;
  };
}

export interface FollowUpAction {
  label: string;
  action_type: "query" | "navigate" | "action";
  payload: string;
}

export interface ChatResponse {
  answer: string;
  chart?: ChartConfig;
  kpis?: Record<string, unknown>;
  follow_up_suggestions?: FollowUpAction[];
  agent_trace?: string[];
}

export async function probeBusinessAccount(): Promise<BusinessProfile> {
  const res = await fetch(`${API_BASE}/api/business/probe`);
  if (!res.ok) {
    throw new Error(`Probe failed with status ${res.status}`);
  }
  return await res.json();
}

export async function fetchBusinessProfile(): Promise<BusinessProfile> {
  const res = await fetch(`${API_BASE}/api/business/profile`);
  if (!res.ok) {
    throw new Error(`Failed to fetch business profile: ${res.status}`);
  }
  return await res.json();
}

export async function confirmBusinessProfile(profile: Partial<BusinessProfile>): Promise<{ success: boolean; profile: BusinessProfile }> {
  const res = await fetch(`${API_BASE}/api/business/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });
  if (!res.ok) {
    throw new Error(`Failed to save business profile: ${res.status}`);
  }
  return await res.json();
}

export async function fetchTransactions(): Promise<TransactionItem[]> {
  const res = await fetch(`${API_BASE}/api/transactions`);
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions: ${res.status}`);
  }
  return await res.json();
}

export async function fetchStandardCharts(): Promise<ChartConfig[]> {
  const res = await fetch(`${API_BASE}/api/charts/standard`);
  if (!res.ok) {
    throw new Error(`Failed to fetch standard charts: ${res.status}`);
  }
  return await res.json();
}

export async function generateCustomChart(prompt: string): Promise<ChartConfig> {
  const res = await fetch(`${API_BASE}/api/charts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to generate custom chart (${res.status}): ${errorText || res.statusText}`);
  }
  return await res.json();
}

export async function fetchOutlook(): Promise<OutlookForecast> {
  const res = await fetch(`${API_BASE}/api/outlook`);
  if (!res.ok) {
    throw new Error(`Failed to fetch outlook forecast: ${res.status}`);
  }
  return await res.json();
}

export async function sendChatMessage(message: string, sessionId: string = "default"): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI chat error (${res.status}): ${errorText || res.statusText}`);
  }
  return await res.json();
}

export async function connectPayPalCredentials(
  clientId: string,
  clientSecret: string,
  mode: string = "sandbox"
): Promise<{ success: boolean; message: string; probe?: BusinessProfile }> {
  const res = await fetch(`${API_BASE}/api/paypal/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      mode
    })
  });
  if (!res.ok) {
    throw new Error(`Credentials update failed with status ${res.status}`);
  }
  return await res.json();
}

export async function sendInvoiceReminder(
  invoiceId: string,
  note?: string
): Promise<{ success: boolean; error?: string; status_code?: number }> {
  const res = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(invoiceId)}/remind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: note || "Please remit payment for your pending PayPal invoice." })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send reminder (${res.status}): ${errorText || res.statusText}`);
  }
  return await res.json();
}

export interface BriefingHighlight {
  label: string;
  value: string;
  change: string;
  type: "positive" | "warning" | "neutral";
}

export interface ExecutiveBriefing {
  greeting: string;
  date: string;
  headline: string;
  summary: string;
  highlights: BriefingHighlight[];
  action_items: string[];
  audio_script: string;
}

export async function fetchExecutiveBriefing(): Promise<ExecutiveBriefing> {
  const res = await fetch(`${API_BASE}/api/executive-briefing`);
  if (!res.ok) {
    throw new Error(`Failed to fetch executive briefing (${res.status})`);
  }
  return await res.json();
}