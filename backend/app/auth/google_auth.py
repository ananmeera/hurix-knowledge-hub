from datetime import datetime
from urllib.parse import urlencode
import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models import User

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def build_google_auth_url(state: str) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "hd": settings.allowed_google_domain,
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        })
        response.raise_for_status()
        data = response.json()
    token_info = id_token.verify_oauth2_token(data["id_token"], google_requests.Request(), settings.google_client_id)
    return token_info


def validate_domain(email: str) -> bool:
    return email.lower().endswith("@" + settings.allowed_google_domain.lower())


def upsert_google_user(db: Session, info: dict) -> User:
    email = info["email"].lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            google_sub=info.get("sub"),
            name=info.get("name") or email.split("@")[0],
            email=email,
            picture=info.get("picture"),
            role="EMPLOYEE",
        )
        db.add(user)
    else:
        user.google_sub = user.google_sub or info.get("sub")
        user.name = info.get("name") or user.name
        user.picture = info.get("picture") or user.picture
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user
