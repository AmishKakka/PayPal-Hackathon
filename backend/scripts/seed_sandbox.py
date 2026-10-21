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
    print("\nCreating and Paying Real Sandbox Invoices spanning 3-4 months...")
    now = datetime.now(timezone.utc)

    sample_invoices = [
        # October (recent)
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 2, "status": "PAID"},
        {"customer_name": "David Chen", "email": "david.chen@pacificreach.com", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 4, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 5, "status": "PAID"},
        {"customer_name": "Kavita Patel", "email": "kavita.patel@mumbaitech.in", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 7, "status": "PAID"},
        {"customer_name": "Aoi Takahashi", "email": "aoi.takahashi@tokyostudio.jp", "item": "Custom Store Checkout Integration", "amount": "89.50", "days_ago": 9, "status": "PAID"},
        {"customer_name": "Chloe Dubois", "email": "chloe.dubois@parislux.fr", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 11, "status": "PAID"},
        {"customer_name": "Liam O'Connor", "email": "liam.oconnor@dublincapital.ie", "item": "Consulting Services", "amount": "350.00", "days_ago": 14, "status": "UNPAID"},
        {"customer_name": "Mateo Silva", "email": "mateo.silva@saopaulo.br", "item": "Overdue Invoiced Balance", "amount": "120.00", "days_ago": 22, "status": "OVERDUE"},
        # September (25 - 45 days ago)
        {"customer_name": "Benjamin Wright", "email": "ben@londonadvisory.uk", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 32, "status": "PAID"},
        {"customer_name": "Sofia Al-Mansoor", "email": "sofia@dubaimedia.ae", "item": "E-Commerce Checkout Suite", "amount": "145.00", "days_ago": 36, "status": "PAID"},
        {"customer_name": "Carlos Mendez", "email": "carlos.m@monterrey.mx", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 40, "status": "PAID"},
        {"customer_name": "James Wilson", "email": "j.wilson@austincreative.us", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 43, "status": "PAID"},
        # August (50 - 75 days ago)
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 62, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 65, "status": "PAID"},
        {"customer_name": "Chloe Dubois", "email": "chloe.dubois@parislux.fr", "item": "Starter Plan Subscription", "amount": "19.00", "days_ago": 71, "status": "PAID"},
        # July (80 - 100 days ago)
        {"customer_name": "Elena Rostova", "email": "elena.r@nordictech.de", "item": "Enterprise Plan Subscription", "amount": "199.00", "days_ago": 92, "status": "PAID"},
        {"customer_name": "Marcus Vance", "email": "marcus.vance@solarenergy.com", "item": "Pro Plan Subscription", "amount": "49.00", "days_ago": 95, "status": "PAID"}
    ]

    for inv in sample_invoices:
        # 1. Next invoice number
        num_res = await client.post(f"{BASE_URL}/v2/invoicing/generate-next-invoice-number", headers=headers)
        inv_num = num_res.json().get("invoice_number", f"INV-{int(now.timestamp())}")

        inv_date = (now - timedelta(days=inv["days_ago"])).strftime("%Y-%m-%d")

        # 2. Create invoice
        draft_res = await client.post(
            f"{BASE_URL}/v2/invoicing/invoices",
            headers=headers,
            json={
                "detail": {
                    "invoice_number": inv_num,
                    "invoice_date": inv_date,
                    "currency_code": "USD",
                    "note": "Thank you for using WARREN!"
                },
                "primary_recipients": [
                    {
                        "billing_info": {
                            "name": {"given_name": inv["customer_name"].split()[0], "surname": inv["customer_name"].split()[-1]},
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
        invoice_id = draft_res.json().get("href", "").split("/")[-1]

        # 3. Send invoice
        await client.post(
            f"{BASE_URL}/v2/invoicing/invoices/{invoice_id}/send",
            headers=headers,
            json={"send_to_recipient": False}
        )

        # 4. If marked as PAID, record payment
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
            print(f" Invoice {inv_num} for {inv['customer_name']} (${inv['amount']}) -> PAID")
        else:
            print(f" Invoice {inv_num} for {inv['customer_name']} (${inv['amount']}) -> {inv['status']}")

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
