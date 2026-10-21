from typing import Any, Dict, AsyncGenerator
import os
import json
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

# Load local environment variables from .env
load_dotenv()

from app.models.schemas import (
    KPISummary, 
    TransactionItem, 
    OutlookForecast, 
    ChatRequest, 
    ChatResponse, 
    PayPalCredentials,
    BusinessProfile,
    ChartConfig,
    GenerateChartRequest
)
from app.services.paypal_service import paypal_service
from app.agents.orchestrator import warren_orchestrator

app = FastAPI(
    title="PayPal Business Intelligence Agent",
    description="For non-technical e-commerce merchants",
    version="1.0.0"
)

# Enableing CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "WARREN Backend",
        "paypal_connected": paypal_service.is_connected(),
        "paypal_mode": paypal_service.mode,
        "gemini_active": bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY") != "your_gemini_api_key_here")
    }

@app.get("/api/kpis", response_model=KPISummary)
async def get_kpis():
    return await paypal_service.get_kpis()

@app.get("/api/transactions")
async def get_transactions():
    return await paypal_service.fetch_live_transactions()

@app.get("/api/outlook", response_model=OutlookForecast)
async def get_outlook():
    return await paypal_service.get_outlook_forecast()

@app.get("/api/charts/standard")
async def get_standard_charts():
    return await paypal_service.get_standard_charts()

@app.post("/api/charts/generate", response_model=ChartConfig)
async def generate_custom_chart(req: GenerateChartRequest):
    """
    Dynamically generates a custom AG Chart configuration from live PayPal data
    based on natural language query.
    """
    return await warren_orchestrator.generate_chart(req.prompt)

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    return await warren_orchestrator.process_query(request.message, request.session_id)

@app.get("/api/chat/stream")
async def chat_stream_endpoint(message: str, session_id: str = "default"):
    async def event_generator() -> AsyncGenerator[Dict[str, Any], None]:
        response = await warren_orchestrator.process_query(message, session_id)
        words = response.answer.split(" ")
        
        for i, word in enumerate(words):
            yield {
                "event": "delta",
                "data": json.dumps({"text": word + " "})
            }
            await asyncio.sleep(0.015)
        # streaming data
        yield {
            "event": "complete",
            "data": json.dumps({
                "chart": response.chart.model_dump() if response.chart else None,
                "kpis": response.kpis,
                "follow_up_suggestions": [f.model_dump() for f in response.follow_up_suggestions],
                "agent_trace": response.agent_trace
            })
        }

    return EventSourceResponse(event_generator())

@app.post("/api/paypal/connect")
async def connect_paypal(creds: PayPalCredentials):
    paypal_service.update_credentials(creds.client_id, creds.client_secret, creds.mode)
    token = await paypal_service.get_access_token()
    if token:
        probe_result = await paypal_service.probe_account()
        return {
            "success": True, 
            "message": "Connected to PayPal Sandbox successfully!",
            "mode": creds.mode,
            "probe": probe_result
        }
    else:
        return {
            "success": False, 
            "message": "Could not authenticate with PayPal Sandbox. Please verify your Client ID and Secret.",
            "mode": creds.mode
        }

@app.get("/api/business/probe")
async def probe_business_account():
    """Quietly probes Subscriptions, Invoices, Disputes, and Payouts in parallel."""
    return await paypal_service.probe_account()

@app.post("/api/business/profile")
async def save_business_profile(profile: BusinessProfile):
    """Saves the user-confirmed merchant profile."""
    saved = paypal_service.save_profile(profile.model_dump())
    return {"success": True, "profile": saved}

@app.get("/api/business/profile")
async def get_business_profile():
    """Retrieves the current confirmed merchant profile."""
    return paypal_service.get_profile()

@app.get("/api/paypal/status")
async def paypal_status():
    is_conn = paypal_service.is_connected()
    live_plans = await paypal_service.fetch_live_plans()
    live_invoices = await paypal_service.fetch_live_invoices()
    return {
        "connected": is_conn,
        "mode": paypal_service.mode,
        "live_subscription_plans_count": len(live_plans),
        "live_invoices_count": len(live_invoices),
        "active_account": "Sandbox Merchant Demo",
        "supported_apis": ["Reporting (Transactions)", "Subscriptions v1", "Invoicing v2", "Disputes v1"]
    }

@app.post("/api/paypal/seed")
async def seed_paypal_data():
    """Seeds real products, subscription plans, and paid/unpaid invoices into PayPal Sandbox."""
    from scripts.seed_sandbox import main as run_seeder
    try:
        await run_seeder()
        return {"success": True, "message": "Successfully seeded real data into PayPal Sandbox!"}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
