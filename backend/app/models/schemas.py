from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class KPISummary(BaseModel):
    gross_volume: float = Field(..., description="Total sales volume in USD")
    gross_volume_change: float = Field(..., description="Percentage change vs previous period")
    active_subscriptions: int = Field(..., description="Total currently active subscription seats")
    active_subscriptions_change: float = Field(..., description="Change in active subscriptions")
    mrr: float = Field(..., description="Monthly Recurring Revenue in USD")
    mrr_change: float = Field(..., description="MRR growth rate percentage")
    net_inflow: float = Field(..., description="Net cash after fees and refunds")
    dispute_rate: float = Field(..., description="Dispute rate as a percentage")
    at_risk_tiers_count: int = Field(..., description="Number of subscription tiers with high churn risk")

class ChartDataset(BaseModel):
    label: str
    data: List[float]
    color: Optional[str] = None

    def __init__(self, **data: Any):
        if "name" in data and "label" not in data:
            data["label"] = data.pop("name")
        super().__init__(**data)

class GenerateChartRequest(BaseModel):
    prompt: str

class ChartConfig(BaseModel):
    id: str
    title: str
    type: str  # "line", "bar", "donut", "stacked-bar", "area"
    description: Optional[str] = None
    categories: List[str]
    datasets: List[ChartDataset]
    metric_unit: str = "USD"
    suggested_grid_columns: Optional[List[Dict[str, Any]]] = None

class TransactionItem(BaseModel):
    id: str
    date: str
    customer_name: str
    customer_email: str
    amount: float
    currency: str = "USD"
    type: str  # "PURCHASE", "SUBSCRIPTION", "REFUND", "PAYOUT"
    status: str  # "COMPLETED", "PENDING", "REFUNDED", "HELD"
    region: str
    product_tier: Optional[str] = None

class ChurnRiskItem(BaseModel):
    tier_name: str
    active_subscribers: int
    churn_probability: float  # e.g. 0.35 (35%)
    monthly_revenue_at_risk: float
    key_drivers: List[str]
    recommended_action: str

class OutlookForecast(BaseModel):
    forecast_30d: float
    forecast_90d: float
    confidence_score: float
    projected_mrr_growth: float
    historical_trend: List[Dict[str, Any]]
    projected_trend: List[Dict[str, Any]]
    at_risk_tiers: List[ChurnRiskItem]
    proactive_tips: List[str]

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default-session"
    context: Optional[Dict[str, Any]] = None

class FollowUpAction(BaseModel):
    label: str
    action_type: str  # "query", "navigate", "action"
    payload: str

class ChatResponse(BaseModel):
    answer: str
    chart: Optional[ChartConfig] = None
    kpis: Optional[Dict[str, Any]] = None
    follow_up_suggestions: List[FollowUpAction] = []
    agent_trace: Optional[List[str]] = None

class PayPalCredentials(BaseModel):
    client_id: str
    client_secret: str
    mode: str = "sandbox"

class BusinessProfile(BaseModel):
    has_subscriptions: bool = True
    has_invoices: bool = True
    has_disputes: bool = False
    has_payouts: bool = True
    primary_signal: str = "subscriptions"
    summary: Optional[Dict[str, str]] = None
    stats: Optional[Dict[str, Any]] = None
    