import os
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
BASE_URL = "https://api-m.sandbox.paypal.com"

async def get_token(client: httpx.AsyncClient) -> str:
    res = await client.post(
        f"{BASE_URL}/v1/oauth2/token",
        auth=(CLIENT_ID, CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
        headers={"Accept": "application/json"}
    )
    if res.status_code != 200:
        raise Exception(f"Failed to authenticate with PayPal Sandbox: {res.text}")
    return res.json()["access_token"]

async def seed_products_and_plans(client: httpx.AsyncClient, headers: dict):
    print("\nChecking Catalog Products & Subscription Plans...")
    plans_res = await client.get(f"{BASE_URL}/v1/billing/plans?page_size=10", headers=headers)
    existing_plans = plans_res.json().get("plans", [])
    if len(existing_plans) >= 3:
        print(f"  ✓ {len(existing_plans)} subscription plans already exist in Sandbox. Skipping re-creation.")
        return

    # 1. Create Product
    prod_res = await client.post(
        f"{BASE_URL}/v1/catalogs/products",
        headers=headers,
        json={
            "name": "WARREN Merchant Suite",
            "description": "Conversational Business Operating System for PayPal",
            "type": "SERVICE",
            "category": "SOFTWARE"
        }
    )
    product_id = prod_res.json().get("id")
    print(f"  ✓ Product created: {product_id}")

    # 2. Create Plans
    plans = [
        {"name": "Starter Plan", "price": "19.00", "desc": "Starter analytics for emerging sellers"},
        {"name": "Pro Plan", "price": "49.00", "desc": "Pro copilot & regional breakdown for scaling merchants"},
        {"name": "Enterprise Plan", "price": "199.00", "desc": "Custom dunning, churn alerts & 90-day runway"}
    ]

    for p in plans:
        plan_res = await client.post(
            f"{BASE_URL}/v1/billing/plans",
            headers=headers,
            json={
                "product_id": product_id,
                "name": p["name"],
                "description": p["desc"],
                "status": "ACTIVE",
                "billing_cycles": [
                    {
                        "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                        "tenure_type": "REGULAR",
                        "sequence": 1,
                        "total_cycles": 0,
                        "pricing_scheme": {
                            "fixed_price": {"value": p["price"], "currency_code": "USD"}
                        }
                    }
                ],
                "payment_preferences": {
                    "auto_bill_outstanding": True,
                    "setup_fee_failure_action": "CONTINUE",
                    "payment_failure_threshold": 3
                }
            }
        )
        plan_id = plan_res.json().get("id")
        print(f"  ✓ Subscription Plan created: {p['name']} (${p['price']}/mo) -> ID: {plan_id}")

async def seed_invoices(client: httpx.AsyncClient, headers: dict):
    print("\nChecking existing and seeding comprehensive Sandbox Invoices (spanning 4 months)...")
    now = datetime.now(timezone.utc)

    # 1. Fetch existing invoices to avoid exact duplicate seeding
    try:
        inv_check = await client.get(f"{BASE_URL}/v2/invoicing/invoices?page_size=100&total_required=true", headers=headers)
        existing_items = inv_check.json().get("items", [])
        existing_signatures = set()
        for item in existing_items:
            detail = item.get("detail", {})
            d_date = detail.get("invoice_date")
            recips = item.get("primary_recipients", [])
            b_email = recips[0].get("billing_info", {}).get("email_address") if recips else None
            if b_email and d_date:
                existing_signatures.add((b_email, d_date))
    except Exception:
        existing_signatures = set()

    sample_invoices = [
        # --- OCTOBER (Current Month: Accelerating MRR, Pending Receivables, Draft, Overdue) ---
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 2, "status": "PAID"},
        {"customer_name": "David Chen", "email": "david.chen@pacificreach.com", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 3, "status": "PAID"},
        {"customer_name": "Benjamin Wright", "email": "ben@londonadvisory.uk", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 4, "status": "PAID"},
        {"customer_name": "Wei Ming", "email": "wei.ming@singaporeventures.sg", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 5, "status": "PAID"},
        {"customer_name": "Amelia Clark", "email": "amelia.clark@melbourneai.au", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 6, "status": "PAID"},
        {"customer_name": "Tariq Mansoor", "email": "tariq.mansoor@abudhabigroup.ae", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 6, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 7, "status": "PAID"},
        {"customer_name": "James Wilson", "email": "j.wilson@austincreative.us", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 7, "status": "PAID"},
        {"customer_name": "Kavita Patel", "email": "kavita.patel@mumbaitech.in", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 8, "status": "PAID"},
        {"customer_name": "Rahul Sharma", "email": "rahul.sharma@bangalorecloud.in", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 8, "status": "PAID"},
        {"customer_name": "Jack Thompson", "email": "jack.thompson@sydneydev.au", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 9, "status": "PAID"},
        {"customer_name": "Gabriela Costa", "email": "gabriela.costa@riomedia.br", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 10, "status": "PAID"},
        {"customer_name": "Chloe Dubois", "email": "chloe.dubois@parislux.fr", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 11, "status": "PAID"},
        {"customer_name": "Carlos Mendez", "email": "carlos.m@monterrey.mx", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 12, "status": "PAID"},
        {"customer_name": "Aoi Takahashi", "email": "aoi.takahashi@tokyostudio.jp", "item": "Custom Store Checkout Integration", "amount": "89.50", "days_ago": 12, "status": "PAID"},
        {"customer_name": "Kenji Sato", "email": "kenji.sato@kyotodesign.jp", "item": "E-Commerce Checkout Suite", "amount": "145.00", "days_ago": 13, "status": "PAID"},
        # Actionable Pending Receivables (Trigger 1-Click Reminder in Briefing)
        {"customer_name": "Alex Mercer", "email": "alex.mercer@seattlesoftware.us", "item": "Cloud Architecture & Workflow Consulting", "amount": "1250.00", "days_ago": 14, "status": "UNPAID"},
        {"customer_name": "Liam O'Connor", "email": "liam.oconnor@dublincapital.ie", "item": "Developer API Priority Retainer", "amount": "350.00", "days_ago": 15, "status": "UNPAID"},
        {"customer_name": "Jean Tremblay", "email": "jean.tremblay@montrealcloud.ca", "item": "Enterprise Annual Platform License", "amount": "499.00", "days_ago": 15, "status": "UNPAID"},
        {"customer_name": "Priya Nair", "email": "priya.nair@delhisystems.in", "item": "Pro Plan Subscription Renewal", "amount": "49.00", "days_ago": 16, "status": "UNPAID"},
        {"customer_name": "Charlotte Davies", "email": "charlotte.davies@cambridgelabs.uk", "item": "Enterprise Plan Subscription Renewal", "amount": "199.00", "days_ago": 17, "status": "UNPAID"},
        # Overdue Invoice (Triggers urgent follow-up action)
        {"customer_name": "Mateo Silva", "email": "mateo.silva@saopaulo.br", "item": "Overdue Invoiced Integration Balance", "amount": "120.00", "days_ago": 28, "status": "OVERDUE"},
        # Draft Invoice (Ready for automated dispatch)
        {"customer_name": "Hannah Fischer", "email": "hannah.fischer@munichautomotive.de", "item": "Custom Gateway Implementation Retainer", "amount": "450.00", "days_ago": 5, "status": "DRAFT"},

        # --- SEPTEMBER (20 to 50 days ago: Growing MRR and High-Value Projects) ---
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 32, "status": "PAID"},
        {"customer_name": "David Chen", "email": "david.chen@pacificreach.com", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 33, "status": "PAID"},
        {"customer_name": "Benjamin Wright", "email": "ben@londonadvisory.uk", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 34, "status": "PAID"},
        {"customer_name": "Wei Ming", "email": "wei.ming@singaporeventures.sg", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 35, "status": "PAID"},
        {"customer_name": "Sofia Al-Mansoor", "email": "sofia@dubaimedia.ae", "item": "E-Commerce Checkout Suite", "amount": "145.00", "days_ago": 36, "status": "PAID"},
        {"customer_name": "Oliver Smith", "email": "oliver.smith@oxfordanalytics.co.uk", "item": "Priority 24/7 SLA Support", "amount": "350.00", "days_ago": 37, "status": "PAID"},
        {"customer_name": "Emily Wong", "email": "emily.wong@vancouversecurity.ca", "item": "Security Audit & Compliance Retainer", "amount": "850.00", "days_ago": 38, "status": "PAID"},
        {"customer_name": "Carlos Mendez", "email": "carlos.m@monterrey.mx", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 40, "status": "PAID"},
        {"customer_name": "James Wilson", "email": "j.wilson@austincreative.us", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 42, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 43, "status": "PAID"},
        {"customer_name": "Kavita Patel", "email": "kavita.patel@mumbaitech.in", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 44, "status": "PAID"},
        {"customer_name": "Valeria Torres", "email": "valeria.torres@guadalajaratech.mx", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 45, "status": "PAID"},

        # --- AUGUST (50 to 75 days ago: Mid-summer baseline) ---
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 62, "status": "PAID"},
        {"customer_name": "David Chen", "email": "david.chen@pacificreach.com", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 63, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 65, "status": "PAID"},
        {"customer_name": "James Wilson", "email": "j.wilson@austincreative.us", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 67, "status": "PAID"},
        {"customer_name": "Chloe Dubois", "email": "chloe.dubois@parislux.fr", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 71, "status": "PAID"},
        {"customer_name": "Antoine Moreau", "email": "antoine.moreau@lyonconsulting.fr", "item": "Webhook & Gateway Automation", "amount": "220.00", "days_ago": 72, "status": "PAID"},
        {"customer_name": "Lukas Weber", "email": "lukas.weber@berlinfintech.de", "item": "Cloud Infrastructure Architecture", "amount": "1250.00", "days_ago": 74, "status": "PAID"},

        # --- JULY (80 to 105 days ago: Early traction) ---
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 92, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 95, "status": "PAID"},
        {"customer_name": "Chloe Dubois", "email": "chloe.dubois@parislux.fr", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 98, "status": "PAID"},
        {"customer_name": "Haruto Tanaka", "email": "haruto.tanaka@osakaship.jp", "item": "Custom Store Checkout Integration", "amount": "450.00", "days_ago": 102, "status": "PAID"}
    ]

    seeded_count = 0
    skipped_count = 0

    for inv in sample_invoices:
        inv_date = (now - timedelta(days=inv["days_ago"])).strftime("%Y-%m-%d")
        sig = (inv["email"], inv_date)
        if sig in existing_signatures:
            skipped_count += 1
            continue

        try:
            # 1. Next invoice number
            num_res = await client.post(f"{BASE_URL}/v2/invoicing/generate-next-invoice-number", headers=headers)
            inv_num = num_res.json().get("invoice_number", f"INV-{int(now.timestamp())}-{seeded_count}")

            # 2. Create invoice
            draft_res = await client.post(
                f"{BASE_URL}/v2/invoicing/invoices",
                headers=headers,
                json={
                    "detail": {
                        "invoice_number": inv_num,
                        "invoice_date": inv_date,
                        "currency_code": "USD",
                        "note": f"Thank you for using Uno! ({inv['item']})"
                    },
                    "primary_recipients": [
                        {
                            "billing_info": {
                                "name": {
                                    "given_name": inv["customer_name"].split()[0],
                                    "surname": inv["customer_name"].split()[-1] if len(inv["customer_name"].split()) > 1 else ""
                                },
                                "email_address": inv["email"]
                            }
                        }
                    ],
                    "items": [
                        {
                            "name": inv["item"],
                            "quantity": "1",
                            "unit_amount": {"currency_code": "USD", "value": inv["amount"]}
                        }
                    ]
                }
            )
            
            if draft_res.status_code not in [200, 201]:
                print(f"  ✗ Failed to create invoice for {inv['customer_name']}: {draft_res.text}")
                continue

            invoice_id = draft_res.json().get("href", "").split("/")[-1]

            # 3. If not DRAFT, send invoice
            if inv["status"] != "DRAFT":
                await client.post(
                    f"{BASE_URL}/v2/invoicing/invoices/{invoice_id}/send",
                    headers=headers,
                    json={"send_to_recipient": False}
                )

            # 4. If PAID, record payment
            if inv["status"] == "PAID":
                await client.post(
                    f"{BASE_URL}/v2/invoicing/invoices/{invoice_id}/payments",
                    headers=headers,
                    json={
                        "method": "PAYPAL",
                        "payment_date": inv_date,
                        "amount": {"currency_code": "USD", "value": inv["amount"]}
                    }
                )
                print(f"  ✓ Invoice {inv_num} for {inv['customer_name']} (${inv['amount']}) -> PAID ({inv_date})")
            else:
                print(f"  ✓ Invoice {inv_num} for {inv['customer_name']} (${inv['amount']}) -> {inv['status']} ({inv_date})")

            existing_signatures.add(sig)
            seeded_count += 1
            await asyncio.sleep(0.15)  # gentle rate limit pacing

        except Exception as e:
            print(f"  ✗ Error seeding invoice {inv['customer_name']}: {e}")

    print(f"\nInvoice Seeding Summary: {seeded_count} newly created, {skipped_count} already existed in Sandbox.")

async def main():
    print("=" * 60)
    print("WARREN — PayPal Sandbox Live Data Seeder")
    print("=" * 60)
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Error: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET missing in backend/.env")
        return

    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await get_token(client)
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        print("Connected to PayPal Sandbox via OAuth.")

        await seed_products_and_plans(client, headers)
        await seed_invoices(client, headers)

        print("\n Verifying Live Seeded Data from PayPal API...")
        plans_res = await client.get(f"{BASE_URL}/v1/billing/plans?page_size=10", headers=headers)
        invoices_res = await client.get(f"{BASE_URL}/v2/invoicing/invoices?total_required=true", headers=headers)
        
        print(f"Total Subscription Plans in Sandbox: {len(plans_res.json().get('plans', []))}")
        print(f"Total Invoices in Sandbox: {invoices_res.json().get('total_items', 0)}")
        print("\nSeeding Complete! Real data is now populated in your PayPal Sandbox account.")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
