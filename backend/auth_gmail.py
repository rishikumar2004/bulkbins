from gmail_util import get_gmail_service

def authenticate():
    print("Initiating Gmail API authentication...")
    try:
        service = get_gmail_service()
        print("✅ Authentication successful! token.json has been created.")
    except Exception as e:
        print(f"❌ Error during authentication: {e}")

if __name__ == "__main__":
    authenticate()
