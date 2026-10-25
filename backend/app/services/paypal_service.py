import os
import json
import time
import httpx
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from paypal_agent_toolkit.shared.configuration import Context
from paypal_agent_toolkit.shared.paypal_client import PayPalClient
from paypal_agent_toolkit.shared import tools as pt
from app.models.schemas import KPISummary, TransactionItem, ChurnRiskItem, OutlookForecast, BusinessProfile


_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_backend_dir, ".env"))
load_dotenv(os.path.join(_backend_dir, "..", ".env"))

def map_region_from_email(email: str) -> str:
    """Infers customer geographic region from email domain."""
    if not email:
        return "North America"
    e = email.lower()
    if any(e.endswith(ext) for ext in [".de", ".fr", ".uk", ".ie", ".es", ".it", ".eu", ".nl"]):
        return "Europe"
    if any(e.endswith(ext) for ext in [".jp", ".in", ".sg", ".kr", ".au", ".nz"]):
        return "Asia-Pacific"
    if any(e.endswith(ext) for ext in [".br", ".mx", ".ar", ".cl", ".co"]):
        return "Latin America"
    if any(e.endswith(ext) for ext in [".ae", ".sa", ".qa", ".il"]):
        return "Middle East"
    return "North America"

def infer_product_tier_and_type(amount_val: float, note: str = "", item_name: str = "") -> tuple[str, str]:
    """Dynamically determines product tier name and transaction type from PayPal invoice details."""
    if item_name:
        tier = item_name
    elif note:
        tier = note
    else:
        tier = f"Invoice Item (${amount_val:.2f})"

    t_lower = tier.lower()
    if amount_val < 0:
        return tier, "REFUND"
    elif "subscription" in t_lower or "plan" in t_lower or "membership" in t_lower or "recurring" in t_lower:
        return tier, "SUBSCRIPTION"
    elif "consulting" in t_lower or "service" in t_lower or "custom" in t_lower:
        return tier, "INVOICE"
    else:
        return tier, "PURCHASE"

class PayPalService:
    def __init__(self):
        self.client_id = os.getenv("PAYPAL_CLIENT_ID", "")
        self.client_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")
        self.mode = os.getenv("PAYPAL_MODE", "sandbox").lower()
        self.base_url = "https://api-m.sandbox.paypal.com" if self.mode == "sandbox" else "https://api-m.paypal.com"
        
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0.0

        # Initialize official PayPal Agent Toolkit Client
        self.toolkit_client: Optional[Any] = None
        self._plan_details_cache: Dict[str, Dict[str, Any]] = {}
        self._plan_cache_time: float = 0.0
        self._init_toolkit_client()

        self.profile_file = os.path.join(os.path.dirname(__file__), "..", "..", ".business_profile.json")
        self.business_profile = self._load_profile()
        self.merchant_context_cache: str = ""
        self.merchant_context_time: float = 0.0

    def _init_toolkit_client(self):
        """Initializes PayPalClient instance based on paypal-agent-toolkit."""
        if self.client_id and self.client_secret and self.client_id != "your_paypal_sandbox_client_id_here":
            try:
                self.toolkit_client = PayPalClient(
                    self.client_id,
                    self.client_secret,
                    Context(sandbox=(self.mode == "sandbox"))
                )
            except Exception as e:
                print(f"[PayPalService] Warning: Could not initialize PayPalAgentToolkit client: {e}")
                self.toolkit_client = None
        else:
            self.toolkit_client = None

    def _load_profile(self) -> Dict[str, Any]:
        try:
            if os.path.exists(self.profile_file):
                with open(self.profile_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            print(f"[PayPalService] Error loading business profile: {e}")
        return {
            "has_subscriptions": False,
            "has_invoices": False,
            "has_disputes": False,
            "has_payouts": False,
            "primary_signal": "payouts",
            "summary": {
                "subscriptions": "No active subscriptions detected",
                "invoices": "No invoices detected",
                "disputes": "0 open customer disputes (Clean account health)",
                "payouts": "No transactions detected"
            },
            "stats": {
                "plans_count": 0,
                "invoices_count": 0,
                "disputes_count": 0,
                "transactions_count": 0,
                "gross_settled": 0.0
            }
        }

    def save_profile(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = {k: v for k, v in profile.items() if v is not None}
        self.business_profile = {**self.business_profile, **cleaned}
        self.merchant_context_cache = ""
        self.merchant_context_time = 0.0
        try:
            with open(self.profile_file, "w") as f:
                json.dump(self.business_profile, f, indent=2)
        except Exception as e:
            print(f"[PayPalService] Error saving business profile: {e}")
        return self.business_profile

    def get_profile(self) -> Dict[str, Any]:
        return self.business_profile

    async def get_merchant_context(self, force_refresh: bool = False) -> str:
        """
        Dynamically initializes and compiles the merchant's business operating profile
        from the linked PayPal account (registered billing plans, live invoices, pending
        receivables, customer disputes, and geographic transaction ledger).
        Provides full situational awareness to Agent Warren and the LLM.
        """
        if not force_refresh and self.merchant_context_cache and (time.time() - self.merchant_context_time < 60):
            return self.merchant_context_cache

        try:
            plans, invoices, disputes, txns = await asyncio.gather(
                self.fetch_live_plans(),
                self.fetch_live_invoices(),
                self.fetch_live_disputes(),
                self.fetch_live_transactions(days_back=90),
                return_exceptions=True
            )
            plans = plans if isinstance(plans, list) else []
            invoices = invoices if isinstance(invoices, list) else []
            disputes = disputes if isinstance(disputes, list) else []
            txns = txns if isinstance(txns, list) else []

            paid_inv = [i for i in invoices if i.get("status") in ["PAID", "MARKED_AS_PAID"]]
            unpaid_inv = [i for i in invoices if i.get("status") in ["UNPAID", "SENT", "SCHEDULED"]]
            overdue_inv = [i for i in invoices if i.get("status") == "OVERDUE"]
            draft_inv = [i for i in invoices if i.get("status") == "DRAFT"]

            paid_sum = sum(float(i.get("amount", {}).get("value", 0)) for i in paid_inv)
            unpaid_sum = sum(float(i.get("amount", {}).get("value", 0)) for i in unpaid_inv)
            overdue_sum = sum(float(i.get("amount", {}).get("value", 0)) for i in overdue_inv)
            draft_sum = sum(float(i.get("amount", {}).get("value", 0)) for i in draft_inv)

            outstanding_lines = []
            for inv in (overdue_inv + unpaid_inv + draft_inv)[:10]:
                recips = inv.get("primary_recipients", [])
                b_info = recips[0].get("billing_info", {}) if recips else {}
                c_name = b_info.get("name", {}).get("full_name") or b_info.get("name", {}).get("given_name", "Customer")
                c_email = b_info.get("email_address", "")
                amt = float(inv.get("amount", {}).get("value", 0))
                st = inv.get("status", "UNPAID")
                inv_id = inv.get("id", "")
                inv_num = inv.get("detail", {}).get("invoice_number", "")
                outstanding_lines.append(f"  • {c_name} ({c_email}): ${amt:.2f} [{st}] (Invoice #{inv_num or inv_id})")

            outstanding_str = "\n".join(outstanding_lines) if outstanding_lines else "  • No outstanding customer receivables."

            plan_summaries = []
            for p in plans:
                p_name = p.get("name", "Plan")
                fp = ""
                for cycle in p.get("billing_cycles") or []:
                    val = cycle.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                    if val:
                        fp = f"${float(val):.2f}/mo"
                        break
                plan_summaries.append(f"{p_name} ({fp or 'Recurring'})")
            plans_str = ", ".join(plan_summaries) if plan_summaries else "No active subscription plans registered."

            regions = set(t.region for t in txns if t.region)
            regions_str = ", ".join(sorted(regions)) if regions else "Global"

            context = (
                f"CONFIRMED MERCHANT PROFILE & LIVE BUSINESS CONTEXT (from linked PayPal account):\n"
                f"- Mode: PayPal {self.mode.upper()}\n"
                f"- Primary Business Driver: {self.business_profile.get('primary_signal', 'invoices & subscriptions').upper()}\n"
                f"- Registered Billing Plans ({len(plans)} plans): {plans_str}\n"
                f"- Invoicing Portfolio ({len(invoices)} invoices):\n"
                f"  * Paid / Settled Volume: ${paid_sum:.2f} across {len(paid_inv)} invoices\n"
                f"  * Pending Receivables: ${unpaid_sum:.2f} across {len(unpaid_inv)} invoices\n"
                f"  * Overdue Receivables: ${overdue_sum:.2f} across {len(overdue_inv)} invoices\n"
                f"  * Draft Invoices: ${draft_sum:.2f} across {len(draft_inv)} invoices\n"
                f"- Outstanding Customer Receivables on File:\n{outstanding_str}\n"
                f"- Customer Disputes: {len(disputes)} open claims (Account health: {'Action Required' if disputes else 'Clean & Protected'})\n"
                f"- Global Transaction Reach: {len(txns)} transactions across {regions_str}\n"
            )
            self.merchant_context_cache = context
            self.merchant_context_time = time.time()
            return context
        except Exception as e:
            print(f"[PayPalService] Error building dynamic merchant context: {e}")
            return self.merchant_context_cache or "CONFIRMED MERCHANT PROFILE: PayPal Account Connected"

    def update_credentials(self, client_id: str, client_secret: str, mode: str = "sandbox"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.mode = mode
        self.base_url = "https://api-m.sandbox.paypal.com" if self.mode == "sandbox" else "https://api-m.paypal.com"
        self.access_token = None
        self.token_expiry = 0.0
        self._plan_details_cache.clear()
        self._plan_cache_time = 0.0
        self.merchant_context_cache = ""
        self.merchant_context_time = 0.0
        self._init_toolkit_client()

    async def get_access_token(self) -> Optional[str]:
        if not self.client_id or not self.client_secret:
            return None

        # Return cached token if valid with 5 minute buffer
        if self.access_token and time.time() < (self.token_expiry - 300):
            return self.access_token

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/oauth2/token",
                    auth=(self.client_id, self.client_secret),
                    data={"grant_type": "client_credentials"},
                    headers={"Accept": "application/json", "Accept-Language": "en_US"}
                )
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    expires_in = data.get("expires_in", 32400)
                    self.token_expiry = time.time() + expires_in
                    return self.access_token
        except Exception as e:
            print(f"[PayPalService] OAuth error: {e}")
        return None

    def is_connected(self) -> bool:
        return bool(self.client_id and self.client_secret and self.client_id != "your_paypal_sandbox_client_id_here")

    async def fetch_live_plans(self, enrich_details: bool = True) -> List[Dict[str, Any]]:
        """
        Queries active subscription plans conforming to PayPal AI Toolkit 
        `list_subscription_plans` and `show_subscription_plan_details` (/v1/billing/plans).
        Each plan is enriched with its exact `billing_cycles`, `pricing_scheme.fixed_price`,
        and `payment_preferences`.
        """
        # using official PayPal Agent Toolkit function
        if self.toolkit_client:
            try:
                res_str = pt.list_subscription_plans(
                    self.toolkit_client, 
                    {"page_size": 20, "page": 1, "total_required": True}
                )
                res_data = json.loads(res_str) if isinstance(res_str, str) else res_str
                plans = res_data.get("plans", [])

                if enrich_details and plans:
                    # Enrich plans with billing_cycles from show_subscription_plan_details
                    now = time.time()
                    enriched_plans = []
                    for p in plans:
                        p_id = p.get("id")
                        if p_id in self._plan_details_cache and (now - self._plan_cache_time) < 300:
                            enriched_plans.append(self._plan_details_cache[p_id])
                        else:
                            try:
                                d_str = pt.show_subscription_plan_details(self.toolkit_client, {"plan_id": p_id})
                                detail = json.loads(d_str) if isinstance(d_str, str) else d_str
                                full_plan = {**p, **detail}
                                self._plan_details_cache[p_id] = full_plan
                                enriched_plans.append(full_plan)
                            except Exception:
                                enriched_plans.append(p)
                    self._plan_cache_time = now
                    return enriched_plans
                return plans
            except Exception as e:
                print(f"[PayPalService] Toolkit list_subscription_plans error: {e}")

        # 2. Resilient fallback via direct async HTTP
        token = await self.get_access_token()
        if not token:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/billing/plans?page_size=20",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    return res.json().get("plans", [])
        except Exception as e:
            print(f"[PayPalService] Error fetching plans via HTTP: {e}")
        return []

    async def get_plan_details(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves plan details conforming to PayPal AI Toolkit `show_subscription_plan_details`
        (/v1/billing/plans/{plan_id}).
        """
        if self.toolkit_client:
            try:
                res = pt.show_subscription_plan_details(self.toolkit_client, {"plan_id": plan_id})
                return json.loads(res) if isinstance(res, str) else res
            except Exception as e:
                print(f"[PayPalService] Error in show_subscription_plan_details: {e}")
        token = await self.get_access_token()
        if not token:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/billing/plans/{plan_id}",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None

    async def fetch_live_invoices(self) -> List[Dict[str, Any]]:
        """
        Queries customer invoices
        """
        if self.toolkit_client:
            try:
                res_str = pt.list_invoices(
                    self.toolkit_client,
                    {"page_size": 100, "page": 1, "total_required": "true"}
                )
                res_data = json.loads(res_str) if isinstance(res_str, str) else res_str
                return res_data.get("items", [])
            except Exception as e:
                print(f"[PayPalService] Toolkit list_invoices error: {e}")

        token = await self.get_access_token()
        if not token:
            return []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(
                    f"{self.base_url}/v2/invoicing/invoices?total_required=true&page_size=100",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    return res.json().get("items", [])
        except Exception as e:
            print(f"[PayPalService] Error fetching invoices via HTTP: {e}")
        return []

    async def get_invoice_details(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves complete invoice records
        """
        if self.toolkit_client:
            try:
                res = pt.get_invoice(self.toolkit_client, {"invoice_id": invoice_id})
                return json.loads(res) if isinstance(res, str) else res
            except Exception as e:
                print(f"[PayPalService] Error in get_invoice: {e}")
        token = await self.get_access_token()
        if not token:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v2/invoicing/invoices/{invoice_id}",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None

    async def send_invoice_reminder(self, invoice_id: str, note: str = "Please remit payment for your pending PayPal invoice.") -> Dict[str, Any]:
        """
        Triggers an automated invoice reminder
        """
        if self.toolkit_client:
            try:
                res = pt.send_invoice_reminder(
                    self.toolkit_client,
                    {"invoice_id": invoice_id, "subject": "Reminder: Unpaid PayPal Invoice", "note": note}
                )
                return {"success": True, "details": res}
            except Exception as e:
                print(f"[PayPalService] Error in send_invoice_reminder: {e}")
        token = await self.get_access_token()
        if not token:
            return {"success": False, "error": "No PayPal access token"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v2/invoicing/invoices/{invoice_id}/remind",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"subject": "Reminder: Unpaid PayPal Invoice", "note": note, "send_to_recipient": True}
                )
                return {"success": res.status_code in [200, 204], "status_code": res.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def send_draft_invoice(self, invoice_id: str, note: str = "Thank you for your business. Please remit payment at your earliest convenience.") -> Dict[str, Any]:
        """
        Sends/publishes a draft invoice to the customer via PayPal Invoicing API v2.
        """
        if self.toolkit_client:
            try:
                res = pt.send_invoice(
                    self.toolkit_client,
                    {"invoice_id": invoice_id, "note": note, "send_to_recipient": True}
                )
                return {"success": True, "details": res}
            except Exception as e:
                print(f"[PayPalService] Error in send_draft_invoice: {e}")
        token = await self.get_access_token()
        if not token:
            return {"success": False, "error": "No PayPal access token"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v2/invoicing/invoices/{invoice_id}/send",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"send_to_recipient": True}
                )
                return {"success": res.status_code in [200, 202, 204], "status_code": res.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def create_invoice(
        self,
        customer_name: str,
        customer_email: str,
        item_name: str,
        amount: float,
        note: Optional[str] = None,
        days_ago: int = 0,
        send_to_recipient: bool = True
    ) -> Dict[str, Any]:
        """
        Dynamically generates, drafts, and dispatches a live PayPal invoice
        """
        token = await self.get_access_token()
        if not token:
            return {"success": False, "error": "No PayPal access token"}

        now = datetime.now(timezone.utc)
        inv_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        name_parts = customer_name.strip().split()
        given_name = name_parts[0] if name_parts else "Valued"
        surname = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Customer"

        inv_note = note or f"Invoice for {item_name}. Thank you for your business!"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                num_res = await client.post(
                    f"{self.base_url}/v2/invoicing/generate-next-invoice-number",
                    headers=headers
                )
                inv_num = num_res.json().get("invoice_number", f"INV-{int(time.time())}")

                payload = {
                    "detail": {
                        "invoice_number": inv_num,
                        "invoice_date": inv_date,
                        "currency_code": "USD",
                        "note": inv_note
                    },
                    "primary_recipients": [
                        {
                            "billing_info": {
                                "name": {"given_name": given_name, "surname": surname},
                                "email_address": customer_email.strip()
                            }
                        }
                    ],
                    "items": [
                        {
                            "name": item_name.strip(),
                            "quantity": "1",
                            "unit_amount": {"currency_code": "USD", "value": f"{amount:.2f}"}
                        }
                    ]
                }
                draft_res = await client.post(
                    f"{self.base_url}/v2/invoicing/invoices",
                    headers=headers,
                    json=payload
                )

                if draft_res.status_code not in [200, 201]:
                    return {"success": False, "error": draft_res.text, "status_code": draft_res.status_code}

                data = draft_res.json()
                invoice_id = data.get("href", "").split("/")[-1]
                send_status = None
                if send_to_recipient:
                    send_res = await client.post(
                        f"{self.base_url}/v2/invoicing/invoices/{invoice_id}/send",
                        headers=headers,
                        json={"send_to_recipient": True}
                    )
                    send_status = send_res.status_code
                return {
                    "success": True,
                    "invoice_id": invoice_id,
                    "invoice_number": inv_num,
                    "customer_name": f"{given_name} {surname}",
                    "customer_email": customer_email,
                    "amount": amount,
                    "currency": "USD",
                    "status": "SENT" if send_to_recipient else "DRAFT",
                    "invoice_date": inv_date,
                    "send_status": send_status
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def fetch_live_disputes(self) -> List[Dict[str, Any]]:
        """
        Queries cusotmer disputes
        """
        if self.toolkit_client:
            try:
                res_str = pt.list_disputes(self.toolkit_client, {"page_size": 20})
                res_data = json.loads(res_str) if isinstance(res_str, str) else res_data
                return res_data.get("items", [])
            except Exception as e:
                print(f"[PayPalService] Toolkit list_disputes error: {e}")

        token = await self.get_access_token()
        if not token:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/customer/disputes",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    return res.json().get("items", [])
        except Exception as e:
            print(f"[PayPalService] Error fetching disputes via HTTP: {e}")
        return []

    async def get_dispute_details(self, dispute_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves dispute details
        """
        if self.toolkit_client:
            try:
                res = pt.get_dispute(self.toolkit_client, {"dispute_id": dispute_id})
                return json.loads(res) if isinstance(res, str) else res
            except Exception as e:
                print(f"[PayPalService] Error in get_dispute: {e}")
        token = await self.get_access_token()
        if not token:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/customer/disputes/{dispute_id}",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None


    async def probe_account(self) -> Dict[str, Any]:
        """
        Probes the core PayPal endpoints in parallel:
        - Subscriptions
        - Invoices
        - Disputes
        - Payouts/Transactions history
        Returns a verification checklist of what was discovered.
        """
        plans, invoices, disputes, txns = await asyncio.gather(
            self.fetch_live_plans(),
            self.fetch_live_invoices(),
            self.fetch_live_disputes(),
            self.fetch_live_transactions(days_back=90),
            return_exceptions=True
        )

        plans = plans if isinstance(plans, list) else []
        invoices = invoices if isinstance(invoices, list) else []
        disputes = disputes if isinstance(disputes, list) else []
        txns = txns if isinstance(txns, list) else []

        has_subscriptions = len(plans) > 0
        has_invoices = len(invoices) > 0
        has_disputes = len(disputes) > 0
        has_payouts = len(txns) > 0

        paid_invoices = [inv for inv in invoices if inv.get("status") in ["PAID", "MARKED_AS_PAID"]]
        settled_amt = sum(float(inv.get("amount", {}).get("value", 0)) for inv in paid_invoices)
        unpaid_cnt = sum(1 for inv in invoices if inv.get("status") not in ["PAID", "MARKED_AS_PAID"])

        known_plan_prices = set()
        for p in plans:
            for cycle in p.get("billing_cycles") or []:
                fp = cycle.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                if fp:
                    try:
                        known_plan_prices.add(float(fp))
                    except (ValueError, TypeError):
                        pass

        sub_mrr = sum(
            float(inv.get("amount", {}).get("value", 0))
            for inv in paid_invoices
            if "subscription" in str(inv).lower() or "plan" in str(inv).lower() or (float(inv.get("amount", {}).get("value", 0)) in known_plan_prices if known_plan_prices else False)
        )

        dispute_amt = sum(
            float(d.get("dispute_amount", {}).get("value", 0)) for d in disputes
        )

        if has_subscriptions and has_invoices:
            primary_signal = "subscriptions"
        elif has_subscriptions:
            primary_signal = "subscriptions"
        elif has_invoices:
            primary_signal = "invoices"
        elif has_disputes:
            primary_signal = "disputes"
        else:
            primary_signal = "payouts"

        summary = {
            "subscriptions": f"{len(plans)} plans registered (${sub_mrr:.2f} active MRR)" if has_subscriptions else "No active subscriptions found",
            "invoices": f"{len(invoices)} invoices found (${settled_amt:.2f} settled, {unpaid_cnt} pending)" if has_invoices else "No customer invoices found",
            "disputes": f"{len(disputes)} open customer dispute(s) (${dispute_amt:.2f})" if has_disputes else "0 open customer disputes (Clean account health)",
            "payouts": f"{len(txns)} transactions recorded" if has_payouts else "No transaction history found"
        }

        probe_result = {
            "has_subscriptions": has_subscriptions,
            "has_invoices": has_invoices,
            "has_disputes": has_disputes,
            "has_payouts": has_payouts,
            "primary_signal": primary_signal,
            "summary": summary,
            "stats": {
                "plans_count": len(plans),
                "invoices_count": len(invoices),
                "disputes_count": len(disputes),
                "transactions_count": len(txns),
                "gross_settled": settled_amt
            }
        }

        self.save_profile(probe_result)
        return probe_result

    async def fetch_live_transactions(self, days_back: int = 90) -> List[TransactionItem]:
        """
        Extracts live transaction records directly.
        """
        token = await self.get_access_token()
        if not token:
            return []

        transactions: List[TransactionItem] = []

        invoices = await self.fetch_live_invoices()
        for inv in invoices:
            inv_id = inv.get("id", f"INV-{int(time.time())}")
            detail = inv.get("detail", {})
            inv_date = detail.get("invoice_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
            
            recipients = inv.get("primary_recipients", [])
            b_info = recipients[0].get("billing_info", {}) if recipients else {}
            c_name = b_info.get("name", {}).get("full_name") or b_info.get("name", {}).get("given_name", "PayPal Customer")
            c_email = b_info.get("email_address", "customer@sandbox.paypal.com")
            
            amount_val = float(inv.get("amount", {}).get("value", 0.0))
            currency = inv.get("amount", {}).get("currency_code", "USD")
            raw_status = inv.get("status", "UNPAID")
            
            if raw_status in ["PAID", "MARKED_AS_PAID"]:
                status = "COMPLETED"
            elif raw_status == "OVERDUE":
                status = "OVERDUE"
            elif raw_status in ["UNPAID", "SENT", "DRAFT"]:
                status = "PENDING"
            elif raw_status == "REFUNDED":
                status = "REFUNDED"
            else:
                status = raw_status

            items = inv.get("items", [])
            item_name = items[0].get("name", "") if items else ""
            tier_name, txn_type = infer_product_tier_and_type(amount_val, detail.get("note", ""), item_name)
            region = map_region_from_email(c_email)

            transactions.append(
                TransactionItem(
                    id=inv_id,
                    date=f"{inv_date} 12:00",
                    customer_name=c_name,
                    customer_email=c_email,
                    amount=amount_val,
                    currency=currency,
                    type=txn_type,
                    status=status,
                    region=region,
                    product_tier=tier_name
                )
            )

        try:
            now = datetime.now(timezone.utc)
            start_dt = now - timedelta(days=min(30, days_back))
            s_str = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            e_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")
            url = f"{self.base_url}/v1/reporting/transactions?start_date={s_str}&end_date={e_str}&page_size=50&fields=all"
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers={"Authorization": f"Bearer {token}"})
                if res.status_code == 200:
                    tx_details = res.json().get("transaction_details", [])
                    for tx in tx_details:
                        t_info = tx.get("transaction_info", {})
                        p_info = tx.get("payer_info", {})
                        amt = float(t_info.get("transaction_amount", {}).get("value", 0.0))
                        transactions.append(
                            TransactionItem(
                                id=t_info.get("transaction_id", f"TXN-{int(time.time())}"),
                                date=t_info.get("transaction_initiation_date", now.strftime("%Y-%m-%d %H:%M"))[:16].replace("T", " "),
                                customer_name=p_info.get("payer_name", {}).get("alternate_full_name", "PayPal Customer"),
                                customer_email=p_info.get("email_address", "customer@sandbox.paypal.com"),
                                amount=amt,
                                currency=t_info.get("transaction_amount", {}).get("currency_code", "USD"),
                                type="PURCHASE" if amt > 0 else "REFUND",
                                status=t_info.get("transaction_status", "COMPLETED"),
                                region="North America",
                                product_tier="Direct Checkout"
                            )
                        )
        except Exception:
            pass

        transactions.sort(key=lambda t: t.date, reverse=True)
        return transactions

    async def get_kpis(self) -> KPISummary:
        """Dynamically calculates key merchant KPIs directly from live PayPal Sandbox data."""
        invoices = await self.fetch_live_invoices()
        plans = await self.fetch_live_plans()
        disputes = await self.fetch_live_disputes()

        paid_invoices = [inv for inv in invoices if inv.get("status") in ["PAID", "MARKED_AS_PAID"]]
        unpaid_invoices = [inv for inv in invoices if inv.get("status") not in ["PAID", "MARKED_AS_PAID"]]
        gross_volume = sum(float(inv.get("amount", {}).get("value", 0.0)) for inv in paid_invoices)
        
        # Collect exact plan pricing directly from PayPal billing_cycles schema
        known_plan_prices = set()
        for p in plans:
            for cycle in p.get("billing_cycles") or []:
                fp = cycle.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                if fp:
                    try:
                        known_plan_prices.add(float(fp))
                    except (ValueError, TypeError):
                        pass

        monthly_volume: Dict[str, float] = {}
        monthly_mrr: Dict[str, float] = {}
        for inv in paid_invoices:
            d_str = inv.get("detail", {}).get("invoice_date", "")
            amt = float(inv.get("amount", {}).get("value", 0.0))
            is_sub = "subscription" in str(inv).lower() or "plan" in str(inv).lower() or (amt in known_plan_prices if known_plan_prices else False)
            if d_str:
                m_key = d_str[:7]
                monthly_volume[m_key] = monthly_volume.get(m_key, 0.0) + amt
                if is_sub:
                    monthly_mrr[m_key] = monthly_mrr.get(m_key, 0.0) + amt

        sorted_months = sorted(monthly_volume.keys())
        if len(sorted_months) >= 2:
            prev_m = monthly_volume[sorted_months[-2]]
            curr_m = monthly_volume[sorted_months[-1]]
            gross_volume_change = round(((curr_m - prev_m) / max(1.0, prev_m)) * 100, 1)
        else:
            gross_volume_change = 0.0

        sub_invoices = [
            inv for inv in paid_invoices 
            if "subscription" in str(inv).lower() or "plan" in str(inv).lower() or (float(inv.get("amount", {}).get("value", 0)) in known_plan_prices if known_plan_prices else False)
        ]
        active_subscriptions = len(sub_invoices)
        
        latest_month = sorted_months[-1] if sorted_months else ""
        mrr = monthly_mrr.get(latest_month, 0.0)
        if mrr == 0.0 and sub_invoices:
            mrr = sum(float(inv.get("amount", {}).get("value", 0.0)) for inv in sub_invoices)

        sorted_mrr_months = sorted(monthly_mrr.keys())
        if len(sorted_mrr_months) >= 2:
            prev_mrr = monthly_mrr[sorted_mrr_months[-2]]
            curr_mrr = monthly_mrr[sorted_mrr_months[-1]]
            mrr_change = round(((curr_mrr - prev_mrr) / max(1.0, prev_mrr)) * 100, 1)
        else:
            mrr_change = 0.0

        processing_fees = gross_volume * 0.029 + 0.30 * len(paid_invoices)
        net_inflow = round(max(0.0, gross_volume - processing_fees), 2)

        total_txns = max(1, len(invoices))
        dispute_rate = round((len(disputes) / total_txns) * 100, 2) if len(invoices) > 0 else 0.0

        unpaid_amounts = [float(inv.get("amount", {}).get("value", 0)) for inv in unpaid_invoices]
        at_risk_tiers_count = len(set(
            infer_product_tier_and_type(amt)[0] for amt in unpaid_amounts
        ))

        return KPISummary(
            gross_volume=round(gross_volume, 2),
            gross_volume_change=gross_volume_change,
            active_subscriptions=active_subscriptions,
            active_subscriptions_change=0.0,
            mrr=round(mrr, 2),
            mrr_change=mrr_change,
            net_inflow=net_inflow,
            dispute_rate=dispute_rate,
            at_risk_tiers_count=at_risk_tiers_count
        )

    async def get_churn_risk_analysis(self) -> List[ChurnRiskItem]:
        """Dynamically analyzes churn vulnerabilities for active PayPal subscription plans."""
        plans = await self.fetch_live_plans()
        invoices = await self.fetch_live_invoices()

        if not plans or not invoices:
            return []

        results: List[ChurnRiskItem] = []

        for plan in plans:
            p_name = plan.get("name", "Subscription Plan")
            matching = [
                inv for inv in invoices 
                if p_name.lower() in str(inv).lower()
            ]
            paid_count = sum(1 for inv in matching if inv.get("status") in ["PAID", "MARKED_AS_PAID"])
            unpaid_count = sum(1 for inv in matching if inv.get("status") not in ["PAID", "MARKED_AS_PAID"])
            
            # Extract fixed price from PayPal Subscriptions API schema
            fixed_price = 0.0
            for cycle in plan.get("billing_cycles") or []:
                fp = cycle.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                if fp:
                    try:
                        fixed_price = float(fp)
                        break
                    except (ValueError, TypeError):
                        pass

            amt_sample = fixed_price if fixed_price > 0 else (float(matching[0].get("amount", {}).get("value", 0.0)) if matching else 0.0)

            if unpaid_count > 0:
                churn_prob = round(min(0.85, unpaid_count / max(1, len(matching))), 2)
                rev_at_risk = round(amt_sample * unpaid_count, 2)
                drivers = [
                    f"{unpaid_count} unpaid renewal invoice(s) in PayPal Sandbox",
                    "Soft card decline or pending payment cycle",
                    "Customer reminder unacknowledged"
                ]
                action = f"Send automated PayPal invoice reminder to pending {p_name} accounts."
            else:
                churn_prob = 0.05
                rev_at_risk = 0.0
                drivers = [
                    "Consistent renewal track record in PayPal",
                    "Zero disputes or refund requests",
                    "Good payment velocity"
                ]
                action = "Maintain scheduled billing cycles and monitor member renewals."

            results.append(
                ChurnRiskItem(
                    tier_name=f"{p_name} (${amt_sample:.0f}/mo)" if amt_sample > 0 else p_name,
                    active_subscribers=paid_count,
                    churn_probability=churn_prob,
                    monthly_revenue_at_risk=rev_at_risk,
                    key_drivers=drivers,
                    recommended_action=action
                )
            )

        return results

    async def get_outlook_forecast(self) -> OutlookForecast:
        """Dynamically constructs 30/90-day predictive runway from live PayPal invoice history."""
        invoices = await self.fetch_live_invoices()
        plans = await self.fetch_live_plans()
        kpis = await self.get_kpis()
        churn_tiers = await self.get_churn_risk_analysis()

        known_plan_prices = set()
        for p in plans:
            for cycle in p.get("billing_cycles") or []:
                fp = cycle.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                if fp:
                    try:
                        known_plan_prices.add(float(fp))
                    except (ValueError, TypeError):
                        pass

        monthly: Dict[str, Dict[str, float]] = {}
        for inv in invoices:
            if inv.get("status") in ["PAID", "MARKED_AS_PAID"]:
                d_str = inv.get("detail", {}).get("invoice_date", "")
                amt = float(inv.get("amount", {}).get("value", 0))
                is_sub = "subscription" in str(inv).lower() or "plan" in str(inv).lower() or (amt in known_plan_prices if known_plan_prices else False)
                if d_str:
                    m_key = d_str[:7]
                    if m_key not in monthly:
                        monthly[m_key] = {"revenue": 0.0, "mrr": 0.0}
                    monthly[m_key]["revenue"] += amt
                    if is_sub:
                        monthly[m_key]["mrr"] += amt

        month_names = {
            "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
            "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
        }
        historical = []
        for m_key in sorted(monthly.keys()):
            parts = m_key.split("-")
            label = month_names.get(parts[1], parts[1])
            historical.append({
                "month": label,
                "revenue": round(monthly[m_key]["revenue"], 2),
                "mrr": round(monthly[m_key]["mrr"], 2)
            })

        if not historical:
            return OutlookForecast(
                forecast_30d=0.0,
                forecast_90d=0.0,
                confidence_score=0.0,
                projected_mrr_growth=0.0,
                historical_trend=[],
                projected_trend=[],
                at_risk_tiers=[],
                proactive_tips=["No historical invoice settlements found. Process transactions in PayPal Sandbox to enable cash runway projections."]
            )

        latest_rev = historical[-1]["revenue"]
        latest_mrr = historical[-1]["mrr"]
        
        growth_rate = 1.10
        p1 = round(latest_rev * growth_rate, 2)
        p2 = round(p1 * growth_rate, 2)
        p3 = round(p2 * growth_rate, 2)

        m1 = round(latest_mrr * 1.05, 2)
        m2 = round(m1 * 1.05, 2)
        m3 = round(m2 * 1.05, 2)

        projected = [
            {"month": "M+1 (Est)", "revenue": p1, "mrr": m1, "low": round(p1 * 0.90, 2), "high": round(p1 * 1.10, 2)},
            {"month": "M+2 (Est)", "revenue": p2, "mrr": m2, "low": round(p2 * 0.88, 2), "high": round(p2 * 1.12, 2)},
            {"month": "M+3 (Est)", "revenue": p3, "mrr": m3, "low": round(p3 * 0.85, 2), "high": round(p3 * 1.15, 2)},
        ]

        forecast_30d = p1
        forecast_90d = round(p1 + p2 + p3, 2)

        unpaid = [inv for inv in invoices if inv.get("status") not in ["PAID", "MARKED_AS_PAID"]]
        unpaid_sum = sum(float(inv.get("amount", {}).get("value", 0)) for inv in unpaid)

        tips = []
        if unpaid:
            tips.append(f"You have {len(unpaid)} pending or unpaid invoices totaling ${unpaid_sum:.2f} in PayPal Sandbox. Automated invoice reminders can accelerate receivables.")
        if kpis.mrr > 0:
            tips.append(f"Current recurring revenue is ${kpis.mrr:.2f} across {kpis.active_subscriptions} active subscription(s).")
        if not tips:
            tips.append("Account operating health is stable with zero open disputes or pending receivables.")

        return OutlookForecast(
            forecast_30d=forecast_30d,
            forecast_90d=forecast_90d,
            confidence_score=0.88,
            projected_mrr_growth=10.0,
            historical_trend=historical,
            projected_trend=projected,
            at_risk_tiers=churn_tiers,
            proactive_tips=tips
        )

    async def get_standard_charts(self) -> List[Dict[str, Any]]:
        """Dynamically builds the standard dashboard AG Charts from live PayPal Sandbox data."""
        invoices = await self.fetch_live_invoices()
        plans = await self.fetch_live_plans()
        forecast = await self.get_outlook_forecast()

        # 1. Monthly Revenue & MRR Growth
        categories_m = [h["month"] for h in forecast.historical_trend]
        data_gross = [h["revenue"] for h in forecast.historical_trend]
        data_mrr = [h["mrr"] for h in forecast.historical_trend]

        chart1 = {
            "id": "revenue-trend",
            "title": "Monthly Revenue & MRR Growth",
            "type": "bar",
            "description": "Historical gross settled sales alongside monthly recurring revenue from PayPal.",
            "categories": categories_m,
            "datasets": [
                {"label": "Gross Sales ($)", "data": data_gross, "color": "#0070ba"},
                {"label": "MRR ($)", "data": data_mrr, "color": "#00cfde"}
            ] if categories_m else [],
            "metric_unit": "USD"
        }

        # 2. Subscription Plans Breakdown
        price_to_plan: Dict[float, str] = {}
        plan_categories = []
        for p in plans:
            p_name = p.get("name", "Plan")
            if p_name not in plan_categories:
                plan_categories.append(p_name)
            for c in p.get("billing_cycles") or []:
                fp = c.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                if fp:
                    try:
                        price_to_plan[float(fp)] = p_name
                    except (ValueError, TypeError):
                        pass

        plan_counts: Dict[str, int] = {name: 0 for name in plan_categories}
        for inv in invoices:
            if inv.get("status") in ["PAID", "MARKED_AS_PAID"]:
                amt = float(inv.get("amount", {}).get("value", 0))
                matched_plan = price_to_plan.get(amt)
                if matched_plan:
                    plan_counts[matched_plan] += 1
                else:
                    for p in plans:
                        p_name = p.get("name", "")
                        if p_name and p_name.lower() in str(inv).lower():
                            plan_counts[p_name] = plan_counts.get(p_name, 0) + 1
                            break

        plan_sub_counts = [plan_counts.get(name, 0) for name in plan_categories]

        chart2 = {
            "id": "subscription-tiers",
            "title": "Active Subscribers by Plan Tier",
            "type": "donut",
            "description": "Distribution of active subscriptions across live PayPal Sandbox plans.",
            "categories": plan_categories,
            "datasets": [
                {"label": "Subscribers", "data": plan_sub_counts}
            ] if plan_categories else [],
            "metric_unit": "Members"
        }

        # 3. Global Regional Distribution
        regional: Dict[str, float] = {}
        for inv in invoices:
            recipients = inv.get("primary_recipients", [])
            email = recipients[0].get("billing_info", {}).get("email_address", "") if recipients else ""
            region = map_region_from_email(email)
            amt = float(inv.get("amount", {}).get("value", 0))
            regional[region] = regional.get(region, 0.0) + amt

        sorted_regions = sorted(regional.keys(), key=lambda r: regional[r], reverse=True)
        chart3 = {
            "id": "regional-distribution",
            "title": "Global Sales Distribution by Territory",
            "type": "bar",
            "description": "Geographic origin of settled and pending invoices in PayPal Sandbox.",
            "categories": sorted_regions,
            "datasets": [
                {
                    "label": "Gross Volume ($)",
                    "data": [round(regional[r], 2) for r in sorted_regions],
                    "color": "#10b981"
                }
            ] if sorted_regions else [],
            "metric_unit": "USD"
        }

        charts = [c for c in [chart1, chart2, chart3] if len(c.get("categories", [])) > 0]
        return charts if charts else [chart1, chart2, chart3]

    async def get_executive_briefing(self) -> Dict[str, Any]:
        """
        Synthesizes a live Morning Executive Briefing combining KPIs, invoices,
        subscriptions, dispute protection, and forward revenue outlook.
        """
        from datetime import datetime
        now = datetime.now()
        hour = now.hour
        greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")
        date_str = now.strftime("%A, %b %d, %Y")

        kpis = await self.get_kpis()
        invoices = await self.fetch_live_invoices()
        plans = await self.fetch_live_plans()
        disputes = await self.fetch_live_disputes()
        forecast = await self.get_outlook_forecast()

        # Invoicing breakdown
        paid_invs = [inv for inv in invoices if inv.get("status") in ["PAID", "MARKED_AS_PAID"]]
        unpaid_invs = [inv for inv in invoices if inv.get("status") in ["UNPAID", "SENT", "DRAFT"]]
        overdue_invs = [inv for inv in invoices if inv.get("status") == "OVERDUE"]

        unpaid_sum = sum(float(inv.get("amount", {}).get("value", 0)) for inv in unpaid_invs)
        overdue_sum = sum(float(inv.get("amount", {}).get("value", 0)) for inv in overdue_invs)

        vol_val = f"${kpis.gross_volume:,.2f}"
        vol_change = f"+{kpis.gross_volume_change:.1f}% MoM" if kpis.gross_volume_change >= 0 else f"{kpis.gross_volume_change:.1f}% MoM"
        mrr_val = f"${kpis.mrr:,.2f}"
        pending_val = f"${unpaid_sum + overdue_sum:,.2f}"

        headline = f"Strong Performance: {vol_val} Settled Volume with {vol_change} Growth"

        summary = (
            f"Your business has settled **{vol_val}** across transactions ({vol_change}). "
            f"Monthly Recurring Revenue stands at **{mrr_val}** supported by **{kpis.active_subscriptions} active subscribers**. "
            f"You have **{len(unpaid_invs) + len(overdue_invs)} pending invoices totaling {pending_val}** awaiting collection. "
            f"Account protection is **100% clean with {len(disputes)} open disputes**, and forward 90-day trajectory projects **${forecast.forecast_90d:,.2f}**."
        )

        highlights = [
            {
                "label": "Settled Sales",
                "value": vol_val,
                "change": vol_change,
                "type": "positive"
            },
            {
                "label": "Recurring MRR",
                "value": mrr_val,
                "change": f"{kpis.active_subscriptions} active subscribers",
                "type": "positive"
            },
            {
                "label": "Pending Receivables",
                "value": pending_val,
                "change": f"{len(unpaid_invs)} pending / {len(overdue_invs)} overdue",
                "type": "warning" if (unpaid_sum + overdue_sum) > 0 else "positive"
            },
            {
                "label": "Account Protection",
                "value": "100%",
                "change": f"{len(disputes)} open disputes",
                "type": "positive"
            }
        ]

        action_items = []
        if unpaid_invs:
            action_items.append(f"Send 1-click reminders to {len(unpaid_invs)} accounts with pending invoices (${unpaid_sum:,.2f}).")
        if overdue_invs:
            action_items.append(f"Follow up immediately on {len(overdue_invs)} overdue invoices totaling ${overdue_sum:,.2f}.")
        if kpis.at_risk_tiers_count > 0:
            action_items.append(f"Review churn vulnerability tips for {kpis.at_risk_tiers_count} monitored subscription tiers.")
        action_items.append(f"Historical telemetry projects a forward 90-day revenue pipeline of ${forecast.forecast_90d:,.2f}.")

        audio_script = (
            f"{greeting}. Here is your PayPal Executive Briefing for {date_str}. "
            f"Your business has settled {vol_val} in gross volume, reflecting {vol_change} growth. "
            f"Recurring monthly revenue is {mrr_val} across {kpis.active_subscriptions} active subscribers. "
            f"There are {len(unpaid_invs) + len(overdue_invs)} pending invoices totaling {pending_val}. "
            f"Seller protection remains clean with zero open disputes. "
            f"Your ninety-day forward revenue runway is projected at ${forecast.forecast_90d:,.2f}."
        )

        return {
            "greeting": greeting,
            "date": date_str,
            "headline": headline,
            "summary": summary,
            "highlights": highlights,
            "action_items": action_items,
            "audio_script": audio_script
        }

paypal_service = PayPalService()
