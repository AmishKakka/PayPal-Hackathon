import os
import json
import re
import time
import operator
from typing import Dict, Any, List, Optional, TypedDict, Annotated
from dotenv import load_dotenv

# LangGraph and LangChain imports
from langgraph.types import Send
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage

# Jev TypeSafeClassifier import
from langchain_typesafe import Noul, TypeSafeClassifier

from app.services.paypal_service import paypal_service
from app.models.schemas import ChatResponse, ChartConfig, FollowUpAction

load_dotenv(".env")

class WarrenState(TypedDict):
    query: str
    session_id: str
    agentsProb: Dict[str, float]
    agentsNeeded: List[str]
    completedSections: Annotated[List[Dict[str, Any]], operator.add]
    finalReport: str
    chart: Optional[Dict[str, Any]]
    followUps: List[Dict[str, Any]]
    agentTrace: List[str]

class WarrenOrchestrator:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or ""
        self.jev_key = os.getenv("JEV_API_KEY") or ""
        
        # Initialize Jev Supervisor classifier if key available
        self.supervisor = None
        if self.jev_key:
            try:
                self.supervisor = TypeSafeClassifier(api_key=self.jev_key)
                print("[WarrenOrchestrator] Jev TypeSafeClassifier initialized successfully.")
            except Exception as e:
                print(f"[WarrenOrchestrator] Error initializing Jev: {e}")

        # Initialize Gemini LLM for final synthesis
        self.llm = None
        if self.gemini_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=self.gemini_key)
                print("[WarrenOrchestrator] Gemini LLM (gemini-2.5-flash) initialized successfully.")
            except Exception as e:
                print(f"[WarrenOrchestrator] Error initializing Gemini LLM: {e}")

        # Build and compile LangGraph
        self.graph = self._build_graph()

    def Supervisor(self, state: WarrenState) -> Dict[str, Any]:
        """
        Supervisor Node: Routes user queries to specialized agents using Jev TypeSafeClassifier.
        """
        agent_map = {
            "need_transactions": "TransactionDataAgent",
            "need_subscriptions": "SubscriptionChurnAgent",
            "need_forecast": "OutlookForecastAgent",
            "need_invoices": "InvoiceCashflowAgent",
            "need_disputes": "DisputeRiskAgent"
        }

        # 1. Use Jev TypeSafeClassifier if API key is active
        if self.supervisor:
            try:
                resp = self.supervisor.invoke({
                    "state": f"""
                        User Query: {state['query']}
                        Available specialized PayPal merchant agents:
                        - TransactionDataAgent: PayPal transaction volumes, gross sales, checkout revenue, customer geographic region breakdown.
                        - SubscriptionChurnAgent: Active subscription plans, recurring billing (MRR), subscriber retention, at-risk plan tiers, soft card declines.
                        - OutlookForecastAgent: Predictive future runway, 30-day and 90-day cash flow projections, demand forecasting.
                        - InvoiceCashflowAgent: Outstanding PayPal invoices, overdue payments, payment collection reminders, dunning.
                        - DisputeRiskAgent: Customer disputes, chargebacks, claim resolutions, seller trust protection health.
                    """,
                    "questions": {
                        "need_transactions": Noul(
                            instructions="Does this query require analysis of PayPal transactions, sales volume, checkout revenue, or regional geographic distribution?",
                            criteria={
                                "true": "The query asks about sales volume, transaction ledger, gross inflow, or regional breakdown.",
                                "false": "The query is exclusively about future forecasts, subscription churn, disputes, or invoices."
                            }
                        ),
                        "need_subscriptions": Noul(
                            instructions="Does this query require subscription analytics, recurring revenue (MRR), subscriber tiers, or churn risk evaluation?",
                            criteria={
                                "true": "The query asks about subscriptions, MRR, churn risk, subscriber drop-off, or plan tiers.",
                                "false": "The query does not need subscription or churn data."
                            }
                        ),
                        "need_forecast": Noul(
                            instructions="Does this query require future outlook, 30/90-day cash flow projections, forward runway, or predictive growth models?",
                            criteria={
                                "true": "The query asks about forward projections, future outlook, expected revenue next month or quarter.",
                                "false": "The query is only about past historical data or current status."
                            }
                        ),
                        "need_invoices": Noul(
                            instructions="Does this query require invoice status, overdue customer payments, unpaid billing, or payment collection reminders?",
                            criteria={
                                "true": "The query asks about invoices, overdue accounts, pending receivables, or dunning.",
                                "false": "The query does not ask about invoicing."
                            }
                        ),
                        "need_disputes": Noul(
                            instructions="Does this query require analysis of customer disputes, chargebacks, claims, refund conflicts, or seller protection?",
                            criteria={
                                "true": "The query asks about disputes, chargebacks, fraud claims, or seller trust status.",
                                "false": "The query does not ask about disputes."
                            }
                        )
                    }
                })

                agents_prob = {name: noulResponse.noul for name, noulResponse in resp.nouls.items()}
                agents_needed = [agent_map[name] for name, prob in agents_prob.items() if prob >= 0.50]
                if not agents_needed:
                    best_name = max(agents_prob, key=agents_prob.get)
                    agents_needed = [agent_map[best_name]]

                return {
                    "agentsProb": agents_prob,
                    "agentsNeeded": agents_needed,
                    "agentTrace": [f"Jev Router: Activated {', '.join(agents_needed)}"]
                }
            except Exception as e:
                print(f"[WarrenOrchestrator] Jev invocation error, falling back to rule-based: {e}")

        # 2. Resilient semantic fallback matching Jev schema
        q = state["query"].lower()
        is_sub = any(w in q for w in ["subscription", "mrr", "churn", "recurring", "tier", "plan", "cancel", "retention"])
        is_region = any(w in q for w in ["region", "country", "territory", "where", "geographic", "sales", "volume", "transactions", "ledger", "customer", "who"])
        is_forecast = any(w in q for w in ["forecast", "future", "outlook", "next month", "30 days", "90 days", "project", "runway"])
        is_invoice = any(w in q for w in ["invoice", "overdue", "unpaid", "billing", "dunning", "collect", "receivable"])
        is_dispute = any(w in q for w in ["dispute", "chargeback", "claim", "fraud", "buyer conflict", "protection"])

        agents_prob = {
            "need_transactions": 0.88 if is_region else 0.25,
            "need_subscriptions": 0.94 if is_sub else 0.20,
            "need_forecast": 0.91 if is_forecast else 0.15,
            "need_invoices": 0.85 if is_invoice else 0.10,
            "need_disputes": 0.90 if is_dispute else 0.10,
        }

        agents_needed = []
        if is_sub:
            agents_needed.append("SubscriptionChurnAgent")
        if is_region or (not is_sub and not is_forecast and not is_invoice and not is_dispute):
            agents_needed.append("TransactionDataAgent")
        if is_forecast:
            agents_needed.append("OutlookForecastAgent")
        if is_invoice:
            agents_needed.append("InvoiceCashflowAgent")
        if is_dispute:
            agents_needed.append("DisputeRiskAgent")

        if not agents_needed:
            agents_needed = ["TransactionDataAgent"]

        return {
            "agentsProb": agents_prob,
            "agentsNeeded": agents_needed,
            "agentTrace": [f"Jev Router (TypeSafe): Activated {', '.join(agents_needed)}"]
        }

    def assignAgents(self, state: WarrenState):
        """Dispatches parallel execution to all agents selected by Jev Supervisor."""
        return [Send(agent_name, state) for agent_name in state["agentsNeeded"]]

    async def TransactionDataAgent(self, state: WarrenState) -> Dict[str, Any]:
        """Collects live transactions and regional sales data dynamically from PayPal."""
        kpis = await paypal_service.get_kpis()
        txns = await paypal_service.fetch_live_transactions()

        # Regional breakdown from live PayPal ledger
        regions: Dict[str, float] = {}
        for t in txns:
            if t.status == "COMPLETED":
                regions[t.region] = regions.get(t.region, 0.0) + t.amount

        tot_vol = max(1.0, kpis.gross_volume)
        region_lines = [
            f"- **{r}**: ${amt:.2f} ({amt / tot_vol * 100:.1f}%)"
            for r, amt in sorted(regions.items(), key=lambda x: x[1], reverse=True)
        ]
        region_str = "\n".join(region_lines) if region_lines else "- No completed regional transactions recorded yet"

        # Specific matches for customer names/terms in query
        query_terms = [w.lower() for w in state["query"].split() if len(w) > 2]
        matched_txns = []
        for t in txns:
            if any(term in t.customer_name.lower() or term in t.customer_email.lower() or term in t.id.lower() or term in t.product_tier.lower() for term in query_terms):
                matched_txns.append(f"  • {t.date}: {t.customer_name} ({t.customer_email}) paid ${t.amount:.2f} for {t.product_tier} [{t.status}]")

        match_str = ""
        if matched_txns:
            match_str = f"\nSpecific Matching Transactions in PayPal:\n" + "\n".join(matched_txns[:5])

        raw_evidence = (
            f"Live PayPal Settlement & Sales Metrics:\n"
            f"- Gross Settled Volume: **${kpis.gross_volume:.2f}** ({kpis.gross_volume_change:+.1f}% MoM growth)\n"
            f"- Total Transactions: {len(txns)} transactions across {len(regions)} global territories\n"
            f"- Net Inflow: **${kpis.net_inflow:.2f}** after standard processing fees\n"
            f"Geographic Regional Sales Breakdown (live from PayPal):\n"
            f"{region_str}{match_str}"
        )
        return {
            "completedSections": [{
                "agent": "TransactionDataAgent",
                "probability": state["agentsProb"].get("need_transactions", 0.85),
                "raw": raw_evidence,
                "data": {"regions": regions, "gross_volume": kpis.gross_volume}
            }]
        }

    async def SubscriptionChurnAgent(self, state: WarrenState) -> Dict[str, Any]:
        """Pulls active subscription plans, MRR contributions, and churn risks dynamically from PayPal."""
        kpis = await paypal_service.get_kpis()
        plans = await paypal_service.fetch_live_plans()
        churn_items = await paypal_service.get_churn_risk_analysis()

        if not plans:
            raw_evidence = (
                "PayPal Subscription Status (live from /v1/billing/plans):\n"
                "- Active Subscription Plans: 0 plans registered in PayPal Sandbox.\n"
                "- Active Subscriptions: 0 paying members.\n"
                "- Current MRR: $0.00.\n"
                "- Churn Risk: No subscription risk detected (no plans active)."
            )
        else:
            plan_names = ", ".join(p.get("name", "Plan") for p in plans)
            churn_text = "\n".join([
                f"- **{item.tier_name}**: {item.active_subscribers} active subscriber(s), "
                f"**{int(item.churn_probability * 100)}% churn risk** (${item.monthly_revenue_at_risk:.2f} MRR exposed). "
                f"Risk driver: {item.key_drivers[0]}. Recommended action: {item.recommended_action}"
                for item in churn_items
            ]) if churn_items else "- All subscription plans are healthy with zero renewal friction."
            raw_evidence = (
                f"Live PayPal Subscription Analytics:\n"
                f"- Active Plans: {len(plans)} plans registered in Sandbox ({plan_names})\n"
                f"- Active Subscriptions: {kpis.active_subscriptions} paying member(s) generating **${kpis.mrr:.2f} MRR**\n"
                f"Plan Tier Retention & Churn Analysis:\n{churn_text}"
            )

        return {
            "completedSections": [{
                "agent": "SubscriptionChurnAgent",
                "probability": state["agentsProb"].get("need_subscriptions", 0.90),
                "raw": raw_evidence,
                "data": {"mrr": kpis.mrr, "plans_count": len(plans)}
            }]
        }

    async def OutlookForecastAgent(self, state: WarrenState) -> Dict[str, Any]:
        """Calculates 30/90-day cash flow projections and forward trajectory dynamically from PayPal run-rate."""
        forecast = await paypal_service.get_outlook_forecast()
        if not forecast.historical_trend:
            raw_evidence = (
                "Predictive Cash Flow Runway:\n"
                "- Status: No historical settled invoices available in PayPal Sandbox yet to compute future runway.\n"
                "- Action: Once transactions are processed, 30-day and 90-day trajectory models will automatically calculate."
            )
        else:
            proj_lines = "\n".join([
                f"- **{p['month']}**: Projected gross volume of **${p['revenue']:.2f}** (MRR: ${p['mrr']:.2f}, range: ${p['low']:.2f} - ${p['high']:.2f})"
                for p in forecast.projected_trend
            ])
            raw_evidence = (
                f"Predictive Cash Flow Runway (computed dynamically from live PayPal run-rate):\n"
                f"- Next 30 Days Forecast: **${forecast.forecast_30d:.2f}**\n"
                f"- Next 90 Days Cumulative Forecast: **${forecast.forecast_90d:.2f}**\n"
                f"- Model Confidence Score: {int(forecast.confidence_score * 100)}%\n"
                f"- Projected Trend:\n{proj_lines}\n"
                f"- Proactive Advice: {forecast.proactive_tips[0] if forecast.proactive_tips else 'Account in good standing.'}"
            )

        return {
            "completedSections": [{
                "agent": "OutlookForecastAgent",
                "probability": state["agentsProb"].get("need_forecast", 0.88),
                "raw": raw_evidence,
                "data": {"forecast_30d": forecast.forecast_30d, "forecast_90d": forecast.forecast_90d}
            }]
        }

    async def InvoiceCashflowAgent(self, state: WarrenState) -> Dict[str, Any]:
        """Inspects live unpaid, paid, and overdue PayPal invoices dynamically."""
        invoices = await paypal_service.fetch_live_invoices()
        paid = [inv for inv in invoices if inv.get("status") in ["PAID", "MARKED_AS_PAID"]]
        unpaid = [inv for inv in invoices if inv.get("status") in ["UNPAID", "SENT", "DRAFT"]]
        overdue = [inv for inv in invoices if inv.get("status") == "OVERDUE"]

        paid_sum = sum(float(inv.get("amount", {}).get("value", 0)) for inv in paid)
        unpaid_sum = sum(float(inv.get("amount", {}).get("value", 0)) for inv in unpaid)
        overdue_sum = sum(float(inv.get("amount", {}).get("value", 0)) for inv in overdue)

        pending_details = []
        for inv in (overdue + unpaid)[:6]:
            recips = inv.get("primary_recipients", [])
            c_name = recips[0].get("billing_info", {}).get("name", {}).get("full_name", "Customer") if recips else "Customer"
            amt = float(inv.get("amount", {}).get("value", 0))
            pending_details.append(f"  • {c_name}: ${amt:.2f} ({inv.get('status')}, ID: {inv.get('id')})")
        pending_str = "\n".join(pending_details) if pending_details else "  • No pending or overdue invoices recorded in PayPal."

        raw_evidence = (
            f"Live PayPal Invoicing Status:\n"
            f"- Paid Invoices: {len(paid)} settled invoices totaling **${paid_sum:.2f}**\n"
            f"- Pending Invoices: {len(unpaid)} invoices totaling **${unpaid_sum:.2f}**\n"
            f"- Overdue Invoices: {len(overdue)} invoices totaling **${overdue_sum:.2f}**\n"
            f"Outstanding Accounts:\n{pending_str}"
        )
        return {
            "completedSections": [{
                "agent": "InvoiceCashflowAgent",
                "probability": state["agentsProb"].get("need_invoices", 0.80),
                "raw": raw_evidence,
                "data": {"paid_sum": paid_sum, "unpaid_sum": unpaid_sum, "overdue_sum": overdue_sum}
            }]
        }

    async def DisputeRiskAgent(self, state: WarrenState) -> Dict[str, Any]:
        """Analyzes live customer disputes, chargeback claims, and PayPal seller protection dynamically."""
        disputes = await paypal_service.fetch_live_disputes()
        txns = await paypal_service.fetch_live_transactions()

        if not disputes:
            raw_evidence = (
                "PayPal Customer Disputes Status (from live /v1/customer/disputes):\n"
                "- Active Disputes: 0 open claims.\n"
                f"- Dispute Rate: 0.00% across {len(txns)} transactions (Safely below PayPal's 0.5% threshold).\n"
                "- Account Health: Clean rating, zero chargeback exposure, funds clear without holds."
            )
        else:
            disp_lines = []
            for d in disputes:
                d_id = d.get("dispute_id", "DISP-1")
                reason = d.get("reason", "UNSPECIFIED")
                amt = d.get("dispute_amount", {}).get("value", 0)
                status = d.get("status", "UNDER_REVIEW")
                disp_lines.append(f"  • Dispute {d_id}: ${amt} ({reason}, Status: {status})")
            raw_evidence = (
                f"PayPal Customer Disputes Status (from live /v1/customer/disputes):\n"
                f"- Open Disputes: {len(disputes)} active dispute case(s)\n"
                f"Dispute Case Breakdown:\n" + "\n".join(disp_lines) + "\n"
                f"- Action Required: Submit shipping or service documentation to PayPal Resolution Center before the due date."
            )
        return {
            "completedSections": [{
                "agent": "DisputeRiskAgent",
                "probability": state["agentsProb"].get("need_disputes", 0.85),
                "raw": raw_evidence,
                "data": {"disputes_count": len(disputes)}
            }]
        }

    async def Controller(self, state: WarrenState) -> Dict[str, Any]:
        """
        Controller Node:
        Synthesizes findings from all agents into a structured Markdown report and dynamic AG Chart.
        """
        sections = sorted(
            state["completedSections"],
            key=lambda s: s.get("probability", 0),
            reverse=True
        )

        evidence = "\n\n".join(
            f"### {s['agent']}\n{s['raw']}" for s in sections
        )
 
        # 1. Retrieveing  merchant business profile
        profile = paypal_service.get_profile()
        primary_signal = profile.get("primary_signal", "payouts")
        profile_context = (
            f"CONFIRMED MERCHANT PROFILE & OPERATING CONTEXT:\n"
            f"- Primary Revenue Driver: {primary_signal.upper()}\n"
            f"- Has Active Subscriptions: {profile.get('has_subscriptions', False)}\n"
            f"- Has Invoices: {profile.get('has_invoices', False)}\n"
            f"- Has Customer Disputes: {profile.get('has_disputes', False)}\n"
            f"- Has Payouts & Global Transactions: {profile.get('has_payouts', False)}\n\n"
        )

        # 2. Determine dynamic AG Chart strictly from live data
        chart = None
        activated = state["agentsNeeded"]
        charts_list = await paypal_service.get_standard_charts()
        
        if "DisputeRiskAgent" in activated:
            disputes = await paypal_service.fetch_live_disputes()
            txns = await paypal_service.fetch_live_transactions()
            disp_cnt = len(disputes)
            safe_cnt = max(0, len(txns) - disp_cnt)
            if safe_cnt > 0 or disp_cnt > 0:
                chart = {
                    "id": "dispute-trust-chart",
                    "title": "Dispute Incidence & Account Protection Health",
                    "type": "donut",
                    "description": "PayPal Seller Protection ratio comparing safe vs disputed transactions.",
                    "categories": [f"Safe Transactions ({safe_cnt})", f"Open Disputes ({disp_cnt})"],
                    "datasets": [
                        {"label": "Transactions", "data": [safe_cnt, disp_cnt]}
                    ],
                    "metric_unit": "Transactions"
                }
        elif "SubscriptionChurnAgent" in activated and "TransactionDataAgent" in activated:
            if len(charts_list) > 2 and charts_list[2].get("categories"):
                chart = charts_list[2] # Regional distribution
            elif len(charts_list) > 1 and charts_list[1].get("categories"):
                chart = charts_list[1] # Subscription plans
        elif "SubscriptionChurnAgent" in activated:
            if len(charts_list) > 1 and charts_list[1].get("categories"):
                chart = charts_list[1] # Subscription plans
        elif "OutlookForecastAgent" in activated:
            forecast = await paypal_service.get_outlook_forecast()
            all_points = forecast.historical_trend + forecast.projected_trend
            if all_points:
                chart = {
                    "id": "forecast-runway-chart",
                    "title": "Historical & Projected 90-Day Revenue Runway",
                    "type": "line",
                    "description": "Historical settled PayPal sales followed by projected forward run-rate.",
                    "categories": [p["month"] for p in all_points],
                    "datasets": [
                        {"label": "Gross Revenue ($)", "data": [p["revenue"] for p in all_points], "color": "#0070ba"},
                        {"label": "Recurring MRR ($)", "data": [p["mrr"] for p in all_points], "color": "#00cfde"}
                    ],
                    "metric_unit": "USD"
                }
        elif "InvoiceCashflowAgent" in activated:
            invoices = await paypal_service.fetch_live_invoices()
            paid_cnt = sum(1 for inv in invoices if inv.get("status") in ["PAID", "MARKED_AS_PAID"])
            unpaid_cnt = sum(1 for inv in invoices if inv.get("status") in ["UNPAID", "SENT", "DRAFT"])
            overdue_cnt = sum(1 for inv in invoices if inv.get("status") == "OVERDUE")
            if (paid_cnt + unpaid_cnt + overdue_cnt) > 0:
                chart = {
                    "id": "invoice-status-chart",
                    "title": "Live Invoicing Status Distribution",
                    "type": "donut",
                    "description": "Breakdown of settled, pending, and overdue invoices in PayPal Sandbox.",
                    "categories": ["Paid & Settled", "Pending Collection", "Overdue Accounts"],
                    "datasets": [
                        {"label": "Invoices", "data": [paid_cnt, unpaid_cnt, overdue_cnt]}
                    ],
                    "metric_unit": "Invoices"
                }
        else:
            if charts_list and charts_list[0].get("categories"):
                chart = charts_list[0] # Revenue trend

        # 3. Synthesize Markdown Answer via Gemini LLM using ONLY live evidence
        final_markdown = ""
        if self.llm:
            try:
                system_prompt = (
                    "You are WARREN, an intelligent conversational business copilot for PayPal merchants.\n"
                    "Your responses MUST be formatted in rich GitHub-flavored Markdown:\n"
                    "- Use clear headings (`### `).\n"
                    "- Use bullet points with bold figures.\n"
                    "- STRICT REQUIREMENT: Base your answers ONLY on the live PayPal evidence provided below.\n"
                    "- NEVER fabricate or hallucinate numbers, names, or metrics not present in the live evidence.\n"
                    "- If the merchant's PayPal account has 0 records for a category (e.g. 0 disputes, 0 subscriptions), state that fact clearly.\n\n"
                    f"{profile_context}"
                )
                user_prompt = (
                    f"Merchant question: {state['query']}\n\n"
                    f"Live Evidence from PayPal APIs collected on the fly:\n{evidence}\n\n"
                    "Synthesize an accurate, structured markdown response answering the merchant's question."
                )
                ai_response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt)
                ])
                final_markdown = ai_response.content
            except Exception as e:
                print(f"[WarrenOrchestrator] Gemini LLM synthesis error: {e}")
        # Live fallback
        if not final_markdown:
            final_markdown = f"### Live PayPal Business Analysis\n\n{evidence}"

        return {
            "finalReport": final_markdown,
            "chart": chart,
            "followUps": []
        }

    def _build_graph(self):
        """Builds the LangGraph orchestrator with Jev routing and parallel agent dispatch."""
        workflow = StateGraph(WarrenState)

        # Add Nodes
        workflow.add_node("supervisor", self.Supervisor)
        workflow.add_node("TransactionDataAgent", self.TransactionDataAgent)
        workflow.add_node("SubscriptionChurnAgent", self.SubscriptionChurnAgent)
        workflow.add_node("OutlookForecastAgent", self.OutlookForecastAgent)
        workflow.add_node("InvoiceCashflowAgent", self.InvoiceCashflowAgent)
        workflow.add_node("DisputeRiskAgent", self.DisputeRiskAgent)
        workflow.add_node("controller", self.Controller)

        # Add Edges
        workflow.add_edge(START, "supervisor")
        workflow.add_conditional_edges(
            "supervisor",
            self.assignAgents,
            ["TransactionDataAgent", "SubscriptionChurnAgent", "OutlookForecastAgent", "InvoiceCashflowAgent", "DisputeRiskAgent"]
        )
        workflow.add_edge("TransactionDataAgent", "controller")
        workflow.add_edge("SubscriptionChurnAgent", "controller")
        workflow.add_edge("OutlookForecastAgent", "controller")
        workflow.add_edge("InvoiceCashflowAgent", "controller")
        workflow.add_edge("DisputeRiskAgent", "controller")
        workflow.add_edge("controller", END)

        return workflow.compile()

    async def process_query(self, message: str, session_id: str = "default") -> ChatResponse:
        """Executes the compiled LangGraph workflow using Jev supervisor routing and live PayPal data on the fly."""
        initial_state: WarrenState = {
            "query": message,
            "session_id": session_id,
            "agentsProb": {},
            "agentsNeeded": [],
            "completedSections": [],
            "finalReport": "",
            "chart": None,
            "followUps": [],
            "agentTrace": []
        }

        result = await self.graph.ainvoke(initial_state)

        chart_config = None
        if result.get("chart"):
            chart_config = ChartConfig(**result["chart"])

        follow_up_objs = [
            FollowUpAction(**f) for f in result.get("followUps", [])
        ]

        agent_trace = result.get("agentTrace", [])
        if result.get("agentsNeeded"):
            agent_trace.append(f"Agents Executed: {', '.join(result['agentsNeeded'])}")

        return ChatResponse(
            answer=result["finalReport"],
            chart=chart_config,
            follow_up_suggestions=follow_up_objs,
            agent_trace=agent_trace
        )

    async def generate_chart(self, prompt: str) -> ChartConfig:
        """
        Dynamically construct AG Chart configuration from live PayPal data based on merchant requests.
        """
        import re
        import time
        from app.models.schemas import ChartDataset

        invoices = await paypal_service.fetch_live_invoices()
        plans = await paypal_service.fetch_live_plans()
        txns = await paypal_service.fetch_live_transactions()
        disputes = await paypal_service.fetch_live_disputes()

        # Build dynamic plan price mapping
        price_to_plan: Dict[float, str] = {}
        for p in plans:
            for c in p.get("billing_cycles") or []:
                fp = c.get("pricing_scheme", {}).get("fixed_price", {}).get("value")
                if fp:
                    try:
                        val = float(fp)
                        if val > 0:
                            price_to_plan[val] = p.get("name", f"Plan (${val:.0f})")
                    except (ValueError, TypeError):
                        pass

        product_rev: Dict[str, float] = {}
        product_qty: Dict[str, int] = {}
        status_counts: Dict[str, int] = {"Paid": 0, "Pending": 0, "Overdue": 0}
        status_sums: Dict[str, float] = {"Paid": 0.0, "Pending": 0.0, "Overdue": 0.0}

        for inv in invoices:
            amt = float(inv.get("amount", {}).get("value", 0))
            st = inv.get("status")
            if st in ["PAID", "MARKED_AS_PAID"]:
                status_counts["Paid"] += 1
                status_sums["Paid"] += amt
            elif st == "OVERDUE":
                status_counts["Overdue"] += 1
                status_sums["Overdue"] += amt
            else:
                status_counts["Pending"] += 1
                status_sums["Pending"] += amt

            tier = price_to_plan.get(amt, f"Item (${amt:.0f})")
            product_rev[tier] = product_rev.get(tier, 0.0) + amt
            product_qty[tier] = product_qty.get(tier, 0) + 1

        regional_rev: Dict[str, float] = {}
        regional_cnt: Dict[str, int] = {}
        for t in txns:
            if t.status == "COMPLETED":
                regional_rev[t.region] = regional_rev.get(t.region, 0.0) + t.amount
                regional_cnt[t.region] = regional_cnt.get(t.region, 0) + 1

        plan_subs: Dict[str, int] = {}
        for p in plans:
            p_name = p.get("name", "Plan")
            cnt = sum(1 for inv in invoices if p_name.lower() in str(inv).lower() and inv.get("status") in ["PAID", "MARKED_AS_PAID"])
            plan_subs[p_name] = cnt

        # Summary evidence
        summary_evidence = {
            "products_by_revenue_usd": {k: round(v, 2) for k, v in sorted(product_rev.items(), key=lambda x: x[1], reverse=True)},
            "products_by_units_sold": {k: v for k, v in sorted(product_qty.items(), key=lambda x: x[1], reverse=True)},
            "regions_by_revenue_usd": {k: round(v, 2) for k, v in sorted(regional_rev.items(), key=lambda x: x[1], reverse=True)},
            "regions_by_transaction_count": {k: v for k, v in sorted(regional_cnt.items(), key=lambda x: x[1], reverse=True)},
            "subscription_plans_subscribers": plan_subs,
            "invoice_status_counts": status_counts,
            "invoice_status_sums_usd": {k: round(v, 2) for k, v in status_sums.items()},
            "disputes_count": len(disputes)
        }

        if self.llm:
            try:
                sys_msg = (
                    "You are AG Studio AI, the visualization copilot for PayPal merchants.\n"
                    "Your mission is to generate a high-impact, interactive AG Chart configuration strictly grounded in the live PayPal data below.\n"
                    "Output PURE JSON matching this schema:\n"
                    "{\n"
                    '  "id": "custom-chart-<short_slug>",\n'
                    '  "title": "<Concise descriptive title>",\n'
                    '  "type": "bar" | "donut" | "line",\n'
                    '  "description": "<1 sentence explanation of what this chart shows>",\n'
                    '  "categories": ["Category 1", "Category 2", ...],\n'
                    '  "datasets": [\n'
                    '    {\n'
                    '      "label": "<Dataset label, e.g. Sales ($) or Members>",\n'
                    '      "data": [number1, number2, ...],\n'
                    '      "color": "#0070ba"\n'
                    '    }\n'
                    '  ],\n'
                    '  "metric_unit": "USD" | "Members" | "Orders" | "Invoices"\n'
                    "}\n\n"
                    "RULES:\n"
                    "- Use ONLY numbers and categories present in the live evidence.\n"
                    "- Ensure `categories` length matches each dataset's `data` length.\n"
                    "- Output pure JSON only. Do NOT include markdown code blocks or backticks."
                )
                user_msg = f"User Request: {prompt}\nLive PayPal Evidence:\n{json.dumps(summary_evidence, indent=2)}"

                ai_res = await self.llm.ainvoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
                cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", ai_res.content.strip())
                parsed = json.loads(cleaned)
                if "datasets" in parsed:
                    for ds in parsed["datasets"]:
                        if "name" in ds and "label" not in ds:
                            ds["label"] = ds.pop("name")
                return ChartConfig(**parsed)
            except Exception as e:
                print(f"[WarrenOrchestrator] Error during LLM chart generation, using dynamic fallback: {e}")

        # live fallback
        q = prompt.lower()
        slug = f"custom-{int(time.time())}"

        if any(w in q for w in ["region", "territor", "country", "where"]):
            sorted_reg = sorted(regional_rev.items(), key=lambda x: x[1], reverse=True)
            if "top 3" in q:
                sorted_reg = sorted_reg[:3]
            cats = [r[0] for r in sorted_reg]
            data = [round(r[1], 2) for r in sorted_reg]
            return ChartConfig(
                id=slug,
                title="Top Regions by PayPal Revenue",
                type="bar",
                description="Live geographic revenue distribution parsed directly from PayPal Sandbox transactions.",
                categories=cats if cats else ["North America"],
                datasets=[ChartDataset(label="Revenue ($)", data=data if data else [0.0], color="#10b981")],
                metric_unit="USD"
            )
        elif any(w in q for w in ["status", "unpaid", "paid", "overdue", "pending"]):
            cats = ["Paid & Settled", "Pending Collection", "Overdue Accounts"]
            data = [float(status_counts["Paid"]), float(status_counts["Pending"]), float(status_counts["Overdue"])]
            return ChartConfig(
                id=slug,
                title="Invoice Payment Status Breakdown",
                type="donut",
                description="Live distribution of settled, pending, and overdue invoices in PayPal Sandbox.",
                categories=cats,
                datasets=[ChartDataset(label="Invoices", data=data)],
                metric_unit="Invoices"
            )
        elif any(w in q for w in ["plan", "subscription", "member", "subscriber", "tier"]):
            cats = list(plan_subs.keys())
            data = [float(v) for v in plan_subs.values()]
            return ChartConfig(
                id=slug,
                title="Subscribers by Plan Tier",
                type="donut",
                description="Active member subscriptions across registered PayPal Sandbox billing plans.",
                categories=cats if cats else ["Plans"],
                datasets=[ChartDataset(label="Subscribers", data=data if data else [0.0])],
                metric_unit="Members"
            )
        else:
            sorted_prod = sorted(product_rev.items(), key=lambda x: x[1], reverse=True)[:5]
            cats = [p[0] for p in sorted_prod]
            data = [round(p[1], 2) for p in sorted_prod]
            return ChartConfig(
                id=slug,
                title="Top Products by Sales Volume",
                type="bar",
                description="Highest revenue-generating products and tiers in PayPal Sandbox.",
                categories=cats if cats else ["Products"],
                datasets=[ChartDataset(label="Gross Volume ($)", data=data if data else [0.0], color="#0070ba")],
                metric_unit="USD"
            )

warren_orchestrator = WarrenOrchestrator()