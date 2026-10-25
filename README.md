# Uno — Autonomous Business Copilot for PayPal Merchants
> **"Understand and improve your business"**

Uno is an autonomous, AI-powered financial intelligence and execution copilot built for PayPal merchants. Instead of juggling fragmented PayPal admin portals, exporting static CSV spreadsheets, or guessing at forward cash flow, merchants interact directly with their live PayPal financial ecosystem in natural language.

Uno bridges the gap between raw payment APIs and executive decision-making by unifying **PayPal Subscriptions v1, Invoicing v2, Customer Disputes v1, and Reporting v1** with **Google Gemini 2.5 Flash**, **Jev Routing**, **AG Charts**, and **AG Grid**.

---

## 🌟 What Does Uno Do?

Uno acts as a 24/7 autonomous Chief Financial Officer and operational partner for PayPal businesses. Here is an overview of its end-to-end capabilities:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       UNO PLATFORM                                     │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│       OBSERVE            │        PREDICT           │             ACT                  │
│  • Account Discovery     │  • 30/90-Day Cash Runway │  • 1-Click Invoice Reminders     │
│  • Settlement Ledger     │  • Subscriber Churn Risk │  • Conversational Invoice Create │
│  • Executive Briefing    │  • Tier Growth Forecast  │  • Draft Invoice Publishing      │
│  • Audio Voice Briefing  │  • MRR Expansion Rate    │  • Dynamic Follow-Up Generation  │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 🚀 Detailed Capabilities Breakdown

### 1. Smart Account Discovery & Operating Profile Probing
- **Multi-API Parallel Probe**: As soon as a merchant links their PayPal Sandbox or live credentials, Uno executes parallel queries across 4 PayPal endpoints:
  - **Subscriptions v1 (`/v1/billing/plans`)**: Audits registered billing plans, billing cycle intervals, and fixed pricing schemes.
  - **Invoicing v2 (`/v2/invoicing/invoices`)**: Calculates settled volume, pending receivables, overdue balances, and draft invoices.
  - **Disputes v1 (`/v1/customer/disputes`)**: Audits open chargebacks, claim amounts, and PayPal Seller Protection health.
  - **Reporting v1 (`/v1/reporting/transactions`)**: Maps international transaction velocity and currency movements.
- **Operating Context Inference**: Automatically diagnoses the merchant's primary revenue driver (`subscriptions`, `invoices`, or `payouts`) and initializes a live situational context for the AI agents.

---

### 2. Daily Morning Executive Briefing (Visual & Audio)
- **Executive KPI Summary**: Synthesizes daily gross volume, MoM growth rate, recurring MRR, net cash inflow after PayPal processing fees, and dispute rate into a consolidated briefing.
- **Audio Voice Briefing**: Includes integrated Text-to-Speech (TTS) audio narration—merchants can press play to listen to a voice rundown of their overnight numbers while commuting or starting their day.
- **Actionable Daily Tasks**: Delivers high-priority daily action cards (e.g., overdue receivables alerts, soft decline follow-ups).

---

### 3. Visual Telemetry Dashboard (AG Charts)
- **Revenue Streams Over Time**: Interactive multi-series bar and line charts contrasting historical settled volume with recurring subscription MRR.
- **Active Subscription Plan Tiers**: Donut chart detailing active member distribution across registered PayPal billing tiers (e.g. Starter, Pro, Enterprise).
- **Global Regional Sales Distribution**: Geographic sales breakdown tracking revenue origin across 13 countries (North America, Europe, Asia-Pacific, Latin America, Middle East).
- **Custom Chart Pinning**: Any custom AG Chart synthesized on the fly by Agent Warren in chat can be pinned to the persistent dashboard with 1 click.

---

### 4. Live Enterprise Settlement Ledger (AG Grid)
- **Real-Time PayPal Ledger**: High-performance AG Grid rendering 70+ live customer invoices and transactions from PayPal Sandbox.
- **Rich Data Columns**: Invoice IDs, formatted settlement dates, customer names, verified email addresses, plan tiers, amounts, currencies, global regions, and status badges (`Settled`, `Pending`, `Refunded`).
- **Live 1-Click Synchronization**: Includes a dedicated **Refresh** button with spinning sync animation that queries PayPal's `/v2/invoicing/invoices` API in real time and updates the last-synced timestamp.
- **Inline Remind Triggers**: Directly dispatch reminders to overdue customer rows right from the table.

---

### 5. Agent Warren — Autonomous Financial Copilot & Business Glossary
Agent Warren is Uno's conversational financial intelligence agent, orchestrated with **Google Gemini 2.5 Flash** and **Jev TypeSafeClassifier**:

- **70:30 Split Interface with Independent Chat Scrolling**:
  - The `/chat` workspace features a dedicated 70:30 split layout.
  - **Left Side (70%)**: Houses the interactive conversation thread with independent smooth scrolling, synthesized AG Charts, live transaction pills, and query input bar.
  - **Right Side (30%)**: Houses an interactive **Business & Financial Terms Glossary** with category filter pills (*Revenue & Top-Line*, *Profitability & Margins*, *Cash Flow & Runway*, *Retention & Cohorts*, *Payments & Risk*) and collapsible accordion dropdowns detailing exact definitions, calculation formulas, business impact, and benchmarks for key metrics (MRR, ARR, TTM, Gross Margin, Operating Margin, DSO, Runway, NDR, Disputes, and Processing Fees).
  - Backed by the offline reference document: [`docs/business_glossary.txt`](docs/business_glossary.txt).
- **Full Situational Context**: On every query, Warren receives a dynamic system prompt containing the merchant's live account profile (active plans, MRR, real outstanding customer balances, dispute health, and geographic reach).
- **Natural Language Invoice Creation**:
  - Say: *"Bill Maya Lin $340 for Enterprise Integration"* or *"Draft an invoice for Amish Kakka $230"*.
  - Warren resolves existing customer directory records, validates parameters, and calls the live PayPal Invoicing API v2 (`POST /v2/invoicing/invoices`) to create and dispatch the invoice with official PayPal payment notifications.
- **Autonomous Payment Reminders**:
  - Say: *"Send 1-click reminders to all pending accounts"* or *"Remind Amish Kakka for his overdue bill"*.
  - Warren identifies eligible invoices (`SENT`, `UNPAID`, `OVERDUE`) and executes `POST /v2/invoicing/invoices/{id}/remind` via PayPal's live API, reporting exact invoice numbers, recipient delivery statuses, and recovered cash flow.
- **Draft Invoice Publishing**:
  - Automatically identifies draft accounts (e.g. Elena Rostova $199.00) and dispatches them via PayPal Invoicing API v2 (`POST /v2/invoicing/invoices/{id}/send`).
- **Dynamic On-the-Fly AG Chart Generation**:
  - Ask: *"Show me a pie chart of my regional sales"* or *"Plot my revenue runway"*.
  - Warren synthesizes a valid AG Charts JSON specification grounded in live ledger evidence and renders an interactive chart directly in the chat stream.
- **100% LLM-Generated Dynamic Follow-Up Buttons**:
  - Rather than static hardcoded fallbacks, Warren uses Gemini 2.5 Flash to synthesize contextual next-step suggestion buttons referencing real debtor names, real amounts, and real plan tiers.

---

### 6. Future Outlook — 90-Day Predictive Runway & Full-Width Subscription Health
- **90-Day Revenue & MRR Horizon Chart**: Combines historical invoice velocity with recurring subscription run-rates to project a forward 90-day trajectory with confidence bounds (70% top section).
- **Forward Metric Projections**: 3 focused projection cards (30% top section) tracking 30-Day Forward Runway, 90-Day Forward Projection, and MRR Expansion Rate.
- **Full-Width Subscription Retention & Churn Health**:
  - Spans the entire bottom area (100% width) in a responsive multi-column grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`).
  - Analyzes each registered billing plan for renewal drop-offs, active member counts, and exact **MRR exposed to risk**.
  - Highlights specific identified risk drivers (e.g., *soft card declines, unacknowledged dunning notices*).
  - Supplies concrete AI-recommended recovery actions.
  - **Clean Zero-State**: If a connected PayPal account has no subscription plans, cleanly displays a full-width *"No Active Billing Plans"* banner without displaying placeholder data.

---

## 🏗️ Architecture & PayPal REST API Mapping

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

| Application Capability | PayPal REST API Endpoint | Description |
| :--- | :--- | :--- |
| **Account Discovery** | `GET /v1/billing/plans`<br>`GET /v2/invoicing/invoices`<br>`GET /v1/customer/disputes` | Parallel probe discovering merchant revenue signals upon credential connection |
| **Live Ledger & Transactions** | `GET /v2/invoicing/invoices?page_size=100`<br>`GET /v1/reporting/transactions` | Retrieves multi-month settled invoices and customer records across 13 countries |
| **Invoice Reminders** | `POST /v2/invoicing/invoices/{id}/remind` | Triggers official PayPal payment reminder emails to customers |
| **Invoice Creation** | `POST /v2/invoicing/invoices` | Generates new invoices from natural language prompts via Agent Warren |
| **Draft Dispatch** | `POST /v2/invoicing/invoices/{id}/send` | Publishes draft invoices and delivers payment links to recipients |
| **Churn Risk Telemetry** | `GET /v1/billing/plans` + Invoice cross-matching | Computes renewal churn exposure per plan tier |
| **Data Seeder** | `POST /v2/invoicing/invoices`<br>`POST /v2/invoicing/invoices/{id}/payments` | Provisions 70+ invoices across 4 subscription tiers and 13 countries |

---

## 🛠️ Prerequisites

- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.18` or higher (Node 20+ recommended)
- **PayPal Developer Account**: Sandbox Client ID & Secret ([developer.paypal.com](https://developer.paypal.com))
- **Google Gemini API Key**: ([aistudio.google.com](https://aistudio.google.com))

---

## ⚙️ Environment Configuration (`.env`)

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

## 🚀 Installation & Running

### Step 1: Start Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API server runs at: `http://localhost:8000`
- Interactive OpenAPI Swagger docs: `http://localhost:8000/docs`

### Step 2: Start Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev -- -p 3000
```
- Web interface runs at: `http://localhost:3000`

---

## 🧪 Comprehensive Testing Instructions for Judges

### 1. Seed Real Sandbox Data
Populate your PayPal Sandbox with 4 billing plans and 70+ invoices spanning 4 months across 13 global territories:
```bash
# Via cURL:
curl -X POST http://localhost:8000/api/paypal/seed

# Or directly from backend:
python scripts/seed_sandbox.py
```

### 2. Verify Core Flows
- **Quick View (`/basic-charts`)**:
  - Inspect the **Morning Executive Briefing** card featuring a clean current-date header, 4 daily pulse metrics, and real-time PayPal sandbox telemetry.
  - Click the **Play Audio Briefing** button to hear the synthesized voice narration.
  - Scroll down to the **Recent Settlement Ledger (AG Grid)**.
  - Click the **Refresh** button in the grid header to see live synchronization with PayPal Sandbox.
- **Agent Warren (`/chat`)**:
  - Note the **70:30 Split Interface**: left-side chat scrolls independently, keeping the right-side glossary fixed.
  - Explore the **Business & Financial Terms Glossary** on the right: click category pills (*Revenue*, *Margins*, *Cash Flow*, *Retention*, *Risk*) and expand dropdowns (e.g., **MRR**, **Operating Margin**, **TTM**) to inspect formulas, benchmarks, and definitions.
  - Ask: *"What are my top 3 regions by revenue?"* &rarr; Warren outputs an interactive regional AG Chart.
  - Ask: *"What is the status of my invoices and who has overdue payments?"* &rarr; Warren lists real outstanding debtors (e.g. Amish Kakka $230, Mateo Silva $120) with live status breakdown.
  - Click any dynamic 1-click follow-up button (e.g., *"⚡ Remind Amish Kakka ($230.00 SENT)"*) &rarr; Warren dispatches a live reminder via PayPal Invoicing API v2 (`/v2/invoicing/invoices/{id}/remind`).
  - Ask: *"Bill Maya Lin $340 for Enterprise Integration"* &rarr; Warren creates and dispatches a live invoice via `/v2/invoicing/invoices`.
- **Future Outlook (`/outlook`)**:
  - Check the top 70:30 section: 90-day predictive MRR horizon AG Chart on the left, 30d/90d projection cards on the right.
  - Review the **Full-Width Subscription Retention & Churn Health** section (100% width) displaying live active subscriber counts, exposed MRR, churn percentages, identified risk factors, and recommended recovery strategies across all billing tiers.
