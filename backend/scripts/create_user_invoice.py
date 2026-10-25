import asyncio
import os
import sys
import argparse
from datetime import datetime, timezone
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.paypal_service import paypal_service

async def main():
    parser = argparse.ArgumentParser(
        description="Dynamically create, draft, and dispatch real PayPal Invoices using Invoicing API v2."
    )
    parser.add_argument("--name", type=str, default="Amish Kakka", help="Recipient customer full name")
    parser.add_argument("--email", type=str, default="amishkakka@gmail.com", help="Recipient customer email address")
    parser.add_argument("--amount", type=float, default=230.00, help="Total invoice amount in USD")
    parser.add_argument("--item", type=str, default="Cloud Infrastructure & Advisory Retainer (Overdue)", help="Line item description")
    parser.add_argument("--note", type=str, default=None, help="Custom customer memo / note")
    parser.add_argument("--days-ago", type=int, default=22, help="Days in past for invoice date (simulates overdue/pending status)")
    parser.add_argument("--draft", action="store_true", help="Leave invoice in DRAFT mode without sending to customer")

    args = parser.parse_args()

    print("=" * 60)
    print("Uno — Dynamic PayPal Invoicing Dispatcher")
    print("=" * 60)
    print(f"Customer Name  : {args.name}")
    print(f"Customer Email : {args.email}")
    print(f"Line Item      : {args.item}")
    print(f"Amount         : ${args.amount:.2f} USD")
    print(f"Days Ago       : {args.days_ago} days (Status: {'DRAFT' if args.draft else ('OVERDUE' if args.days_ago > 15 else 'UNPAID')})")
    print(f"Send to Email  : {not args.draft}")
    print("-" * 60)

    result = await paypal_service.create_invoice(
        customer_name=args.name,
        customer_email=args.email,
        item_name=args.item,
        amount=args.amount,
        note=args.note,
        days_ago=args.days_ago,
        send_to_recipient=not args.draft
    )

    if result.get("success"):
        print("\n Invoice successfully created and registered with PayPal Sandbox!")
        print(f"  • Invoice ID     : {result.get('invoice_id')}")
        print(f"  • Invoice Number : {result.get('invoice_number')}")
        print(f"  • Status         : {result.get('status')}")
        print(f"  • Invoice Date   : {result.get('invoice_date')}")
        if not args.draft:
            print(f"  • Live Dispatch  : Delivered notification to {args.email} via PayPal Invoicing API v2!")
        print("\nYou can now test 1-click reminders in Warren Chat or inspect this invoice in Quick View.")
    else:
        print(f"\n✗ Error creating invoice: {result.get('error')}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
