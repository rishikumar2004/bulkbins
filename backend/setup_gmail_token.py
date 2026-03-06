"""
setup_gmail_token.py — ONE-TIME SETUP SCRIPT
Run this script locally to get your Gmail API refresh_token.
The refresh_token you get never expires (until you revoke it manually).
You only need to run this ONCE — then store the values in your .env file
and in your hosting platform's environment variables (Railway/Render/etc).

HOW TO RUN:
  1. cd backend
  2. python setup_gmail_token.py
  3. Copy the printed values into your .env and your cloud platform's env vars.

PREREQUISITES:
  - Go to: https://console.cloud.google.com
  - Create a project (or use existing one)
  - Enable the "Gmail API"
  - Create an OAuth 2.0 Client ID (Desktop App type)
  - Download the credentials JSON and have the client_id and client_secret ready
"""

import json
import urllib.parse
import urllib.request
import webbrowser
import sys


# ─────────────── CONFIGURATION ───────────────
SCOPES    = "https://www.googleapis.com/auth/gmail.send"
AUTH_URL  = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def get_refresh_token():
    print("=" * 60)
    print("  BulkBins — Gmail API One-Time Token Setup")
    print("=" * 60)
    print()
    print("This script will generate a permanent REFRESH TOKEN.")
    print("You only need to do this ONCE.")
    print()

    # --- Step 1: Get credentials ---
    client_id = input("Enter your Google OAuth2 CLIENT ID     : ").strip()
    client_secret = input("Enter your Google OAuth2 CLIENT SECRET  : ").strip()
    sender_email = input("Enter the Gmail address to SEND FROM    : ").strip()

    if not client_id or not client_secret or not sender_email:
        print("\n❌ Error: All fields are required.")
        sys.exit(1)

    # --- Step 2: Build authorization URL ---
    auth_params = {
        "client_id":       client_id,
        "redirect_uri":    "http://localhost",  # Modern flow
        "response_type":   "code",
        "scope":           SCOPES,
        "access_type":     "offline",
        "prompt":          "consent",
    }
    auth_link = AUTH_URL + "?" + urllib.parse.urlencode(auth_params)

    print()
    print("─" * 60)
    print(" STEP 1: Open this URL in your browser and sign in:")
    print("─" * 60)
    print()
    print(auth_link)
    print()
    
    # Attempt to open browser
    try:
        webbrowser.open(auth_link)
    except Exception:
        pass

    print()
    print("─" * 60)
    print(" STEP 2: After you Click 'Allow', your browser will go to a blank page.")
    print(" LOOK AT THE ADDRESS BAR of that blank page.")
    print(" It will look like: http://localhost/?code=4/0Af...&scope=...")
    print("─" * 60)
    url_with_code = input("PASTE THE FULL URL from your address bar here: ").strip()

    # Extract the code from the URL
    if "code=" in url_with_code:
        # Simple extraction logic
        parts = url_with_code.split("code=")
        auth_code = parts[1].split("&")[0]
        # Decode URL characters like %2F
        auth_code = urllib.parse.unquote(auth_code)
    else:
        auth_code = url_with_code # Maybe they just pasted the code

    if not auth_code:
        print("\n❌ Error: Could not find the code in the URL.")
        sys.exit(1)

    # --- Step 3: Exchange auth code for refresh token ---
    print(f"\n⏳ Exchanging code for tokens...")
    token_data = urllib.parse.urlencode({
        "code":          auth_code,
        "client_id":     client_id,
        "client_secret": client_secret,
        "redirect_uri":  "http://localhost",
        "grant_type":    "authorization_code",
    }).encode("utf-8")

    req = urllib.request.Request(TOKEN_URL, data=token_data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = json.loads(e.read())
        print(f"\n❌ Token exchange failed: {error_body}")
        sys.exit(1)

    refresh_token = result.get("refresh_token")
    access_token  = result.get("access_token")  # noqa - for info only

    if not refresh_token:
        print("\n❌ Error: No refresh_token in response. Make sure you used prompt=consent.")
        print(f"   Response was: {result}")
        sys.exit(1)

    # --- Step 4: Print the final env vars ---
    print()
    print("=" * 60)
    print("  ✅ SUCCESS! Copy these into your .env and Railway/Render:")
    print("=" * 60)
    print()
    print(f"GMAIL_CLIENT_ID={client_id}")
    print(f"GMAIL_CLIENT_SECRET={client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={refresh_token}")
    print(f"GMAIL_SENDER_EMAIL={sender_email}")
    print()
    print("─" * 60)
    print(" IMPORTANT NOTES:")
    print("  • The REFRESH TOKEN never expires (unless revoked).")
    print("  • Add all 4 vars to Railway/Render environment settings.")
    print("  • Do NOT commit these values to Git.")
    print("  • If revoked accidentally, just run this script again.")
    print("─" * 60)
    print()


if __name__ == "__main__":
    get_refresh_token()
