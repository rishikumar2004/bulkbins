from app import app, db, Transaction
with app.app_context():
    res = Transaction.query.filter_by(business_id=1).order_by(Transaction.timestamp.desc()).limit(1).all()
    if res:
        print(f"Latest Transaction for Business 1: {res[0].timestamp}")
    else:
        print("No transactions for Business 1")

    res = Transaction.query.filter_by(business_id=2).order_by(Transaction.timestamp.desc()).limit(1).all()
    if res:
        print(f"Latest Transaction for Business 2: {res[0].timestamp}")
