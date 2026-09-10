from fastapi import Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.security import decode_access_token, get_token_from_request
from app.models import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(get_token_from_request(request))
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User is unavailable")
    return user


def require_roles(*roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
