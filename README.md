# Uno — Autonomous Business Copilot for PayPal Merchants

Uno is an autonomous financial intelligence and execution copilot built for PayPal merchants. Instead of navigating fragmented admin portals or exporting static spreadsheets, merchants interact directly with their live PayPal financial ecosystem in natural language.

Uno integrates **PayPal APIs** with **Google Gemini 2.5 Flash**, **Jev Routing**, **AG Charts**, and **AG Grid**.

---

## Core Capabilities

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       UNO PLATFORM                                     │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│         OBSERVE          │           ACT            │             PREDICT              │
│  • Account Discovery     │  • 1-Click Reminders     │  • 30/90-Day Cash Runway         │
│  • Settlement Ledger     │  • Dynamic Invoicing     │  • Subscriber Churn Risk         │
│  • Business Overview     │  • Draft Publishing      │  • Tier Growth Forecast          │
│  • Financial Glossary    │  • Autonomous Actions    │  • MRR Expansion Rate            │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

### 1. Observe: Live Telemetry & Executive Briefings
- **Multi-API Account Discovery**: Automatically queries Subscriptions (`/v1/billing/plans`), Invoicing (`/v2/invoicing/invoices`), Disputes (`/v1/customer/disputes`), and Reporting (`/v1/reporting/transactions`) to construct a live operating profile upon credential connection.
- **Morning Executive Briefing**: Daily visual summary covering gross volume, month-over-month growth, recurring MRR, and dispute health.
- **Settlement Ledger (AG Grid)**: Real-time table rendering multi-status customer transactions with 1-click live synchronization and inline payment reminder triggers.
- **Business & Financial Glossary**: An interactive reference glossary with category filters for key financial formulas, benchmarks, and definitions (MRR, ARR, TTM, Gross/Operating Margins, DSO, Runway, NDR, and Churn).

### 2. Act: Autonomous Agent Warren
- **Conversational Invoicing**: Generates and registers official PayPal invoices from natural language prompts (*"Bill Maya Lin $340 for Enterprise Integration"*) via PayPal Invoicing API v2.
- **1-Click Overdue Reminders**: Identifies unpaid and overdue customer receivables and dispatches automated payment reminders via `POST /v2/invoicing/invoices/{id}/remind`.
- **Dynamic Chart Synthesis**: Renders interactive AG Charts directly in the conversation stream based on live ledger evidence.
- **LLM-Grounded Follow-Ups**: Dynamically synthesizes next-step actions referencing real debtor accounts, outstanding balances, and plan tiers using Gemini 2.5 Flash.

### 3. Predict: 90-Day Runway & Subscription
- **Revenue & MRR Horizon (AG Charts)**: Synthesizes historical invoice velocity with recurring subscription run-rates into a forward 90-day predictive trajectory.
- **Forward Metric Projections**: Dedicated runway models tracking 30-day forward cash, 90-day forecast, and MRR expansion rate.
- **Subscription Retention & Churn**: Full-width health monitor evaluating churn probability, exposed MRR, specific risk drivers (e.g. soft card declines), and concrete recovery actions across all active billing tiers.

---

## Architecture & PayPal REST API Mapping

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 16 Frontend                  │
│   (App Router, AG Charts Community, AG Grid Community) │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼─────────────────────────────┐
│                    FastAPI Backend                     │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │   Warren Orchestrator   │  │    PayPal Service    │ │
│  │ (Gemini 2.5 + Jev Router│  │ (Agent Toolkit & REST│ │
│  └─────────────────────────┘  └──────────────────────┘ │
└──────────────────────────┬─────────────────────────────┘
                           │ OAuth 2.0 Bearer Token
┌──────────────────────────▼─────────────────────────────┐
│               PayPal REST APIs (Sandbox)               │
│  • Invoicing API v2 (/v2/invoicing/invoices)           │
│  • Invoice Reminders (/v2/invoicing/invoices/{id}/remind)│
│  • Invoice Publish (/v2/invoicing/invoices/{id}/send)  │
│  • Subscriptions API v1 (/v1/billing/plans)            │
│  • Reporting API v1 (/v1/reporting/transactions)       │
│  • Customer Disputes API v1 (/v1/customer/disputes)    │
└────────────────────────────────────────────────────────┘
```

| Feature | PayPal REST API Endpoint | Description |
| :--- | :--- | :--- |
| **Account Discovery** | `GET /v1/billing/plans`<br>`GET /v2/invoicing/invoices`<br>`GET /v1/customer/disputes` | Parallel probe establishing merchant revenue signals and operating profile |
| **Live Ledger & Transactions** | `GET /v2/invoicing/invoices?page_size=100`<br>`GET /v1/reporting/transactions` | Retrieves settled customer invoices and multi-currency transaction history |
| **Invoice Reminders** | `POST /v2/invoicing/invoices/{id}/remind` | Dispatches official payment reminder emails to customers |
| **Invoice Creation** | `POST /v2/invoicing/invoices` | Creates and delivers new invoices from conversational requests |
| **Draft Dispatch** | `POST /v2/invoicing/invoices/{id}/send` | Publishes draft invoices and sends payment links |
| **Churn Risk Telemetry** | `GET /v1/billing/plans` + Invoice cross-matching | Computes renewal churn exposure per plan tier |
| **Sandbox Seeder** | `POST /v2/invoicing/invoices`<br>`POST /v2/invoicing/invoices/{id}/payments` | Provisions 70+ invoices across 3 subscription tiers and 13 countries |

---

## Prerequisites

- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.18` or higher
- **PayPal Developer Account**: Sandbox Client ID & Secret ([developer.paypal.com](https://developer.paypal.com))
- **Google Gemini API Key**: ([aistudio.google.com](https://aistudio.google.com))

---

## Environment Configuration

Create `backend/.env` (or copy from `backend/.env.example`):

```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret_here
PAYPAL_MODE=sandbox

GEMINI_API_KEY=your_gemini_api_key_here
JEV_API_KEY=your_jev_api_key_here
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:3000
```

*(Optional)* Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Installation & Running

### Step 1: Start Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API server runs at: `http://localhost:8000`
- Interactive Swagger docs: `http://localhost:8000/docs`

### Step 2: Start Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev -- -p 3000
```
- Web interface runs at: `http://localhost:3000`

---

## Test Instructions

### 1. Seed Real Sandbox Data
Populate your PayPal Sandbox with dummy data:
```bash
# Via cURL:
curl -X POST http://localhost:8000/api/paypal/seed

# Or via Python script:
python scripts/seed_sandbox.py
```

### 2. Core Flows
- **Quick View (`/basic-charts`)**:
  - Review the **Business Overview** card.
  - Scroll down to the **Recent Settlement Ledger (AG Grid)** and click **Refresh** to trigger live synchronization with PayPal Sandbox.
- **Agent Warren (`/chat`)**:
  - Note the **70:30 Split Interface**: chat messages scroll independently while the right-side **Business & Financial Terms Glossary** remains accessible.
  - Explore the glossary categories (*Revenue*, *Margins*, *Cash Flow*, *Retention*, *Risk*) and expand dropdowns to inspect formulas and benchmarks.
  - Ask: *"What is the status of my invoices and who has overdue payments?"* — Warren lists real outstanding debtors with balance breakdowns.
  - Click any dynamic 1-click follow-up button (e.g. *"Remind Amish Kakka ($230.00 SENT)"*) to dispatch a live reminder via `POST /v2/invoicing/invoices/{id}/remind`.
  - Ask: *"Bill Maya Lin $340 for Enterprise Integration"* to create and send a live PayPal invoice via `/v2/invoicing/invoices`.
- **Future Outlook (`/outlook`)**:
  - Inspect the **90-Day Predictive Revenue & MRR Horizon** chart and forward runway metrics.
  - Review the **Full-Width Subscription Retention & Churn Health** section displaying active subscribers, at-risk MRR, churn percentages, and recovery actions.
