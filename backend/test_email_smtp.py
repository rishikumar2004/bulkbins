import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_email():
    sender_email = "gudellirishikumar@gmail.com"
    password = "abcd"
    receiver_email = "gudellirishikumar@gmail.com"

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = receiver_email
    message["Subject"] = "BulkBins Email Test"

    body = "Checking if SMTP works with provided credentials."
    message.attach(MIMEText(body, "plain"))

    try:
        print(f"Attempting to send email via smtp.gmail.com with {sender_email}...")
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, receiver_email, message.as_string())
        server.quit()
        print("✅ Email sent successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_email()
