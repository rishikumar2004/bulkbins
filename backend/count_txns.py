from app import app, db, Transaction
with app.app_context():
    from sqlalchemy import func
    res = db.session.query(Transaction.business_id, func.count(Transaction.id)).group_by(Transaction.business_id).all()
    for b_id, count in res:
        print(f"Business ID: {b_id}, Transaction Count: {count}")
