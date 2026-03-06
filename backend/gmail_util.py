"""
gmail_util.py — Auto-Refreshing Gmail API Email Sender

HOW IT WORKS (works on ALL platforms: Railway, Render, AWS, etc.):
- Stores the OAuth2 refresh_token in an env variable (never expires)
- On every email send, auto-fetches a fresh access_token via HTTPS (port 443)
- Zero dependency on token.json files, zero manual re-authorization needed

REQUIRED ENV VARS:
  GMAIL_CLIENT_ID       — from Google Cloud Console OAuth2 Credentials
  GMAIL_CLIENT_SECRET   — from Google Cloud Console OAuth2 Credentials
  GMAIL_REFRESH_TOKEN   — one-time setup (run setup_gmail_token.py)
  GMAIL_SENDER_EMAIL    — the Gmail address to send FROM (e.g. monica3214b@gmail.com)
"""

import os
import base64
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv

# Load .env file
load_dotenv()

GMAIL_CLIENT_ID     = os.environ.get('GMAIL_CLIENT_ID')
GMAIL_CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET')
GMAIL_REFRESH_TOKEN = os.environ.get('GMAIL_REFRESH_TOKEN')
GMAIL_SENDER_EMAIL  = os.environ.get('GMAIL_SENDER_EMAIL', 'monica3214b@gmail.com')

GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GMAIL_SEND_URL   = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'


def _get_access_token() -> str:
    """
    Auto-fetches a fresh Gmail access token using the stored refresh token.
    This is a simple HTTPS POST to Google — works on EVERY hosting platform.
    The refresh token never expires (unless revoked), so this is permanent.
    """
    if not all([GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN]):
        missing = []
        if not GMAIL_CLIENT_ID: missing.append('GMAIL_CLIENT_ID')
        if not GMAIL_CLIENT_SECRET: missing.append('GMAIL_CLIENT_SECRET')
        if not GMAIL_REFRESH_TOKEN: missing.append('GMAIL_REFRESH_TOKEN')
        raise EnvironmentError(
            f"Missing required Gmail env vars: {', '.join(missing)}. "
            f"Run setup_gmail_token.py to generate your GMAIL_REFRESH_TOKEN."
        )

    response = requests.post(GOOGLE_TOKEN_URL, data={
        'client_id':     GMAIL_CLIENT_ID,
        'client_secret': GMAIL_CLIENT_SECRET,
        'refresh_token': GMAIL_REFRESH_TOKEN,
        'grant_type':    'refresh_token',
    }, timeout=10)

    if not response.ok:
        error_body = response.json() if response.content else {}
        error_desc = error_body.get('error_description', response.text)
        raise ConnectionError(
            f"Failed to refresh Gmail access token: [{response.status_code}] {error_desc}. "
            f"If error is 'invalid_grant', your GMAIL_REFRESH_TOKEN may have been revoked — "
            f"re-run setup_gmail_token.py."
        )

    access_token = response.json().get('access_token')
    if not access_token:
        raise ValueError("Google returned a 200 but no access_token in the response.")

    print("INFO: Successfully auto-refreshed Gmail access token.")
    return access_token


def send_gmail(recipient: str, subject: str, body_html: str, attachments=None):
    """
    Sends an email via the Gmail REST API using an auto-refreshed OAuth2 access token.
    Maintains the same function signature as the previous gmail_util.py so that
    export_routes.py requires zero changes.

    Args:
        recipient:   Destination email address.
        subject:     Email subject line.
        body_html:   HTML body of the email.
        attachments: Optional list of dicts: [{"filename": str, "content": bytes}]
    
    Returns:
        dict: The Gmail API response JSON (contains 'id', 'threadId', etc.)
    
    Raises:
        EnvironmentError: If required env vars are missing.
        ConnectionError: If token refresh fails (e.g., revoked refresh token).
        requests.HTTPError: If the Gmail API send call fails.
    """
    try:
        # Step 1: Get a fresh access token (auto-refreshed every time)
        access_token = _get_access_token()

        # Step 2: Build the MIME email message
        message = MIMEMultipart()
        message['to']      = recipient
        message['subject'] = subject
        message['from']    = f'BulkBins Reports <{GMAIL_SENDER_EMAIL}>'

        # Attach HTML body
        message.attach(MIMEText(body_html, 'html'))

        # Attach files if any
        if attachments:
            for attachment in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment['content'])
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename="{attachment["filename"]}"'
                )
                message.attach(part)

        # Step 3: Encode the message to base64url (required by Gmail API)
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

        # Step 4: Send via Gmail REST API (plain HTTPS, port 443 — works everywhere)
        response = requests.post(
            GMAIL_SEND_URL,
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type':  'application/json',
            },
            json={'raw': raw_message},
            timeout=30
        )

        response.raise_for_status()  # Raises for 4xx/5xx responses

        result = response.json()
        print(f"✅ Email sent successfully via Gmail API. Message ID: {result.get('id')}")
        return result

    except EnvironmentError as e:
        print(f"❌ Gmail Config Error: {e}")
        raise
    except ConnectionError as e:
        print(f"❌ Gmail Token Error: {e}")
        raise
    except requests.HTTPError as e:
        error_body = {}
        try:
            error_body = e.response.json()
        except Exception:
            pass
        print(f"❌ Gmail Send Error [{e.response.status_code}]: {error_body}")
        raise
    except Exception as e:
        print(f"❌ Unexpected Gmail Error: {e}")
        raise
