from os import environ
from typing import Protocol


class SmsGateway(Protocol):
    def send(self, to: str, message: str, sender_name: str | None = None) -> bool: ...


class ConsoleSmsGateway:
    def send(self, to: str, message: str, sender_name: str | None = None) -> bool:
        prefix = f"[{sender_name}]" if sender_name else ""
        print(f"[SMS] {prefix} To: {to} | Message: {message[:80]}...")
        return True


class TwilioSmsGateway:
    def __init__(self) -> None:
        self.account_sid = environ.get("TWILIO_ACCOUNT_SID", "")
        self.auth_token = environ.get("TWILIO_AUTH_TOKEN", "")
        self.from_number = environ.get("TWILIO_FROM_NUMBER", "")
        self._available = bool(self.account_sid and self.auth_token and self.from_number)

    def send(self, to: str, message: str, sender_name: str | None = None) -> bool:
        if not self._available:
            return False
        try:
            from twilio.rest import Client
            client = Client(self.account_sid, self.auth_token)
            body = f"{sender_name}: {message}" if sender_name else message
            client.messages.create(body=body, from_=self.from_number, to=to)
            return True
        except Exception:
            return False

    @property
    def available(self) -> bool:
        return self._available


def get_sms_gateway() -> SmsGateway:
    gateway_type = environ.get("SMS_GATEWAY", "console").lower()
    if gateway_type == "twilio":
        return TwilioSmsGateway()
    return ConsoleSmsGateway()
