import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app, db
from models import Transaction, Business, InventoryItem

# ---------- CONFIG ----------
START_DATE = datetime(2025, 1, 1)
END_DATE   = datetime(2026, 2, 26)  # Up to today

MONTHLY_EXPENSES = [
    {'category': 'Rent',        'amount': (2500, 3000), 'desc': 'Monthly store rent'},
    {'category': 'Utilities',   'amount': (300, 600),   'desc': 'Electricity & water bill'},
    {'category': 'Salaries',    'amount': (4000, 5500), 'desc': 'Monthly staff salaries'},
    {'category': 'Insurance',   'amount': (200, 300),   'desc': 'Business insurance premium'},
]

ADHOC_EXPENSES = [
    {'category': 'Supplies',    'amount': (100, 800),  'desc': 'Restocking packaging materials'},
    {'category': 'Marketing',   'amount': (200, 1000), 'desc': 'Social media ads & flyers'},
    {'category': 'Maintenance', 'amount': (50, 300),   'desc': 'Store maintenance & repairs'},
    {'category': 'Taxes',       'amount': (150, 500),  'desc': 'GST payment'},
    {'category': 'Others',      'amount': (30, 200),   'desc': 'Miscellaneous expenses'},
]

def generate_transactions(business_id, inventory_items, target_monthly_count=150):
    transactions = []
    
    current = START_DATE
    while current < END_DATE:
        year, month = current.year, current.month
        
        # Days in this month
        if month == 12:
            days_in_month = 31
            next_month_date = datetime(year + 1, 1, 1)
        else:
            next_month_date = datetime(year, month + 1, 1)
            days_in_month = (next_month_date - timedelta(days=1)).day
            
        # Determine actual end date for this month loop (don't go past END_DATE)
        month_end_date = min(next_month_date - timedelta(days=1), END_DATE)
        actual_days_in_month = (month_end_date - current).days + 1
            
        # Distribute target_monthly_count across actual_days_in_month
        for _ in range(round(target_monthly_count * (actual_days_in_month / days_in_month))):
            day = random.randint(current.day, month_end_date.day)
            dt_base = datetime(year, month, day)
            dt = dt_base.replace(hour=random.randint(9, 20), minute=random.randint(0, 59), second=random.randint(0, 59))
            
            # Skew towards sales heavily to guarantee profit (90% sales, 10% expenses)
            if random.random() < 0.90:
                item = random.choice(inventory_items)
                qty = random.randint(1, 10)
                
                # Base prices
                base_sell = item.selling_price or 100
                cost_price = item.cost_price or (base_sell * 0.5)
                
                # Force at least 25% profit margin
                min_sell_price = cost_price * 1.25
                sell_price = max(base_sell, min_sell_price)
                
                # Add small variance
                unit_price = round(sell_price * random.uniform(1.0, 1.15), 2)
                amount = round(unit_price * qty, 2)
                
                cogs = round(cost_price * qty, 2)
                profit = round(amount - cogs, 2)
                
                transactions.append(Transaction(
                    business_id=business_id,
                    inventory_item_id=item.id,
                    amount=amount,
                    quantity=qty,
                    category=item.category or 'Others',
                    type='Sale',
                    timestamp=dt,
                    description=f'{item.name} x{qty}',
                    profit=profit,
                    cogs=cogs
                ))
            else:
                is_monthly = random.random() < 0.5
                exp = random.choice(MONTHLY_EXPENSES if is_monthly else ADHOC_EXPENSES)
                amt = round(random.uniform(*exp['amount']), 2)
                transactions.append(Transaction(
                    business_id=business_id,
                    amount=amt,
                    quantity=1,
                    category=exp['category'],
                    type='Expense',
                    timestamp=dt,
                    description=exp['desc'],
                    profit=-amt,
                    cogs=amt
                ))
                
        current = next_month_date
            
    return transactions

if __name__ == '__main__':
    with app.app_context():
        businesses = Business.query.all()
        if not businesses:
            print("ERROR: No businesses found!")
            sys.exit(1)
            
        for biz in businesses:
            bid = biz.id
            print(f"\\nUsing business: {biz.name} (ID: {bid})")
            
            inventory_items = InventoryItem.query.filter_by(business_id=bid).all()
            if not inventory_items:
                print(f"  WARNING: No inventory items found for {biz.name}! Skipping.")
                continue
            print(f"  Loaded {len(inventory_items)} inventory items")
            
            # Clear old txns in this wide date range
            old = Transaction.query.filter(
                Transaction.business_id == bid,
                Transaction.timestamp >= START_DATE,
                Transaction.timestamp < END_DATE
            ).delete()
            db.session.commit()
            print(f"  Cleared {old} old transactions in date range")
            
            txns = generate_transactions(bid, inventory_items, 150)
            
            sales_count = sum(1 for t in txns if t.type == 'Sale')
            exp_count = sum(1 for t in txns if t.type == 'Expense')
            total_sales_amt = sum(t.amount for t in txns if t.type == 'Sale')
            total_exp_amt = sum(t.amount for t in txns if t.type == 'Expense')
            
            print(f"  Generated {len(txns)} transactions:")
            print(f"    Sales:    {sales_count} txns  (₹{total_sales_amt:,.0f})")
            print(f"    Expenses: {exp_count} txns  (₹{total_exp_amt:,.0f})")
            
            db.session.bulk_save_objects(txns)
            db.session.commit()
            
            new_total = Transaction.query.filter_by(business_id=bid).count()
            print(f"  ✅ Done! Total transactions now: {new_total}")
            
            # Export CSV
            import csv
            csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'sales_data_{bid}.csv')
            all_txns = Transaction.query.filter_by(business_id=bid).order_by(Transaction.timestamp).all()
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                w = csv.writer(f)
                w.writerow(['Date', 'Type', 'Category', 'Amount'])
                for t in all_txns:
                    w.writerow([t.timestamp.strftime('%Y-%m-%d'), t.type, t.category or 'Others', t.amount])
            print(f"  📊 Exported {len(all_txns)} rows to {csv_path}")
