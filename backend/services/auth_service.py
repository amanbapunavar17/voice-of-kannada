import os
from typing import Any, Dict, Optional
from fastapi import Header, HTTPException
from supabase import create_client, Client

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """
    Returns an initialized Supabase client using service role key if configured,
    or anon key as fallback.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not url or not key or url.startswith("https://your-project") or key.startswith("your-"):
        return None

    try:
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
        return None

def verify_token_and_get_user(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Verifies the Supabase bearer token against Supabase auth.
    Never trusts browser-supplied user IDs.
    Returns {id: UUID, email: str, metadata: dict} or None.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        return None

    client = get_supabase_client()
    if not client:
        return None

    try:
        user_res = client.auth.get_user(token)
        if user_res and user_res.user:
            return {
                "id": str(user_res.user.id),
                "email": user_res.user.email,
                "metadata": user_res.user.user_metadata or {},
            }
        return None
    except Exception as exc:
        print(f"Token verification failed: {exc}")
        return None

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    return verify_token_and_get_user(authorization)

def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = verify_token_and_get_user(authorization)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in with a valid verified session.",
        )
    return user

