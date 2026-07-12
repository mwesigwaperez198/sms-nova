import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> bool:
    settings = get_settings()
    api_key = settings.resend_api_key or ""
    if not api_key:
        logger.warning("RESEND_API_KEY not set — email not sent to %s", to)
        return False

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": "NOVARA School <onboarding@novara-tech-africa.kesug.com>",
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=30,
        )
        if resp.is_success:
            logger.info("Email sent to %s: %s", to, subject)
            return True
        else:
            logger.error("Resend API error: %s %s", resp.status_code, resp.text)
            return False
    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return False


def notify_registration_request(
    school_name: str,
    admin_name: str,
    admin_email: str,
    admin_phone: str,
    payment_method: str,
    payment_details: str,
) -> bool:
    settings = get_settings()
    owner_email = settings.owner_notification_email or "novaratechafrica@gmail.com"
    html = f"""
    <h2>New School Registration Request</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">School</td><td style="padding:8px;border:1px solid #ddd">{school_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">Admin Name</td><td style="padding:8px;border:1px solid #ddd">{admin_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">Admin Email</td><td style="padding:8px;border:1px solid #ddd">{admin_email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">Admin Phone</td><td style="padding:8px;border:1px solid #ddd">{admin_phone}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">Payment Method</td><td style="padding:8px;border:1px solid #ddd">{payment_method}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">Payment Details</td><td style="padding:8px;border:1px solid #ddd">{payment_details}</td></tr>
    </table>
    <p style="color:#666;margin-top:16px">Login to the admin panel to generate a registration key for this school.</p>
    """
    return send_email(owner_email, f"New Registration: {school_name}", html)


def send_registration_key_email(to_email: str, school_name: str, key: str) -> bool:
    html = f"""
    <h2>Your NOVARA School Registration Key</h2>
    <p>Dear {school_name} Administrator,</p>
    <p>Your school registration request has been approved. Use the key below to complete your account setup:</p>
    <div style="background:#f4f4f4;padding:16px;border-radius:8px;text-align:center;font-size:1.3rem;font-weight:800;letter-spacing:2px;margin:20px 0">{key}</div>
    <p>This key is valid for one-time use. Please keep it confidential.</p>
    <p>Visit the sign-up page at <a href="https://sms-i4ge.vercel.app">NOVARA SMS</a> to activate your account.</p>
    <p style="color:#666;margin-top:24px">If you did not request this registration, please ignore this email.</p>
    """
    return send_email(to_email, f"Your NOVARA Registration Key for {school_name}", html)
