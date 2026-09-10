import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.auth.google_auth import build_google_auth_url, exchange_code, validate_domain, upsert_google_user
from app.auth.security import create_access_token
from app.auth.dependencies import get_current_user
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
def google_login(request: Request):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    state = secrets.token_urlsafe(24)
    response = RedirectResponse(build_google_auth_url(state))
    response.set_cookie("oauth_state", state, httponly=True, secure=False, samesite="lax", max_age=600)
    return response


@router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request, db: Session = Depends(get_db)):
    expected_state = request.cookies.get("oauth_state")
    if not expected_state or state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    info = await exchange_code(code)
    email = info.get("email", "")
    if not info.get("email_verified") or not validate_domain(email):
        raise HTTPException(status_code=403, detail="Access is restricted to authorized organization accounts.")
    user = upsert_google_user(db, info)
    token = create_access_token(user.id, user.email, user.role)
    response = RedirectResponse(f"{settings.frontend_url}/chat")
    response.set_cookie("kh_access_token", token, httponly=True, secure=False, samesite="lax", max_age=8*3600)
    response.delete_cookie("oauth_state")
    return response


@router.post("/demo-login")
def demo_login(response: Response, db: Session = Depends(get_db)):
    if not settings.demo_auth_enabled:
        raise HTTPException(status_code=404, detail="Demo login disabled")
    user = db.query(User).filter(User.email == f"demo@{settings.allowed_google_domain}").first()
    if not user:
        user = User(name="Demo Employee", email=f"demo@{settings.allowed_google_domain}", role="SUPER_ADMIN")
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(user.id, user.email, user.role)
    response.set_cookie("kh_access_token", token, httponly=True, secure=False, samesite="lax", max_age=8*3600)
    return {"ok": True, "user": UserOut.model_validate(user)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("kh_access_token")
    return {"ok": True}
