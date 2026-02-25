from app import app, db, Transaction
with app.app_context():
    from sqlalchemy import func
    res = db.session.query(Transaction.type, func.count(Transaction.id)).filter_by(business_id=2).group_by(Transaction.type).all()
    print(f"Business 2 Stats: {res}")
    
    # Check some dates
    latest = Transaction.query.filter_by(business_id=2).order_by(Transaction.timestamp.desc()).first()
    if latest:
        print(f"Latest: {latest.timestamp}")
    
    oldest = Transaction.query.filter_by(business_id=2).order_by(Transaction.timestamp.asc()).first()
    if oldest:
        print(f"Oldest: {oldest.timestamp}")
